import { SELECTOR_PREFIXES } from "../defaults.js";

/** What an XPath selector uses (03-linter.md §11.3, E2E003). */
export interface XPathScan {
  /** Predicates that pick by position: `[2]`, `[last()]` or `[position()=1]`. */
  readonly positionalPredicates: number;
  /** Whether the path starts at the document root, such as `/html/body`. */
  readonly absolute: boolean;
  /** Attribute names it tests, such as `data-testid` in `[@data-testid='x']`. */
  readonly attributes: readonly string[];
}

/** Starts of a positional predicate other than a plain integer. */
const POSITIONAL_FUNCTIONS = ["last()", "position()"] as const;
/** Characters kept of the start of a predicate: enough for `position()`. */
const HEAD_LENGTH = Math.max(...POSITIONAL_FUNCTIONS.map((name) => name.length));
const ATTRIBUTE_NAME = /[\w.:-]/u;
const DIGIT = /\d/u;
const WHITESPACE = /\s/u;

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
 */
export function isXPath(text: string): boolean {
  return SELECTOR_PREFIXES.xpath.some((prefix) => text.startsWith(prefix));
}

function isPositional(predicate: Predicate): boolean {
  if (predicate.nested || !predicate.filled) {
    return false;
  }
  return (
    predicate.digitsOnly || POSITIONAL_FUNCTIONS.some((name) => predicate.head.startsWith(name))
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
  if (predicate === undefined || WHITESPACE.test(char)) {
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
      state.attributes.push(name);
      readPredicateCharacter(state.open.at(-1), char);
      return 1 + name.length;
    }
    default:
      if (char === "'" || char === '"') {
        state.quote = char;
      }
      readPredicateCharacter(state.open.at(-1), char);
      return 1;
  }
}

/**
 * Scans an XPath selector once, character by character, so it runs in linear
 * time and never throws: brackets and quotes left open only end the scan.
 * Text between quotes is skipped, so `[@title='[2]']` is not positional.
 *
 * @param text - The selector, with or without the `xpath=` prefix.
 */
export function scanXPath(text: string): XPathScan {
  const prefix = SELECTOR_PREFIXES.xpath[0];
  const path = text.startsWith(prefix) ? text.slice(prefix.length) : text;
  const state: ScanState = {
    path,
    open: [],
    attributes: [],
    positionalPredicates: 0,
    quote: undefined,
  };
  for (let index = 0; index < path.length;) {
    index += scanCharacter(state, index);
  }
  return {
    positionalPredicates: state.positionalPredicates,
    absolute: isAbsolute(path),
    attributes: state.attributes,
  };
}

/**
 * Trims a selector and collapses every run of whitespace outside quotes into
 * one space. Idempotent and linear.
 */
export function collapseWhitespace(text: string): string {
  let result = "";
  let quote: string | undefined;
  let pendingSpace = false;
  for (const char of text) {
    if (quote === undefined && isCssWhitespace(char)) {
      pendingSpace = result !== "";
      continue;
    }
    if (pendingSpace) {
      result += " ";
      pendingSpace = false;
    }
    result += char;
    if (quote !== undefined) {
      quote = char === quote ? undefined : quote;
    } else if (char === "'" || char === '"') {
      quote = char;
    }
  }
  return result;
}

/** Whitespace as CSS and XPath define it: space, tab, line feed, carriage return and form feed. */
function isCssWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f";
}
