import { locateQuote } from "./locateQuote";

export interface VerifiedFields {
  start?: number;
  end?: number;
  verified: boolean;
}

export function verifyQuote(sourceText: string, quote: string): VerifiedFields {
  const location = locateQuote(sourceText, quote);
  if (!location) {
    return { verified: false };
  }
  return { start: location.start, end: location.end, verified: true };
}

export function verifyQuoteField<T extends { quote: string }>(
  sourceText: string,
  item: T,
): T & VerifiedFields {
  return { ...item, ...verifyQuote(sourceText, item.quote) };
}

export function verifyQuoteFields<T extends { quote: string }>(
  sourceText: string,
  items: readonly T[],
): (T & VerifiedFields)[] {
  return items.map((item) => verifyQuoteField(sourceText, item));
}
