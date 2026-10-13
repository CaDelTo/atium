import { CONFIG_PACKAGE, INIT_CONFIG_FILE } from "./defaults.js";
import { EXIT_CODES } from "./exit-codes.js";

// Every text the CLI shows the user: help, results, errors and their hints.
// In English (ADR-0019). Paths and values that come from the user or the
// project arrive already quoted with `quoteForMessage`. Loaded by `--help`,
// so it must not import `@atium/core`.

/** Help of the program, its global options and its commands. */
export const HELP = Object.freeze({
  /** Description of `atium` in `atium --help`. */
  program: "Quality analysis for automated test suites.",
  /** Description of each global option (18-cli-config.md §26.1). */
  options: Object.freeze({
    /** `--config <path>`. */
    config: "config file to use instead of the atium.config.* of the working directory",
    /** `--format <format>`. */
    format: "format of the results; each command lists the ones it supports",
    /** `--output <path>`. */
    output: "file to write the results to instead of stdout",
    /** `--ci`. */
    ci: "run as in CI",
    /** `--strict`. */
    strict: `exit with code ${String(EXIT_CODES.internal)} on internal errors instead of ${String(EXIT_CODES.ok)}`,
    /** `--quiet`. */
    quiet: "log only errors",
    /** `--verbose`. */
    verbose: "log debug messages and error stacks",
  }),
  /** `atium init` and its options. */
  init: Object.freeze({
    /** Description of the command. */
    description: `create ${INIT_CONFIG_FILE} and detect the test frameworks of the project`,
    /** `--force`. */
    force: `replace an existing ${INIT_CONFIG_FILE}`,
  }),
});

/** Written to stderr when a command fails. */
export const ERRORS = Object.freeze({
  /**
   * Logged, with the error, when a command fails because of a bug or an
   * unexpected condition (18-cli-config.md §26.2).
   *
   * @param command - What was typed, such as `"atium init"`.
   * @param strict - Whether `--strict` was given.
   * @returns The message, naming the exit code.
   */
  internal: (command: string, strict: boolean): string =>
    strict
      ? `${command} failed because of an internal error; exiting with code ${String(EXIT_CODES.internal)} because of --strict.`
      : `${command} failed because of an internal error; exiting with code ${String(EXIT_CODES.ok)} so the pipeline is not blocked. Pass --strict to exit with code ${String(EXIT_CODES.internal)}.`,
  /** Logged at debug level with the error, so --verbose shows its cause and stack. */
  details: "Error details",
  /** Starts the line with the hint of a configuration or usage error. */
  hintPrefix: "Hint: ",
});

/** Results, warnings and errors of `atium init`. */
export const INIT = Object.freeze({
  /**
   * The result, written to stdout.
   *
   * @param adapters - Adapters written to the config, possibly none.
   * @returns One line, without the line feed.
   */
  created: (adapters: readonly string[]): string =>
    adapters.length === 0
      ? `Created ${INIT_CONFIG_FILE}. No Playwright or Cypress dependency was found, so "adapters" is empty: add yours to it.`
      : `Created ${INIT_CONFIG_FILE} with the adapters ${adapters.map((name) => JSON.stringify(name)).join(", ")}.`,
  /** Error for `atium init --config`. */
  configFlag: `atium init does not accept --config: it always creates ${INIT_CONFIG_FILE} in the working directory.`,
  /** Hint of {@link INIT.configFlag}. */
  configFlagHint: "Run atium init without --config, from the directory where the config belongs.",
  /**
   * Warning when `ATIUM_CONFIG` is set, since `atium init` ignores it.
   *
   * @param value - The variable, quoted.
   * @returns The message.
   */
  configVariable: (value: string): string =>
    `ATIUM_CONFIG is set to ${value}, so the other commands will load that file instead of the ${INIT_CONFIG_FILE} created here; unset it to use this one.`,
  /**
   * Error when the config file exists and `--force` was not given.
   *
   * @param file - The config file, quoted.
   * @returns The message.
   */
  exists: (file: string): string => `${file} already exists, so atium init left it unchanged.`,
  /** Hint of {@link INIT.exists}. */
  existsHint: "Run atium init --force to replace it.",
  /**
   * Error when another `atium.config.*` exists.
   *
   * @param files - The existing config files, quoted and separated by commas.
   * @returns The message.
   */
  otherConfig: (files: string): string =>
    `The working directory already has a config file (${files}), and atium init would add a second one, which Atium rejects as ambiguous.`,
  /** Hint of {@link INIT.otherConfig}. */
  otherConfigHint: "Edit the existing file, or delete it and run atium init again.",
  /**
   * Error when the config file path is a directory.
   *
   * @param file - The config file, quoted.
   * @returns The message.
   */
  directory: (file: string): string =>
    `${file} is a directory, so atium init cannot create the config file there.`,
  /** Hint of {@link INIT.directory}. */
  directoryHint: "Rename or delete the directory, then run atium init again.",
  /**
   * Warning when there is no `package.json`.
   *
   * @param file - `package.json`, quoted.
   * @returns The message.
   */
  noManifest: (file: string): string => `${file} was not found, so no test framework was detected.`,
  /**
   * Warning when `package.json` is not a regular file.
   *
   * @param file - `package.json`, quoted.
   * @returns The message.
   */
  manifestNotAFile: (file: string): string =>
    `${file} is not a regular file, so it was not read and no test framework was detected.`,
  /**
   * Warning when `package.json` is over the size cap.
   *
   * @param file - `package.json`, quoted.
   * @param maxBytes - The cap.
   * @returns The message.
   */
  manifestTooLarge: (file: string, maxBytes: number): string =>
    `${file} is larger than ${String(maxBytes)} bytes, so it was not read and no test framework was detected.`,
  /**
   * Warning when `package.json` cannot be read, is not JSON or has another shape.
   *
   * @param file - `package.json`, quoted.
   * @returns The message.
   */
  unreadableManifest: (file: string): string =>
    `${file} could not be read as a package manifest, so no test framework was detected.`,
  /** Warning when the project does not depend on the package the config imports. */
  missingCore: `${INIT_CONFIG_FILE} imports defineConfig from "${CONFIG_PACKAGE}", which is not a dependency of the project; add it to devDependencies so the config can be loaded.`,
});
