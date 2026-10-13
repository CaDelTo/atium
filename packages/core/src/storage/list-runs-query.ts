import { z } from "zod";
import type { Run } from "../model/run.js";
import { quoteForMessage } from "../quote.js";
import type { ListRunsQuery } from "./storage.js";

/**
 * ISO 8601 date-time with `Z` or an offset. A date-time without a zone is
 * rejected because `Date.parse` would read it in the machine's time zone.
 */
const SinceSchema = z.iso.datetime({ offset: true });

interface StartedRun {
  readonly run: Run;
  readonly startMs: number;
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
 * @throws `RangeError` if `limit` is not an integer of at least 1 or `since`
 *   is not an ISO 8601 date-time with a zone: both are bugs in the caller.
 */
export function runSelector(query: ListRunsQuery): (runs: Iterable<Run>) => Run[] {
  if (!Number.isSafeInteger(query.limit) || query.limit < 1) {
    throw new RangeError(
      `listRuns limit must be an integer of at least 1, got ${String(query.limit)}.`,
    );
  }
  const { branch, limit } = query;
  const sinceMs = parseSince(query.since);
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
