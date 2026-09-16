import { describe, it, expect } from "vitest";
import { loadBaselineText, BaselineNotFoundError } from "@/lib/compare/loadBaseline";
import { COMPARE_BASELINES } from "@/lib/compare/baselines";

describe("loadBaselineText", () => {
  it("loads every registered baseline as non-empty text", async () => {
    for (const baseline of COMPARE_BASELINES) {
      const text = await loadBaselineText(baseline.id);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it("loads the residential lease baseline content", async () => {
    const text = await loadBaselineText("residential-lease-fair");
    expect(text).toContain("RESIDENTIAL LEASE AGREEMENT");
  });

  it("loads the freelance agreement baseline content", async () => {
    const text = await loadBaselineText("freelance-services-fair");
    expect(text).toContain("FREELANCE SERVICES AGREEMENT");
  });

  it("throws BaselineNotFoundError for an unknown id", async () => {
    await expect(loadBaselineText("not-a-real-baseline")).rejects.toBeInstanceOf(
      BaselineNotFoundError,
    );
  });
});
