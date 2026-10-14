import { expect, test } from "@playwright/test";
import { openOrderHistory } from "./helpers/navigation";

test.describe.serial("Orders", () => {
  test("lists past orders", async ({ page }) => {
    await openOrderHistory(page);
    await page.getByRole("combobox", { name: "Period" }).selectOption("2025");
    await expect(page.getByRole("row")).toHaveCount(4);
  });

  test("downloads an invoice", async ({ page }) => {
    await openOrderHistory(page);
    await page.getByRole("button", { name: "Download invoice" }).click();
  });
});

test.describe("Order support", () => {
  test("opens the help center from an order", async ({ page }) => {
    await page.goto("/orders/1001");
    await page.getByRole("tab", { name: "Support" }).click();
    await page.locator("#help-link").click();
    await expect(page.getByRole("heading", { name: "Help center" })).toBeVisible();
  });
});
