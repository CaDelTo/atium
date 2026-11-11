import { ruleDocsUrl } from "@atium/core/pure";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { noFocusedTest, RULE_FOCUSED_TEST } from "./no-focused-test.js";

/** The kind of block and the position of the `only` property, 1-based as ESLint reports it. */
interface OnlyAt {
  readonly kind: "test" | "describe";
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

/**
 * An invalid case: one `focused` error on the `only` property, no autofix, and
 * one `removeOnly` suggestion whose output is the code without `.only`.
 */
function focusedCase(code: string, { kind, ...at }: OnlyAt, withoutOnly: string) {
  return {
    code,
    output: null,
    errors: [
      {
        messageId: "focused" as const,
        data: { kind },
        ...at,
        suggestions: [{ messageId: "removeOnly" as const, output: withoutOnly }],
      },
    ],
  };
}

describe("AC-1: no-focused-test", () => {
  it("AC-1: meta.docs carries the E2E010 catalog entry (passes with the stub; the red comes from the invalid cases)", () => {
    const { meta } = noFocusedTest;

    expect(RULE_FOCUSED_TEST).toBe("E2E010");
    expect(meta.docs).toMatchObject({
      code: "E2E010",
      severity: "error",
      category: "reliability",
      confidence: "high",
      source: "rule",
      recommended: true,
    });
    expect(meta.docs?.url).toBe(ruleDocsUrl("E2E010"));
    expect(meta.hasSuggestions).toBe(true);
    expect(meta.fixable).toBeUndefined();
  });

  createRuleTester().run("no-focused-test", noFocusedTest, {
    valid: [
      'test("t", () => {});',
      'test.skip("t", () => {});',
      'test.fixme("t", () => {});',
      'test.fail("t", () => {});',
      'test.describe.fixme("d", () => {});',
      'test.describe.serial("d", () => {});',
      'test.describe.parallel("d", () => {});',
      'it.skip("t", () => {});',
      'describe.skip("d", () => {});',
      'context.skip("c", () => {});',
      'test.step("s", async () => {});',
      // Not a declaration: the callee does not start with a test, it or describe name.
      'obj.only("t", () => {});',
      "const only = 1;",
      // A reference, not a call.
      "const focus = test.only;",
      // Documented false negative: the callback is not a function literal (03-linter.md §11.3.1).
      'describe.only("d", sharedSuite);',
    ],
    invalid: [
      // Playwright
      focusedCase(
        'test.only("t", () => {});',
        { kind: "test", line: 1, column: 6, endLine: 1, endColumn: 10 },
        'test("t", () => {});',
      ),
      focusedCase(
        'test.describe.only("d", () => {});',
        { kind: "describe", line: 1, column: 15, endLine: 1, endColumn: 19 },
        'test.describe("d", () => {});',
      ),
      focusedCase(
        'test.describe.serial.only("d", () => {});',
        { kind: "describe", line: 1, column: 22, endLine: 1, endColumn: 26 },
        'test.describe.serial("d", () => {});',
      ),
      focusedCase(
        'test.describe.parallel.only("d", () => {});',
        { kind: "describe", line: 1, column: 24, endLine: 1, endColumn: 28 },
        'test.describe.parallel("d", () => {});',
      ),
      focusedCase(
        'test.describe("d", () => {\n  test.only("t", () => {});\n});',
        { kind: "test", line: 2, column: 8, endLine: 2, endColumn: 12 },
        'test.describe("d", () => {\n  test("t", () => {});\n});',
      ),
      // Computed, non-null and optional-chain forms (03-linter.md §11.3.1).
      focusedCase(
        'test["only"]("t", () => {});',
        { kind: "test", line: 1, column: 6, endLine: 1, endColumn: 12 },
        'test("t", () => {});',
      ),
      focusedCase(
        'test.only!("t", () => {});',
        { kind: "test", line: 1, column: 6, endLine: 1, endColumn: 10 },
        'test!("t", () => {});',
      ),
      focusedCase(
        'test?.only("t", () => {});',
        { kind: "test", line: 1, column: 7, endLine: 1, endColumn: 11 },
        'test("t", () => {});',
      ),
      // Mocha/Cypress
      focusedCase(
        'it.only("t", () => {});',
        { kind: "test", line: 1, column: 4, endLine: 1, endColumn: 8 },
        'it("t", () => {});',
      ),
      focusedCase(
        'describe.only("d", () => {});',
        { kind: "describe", line: 1, column: 10, endLine: 1, endColumn: 14 },
        'describe("d", () => {});',
      ),
      focusedCase(
        'context.only("d", () => {});',
        { kind: "describe", line: 1, column: 9, endLine: 1, endColumn: 13 },
        'context("d", () => {});',
      ),
    ],
  });
});
