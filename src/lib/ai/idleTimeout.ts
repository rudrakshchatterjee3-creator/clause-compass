import "server-only";

export interface IdleTimeoutController {
  readonly signal: AbortSignal;
  /** Call on every chunk received, to push the idle deadline back out. */
  resetIdle(): void;
  clear(): void;
}

/**
 * Aborts if no `resetIdle()` call happens within `idleMs`, or unconditionally
 * once `maxMs` total has elapsed — whichever comes first. Suited to
 * streaming LLM calls: a reasoning model can legitimately pause mid-stream
 * for well over a minute, so a slow-but-alive response shouldn't be killed
 * by a fixed total deadline — but a genuinely stuck connection still should.
 */
export function createIdleTimeoutController(idleMs: number, maxMs: number): IdleTimeoutController {
  const controller = new AbortController();
  const maxTimer = setTimeout(() => controller.abort(), maxMs);
  let idleTimer = setTimeout(() => controller.abort(), idleMs);

  return {
    signal: controller.signal,
    resetIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => controller.abort(), idleMs);
    },
    clear() {
      clearTimeout(idleTimer);
      clearTimeout(maxTimer);
    },
  };
}
