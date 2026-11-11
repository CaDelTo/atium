import { ruleDocsUrl } from "@atium/core/pure";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { noHardWait, RULE_HARD_WAIT } from "./no-hard-wait.js";

/** The position of the wait node, 1-based as ESLint reports it. */
interface WaitAt {
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

/**
 * An invalid case: one `hardWait` error on the wait node, no autofix, and
 * either one `waitForCondition` suggestion with the given output or, when
 * `suggested` is `null`, no suggestion at all (D1 in the plan of #52).
 */
function hardWaitCase(code: string, at: WaitAt, suggested: string | null) {
  return {
    code,
    output: null,
    errors: [
      {
        messageId: "hardWait" as const,
        ...at,
        suggestions:
          suggested === null ? [] : [{ messageId: "waitForCondition" as const, output: suggested }],
      },
    ],
  };
}

/** Wraps a statement in a Playwright test body, on line 2. */
const inTest = (statement: string): string => `test("t", async () => {\n  ${statement}\n});`;

describe("AC-1: no-hard-wait", () => {
  it("AC-1: meta.docs carries the E2E001 catalog entry (passes with the stub; the red comes from the invalid cases)", () => {
    const { meta } = noHardWait;

    expect(RULE_HARD_WAIT).toBe("E2E001");
    expect(meta.docs).toMatchObject({
      code: "E2E001",
      severity: "warning",
      category: "reliability",
      confidence: "high",
      source: "rule",
      recommended: true,
    });
    expect(meta.docs?.url).toBe(ruleDocsUrl("E2E001"));
  });

  it("AC-2: offers suggestions and never an autofix (passes with the stub; the invalid cases assert output: null)", () => {
    const { meta } = noHardWait;

    expect(meta.fixable).toBeUndefined();
    expect(meta.hasSuggestions).toBe(true);
  });

  createRuleTester().run("no-hard-wait", noHardWait, {
    valid: [
      // Documented false negative: an alias wait is not a fixed wait (03-linter.md §11.3).
      'cy.wait("@alias");',
      // The duration is not a number literal (out of scope, §11.3.1).
      "cy.wait(delay);",
      // Waits for a condition.
      'await page.waitForSelector("a");',
      // Not the global setTimeout.
      inTest("await new Promise(r => window.setTimeout(r, 500));"),
      // The executor has a block body.
      inTest("await new Promise(r => { return setTimeout(r, 500); });"),
      // setTimeout does not receive the resolver itself.
      inTest("await new Promise(r => setTimeout(() => r(), 500));"),
      // Not awaited.
      inTest("new Promise(r => setTimeout(r, 500));"),
      // Documented false negative: a returned promise is awaited by the runner but not detected.
      inTest("return new Promise(r => setTimeout(r, 500));"),
      // Awaited promise outside a test: a hook (D2).
      "test.beforeEach(async () => {\n  await new Promise(r => setTimeout(r, 500));\n});",
      // Awaited promise outside a test: a module-level helper (D2).
      "async function sleep() {\n  await new Promise(r => setTimeout(r, 500));\n}",
    ],
    invalid: [
      // Playwright
      hardWaitCase(
        "await page.waitForTimeout(500);",
        { line: 1, column: 7, endLine: 1, endColumn: 31 },
        'await expect(page.getByRole("TODO")).toBeVisible();',
      ),
      hardWaitCase(
        "await frame.waitForTimeout(500);",
        { line: 1, column: 7, endLine: 1, endColumn: 32 },
        'await expect(frame.getByRole("TODO")).toBeVisible();',
      ),
      // The duration of waitForTimeout is not inspected.
      hardWaitCase(
        "await page.waitForTimeout(delay);",
        { line: 1, column: 7, endLine: 1, endColumn: 33 },
        'await expect(page.getByRole("TODO")).toBeVisible();',
      ),
      // waitForTimeout is reported outside tests too (D2).
      hardWaitCase(
        "test.beforeEach(async ({ page }) => {\n  await page.waitForTimeout(500);\n});",
        { line: 2, column: 9, endLine: 2, endColumn: 33 },
        'test.beforeEach(async ({ page }) => {\n  await expect(page.getByRole("TODO")).toBeVisible();\n});',
      ),
      // Cypress
      hardWaitCase(
        "cy.wait(500);",
        { line: 1, column: 1, endLine: 1, endColumn: 13 },
        'cy.get("TODO").should("be.visible");',
      ),
      // Chained: the subject is already chosen, only .wait(n) is replaced (D1).
      hardWaitCase(
        'cy.get("a").wait(500);',
        { line: 1, column: 1, endLine: 1, endColumn: 22 },
        'cy.get("a").should("be.visible");',
      ),
      // Awaited promise inside a test: no code suggestion, the receiver is unknown (D1).
      hardWaitCase(
        inTest("await new Promise(r => setTimeout(r, 500));"),
        { line: 2, column: 9, endLine: 2, endColumn: 45 },
        null,
      ),
      // TypeScript wrappers between the await and the promise (§11.3.1).
      hardWaitCase(
        inTest("await (new Promise(r => setTimeout(r, 500)) as Promise<void>);"),
        { line: 2, column: 10, endLine: 2, endColumn: 46 },
        null,
      ),
    ],
  });
});
