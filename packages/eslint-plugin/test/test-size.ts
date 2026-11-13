import type { TestCaseError } from "@typescript-eslint/rule-tester";

/** The limits of `atium/max-test-size`, as its options or its defaults. */
export interface TestSizeLimits {
  /** Most actions a test may have without a report. */
  readonly maxActions: number;
  /** Most lines a test's callback may span without a report. */
  readonly maxLines: number;
}

/**
 * The defaults of E2E005, written from 03-linter.md §11.3 ("25 acciones o 150
 * líneas") rather than imported, so the tests check `TEST_SIZE_DEFAULTS` too.
 */
export const DESIGN_LIMITS: TestSizeLimits = { maxActions: 25, maxLines: 150 };

/** What the rule measures for one test, found in the code by its title. */
export interface MeasuredTest {
  /** The static title of the test, unique in the code. */
  readonly title: string;
  /** Actions the rule counts for the test. */
  readonly actions: number;
  /** Physical lines of its callback, from the first to the last. */
  readonly lines: number;
}

/** The 1-based line and column of an offset, as ESLint reports them. */
function positionOf(code: string, offset: number): { line: number; column: number } {
  const before = code.slice(0, offset).split("\n");
  return { line: before.length, column: (before.at(-1) ?? "").length + 1 };
}

/**
 * The expected `tooLarge` error of a test: on the header of its callback,
 * from the start of the callback to the `{` that opens its body (03-linter.md
 * §11.3.1, E2E005), with no suggestion.
 *
 * The callback follows `"<title>", ` and is an arrow function or a
 * `function () {`.
 */
export function tooLargeError(
  code: string,
  test: MeasuredTest,
  limits: TestSizeLimits,
): TestCaseError<"tooLarge"> {
  const marker = `"${test.title}", `;
  const titleAt = code.indexOf(marker);
  if (titleAt < 0) {
    throw new Error(`No test titled ${JSON.stringify(test.title)} in the code`);
  }
  const start = titleAt + marker.length;
  const rest = code.slice(start);
  const brace = rest.startsWith("function") ? rest.indexOf(") {") + 2 : rest.indexOf("=> {") + 3;
  const from = positionOf(code, start);
  const to = positionOf(code, start + brace);
  return {
    messageId: "tooLarge" as const,
    data: {
      actions: String(test.actions),
      lines: String(test.lines),
      maxActions: String(limits.maxActions),
      maxLines: String(limits.maxLines),
    },
    line: from.line,
    column: from.column,
    endLine: to.line,
    // ESLint's end column is exclusive: the report ends where the body starts.
    endColumn: to.column,
    suggestions: [],
  };
}

/** `count` copies of a statement, one per line. */
export const times = (count: number, statement: string): string[] =>
  Array.from({ length: count }, () => statement);

/**
 * A test file with one test whose body has the given lines: the callback
 * spans `body.length + 2` lines, from line 1 to the last.
 */
export function playwrightTest(body: readonly string[], title = "t"): string {
  return [`test("${title}", async ({ page }) => {`, ...body.map((l) => `  ${l}`), "});"].join("\n");
}

/** {@link playwrightTest} for Cypress, with Mocha's `it`. */
export function cypressTest(body: readonly string[], title = "t"): string {
  return [`it("${title}", () => {`, ...body.map((l) => `  ${l}`), "});"].join("\n");
}

/**
 * `count` lines that are not actions: blank lines and comments, which still
 * count as physical lines of the callback (03-linter.md §11.3.1, E2E005).
 */
export const fillerLines = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => (i % 2 === 0 ? "" : "// filler"));
