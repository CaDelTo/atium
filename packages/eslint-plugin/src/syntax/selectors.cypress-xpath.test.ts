import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import type { LocatorQuery } from "./locators.js";
import { locatorOf } from "./locators.js";
import { classifyLocator, normalizeSelector, selectorText } from "./selectors.js";

/** The locator query whose source is exactly `code`. */
function queryIn(code: string): LocatorQuery {
  const locator = locatorOf(parseSource(code).call(code));
  if (locator?.kind !== "query") {
    throw new Error(`No locator query in ${code}`);
  }
  return locator;
}

// D1 in the plan of #54: `cy.xpath()` of the cypress-xpath plugin (03-linter.md §11.3.1).
describe("cy.xpath", () => {
  it.each(['cy.xpath("//a")', 'cy.get("table").xpath("./tr[2]")'])(
    "recognizes %s as a Cypress query",
    (code) => {
      expect(locatorOf(parseSource(code).call(code))).toMatchObject({
        kind: "query",
        framework: "cypress",
        method: "xpath",
      });
    },
  );

  it("does not recognize xpath() outside a cy chain", () => {
    const code = 'foo.xpath("//a")';

    expect(locatorOf(parseSource(code).call(code))).toBeUndefined();
  });

  it("classifies a relative cy.xpath selector as XPath, level 1", () => {
    expect(classifyLocator(queryIn('cy.xpath("tr[2]")'), { i18n: false })).toBe(1);
  });

  it("reads the argument of cy.xpath as XPath even when it does not start with a slash", () => {
    expect(selectorText(queryIn('cy.xpath("tr[2]")'))).toBe("xpath=tr[2]");
  });

  it("normalizes cy.xpath and page.locator with the same XPath to the same selector", () => {
    const cypress = selectorText(queryIn('cy.xpath("//a")'));
    const playwright = selectorText(queryIn('page.locator("//a")'));

    expect(cypress).toBeDefined();
    expect(normalizeSelector(cypress ?? "")).toBe(normalizeSelector(playwright ?? ""));
  });
});
