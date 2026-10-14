import type { Locator, Page } from "@playwright/test";

export class CartPage {
  readonly items: Locator;
  private readonly checkout: Locator;

  constructor(private readonly page: Page) {
    this.items = page.getByRole("list", { name: "Cart items" });
    this.checkout = page.getByRole("link", { name: "Checkout" });
  }

  async open(): Promise<void> {
    await this.page.goto("/cart");
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkout.click();
  }
}
