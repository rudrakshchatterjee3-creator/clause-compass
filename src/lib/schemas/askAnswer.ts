import { z } from "zod";

export const confidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const askStepSchema = z.object({
  text: z.string(),
  quote: z.string(),
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
