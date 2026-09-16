import { describe, it, expect } from "vitest";
import {
  wrapDocument,
  DOCUMENT_TAG_OPEN,
  DOCUMENT_TAG_CLOSE,
  DISCLAIMER,
  ANALYZE_SYSTEM_PROMPT,
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
