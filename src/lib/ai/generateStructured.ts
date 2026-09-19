import "server-only";
import type { ZodType } from "zod";
import { getAiClient } from "./client";
import { zodToJsonSchema } from "./zodToJsonSchema";
import { readSseData } from "./sse";
import { createIdleTimeoutController } from "./idleTimeout";

// A full document analysis completes in single-digit seconds on Groq in
// practice; these are generous ceilings for network hiccups, not the
// expected case. See generateStreamingText.ts for the idle-vs-total
// rationale.
const IDLE_TIMEOUT_MS = 30_000;
const MAX_TOTAL_MS = 90_000;

export type AiErrorCode = "invalid_response" | "request_failed" | "timeout";

export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiError";
    this.code = code;
  }
}

export interface GenerateStructuredOptions<T> {
  schema: ZodType<T>;
  prompt: string;
  systemInstruction: string;
}

export async function generateStructured<T>({
  schema,
  prompt,
  systemInstruction,
}: GenerateStructuredOptions<T>): Promise<T> {
  const jsonSchema = zodToJsonSchema(schema);
  const systemWithSchema = `${systemInstruction}\n\nRespond with a single JSON object matching exactly this JSON Schema, with no other text:\n${JSON.stringify(jsonSchema)}`;

  try {
    return await attempt(schema, prompt, systemWithSchema);
  } catch (firstError) {
    if (!(firstError instanceof AiError) || firstError.code !== "invalid_response") {
      throw firstError;
    }

    const retryPrompt = `${prompt}\n\n---\nYour previous response failed validation with this error:\n${firstError.message}\n\nFix the issue and return JSON that matches the required schema exactly.`;

    return attempt(schema, retryPrompt, systemWithSchema);
  }
}

async function attempt<T>(
  schema: ZodType<T>,
  prompt: string,
  systemInstruction: string,
): Promise<T> {
  const raw = await callModel(prompt, systemInstruction);

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

async function callModel(prompt: string, systemInstruction: string): Promise<string> {
  const client = getAiClient();
  const timers = createIdleTimeoutController(IDLE_TIMEOUT_MS, MAX_TOTAL_MS);

  try {
    const response = await client.chatCompletion({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      stream: true,
      signal: timers.signal,
    });

    if (!response.ok || !response.body) {
      throw new AiError("request_failed", `Model request failed with status ${response.status}`);
    }

    let text = "";
    for await (const payload of readSseData(response.body)) {
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
