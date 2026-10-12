import { defineConfig } from "vitest/config";

// Runs every package's tests from the root (editors, `vitest` at the root).
// `pnpm test` still runs them per package through Turborepo.
export default defineConfig({
  test: {
    projects: ["packages/*/vitest.config.ts", "packages/*/*/vitest.config.ts"],
  },
});
