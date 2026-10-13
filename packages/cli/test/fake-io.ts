import type { EnvVars } from "@atium/core";
import type { RunOptions } from "../src/run.js";

/** A stream that keeps what is written, in place of `process.stdout` or `process.stderr`. */
class FakeStream {
  readonly isTTY = false;
  private readonly chunks: string[] = [];

  write(chunk: string): boolean {
    this.chunks.push(chunk);
    return true;
  }

  /** Everything written so far. */
  get text(): string {
    return this.chunks.join("");
  }
}

/** Arguments, streams and environment for `run`, with fake streams to inspect. */
export interface FakeRun extends RunOptions {
  readonly stdout: FakeStream;
  readonly stderr: FakeStream;
}

/**
 * Options for `run` with fake streams.
 *
 * @param argv - Arguments after `atium`.
 * @param overrides - Working directory, environment or commands.
 */
export function fakeRun(
  argv: readonly string[],
  overrides: Partial<Pick<RunOptions, "cwd" | "commands">> & { env?: EnvVars } = {},
): FakeRun {
  return {
    argv,
    cwd: overrides.cwd ?? "/project",
    env: overrides.env ?? {},
    stdout: new FakeStream(),
    stderr: new FakeStream(),
    ...(overrides.commands === undefined ? {} : { commands: overrides.commands }),
  };
}
