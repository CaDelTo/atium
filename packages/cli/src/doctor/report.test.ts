import { describe, expect, it } from "vitest";
import { DoctorReportSchema } from "./report.js";

const pass = {
  id: "node",
  status: "pass",
  message: "Node.js 22.12.0.",
  details: { version: "22.12.0", required: "22.12.0" },
};

const fail = {
  id: "storage",
  status: "fail",
  message: "Cannot be written.",
  hint: "Fix the permissions.",
  details: { directory: ".atium", exists: true },
};

const COMMIT = "0123456789abcdef0123456789abcdef01234567";

/** A check as JSON, not validated yet. */
interface CheckInput {
  readonly id: string;
  readonly [key: string]: unknown;
}

/** Every check passing, in the order of `CHECK_IDS`. */
const healthy: readonly CheckInput[] = [
  pass,
  {
    id: "config",
    status: "pass",
    message: "Loaded.",
    details: { file: "atium.config.ts", adapters: [] },
  },
  {
    id: "git",
    status: "pass",
    message: "Repository.",
    details: { commit: COMMIT, branch: "main" },
  },
  {
    id: "ci",
    status: "pass",
    message: "Local run.",
    details: { git: { commitSha: COMMIT, dirty: false }, ci: { provider: "local" } },
  },
  {
    id: "storage",
    status: "pass",
    message: "Writable.",
    details: { directory: ".atium", exists: true },
  },
  { id: "frameworks", status: "pass", message: "Detected.", details: { adapters: ["cypress"] } },
];

/** The healthy checks, with each given check in place of the one with its id. */
function checksWith(...replacements: CheckInput[]): CheckInput[] {
  return healthy.map((check) => replacements.find(({ id }) => id === check.id) ?? check);
}

describe("DoctorReportSchema", () => {
  it("accepts a report whose ok matches its checks", () => {
    expect(DoctorReportSchema.safeParse({ ok: true, checks: checksWith() }).success).toBe(true);
    expect(DoctorReportSchema.safeParse({ ok: false, checks: checksWith(fail) }).success).toBe(
      true,
    );
  });

  it("rejects ok: true with a failed check, and ok: false without one", () => {
    expect(DoctorReportSchema.safeParse({ ok: true, checks: checksWith(fail) }).success).toBe(
      false,
    );
    expect(DoctorReportSchema.safeParse({ ok: false, checks: checksWith() }).success).toBe(false);
  });

  it("rejects a check that does not pass and has no hint", () => {
    const withoutHint = { ...pass, status: "fail" };

    expect(
      DoctorReportSchema.safeParse({ ok: false, checks: checksWith(withoutHint) }).success,
    ).toBe(false);
  });

  it("rejects details that do not belong to the check", () => {
    const check = { ...pass, details: { directory: ".atium", exists: true } };

    expect(DoctorReportSchema.safeParse({ ok: true, checks: checksWith(check) }).success).toBe(
      false,
    );
  });

  it("rejects an unknown check", () => {
    const check = { ...pass, id: "remote-storage" };

    expect(
      DoctorReportSchema.safeParse({ ok: true, checks: [...checksWith(), check] }).success,
    ).toBe(false);
  });

  it("rejects missing, repeated or reordered checks", () => {
    const checks = checksWith();

    expect(DoctorReportSchema.safeParse({ ok: true, checks: checks.slice(1) }).success).toBe(false);
    expect(
      DoctorReportSchema.safeParse({ ok: true, checks: [...checks.slice(0, 5), pass] }).success,
    ).toBe(false);
    expect(DoctorReportSchema.safeParse({ ok: true, checks: [...checks].reverse() }).success).toBe(
      false,
    );
  });
});
