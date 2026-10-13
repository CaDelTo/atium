import { chmod, mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { FakeLogger } from "@atium/core/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { useTempDir } from "../../../test/temp-dir.js";
import { MANIFEST_MAX_BYTES } from "../../defaults.js";
import { checkFrameworks } from "./frameworks.js";

const MANIFEST_HINT = `Run atium doctor from the root of the project, whose "package.json" must be a JSON file of at most ${String(MANIFEST_MAX_BYTES)} bytes.`;

const workDir = useTempDir("atium-doctor-frameworks-");
let cwd: string;

beforeEach(() => {
  cwd = workDir();
});

async function writeManifest(text: string): Promise<void> {
  await writeFile(path.join(cwd, "package.json"), text);
}

describe("checkFrameworks", () => {
  it("passes with the adapters of the frameworks in package.json", async () => {
    await writeManifest(JSON.stringify({ devDependencies: { "@playwright/test": "1.0.0" } }));

    expect(await checkFrameworks(cwd, new FakeLogger())).toEqual({
      id: "frameworks",
      status: "pass",
      message: 'Detected the adapters "playwright" from "package.json".',
      details: { adapters: ["playwright"] },
    });
  });

  it("warns when package.json has no framework Atium knows", async () => {
    await writeManifest(JSON.stringify({ devDependencies: { jest: "30.0.0" } }));

    expect(await checkFrameworks(cwd, new FakeLogger())).toEqual({
      id: "frameworks",
      status: "warn",
      message:
        '"package.json" has no Playwright or Cypress dependency, so no test framework was detected.',
      hint: "Add @playwright/test or cypress to the devDependencies of the project.",
      details: { adapters: [] },
    });
  });

  it("warns without package.json", async () => {
    expect(await checkFrameworks(cwd, new FakeLogger())).toEqual({
      id: "frameworks",
      status: "warn",
      message: '"package.json" was not found, so no test framework was detected.',
      hint: MANIFEST_HINT,
      details: { adapters: [] },
    });
  });

  it("warns when package.json is a directory", async () => {
    await mkdir(path.join(cwd, "package.json"));

    const check = await checkFrameworks(cwd, new FakeLogger());

    expect(check.status).toBe("warn");
    expect(check.message).toContain("is not a regular file");
  });

  it("warns when package.json is too large", async () => {
    await writeManifest(" ".repeat(MANIFEST_MAX_BYTES + 1));

    const check = await checkFrameworks(cwd, new FakeLogger());

    expect(check.status).toBe("warn");
    expect(check.message).toContain(`is larger than ${String(MANIFEST_MAX_BYTES)} bytes`);
  });

  it("warns and logs the cause at debug level when package.json is not JSON", async () => {
    await writeManifest("{");
    const logger = new FakeLogger();

    const check = await checkFrameworks(cwd, logger);

    expect(check.status).toBe("warn");
    expect(check.message).toBe(
      '"package.json" could not be read as a package manifest, so no test framework was detected.',
    );
    expect(logger.entries.map(({ level }) => level)).toEqual(["debug"]);
  });

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "warns with the error code when package.json cannot be read",
    async () => {
      await writeManifest("{}");
      await chmod(path.join(cwd, "package.json"), 0o000);

      const check = await checkFrameworks(cwd, new FakeLogger());

      expect(check.status).toBe("warn");
      expect(check.message).toBe(
        '"package.json" could not be read as a package manifest, so no test framework was detected. Error code: EACCES.',
      );
    },
  );

  it("warns without logging anything when package.json has another shape", async () => {
    await writeManifest(JSON.stringify({ devDependencies: [] }));
    const logger = new FakeLogger();

    const check = await checkFrameworks(cwd, logger);

    expect(check.status).toBe("warn");
    expect(logger.entries).toEqual([]);
  });
});
