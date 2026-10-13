import { Command, CommanderError } from "commander";
import { COMMANDS } from "./commands/index.js";
import type { CliCommand } from "./commands/command.js";
import { EXIT_CODES } from "./exit-codes.js";
import type { ExitCode } from "./exit-codes.js";
import { addGlobalOptions, readGlobalOptions } from "./global-options.js";
import type { GlobalOptions } from "./global-options.js";
import type { CliIo } from "./io.js";
import { ERRORS, HELP } from "./messages.js";
import { terminalText } from "./terminal-text.js";

// Loaded by every invocation, `--help` included: everything else, and
// `@atium/core` above all, is imported once a command runs
// (05-performance.md, "Arranque del CLI").

/** Options for {@link run}. */
export interface RunOptions extends CliIo {
  /** Arguments after `atium`, such as `["init", "--force"]`. */
  readonly argv: readonly string[];
  /** Commands to offer. Defaults to every command of the CLI; tests pass their own. */
  readonly commands?: readonly CliCommand[];
}

/** What the running command was, for the error report. */
interface Invocation {
  name: string;
  globals: GlobalOptions | undefined;
}

/**
 * Runs the CLI once and returns its exit code (18-cli-config.md §26.2).
 * Help and results go to stdout; logs and errors to stderr.
 *
 * @param options - Arguments, streams, working directory and environment.
 * @returns `0` when the command finishes, also after an internal error
 * without `--strict`; `2` on a configuration or usage error; `3` on an
 * internal error with `--strict`.
 */
export async function run(options: RunOptions): Promise<ExitCode> {
  const invocation: Invocation = { name: "atium", globals: undefined };
  const program = createProgram(options, invocation);
  try {
    await program.parseAsync([...options.argv], { from: "user" });
    return EXIT_CODES.ok;
  } catch (error) {
    if (error instanceof CommanderError) {
      // Commander already wrote the help or the usage error.
      return error.exitCode === 0 ? EXIT_CODES.ok : EXIT_CODES.usage;
    }
    return reportFailure(error, options, invocation);
  }
}

/**
 * Reports a failed command. If the report itself fails, for example because
 * `@atium/core` cannot be loaded, it still exits with the code of an internal
 * error, never with Node's 1, which would read as a failed gate (ADR-0006).
 */
async function reportFailure(error: unknown, io: CliIo, invocation: Invocation): Promise<ExitCode> {
  try {
    const { reportError } = await import("./report-error.js");
    return reportError(error, { io, ...invocation });
  } catch {
    const strict = invocation.globals?.strict === true;
    try {
      io.stderr.write(`${ERRORS.internal(invocation.name, strict)}\n`);
    } catch {
      // Nothing is left to report to: stderr itself is failing.
    }
    return strict ? EXIT_CODES.internal : EXIT_CODES.ok;
  }
}

function createProgram(options: RunOptions, invocation: Invocation): Command {
  const program = new Command("atium")
    .description(HELP.program)
    .exitOverride()
    .configureOutput({
      writeOut: (text) => options.stdout.write(text),
      // Commander repeats what was typed, as in "unknown option '--x'".
      writeErr: (text) => options.stderr.write(terminalText(text)),
    });
  addGlobalOptions(program);
  for (const definition of options.commands ?? COMMANDS) {
    const command = program.command(definition.name).description(definition.description);
    definition.configure?.(command);
    command.action(async () => {
      invocation.name = `atium ${definition.name}`;
      invocation.globals = readGlobalOptions(command.optsWithGlobals());
      const { createCommandContext } = await import("./command-context.js");
      await definition.run(createCommandContext(options, invocation.globals), command.opts());
    });
  }
  return program;
}
