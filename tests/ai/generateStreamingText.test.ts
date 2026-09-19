import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

/** Builds a fetch-style Response whose body streams OpenAI-style SSE delta chunks. */
function sseResponse(contents: (string | undefined)[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const content of contents) {
        const chunk = { choices: [{ delta: content === undefined ? {} : { content } }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

describe("generateStreamingText", () => {
  beforeEach(() => {
    chatCompletionMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("yields each chunk's text in order", async () => {
    chatCompletionMock.mockResolvedValue(sseResponse(["Hello", " world"]));

    const chunks = await collect(generateStreamingText({ prompt: "p", systemInstruction: "s" }));
    expect(chunks).toEqual(["Hello", " world"]);
  });

  it("skips chunks with no text", async () => {
    chatCompletionMock.mockResolvedValue(sseResponse(["a", "", undefined, "b"]));

    const chunks = await collect(generateStreamingText({ prompt: "p", systemInstruction: "s" }));
    expect(chunks).toEqual(["a", "b"]);
  });

  it("throws request_failed when the model call rejects", async () => {
    chatCompletionMock.mockRejectedValue(new Error("network down"));

    await expect(
      collect(generateStreamingText({ prompt: "p", systemInstruction: "s" })),
    ).rejects.toMatchObject({ code: "request_failed" });
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
