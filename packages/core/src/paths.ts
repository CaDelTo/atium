import * as systemPath from "node:path";
import type { PlatformPath } from "node:path";
import { AtiumError } from "./errors.js";
import { quoteForMessage } from "./quote.js";

const { posix, win32 } = systemPath;

// Paths stored in the model or compared are POSIX and relative to the
// repository root; paths used to read or write files use the system `path`
// (07-public-api.md, "Multiplataforma").

/** A drive letter (`C:\`, `C:/`) or a UNC prefix (`\\server`). */
const WINDOWS_ABSOLUTE = /^(?:[A-Za-z]:[\\/]|\\\\)/;

/**
 * A segment Windows would not open as named: one ending in a dot or a space,
 * which Windows may strip, or a reserved device name, with any extension.
 */
const UNSAFE_WINDOWS_SEGMENT = /[. ]$|^(?:CON|PRN|AUX|NUL|COM[0-9¹²³]|LPT[0-9¹²³])(?:\..*)?$/i;

/**
 * Path from `root` to `target` if `target` is strictly inside `root`.
 *
 * Purely lexical: symlinks are not followed.
 */
function relativeInside(api: PlatformPath, root: string, target: string): string | undefined {
  const relative = api.relative(api.resolve(root), api.resolve(root, target));
  const escapes =
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${api.sep}`) ||
    // On Windows, a path on another drive stays absolute.
    api.isAbsolute(relative);
  return escapes ? undefined : relative;
}

/**
 * Converts a path to the form stored in the model: POSIX and relative to the
 * repository root.
 *
 * The format is detected from the syntax of the paths, not from the operating
 * system: if `root` or `absolutePath` starts with a drive letter (`C:\`, `C:/`)
 * or a UNC prefix (`\\server`), both are read as Windows paths, so
 * `C:\repo\tests\a.spec.ts` with root `C:\repo` gives `tests/a.spec.ts` also on
 * Linux and macOS. Otherwise both are read as POSIX paths, where `\` is a
 * regular character of a file name.
 *
 * @param root - Absolute path of the repository root. A relative root is
 *   resolved against the current directory.
 * @param absolutePath - Path of a file inside `root`. A relative path is
 *   resolved against `root`.
 * @returns The path relative to `root`, with `/` as separator.
 * @throws `AtiumError` with code `MODEL_INVALID` if the path is `root` itself
 *   or outside it.
 *
 * @example
 * ```ts
 * toPosixRelative("C:\\repo", "C:\\repo\\tests\\a.spec.ts"); // "tests/a.spec.ts"
 * toPosixRelative("/repo", "/repo/tests/a.spec.ts"); // "tests/a.spec.ts"
 * ```
 */
export function toPosixRelative(root: string, absolutePath: string): string {
  const api = WINDOWS_ABSOLUTE.test(root) || WINDOWS_ABSOLUTE.test(absolutePath) ? win32 : posix;
  const relative = relativeInside(api, root, absolutePath);
  if (relative === undefined) {
    throw new AtiumError(
      "MODEL_INVALID",
      `Path ${quoteForMessage(absolutePath)} is not inside the repository root ${quoteForMessage(root)}, so it cannot be stored relative to it.`,
      { hint: "Run Atium from the repository root, so that every test file is inside it." },
    );
  }
  return relative.split(api.sep).join(posix.sep);
}

/** Why `relative` cannot be used inside `root`, or `undefined` if it can. */
function unsafeReason(api: PlatformPath, root: string, relative: string): string | undefined {
  if (relative.includes("\0")) {
    return "contains a NUL character";
  }
  const inside = relativeInside(api, root, relative);
  if (inside === undefined) {
    return "resolves outside the root";
  }
  // Compared by separator: on Windows the system `path` is not the `win32` object.
  if (
    api.sep === win32.sep &&
    inside.split(win32.sep).some((name) => UNSAFE_WINDOWS_SEGMENT.test(name))
  ) {
    return "has a name Windows would not open as written (a trailing dot or space, or a device name such as CON or NUL)";
  }
  return undefined;
}

/**
 * {@link resolveInside} with a given `path` implementation, so both
 * `path.posix` and `path.win32` can be tested on any operating system.
 *
 * @param api - `path.posix`, `path.win32` or the system `path`.
 * @param root - Directory the path must stay in.
 * @param relative - Path to resolve against `root`.
 * @returns The absolute path, in the format of `api`.
 * @throws `AtiumError` with code `MODEL_INVALID` under the same conditions as
 *   {@link resolveInside}.
 *
 * @internal
 */
export function resolveInsideWith(api: PlatformPath, root: string, relative: string): string {
  const reason = unsafeReason(api, root, relative);
  if (reason !== undefined) {
    throw new AtiumError(
      "MODEL_INVALID",
      `Path ${quoteForMessage(relative)} ${reason}, so it was not used.`,
      {
        hint: "Paths that come from reports, fixtures or storage must point to a file inside the repository root.",
      },
    );
  }
  return api.resolve(root, relative);
}

/**
 * Resolves a path that comes from data (artifacts in reports, fixture paths,
 * storage paths) and checks that it stays strictly inside `root`
 * (06-security.md, "Rutas de archivos").
 *
 * The check is lexical: `..` segments are resolved, symlinks are not followed,
 * so a symlink inside `root` that points outside it is not detected. Callers
 * that write or delete files should resolve symlinks with `fs.realpath` first. On Windows it
 * also rejects names that Windows would not open as written: a trailing dot or
 * space, or a device name such as `CON`, `NUL` or `COM1.txt`.
 *
 * @param root - Directory the path must stay in, such as the repository root.
 * @param relative - Path to resolve against `root`. An absolute path is
 *   accepted only if it is inside `root`.
 * @returns The absolute path, in the format of the operating system.
 * @throws `AtiumError` with code `MODEL_INVALID` if the path is `root` itself,
 *   escapes it (as with `../secret`, `/etc/passwd` or `/repo-evil` for root
 *   `/repo`), contains a NUL character or, on Windows, has a name Windows would
 *   not open as written.
 *
 * @example
 * ```ts
 * resolveInside("/repo", "test-results/trace.zip"); // "/repo/test-results/trace.zip"
 * resolveInside("/repo", "../etc/passwd"); // throws AtiumError
 * ```
 */
export function resolveInside(root: string, relative: string): string {
  return resolveInsideWith(systemPath, root, relative);
}
