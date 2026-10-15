/**
 * Code of a Node.js system or zlib error, such as `ENOENT`, `EEXIST` or
 * `Z_DATA_ERROR`.
 *
 * @param error - Anything caught.
 * @returns The string `code` of an `Error`, or `undefined` if it has none.
 */
export function errnoCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

/**
 * Whether an error of the file system means that nothing is at the path: the
 * file does not exist (`ENOENT`) or one of its parents is not a directory
 * (`ENOTDIR`).
 *
 * @param error - Anything caught.
 * @returns `true` for an error with code `ENOENT` or `ENOTDIR`, `false` for
 *   any other error or value.
 */
export function isMissingFileError(error: unknown): boolean {
  const code = errnoCode(error);
  return code === "ENOENT" || code === "ENOTDIR";
}
