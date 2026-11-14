import {
  actionOf,
  assertionOf,
  baseQuery,
  calleePath,
  classifyBlock,
  classifyLocator,
  createNameMatcher,
  detectFramework,
  isGetByMethod,
  locatorOf,
  normalizeSelector,
  selectorText,
  testContextOf,
  titlePathOf,
} from "@atium/eslint-plugin/syntax";
import type { Framework, LocatorQuery, NameMatcher, TestBlock } from "@atium/eslint-plugin/syntax";
import type { TSESTree } from "@typescript-eslint/types";
import { callsOf } from "./calls.js";
import { FILE_INDEX_SCHEMA_VERSION } from "./file-index.js";
import type { FileIndex, IndexedLocator, IndexedTest } from "./file-index.js";

/** The `settings.atium` of the file that change its index (03-linter.md §11.1). */
export interface ExtractFileIndexOptions {
  /** `settings.atium.framework`; when absent, it is detected from the imports. */
  readonly framework?: Framework | undefined;
  /** `settings.atium.assertFunctionNames`: helpers that count as an assertion. */
  readonly assertFunctionNames: readonly string[];
  /** `settings.atium.i18n`: whether selectors by visible text drop a level. */
  readonly i18n: boolean;
}

type Position = IndexedLocator["location"];
type Mutable<T> = {
  -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K];
};

/** What the extraction reads from each call. */
interface Reader {
  readonly source: string;
  readonly i18n: boolean;
  readonly isAssertFunction: NameMatcher;
}

function positionOf(position: TSESTree.Position): Position {
  // ESTree columns start at 0; findings count from 1.
  return { line: position.line, column: position.column + 1 };
}

function levelOf(query: LocatorQuery, reader: Reader): IndexedTest["actions"][number]["level"] {
  return classifyLocator(query, { i18n: reader.i18n }) ?? null;
}

/** The nearest locator query in the chain of a call, the call itself included. */
function nearestQuery(call: TSESTree.CallExpression): LocatorQuery | undefined {
  const own = locatorOf(call);
  return own?.kind === "query" ? own : baseQuery(call);
}

function newTest(block: TestBlock): Mutable<IndexedTest> {
  const { titles, fullTitle, isStatic } = titlePathOf(block);
  const { start, end } = block.node.loc;
  return {
    titlePath: [...titles],
    fullTitle,
    isStatic,
    range: { start: positionOf(start), end: positionOf(end) },
    actions: [],
    assertions: [],
    calls: [],
  };
}

/**
 * The selector of a query, normalized for E2E007. The argument of a `getBy*`
 * is a role, a text or a test id, not a selector, so it stays as written.
 */
function selectorOf(query: LocatorQuery): string | null {
  const text = selectorText(query);
  if (text === undefined) {
    return null;
  }
  return query.framework === "playwright" && isGetByMethod(query.method)
    ? text
    : normalizeSelector(text);
}

function locatorEntry(query: LocatorQuery, reader: Reader): IndexedLocator {
  const { node } = query;
  return {
    method: query.method,
    framework: query.framework,
    selector: selectorOf(query),
    level: levelOf(query, reader),
    location: positionOf(node.loc.start),
    code: reader.source.slice(node.range[0], node.range[1]),
    testTitlePath: testContextOf(node)?.titles ?? null,
  };
}

/** Adds what a call inside a test tells about it. */
function addToTest(
  test: Mutable<IndexedTest>,
  call: TSESTree.CallExpression,
  reader: Reader,
): void {
  const action = actionOf(call);
  if (action !== undefined) {
    const query = nearestQuery(call);
    test.actions.push({
      name: action.name,
      level: query === undefined ? null : levelOf(query, reader),
    });
  }
  const assertion = assertionOf(call, reader.isAssertFunction);
  if (assertion !== undefined) {
    test.assertions.push({
      kind: assertion.kind,
      name: assertion.name,
      location: positionOf(call.loc.start),
    });
  }
  const name = calleePath(call);
  const known = action ?? assertion ?? locatorOf(call) ?? classifyBlock(call);
  if (known === undefined && name !== undefined && !test.calls.includes(name)) {
    test.calls.push(name);
  }
}

/**
 * Extracts the index of one file (03-linter.md §11.4). Pure: it reads the AST
 * without changing it, never throws and gives the same index for the same
 * source and options.
 *
 * @param program - The AST of the file, from the parser of typescript-eslint,
 * with the `parent` of every node set, as ESLint leaves it.
 * @param source - The source text the AST was parsed from.
 * @param options - The settings of the file.
 * @returns The index of the file.
 */
export function extractFileIndex(
  program: TSESTree.Program,
  source: string,
  options: ExtractFileIndexOptions,
): FileIndex {
  const reader: Reader = {
    source,
    i18n: options.i18n,
    isAssertFunction: createNameMatcher(options.assertFunctionNames),
  };
  const tests = new Map<TSESTree.CallExpression, Mutable<IndexedTest>>();
  const locators: IndexedLocator[] = [];
  for (const call of callsOf(program)) {
    const block = classifyBlock(call);
    if (block?.kind === "test") {
      tests.set(call, newTest(block));
    }
    const locator = locatorOf(call);
    if (locator?.kind === "query") {
      locators.push(locatorEntry(locator, reader));
    }
    const context = testContextOf(call);
    const test = context === undefined ? undefined : tests.get(context.test.node);
    if (test !== undefined) {
      addToTest(test, call, reader);
    }
  }
  return {
    schemaVersion: FILE_INDEX_SCHEMA_VERSION,
    framework: detectFramework(program, options.framework) ?? null,
    tests: [...tests.values()],
    locators,
  };
}
