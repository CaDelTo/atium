import { ruleDocsUrl } from "@atium/core/pure";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { preferWebFirstAssertion, RULE_WEB_FIRST_ASSERTION } from "./prefer-web-first-assertion.js";

/** The method awaited inside `expect`, reported in `data.query`. */
type Query = "isVisible" | "textContent" | "count";

/**
 * What the rule offers besides the finding (03-linter.md §11.3.1, E2E009):
 * an autofix with the fixed code, a `useWebFirst` suggestion with the matcher
 * and its output, or nothing.
 */
type Outcome =
  | { readonly kind: "autofix"; readonly output: string }
  | { readonly kind: "suggestion"; readonly replacement: string; readonly output: string }
  | { readonly kind: "findingOnly" };

const autofix = (output: string): Outcome => ({ kind: "autofix", output });
const suggestion = (replacement: string, output: string): Outcome => ({
  kind: "suggestion",
  replacement,
  output,
});
const findingOnly: Outcome = { kind: "findingOnly" };

/** The 1-based line and column of `offset` in `code`, as ESLint reports them. */
function pointAt(code: string, offset: number): { line: number; column: number } {
  const lines = code.slice(0, offset).split("\n");
  return { line: lines.length, column: (lines.at(-1) ?? "").length + 1 };
}

/** Marks the start and the end of the reported span in the code of a case. */
const SPAN_START = "«";
const SPAN_END = "»";

/**
 * The code without the span markers and, when it has them, the position of
 * the marked span.
 */
function unmark(marked: string) {
  const start = marked.indexOf(SPAN_START);
  const end = marked.indexOf(SPAN_END) - SPAN_START.length;
  const code = marked.replace(SPAN_START, "").replace(SPAN_END, "");
  if (start < 0) {
    return { code, position: {} };
  }
  const from = pointAt(code, start);
  const to = pointAt(code, end);
  return {
    code,
    position: { line: from.line, column: from.column, endLine: to.line, endColumn: to.column },
  };
}

/**
 * An invalid case: one `preferWebFirst` error with the awaited query and the
 * outcome of §11.3.1. When the code marks a span with `«…»`, the error must
 * span exactly that text: the `expect(…)` or `expect.soft(…)` call, from
 * `expect` to its closing `)`, without the matcher.
 */
function webFirstCase(marked: string, query: Query, outcome: Outcome) {
  const { code, position } = unmark(marked);
  return {
    code,
    output: outcome.kind === "autofix" ? outcome.output : null,
    errors: [
      {
        messageId: "preferWebFirst" as const,
        data: { query },
        ...position,
        suggestions:
          outcome.kind === "suggestion"
            ? [
                {
                  messageId: "useWebFirst" as const,
                  data: { replacement: outcome.replacement },
                  output: outcome.output,
                },
              ]
            : [],
      },
    ],
  };
}

describe("AC-1: prefer-web-first-assertion", () => {
  it("AC-1: meta carries the E2E009 catalog entry, an autofix and suggestions (passes with the stub; the red comes from the invalid cases)", () => {
    const { meta } = preferWebFirstAssertion;

    expect(RULE_WEB_FIRST_ASSERTION).toBe("E2E009");
    expect(meta.docs).toMatchObject({
      code: "E2E009",
      severity: "warning",
      category: "assertions",
      confidence: "high",
      source: "rule",
      recommended: true,
    });
    expect(meta.docs?.url).toBe(ruleDocsUrl("E2E009"));
    expect(meta.fixable).toBe("code");
    expect(meta.hasSuggestions).toBe(true);
  });

  createRuleTester().run("prefer-web-first-assertion", preferWebFirstAssertion, {
    valid: [
      // Already web-first.
      'await expect(page.getByRole("alert")).toBeVisible();',
      'test("t", async ({ page }) => {\n  await expect(page.locator("li")).toHaveCount(3);\n});',
      // "Does not detect" (§11.3): a value stored before in a variable.
      'const visible = await page.getByRole("alert").isVisible();\nexpect(visible).toBe(true);',
      // "Does not detect": expect.poll already retries.
      'await expect.poll(() => page.locator("li").count()).toBe(2);',
      'await expect.poll(async () => await page.locator("li").count()).toBe(2);',
      // "Does not detect": innerText, inputValue and getAttribute.
      'expect(await page.locator("p").innerText()).toBe("a");',
      'expect(await page.locator("input").inputValue()).toBe("a");',
      'expect(await page.locator("a").getAttribute("href")).toBe("/");',
      // "Does not detect": the query without await.
      'expect(page.getByRole("alert").isVisible()).toBe(true);',
      // "Does not detect": Cypress, whose .should() already retries.
      'cy.get("a").should("be.visible");',
      'cy.get("li").should("have.length", 3);',
      // The first argument of expect is not `await x.query()` (§11.3.1).
      'expect((await page.locator("li").count()) + 1).toBe(3);',
      // Not an expect call.
      'assert(await page.getByRole("alert").isVisible());',
    ],
    invalid: [
      // One row of each query, at the top level and with the position of the expect call.
      webFirstCase(
        '«expect(await page.getByRole("alert").isVisible())».toBe(true);',
        "isVisible",
        autofix('await expect(page.getByRole("alert")).toBeVisible();'),
      ),
      webFirstCase(
        'await «expect(await page.locator("li").count())».toBe(3);',
        "count",
        autofix('await expect(page.locator("li")).toHaveCount(3);'),
      ),
      webFirstCase(
        '«expect(await page.getByTestId("title").textContent())».toBe("Hi");',
        "textContent",
        suggestion("toHaveText()", 'await expect(page.getByTestId("title")).toHaveText("Hi");'),
      ),
      // Inside a test body.
      webFirstCase(
        'test("t", async ({ page }) => {\n  «expect(await page.getByRole("alert").isVisible())».toBe(false);\n});',
        "isVisible",
        autofix(
          'test("t", async ({ page }) => {\n  await expect(page.getByRole("alert")).toBeHidden();\n});',
        ),
      ),
      // expect.soft: the error spans `expect.soft(…)`.
      webFirstCase(
        'await «expect.soft(await page.getByRole("alert").isVisible())».toBe(true);',
        "isVisible",
        autofix('await expect.soft(page.getByRole("alert")).toBeVisible();'),
      ),
      // A message as the second argument of expect: inside the reported call.
      webFirstCase(
        'await «expect(await page.locator("li").count(), "three rows")».toBe(3);',
        "count",
        autofix('await expect(page.locator("li"), "three rows").toHaveCount(3);'),
      ),
      // .not is part of the matcher, not of the reported call.
      webFirstCase(
        'await «expect(await page.getByRole("alert").isVisible())».not.toBe(true);',
        "isVisible",
        autofix('await expect(page.getByRole("alert")).not.toBeVisible();'),
      ),
      // TypeScript wrappers around the awaited query are transparent (§11.3.1).
      webFirstCase(
        'await «expect((await page.locator("li").count()) as number)».toBe(2);',
        "count",
        autofix('await expect(page.locator("li")).toHaveCount(2);'),
      ),
      // With any matcher or none (§11.3.1): only the finding.
      webFirstCase(
        'await «expect(await page.locator("li").count())».toBeGreaterThan(0);',
        "count",
        findingOnly,
      ),
      webFirstCase(
        'await «expect(await page.getByRole("alert").textContent())».toBeNull();',
        "textContent",
        findingOnly,
      ),
      webFirstCase('«expect(await page.locator("li").count())»;', "count", findingOnly),
      // With arguments in the query (§11.3.1): only the finding.
      webFirstCase(
        'await «expect(await page.isVisible("#a"))».toBe(true);',
        "isVisible",
        findingOnly,
      ),
      webFirstCase(
        'await «expect(await page.textContent("h1"))».toBe("Hi");',
        "textContent",
        findingOnly,
      ),
    ],
  });
});

describe("AC-2: prefer-web-first-assertion fixes only safe transformations and suggests the rest", () => {
  createRuleTester().run("prefer-web-first-assertion", preferWebFirstAssertion, {
    valid: [],
    invalid: [
      // Autofix: every isVisible and count row on locator() and getBy* (§11.3.1).
      webFirstCase(
        'expect(await page.locator("#banner").isVisible()).toBe(true);',
        "isVisible",
        autofix('await expect(page.locator("#banner")).toBeVisible();'),
      ),
      webFirstCase(
        'expect(await page.getByRole("dialog", { name: "Saved" }).isVisible()).toEqual(true);',
        "isVisible",
        autofix('await expect(page.getByRole("dialog", { name: "Saved" })).toBeVisible();'),
      ),
      webFirstCase(
        'expect(await page.getByTestId("toast").isVisible()).toBeTruthy();',
        "isVisible",
        autofix('await expect(page.getByTestId("toast")).toBeVisible();'),
      ),
      webFirstCase(
        'expect(await page.locator("#banner").isVisible()).toBe(false);',
        "isVisible",
        autofix('await expect(page.locator("#banner")).toBeHidden();'),
      ),
      webFirstCase(
        'expect(await page.getByText("Loading").isVisible()).toEqual(false);',
        "isVisible",
        autofix('await expect(page.getByText("Loading")).toBeHidden();'),
      ),
      webFirstCase(
        'expect(await page.getByTestId("spinner").isVisible()).toBeFalsy();',
        "isVisible",
        autofix('await expect(page.getByTestId("spinner")).toBeHidden();'),
      ),
      webFirstCase(
        'expect(await page.getByRole("row").count()).toEqual(2);',
        "count",
        autofix('await expect(page.getByRole("row")).toHaveCount(2);'),
      ),
      // The argument of toBe(n) is kept as written.
      webFirstCase(
        'expect(await page.locator("li").count()).toBe(expected);',
        "count",
        autofix('await expect(page.locator("li")).toHaveCount(expected);'),
      ),
      // A query on any object, not only page.
      webFirstCase(
        'expect(await row.locator("td").count()).toBe(4);',
        "count",
        autofix('await expect(row.locator("td")).toHaveCount(4);'),
      ),
      // Autofix: a refinement whose base is such a query.
      webFirstCase(
        'expect(await page.getByRole("row").first().isVisible()).toBe(true);',
        "isVisible",
        autofix('await expect(page.getByRole("row").first()).toBeVisible();'),
      ),
      webFirstCase(
        'expect(await page.locator("li").nth(1).isVisible()).toBeFalsy();',
        "isVisible",
        autofix('await expect(page.locator("li").nth(1)).toBeHidden();'),
      ),
      webFirstCase(
        'expect(await page.getByTestId("item").last().isVisible()).toBe(true);',
        "isVisible",
        autofix('await expect(page.getByTestId("item").last()).toBeVisible();'),
      ),
      // Keeps .not, expect.soft and the message; adds no second await.
      webFirstCase(
        'await expect(await page.getByRole("alert").isVisible()).toBe(true);',
        "isVisible",
        autofix('await expect(page.getByRole("alert")).toBeVisible();'),
      ),
      webFirstCase(
        'expect(await page.locator("#banner").isVisible()).not.toBeTruthy();',
        "isVisible",
        autofix('await expect(page.locator("#banner")).not.toBeVisible();'),
      ),
      webFirstCase(
        'expect.soft(await page.getByRole("row").count()).toBe(2);',
        "count",
        autofix('await expect.soft(page.getByRole("row")).toHaveCount(2);'),
      ),
      webFirstCase(
        'await expect.soft(await page.locator("li").count(), "rows").not.toBe(0);',
        "count",
        autofix('await expect.soft(page.locator("li"), "rows").not.toHaveCount(0);'),
      ),
      webFirstCase(
        'expect(await page.getByRole("alert").isVisible(), "alert shown").toBe(false);',
        "isVisible",
        autofix('await expect(page.getByRole("alert"), "alert shown").toBeHidden();'),
      ),

      // Suggestion: every textContent row, whatever the receiver (§11.3.1).
      webFirstCase(
        'expect(await page.getByRole("heading").textContent()).toEqual("Home");',
        "textContent",
        suggestion("toHaveText()", 'await expect(page.getByRole("heading")).toHaveText("Home");'),
      ),
      webFirstCase(
        'expect(await page.locator("h1").textContent()).toMatch(/Home/);',
        "textContent",
        suggestion("toHaveText()", 'await expect(page.locator("h1")).toHaveText(/Home/);'),
      ),
      webFirstCase(
        'expect(await page.locator("h1").textContent()).toContain("Home");',
        "textContent",
        suggestion("toContainText()", 'await expect(page.locator("h1")).toContainText("Home");'),
      ),
      webFirstCase(
        'await expect.soft(await page.locator("h1").textContent(), "title").not.toContain("Error");',
        "textContent",
        suggestion(
          "toContainText()",
          'await expect.soft(page.locator("h1"), "title").not.toContainText("Error");',
        ),
      ),
      // Suggestion: isVisible and count on any other receiver.
      webFirstCase(
        "expect(await alert.isVisible()).toBe(true);",
        "isVisible",
        suggestion("toBeVisible()", "await expect(alert).toBeVisible();"),
      ),
      webFirstCase(
        'expect(await page.$("a").isVisible()).toBe(false);',
        "isVisible",
        suggestion("toBeHidden()", 'await expect(page.$("a")).toBeHidden();'),
      ),
      webFirstCase(
        "await expect(await items.first().count()).toBe(3);",
        "count",
        suggestion("toHaveCount()", "await expect(items.first()).toHaveCount(3);"),
      ),
      webFirstCase(
        'expect(await cy.get("a").first().isVisible()).toBeTruthy();',
        "isVisible",
        suggestion("toBeVisible()", 'await expect(cy.get("a").first()).toBeVisible();'),
      ),
      webFirstCase(
        'expect(await page.locator("a").filter({ hasText: "x" }).count()).toBe(1);',
        "count",
        suggestion(
          "toHaveCount()",
          'await expect(page.locator("a").filter({ hasText: "x" })).toHaveCount(1);',
        ),
      ),

      // Finding only: another matcher, a matcher argument that is not the row's literal.
      webFirstCase(
        'expect(await page.getByRole("alert").isVisible()).toBe(shown);',
        "isVisible",
        findingOnly,
      ),
      webFirstCase(
        'expect(await page.getByRole("alert").isVisible()).toContain(true);',
        "isVisible",
        findingOnly,
      ),
      // Finding only: a number of matcher arguments different from the row's.
      webFirstCase(
        'expect(await page.getByRole("alert").isVisible()).toBe();',
        "isVisible",
        findingOnly,
      ),
      webFirstCase(
        'expect(await page.getByRole("alert").isVisible()).toBe(true, extra);',
        "isVisible",
        findingOnly,
      ),
      webFirstCase(
        'expect(await page.getByRole("alert").isVisible()).toBeTruthy(1);',
        "isVisible",
        findingOnly,
      ),
      webFirstCase('expect(await page.locator("li").count()).toBe();', "count", findingOnly),
      webFirstCase(
        'expect(await page.locator("h1").textContent()).toContain("a", "b");',
        "textContent",
        findingOnly,
      ),
      // Finding only: a comment inside the replaced code.
      webFirstCase(
        'expect(await page.getByRole("alert").isVisible()).toBe(/* shown */ true);',
        "isVisible",
        findingOnly,
      ),
      webFirstCase(
        'expect(await /* rows */ page.locator("li").count()).toBe(3);',
        "count",
        findingOnly,
      ),
      webFirstCase(
        'expect(await page.locator("h1").textContent()) // title\n  .toBe("Home");',
        "textContent",
        findingOnly,
      ),
    ],
  });
});
