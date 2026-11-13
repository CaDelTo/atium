import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";

/** Code of the rule that reports positional XPath (03-linter.md §11.3, E2E003). */
export const RULE_POSITIONAL_XPATH = "E2E003";

/**
 * `atium/no-positional-xpath` (E2E003): reports an XPath selector, in
 * Playwright's `locator()` or `$()` or in Cypress's `cy.xpath()`, that picks
 * elements by position (`[2]`, `[last()]`, `[position()=1]`) or starts at the
 * root of the document (`/html/...`). One finding per selector, for its first
 * reason in that order (03-linter.md §11.3).
 */
export const noPositionalXPath = createRule<
  [],
  "positionalPredicate" | "absolutePath",
  AtiumCatalogDocs
>({
  name: "no-positional-xpath",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow XPath selectors that pick elements by position",
      code: RULE_POSITIONAL_XPATH,
      severity: "warning",
      category: "selectors",
      confidence: "high",
      source: "rule",
      recommended: true,
    },
    schema: [],
    messages: {
      positionalPredicate:
        "This XPath picks an element by its position, which breaks when the page adds or reorders elements. Select it by an attribute, role, label, text or test id.",
      absolutePath:
        "This XPath starts at the root of the document, so any change to the page structure breaks it. Select the element by an attribute, role, label, text or test id.",
    },
  },
  defaultOptions: [],
  create: () => ({}),
});
