import "server-only";

/**
 * Minimal structured server logging. Never pass document text, prompts, AI
 * responses, or other user content here — only route names, error codes,
 * statuses, and short internal messages.
 */
export interface LogFields {
  route: string;
  code: string;
  status: number;
}

export function logRouteError(fields: LogFields, cause?: unknown): void {
  const causeMessage = cause instanceof Error ? cause.message : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      ...fields,
      causeMessage,
      timestamp: new Date().toISOString(),
    }),
  );
}
