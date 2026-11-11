import { POSITIONAL_XPATH_FUNCTIONS, SELECTOR_PREFIXES } from "../defaults.js";
import { isSelectorWhitespace } from "./whitespace.js";

/** What an XPath selector uses (03-linter.md §11.3, E2E003). */
export interface XPathScan {
  /** Predicates that pick by position: `[2]`, `[last()]` or `[position()=1]`. */
  readonly positionalPredicates: number;
  /** Whether the path starts at the document root, such as `/html/body`. */
  readonly absolute: boolean;
  /** Attribute names it tests, such as `data-testid` in `[@data-testid='x']`. */
  readonly attributes: readonly string[];
}

/** Characters kept of the start of a predicate: enough for `position()`. */
const HEAD_LENGTH = Math.max(...POSITIONAL_XPATH_FUNCTIONS.map((name) => name.length));
/** Characters of an XPath attribute name, such as `data-testid` or `xml:lang`. */
const ATTRIBUTE_NAME = /[\w.:-]/u;
const DIGIT = /\d/u;

/** The predicate being read, between `[` and `]`. */
interface Predicate {
  /** Every non-blank character so far is a digit. */
  digitsOnly: boolean;
  /** At least one non-blank character was read. */
  filled: boolean;
  /** The first non-blank characters, up to {@link HEAD_LENGTH}. */
  head: string;
  /** A nested predicate makes this one more than a position. */
  nested: boolean;
}

/**
 * Whether Playwright reads a selector as XPath: it starts with `xpath=`, `/`,
 * `(` or `..` (03-linter.md §11.3.1).
 *
 * @param text - The selector, trimmed.
 * @returns `true` for an XPath selector.
 */
export function isXPath(text: string): boolean {
  return SELECTOR_PREFIXES.xpath.some((prefix) => text.startsWith(prefix));
}

function isPositional(predicate: Predicate): boolean {
  if (predicate.nested || !predicate.filled) {
    return false;
  }
  return (
    predicate.digitsOnly ||
    POSITIONAL_XPATH_FUNCTIONS.some((name) => predicate.head.startsWith(name))
  );
}

function isAbsolute(path: string): boolean {
  let start = 0;
  while (path[start] === "(") {
    start += 1;
  }
  return path[start] === "/" && path[start + 1] !== "/";
}

function readPredicateCharacter(predicate: Predicate | undefined, char: string): void {
  if (predicate === undefined || isSelectorWhitespace(char)) {
    return;
  }
  predicate.filled = true;
  predicate.digitsOnly &&= DIGIT.test(char);
  if (predicate.head.length < HEAD_LENGTH) {
    predicate.head += char;
  }
}

function readAttributeName(path: string, start: number): string {
  let end = start;
  while (end < path.length && ATTRIBUTE_NAME.test(path.charAt(end))) {
    end += 1;
  }
  return path.slice(start, end);
}

/** State of {@link scanXPath} while it reads a path. */
interface ScanState {
  readonly path: string;
  readonly open: Predicate[];
  readonly attributes: string[];
  positionalPredicates: number;
  quote: string | undefined;
  /** A Playwright chain such as `//a >> nth=1` was found. */
  chain: boolean;
}

function openPredicate(state: ScanState): void {
  const outer = state.open.at(-1);
  if (outer !== undefined) {
    outer.nested = true;
  }
  state.open.push({ digitsOnly: true, filled: false, head: "", nested: false });
}

function closePredicate(state: ScanState): void {
  const closed = state.open.pop();
  if (closed !== undefined && isPositional(closed)) {
    state.positionalPredicates += 1;
  }
}

/** Reads the character at `index` and returns how many characters it consumed. */
function scanCharacter(state: ScanState, index: number): number {
  const char = state.path.charAt(index);
  if (state.quote !== undefined) {
    state.quote = char === state.quote ? undefined : state.quote;
    return 1;
  }
  switch (char) {
    case "[":
      openPredicate(state);
      return 1;
    case "]":
      closePredicate(state);
      return 1;
    case "@": {
      const name = readAttributeName(state.path, index + 1);
      // `@*` and a lone `@` test no attribute by name.
      if (name !== "") {
        state.attributes.push(name);
      }
      readPredicateCharacter(state.open.at(-1), char);
      return 1 + name.length;
    }
    default:
      scanText(state, index);
      return 1;
  }
}

/** Reads a character that is not a bracket or an attribute: a quote, `>>` or text. */
function scanText(state: ScanState, index: number): void {
  const char = state.path.charAt(index);
  if (char === "'" || char === '"') {
    state.quote = char;
  } else if (char === ">" && state.path.charAt(index + 1) === ">") {
    state.chain = true;
  }
  readPredicateCharacter(state.open.at(-1), char);
}

/**
 * The path of an XPath selector, without the `xpath=` prefix.
 *
 * @param text - An XPath selector, as {@link isXPath} accepts it.
 * @returns The path.
 */
export function xpathPath(text: string): string {
  const prefix = SELECTOR_PREFIXES.xpath[0];
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}

/**
 * Scans an XPath path once, character by character, so it runs in linear
 * time and never throws: brackets and quotes left open only end the scan.
 * Text between quotes is skipped, so `[@title='[2]']` is not positional.
 *
 * @param path - The path, without the `xpath=` prefix.
 * @returns What the path uses, or `undefined` for a Playwright chain with
 *   `>>` outside quotes, which is not plain XPath.
 */
export function scanXPath(path: string): XPathScan | undefined {
  const state: ScanState = {
    path,
    open: [],
    attributes: [],
    positionalPredicates: 0,
    quote: undefined,
    chain: false,
  };
  for (let index = 0; index < path.length;) {
    index += scanCharacter(state, index);
  }
  if (state.chain) {
    return undefined;
  }
  return {
    positionalPredicates: state.positionalPredicates,
    absolute: isAbsolute(path),
    attributes: state.attributes,
  };
}
