import type { z } from "zod";
import { TestCaseSchema } from "../model/test-case.js";
import type { TestCase } from "../model/test-case.js";
import { seededHex } from "./deterministic.js";

type TestCaseInput = z.input<typeof TestCaseSchema>;

type TestCaseState = Readonly<
  Omit<TestCaseInput, "testId"> & Partial<Pick<TestCaseInput, "testId">>
>;

/** Immutable builder of a {@link TestCase}. Every method returns a new builder. */
export interface TestCaseBuilder {
  /**
   * Sets the file of the test.
   *
   * @param file - POSIX path, relative to the repository root.
   * @returns A new builder with that file.
   */
  inFile(file: string): TestCaseBuilder;
  /**
   * Sets the Playwright project or browser.
   *
   * @param project - Name of the project.
   * @returns A new builder with that project.
   */
  inProject(project: string): TestCaseBuilder;
  /**
   * Replaces the tags.
   *
   * @param tags - Tags such as `@smoke`.
   * @returns A new builder with those tags.
   */
  withTags(...tags: readonly string[]): TestCaseBuilder;
  /**
   * Overrides any field of the test.
   *
   * @param patch - Fields to set. They are copied, so changing `patch`
   *   afterwards does not change the builder.
   * @returns A new builder with those fields.
   */
  with(patch: Partial<TestCaseInput>): TestCaseBuilder;
  /**
   * Builds the test, validated by {@link TestCaseSchema}.
   *
   * @returns A frozen test. Unless set, `testId` is derived from `project`,
   *   `file` and `titlePath`, so tests with different titles get different ids.
   *   It is not the `testId` of 02-data-model.md §9.3.
   * @throws `ZodError` if the fields set make the test invalid.
   */
  build(): TestCase;
}

function testCaseBuilder(state: TestCaseState): TestCaseBuilder {
  return Object.freeze({
    inFile: (file: string) => testCaseBuilder({ ...state, file }),
    inProject: (project: string) => testCaseBuilder({ ...state, project }),
    withTags: (...tags: readonly string[]) => testCaseBuilder({ ...state, tags }),
    with: (patch: Partial<TestCaseInput>) =>
      testCaseBuilder({ ...state, ...structuredClone(patch) }),
    build: () =>
      TestCaseSchema.parse({
        testId: seededHex(JSON.stringify([state.project, state.file, state.titlePath])),
        ...state,
      }),
  });
}

/**
 * Starts a {@link TestCaseBuilder} with valid, deterministic defaults.
 *
 * @example
 * ```ts
 * const test = aTestCase("checkout").inFile("tests/cart.spec.ts").withTags("@smoke").build();
 * ```
 *
 * @param title - Title of the test, the only level of its `titlePath`.
 * @returns A builder of a test with that title.
 */
export function aTestCase(title = "example test"): TestCaseBuilder {
  return testCaseBuilder({ file: "tests/example.spec.ts", titlePath: [title], tags: [] });
}
