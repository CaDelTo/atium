import { describe, expect, it } from "vitest";
import { storageContract } from "../../test-contracts/storage.contract.js";
import { InMemoryStorage } from "./in-memory-storage.js";
import { aRun } from "./run-builder.js";

storageContract(() => Promise.resolve(new InMemoryStorage()));

describe("InMemoryStorage", () => {
  it("keeps the runs of each instance apart", async () => {
    const first = new InMemoryStorage();
    const second = new InMemoryStorage();
    const run = aRun().withSeed(1).build();

    await first.writeRun(run);

    expect(await second.getRun(run.id)).toEqual({ ok: true, value: undefined });
  });
});
