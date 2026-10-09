import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const packageDir = fileURLToPath(new URL("..", import.meta.url));

// Building and spawning Node is slower than an in-process test, especially
// under parallel runs.
const spawnTimeoutMs = 60_000;

const builtFiles = [
  "dist/index.js",
  "dist/index.cjs",
  "dist/index.d.ts",
  "dist/index.d.cts",
  "dist/testing/index.js",
  "dist/testing/index.cjs",
  "dist/testing/index.d.ts",
  "dist/testing/index.d.cts",
];

// Each script loads both entry points through Node's own resolution of the
// package `exports` map (self-reference) and prints what it got.
const report =
  "console.log(JSON.stringify({ assertNever: typeof core.assertNever, testing: typeof testing }));";

const scripts = {
  module: `
    import * as core from "@atium/core";
    import * as testing from "@atium/core/testing";
    ${report}
  `,
  commonjs: `
    const core = require("@atium/core");
    const testing = require("@atium/core/testing");
    ${report}
  `,
};

// Without this, child processes inherit Vitest's coverage directory and write into it.
const { NODE_V8_COVERAGE: _coverageDir, ...childEnv } = process.env;

/** Path of the tsup CLI, resolved from this package's dependencies. */
function tsupBin(): string {
  const require = createRequire(import.meta.url);
  return join(dirname(require.resolve("tsup/package.json")), "dist/cli-default.js");
}

let buildDir = "";

async function runNode(inputType: keyof typeof scripts): Promise<unknown> {
  const { stdout } = await execFileAsync(
    process.execPath,
    [`--input-type=${inputType}`, "--eval", scripts[inputType]],
    { cwd: buildDir, env: childEnv },
  );
  return JSON.parse(stdout);
}

describe("published entry points", () => {
  // Builds a private copy of the package with the real tsup config, so the test
  // never reads a stale `dist/` nor races with packages that import it. It lives
  // under node_modules so runtime dependencies resolve from the package.
  beforeAll(async () => {
    const cacheDir = join(packageDir, "node_modules/.cache");
    await mkdir(cacheDir, { recursive: true });
    buildDir = await mkdtemp(join(cacheDir, "smoke-"));
    await copyFile(join(packageDir, "package.json"), join(buildDir, "package.json"));
    await execFileAsync(
      process.execPath,
      [tsupBin(), "--out-dir", join(buildDir, "dist"), "--silent"],
      { cwd: packageDir, env: childEnv },
    );
  }, spawnTimeoutMs);

  afterAll(async () => {
    if (buildDir !== "") {
      await rm(buildDir, { recursive: true, force: true });
    }
  });

  it("emits ESM, CommonJS and type declarations for every entry point", () => {
    const missing = builtFiles.filter((file) => !existsSync(join(buildDir, file)));
    expect(missing).toEqual([]);
  });

  it.each([
    ["ESM", "module"],
    ["CommonJS", "commonjs"],
  ] as const)(
    "can be loaded from %s",
    async (_label, inputType) => {
      await expect(runNode(inputType)).resolves.toEqual({
        assertNever: "function",
        testing: "object",
      });
    },
    spawnTimeoutMs,
  );
});
