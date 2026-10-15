import { describe, expect, it } from "vitest";
import { ATIUM_DIRECTORY, RUNS_DIRECTORY, SEVERITY_WEIGHTS } from "./defaults.js";

describe("SEVERITY_WEIGHTS", () => {
  it("weighs info 0.25, warning 1 and error 3 (13-score-baseline-reports.md §21.1)", () => {
    expect(SEVERITY_WEIGHTS).toEqual({ info: 0.25, warning: 1, error: 3 });
  });
});

describe("ATIUM_DIRECTORY", () => {
  it("is .atium (15-storage.md §23.2.1)", () => {
    expect(ATIUM_DIRECTORY).toBe(".atium");
  });

  it("contains RUNS_DIRECTORY", () => {
    expect(RUNS_DIRECTORY).toBe(`${ATIUM_DIRECTORY}/runs`);
  });
});
