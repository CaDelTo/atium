import { describe, expect, it } from "vitest";
import { REDACT_DEFAULTS } from "../defaults.js";
import { createRedactor, RedactConfigSchema } from "./redactor.js";

const JWT = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0In0", "c2ln"].join(".");

const defaults = createRedactor(RedactConfigSchema.parse({}));

describe("RedactConfigSchema", () => {
  it("applies the defaults to an empty section", () => {
    expect(RedactConfigSchema.parse({})).toEqual(REDACT_DEFAULTS);
  });

  it("replaces a default list instead of extending it", () => {
    const config = RedactConfigSchema.parse({ headers: ["x-session"], patterns: [] });

    expect(config.headers).toEqual(["x-session"]);
    expect(config.patterns).toEqual([]);
    expect(config.bodyFields).toEqual(REDACT_DEFAULTS.bodyFields);
  });

  it.each([
    ["an unknown pattern", { patterns: ["email"] }],
    ["an empty name", { headers: [""] }],
    ["an unknown key", { fields: ["password"] }],
    ["a list that is not an array", { bodyFields: "password" }],
  ])("rejects %s", (_label, section) => {
    expect(RedactConfigSchema.safeParse(section).success).toBe(false);
  });
});

describe("createRedactor", () => {
  describe("redact", () => {
    it("applies every default pattern", () => {
      expect(defaults.redact(`Bearer abc and ${JWT}`)).toBe("Bearer [REDACTED] and [REDACTED]");
    });

    it("applies only the configured patterns", () => {
      const { redact } = createRedactor(RedactConfigSchema.parse({ patterns: ["jwt"] }));

      expect(redact(`Bearer abc and ${JWT}`)).toBe("Bearer abc and [REDACTED]");
    });
  });

  describe("redactHeaders", () => {
    it("replaces configured headers whatever their case", () => {
      expect(
        defaults.redactHeaders({ Authorization: "Basic dXNlcjpwYXNz", "X-API-Key": "k" }),
      ).toEqual({ Authorization: "[REDACTED]", "X-API-Key": "[REDACTED]" });
    });

    it("keeps one marker per occurrence of a repeated header", () => {
      expect(defaults.redactHeaders({ "set-cookie": ["a=1", "b=2"] })).toEqual({
        "set-cookie": ["[REDACTED]", "[REDACTED]"],
      });
    });

    it("redacts the patterns in other headers", () => {
      expect(
        defaults.redactHeaders({ "x-forwarded-auth": `Bearer ${JWT}`, accept: ["a", JWT] }),
      ).toEqual({ "x-forwarded-auth": "Bearer [REDACTED]", accept: ["a", "[REDACTED]"] });
    });

    it("does not change its input", () => {
      const headers = { cookie: ["a=1"], accept: "*/*" };

      defaults.redactHeaders(headers);

      expect(headers).toEqual({ cookie: ["a=1"], accept: "*/*" });
    });

    it("redacts nothing by name with an empty header list", () => {
      const { redactHeaders } = createRedactor(RedactConfigSchema.parse({ headers: [] }));

      expect(redactHeaders({ authorization: "Basic abc" })).toEqual({
        authorization: "Basic abc",
      });
    });
  });

  describe("redactFields", () => {
    it("replaces configured fields whatever their case and depth", () => {
      expect(
        defaults.redactFields({
          user: { Password: "p", profile: { cardnumber: 4111 } },
          items: [{ TOKEN: { v: 1 } }],
          note: `Bearer ${JWT}`,
        }),
      ).toEqual({
        user: { Password: "[REDACTED]", profile: { cardnumber: "[REDACTED]" } },
        items: [{ TOKEN: "[REDACTED]" }],
        note: "Bearer [REDACTED]",
      });
    });

    it("only replaces exact field names", () => {
      expect(defaults.redactFields({ passwordHint: "h", tokens: 2 })).toEqual({
        passwordHint: "h",
        tokens: 2,
      });
    });
  });
});
