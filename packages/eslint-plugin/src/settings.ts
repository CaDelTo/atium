import { AtiumError, describeIssues } from "@atium/core/pure";
import { z } from "zod";
import { SETTINGS_DEFAULTS } from "./defaults.js";
import { FRAMEWORKS } from "./syntax/framework.js";

/** Key of the plugin options inside the `settings` of an ESLint config. */
const SETTINGS_KEY = "atium";

/** Globs or function names: a list of non-empty strings. */
const PatternListSchema = z.array(z.string().min(1)).readonly();

/**
 * Schema of `settings.atium` (03-linter.md §11.1). Strict, so a misspelled key
 * is an error instead of an option silently ignored.
 */
const AtiumSettingsSchema = z.strictObject({
  /**
   * Framework of the suite; when absent, it is detected from the imports.
   * `undefined` counts as absent, for configs that set it conditionally.
   */
  framework: z.enum(FRAMEWORKS).optional(),
  /** Globs of the Page Object code, where selectors are allowed. */
  pageObjectDirs: PatternListSchema.default(SETTINGS_DEFAULTS.pageObjectDirs),
  /** Helpers that count as an assertion; globs such as `verify*` are allowed. */
  assertFunctionNames: PatternListSchema.default(SETTINGS_DEFAULTS.assertFunctionNames),
  /** Whether selectors by visible text are penalized, because they change with the language. */
  i18n: z.boolean().default(SETTINGS_DEFAULTS.i18n),
});

type Issue = z.core.$ZodIssue;

/**
 * Prefixes the path of an issue with `settings.atium`, so the message names
 * the full key, such as `settings.atium.i18n`. Zod reports every unknown key
 * of an object in one issue at the object's path: it is split into one issue
 * per key, at the key's own path.
 */
function withFullPath(issue: Issue): Issue[] {
  const path = ["settings", SETTINGS_KEY, ...issue.path];
  if (issue.code !== "unrecognized_keys") {
    return [{ ...issue, path }];
  }
  return issue.keys.map((key) => ({
    code: "custom",
    path: [...path, key],
    message: "Unknown key",
    input: issue.input,
  }));
}

/** `settings.atium` after validation, with the defaults applied. */
export type AtiumSettings = z.output<typeof AtiumSettingsSchema>;

/**
 * Reads and validates `settings.atium` from the settings of an ESLint config,
 * as a rule receives them in `context.settings`.
 *
 * @param settings - The `settings` object of the ESLint config.
 * @returns The plugin settings, with the defaults for the keys left out.
 * @throws {@link AtiumError} `CONFIG_INVALID` when `settings.atium` is not an
 * object, has an unknown key or a value of the wrong type.
 */
export function readSettings(settings: Readonly<Record<string, unknown>>): AtiumSettings {
  const value = settings[SETTINGS_KEY];
  const parsed = AtiumSettingsSchema.safeParse(value === undefined ? {} : value);
  if (parsed.success) {
    return parsed.data;
  }
  const issues = parsed.error.issues.flatMap((issue) => withFullPath(issue));
  throw new AtiumError(
    "CONFIG_INVALID",
    `Invalid settings in the ESLint config: ${describeIssues(issues)}.`,
    {
      hint: `Fix those keys in settings.atium of eslint.config.*, or remove them to use the defaults. Valid keys: ${Object.keys(AtiumSettingsSchema.shape).join(", ")}.`,
    },
  );
}
