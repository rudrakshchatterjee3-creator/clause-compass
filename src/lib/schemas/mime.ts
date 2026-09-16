import { z } from "zod";

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
] as const;

export const mimeTypeSchema = z.enum(SUPPORTED_MIME_TYPES);
export type SupportedMimeType = z.infer<typeof mimeTypeSchema>;
