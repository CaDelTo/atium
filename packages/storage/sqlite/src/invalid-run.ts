import { AtiumError, describeIssues, RunSchema } from "@atium/core";
import type { Run } from "@atium/core";

const HINT_ADAPTER_BUG =
  "This is a bug in the adapter that built the run. Report it with this message.";

/**
 * Checks that a run can be stored: it matches `RunSchema`, and its rows have
 * unique keys (a `testId` once per run, an attempt `index` once per result).
 *
 * @param run - The run passed to `writeRun`.
 * @returns `MODEL_INVALID` describing the first problem, or `undefined` if
 *   the run can be stored.
 */
export function invalidRunError(run: Run): AtiumError | undefined {
  const parsed = RunSchema.safeParse(run);
  if (!parsed.success) {
    // Not the `ZodError` as `cause`: its message lists every issue with paths
    // that may hold run data, and loggers print the cause.
    return new AtiumError(
      "MODEL_INVALID",
      `The run cannot be stored: it does not match the run schema (${describeIssues(parsed.error.issues)}).`,
      { hint: HINT_ADAPTER_BUG },
    );
  }
  const testIds = new Set<string>();
  for (const { test, attempts } of run.results) {
    if (testIds.has(test.testId)) {
      return new AtiumError(
        "MODEL_INVALID",
        `Run ${run.id} cannot be stored: test ${test.testId} has more than one result.`,
        { hint: HINT_ADAPTER_BUG },
      );
    }
    testIds.add(test.testId);
    const indexes = new Set(attempts.map(({ index }) => index));
    if (indexes.size < attempts.length) {
      return new AtiumError(
        "MODEL_INVALID",
        `Run ${run.id} cannot be stored: test ${test.testId} repeats an attempt index.`,
        { hint: HINT_ADAPTER_BUG },
      );
    }
  }
  return undefined;
}
