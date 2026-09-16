import "server-only";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";
import { SUPPORTED_MIME_TYPES, type SupportedMimeType } from "@/lib/schemas/mime";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_EXTRACTED_CHARS = 120_000;
/** Combined character ceiling for routes (like compare) that hold two documents in one prompt. */
export const MAX_COMBINED_CHARS = 200_000;

export type ExtractTextErrorCode =
  | "unsupported_mime"
  | "file_too_large"
  | "text_too_large"
  | "empty_text"
  | "parse_failed";

export class ExtractTextError extends Error {
  readonly code: ExtractTextErrorCode;

  constructor(code: ExtractTextErrorCode, message: string) {
    super(message);
    this.name = "ExtractTextError";
    this.code = code;
  }
}

function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export interface ExtractTextInput {
  buffer: Buffer;
  mimeType: string;
}

export async function extractText({ buffer, mimeType }: ExtractTextInput): Promise<string> {
  if (!isSupportedMimeType(mimeType)) {
    throw new ExtractTextError("unsupported_mime", `Unsupported file type: ${mimeType}`);
  }

  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new ExtractTextError(
      "file_too_large",
      `File exceeds the ${MAX_UPLOAD_BYTES} byte limit`,
    );
  }

  const text = mimeType === "application/pdf" ? await extractPdfBuffer(buffer) : buffer.toString("utf-8");

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    throw new ExtractTextError("empty_text", "No text could be extracted from the document");
  }

  if (trimmed.length > MAX_EXTRACTED_CHARS) {
    throw new ExtractTextError(
      "text_too_large",
      `Extracted text exceeds the ${MAX_EXTRACTED_CHARS} character limit`,
    );
  }

  return trimmed;
}

async function extractPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return text;
  } catch {
    throw new ExtractTextError("parse_failed", "Failed to parse the PDF file");
  }
}
