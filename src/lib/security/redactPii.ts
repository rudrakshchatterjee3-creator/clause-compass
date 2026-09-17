/**
 * Best-effort PII redaction applied to text before it's sent to the model.
 * Not exhaustive PII detection — a pragmatic pass over common, high-signal
 * patterns (emails, phone numbers, card-like numbers, Aadhaar/PAN-like
 * numbers) so obviously sensitive data doesn't leave the server
 * unnecessarily. Grounding/quote verification always runs against the
 * original, un-redacted text; a clause whose quote falls on redacted text
 * may come back unverified rather than corrupted.
 */
export interface RedactionSummary {
  type: string;
  count: number;
}

export interface RedactPiiResult {
  text: string;
  redactions: RedactionSummary[];
}

interface Pattern {
  type: string;
  regex: RegExp;
  placeholder: string;
}

const PATTERNS: Pattern[] = [
  {
    type: "email",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    placeholder: "[REDACTED_EMAIL]",
  },
  {
    type: "pan",
    regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    placeholder: "[REDACTED_ID]",
  },
  {
    // Card-like: 13-19 digits, optionally grouped with spaces or dashes.
    type: "card",
    regex: /\b(?:\d[ -]?){13,19}\b/g,
    placeholder: "[REDACTED_CARD]",
  },
  {
    // Aadhaar-like: 12 digits, commonly grouped 4-4-4.
    type: "aadhaar",
    regex: /\b\d{4}[ ]?\d{4}[ ]?\d{4}\b/g,
    placeholder: "[REDACTED_ID]",
  },
  {
    // No leading \b: a number can start with "(", which isn't a word
    // character, so \b would never match right before it.
    type: "phone",
    regex: /(?<!\d)(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    placeholder: "[REDACTED_PHONE]",
  },
];

export function redactPii(text: string): RedactPiiResult {
  const counts = new Map<string, number>();
  let result = text;

  for (const pattern of PATTERNS) {
    result = result.replace(pattern.regex, () => {
      counts.set(pattern.type, (counts.get(pattern.type) ?? 0) + 1);
      return pattern.placeholder;
    });
  }

  const redactions: RedactionSummary[] = Array.from(counts.entries()).map(([type, count]) => ({
    type,
    count,
  }));

  return { text: result, redactions };
}
