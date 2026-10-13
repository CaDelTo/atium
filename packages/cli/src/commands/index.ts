import type { CliCommand } from "./command.js";
import { initCommand } from "./init.js";

/** Every command of the CLI, in the order `atium --help` lists them. */
export const COMMANDS: readonly CliCommand[] = Object.freeze([initCommand]);
