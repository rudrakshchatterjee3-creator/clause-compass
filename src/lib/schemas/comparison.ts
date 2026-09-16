import { z } from "zod";

export const comparisonStatusSchema = z.enum(["changed", "added", "removed", "same"]);
export type ComparisonStatus = z.infer<typeof comparisonStatusSchema>;

export const favoursSchema = z.enum(["A", "B", "neutral"]);
export type Favours = z.infer<typeof favoursSchema>;

/** A quote grounded against one specific document (A or B), verified server-side. */
export const comparisonQuoteSchema = z.object({
  quote: z.string(),
  start: z.number().int().nonnegative().optional(),
  end: z.number().int().nonnegative().optional(),
  verified: z.boolean(),
});
export type ComparisonQuote = z.infer<typeof comparisonQuoteSchema>;

export const comparisonItemSchema = z.object({
  topic: z.string(),
  status: comparisonStatusSchema,
  docA: comparisonQuoteSchema.optional(),
  docB: comparisonQuoteSchema.optional(),
  explanation: z.string(),
  favours: favoursSchema,
});
export type ComparisonItem = z.infer<typeof comparisonItemSchema>;

export const comparisonSchema = z.object({
  items: z.array(comparisonItemSchema),
  summary: z.string(),
});
export type Comparison = z.infer<typeof comparisonSchema>;

/** Shape the model must produce for one aligned topic: quotes are plain strings, not yet grounded. */
export const comparisonItemDraftSchema = z.object({
  topic: z.string(),
  status: comparisonStatusSchema,
  docAQuote: z.string().optional(),
  docBQuote: z.string().optional(),
  explanation: z.string(),
  favours: favoursSchema,
});
export type ComparisonItemDraft = z.infer<typeof comparisonItemDraftSchema>;

export const comparisonDraftSchema = z.object({
  items: z.array(comparisonItemDraftSchema),
  summary: z.string(),
});
export type ComparisonDraft = z.infer<typeof comparisonDraftSchema>;
