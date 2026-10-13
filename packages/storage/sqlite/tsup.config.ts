import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: {
    // tsup forces `baseUrl` in its declaration build, which TypeScript 6
    // rejects as deprecated. Scoped here so the package tsconfig stays strict.
    compilerOptions: { ignoreDeprecations: "6.0" },
  },
  sourcemap: true,
  clean: true,
  target: "node22",
  // `import.meta.url` locates the migrations in the CommonJS build too.
  shims: true,
});
