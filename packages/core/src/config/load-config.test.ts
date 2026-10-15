import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rejectedAtiumError } from "../testing/thrown-error.js";
import { loadConfig } from "./load-config.js";

let cwd: string;

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), "atium-config-"));
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

async function writeConfig(name: string, content: string): Promise<string> {
  const file = path.join(cwd, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
  return file;
}

const ADAPTERS = '{ adapters: ["playwright"] }';

describe("loadConfig", () => {
  describe("without a config file", () => {
    it("uses the defaults without error", async () => {
      const loaded = await loadConfig({ cwd, env: {} });

      expect(loaded.configPath).toBeUndefined();
      expect(loaded.logLevel).toBe("info");
      expect(loaded.config.quarantine.mode).toBe("run-and-ignore");
      expect(loaded.config.llm.enabled).toBe(false);
    });

    it("ignores files with other names", async () => {
      await writeConfig("atium.config.yaml", "adapters: [playwright]");
      await writeConfig("atium.config.cjs", "module.exports = {};");

      expect((await loadConfig({ cwd, env: {} })).configPath).toBeUndefined();
    });

    it("ignores a directory named like a config file", async () => {
      await mkdir(path.join(cwd, "atium.config.ts"));

      expect((await loadConfig({ cwd, env: {} })).configPath).toBeUndefined();
    });
  });

  describe("search in the working directory", () => {
    it.each([
      [
        "atium.config.ts",
        `import type {} from "node:fs";\nexport default ${ADAPTERS} satisfies object;`,
      ],
      ["atium.config.mts", `export default ${ADAPTERS} as const;`],
      ["atium.config.js", `export default ${ADAPTERS};`],
      ["atium.config.mjs", `export default ${ADAPTERS};`],
      ["atium.config.json", '{ "adapters": ["playwright"] }'],
    ])("loads %s", async (name, content) => {
      const file = await writeConfig(name, content);

      const loaded = await loadConfig({ cwd, env: {} });

      expect(loaded.configPath).toBe(file);
      expect(loaded.config.adapters).toEqual(["playwright"]);
    });

    it("reads the file again on every load", async () => {
      await writeConfig("atium.config.ts", 'export default { adapters: ["cypress"] };');
      await loadConfig({ cwd, env: {} });
      await writeConfig("atium.config.ts", 'export default { adapters: ["playwright"] };');

      expect((await loadConfig({ cwd, env: {} })).config.adapters).toEqual(["playwright"]);
    });

    it("rejects more than one config file, naming them", async () => {
      await writeConfig("atium.config.ts", `export default ${ADAPTERS};`);
      await writeConfig("atium.config.json", "{}");

      const error = await rejectedAtiumError(loadConfig({ cwd, env: {} }));

      expect(error.code).toBe("CONFIG_INVALID");
      expect(error.message).toContain('("atium.config.ts", "atium.config.json")');
      expect(error.hint).toBe("Keep only one of them, or choose one with --config.");
    });
  });

  describe("config file precedence", () => {
    beforeEach(async () => {
      await writeConfig("atium.config.ts", 'export default { adapters: ["searched"] };');
      await writeConfig("config/env.config.ts", 'export default { adapters: ["env"] };');
      await writeConfig("config/flag.config.ts", 'export default { adapters: ["flag"] };');
    });

    it("takes ATIUM_CONFIG over the searched file", async () => {
      const loaded = await loadConfig({ cwd, env: { ATIUM_CONFIG: "config/env.config.ts" } });

      expect(loaded.configPath).toBe(path.join(cwd, "config/env.config.ts"));
      expect(loaded.config.adapters).toEqual(["env"]);
    });

    it("takes --config over ATIUM_CONFIG", async () => {
      const loaded = await loadConfig({
        cwd,
        env: { ATIUM_CONFIG: "config/env.config.ts" },
        flags: { config: "config/flag.config.ts" },
      });

      expect(loaded.config.adapters).toEqual(["flag"]);
    });

    it("accepts an absolute path", async () => {
      const loaded = await loadConfig({
        cwd,
        env: {},
        flags: { config: path.join(cwd, "config/flag.config.ts") },
      });

      expect(loaded.config.adapters).toEqual(["flag"]);
    });
  });

  describe("log level precedence", () => {
    it("takes ATIUM_LOG_LEVEL over the default and the flag over both", async () => {
      expect((await loadConfig({ cwd, env: { ATIUM_LOG_LEVEL: "warn" } })).logLevel).toBe("warn");
      expect(
        (await loadConfig({ cwd, env: { ATIUM_LOG_LEVEL: "warn" }, flags: { logLevel: "debug" } }))
          .logLevel,
      ).toBe("debug");
    });
  });

  describe("errors", () => {
    it("rejects a named file that does not exist with CONFIG_NOT_FOUND", async () => {
      const error = await rejectedAtiumError(
        loadConfig({ cwd, env: { ATIUM_CONFIG: "missing.config.ts" } }),
      );

      expect(error.code).toBe("CONFIG_NOT_FOUND");
      expect(error.message).toBe(
        'Config file "missing.config.ts", given with ATIUM_CONFIG, does not exist or is not a file.',
      );
      expect(error.hint).toContain("Fix the path in ATIUM_CONFIG");
    });

    it("rejects a named path that is a directory", async () => {
      await mkdir(path.join(cwd, "dir.ts"));

      const error = await rejectedAtiumError(
        loadConfig({ cwd, env: {}, flags: { config: "dir.ts" } }),
      );

      expect(error.code).toBe("CONFIG_NOT_FOUND");
      expect(error.message).toContain("given with --config");
    });

    it("rejects a named file with an unsupported extension", async () => {
      await writeConfig("atium.config.yaml", "adapters: []");

      const error = await rejectedAtiumError(
        loadConfig({ cwd, env: {}, flags: { config: "atium.config.yaml" } }),
      );

      expect(error.code).toBe("CONFIG_INVALID");
      expect(error.hint).toBe("Use a file ending in .ts, .mts, .js, .mjs, .json.");
    });

    it("rejects a file with a syntax error, keeping the cause", async () => {
      await writeConfig("atium.config.ts", "export default {");

      const error = await rejectedAtiumError(loadConfig({ cwd, env: {} }));

      expect(error.code).toBe("CONFIG_INVALID");
      expect(error.message).toMatch(/^Could not load config file "atium\.config\.ts": ".+"\.$/);
      expect(error.cause).toBeInstanceOf(Error);
    });

    it("rejects a file that throws when run", async () => {
      await writeConfig("atium.config.js", 'throw new Error("boom");');

      const error = await rejectedAtiumError(loadConfig({ cwd, env: {} }));

      expect(error.code).toBe("CONFIG_INVALID");
      expect(error.message).toBe('Could not load config file "atium.config.js": "boom".');
    });

    it("rejects a file that throws something other than an Error", async () => {
      await writeConfig("atium.config.js", 'throw "boom\\nmore";');

      const error = await rejectedAtiumError(loadConfig({ cwd, env: {} }));

      expect(error.message).toBe('Could not load config file "atium.config.js": "boom".');
      expect(error.cause).toBe("boom\nmore");
    });

    it("rejects invalid JSON", async () => {
      await writeConfig("atium.config.json", "{ adapters: }");

      expect((await rejectedAtiumError(loadConfig({ cwd, env: {} }))).code).toBe("CONFIG_INVALID");
    });

    it("rejects a file without a default export", async () => {
      await writeConfig("atium.config.ts", `export const config = ${ADAPTERS};`);

      const error = await rejectedAtiumError(loadConfig({ cwd, env: {} }));

      expect(error.code).toBe("CONFIG_INVALID");
      expect(error.message).toBe('Config file "atium.config.ts" has no default export.');
      expect(error.hint).toBe("Export the config with `export default defineConfig({ ... })`.");
    });

    it("suggests storage for a misspelled storgae key in the file", async () => {
      await writeConfig("atium.config.ts", 'export default { storgae: { type: "s3" } };');

      const error = await rejectedAtiumError(loadConfig({ cwd, env: {} }));

      expect(error.code).toBe("CONFIG_INVALID");
      expect(error.message).toBe(
        'Invalid config in "atium.config.ts": Unknown key "storgae" at the top level.',
      );
      expect(error.hint).toBe('Did you mean "storage"?');
    });

    it("shows a file outside the working directory by its absolute path", async () => {
      const outside = await mkdtemp(path.join(tmpdir(), "atium-config-outside-"));
      try {
        const file = path.join(outside, "atium.config.json");
        await writeFile(file, '{ "storgae": {} }');

        const error = await rejectedAtiumError(
          loadConfig({ cwd, env: {}, flags: { config: file } }),
        );

        expect(error.message).toContain(`Invalid config in ${JSON.stringify(file)}:`);
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });

    it("AC-2: loadConfig names a config file called ..foo.json inside cwd by its relative path", async () => {
      const file = await writeConfig("..foo.json", '{ "storgae": {} }');

      const error = await rejectedAtiumError(
        loadConfig({ cwd, env: {}, flags: { config: "..foo.json" } }),
      );

      expect(error.code).toBe("CONFIG_INVALID");
      expect(error.message).toContain('Invalid config in "..foo.json":');
      expect(error.message).not.toContain(file);
    });

    it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
      "rejects a working directory that cannot be read with CONFIG_NOT_FOUND",
      async () => {
        const locked = path.join(cwd, "locked");
        await mkdir(locked);
        await chmod(locked, 0o000);
        try {
          const error = await rejectedAtiumError(
            loadConfig({ cwd: path.join(locked, "inner"), env: {} }),
          );

          expect(error.code).toBe("CONFIG_NOT_FOUND");
          expect(error.cause).toBeInstanceOf(Error);
        } finally {
          await chmod(locked, 0o700);
        }
      },
    );
  });
});
