import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "vitest";

// `atium --help` in less than 300 ms (05-performance.md, "Arranque del CLI").
// It measures the built binary in a new Node process, as users run it.
const BUDGET_MS = 300;
const BIN = fileURLToPath(new URL("../dist/bin.js", import.meta.url));

test("atium --help", async ({ bench }) => {
  const result = await bench("atium --help", () => {
    execFileSync(process.execPath, [BIN, "--help"], { stdio: "ignore" });
  }).run();

  if (result.latency.mean >= BUDGET_MS) {
    throw new Error(
      `atium --help took ${result.latency.mean.toFixed(0)} ms on average; the budget is ${String(BUDGET_MS)} ms.`,
    );
  }
});
