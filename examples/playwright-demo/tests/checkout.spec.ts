import { expect, test } from "@playwright/test";
import { expectOrderConfirmed } from "./helpers/assertions";
import { CartPage } from "./pages/cart-page";

test.describe("Checkout", () => {
  test("pays with a saved card", async ({ page }) => {
    const cart = new CartPage(page);
    await cart.open();
    await expect(cart.items).toBeVisible();
    await cart.proceedToCheckout();
    await page.locator("//div[2]/button").click();
    await page.locator("//button[@data-testid='pay']").click();
    await expectOrderConfirmed(page);
  });

  test("adds the third recommended product", async ({ page }) => {
    await page.goto("/products");
    await page.locator(".product-card").nth(2).click();
    await page.getByRole("button", { name: "Add to cart" }).nth(1).click();
    await expect(page.locator("#promo-banner")).toBeVisible();
  });

  test("applies a partner discount", async ({ request }) => {
    const apiKey = "Zq8vR2mX7tLp4WcN9bKd3HfY";
    const password = "password123";
    const response = await request.post("/api/discounts", {
      headers: { authorization: `Bearer ${apiKey}` },
      data: { partner: "acme", password },
    });
    expect(response.ok()).toBe(true);
  });
});
