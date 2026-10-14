import { expect, test } from "@playwright/test";
import { expectOnDashboard } from "./helpers/assertions";
import { LoginPage } from "./pages/login-page";

test.describe("Login", () => {
  test("signs in with valid credentials", async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.rememberMe.check();
    await login.signIn("ada@example.com", "correct-horse");
    await expectOnDashboard(page);
  });

  test("shows an error for a wrong password", async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.email.fill("ada@example.com");
    await login.password.fill("wrong");
    await login.submit.click();
    await page.waitForTimeout(2000);
    expect(await page.getByRole("alert").isVisible()).toBe(true);
    await expect(page.locator("#promo-banner")).toBeVisible();
  });
});
