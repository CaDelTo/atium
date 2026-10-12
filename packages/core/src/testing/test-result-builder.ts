import type { z } from "zod";
import { TestResultSchema } from "../model/test-result.js";
import type { TestResult } from "../model/test-result.js";
import { anAttempt } from "./attempt-builder.js";
import type { AttemptBuilder } from "./attempt-builder.js";
import { aTestCase } from "./test-case-builder.js";
import type { TestCaseBuilder } from "./test-case-builder.js";

type TestResultInput = z.input<typeof TestResultSchema>;
type TestResultPatch = Partial<Omit<TestResultInput, "test" | "attempts">>;

type TestResultState = Readonly<
  Omit<TestResultInput, "test" | "attempts"> & {
    test: TestCaseBuilder;
    attempts: readonly AttemptBuilder[];
  }
>;

/** Immutable builder of a {@link TestResult}. Every method returns a new builder. */
export interface TestResultBuilder {
  /**
   * Replaces the test the result belongs to.
   *
   * @param test - Builder of the test.
   * @returns A new builder for that test.
   */
  forTest(test: TestCaseBuilder): TestResultBuilder;
  /**
   * Sets the file of the test.
   *
   * @param file - POSIX path, relative to the repository root.
   * @returns A new builder with that file.
   */
  inFile(file: string): TestResultBuilder;
  /**
   * Makes the test pass at the first try.
   *
   * @returns A new builder with outcome `passed` and one passed attempt.
   */
  passed(): TestResultBuilder;
  /**
   * Makes the test fail and then pass in a retry.
   *
   * @returns A new builder with outcome `flaky`, a failed original attempt
   *   and a passed retry.
   */
  failedThenPassed(): TestResultBuilder;
  /**
   * Makes the test fail in every attempt.
   *
   * @param attempts - Number of attempts, the original one included.
   * @returns A new builder with outcome `failed` and `attempts` failed attempts.
   * @throws `RangeError` if `attempts` is not an integer of at least 1.
   */
  failedAllAttempts(attempts: number): TestResultBuilder;
  /**
   * Overrides any field of the result except `test` and `attempts`, which the
   * other methods set.
   *
   * @param patch - Fields to set. They are copied, so changing `patch`
   *   afterwards does not change the builder.
   * @returns A new builder with those fields.
   */
  with(patch: TestResultPatch): TestResultBuilder;
  /**
   * Builds the result, validated by {@link TestResultSchema}.
   *
   * @returns A frozen result.
   * @throws `ZodError` if the fields set make the result invalid, such as more
   *   attempts than the cap.
   */
  build(): TestResult;
}

function testResultBuilder(state: TestResultState): TestResultBuilder {
  return Object.freeze({
    forTest: (test: TestCaseBuilder) => testResultBuilder({ ...state, test }),
    inFile: (file: string) => testResultBuilder({ ...state, test: state.test.inFile(file) }),
    passed: () => testResultBuilder({ ...state, outcome: "passed", attempts: [anAttempt()] }),
    failedThenPassed: () =>
      testResultBuilder({
        ...state,
        outcome: "flaky",
        attempts: [anAttempt().failed(), anAttempt().withIndex(1)],
      }),
    failedAllAttempts: (attempts: number) => {
      if (!Number.isInteger(attempts) || attempts < 1) {
        throw new RangeError(
          `failedAllAttempts needs a whole number of attempts of at least 1, got ${String(attempts)}`,
        );
      }
      return testResultBuilder({
        ...state,
        outcome: "failed",
        attempts: Array.from({ length: attempts }, (_, index) =>
          anAttempt().withIndex(index).failed(),
        ),
      });
    },
    with: (patch: TestResultPatch) => testResultBuilder({ ...state, ...structuredClone(patch) }),
    build: () =>
      TestResultSchema.parse({
        ...state,
        test: state.test.build(),
        attempts: state.attempts.map((attempt) => attempt.build()),
      }),
  });
}

/**
 * Starts a {@link TestResultBuilder} of a test that passed at the first try,
 * with valid, deterministic defaults.
 *
 * @example
 * ```ts
 * const result = aTestResult("checkout").failedThenPassed().build();
 * ```
 *
 * @param title - Title of the test, the only level of its `titlePath`.
 * @returns A builder of a result for a test with that title.
 */
export function aTestResult(title?: string): TestResultBuilder {
  return testResultBuilder({
    test: aTestCase(title),
    outcome: "passed",
    attempts: [anAttempt()],
    quarantined: false,
  });
}
