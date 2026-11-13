import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";
import { CYPRESS_XPATH_QUERY, LOCATOR_QUERIES } from "../defaults.js";
import { isOneOf } from "../syntax/ast.js";
import { locatorOf } from "../syntax/locators.js";
import type { LocatorQuery } from "../syntax/locators.js";
import { analyzeSelector, selectorText } from "../syntax/selectors.js";

type MessageId = "positionalPredicate" | "absolutePath";

/** Queries that can hold XPath: `locator()` and `$()` in Playwright, `cy.xpath()` in Cypress. */
function isXPathQuery(query: LocatorQuery): boolean {
  return query.framework === "cypress"
    ? query.method === CYPRESS_XPATH_QUERY
    : isOneOf(LOCATOR_QUERIES, query.method);
}

/**
 * Why a selector text is a positional XPath, in the order of 03-linter.md
 * §11.3: a positional predicate, then an absolute path (decided in #54).
 */
function reasonOf(text: string): MessageId | undefined {
  const analysis = analyzeSelector(text);
  if (analysis.kind !== "xpath") {
    return undefined;
  }
  if (analysis.positionalPredicates > 0) {
    return "positionalPredicate";
  }
  return analysis.absolute ? "absolutePath" : undefined;
}

/** Code of the rule that reports positional XPath (03-linter.md §11.3, E2E003). */
export const RULE_POSITIONAL_XPATH = "E2E003";

/**
 * `atium/no-positional-xpath` (E2E003): reports an XPath selector, in
 * Playwright's `locator()` or `$()` or in Cypress's `cy.xpath()`, that picks
 * elements by position (`[2]`, `[last()]`, `[position()=1]`) or starts at the
 * root of the document (`/html/...`). One finding per selector, for its first
 * reason in that order (03-linter.md §11.3).
 */
export const noPositionalXPath = createRule<[], MessageId, AtiumCatalogDocs>({
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
  create(context) {
    return {
      CallExpression(node) {
        const locator = locatorOf(node);
        if (locator?.kind !== "query" || !isXPathQuery(locator) || locator.selector === undefined) {
          return;
        }
        const text = selectorText(locator);
        const messageId = text === undefined ? undefined : reasonOf(text);
        if (messageId !== undefined) {
          context.report({ node: locator.selector, messageId });
        }
      },
    };
  },
});
