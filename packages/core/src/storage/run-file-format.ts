import { z } from "zod";
import { RunSchema, SCHEMA_VERSION } from "../model/run.js";
import { TestResultSchema } from "../model/test-result.js";

// Format of a run file (ADR-0018): gzip with NDJSON in UTF-8. Line 1 is the
// header, the `Run` without `results`; each following line is a `TestResult`,
// in the order of `results`.

/** Line 1 of a run file: the `Run` without `results`. Includes `schemaVersion`. */
const RunHeaderSchema = RunSchema.unwrap().omit({ results: true }).readonly();

/** Line 1 of a run file. See {@link RunHeaderSchema}. */
export type RunHeader = z.infer<typeof RunHeaderSchema>;

/** Schemas of one version of the run file. */
export interface RunFileSchemas {
  /** Validates line 1 and gives the current header. */
  readonly header: z.ZodType<RunHeader>;
  /** Validates each following line and gives the current `TestResult`. */
  readonly result: typeof TestResultSchema;
}

/**
 * Schemas of the version the writer produces, `SCHEMA_VERSION`. A new version
 * changes them here, together with its entry in {@link RUN_FILE_SCHEMAS}.
 */
export const CURRENT_RUN_FILE_SCHEMAS: RunFileSchemas = {
  header: RunHeaderSchema,
  result: TestResultSchema,
};

/**
 * Schemas of each `schemaVersion` a reader accepts: the current one and the
 * previous one (02-data-model.md §9.5). Version 1 is the first, so today it is
 * the only one. A new version adds its entry here and migrates the previous
 * one to the current model.
 */
export const RUN_FILE_SCHEMAS: ReadonlyMap<number, RunFileSchemas> = new Map([
  [SCHEMA_VERSION, CURRENT_RUN_FILE_SCHEMAS],
]);

/** Just enough of line 1 to pick the schemas: read before validating anything else. */
export const SchemaVersionProbe = z.looseObject({ schemaVersion: z.int() });
