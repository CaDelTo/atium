import { TITLE_PATH_SEPARATOR } from "../identity.js";
import type { FindingFingerprint } from "./finding.js";
import { fingerprintOf } from "./fingerprint-of.js";

/** The parts that identify a lint finding (03-linter.md §11.5). */
export interface LintFingerprintParts {
  /** Stable code of the rule, such as `"E2E001"`. */
  readonly ruleId: string;
  /** POSIX path, relative to the repository root, as `toPosixRelative` returns it. */
  readonly file: string;
  /**
   * Titles of the test that contains the node. Outside a test, the titles of
   * the describes that contain it; at module level, `[]`.
   */
  readonly titlePath: readonly string[];
  /** Source text of the reported node, as written: it is normalized here. */
  readonly nodeCode: string;
  /** Index of the finding among the identical ones, by position, from 0. */
  readonly occurrence: number;
}

/** A lint finding before its occurrence index is known, with its 1-based position. */
export interface LintFindingInput extends Omit<LintFingerprintParts, "occurrence"> {
  /** 1-based line of the node. */
  readonly line: number;
  /** 1-based column of the node. */
  readonly column: number;
}

/**
 * Normalizes the source text of a node for its fingerprint (03-linter.md
 * §11.5): removes all whitespace and turns every `'` into `"`.
 *
 * @param code - Source text of the node.
 * @returns The normalized text. It never throws.
 */
export function normalizeNodeCode(code: string): string {
  return code.replace(/\s+/gu, "").replaceAll("'", '"');
}

/**
 * Computes the fingerprint of a lint finding (03-linter.md §11.5) with
 * `fingerprintOf`. It does not use the line number, so it survives lines
 * inserted before the node.
 *
 * @param parts - What identifies the finding, with its occurrence index.
 * @returns 16 lowercase hex characters. It never throws.
 */
export function lintFingerprint(parts: LintFingerprintParts): FindingFingerprint {
  return fingerprintOf([...partsWithoutOccurrence(parts), String(parts.occurrence)]);
}

/**
 * Assigns the occurrence index to each finding and returns its fingerprint
 * (03-linter.md §11.5): findings with the same parts get 0, 1, … in order of
 * position (line, then column); at the same position, in input order.
 *
 * @param findings - The findings of a lint run, in any order.
 * @returns One fingerprint per finding, in input order. It never throws.
 */
export function lintFingerprints(findings: readonly LintFindingInput[]): FindingFingerprint[] {
  const byPosition = findings
    .map((finding, index) => ({ finding, index }))
    .sort((a, b) => a.finding.line - b.finding.line || a.finding.column - b.finding.column);
  const seen = new Map<string, number>();
  const result: FindingFingerprint[] = [];
  for (const { finding, index } of byPosition) {
    const parts = partsWithoutOccurrence(finding);
    // JSON.stringify keeps the key unambiguous, as in fingerprintOf (14-architecture.md §22.3).
    const key = JSON.stringify(parts);
    const occurrence = seen.get(key) ?? 0;
    seen.set(key, occurrence + 1);
    result[index] = fingerprintOf([...parts, String(occurrence)]);
  }
  return result;
}

/** The hashed parts of a lint finding, without its occurrence index. */
function partsWithoutOccurrence(
  parts: Omit<LintFingerprintParts, "occurrence">,
): [string, string, string, string] {
  return [
    parts.ruleId,
    parts.file,
    parts.titlePath.join(TITLE_PATH_SEPARATOR),
    normalizeNodeCode(parts.nodeCode),
  ];
}
