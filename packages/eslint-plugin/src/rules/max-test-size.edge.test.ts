import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import {
  cypressTest,
  DESIGN_LIMITS,
  fillerLines,
  playwrightTest,
  tooLargeError,
} from "../../test/test-size.js";
import type { MeasuredTest } from "../../test/test-size.js";
import { createPlugin } from "../plugin.js";
import { maxTestSize } from "./max-test-size.js";
import type { TestSizeOptions } from "./max-test-size.js";

/** Every action is over the limit, so a test reports exactly how many it has. */
const COUNT_ALL: TestSizeOptions = { maxActions: 0, maxLines: DESIGN_LIMITS.maxLines };

/** An invalid case under {@link COUNT_ALL} for tests whose callback body is a block. */
function counted(code: string, ...tests: readonly MeasuredTest[]) {
  return {
    code,
    options: [COUNT_ALL] satisfies [TestSizeOptions],
    output: null,
    errors: tests.map((test) => tooLargeError(code, test, COUNT_ALL)),
  };
}

/** A valid case under {@link COUNT_ALL}. */
const noActions = (code: string) => ({ code, options: [COUNT_ALL] satisfies [TestSizeOptions] });

const one = (actions: number, title = "t", lines = 1): MeasuredTest => ({ title, actions, lines });

/** Lints an empty file with this rule and the given options; throws on a bad config. */
function lint(options: unknown) {
  const linter = new Linter({ configType: "flat", cwd: process.cwd() });
  return linter.verify(
    "",
    [
      {
        files: ["**/*.js"],
        plugins: { atium: createPlugin({ "max-test-size": maxTestSize }) },
        rules: { "atium/max-test-size": ["warn", options] },
      },
    ],
    "a.js",
  );
}

describe("max-test-size edge cases", () => {
  createRuleTester().run("max-test-size", maxTestSize, {
    valid: [
      // A callback that is not a literal function is not measured (§11.3.1).
      noActions('test("t", fn);\nit("t", suite);'),
      // Actions of a describe outside its tests do not count; the test has none.
      noActions('test.describe("d", () => { page.click("a"); cy.visit("/"); });'),
      // The directive on the line before the test hides the report (RuleTester names the rule @rule-tester/max-test-size).
      {
        code: `// eslint-disable-next-line @rule-tester/max-test-size\n${playwrightTest(['await page.click("a");'])}`,
        options: [COUNT_ALL],
      },
      // CRLF files: 150 physical lines are not reported.
      { code: playwrightTest(fillerLines(148)).replaceAll("\n", "\r\n") },
    ],
    invalid: [
      // Expression-bodied callback: one action, one line, reported on its header up to the expression.
      {
        code: 'test("t", async ({ page }) => page.click("a"));',
        options: [COUNT_ALL],
        output: null,
        errors: [
          {
            messageId: "tooLarge",
            data: { actions: "1", lines: "1", maxActions: "0", maxLines: "150" },
            line: 1,
            column: 11,
            endLine: 1,
            endColumn: 31,
            suggestions: [],
          },
        ],
      },
      // TypeScript wrappers and optional chaining are transparent in Playwright.
      counted(
        playwrightTest([
          'await page!.click("a");',
          'await (page as Page).fill("a", "x");',
          'await page?.goto("/");',
          'await (<Page>page).press("a");',
          'await (page satisfies Page).check("a");',
        ]),
        one(5, "t", 7),
      ),
      // ... and in the cy chain.
      counted(
        cypressTest([
          'cy!.get("a").click();',
          '(cy as Cy).get("a")!.click();',
          'cy?.get("a")?.click();',
        ]),
        one(6, "t", 5),
      ),
      // test.step.skip is a step: its actions belong to the test, it is not reported itself.
      counted(
        playwrightTest(['await test.step.skip("s", async () => { await page.click("a"); });']),
        one(1, "t", 3),
      ),
      // A step with options after the body is not a step, but its actions still belong to the test.
      counted(
        playwrightTest([
          'await test.step("s", async () => { await page.click("a"); }, { box: true });',
        ]),
        one(1, "t", 3),
      ),
      // Only the test that has actions is reported; its neighbor and a describe-level call add nothing.
      counted(
        [
          'test.describe("d", () => {',
          '  page.click("x");',
          '  test("empty", async () => {});',
          '  test("busy", async ({ page }) => { await page.click("a"); });',
          "});",
        ].join("\n"),
        one(1, "busy"),
      ),
      // CRLF files: 151 physical lines are reported.
      {
        code: playwrightTest(fillerLines(149)).replaceAll("\n", "\r\n"),
        output: null,
        errors: [
          {
            messageId: "tooLarge",
            data: { actions: "0", lines: "151", maxActions: "25", maxLines: "150" },
            line: 1,
            column: 11,
            endLine: 1,
            endColumn: 31,
            suggestions: [],
          },
        ],
      },
      // Non-ASCII titles do not move the report.
      counted(
        playwrightTest(['await page.click("a");'], "tést 日本 😀"),
        one(1, "tést 日本 😀", 3),
      ),
    ],
  });

  it.each([
    { name: "a negative maxActions", options: { maxActions: -1 } },
    { name: "a zero maxLines", options: { maxLines: 0 } },
    { name: "a fractional maxActions", options: { maxActions: 1.5 } },
    { name: "a fractional maxLines", options: { maxLines: 10.5 } },
    { name: "a string maxActions", options: { maxActions: "25" } },
    { name: "an unknown key", options: { maxStatements: 3 } },
  ])("rejects $name in the options", ({ options }) => {
    expect(() => lint(options)).toThrow();
  });

  it.each([{ maxActions: 0 }, { maxLines: 1 }, {}])(
    "accepts the boundary options %j",
    (options) => {
      expect(lint(options)).toEqual([]);
    },
  );
});
