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
 * Chained methods that are an assertion, and so not a Cypress action.
 * Source: 03-linter.md §11.3, E2E006, and §11.3.1.
 */
export const CHAINED_ASSERTIONS = Object.freeze(["should", "and"] as const);

/**
 * Methods that query a locator on any object, besides `getBy*` and Cypress's
 * `cy.get()`. Source: 03-linter.md §11.3, E2E002, and §11.3.1.
 */
export const LOCATOR_QUERIES = Object.freeze(["locator", "$"] as const);

/**
 * Prefix of Playwright's locators by role, text, label and so on; a capital
 * letter follows it. Source: 03-linter.md §11.3.1.
 */
export const GET_BY_PREFIX = "getBy";

/** Command that queries elements on a `cy` chain. Source: 03-linter.md §11.3, E2E002, and §11.3.1. */
export const CYPRESS_QUERY = "get";

/**
 * Playwright's locator by ARIA role and its option with the accessible name,
 * which E2E004 accepts before `.nth()`. Source: 03-linter.md §11.3, E2E004, and §11.3.1.
 */
export const ROLE_LOCATOR = Object.freeze({ method: "getByRole", nameOption: "name" });

/** Methods that pick one element of a locator. Source: 03-linter.md §11.3, E2E004, and §11.3.1. */
export const LOCATOR_REFINEMENTS = Object.freeze(["nth", "first", "last"] as const);

/** The refinement that takes an index. Source: 03-linter.md §11.3, E2E004. */
export const INDEXED_REFINEMENT = "nth";

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
