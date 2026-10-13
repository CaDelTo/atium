import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach } from "vitest";

/**
 * Gives each test of the file a new empty directory, removed after it even
 * if the test took away its permissions.
 *
 * @param prefix - Start of the directory name, such as `"atium-doctor-"`.
 * @returns A function that gives the directory of the running test.
 */
export function useTempDir(prefix: string): () => string {
  let directory: string | undefined;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), prefix));
  });
  afterEach(async () => {
    if (directory !== undefined) {
      await chmod(directory, 0o700);
      // On Windows a process that has just exited can still hold the
      // directory for a moment (EBUSY), so the removal is retried.
      await rm(directory, { recursive: true, force: true, maxRetries: 10 });
      directory = undefined;
    }
  });
  return () => {
    if (directory === undefined) {
      throw new Error("useTempDir gives a directory only while a test runs.");
    }
    return directory;
  };
}
