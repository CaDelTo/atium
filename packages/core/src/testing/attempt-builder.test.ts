import { describe, expect, it } from "vitest";
import { AttemptSchema } from "../model/attempt.js";
import { anAttempt } from "./attempt-builder.js";
import { FIXED_START } from "./deterministic.js";
import { anError } from "./error-builder.js";

describe("anAttempt", () => {
  it("builds a valid, frozen original attempt that passed by default", () => {
    const attempt = anAttempt().build();

    expect(AttemptSchema.safeParse(attempt).success).toBe(true);
    expect(attempt).toMatchObject({ index: 0, status: "passed", startedAt: FIXED_START });
    expect(attempt).not.toHaveProperty("error");
    expect(Object.isFrozen(attempt)).toBe(true);
  });

  it("builds the same attempt every time", () => {
    expect(anAttempt().failed().build()).toStrictEqual(anAttempt().failed().build());
  });

  it("fails with a default error, or with the error given", () => {
    const withDefault = anAttempt().failed().build();
    const withGiven = anAttempt().failed(anError("AssertionError")).build();

    expect(AttemptSchema.safeParse(withDefault).success).toBe(true);
    expect(withDefault.status).toBe("failed");
    expect(withDefault.error).toStrictEqual(anError().build());
    expect(withGiven.error?.type).toBe("AssertionError");
  });

  it("drops the error when a failed attempt is made to pass", () => {
    const attempt = anAttempt().failed().passed().build();

    expect(attempt.status).toBe("passed");
    expect(attempt).not.toHaveProperty("error");
  });

  it("starts at the fixed start plus index times its own duration", () => {
    const retry = anAttempt().withIndex(2).with({ durationMs: 30_000 }).build();

    expect(retry.startedAt).toBe("2026-10-08T14:04:00.000Z");
  });

  it("keeps a start set with `with`", () => {
    const startedAt = "2026-01-01T00:00:00.000Z";

    expect(anAttempt().withIndex(3).with({ startedAt }).build().startedAt).toBe(startedAt);
  });

  it("does not change the builder it was called on", () => {
    const original = anAttempt();
    const before = original.build();

    original.withIndex(1);
    original.failed();
    original.with({ status: "timedOut" });

    expect(original.build()).toStrictEqual(before);
  });

  it("throws when the fields set make the attempt invalid", () => {
    expect(() => anAttempt().withIndex(-1).build()).toThrow();
  });
});
