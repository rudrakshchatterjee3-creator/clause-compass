import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockAnalyze, mockAsk, mockBrief } from "./mocks";

test.describe("Accessibility", () => {
  test("idle upload screen has no automatically detectable violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("results screen (clauses tab) has no automatically detectable violations", async ({
    page,
  }) => {
    await mockAnalyze(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Residential lease" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Residential Lease Agreement" })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("error screen has no automatically detectable violations", async ({ page }) => {
    await page.route("**/api/analyze", async (route) => {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "request_failed", message: "Model request failed" } }),
      });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Residential lease" }).click();
    await expect(page.getByText("Something went wrong")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("ask tab with a cited answer has no automatically detectable violations", async ({
    page,
  }) => {
    await mockAnalyze(page);
    await mockAsk(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Residential lease" }).click();
    await page.getByRole("tab", { name: "Ask" }).click();
    await page.getByRole("button", { name: /What if I pay late\?/ }).click();
    await expect(page.getByText("You asked")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("brief tab with a generated brief has no automatically detectable violations", async ({
    page,
  }) => {
    await mockAnalyze(page);
    await mockBrief(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Residential lease" }).click();
    await page.getByRole("tab", { name: "Brief" }).click();
    await page.getByRole("button", { name: "Generate brief" }).click();
    await expect(page.getByRole("heading", { name: /Lawyer-Prep Brief/ })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
