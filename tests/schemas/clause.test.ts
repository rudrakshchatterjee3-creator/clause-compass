import { describe, it, expect } from "vitest";
import { clauseSchema, clauseTypeSchema, riskSchema } from "@/lib/schemas/clause";

const validClause = {
  id: "c1",
  title: "Late Payment Fee",
  type: "payment",
  quote: "A $50 late fee applies after 5 days.",
  plainEnglish: "If you pay late, you owe an extra $50 after 5 days.",
  obligations: [{ party: "Tenant", duty: "Pay rent on time", deadline: "5th of each month" }],
  risk: { level: "medium", reason: "Fee is steep relative to typical rent." },
  start: 10,
  end: 47,
  verified: true,
};

describe("clauseSchema", () => {
  it("accepts a fully populated clause", () => {
    expect(clauseSchema.parse(validClause)).toEqual(validClause);
  });

  it("accepts a clause without optional start/end/deadline", () => {
    const clause = {
      id: validClause.id,
      title: validClause.title,
      type: validClause.type,
      quote: validClause.quote,
      plainEnglish: validClause.plainEnglish,
      obligations: [{ party: "Tenant", duty: "Pay rent on time" }],
      risk: validClause.risk,
      verified: true,
    };
    expect(() => clauseSchema.parse(clause)).not.toThrow();
  });

  it("rejects an unknown clause type", () => {
    expect(() => clauseSchema.parse({ ...validClause, type: "not_a_type" })).toThrow();
  });

  it("rejects an unknown risk level", () => {
    expect(() =>
      riskSchema.parse({ level: "extreme", reason: "too risky" }),
    ).toThrow();
  });

  it("rejects a missing verified flag", () => {
    const clause: Record<string, unknown> = { ...validClause };
    delete clause.verified;
    expect(() => clauseSchema.parse(clause)).toThrow();
  });

  it("rejects negative start/end offsets", () => {
    expect(() => clauseSchema.parse({ ...validClause, start: -1 })).toThrow();
  });

  it("exposes every documented clause type", () => {
    const types = [
      "payment",
      "termination",
      "liability",
      "indemnity",
      "confidentiality",
      "ip",
      "non_compete",
      "dispute",
      "renewal",
      "penalty",
      "privacy",
      "other",
    ];
    for (const type of types) {
      expect(() => clauseTypeSchema.parse(type)).not.toThrow();
    }
  });
});
