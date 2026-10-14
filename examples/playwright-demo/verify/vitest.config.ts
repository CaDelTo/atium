import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only this directory: the demo's own *.spec.ts files are Playwright tests.
    root: import.meta.dirname,
    sequence: { shuffle: true },
  },
});
