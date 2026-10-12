import { describe, expect, it } from "vitest";
import { ATTEMPT_STATUSES, AttemptSchema } from "./attempt.js";
import {
  fullAttempt,
  listOf,
  minimalAttempt,
  textOfBytes,
  without,
} from "./samples.test-support.js";

describe("AttemptSchema", () => {
  it.each([
    ["only the required fields", minimalAttempt()],
    ["every optional field", fullAttempt()],
    [
      "page errors and console samples at their caps",
      {
        ...minimalAttempt(),
        console: { errors: 5, warnings: 0, samples: listOf(5, textOfBytes(1024)) },
        pageErrors: listOf(20, textOfBytes(2048)),
      },
    ],
  ])("accepts an attempt with %s", (_label, input) => {
    expect(AttemptSchema.safeParse(input).success).toBe(true);
  });

  it.each(ATTEMPT_STATUSES)("accepts an attempt with status %s", (status) => {
    expect(AttemptSchema.safeParse({ ...minimalAttempt(), status }).success).toBe(true);
  });

  it.each([
    ["status is missing", without(minimalAttempt(), "status")],
    ["startedAt is missing", without(minimalAttempt(), "startedAt")],
    ["status is not a known status", { ...minimalAttempt(), status: "retried" }],
    ["index is negative", { ...minimalAttempt(), index: -1 }],
    ["durationMs is not a number", { ...minimalAttempt(), durationMs: "1200" }],
    [
      "startedAt is not in UTC",
      { ...minimalAttempt(), startedAt: "2026-10-08T16:03:00.000+02:00" },
    ],
    [
      "pageErrors has more than 20 items",
      { ...minimalAttempt(), pageErrors: listOf(21, "TypeError") },
    ],
    ["a page error is over 2 KiB", { ...minimalAttempt(), pageErrors: [textOfBytes(2049)] }],
    ["pageErrorsDropped is 0", { ...minimalAttempt(), pageErrorsDropped: 0 }],
    ["pageErrorsDropped is negative", { ...minimalAttempt(), pageErrorsDropped: -1 }],
    [
      "console has more than 5 samples",
      { ...minimalAttempt(), console: { errors: 6, warnings: 0, samples: listOf(6, "error") } },
    ],
    [
      "a console sample is over 1 KiB",
      { ...minimalAttempt(), console: { errors: 1, warnings: 0, samples: [textOfBytes(1025)] } },
    ],
    ["console has no warnings count", { ...minimalAttempt(), console: { errors: 0, samples: [] } }],
    [
      "an artifact path is over the default text cap",
      { ...minimalAttempt(), artifacts: { trace: textOfBytes(2049) } },
    ],
    ["artifacts has an unknown key", { ...minimalAttempt(), artifacts: { har: "network.har" } }],
    ["the error is invalid", { ...minimalAttempt(), error: { message: "Boom" } }],
    ["it has an unknown key", { ...minimalAttempt(), retry: 1 }],
  ])("rejects an attempt when %s", (_label, input) => {
    expect(AttemptSchema.safeParse(input).success).toBe(false);
  });
});
