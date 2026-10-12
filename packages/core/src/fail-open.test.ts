import { describe, expect, it } from "vitest";
import { failOpen } from "./fail-open.js";
import { FakeLogger } from "./testing/index.js";

const fallback = ["fallback"];

describe("failOpen", () => {
  it("returns the value and logs nothing when the operation succeeds", async () => {
    const logger = new FakeLogger();

    const value = await failOpen({ label: "history sync", fallback, logger }, () =>
      Promise.resolve(["synced"]),
    );

    expect(value).toEqual(["synced"]);
    expect(logger.entries).toEqual([]);
  });

  it("returns the fallback and warns with the error when the operation rejects", async () => {
    const logger = new FakeLogger();
    const error = new Error("network down");

    const value = await failOpen({ label: "history sync", fallback, logger }, () =>
      Promise.reject(error),
    );

    expect(value).toBe(fallback);
    expect(logger.entries).toEqual([
      { level: "warn", message: "history sync failed; continuing without it", context: { error } },
    ]);
    expect(logger.entries[0]?.context?.["error"]).toBe(error);
  });

  it("returns the fallback when the operation throws before returning a promise", async () => {
    const logger = new FakeLogger();
    const error = new TypeError("storage is not configured");

    const value = await failOpen({ label: "report writing", fallback, logger }, () => {
      throw error;
    });

    expect(value).toBe(fallback);
    expect(logger.entries).toEqual([
      {
        level: "warn",
        message: "report writing failed; continuing without it",
        context: { error },
      },
    ]);
  });

  it("returns the fallback when the operation throws a value that is not an Error", async () => {
    const logger = new FakeLogger();

    const value = await failOpen({ label: "upload", fallback, logger }, () => {
      // Third-party code can throw anything.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "quota exceeded";
    });

    expect(value).toBe(fallback);
    expect(logger.entries).toEqual([
      {
        level: "warn",
        message: "upload failed; continuing without it",
        context: { error: "quota exceeded" },
      },
    ]);
  });
});
