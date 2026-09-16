import "server-only";
import type { ZodType } from "zod";
import { getGenAIClient } from "./client";
import { zodToGeminiSchema } from "./zodToGeminiSchema";
import { env } from "@/lib/env";

const TIMEOUT_MS = 60_000;

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
  const responseSchema = zodToGeminiSchema(schema);

  try {
    return await attempt(schema, prompt, systemInstruction, responseSchema);
  } catch (firstError) {
    if (!(firstError instanceof AiError) || firstError.code !== "invalid_response") {
      throw firstError;
    }

    const retryPrompt = `${prompt}\n\n---\nYour previous response failed validation with this error:\n${firstError.message}\n\nFix the issue and return JSON that matches the required schema exactly.`;

    return attempt(schema, retryPrompt, systemInstruction, responseSchema);
  }
}

async function attempt<T>(
  schema: ZodType<T>,
  prompt: string,
  systemInstruction: string,
  responseSchema: ReturnType<typeof zodToGeminiSchema>,
): Promise<T> {
  const raw = await callModel(prompt, systemInstruction, responseSchema);

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

async function callModel(
  prompt: string,
  systemInstruction: string,
  responseSchema: ReturnType<typeof zodToGeminiSchema>,
): Promise<string> {
  const client = getGenAIClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        abortSignal: controller.signal,
      },
    });

    const text = response.text;
    if (!text) {
      throw new AiError("invalid_response", "Model returned an empty response");
    }
    return text;
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (controller.signal.aborted) {
      throw new AiError("timeout", "Model request timed out");
    }
    throw new AiError("request_failed", "Model request failed", { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}
