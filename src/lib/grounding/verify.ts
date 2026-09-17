import { createQuoteLocator, type QuoteLocation } from "./locateQuote";

export interface VerifiedFields {
  start?: number;
  end?: number;
  verified: boolean;
}

function toVerifiedFields(location: QuoteLocation | null): VerifiedFields {
  if (!location) return { verified: false };
  return { start: location.start, end: location.end, verified: true };
}

export function verifyQuote(sourceText: string, quote: string): VerifiedFields {
  return toVerifiedFields(createQuoteLocator(sourceText).locate(quote));
}

export function verifyQuoteField<T extends { quote: string }>(
  sourceText: string,
  item: T,
): T & VerifiedFields {
  return { ...item, ...verifyQuote(sourceText, item.quote) };
}

/**
 * Verifies every item's quote against `sourceText`, normalizing the
 * document once and reusing it across all items (see `createQuoteLocator`).
 */
export function verifyQuoteFields<T extends { quote: string }>(
  sourceText: string,
  items: readonly T[],
): (T & VerifiedFields)[] {
  const locator = createQuoteLocator(sourceText);
  return items.map((item) => ({ ...item, ...toVerifiedFields(locator.locate(item.quote)) }));
}
