import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isPageObjectFile } from "./page-objects.js";

/** POSIX on every system: the paths are read by their syntax, not by the OS. */
const CWD = "/repo";

describe("isPageObjectFile", () => {
  it.each([
    ["tests/pages/**", "tests/pages/login.ts", true],
    ["tests/pages/**", "tests/pages/a/b.ts", true],
    ["tests/pages/**", "tests/login.spec.ts", false],
    // A leading ./ is ignored.
    ["./tests/pages/**", "tests/pages/login.ts", true],
    ["./tests/pages/**", "tests/login.spec.ts", false],
    // `*` does not cross `/`.
    ["tests/*.po.ts", "tests/login.po.ts", true],
    ["tests/*.po.ts", "tests/a/login.po.ts", false],
    // A glob without wildcards covers what is inside it, and only that.
    ["tests/pages", "tests/pages/login.ts", true],
    ["tests/pages", "tests/pages/a/b.ts", true],
    ["tests/pages", "tests/pages-old/login.ts", false],
    // Case-sensitive.
    ["Tests/Pages/**", "tests/pages/x.ts", false],
  ])("with %s, %s is a Page Object: %s", (glob, filename, expected) => {
    expect(isPageObjectFile(filename, CWD, [glob])).toBe(expected);
  });

  it("matches an absolute path inside cwd by its path relative to cwd", () => {
    expect(isPageObjectFile("/repo/tests/pages/login.ts", CWD, ["tests/pages/**"])).toBe(true);
  });

  it("matches when any of the globs does", () => {
    expect(isPageObjectFile("tests/pages/login.ts", CWD, ["src/**", "tests/pages/**"])).toBe(true);
  });

  it.each([
    ["a file outside cwd", "/other/tests/pages/login.ts"],
    ["a name that is not a path", "<input>"],
  ])("never treats %s as a Page Object, even with **", (_case, filename) => {
    expect(isPageObjectFile(filename, CWD, ["**"])).toBe(false);
  });

  it("treats no file as a Page Object when pageObjectDirs is empty", () => {
    expect(isPageObjectFile("tests/pages/login.ts", CWD, [])).toBe(false);
  });

  it("gives the same answer for a relative path, its absolute path and a glob with ./", () => {
    const segment = fc.constantFrom("tests", "pages", "a", "login.ts", "x.po.ts");
    const relativePath = fc
      .array(segment, { minLength: 1, maxLength: 4 })
      .map((parts) => parts.join("/"));
    const glob = fc.constantFrom(
      "tests/**",
      "tests/pages/**",
      "tests/*.po.ts",
      "tests/pages",
      "**/*.ts",
    );

    fc.assert(
      fc.property(relativePath, glob, (filename, pattern) => {
        const expected = isPageObjectFile(filename, CWD, [pattern]);

        expect(isPageObjectFile(`${CWD}/${filename}`, CWD, [pattern])).toBe(expected);
        expect(isPageObjectFile(filename, CWD, [`./${pattern}`])).toBe(expected);
      }),
    );
  });
});
