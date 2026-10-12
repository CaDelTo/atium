import { describe, expect, it } from "vitest";
import { ErrorOccurrenceSchema } from "./error-occurrence.js";
import { fullError, minimalError, textOfBytes, without } from "./samples.test-support.js";

describe("ErrorOccurrenceSchema", () => {
  it.each([
    ["only the required fields", minimalError()],
    ["every optional field", fullError()],
    [
      "message, stack and matcher values at their caps",
      {
        ...minimalError(),
        message: textOfBytes(2048),
        stack: textOfBytes(8192),
        matcher: { name: "toEqual", expected: textOfBytes(2048), actual: textOfBytes(2048) },
      },
    ],
  ])("accepts an error with %s", (_label, input) => {
    expect(ErrorOccurrenceSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    ["message is missing", without(minimalError(), "message")],
    ["fingerprint is missing", without(minimalError(), "fingerprint")],
    ["fingerprint is not 16 hex characters", { ...minimalError(), fingerprint: "abc" }],
    ["failedAtMs is not a number", { ...minimalError(), failedAtMs: "5000" }],
    ["failedAtMs is negative", { ...minimalError(), failedAtMs: -1 }],
    ["failedAtMs is not whole milliseconds", { ...minimalError(), failedAtMs: 1.5 }],
    ["message is over 2 KiB", { ...minimalError(), message: textOfBytes(2049) }],
    ["stack is over 8 KiB", { ...minimalError(), stack: textOfBytes(8193) }],
    [
      "matcher.expected is over 2 KiB",
      { ...minimalError(), matcher: { name: "toEqual", expected: textOfBytes(2049) } },
    ],
    [
      "matcher.actual is over 2 KiB",
      { ...minimalError(), matcher: { name: "toEqual", actual: textOfBytes(2049) } },
    ],
    ["matcher has no name", { ...minimalError(), matcher: { expected: "a" } }],
    ["type is over the default text cap", { ...minimalError(), type: textOfBytes(2049) }],
    ["it has an unknown key", { ...minimalError(), severity: "high" }],
  ])("rejects an error when %s", (_label, input) => {
    expect(ErrorOccurrenceSchema.safeParse(input).success).toBe(false);
  });
});
