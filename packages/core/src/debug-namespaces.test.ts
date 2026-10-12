import { describe, expect, it } from "vitest";
import { isDebugEnabled } from "./debug-namespaces.js";

describe("isDebugEnabled", () => {
  it.each([
    ["atium:*", "atium:cli"],
    ["*", "atium:cli"],
    ["atium:cli", "atium:cli"],
    ["other,atium:cli", "atium:cli"],
    ["other atium:cli", "atium:cli"],
    [" ,atium:*, ", "atium:cli"],
    ["atium:*:upload", "atium:storage:upload"],
    ["*:cli", "atium:cli"],
    ["a*b*c", "abc"],
    ["-other:*,atium:*", "atium:cli"],
  ])("enables it when %j matches %s", (debugEnv, namespace) => {
    expect(isDebugEnabled(debugEnv, namespace)).toBe(true);
  });

  it.each([
    [undefined, "atium:cli"],
    ["", "atium:cli"],
    ["atium", "atium:cli"],
    ["atium:*", "atium"],
    ["other:*", "atium:cli"],
    ["atium:cl", "atium:cli"],
    ["atium:*,-atium:cli", "atium:cli"],
    ["-atium:cli,atium:*", "atium:cli"],
    ["-atium:*", "atium:cli"],
    ["a*b*c", "acb"],
    ["ab*ba", "aba"],
    ["a*x*c", "abc"],
    ["a*bc*c", "abc"],
  ])("does not enable it when %j and %s", (debugEnv, namespace) => {
    expect(isDebugEnabled(debugEnv, namespace)).toBe(false);
  });
});
