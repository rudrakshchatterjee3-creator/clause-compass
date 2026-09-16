import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateContentStreamMock, generateContentMock } = vi.hoisted(() => ({
  generateContentStreamMock: vi.fn(),
  generateContentMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getGenAIClient: () => ({
    models: {
      generateContentStream: generateContentStreamMock,
      generateContent: generateContentMock,
    },
  }),
}));

import { POST } from "@/app/api/ask/route";

const DOCUMENT_TEXT =
  "The tenant shall pay $1,200 rent on the first of each month. Either party may terminate this lease with 60 days written notice.";

function buildRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function textChunks(...chunks: string[]) {
  return (async function* () {
    for (const chunk of chunks) yield { text: chunk };
  })();
}

async function readEvents(response: Response): Promise<unknown[]> {
  const text = await response.text();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

describe("POST /api/ask", () => {
  beforeEach(() => {
    generateContentStreamMock.mockReset();
    generateContentMock.mockReset();
  });

  it("streams answer chunks then a verified result", async () => {
    generateContentStreamMock.mockResolvedValue(
      textChunks("You pay ", "$1,200 rent monthly."),
    );
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        answerable: true,
        steps: [{ text: "Rent is due monthly.", quote: "pay $1,200 rent on the first" }],
        confidence: "high",
        suggestLawyer: false,
      }),
    });

    const response = await POST(buildRequest({ documentText: DOCUMENT_TEXT, question: "What if I pay rent?" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");

    const events = await readEvents(response);
    expect(events[0]).toEqual({ type: "answer_chunk", text: "You pay " });
    expect(events[1]).toEqual({ type: "answer_chunk", text: "$1,200 rent monthly." });

    const resultEvent = events[2] as { type: string; result: { answer: string; steps: { verified: boolean }[] } };
    expect(resultEvent.type).toBe("result");
    expect(resultEvent.result.answer).toBe("You pay $1,200 rent monthly.");
    expect(resultEvent.result.steps[0]?.verified).toBe(true);
  });

  it("marks a step unverified when its quote isn't in the document", async () => {
    generateContentStreamMock.mockResolvedValue(textChunks("Some answer."));
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        answerable: true,
        steps: [{ text: "x", quote: "this text is nowhere in the document" }],
        confidence: "medium",
        suggestLawyer: false,
      }),
    });

    const response = await POST(buildRequest({ documentText: DOCUMENT_TEXT, question: "q" }));
    const events = await readEvents(response);
    const resultEvent = events.at(-1) as { result: { steps: { verified: boolean }[] } };
    expect(resultEvent.result.steps[0]?.verified).toBe(false);
  });

  it("returns an unanswerable result when the document doesn't cover it", async () => {
    generateContentStreamMock.mockResolvedValue(textChunks("The document doesn't say."));
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ answerable: false, steps: [], confidence: "low", suggestLawyer: true }),
    });

    const response = await POST(buildRequest({ documentText: DOCUMENT_TEXT, question: "q" }));
    const events = await readEvents(response);
    const resultEvent = events.at(-1) as { result: { answerable: boolean; suggestLawyer: boolean } };
    expect(resultEvent.result.answerable).toBe(false);
    expect(resultEvent.result.suggestLawyer).toBe(true);
  });

  it("emits an error event when the streaming call fails", async () => {
    generateContentStreamMock.mockRejectedValue(new Error("boom"));

    const response = await POST(buildRequest({ documentText: DOCUMENT_TEXT, question: "q" }));
    expect(response.status).toBe(200);

    const events = await readEvents(response);
    expect(events).toHaveLength(1);
    expect((events[0] as { type: string }).type).toBe("error");
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("emits an error event when the detail call fails after streaming succeeds", async () => {
    generateContentStreamMock.mockResolvedValue(textChunks("An answer."));
    generateContentMock.mockRejectedValue(new Error("boom"));

    const response = await POST(buildRequest({ documentText: DOCUMENT_TEXT, question: "q" }));
    const events = await readEvents(response);

    expect(events[0]).toEqual({ type: "answer_chunk", text: "An answer." });
    expect((events.at(-1) as { type: string }).type).toBe("error");
  });

  it("returns 400 for a missing question", async () => {
    const response = await POST(buildRequest({ documentText: DOCUMENT_TEXT, question: "" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_request");
    expect(generateContentStreamMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a question over 500 characters", async () => {
    const response = await POST(
      buildRequest({ documentText: DOCUMENT_TEXT, question: "a".repeat(501) }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
