import { DOCTOR, ERRORS } from "../messages.js";
import type { DoctorReport } from "./report.js";

/** Spaces between columns. */
const GAP = "  ";

/**
 * Formats the report of `atium doctor` as a table: one row per check with
 * its id, status and message, the hint under a check that does not pass,
 * and a summary line. A message of several lines continues under its column.
 *
 * @param report - The report, already redacted.
 * @returns The text, ending with a line feed. Control characters are not
 * escaped here.
 */
export function formatText(report: DoctorReport): string {
  const { headers } = DOCTOR;
  const idWidth = Math.max(headers.check.length, ...report.checks.map(({ id }) => id.length));
  const statusWidth = Math.max(
    headers.status.length,
    ...report.checks.map(({ status }) => status.length),
  );
  const indent = " ".repeat(idWidth + statusWidth + GAP.length * 2);
  const row = (id: string, status: string, text: string): string =>
    `${id.padEnd(idWidth)}${GAP}${status.padEnd(statusWidth)}${GAP}${text}`;

  const lines = [row(headers.check, headers.status, headers.result)];
  for (const check of report.checks) {
    const [first = "", ...rest] = check.message.split("\n");
    lines.push(row(check.id, check.status, first), ...rest.map((line) => `${indent}${line}`));
    if (check.hint !== undefined) {
      const hint = `${ERRORS.hintPrefix}${check.hint}`.split("\n");
      lines.push(...hint.map((line) => `${indent}${line}`));
    }
  }
  const failed = report.checks.filter(({ status }) => status === "fail").length;
  const warned = report.checks.filter(({ status }) => status === "warn").length;
  lines.push("", DOCTOR.summary(failed, warned));
  return `${lines.join("\n")}\n`;
}
