import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { createPlugin } from "../plugin.js";
import { noPositionalLocator } from "./no-positional-locator.js";

/** One error with its message and data, at any position. */
const nth = (method: "nth" | "eq", index: string) => ({
  messageId: "nth" as const,
  data: { method, index },
});
const firstOrLast = (method: string) => ({ messageId: "firstOrLast" as const, data: { method } });

/** Lints with this rule and the given options; throws when ESLint rejects them. */
function lintWithOptions(options: unknown) {
  const linter = new Linter({ configType: "flat", cwd: process.cwd() });
  return linter.verify(
    'page.locator("li");',
    [
      {
        files: ["**/*.ts"],
        plugins: { atium: createPlugin({ "no-positional-locator": noPositionalLocator }) },
        rules: { "atium/no-positional-locator": ["warn", options] },
      },
    ],
    "a.ts",
  );
}

describe("no-positional-locator: edge cases", () => {
  createRuleTester().run("no-positional-locator", noPositionalLocator, {
    valid: [
      // Not integers, however they are written.
      'page.locator("li").nth(-1.5);',
      'page.locator("li").nth(1.5);',
      // Not number literals.
      'page.locator("li").nth("1");',
      'page.locator("li").nth(1n);',
      'page.locator("li").nth();',
      'page.locator("li").nth(...args);',
      // -0 is not negative and below the default minIndex.
      'page.locator("li").nth(-0);',
      // Unique bases, also with the name written as a shorthand or a string key.
      'page.getByRole("row", { name }).nth(3);',
      'page.getByRole("row", { "name": "x" }).first();',
      'page.getByTestId("row").first().last();',
      'page.getByTestId("row").nth(-2);',
      // The base is the nearest query: a getByRole with a name survives a first().
      'page.getByRole("row", { name: "x" }).first().nth(1);',
      // .eq() outside a cy chain is not a refinement, even on a Playwright base.
      'page.getByTestId("row").eq(1);',
      'page.locator("li").eq(1);',
      // No base: unknown uniqueness for first/last/negative.
      "getItems().first();",
      "this.items.last();",
      "first();",
      // minIndex above the index.
      { code: 'cy.get("li").eq(2);', options: [{ minIndex: 3 }] },
      // A cy chain whose query is inside an argument has no base.
      'cy.wrap(page.locator("li")).first();',
    ],
    invalid: [
      // minIndex 0 reports index 0; the data carries "0".
      {
        code: 'page.locator("li").nth(0);',
        options: [{ minIndex: 0 }],
        output: null,
        errors: [nth("nth", "0")],
      },
      // -0 equals 0 and is reported at minIndex 0, never as a negative index.
      {
        code: 'page.locator("li").nth(-0);',
        options: [{ minIndex: 0 }],
        output: null,
        errors: [nth("nth", "0")],
      },
      // 2.0 is the integer 2.
      {
        code: 'page.locator("li").nth(2.0);',
        output: null,
        errors: [nth("nth", "2")],
      },
      // Hexadecimal literal.
      {
        code: 'page.locator("li").nth(0x10);',
        output: null,
        errors: [nth("nth", "16")],
      },
      // Other bases that are not unique.
      {
        code: 'page.$("li").first();',
        output: null,
        errors: [firstOrLast("first")],
      },
      {
        code: 'cy.xpath("//li").first();',
        output: null,
        errors: [firstOrLast("first")],
      },
      {
        code: 'cy.get("li").filter(".x").eq(2);',
        output: null,
        errors: [nth("eq", "2")],
      },
      {
        code: 'cy.get("li").filter(".x").last();',
        output: null,
        errors: [firstOrLast("last")],
      },
      {
        code: 'frame.locator("li").nth(1);',
        output: null,
        errors: [nth("nth", "1")],
      },
      {
        code: 'frame.locator("li").first();',
        output: null,
        errors: [firstOrLast("first")],
      },
      // Wrappers and optional calls are transparent.
      {
        code: '(page.locator("li") as Locator).first();',
        output: null,
        errors: [firstOrLast("first")],
      },
      {
        code: 'page.locator("li")!.nth(1);',
        output: null,
        errors: [nth("nth", "1")],
      },
      {
        code: 'page.locator("li")?.first();',
        output: null,
        errors: [firstOrLast("first")],
      },
      {
        code: 'page.locator("li")?.nth(1);',
        output: null,
        errors: [nth("nth", "1")],
      },
      {
        code: '(page.locator("li") satisfies Locator).nth(-1);',
        output: null,
        errors: [firstOrLast("nth(-1)")],
      },
      // A getByTestId is unique for first/last but not for .nth().
      {
        code: 'page.getByTestId("row").nth(1);',
        output: null,
        errors: [nth("nth", "1")],
      },
      // Computed or spread name option is not a known name.
      {
        code: 'page.getByRole("row", { [key]: "x" }).nth(1);',
        output: null,
        errors: [nth("nth", "1")],
      },
      {
        code: 'page.getByRole("row", { ...opts }).first();',
        output: null,
        errors: [firstOrLast("first")],
      },
      // Several refinements: each is judged against the nearest query.
      {
        code: 'page.locator("li").first().nth(1);',
        output: null,
        errors: [firstOrLast("first"), nth("nth", "1")],
      },
      {
        code: 'page.getByTestId("row").first().nth(1);',
        output: null,
        errors: [nth("nth", "1")],
      },
      {
        code: 'page.locator("li").nth(1).first();',
        output: null,
        errors: [nth("nth", "1"), firstOrLast("first")],
      },
      // Two statements: independent reports.
      {
        code: 'page.locator("a").first();\npage.locator("b").last();',
        output: null,
        errors: [firstOrLast("first"), firstOrLast("last")],
      },
    ],
  });

  describe("options", () => {
    it.each([
      ["a negative minIndex", { minIndex: -1 }],
      ["a fractional minIndex", { minIndex: 1.5 }],
      ["a string minIndex", { minIndex: "1" }],
      ["an unknown key", { minIndex: 1, extra: true }],
    ])("rejects %s", (_name, options) => {
      expect(() => lintWithOptions(options)).toThrow();
    });

    it.each([0, 1, 100])("accepts minIndex %i", (minIndex) => {
      expect(() => lintWithOptions({ minIndex })).not.toThrow();
    });
  });
});
