import { describe, expect, it } from "vitest";
import {
  fullTestCase,
  listOf,
  minimalTestCase,
  textOfBytes,
  without,
} from "./samples.test-support.js";
import { TestCaseSchema } from "./test-case.js";

describe("TestCaseSchema", () => {
  it.each([
    ["only the required fields", minimalTestCase()],
    ["every optional field", fullTestCase()],
    [
      "titlePath and tags at their caps",
      { ...minimalTestCase(), titlePath: listOf(20, "describe"), tags: listOf(50, "@tag") },
    ],
    ["a file name at the default text cap", { ...minimalTestCase(), file: textOfBytes(2048) }],
  ])("accepts a test case with %s", (_label, input) => {
    expect(TestCaseSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    ["testId is missing", without(minimalTestCase(), "testId")],
    ["file is missing", without(minimalTestCase(), "file")],
    ["testId is not 16 hex characters", { ...minimalTestCase(), testId: "login-test" }],
    ["tags is not a list", { ...minimalTestCase(), tags: "@smoke" }],
    [
      "titlePath has more than 20 levels",
      { ...minimalTestCase(), titlePath: listOf(21, "describe") },
    ],
    ["tags has more than 50 items", { ...minimalTestCase(), tags: listOf(51, "@tag") }],
    ["file is over the default text cap", { ...minimalTestCase(), file: textOfBytes(2049) }],
    ["a tag is over the default text cap", { ...minimalTestCase(), tags: [textOfBytes(2049)] }],
    ["the location line is 0", { ...minimalTestCase(), location: { line: 0, column: 1 } }],
    [
      "the location has an unknown key",
      { ...minimalTestCase(), location: { line: 1, column: 1, offset: 4 } },
    ],
    ["it has an unknown key", { ...minimalTestCase(), retries: 2 }],
    ["an optional field is explicitly undefined", { ...minimalTestCase(), project: undefined }],
  ])("rejects a test case when %s", (_label, input) => {
    expect(TestCaseSchema.safeParse(input).success).toBe(false);
  });
});
