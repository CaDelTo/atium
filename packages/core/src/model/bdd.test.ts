import { describe, expect, it } from "vitest";
import { BddContextSchema } from "./bdd.js";
import {
  bddStep,
  fullBdd,
  listOf,
  minimalBdd,
  textOfBytes,
  without,
} from "./samples.test-support.js";

describe("BddContextSchema", () => {
  it.each([
    ["only the required fields", minimalBdd()],
    ["every optional field", fullBdd()],
    ["steps at their cap", { ...minimalBdd(), steps: listOf(200, bddStep()) }],
    [
      "step text and definition at their caps",
      {
        ...minimalBdd(),
        steps: [{ ...bddStep(), text: textOfBytes(512), definition: textOfBytes(256) }],
      },
    ],
  ])("accepts a BDD context with %s", (_label, input) => {
    expect(BddContextSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    ["scenario is missing", without(minimalBdd(), "scenario")],
    ["steps is not a list", { ...minimalBdd(), steps: "Given" }],
    ["steps has more than 200 items", { ...minimalBdd(), steps: listOf(201, bddStep()) }],
    ["stepsDropped is 0", { ...minimalBdd(), stepsDropped: 0 }],
    ["stepsDropped is negative", { ...minimalBdd(), stepsDropped: -1 }],
    [
      "a step text is over 512 bytes",
      { ...minimalBdd(), steps: [{ ...bddStep(), text: textOfBytes(513) }] },
    ],
    [
      "a step definition is over 256 bytes",
      { ...minimalBdd(), steps: [{ ...bddStep(), definition: textOfBytes(257) }] },
    ],
    ["a step has no durationMs", { ...minimalBdd(), steps: [without(bddStep(), "durationMs")] }],
    ["a step has an unknown key", { ...minimalBdd(), steps: [{ ...bddStep(), line: 3 }] }],
  ])("rejects a BDD context when %s", (_label, input) => {
    expect(BddContextSchema.safeParse(input).success).toBe(false);
  });
});
