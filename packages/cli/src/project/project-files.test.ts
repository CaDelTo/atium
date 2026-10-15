import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { errnoCode } from "@atium/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFile, entryKind, isRegularFile, readCapped, replaceFile } from "./project-files.js";

let cwd: string;

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), "atium-project-files-"));
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

/** A path that every file system call rejects, on every platform. */
const INVALID_PATH = "invalid\0path";

/** A path under a regular file, which does not exist (`ENOTDIR`). */
async function pathUnderAFile(): Promise<string> {
  await writeFile(path.join(cwd, "file"), "");
  return path.join(cwd, "file", "child");
}

describe("entryKind", () => {
  it("tells a file, a directory and nothing apart", async () => {
    await writeFile(path.join(cwd, "a"), "");
    await mkdir(path.join(cwd, "b"));

    expect(await entryKind(path.join(cwd, "a"))).toBe("file");
    expect(await entryKind(path.join(cwd, "b"))).toBe("directory");
    expect(await entryKind(path.join(cwd, "c"))).toBe("none");
    expect(await entryKind(await pathUnderAFile())).toBe("none");
  });

  it("rejects a path that cannot be checked", async () => {
    await expect(entryKind(INVALID_PATH)).rejects.toThrow();
  });
});

describe("isRegularFile", () => {
  it("accepts only a regular file", async () => {
    await writeFile(path.join(cwd, "a"), "");
    await mkdir(path.join(cwd, "b"));

    expect(await isRegularFile(path.join(cwd, "a"))).toBe(true);
    expect(await isRegularFile(path.join(cwd, "b"))).toBe(false);
    expect(await isRegularFile(path.join(cwd, "c"))).toBe(false);
    expect(await isRegularFile(await pathUnderAFile())).toBe(false);
  });

  it("rejects a path that cannot be checked", async () => {
    await expect(isRegularFile(INVALID_PATH)).rejects.toThrow();
  });
});

describe("readCapped", () => {
  it("reads a file up to the cap", async () => {
    await writeFile(path.join(cwd, "a"), "12345");

    expect(await readCapped(path.join(cwd, "a"), 5)).toEqual({ kind: "text", text: "12345" });
    expect(await readCapped(path.join(cwd, "a"), 4)).toEqual({ kind: "too-large" });
  });

  it("reads an empty file", async () => {
    await writeFile(path.join(cwd, "a"), "");

    expect(await readCapped(path.join(cwd, "a"), 5)).toEqual({ kind: "text", text: "" });
  });

  it("tells why it did not read", async () => {
    await mkdir(path.join(cwd, "b"));

    expect(await readCapped(path.join(cwd, "b"), 5)).toEqual({ kind: "not-a-file" });
    expect(await readCapped(path.join(cwd, "c"), 5)).toEqual({ kind: "missing" });
    expect(await readCapped(await pathUnderAFile(), 5)).toEqual({ kind: "missing" });
  });

  it("rejects a path that cannot be checked", async () => {
    await expect(readCapped(INVALID_PATH, 5)).rejects.toThrow();
  });
});

describe("createFile", () => {
  it("creates a file and never replaces one", async () => {
    const file = path.join(cwd, "a");

    expect(await createFile(file, "first")).toBe("created");
    expect(await createFile(file, "second")).toBe("exists");
    expect(await readFile(file, "utf8")).toBe("first");
  });

  it("rejects any other failure", async () => {
    await expect(createFile(INVALID_PATH, "")).rejects.toThrow();
  });
});

describe("replaceFile", () => {
  it("replaces a file and leaves no temporary directory", async () => {
    const file = path.join(cwd, "a");
    await writeFile(file, "old");

    await replaceFile(file, "new");

    expect(await readFile(file, "utf8")).toBe("new");
    expect(await readdir(cwd)).toEqual(["a"]);
  });

  it("creates the file if it does not exist", async () => {
    await replaceFile(path.join(cwd, "a"), "new");

    expect(await readFile(path.join(cwd, "a"), "utf8")).toBe("new");
  });
});

describe("errnoCode", () => {
  it.each([
    ["a system error", Object.assign(new Error("x"), { code: "ENOENT" }), "ENOENT"],
    ["an error without a code", new Error("x"), undefined],
    ["an error with a numeric code", Object.assign(new Error("x"), { code: 1 }), undefined],
    ["a value that is not an Error", { code: "ENOENT" }, undefined],
  ])("reads %s", (_case, error, code) => {
    expect(errnoCode(error)).toBe(code);
  });
});
