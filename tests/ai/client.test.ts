import { describe, it, expect, vi, beforeEach } from "vitest";

const { GoogleGenAIMock } = vi.hoisted(() => ({
  GoogleGenAIMock: vi.fn().mockImplementation((options: { apiKey: string }) => ({
    apiKey: options.apiKey,
  })),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: GoogleGenAIMock,
}));

describe("getGenAIClient", () => {
  beforeEach(() => {
    vi.resetModules();
    GoogleGenAIMock.mockClear();
  });

  it("constructs the client once with the configured API key", async () => {
    const { getGenAIClient } = await import("@/lib/ai/client");
    const client = getGenAIClient();

    expect(GoogleGenAIMock).toHaveBeenCalledTimes(1);
    expect(GoogleGenAIMock).toHaveBeenCalledWith({ apiKey: "test-gemini-api-key" });
    expect(client).toBeDefined();
  });

  it("reuses the same client instance across calls", async () => {
    const { getGenAIClient } = await import("@/lib/ai/client");
    const first = getGenAIClient();
    const second = getGenAIClient();

    expect(first).toBe(second);
    expect(GoogleGenAIMock).toHaveBeenCalledTimes(1);
  });
});
