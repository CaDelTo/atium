import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { redactFieldsWith } from "./fields.js";
import type { FieldRedaction } from "./fields.js";

// Fake redaction: `password` is sensitive and strings are upper-cased, so each
// effect is visible in the output.
const redaction: FieldRedaction = {
  isSensitive: (key) => key === "password",
  redactText: (text) => text.toUpperCase(),
};

function redact(value: unknown): unknown {
  return redactFieldsWith(value, redaction);
}

describe("redactFieldsWith", () => {
  it.each([
    ["a string", "abc", "ABC"],
    ["a number", 1, 1],
    ["a boolean", true, true],
    ["null", null, null],
    ["undefined", undefined, undefined],
  ])("handles %s at the root", (_label, value, expected) => {
    expect(redact(value)).toBe(expected);
  });

  it("replaces the value of a sensitive key whatever its type", () => {
    expect(redact({ password: { nested: "x" }, other: { password: 42 } })).toEqual({
      password: "[REDACTED]",
      other: { password: "[REDACTED]" },
    });
  });

  it("redacts strings in other keys and in arrays at any depth", () => {
    expect(redact({ a: ["x", { b: "y" }], c: 3, d: false, e: null })).toEqual({
      a: ["X", { b: "Y" }],
      c: 3,
      d: false,
      e: null,
    });
  });

  it("does not redact keys, only values", () => {
    expect(redact({ name: "v" })).toEqual({ name: "V" });
  });

  it("does not change its input", () => {
    const input = { password: "secret", list: ["a"], nested: { b: "c" } };
    const snapshot = structuredClone(input);

    const output = redact(input);

    expect(input).toEqual(snapshot);
    expect(output).not.toBe(input);
  });

  it("keeps a __proto__ key from JSON as an own property", () => {
    const input: unknown = JSON.parse('{"__proto__": {"password": "x"}, "a": "b"}');

    const output = redact(input);

    expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
    expect(Object.keys(output as object)).toEqual(["__proto__", "a"]);
    expect(Object.getOwnPropertyDescriptor(output, "__proto__")?.value).toEqual({
      password: "[REDACTED]",
    });
  });

  it("copies objects without a prototype", () => {
    const input: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    input["a"] = "b";

    expect(redact(input)).toEqual({ a: "B" });
  });

  it("keeps values that are not plain objects or arrays as they are", () => {
    const date = new Date(0);
    const map = new Map([["password", "x"]]);

    const output = redact({ date, map }) as Record<string, unknown>;

    expect(output["date"]).toBe(date);
    expect(output["map"]).toBe(map);
  });

  it("copies a container reached twice once, keeping cycles", () => {
    const shared = { v: "x" };
    const input: Record<string, unknown> = { first: shared, second: shared };
    input["self"] = input;

    const output = redact(input) as Record<string, unknown>;

    expect(output["first"]).toBe(output["second"]);
    expect(output["first"]).toEqual({ v: "X" });
    expect(output["self"]).toBe(output);
  });

  it("does not overflow the stack on deeply nested input", () => {
    const depth = 100_000;
    const input: unknown = JSON.parse(`${"[".repeat(depth)}"x"${"]".repeat(depth)}`);

    let output = redact(input);
    let levels = 0;
    while (Array.isArray(output)) {
      output = (output as unknown[])[0];
      levels += 1;
    }

    expect(levels).toBe(depth);
    expect(output).toBe("X");
  });

  it("is idempotent on JSON values", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const once = redact(value);

        expect(redact(once)).toEqual(once);
      }),
      { seed: 20261012, numRuns: 500 },
    );
  });
});
