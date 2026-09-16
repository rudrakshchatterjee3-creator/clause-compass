import { z } from "zod";
import { clauseSchema } from "./clause";
import { analysisSchema } from "./analysis";
import { mimeTypeSchema } from "./mime";

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
  clauses: z.array(clauseSchema),
  question: z.string().min(1).max(500),
  history: z.array(qaTurnSchema).max(4).optional(),
});
export type AskRequest = z.infer<typeof askRequestSchema>;

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
