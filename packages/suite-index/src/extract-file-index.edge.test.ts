import { describe, expect, it } from "vitest";
import { parseSource, playwrightSpec } from "../test/source.js";
import type { ExtractFileIndexOptions } from "./extract-file-index.js";
import { extractFileIndex } from "./extract-file-index.js";
import type { FileIndex } from "./file-index.js";
import { FileIndexSchema } from "./file-index.js";

const options: ExtractFileIndexOptions = { assertFunctionNames: [], i18n: false };

function indexOf(source: string, overrides: Partial<ExtractFileIndexOptions> = {}): FileIndex {
  return extractFileIndex(parseSource(source), source, { ...options, ...overrides });
}

function inTest(...lines: readonly string[]): string {
  return playwrightSpec('test("t", async ({ page }) => {', ...lines, "});");
}

function cypressTest(...lines: readonly string[]): string {
  return ['test("t", () => {', ...lines, "});"].join("\n");
}

// Serialization without `parent`, which is cyclic.
function serialize(program: unknown): string {
  return JSON.stringify(program, (key, value: unknown) => (key === "parent" ? undefined : value));
}

describe("extractFileIndex edge cases", () => {
  it("indexes a Cypress chain as one action per call, in order, all with the level of cy.get", () => {
    const index = indexOf(
      cypressTest('cy.get("[data-testid=a]").click().type("x");', 'cy.visit("/home");'),
    );

    expect(index.tests[0]?.actions).toEqual([
      { name: "get", level: 3 },
      { name: "click", level: 3 },
      { name: "type", level: 3 },
      { name: "visit", level: null },
    ]);
  });

  it("takes the level of the query for an action after a refinement", () => {
    const index = indexOf(inTest('await page.locator("#a").first().click();'));

    expect(index.tests[0]?.actions).toEqual([{ name: "click", level: 2 }]);
  });

  it("gives an action on a variable no level", () => {
    const index = indexOf(inTest('const b = page.locator("#a");', "await b.click();"));

    expect(index.tests[0]?.actions).toEqual([{ name: "click", level: null }]);
  });

  it("keeps the actions inside test.step and nested callbacks in source order", () => {
    const index = indexOf(
      inTest(
        'await page.goto("/");',
        'await test.step("s", async () => {',
        '  await [1].map(async () => { await page.locator("#a").click(); });',
        "});",
        'await page.getByTestId("z").click();',
      ),
    );

    expect(index.tests[0]?.actions.map((a) => a.name)).toEqual(["goto", "click", "click"]);
  });

  it("assigns the calls of a test nested in a test to the innermost test only", () => {
    const index = indexOf(
      playwrightSpec(
        'test("outer", async ({ page }) => {',
        '  await page.goto("/a");',
        '  test("inner", async ({ page }) => {',
        '    await page.locator("#x").click();',
        "  });",
        '  await page.goto("/b");',
        "});",
      ),
    );

    expect(index.tests.map((t) => t.fullTitle)).toEqual(["outer", "outer › inner"]);
    expect(index.tests[0]?.actions.map((a) => a.name)).toEqual(["goto", "goto"]);
    expect(index.tests[1]?.actions.map((a) => a.name)).toEqual(["click"]);
  });

  it("assigns no test the calls of hooks and helpers", () => {
    const index = indexOf(
      playwrightSpec(
        'test.beforeEach(async ({ page }) => { await page.goto("/"); await expect(page).toHaveURL("/"); setup(); });',
        "async function helper(page) { await page.locator('#h').click(); }",
        'test("t", async () => {});',
      ),
    );

    expect(index.tests[0]).toMatchObject({ actions: [], assertions: [], calls: [] });
    expect(index.locators).toHaveLength(1);
    expect(index.locators[0]?.testTitlePath).toBeNull();
  });

  it("lists each called name once, without steps, expects, actions or locators", () => {
    const index = indexOf(
      inTest(
        "await login(page);",
        "await login(page);",
        "await po.open();",
        'await test.step("s", async () => { await login(page); await po.open(); });',
        'await expect(page.locator("#a")).toBeVisible();',
        'await page.locator("#a").click();',
        "await verify(page);",
      ),
      { assertFunctionNames: ["verify"] },
    );

    expect(index.tests[0]?.calls).toEqual(["login", "po.open"]);
    expect(index.tests[0]?.assertions.map((a) => a.name)).toContain("verify");
  });

  it("marks a test non static for a computed title and keeps the others static", () => {
    const index = indexOf(
      playwrightSpec(
        'test.describe("d", () => {',
        "  test(name, async () => {});",
        '  test("a" + b, async () => {});',
        '  test("ok", async () => {});',
        "});",
      ),
    );

    expect(index.tests.map((t) => t.isStatic)).toEqual([false, false, true]);
  });

  it("gives framework null without imports", () => {
    const index = indexOf('test("t", () => {});');

    expect(index.framework).toBeNull();
  });

  it("gives framework null when the imports reveal both frameworks", () => {
    const index = indexOf(
      'import { test } from "@playwright/test";\nimport "cypress";\ntest("t", () => {});',
    );

    expect(index.framework).toBeNull();
  });

  it("sees through TypeScript wrappers on the receiver", () => {
    const index = indexOf(
      inTest(
        'await (page as Page).locator("#a").click();',
        'await page!.getByTestId("z").click();',
      ),
    );

    expect(index.tests[0]?.actions).toEqual([
      { name: "click", level: 2 },
      { name: "click", level: 3 },
    ]);
    expect(index.locators.map((l) => l.method)).toEqual(["locator", "getByTestId"]);
  });

  it("does not change the AST", () => {
    const source = playwrightSpec(
      'test.describe("d", () => { test("t", async ({ page }) => {',
      '  await page.locator("DIV  >  a").first().click();',
      "  await expect(page).toHaveURL(`/${id}`);",
      "}); });",
    );
    const program = parseSource(source);
    const before = serialize(program);

    extractFileIndex(program, source, options);

    expect(serialize(program)).toBe(before);
  });

  it.each([
    ["an empty file", ""],
    ["no calls", "const a = 1;"],
    ["only imports", 'import { test } from "@playwright/test";'],
    ["a unicode title", playwrightSpec('test("日本語 ✓ ñ", async () => {});')],
    [
      "windows newlines",
      'import { test } from "@playwright/test";\r\ntest("t", async ({ page }) => {\r\n  await page.locator("#a").click();\r\n});\r\n',
    ],
    ["a non literal selector", inTest("\tawait page.locator(sel).click();")],
  ])("gives an index that validates against FileIndexSchema for %s", (_name, source) => {
    const index = indexOf(source);

    expect(FileIndexSchema.safeParse(index).success).toBe(true);
  });

  it("measures columns in 1-based UTF-16 units after astral characters", () => {
    const index = indexOf(playwrightSpec('const s = "😀"; page.locator("#a");'));

    // `const s = "😀"; ` is 16 UTF-16 units, so the call starts at column 17.
    expect(index.locators[0]?.location).toEqual({ line: 2, column: 17 });
  });

  it("keeps a getBy argument as written and normalizes a locator selector", () => {
    const index = indexOf(inTest('page.getByText("Welcome  Back");', 'page.locator("DIV  >  a");'));

    expect(index.locators.map((l) => l.selector)).toEqual(["Welcome  Back", "div > a"]);
    expect(index.locators[1]?.code).toBe('page.locator("DIV  >  a")');
  });

  it("gives a null selector and null level for a locator with no literal argument", () => {
    const index = indexOf(inTest("page.locator(sel);", "page.locator();"));

    expect(index.locators.map((l) => [l.selector, l.level])).toEqual([
      [null, null],
      [null, null],
    ]);
  });
});
