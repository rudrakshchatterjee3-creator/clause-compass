import { describe, it, expect, vi, beforeEach } from "vitest";
import { sseStreamResponse, sseJsonResponse } from "../helpers/sseResponse";

const { chatCompletionMock } = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getAiClient: () => ({ chatCompletion: chatCompletionMock }),
}));

import { POST } from "@/app/api/ask/route";

const DOCUMENT_TEXT =
  "The tenant shall pay $1,200 rent on the first of each month. Either party may terminate this lease with 60 days written notice.";

function buildRequest(body: Record<string, unknown>, headers?: HeadersInit): Request {
  return new Request("http://localhost/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/** Variadic convenience wrapper for the streamed-answer mocks below. */
function sseResponse(...chunks: string[]): Response {
  return sseStreamResponse(chunks);
}

/** A single-chunk SSE response — generateStructured also streams internally now. */
function jsonResponse(content: string): Response {
  return sseJsonResponse(content);
}

/** Routes the mocked chatCompletion call by its `jsonMode` flag, matching the route's two calls. */
function mockChatCompletion(options: {
  stream?: Response | (() => Promise<Response>);
  structured?: Response | (() => Promise<Response>);
}): void {
  chatCompletionMock.mockImplementation(async (params: { jsonMode?: boolean }) => {
    const handler = params.jsonMode ? options.structured : options.stream;
    if (!handler) throw new Error("unexpected chatCompletion call");
    return typeof handler === "function" ? handler() : handler;
  });
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
    chatCompletionMock.mockReset();
  });

  it("streams answer chunks then a verified result", async () => {
    mockChatCompletion({
      stream: sseResponse("You pay ", "$1,200 rent monthly."),
      structured: jsonResponse(
        JSON.stringify({
          answerable: true,
          steps: [{ text: "Rent is due monthly.", quote: "pay $1,200 rent on the first" }],
          confidence: "high",
          suggestLawyer: false,
        }),
      ),
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
    mockChatCompletion({
      stream: sseResponse("Some answer."),
      structured: jsonResponse(
        JSON.stringify({
          answerable: true,
          steps: [{ text: "x", quote: "this text is nowhere in the document" }],
          confidence: "medium",
          suggestLawyer: false,
        }),
      ),
    });

    const response = await POST(buildRequest({ documentText: DOCUMENT_TEXT, question: "q" }));
    const events = await readEvents(response);
    const resultEvent = events.at(-1) as { result: { steps: { verified: boolean }[] } };
    expect(resultEvent.result.steps[0]?.verified).toBe(false);
  });

  it("returns an unanswerable result when the document doesn't cover it", async () => {
    mockChatCompletion({
      stream: sseResponse("The document doesn't say."),
      structured: jsonResponse(
        JSON.stringify({ answerable: false, steps: [], confidence: "low", suggestLawyer: true }),
      ),
    });

    const response = await POST(buildRequest({ documentText: DOCUMENT_TEXT, question: "q" }));
    const events = await readEvents(response);
    const resultEvent = events.at(-1) as { result: { answerable: boolean; suggestLawyer: boolean } };
    expect(resultEvent.result.answerable).toBe(false);
    expect(resultEvent.result.suggestLawyer).toBe(true);
  });

  it("emits an error event when the streaming call fails", async () => {
    mockChatCompletion({
      stream: () => Promise.reject(new Error("boom")),
    });

    const response = await POST(buildRequest({ documentText: DOCUMENT_TEXT, question: "q" }));
    expect(response.status).toBe(200);

    const events = await readEvents(response);
    expect(events).toHaveLength(1);
    expect((events[0] as { type: string }).type).toBe("error");
  });

  it("emits an error event when the detail call fails after streaming succeeds", async () => {
    mockChatCompletion({
      stream: sseResponse("An answer."),
      structured: () => Promise.reject(new Error("boom")),
    });

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
    expect(chatCompletionMock).not.toHaveBeenCalled();
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

  it("includes prior Q&A turns in the prompt when history is provided", async () => {
    mockChatCompletion({
      stream: sseResponse("A follow-up answer."),
      structured: jsonResponse(
        JSON.stringify({ answerable: true, steps: [], confidence: "low", suggestLawyer: false }),
      ),
    });

    await POST(
      buildRequest(
        {
          documentText: DOCUMENT_TEXT,
          question: "What about after that?",
          history: [{ question: "What if I pay rent?", answer: "You owe $1,200." }],
        },
        // A distinct IP: this file's other tests already exercise most of
        // the shared "unknown" bucket's budget.
        { "x-forwarded-for": "203.0.113.30" },
      ),
    );

    const streamArgs = chatCompletionMock.mock.calls[0]![0] as {
      messages: { role: string; content: string }[];
    };
    const userMessage = streamArgs.messages.find((m) => m.role === "user")!;
    expect(userMessage.content).toContain("Earlier in this conversation:");
    expect(userMessage.content).toContain("Q1: What if I pay rent?");
    expect(userMessage.content).toContain("A1: You owe $1,200.");
  });

  it("redacts PII from the prompt by default and emits a redactions event", async () => {
    mockChatCompletion({
      stream: sseResponse("An answer."),
      structured: jsonResponse(
        JSON.stringify({ answerable: true, steps: [], confidence: "low", suggestLawyer: false }),
      ),
    });

    const documentText = `${DOCUMENT_TEXT} Contact jane@example.com.`;
    const response = await POST(buildRequest({ documentText, question: "q" }));
    const events = await readEvents(response);

    expect(events[0]).toEqual({
      type: "redactions",
      redactions: [{ type: "email", count: 1 }],
    });

    const streamArgs = chatCompletionMock.mock.calls[0]![0] as {
      messages: { role: string; content: string }[];
    };
    const userMessage = streamArgs.messages.find((m) => m.role === "user")!;
    expect(userMessage.content).toContain("[REDACTED_EMAIL]");
    expect(userMessage.content).not.toContain("jane@example.com");
  });

  it("sends the original text when redactPii is explicitly disabled", async () => {
    mockChatCompletion({
      stream: sseResponse("An answer."),
      structured: jsonResponse(
        JSON.stringify({ answerable: true, steps: [], confidence: "low", suggestLawyer: false }),
      ),
    });

    const documentText = `${DOCUMENT_TEXT} Contact jane@example.com.`;
    const response = await POST(
      buildRequest({ documentText, question: "q", redactPii: false }),
    );
    const events = await readEvents(response);

    expect(events[0]).not.toMatchObject({ type: "redactions" });
    const streamArgs = chatCompletionMock.mock.calls[0]![0] as {
      messages: { role: string; content: string }[];
    };
    const userMessage = streamArgs.messages.find((m) => m.role === "user")!;
    expect(userMessage.content).toContain("jane@example.com");
  });
});
