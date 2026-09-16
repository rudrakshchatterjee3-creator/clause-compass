import { describe, it, expect } from "vitest";
import { verifyQuote, verifyQuoteField, verifyQuoteFields } from "@/lib/grounding/verify";

describe("verifyQuote", () => {
  const source = "The tenant shall pay a $50 late fee after 5 days.";

  it("marks a found quote as verified with start/end", () => {
    const result = verifyQuote(source, "pay a $50 late fee");
    expect(result.verified).toBe(true);
    expect(result.start).toBeTypeOf("number");
    expect(result.end).toBeTypeOf("number");
    expect(source.slice(result.start!, result.end!)).toBe("pay a $50 late fee");
  });

  it("marks a missing quote as unverified with no start/end", () => {
    const result = verifyQuote(source, "the lease auto-renews annually");
    expect(result.verified).toBe(false);
    expect(result.start).toBeUndefined();
    expect(result.end).toBeUndefined();
  });
});

describe("verifyQuoteField / verifyQuoteFields", () => {
  const source = "Rent is due on the 1st. A $50 late fee applies after 5 days.";

  it("attaches verified fields onto an arbitrary object without losing other fields", () => {
    const item = { id: "c1", quote: "Rent is due on the 1st" };
    const result = verifyQuoteField(source, item);
    expect(result.id).toBe("c1");
    expect(result.verified).toBe(true);
  });

  it("verifies a batch of items independently", () => {
    const items = [
      { id: "c1", quote: "Rent is due on the 1st" },
      { id: "c2", quote: "this phrase is not in the document" },
    ];
    const results = verifyQuoteFields(source, items);
    expect(results[0]!.verified).toBe(true);
    expect(results[1]!.verified).toBe(false);
  });
});
