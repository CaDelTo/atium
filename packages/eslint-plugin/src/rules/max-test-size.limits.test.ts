import type { TSESTree } from "@typescript-eslint/types";
import { simpleTraverse } from "@typescript-eslint/typescript-estree";
import { Linter } from "eslint";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { createRuleTester } from "../../test/rule-tester.js";
import {
  cypressTest,
  DESIGN_LIMITS,
  fillerLines,
  playwrightTest,
  times,
  tooLargeError,
} from "../../test/test-size.js";
import type { MeasuredTest, TestSizeLimits } from "../../test/test-size.js";
import { createPlugin } from "../plugin.js";
import { testContextOf } from "../syntax/context.js";
import { maxTestSize } from "./max-test-size.js";
import type { TestSizeOptions } from "./max-test-size.js";

const CLICK = 'await page.click("a");';
/** Two Cypress commands: `get` and `click`. */
const CY_CLICK = 'cy.get("a").click();';

/** An invalid case: one `tooLarge` error on the test titled "t", no autofix; default limits unless `options`. */
function tooLarge(code: string, test: Omit<MeasuredTest, "title">, options?: TestSizeOptions) {
  return {
    code,
    output: null,
    ...(options === undefined ? {} : { options: [options] satisfies [TestSizeOptions] }),
    errors: [tooLargeError(code, { title: "t", ...test }, options ?? DESIGN_LIMITS)],
  };
}

/** The test's title on its own line: the call spans 3 lines more than its callback. */
const titleAbove = (fillers: number) =>
  ["test(", '  "t",', "  async ({ page }) => {", ...fillerLines(fillers), "  },", ");"].join("\n");

const fewerActions: TestSizeOptions = { maxActions: 3, maxLines: 150 };
const fewerLines: TestSizeOptions = { maxActions: 25, maxLines: 10 };

/** Lints plain JavaScript with this rule at `options`, or its defaults when `options` is undefined. */
function lint(code: string, options?: unknown) {
  const linter = new Linter({ configType: "flat", cwd: process.cwd() });
  return linter.verify(
    code,
    [
      {
        files: ["**/*.js"],
        languageOptions: { ecmaVersion: "latest", sourceType: "module" },
        plugins: { atium: createPlugin({ "max-test-size": maxTestSize }) },
        rules: { "atium/max-test-size": options === undefined ? "warn" : ["warn", options] },
      },
    ],
    "a.js",
  );
}

/** The innermost node whose range contains `offset`. */
function nodeAt(program: TSESTree.Program, offset: number): TSESTree.Node {
  let found: TSESTree.Node = program;
  simpleTraverse(program, {
    enter: (node) => {
      const [start, end] = node.range;
      if (start <= offset && offset < end && end - start <= found.range[1] - found.range[0]) {
        found = node;
      }
    },
  });
  return found;
}

/** The 0-based offset of a 1-based line and column. */
function offsetOf(code: string, line: number, column: number): number {
  const lines = code.split("\n").slice(0, line - 1);
  return lines.reduce((sum, text) => sum + text.length + 1, 0) + column - 1;
}

describe("AC-2: max-test-size at its limits", () => {
  createRuleTester().run("max-test-size", maxTestSize, {
    valid: [
      // 25 actions are not reported (§11.3.1, E2E005).
      playwrightTest(times(25, CLICK)),
      cypressTest([...times(12, CY_CLICK), 'cy.visit("/");']),
      // 150 lines, blank lines and comments included, are not reported.
      playwrightTest(fillerLines(148)),
      // At both limits at once.
      playwrightTest([...times(25, CLICK), ...fillerLines(123)]),
      // Only the callback's lines count, not the call's: 150 of 153.
      titleAbove(148),
      // The options move the limits.
      { code: playwrightTest(times(3, CLICK)), options: [fewerActions] },
      { code: playwrightTest(fillerLines(8)), options: [fewerLines] },
    ],
    invalid: [
      // 26 actions are reported, in Playwright and in Cypress.
      tooLarge(playwrightTest(times(26, CLICK)), { actions: 26, lines: 28 }),
      tooLarge(cypressTest(times(13, CY_CLICK)), { actions: 26, lines: 15 }),
      // 151 lines are reported: `test(... {` on line 1 and `});` on line 151.
      tooLarge(playwrightTest(fillerLines(149)), { actions: 0, lines: 151 }),
      tooLarge(`it("t", function () {\n${fillerLines(149).join("\n")}\n});`, {
        actions: 0,
        lines: 151,
      }),
      // A test over both limits gets a single error.
      tooLarge(playwrightTest([...times(26, CLICK), ...fillerLines(123)]), {
        actions: 26,
        lines: 151,
      }),
      // The callback starts on line 3, after its title.
      {
        code: titleAbove(149),
        output: null,
        errors: [
          {
            messageId: "tooLarge",
            data: { actions: "0", lines: "151", maxActions: "25", maxLines: "150" },
            line: 3,
            column: 3,
            endLine: 3,
            endColumn: 23,
            suggestions: [],
          },
        ],
      },
      // The options move the limits, and the message carries them.
      tooLarge(playwrightTest(times(4, CLICK)), { actions: 4, lines: 6 }, fewerActions),
      tooLarge(playwrightTest(fillerLines(9)), { actions: 0, lines: 11 }, fewerLines),
    ],
  });

  it.each([
    { options: { maxActions: 3 }, data: { maxActions: "3", maxLines: "150" } },
    { options: { maxLines: 5 }, data: { maxActions: "25", maxLines: "5" } },
  ])("AC-2: an option left out keeps its default ($options)", ({ options, data }) => {
    const code = playwrightTest(times(4, CLICK));

    const messages = lint(code, options);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toContain(
      `over the limit of ${data.maxActions} actions or ${data.maxLines} lines`,
    );
  });

  it("AC-2: two large tests of one describe get different titlePaths for their fingerprints", () => {
    const body = times(26, CLICK).map((line) => `    ${line}`);
    const code = [
      'test.describe("d", () => {',
      '  test("t1", async ({ page }) => {',
      ...body,
      "  });",
      '  test("t2", async ({ page }) => {',
      ...body,
      "  });",
      "});",
    ].join("\n");
    const { program } = parseSource(code);

    const titles = lint(code).map(
      (message) =>
        testContextOf(nodeAt(program, offsetOf(code, message.line, message.column)))?.fullTitle,
    );

    expect(titles).toEqual(["d › t1", "d › t2"]);
  });

  it("AC-2: reports a test exactly when its actions exceed maxActions", () => {
    fc.assert(
      fc.property(fc.nat(40), fc.nat(40), (actions, maxActions) => {
        const limits: TestSizeLimits = { maxActions, maxLines: DESIGN_LIMITS.maxLines };

        const messages = lint(playwrightTest(times(actions, CLICK)), limits);

        expect(messages).toHaveLength(actions > maxActions ? 1 : 0);
      }),
    );
  });

  it("AC-2: reports a test exactly when its callback spans more than maxLines lines", () => {
    fc.assert(
      fc.property(fc.nat(60), fc.integer({ min: 1, max: 60 }), (fillers, maxLines) => {
        const limits: TestSizeLimits = { maxActions: DESIGN_LIMITS.maxActions, maxLines };

        const messages = lint(playwrightTest(fillerLines(fillers)), limits);

        expect(messages).toHaveLength(fillers + 2 > maxLines ? 1 : 0);
      }),
    );
  });
});
