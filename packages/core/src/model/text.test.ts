import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { jsonEscapedByteLength, truncateUtf8 } from "./text.js";

/** Reference measure: what `JSON.stringify` writes, without the quotes. */
function escapedBytes(value: string): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8") - 2;
}

/** Number of UTF-16 code units of the character that starts at `index`. */
function charUnitsAt(value: string, index: number): number {
  return (value.codePointAt(index) ?? 0) > 0xffff ? 2 : 1;
}

// Strings rich in what is hard to measure: quotes, backslashes, control
// characters, multibyte characters, surrogate pairs and lone surrogates.
const trickyChar = fc.oneof(
  fc.constantFrom('"', "\\", "\n", "\t", "\u0000", "\u001f", "\u007f", "é", "€", "😀"),
  fc.constantFrom("\ud83d", "\ude00"),
  fc.integer({ min: 0, max: 0xffff }).map((unit) => String.fromCharCode(unit)),
  fc.string({ unit: "binary", minLength: 1, maxLength: 1 }),
);
const trickyString = fc.string({ unit: trickyChar, maxLength: 40 });
const cap = fc.integer({ min: 0, max: 120 });

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261011, numRuns: 1000 };

describe("jsonEscapedByteLength", () => {
  it("equals the UTF-8 size of the JSON-escaped value without quotes", () => {
    fc.assert(
      fc.property(trickyString, (value) => {
        expect(jsonEscapedByteLength(value)).toBe(escapedBytes(value));
      }),
      runOptions,
    );
  });

  it.each([
    ["an empty string", "", 0],
    ["ASCII", "abc", 3],
    ["a quote and a backslash", '"\\', 4],
    ["short control escapes", "\b\t\n\f\r", 10],
    ["other control characters as \\u00XX", "\u0001\u001f", 12],
    ["two- and three-byte characters", "é€", 5],
    ["a surrogate pair", "😀", 4],
    ["a lone high surrogate", "\ud83d", 6],
    ["a lone low surrogate", "\ude00", 6],
  ])("measures %s", (_label, value, bytes) => {
    expect(jsonEscapedByteLength(value)).toBe(bytes);
  });
});

describe("truncateUtf8", () => {
  it("returns a prefix whose escaped size never exceeds the cap", () => {
    fc.assert(
      fc.property(trickyString, cap, (value, maxBytes) => {
        const truncated = truncateUtf8(value, maxBytes);

        expect(value.startsWith(truncated)).toBe(true);
        expect(escapedBytes(truncated)).toBeLessThanOrEqual(maxBytes);
      }),
      runOptions,
    );
  });

  it("keeps as much as fits: the next character would exceed the cap", () => {
    fc.assert(
      fc.property(trickyString, cap, (value, maxBytes) => {
        const truncated = truncateUtf8(value, maxBytes);
        fc.pre(truncated.length < value.length);

        const nextEnd = truncated.length + charUnitsAt(value, truncated.length);
        expect(escapedBytes(value.slice(0, nextEnd))).toBeGreaterThan(maxBytes);
      }),
      runOptions,
    );
  });

  it("never splits a surrogate pair or an escape sequence", () => {
    fc.assert(
      fc.property(trickyString, cap, (value, maxBytes) => {
        const truncated = truncateUtf8(value, maxBytes);
        const escapedTruncated = JSON.stringify(truncated).slice(0, -1);

        // A split pair would be escaped as \uXXXX, which the full value does not contain.
        expect(JSON.stringify(value).startsWith(escapedTruncated)).toBe(true);
      }),
      runOptions,
    );
  });

  it("returns the value unchanged when it fits", () => {
    expect(truncateUtf8("naïve", 6)).toBe("naïve");
  });

  it.each([
    { label: "a two-byte character", value: "naïve", maxBytes: 3, expected: "na" },
    { label: "a surrogate pair", value: "ab😀", maxBytes: 5, expected: "ab" },
    { label: "an escaped quote", value: 'say "hi"', maxBytes: 5, expected: "say " },
    { label: "a \\u00XX escape", value: "a\u0001b", maxBytes: 6, expected: "a" },
  ])("cuts before $label that does not fit", ({ value, maxBytes, expected }) => {
    expect(truncateUtf8(value, maxBytes)).toBe(expected);
  });

  it.each([[-1], [1.5], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    "throws a RangeError when the cap is %s",
    (maxBytes) => {
      expect(() => truncateUtf8("abc", maxBytes)).toThrow(RangeError);
    },
  );
});
