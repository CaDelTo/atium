import { describe, expect, it } from "vitest";
import { parseSource, playwrightSpec } from "../test/source.js";
import type { ExtractFileIndexOptions } from "./extract-file-index.js";
import { extractFileIndex } from "./extract-file-index.js";
import type { FileIndex } from "./file-index.js";
import { FILE_INDEX_SCHEMA_VERSION, FileIndexSchema } from "./file-index.js";

const options: ExtractFileIndexOptions = { assertFunctionNames: [], i18n: false };

function indexOf(source: string, overrides: Partial<ExtractFileIndexOptions> = {}): FileIndex {
  return extractFileIndex(parseSource(source), source, { ...options, ...overrides });
}

// A non-static title, rebuilt from the AST as 03-linter.md §11.3.1 describes.
const refundTitle = "refunds $" + "{order.id}";

const checkoutSpec = playwrightSpec(
  'import { login } from "./helpers";',
  "",
  'test.describe("checkout", () => {',
  '  test.describe("as a member", () => {',
  '    test("pays with a saved card", async ({ page, loginPage }) => {',
  "      await login(page);",
  "      await loginPage.open();",
  '      await test.step("fill the form", async () => {',
  '        await page.goto("/checkout");',
  '        await page.locator("#card-number").fill("4242");',
  "      });",
  '      await page.getByRole("button", { name: "Pay" }).click();',
  '      await expect(page.getByText("thanks")).toBeVisible();',
  "      await login(page);",
  "    });",
  "  });",
  "  test(`refunds ${order.id}`, async ({ page }) => {",
  '    await page.getByTestId("refund").click();',
  "  });",
  "});",
);

const payTitlePath = ["checkout", "as a member", "pays with a saved card"];
const refundTitlePath = ["checkout", refundTitle];

const checkoutIndex: FileIndex = {
  schemaVersion: FILE_INDEX_SCHEMA_VERSION,
  framework: "playwright",
  tests: [
    {
      titlePath: payTitlePath,
      fullTitle: "checkout › as a member › pays with a saved card",
      isStatic: true,
      range: { start: { line: 6, column: 5 }, end: { line: 16, column: 7 } },
      actions: [
        { name: "goto", level: null },
        { name: "fill", level: 2 },
        { name: "click", level: 5 },
      ],
      assertions: [{ kind: "expect", name: "expect", location: { line: 14, column: 13 } }],
      calls: ["login", "loginPage.open"],
    },
    {
      titlePath: refundTitlePath,
      fullTitle: `checkout › ${refundTitle}`,
      isStatic: false,
      range: { start: { line: 18, column: 3 }, end: { line: 20, column: 5 } },
      actions: [{ name: "click", level: 3 }],
      assertions: [],
      calls: [],
    },
  ],
  locators: [
    {
      method: "locator",
      framework: "playwright",
      selector: "#card-number",
      level: 2,
      location: { line: 11, column: 15 },
      code: 'page.locator("#card-number")',
      testTitlePath: payTitlePath,
    },
    {
      method: "getByRole",
      framework: "playwright",
      selector: "button",
      level: 5,
      location: { line: 13, column: 13 },
      code: 'page.getByRole("button", { name: "Pay" })',
      testTitlePath: payTitlePath,
    },
    {
      method: "getByText",
      framework: "playwright",
      selector: "thanks",
      level: 4,
      location: { line: 14, column: 20 },
      code: 'page.getByText("thanks")',
      testTitlePath: payTitlePath,
    },
    {
      method: "getByTestId",
      framework: "playwright",
      selector: "refund",
      level: 3,
      location: { line: 19, column: 11 },
      code: 'page.getByTestId("refund")',
      testTitlePath: refundTitlePath,
    },
  ],
};

describe("extractFileIndex", () => {
  it("AC-1: indexes nested Playwright tests with their actions, assertions, calls and locators", () => {
    // Act
    const index = indexOf(checkoutSpec);

    // Assert
    expect(index).toEqual(checkoutIndex);
  });

  it("AC-1: indexes the locators of a Page Object outside every test and no tests", () => {
    // Arrange
    const source = [
      'import type { Locator, Page } from "@playwright/test";',
      "",
      "export class LoginPage {",
      "  readonly email: Locator;",
      "  readonly submit: Locator;",
      "",
      "  constructor(private readonly page: Page) {",
      '    this.email = page.locator("input[name=email]");',
      '    this.submit = page.getByTestId("login-submit");',
      "  }",
      "",
      "  async open() {",
      '    await this.page.goto("/login");',
      "  }",
      "",
      "  async signIn(email: string) {",
      "    await this.email.fill(email);",
      "    await this.submit.click();",
      "  }",
      "}",
    ].join("\n");

    // Act
    const index = indexOf(source);

    // Assert
    expect(index).toEqual({
      schemaVersion: FILE_INDEX_SCHEMA_VERSION,
      framework: "playwright",
      tests: [],
      locators: [
        {
          method: "locator",
          framework: "playwright",
          selector: 'input[name="email"]',
          level: 2,
          location: { line: 8, column: 18 },
          code: 'page.locator("input[name=email]")',
          testTitlePath: null,
        },
        {
          method: "getByTestId",
          framework: "playwright",
          selector: "login-submit",
          level: 3,
          location: { line: 9, column: 19 },
          code: 'page.getByTestId("login-submit")',
          testTitlePath: null,
        },
      ],
    } satisfies FileIndex);
  });

  it("AC-1: gives a locator in a test its titlePath, one in a hook none, and a non-literal selector null", () => {
    // Arrange
    const source = playwrightSpec(
      "",
      'const searchBox = "#search";',
      "",
      "test.beforeEach(async ({ page }) => {",
      '  await page.getByLabel("search").fill("shoes");',
      "});",
      "",
      'test("searches", async ({ page, searchPage }) => {',
      '  await page.locator(searchBox).press("Enter");',
      "  await searchPage.verifyResults();",
      "});",
    );

    // Act
    const index = indexOf(source, { assertFunctionNames: ["verify*"] });

    // Assert
    expect(index).toEqual({
      schemaVersion: FILE_INDEX_SCHEMA_VERSION,
      framework: "playwright",
      tests: [
        {
          titlePath: ["searches"],
          fullTitle: "searches",
          isStatic: true,
          range: { start: { line: 9, column: 1 }, end: { line: 12, column: 3 } },
          actions: [{ name: "press", level: null }],
          assertions: [
            { kind: "custom", name: "verifyResults", location: { line: 11, column: 9 } },
          ],
          calls: [],
        },
      ],
      locators: [
        {
          method: "getByLabel",
          framework: "playwright",
          selector: "search",
          level: 4,
          location: { line: 6, column: 9 },
          code: 'page.getByLabel("search")',
          testTitlePath: null,
        },
        {
          method: "locator",
          framework: "playwright",
          selector: null,
          level: null,
          location: { line: 10, column: 9 },
          code: "page.locator(searchBox)",
          testTitlePath: ["searches"],
        },
      ],
    } satisfies FileIndex);
  });

  it("AC-1: drops locators by visible text to level 2 with i18n, but not getByRole with a name", () => {
    // Act
    const index = indexOf(checkoutSpec, { i18n: true });

    // Assert
    expect(index.locators.map(({ method, level }) => ({ method, level }))).toEqual([
      { method: "locator", level: 2 },
      { method: "getByRole", level: 5 },
      { method: "getByText", level: 2 },
      { method: "getByTestId", level: 3 },
    ]);
  });

  it("AC-1: takes the configured framework over the one the imports reveal", () => {
    // Act
    const index = indexOf(checkoutSpec, { framework: "cypress" });

    // Assert
    expect(index.framework).toBe("cypress");
  });

  it("AC-2: gives the same index when extracting twice from the same AST", () => {
    // Arrange
    const program = parseSource(checkoutSpec);

    // Act
    const first = extractFileIndex(program, checkoutSpec, options);
    const second = extractFileIndex(program, checkoutSpec, options);

    // Assert
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first).toEqual(checkoutIndex);
  });

  it("AC-2: gives the same index when extracting from two parses of the same source", () => {
    // Act
    const first = indexOf(checkoutSpec);
    const second = indexOf(checkoutSpec);

    // Assert
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first).toEqual(checkoutIndex);
  });

  it.each([
    ["an empty file", ""],
    [
      "a file with only a helper",
      [
        "export function total(prices: number[]): number {",
        "  return prices.reduce((a, b) => a + b, 0);",
        "}",
      ].join("\n"),
    ],
  ])("AC-3: gives a valid and empty index for %s", (_name, source) => {
    // Act
    const index = indexOf(source);

    // Assert
    expect(FileIndexSchema.parse(index)).toEqual(index);
    expect(index).toEqual({
      schemaVersion: FILE_INDEX_SCHEMA_VERSION,
      framework: null,
      tests: [],
      locators: [],
    } satisfies FileIndex);
  });
});
