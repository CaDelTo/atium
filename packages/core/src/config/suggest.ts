import { distance } from "fastest-levenshtein";
import { CONFIG_SUGGESTION_MAX_DISTANCE } from "../defaults.js";
import { quoteForMessage } from "../quote.js";

/**
 * The known key closest to an unknown one, for a "did you mean" hint.
 *
 * Keys are compared in lowercase, so `Storage` suggests `storage`. Only keys
 * within {@link CONFIG_SUGGESTION_MAX_DISTANCE} are suggested; on a tie, the
 * first one in `candidates` wins.
 *
 * @param key - The unknown key.
 * @param candidates - The keys valid where it was found.
 * @returns The suggested key, or `undefined` if none is close enough.
 */
export function suggestKey(key: string, candidates: readonly string[]): string | undefined {
  const target = key.toLowerCase();
  let best: string | undefined;
  let bestDistance = CONFIG_SUGGESTION_MAX_DISTANCE + 1;
  for (const candidate of candidates) {
    // The distance is at least the difference in length; skipping those keeps
    // an absurdly long key from costing a full comparison against each one.
    const lowercase = candidate.toLowerCase();
    if (Math.abs(lowercase.length - target.length) >= bestDistance) {
      continue;
    }
    const candidateDistance = distance(target, lowercase);
    if (candidateDistance < bestDistance) {
      best = candidate;
      bestDistance = candidateDistance;
    }
  }
  return best;
}

/**
 * The hint for a value with a close known one: `Did you mean "storage"?`.
 *
 * @param suggestion - The known value, as returned by {@link suggestKey}.
 * @returns The hint, with the value quoted.
 */
export function didYouMean(suggestion: string): string {
  return `Did you mean ${quoteForMessage(suggestion)}?`;
}
