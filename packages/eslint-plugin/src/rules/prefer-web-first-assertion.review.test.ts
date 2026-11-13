import { describe } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { preferWebFirstAssertion } from "./prefer-web-first-assertion.js";

const onlyFinding = (code: string) => ({
  code,
  output: null,
  errors: [{ messageId: "preferWebFirst" as const, data: { query: "count" }, suggestions: [] }],
});

// Found in /review of #56.
describe("prefer-web-first-assertion: review regressions", () => {
  createRuleTester().run("prefer-web-first-assertion", preferWebFirstAssertion, {
    valid: [],
    invalid: [
      // `toHaveCount` takes a number: a literal of another type gets only the finding (§11.3.1).
      onlyFinding('expect(await page.locator("a").count()).toBe("3");'),
      onlyFinding('expect(await page.locator("a").count()).toEqual({});'),
      onlyFinding('expect(await page.locator("a").count()).toBe([3]);'),
      onlyFinding('expect(await page.locator("a").count()).toBe(null);'),
      onlyFinding('expect(await page.locator("a").count()).toBe(`3`);'),
      // A number or an expression still gets the autofix.
      {
        code: 'expect(await page.locator("a").count()).toBe(-1);',
        output: 'await expect(page.locator("a")).toHaveCount(-1);',
        errors: [{ messageId: "preferWebFirst", data: { query: "count" } }],
      },
      // `await` before the left operand of `**` needs parentheses.
      {
        code: 'async function f() { return expect(await page.locator("a").count()).toBe(3) ** 2; }',
        output:
          'async function f() { return (await expect(page.locator("a")).toHaveCount(3)) ** 2; }',
        errors: [{ messageId: "preferWebFirst", data: { query: "count" } }],
      },
    ],
  });
});
