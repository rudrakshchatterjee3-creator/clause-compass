import { test, expect } from "@playwright/test";
import { mockAnalyze, mockBrief } from "./mocks";

test("generating a brief shows a checklist and the disclaimer", async ({ page }) => {
  await mockAnalyze(page);
  await mockBrief(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Residential lease" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Residential Lease Agreement" })).toBeVisible();

  await page.getByRole("tab", { name: "Brief" }).click();
  await page.getByRole("button", { name: "Generate brief" }).click();

  await expect(page.getByRole("heading", { name: /Lawyer-Prep Brief/ })).toBeVisible();
  const risk = page.getByText("The late fee has no cap, so it can grow well beyond the rent owed.");
  await expect(risk).toBeVisible();
  await expect(
    page.getByText("This tool gives information, not legal advice.", { exact: false }),
  ).toBeVisible();

  // Ticking a checklist item strikes it through.
  const checkbox = page.getByRole("checkbox", { name: /late fee has no cap/ });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
});
