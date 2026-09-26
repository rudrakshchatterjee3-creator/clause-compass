/**
 * Reads how long a rate-limited provider response asks us to wait, in whole
 * seconds: the standard `retry-after` header if present, otherwise Groq's
 * `x-ratelimit-reset-tokens` duration (e.g. "17.2s", "1m2s", "500ms").
 */
export function parseRetryAfterSeconds(headers: Headers): number | undefined {
  const retryAfter = headers.get("retry-after");
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  }

  const reset = headers.get("x-ratelimit-reset-tokens");
  return reset === null ? undefined : parseDurationSeconds(reset);
}

function parseDurationSeconds(value: string): number | undefined {
  const match = /^(?:(\d+)m(?!s))?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?$/.exec(value.trim());
  if (!match) return undefined;

  const [, minutes, seconds, millis] = match;
  if (minutes === undefined && seconds === undefined && millis === undefined) return undefined;

  return Math.ceil(Number(minutes ?? 0) * 60 + Number(seconds ?? 0) + Number(millis ?? 0) / 1000);
}
