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
  throw new Error(`not implemented: ${filename} ${cwd} ${String(globs.length)}`);
}
