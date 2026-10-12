import { describe, expect, it } from "vitest";
import { envValue, nonEmpty } from "./env.js";

describe("envValue", () => {
  it("treats an empty variable as not set", () => {
    expect(envValue({ CI: "" }, "CI")).toBeUndefined();
    expect(envValue({}, "CI")).toBeUndefined();
    expect(envValue({ CI: "true" }, "CI")).toBe("true");
  });
});

describe("nonEmpty", () => {
  it("keeps any value but the empty string", () => {
    expect(nonEmpty("")).toBeUndefined();
    expect(nonEmpty(undefined)).toBeUndefined();
    expect(nonEmpty(" ")).toBe(" ");
  });
});
