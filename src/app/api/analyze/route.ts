import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { extractText, ExtractTextError } from "@/lib/parsing/extractText";
import { generateStructured, AiError } from "@/lib/ai/generateStructured";
import { ANALYZE_SYSTEM_PROMPT, DISCLAIMER, wrapDocument } from "@/lib/ai/prompts";
import { analyzeRequestSchema } from "@/lib/schemas/api";
import { analysisDraftSchema, type Analysis } from "@/lib/schemas/analysis";
import type { Clause } from "@/lib/schemas/clause";
import { verifyQuoteFields } from "@/lib/grounding/verify";
import { sha256 } from "@/lib/security/hash";
import { LruCache } from "@/lib/security/lru";
import { RateLimiter, getClientIp } from "@/lib/security/rateLimit";
import { redactPii } from "@/lib/security/redactPii";
import { logRouteError } from "@/lib/security/logger";
import { errorResponse, aiErrorStatus, extractTextStatus } from "@/lib/api/response";

const ROUTE = "analyze";
const analysisCache = new LruCache<string, Analysis>({ capacity: 50, ttlMs: 30 * 60 * 1000 });
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

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("invalid_request", "Missing 'file' field", 400);
  }

  const meta = analyzeRequestSchema.safeParse({ mimeType: file.type, size: file.size });
  if (!meta.success) {
    return errorResponse(
      "invalid_request",
      meta.error.issues[0]?.message ?? "Invalid file",
      400,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let documentText: string;
  try {
    documentText = await extractText({ buffer, mimeType: meta.data.mimeType });
  } catch (error) {
    if (error instanceof ExtractTextError) {
      return errorResponse(error.code, error.message, extractTextStatus(error.code));
    }
    logRouteError({ route: ROUTE, code: "internal_error", status: 500 }, error);
    return errorResponse("internal_error", "Failed to read the document", 500);
  }

  const hash = sha256(documentText);
  const cached = analysisCache.get(hash);
  if (cached) {
    return NextResponse.json({ analysis: cached, documentText, redactions: [] });
  }

  const shouldRedact = formData.get("redactPii") !== "false";
  const { text: modelText, redactions } = shouldRedact
    ? redactPii(documentText)
    : { text: documentText, redactions: [] };

  let draft;
  try {
    draft = await generateStructured({
      schema: analysisDraftSchema,
      prompt: wrapDocument(modelText),
      systemInstruction: ANALYZE_SYSTEM_PROMPT,
    });
  } catch (error) {
    if (error instanceof AiError) {
      logRouteError({ route: ROUTE, code: error.code, status: aiErrorStatus(error.code) }, error);
      return errorResponse(error.code, error.message, aiErrorStatus(error.code));
    }
    logRouteError({ route: ROUTE, code: "internal_error", status: 500 }, error);
    return errorResponse("internal_error", "Failed to analyze the document", 500);
  }

  const clauses: Clause[] = verifyQuoteFields(documentText, draft.clauses).map((clause) => ({
    ...clause,
    id: randomUUID(),
  }));

  const analysis: Analysis = {
    docTitle: draft.docTitle,
    parties: draft.parties,
    summary: draft.summary,
    clauses,
    missingCommonClauses: draft.missingCommonClauses,
    disclaimer: DISCLAIMER,
  };

  analysisCache.set(hash, analysis);

  return NextResponse.json({ analysis, documentText, redactions });
}
