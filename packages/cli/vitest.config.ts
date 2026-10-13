import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    sequence: { shuffle: true },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // bin.ts only runs in the child processes of bin.test.ts, which V8
      // coverage does not see; it is a single call to `run`.
      exclude: ["src/**/*.test.ts", "src/bin.ts"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
