import { lstat, mkdtemp, open, rename, rm, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { errnoCode, isMissingFileError } from "@atium/core";

// The file system work of `atium init` and `atium doctor`, apart from their
// decisions in run-init.ts and doctor/.

// The rule lives in @atium/core. Re-exported because project-files.test.ts
// imports it from this module; new code imports it from @atium/core.
export { errnoCode } from "@atium/core";

/** What is at a path, without following a symlink: a symlink counts as a file. */
export type EntryKind = "none" | "file" | "directory";

/**
 * What is at the path `atium init` writes to. A symlink, even a broken one or
 * one to a directory, is a file: `--force` replaces the link, not its target.
 *
 * @param file - Absolute path.
 * @returns The kind of entry, or `"none"` if there is nothing.
 * @throws The file system error if the path cannot be checked.
 */
export async function entryKind(file: string): Promise<EntryKind> {
  try {
    return (await lstat(file)).isDirectory() ? "directory" : "file";
  } catch (error) {
    if (isMissingFileError(error)) {
      return "none";
    }
    throw error;
  }
}

/**
 * Whether `loadConfig` would take a path as a config file: a regular file,
 * following symlinks, as in its search (18-cli-config.md §26.3).
 *
 * @param file - Absolute path.
 * @returns `false` for nothing, a directory or a broken symlink.
 * @throws The file system error if the path cannot be checked.
 */
export async function isRegularFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }
    throw error;
  }
}

/** The content of a file read with a size cap, or why it was not read. */
export type CappedRead =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "missing" }
  | { readonly kind: "not-a-file" }
  | { readonly kind: "too-large" };

/**
 * Reads a small text file, checking its size before reading and never
 * reading more than `maxBytes + 1` bytes, in case it grows meanwhile. Only a
 * regular file is opened, so a FIFO cannot block it.
 *
 * @param file - Absolute path.
 * @param maxBytes - Largest size accepted.
 * @returns The text as UTF-8, or why it was not read.
 * @throws The file system error if the file exists but cannot be read.
 */
export async function readCapped(file: string, maxBytes: number): Promise<CappedRead> {
  let size: number;
  try {
    const info = await stat(file);
    if (!info.isFile()) {
      return { kind: "not-a-file" };
    }
    size = info.size;
  } catch (error) {
    if (isMissingFileError(error)) {
      return { kind: "missing" };
    }
    throw error;
  }
  if (size > maxBytes) {
    return { kind: "too-large" };
  }
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(maxBytes + 1);
    let length = 0;
    let bytesRead: number;
    do {
      ({ bytesRead } = await handle.read(buffer, length, buffer.length - length, length));
      length += bytesRead;
    } while (bytesRead > 0 && length < buffer.length);
    return length > maxBytes
      ? { kind: "too-large" }
      : { kind: "text", text: buffer.toString("utf8", 0, length) };
  } finally {
    await handle.close();
  }
}

/**
 * Creates a file that must not exist yet. `wx` fails if the path exists, also
 * as a symlink, so a file that appeared after the checks is never replaced.
 *
 * @param file - Absolute path.
 * @param content - Text to write.
 * @returns `"exists"` if something is already at the path.
 * @throws Any other file system error.
 */
export async function createFile(file: string, content: string): Promise<"created" | "exists"> {
  try {
    await writeFile(file, content, { flag: "wx" });
    return "created";
  } catch (error) {
    if (errnoCode(error) === "EEXIST") {
      return "exists";
    }
    throw error;
  }
}

/**
 * Replaces a file, or a symlink without touching its target, atomically: the
 * content is written to a new temporary directory next to it and renamed
 * over it, so a failed write leaves the old file in place.
 *
 * @param file - Absolute path.
 * @param content - Text to write.
 * @throws The file system error if the file cannot be written or renamed.
 */
export async function replaceFile(file: string, content: string): Promise<void> {
  const directory = await mkdtemp(path.join(path.dirname(file), ".atium-init-"));
  try {
    const temporary = path.join(directory, path.basename(file));
    await writeFile(temporary, content, { flag: "wx" });
    await rename(temporary, file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
