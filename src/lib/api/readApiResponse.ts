import type { ZodType } from "zod";
import { apiErrorSchema, type ApiError } from "@/lib/schemas/api";

export type ApiErrorBody = ApiError["error"];

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody };

export const UNKNOWN_ERROR: ApiErrorBody = {
  code: "unknown",
  message: "Something went wrong. Please try again.",
};

export const INVALID_RESPONSE_ERROR: ApiErrorBody = {
  code: "invalid_response",
  message: "The server sent an unexpected response. Please try again.",
};

/** Reads a non-OK response's `{ error: { code, message } }` body, falling back to a generic error. */
export async function readApiError(response: Response): Promise<ApiErrorBody> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);
  return parsed.success ? parsed.data.error : UNKNOWN_ERROR;
}

/**
 * Validates an API response with zod before it reaches client state: a
 * success body must match `schema`, and an error body must match the shared
 * `{ error: { code, message } }` shape.
 */
export async function readApiResponse<T>(
  response: Response,
  schema: ZodType<T>,
): Promise<ApiResult<T>> {
  if (!response.ok) {
    return { ok: false, error: await readApiError(response) };
  }

  const body: unknown = await response.json().catch(() => null);
  const parsed = schema.safeParse(body);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: INVALID_RESPONSE_ERROR };
}
