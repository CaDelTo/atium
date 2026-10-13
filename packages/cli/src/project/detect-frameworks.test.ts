import { describe, expect, it } from "vitest";
import { detectFrameworks } from "./detect-frameworks.js";

describe("detectFrameworks", () => {
  it.each([
    ["@playwright/test", "playwright"],
    ["playwright", "playwright"],
    ["cypress", "cypress"],
  ])("detects %s as the adapter %s", (dependency, adapter) => {
    expect(detectFrameworks({ devDependencies: { [dependency]: "^1.0.0" } })?.adapters).toEqual([
      adapter,
    ]);
  });

  it.each(["dependencies", "devDependencies", "peerDependencies"])("looks in %s", (key) => {
    expect(detectFrameworks({ [key]: { cypress: "13.0.0" } })?.adapters).toEqual(["cypress"]);
  });

  it("lists Playwright before Cypress, once each, whatever the manifest order", () => {
    const manifest = {
      dependencies: { cypress: "13.0.0", playwright: "1.0.0" },
      devDependencies: { "@playwright/test": "1.0.0" },
    };

    expect(detectFrameworks(manifest)?.adapters).toEqual(["playwright", "cypress"]);
  });

  it("detects nothing in a manifest without test frameworks", () => {
    expect(detectFrameworks({ name: "app", dependencies: { react: "19.0.0" } })).toEqual({
      adapters: [],
      hasConfigPackage: false,
    });
  });

  it("ignores packages whose names only contain a framework name", () => {
    expect(
      detectFrameworks({ devDependencies: { "cypress-axe": "1.0.0", "playwright-core": "1.0.0" } })
        ?.adapters,
    ).toEqual([]);
  });

  it("tells whether @atium/core is a dependency", () => {
    expect(
      detectFrameworks({ devDependencies: { "@atium/core": "0.1.0" } })?.hasConfigPackage,
    ).toBe(true);
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a string", "package"],
    ["dependencies as an array", { dependencies: ["cypress"] }],
    ["devDependencies as a string", { devDependencies: "cypress" }],
  ])("rejects %s", (_case, manifest) => {
    expect(detectFrameworks(manifest)).toBeUndefined();
  });
});
