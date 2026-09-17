export interface QuoteLocation {
  start: number;
  end: number;
}

const CHAR_NORMALIZATIONS: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "‟": '"',
  "–": "-",
  "—": "-",
  "−": "-",
};

interface NormalizedText {
  normalized: string;
  /** normalized[i] came from source[indexMap[i]] */
  indexMap: number[];
}

function normalize(source: string): NormalizedText {
  let normalized = "";
  const indexMap: number[] = [];
  let lastWasSpace = false;

  for (let i = 0; i < source.length; i++) {
    const raw = source[i]!;
    const mapped = CHAR_NORMALIZATIONS[raw] ?? raw;

    if (/\s/.test(mapped)) {
      if (lastWasSpace) continue;
      normalized += " ";
      indexMap.push(i);
      lastWasSpace = true;
    } else {
      normalized += mapped.toLowerCase();
      indexMap.push(i);
      lastWasSpace = false;
    }
  }

  return { normalized, indexMap };
}

function toOriginalRange(
  indexMap: readonly number[],
  normalizedStart: number,
  normalizedEnd: number,
): QuoteLocation {
  return {
    start: indexMap[normalizedStart]!,
    end: indexMap[normalizedEnd - 1]! + 1,
  };
}

function findSegment(
  normSource: string,
  indexMap: readonly number[],
  segment: string,
  searchFrom: number,
): { location: QuoteLocation; normEnd: number } | null {
  const { normalized: normSegment } = normalize(segment);
  if (normSegment.length === 0) return null;

  const idx = normSource.indexOf(normSegment, searchFrom);
  if (idx === -1) return null;

  const normEnd = idx + normSegment.length;
  return { location: toOriginalRange(indexMap, idx, normEnd), normEnd };
}

function locateEllipsisQuote(
  normSource: string,
  indexMap: readonly number[],
  quote: string,
): QuoteLocation | null {
  const segments = quote
    .split(/\.{3}|…/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) return null;

  const first = segments[0]!;
  const firstMatch = findSegment(normSource, indexMap, first, 0);
  if (!firstMatch) return null;

  if (segments.length === 1) {
    return firstMatch.location;
  }

  const last = segments[segments.length - 1]!;
  const lastMatch = findSegment(normSource, indexMap, last, firstMatch.normEnd);
  if (!lastMatch) return null;

  return { start: firstMatch.location.start, end: lastMatch.location.end };
}

export interface QuoteLocator {
  locate(quote: string): QuoteLocation | null;
}

/**
 * Normalizes `source` once and returns a reusable locator. Prefer this over
 * calling `locateQuote` in a loop — verifying every clause/step in a
 * document by re-normalizing the whole document on each call is O(items ×
 * document length) instead of O(items + document length).
 */
export function createQuoteLocator(source: string): QuoteLocator {
  const { normalized: normSource, indexMap } = normalize(source);

  return {
    locate(quote: string): QuoteLocation | null {
      const trimmedQuote = quote.trim();
      if (trimmedQuote.length === 0) return null;

      if (trimmedQuote.includes("...") || trimmedQuote.includes("…")) {
        return locateEllipsisQuote(normSource, indexMap, trimmedQuote);
      }

      const match = findSegment(normSource, indexMap, trimmedQuote, 0);
      return match ? match.location : null;
    },
  };
}

export function locateQuote(source: string, quote: string): QuoteLocation | null {
  return createQuoteLocator(source).locate(quote);
}
