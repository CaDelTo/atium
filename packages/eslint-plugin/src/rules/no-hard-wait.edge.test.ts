import { describe } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { noHardWait } from "./no-hard-wait.js";

/** An invalid case with one `hardWait` error and the given suggestion (`null` for none). */
function hardWait(code: string, suggested: string | null) {
  return {
    code,
    output: null,
    errors: [
      {
        messageId: "hardWait" as const,
        suggestions:
          suggested === null ? [] : [{ messageId: "waitForCondition" as const, output: suggested }],
      },
    ],
  };
}

const inTest = (statement: string): string => `test("t", async () => {\n  ${statement}\n});`;

describe("no-hard-wait edge cases", () => {
  createRuleTester().run("no-hard-wait", noHardWait, {
    valid: [
      // A promise in a describe body is outside every test.
      'test.describe("d", () => {\n  await new Promise(r => setTimeout(r, 500));\n});',
      // Not a number literal.
      inTest("cy.wait(`500`);"),
    ],
    invalid: [
      hardWait(
        inTest("await page.waitForTimeout!(500);"),
        inTest('await expect(page.getByRole("TODO")).toBeVisible();'),
      ),
      hardWait(
        inTest("await page?.waitForTimeout(500);"),
        inTest('await expect(page.getByRole("TODO")).toBeVisible();'),
      ),
      hardWait(
        inTest("await this.page.waitForTimeout(500);"),
        inTest('await expect(this.page.getByRole("TODO")).toBeVisible();'),
      ),
      hardWait(
        inTest('cy.get("a").find("b").wait(500);'),
        inTest('cy.get("a").find("b").should("be.visible");'),
      ),
      hardWait(
        inTest("cy.wait(500).then(() => {});"),
        inTest('cy.get("TODO").should("be.visible").then(() => {});'),
      ),
      hardWait(
        inTest('cy.get("a")./* why */wait(500);'),
        inTest('cy.get("a").should("be.visible");'),
      ),
      hardWait(inTest("cy.wait(0);"), inTest('cy.get("TODO").should("be.visible");')),
      // A promise reported through `satisfies`, with no suggestion.
      hardWait(
        inTest("await (new Promise(r => setTimeout(r, 500)) satisfies Promise<void>);"),
        null,
      ),
      // The receiver is written without its wrappers, so the suggestion stays valid.
      hardWait(
        inTest("await (page as Page).waitForTimeout(500);"),
        inTest('await expect(page.getByRole("TODO")).toBeVisible();'),
      ),
      // A receiver that is not a name, `this` or a member chain gets no suggestion.
      hardWait(inTest("await (await getPage()).waitForTimeout(500);"), null),
      // A step inside a test counts as the test.
      hardWait(
        'test("t", async () => {\n  await test.step("s", async () => {\n    await new Promise(r => setTimeout(r, 500));\n  });\n});',
        null,
      ),
    ],
  });
});
