import { describe, it, expect, vi, beforeAll } from "vitest";
import { sseJsonResponse } from "../helpers/sseResponse";

// Isolated in its own file so this test's module import gets a fresh
// RateLimiter instance, unaffected by the many requests brief.test.ts sends
// against the same in-memory limiter.
const { chatCompletionMock } = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getAiClient: () => ({ chatCompletion: chatCompletionMock }),
}));

import { POST } from "@/app/api/brief/route";

const analysis = {
  docTitle: "Residential Lease Agreement",
  parties: ["Harborview Properties LLC", "Jordan Ellis"],
  summary: "A month-to-month lease.",
  clauses: [],
  missingCommonClauses: [],
  disclaimer: "This tool gives information, not legal advice.",
};

function buildRequest(): Request {
  return new Request("http://localhost/api/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.11" },
    body: JSON.stringify({ analysis }),
  });
}

describe("POST /api/brief rate limiting", () => {
  beforeAll(() => {
    // A fresh Response per call: bodies are single-use and this test makes
    // 10 real model calls reusing the same mock.
    chatCompletionMock.mockImplementation(async () =>
      sseJsonResponse(
        JSON.stringify({
          keyRisks: [],
          questionsForLawyer: [],
          documentsToGather: [],
          deadlines: ["None found in the document"],
        }),
      ),
    );
  });

  it("allows 10 requests per minute per IP, then returns 429 with Retry-After", async () => {
    for (let i = 0; i < 10; i++) {
      const response = await POST(buildRequest());
      expect(response.status).toBe(200);
    }

    const blocked = await POST(buildRequest());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();

    const body = await blocked.json();
    expect(body.error.code).toBe("rate_limited");
  });
});
