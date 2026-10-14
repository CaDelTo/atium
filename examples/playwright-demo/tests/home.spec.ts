import { expect, test } from "@playwright/test";

test.describe("Home", () => {
  test("shows the featured collection", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Featured" }).click();
    await expect(page.getByRole("region", { name: "Featured collection" })).toBeVisible();
  });
});
