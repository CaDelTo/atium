import { z } from "zod";
import { REPORT_SCHEMA_VERSION, ReportSchema } from "./report.js";
import { RunSchema, SCHEMA_VERSION } from "./run.js";

/**
 * JSON Schema of a {@link RunSchema | Run}, as published in
 * `packages/core/schemas/run.v1.json`.
 *
 * JSON Schema cannot express every rule of the Zod schema: text caps appear as
 * `maxLength`, a safe upper bound, while the real cap is measured in UTF-8
 * bytes of the JSON-escaped value (ADR-0018).
 *
 * @returns The JSON Schema, with a title and a description.
 */
export function runJsonSchema(): Record<string, unknown> {
  return {
    ...z.toJSONSchema(RunSchema, { override: withoutReadOnly }),
    title: `Atium run (schemaVersion ${String(SCHEMA_VERSION)})`,
    description:
      "One execution of a job or shard, with its results. Text limits are measured in UTF-8 bytes of the value once escaped for JSON, without the surrounding quotes; maxLength is only an upper bound of that measure. Run files store this object as NDJSON: the run without results on line 1, then one result per line (ADR-0018).",
  };
}

/**
 * JSON Schema of a {@link ReportSchema | Report}, as published in
 * `packages/core/schemas/report.v1.json` (13-score-baseline-reports.md §21.5).
 *
 * JSON Schema cannot express every rule of the report: `docsUrl` appears as
 * `format: "uri"` without its `http`/`https` restriction, and the order and
 * summary that `createReport` guarantees are not checked.
 *
 * @returns The JSON Schema, with a title and a description.
 */
export function reportJsonSchema(): Record<string, unknown> {
  return {
    ...z.toJSONSchema(ReportSchema, { override: withoutReadOnly }),
    title: `Atium report (schemaVersion ${String(REPORT_SCHEMA_VERSION)})`,
    description:
      "Findings of an analysis with their state against the baseline, a summary, the rules and the skipped analyzers (ADR-0027). docsUrl only accepts http and https URLs. Findings are in the order of compareFindings, and rules, summary.byRule and skippedAnalyzers are sorted; this schema does not check the order or the counts.",
  };
}

// `readonly()` describes the parsed objects, which are frozen, not the file format.
function withoutReadOnly(context: { readonly jsonSchema: { readOnly?: boolean } }): void {
  delete context.jsonSchema.readOnly;
}
