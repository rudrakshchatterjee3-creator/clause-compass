import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sseStreamResponse } from "../helpers/sseResponse";

const { chatCompletionMock } = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getAiClient: () => ({ chatCompletion: chatCompletionMock }),
}));

import { generateStreamingText } from "@/lib/ai/generateStreamingText";

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

describe("generateStreamingText", () => {
  beforeEach(() => {
    chatCompletionMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("yields each chunk's text in order", async () => {
    chatCompletionMock.mockResolvedValue(sseStreamResponse(["Hello", " world"]));

    const chunks = await collect(generateStreamingText({ prompt: "p", systemInstruction: "s" }));
    expect(chunks).toEqual(["Hello", " world"]);
  });

  it("skips chunks with no text", async () => {
    chatCompletionMock.mockResolvedValue(sseStreamResponse(["a", "", undefined, "b"]));

    const chunks = await collect(generateStreamingText({ prompt: "p", systemInstruction: "s" }));
    expect(chunks).toEqual(["a", "b"]);
  });

  it("throws request_failed when the model call rejects", async () => {
    chatCompletionMock.mockRejectedValue(new Error("network down"));

    await expect(
      collect(generateStreamingText({ prompt: "p", systemInstruction: "s" })),
    ).rejects.toMatchObject({ code: "request_failed" });
  });

  it("throws rate_limited when the provider returns 429", async () => {
    chatCompletionMock.mockResolvedValue(new Response(null, { status: 429 }));

    await expect(
      collect(generateStreamingText({ prompt: "p", systemInstruction: "s" })),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("throws request_failed when the response status is not ok", async () => {
    chatCompletionMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      collect(generateStreamingText({ prompt: "p", systemInstruction: "s" })),
    ).rejects.toMatchObject({ code: "request_failed" });
  });

  it("throws timeout when the stream goes idle", async () => {
    vi.useFakeTimers();
    chatCompletionMock.mockImplementation(
      (params: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          params.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const promise = collect(generateStreamingText({ prompt: "p", systemInstruction: "s" }));
    const assertion = expect(promise).rejects.toMatchObject({ code: "timeout" });

    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
  });
});
