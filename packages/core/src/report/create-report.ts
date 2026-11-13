import type { Report, ReportFinding, RuleDescriptor } from "../model/report.js";
import type { SkippedAnalyzer } from "../pipeline/run-analyzers.js";

/** Input of {@link createReport}. */
export interface CreateReportInput {
  /** Version of Atium that produces the report. */
  readonly toolVersion: string;
  /** Findings already classified against the baseline, in any order. */
  readonly findings: readonly ReportFinding[];
  /** Descriptors of the rules, in any order; they may include rules without findings. */
  readonly rules: readonly RuleDescriptor[];
  /** Skipped analyzers, as `runAnalyzers` returns them, in any order. */
  readonly skipped: readonly SkippedAnalyzer[];
}

/**
 * Builds the report every reporter receives (13-score-baseline-reports.md
 * §21.5, ADR-0027). It is the only way to build one, so it guarantees what
 * `ReportSchema` does not check:
 *
 * - findings in the order of `compareFindings`;
 * - the summary counts every finding (`total`) and the `new` ones, overall,
 *   by severity (all three, even with zero) and by rule (one entry per
 *   `ruleId` with findings, ordered by `ruleId`);
 * - rules ordered by `id`;
 * - skipped analyzers ordered by `analyzer` and then by `reason`, with
 *   `missing` in the order of `CAPABILITIES` and without the error text.
 *
 * Strings are compared by UTF-16 code units, without locale.
 *
 * @param input - Tool version, findings, rule descriptors and skipped analyzers.
 * @returns The report, validated with `ReportSchema` and frozen.
 * @throws `Error` if two rule descriptors have the same `id` (a bug of the caller).
 * @throws `ZodError` if the input makes the report invalid, such as an empty `toolVersion`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub until the implementation commit
export function createReport(input: CreateReportInput): Report {
  throw new Error("not implemented");
}
