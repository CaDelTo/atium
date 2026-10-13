import { z } from "zod";
import type { Run } from "../model/run.js";
import { quoteForMessage } from "../quote.js";
import type { ListRunsQuery } from "./storage.js";

/**
 * ISO 8601 date-time with `Z` or an offset. A date-time without a zone is
 * rejected because `Date.parse` would read it in the machine's time zone.
 */
const SinceSchema = z.iso.datetime({ offset: true });

/** A {@link ListRunsQuery} checked by {@link parseListRunsQuery}. */
export interface ParsedListRunsQuery {
  /** Exact `git.branch` to match; absent to match every run. */
  readonly branch?: string;
  /** `since` in milliseconds since the epoch; absent to match every run. */
  readonly sinceMs?: number;
  /** Maximum number of runs: an integer from 1 to `Number.MAX_SAFE_INTEGER`. */
  readonly limit: number;
}

interface StartedRun {
  readonly run: Run;
  readonly startMs: number;
}

/**
 * Checks a {@link ListRunsQuery} so every backend rejects the same queries
 * before doing anything else, even after `close`.
 *
 * @param query - Query passed to `listRuns`.
 * @returns The query with `since` as an instant in milliseconds.
 * @throws `RangeError` if `limit` is not an integer from 1 to
 *   `Number.MAX_SAFE_INTEGER` or `since` is not an ISO 8601 date-time with a
 *   zone: both are bugs in the caller.
 *
 * @example
 * ```ts
 * parseListRunsQuery({ since: "2026-10-08T16:03:00+02:00", limit: 10 });
 * // { sinceMs: 1791468180000, limit: 10 }
 * ```
 */
export function parseListRunsQuery(query: ListRunsQuery): ParsedListRunsQuery {
  if (!Number.isSafeInteger(query.limit) || query.limit < 1) {
    throw new RangeError(
      `listRuns limit must be an integer from 1 to ${String(Number.MAX_SAFE_INTEGER)}, got ${String(query.limit)}.`,
    );
  }
  const sinceMs = parseSince(query.since);
  return {
    ...(query.branch === undefined ? {} : { branch: query.branch }),
    ...(sinceMs === undefined ? {} : { sinceMs }),
    limit: query.limit,
  };
}

/**
 * Checks a {@link ListRunsQuery} and returns the function that applies it,
 * so a backend that holds runs in memory can reject a bad query before doing
 * anything else.
 *
 * The selection keeps the runs that match `branch` (exact match with
 * `git.branch`) and `since` (inclusive, compared as instants), sorts them by
 * `startedAt` descending and then by `id` descending, and keeps the first
 * `limit`.
 *
 * @param query - Query passed to `listRuns`.
 * @returns A function that selects the matching runs from a collection.
 * @throws `RangeError` if the query is invalid (see {@link parseListRunsQuery}).
 */
export function runSelector(query: ListRunsQuery): (runs: Iterable<Run>) => Run[] {
  const { branch, sinceMs, limit } = parseListRunsQuery(query);
  return (runs) =>
    Array.from(runs, (run) => ({ run, startMs: Date.parse(run.startedAt) }))
      .filter(
        ({ run, startMs }) =>
          (branch === undefined || run.git.branch === branch) &&
          (sinceMs === undefined || startMs >= sinceMs),
      )
      .sort(newestFirst)
      .slice(0, limit)
      .map(({ run }) => run);
}

function parseSince(since: string | undefined): number | undefined {
  if (since === undefined) {
    return undefined;
  }
  if (!SinceSchema.safeParse(since).success) {
    throw new RangeError(
      `listRuns since must be an ISO 8601 date-time with Z or an offset, got ${quoteForMessage(since)}.`,
    );
  }
  return Date.parse(since);
}

function newestFirst(a: StartedRun, b: StartedRun): number {
  const byStart = b.startMs - a.startMs;
  if (byStart !== 0) {
    return byStart;
  }
  if (a.run.id === b.run.id) {
    return 0;
  }
  return a.run.id < b.run.id ? 1 : -1;
}
