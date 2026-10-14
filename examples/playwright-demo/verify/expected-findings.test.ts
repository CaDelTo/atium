import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Checks the format of expected-findings.json, the source of truth of the
// linter acceptance tests (v1-38, v1-42). Whether the rules actually report
// these findings is checked there, not here.

const DEMO_ROOT = fileURLToPath(new URL("..", import.meta.url));

/** The 14 rules of docs/design/03-linter.md §11.3 and §11.4 (catalog in §11.8). */
const RULE_IDS = [
  "E2E001",
  "E2E002",
  "E2E003",
  "E2E004",
  "E2E005",
  "E2E006",
  "E2E006b",
  "E2E007",
  "E2E008",
  "E2E009",
  "E2E010",
  "E2E011",
  "E2E012",
  "E2E013",
] as const;

/** A POSIX path relative to the demo root that stays inside it. */
const DemoPathSchema = z
  .string()
  .min(1)
  .refine(
    (file) =>
      !file.startsWith("/") &&
      !file.includes("\\") &&
      file.split("/").every((segment) => segment !== "" && segment !== "." && segment !== ".."),
    { message: "Use a POSIX path relative to the demo root, without '.' or '..' segments" },
  );

const ExpectedFindingSchema = z.strictObject({
  ruleId: z.enum(RULE_IDS),
  file: DemoPathSchema,
  line: z.int().positive(),
  /** Titles of the test that contains the finding; empty outside a test. */
  titlePath: z.array(z.string().min(1)),
});

const ExpectedFindingsSchema = z.strictObject({
  findings: z.array(ExpectedFindingSchema).min(1),
});

type ExpectedFinding = z.infer<typeof ExpectedFindingSchema>;

async function readDemoFile(file: string): Promise<string> {
  return readFile(path.join(DEMO_ROOT, file), "utf8");
}

async function loadExpectedFindings(): Promise<readonly ExpectedFinding[]> {
  const json: unknown = JSON.parse(await readDemoFile("expected-findings.json"));
  return ExpectedFindingsSchema.parse(json).findings;
}

/** Compares strings by UTF-16 code units, as `compareFindings` in @atium/core does. */
function compareStrings(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/** The order of `compareFindings` without column and fingerprint, which the file does not record. */
function compareExpected(a: ExpectedFinding, b: ExpectedFinding): number {
  return compareStrings(a.file, b.file) || a.line - b.line || compareStrings(a.ruleId, b.ruleId);
}

function describeFinding(finding: ExpectedFinding): string {
  return `${finding.ruleId} ${finding.file}:${String(finding.line)}`;
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** Lines of a demo file, or `undefined` if the file does not exist. */
async function readDemoLines(file: string): Promise<readonly string[] | undefined> {
  try {
    return (await readDemoFile(file)).split("\n");
  } catch (error) {
    if (isMissingFile(error)) {
      return undefined;
    }
    throw error;
  }
}

/** A `test(...)` call with a literal title, focused or skipped too; not `test.describe`. */
const TEST_CALL = /\btest(?:\.only|\.skip)?\(\s*"([^"]*)"/;
/** A `test.describe(...)` call with a literal title, in any of its modes. */
const DESCRIBE_CALL = /\btest\.describe(?:\.serial|\.only|\.skip)?\(\s*"([^"]*)"/;

/**
 * Titles that a finding on `line` (1-based) can have: the last test that starts
 * at or before it, and the describes opened before it. Matched by text, which is
 * enough for the demo, whose titles are literal strings.
 */
function titlesUpTo(
  lines: readonly string[],
  line: number,
): { test: string | undefined; describes: ReadonlySet<string> } {
  let test: string | undefined;
  const describes = new Set<string>();
  for (const text of lines.slice(0, line)) {
    test = TEST_CALL.exec(text)?.[1] ?? test;
    const describe = DESCRIBE_CALL.exec(text)?.[1];
    if (describe !== undefined) {
      describes.add(describe);
    }
  }
  return { test, describes };
}

/** Why the `titlePath` of a finding does not fit its line, or `undefined` if it does. */
function titlePathProblem(finding: ExpectedFinding, lines: readonly string[]): string | undefined {
  const testTitle = finding.titlePath.at(-1);
  if (testTitle === undefined) {
    return undefined;
  }
  const titles = titlesUpTo(lines, finding.line);
  if (titles.test !== testTitle) {
    return `the test at that line is ${JSON.stringify(titles.test)}, not ${JSON.stringify(testTitle)}`;
  }
  const missing = finding.titlePath.slice(0, -1).filter((title) => !titles.describes.has(title));
  return missing.length > 0 ? `no describe before that line: ${missing.join(", ")}` : undefined;
}

const validFinding = {
  ruleId: "E2E001",
  file: "tests/login.spec.ts",
  line: 1,
  titlePath: ["Login", "signs in"],
};

describe("the expected-findings schema", () => {
  it("accepts a valid finding", () => {
    expect(ExpectedFindingSchema.safeParse(validFinding).success).toBe(true);
  });

  it.each([
    ["an unknown rule", { ...validFinding, ruleId: "E2E099" }],
    ["an absolute path", { ...validFinding, file: "/tests/login.spec.ts" }],
    ["a path that leaves the demo", { ...validFinding, file: "../tests/login.spec.ts" }],
    ["a Windows path", { ...validFinding, file: "tests\\login.spec.ts" }],
    ["line 0", { ...validFinding, line: 0 }],
    ["a fractional line", { ...validFinding, line: 1.5 }],
    ["an empty title", { ...validFinding, titlePath: [""] }],
    ["a missing titlePath", { ruleId: "E2E001", file: "tests/login.spec.ts", line: 1 }],
    ["an unknown key", { ...validFinding, column: 3 }],
  ])("rejects %s", (_case, finding) => {
    expect(ExpectedFindingSchema.safeParse(finding).success).toBe(false);
  });
});

describe("expected-findings.json", () => {
  it("matches the schema", async () => {
    await expect(loadExpectedFindings()).resolves.not.toHaveLength(0);
  });

  it("has findings of exactly the 14 rules", async () => {
    const ruleIds = new Set((await loadExpectedFindings()).map((finding) => finding.ruleId));

    expect(ruleIds).toEqual(new Set(RULE_IDS));
  });

  it("is ordered by file, line and rule, without duplicates", async () => {
    const findings = await loadExpectedFindings();

    const outOfOrder = findings
      .slice(1)
      .filter((finding, index) => {
        const previous = findings[index];
        return previous !== undefined && compareExpected(previous, finding) >= 0;
      })
      .map(describeFinding);

    expect(outOfOrder).toEqual([]);
  });

  it("points every finding at a non-blank line of a file of the demo suite", async () => {
    const problems: string[] = [];
    for (const finding of await loadExpectedFindings()) {
      const lines = await readDemoLines(finding.file);
      const line = lines?.[finding.line - 1];
      if (!finding.file.startsWith("tests/")) {
        problems.push(`${describeFinding(finding)}: not in tests/`);
      } else if (lines === undefined) {
        problems.push(`${describeFinding(finding)}: no such file`);
      } else if (line === undefined || line.trim() === "") {
        problems.push(`${describeFinding(finding)}: no such line, or the line is blank`);
      }
    }

    expect(problems).toEqual([]);
  });

  it("gives each finding inside a test the titles of that test", async () => {
    const problems: string[] = [];
    for (const finding of await loadExpectedFindings()) {
      const lines = await readDemoLines(finding.file);
      const problem = lines === undefined ? undefined : titlePathProblem(finding, lines);
      if (problem !== undefined) {
        problems.push(`${describeFinding(finding)}: ${problem}`);
      }
    }

    expect(problems).toEqual([]);
  });
});
