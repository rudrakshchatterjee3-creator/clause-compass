import { test, expect } from "@playwright/test";
import { mockAnalyze, mockCompare } from "./mocks";

test("comparing against a fair baseline shows grouped differences", async ({ page }) => {
  await mockAnalyze(page);
  await mockCompare(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Residential lease" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Residential Lease Agreement" })).toBeVisible();

  await page.getByRole("tab", { name: "Compare" }).click();
  await expect(page.getByText("Compare this document")).toBeVisible();

  await page.getByRole("button", { name: "Fair residential lease baseline" }).click();

  await expect(page.getByText("The baseline caps the late fee")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Changed/ })).toBeVisible();
  await expect(page.getByText("Better in Fair residential lease baseline")).toBeVisible();
  await expect(page.getByText("Your document charges a much steeper, uncapped late fee.")).toBeVisible();

  // "Only show changes" toggles without erroring.
  await page.getByLabel("Only show changes").check();
  await expect(page.getByRole("heading", { name: /Changed/ })).toBeVisible();
});
