import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { sseJsonResponse as sseResponse } from "../helpers/sseResponse";

const { chatCompletionMock } = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getAiClient: () => ({ chatCompletion: chatCompletionMock }),
}));

import { generateStructured } from "@/lib/ai/generateStructured";

const schema = z.object({ answer: z.string() });

describe("generateStructured", () => {
  beforeEach(() => {
    chatCompletionMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns parsed data on a valid first response", async () => {
    chatCompletionMock.mockResolvedValue(sseResponse(JSON.stringify({ answer: "hi" })));

    const result = await generateStructured({
      schema,
      prompt: "prompt",
      systemInstruction: "system",
    });

    expect(result).toEqual({ answer: "hi" });
    expect(chatCompletionMock).toHaveBeenCalledTimes(1);
    const callArgs = chatCompletionMock.mock.calls[0]![0] as { jsonMode?: boolean; stream?: boolean };
    expect(callArgs.jsonMode).toBe(true);
    expect(callArgs.stream).toBe(true);
  });

  it("retries once with the validation error appended when json is invalid, then succeeds", async () => {
    chatCompletionMock
      .mockResolvedValueOnce(sseResponse("not json"))
      .mockResolvedValueOnce(sseResponse(JSON.stringify({ answer: "fixed" })));

    const result = await generateStructured({
      schema,
      prompt: "prompt",
      systemInstruction: "system",
    });

    expect(result).toEqual({ answer: "fixed" });
    expect(chatCompletionMock).toHaveBeenCalledTimes(2);
    const secondCallArgs = chatCompletionMock.mock.calls[1]![0] as {
      messages: { role: string; content: string }[];
    };
    const userMessage = secondCallArgs.messages.find((m) => m.role === "user");
    expect(userMessage?.content).toContain("failed validation");
  });

  it("retries once when the schema doesn't match, then succeeds", async () => {
    chatCompletionMock
      .mockResolvedValueOnce(sseResponse(JSON.stringify({ wrong: "field" })))
      .mockResolvedValueOnce(sseResponse(JSON.stringify({ answer: "fixed" })));

    const result = await generateStructured({
      schema,
      prompt: "prompt",
      systemInstruction: "system",
    });

    expect(result).toEqual({ answer: "fixed" });
    expect(chatCompletionMock).toHaveBeenCalledTimes(2);
  });

  it("throws a clean AiError after both attempts fail validation", async () => {
    // A fresh Response per call: bodies are single-use and this retries once.
    chatCompletionMock.mockImplementation(async () => sseResponse("still not json"));

    await expect(
      generateStructured({ schema, prompt: "prompt", systemInstruction: "system" }),
    ).rejects.toMatchObject({ code: "invalid_response" });
    expect(chatCompletionMock).toHaveBeenCalledTimes(2);
  });

  it("throws request_failed without retrying when the model call rejects", async () => {
    chatCompletionMock.mockRejectedValue(new Error("network down"));

    await expect(
      generateStructured({ schema, prompt: "prompt", systemInstruction: "system" }),
    ).rejects.toMatchObject({ code: "request_failed" });
    expect(chatCompletionMock).toHaveBeenCalledTimes(1);
  });

  it("throws request_failed when the response status is not ok", async () => {
    chatCompletionMock.mockResolvedValue(sseResponse("ignored", 500));

    await expect(
      generateStructured({ schema, prompt: "prompt", systemInstruction: "system" }),
    ).rejects.toMatchObject({ code: "request_failed" });
  });

  it("throws invalid_response when the model returns an empty response", async () => {
    // A fresh Response per call: this scenario also retries once.
    chatCompletionMock.mockImplementation(async () => sseResponse(""));

    await expect(
      generateStructured({ schema, prompt: "prompt", systemInstruction: "system" }),
    ).rejects.toMatchObject({ code: "invalid_response" });
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

    const promise = generateStructured({ schema, prompt: "prompt", systemInstruction: "system" });
    const assertion = expect(promise).rejects.toMatchObject({ code: "timeout" });

    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
  });
});
