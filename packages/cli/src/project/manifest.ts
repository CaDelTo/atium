import * as path from "node:path";
import { assertNever, quoteForMessage } from "@atium/core";
import { MANIFEST_MAX_BYTES } from "../defaults.js";
import { MANIFEST } from "../messages.js";
import { detectFrameworks } from "./detect-frameworks.js";
import type { DetectedProject } from "./detect-frameworks.js";
import type { CappedRead } from "./project-files.js";
import { errnoCode, readCapped } from "./project-files.js";

/** The manifest of the project, read by `atium init` and `atium doctor`. */
const MANIFEST_FILE = "package.json";

/**
 * What {@link readProjectManifest} found: the frameworks of the project, or
 * why `package.json` could not be used.
 */
export type ManifestRead =
  | { readonly kind: "detected"; readonly project: DetectedProject }
  | { readonly kind: "missing" }
  | { readonly kind: "not-a-file" }
  | { readonly kind: "too-large" }
  | {
      readonly kind: "unreadable";
      /** The read or JSON error, or `undefined` if the JSON has another shape. */
      readonly error: unknown;
    };

/**
 * Reads the `package.json` of a directory, a regular file of at most
 * {@link MANIFEST_MAX_BYTES}, and detects its test frameworks
 * (18-cli-config.md §26.1). It never throws: a manifest that cannot be used
 * is a result, and each command decides how to report it.
 *
 * @param cwd - Directory of the project, absolute.
 * @returns The detected frameworks, or why the manifest was not used.
 */
export async function readProjectManifest(cwd: string): Promise<ManifestRead> {
  let read: CappedRead;
  try {
    read = await readCapped(path.join(cwd, MANIFEST_FILE), MANIFEST_MAX_BYTES);
  } catch (error) {
    return { kind: "unreadable", error };
  }
  if (read.kind !== "text") {
    return read;
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(read.text);
  } catch (error) {
    return { kind: "unreadable", error };
  }
  const project = detectFrameworks(manifest);
  return project === undefined
    ? { kind: "unreadable", error: undefined }
    : { kind: "detected", project };
}

/** A {@link ManifestRead} that did not detect anything. */
export type ManifestFailure = Exclude<ManifestRead, { readonly kind: "detected" }>;

/** Why `package.json` was not used, as every command reports it. */
export interface ManifestProblem {
  /** One line from {@link MANIFEST}. */
  readonly message: string;
  /** The file system error code, such as `EACCES`, of a read error. */
  readonly code: string | undefined;
  /**
   * The read or JSON error, for `--verbose` only: its message carries the
   * absolute path or a piece of the file.
   */
  readonly error: unknown;
}

/**
 * Explains why `package.json` was not used, for `atium init` and
 * `atium doctor` (18-cli-config.md §26.1).
 *
 * @param read - A read that detected nothing.
 * @returns The message, the error code if there is one, and the error.
 */
export function manifestProblem(read: ManifestFailure): ManifestProblem {
  const file = quoteForMessage(MANIFEST_FILE);
  switch (read.kind) {
    case "missing":
      return { message: MANIFEST.noManifest(file), code: undefined, error: undefined };
    case "not-a-file":
      return { message: MANIFEST.manifestNotAFile(file), code: undefined, error: undefined };
    case "too-large":
      return {
        message: MANIFEST.manifestTooLarge(file, MANIFEST_MAX_BYTES),
        code: undefined,
        error: undefined,
      };
    case "unreadable":
      return {
        message: MANIFEST.unreadableManifest(file),
        code: errnoCode(read.error),
        error: read.error,
      };
    default:
      return assertNever(read);
  }
}
