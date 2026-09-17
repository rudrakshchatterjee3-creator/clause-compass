import { test, expect } from "@playwright/test";
import { mockAnalyze } from "./mocks";

test.describe("Responsive layout at 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("idle upload screen has no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("results screen has no horizontal overflow and clause list stacks above the document", async ({
    page,
  }) => {
    await mockAnalyze(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Residential lease" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Residential Lease Agreement" })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const panel = page.getByRole("tabpanel").first();
    const gridColumns = await panel.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    // Below the lg breakpoint the clause list and document pane stack in a single column.
    expect(gridColumns.trim().split(" ").length).toBe(1);
  });
});
