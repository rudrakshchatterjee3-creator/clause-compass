import { describe, it, expect } from "vitest";
import {
  comparisonSchema,
  comparisonItemDraftSchema,
  comparisonDraftSchema,
} from "@/lib/schemas/comparison";

describe("comparisonSchema", () => {
  it("accepts a comparison with mixed statuses and verified quotes", () => {
    const comparison = {
      items: [
        {
          topic: "Late fee",
          status: "changed",
          docA: { quote: "$25 late fee", start: 10, end: 22, verified: true },
          docB: { quote: "$50 late fee", start: 5, end: 17, verified: true },
          explanation: "The late fee doubled in the new document.",
          favours: "A",
        },
        {
          topic: "Pet deposit",
          status: "added",
          docB: { quote: "$200 refundable pet deposit", verified: false },
          explanation: "The new document adds a pet deposit.",
          favours: "B",
        },
        {
          topic: "Governing law",
          status: "same",
          explanation: "No change.",
          favours: "neutral",
        },
      ],
      summary: "The new document raises fees and adds a pet deposit.",
    };
    expect(comparisonSchema.parse(comparison)).toEqual(comparison);
  });

  it("rejects an unknown status", () => {
    const comparison = {
      items: [{ topic: "Late fee", status: "modified", explanation: "x", favours: "neutral" }],
      summary: "x",
    };
    expect(() => comparisonSchema.parse(comparison)).toThrow();
  });

  it("rejects an unknown favours value", () => {
    const comparison = {
      items: [{ topic: "Late fee", status: "same", explanation: "x", favours: "both" }],
      summary: "x",
    };
    expect(() => comparisonSchema.parse(comparison)).toThrow();
  });

  it("rejects a docA quote missing its verified flag", () => {
    const comparison = {
      items: [
        {
          topic: "Late fee",
          status: "same",
          docA: { quote: "x" },
          explanation: "x",
          favours: "neutral",
        },
      ],
      summary: "x",
    };
    expect(() => comparisonSchema.parse(comparison)).toThrow();
  });
});

describe("comparisonItemDraftSchema", () => {
  it("accepts plain string quotes, without grounding fields", () => {
    const draft = {
      topic: "Late fee",
      status: "changed",
      docAQuote: "$25 late fee",
      docBQuote: "$50 late fee",
      explanation: "x",
      favours: "B",
    };
    expect(comparisonItemDraftSchema.parse(draft)).toEqual(draft);
  });

  it("accepts an 'added' item with no docAQuote", () => {
    const draft = {
      topic: "Pet deposit",
      status: "added",
      docBQuote: "x",
      explanation: "x",
      favours: "neutral",
    };
    expect(() => comparisonItemDraftSchema.parse(draft)).not.toThrow();
  });
});

describe("comparisonDraftSchema", () => {
  it("accepts the shape the model must produce", () => {
    const draft = {
      items: [
        {
          topic: "Late fee",
          status: "same",
          docAQuote: "x",
          docBQuote: "x",
          explanation: "x",
          favours: "neutral",
        },
      ],
      summary: "x",
    };
    expect(() => comparisonDraftSchema.parse(draft)).not.toThrow();
  });
});
