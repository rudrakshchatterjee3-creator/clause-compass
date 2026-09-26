import "server-only";
import { env } from "@/lib/env";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

// Groq validates json_object responses server-side and rejects a truncated
// generation outright, so the default budget is generous enough for a full
// clause map. Calls with small outputs pass a lower `maxTokens`, since the
// reserved budget counts against the provider's per-minute token limit.
export const DEFAULT_MAX_COMPLETION_TOKENS = 8000;

// gpt-oss models spend tokens on hidden reasoning before answering. Low effort
// cuts that to a few dozen tokens with no loss of structured-output quality
// here (measured on the sample lease: ~2s, full clause map), which matters on
// a free-tier per-minute token budget. Other models may reject the parameter.
function reasoningParams(model: string): { reasoning_effort?: "low" } {
  return model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {};
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  stream?: boolean;
  jsonMode?: boolean;
  maxTokens?: number;
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
      chatCompletion({ messages, stream, jsonMode, maxTokens, signal }) {
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
            max_completion_tokens: maxTokens ?? DEFAULT_MAX_COMPLETION_TOKENS,
            ...reasoningParams(env.GROQ_MODEL),
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          }),
          signal,
        });
      },
    };
  }
  return client;
}
