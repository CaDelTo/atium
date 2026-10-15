import { RunSchema } from "@atium/core";
import { HEAVY_TEST_TIMEOUT_MS } from "@atium/core/testing";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { rowsToRun, runToRows } from "./run-rows.js";
import { runWithEveryField } from "./runs.test-support.js";

// Every optional field of the full run, as a path from the run.
const OPTIONAL_FIELDS = [
  ["git", "headSha"],
  ["git", "branch"],
  ["git", "baseBranch"],
  ["ci", "runId"],
  ["ci", "runAttempt"],
  ["ci", "jobId"],
  ["ci", "shard"],
  ["ci", "prNumber"],
  ["ci"],
  ["environment", "framework", "version"],
  ["frameworkConfig", "retries"],
  ["frameworkConfig", "projects"],
  ["frameworkConfig"],
  ["results", 0, "test", "project"],
  ["results", 0, "test", "location"],
  ["results", 0, "attemptsDropped"],
  ["results", 0, "workerIndex"],
  ["results", 0, "sequenceInWorker"],
  ["results", 0, "bdd"],
  ["results", 0, "detailTruncated"],
  ["results", 0, "attempts", 0, "error", "stack"],
  ["results", 0, "attempts", 0, "error", "locator"],
  ["results", 0, "attempts", 0, "error", "matcher"],
  ["results", 0, "attempts", 0, "error"],
  ["results", 0, "attempts", 0, "network"],
  ["results", 0, "attempts", 0, "console"],
  ["results", 0, "attempts", 0, "pageErrors"],
  ["results", 0, "attempts", 0, "pageErrorsDropped"],
  ["results", 0, "attempts", 0, "artifacts"],
] as const;

/** A copy of `value` without the field at `path`; a missing parent leaves it as it is. */
function withoutField(value: unknown, path: readonly (string | number)[]): unknown {
  const parentPath = path.slice(0, -1);
  const key = path.at(-1);
  let parent: unknown = value;
  for (const step of parentPath) {
    parent = typeof parent === "object" && parent !== null ? Reflect.get(parent, step) : undefined;
  }
  if (typeof parent === "object" && parent !== null && key !== undefined) {
    Reflect.deleteProperty(parent, key);
  }
  return value;
}

describe("runToRows and rowsToRun", () => {
  // Slow next to the rest of the suite: room on a loaded CI runner (#99).
  it(
    "rebuild a run without adding or losing keys, whichever optional fields it has",
    () => {
      fc.assert(
        fc.property(fc.subarray([...OPTIONAL_FIELDS]), (removed) => {
          const input = removed.reduce<unknown>(
            (run, path) => withoutField(run, path),
            structuredClone(runWithEveryField()),
          );
          const run = RunSchema.parse(input);
          const rows = runToRows(run);

          expect(rowsToRun(rows.run, rows.testResults, rows.attempts)).toStrictEqual(run);
        }),
      );
    },
    HEAVY_TEST_TIMEOUT_MS,
  );

  it("stores an absent field as null, never as undefined", () => {
    const rows = runToRows(
      RunSchema.parse(withoutField(structuredClone(runWithEveryField()), ["ci"])),
    );

    expect(rows.run.ciProvider).toBeNull();
    expect(Object.values(rows.run)).not.toContain(undefined);
  });

  it("lists one catalog row per result and one error row per attempt with an error", () => {
    const run = runWithEveryField();

    const rows = runToRows(run);

    expect(rows.testCases.map(({ testId }) => testId)).toEqual(
      run.results.map(({ test }) => test.testId),
    );
    expect(rows.errors).toHaveLength(
      run.results.flatMap(({ attempts }) => attempts).filter(({ error }) => error !== undefined)
        .length,
    );
  });
});
