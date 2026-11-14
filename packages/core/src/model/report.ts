import { z } from "zod";
import { FindingSchema } from "../findings/finding.js";
import { CAPABILITIES, SKIP_REASON_KINDS } from "../pipeline/analyzer.js";
import { NonNegativeIntSchema } from "./fields.js";

/** Version of the report schema written today (13-score-baseline-reports.md §21.5, ADR-0027). */
export const REPORT_SCHEMA_VERSION = 1;

/**
 * Every state a finding can have against the baseline (§21.3): `new` if its
 * fingerprint is not in the baseline, `unchanged` if it is. The same values as
 * SARIF's `result.baselineState`. Without a baseline, every finding is `new`.
 */
export const BASELINE_STATES = ["new", "unchanged"] as const;
/** State of a finding against the baseline. See {@link BASELINE_STATES}. */
export type BaselineState = (typeof BASELINE_STATES)[number];

/** Text that must say something. */
const NonEmptyTextSchema = z.string().min(1);

/** A {@link FindingSchema | Finding} with its state against the baseline. */
export const ReportFindingSchema = FindingSchema.unwrap()
  .extend({
    /** Whether the finding is new or already in the baseline. See {@link BASELINE_STATES}. */
    baselineState: z.enum(BASELINE_STATES),
  })
  .readonly();
/** A finding with its state against the baseline. See {@link ReportFindingSchema}. */
export type ReportFinding = z.infer<typeof ReportFindingSchema>;

const CountSchema = z
  .strictObject({
    /** Every finding counted. */
    total: NonNegativeIntSchema,
    /** Findings whose `baselineState` is `new`. */
    new: NonNegativeIntSchema,
  })
  .readonly();

const SeverityCountsSchema = z
  .strictObject({ error: CountSchema, warning: CountSchema, info: CountSchema })
  .readonly();

/** Describes a rule, for reporters that list rules, such as SARIF's `tool.driver.rules`. */
export const RuleDescriptorSchema = z
  .strictObject({
    /** Rule code, as in `Finding.ruleId`, such as `E2E001`. */
    id: NonEmptyTextSchema,
    /** Readable name, required for every rule, such as `no-hard-wait`. */
    name: NonEmptyTextSchema,
    /** Title of the rule (03-linter.md §11.2), such as `Hard wait detected`; also SARIF's `shortDescription`. */
    shortDescription: NonEmptyTextSchema,
    /** Page that explains the rule. Only `http` and `https`, because reports render it as a link. */
    docsUrl: z.url({ protocol: /^https?$/ }).exactOptional(),
  })
  .readonly();
/** Describes a rule. See {@link RuleDescriptorSchema}. */
export type RuleDescriptor = z.infer<typeof RuleDescriptorSchema>;

const SkipReasonKindSchema = z.enum(SKIP_REASON_KINDS);

/**
 * An analyzer that did not contribute findings, with the kind of reason. The
 * error text is left out: it is not JSON, it may hold paths or secrets, and
 * the orchestrator already logs it (ADR-0027).
 */
export const SkippedAnalyzerEntrySchema = z.discriminatedUnion("reason", [
  z
    .strictObject({
      /** `id` of the analyzer. */
      analyzer: NonEmptyTextSchema,
      /** It requires capabilities that are not available. */
      reason: SkipReasonKindSchema.extract(["missing-capabilities"]),
      /** The capabilities that are missing. */
      missing: z.array(z.enum(CAPABILITIES)).min(1).readonly(),
    })
    .readonly(),
  z
    .strictObject({
      /** `id` of the analyzer. */
      analyzer: NonEmptyTextSchema,
      /** Why it was skipped. See {@link SKIP_REASON_KINDS}. */
      reason: SkipReasonKindSchema.exclude(["missing-capabilities"]),
    })
    .readonly(),
]);
/** An analyzer that did not contribute findings. See {@link SkippedAnalyzerEntrySchema}. */
export type SkippedAnalyzerEntry = z.infer<typeof SkippedAnalyzerEntrySchema>;

/**
 * Input of every reporter: the findings of an analysis with their baseline
 * state, a summary, the rules and the skipped analyzers
 * (13-score-baseline-reports.md §21.5, ADR-0027).
 *
 * Order, uniqueness and the summary are guaranteed by `createReport`, not
 * checked here: JSON Schema cannot express them, and the published schema
 * must match this one.
 */
export const ReportSchema = z
  .strictObject({
    /** Version of the schema the report was written with. See {@link REPORT_SCHEMA_VERSION}. */
    schemaVersion: z.literal(REPORT_SCHEMA_VERSION),
    /** Version of Atium that produced the report. */
    toolVersion: NonEmptyTextSchema,
    /** Findings, in the order of `compareFindings`. */
    findings: z.array(ReportFindingSchema).readonly(),
    /** Counts of all findings and of the new ones. */
    summary: z
      .strictObject({
        /** Every finding. */
        overall: CountSchema,
        /** Findings of each severity, all three always present. */
        bySeverity: SeverityCountsSchema,
        /** One entry per rule with findings, ordered by `ruleId`. */
        byRule: z
          .array(
            z
              .strictObject({
                /** Rule code. */
                ruleId: NonEmptyTextSchema,
                /** Findings of the rule. */
                total: NonNegativeIntSchema,
                /** Findings of the rule whose `baselineState` is `new`. */
                new: NonNegativeIntSchema,
              })
              .readonly(),
          )
          .readonly(),
      })
      .readonly(),
    /** Rule descriptors, ordered by `id`, with no repeated `id`. They may include rules without findings. */
    rules: z.array(RuleDescriptorSchema).readonly(),
    /** Skipped analyzers, ordered by `analyzer` and then by `reason`. */
    skippedAnalyzers: z.array(SkippedAnalyzerEntrySchema).readonly(),
  })
  .readonly();

/** Input of every reporter. See {@link ReportSchema}. */
export type Report = z.infer<typeof ReportSchema>;
