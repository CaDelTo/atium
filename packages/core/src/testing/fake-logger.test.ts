import { describe, expect, it } from "vitest";
import { FakeLogger } from "./fake-logger.js";

describe("FakeLogger", () => {
  it("records every call in order with its level, message and context", () => {
    const logger = new FakeLogger();

    logger.error("Write failed", { path: "a.ndjson" });
    logger.warn("Sync skipped");
    logger.info("Run uploaded", { runId: "r1" });
    logger.debug("Cache hit");

    expect(logger.entries).toEqual([
      { level: "error", message: "Write failed", context: { path: "a.ndjson" } },
      { level: "warn", message: "Sync skipped", context: undefined },
      { level: "info", message: "Run uploaded", context: { runId: "r1" } },
      { level: "debug", message: "Cache hit", context: undefined },
    ]);
  });

  it("starts empty", () => {
    expect(new FakeLogger().entries).toEqual([]);
  });
});
