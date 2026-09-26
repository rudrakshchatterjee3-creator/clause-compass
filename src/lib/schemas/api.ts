import { z } from "zod";
import { clauseSchema } from "./clause";
import { analysisSchema } from "./analysis";
import { mimeTypeSchema } from "./mime";
import { askAnswerSchema } from "./askAnswer";
import { comparisonSchema } from "./comparison";
import { briefSchema } from "./brief";

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const qaTurnSchema = z.object({
  question: z.string(),
  answer: z.string(),
});
export type QaTurn = z.infer<typeof qaTurnSchema>;

export const redactionSummarySchema = z.object({
  type: z.string(),
  count: z.number().int().nonnegative(),
});
export type RedactionSummaryDto = z.infer<typeof redactionSummarySchema>;

export const analyzeRequestSchema = z.object({
  mimeType: mimeTypeSchema,
  size: z.number().int().positive(),
});
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const askRequestSchema = z.object({
  documentText: z.string().min(1).max(120_000),
  clauses: z.array(clauseSchema).optional(),
  question: z.string().min(1).max(500),
  history: z.array(qaTurnSchema).max(4).optional(),
  redactPii: z.boolean().optional(),
});
export type AskRequest = z.infer<typeof askRequestSchema>;

/**
 * POST /api/ask streams newline-delimited JSON (application/x-ndjson), one
 * event object per line:
 *  - {"type":"answer_chunk","text":"..."} — zero or more, as the plain-
 *    language answer is generated
 *  - {"type":"result","result":AskAnswer} — exactly one, always last on
 *    success: the full answer with server-verified step quotes
 *  - {"type":"error","error":{"code","message"}} — instead of "result" if
 *    generation fails after streaming has already started
 *  - {"type":"redactions","redactions":[...]} — at most one, sent before
 *    any "answer_chunk", only when redactPii found and masked something
 */
export const askStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("answer_chunk"), text: z.string() }),
  z.object({ type: z.literal("result"), result: askAnswerSchema }),
  z.object({
    type: z.literal("error"),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
  z.object({ type: z.literal("redactions"), redactions: z.array(redactionSummarySchema) }),
]);
export type AskStreamEvent = z.infer<typeof askStreamEventSchema>;

/**
 * POST /api/compare accepts multipart/form-data: a "documentTextA" text
 * field (already extracted, from the original analyze step) plus either a
 * "fileB" file field (a second document to extract and compare) or a
 * "baselineId" text field naming a bundled fair-baseline template. This
 * schema validates the text fields only; fileB is validated separately,
 * the same way analyzeRequestSchema validates an upload's metadata.
 */
export const compareRequestSchema = z.object({
  documentTextA: z.string().min(1).max(120_000),
  baselineId: z.string().min(1).optional(),
});
export type CompareRequest = z.infer<typeof compareRequestSchema>;

export const briefRequestSchema = z.object({
  analysis: analysisSchema,
  qaHistory: z.array(qaTurnSchema).optional(),
});
export type BriefRequest = z.infer<typeof briefRequestSchema>;

// Success-response bodies, validated on the client before they reach state.
export const analyzeResponseSchema = z.object({
  analysis: analysisSchema,
  documentText: z.string(),
  redactions: z.array(redactionSummarySchema),
});
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;

export const compareResponseSchema = z.object({
  comparison: comparisonSchema,
  documentTextA: z.string(),
  documentTextB: z.string(),
  redactions: z.array(redactionSummarySchema),
});
export type CompareResponse = z.infer<typeof compareResponseSchema>;

export const briefResponseSchema = z.object({
  brief: briefSchema,
  generatedAt: z.string(),
});
export type BriefResponse = z.infer<typeof briefResponseSchema>;
