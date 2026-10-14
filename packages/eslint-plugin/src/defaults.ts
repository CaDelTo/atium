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
