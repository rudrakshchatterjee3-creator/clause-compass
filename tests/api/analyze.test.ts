import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getGenAIClient: () => ({ models: { generateContent: generateContentMock } }),
}));

import { POST } from "@/app/api/analyze/route";

const DOCUMENT_TEXT = "The tenant shall pay $1,200 rent on the first of each month.";

function buildRequest(
  options: { fileName?: string; mimeType?: string; content?: string } = {},
): Request {
  const { fileName = "lease.txt", mimeType = "text/plain", content = DOCUMENT_TEXT } = options;
  const formData = new FormData();
  const blob = new Blob([content], { type: mimeType });
  formData.append("file", blob, fileName);
  return new Request("http://localhost/api/analyze", { method: "POST", body: formData });
}

function validDraft() {
  return {
    docTitle: "Residential Lease",
    parties: ["Landlord", "Tenant"],
    summary: "A simple month-to-month lease.",
    clauses: [
      {
        title: "Rent",
        type: "payment",
        quote: "The tenant shall pay $1,200 rent on the first of each month.",
        plainEnglish: "You pay $1,200 rent on the 1st each month.",
        obligations: [{ party: "Tenant", duty: "Pay rent", deadline: "1st of the month" }],
        risk: { level: "low", reason: "Standard payment term." },
      },
    ],
    missingCommonClauses: ["pet policy"],
  };
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("returns a verified analysis for a valid first response", async () => {
    generateContentMock.mockResolvedValue({ text: JSON.stringify(validDraft()) });

    const response = await POST(buildRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.documentText).toBe(DOCUMENT_TEXT);
    expect(body.analysis.disclaimer).toMatch(/information, not legal advice/i);
    expect(body.analysis.clauses).toHaveLength(1);
    expect(body.analysis.clauses[0].verified).toBe(true);
    expect(body.analysis.clauses[0].id).toEqual(expect.any(String));
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("retries once and succeeds when the first model response is invalid", async () => {
    generateContentMock
      .mockResolvedValueOnce({ text: "not json" })
      .mockResolvedValueOnce({ text: JSON.stringify(validDraft()) });

    const response = await POST(buildRequest({ content: `${DOCUMENT_TEXT} Case: retry.` }));
    expect(response.status).toBe(200);
    expect(generateContentMock).toHaveBeenCalledTimes(2);

    const body = await response.json();
    expect(body.analysis.clauses).toHaveLength(1);
  });

  it("marks a clause unverified when its quote can't be located in the source", async () => {
    const draft = validDraft();
    draft.clauses[0]!.quote = "this text is not actually in the document";
    generateContentMock.mockResolvedValue({ text: JSON.stringify(draft) });

    const response = await POST(buildRequest({ content: `${DOCUMENT_TEXT} Case: unverified.` }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysis.clauses[0].verified).toBe(false);
    expect(body.analysis.clauses[0].start).toBeUndefined();
  });

  it("returns a clean 502 error after both attempts fail", async () => {
    generateContentMock.mockResolvedValue({ text: "still not json" });

    const response = await POST(buildRequest({ content: `${DOCUMENT_TEXT} Case: total failure.` }));
    expect(response.status).toBe(502);

    const body = await response.json();
    expect(body.error.code).toBe("invalid_response");
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an oversized file without calling the model", async () => {
    const bigContent = "a".repeat(10 * 1024 * 1024 + 1);
    const response = await POST(buildRequest({ content: bigContent }));

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error.code).toBe("file_too_large");
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("rejects an unsupported mime type without calling the model", async () => {
    const response = await POST(
      buildRequest({ mimeType: "application/msword", fileName: "lease.doc" }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_request");
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("returns 400 when no file is attached", async () => {
    const formData = new FormData();
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
