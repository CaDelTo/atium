import { quoteForMessage } from "@atium/core";
import { MIN_NODE_VERSION } from "../../defaults.js";
import { DOCTOR } from "../../messages.js";
import type { DoctorCheckOf } from "../report.js";

/** A version: its numbers, and whether it is a pre-release such as `25.0.0-nightly`. */
export interface Version {
  /** `[major, minor, patch]`. */
  readonly numbers: readonly [number, number, number];
  /** Whether something follows the patch after a `-`, as in semver. */
  readonly prerelease: boolean;
}

/**
 * Reads a version such as `22.12.0`, `v22.12.0` or `25.0.0-nightly2026`.
 * Build metadata after a `+` is ignored.
 *
 * @param text - The version.
 * @returns The version, or `undefined` if it does not start with three numbers.
 */
export function parseVersion(text: string): Version | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(-)?/.exec(text);
  if (match === null) {
    return undefined;
  }
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] !== undefined,
  };
}

/**
 * Orders two versions by major, then minor, then patch; with equal numbers,
 * a pre-release comes before the release, as in semver. Two pre-releases of
 * the same numbers count as equal.
 *
 * @param a - A version.
 * @param b - Another version.
 * @returns A negative number if `a` is older, `0` if equal, positive if newer.
 */
export function compareVersions(a: Version, b: Version): number {
  const [aMajor, aMinor, aPatch] = a.numbers;
  const [bMajor, bMinor, bPatch] = b.numbers;
  return (
    aMajor - bMajor ||
    aMinor - bMinor ||
    aPatch - bPatch ||
    Number(b.prerelease) - Number(a.prerelease)
  );
}

/**
 * The `node` check: Node.js is {@link MIN_NODE_VERSION} or later.
 *
 * @param version - The version running, as in `process.versions.node`.
 * @returns `pass`, or `fail` if it is older or cannot be read.
 */
export function checkNode(version: string): DoctorCheckOf<"node"> {
  const details = { version, required: MIN_NODE_VERSION };
  const running = parseVersion(version);
  const minimum = parseVersion(MIN_NODE_VERSION);
  if (running !== undefined && minimum !== undefined && compareVersions(running, minimum) >= 0) {
    return { id: "node", status: "pass", message: DOCTOR.node.supported(version), details };
  }
  return {
    id: "node",
    status: "fail",
    message: DOCTOR.node.unsupported(quoteForMessage(version)),
    hint: DOCTOR.node.hint,
    details,
  };
}
