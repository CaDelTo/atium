import { ATIUM_DIRECTORY as CORE_ATIUM_DIRECTORY } from "@atium/core";
import { describe, expect, it } from "vitest";
import { ATIUM_DIRECTORY } from "./defaults.js";

describe("ATIUM_DIRECTORY", () => {
  it("equals the one of core, which messages.ts cannot import", () => {
    expect(ATIUM_DIRECTORY).toBe(CORE_ATIUM_DIRECTORY);
  });
});
