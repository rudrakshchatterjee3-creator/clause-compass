import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getGenAIClient: () => ({ models: { generateContent: generateContentMock } }),
}));

import { generateStructured } from "@/lib/ai/generateStructured";

const schema = z.object({ answer: z.string() });

describe("generateStructured", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns parsed data on a valid first response", async () => {
    generateContentMock.mockResolvedValue({ text: JSON.stringify({ answer: "hi" }) });

    const result = await generateStructured({
      schema,
      prompt: "prompt",
      systemInstruction: "system",
    });

    expect(result).toEqual({ answer: "hi" });
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("retries once with the validation error appended when json is invalid, then succeeds", async () => {
    generateContentMock
      .mockResolvedValueOnce({ text: "not json" })
      .mockResolvedValueOnce({ text: JSON.stringify({ answer: "fixed" }) });

    const result = await generateStructured({
      schema,
      prompt: "prompt",
      systemInstruction: "system",
    });

    expect(result).toEqual({ answer: "fixed" });
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    const secondCallArgs = generateContentMock.mock.calls[1]![0] as { contents: string };
    expect(secondCallArgs.contents).toContain("failed validation");
  });

  it("retries once when the schema doesn't match, then succeeds", async () => {
    generateContentMock
      .mockResolvedValueOnce({ text: JSON.stringify({ wrong: "field" }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ answer: "fixed" }) });

    const result = await generateStructured({
      schema,
      prompt: "prompt",
      systemInstruction: "system",
    });

    expect(result).toEqual({ answer: "fixed" });
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("throws a clean AiError after both attempts fail validation", async () => {
    generateContentMock.mockResolvedValue({ text: "still not json" });

    await expect(
      generateStructured({ schema, prompt: "prompt", systemInstruction: "system" }),
    ).rejects.toMatchObject({ code: "invalid_response" });
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("throws request_failed without retrying when the model call rejects", async () => {
    generateContentMock.mockRejectedValue(new Error("network down"));

    await expect(
      generateStructured({ schema, prompt: "prompt", systemInstruction: "system" }),
    ).rejects.toMatchObject({ code: "request_failed" });
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("throws invalid_response when the model returns an empty response", async () => {
    generateContentMock.mockResolvedValue({ text: "" });

    await expect(
      generateStructured({ schema, prompt: "prompt", systemInstruction: "system" }),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("throws timeout when the request exceeds 60 seconds", async () => {
    vi.useFakeTimers();
    generateContentMock.mockImplementation(
      (params: { config?: { abortSignal?: AbortSignal } }) =>
        new Promise((_resolve, reject) => {
          params.config?.abortSignal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const promise = generateStructured({ schema, prompt: "prompt", systemInstruction: "system" });
    const assertion = expect(promise).rejects.toMatchObject({ code: "timeout" });

    await vi.advanceTimersByTimeAsync(60_000);

    await assertion;
  });
});
