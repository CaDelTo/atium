import { ATIUM_DIRECTORY } from "@atium/core";
import { describe, expect, it } from "vitest";
import { SQLITE_DATABASE_PATH } from "./defaults.js";

describe("SQLITE_DATABASE_PATH", () => {
  it("is atium.db inside the ATIUM_DIRECTORY of core (15-storage.md §23.6)", () => {
    expect(SQLITE_DATABASE_PATH).toBe(`${ATIUM_DIRECTORY}/atium.db`);
    expect(SQLITE_DATABASE_PATH).toBe(".atium/atium.db");
  });
});
