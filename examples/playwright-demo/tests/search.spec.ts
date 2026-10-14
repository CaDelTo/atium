import { expect, test } from "@playwright/test";

test.describe("Search", () => {
  test.only("finds a book by its title", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Search the catalog").fill("Dune");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("link", { name: "Dune" })).toBeVisible();
  });

  test("links to the help center", async ({ page }) => {
    await page.goto("/search");
    await page.locator("#help-link").click();
    await expect(page).toHaveURL(/\/help/);
  });
});
