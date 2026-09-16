import { describe, it, expect } from "vitest";
import { comparisonSchema } from "@/lib/schemas/comparison";

describe("comparisonSchema", () => {
  it("accepts a comparison with mixed statuses", () => {
    const comparison = {
      items: [
        {
          topic: "Late fee",
          status: "changed",
          docAQuote: "$25 late fee",
          docBQuote: "$50 late fee",
          explanation: "The late fee doubled in the new document.",
          favours: "A",
        },
        {
          topic: "Pet deposit",
          status: "added",
          docBQuote: "$200 refundable pet deposit",
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
      items: [
        {
          topic: "Late fee",
          status: "modified",
          explanation: "x",
          favours: "neutral",
        },
      ],
      summary: "x",
    };
    expect(() => comparisonSchema.parse(comparison)).toThrow();
  });

  it("rejects an unknown favours value", () => {
    const comparison = {
      items: [
        {
          topic: "Late fee",
          status: "same",
          explanation: "x",
          favours: "both",
        },
      ],
      summary: "x",
    };
    expect(() => comparisonSchema.parse(comparison)).toThrow();
  });
});
