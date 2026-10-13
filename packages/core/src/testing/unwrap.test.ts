import { describe, expect, it } from "vitest";
import { AtiumError } from "../errors.js";
import { err, ok } from "../result.js";
import { unwrap } from "./unwrap.js";

describe("unwrap", () => {
  it("returns the value of an ok result", () => {
    expect(unwrap(ok(42))).toBe(42);
  });

  it("fails with the code and message of an error result, keeping the error as its cause", () => {
    const error = new AtiumError("STORAGE_CONFLICT", "Run already exists.");

    expect(() => unwrap(err(error))).toThrow(
      expect.objectContaining({
        message: "Expected ok, got STORAGE_CONFLICT: Run already exists.",
        cause: error,
      }),
    );
  });
});
