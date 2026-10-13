import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Runs the built binary, as users do: turbo builds the package before its tests.
const BIN = fileURLToPath(new URL("../dist/bin.js", import.meta.url));

const run = promisify(execFile);

let cwd: string;

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), "atium-bin-"));
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

describe("the atium binary", () => {
  it("prints the help and exits with 0", async () => {
    const { stdout, stderr } = await run(process.execPath, [BIN, "--help"], { cwd });

    expect(stdout).toContain("Usage: atium");
    expect(stderr).toBe("");
  });

  it("creates the config with init", async () => {
    const { stdout } = await run(process.execPath, [BIN, "init", "--quiet"], { cwd });

    expect(stdout).toBe(
      'Created atium.config.ts. No Playwright or Cypress dependency was found, so "adapters" is empty: add yours to it.\n',
    );
    expect(await readFile(path.join(cwd, "atium.config.ts"), "utf8")).toContain("defineConfig");
  });

  it("sets the exit code of a usage error", async () => {
    await expect(run(process.execPath, [BIN, "--bogus"], { cwd })).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining("unknown option '--bogus'") as unknown,
    });
  });
});
