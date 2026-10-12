import { describe, expect, it } from "vitest";
import { runJsonSchema } from "./json-schema.js";

describe("runJsonSchema", () => {
  // The published schema is versioned. If this fails after a model change,
  // run `pnpm --filter @atium/core schema:export` and commit the file.
  it("matches the published schemas/run.v1.json", async () => {
    await expect(`${JSON.stringify(runJsonSchema(), null, 2)}\n`).toMatchFileSnapshot(
      "../../schemas/run.v1.json",
    );
  });
});
