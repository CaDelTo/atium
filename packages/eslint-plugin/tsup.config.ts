import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", "syntax/index": "src/syntax/index.ts" },
  format: ["esm", "cjs"],
  dts: {
    // tsup forces `baseUrl` in its declaration build, which TypeScript 6
    // rejects as deprecated. Scoped here so the package tsconfig stays strict.
    compilerOptions: { ignoreDeprecations: "6.0" },
  },
  sourcemap: true,
  clean: true,
  target: "node22",
  // CommonJS configs `require()` the plugin object itself, not `.default`.
  // tsup only applies the interop to the CommonJS build with splitting on.
  cjsInterop: true,
  splitting: true,
});
