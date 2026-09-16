import { describe, it, expect } from "vitest";
import { sha256 } from "@/lib/security/hash";

describe("sha256", () => {
  it("hashes a known string to its expected digest", () => {
    expect(sha256("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("is deterministic for the same input", () => {
    expect(sha256("contract text")).toBe(sha256("contract text"));
  });

  it("differs for different input", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });

  it("hashes Buffer input the same as the equivalent string", () => {
    expect(sha256(Buffer.from("hello"))).toBe(sha256("hello"));
  });
});
