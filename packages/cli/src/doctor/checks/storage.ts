import { lstat, mkdtemp, realpath, rm, stat } from "node:fs/promises";
import * as path from "node:path";
import { ATIUM_DIRECTORY } from "../../defaults.js";
import { DOCTOR } from "../../messages.js";
import { errnoCode } from "../../project/project-files.js";
import type { DoctorCheckOf } from "../report.js";

/** Prefix of the directory created, and removed at once, to check a directory can be written. */
const PROBE_PREFIX = ".atium-doctor-";

type StorageCheck = DoctorCheckOf<"storage">;

/** Where the write probe goes, or the check if it already failed. */
type Target =
  | { readonly kind: "probe"; readonly directory: string; readonly exists: boolean }
  | { readonly kind: "done"; readonly check: StorageCheck };

/**
 * The `storage` check: {@link ATIUM_DIRECTORY}, where the SQLite database
 * and the run files go (15-storage.md), can be written. In the CLI the root
 * of the repository is the working directory (18-cli-config.md §26.1).
 *
 * - It writes for real, since permission bits do not tell the whole story
 *   (ACLs, read-only file systems, Windows): it creates a temporary
 *   directory in it and removes it.
 * - If the directory does not exist yet, it checks the working directory
 *   instead, where Atium would create it; it never creates it.
 * - A symlink must lead to a directory inside the working directory, as
 *   storage requires (15-storage.md, 06-security.md); the probe goes to its
 *   resolved target.
 *
 * @param cwd - Working directory, absolute.
 * @returns `pass`, or `fail` if the path is not a usable directory or cannot
 * be written.
 * @throws An error without a file system error code, or one removing the
 * probe after creating it.
 */
export async function checkStorage(cwd: string): Promise<StorageCheck> {
  const target = await probeTarget(cwd);
  if (target.kind === "done") {
    return target.check;
  }
  let probe: string;
  try {
    probe = await mkdtemp(path.join(target.directory, PROBE_PREFIX));
  } catch (error) {
    const where = target.exists ? DOCTOR.storage.directory : DOCTOR.storage.workingDirectory;
    return notWritable(where, error, target.exists);
  }
  // Outside the try: a probe that cannot be removed is not a permission
  // problem of the directory, and is left for the CLI to report.
  await rm(probe, { recursive: true, force: true });
  return {
    id: "storage",
    status: "pass",
    message: target.exists ? DOCTOR.storage.writable : DOCTOR.storage.creatable,
    details: { directory: ATIUM_DIRECTORY, exists: target.exists },
  };
}

async function probeTarget(cwd: string): Promise<Target> {
  const directory = path.join(cwd, ATIUM_DIRECTORY);
  let isLink: boolean;
  try {
    isLink = (await lstat(directory)).isSymbolicLink();
  } catch (error) {
    if (errnoCode(error) === "ENOENT") {
      return { kind: "probe", directory: cwd, exists: false };
    }
    return { kind: "done", check: notWritable(DOCTOR.storage.directory, error, null) };
  }
  let resolved = directory;
  if (isLink) {
    const link = await resolveLink(cwd, directory);
    if (link.kind === "done") {
      return link;
    }
    resolved = link.directory;
  }
  try {
    if (!(await stat(resolved)).isDirectory()) {
      return failed(DOCTOR.storage.notADirectory, DOCTOR.storage.notADirectoryHint);
    }
  } catch (error) {
    return { kind: "done", check: notWritable(DOCTOR.storage.directory, error, true) };
  }
  return { kind: "probe", directory: resolved, exists: true };
}

/** The target of the `.atium` symlink, if it exists and is inside the working directory. */
async function resolveLink(cwd: string, link: string): Promise<Target> {
  let target: string;
  try {
    target = await realpath(link);
  } catch (error) {
    if (errnoCode(error) === "ENOENT") {
      return failed(DOCTOR.storage.brokenLink, DOCTOR.storage.linkHint);
    }
    return { kind: "done", check: notWritable(DOCTOR.storage.directory, error, true) };
  }
  const relative = path.relative(await realpath(cwd), target);
  const inside =
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
  return inside
    ? { kind: "probe", directory: target, exists: true }
    : failed(DOCTOR.storage.outside, DOCTOR.storage.linkHint);
}

function failed(message: string, hint: string): Target {
  return {
    kind: "done",
    check: {
      id: "storage",
      status: "fail",
      message,
      hint,
      details: { directory: ATIUM_DIRECTORY, exists: true },
    },
  };
}

/** A `fail` for a file system error; any other error is rethrown. */
function notWritable(where: string, error: unknown, exists: boolean | null): StorageCheck {
  const code = errnoCode(error);
  if (code === undefined) {
    throw error;
  }
  return {
    id: "storage",
    status: "fail",
    message: DOCTOR.storage.notWritable(where, code),
    hint: DOCTOR.storage.notWritableHint,
    details: { directory: ATIUM_DIRECTORY, exists },
  };
}
