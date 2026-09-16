import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { generateContentStreamMock } = vi.hoisted(() => ({
  generateContentStreamMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getGenAIClient: () => ({ models: { generateContentStream: generateContentStreamMock } }),
}));

import { generateStreamingText } from "@/lib/ai/generateStreamingText";

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

describe("generateStreamingText", () => {
  beforeEach(() => {
    generateContentStreamMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("yields each chunk's text in order", async () => {
    generateContentStreamMock.mockResolvedValue(
      (async function* () {
        yield { text: "Hello" };
        yield { text: " world" };
      })(),
    );

    const chunks = await collect(
      generateStreamingText({ prompt: "p", systemInstruction: "s" }),
    );
    expect(chunks).toEqual(["Hello", " world"]);
  });

  it("skips chunks with no text", async () => {
    generateContentStreamMock.mockResolvedValue(
      (async function* () {
        yield { text: "a" };
        yield { text: "" };
        yield { text: undefined };
        yield { text: "b" };
      })(),
    );

    const chunks = await collect(
      generateStreamingText({ prompt: "p", systemInstruction: "s" }),
    );
    expect(chunks).toEqual(["a", "b"]);
  });

  it("throws request_failed when the model call rejects", async () => {
    generateContentStreamMock.mockRejectedValue(new Error("network down"));

    await expect(
      collect(generateStreamingText({ prompt: "p", systemInstruction: "s" })),
    ).rejects.toMatchObject({ code: "request_failed" });
  });

  it("throws timeout when the request exceeds 60 seconds", async () => {
    vi.useFakeTimers();
    generateContentStreamMock.mockImplementation(
      (params: { config?: { abortSignal?: AbortSignal } }) =>
        new Promise((_resolve, reject) => {
          params.config?.abortSignal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const promise = collect(generateStreamingText({ prompt: "p", systemInstruction: "s" }));
    const assertion = expect(promise).rejects.toMatchObject({ code: "timeout" });

    await vi.advanceTimersByTimeAsync(60_000);

    await assertion;
  });
});
