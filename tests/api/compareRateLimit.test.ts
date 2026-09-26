import { describe, it, expect, vi, beforeAll } from "vitest";
import { sseJsonResponse } from "../helpers/sseResponse";

// Isolated in its own file so this test's module import gets a fresh
// RateLimiter instance, unaffected by the many requests compare.test.ts
// sends against the same in-memory limiter.
const { chatCompletionMock } = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getAiClient: () => ({ chatCompletion: chatCompletionMock }),
}));

import { POST } from "@/app/api/compare/route";

function buildRequest(caseLabel: string): Request {
  const formData = new FormData();
  formData.append("documentTextA", `The tenant shall pay a $25 late fee. Case: ${caseLabel}.`);
  formData.append("baselineId", "residential-lease-fair");
  return new Request("http://localhost/api/compare", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.12" },
    body: formData,
  });
}

describe("POST /api/compare rate limiting", () => {
  beforeAll(() => {
    // A fresh Response per call: bodies are single-use and this test makes
    // 10 real model calls reusing the same mock.
    chatCompletionMock.mockImplementation(async () =>
      sseJsonResponse(JSON.stringify({ items: [], summary: "No notable differences." })),
    );
  });

  it("allows 10 requests per minute per IP, then returns 429 with Retry-After", async () => {
    for (let i = 0; i < 10; i++) {
      const response = await POST(buildRequest(`request ${i}`));
      expect(response.status).toBe(200);
    }

    const blocked = await POST(buildRequest("one too many"));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();

    const body = await blocked.json();
    expect(body.error.code).toBe("rate_limited");
  });
});
