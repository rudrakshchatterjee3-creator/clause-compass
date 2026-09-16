import { describe, it, expect } from "vitest";
import { briefSchema } from "@/lib/schemas/brief";

describe("briefSchema", () => {
  it("accepts a fully populated brief", () => {
    const brief = {
      keyRisks: ["Uncapped liability clause"],
      questionsForLawyer: ["Is the liability cap enforceable in my state?"],
      documentsToGather: ["Prior lease agreement"],
      deadlines: ["Notice must be given 60 days before renewal"],
    };
    expect(briefSchema.parse(brief)).toEqual(brief);
  });

  it("accepts a brief with all-empty lists", () => {
    const brief = { keyRisks: [], questionsForLawyer: [], documentsToGather: [], deadlines: [] };
    expect(() => briefSchema.parse(brief)).not.toThrow();
  });

  it("rejects a missing field", () => {
    const brief = { keyRisks: [], questionsForLawyer: [], documentsToGather: [] };
    expect(() => briefSchema.parse(brief)).toThrow();
  });
});
