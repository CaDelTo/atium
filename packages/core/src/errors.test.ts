import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { AtiumError, isAtiumError } from "./errors.js";

describe("AtiumError", () => {
  it("keeps the wrapped error as its cause", () => {
    const original = new SyntaxError("Unexpected token");

    const wrapped = new AtiumError("MODEL_INVALID", "Run file is not valid JSON.", {
      cause: original,
    });

    expect(wrapped.cause).toBe(original);
  });

  it("exposes its code, message, hint and name", () => {
    const error = new AtiumError("CONFIG_NOT_FOUND", "No atium.config.ts found.", {
      hint: "Run `atium init` to create one.",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AtiumError");
    expect(error.code).toBe("CONFIG_NOT_FOUND");
    expect(error.message).toBe("No atium.config.ts found.");
    expect(error.hint).toBe("Run `atium init` to create one.");
  });

  it("has no hint and no cause when none are given", () => {
    const error = new AtiumError("GIT_UNAVAILABLE", "git is not installed.");

    expect(error.hint).toBeUndefined();
    expect("cause" in error).toBe(false);
  });

  it("keeps a cause that is explicitly undefined, as a native Error does", () => {
    const error = new AtiumError("STORAGE_UNAVAILABLE", "Storage did not answer.", {
      cause: undefined,
    });

    expect("cause" in error).toBe(true);
    expect(error.cause).toBeUndefined();
  });
});

describe("isAtiumError", () => {
  it("accepts an AtiumError", () => {
    expect(isAtiumError(new AtiumError("STORAGE_CONFLICT", "Conflict."))).toBe(true);
  });

  it("accepts an AtiumError created by another copy of the package", () => {
    // Stands in for the AtiumError class of the other (ESM or CommonJS) build.
    class OtherCopyAtiumError extends Error {
      override readonly name = "AtiumError";
      readonly code = "ANALYZER_TIMEOUT";
      readonly hint = undefined;
    }

    const foreign = new OtherCopyAtiumError("Timed out.");

    expect(foreign).not.toBeInstanceOf(AtiumError);
    expect(isAtiumError(foreign)).toBe(true);
  });

  it("accepts an AtiumError created in another realm", () => {
    const foreign: unknown = runInNewContext(
      'Object.assign(new Error("Timed out."), { name: "AtiumError", code: "ANALYZER_TIMEOUT" })',
    );

    expect(foreign).not.toBeInstanceOf(Error);
    expect(isAtiumError(foreign)).toBe(true);
  });

  it.each([
    ["a plain Error", new Error("boom")],
    [
      "an Error named AtiumError without a code",
      Object.assign(new Error("x"), { name: "AtiumError" }),
    ],
    [
      "an Error named AtiumError with an unknown code",
      Object.assign(new Error("x"), { name: "AtiumError", code: "NOT_A_CODE" }),
    ],
    ["an object named AtiumError with a non-string code", { name: "AtiumError", code: 1 }],
    ["an object with a known code but no name", { code: "ANALYZER_TIMEOUT" }],
    ["a string", "AtiumError"],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_label, value) => {
    expect(isAtiumError(value)).toBe(false);
  });
});
