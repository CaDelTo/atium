import type { RunId } from "../model/ids.js";
import type { Run } from "../model/run.js";
import type { Result } from "../result.js";

/** Which runs {@link StorageReader.listRuns} returns. */
export interface ListRunsQuery {
  /**
   * Only runs whose `git.branch` is exactly this value. Runs without a branch
   * never match. Omit it to list runs of every branch.
   */
  readonly branch?: string;
  /**
   * Only runs whose `startedAt` is at or after this instant, as an ISO 8601
   * date-time with `Z` or an offset. Compared as instants, not as text. A
   * date-time without a zone is rejected: it would depend on the machine's
   * time zone.
   */
  readonly since?: string;
  /** Maximum number of runs returned. An integer from 1 to `Number.MAX_SAFE_INTEGER`. */
  readonly limit: number;
}

/**
 * Read side of a storage backend. Analyzers receive only this side
 * (interface segregation): they can read the history but not write it or
 * close the storage.
 *
 * Every backend passes the storage contract suite in
 * `packages/core/test-contracts/storage.contract.ts`.
 */
export interface StorageReader {
  /**
   * Reads one run.
   *
   * @param id - Id of the run.
   * @returns The run, `ok(undefined)` if no run has that id,
   *   `STORAGE_UNAVAILABLE` if the storage cannot be read or was closed, or,
   *   in a backend that validates what it reads, `MODEL_INVALID` if the
   *   stored run no longer matches `RunSchema`.
   */
  getRun(id: RunId): Promise<Result<Run | undefined>>;
  /**
   * Lists the runs that match `query`, most recent first: by `startedAt`
   * descending, and by `id` descending when two runs started at the same
   * instant.
   *
   * @param query - Filters and the maximum number of runs.
   * @returns At most `query.limit` runs, `STORAGE_UNAVAILABLE` if the
   *   storage cannot be read or was closed, or, in a backend that validates
   *   what it reads, `MODEL_INVALID` if a matching run no longer matches
   *   `RunSchema`.
   * @throws `RangeError` if `query.limit` is not an integer from 1 to
   *   `Number.MAX_SAFE_INTEGER` or `query.since` is not a date-time with a
   *   zone: both are bugs in the caller. The query is checked first, so this
   *   happens even after `close`.
   */
  listRuns(query: ListRunsQuery): Promise<Result<readonly Run[]>>;
}

/** Write side of a storage backend. Runs are immutable once written (ADR-0007). */
export interface StorageWriter {
  /**
   * Stores a run.
   *
   * @param run - The run to store.
   * @returns `ok` once the run can be read back, `STORAGE_CONFLICT` if a run
   *   with the same id already exists (the stored one is kept),
   *   `STORAGE_UNAVAILABLE` if the storage cannot be written or was closed,
   *   or, in a backend that validates what it writes, `MODEL_INVALID` if the
   *   run does not match `RunSchema` or the backend cannot store it as it is
   *   (nothing is stored).
   */
  writeRun(run: Run): Promise<Result<void>>;
}

/**
 * A storage backend as its owner sees it: both sides plus `close`. The owner
 * (the CLI or a reporter) closes it; code that only receives a
 * {@link StorageReader} or {@link StorageWriter} cannot.
 */
export interface Storage extends StorageReader, StorageWriter {
  /**
   * Releases the storage's resources. Calling it again does nothing. After
   * it, every operation with valid arguments returns `STORAGE_UNAVAILABLE`.
   */
  close(): Promise<void>;
}
