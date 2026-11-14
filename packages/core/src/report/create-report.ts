import { compareFindings, compareStrings } from "../findings/compare.js";
import type { FindingSeverity } from "../findings/finding.js";
import { REPORT_SCHEMA_VERSION, ReportSchema } from "../model/report.js";
import type {
  Report,
  ReportFinding,
  RuleDescriptor,
  SkippedAnalyzerEntry,
} from "../model/report.js";
import { CAPABILITIES } from "../pipeline/analyzer.js";
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

interface Count {
  total: number;
  new: number;
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
export function createReport(input: CreateReportInput): Report {
  const findings = input.findings.toSorted(compareFindings);
  const overall: Count = { total: 0, new: 0 };
  const bySeverity: Record<FindingSeverity, Count> = {
    error: { total: 0, new: 0 },
    warning: { total: 0, new: 0 },
    info: { total: 0, new: 0 },
  };
  const byRule = new Map<string, Count>();
  for (const finding of findings) {
    const ruleCount = byRule.get(finding.ruleId) ?? { total: 0, new: 0 };
    byRule.set(finding.ruleId, ruleCount);
    for (const count of [overall, bySeverity[finding.severity], ruleCount]) {
      count.total += 1;
      count.new += finding.baselineState === "new" ? 1 : 0;
    }
  }
  return ReportSchema.parse({
    schemaVersion: REPORT_SCHEMA_VERSION,
    toolVersion: input.toolVersion,
    findings,
    summary: {
      overall,
      bySeverity,
      byRule: [...byRule]
        .toSorted(([a], [b]) => compareStrings(a, b))
        .map(([ruleId, count]) => ({ ruleId, ...count })),
    },
    rules: sortedRules(input.rules),
    skippedAnalyzers: input.skipped
      .map(toEntry)
      .toSorted(
        (a, b) => compareStrings(a.analyzer, b.analyzer) || compareStrings(a.reason, b.reason),
      ),
  });
}

function sortedRules(rules: readonly RuleDescriptor[]): readonly RuleDescriptor[] {
  const sorted = rules.toSorted((a, b) => compareStrings(a.id, b.id));
  const repeated = sorted.find((rule, index) => index > 0 && sorted[index - 1]?.id === rule.id);
  if (repeated !== undefined) {
    throw new Error(`Two rule descriptors have the id ${JSON.stringify(repeated.id)}.`);
  }
  return sorted;
}

function toEntry({ analyzer, reason }: SkippedAnalyzer): SkippedAnalyzerEntry {
  // The error text stays out of the report (ADR-0027); runAnalyzers already logged it.
  if (reason.kind === "missing-capabilities") {
    const missing = CAPABILITIES.filter((capability) => reason.missing.includes(capability));
    return { analyzer, reason: reason.kind, missing };
  }
  return { analyzer, reason: reason.kind };
}
