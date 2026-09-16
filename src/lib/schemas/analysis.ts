import { z } from "zod";
import { clauseSchema, clauseDraftSchema } from "./clause";

export const analysisSchema = z.object({
  docTitle: z.string(),
  parties: z.array(z.string()),
  summary: z.string(),
  clauses: z.array(clauseSchema),
  missingCommonClauses: z.array(z.string()),
  disclaimer: z.string(),
});
export type Analysis = z.infer<typeof analysisSchema>;

/** Shape the model must produce: the disclaimer is fixed server-side, clauses omit grounding fields. */
export const analysisDraftSchema = analysisSchema
  .omit({ clauses: true, disclaimer: true })
  .extend({ clauses: z.array(clauseDraftSchema) });
export type AnalysisDraft = z.infer<typeof analysisDraftSchema>;
