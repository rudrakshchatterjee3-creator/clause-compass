import "server-only";
import { env } from "@/lib/env";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

// Groq validates json_object responses server-side and rejects a truncated
// generation outright, so every call gets a generous completion budget.
const MAX_COMPLETION_TOKENS = 8000;

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  stream?: boolean;
  jsonMode?: boolean;
  signal?: AbortSignal;
}

export interface AiClient {
  chatCompletion(request: ChatCompletionRequest): Promise<Response>;
}

let client: AiClient | undefined;

/** Thin fetch wrapper over Groq's OpenAI-compatible chat completions endpoint. */
export function getAiClient(): AiClient {
  if (!client) {
    client = {
      chatCompletion({ messages, stream, jsonMode, signal }) {
        return fetch(GROQ_CHAT_COMPLETIONS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: env.GROQ_MODEL,
            messages,
            stream: stream ?? false,
            max_completion_tokens: MAX_COMPLETION_TOKENS,
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          }),
          signal,
        });
      },
    };
  }
  return client;
}
