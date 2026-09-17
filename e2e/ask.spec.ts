import { test, expect } from "@playwright/test";
import { mockAnalyze, mockAsk } from "./mocks";

test("asking a question returns a cited answer", async ({ page }) => {
  await mockAnalyze(page);
  await mockAsk(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Residential lease" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Residential Lease Agreement" })).toBeVisible();

  await page.getByRole("tab", { name: "Ask" }).click();

  // Suggested chip generated from the clause types present.
  const chip = page.getByRole("button", { name: /What if I pay late\?/ });
  await expect(chip).toBeVisible();
  await chip.click();

  await expect(page.getByText("You asked")).toBeVisible();
  await expect(page.getByText(/immediately owe a \$175 late fee/)).toBeVisible();
  await expect(page.getByText("High confidence")).toBeVisible();

  // The cited step links to its verified quote, highlighted in the document pane.
  // (Scoped to a <button> tag, not the <mark role="button"> in the document pane.)
  const quoteButton = page.locator("button", { hasText: "A late fee of $175.00" });
  await expect(quoteButton).toBeVisible();
  await quoteButton.click();

  // :visible excludes the same clause's mark in the hidden Clauses tabpanel.
  const mark = page.locator("mark[data-quote-span]:visible").filter({ hasText: "$175.00" });
  await expect(mark).toHaveAttribute("data-selected", "true");
});
