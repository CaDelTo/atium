import { describe, expect, it } from "vitest";
import { SEVERITY_WEIGHTS } from "./defaults.js";

describe("SEVERITY_WEIGHTS", () => {
  it("weighs info 0.25, warning 1 and error 3 (13-score-baseline-reports.md §21.1)", () => {
    expect(SEVERITY_WEIGHTS).toEqual({ info: 0.25, warning: 1, error: 3 });
  });
});
