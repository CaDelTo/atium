import type { Report } from "../model/report.js";

/**
 * Turns a {@link Report} into text or bytes (14-architecture.md §22.4,
 * ADR-0027). Built-in reporters and plugins implement it. It never writes
 * files: the CLI writes the result to stdout or to `--output`.
 *
 * Options, such as colors in the console, go to the function that creates
 * the reporter.
 *
 * @example
 * ```ts
 * const reporter: Reporter = {
 *   id: "count",
 *   render: async (report) => `${String(report.summary.overall.total)} findings\n`,
 * };
 * ```
 */
export interface Reporter {
  /** Unique name, such as `"console"`, `"json"` or `"sarif"`; the value of `--format`. */
  readonly id: string;
  /**
   * Renders the report.
   *
   * @param report - The report to render, built with `createReport`.
   * @returns The text or the bytes to write.
   */
  readonly render: (report: Report) => Promise<string | Uint8Array>;
}
