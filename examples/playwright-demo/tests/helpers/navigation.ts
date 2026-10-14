import type { Page } from "@playwright/test";

export async function openOrderHistory(page: Page): Promise<void> {
  await page.goto("/account");
  await page.getByRole("link", { name: "Order history" }).click();
}

export async function resetFilters(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Clear filters" }).click();
}
