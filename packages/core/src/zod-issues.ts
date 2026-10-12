import type { z } from "zod";
import { ZOD_ISSUES_SHOWN } from "./defaults.js";
import { quoteForMessage } from "./quote.js";

/**
 * Describes Zod issues for an error message, as `"path": "message"`. Both are
 * quoted with {@link quoteForMessage}: a path can hold a record key taken from
 * the data, so it is escaped and capped. A long line can have many issues, so
 * only the first {@link ZOD_ISSUES_SHOWN} are listed and the rest are
 * counted.
 *
 * @param issues - Issues of a failed `safeParse`.
 * @returns The description, such as `"test.testId": "Invalid string"; and 2 more`.
 */
export function describeIssues(issues: readonly z.core.$ZodIssue[]): string {
  const shown = issues
    .slice(0, ZOD_ISSUES_SHOWN)
    .map(
      (issue) =>
        `${quoteForMessage(issue.path.map(String).join("."))}: ${quoteForMessage(issue.message)}`,
    )
    .join("; ");
  const hidden = issues.length - ZOD_ISSUES_SHOWN;
  return hidden > 0 ? `${shown}; and ${String(hidden)} more` : shown;
}
