import { describe, it, expect, vi, beforeEach } from "vitest";
import { sseJsonResponse as jsonResponse } from "../helpers/sseResponse";

const { chatCompletionMock } = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getAiClient: () => ({ chatCompletion: chatCompletionMock }),
}));

import { POST } from "@/app/api/analyze/route";

const DOCUMENT_TEXT = "The tenant shall pay $1,200 rent on the first of each month.";

function userMessageContent(callIndex: number): string {
  const args = chatCompletionMock.mock.calls[callIndex]![0] as {
    messages: { role: string; content: string }[];
  };
  return args.messages.find((m) => m.role === "user")!.content;
}

function buildRequest(
  options: {
    fileName?: string;
    mimeType?: string;
    content?: string;
    redactPii?: boolean;
    headers?: HeadersInit;
  } = {},
): Request {
  const { fileName = "lease.txt", mimeType = "text/plain", content = DOCUMENT_TEXT } = options;
  const formData = new FormData();
  const blob = new Blob([content], { type: mimeType });
  formData.append("file", blob, fileName);
  if (options.redactPii === false) formData.append("redactPii", "false");
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: options.headers,
    body: formData,
  });
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
    chatCompletionMock.mockReset();
  });

  it("returns a verified analysis for a valid first response", async () => {
    chatCompletionMock.mockResolvedValue(jsonResponse(JSON.stringify(validDraft())));

    const response = await POST(buildRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.documentText).toBe(DOCUMENT_TEXT);
    expect(body.analysis.disclaimer).toMatch(/information, not legal advice/i);
    expect(body.analysis.clauses).toHaveLength(1);
    expect(body.analysis.clauses[0].verified).toBe(true);
    expect(body.analysis.clauses[0].id).toEqual(expect.any(String));
    expect(chatCompletionMock).toHaveBeenCalledTimes(1);
  });

  it("retries once and succeeds when the first model response is invalid", async () => {
    chatCompletionMock
      .mockResolvedValueOnce(jsonResponse("not json"))
      .mockResolvedValueOnce(jsonResponse(JSON.stringify(validDraft())));

    const response = await POST(buildRequest({ content: `${DOCUMENT_TEXT} Case: retry.` }));
    expect(response.status).toBe(200);
    expect(chatCompletionMock).toHaveBeenCalledTimes(2);

    const body = await response.json();
    expect(body.analysis.clauses).toHaveLength(1);
  });

  it("marks a clause unverified when its quote can't be located in the source", async () => {
    const draft = validDraft();
    draft.clauses[0]!.quote = "this text is not actually in the document";
    chatCompletionMock.mockResolvedValue(jsonResponse(JSON.stringify(draft)));

    const response = await POST(buildRequest({ content: `${DOCUMENT_TEXT} Case: unverified.` }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysis.clauses[0].verified).toBe(false);
    expect(body.analysis.clauses[0].start).toBeUndefined();
  });

  it("returns a clean 502 error after both attempts fail", async () => {
    // A fresh Response per call: bodies are single-use and this retries once.
    chatCompletionMock.mockImplementation(async () => jsonResponse("still not json"));

    const response = await POST(buildRequest({ content: `${DOCUMENT_TEXT} Case: total failure.` }));
    expect(response.status).toBe(502);

    const body = await response.json();
    expect(body.error.code).toBe("invalid_response");
    expect(chatCompletionMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an oversized file without calling the model", async () => {
    const bigContent = "a".repeat(10 * 1024 * 1024 + 1);
    const response = await POST(buildRequest({ content: bigContent }));

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error.code).toBe("file_too_large");
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("rejects an unsupported mime type without calling the model", async () => {
    const response = await POST(
      buildRequest({ mimeType: "application/msword", fileName: "lease.doc" }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_request");
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("redacts PII from the document before sending it to the model, by default", async () => {
    chatCompletionMock.mockResolvedValue(jsonResponse(JSON.stringify(validDraft())));
    const content = `${DOCUMENT_TEXT} Contact jane@example.com. Case: redact-default.`;

    const response = await POST(buildRequest({ content }));
    expect(response.status).toBe(200);

    const sentContent = userMessageContent(0);
    expect(sentContent).toContain("[REDACTED_EMAIL]");
    expect(sentContent).not.toContain("jane@example.com");

    const body = await response.json();
    expect(body.documentText).toContain("jane@example.com");
    expect(body.redactions).toEqual([{ type: "email", count: 1 }]);
  });

  it("sends the original text when redactPii is explicitly disabled", async () => {
    chatCompletionMock.mockResolvedValue(jsonResponse(JSON.stringify(validDraft())));
    const content = `${DOCUMENT_TEXT} Contact jane@example.com. Case: redact-disabled.`;

    const response = await POST(buildRequest({ content, redactPii: false }));

    const sentContent = userMessageContent(0);
    expect(sentContent).toContain("jane@example.com");

    const body = await response.json();
    expect(body.redactions).toEqual([]);
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

  it("returns 400 when the request body isn't valid multipart form-data", async () => {
    // A distinct IP: the rate limiter runs before body parsing, and this
    // file's other tests already exercise most of the shared "unknown"
    // bucket's budget.
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=not-a-real-boundary",
        "x-forwarded-for": "203.0.113.20",
      },
      body: "this is not multipart-encoded content",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_request");
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("returns a cached analysis on a repeat request without calling the model again", async () => {
    chatCompletionMock.mockResolvedValue(jsonResponse(JSON.stringify(validDraft())));
    const content = `${DOCUMENT_TEXT} Case: cache-hit.`;
    // A distinct IP, for the same reason as above.
    const options = { content, headers: { "x-forwarded-for": "203.0.113.21" } };

    const first = await POST(buildRequest(options));
    expect(first.status).toBe(200);
    expect(chatCompletionMock).toHaveBeenCalledTimes(1);

    const second = await POST(buildRequest(options));
    expect(second.status).toBe(200);
    expect(chatCompletionMock).toHaveBeenCalledTimes(1);

    const body = await second.json();
    expect(body.analysis.clauses).toHaveLength(1);
    expect(body.redactions).toEqual([]);
  });
});
