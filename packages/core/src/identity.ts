import { createHash } from "node:crypto";
import { TestIdSchema } from "./model/ids.js";
import type { TestId } from "./model/ids.js";

/** Separator between the levels of a `titlePath` in the input of the `testId` hash. */
export const TITLE_PATH_SEPARATOR = " › ";

/** Separator between `project`, `file` and the joined `titlePath` in the `testId` hash. */
const FIELD_SEPARATOR = "|";

/** What identifies a test. All values are the originals, before any cap. */
export interface TestIdentity {
  /** Playwright project or browser. A missing project hashes as `""`. */
  readonly project?: string | undefined;
  /** POSIX path, relative to the repository root, as `toPosixRelative` returns it. */
  readonly file: string;
  /** `describe › describe › test`, one element per level. */
  readonly titlePath: readonly string[];
}

/**
 * Computes the stable identity of a test (02-data-model.md §9.3):
 * `sha1(project | file | titlePath.join(" › ")).slice(0, 16)`.
 *
 * The three fields are joined with a literal `|`, without spaces, and a
 * missing `project` is hashed as `""`.
 *
 * Inputs are hashed as given: `file` must already be a POSIX path relative to
 * the repository root, and no Unicode normalization is applied, so the same
 * name in NFC and in NFD gives different ids. Because of the separators, a
 * title that contains `" › "`, or a `project` or `file` that contains `"|"`,
 * can give the same id as a test split differently.
 *
 * @param identity - The original `project`, `file` and `titlePath` of the test.
 * @returns 16 lowercase hex characters. It never throws.
 *
 * @example
 * ```ts
 * computeTestId({ project: "chromium", file: "tests/cart.spec.ts", titlePath: ["cart", "checkout"] });
 * // "2417ec6bdaef918a"
 * ```
 */
export function computeTestId(identity: TestIdentity): TestId {
  const input = [
    identity.project ?? "",
    identity.file,
    identity.titlePath.join(TITLE_PATH_SEPARATOR),
  ].join(FIELD_SEPARATOR);
  const hash = createHash("sha1").update(input).digest("hex");
  return TestIdSchema.parse(hash.slice(0, 16));
}
