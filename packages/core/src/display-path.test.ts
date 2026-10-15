import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve, sep } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isMissingFileError } from "./errno.js";
import { displayPath } from "./paths.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261015, numRuns: 500 };

// Includes dot-prefixed names such as "..a", the edge of the rule.
const name = fc.stringMatching(/^[\w.-]{1,6}$/).filter((value) => value !== "." && value !== "..");
const names = fc.array(name, { minLength: 0, maxLength: 4 });

describe("displayPath properties", () => {
  it("resolves back to the same file and never starts with .. when it is not the file", () => {
    fc.assert(
      fc.property(names, names, (cwdNames, fileNames) => {
        const cwd = resolve(sep, "root", ...cwdNames);
        const file = resolve(sep, "root", ...fileNames);

        const result = displayPath(cwd, file);

        if (result !== file) {
          expect(resolve(cwd, result)).toBe(resolve(file));
          expect(result === ".." || result.startsWith(`..${sep}`)).toBe(false);
          expect(isAbsolute(result)).toBe(false);
        }
      }),
      runOptions,
    );
  });

  it("is relative for every file strictly inside cwd, also with dot-prefixed names", () => {
    fc.assert(
      fc.property(names, fc.array(name, { minLength: 1, maxLength: 4 }), (cwdNames, inner) => {
        const cwd = resolve(sep, "root", ...cwdNames);

        expect(displayPath(cwd, join(cwd, ...inner))).toBe(join(...inner));
      }),
      runOptions,
    );
  });

  it("returns the file as given when it is outside cwd", () => {
    fc.assert(
      fc.property(names, fc.array(name, { minLength: 1, maxLength: 3 }), (cwdNames, outer) => {
        const cwd = resolve(sep, "root", "base", ...cwdNames);
        const file = join(resolve(sep, "other"), ...outer);

        expect(displayPath(cwd, file)).toBe(file);
      }),
      runOptions,
    );
  });
});

describe("displayPath with redundant separators", () => {
  const cwd = resolve(sep, "repo", "project");

  it("normalises doubled separators, dot segments and a trailing separator of cwd", () => {
    const file = `${cwd}${sep}${sep}tests${sep}.${sep}a.ts`;

    expect(displayPath(`${cwd}${sep}`, file)).toBe(join("tests", "a.ts"));
  });

  it("treats a file that goes up and comes back down as inside cwd", () => {
    const file = join(cwd, "..", "project", "a.ts");

    expect(displayPath(cwd, file)).toBe("a.ts");
  });

  it("returns a file that escapes through dot segments as given", () => {
    const file = `${cwd}${sep}tests${sep}..${sep}..${sep}x.ts`;

    expect(displayPath(cwd, file)).toBe(file);
  });
});

describe("isMissingFileError with real file system errors", () => {
  it("is true for a missing path and a path under a file, and false for reading a directory", async () => {
    const directory = await mkdtemp(join(tmpdir(), "atium-errno-"));
    try {
      await writeFile(join(directory, "file"), "");

      const underFile = await readFile(join(directory, "file", "child")).catch((e: unknown) => e);
      const missing = await readFile(join(directory, "none")).catch((e: unknown) => e);
      const isDirectory = await readFile(directory).catch((e: unknown) => e);

      expect(isMissingFileError(underFile)).toBe(true);
      expect(isMissingFileError(missing)).toBe(true);
      expect(isMissingFileError(isDirectory)).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
