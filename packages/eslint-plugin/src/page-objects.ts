import { isAtiumError, toPosixRelative } from "@atium/core/pure";
import picomatch from "picomatch";

/** A name ESLint gives to text without a file, such as `<input>` or `<text>`. */
const PSEUDO_FILENAME = /^<[^<>]*>$/u;

/** `./tests/pages/**` and `tests/pages/**` are the same glob. */
const CURRENT_DIRECTORY = "./";

/** A glob without wildcards names a directory and covers what is inside it. */
function toPattern(glob: string): string {
  const pattern = glob.startsWith(CURRENT_DIRECTORY) ? glob.slice(CURRENT_DIRECTORY.length) : glob;
  if (picomatch.scan(pattern).isGlob) {
    return pattern;
  }
  return pattern.endsWith("/") ? `${pattern}**` : `${pattern}/**`;
}

/** The path of a file relative to `cwd`, or `undefined` when it is outside `cwd`. */
function relativePath(filename: string, cwd: string): string | undefined {
  try {
    return toPosixRelative(cwd, filename);
  } catch (error) {
    // `toPosixRelative` rejects a path outside `cwd`: not Page Object code.
    if (isAtiumError(error) && error.code === "MODEL_INVALID") {
      return undefined;
    }
    throw error;
  }
}

/**
 * Whether a file is Page Object code: its path, relative to the directory
 * ESLint runs from, matches one of the `pageObjectDirs` globs (03-linter.md
 * §11.1). A file outside that directory, or a name that is not a path such as
 * `<input>`, is not Page Object code.
 *
 * Globs are POSIX, `*` does not cross `/`, matching is case-sensitive, a
 * leading `./` is ignored, and a glob without wildcards (`tests/pages`) also
 * covers what is inside it.
 *
 * @param filename - The file, as ESLint gives it: absolute or relative to `cwd`.
 * @param cwd - The directory ESLint runs from.
 * @param globs - The `pageObjectDirs` setting.
 * @returns `true` when the file is in `pageObjectDirs`.
 */
export function isPageObjectFile(filename: string, cwd: string, globs: readonly string[]): boolean {
  if (globs.length === 0 || PSEUDO_FILENAME.test(filename)) {
    return false;
  }
  const relative = relativePath(filename, cwd);
  return relative !== undefined && picomatch(globs.map(toPattern))(relative);
}
