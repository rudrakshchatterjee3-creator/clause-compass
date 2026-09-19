import { describe, it, expect, vi, beforeEach } from "vitest";

const { chatCompletionMock } = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getAiClient: () => ({ chatCompletion: chatCompletionMock }),
}));

import { POST } from "@/app/api/compare/route";

const DOC_A = "The tenant shall pay a $25 late fee. Pets are not allowed on the premises.";
const DOC_B = "The tenant shall pay a $50 late fee. Pets are allowed with a deposit.";

/** Builds a fetch-style Response whose body streams a single SSE content delta. */
function jsonResponse(content: string): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const chunk = { choices: [{ delta: { content } }] };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

function userMessageContent(callIndex: number): string {
  const args = chatCompletionMock.mock.calls[callIndex]![0] as {
    messages: { role: string; content: string }[];
  };
  return args.messages.find((m) => m.role === "user")!.content;
}

function buildRequest(fields: Record<string, string>, fileB?: { content: string; name: string; type: string }): Request {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);
  if (fileB) {
    formData.append("fileB", new Blob([fileB.content], { type: fileB.type }), fileB.name);
  }
  return new Request("http://localhost/api/compare", { method: "POST", body: formData });
}

describe("POST /api/compare", () => {
  beforeEach(() => {
    chatCompletionMock.mockReset();
  });

  it("aligns clauses and verifies each quote against its own document", async () => {
    chatCompletionMock.mockResolvedValue(
      jsonResponse(
        JSON.stringify({
          items: [
            {
              topic: "Late fee",
              status: "changed",
              docAQuote: "$25 late fee",
              docBQuote: "$50 late fee",
              explanation: "The late fee doubled.",
              favours: "A",
            },
            {
              topic: "Pets",
              status: "changed",
              docAQuote: "Pets are not allowed on the premises.",
              docBQuote: "Pets are allowed with a deposit.",
              explanation: "Document B allows pets.",
              favours: "B",
            },
          ],
          summary: "Document B raises the late fee but allows pets.",
        }),
      ),
    );

    const response = await POST(
      buildRequest({ documentTextA: DOC_A }, { content: DOC_B, name: "b.txt", type: "text/plain" }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.documentTextA).toBe(DOC_A);
    expect(body.documentTextB).toBe(DOC_B);

    const [lateFee, pets] = body.comparison.items;
    expect(lateFee.docA).toEqual({ quote: "$25 late fee", start: expect.any(Number), end: expect.any(Number), verified: true });
    expect(lateFee.docB).toEqual({ quote: "$50 late fee", start: expect.any(Number), end: expect.any(Number), verified: true });
    expect(pets.docA.verified).toBe(true);
    expect(pets.docB.verified).toBe(true);
  });

  it("marks a quote unverified when it doesn't actually appear in its claimed document (cross-document alignment check)", async () => {
    chatCompletionMock.mockResolvedValue(
      jsonResponse(
        JSON.stringify({
          items: [
            {
              topic: "Late fee",
              // docAQuote actually only exists in DOC_B, not DOC_A — the model got it backwards.
              docAQuote: "$50 late fee",
              docBQuote: "$50 late fee",
              status: "same",
              explanation: "x",
              favours: "neutral",
            },
          ],
          summary: "x",
        }),
      ),
    );

    const response = await POST(
      buildRequest(
        { documentTextA: `${DOC_A} Case: cross-check.` },
        { content: `${DOC_B} Case: cross-check.`, name: "b.txt", type: "text/plain" },
      ),
    );
    const body = await response.json();

    expect(body.comparison.items[0].docA.verified).toBe(false);
    expect(body.comparison.items[0].docB.verified).toBe(true);
  });

  it("compares against a bundled baseline instead of a second file", async () => {
    chatCompletionMock.mockResolvedValue(
      jsonResponse(JSON.stringify({ items: [], summary: "No notable differences." })),
    );

    const response = await POST(
      buildRequest({ documentTextA: DOC_A, baselineId: "residential-lease-fair" }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.documentTextB).toContain("RESIDENTIAL LEASE AGREEMENT");
  });

  it("returns 400 for an unknown baseline id", async () => {
    const response = await POST(buildRequest({ documentTextA: DOC_A, baselineId: "not-real" }));
    expect(response.status).toBe(400);
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when neither fileB nor baselineId is provided", async () => {
    const response = await POST(buildRequest({ documentTextA: DOC_A }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for an unsupported fileB mime type", async () => {
    const response = await POST(
      buildRequest(
        { documentTextA: DOC_A },
        { content: DOC_B, name: "b.doc", type: "application/msword" },
      ),
    );
    expect(response.status).toBe(400);
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("returns 413 when the combined document size exceeds the limit", async () => {
    const big = "a".repeat(120_000);
    const response = await POST(
      buildRequest({ documentTextA: big }, { content: "b".repeat(90_000), name: "b.txt", type: "text/plain" }),
    );
    expect(response.status).toBe(413);
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("returns 502 when the model call fails", async () => {
    chatCompletionMock.mockRejectedValue(new Error("boom"));

    const response = await POST(
      buildRequest(
        { documentTextA: `${DOC_A} Case: model failure.` },
        { content: `${DOC_B} Case: model failure.`, name: "b.txt", type: "text/plain" },
      ),
    );
    expect(response.status).toBe(502);
  });

  it("redacts PII from both documents before sending them to the model, by default", async () => {
    chatCompletionMock.mockResolvedValue(jsonResponse(JSON.stringify({ items: [], summary: "x" })));

    const response = await POST(
      buildRequest(
        { documentTextA: `${DOC_A} Contact jane@example.com. Case: redact-default.` },
        { content: `${DOC_B} Case: redact-default.`, name: "b.txt", type: "text/plain" },
      ),
    );
    expect(response.status).toBe(200);

    const sentContent = userMessageContent(0);
    expect(sentContent).toContain("[REDACTED_EMAIL]");
    expect(sentContent).not.toContain("jane@example.com");

    const body = await response.json();
    expect(body.redactions).toEqual([{ type: "email", count: 1 }]);
    expect(body.documentTextA).toContain("jane@example.com");
  });

  it("sends the original text when redactPii is explicitly disabled", async () => {
    chatCompletionMock.mockResolvedValue(jsonResponse(JSON.stringify({ items: [], summary: "x" })));

    const response = await POST(
      buildRequest(
        {
          documentTextA: `${DOC_A} Contact jane@example.com. Case: redact-disabled.`,
          redactPii: "false",
        },
        { content: `${DOC_B} Case: redact-disabled.`, name: "b.txt", type: "text/plain" },
      ),
    );

    const sentContent = userMessageContent(0);
    expect(sentContent).toContain("jane@example.com");

    const body = await response.json();
    expect(body.redactions).toEqual([]);
  });
});
