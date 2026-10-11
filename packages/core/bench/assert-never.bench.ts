import { test } from "vitest";
import { assertNever } from "../src/assert-never.js";

// Example benchmark so `pnpm bench` and perf-benchmarker work from the start.
// Replace it with real hot paths (docs/engineering/05-performance.md) as they appear.
test("assertNever", async ({ bench }) => {
  // Simulates a value that escaped exhaustive checking: only `never` reaches assertNever.
  const unexpected = { kind: "triangle" } as never;
  let thrown: unknown;

  await bench("throws and is caught", () => {
    try {
      assertNever(unexpected);
    } catch (error) {
      // Keep the error observable so the engine cannot drop the measured work.
      thrown = error;
    }
  }).run();

  if (!(thrown instanceof Error)) {
    throw new Error("assertNever did not throw: the benchmark measured nothing.");
  }
});
