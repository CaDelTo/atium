import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import type { EnvVars } from "@atium/core";
import { FakeLogger } from "@atium/core/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { useTempDir } from "../../../test/temp-dir.js";
import type { CommandContext } from "../../command-context.js";
import type { GlobalOptions } from "../../global-options.js";
import { checkConfig } from "./config.js";

const workDir = useTempDir("atium-doctor-config-");
let cwd: string;

beforeEach(() => {
  cwd = workDir();
});

function context(
  globals: Partial<GlobalOptions> = {},
  env: EnvVars = {},
): CommandContext & { logger: FakeLogger } {
  return {
    cwd,
    env,
    stdout: { write: () => true },
    logger: new FakeLogger(),
    globals: { ci: false, strict: false, ...globals },
  };
}

async function writeConfig(name: string, config: unknown): Promise<void> {
  await writeFile(path.join(cwd, name), JSON.stringify(config));
}

describe("checkConfig", () => {
  it("passes with the file and its adapters", async () => {
    await writeConfig("atium.config.json", { adapters: ["playwright", "cypress"] });

    expect(await checkConfig(context())).toEqual({
      id: "config",
      status: "pass",
      message: 'Loaded "atium.config.json" with the adapters "playwright", "cypress".',
      details: { file: "atium.config.json", adapters: ["playwright", "cypress"] },
    });
  });

  it("passes with a config that has no adapters", async () => {
    await writeConfig("atium.config.json", {});

    const check = await checkConfig(context());

    expect(check.message).toBe('Loaded "atium.config.json", which has no adapters.');
    expect(check.details).toEqual({ file: "atium.config.json", adapters: [] });
  });

  it("warns without a config file", async () => {
    expect(await checkConfig(context())).toEqual({
      id: "config",
      status: "warn",
      message:
        "No atium.config.* was found in the working directory, so every section takes its defaults.",
      hint: "Run atium init to create atium.config.ts.",
      details: { file: null, adapters: null },
    });
  });

  it("fails with the error and hint of loadConfig on an invalid config", async () => {
    await writeConfig("atium.config.json", { storgae: {} });
    const options = context();

    const check = await checkConfig(options);

    expect(check.status).toBe("fail");
    expect(check.message).toContain('Invalid config in "atium.config.json"');
    expect(check.hint).toBe('Did you mean "storage"?');
    expect(check.details).toEqual({ file: null, adapters: null });
    expect(options.logger.entries.map(({ level }) => level)).toEqual(["debug"]);
  });

  it("loads the file named by --config", async () => {
    await writeConfig("custom.json", { adapters: ["cypress"] });

    const check = await checkConfig(context({ config: "custom.json" }));

    expect(check.details).toEqual({ file: "custom.json", adapters: ["cypress"] });
  });

  it("shows a file outside the working directory by its absolute path", async () => {
    const elsewhere = await mkdtemp(path.join(tmpdir(), "atium-doctor-elsewhere-"));
    try {
      const file = path.join(elsewhere, "atium.config.json");
      await writeFile(file, "{}");

      const check = await checkConfig(context({}, { ATIUM_CONFIG: file }));

      expect(check.details).toEqual({ file, adapters: [] });
    } finally {
      await rm(elsewhere, { recursive: true, force: true });
    }
  });

  it("shows a file whose name starts with two dots as relative", async () => {
    await writeConfig("..atium.json", {});

    const check = await checkConfig(context({ config: "..atium.json" }));

    expect(check.details).toEqual({ file: "..atium.json", adapters: [] });
  });

  it("fails when the file named by --config does not exist", async () => {
    const check = await checkConfig(context({ config: "missing.json" }));

    expect(check.status).toBe("fail");
    expect(check.hint).toBeDefined();
  });

  it("fails on an invalid ATIUM_LOG_LEVEL", async () => {
    const check = await checkConfig(context({}, { ATIUM_LOG_LEVEL: "loud" }));

    expect(check.status).toBe("fail");
    expect(check.message).toContain("ATIUM_LOG_LEVEL");
  });

  it("ignores ATIUM_LOG_LEVEL when a log level flag is given, as the other commands do", async () => {
    const check = await checkConfig(context({ logLevel: "debug" }, { ATIUM_LOG_LEVEL: "loud" }));

    expect(check.status).toBe("warn");
  });
});
