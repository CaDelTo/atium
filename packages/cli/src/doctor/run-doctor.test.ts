import { execFileSync } from "node:child_process";
import { chmod, realpath, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { EnvVars } from "@atium/core";
import { FakeGitClient } from "@atium/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeRun } from "../../test/fake-io.js";
import type { FakeRun } from "../../test/fake-io.js";
import { useTempDir } from "../../test/temp-dir.js";
import { createCommandContext } from "../command-context.js";
import { run } from "../run.js";
import { diagnose } from "./run-doctor.js";
import { CHECK_IDS, DoctorReportSchema } from "./report.js";
import type { CheckStatus, DoctorReport } from "./report.js";

// The acceptance cases of v0-18 run the whole command, `atium doctor`, in a
// temporary directory with the real Git.

const workDir = useTempDir("atium-doctor-");
let cwd: string;

beforeEach(async () => {
  cwd = workDir();
  // Git must not find a repository above the temporary directory, nor use
  // one named by the environment the tests run in.
  vi.stubEnv("GIT_CEILING_DIRECTORIES", await realpath(path.dirname(cwd)));
  for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"]) {
    vi.stubEnv(name, undefined);
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function git(...args: string[]): void {
  execFileSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- test setup that needs the same `git` from the PATH as the code under test
    "git",
    [
      "-c",
      "user.name=Atium",
      "-c",
      "user.email=atium@example.test",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { cwd, stdio: "ignore" },
  );
}

/** A project where every check passes: a Git repository with a commit, a valid config and Playwright. */
async function healthyProject(): Promise<void> {
  git("init", "--quiet");
  git("commit", "--quiet", "--allow-empty", "--message", "initial");
  await writeFile(
    path.join(cwd, "atium.config.json"),
    JSON.stringify({ adapters: ["playwright"] }),
  );
  await writeFile(
    path.join(cwd, "package.json"),
    JSON.stringify({ devDependencies: { "@playwright/test": "1.0.0" } }),
  );
}

async function doctor(
  flags: readonly string[] = [],
  env: EnvVars = {},
): Promise<{ code: number; options: FakeRun }> {
  const options = fakeRun(["doctor", ...flags], { cwd, env });
  return { code: await run(options), options };
}

async function doctorJson(env: EnvVars = {}): Promise<{ code: number; report: DoctorReport }> {
  const { code, options } = await doctor(["--format", "json"], env);
  const parsed: unknown = JSON.parse(options.stdout.text);
  return { code, report: DoctorReportSchema.parse(parsed) };
}

function statuses(report: DoctorReport): Record<string, CheckStatus> {
  return Object.fromEntries(report.checks.map(({ id, status }) => [id, status]));
}

const FAILED_ONE = [
  "atium doctor found 1 failed check.",
  "  Hint: Fix each failed check as its hint says, then run atium doctor again.",
  "",
].join("\n");

describe("atium doctor", () => {
  describe("when everything is correct", () => {
    it("writes a table where every check passes and exits with 0", async () => {
      await healthyProject();

      const { code, options } = await doctor();

      expect(code).toBe(0);
      const rows = options.stdout.text.split("\n");
      expect(rows[0]).toMatch(/^CHECK +STATUS +RESULT$/);
      for (const id of CHECK_IDS) {
        expect(rows.find((row) => row.startsWith(`${id} `))).toMatch(new RegExp(`^${id} +pass `));
      }
      expect(options.stdout.text).toContain(
        'Loaded "atium.config.json" with the adapters "playwright".',
      );
      expect(options.stdout.text).toMatch(/\n\nAll checks passed\.\n$/);
      expect(options.stderr.text).toBe("");
    });

    it("writes the same checks as JSON with --format json", async () => {
      await healthyProject();

      const { code, report } = await doctorJson();

      expect(code).toBe(0);
      expect(report.ok).toBe(true);
      expect(report.checks.map(({ id }) => id)).toEqual(CHECK_IDS);
      expect(new Set(report.checks.map(({ status }) => status))).toEqual(new Set(["pass"]));
    });

    it("accepts --format text, the default", async () => {
      await healthyProject();

      const { code, options } = await doctor(["--format", "text"]);

      expect(code).toBe(0);
      expect(options.stdout.text).toContain("All checks passed.");
    });
  });

  describe("with an invalid config", () => {
    it("fails the config check with its hint, runs the other checks and exits with 2", async () => {
      await healthyProject();
      await writeFile(path.join(cwd, "atium.config.json"), JSON.stringify({ storgae: {} }));

      const { code, options } = await doctor();

      expect(code).toBe(2);
      expect(options.stdout.text).toMatch(
        /^config +fail +Invalid config in "atium\.config\.json"/m,
      );
      expect(options.stdout.text).toContain('Hint: Did you mean "storage"?');
      expect(options.stdout.text).toMatch(/^storage +pass /m);
      expect(options.stderr.text).toBe(FAILED_ONE);
    });

    it("reports it in valid JSON", async () => {
      await healthyProject();
      await writeFile(path.join(cwd, "atium.config.json"), "{");

      const { code, report } = await doctorJson();

      expect(code).toBe(2);
      expect(report.ok).toBe(false);
      expect(statuses(report)).toMatchObject({ config: "fail", git: "pass", ci: "pass" });
    });
  });

  describe("without Git", () => {
    it("fails the git and ci checks outside a repository and exits with 2", async () => {
      const { code, report } = await doctorJson();

      expect(code).toBe(2);
      expect(statuses(report)).toEqual({
        node: "pass",
        config: "warn",
        git: "fail",
        ci: "fail",
        storage: "pass",
        frameworks: "warn",
      });
      const gitCheck = report.checks.find(({ id }) => id === "git");
      expect(gitCheck?.hint).toBe(
        "Run Atium inside a Git repository with at least one commit, or set ATIUM_COMMIT_SHA.",
      );
    });

    it("only warns when the commit comes from the environment", async () => {
      const { code, report } = await doctorJson({
        ATIUM_COMMIT_SHA: "0123456789abcdef0123456789abcdef01234567",
      });

      expect(code).toBe(0);
      expect(statuses(report)).toMatchObject({ git: "warn", ci: "pass" });
    });

    it("fails when Git is not installed", async () => {
      const context = createCommandContext(fakeRun([], { cwd }), { ci: false, strict: false });

      const report = await diagnose(context, {
        nodeVersion: "22.12.0",
        git: new FakeGitClient("unavailable"),
      });

      expect(statuses(report)).toMatchObject({ git: "fail", ci: "fail" });
      expect(report.ok).toBe(false);
    });
  });

  describe.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "in a directory without write permission",
    () => {
      it("fails the storage check and exits with 2", async () => {
        await healthyProject();
        await chmod(cwd, 0o500);

        const { code, options } = await doctor();

        expect(code).toBe(2);
        expect(options.stdout.text).toMatch(
          /^storage +fail +The working directory cannot be written \(EACCES\)/m,
        );
        expect(options.stderr.text).toBe(FAILED_ONE);
      });
    },
  );

  it("exits with 2 on an unsupported --format, before checking anything", async () => {
    const { code, options } = await doctor(["--format", "junit"]);

    expect(code).toBe(2);
    expect(options.stdout.text).toBe("");
    expect(options.stderr.text).toBe(
      'atium doctor does not support --format "junit".\n  Hint: Use --format text or --format json.\n',
    );
  });

  it("redacts secrets in messages", async () => {
    await healthyProject();
    const token = "ghp_0123456789abcdefghijABCDEFGHIJ012345";
    await writeFile(
      path.join(cwd, "atium.config.json"),
      JSON.stringify({ adapters: [`Bearer ${token}`] }),
    );

    const { options } = await doctor();

    expect(options.stdout.text).not.toContain(token);
  });

  it("redacts secrets in every field of the JSON report", async () => {
    await healthyProject();
    const token = "ghp_0123456789abcdefghijABCDEFGHIJ012345";
    await writeFile(
      path.join(cwd, "atium.config.json"),
      JSON.stringify({ adapters: [`Bearer ${token}`] }),
    );

    const { options } = await doctor(["--format", "json"], {
      ATIUM_COMMIT_SHA: "0123456789abcdef0123456789abcdef01234567",
      ATIUM_BRANCH: `Bearer ${token}`,
    });

    expect(options.stdout.text).toContain("[REDACTED]");
    expect(options.stdout.text).not.toContain(token);
    expect(DoctorReportSchema.safeParse(JSON.parse(options.stdout.text)).success).toBe(true);
  });
});
