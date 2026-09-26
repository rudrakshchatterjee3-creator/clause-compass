import { describe, it, expect } from "vitest";
import {
  wrapDocument,
  DOCUMENT_TAG_OPEN,
  DOCUMENT_TAG_CLOSE,
  DISCLAIMER,
  ANALYZE_SYSTEM_PROMPT,
  ANALYSIS_TAG_OPEN,
  ANALYSIS_TAG_CLOSE,
  BRIEF_SYSTEM_PROMPT,
  buildBriefContents,
} from "@/lib/ai/prompts";

describe("wrapDocument", () => {
  it("wraps text in document delimiters", () => {
    const wrapped = wrapDocument("hello world");
    expect(wrapped).toBe(`${DOCUMENT_TAG_OPEN}\nhello world\n${DOCUMENT_TAG_CLOSE}`);
  });
});

describe("DISCLAIMER", () => {
  it("states this is information, not legal advice", () => {
    expect(DISCLAIMER).toMatch(/information, not legal advice/i);
  });
});

describe("ANALYZE_SYSTEM_PROMPT", () => {
  it("references the document delimiters and treats them as data", () => {
    expect(ANALYZE_SYSTEM_PROMPT).toContain(DOCUMENT_TAG_OPEN);
    expect(ANALYZE_SYSTEM_PROMPT).toContain(DOCUMENT_TAG_CLOSE);
    expect(ANALYZE_SYSTEM_PROMPT).toMatch(/data, not instructions/i);
  });

  it("requires verbatim quotes", () => {
    expect(ANALYZE_SYSTEM_PROMPT).toMatch(/verbatim/i);
  });

  it("forbids inventing facts and allows saying the document doesn't specify", () => {
    expect(ANALYZE_SYSTEM_PROMPT).toMatch(/never invent/i);
    expect(ANALYZE_SYSTEM_PROMPT).toMatch(/not specified in the document/i);
  });

  it("asks for plain, 8th-grade-level English", () => {
    expect(ANALYZE_SYSTEM_PROMPT).toMatch(/8th-grade/i);
  });

  it("frames output as information, not legal advice", () => {
    expect(ANALYZE_SYSTEM_PROMPT).toMatch(/not a lawyer/i);
    expect(ANALYZE_SYSTEM_PROMPT).toMatch(/never give legal advice/i);
  });
});

describe("buildBriefContents", () => {
  const analysis = {
    docTitle: "Residential Lease",
    parties: ["Landlord", "Tenant"],
    summary: "A lease.",
    clauses: [
      {
        title: "Late Fees",
        type: "penalty",
        plainEnglish: "Late rent costs extra.",
        risk: { level: "high", reason: "Uncapped fee." },
        obligations: [{ party: "Tenant", duty: "Pay on time", deadline: "the 1st" }],
      },
    ],
    missingCommonClauses: ["Pet policy"],
  };

  it("wraps the analysis in delimiters and includes clause detail", () => {
    const contents = buildBriefContents({ analysis });
    expect(contents).toContain(ANALYSIS_TAG_OPEN);
    expect(contents).toContain(ANALYSIS_TAG_CLOSE);
    expect(contents).toContain("Late Fees");
    expect(contents).toContain("high risk");
    expect(contents).toContain("Tenant must Pay on time, due the 1st");
    expect(contents).toContain("Missing common clauses: Pet policy");
  });

  it("appends Q&A history when provided", () => {
    const contents = buildBriefContents({
      analysis,
      qaHistory: [{ question: "What if I pay late?", answer: "You owe a fee." }],
    });
    expect(contents).toContain("Q1: What if I pay late?");
    expect(contents).toContain("A1: You owe a fee.");
  });

  it("omits the history section when there is none", () => {
    const contents = buildBriefContents({ analysis });
    expect(contents).not.toContain("also asked");
  });

  it("falls back to 'not specified' when no parties were extracted", () => {
    const contents = buildBriefContents({ analysis: { ...analysis, parties: [] } });
    expect(contents).toContain("Parties: not specified");
  });
});

describe("BRIEF_SYSTEM_PROMPT", () => {
  it("references the analysis delimiters and treats them as data", () => {
    expect(BRIEF_SYSTEM_PROMPT).toContain(ANALYSIS_TAG_OPEN);
    expect(BRIEF_SYSTEM_PROMPT).toContain(ANALYSIS_TAG_CLOSE);
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/data, not instructions/i);
  });

  it("frames output as preparation, not legal advice", () => {
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/not a lawyer/i);
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/never give legal advice/i);
  });

  it("forbids inventing facts", () => {
    expect(BRIEF_SYSTEM_PROMPT).toMatch(/never invent/i);
  });
});
