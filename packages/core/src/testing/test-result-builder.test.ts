import { describe, expect, it } from "vitest";
import { MODEL_LIST_CAPS } from "../defaults.js";
import { TestResultSchema } from "../model/test-result.js";
import { aTestCase } from "./test-case-builder.js";
import { aTestResult } from "./test-result-builder.js";

describe("aTestResult", () => {
  it("builds a valid, frozen result of a test that passed at the first try by default", () => {
    const result = aTestResult().build();

    expect(TestResultSchema.safeParse(result).success).toBe(true);
    expect(result.outcome).toBe("passed");
    expect(result.attempts.map((attempt) => attempt.status)).toEqual(["passed"]);
    expect(result.quarantined).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("builds the same result every time", () => {
    expect(aTestResult("checkout").failedThenPassed().build()).toStrictEqual(
      aTestResult("checkout").failedThenPassed().build(),
    );
  });

  it("uses the title for the test", () => {
    expect(aTestResult("checkout").build().test.titlePath).toEqual(["checkout"]);
  });

  it("passes at the first try with `passed`", () => {
    const result = aTestResult().failedAllAttempts(3).passed().build();

    expect(result.outcome).toBe("passed");
    expect(result.attempts).toHaveLength(1);
  });

  it("fails the original attempt and passes the retry with `failedThenPassed`", () => {
    const result = aTestResult().failedThenPassed().build();

    expect(TestResultSchema.safeParse(result).success).toBe(true);
    expect(result.outcome).toBe("flaky");
    expect(
      result.attempts.map(({ index, status, error }) => ({ index, status, hasError: !!error })),
    ).toEqual([
      { index: 0, status: "failed", hasError: true },
      { index: 1, status: "passed", hasError: false },
    ]);
  });

  it.each([1, 3, MODEL_LIST_CAPS.attempts])(
    "fails every one of %i attempts with `failedAllAttempts`",
    (count) => {
      const result = aTestResult().failedAllAttempts(count).build();

      expect(TestResultSchema.safeParse(result).success).toBe(true);
      expect(result.outcome).toBe("failed");
      expect(result.attempts.map((attempt) => attempt.index)).toEqual(
        Array.from({ length: count }, (_, index) => index),
      );
      expect(result.attempts.every((attempt) => attempt.status === "failed")).toBe(true);
      expect(result.attempts.every((attempt) => attempt.error !== undefined)).toBe(true);
    },
  );

  it.each([0, -1, 1.5, Number.NaN])("rejects %s attempts in `failedAllAttempts`", (count) => {
    expect(() => aTestResult().failedAllAttempts(count)).toThrow(RangeError);
  });

  it("fails to build with more attempts than the cap", () => {
    expect(() =>
      aTestResult()
        .failedAllAttempts(MODEL_LIST_CAPS.attempts + 1)
        .build(),
    ).toThrow();
  });

  it("sets the test with `forTest` and its file with `inFile`", () => {
    const test = aTestCase("login").inProject("webkit");

    expect(aTestResult().forTest(test).build().test).toStrictEqual(test.build());
    expect(aTestResult().inFile("tests/cart.spec.ts").build().test.file).toBe("tests/cart.spec.ts");
  });

  it("sets other fields with `with`", () => {
    const result = aTestResult().with({ quarantined: true, workerIndex: 2 }).build();

    expect(result).toMatchObject({ quarantined: true, workerIndex: 2 });
  });

  it("does not change the builder it was called on", () => {
    const original = aTestResult();
    const before = original.build();

    original.forTest(aTestCase("other"));
    original.inFile("tests/other.spec.ts");
    original.failedThenPassed();
    original.failedAllAttempts(2);
    original.with({ quarantined: true });

    expect(original.build()).toStrictEqual(before);
  });
});
