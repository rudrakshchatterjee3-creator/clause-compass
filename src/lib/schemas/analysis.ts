import { z } from "zod";
import { clauseSchema } from "./clause";

export const analysisSchema = z.object({
  docTitle: z.string(),
  parties: z.array(z.string()),
  summary: z.string(),
  clauses: z.array(clauseSchema),
  missingCommonClauses: z.array(z.string()),
  disclaimer: z.string(),
});
export type Analysis = z.infer<typeof analysisSchema>;
