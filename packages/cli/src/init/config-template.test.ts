import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { loadConfig } from "@atium/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configTemplate } from "./config-template.js";

describe("configTemplate", () => {
  it("imports defineConfig and lists the adapters", () => {
    expect(configTemplate(["playwright", "cypress"])).toBe(
      [
        'import { defineConfig } from "@atium/core";',
        "",
        "export default defineConfig({",
        '  adapters: ["playwright", "cypress"],',
        "});",
        "",
      ].join("\n"),
    );
  });

  it("writes an empty list without adapters", () => {
    expect(configTemplate([])).toContain("  adapters: [],\n");
  });

  describe("the generated file", () => {
    let cwd: string;

    beforeEach(async () => {
      cwd = await mkdtemp(path.join(tmpdir(), "atium-init-template-"));
      // The project depends on @atium/core, as the config requires.
      const core = path.dirname(createRequire(import.meta.url).resolve("@atium/core/package.json"));
      await mkdir(path.join(cwd, "node_modules", "@atium"), { recursive: true });
      await symlink(core, path.join(cwd, "node_modules", "@atium", "core"), "junction");
    });

    afterEach(async () => {
      await rm(cwd, { recursive: true, force: true });
    });

    it.each([[["playwright"]], [[]]])(
      "loads with loadConfig, with the adapters %j",
      async (adapters) => {
        await writeFile(path.join(cwd, "atium.config.ts"), configTemplate(adapters));

        const loaded = await loadConfig({ cwd, env: {} });

        expect(loaded.config.adapters).toEqual(adapters);
      },
    );
  });
});
