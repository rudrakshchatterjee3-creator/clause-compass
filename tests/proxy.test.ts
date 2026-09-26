import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function buildRequest(): NextRequest {
  return new NextRequest("http://localhost/");
}

describe("proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets a Content-Security-Policy with a per-request nonce", () => {
    const response = proxy(buildRequest());
    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("generates a different nonce on every call", () => {
    const first = proxy(buildRequest()).headers.get("Content-Security-Policy");
    const second = proxy(buildRequest()).headers.get("Content-Security-Policy");

    expect(first).not.toBe(second);
  });

  it("omits 'unsafe-eval' outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    const csp = proxy(buildRequest()).headers.get("Content-Security-Policy");

    expect(csp).not.toContain("unsafe-eval");
  });

  it("allows 'unsafe-eval' in development for React Refresh", () => {
    vi.stubEnv("NODE_ENV", "development");
    const csp = proxy(buildRequest()).headers.get("Content-Security-Policy");

    expect(csp).toContain("unsafe-eval");
  });

  it("forwards the same nonce to the request as x-nonce", () => {
    // Threaded through request headers so the page can read it (via
    // headers()) and stamp it on any server-rendered inline script — must
    // match the CSP header's nonce exactly, or inline scripts get blocked.
    const response = proxy(buildRequest());
    const nonceFromCsp = response.headers
      .get("Content-Security-Policy")!
      .match(/nonce-([^']+)/)![1];
    const forwardedNonce = response.headers.get("x-middleware-request-x-nonce");

    expect(forwardedNonce).toBe(nonceFromCsp);
  });
});
