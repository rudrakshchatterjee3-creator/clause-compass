import { describe, it, expect } from "vitest";
import { parseRetryAfterSeconds } from "@/lib/ai/retryAfter";

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("parseRetryAfterSeconds", () => {
  it("reads the standard retry-after header in seconds", () => {
    expect(parseRetryAfterSeconds(headers({ "retry-after": "7" }))).toBe(7);
  });

  it("rounds fractional retry-after up", () => {
    expect(parseRetryAfterSeconds(headers({ "retry-after": "2.1" }))).toBe(3);
  });

  it("prefers retry-after over the token-reset header", () => {
    expect(
      parseRetryAfterSeconds(headers({ "retry-after": "4", "x-ratelimit-reset-tokens": "30s" })),
    ).toBe(4);
  });

  it("falls back to x-ratelimit-reset-tokens when retry-after is unusable", () => {
    expect(
      parseRetryAfterSeconds(headers({ "retry-after": "soon", "x-ratelimit-reset-tokens": "17.167s" })),
    ).toBe(18);
  });

  it("parses minute and millisecond reset durations", () => {
    expect(parseRetryAfterSeconds(headers({ "x-ratelimit-reset-tokens": "1m2s" }))).toBe(62);
    expect(parseRetryAfterSeconds(headers({ "x-ratelimit-reset-tokens": "500ms" }))).toBe(1);
  });

  it("returns undefined for an unparseable reset duration", () => {
    expect(parseRetryAfterSeconds(headers({ "x-ratelimit-reset-tokens": "later" }))).toBeUndefined();
    expect(parseRetryAfterSeconds(headers({ "x-ratelimit-reset-tokens": "" }))).toBeUndefined();
  });

  it("returns undefined when neither header is present", () => {
    expect(parseRetryAfterSeconds(headers({}))).toBeUndefined();
  });
});
