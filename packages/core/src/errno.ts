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
