/**
 * A command was used in a way it does not support, such as `atium init` on a
 * project that already has a config file. The CLI exits with code 2 and
 * shows the message and the hint.
 *
 * Internal to the CLI: failures that other packages report use
 * `AtiumError` and its public codes instead.
 */
export class UsageError extends Error {
  /** How to fix the problem, shown after the message. */
  readonly hint: string;

  /**
   * @param message - What happened and why.
   * @param hint - How to fix it.
   */
  constructor(message: string, hint: string) {
    super(message);
    this.name = "UsageError";
    this.hint = hint;
  }
}
