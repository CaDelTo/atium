import type { EnvVars, LogStream } from "@atium/core";

/** Where the results of a command go; `process.stdout` fits. */
export interface OutputStream {
  /** Writes one chunk of text. Its return value is ignored. */
  write(chunk: string): unknown;
}

/** The process as the CLI sees it, injected so tests can run it in memory. */
export interface CliIo {
  /** Working directory, absolute. */
  readonly cwd: string;
  /** Environment variables, normally `process.env`. */
  readonly env: EnvVars;
  /** Results only, so they can be redirected (03-errors-logging.md, "Salida del CLI"). */
  readonly stdout: OutputStream;
  /** Logs, warnings, errors and progress. */
  readonly stderr: LogStream;
}
