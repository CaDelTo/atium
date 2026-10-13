import { constants, lstatSync } from "node:fs";
import { mkdir, open, realpath } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { AtiumError, err, isAtiumError, ok, quoteForMessage, resolveInside } from "@atium/core";
import type { Result } from "@atium/core";
import { SQLITE_DATABASE_PATH, SQLITE_DIRECTORY_MODE, SQLITE_FILE_MODE } from "./defaults.js";

// Windows has no O_NOFOLLOW, although the types declare it; there the lstat check stands alone.
const NO_FOLLOW = "O_NOFOLLOW" in constants ? constants.O_NOFOLLOW : 0;
const CREATE_WITHOUT_FOLLOWING =
  constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND | NO_FOLLOW;

/**
 * Resolves the database path inside the repository and gets it ready for
 * SQLite: it creates the directory, rejects a path that a symlink takes
 * outside the repository, and creates a missing file readable only by its
 * owner (06-security.md, "Rutas de archivos").
 *
 * @param rootDir - Root of the repository.
 * @param path - Path of the database, relative to `rootDir` or absolute inside it.
 * @returns The absolute path of the database, `MODEL_INVALID` if it leads
 *   outside `rootDir` or is a symlink, or `STORAGE_UNAVAILABLE` if it cannot
 *   be created.
 */
export async function prepareDatabaseFile(
  rootDir: string,
  path: string = SQLITE_DATABASE_PATH,
): Promise<Result<string>> {
  try {
    const lexical = resolveInside(rootDir, path);
    await mkdir(dirname(lexical), { recursive: true, mode: SQLITE_DIRECTORY_MODE });
    // `resolveInside` only compares text: a symlinked directory could still lead outside.
    const file = resolveInside(
      await realpath(rootDir),
      join(await realpath(dirname(lexical)), basename(lexical)),
    );
    if (lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink() === true) {
      return err(
        new AtiumError(
          "MODEL_INVALID",
          `The SQLite database at ${quoteForMessage(file)} is a symbolic link; Atium does not follow it.`,
          { hint: "Replace the link with the database file, or delete it to start a new history." },
        ),
      );
    }
    // Creates a missing file with its permissions before SQLite does; an existing one keeps its own.
    await (await open(file, CREATE_WITHOUT_FOLLOWING, SQLITE_FILE_MODE)).close();
    return ok(file);
  } catch (error) {
    if (isAtiumError(error)) {
      return err(error);
    }
    return err(
      new AtiumError(
        "STORAGE_UNAVAILABLE",
        `Could not create the SQLite database at ${quoteForMessage(join(rootDir, path))}.`,
        { cause: error, hint: "Check that the directory exists and is writable." },
      ),
    );
  }
}
