import { describe, expect, it } from "vitest";
import { terminalText } from "./terminal-text.js";

describe("terminalText", () => {
  it("keeps plain text, line feeds and tabs", () => {
    expect(terminalText('Invalid config:\n\t"adapters" must be an array.')).toBe(
      'Invalid config:\n\t"adapters" must be an array.',
    );
  });

  it.each([
    ["an ANSI escape", "\u001b[31mred", "\\u001b[31mred"],
    ["a carriage return", "a\rb", "a\\u000db"],
    ["DEL", "a\u007fb", "a\\u007fb"],
    ["the C1 CSI", "a\u009b31mb", "a\\u009b31mb"],
    ["a Unicode line separator", "a\u2028b", "a\\u2028b"],
    ["a right-to-left override", "a\u202eb", "a\\u202eb"],
    ["a bidirectional isolate", "a\u2066b", "a\\u2066b"],
  ])("escapes %s", (_case, text, expected) => {
    expect(terminalText(text)).toBe(expected);
  });
});
