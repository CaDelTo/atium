import { describe, expect, it } from "vitest";
import { AtiumError } from "../errors.js";
import { rejectedAtiumError, thrownAtiumError } from "./thrown-error.js";

const configInvalid = new AtiumError("CONFIG_INVALID", "Invalid config.");

describe("thrownAtiumError", () => {
  it("returns the AtiumError thrown", () => {
    expect(
      thrownAtiumError(() => {
        throw configInvalid;
      }),
    ).toBe(configInvalid);
  });

  it("rethrows any other error", () => {
    const other = new TypeError("boom");

    expect(() =>
      thrownAtiumError(() => {
        throw other;
      }),
    ).toThrow(other);
  });

  it("fails when nothing is thrown", () => {
    expect(() => thrownAtiumError(() => 1)).toThrow("nothing was thrown");
  });
});

describe("rejectedAtiumError", () => {
  it("returns the AtiumError the promise rejects with", async () => {
    await expect(rejectedAtiumError(Promise.reject(configInvalid))).resolves.toBe(configInvalid);
  });

  it("rethrows any other reason", async () => {
    await expect(rejectedAtiumError(Promise.reject(new TypeError("boom")))).rejects.toThrow("boom");
  });

  it("fails when the promise resolves", async () => {
    await expect(rejectedAtiumError(Promise.resolve(1))).rejects.toThrow("the promise resolved");
  });
});
