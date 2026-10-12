import { describe, expect, it } from "vitest";
import { AtiumError } from "./errors.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";

function describeResult(result: Result<number>): string {
  if (result.ok) {
    return `value ${String(result.value)}`;
  }
  return `error ${result.error.code}`;
}

describe("Result", () => {
  it("ok builds a success that carries the value", () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
    expect(describeResult(ok(42))).toBe("value 42");
  });

  it("err builds a failure that carries the error", () => {
    const error = new AtiumError("STORAGE_UNAVAILABLE", "Storage did not answer.");

    const result = err(error);

    expect(result).toEqual({ ok: false, error });
    expect(describeResult(result)).toBe("error STORAGE_UNAVAILABLE");
  });
});
