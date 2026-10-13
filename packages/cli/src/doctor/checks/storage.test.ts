import { chmod, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { useTempDir } from "../../../test/temp-dir.js";
import { checkStorage } from "./storage.js";

// Permissions do not apply to root, and chmod does not restrict directories on Windows.
const canRestrict = process.platform !== "win32" && process.getuid?.() !== 0;

const workDir = useTempDir("atium-doctor-storage-");
let cwd: string;

beforeEach(() => {
  cwd = workDir();
});

describe("checkStorage", () => {
  it("passes when .atium exists and can be written, and leaves nothing behind", async () => {
    await mkdir(path.join(cwd, ".atium"));

    expect(await checkStorage(cwd)).toEqual({
      id: "storage",
      status: "pass",
      message: '".atium" can be written.',
      details: { directory: ".atium", exists: true },
    });
    expect(await readdir(path.join(cwd, ".atium"))).toEqual([]);
  });

  it("passes without .atium when the working directory can be written, without creating it", async () => {
    expect(await checkStorage(cwd)).toEqual({
      id: "storage",
      status: "pass",
      message:
        '".atium" does not exist yet; the working directory can be written, so Atium can create it.',
      details: { directory: ".atium", exists: false },
    });
    expect(await readdir(cwd)).toEqual([]);
  });

  it("fails when .atium is a file", async () => {
    await writeFile(path.join(cwd, ".atium"), "");

    expect(await checkStorage(cwd)).toEqual({
      id: "storage",
      status: "fail",
      message: '".atium" is not a directory, so Atium cannot keep its local files there.',
      hint: 'Rename or delete ".atium"; Atium creates the directory when it needs it.',
      details: { directory: ".atium", exists: true },
    });
  });

  it.skipIf(!canRestrict)("fails when .atium cannot be written", async () => {
    await mkdir(path.join(cwd, ".atium"));
    await chmod(path.join(cwd, ".atium"), 0o500);

    expect(await checkStorage(cwd)).toEqual({
      id: "storage",
      status: "fail",
      message:
        '".atium" cannot be written (EACCES), so Atium cannot keep its local files in ".atium".',
      hint: "Give the current user write permission on it, or run Atium from a directory it can write to.",
      details: { directory: ".atium", exists: true },
    });
  });

  it.skipIf(!canRestrict)(
    "fails without .atium when the working directory cannot be written",
    async () => {
      await chmod(cwd, 0o500);

      const check = await checkStorage(cwd);

      expect(check.status).toBe("fail");
      expect(check.message).toBe(
        'The working directory cannot be written (EACCES), so Atium cannot keep its local files in ".atium".',
      );
      expect(check.details).toEqual({ directory: ".atium", exists: false });
    },
  );

  it.skipIf(!canRestrict)("fails when .atium cannot even be checked", async () => {
    await chmod(cwd, 0o000);

    const check = await checkStorage(cwd);

    expect(check.status).toBe("fail");
    expect(check.message).toContain("(EACCES)");
    expect(check.details).toEqual({ directory: ".atium", exists: null });
  });

  describe.skipIf(process.platform === "win32")("when .atium is a symlink", () => {
    it("passes and probes the target when it leads to a directory inside the working directory", async () => {
      await mkdir(path.join(cwd, "data"));
      await symlink("data", path.join(cwd, ".atium"));

      expect(await checkStorage(cwd)).toEqual({
        id: "storage",
        status: "pass",
        message: '".atium" can be written.',
        details: { directory: ".atium", exists: true },
      });
      expect(await readdir(path.join(cwd, "data"))).toEqual([]);
    });

    it("fails when the symlink is broken", async () => {
      await symlink("missing", path.join(cwd, ".atium"));

      expect(await checkStorage(cwd)).toEqual({
        id: "storage",
        status: "fail",
        message:
          '".atium" is a symlink to a path that does not exist, so Atium cannot create the directory.',
        hint: "Replace the symlink with a directory, or point it to a directory inside the working directory.",
        details: { directory: ".atium", exists: true },
      });
    });

    it("fails without writing there when it leads outside the working directory", async () => {
      const outside = await mkdtemp(path.join(tmpdir(), "atium-doctor-outside-"));
      try {
        await symlink(outside, path.join(cwd, ".atium"));

        const check = await checkStorage(cwd);

        expect(check.status).toBe("fail");
        expect(check.message).toBe(
          '".atium" is a symlink to a directory outside the working directory, where Atium does not write.',
        );
        expect(await readdir(outside)).toEqual([]);
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });

    it("fails when it leads to the working directory itself", async () => {
      await symlink(".", path.join(cwd, ".atium"));

      expect((await checkStorage(cwd)).status).toBe("fail");
    });

    it("fails when it leads to a file", async () => {
      await writeFile(path.join(cwd, "data"), "");
      await symlink("data", path.join(cwd, ".atium"));

      const check = await checkStorage(cwd);

      expect(check.status).toBe("fail");
      expect(check.message).toBe(
        '".atium" is not a directory, so Atium cannot keep its local files there.',
      );
    });
  });
});
