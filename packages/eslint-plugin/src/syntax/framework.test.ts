import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { detectFramework } from "./framework.js";

function frameworkOf(code: string, configured?: "playwright" | "cypress") {
  return detectFramework(parseSource(code).program, configured);
}

describe("detectFramework", () => {
  it.each([
    ['import { test } from "@playwright/test";', "playwright"],
    ['import { test } from "playwright/test";', "playwright"],
    ['import type { Page } from "@playwright/test";', "playwright"],
    ['import { defineConfig } from "cypress";', "cypress"],
    ['import { mount } from "cypress/react";', "cypress"],
    ['import type { Reporter } from "@playwright/test/reporter";', "playwright"],
  ] as const)("detects %s as %s", (code, framework) => {
    expect(frameworkOf(code)).toBe(framework);
  });

  it("prefers the configured framework over the imports", () => {
    expect(frameworkOf('import { test } from "@playwright/test";', "cypress")).toBe("cypress");
  });

  it("uses the configured framework when the file imports none", () => {
    expect(frameworkOf('it("works", () => {});', "cypress")).toBe("cypress");
  });

  it("returns undefined when the test comes from a local fixtures file", () => {
    expect(frameworkOf('import { test } from "./fixtures";')).toBeUndefined();
  });

  it("returns undefined for a Cypress spec without imports", () => {
    expect(frameworkOf('it("visits", () => { cy.visit("/"); });')).toBeUndefined();
  });

  it("does not take a package that only shares the prefix", () => {
    expect(frameworkOf('import "cypress-real-events";')).toBeUndefined();
  });

  it("does not count a re-export as an import", () => {
    expect(frameworkOf('export { expect } from "@playwright/test";')).toBeUndefined();
  });

  it("returns undefined when the file imports both frameworks", () => {
    const code = 'import { test } from "@playwright/test";\nimport "cypress";';

    expect(frameworkOf(code)).toBeUndefined();
  });
});
