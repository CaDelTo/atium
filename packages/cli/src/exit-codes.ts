// Loaded by every invocation, `--help` included: it must not import
// `@atium/core` (05-performance.md, "Arranque del CLI").

/**
 * Exit codes of the CLI (18-cli-config.md §26.2). They are public API: a
 * code is never renumbered or reused.
 */
export const EXIT_CODES = Object.freeze({
  /** The command finished. */
  ok: 0,
  /** `atium gate`: new Findings over the threshold or failed tests outside quarantine. */
  gateFailed: 1,
  /** Configuration or usage error. */
  usage: 2,
  /** Internal error, only with `--strict`. */
  internal: 3,
} as const);

/** One of {@link EXIT_CODES}. */
export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
