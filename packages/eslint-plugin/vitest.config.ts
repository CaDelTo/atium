import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    sequence: { shuffle: true },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
