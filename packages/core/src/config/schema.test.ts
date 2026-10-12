import { describe, expect, expectTypeOf, it } from "vitest";
import type { AtiumConfig, AtiumConfigInput } from "./schema.js";
import { AtiumConfigSchema, defineConfig } from "./schema.js";

describe("defineConfig", () => {
  it("returns the config it receives", () => {
    const config = { adapters: ["playwright"], quarantine: { mode: "skip" as const } };

    expect(defineConfig(config)).toBe(config);
  });

  it("rejects unknown keys and wrong values at compile time", () => {
    // @ts-expect-error `storgae` is not a config key.
    expectTypeOf(defineConfig).toBeCallableWith({ storgae: {} });
    // @ts-expect-error `ignore` is not a quarantine mode.
    expectTypeOf(defineConfig).toBeCallableWith({ quarantine: { mode: "ignore" } });
    // @ts-expect-error `patterns` only takes built-in pattern ids.
    expectTypeOf(defineConfig).toBeCallableWith({ redact: { patterns: ["email"] } });
  });

  it("accepts any keys inside the sections without a schema yet", () => {
    expectTypeOf({
      storage: { type: "s3" },
      analyzers: { flaky: { windowDays: 30 } },
    }).toExtend<AtiumConfigInput>();
  });
});

describe("AtiumConfigSchema", () => {
  it("always fills the sections that have defaults", () => {
    expectTypeOf<AtiumConfig["quarantine"]["mode"]>().toEqualTypeOf<"run-and-ignore" | "skip">();
    expectTypeOf<AtiumConfig["llm"]["enabled"]>().toEqualTypeOf<boolean>();
    expectTypeOf<AtiumConfig["redact"]["patterns"]>().not.toBeUndefined();

    expect(AtiumConfigSchema.parse({}).quarantine.mode).toBe("run-and-ignore");
  });
});
