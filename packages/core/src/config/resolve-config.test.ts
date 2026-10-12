import { describe, expect, it } from "vitest";
import { LLM_DEFAULTS, QUARANTINE_DEFAULTS, REDACT_DEFAULTS } from "../defaults.js";
import type { AtiumError } from "../errors.js";
import { thrownAtiumError } from "../testing/thrown-error.js";
import type { ConfigFileContent } from "./resolve-config.js";
import { explicitConfigFile, resolveConfig } from "./resolve-config.js";

const SOURCE = '"atium.config.ts"';

function fileWith(value: unknown): ConfigFileContent {
  return { source: SOURCE, value };
}

function invalidConfigError(value: unknown): AtiumError {
  const error = thrownAtiumError(() => resolveConfig(fileWith(value), {}, {}));
  expect(error.code).toBe("CONFIG_INVALID");
  return error;
}

describe("resolveConfig", () => {
  describe("defaults", () => {
    const defaults = {
      quarantine: QUARANTINE_DEFAULTS,
      redact: REDACT_DEFAULTS,
      llm: LLM_DEFAULTS,
    };

    it("uses the defaults without error when there is no config file", () => {
      expect(resolveConfig(undefined, {}, {})).toEqual({ config: defaults, logLevel: "info" });
    });

    it("uses the defaults for an empty config file", () => {
      expect(resolveConfig(fileWith({}), {}, {}).config).toEqual(defaults);
    });

    it("fills the omitted keys of a section with their defaults", () => {
      const { config } = resolveConfig(
        fileWith({ quarantine: { auto: true }, redact: { patterns: ["jwt"] }, llm: {} }),
        {},
        {},
      );

      expect(config.quarantine).toEqual({ mode: "run-and-ignore", auto: true });
      expect(config.redact).toEqual({ ...REDACT_DEFAULTS, patterns: ["jwt"] });
      expect(config.llm).toEqual({ enabled: false });
    });
  });

  describe("file over defaults", () => {
    it("keeps every value given in the file", () => {
      const value = {
        adapters: ["playwright"],
        plugins: ["@atium/analyzer-gaps"],
        storage: { type: "s3", bucket: "my-atium-history" },
        network: { hosts: ["api.myapp.test"] },
        analyzers: { flaky: { windowDays: 30 }, chaos: { maxScenariosPerTest: 6 } },
        quarantine: { mode: "skip", auto: false },
        gate: { minScore: 80 },
        redact: { headers: ["x-tenant"], bodyFields: [], patterns: [] },
        llm: { enabled: true, model: "local" },
      };

      expect(resolveConfig(fileWith(value), {}, {}).config).toEqual(value);
    });

    it("keeps unknown keys inside the sections that have no schema yet", () => {
      const { config } = resolveConfig(
        fileWith({ storage: { anything: 1 }, analyzers: { custom: { level: "high" } } }),
        {},
        {},
      );

      expect(config.storage).toEqual({ anything: 1 });
      expect(config.analyzers).toEqual({ custom: { level: "high" } });
    });
  });

  describe("log level precedence", () => {
    it("is info by default", () => {
      expect(resolveConfig(undefined, {}, {}).logLevel).toBe("info");
    });

    it("takes ATIUM_LOG_LEVEL over the default", () => {
      expect(resolveConfig(undefined, { ATIUM_LOG_LEVEL: "warn" }, {}).logLevel).toBe("warn");
    });

    it("takes the flag over ATIUM_LOG_LEVEL", () => {
      const resolved = resolveConfig(undefined, { ATIUM_LOG_LEVEL: "warn" }, { logLevel: "debug" });

      expect(resolved.logLevel).toBe("debug");
    });

    it("takes the flag even when ATIUM_LOG_LEVEL is invalid", () => {
      const resolved = resolveConfig(undefined, { ATIUM_LOG_LEVEL: "loud" }, { logLevel: "error" });

      expect(resolved.logLevel).toBe("error");
    });

    it("treats an empty ATIUM_LOG_LEVEL as unset", () => {
      expect(resolveConfig(undefined, { ATIUM_LOG_LEVEL: "" }, {}).logLevel).toBe("info");
    });

    it("rejects an unknown ATIUM_LOG_LEVEL, suggesting the closest level", () => {
      const error = thrownAtiumError(() =>
        resolveConfig(undefined, { ATIUM_LOG_LEVEL: "DEBUG" }, {}),
      );

      expect(error.code).toBe("CONFIG_INVALID");
      expect(error.message).toBe(
        'ATIUM_LOG_LEVEL must be one of "error", "warn", "info", "debug" (received "DEBUG").',
      );
      expect(error.hint).toBe('Did you mean "debug"?');
    });

    it("lists the levels when none is close to an unknown ATIUM_LOG_LEVEL", () => {
      const error = thrownAtiumError(() =>
        resolveConfig(undefined, { ATIUM_LOG_LEVEL: "verbose" }, {}),
      );

      expect(error.hint).toBe(
        'Set ATIUM_LOG_LEVEL to one of "error", "warn", "info", "debug", or unset it.',
      );
    });

    it("redacts a secret given as ATIUM_LOG_LEVEL", () => {
      const error = thrownAtiumError(() =>
        resolveConfig(undefined, { ATIUM_LOG_LEVEL: "Bearer abc.def" }, {}),
      );

      expect(error.message).toContain('(received "Bearer [REDACTED]")');
    });
  });

  describe("invalid config", () => {
    it("suggests storage for a misspelled storgae key", () => {
      const error = invalidConfigError({ storgae: { type: "s3" } });

      expect(error.message).toBe(
        'Invalid config in "atium.config.ts": Unknown key "storgae" at the top level.',
      );
      expect(error.hint).toBe('Did you mean "storage"?');
    });

    it("suggests keys inside a section with a schema", () => {
      const error = invalidConfigError({ redact: { hedaers: [] } });

      expect(error.message).toBe(
        'Invalid config in "atium.config.ts": Unknown key "hedaers" in "redact".',
      );
      expect(error.hint).toBe('Did you mean "headers"?');
    });

    it("pairs each suggestion with its key when there are several, in the order of the issues", () => {
      const error = invalidConfigError({ storgae: {}, quarantine: { moed: "skip" } });

      expect(error.hint).toBe(
        'Did you mean "mode" instead of "moed", "storage" instead of "storgae"?',
      );
    });

    it("lists the valid keys when no known key is close", () => {
      const error = invalidConfigError({ quarantine: { reporters: [] } });

      expect(error.hint).toBe(
        'Remove "reporters" or use a key valid in "quarantine": "mode", "auto".',
      );
    });

    it("covers every unknown key in the hint, with or without a suggestion", () => {
      const error = invalidConfigError({ storgae: {}, reporters: [], quarantine: { xyz: 1 } });

      expect(error.hint).toBe(
        'Did you mean "storage" instead of "storgae"? ' +
          'Remove "xyz" or use a key valid in "quarantine": "mode", "auto". ' +
          'Remove "reporters" or use a key valid at the top level: "adapters", "plugins", ' +
          '"storage", "network", "analyzers", "quarantine", "gate", "redact", "llm".',
      );
    });

    it("redacts secrets in unknown keys and key paths", () => {
      const error = invalidConfigError({
        "Bearer abc.def": 1,
        analyzers: { "Bearer ghi.jkl": 5 },
      });

      expect(error.message).not.toMatch(/abc\.def|ghi\.jkl/);
      expect(error.hint).not.toMatch(/abc\.def/);
      expect(error.message).toContain('"Bearer [REDACTED]"');
    });

    it("gives the key path, the expected type and the value received", () => {
      const error = invalidConfigError({ adapters: "playwright" });

      expect(error.message).toBe(
        'Invalid config in "atium.config.ts": "adapters" must be an array (received "playwright").',
      );
      expect(error.hint).toBe('Fix the values listed above in "atium.config.ts".');
    });

    it("gives nested paths with indexes", () => {
      const error = invalidConfigError({ redact: { patterns: ["jwt", "email"] } });

      expect(error.message).toMatch(
        /^Invalid config in "atium\.config\.ts": "redact\.patterns\[1\]": /,
      );
      expect(error.message).toMatch(/\(received "email"\)\.$/);
    });

    it("quotes keys that are not plain identifiers in the path", () => {
      const error = invalidConfigError({ analyzers: { "my.analyzer": 5 } });

      expect(error.message).toContain(
        '"analyzers[\\"my.analyzer\\"]" must be an object (received 5)',
      );
    });

    it("describes containers by kind instead of printing them", () => {
      expect(invalidConfigError({ adapters: { a: 1 } }).message).toContain("(received an object)");
      expect(invalidConfigError({ storage: [] }).message).toContain("(received an array)");
      expect(invalidConfigError({ llm: { enabled: null } }).message).toContain("(received null)");
    });

    it("rejects a file whose default export is not an object", () => {
      expect(invalidConfigError(42).message).toBe(
        'Invalid config in "atium.config.ts": The config must be an object (received 42).',
      );
      expect(invalidConfigError(undefined).message).toContain("(received undefined)");
      expect(invalidConfigError(() => ({})).message).toContain("(received a function)");
    });

    it("rejects a quarantine mode that does not exist", () => {
      const error = invalidConfigError({ quarantine: { mode: "ignore" } });

      expect(error.message).toMatch(/^Invalid config in "atium\.config\.ts": "quarantine\.mode": /);
      expect(error.message).toContain('(received "ignore")');
    });

    it("rejects empty names in adapters and plugins", () => {
      expect(invalidConfigError({ adapters: [""] }).message).toContain('"adapters[0]"');
      expect(invalidConfigError({ plugins: [""] }).message).toContain('"plugins[0]"');
    });

    it("lists every issue on its own line", () => {
      const error = invalidConfigError({ adapters: 1, llm: { enabled: "yes" } });

      expect(error.message.split("\n")).toEqual([
        'Invalid config in "atium.config.ts":',
        '- "adapters" must be an array (received 1).',
        '- "llm.enabled" must be a boolean (received "yes").',
      ]);
    });

    it("redacts secrets in the value received", () => {
      const error = invalidConfigError({ gate: "Bearer abc.def" });

      expect(error.message).toContain('(received "Bearer [REDACTED]")');
      expect(error.message).not.toContain("abc.def");
    });

    it("caps a long value received", () => {
      const error = invalidConfigError({ gate: "x".repeat(10_000) });

      expect(error.message.length).toBeLessThan(400);
      expect(error.message).toContain('"…).');
    });

    it("escapes control characters in keys and values", () => {
      const error = invalidConfigError({ "bad\nkey": 1, gate: "line\nbreak" });

      expect(error.message).not.toMatch(/bad\nkey|line\nbreak/);
      expect(error.message).toContain('"bad\\nkey"');
    });
  });
});

describe("explicitConfigFile", () => {
  it("is undefined when neither the flag nor ATIUM_CONFIG names a file", () => {
    expect(explicitConfigFile({}, {})).toBeUndefined();
  });

  it("takes ATIUM_CONFIG over the search", () => {
    expect(explicitConfigFile({}, { ATIUM_CONFIG: "ci.config.ts" })).toEqual({
      path: "ci.config.ts",
      origin: "ATIUM_CONFIG",
    });
  });

  it("takes --config over ATIUM_CONFIG", () => {
    expect(
      explicitConfigFile({ config: "local.config.ts" }, { ATIUM_CONFIG: "ci.config.ts" }),
    ).toEqual({ path: "local.config.ts", origin: "--config" });
  });

  it("treats an empty ATIUM_CONFIG as unset", () => {
    expect(explicitConfigFile({}, { ATIUM_CONFIG: "" })).toBeUndefined();
  });
});
