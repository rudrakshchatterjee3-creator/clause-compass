import { describe, it, expect } from "vitest";
import { analysisSchema } from "@/lib/schemas/analysis";

const validAnalysis = {
  docTitle: "Residential Lease Agreement",
  parties: ["Landlord LLC", "Jane Tenant"],
  summary: "A 12-month residential lease with standard terms.",
  clauses: [],
  missingCommonClauses: ["pet policy"],
  disclaimer: "This tool gives information, not legal advice.",
};

describe("analysisSchema", () => {
  it("accepts a valid analysis with no clauses", () => {
    expect(analysisSchema.parse(validAnalysis)).toEqual(validAnalysis);
  });

  it("rejects a missing disclaimer", () => {
    const { disclaimer: _disclaimer, ...rest } = validAnalysis;
    void _disclaimer;
    expect(() => analysisSchema.parse(rest)).toThrow();
  });

  it("rejects non-array parties", () => {
    expect(() => analysisSchema.parse({ ...validAnalysis, parties: "not an array" })).toThrow();
  });
});
