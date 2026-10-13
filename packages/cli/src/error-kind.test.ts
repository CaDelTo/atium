import { AtiumError, ERROR_CODES } from "@atium/core";
import { describe, expect, it } from "vitest";
import { exitCodeFor, isUserError } from "./error-kind.js";
import { UsageError } from "./usage-error.js";

describe("isUserError", () => {
  it("accepts a UsageError", () => {
    expect(isUserError(new UsageError("message", "hint"))).toBe(true);
  });

  it.each(ERROR_CODES.map((code) => [code]))("classifies the AtiumError code %s", (code) => {
    const expected = code === "CONFIG_INVALID" || code === "CONFIG_NOT_FOUND";

    expect(isUserError(new AtiumError(code, "message"))).toBe(expected);
  });

  it.each([
    ["a plain Error", new Error("boom")],
    ["a value that is not an Error", "boom"],
    ["undefined", undefined],
  ])("rejects %s, which is internal", (_case, error) => {
    expect(isUserError(error)).toBe(false);
  });
});

describe("exitCodeFor", () => {
  it.each([
    ["usage", false, 2],
    ["usage", true, 2],
    ["internal", false, 0],
    ["internal", true, 3],
  ] as const)("returns, for a %s error with strict %s, %i", (kind, strict, code) => {
    expect(exitCodeFor(kind, strict)).toBe(code);
  });
});
