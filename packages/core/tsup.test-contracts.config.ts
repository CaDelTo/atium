import { defineConfig } from "tsup";
import { sharedOptions } from "./tsup.config.js";

// ESM only, as `exports` exposes it: the suite imports Vitest (07-public-api.md).
// The `build` script runs it after `tsup.config.ts` (`&&`), whose `clean` empties
// `dist/`; run in the other order, that clean would delete this output.
export default defineConfig({
  ...sharedOptions,
  entry: { index: "test-contracts/storage.contract.ts" },
  outDir: "dist/test-contracts",
  // The contract suites run inside the tests of other packages, which provide Vitest.
  external: ["vitest"],
  format: ["esm"],
});
