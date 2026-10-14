import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly rememberMe: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByLabel("Email");
    this.password = page.getByLabel("Password");
    this.rememberMe = page.locator("form label:nth-child(3) input");
    this.submit = page.getByRole("button", { name: "Sign in" });
  }

  async open(): Promise<void> {
    await this.page.goto("/login");
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  async logout(): Promise<void> {
    await this.page.getByRole("button", { name: "Log out" }).click();
  }
}
