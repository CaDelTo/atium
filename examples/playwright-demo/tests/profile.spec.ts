import { expect, test, type Page } from "@playwright/test";

async function expectSaved(page: Page): Promise<void> {
  await expect(page.getByRole("status")).toHaveText("Saved");
}

test.describe("Profile", () => {
  test("updates every profile field", async ({ page }) => {
    await page.goto("/profile");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Lovelace");
    await page.getByLabel("Display name").fill("ada");
    await page.getByLabel("Phone").fill("+44 20 7946 0000");
    await page.getByLabel("Street").fill("12 St James's Square");
    await page.getByLabel("City").fill("London");
    await page.getByLabel("Postal code").fill("SW1Y 4JH");
    await page.getByLabel("Country").selectOption("GB");
    await page.getByLabel("Language").selectOption("en");
    await page.getByLabel("Time zone").selectOption("Europe/London");
    await page.getByLabel("Company").fill("Analytical Engines Ltd");
    await page.getByLabel("Job title").fill("Mathematician");
    await page.getByLabel("Website").fill("https://example.com/ada");
    await page.getByLabel("Bio").fill("First programmer.");
    await page.getByLabel("Public profile").check();
    await page.getByLabel("Show email").check();
    await page.getByLabel("Two-factor authentication").check();
    await page.getByLabel("Dark theme").check();
    await page.getByLabel("Mastodon").fill("@ada@example.social");
    await page.getByLabel("GitHub").fill("ada");
    await page.getByLabel("LinkedIn").fill("ada-lovelace");
    await page.getByLabel("Birthday").fill("1815-12-10");
    await page.getByLabel("Emergency contact").fill("Charles Babbage");
    await page.getByLabel("Emergency phone").fill("+44 20 7946 0001");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expectSaved(page);
  });

  test("saves notification preferences", async ({ page }) => {
    await page.goto("/profile/notifications");
    await page.getByLabel("Weekly digest").check();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expectSaved(page);
    await expect(page.locator("#promo-banner")).toBeHidden();
  });

  test("opens the avatar editor", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("button", { name: "Change avatar" }).click();
    await page.getByRole("slider", { name: "Zoom" }).press("ArrowRight");
  });
});
