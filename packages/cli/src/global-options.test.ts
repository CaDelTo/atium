import { describe, expect, it } from "vitest";
import { readGlobalOptions } from "./global-options.js";

describe("readGlobalOptions", () => {
  it("keeps the string options and the switches", () => {
    expect(
      readGlobalOptions({
        config: "a.ts",
        format: "json",
        output: "out.json",
        ci: true,
        strict: true,
      }),
    ).toEqual({ config: "a.ts", format: "json", output: "out.json", ci: true, strict: true });
  });

  it("keeps an empty --config, which loadConfig rejects by its extension", () => {
    expect(readGlobalOptions({ config: "" }).config).toBe("");
  });

  it("leaves out the options not given and turns the switches off", () => {
    expect(readGlobalOptions({})).toEqual({ ci: false, strict: false });
  });

  it.each([
    [{ quiet: true }, "error"],
    [{ verbose: true }, "debug"],
    [{}, undefined],
  ])("maps %j to the log level %s", (values, logLevel) => {
    expect(readGlobalOptions(values).logLevel).toBe(logLevel);
  });

  it("ignores values of the wrong type", () => {
    expect(readGlobalOptions({ config: true, ci: "yes", strict: 1 })).toEqual({
      ci: false,
      strict: false,
    });
  });
});
