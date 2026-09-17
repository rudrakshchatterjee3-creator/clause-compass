import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getGenAIClient: () => ({ models: { generateContent: generateContentMock } }),
}));

import { POST } from "@/app/api/brief/route";

const analysis = {
  docTitle: "Residential Lease Agreement",
  parties: ["Harborview Properties LLC", "Jordan Ellis"],
  summary: "A month-to-month lease with a steep late fee.",
  clauses: [
    {
      id: "c1",
      title: "Late Fees",
      type: "penalty",
      quote: "A late fee of $175.00 will be charged",
      plainEnglish: "Late rent costs $175.",
      obligations: [{ party: "Tenant", duty: "Pay any late fee" }],
      risk: { level: "high", reason: "Uncapped fee." },
      verified: true,
    },
  ],
  missingCommonClauses: ["Pet policy"],
  disclaimer: "This tool gives information, not legal advice.",
};

function buildRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/brief", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("returns a brief with a generation timestamp", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        keyRisks: ["The late fee is uncapped and can grow indefinitely."],
        questionsForLawyer: ["Is the uncapped late fee enforceable in my state?"],
        documentsToGather: ["Prior correspondence about late payments"],
        deadlines: ["None found in the document"],
      }),
    });

    const before = Date.now();
    const response = await POST(buildRequest({ analysis }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.brief.keyRisks).toHaveLength(1);
    expect(body.brief.questionsForLawyer[0]).toMatch(/late fee/i);
    expect(new Date(body.generatedAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("passes qaHistory through into the prompt", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        keyRisks: [],
        questionsForLawyer: [],
        documentsToGather: [],
        deadlines: ["None found in the document"],
      }),
    });

    await POST(
      buildRequest({
        analysis,
        qaHistory: [{ question: "What if I pay late?", answer: "You owe $175." }],
      }),
    );

    const callArgs = generateContentMock.mock.calls[0]![0] as { contents: string };
    expect(callArgs.contents).toContain("What if I pay late?");
  });

  it("returns 400 for a missing analysis", async () => {
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_request");
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const request = new Request("http://localhost/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 502 when the model call fails", async () => {
    generateContentMock.mockRejectedValue(new Error("boom"));
    const response = await POST(buildRequest({ analysis }));
    expect(response.status).toBe(502);
  });
});
