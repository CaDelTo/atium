import { describe, expect, it } from "vitest";
import * as root from "../index.js";
import * as pure from "./index.js";

describe("@atium/core/pure", () => {
  it("exports only values that the root of @atium/core also exports", () => {
    const rootExports = new Map(Object.entries(root));
    const missing = Object.entries(pure)
      .filter(([name, value]) => rootExports.get(name) !== value)
      .map(([name]) => name);

    expect(missing).toEqual([]);
  });

  it("exports the findings helpers that the ESLint plugin needs", () => {
    expect(Object.keys(pure)).toEqual(
      expect.arrayContaining(["AtiumError", "describeIssues", "ruleDocsUrl"]),
    );
  });
});
