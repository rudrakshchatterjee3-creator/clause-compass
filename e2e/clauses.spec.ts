import { test, expect } from "@playwright/test";
import { mockAnalyze } from "./mocks";

test.describe("Upload sample and browse clauses", () => {
  test("shows the clause list and highlights the matching text on click", async ({ page }) => {
    await mockAnalyze(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Residential lease" }).click();

    // Summary card (the page's h1 once a document is loaded).
    await expect(
      page.getByRole("heading", { level: 2, name: "Residential Lease Agreement" }),
    ).toBeVisible();

    // Clause list.
    const clausesTab = page.getByRole("tab", { name: "Clauses" });
    await expect(clausesTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Late Fees" })).toBeVisible();
    await expect(page.getByText("High risk")).toBeVisible();

    // Clicking the clause selects it and highlights its quote in the document pane.
    const lateFeeCard = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Late Fees", exact: true }) });
    await lateFeeCard.getByRole("button").click();

    const lateFeeMark = page.locator("mark[data-quote-span]").filter({ hasText: "$175.00" });
    await expect(lateFeeMark).toHaveAttribute("data-selected", "true");

    // Clicking the highlighted quote in the document pane selects the clause card back.
    const rentMark = page.locator("mark[data-quote-span]").filter({ hasText: "$1,850.00" });
    await rentMark.click();

    const rentCard = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Rent", exact: true }) });
    await expect(rentCard.getByRole("button")).toHaveAttribute("aria-current", "true");
  });

  test("filters clauses by risk level", async ({ page }) => {
    await mockAnalyze(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Residential lease" }).click();
    await expect(page.getByRole("heading", { name: "Late Fees" })).toBeVisible();

    await page.getByRole("button", { name: "Low", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Rent" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Late Fees" })).toHaveCount(0);
  });
});
