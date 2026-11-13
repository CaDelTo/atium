import { describe, expect, it } from "vitest";
import { isPageObjectFile } from "./page-objects.js";

describe("isPageObjectFile: edge cases", () => {
  it.each([
    ["an absolute Windows path inside cwd", "C:\\repo\\tests\\pages\\a.ts", true],
    ["a Windows path outside cwd", "D:\\other\\tests\\pages\\a.ts", false],
    ["a Windows path outside the page directories", "C:\\repo\\tests\\a.spec.ts", false],
  ])("with a Windows cwd, %s gives %s", (_name, filename, expected) => {
    expect(isPageObjectFile(filename, "C:\\repo", ["tests/pages/**"])).toBe(expected);
  });

  it("does not treat <text> as a Page Object", () => {
    expect(isPageObjectFile("<text>", "/repo", ["**"])).toBe(false);
  });

  it("does not treat cwd itself as a Page Object", () => {
    expect(isPageObjectFile("/repo", "/repo", ["**", "tests/pages"])).toBe(false);
  });

  it("covers a directory given with a trailing slash", () => {
    expect(isPageObjectFile("tests/pages/a.ts", "/repo", ["tests/pages/"])).toBe(true);
    expect(isPageObjectFile("tests/pages-old/a.ts", "/repo", ["tests/pages/"])).toBe(false);
  });
});
