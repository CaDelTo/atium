import type { Finding } from "./finding.js";

type Location = NonNullable<Finding["location"]>;

/** Compares strings by UTF-16 code units, so the order never depends on the locale. */
function compareStrings(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function compareNumbers(a: number, b: number): number {
  return a - b;
}

/** Compares optional values with `compare`; a missing value goes after any present one. */
function compareMissingLast<T>(
  a: T | undefined,
  b: T | undefined,
  compare: (a: T, b: T) => number,
): number {
  if (a === undefined || b === undefined) {
    return Number(a === undefined) - Number(b === undefined);
  }
  return compare(a, b);
}

function compareLocations(a: Location, b: Location): number {
  return (
    compareStrings(a.file, b.file) ||
    compareMissingLast(a.line, b.line, compareNumbers) ||
    compareMissingLast(a.column, b.column, compareNumbers)
  );
}

/**
 * Orders findings for every output (02-code-design.md, "Salida determinista"):
 * by `location.file`, `line` and `column`, then by `ruleId`, with
 * `fingerprint` as the tie-break.
 *
 * Findings without `location` go last, and a missing `line` or `column` goes
 * after a present one. Strings compare by UTF-16 code units, not by locale.
 *
 * Two findings that compare equal have the same location, rule and
 * fingerprint, the stable key the baseline matches findings by (ADR-0004);
 * `Array.sort` is stable, so they keep their input order.
 *
 * @param a - First finding.
 * @param b - Second finding.
 * @returns A negative number if `a` goes first, a positive one if `b` goes first, `0` if equal.
 *
 * @example
 * ```ts
 * const ordered = findings.toSorted(compareFindings);
 * ```
 */
export function compareFindings(a: Finding, b: Finding): number {
  return (
    compareMissingLast(a.location, b.location, compareLocations) ||
    compareStrings(a.ruleId, b.ruleId) ||
    compareStrings(a.fingerprint, b.fingerprint)
  );
}
