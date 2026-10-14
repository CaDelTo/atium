import { expect, type Page } from "@playwright/test";

async function expectHeading(page: Page, name: string): Promise<void> {
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

export async function expectOnDashboard(page: Page): Promise<void> {
  await expectHeading(page, "Dashboard");
}

export async function expectOrderConfirmed(page: Page): Promise<void> {
  await expect(page.getByRole("status")).toHaveText("Order confirmed");
}
