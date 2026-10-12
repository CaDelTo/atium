import { describe, expect, it } from "vitest";
import { ErrorOccurrenceSchema } from "../model/error-occurrence.js";
import { anError } from "./error-builder.js";

describe("anError", () => {
  it("builds a valid, frozen error by default", () => {
    const error = anError().build();

    expect(ErrorOccurrenceSchema.safeParse(error).success).toBe(true);
    expect(error.type).toBe("TimeoutError");
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("builds the same error every time", () => {
    expect(anError().build()).toStrictEqual(anError().build());
  });

  it("derives the fingerprint from type and message, and the family from type", () => {
    const timeout = anError("TimeoutError").build();
    const otherMessage = anError("TimeoutError").withMessage("Timeout 9000ms exceeded.").build();
    const assertion = anError("AssertionError").build();

    expect(otherMessage.fingerprint).not.toBe(timeout.fingerprint);
    expect(otherMessage.family).toBe(timeout.family);
    expect(assertion.family).not.toBe(timeout.family);
  });

  it("keeps a fingerprint and a family set with `with`", () => {
    const error = anError()
      .with({ fingerprint: "00000000000000aa", family: "TimeoutError|login.spec.ts:3" })
      .build();

    expect(error.fingerprint).toBe("00000000000000aa");
    expect(error.family).toBe("TimeoutError|login.spec.ts:3");
  });

  it("does not change the builder it was called on", () => {
    const original = anError();
    const before = original.build();

    original.withMessage("other");
    original.with({ failedAtMs: 7 });

    expect(original.build()).toStrictEqual(before);
  });

  it("throws when the fields set make the error invalid", () => {
    expect(() => anError().with({ failedAtMs: -1 }).build()).toThrow();
  });
});
