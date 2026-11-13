import { ruleDocsUrl } from "@atium/core/pure";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { noPositionalXPath, RULE_POSITIONAL_XPATH } from "./no-positional-xpath.js";

type XPathMessageId = "positionalPredicate" | "absolutePath";

/**
 * An invalid case: one statement on line 1 whose last string literal is the
 * selector, and one error on that literal, quotes included. No autofix and no
 * suggestion (03-linter.md §11.2: there is no safe replacement).
 */
function xpathCase(code: string, messageId: XPathMessageId) {
  const end = code.lastIndexOf('"');
  return {
    code,
    output: null,
    errors: [
      {
        messageId,
        line: 1,
        column: code.lastIndexOf('"', end - 1) + 1,
        endLine: 1,
        endColumn: end + 2,
        suggestions: [],
      },
    ],
  };
}

describe("AC-1: no-positional-xpath", () => {
  it("AC-1: meta.docs carries the E2E003 catalog entry (passes with the stub; the red comes from the invalid cases)", () => {
    const { meta } = noPositionalXPath;

    expect(RULE_POSITIONAL_XPATH).toBe("E2E003");
    expect(meta.docs).toMatchObject({
      code: "E2E003",
      severity: "warning",
      category: "selectors",
      confidence: "high",
      source: "rule",
      recommended: true,
    });
    expect(meta.docs?.url).toBe(ruleDocsUrl("E2E003"));
    expect(meta.fixable).toBeUndefined();
    expect(meta.hasSuggestions).toBeUndefined();
  });

  createRuleTester().run("no-positional-xpath", noPositionalXPath, {
    valid: [
      // By attribute: the "does not detect" case of §11.3.
      "page.locator(\"//button[@data-testid='x']\");",
      // `[2]` inside a string literal of the XPath is not a predicate.
      "page.locator(\"//a[@title='[2]']\");",
      'page.locator("//div");',
      // CSS: E2E002, not this rule.
      'page.locator("li:nth-child(2)");',
      // A chained Playwright selector is neither CSS nor XPath.
      'page.locator("//a >> nth=1");',
      // Not a literal: the selector is unknown.
      "page.locator(sel);",
      // `cy.get` reads CSS, not XPath.
      'cy.get("//tr[2]");',
      "cy.xpath(\"//button[@id='ok']\");",
      "cy.xpath(sel);",
      'page.getByRole("row");',
    ],
    invalid: [
      // Playwright
      xpathCase('page.locator("//tr[2]");', "positionalPredicate"),
      xpathCase('page.locator("xpath=//li[last()]");', "positionalPredicate"),
      xpathCase('page.locator("(//li)[1]");', "positionalPredicate"),
      xpathCase('page.locator("//li[position()=1]");', "positionalPredicate"),
      xpathCase('page.locator("/html/body/div");', "absolutePath"),
      xpathCase('page.$("//tr[2]");', "positionalPredicate"),
      xpathCase('frame.locator("//tr[2]");', "positionalPredicate"),
      // Cypress (cypress-xpath): the argument is always XPath.
      xpathCase('cy.xpath("//tr[2]");', "positionalPredicate"),
      xpathCase('cy.xpath("tr[2]");', "positionalPredicate"),
      xpathCase('cy.xpath(".//li[2]");', "positionalPredicate"),
      xpathCase('cy.get("table").xpath("./tr[2]");', "positionalPredicate"),
      xpathCase('cy.xpath("/html/body");', "absolutePath"),
      // Two reasons, one finding: the positional predicate comes first.
      xpathCase('page.locator("/html/body/div[2]");', "positionalPredicate"),
    ],
  });
});
