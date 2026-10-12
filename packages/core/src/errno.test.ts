import { describe, expect, it } from "vitest";
import { errnoCode } from "./errno.js";

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
