import { defineConfig } from "tsup";

export default defineConfig({
  // Only the binary: the package has no programmatic API. Each command's
  // implementation is a separate chunk, loaded when the command runs, so
  // `atium --help` stays fast (05-performance.md, "Arranque del CLI").
  entry: { bin: "src/bin.ts" },
  format: ["esm"],
  splitting: true,
  sourcemap: true,
  clean: true,
  target: "node22",
  banner: { js: "#!/usr/bin/env node" },
});
