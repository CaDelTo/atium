import { ruleDocsUrl } from "@atium/core/pure";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { DESIGN_LIMITS, times, tooLargeError } from "../../test/test-size.js";
import type { MeasuredTest } from "../../test/test-size.js";
import { TEST_SIZE_DEFAULTS } from "../defaults.js";
import { maxTestSize, RULE_TEST_SIZE } from "./max-test-size.js";
import type { TestSizeOptions } from "./max-test-size.js";

/**
 * Every counted action is over the limit, so a test reports exactly how many
 * actions it has, and a test with none is not reported (`maxActions` is an
 * integer ≥ 0, 03-linter.md §11.3.1, E2E005).
 */
const COUNT_ALL: TestSizeOptions = { maxActions: 0, maxLines: DESIGN_LIMITS.maxLines };

/** A one-line Playwright test with the given body. */
const pw = (body: string, title = "t") => `test("${title}", async ({ page }) => { ${body} });`;
/** A one-line Cypress test with the given body. */
const cy = (body: string, title = "t") => `it("${title}", () => { ${body} });`;

/** A test measured with `actions` actions; one line unless given. */
const measured = (actions: number, title = "t", lines = 1): MeasuredTest => ({
  title,
  actions,
  lines,
});

/** An invalid case under {@link COUNT_ALL}: one `tooLarge` error per test, in source order, no autofix. */
function counted(code: string, ...tests: readonly MeasuredTest[]) {
  return {
    code,
    options: [COUNT_ALL] satisfies [TestSizeOptions],
    output: null,
    errors: tests.map((test) => tooLargeError(code, test, COUNT_ALL)),
  };
}

/** A valid case under {@link COUNT_ALL}: nothing in it counts as an action of a test. */
const noActions = (code: string) => ({ code, options: [COUNT_ALL] satisfies [TestSizeOptions] });

/** Playwright's actions, from 03-linter.md §11.3 (E2E005) and §11.3.1. */
const PLAYWRIGHT_ACTION_NAMES = ["click", "fill", "goto", "press", "check", "selectOption"];

/** A nested test: the inner keeps its two actions, the outer has one and spans the inner's lines. */
const NESTED = [
  'test("outer", async ({ page }) => {',
  '  await page.click("a");',
  '  test("inner", async ({ page }) => {',
  '    await page.click("b");',
  '    await page.click("c");',
  "  });",
  "});",
].join("\n");

describe("AC-1: max-test-size", () => {
  it("AC-1: meta.docs carries the E2E005 catalog entry, with no autofix or suggestion (passes with the stub; the red comes from the RuleTester cases)", () => {
    const { meta } = maxTestSize;

    expect(RULE_TEST_SIZE).toBe("E2E005");
    expect(meta.docs).toMatchObject({
      code: "E2E005",
      severity: "info",
      category: "maintainability",
      confidence: "high",
      source: "rule",
      recommended: false,
    });
    expect(meta.docs?.url).toBe(ruleDocsUrl("E2E005"));
    expect(meta.fixable).toBeUndefined();
    expect(meta.hasSuggestions).toBeUndefined();
  });

  it("AC-2: TEST_SIZE_DEFAULTS holds the 25 actions and 150 lines of §11.3 (passes with the stub; the AC-2 cases without options check that the rule applies them)", () => {
    expect(TEST_SIZE_DEFAULTS).toEqual(DESIGN_LIMITS);
  });

  createRuleTester().run("max-test-size", maxTestSize, {
    valid: [
      // §11.3 "does not detect": actions in Playwright hooks.
      noActions(
        [
          'test.beforeAll(async ({ browser }) => { await browser.newPage().goto("/"); });',
          'test.beforeEach(async ({ page }) => { await page.goto("/"); await page.click("#login"); });',
          'test.afterEach(async ({ page }) => { await page.click("#logout"); });',
          'test.afterAll(async ({ page }) => { await page.goto("/bye"); });',
          pw('await expect(page).toHaveTitle("Home");'),
        ].join("\n"),
      ),
      // §11.3 "does not detect": actions in Mocha hooks, as Cypress uses them.
      noActions(
        [
          'before(() => { cy.visit("/"); });',
          'beforeEach(() => { cy.get("#login").click(); });',
          'afterEach(() => { cy.get("#logout").click(); });',
          'after(() => { cy.visit("/bye"); });',
          cy("expect(1).to.equal(1);"),
        ].join("\n"),
      ),
      // §11.3 "does not detect": helpers outside the test are not followed.
      noActions(
        [
          'async function login(page) { await page.fill("#user", "ada"); await page.click("#submit"); }',
          pw("await login(page);"),
        ].join("\n"),
      ),
      noActions(
        [
          'const visitHome = () => { cy.visit("/"); cy.get("nav").click(); };',
          cy("visitHome();"),
        ].join("\n"),
      ),
      // §11.3 "does not detect": actions outside every test.
      noActions('await page.goto("/");\nawait page.click("a");\ncy.visit("/");'),
      // Hooks inside a describe still have no test.
      noActions(
        'test.describe("d", () => { test.beforeEach(async ({ page }) => { await page.goto("/"); }); });',
      ),
      // Other methods are not actions.
      noActions(
        pw(
          'await page.hover("a"); await page.locator("a").waitFor(); await expect(page.locator("a")).toBeVisible(); await page.getByRole("button").dblclick();',
        ),
      ),
      // Annotations, not tests (§11.3.1, "Estructura"), even with an action in a callback.
      noActions('test.skip();\ntest.skip(isMobile, "reason");'),
      noActions('test.skip(({ page }) => { page.click("a"); return true; });'),
      // A hook far over the default limit is not a test.
      {
        code: `test.beforeEach(async ({ page }) => {\n${times(30, '  await page.click("a");').join("\n")}\n});`,
      },
    ],
    invalid: [
      // Each Playwright action counts once.
      ...PLAYWRIGHT_ACTION_NAMES.map((name) =>
        counted(pw(`await page.${name}("a");`), measured(1)),
      ),
      // On any object.
      counted(
        pw(
          'await page.getByRole("button").click(); await this.form.fill("x"); await frame.locator("a").press("Enter");',
        ),
        measured(3),
      ),
      // Other methods next to an action do not add to it.
      counted(
        pw(
          'await page.hover("a"); await page.click("a"); await expect(page.locator("a")).toBeVisible();',
        ),
        measured(1),
      ),
      // Actions inside test.step count for the test; the step itself is not reported.
      counted(
        pw(
          'await test.step("s", async () => { await page.click("a"); await page.fill("b", "x"); }); await page.goto("/");',
        ),
        measured(3),
      ),
      // A hook or a helper next to the test adds nothing to it.
      counted(
        `test.beforeEach(async ({ page }) => { await page.goto("/"); });\n${pw('await page.click("a");')}`,
        measured(1),
      ),
      counted(
        `async function login(page) { await page.fill("#u", "ada"); }\n${pw('await login(page); await page.click("a");')}`,
        measured(1),
      ),
      // Every test declaration with a title and a callback is measured.
      counted(`test.only("t", async ({ page }) => { await page.click("a"); });`, measured(1)),
      counted(`test.skip("t", async ({ page }) => { await page.click("a"); });`, measured(1)),
      counted(`it("t", async () => { await page.click("a"); });`, measured(1)),
      // Each test counts its own actions.
      counted(
        `test.describe("d", () => {\n  ${pw('await page.click("a");', "t1")}\n  ${pw('await page.click("a"); await page.fill("b", "x");', "t2")}\n});`,
        measured(1, "t1"),
        measured(2, "t2"),
      ),
      // A nested test keeps its actions; the outer one spans its lines (§11.3.1, E2E005, D4).
      counted(NESTED, measured(1, "outer", 7), measured(2, "inner", 4)),

      // Cypress: each command of a cy chain counts.
      counted(cy('cy.visit("/");'), measured(1)),
      counted(cy('cy.get("a").click();'), measured(2)),
      counted(cy('cy.get("#user").type("ada"); cy.get("form").submit();'), measured(4)),
      // .should() and .and() are assertions, not actions.
      counted(cy('cy.get("a").should("be.visible").and("have.text", "x");'), measured(1)),
      // $el.click() inside a .then() counts as a Playwright-list action; get and then are commands.
      counted(cy('cy.get("a").then(($el) => { $el.click(); });'), measured(3)),
      // A Mocha hook adds nothing to the test.
      counted(`beforeEach(() => { cy.visit("/"); });\n${cy('cy.get("a").click();')}`, measured(2)),
      // Tests inside describe and context, and it.only.
      counted(
        `describe("d", () => { context("c", () => { ${cy('cy.visit("/");')} }); });`,
        measured(1),
      ),
      counted(`it.only("t", () => { cy.visit("/"); });`, measured(1)),
    ],
  });
});
