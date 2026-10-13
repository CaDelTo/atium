import { AtiumError } from "@atium/core";
import { FakeLogger } from "@atium/core/testing";
import { describe, expect, it } from "vitest";
import { UsageError } from "../../usage-error.js";
import { errorOutcome } from "./error-outcome.js";

describe("errorOutcome", () => {
  it("takes the message and hint of the error and logs it at debug level", () => {
    const logger = new FakeLogger();
    const error = new UsageError("Bad flag.", "Drop it.");

    expect(errorOutcome(error, "Fallback.", logger)).toEqual({
      message: "Bad flag.",
      hint: "Drop it.",
    });
    expect(logger.entries).toEqual([
      { level: "debug", message: "Error details", context: { error } },
    ]);
  });

  it("uses the fallback hint when the error has none", () => {
    const error = new AtiumError("GIT_UNAVAILABLE", "No Git.");

    expect(errorOutcome(error, "Install Git.", new FakeLogger())).toEqual({
      message: "No Git.",
      hint: "Install Git.",
    });
  });
});
