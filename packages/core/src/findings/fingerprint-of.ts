import { createHash } from "node:crypto";
import { FindingFingerprintSchema } from "./finding.js";
import type { FindingFingerprint } from "./finding.js";

/**
 * Computes the fingerprint of a finding: `sha1` of the parts, 16 lowercase hex
 * characters (14-architecture.md §22.3).
 *
 * The parts are encoded with `JSON.stringify` before hashing, so no separator
 * is ambiguous: `["a|b"]` and `["a", "b"]` give different fingerprints. Where
 * the design writes `sha1(a | b | c)` for a finding, as in 03-linter.md §11.5,
 * the `|` lists the parts; it is not a literal separator.
 *
 * Parts are hashed as given: callers normalize them first and pass numbers,
 * such as an occurrence index, with `String(n)`.
 *
 * @param parts - What identifies the finding, in a fixed order. At least one.
 * @returns 16 lowercase hex characters. It never throws.
 *
 * @example
 * ```ts
 * fingerprintOf(["E2E001", "tests/cart.spec.ts", "cart › checkout", "page.waitForTimeout(500)", "0"]);
 * ```
 */
export function fingerprintOf(parts: readonly [string, ...string[]]): FindingFingerprint {
  const hash = createHash("sha1").update(JSON.stringify(parts)).digest("hex");
  return FindingFingerprintSchema.parse(hash.slice(0, 16));
}
