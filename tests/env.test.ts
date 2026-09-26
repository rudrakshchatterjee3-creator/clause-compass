import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("getEnv", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the validated server env", async () => {
    vi.stubEnv("GROQ_API_KEY", "key-123");
    vi.stubEnv("GROQ_MODEL", "some-model");
    const { getEnv } = await import("@/lib/env");

    expect(getEnv()).toEqual({ GROQ_API_KEY: "key-123", GROQ_MODEL: "some-model" });
  });

  it("does not validate at import time, so a build needs no secrets", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    await expect(import("@/lib/env")).resolves.toBeDefined();
  });

  it("throws a clear error on first use when a key is missing", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const { getEnv } = await import("@/lib/env");

    expect(() => getEnv()).toThrow(/GROQ_API_KEY is required/);
  });
});
