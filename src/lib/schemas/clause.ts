import { z } from "zod";

export const clauseTypeSchema = z.enum([
  "payment",
  "termination",
  "liability",
  "indemnity",
  "confidentiality",
  "ip",
  "non_compete",
  "dispute",
  "renewal",
  "penalty",
  "privacy",
  "other",
]);
export type ClauseType = z.infer<typeof clauseTypeSchema>;

export const riskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const riskSchema = z.object({
  level: riskLevelSchema,
  reason: z.string(),
});
export type Risk = z.infer<typeof riskSchema>;

export const obligationSchema = z.object({
  party: z.string(),
  duty: z.string(),
  deadline: z.string().optional(),
});
export type Obligation = z.infer<typeof obligationSchema>;

export const clauseSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: clauseTypeSchema,
  quote: z.string(),
  plainEnglish: z.string(),
  obligations: z.array(obligationSchema),
  risk: riskSchema,
  start: z.number().int().nonnegative().optional(),
  end: z.number().int().nonnegative().optional(),
  verified: z.boolean(),
});
export type Clause = z.infer<typeof clauseSchema>;
