import { describe, expect, it } from "vitest";
import {
  fullResult,
  listOf,
  minimalAttempt,
  minimalResult,
  without,
} from "./samples.test-support.js";
import { TEST_OUTCOMES, TestResultSchema } from "./test-result.js";

describe("TestResultSchema", () => {
  it.each([
    ["only the required fields", minimalResult()],
    ["every optional field", fullResult()],
    ["attempts at their cap", { ...minimalResult(), attempts: listOf(20, minimalAttempt()) }],
  ])("accepts a result with %s", (_label, input) => {
    expect(TestResultSchema.safeParse(input).success).toBe(true);
  });

  it.each(TEST_OUTCOMES)("accepts a result with outcome %s", (outcome) => {
    expect(TestResultSchema.safeParse({ ...minimalResult(), outcome }).success).toBe(true);
  });

  it.each([
    ["test is missing", without(minimalResult(), "test")],
    ["quarantined is missing", without(minimalResult(), "quarantined")],
    ["outcome is not a known outcome", { ...minimalResult(), outcome: "broken" }],
    ["quarantined is not a boolean", { ...minimalResult(), quarantined: "no" }],
    [
      "attempts has more than 20 items",
      { ...minimalResult(), attempts: listOf(21, minimalAttempt()) },
    ],
    ["attemptsDropped is 0", { ...minimalResult(), attemptsDropped: 0 }],
    ["attemptsDropped is negative", { ...minimalResult(), attemptsDropped: -1 }],
    ["detailTruncated is false", { ...minimalResult(), detailTruncated: false }],
    ["workerIndex is negative", { ...minimalResult(), workerIndex: -1 }],
    [
      "the test case is invalid",
      { ...minimalResult(), test: without(minimalResult().test, "file") },
    ],
    ["it has an unknown key", { ...minimalResult(), retries: 1 }],
  ])("rejects a result when %s", (_label, input) => {
    expect(TestResultSchema.safeParse(input).success).toBe(false);
  });
});
