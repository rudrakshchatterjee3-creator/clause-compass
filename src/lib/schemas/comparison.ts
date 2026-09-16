import { z } from "zod";

export const comparisonStatusSchema = z.enum(["changed", "added", "removed", "same"]);
export type ComparisonStatus = z.infer<typeof comparisonStatusSchema>;

export const favoursSchema = z.enum(["A", "B", "neutral"]);
export type Favours = z.infer<typeof favoursSchema>;

export const comparisonItemSchema = z.object({
  topic: z.string(),
  status: comparisonStatusSchema,
  docAQuote: z.string().optional(),
  docBQuote: z.string().optional(),
  explanation: z.string(),
  favours: favoursSchema,
});
export type ComparisonItem = z.infer<typeof comparisonItemSchema>;

export const comparisonSchema = z.object({
  items: z.array(comparisonItemSchema),
  summary: z.string(),
});
export type Comparison = z.infer<typeof comparisonSchema>;
