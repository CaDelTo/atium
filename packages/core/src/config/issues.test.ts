import { z } from "zod";
import { describe, expect, it } from "vitest";
import { configInvalidError } from "./issues.js";

const SOURCE = '"atium.config.ts"';

/** A schema shaped like a future analyzer section: strict objects inside a record and an array. */
const NestedSchema = z.strictObject({
  analyzers: z
    .record(z.string(), z.strictObject({ windowDays: z.number().optional() }))
    .readonly()
    .optional(),
  routes: z.array(z.strictObject({ path: z.string() })).default([]),
  name: z.string().min(2).optional(),
});

function hintFor(value: unknown): string | undefined {
  const parsed = NestedSchema.safeParse(value, { reportInput: true });
  if (parsed.success) {
    throw new Error("Expected the value to be invalid.");
  }
  return configInvalidError(SOURCE, NestedSchema, parsed.error.issues).hint;
}

describe("configInvalidError", () => {
  it("suggests keys of strict objects inside a record", () => {
    expect(hintFor({ analyzers: { flaky: { windowDay: 30 } } })).toBe('Did you mean "windowDays"?');
  });

  it("suggests keys of strict objects inside an array", () => {
    expect(hintFor({ routes: [{ path: "/" }, { pth: "/cart" }] })).toBe('Did you mean "path"?');
  });

  it("only asks to remove the key when the path does not lead to an object schema", () => {
    const schema = z.strictObject({ count: z.number() });
    const issues = [
      { code: "unrecognized_keys" as const, keys: ["x"], path: ["count", "nested"], message: "" },
    ];

    expect(configInvalidError(SOURCE, schema, issues).hint).toBe('Remove "x".');
  });

  it("uses the message of the schema for issues other than types and unknown keys", () => {
    const parsed = NestedSchema.safeParse(
      { name: "a", routes: [{ path: 1 }] },
      { reportInput: true },
    );

    expect(parsed.error?.issues.map((issue) => issue.code)).toEqual(["invalid_type", "too_small"]);
    const error = configInvalidError(SOURCE, NestedSchema, parsed.error?.issues ?? []);
    expect(error.message.split("\n")).toEqual([
      `Invalid config in ${SOURCE}:`,
      '- "routes[0].path" must be a string (received 1).',
      `- "name": ${parsed.error?.issues[1]?.message ?? ""} (received "a").`,
    ]);
  });
});
