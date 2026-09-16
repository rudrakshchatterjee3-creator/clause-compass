import "server-only";
import { getGenAIClient } from "./client";
import { AiError } from "./generateStructured";
import { env } from "@/lib/env";

const TIMEOUT_MS = 60_000;

export interface GenerateStreamingTextOptions {
  prompt: string;
  systemInstruction: string;
}

/** Streams plain-text chunks from Gemini (no JSON mode) as they arrive. */
export async function* generateStreamingText({
  prompt,
  systemInstruction,
}: GenerateStreamingTextOptions): AsyncGenerator<string> {
  const client = getGenAIClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const stream = await client.models.generateContentStream({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: { systemInstruction, abortSignal: controller.signal },
    });

    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AiError("timeout", "Model request timed out");
    }
    throw new AiError("request_failed", "Model request failed", { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}
