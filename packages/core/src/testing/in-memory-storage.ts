import { AtiumError } from "../errors.js";
import type { RunId } from "../model/ids.js";
import type { Run } from "../model/run.js";
import { quoteForMessage } from "../quote.js";
import { err, ok } from "../result.js";
import type { Result } from "../result.js";
import { runSelector } from "../storage/list-runs-query.js";
import type { ListRunsQuery, Storage } from "../storage/storage.js";

/**
 * {@link Storage} that keeps runs in memory, for tests that need a history
 * without a real backend. It passes the storage contract suite.
 *
 * Runs are copied on write and on read, so changing a run after writing it
 * or after reading it does not change what is stored.
 *
 * @example
 * ```ts
 * const storage = new InMemoryStorage();
 * await storage.writeRun(aRun().withSeed(1).build());
 * const recent = await storage.listRuns({ branch: "main", limit: 10 });
 * ```
 */
export class InMemoryStorage implements Storage {
  readonly #runs = new Map<RunId, Run>();
  #closed = false;

  /**
   * Stores a copy of `run`.
   *
   * @param run - The run to store.
   * @returns `ok`, `STORAGE_CONFLICT` if the id is taken, or
   *   `STORAGE_UNAVAILABLE` after {@link InMemoryStorage.close}.
   */
  writeRun(run: Run): Promise<Result<void>> {
    return this.#whenOpen(() => {
      if (this.#runs.has(run.id)) {
        return err(
          new AtiumError(
            "STORAGE_CONFLICT",
            `Run ${quoteForMessage(run.id)} already exists; runs are never replaced.`,
            { hint: "Give each run a new id." },
          ),
        );
      }
      this.#runs.set(run.id, structuredClone(run));
      return ok(undefined);
    });
  }

  /**
   * Reads a copy of one run.
   *
   * @param id - Id of the run.
   * @returns The run, `ok(undefined)` if there is none, or
   *   `STORAGE_UNAVAILABLE` after {@link InMemoryStorage.close}.
   */
  getRun(id: RunId): Promise<Result<Run | undefined>> {
    return this.#whenOpen(() => {
      const run = this.#runs.get(id);
      return ok(run === undefined ? undefined : structuredClone(run));
    });
  }

  /**
   * Lists copies of the matching runs, most recent first.
   *
   * @param query - Filters and the maximum number of runs.
   * @returns The runs, or `STORAGE_UNAVAILABLE` after
   *   {@link InMemoryStorage.close}.
   * @throws `RangeError` if the query is invalid, even after
   *   {@link InMemoryStorage.close}.
   */
  async listRuns(query: ListRunsQuery): Promise<Result<readonly Run[]>> {
    const select = runSelector(query);
    return this.#whenOpen(() => ok(structuredClone(select(this.#runs.values()))));
  }

  /** Marks the storage as closed. Calling it again does nothing. */
  async close(): Promise<void> {
    await Promise.resolve();
    this.#closed = true;
  }

  /**
   * Runs `action` unless the storage is closed. It yields once first, like a
   * real backend would, so concurrent calls interleave in tests.
   */
  async #whenOpen<T>(action: () => Result<T>): Promise<Result<T>> {
    await Promise.resolve();
    return this.#closed ? err(closedError()) : action();
  }
}

function closedError(): AtiumError {
  return new AtiumError("STORAGE_UNAVAILABLE", "The storage was closed.", {
    hint: "This is a bug: do not use a storage after closing it.",
  });
}
