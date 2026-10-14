import { expect, test } from "@playwright/test";

test.describe("Cart", () => {
  test("adds a book to the cart", async ({ page }) => {
    await page.goto("/products/book");
    await page.getByLabel("Quantity").fill("2");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page.getByRole("listitem")).toHaveCount(1);
  });

  test("adds a pen to the cart", async ({ page }) => {
    await page.goto("/products/pen");
    await page.getByLabel("Quantity").fill("5");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page.getByRole("listitem")).toHaveCount(1);
  });
});
