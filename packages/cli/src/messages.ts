import {
  ATIUM_DIRECTORY,
  CONFIG_PACKAGE,
  DOCTOR_FORMATS,
  INIT_CONFIG_FILE,
  MANIFEST_MAX_BYTES,
  MIN_NODE_VERSION,
} from "./defaults.js";
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
  /** `atium doctor`. */
  doctor: Object.freeze({
    /** Description of the command. */
    description: `check Node.js, the config, Git, the CI context, ${ATIUM_DIRECTORY}/ and the test frameworks`,
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
      : `Created ${INIT_CONFIG_FILE} with the adapters ${quotedNames(adapters)}.`,
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
  /** Warning when the project does not depend on the package the config imports. */
  missingCore: `${INIT_CONFIG_FILE} imports defineConfig from "${CONFIG_PACKAGE}", which is not a dependency of the project; add it to devDependencies so the config can be loaded.`,
});

/**
 * Why `package.json` was not used, for `atium init` and `atium doctor`, which
 * then detect no test framework.
 */
export const MANIFEST = Object.freeze({
  /**
   * When there is no `package.json`.
   *
   * @param file - `package.json`, quoted.
   * @returns The message.
   */
  noManifest: (file: string): string => `${file} was not found, so no test framework was detected.`,
  /**
   * When `package.json` is not a regular file.
   *
   * @param file - `package.json`, quoted.
   * @returns The message.
   */
  manifestNotAFile: (file: string): string =>
    `${file} is not a regular file, so it was not read and no test framework was detected.`,
  /**
   * When `package.json` is over the size cap.
   *
   * @param file - `package.json`, quoted.
   * @param maxBytes - The cap.
   * @returns The message.
   */
  manifestTooLarge: (file: string, maxBytes: number): string =>
    `${file} is larger than ${String(maxBytes)} bytes, so it was not read and no test framework was detected.`,
  /**
   * When `package.json` cannot be read, is not JSON or has another shape.
   *
   * @param file - `package.json`, quoted.
   * @returns The message.
   */
  unreadableManifest: (file: string): string =>
    `${file} could not be read as a package manifest, so no test framework was detected.`,
});

/** Results and errors of `atium doctor` (18-cli-config.md §26.1). */
export const DOCTOR = Object.freeze({
  /** Column headers of the table. */
  headers: Object.freeze({ check: "CHECK", status: "STATUS", result: "RESULT" }),
  /** The `node` check. */
  node: Object.freeze({
    /**
     * @param version - The version running.
     * @returns The message when it is supported.
     */
    supported: (version: string): string =>
      `Node.js ${version}; Atium needs ${MIN_NODE_VERSION} or later.`,
    /**
     * @param version - The version running, quoted.
     * @returns The message when it is older than the minimum or cannot be read.
     */
    unsupported: (version: string): string =>
      `Node.js ${version} is not supported: Atium needs ${MIN_NODE_VERSION} or later.`,
    /** Hint of {@link DOCTOR.node.unsupported}. */
    hint: `Install Node.js ${MIN_NODE_VERSION} or later.`,
  }),
  /** The `config` check. */
  config: Object.freeze({
    /**
     * @param file - The config file, quoted.
     * @param adapters - Its adapters, possibly none.
     * @returns The message when it was loaded.
     */
    loaded: (file: string, adapters: readonly string[]): string =>
      adapters.length === 0
        ? `Loaded ${file}, which has no adapters.`
        : `Loaded ${file} with the adapters ${quotedNames(adapters)}.`,
    /** Message when there is no config file. */
    none: "No atium.config.* was found in the working directory, so every section takes its defaults.",
    /** Hint of {@link DOCTOR.config.none}. */
    noneHint: `Run atium init to create ${INIT_CONFIG_FILE}.`,
    /** Hint of a config error that came without one. */
    invalidHint: "Fix the config file, then run atium doctor again.",
  }),
  /** The `git` check. */
  git: Object.freeze({
    /**
     * @param commit - The full SHA of the commit checked out.
     * @param branch - The branch checked out, quoted, or `undefined` on a detached HEAD.
     * @returns The message when Git answered.
     */
    found: (commit: string, branch: string | undefined): string =>
      branch === undefined
        ? `Git repository at ${commit}, on a detached HEAD.`
        : `Git repository on the branch ${branch} at ${commit}.`,
    /**
     * @param message - The error from Git.
     * @returns The message when Git is not available but the commit comes from the environment.
     */
    notNeeded: (message: string): string =>
      `${message} Atium does not need Git here, because the commit comes from the environment.`,
    /** Hint of a Git error that came without one. */
    unavailableHint:
      "Run Atium inside a Git repository with at least one commit, or set ATIUM_COMMIT_SHA.",
    /** Hint of {@link DOCTOR.git.notNeeded}. */
    notNeededHint:
      "Nothing to fix for runs where the commit comes from the environment; install Git and run Atium inside a repository to use it elsewhere.",
  }),
  /** The `ci` check. */
  ci: Object.freeze({
    /**
     * @param context - Where the run happens, from {@link DOCTOR.ci.local} or
     * {@link DOCTOR.ci.provider}; the commit; the branch, quoted, if known; and
     * whether the working tree has uncommitted changes.
     * @returns The message when the context was detected.
     */
    detected: (context: {
      readonly where: string;
      readonly commit: string;
      readonly branch: string | undefined;
      readonly dirty: boolean;
    }): string => {
      const branch = context.branch === undefined ? "" : ` on ${context.branch}`;
      const dirty = context.dirty ? ", with uncommitted changes" : "";
      return `${context.where}: commit ${context.commit}${branch}${dirty}.`;
    },
    /** Where the run happens outside CI. */
    local: "Local run, not in CI",
    /**
     * @param provider - The CI provider, quoted.
     * @param run - The run, quoted, if known.
     * @param pullRequest - The pull request number, if any.
     * @returns Where the run happens in CI.
     */
    provider: (
      provider: string,
      run: string | undefined,
      pullRequest: number | undefined,
    ): string => {
      const runPart = run === undefined ? "" : `, run ${run}`;
      const pullRequestPart =
        pullRequest === undefined ? "" : `, pull request #${String(pullRequest)}`;
      return `CI provider ${provider}${runPart}${pullRequestPart}`;
    },
    /**
     * @param message - The error of the detection.
     * @returns The message when the context could not be detected.
     */
    failed: (message: string): string =>
      `The commit, branch and CI run could not be detected. ${message}`,
    /** Hint of a context error that came without one. */
    failedHint: "Check the CI variables, or set ATIUM_COMMIT_SHA and ATIUM_BRANCH.",
  }),
  /** The `storage` check. */
  storage: Object.freeze({
    /** Message when the directory exists and can be written. */
    writable: `"${ATIUM_DIRECTORY}" can be written.`,
    /** Message when it does not exist and the working directory can be written. */
    creatable: `"${ATIUM_DIRECTORY}" does not exist yet; the working directory can be written, so Atium can create it.`,
    /** Message when it exists and is not a directory. */
    notADirectory: `"${ATIUM_DIRECTORY}" is not a directory, so Atium cannot keep its local files there.`,
    /** Hint of {@link DOCTOR.storage.notADirectory}. */
    notADirectoryHint: `Rename or delete "${ATIUM_DIRECTORY}"; Atium creates the directory when it needs it.`,
    /** Message when it is a symlink whose target does not exist. */
    brokenLink: `"${ATIUM_DIRECTORY}" is a symlink to a path that does not exist, so Atium cannot create the directory.`,
    /** Message when it is a symlink to a directory outside the working directory. */
    outside: `"${ATIUM_DIRECTORY}" is a symlink to a directory outside the working directory, where Atium does not write.`,
    /** Hint of {@link DOCTOR.storage.brokenLink} and {@link DOCTOR.storage.outside}. */
    linkHint: `Replace the symlink with a directory, or point it to a directory inside the working directory.`,
    /**
     * @param where - What could not be written: the directory or the working directory.
     * @param code - The error code, such as `EACCES`.
     * @returns The message when it cannot be written.
     */
    notWritable: (where: string, code: string): string =>
      `${where} cannot be written (${code}), so Atium cannot keep its local files in "${ATIUM_DIRECTORY}".`,
    /** {@link DOCTOR.storage.notWritable} for the directory. */
    directory: `"${ATIUM_DIRECTORY}"`,
    /** {@link DOCTOR.storage.notWritable} for the working directory, when the directory does not exist. */
    workingDirectory: "The working directory",
    /** Hint of {@link DOCTOR.storage.notWritable}. */
    notWritableHint:
      "Give the current user write permission on it, or run Atium from a directory it can write to.",
  }),
  /** The `frameworks` check. */
  frameworks: Object.freeze({
    /**
     * @param adapters - The adapters detected, at least one.
     * @returns The message.
     */
    detected: (adapters: readonly string[]): string =>
      `Detected the adapters ${quotedNames(adapters)} from "package.json".`,
    /** Message when `package.json` has no framework Atium knows. */
    none: `"package.json" has no Playwright or Cypress dependency, so no test framework was detected.`,
    /** Hint of {@link DOCTOR.frameworks.none}. */
    noneHint: "Add @playwright/test or cypress to the devDependencies of the project.",
    /**
     * @param message - Why `package.json` could not be used, from {@link MANIFEST}.
     * @param code - The file system error code, such as `EACCES`.
     * @returns The message with the code.
     */
    withCode: (message: string, code: string): string => `${message} Error code: ${code}.`,
    /** Hint when `package.json` could not be used. */
    manifestHint: `Run atium doctor from the root of the project, whose "package.json" must be a JSON file of at most ${String(MANIFEST_MAX_BYTES)} bytes.`,
  }),
  /**
   * The line after the table.
   *
   * @param failed - Checks that failed.
   * @param warned - Checks that warned.
   * @returns The summary.
   */
  summary: (failed: number, warned: number): string => {
    if (failed === 0) {
      return warned === 0
        ? "All checks passed."
        : `All checks passed, with ${count(warned, "warning")}.`;
    }
    return warned === 0
      ? `${count(failed, "check")} failed.`
      : `${count(failed, "check")} failed, with ${count(warned, "warning")}.`;
  },
  /**
   * Error that makes `atium doctor` exit with code 2.
   *
   * @param failed - Checks that failed, at least one.
   * @returns The message, naming how many failed.
   */
  failed: (failed: number): string => `atium doctor found ${count(failed, "failed check")}.`,
  /** Hint of {@link DOCTOR.failed}. */
  failedHint: "Fix each failed check as its hint says, then run atium doctor again.",
  /**
   * Error for a `--format` that `atium doctor` does not support.
   *
   * @param format - The value given, quoted.
   * @returns The message.
   */
  unsupportedFormat: (format: string): string =>
    `atium doctor does not support --format ${format}.`,
  /** Hint of {@link DOCTOR.unsupportedFormat}. */
  formatHint: `Use ${DOCTOR_FORMATS.map((format) => "--format " + format).join(" or ")}.`,
});

/** Names as JSON strings separated by commas, as in `"playwright", "cypress"`. */
function quotedNames(names: readonly string[]): string {
  return names.map((name) => JSON.stringify(name)).join(", ");
}

/** `"1 check"`, `"2 checks"`. */
function count(amount: number, noun: string): string {
  return `${String(amount)} ${noun}${amount === 1 ? "" : "s"}`;
}
