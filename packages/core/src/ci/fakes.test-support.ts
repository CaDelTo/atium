import { AtiumError } from "../errors.js";
import type { GitClient } from "./git-client.js";

/**
 * {@link GitClient} that records when each query starts and ends, with a turn
 * of the event loop in between, so overlapping queries show up as two starts
 * in a row.
 */
export class RecordingGitClient implements GitClient {
  readonly events: string[] = [];
  readonly #failing: keyof GitClient | undefined;

  /** @param failing - Query that throws `GIT_UNAVAILABLE` once it ends. */
  constructor(failing?: keyof GitClient) {
    this.#failing = failing;
  }

  headCommit(): Promise<string> {
    return this.#answer("headCommit", "0123456789abcdef0123456789abcdef01234567");
  }

  currentBranch(): Promise<string | undefined> {
    return this.#answer("currentBranch", "main");
  }

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
