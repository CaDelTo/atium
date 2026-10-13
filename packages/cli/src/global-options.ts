import type { LogLevel } from "@atium/core";
import { Option } from "commander";
import type { Command } from "commander";
import { HELP } from "./messages.js";

/** The global options of 18-cli-config.md §26.1, as every command receives them. */
export interface GlobalOptions {
  /** `--config`: config file to use instead of searching for one. */
  readonly config?: string;
  /** `--format`: format of the results. Each command validates its own values. */
  readonly format?: string;
  /** `--output`: file to write the results to. */
  readonly output?: string;
  /** `--ci`: run as in CI. */
  readonly ci: boolean;
  /** `--strict`: an internal error exits with code 3 instead of 0. */
  readonly strict: boolean;
  /** Lowest severity logged: `"error"` with `--quiet`, `"debug"` with `--verbose`. Unset otherwise. */
  readonly logLevel?: LogLevel;
}

/**
 * Declares the global options on the program. Commander recognizes them
 * before and after the command name, so `atium --strict init` and
 * `atium init --strict` are the same.
 *
 * @param program - The root command.
 */
export function addGlobalOptions(program: Command): void {
  program
    .option("--config <path>", HELP.options.config)
    .option("--format <format>", HELP.options.format)
    .option("--output <path>", HELP.options.output)
    .option("--ci", HELP.options.ci)
    .option("--strict", HELP.options.strict)
    .addOption(new Option("--quiet", HELP.options.quiet).conflicts("verbose"))
    .option("--verbose", HELP.options.verbose);
}

/**
 * Reads the global options from what Commander parsed.
 *
 * @param values - The option values of the running command with those of
 * the program, from `optsWithGlobals()`.
 * @returns The global options, typed.
 */
export function readGlobalOptions(values: Readonly<Record<string, unknown>>): GlobalOptions {
  const { config, format, output } = values;
  const logLevel = logLevelOf(values);
  return {
    ...(typeof config === "string" ? { config } : {}),
    ...(typeof format === "string" ? { format } : {}),
    ...(typeof output === "string" ? { output } : {}),
    ci: values["ci"] === true,
    strict: values["strict"] === true,
    ...(logLevel === undefined ? {} : { logLevel }),
  };
}

/** `--quiet` and `--verbose` conflict, so Commander never lets both through. */
function logLevelOf(values: Readonly<Record<string, unknown>>): LogLevel | undefined {
  if (values["verbose"] === true) {
    return "debug";
  }
  return values["quiet"] === true ? "error" : undefined;
}
