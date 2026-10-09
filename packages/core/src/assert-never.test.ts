import { describe, expect, it } from "vitest";
import { assertNever } from "./assert-never.js";

type Shape = { kind: "circle" } | { kind: "square" };

function describeShape(shape: Shape): string {
  switch (shape.kind) {
    case "circle":
      return "round";
    case "square":
      return "boxy";
    default:
      return assertNever(shape);
  }
}

function unsafeCast<T>(value: unknown): T {
  // Simulates data that bypassed validation and does not match its declared type.
  return value as T;
}

describe("assertNever", () => {
  it("is not reached when every union member is handled", () => {
    expect(describeShape({ kind: "circle" })).toBe("round");
    expect(describeShape({ kind: "square" })).toBe("boxy");
  });

  it("throws with the unexpected value serialized in the message", () => {
    const unexpected = unsafeCast<Shape>({ kind: "triangle" });

    expect(() => describeShape(unexpected)).toThrow(
      new Error('Unexpected value: {"kind":"triangle"}'),
    );
  });
});
