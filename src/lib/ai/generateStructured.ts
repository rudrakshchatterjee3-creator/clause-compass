import "server-only";
import type { ZodType } from "zod";
import { getAiClient, type ChatCompletionRequest } from "./client";
import { zodToJsonSchema } from "./zodToJsonSchema";
import { readSseData } from "./sse";
import { createIdleTimeoutController } from "./idleTimeout";
import { parseRetryAfterSeconds } from "./retryAfter";

// A full document analysis completes in single-digit seconds on Groq in
// practice; these are generous ceilings for network hiccups, not the
// expected case. See generateStreamingText.ts for the idle-vs-total
// rationale.
const IDLE_TIMEOUT_MS = 30_000;
const MAX_TOTAL_MS = 90_000;

export type AiErrorCode = "invalid_response" | "request_failed" | "timeout" | "rate_limited";

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly retryAfterSeconds: number | undefined;

  constructor(
    code: AiErrorCode,
    message: string,
    options?: { cause?: unknown; retryAfterSeconds?: number },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AiError";
    this.code = code;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

/**
 * Maps a non-OK provider response to an AiError. 429 and 413 both mean the
 * provider's token/request budget is exhausted for now (the free tier
 * reports an oversized-for-remaining-budget request as 413), so both become
 * a retryable "busy" error rather than a generic failure.
 */
export function upstreamError(response: Response): AiError {
  if (response.status === 429 || response.status === 413) {
    return new AiError(
      "rate_limited",
      "The AI service is busy right now. Please wait a moment and try again.",
      { retryAfterSeconds: parseRetryAfterSeconds(response.headers) },
    );
  }
  return new AiError("request_failed", `Model request failed with status ${response.status}`);
}

// The longest provider-requested wait absorbed server-side before surfacing
// a "busy" error to the user instead.
const MAX_RATE_LIMIT_WAIT_SECONDS = 20;

/**
 * Opens a streaming completion, waiting out one short provider rate limit
 * rather than failing immediately. `onAttempt` runs before each request so
 * the caller can reset its idle timer.
 */
export async function openCompletionStream(
  request: ChatCompletionRequest,
  onAttempt: () => void,
): Promise<ReadableStream<Uint8Array>> {
  const client = getAiClient();

  onAttempt();
  let response = await client.chatCompletion(request);

  if (!response.ok || !response.body) {
    const error = upstreamError(response);
    const wait = error.code === "rate_limited" ? error.retryAfterSeconds : undefined;
    if (wait === undefined || wait > MAX_RATE_LIMIT_WAIT_SECONDS) throw error;

    await sleep(wait * 1000, request.signal);
    onAttempt();
    response = await client.chatCompletion(request);
  }

  if (!response.ok || !response.body) throw upstreamError(response);
  return response.body;
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

export interface GenerateStructuredOptions<T> {
  schema: ZodType<T>;
  prompt: string;
  systemInstruction: string;
  /** Completion-token budget; defaults to the client's generous default. */
  maxTokens?: number;
}

export async function generateStructured<T>({
  schema,
  prompt,
  systemInstruction,
  maxTokens,
}: GenerateStructuredOptions<T>): Promise<T> {
  const jsonSchema = zodToJsonSchema(schema);
  const systemWithSchema = `${systemInstruction}\n\nRespond with a single JSON object matching exactly this JSON Schema, with no other text:\n${JSON.stringify(jsonSchema)}`;

  try {
    return await attempt(schema, prompt, systemWithSchema, maxTokens);
  } catch (firstError) {
    if (!(firstError instanceof AiError) || firstError.code !== "invalid_response") {
      throw firstError;
    }

    const retryPrompt = `${prompt}\n\n---\nYour previous response failed validation with this error:\n${firstError.message}\n\nFix the issue and return JSON that matches the required schema exactly.`;

    return attempt(schema, retryPrompt, systemWithSchema, maxTokens);
  }
}

async function attempt<T>(
  schema: ZodType<T>,
  prompt: string,
  systemInstruction: string,
  maxTokens: number | undefined,
): Promise<T> {
  const raw = await callModel(prompt, systemInstruction, maxTokens);

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new AiError("invalid_response", "Model response was not valid JSON");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new AiError("invalid_response", parsed.error.message);
  }

  return parsed.data;
}

interface ChatCompletionChunk {
  choices?: { delta?: { content?: string } }[];
}

async function callModel(
  prompt: string,
  systemInstruction: string,
  maxTokens: number | undefined,
): Promise<string> {
  const timers = createIdleTimeoutController(IDLE_TIMEOUT_MS, MAX_TOTAL_MS);

  try {
    const body = await openCompletionStream(
      {
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        jsonMode: true,
        stream: true,
        maxTokens,
        signal: timers.signal,
      },
      () => timers.resetIdle(),
    );

    let text = "";
    for await (const payload of readSseData(body)) {
      timers.resetIdle();
      const chunk = JSON.parse(payload) as ChatCompletionChunk;
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) text += delta;
    }

    if (!text) {
      throw new AiError("invalid_response", "Model returned an empty response");
    }
    return text;
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (timers.signal.aborted) {
      throw new AiError("timeout", "Model request timed out");
    }
    throw new AiError("request_failed", "Model request failed", { cause: error });
  } finally {
    timers.clear();
  }
}
