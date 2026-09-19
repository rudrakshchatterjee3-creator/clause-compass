import "server-only";
import { getAiClient } from "./client";
import { AiError } from "./generateStructured";
import { readSseData } from "./sse";
import { createIdleTimeoutController } from "./idleTimeout";

// An idle timeout (no bytes for this long) rather than a fixed total
// deadline: a real answer streams token-by-token for its whole duration, so
// only a stream that's gone quiet should be treated as stuck.
const IDLE_TIMEOUT_MS = 30_000;
const MAX_TOTAL_MS = 90_000;

export interface GenerateStreamingTextOptions {
  prompt: string;
  systemInstruction: string;
}

interface ChatCompletionChunk {
  choices?: { delta?: { content?: string } }[];
}

/** Streams plain-text chunks from the model (no JSON mode) as they arrive. */
export async function* generateStreamingText({
  prompt,
  systemInstruction,
}: GenerateStreamingTextOptions): AsyncGenerator<string> {
  const client = getAiClient();
  const timers = createIdleTimeoutController(IDLE_TIMEOUT_MS, MAX_TOTAL_MS);

  try {
    const response = await client.chatCompletion({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
      stream: true,
      signal: timers.signal,
    });

    if (!response.ok || !response.body) {
      throw new AiError("request_failed", `Model request failed with status ${response.status}`);
    }

    for await (const payload of readSseData(response.body)) {
      timers.resetIdle();
      const chunk = JSON.parse(payload) as ChatCompletionChunk;
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) yield text;
    }
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
