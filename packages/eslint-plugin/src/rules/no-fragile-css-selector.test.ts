import path from "node:path";
import { ruleDocsUrl } from "@atium/core/pure";
import { thrownAtiumError } from "@atium/core/testing";
import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { createPlugin } from "../plugin.js";
import { noFragileCssSelector, RULE_FRAGILE_CSS_SELECTOR } from "./no-fragile-css-selector.js";

type FragileMessageId =
  "positionalPseudoClass" | "tooManyCombinators" | "generatedClass" | "numericId";

/**
 * An invalid case: one statement on line 1 with a single string literal, the
 * selector, and one error on that literal, quotes included. No autofix and no
 * suggestion (03-linter.md §11.2: there is no safe replacement).
 */
function fragileCase(code: string, messageId: FragileMessageId, data: Record<string, string>) {
  return {
    code,
    output: null,
    errors: [
      {
        messageId,
        data,
        line: 1,
        column: code.indexOf('"') + 1,
        endLine: 1,
        endColumn: code.lastIndexOf('"') + 2,
        suggestions: [],
      },
    ],
  };
}

/** A `generatedClass` error on `.css-1a2b3c` at the given 1-based line, columns 14 to 27. */
const generatedAt = (line: number) => ({
  messageId: "generatedClass" as const,
  data: { className: "css-1a2b3c" },
  line,
  column: 14,
  endLine: line,
  endColumn: 27,
});

/** The same fragile selector twice, on lines 1 and 2. */
const TWICE = 'page.locator(".css-1a2b3c");\npage.locator(".css-1a2b3c");';

/**
 * Lints `code` with only this rule, from `process.cwd()`. Unlike `RuleTester`,
 * which lints an absolute `filename` from the root of the file system, the
 * `cwd` stays the project's, as when ESLint runs from the repository.
 */
function lint(code: string, filename: string, settings: Readonly<Record<string, unknown>>) {
  const linter = new Linter({ configType: "flat", cwd: process.cwd() });
  return linter.verify(
    code,
    [
      {
        // Without `files`, ESLint ignores a .ts file.
        files: ["**/*.ts"],
        plugins: { atium: createPlugin({ "no-fragile-css-selector": noFragileCssSelector }) },
        rules: { "atium/no-fragile-css-selector": "warn" },
        settings,
      },
    ],
    filename,
  );
}

describe("AC-1: no-fragile-css-selector", () => {
  it("AC-1: meta.docs carries the E2E002 catalog entry (passes with the stub; the red comes from the invalid cases)", () => {
    const { meta } = noFragileCssSelector;

    expect(RULE_FRAGILE_CSS_SELECTOR).toBe("E2E002");
    expect(meta.docs).toMatchObject({
      code: "E2E002",
      severity: "warning",
      category: "selectors",
      confidence: "medium",
      source: "rule",
      recommended: true,
    });
    expect(meta.docs?.url).toBe(ruleDocsUrl("E2E002"));
    expect(meta.fixable).toBeUndefined();
    expect(meta.hasSuggestions).toBeUndefined();
  });

  createRuleTester().run("no-fragile-css-selector", noFragileCssSelector, {
    valid: [
      // Two combinators: below the default depth of 3 (FRAGILE_SELECTOR_DEFAULTS).
      'page.locator("div > ul > li");',
      'page.locator("[data-testid=submit]");',
      'page.getByRole("button");',
      // getBy* takes text, not a selector.
      'page.getByText("li:nth-child(2)");',
      // XPath is E2E003, not this rule.
      'page.locator("//tr[2]");',
      // Not a literal: the selector is unknown.
      "page.locator(sel);",
      // Not CSS: a Playwright text selector.
      'page.locator("text=Pay");',
      // A Cypress alias, not a selector.
      'cy.get("@alias");',
      // `get` outside a `cy` chain is not a query.
      'axios.get(".css-1a2b3c");',
      // Fewer than three digits in a row.
      'page.locator("#step2");',
      // `css-` without a digit is a regular class.
      'page.locator(".css-grid");',
      { code: 'page.locator("div > ul > li > a");', options: [{ depth: 4 }] },
    ],
    invalid: [
      // Playwright
      fragileCase('page.locator("li:nth-child(2)");', "positionalPseudoClass", {
        pseudoClass: "nth-child",
      }),
      fragileCase('page.locator("tr:nth-of-type(odd)");', "positionalPseudoClass", {
        pseudoClass: "nth-of-type",
      }),
      fragileCase('page.locator("div > ul > li > a");', "tooManyCombinators", {
        count: "3",
        depth: "3",
      }),
      fragileCase('page.locator(".css-1a2b3c");', "generatedClass", { className: "css-1a2b3c" }),
      fragileCase('page.locator("#ember123");', "numericId", { id: "ember123" }),
      fragileCase('page.$(".sc-bdVaJa");', "generatedClass", { className: "sc-bdVaJa" }),
      // Cypress
      fragileCase('cy.get("ul li:nth-child(2)");', "positionalPseudoClass", {
        pseudoClass: "nth-child",
      }),
      fragileCase('cy.get(".jsx-123456");', "generatedClass", { className: "jsx-123456" }),
      // The depth option: four descendant combinators reach a depth of 4.
      {
        ...fragileCase('page.locator("a b c d e");', "tooManyCombinators", {
          count: "4",
          depth: "4",
        }),
        options: [{ depth: 4 }],
      },
      // Two reasons, one finding: the positional pseudo-class comes first.
      fragileCase('page.locator("li:nth-child(2).css-1a2b3c");', "positionalPseudoClass", {
        pseudoClass: "nth-child",
      }),
    ],
  });
});

describe("AC-2: a selector defined in a Page Object gives a single finding", () => {
  createRuleTester({ atium: { pageObjectDirs: ["tests/pages/**"] } }).run(
    "no-fragile-css-selector",
    noFragileCssSelector,
    {
      valid: [],
      invalid: [
        // In a Page Object, only the first appearance.
        { code: TWICE, filename: "tests/pages/login.ts", errors: [generatedAt(1)] },
        // The same selector once normalized (normalizeSelector) counts as the same.
        {
          code: 'page.locator("div>ul>li>a");\npage.locator("div > ul > li > a");',
          filename: "tests/pages/login.ts",
          errors: [
            {
              messageId: "tooManyCombinators",
              data: { count: "3", depth: "3" },
              line: 1,
              column: 14,
              endLine: 1,
              endColumn: 27,
            },
          ],
        },
        // Different selectors in a Page Object are each reported.
        {
          code: 'page.locator(".css-1a2b3c");\npage.locator("#ember123");',
          filename: "tests/pages/login.ts",
          errors: [generatedAt(1), { messageId: "numericId", data: { id: "ember123" }, line: 2 }],
        },
        // Outside the Page Objects, every appearance.
        {
          code: TWICE,
          filename: "tests/login.spec.ts",
          errors: [generatedAt(1), generatedAt(2)],
        },
      ],
    },
  );

  createRuleTester({ atium: { pageObjectDirs: ["tests/pages"] } }).run(
    "no-fragile-css-selector",
    noFragileCssSelector,
    {
      valid: [],
      invalid: [
        // A glob without wildcards covers what is inside it (D3).
        { code: TWICE, filename: "tests/pages/login.ts", errors: [generatedAt(1)] },
      ],
    },
  );

  it("AC-2: reports a Page Object selector once when ESLint gives the file as an absolute path", () => {
    const filename = path.join(process.cwd(), "tests/pages/login.ts");

    const messages = lint(TWICE, filename, { atium: { pageObjectDirs: ["tests/pages/**"] } });

    expect(messages).toMatchObject([{ messageId: "generatedClass", line: 1 }]);
  });
});

describe("settings.atium", () => {
  it("throws CONFIG_INVALID when pageObjectDirs is not a list", () => {
    const error = thrownAtiumError(() =>
      lint('page.locator(".css-1a2b3c");', "tests/login.spec.ts", {
        atium: { pageObjectDirs: "tests" },
      }),
    );

    expect(error.code).toBe("CONFIG_INVALID");
  });
});
