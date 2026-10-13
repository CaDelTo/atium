import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeRun } from "../../test/fake-io.js";
import type { FakeRun } from "../../test/fake-io.js";
import { run } from "../run.js";
import { configTemplate } from "./config-template.js";

let cwd: string;

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), "atium-init-"));
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

const CONFIG = "atium.config.ts";

async function writeManifest(manifest: unknown): Promise<void> {
  await writeFile(path.join(cwd, "package.json"), JSON.stringify(manifest));
}

async function readConfig(name = CONFIG): Promise<string> {
  return readFile(path.join(cwd, name), "utf8");
}

async function init(...flags: string[]): Promise<{ code: number; options: FakeRun }> {
  const options = fakeRun(["init", ...flags], { cwd });
  return { code: await run(options), options };
}

describe("atium init", () => {
  describe("on a project without a config file", () => {
    it("creates atium.config.ts with the detected adapters", async () => {
      await writeManifest({
        devDependencies: { "@atium/core": "0.1.0", "@playwright/test": "1.0.0", cypress: "13.0.0" },
      });

      const { code, options } = await init();

      expect(code).toBe(0);
      expect(await readConfig()).toBe(configTemplate(["playwright", "cypress"]));
      expect(options.stdout.text).toBe(
        'Created atium.config.ts with the adapters "playwright", "cypress".\n',
      );
      expect(options.stderr.text).toBe("");
    });

    it("creates it with no adapters when no framework is a dependency", async () => {
      await writeManifest({ devDependencies: { "@atium/core": "0.1.0" } });

      const { code, options } = await init();

      expect(code).toBe(0);
      expect(await readConfig()).toBe(configTemplate([]));
      expect(options.stdout.text).toContain('"adapters" is empty');
    });

    it("warns when @atium/core is not a dependency", async () => {
      await writeManifest({ devDependencies: { cypress: "13.0.0" } });

      const { code, options } = await init();

      expect(code).toBe(0);
      expect(options.stderr.text).toContain(
        'atium:cli warn atium.config.ts imports defineConfig from "@atium/core", which is not a dependency',
      );
    });

    it("warns and creates it with no adapters without package.json", async () => {
      const { code, options } = await init();

      expect(code).toBe(0);
      expect(await readConfig()).toBe(configTemplate([]));
      expect(options.stderr.text).toBe(
        'atium:cli warn "package.json" was not found, so no test framework was detected.\n',
      );
    });

    it.each([
      ["is not JSON", "{ not json"],
      ["is not an object", "[]"],
      ["has dependencies that are not an object", '{ "dependencies": ["cypress"] }'],
    ])("warns and creates it with no adapters when package.json %s", async (_case, content) => {
      await writeFile(path.join(cwd, "package.json"), content);

      const { code, options } = await init();

      expect(code).toBe(0);
      expect(await readConfig()).toBe(configTemplate([]));
      expect(options.stderr.text).toContain(
        'atium:cli warn "package.json" could not be read as a package manifest',
      );
    });

    it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
      "warns with the cause when package.json cannot be read",
      async () => {
        await writeManifest({});
        await chmod(path.join(cwd, "package.json"), 0o000);

        const { code, options } = await init();

        expect(code).toBe(0);
        expect(options.stderr.text).toContain('"code":"EACCES"');
        expect(options.stderr.text).not.toContain(cwd);
      },
    );

    it("warns with the cause at debug level only when package.json is not JSON", async () => {
      await writeFile(path.join(cwd, "package.json"), '{ "secret-ish": ');

      const quiet = await init();
      await rm(path.join(cwd, CONFIG));
      const verbose = await init("--verbose");

      expect(quiet.options.stderr.text).not.toContain("SyntaxError");
      expect(verbose.options.stderr.text).toContain("SyntaxError");
    });

    it("does not read a package.json over the size cap", async () => {
      const padding = " ".repeat(1024 * 1024);
      await writeFile(
        path.join(cwd, "package.json"),
        `{ "devDependencies": { "cypress": "13.0.0" } }${padding}`,
      );

      const { code, options } = await init();

      expect(code).toBe(0);
      expect(await readConfig()).toBe(configTemplate([]));
      expect(options.stderr.text).toContain('"package.json" is larger than 1048576 bytes');
    });

    it("reads a package.json right at the size cap", async () => {
      const content = '{ "devDependencies": { "cypress": "13.0.0", "@atium/core": "0.1.0" } }';
      await writeFile(path.join(cwd, "package.json"), content.padEnd(1024 * 1024, " "));

      const { code } = await init();

      expect(code).toBe(0);
      expect(await readConfig()).toBe(configTemplate(["cypress"]));
    });

    it("does not read a package.json that is not a regular file", async () => {
      await mkdir(path.join(cwd, "package.json"));

      const { code, options } = await init();

      expect(code).toBe(0);
      expect(options.stderr.text).toContain('"package.json" is not a regular file');
    });

    it("warns that ATIUM_CONFIG names another file", async () => {
      const options = fakeRun(["init"], { cwd, env: { ATIUM_CONFIG: "configs/atium.config.ts" } });

      expect(await run(options)).toBe(0);
      expect(options.stderr.text).toContain(
        'ATIUM_CONFIG is set to "configs/atium.config.ts", so the other commands will load that file',
      );
    });

    it("ignores an empty ATIUM_CONFIG", async () => {
      const options = fakeRun(["init"], { cwd, env: { ATIUM_CONFIG: "" } });

      await run(options);

      expect(options.stderr.text).not.toContain("ATIUM_CONFIG");
    });

    it("logs only errors with --quiet, and still writes the result", async () => {
      const { code, options } = await init("--quiet");

      expect(code).toBe(0);
      expect(options.stderr.text).toBe("");
      expect(options.stdout.text).toContain("Created atium.config.ts");
    });
  });

  describe("on a project with atium.config.ts", () => {
    const existing = "export default { adapters: [] };\n";

    beforeEach(async () => {
      await writeFile(path.join(cwd, CONFIG), existing);
      await writeManifest({ devDependencies: { "@atium/core": "0.1.0", cypress: "13.0.0" } });
    });

    it("leaves it unchanged and exits with 2 without --force", async () => {
      const { code, options } = await init();

      expect(code).toBe(2);
      expect(await readConfig()).toBe(existing);
      expect(options.stderr.text).toBe(
        '"atium.config.ts" already exists, so atium init left it unchanged.\n  Hint: Run atium init --force to replace it.\n',
      );
      expect(options.stdout.text).toBe("");
    });

    it("replaces it with --force", async () => {
      const { code } = await init("--force");

      expect(code).toBe(0);
      expect(await readConfig()).toBe(configTemplate(["cypress"]));
    });
  });

  describe.skipIf(process.platform === "win32")(
    "on a project whose atium.config.ts is a symlink",
    () => {
      const outside = "elsewhere.ts";

      beforeEach(async () => {
        await writeFile(path.join(cwd, outside), "unchanged\n");
        await symlink(outside, path.join(cwd, CONFIG));
      });

      it("leaves the link and its target unchanged without --force", async () => {
        const { code } = await init();

        expect(code).toBe(2);
        expect(await readConfig(outside)).toBe("unchanged\n");
      });

      it("replaces the link, not its target, with --force", async () => {
        const { code } = await init("--force");

        expect(code).toBe(0);
        expect(await readConfig(outside)).toBe("unchanged\n");
        expect(await readConfig()).toBe(configTemplate([]));
      });
    },
  );

  describe("with another config file in the working directory", () => {
    it.each([[[]], [["--force"]]])(
      "exits with 2 and creates nothing, with the flags %j",
      async (flags) => {
        await writeFile(path.join(cwd, "atium.config.json"), "{}");

        const { code, options } = await init(...flags);

        expect(code).toBe(2);
        await expect(readConfig()).rejects.toThrow();
        expect(options.stderr.text).toContain('already has a config file ("atium.config.json")');
      },
    );

    it.skipIf(process.platform === "win32")(
      "ignores a broken symlink named like another config file, as loadConfig does",
      async () => {
        await symlink("missing.mjs", path.join(cwd, "atium.config.mjs"));

        const { code } = await init();

        expect(code).toBe(0);
        expect(await readConfig()).toBe(configTemplate([]));
      },
    );

    it.skipIf(process.platform === "win32")(
      "counts a symlink to a file named like another config file, as loadConfig does",
      async () => {
        await writeFile(path.join(cwd, "real.json"), "{}");
        await symlink("real.json", path.join(cwd, "atium.config.json"));

        const { code } = await init();

        expect(code).toBe(2);
      },
    );

    it("ignores a directory named like another config file", async () => {
      await mkdir(path.join(cwd, "atium.config.json"));

      const { code } = await init();

      expect(code).toBe(0);
      expect(await readConfig()).toBe(configTemplate([]));
    });
  });

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "keeps the old config when --force cannot write the new one",
    async () => {
      await writeFile(path.join(cwd, CONFIG), "old\n");
      await chmod(cwd, 0o500);
      try {
        const { code, options } = await init("--force");

        expect(code).toBe(0);
        expect(options.stderr.text).toContain("atium init failed because of an internal error");
      } finally {
        await chmod(cwd, 0o700);
      }
      expect(await readConfig()).toBe("old\n");
    },
  );

  it("exits with 2 when atium.config.ts is a directory, even with --force", async () => {
    await mkdir(path.join(cwd, CONFIG));

    const { code, options } = await init("--force");

    expect(code).toBe(2);
    expect(options.stderr.text).toContain('"atium.config.ts" is a directory');
  });

  it("rejects --config with 2 and creates nothing", async () => {
    const { code, options } = await init("--config", "other.ts");

    expect(code).toBe(2);
    await expect(readConfig()).rejects.toThrow();
    expect(options.stderr.text).toContain("atium init does not accept --config");
  });

  it("fails open when the working directory cannot be written", async () => {
    const missing = path.join(cwd, "missing");
    const options = fakeRun(["init"], { cwd: missing });

    expect(await run(options)).toBe(0);
    expect(options.stderr.text).toContain("atium init failed because of an internal error");
  });

  it("exits with 3 with --strict when the working directory cannot be written", async () => {
    const options = fakeRun(["init", "--strict"], { cwd: path.join(cwd, "missing") });

    expect(await run(options)).toBe(3);
  });
});
