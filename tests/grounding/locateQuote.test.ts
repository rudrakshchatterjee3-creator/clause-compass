import { describe, it, expect } from "vitest";
import { locateQuote, createQuoteLocator } from "@/lib/grounding/locateQuote";

describe("locateQuote", () => {
  it("finds an exact quote", () => {
    const source = "The tenant shall pay rent on the first of each month.";
    const location = locateQuote(source, "pay rent on the first");
    expect(location).not.toBeNull();
    expect(source.slice(location!.start, location!.end)).toBe("pay rent on the first");
  });

  it("is case-insensitive", () => {
    const source = "The Tenant SHALL pay Rent monthly.";
    const location = locateQuote(source, "shall pay rent");
    expect(location).not.toBeNull();
    expect(source.slice(location!.start, location!.end).toLowerCase()).toBe("shall pay rent");
  });

  it("matches quotes with smart quotes and dashes normalized to plain ones", () => {
    const source = "The party’s obligation — due within 30 days — is absolute.";
    const location = locateQuote(
      source,
      "The party's obligation - due within 30 days - is absolute.",
    );
    expect(location).not.toBeNull();
  });

  it("matches when the source uses curly quotes but the model quotes straight ones", () => {
    const source = "“Late fees apply” after 5 days.";
    const location = locateQuote(source, '"Late fees apply"');
    expect(location).not.toBeNull();
  });

  it("collapses whitespace across line breaks mid-quote", () => {
    const source = "The tenant\n   shall\n\tpay rent in full.";
    const location = locateQuote(source, "tenant shall pay rent");
    expect(location).not.toBeNull();
    expect(source.slice(location!.start, location!.end)).toBe("tenant\n   shall\n\tpay rent");
  });

  it("returns null when the quote is not present", () => {
    const source = "This agreement has no termination clause.";
    expect(locateQuote(source, "early termination fee applies")).toBeNull();
  });

  it("returns null for an empty or whitespace-only quote", () => {
    expect(locateQuote("Some text", "   ")).toBeNull();
    expect(locateQuote("Some text", "")).toBeNull();
  });

  it("resolves ellipsis quotes by matching the first and last segments in order", () => {
    const source =
      "The tenant shall pay a security deposit of $1,000 refundable within 30 days of move-out.";
    const location = locateQuote(
      source,
      "security deposit of $1,000 ... within 30 days of move-out",
    );
    expect(location).not.toBeNull();
    expect(source.slice(location!.start, location!.end)).toBe(
      "security deposit of $1,000 refundable within 30 days of move-out",
    );
  });

  it("resolves ellipsis quotes using the unicode ellipsis character", () => {
    const source =
      "Either party may terminate this agreement with 60 days written notice to the other party.";
    const location = locateQuote(source, "Either party may terminate… 60 days written notice");
    expect(location).not.toBeNull();
  });

  it("returns null for an ellipsis quote whose segments are out of order in the source", () => {
    const source = "First the deposit is paid. Later the lease begins.";
    const location = locateQuote(source, "lease begins ... deposit is paid");
    expect(location).toBeNull();
  });

  it("returns null when only one side of an ellipsis quote is found", () => {
    const source = "The lease begins on the first day of the month.";
    const location = locateQuote(source, "lease begins ... nonexistent phrase");
    expect(location).toBeNull();
  });

  it("returns null when the first segment of an ellipsis quote isn't found", () => {
    const source = "The lease begins on the first day of the month.";
    const location = locateQuote(source, "nonexistent phrase ... first day");
    expect(location).toBeNull();
  });

  it("resolves a quote with a trailing ellipsis and no second segment", () => {
    const source = "The tenant shall pay rent on the first of each month.";
    const location = locateQuote(source, "pay rent on the first ...");
    expect(location).not.toBeNull();
    expect(source.slice(location!.start, location!.end)).toBe("pay rent on the first");
  });

  it("returns null for a quote that is only an ellipsis", () => {
    expect(locateQuote("Some text here.", "...")).toBeNull();
  });
});

describe("createQuoteLocator", () => {
  it("locates multiple quotes against the same normalized document", () => {
    const source = "The tenant shall pay rent. Late fees may apply after 5 days.";
    const locator = createQuoteLocator(source);

    const rent = locator.locate("pay rent");
    const lateFees = locator.locate("Late fees may apply");

    expect(rent).not.toBeNull();
    expect(source.slice(rent!.start, rent!.end)).toBe("pay rent");
    expect(lateFees).not.toBeNull();
    expect(source.slice(lateFees!.start, lateFees!.end)).toBe("Late fees may apply");
  });

  it("returns null from the shared locator for a quote that isn't present", () => {
    const locator = createQuoteLocator("The tenant shall pay rent.");
    expect(locator.locate("this text does not appear")).toBeNull();
  });

  it("agrees with locateQuote for the same source and quote", () => {
    const source = "The tenant shall pay rent on the first of each month.";
    const quote = "pay rent on the first";
    expect(createQuoteLocator(source).locate(quote)).toEqual(locateQuote(source, quote));
  });
});
