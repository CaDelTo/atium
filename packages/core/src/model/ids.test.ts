import { describe, expect, it } from "vitest";
import { FingerprintSchema, RunIdSchema, TestIdSchema } from "./ids.js";

describe("RunIdSchema", () => {
  it("accepts a UUID v7", () => {
    expect(RunIdSchema.safeParse("0199c2a4-5b3e-7c1d-8e2f-3a4b5c6d7e8f").success).toBe(true);
  });

  it.each([
    ["a UUID v4", "9b2f6c1e-4d3a-4f8b-9c7d-1e2f3a4b5c6d"],
    ["a non-UUID string", "run-1"],
    ["a number", 1],
  ])("rejects %s", (_label, value) => {
    expect(RunIdSchema.safeParse(value).success).toBe(false);
  });
});

describe.each([
  ["TestIdSchema", TestIdSchema],
  ["FingerprintSchema", FingerprintSchema],
])("%s", (_name, schema) => {
  it("accepts 16 lowercase hex characters", () => {
    expect(schema.safeParse("0123456789abcdef").success).toBe(true);
  });

  it.each([
    ["uppercase hex", "0123456789ABCDEF"],
    ["15 characters", "0123456789abcde"],
    ["17 characters", "0123456789abcdef0"],
    ["a non-hex character", "0123456789abcdeg"],
    ["a number", 123],
  ])("rejects %s", (_label, value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});
