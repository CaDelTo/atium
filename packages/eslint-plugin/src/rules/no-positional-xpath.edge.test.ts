import { describe } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { noPositionalXPath } from "./no-positional-xpath.js";
import { noFragileCssSelector } from "./no-fragile-css-selector.js";

type XPathMessageId = "positionalPredicate" | "absolutePath";

/** An invalid case: one error on the last string literal, `delimiter` included. */
function reported(code: string, messageId: XPathMessageId, delimiter = '"') {
  const end = code.lastIndexOf(delimiter);
  const start = code.lastIndexOf(delimiter, end - 1);
  return {
    code,
    output: null,
    errors: [
      { messageId, line: 1, column: start + 1, endLine: 1, endColumn: end + 2, suggestions: [] },
    ],
  };
}

describe("no-positional-xpath: edge cases", () => {
  createRuleTester().run("no-positional-xpath", noPositionalXPath, {
    valid: [
      // A template with `${}` is not a literal: unknown.
      "page.locator(`//tr[${n}]`);",
      // Longer than SELECTOR_MAX_LENGTH (2048): unknown, never reported.
      `page.locator("//tr[2]${"x".repeat(2048)}");`,
      // A chain with `>>` stays unknown in cy.xpath too.
      'cy.xpath("//a >> nth=1");',
      // The first locator of a chain is CSS; the XPath one has no position.
      'page.locator("a").locator("//tr");',
      // Not a position: a name that only ends in `last`, and a predicate with a string.
      "page.locator(\"//tr[@class='last']\");",
    ],
    invalid: [
      reported("page.locator(`//tr[2]`);", "positionalPredicate", "`"),
      reported('page.locator("xpath=/html/body");', "absolutePath"),
      reported('page.locator("(/html/body)[1]");', "positionalPredicate"),
      reported('page.locator("//tr[ 2 ]");', "positionalPredicate"),
      reported('page.locator("//tr[last()-1]");', "positionalPredicate"),
      reported('page.locator("a").locator("//tr[2]");', "positionalPredicate"),
      reported('cy.xpath("xpath=//tr[2]");', "positionalPredicate"),
    ],
  });

  // `locatorOf` now knows `cy.xpath`: E2E002 must still not read it as CSS.
  createRuleTester().run("no-fragile-css-selector", noFragileCssSelector, {
    valid: ['cy.xpath("li:nth-child(2)");', 'cy.get("table").xpath("li:nth-child(2)");'],
    invalid: [],
  });
});
