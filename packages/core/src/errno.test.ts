import { describe, expect, it } from "vitest";
import { errnoCode, isMissingFileError } from "./errno.js";

describe("errnoCode", () => {
  it("returns the code of a Node.js error", () => {
    expect(errnoCode(Object.assign(new Error("missing"), { code: "ENOENT" }))).toBe("ENOENT");
  });

  it.each([
    ["an error without a code", new Error("plain")],
    ["an error with a numeric code", Object.assign(new Error("odd"), { code: 2 })],
    ["something that is not an error", { code: "ENOENT" }],
  ])("returns undefined for %s", (_label, value) => {
    expect(errnoCode(value)).toBeUndefined();
  });
});

describe("isMissingFileError", () => {
  it.each(["ENOENT", "ENOTDIR"])(
    "AC-1: isMissingFileError treats ENOENT and ENOTDIR as a missing file (%s)",
    (code) => {
      const error = Object.assign(new Error("missing"), { code });

      expect(isMissingFileError(error)).toBe(true);
    },
  );

  it.each([
    ["an error with code EACCES", Object.assign(new Error("denied"), { code: "EACCES" })],
    ["an error with code EISDIR", Object.assign(new Error("directory"), { code: "EISDIR" })],
    ["an error with code EEXIST", Object.assign(new Error("exists"), { code: "EEXIST" })],
    ["an error without a code", new Error("plain")],
    ["an error with a numeric code", Object.assign(new Error("odd"), { code: 2 })],
    ["something that is not an error", { code: "ENOENT" }],
    ["the code as a string", "ENOENT"],
    ["undefined", undefined],
    ["null", null],
  ])(
    "AC-1: isMissingFileError rejects other codes and values without a code (%s)",
    (_label, value) => {
      expect(isMissingFileError(value)).toBe(false);
    },
  );
});
