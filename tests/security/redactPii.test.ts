import { describe, it, expect } from "vitest";
import { redactPii } from "@/lib/security/redactPii";

describe("redactPii", () => {
  it("redacts an email address", () => {
    const { text, redactions } = redactPii("Contact us at jane.doe@example.com for questions.");
    expect(text).toBe("Contact us at [REDACTED_EMAIL] for questions.");
    expect(redactions).toEqual([{ type: "email", count: 1 }]);
  });

  it("redacts a phone number", () => {
    const { text, redactions } = redactPii("Call me at (555) 123-4567 tomorrow.");
    expect(text).toContain("[REDACTED_PHONE]");
    expect(redactions).toEqual([{ type: "phone", count: 1 }]);
  });

  it("redacts a card-like number", () => {
    const { text, redactions } = redactPii("Card on file: 4111 1111 1111 1111.");
    expect(text).toContain("[REDACTED_CARD]");
    expect(redactions.find((r) => r.type === "card")?.count).toBe(1);
  });

  it("redacts an Aadhaar-like 12-digit number", () => {
    const { text, redactions } = redactPii("Aadhaar: 1234 5678 9012.");
    expect(text).toContain("[REDACTED_ID]");
    expect(redactions.find((r) => r.type === "aadhaar")?.count).toBe(1);
  });

  it("redacts a PAN-like id", () => {
    const { text, redactions } = redactPii("PAN: ABCDE1234F on file.");
    expect(text).toContain("[REDACTED_ID]");
    expect(redactions.find((r) => r.type === "pan")?.count).toBe(1);
  });

  it("counts multiple occurrences of the same type", () => {
    const { redactions } = redactPii("Emails: a@example.com and b@example.com.");
    expect(redactions).toEqual([{ type: "email", count: 2 }]);
  });

  it("returns the original text unchanged when there is no PII", () => {
    const source = "The tenant shall pay $1,850.00 per month, due on the 1st of each month.";
    const { text, redactions } = redactPii(source);
    expect(text).toBe(source);
    expect(redactions).toEqual([]);
  });

  it("redacts multiple different PII types in one pass", () => {
    const { redactions } = redactPii(
      "Email jane@example.com or call (555) 123-4567. Card 4111 1111 1111 1111.",
    );
    const types = redactions.map((r) => r.type).sort();
    expect(types).toEqual(["card", "email", "phone"]);
  });
});
