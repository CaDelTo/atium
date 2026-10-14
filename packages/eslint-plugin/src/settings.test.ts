import { thrownAtiumError } from "@atium/core/testing";
import { describe, expect, it } from "vitest";
import { readSettings } from "./settings.js";

function errorOf(settings: Readonly<Record<string, unknown>>) {
  return thrownAtiumError(() => readSettings(settings));
}

describe("readSettings", () => {
  it("applies the defaults when settings.atium is absent", () => {
    expect(readSettings({})).toEqual({ pageObjectDirs: [], assertFunctionNames: [], i18n: false });
  });

  it("applies the defaults to the keys left out", () => {
    expect(readSettings({ atium: { i18n: true } })).toEqual({
      pageObjectDirs: [],
      assertFunctionNames: [],
      i18n: true,
    });
  });

  it("ignores the settings of other plugins", () => {
    expect(readSettings({ react: { version: "19" } }).i18n).toBe(false);
  });

  it("keeps every valid value, including globs", () => {
    const atium = {
      framework: "cypress",
      pageObjectDirs: ["tests/pages/**"],
      assertFunctionNames: ["expectToast", "verify*"],
      i18n: true,
    };

    expect(readSettings({ atium })).toEqual(atium);
  });

  it.each([
    [{ framework: "selenium" }, '"settings.atium.framework"'],
    [{ pageObjectDirs: "tests/pages/**" }, '"settings.atium.pageObjectDirs"'],
    [{ assertFunctionNames: [""] }, '"settings.atium.assertFunctionNames.0"'],
    [{ i18n: "yes" }, '"settings.atium.i18n"'],
  ])("rejects %j naming the key %s", (atium, key) => {
    const error = errorOf({ atium });

    expect(error.code).toBe("CONFIG_INVALID");
    expect(error.message).toContain(key);
  });

  it("rejects an unknown key at its own path and lists the valid ones in the hint", () => {
    const error = errorOf({ atium: { pageObjectDir: ["tests/pages/**"] } });

    expect(error.message).toContain('"settings.atium.pageObjectDir": "Unknown key"');
    expect(error.hint).toContain("framework, pageObjectDirs, assertFunctionNames, i18n");
  });

  it("names every unknown key", () => {
    const error = errorOf({ atium: { i18N: true, frameworks: "cypress" } });

    expect(error.message).toBe(
      'Invalid settings in the ESLint config: "settings.atium.i18N": "Unknown key"; ' +
        '"settings.atium.frameworks": "Unknown key".',
    );
  });

  it("treats an undefined framework as absent", () => {
    expect(readSettings({ atium: { framework: undefined } }).framework).toBeUndefined();
  });

  it("rejects settings.atium that is not an object", () => {
    expect(errorOf({ atium: null }).message).toContain(
      '"settings.atium": "Invalid input: expected object, received null"',
    );
  });
});
