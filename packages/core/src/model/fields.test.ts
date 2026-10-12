import { describe, expect, it } from "vitest";
import { cappedString, DroppedCountSchema, TextSchema, TimestampSchema } from "./fields.js";

describe("cappedString", () => {
  const schema = cappedString(8);

  it.each([
    ["ASCII at the cap", "12345678"],
    ["multibyte characters at the cap", "€€\n"],
    ["an empty string", ""],
  ])("accepts %s", (_label, value) => {
    expect(schema.safeParse(value).success).toBe(true);
  });

  it.each([
    ["ASCII one byte over the cap", "123456789"],
    ["multibyte characters over the cap", "€€€"],
    ["escaped quotes over the cap", '"""""'],
  ])("rejects %s", (_label, value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });

  it("rejects control characters that fit unescaped but not once escaped", () => {
    // 400 characters fit in 2 KiB, but each one is written as \u0001: 2400 bytes.
    const value = "\u0001".repeat(400);

    expect(value.length).toBeLessThanOrEqual(2048);
    expect(TextSchema.safeParse(value).success).toBe(false);
  });

  it("explains the cap in escaped bytes", () => {
    const result = schema.safeParse("€€€");

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Too big: expected string to have <=8 UTF-8 bytes once escaped for JSON",
    ]);
  });

  it("rejects a string longer than the cap with a single issue, without measuring its bytes", () => {
    const result = schema.safeParse("x".repeat(1000));

    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]?.code).toBe("too_big");
  });
});

describe("DroppedCountSchema", () => {
  it("accepts a positive integer", () => {
    expect(DroppedCountSchema.safeParse(1).success).toBe(true);
  });

  it.each([[0], [-1], [1.5]])("rejects %s", (value) => {
    expect(DroppedCountSchema.safeParse(value).success).toBe(false);
  });
});

describe("TimestampSchema", () => {
  it.each([["2026-10-08T14:03:00.000Z"], ["2026-10-08T14:03:00Z"]])("accepts %s", (value) => {
    expect(TimestampSchema.safeParse(value).success).toBe(true);
  });

  it.each([["2026-10-08T16:03:00.000+02:00"], ["2026-10-08"], ["yesterday"]])(
    "rejects %s, which is not an ISO 8601 date in UTC",
    (value) => {
      expect(TimestampSchema.safeParse(value).success).toBe(false);
    },
  );

  it("rejects a date over the default text cap, which the format alone allows", () => {
    const value = `2026-10-08T14:03:00.${"1".repeat(2048)}Z`;

    expect(TimestampSchema.safeParse(value).success).toBe(false);
  });
});
