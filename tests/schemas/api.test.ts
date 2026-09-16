import { describe, it, expect } from "vitest";
import {
  analyzeRequestSchema,
  askRequestSchema,
  compareRequestSchema,
  briefRequestSchema,
  apiErrorSchema,
} from "@/lib/schemas/api";

describe("analyzeRequestSchema", () => {
  it("accepts a supported mime type and positive size", () => {
    expect(() => analyzeRequestSchema.parse({ mimeType: "application/pdf", size: 1024 })).not.toThrow();
  });

  it("rejects an unsupported mime type", () => {
    expect(() =>
      analyzeRequestSchema.parse({ mimeType: "application/msword", size: 1024 }),
    ).toThrow();
  });

  it("rejects a zero or negative size", () => {
    expect(() => analyzeRequestSchema.parse({ mimeType: "text/plain", size: 0 })).toThrow();
  });
});

describe("askRequestSchema", () => {
  const base = { documentText: "Some contract text.", clauses: [], question: "What if I pay late?" };

  it("accepts a minimal valid request", () => {
    expect(() => askRequestSchema.parse(base)).not.toThrow();
  });

  it("rejects an empty question", () => {
    expect(() => askRequestSchema.parse({ ...base, question: "" })).toThrow();
  });

  it("rejects a question over 500 characters", () => {
    expect(() => askRequestSchema.parse({ ...base, question: "a".repeat(501) })).toThrow();
  });

  it("rejects more than 4 history turns", () => {
    const history = Array.from({ length: 5 }, (_, i) => ({
      question: `q${i}`,
      answer: `a${i}`,
    }));
    expect(() => askRequestSchema.parse({ ...base, history })).toThrow();
  });
});

describe("compareRequestSchema", () => {
  const documentTextA = "Document A text.";

  it("accepts a request with a second document", () => {
    expect(() =>
      compareRequestSchema.parse({ documentTextA, documentTextB: "Document B text." }),
    ).not.toThrow();
  });

  it("accepts a request with a baseline id instead of a second document", () => {
    expect(() =>
      compareRequestSchema.parse({ documentTextA, baselineId: "rent-baseline" }),
    ).not.toThrow();
  });

  it("rejects a request with neither a second document nor a baseline id", () => {
    expect(() => compareRequestSchema.parse({ documentTextA })).toThrow();
  });
});

describe("briefRequestSchema", () => {
  const analysis = {
    docTitle: "Lease",
    parties: [],
    summary: "x",
    clauses: [],
    missingCommonClauses: [],
    disclaimer: "This tool gives information, not legal advice.",
  };

  it("accepts an analysis with no qa history", () => {
    expect(() => briefRequestSchema.parse({ analysis })).not.toThrow();
  });

  it("accepts an analysis with qa history", () => {
    expect(() =>
      briefRequestSchema.parse({ analysis, qaHistory: [{ question: "q", answer: "a" }] }),
    ).not.toThrow();
  });
});

describe("apiErrorSchema", () => {
  it("accepts a typed error shape", () => {
    const error = { error: { code: "not_found", message: "Resource not found" } };
    expect(apiErrorSchema.parse(error)).toEqual(error);
  });

  it("rejects a bare error string", () => {
    expect(() => apiErrorSchema.parse({ error: "oops" })).toThrow();
  });
});
