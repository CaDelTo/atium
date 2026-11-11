import { describe } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { noFocusedTest } from "./no-focused-test.js";

/**
 * A focused test whose suggestion must remove only the `.only` part: from the
 * token before `only` (`.`, `?.` or `[`) to the end of the member.
 */
function focusedTest(
  code: string,
  at: { line: number; column: number; endColumn: number },
  output: string,
) {
  return {
    code,
    output: null,
    errors: [
      {
        messageId: "focused" as const,
        data: { kind: "test" },
        line: at.line,
        column: at.column,
        endLine: at.line,
        endColumn: at.endColumn,
        suggestions: [{ messageId: "removeOnly" as const, output }],
      },
    ],
  };
}

describe("no-focused-test suggestion edge cases", () => {
  createRuleTester().run("no-focused-test", noFocusedTest, {
    valid: [],
    invalid: [
      // A parenthesized object keeps its closing parenthesis.
      focusedTest(
        '(test).only("t", () => {});',
        { line: 1, column: 8, endColumn: 12 },
        '(test)("t", () => {});',
      ),
      focusedTest(
        '(test)["only"]("t", () => {});',
        { line: 1, column: 8, endColumn: 14 },
        '(test)("t", () => {});',
      ),
      // A comment between the object and `.only` is kept.
      focusedTest(
        'test /* why */ .only("t", () => {});',
        { line: 1, column: 17, endColumn: 21 },
        'test /* why */ ("t", () => {});',
      ),
      focusedTest(
        'test // why\n  .only("t", () => {});',
        { line: 2, column: 4, endColumn: 8 },
        'test // why\n  ("t", () => {});',
      ),
    ],
  });
});
