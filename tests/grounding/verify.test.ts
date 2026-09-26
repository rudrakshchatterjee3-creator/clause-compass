import { describe, it, expect } from "vitest";
import { verifyQuoteFields } from "@/lib/grounding/verify";

describe("verifyQuoteFields", () => {
  const source = "Rent is due on the 1st. A $50 late fee applies after 5 days.";

  it("marks a found quote as verified with start/end pointing at the source text", () => {
    const [result] = verifyQuoteFields(source, [{ quote: "A $50 late fee" }]);
    expect(result!.verified).toBe(true);
    expect(source.slice(result!.start!, result!.end!)).toBe("A $50 late fee");
  });

  it("marks a missing quote as unverified with no start/end", () => {
    const [result] = verifyQuoteFields(source, [{ quote: "the lease auto-renews annually" }]);
    expect(result!.verified).toBe(false);
    expect(result!.start).toBeUndefined();
    expect(result!.end).toBeUndefined();
  });

  it("keeps each item's other fields intact", () => {
    const [result] = verifyQuoteFields(source, [{ id: "c1", quote: "Rent is due on the 1st" }]);
    expect(result!.id).toBe("c1");
    expect(result!.verified).toBe(true);
  });

  it("verifies a batch of items independently", () => {
    const results = verifyQuoteFields(source, [
      { id: "c1", quote: "Rent is due on the 1st" },
      { id: "c2", quote: "this phrase is not in the document" },
    ]);
    expect(results[0]!.verified).toBe(true);
    expect(results[1]!.verified).toBe(false);
  });

  it("returns an empty array for no items", () => {
    expect(verifyQuoteFields(source, [])).toEqual([]);
  });
});
