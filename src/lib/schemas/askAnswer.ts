import { z } from "zod";

export const confidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const askStepSchema = z.object({
  text: z.string(),
  quote: z.string(),
  start: z.number().int().nonnegative().optional(),
  end: z.number().int().nonnegative().optional(),
  verified: z.boolean(),
});
export type AskStep = z.infer<typeof askStepSchema>;

export const askAnswerSchema = z.object({
  answerable: z.boolean(),
  answer: z.string(),
  steps: z.array(askStepSchema),
  confidence: confidenceSchema,
  suggestLawyer: z.boolean(),
});
export type AskAnswer = z.infer<typeof askAnswerSchema>;

/** Shape the model must produce for a consequence-chain step: grounding fields are computed server-side. */
export const askStepDraftSchema = askStepSchema.omit({ start: true, end: true, verified: true });
export type AskStepDraft = z.infer<typeof askStepDraftSchema>;

/**
 * Shape the model must produce for the second (structured) call in the ask
 * pipeline. The "answer" field itself already came from the first streamed
 * call, so this only covers what still needs to be decided.
 */
export const askDetailDraftSchema = z.object({
  answerable: z.boolean(),
  steps: z.array(askStepDraftSchema),
  confidence: confidenceSchema,
  suggestLawyer: z.boolean(),
});
export type AskDetailDraft = z.infer<typeof askDetailDraftSchema>;
