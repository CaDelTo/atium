/** An empty, frozen list of globs or names. */
const NO_PATTERNS: readonly string[] = Object.freeze([]);

/**
 * Defaults of `settings.atium`, the options shared by several rules. A key
 * left out of the ESLint config takes its value from here.
 *
 * - `framework` has no default: it is detected from the imports of each file.
 * - `pageObjectDirs`: no file is Page Object code unless configured.
 * - `assertFunctionNames`: only the framework's own assertions count.
 * - `i18n`: selectors by visible text are not penalized.
 *
 * Source: 03-linter.md §11.1.
 */
export const SETTINGS_DEFAULTS = Object.freeze({
  pageObjectDirs: NO_PATTERNS,
  assertFunctionNames: NO_PATTERNS,
  i18n: false,
});

/** Frameworks the linter recognizes. Source: 03-linter.md §11.1. */
export const FRAMEWORKS = Object.freeze(["playwright", "cypress"] as const);

/**
 * Module specifiers whose import reveals the framework of a file. A specifier
 * matches exactly or as a subpath, such as `cypress/react` or
 * `@playwright/test/reporter`. It has one entry per framework of
 * {@link FRAMEWORKS}.
 *
 * Source: 03-linter.md §11.1 (autodetected by imports) and §11.3.1.
 */
export const FRAMEWORK_MODULES = Object.freeze({
  playwright: Object.freeze(["@playwright/test", "playwright/test"]),
  cypress: Object.freeze(["cypress"]),
} satisfies Record<(typeof FRAMEWORKS)[number], readonly string[]>);

/**
 * First name of every Playwright declaration, such as `test.describe`; the
 * other declarations follow Mocha, as Cypress does. Source: 03-linter.md §11.3.1.
 */
export const PLAYWRIGHT_ROOT = "test";

/**
 * Calls that declare a test, by the dotted name of the callee. Playwright's
 * `test` and its modifiers, then Mocha's `it` as Cypress uses it.
 *
 * Source: 03-linter.md §11.3.1.
 */
export const TEST_DECLARATIONS = Object.freeze([
  "test",
  "test.only",
  "test.skip",
  "test.fixme",
  "test.fail",
  "it",
  "it.only",
  "it.skip",
] as const);

/**
 * Calls that declare a describe block. Source: 03-linter.md §11.3.1.
 */
export const DESCRIBE_DECLARATIONS = Object.freeze([
  "test.describe",
  "test.describe.only",
  "test.describe.skip",
  "test.describe.fixme",
  "test.describe.serial",
  "test.describe.serial.only",
  "test.describe.parallel",
  "test.describe.parallel.only",
  "describe",
  "describe.only",
  "describe.skip",
  "context",
  "context.only",
  "context.skip",
] as const);

/**
 * Calls that declare a hook. Source: 03-linter.md §11.3.1.
 */
export const HOOK_DECLARATIONS = Object.freeze([
  "test.beforeEach",
  "test.afterEach",
  "test.beforeAll",
  "test.afterAll",
  "before",
  "after",
  "beforeEach",
  "afterEach",
] as const);

/**
 * Calls that declare a step inside a test. Source: 03-linter.md §11.3.1.
 */
export const STEP_DECLARATIONS = Object.freeze(["test.step", "test.step.skip"] as const);

/**
 * Parts of a declaration's name that modify how it runs, such as `only` in
 * `test.describe.only`. Source: 03-linter.md §11.3.1.
 */
export const BLOCK_MODIFIERS = Object.freeze([
  "only",
  "skip",
  "fixme",
  "fail",
  "serial",
  "parallel",
] as const);

/**
 * Playwright methods that count as an action; every command of a `cy` chain
 * counts too. Source: 03-linter.md §11.3, E2E005.
 */
export const PLAYWRIGHT_ACTIONS = Object.freeze([
  "click",
  "fill",
  "goto",
  "press",
  "check",
  "selectOption",
] as const);

/**
 * Global object whose call chains are Cypress commands, for actions, locators
 * and fixed waits. Source: 03-linter.md §11.3, E2E005, and §11.3.1.
 */
export const CYPRESS_ROOT = "cy";

/**
 * Calls that open an assertion, by the dotted name of the callee. Source:
 * 03-linter.md §11.3, E2E006, and §11.3.1.
 */
export const EXPECT_CALLS = Object.freeze(["expect", "expect.soft", "expect.poll"] as const);

/**
 * Calls whose value E2E009 reads: `expect.poll` already retries. Source:
 * 03-linter.md §11.3, E2E009, and §11.3.1 (decided in #56).
 */
export const WEB_FIRST_EXPECT_CALLS = Object.freeze([
  "expect",
  "expect.soft",
] as const satisfies readonly (typeof EXPECT_CALLS)[number][]);

/**
 * Methods that read the page once, whose awaited value E2E009 reports inside
 * `expect`. Source: 03-linter.md §11.3, E2E009, and §11.3.1.
 */
export const NON_WEB_FIRST_QUERIES = Object.freeze(["isVisible", "textContent", "count"] as const);

/**
 * A matcher of a row of {@link WEB_FIRST_REPLACEMENTS}: its name and, for
 * `toBe(true)` and the like, the boolean literal its only argument must be.
 */
export interface WebFirstMatcher {
  /** The matcher name, such as `toBe`. */
  readonly name: string;
  /** The boolean literal its only argument must be; `undefined` when the row keeps any argument or takes none. */
  readonly argument?: boolean;
}

/** A row of the E2E009 replacements. */
export interface WebFirstReplacement {
  /** The method awaited inside `expect`. */
  readonly query: (typeof NON_WEB_FIRST_QUERIES)[number];
  /** The matchers the row replaces. */
  readonly matchers: readonly WebFirstMatcher[];
  /** The web-first matcher that replaces them. */
  readonly replacement: string;
  /** Whether the replacement keeps the matcher's only argument, as `toHaveCount(n)`. */
  readonly keepsArgument: boolean;
  /** Whether the row is an autofix (on a recognized locator) rather than a suggestion. */
  readonly autofix: boolean;
  /** Whether a literal argument must be a number, as for `toHaveCount(n)`; another literal gets only the finding. */
  readonly numericArgument?: boolean;
}

/**
 * The replacements of E2E009, row by row. Source: 03-linter.md §11.3.1,
 * E2E009 (decided in #56).
 */
export const WEB_FIRST_REPLACEMENTS: readonly WebFirstReplacement[] = Object.freeze([
  {
    query: "isVisible",
    matchers: [
      { name: "toBe", argument: true },
      { name: "toEqual", argument: true },
      { name: "toBeTruthy" },
    ],
    replacement: "toBeVisible",
    keepsArgument: false,
    autofix: true,
  },
  {
    query: "isVisible",
    matchers: [
      { name: "toBe", argument: false },
      { name: "toEqual", argument: false },
      { name: "toBeFalsy" },
    ],
    replacement: "toBeHidden",
    keepsArgument: false,
    autofix: true,
  },
  {
    query: "count",
    matchers: [{ name: "toBe" }, { name: "toEqual" }],
    replacement: "toHaveCount",
    keepsArgument: true,
    autofix: true,
    numericArgument: true,
  },
  {
    query: "textContent",
    matchers: [{ name: "toBe" }, { name: "toEqual" }, { name: "toMatch" }],
    replacement: "toHaveText",
    keepsArgument: true,
    autofix: false,
  },
  {
    query: "textContent",
    matchers: [{ name: "toContain" }],
    replacement: "toContainText",
    keepsArgument: true,
    autofix: false,
  },
]);

/**
 * Chained methods that are an assertion, and so not a Cypress action.
 * Source: 03-linter.md §11.3, E2E006, and §11.3.1.
 */
export const CHAINED_ASSERTIONS = Object.freeze(["should", "and"] as const);

/**
 * Methods that query a locator on any object, besides `getBy*` and Cypress's
 * `cy.get()` and `cy.xpath()`. Source: 03-linter.md §11.3, E2E002, and §11.3.1.
 */
export const LOCATOR_QUERIES = Object.freeze(["locator", "$"] as const);

/**
 * Playwright's query that returns an ElementHandle, not a Locator, so
 * web-first assertions do not accept it. Source: 03-linter.md §11.3.1, E2E009
 * (decided in #56).
 */
export const ELEMENT_HANDLE_QUERY = "$" satisfies (typeof LOCATOR_QUERIES)[number];

/**
 * Prefix of Playwright's locators by role, text, label and so on; a capital
 * letter follows it. Source: 03-linter.md §11.3.1.
 */
export const GET_BY_PREFIX = "getBy";

/** Command that queries elements on a `cy` chain. Source: 03-linter.md §11.3, E2E002, and §11.3.1. */
export const CYPRESS_QUERY = "get";

/**
 * Command of the cypress-xpath plugin that queries elements by XPath on a
 * `cy` chain; its argument is always XPath. Source: task v1-14 and
 * 03-linter.md §11.3.1 (decided in #54).
 */
export const CYPRESS_XPATH_QUERY = "xpath";

/**
 * Playwright's locator by ARIA role and its option with the accessible name,
 * which E2E004 accepts before `.nth()`. Source: 03-linter.md §11.3, E2E004, and §11.3.1.
 */
export const ROLE_LOCATOR = Object.freeze({ method: "getByRole", nameOption: "name" });

/**
 * Cypress's equivalent of `.nth()`, a refinement with an index only on a `cy`
 * chain. Source: 03-linter.md §11.3, E2E004, and §11.3.1 (decided in #55).
 */
export const CYPRESS_INDEXED_REFINEMENT = "eq";

/**
 * Refinements that take an index: `.nth()`, and `.eq()` on a `cy` chain.
 * Source: 03-linter.md §11.3, E2E004, and §11.3.1 (decided in #55).
 */
export const INDEXED_REFINEMENTS = Object.freeze(["nth", CYPRESS_INDEXED_REFINEMENT] as const);

/**
 * Methods that pick one element of a locator; `.eq()` only on a `cy` chain.
 * Source: 03-linter.md §11.3, E2E004, and §11.3.1 (`.eq()` decided in #55).
 */
export const LOCATOR_REFINEMENTS = Object.freeze([
  ...INDEXED_REFINEMENTS,
  "first",
  "last",
] as const);

/**
 * Playwright's locator by test id, which E2E004 takes as unique, like a
 * `getByRole` with a name. Source: 03-linter.md §11.3, E2E004, and §11.3.1
 * (decided in #55).
 */
export const TEST_ID_LOCATOR = "getByTestId";

/**
 * Calls that wait a fixed time: Playwright's `waitForTimeout`, Cypress's
 * `cy.wait` with a number literal and a `setTimeout` that is the whole body
 * of a `new Promise` executor. Source: 03-linter.md §11.3, E2E001, and §11.3.1.
 */
export const FIXED_WAITS = Object.freeze({
  playwright: "waitForTimeout",
  cypress: "wait",
  timer: "setTimeout",
  promise: "Promise",
});

/**
 * Pseudo-classes that pick an element by its position among its siblings.
 * Source: 03-linter.md §11.3, E2E002.
 */
export const POSITIONAL_PSEUDO_CLASSES = Object.freeze(["nth-child", "nth-of-type"] as const);

/**
 * Class names generated by CSS-in-JS libraries, which change between builds:
 * Emotion's `css-` followed by a hash with at least one digit (`css-1a2b3c`,
 * not `css-grid`), styled-components' `sc-` with any suffix, and styled-jsx's
 * `jsx-` followed by digits. No pattern nests quantifiers, so matching stays
 * linear (docs/engineering/06-security.md).
 *
 * Source: 03-linter.md §11.3, E2E002, which gives the examples, and §11.3.1;
 * the shapes were decided in #50.
 */
export const GENERATED_CLASS_PATTERNS = Object.freeze([
  /^css-[a-z]*\d[a-z0-9]*(?:-|$)/u,
  /^sc-/u,
  /^jsx-\d+$/u,
]);

/**
 * An id with a numeric sequence, typical of generated ids: three or more
 * digits in a row (`#ember123`, `#react-select-456-input`, not `#step2`).
 * Source: 03-linter.md §11.3, E2E002, and §11.3.1; the shape was decided in #50.
 */
export const NUMERIC_ID_PATTERN = /\d{3}/u;

/**
 * Attributes that hold a test id, as Playwright's `getByTestId` and the
 * Cypress conventions use them. Source: 06-selector-advisor.md §14.1, level 3;
 * the list was decided in #50.
 */
export const TEST_ID_ATTRIBUTES = Object.freeze([
  "data-testid",
  "data-test-id",
  "data-test",
  "data-cy",
  "data-qa",
] as const);

/**
 * Starts of an XPath predicate that picks by position, besides a plain
 * integer such as `[2]`. Source: 03-linter.md §11.3, E2E003, and §11.3.1.
 */
export const POSITIONAL_XPATH_FUNCTIONS = Object.freeze(["last()", "position()"] as const);

/**
 * Longest selector analyzed, in characters (UTF-16 code units), after
 * trimming and collapsing its whitespace. A longer one is unknown: parsel's
 * tokenizer slows down faster than linearly with many strings or parentheses
 * (1 MiB of `[a="x"]` takes about two minutes), and real selectors are a few
 * hundred characters at most. 2 KiB is also the cap of any other string of
 * the data model.
 *
 * Source: docs/engineering/06-security.md (linear time on input); the value
 * was decided in #50.
 */
export const SELECTOR_MAX_LENGTH = 2048;

/**
 * Prefixes that make Playwright read a selector as XPath, and the prefix that
 * forces CSS. Source: 03-linter.md §11.3, E2E003, and §11.3.1.
 */
export const SELECTOR_PREFIXES = Object.freeze({
  xpath: Object.freeze(["xpath=", "/", "(", ".."] as const),
  css: "css=",
});

/**
 * Levels of the selector hierarchy, from most to least robust. With
 * `i18n: true`, a locator by visible text drops below the test id, to the
 * level of a CSS selector by a stable attribute.
 *
 * Source: 06-selector-advisor.md §14.1; `visibleTextWithI18n` was decided in #50.
 */
export const SELECTOR_LEVELS = Object.freeze({
  roleWithName: 5,
  visibleText: 4,
  testId: 3,
  stableAttribute: 2,
  structural: 1,
  visibleTextWithI18n: 2,
} as const);

/**
 * Level of each Playwright `getBy*` locator, whatever its argument. A
 * `getByRole` with the `name` option is {@link SELECTOR_LEVELS}.roleWithName
 * instead. The locators by visible text are the ones `i18n` lowers.
 *
 * Source: 06-selector-advisor.md §14.1; `getByRole` without `name`,
 * `getByAltText` and `getByTitle` were decided in #50.
 */
export const LOCATOR_METHOD_LEVELS = Object.freeze({
  getByRole: SELECTOR_LEVELS.visibleText,
  getByLabel: SELECTOR_LEVELS.visibleText,
  getByPlaceholder: SELECTOR_LEVELS.visibleText,
  getByText: SELECTOR_LEVELS.visibleText,
  getByAltText: SELECTOR_LEVELS.visibleText,
  getByTitle: SELECTOR_LEVELS.visibleText,
  getByTestId: SELECTOR_LEVELS.testId,
} as const);

/**
 * Locators by visible text, which `i18n: true` lowers. Source:
 * 06-selector-advisor.md §14.1; `getByAltText` and `getByTitle` were decided
 * in #50.
 */
export const VISIBLE_TEXT_LOCATORS = Object.freeze([
  "getByLabel",
  "getByPlaceholder",
  "getByText",
  "getByAltText",
  "getByTitle",
] as const);

/**
 * Defaults of `atium/no-fragile-css-selector` (E2E002): a CSS selector with
 * `depth` or more combinators is fragile. Source: 03-linter.md §11.3, E2E002
 * ("≥ 3 combinadores"; "Opción `depth`: 3"); the option name was decided in #53.
 */
export const FRAGILE_SELECTOR_DEFAULTS = Object.freeze({ depth: 3 });

/**
 * Default options of `atium/no-positional-locator` (E2E004): `.nth(n)` is
 * reported from `minIndex` on, so with the default any `n > 0`. Source:
 * 03-linter.md §11.3, E2E004 ("`.nth(n)` con n > 0"; "Opción `minIndex`: 1"),
 * and §11.3.1 (decided in #55).
 */
export const POSITIONAL_LOCATOR_DEFAULTS = Object.freeze({ minIndex: 1 });

/**
 * Default options of `atium/max-test-size` (E2E005): a test is too large with
 * more than `maxActions` actions or a callback of more than `maxLines` lines.
 * Source: 03-linter.md §11.3, E2E005 ("25 acciones o 150 líneas"), and
 * §11.3.1 (option names decided in #57).
 */
export const TEST_SIZE_DEFAULTS = Object.freeze({ maxActions: 25, maxLines: 150 });
