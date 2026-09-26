import { describe, it, expect, vi, beforeAll } from "vitest";
import { sseStreamResponse, sseJsonResponse } from "../helpers/sseResponse";

// Isolated in its own file so this test's module import gets a fresh
// RateLimiter instance, unaffected by the many requests ask.test.ts sends
// against the same in-memory limiter.
const { chatCompletionMock } = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getAiClient: () => ({ chatCompletion: chatCompletionMock }),
}));

import { POST } from "@/app/api/ask/route";

const DOCUMENT_TEXT = "The tenant shall pay $1,200 rent on the first of each month.";

function buildRequest(content: string): Request {
  return new Request("http://localhost/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify({ documentText: DOCUMENT_TEXT, question: content }),
  });
}

describe("POST /api/ask rate limiting", () => {
  beforeAll(() => {
    // A fresh Response per call: bodies are single-use and this test makes
    // 10 real model calls (2 chatCompletion calls each) reusing the same mock.
    chatCompletionMock.mockImplementation(async (params: { jsonMode?: boolean }) =>
      params.jsonMode
        ? sseJsonResponse(
            JSON.stringify({ answerable: true, steps: [], confidence: "low", suggestLawyer: false }),
          )
        : sseStreamResponse(["An answer."]),
    );
  });

  it("allows 10 requests per minute per IP, then returns 429 with Retry-After", async () => {
    for (let i = 0; i < 10; i++) {
      const response = await POST(buildRequest(`What if I pay late number ${i}?`));
      expect(response.status).toBe(200);
    }

    const blocked = await POST(buildRequest("One request too many?"));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();

    const body = await blocked.json();
    expect(body.error.code).toBe("rate_limited");
  });
});
