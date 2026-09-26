import { describe, it, expect, vi, afterEach } from "vitest";
import { RateLimiter, getClientIp } from "@/lib/security/rateLimit";

describe("RateLimiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 60_000 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("blocks the request once the limit is exceeded", () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 60_000 });
    limiter.check("a");
    limiter.check("a");
    const result = limiter.check("a");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("refills tokens over time", () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);

    vi.advanceTimersByTime(60_000);

    expect(limiter.check("a").allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("returns the first hop of X-Forwarded-For", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("203.0.113.5");
  });

  it("returns 'unknown' when the header is absent", () => {
    const request = new Request("http://localhost/");
    expect(getClientIp(request)).toBe("unknown");
  });

  it("returns 'unknown' when the first hop is empty", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-forwarded-for": ", 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("unknown");
  });
});
