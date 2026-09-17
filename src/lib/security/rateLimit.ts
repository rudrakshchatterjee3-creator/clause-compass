import "server-only";

/**
 * In-memory token bucket, keyed by client IP. State lives only in this
 * process's memory: on Cloud Run (or any multi-instance/autoscaled
 * deployment) each instance enforces its own limit independently, so the
 * effective global rate is `limit * instanceCount`, not a hard ceiling.
 * This is a best-effort per-instance guard against accidental abuse, not a
 * substitute for an edge/gateway rate limiter in front of the service.
 */
export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly options: RateLimitOptions) {}

  check(key: string): RateLimitResult {
    const now = Date.now();
    const existing = this.buckets.get(key);
    const bucket: Bucket = existing ?? { tokens: this.options.limit, lastRefill: now };

    const elapsedMs = now - bucket.lastRefill;
    const refill = (elapsedMs / this.options.windowMs) * this.options.limit;
    bucket.tokens = Math.min(this.options.limit, bucket.tokens + refill);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      this.buckets.set(key, bucket);
      const deficit = 1 - bucket.tokens;
      const retryAfterSeconds = Math.ceil((deficit / this.options.limit) * (this.options.windowMs / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Best-effort client identifier: the first hop of X-Forwarded-For, or "unknown". */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
