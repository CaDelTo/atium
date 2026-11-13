import type { Finding } from "../findings/finding.js";
import type { BaselineState, Report, RuleDescriptor } from "../model/report.js";
import type { SkippedAnalyzer } from "../pipeline/run-analyzers.js";
import type { FindingBuilder } from "./finding-builder.js";

/** Version of Atium that {@link aReport} puts in the report unless set. */
export const TEST_TOOL_VERSION = "0.0.0-test";

/** Immutable builder of a {@link Report}. Every method returns a new builder. */
export interface ReportBuilder {
  /**
   * Adds a finding.
   *
   * @param finding - The finding, or a builder of it.
   * @param baselineState - Its state against the baseline; `new` if omitted.
   * @returns A new builder with the finding added.
   */
  withFinding(finding: Finding | FindingBuilder, baselineState?: BaselineState): ReportBuilder;
  /**
   * Adds a rule descriptor.
   *
   * @param rule - The descriptor.
   * @returns A new builder with the descriptor added.
   */
  withRule(rule: RuleDescriptor): ReportBuilder;
  /**
   * Adds a skipped analyzer, as `runAnalyzers` returns it.
   *
   * @param skipped - The skipped analyzer.
   * @returns A new builder with it added.
   */
  withSkipped(skipped: SkippedAnalyzer): ReportBuilder;
  /**
   * Sets the version of Atium.
   *
   * @param toolVersion - The version.
   * @returns A new builder with that version.
   */
  withToolVersion(toolVersion: string): ReportBuilder;
  /**
   * Builds the report with `createReport`, so it is sorted and summarized.
   *
   * @returns A frozen, valid report.
   * @throws The errors of `createReport`.
   */
  build(): Report;
}

/**
 * Starts a builder of an empty report: no findings, rules or skipped
 * analyzers, and {@link TEST_TOOL_VERSION}.
 *
 * @returns A builder; call `build()` to get the report.
 */
export function aReport(): ReportBuilder {
  throw new Error("not implemented");
}
