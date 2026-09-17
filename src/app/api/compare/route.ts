import { NextResponse } from "next/server";
import {
  extractText,
  ExtractTextError,
  MAX_COMBINED_CHARS,
} from "@/lib/parsing/extractText";
import { generateStructured, AiError } from "@/lib/ai/generateStructured";
import { COMPARE_SYSTEM_PROMPT, wrapDocumentPair } from "@/lib/ai/prompts";
import { analyzeRequestSchema, compareRequestSchema } from "@/lib/schemas/api";
import {
  comparisonDraftSchema,
  type Comparison,
  type ComparisonItem,
  type ComparisonQuote,
} from "@/lib/schemas/comparison";
import { createQuoteLocator, type QuoteLocator } from "@/lib/grounding/locateQuote";
import { loadBaselineText, BaselineNotFoundError } from "@/lib/compare/loadBaseline";
import { sha256 } from "@/lib/security/hash";
import { LruCache } from "@/lib/security/lru";
import { RateLimiter, getClientIp } from "@/lib/security/rateLimit";
import { redactPii, type RedactionSummary } from "@/lib/security/redactPii";
import { logRouteError } from "@/lib/security/logger";
import { errorResponse, aiErrorStatus, extractTextStatus } from "@/lib/api/response";

const ROUTE = "compare";
const compareCache = new LruCache<string, Comparison>({ capacity: 50, ttlMs: 30 * 60 * 1000 });
const rateLimiter = new RateLimiter({ limit: 10, windowMs: 60_000 });

export async function POST(request: Request): Promise<NextResponse> {
  const rate = rateLimiter.check(getClientIp(request));
  if (!rate.allowed) {
    return errorResponse(
      "rate_limited",
      "Too many requests. Please wait before trying again.",
      429,
      rate.retryAfterSeconds,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("invalid_request", "Expected multipart/form-data", 400);
  }

  const meta = compareRequestSchema.safeParse({
    documentTextA: formData.get("documentTextA"),
    baselineId: formData.get("baselineId") || undefined,
  });
  if (!meta.success) {
    return errorResponse(
      "invalid_request",
      meta.error.issues[0]?.message ?? "Invalid request",
      400,
    );
  }
  const { documentTextA, baselineId } = meta.data;

  let documentTextB: string;
  if (baselineId) {
    try {
      documentTextB = await loadBaselineText(baselineId);
    } catch (error) {
      if (error instanceof BaselineNotFoundError) {
        return errorResponse("invalid_request", error.message, 400);
      }
      logRouteError({ route: ROUTE, code: "internal_error", status: 500 }, error);
      return errorResponse("internal_error", "Failed to load the baseline document", 500);
    }
  } else {
    const fileB = formData.get("fileB");
    if (!(fileB instanceof File)) {
      return errorResponse(
        "invalid_request",
        "Provide either a second file ('fileB') or a 'baselineId'",
        400,
      );
    }

    const fileMeta = analyzeRequestSchema.safeParse({ mimeType: fileB.type, size: fileB.size });
    if (!fileMeta.success) {
      return errorResponse(
        "invalid_request",
        fileMeta.error.issues[0]?.message ?? "Invalid second file",
        400,
      );
    }

    try {
      const buffer = Buffer.from(await fileB.arrayBuffer());
      documentTextB = await extractText({ buffer, mimeType: fileMeta.data.mimeType });
    } catch (error) {
      if (error instanceof ExtractTextError) {
        return errorResponse(error.code, error.message, extractTextStatus(error.code));
      }
      logRouteError({ route: ROUTE, code: "internal_error", status: 500 }, error);
      return errorResponse("internal_error", "Failed to read the second document", 500);
    }
  }

  if (documentTextA.length + documentTextB.length > MAX_COMBINED_CHARS) {
    return errorResponse(
      "combined_too_large",
      `The two documents together exceed the ${MAX_COMBINED_CHARS} character limit`,
      413,
    );
  }

  const hash = sha256(`${documentTextA} ${documentTextB}`);
  const cached = compareCache.get(hash);
  if (cached) {
    return NextResponse.json({
      comparison: cached,
      documentTextA,
      documentTextB,
      redactions: [],
    });
  }

  const shouldRedact = formData.get("redactPii") !== "false";
  const redactedA = shouldRedact
    ? redactPii(documentTextA)
    : { text: documentTextA, redactions: [] as RedactionSummary[] };
  const redactedB = shouldRedact
    ? redactPii(documentTextB)
    : { text: documentTextB, redactions: [] as RedactionSummary[] };
  const redactions = mergeRedactionSummaries(redactedA.redactions, redactedB.redactions);

  let draft;
  try {
    draft = await generateStructured({
      schema: comparisonDraftSchema,
      prompt: wrapDocumentPair(redactedA.text, redactedB.text),
      systemInstruction: COMPARE_SYSTEM_PROMPT,
    });
  } catch (error) {
    if (error instanceof AiError) {
      logRouteError({ route: ROUTE, code: error.code, status: aiErrorStatus(error.code) }, error);
      return errorResponse(error.code, error.message, aiErrorStatus(error.code));
    }
    logRouteError({ route: ROUTE, code: "internal_error", status: 500 }, error);
    return errorResponse("internal_error", "Failed to compare the documents", 500);
  }

  // Build each document's locator once and reuse it across every item,
  // rather than re-normalizing the whole document per quote.
  const locatorA = createQuoteLocator(documentTextA);
  const locatorB = createQuoteLocator(documentTextB);

  const items: ComparisonItem[] = draft.items.map((item) => ({
    topic: item.topic,
    status: item.status,
    docA: groundQuote(locatorA, item.docAQuote),
    docB: groundQuote(locatorB, item.docBQuote),
    explanation: item.explanation,
    favours: item.favours,
  }));

  const comparison: Comparison = { items, summary: draft.summary };

  compareCache.set(hash, comparison);

  return NextResponse.json({ comparison, documentTextA, documentTextB, redactions });
}

function mergeRedactionSummaries(
  a: RedactionSummary[],
  b: RedactionSummary[],
): RedactionSummary[] {
  const counts = new Map<string, number>();
  for (const { type, count } of [...a, ...b]) {
    counts.set(type, (counts.get(type) ?? 0) + count);
  }
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}

function groundQuote(locator: QuoteLocator, quote: string | undefined): ComparisonQuote | undefined {
  if (!quote) return undefined;
  const location = locator.locate(quote);
  if (!location) return { quote, verified: false };
  return { quote, start: location.start, end: location.end, verified: true };
}
