import { createHash } from "node:crypto";

// Fixed values the builders derive their defaults from, so the same calls
// always build the same objects (04-testing.md, "Determinismo").

/** Start of every run and of the first attempt the builders create. */
export const FIXED_START = "2026-10-08T14:03:00.000Z";

/**
 * Adds an offset to {@link FIXED_START}.
 *
 * @param offsetMs - Milliseconds after the fixed start.
 * @returns The resulting instant, as an ISO 8601 UTC timestamp.
 */
export function fixedTimePlus(offsetMs: number): string {
  return new Date(Date.parse(FIXED_START) + offsetMs).toISOString();
}

function sha256Hex(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

/**
 * Derives an id with the shape of a `TestId` or a `Fingerprint`.
 *
 * @param seed - Any string; the same seed always gives the same value.
 * @returns 16 lowercase hex characters.
 */
export function seededHex(seed: string): string {
  return sha256Hex(seed).slice(0, 16);
}

/**
 * Derives a run id from a seed.
 *
 * @param seed - Any number; different seeds give different ids.
 * @returns A UUID v7 whose timestamp is {@link FIXED_START} and whose random
 *   bits are derived from `seed`.
 */
export function seededRunId(seed: number): string {
  const time = Date.parse(FIXED_START).toString(16).padStart(12, "0");
  const random = sha256Hex(`run:${String(seed)}`);
  // RFC 9562 variant: the two high bits of this nibble are 10.
  const variant = ((Number.parseInt(random.charAt(3), 16) & 0b0011) | 0b1000).toString(16);
  return [
    time.slice(0, 8),
    time.slice(8, 12),
    `7${random.slice(0, 3)}`,
    `${variant}${random.slice(4, 7)}`,
    random.slice(7, 19),
  ].join("-");
}
