import type { FindingFingerprint } from "./finding.js";

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
  throw new Error(`not implemented: ${code}`);
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
  throw new Error(`not implemented: ${parts.ruleId}`);
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
  throw new Error(`not implemented: ${String(findings.length)}`);
}
