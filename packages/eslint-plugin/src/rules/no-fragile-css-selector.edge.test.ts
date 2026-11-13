import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { createPlugin } from "../plugin.js";
import { noFragileCssSelector } from "./no-fragile-css-selector.js";

type MessageId = "positionalPseudoClass" | "tooManyCombinators" | "generatedClass" | "numericId";

const error = (messageId: MessageId, data: Record<string, string>) => ({ messageId, data });

/** Longer than SELECTOR_MAX_LENGTH (2048), starting with a generated class that must not be read. */
const HUGE = `.css-1a2b3c${",a".repeat(1100)}`;

const TWICE = 'page.locator(".css-1a2b3c");\npage.locator(".css-1a2b3c");';

/** Lints with this rule and the given options; throws when ESLint rejects them. */
function lintWithOptions(options: unknown) {
  const linter = new Linter({ configType: "flat", cwd: process.cwd() });
  return linter.verify(
    'page.locator("a");',
    [
      {
        files: ["**/*.ts"],
        plugins: { atium: createPlugin({ "no-fragile-css-selector": noFragileCssSelector }) },
        rules: { "atium/no-fragile-css-selector": ["warn", options] },
      },
    ],
    "a.ts",
  );
}

describe("no-fragile-css-selector: edge cases", () => {
  createRuleTester().run("no-fragile-css-selector", noFragileCssSelector, {
    valid: [
      // A template with ${} is not read.
      "page.locator(`li:nth-child(${n})`);",
      "page.locator(`.css-${hash}`);",
      // find() is not a query.
      'cy.get("a").find(".css-1a2b3c");',
      // Longer than the limit: unknown, not reported.
      `page.locator("${HUGE}");`,
      // depth 1 still accepts a selector without combinators.
      { code: 'page.locator("a.b");', options: [{ depth: 1 }] },
    ],
    invalid: [
      {
        code: "page.locator(`li:nth-child(2)`);",
        errors: [error("positionalPseudoClass", { pseudoClass: "nth-child" })],
      },
      {
        code: 'page.locator("css=div > ul > li > a");',
        errors: [error("tooManyCombinators", { count: "3", depth: "3" })],
      },
      // One item of a list with 3 combinators is enough.
      {
        code: 'page.locator("a, div > ul > li > a, b");',
        errors: [error("tooManyCombinators", { count: "3", depth: "3" })],
      },
      // Pseudo-class names are case-insensitive in CSS.
      {
        code: 'page.locator("li:NTH-CHILD(2)");',
        errors: [{ messageId: "positionalPseudoClass" }],
      },
      // A chained locator is a query.
      {
        code: 'page.locator("a").locator(".css-1a2b3c");',
        errors: [error("generatedClass", { className: "css-1a2b3c" })],
      },
      {
        code: 'frame.locator(".css-1a2b3c");',
        errors: [error("generatedClass", { className: "css-1a2b3c" })],
      },
      // depth 1 reports a single combinator.
      {
        code: 'page.locator("a > b");',
        options: [{ depth: 1 }],
        errors: [error("tooManyCombinators", { count: "1", depth: "1" })],
      },
    ],
  });

  createRuleTester({
    atium: { pageObjectDirs: ["tests/pages/", "src/po/**", "tests/*.po.ts"] },
  }).run("no-fragile-css-selector", noFragileCssSelector, {
    valid: [],
    invalid: [
      // Every glob counts, and a trailing slash names a directory.
      ...["tests/pages/a.ts", "src/po/x/b.ts", "tests/login.po.ts"].map((filename) => ({
        filename,
        code: TWICE,
        errors: [{ messageId: "generatedClass" as const, line: 1 }],
      })),
      // Two different selectors with the same reason give two findings.
      {
        filename: "tests/pages/a.ts",
        code: 'page.locator(".css-1a2b3c");\npage.locator(".css-4d5e6f");',
        errors: [
          { messageId: "generatedClass" as const, data: { className: "css-1a2b3c" }, line: 1 },
          { messageId: "generatedClass" as const, data: { className: "css-4d5e6f" }, line: 2 },
        ],
      },
      // Outside every glob, both appearances.
      {
        filename: "tests/other/a.ts",
        code: TWICE,
        errors: [
          { messageId: "generatedClass" as const },
          { messageId: "generatedClass" as const },
        ],
      },
    ],
  });

  describe("schema", () => {
    it.each([
      ["depth 0", { depth: 0 }],
      ["a fractional depth", { depth: 1.5 }],
      ["a string depth", { depth: "3" }],
      ["an unknown key", { depth: 3, extra: true }],
    ])("rejects %s", (_name, options) => {
      expect(() => lintWithOptions(options)).toThrow();
    });

    it("accepts depth 1", () => {
      expect(() => lintWithOptions({ depth: 1 })).not.toThrow();
    });
  });
});
