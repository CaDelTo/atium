import { z } from "zod";
import { HEX_16, TestIdSchema } from "../model/ids.js";

/** Every severity a finding can have, from least to most severe (14-architecture.md §22.3). */
export const FINDING_SEVERITIES = ["info", "warning", "error"] as const;
/** Severity of a finding. See {@link FINDING_SEVERITIES}. */
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

/** Every category a finding can belong to; the score is computed per category (§22.3, §21.1). */
export const FINDING_CATEGORIES = [
  "reliability",
  "maintainability",
  "selectors",
  "assertions",
  "network",
  "coverage-gap",
  "architecture",
] as const;
/** Category of a finding. See {@link FINDING_CATEGORIES}. */
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

/** Every kind of logic that can produce a finding (§22.3, ADR-0004). */
export const FINDING_SOURCES = ["rule", "heuristic", "llm"] as const;
/** What produced a finding. A finding from `llm` never affects the score or the gate (§22.5). */
export type FindingSource = (typeof FINDING_SOURCES)[number];

/** Every level of confidence a finding can have (§22.3, ADR-0004). */
export const FINDING_CONFIDENCES = ["high", "medium", "low"] as const;
/** How sure the analyzer is about a finding. See {@link FINDING_CONFIDENCES}. */
export type FindingConfidence = (typeof FINDING_CONFIDENCES)[number];

/**
 * Identity of a finding across runs, used by the baseline (ADR-0004):
 * 16 lowercase hex characters, as `fingerprintOf` returns them.
 *
 * It is a different brand from the `Fingerprint` of an error, so one cannot
 * be passed where the other is expected.
 */
export const FindingFingerprintSchema = z.string().regex(HEX_16).brand<"FindingFingerprint">();
/** Identity of a finding across runs. See {@link FindingFingerprintSchema}. */
export type FindingFingerprint = z.infer<typeof FindingFingerprintSchema>;

/** Text that must say something. */
const NonEmptyTextSchema = z.string().min(1);

/** 1-based line or column. */
const PositionSchema = z.int().positive();

/**
 * Unified output of every analyzer, including third-party plugins
 * (14-architecture.md §22.3, ADR-0004).
 *
 * Strings have no size cap: the caps of ADR-0018 apply to run files, and the
 * design defines none for findings.
 */
export const FindingSchema = z
  .strictObject({
    /** Stable across runs; the baseline matches findings by it. */
    fingerprint: FindingFingerprintSchema,
    /** Name of the analyzer that produced the finding. */
    analyzer: NonEmptyTextSchema,
    /** Such as `E2E001`, `FLAKY001`, `TRIAGE003` or `GAP002`. Plugins choose their own format. */
    ruleId: NonEmptyTextSchema,
    severity: z.enum(FINDING_SEVERITIES),
    category: z.enum(FINDING_CATEGORIES),
    source: z.enum(FINDING_SOURCES),
    confidence: z.enum(FINDING_CONFIDENCES),
    message: NonEmptyTextSchema,
    /** Where the finding is. `file` is a POSIX path relative to the repository root. */
    location: z
      .strictObject({
        file: NonEmptyTextSchema,
        line: PositionSchema.exactOptional(),
        column: PositionSchema.exactOptional(),
      })
      .readonly()
      .exactOptional(),
    /** Test the finding is about, if any. */
    testId: TestIdSchema.exactOptional(),
    /** Data that justifies the finding. Only JSON values, so every report can serialize it. */
    evidence: z.record(z.string(), z.json()).readonly().exactOptional(),
    suggestion: z
      .strictObject({
        description: NonEmptyTextSchema,
        /** Unified diff that applies the suggestion. */
        diff: NonEmptyTextSchema.exactOptional(),
      })
      .readonly()
      .exactOptional(),
    /** Page that explains the rule. Only `http` and `https`, because reports render it as a link. */
    docsUrl: z.url({ protocol: /^https?$/ }).exactOptional(),
    /** Owner of `location.file`, from CODEOWNERS. */
    owner: NonEmptyTextSchema.exactOptional(),
  })
  .readonly();

/** Unified output of every analyzer. See {@link FindingSchema}. */
export type Finding = z.infer<typeof FindingSchema>;
