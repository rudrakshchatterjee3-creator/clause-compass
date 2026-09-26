import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_MAX_COMPLETION_TOKENS } from "@/lib/ai/client";

const fetchMock = vi.fn();

describe("getAiClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("posts to the Groq chat completions endpoint with the configured model and key", async () => {
    const { getAiClient } = await import("@/lib/ai/client");
    const client = getAiClient();

    await client.chatCompletion({ messages: [{ role: "user", content: "hi" }] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-groq-api-key",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "groq-test-model",
      messages: [{ role: "user", content: "hi" }],
      stream: false,
    });
    expect(body.max_completion_tokens).toBe(DEFAULT_MAX_COMPLETION_TOKENS);
  });

  it("omits reasoning_effort for models that aren't gpt-oss", async () => {
    const { getAiClient } = await import("@/lib/ai/client");
    await getAiClient().chatCompletion({ messages: [] });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty("reasoning_effort");
  });

  it("requests low reasoning effort for gpt-oss models", async () => {
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");
    const { getAiClient } = await import("@/lib/ai/client");
    await getAiClient().chatCompletion({ messages: [] });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.reasoning_effort).toBe("low");
  });

  it("uses a custom maxTokens budget when given", async () => {
    const { getAiClient } = await import("@/lib/ai/client");
    await getAiClient().chatCompletion({ messages: [], maxTokens: 1234 });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.max_completion_tokens).toBe(1234);
  });

  it("sets response_format to json_object when jsonMode is requested", async () => {
    const { getAiClient } = await import("@/lib/ai/client");
    const client = getAiClient();

    await client.chatCompletion({ messages: [], jsonMode: true });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("reuses the same client instance across calls", async () => {
    const { getAiClient } = await import("@/lib/ai/client");
    const first = getAiClient();
    const second = getAiClient();

    expect(first).toBe(second);
  });
});
