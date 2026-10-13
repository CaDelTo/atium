import type { Command } from "commander";
import type { CommandContext } from "../command-context.js";

/**
 * A command of the CLI. Its definition is loaded with the program, so it
 * must not import heavy dependencies: `run` imports its implementation with
 * `await import(...)` (05-performance.md, "Arranque del CLI").
 */
export interface CliCommand {
  /** Name typed after `atium`. */
  readonly name: string;
  /** One line for `atium --help`, from `messages.ts`. */
  readonly description: string;
  /** Declares the command's own options and arguments. */
  readonly configure?: (command: Command) => void;
  /**
   * Does the work. Results go to `context.stdout`; anything thrown is turned
   * into an exit code by the CLI (18-cli-config.md §26.2).
   *
   * @param context - Working directory, streams, logger and global options.
   * @param options - The command's own option values, as Commander parsed them.
   */
  readonly run: (
    context: CommandContext,
    options: Readonly<Record<string, unknown>>,
  ) => Promise<void>;
}
