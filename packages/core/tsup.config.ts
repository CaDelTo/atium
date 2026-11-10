import { defineConfig } from "tsup";
import type { Options } from "tsup";

/** Options shared with `tsup.test-contracts.config.ts`. */
export const sharedOptions = {
  dts: {
    // tsup forces `baseUrl` in its declaration build, which TypeScript 6
    // rejects as deprecated. Scoped here so the package tsconfig stays strict.
    compilerOptions: { ignoreDeprecations: "6.0" },
  },
  sourcemap: true,
  clean: true,
  target: "node22",
} satisfies Options;

// `test-contracts` is built apart, as ESM only: tsup runs the configs of an
// array in parallel, and the `clean` of one would delete the output of the other.
export default defineConfig({
  ...sharedOptions,
  entry: {
    index: "src/index.ts",
    "pure/index": "src/pure/index.ts",
    "testing/index": "src/testing/index.ts",
  },
  format: ["esm", "cjs"],
});
