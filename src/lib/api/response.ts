import "server-only";
import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/schemas/api";
import type { AiError } from "@/lib/ai/generateStructured";
import type { ExtractTextError } from "@/lib/parsing/extractText";

/** Shared `{ error: { code, message } }` JSON response builder for every API route. */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  retryAfterSeconds?: number,
): NextResponse<ApiError> {
  const headers =
    retryAfterSeconds !== undefined ? { "Retry-After": String(retryAfterSeconds) } : undefined;
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

export function aiErrorStatus(code: AiError["code"]): number {
  switch (code) {
    case "timeout":
      return 504;
    case "invalid_response":
    case "request_failed":
      return 502;
  }
}

export function extractTextStatus(code: ExtractTextError["code"]): number {
  switch (code) {
    case "unsupported_mime":
      return 400;
    case "file_too_large":
    case "text_too_large":
      return 413;
    case "empty_text":
    case "parse_failed":
      return 422;
  }
}
