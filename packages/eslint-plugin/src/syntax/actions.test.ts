import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { actionOf } from "./actions.js";

function actionIn(code: string, call = code) {
  return actionOf(parseSource(code).call(call));
}

describe("actionOf", () => {
  describe("Playwright", () => {
    it.each([
      'page.click("#buy")',
      'page.getByRole("textbox").fill("Ada")',
      'page.goto("/cart")',
      'page.keyboard.press("Enter")',
      'page.getByLabel("Terms").check()',
      'page.locator("select").selectOption("blue")',
    ])("counts %s as an action", (code) => {
      expect(actionIn(code)?.framework).toBe("playwright");
    });

    it.each(['page!.click("#buy")', 'page?.click("#buy")', '(page as Page).click("#buy")'])(
      "sees through TypeScript wrappers and optional chaining in %s",
      (code) => {
        expect(actionIn(code)?.name).toBe("click");
      },
    );

    it("names the action by its method", () => {
      expect(actionIn('page.getByRole("button").click()')?.name).toBe("click");
    });

    it.each([
      ["a method outside the list of §11.3", 'page.hover("#menu")'],
      ["a locator query", 'page.getByRole("button")'],
      ["a plain function with an action name", "click()"],
      ["an assertion", "expect(page).toHaveURL(/cart/)"],
    ])("does not count %s", (_case, code) => {
      expect(actionIn(code)).toBeUndefined();
    });
  });

  describe("Cypress", () => {
    it("counts every command of a cy chain", () => {
      const parsed = parseSource('cy.get("[data-cy=buy]").click();');

      expect(parsed.calls.map((call) => actionOf(call)?.name)).toEqual(["click", "get"]);
      expect(actionOf(parsed.call('cy.get("[data-cy=buy]")'))?.framework).toBe("cypress");
    });

    it("keeps the cy root across a non-null assertion", () => {
      expect(actionIn('cy.get("a")!.click()')?.framework).toBe("cypress");
    });

    it("counts a command outside the Playwright list", () => {
      expect(actionIn('cy.visit("/")')?.name).toBe("visit");
    });

    it.each(["should", "and"])("does not count the assertion .%s()", (assertion) => {
      const code = `cy.get("a").${assertion}("be.visible")`;

      expect(actionIn(code)).toBeUndefined();
    });

    it("does not count a call of cy itself", () => {
      expect(actionIn("cy()")).toBeUndefined();
    });
  });
});
