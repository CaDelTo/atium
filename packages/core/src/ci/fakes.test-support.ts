import { writeFile } from "node:fs/promises";
import * as path from "node:path";
import { AtiumError } from "../errors.js";
import type { GitClient } from "./git-client.js";

/**
 * {@link GitClient} that records when each query starts and ends, with a turn
 * of the event loop in between, so overlapping queries show up as two starts
 * in a row.
 */
export class RecordingGitClient implements GitClient {
  /** `start:<query>` and `end:<query>` for every query so far, in order. */
  readonly events: string[] = [];
  readonly #failing: keyof GitClient | undefined;

  /** @param failing - Query that throws `GIT_UNAVAILABLE` once it ends. */
  constructor(failing?: keyof GitClient) {
    this.#failing = failing;
  }

  /** @returns A fixed commit. */
  headCommit(): Promise<string> {
    return this.#answer("headCommit", "0123456789abcdef0123456789abcdef01234567");
  }

  /** @returns `main`. */
  currentBranch(): Promise<string | undefined> {
    return this.#answer("currentBranch", "main");
  }

  /** @returns `false`. */
  isDirty(): Promise<boolean> {
    return this.#answer("isDirty", false);
  }

  async #answer<T>(query: keyof GitClient, value: T): Promise<T> {
    this.events.push(`start:${query}`);
    await new Promise((resolve) => setImmediate(resolve));
    this.events.push(`end:${query}`);
    if (query === this.#failing) {
      throw new AtiumError("GIT_UNAVAILABLE", "Git is not available in this fake.", {
        hint: "Do not make this query fail.",
      });
    }
    return value;
  }
}

/**
 * Writes a GitHub Actions event payload as JSON.
 *
 * @param directory - Directory of the file, such as the test's temporary `cwd`.
 * @param payload - The event payload.
 * @returns Path of the written `event.json`, for `GITHUB_EVENT_PATH`.
 */
export async function writeEvent(directory: string, payload: unknown): Promise<string> {
  const file = path.join(directory, "event.json");
  await writeFile(file, JSON.stringify(payload));
  return file;
}
