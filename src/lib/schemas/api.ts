import { z } from "zod";
import { clauseSchema } from "./clause";
import { analysisSchema } from "./analysis";
import { mimeTypeSchema } from "./mime";
import { askAnswerSchema } from "./askAnswer";

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
 */
export const askStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("answer_chunk"), text: z.string() }),
  z.object({ type: z.literal("result"), result: askAnswerSchema }),
  z.object({
    type: z.literal("error"),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);
export type AskStreamEvent = z.infer<typeof askStreamEventSchema>;

export const compareRequestSchema = z
  .object({
    documentTextA: z.string().min(1).max(120_000),
    documentTextB: z.string().min(1).max(120_000).optional(),
    baselineId: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.documentTextB) || Boolean(data.baselineId), {
    message: "Provide either documentTextB or baselineId",
  });
export type CompareRequest = z.infer<typeof compareRequestSchema>;

export const briefRequestSchema = z.object({
  analysis: analysisSchema,
  qaHistory: z.array(qaTurnSchema).optional(),
});
export type BriefRequest = z.infer<typeof briefRequestSchema>;
