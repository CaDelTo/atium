import { describe, expect, it } from "vitest";
import { formatText } from "./format-text.js";
import type { DoctorCheck, DoctorReport } from "./report.js";

const nodePass: DoctorCheck = {
  id: "node",
  status: "pass",
  message: "Node.js 22.12.0; Atium needs 22.12.0 or later.",
  details: { version: "22.12.0", required: "22.12.0" },
};

const frameworksWarn: DoctorCheck = {
  id: "frameworks",
  status: "warn",
  message: "No framework.",
  hint: "Add one.",
  details: { adapters: [] },
};

const configFail: DoctorCheck = {
  id: "config",
  status: "fail",
  message: 'Invalid config in "atium.config.ts":\n- first problem\n- second problem',
  hint: "Fix it.",
  details: { file: null, adapters: null },
};

function report(...checks: DoctorCheck[]): DoctorReport {
  return { ok: checks.every(({ status }) => status !== "fail"), checks };
}

describe("formatText", () => {
  it("writes a table with a summary when every check passes", () => {
    expect(formatText(report(nodePass))).toBe(
      [
        "CHECK  STATUS  RESULT",
        "node   pass    Node.js 22.12.0; Atium needs 22.12.0 or later.",
        "",
        "All checks passed.",
        "",
      ].join("\n"),
    );
  });

  it("puts the hint under a check that does not pass and continues long messages under their column", () => {
    expect(formatText(report(nodePass, configFail, frameworksWarn))).toBe(
      [
        "CHECK       STATUS  RESULT",
        "node        pass    Node.js 22.12.0; Atium needs 22.12.0 or later.",
        'config      fail    Invalid config in "atium.config.ts":',
        "                    - first problem",
        "                    - second problem",
        "                    Hint: Fix it.",
        "frameworks  warn    No framework.",
        "                    Hint: Add one.",
        "",
        "1 check failed, with 1 warning.",
        "",
      ].join("\n"),
    );
  });

  it("indents every line of a hint of several lines", () => {
    const text = formatText(report({ ...frameworksWarn, hint: "First.\nSecond." }));

    expect(text).toContain("                    Hint: First.\n                    Second.\n");
  });

  it.each([
    [[frameworksWarn], "All checks passed, with 1 warning."],
    [[frameworksWarn, { ...frameworksWarn }], "All checks passed, with 2 warnings."],
    [[configFail], "1 check failed."],
    [[configFail, { ...configFail }], "2 checks failed."],
  ] satisfies [DoctorCheck[], string][])("summarizes %j as %s", (checks, summary) => {
    expect(formatText(report(...checks))).toContain(`\n\n${summary}\n`);
  });
});
