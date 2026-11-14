import { describe, expect, it } from "vitest";
import { reportJsonSchema, runJsonSchema } from "./json-schema.js";

describe("runJsonSchema", () => {
  // The published schema is versioned. If this fails after a model change,
  // run `pnpm --filter @atium/core schema:export` and commit the file.
  it("matches the published schemas/run.v1.json", async () => {
    await expect(`${JSON.stringify(runJsonSchema(), null, 2)}\n`).toMatchFileSnapshot(
      "../../schemas/run.v1.json",
    );
  });
});

describe("reportJsonSchema", () => {
  // Same flow as run.v1.json: `pnpm --filter @atium/core schema:export` regenerates the file.
  it("AC-2: matches the published schemas/report.v1.json", async () => {
    await expect(`${JSON.stringify(reportJsonSchema(), null, 2)}\n`).toMatchFileSnapshot(
      "../../schemas/report.v1.json",
    );
  });

  it("AC-2: requires schemaVersion 1, rejects unknown fields and describes docsUrl as a URI (§21.5)", () => {
    const schema = reportJsonSchema();

    expect(schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: {
        schemaVersion: { const: 1 },
        rules: { items: { properties: { docsUrl: { format: "uri" } } } },
      },
    });
    expect(schema["required"]).toContain("schemaVersion");
  });
});
