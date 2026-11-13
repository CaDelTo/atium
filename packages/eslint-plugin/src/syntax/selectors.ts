import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { Token } from "parsel-js";
import {
  CYPRESS_XPATH_QUERY,
  LOCATOR_METHOD_LEVELS,
  ROLE_LOCATOR,
  SELECTOR_LEVELS,
  SELECTOR_MAX_LENGTH,
  SELECTOR_PREFIXES,
  TEST_ID_ATTRIBUTES,
  VISIBLE_TEXT_LOCATORS,
} from "../defaults.js";
import { isOneOf, isStringLiteral, unwrap } from "./ast.js";
import { cssSegments, cssTokens, serializeCss } from "./css-selector.js";
import type { CssSegment } from "./css-selector.js";
import { isGetByMethod } from "./locators.js";
import type { LocatorQuery } from "./locators.js";
import { collapseWhitespace } from "./whitespace.js";
import { isXPath, scanXPath, xpathPath } from "./xpath-selector.js";
import type { XPathScan } from "./xpath-selector.js";

/**
 * Level of a locator in the selector hierarchy (06-selector-advisor.md §14.1),
 * from 5, the most robust, to 1, the most fragile.
 */
export type SelectorLevel = (typeof SELECTOR_LEVELS)[keyof typeof SELECTOR_LEVELS];

/**
 * What a CSS selector uses, for E2E002 and the classification
 * (03-linter.md §11.3): the lists of every item of a selector list together,
 * and in `combinators` the largest count of any item.
 */
export interface CssAnalysis extends CssSegment {
  /** Discriminant. */
  readonly kind: "css";
}

/** What an XPath selector uses, for E2E003 and the classification (03-linter.md §11.3). */
export interface XPathAnalysis extends XPathScan {
  /** Discriminant. */
  readonly kind: "xpath";
}

/**
 * A selector that is neither CSS that parses nor XPath, such as `text=Pay` or
 * `a >> b`, or one longer than `SELECTOR_MAX_LENGTH`.
 */
export interface UnknownSelector {
  /** Discriminant. */
  readonly kind: "unknown";
}

/** The result of {@link analyzeSelector}. */
export type SelectorAnalysis = CssAnalysis | XPathAnalysis | UnknownSelector;

/** Options of {@link classifyLocator}. */
export interface ClassifyOptions {
  /** `settings.atium.i18n`: a locator by visible text drops below the test id. */
  readonly i18n: boolean;
}

/**
 * The text of the selector of a query, when its first argument is a string
 * literal or a template without `${}`. The argument of Cypress's `cy.xpath()`
 * is always XPath, so its text gets the `xpath=` prefix: `cy.xpath("tr[2]")`
 * reads as `xpath=tr[2]` (03-linter.md §11.3.1).
 *
 * @param query - A locator query.
 * @returns The text, or `undefined` when the argument is missing, a spread or
 *   not a literal.
 */
export function selectorText(query: LocatorQuery): string | undefined {
  const text = literalText(query);
  const isXPathCommand = query.framework === "cypress" && query.method === CYPRESS_XPATH_QUERY;
  return text !== undefined && isXPathCommand ? `${SELECTOR_PREFIXES.xpath[0]}${text}` : text;
}

function literalText(query: LocatorQuery): string | undefined {
  const { selector } = query;
  if (selector === undefined || selector.type === AST_NODE_TYPES.SpreadElement) {
    return undefined;
  }
  const node = unwrap(selector);
  if (isStringLiteral(node)) {
    return node.value;
  }
  if (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
}

/** A selector read once: the engine that reads it and what it holds. */
type ReadSelector =
  | { readonly kind: "xpath"; readonly normalized: string; readonly scan: XPathScan }
  | {
      readonly kind: "css";
      readonly tokens: readonly Token[];
      readonly segments: readonly CssSegment[];
    }
  | { readonly kind: "unknown"; readonly text: string };

/**
 * Trims and collapses a selector, and reads it as XPath, CSS or unknown
 * (03-linter.md §11.3.1). A text longer than `SELECTOR_MAX_LENGTH` is
 * unknown, so no step costs more than linear time.
 */
function readSelector(text: string): ReadSelector {
  const selector = collapseWhitespace(text);
  if (selector.length > SELECTOR_MAX_LENGTH) {
    return { kind: "unknown", text: selector };
  }
  if (isXPath(selector)) {
    const path = collapseWhitespace(xpathPath(selector));
    const scan = scanXPath(path);
    if (scan === undefined) {
      return { kind: "unknown", text: selector };
    }
    // Without its prefix the path must still read as XPath, or a second pass
    // would read it otherwise: then the prefix stays, as in `xpath=A`.
    const canonical = isXPath(path) && xpathPath(path) === path;
    return { kind: "xpath", normalized: canonical ? path : selector, scan };
  }
  const tokens = cssTokens(selector);
  return tokens === undefined
    ? { kind: "unknown", text: selector }
    : { kind: "css", tokens, segments: cssSegments(tokens) };
}

/**
 * Analyzes a selector string as CSS or XPath (03-linter.md §11.3, E2E002 and
 * E2E003). A text is XPath when it starts with `xpath=`, `/`, `(` or `..`, as
 * Playwright reads it; otherwise it is CSS, with an optional `css=` prefix.
 *
 * It never throws: a selector that does not parse, another Playwright engine
 * such as `text=` or `role=`, a chain with `>>`, a Cypress alias such as
 * `@user` or a text longer than `SELECTOR_MAX_LENGTH` is `unknown`. It runs in
 * time linear in the length of the text.
 *
 * @param text - The selector.
 * @returns What the selector uses.
 */
export function analyzeSelector(text: string): SelectorAnalysis {
  const read = readSelector(text);
  switch (read.kind) {
    case "xpath":
      return { kind: "xpath", ...read.scan };
    case "css":
      return mergeSegments(read.segments);
    case "unknown":
      return { kind: "unknown" };
  }
}

function mergeSegments(segments: readonly CssSegment[]): CssAnalysis {
  return {
    kind: "css",
    positionalPseudoClasses: segments.flatMap((segment) => segment.positionalPseudoClasses),
    combinators: segments.reduce((most, segment) => Math.max(most, segment.combinators), 0),
    ids: segments.flatMap((segment) => segment.ids),
    numericIds: segments.flatMap((segment) => segment.numericIds),
    classes: segments.flatMap((segment) => segment.classes),
    generatedClasses: segments.flatMap((segment) => segment.generatedClasses),
    types: segments.flatMap((segment) => segment.types),
    attributes: segments.flatMap((segment) => segment.attributes),
  };
}

/**
 * The level of a CSS or XPath selector (06-selector-advisor.md §14.1): 1 with
 * any fragile pattern, otherwise 3 with a test id attribute, 2 with any other
 * id or attribute, and 1 with neither.
 */
function selectorLevelOf(
  fragile: boolean,
  attributes: readonly string[],
  hasId: boolean,
): SelectorLevel {
  if (fragile) {
    return SELECTOR_LEVELS.structural;
  }
  if (attributes.some((name) => isOneOf(TEST_ID_ATTRIBUTES, name.toLowerCase()))) {
    return SELECTOR_LEVELS.testId;
  }
  return hasId || attributes.length > 0
    ? SELECTOR_LEVELS.stableAttribute
    : SELECTOR_LEVELS.structural;
}

function cssSegmentLevel(segment: CssSegment): SelectorLevel {
  const fragile =
    segment.positionalPseudoClasses.length > 0 ||
    segment.generatedClasses.length > 0 ||
    segment.numericIds.length > 0;
  return selectorLevelOf(fragile, segment.attributes, segment.ids.length > 0);
}

function selectorLevel(text: string): SelectorLevel | undefined {
  const read = readSelector(text);
  switch (read.kind) {
    case "xpath": {
      const { scan } = read;
      return selectorLevelOf(
        scan.positionalPredicates > 0 || scan.absolute,
        scan.attributes,
        false,
      );
    }
    case "css":
      return read.segments
        .map(cssSegmentLevel)
        .reduce<SelectorLevel>(
          (lowest, level) => (level < lowest ? level : lowest),
          SELECTOR_LEVELS.roleWithName,
        );
    case "unknown":
      return undefined;
  }
}

function isListedMethod(method: string): method is keyof typeof LOCATOR_METHOD_LEVELS {
  return Object.hasOwn(LOCATOR_METHOD_LEVELS, method);
}

function methodLevel(query: LocatorQuery, options: ClassifyOptions): SelectorLevel | undefined {
  const { method } = query;
  if (!isListedMethod(method)) {
    return undefined;
  }
  if (method === ROLE_LOCATOR.method && query.hasName) {
    return SELECTOR_LEVELS.roleWithName;
  }
  if (options.i18n && isOneOf(VISIBLE_TEXT_LOCATORS, method)) {
    return SELECTOR_LEVELS.visibleTextWithI18n;
  }
  return LOCATOR_METHOD_LEVELS[method];
}

/**
 * Classifies a locator query in the hierarchy of 06-selector-advisor.md §14.1.
 *
 * A `getBy*` is classified by its method, whatever its argument: a
 * `getByRole` with `name` is 5 and `getByTestId` is 3. `locator`, `$` and
 * `cy.get` are classified by their selector (03-linter.md §11.3.1): 1 with
 * any pattern of E2E002 or E2E003; otherwise 3 with a test id attribute, 2
 * with any other id or attribute, and 1 with only types and classes. In a
 * list, the item with the lowest level wins.
 *
 * @param query - A locator query.
 * @param options - Whether visible text is penalized (`i18n`).
 * @returns The level, or `undefined` when the selector is not a literal, is
 *   `unknown`, or the method is a `getBy*` that the hierarchy does not list.
 */
export function classifyLocator(
  query: LocatorQuery,
  options: ClassifyOptions,
): SelectorLevel | undefined {
  if (query.framework === "playwright" && isGetByMethod(query.method)) {
    return methodLevel(query, options);
  }
  const text = selectorText(query);
  return text === undefined ? undefined : selectorLevel(text);
}

/**
 * Normalizes a selector so that E2E007 finds the same selector across files
 * (03-linter.md §11.3.1 and §11.4).
 *
 * CSS is serialized again from its tokens, without the `css=` prefix:
 * whitespace collapsed, one space around combinators and after commas,
 * attribute values in double quotes, and type and attribute names in
 * lowercase. Classes, ids and values keep their case, and nothing is
 * reordered. XPath loses its `xpath=` prefix when the rest still reads as
 * XPath (`xpath=A` keeps it). XPath and unknown selectors are
 * trimmed, with runs of whitespace outside quotes collapsed to one space.
 *
 * It never throws, it is idempotent and it runs in time linear in the length
 * of the text.
 *
 * @param text - The selector.
 * @returns The normalized selector.
 */
export function normalizeSelector(text: string): string {
  const read = readSelector(text);
  switch (read.kind) {
    case "xpath":
      return read.normalized;
    case "css":
      return serializeCss(read.tokens);
    case "unknown":
      return read.text;
  }
}
