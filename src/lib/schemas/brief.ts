import { z } from "zod";

export const briefSchema = z.object({
  keyRisks: z.array(z.string()),
  questionsForLawyer: z.array(z.string()),
  documentsToGather: z.array(z.string()),
  deadlines: z.array(z.string()),
});
export type Brief = z.infer<typeof briefSchema>;
