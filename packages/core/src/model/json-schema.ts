import { z } from "zod";
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
    ...z.toJSONSchema(RunSchema, {
      // `readonly()` describes the parsed objects, which are frozen, not the file format.
      override: (context) => {
        delete context.jsonSchema.readOnly;
      },
    }),
    title: `Atium run (schemaVersion ${String(SCHEMA_VERSION)})`,
    description:
      "One execution of a job or shard, with its results. Text limits are measured in UTF-8 bytes of the value once escaped for JSON, without the surrounding quotes; maxLength is only an upper bound of that measure. Run files store this object as NDJSON: the run without results on line 1, then one result per line (ADR-0018).",
  };
}
