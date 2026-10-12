import { describe, expect, it } from "vitest";
import { ERROR_PATH_PREVIEW_BYTES } from "./defaults.js";
import { quoteForMessage, quoteList } from "./quote.js";

describe("quoteForMessage", () => {
  it("quotes a short value as JSON", () => {
    expect(quoteForMessage('a "b"\nc')).toBe('"a \\"b\\"\\nc"');
  });

  it("caps a long value and marks the cut after the quotes", () => {
    const quoted = quoteForMessage("x".repeat(ERROR_PATH_PREVIEW_BYTES + 1));

    expect(quoted).toBe(`"${"x".repeat(ERROR_PATH_PREVIEW_BYTES)}"…`);
  });

  it("does not mark a value exactly at the cap", () => {
    expect(quoteForMessage("x".repeat(ERROR_PATH_PREVIEW_BYTES))).not.toContain("…");
  });
});

describe("quoteList", () => {
  it("quotes each item and separates them with commas", () => {
    expect(quoteList(["error", 'a"b'])).toBe('"error", "a\\"b"');
  });

  it("is empty for no items", () => {
    expect(quoteList([])).toBe("");
  });
});
