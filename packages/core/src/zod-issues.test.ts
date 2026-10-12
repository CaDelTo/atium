import { z } from "zod";
import { describe, expect, it } from "vitest";
import { ZOD_ISSUES_SHOWN } from "./defaults.js";
import { describeIssues } from "./zod-issues.js";

function issuesOf(schema: z.ZodType, value: unknown): z.core.$ZodIssue[] {
  const parsed = schema.safeParse(value);
  return parsed.success ? [] : parsed.error.issues;
}

describe("describeIssues", () => {
  it("quotes the path and the message of each issue", () => {
    const issues = issuesOf(z.object({ git: z.object({ branch: z.string() }) }), {
      git: { branch: 1 },
    });

    expect(describeIssues(issues)).toBe(
      `"git.branch": "Invalid input: expected string, received number"`,
    );
  });

  it("lists the first issues and counts the rest", () => {
    const issues = issuesOf(
      z.array(z.string()),
      Array.from({ length: ZOD_ISSUES_SHOWN + 3 }, () => 1),
    );

    const described = describeIssues(issues);

    expect(described.split("; ")).toHaveLength(ZOD_ISSUES_SHOWN + 1);
    expect(described.endsWith("; and 3 more")).toBe(true);
  });

  it("escapes and caps a path taken from the data", () => {
    const key = `${"k".repeat(10_000)}\nforged line`;
    const issues = issuesOf(z.record(z.string(), z.number()), { [key]: "x" });

    const described = describeIssues(issues);

    expect(described).not.toContain("\n");
    expect(described.length).toBeLessThan(500);
  });
});
