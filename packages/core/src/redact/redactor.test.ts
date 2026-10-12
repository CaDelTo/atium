import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { REDACT_DEFAULTS } from "../defaults.js";
import { REDACT_PATTERN_IDS } from "./patterns.js";
import { createRedactor, RedactConfigSchema } from "./redactor.js";

const JWT = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0In0", "c2ln"].join(".");

const defaults = createRedactor(RedactConfigSchema.parse({}));

describe("RedactConfigSchema", () => {
  it("applies the defaults to an empty section", () => {
    expect(RedactConfigSchema.parse({})).toEqual(REDACT_DEFAULTS);
  });

  it("enables every built-in pattern by default", () => {
    expect(REDACT_DEFAULTS.patterns).toEqual(REDACT_PATTERN_IDS);
  });

  it("accepts names in any script", () => {
    expect(RedactConfigSchema.parse({ bodyFields: ["contraseña"] }).bodyFields).toEqual([
      "contraseña",
    ]);
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
    ["a name without letters or digits", { bodyFields: ["-_ "] }],
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
    it.each([
      "Authorization",
      "Proxy-Authorization",
      "Cookie",
      "Set-Cookie",
      "X-API-Key",
      "x-auth-token",
      "X-Amz-Security-Token",
      "X-CSRF-Token",
      "X-Client-Secret",
      "X-Session-Id",
    ])("replaces the default sensitive header %s", (name) => {
      expect(defaults.redactHeaders({ [name]: "Basic dXNlcjpwYXNz" })).toEqual({
        [name]: "[REDACTED]",
      });
    });

    it("keeps a header named __proto__ as an own property", () => {
      const headers = JSON.parse('{"__proto__": "Bearer abc"}') as Record<string, string>;

      const output = defaults.redactHeaders(headers);

      expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
      expect(Object.getOwnPropertyDescriptor(output, "__proto__")?.value).toBe("Bearer [REDACTED]");
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

    it("replaces fields whose name contains a configured fragment", () => {
      expect(
        defaults.redactFields({
          accessToken: "a",
          refresh_token: "r",
          "api-key": "k",
          client_secret: "s",
          CVV2: 123,
          user_password_hash: "h",
        }),
      ).toEqual({
        accessToken: "[REDACTED]",
        refresh_token: "[REDACTED]",
        "api-key": "[REDACTED]",
        client_secret: "[REDACTED]",
        CVV2: "[REDACTED]",
        user_password_hash: "[REDACTED]",
      });
    });

    it("replaces names that only look sensitive, an accepted false positive", () => {
      expect(defaults.redactFields({ tokenCount: 2, passwordPolicy: "strong" })).toEqual({
        tokenCount: "[REDACTED]",
        passwordPolicy: "[REDACTED]",
      });
    });

    it("keeps fields whose name contains no fragment", () => {
      const body = { author: "Ana", username: "ana", email: "a@b.test", count: 2 };

      expect(defaults.redactFields(body)).toEqual(body);
    });

    it("uses only the configured fields", () => {
      const { redactFields } = createRedactor(RedactConfigSchema.parse({ bodyFields: ["pin"] }));

      expect(redactFields({ PIN: 1234, password: "p" })).toEqual({
        PIN: "[REDACTED]",
        password: "p",
      });
    });

    it("replaces no field by name with an empty field list", () => {
      const { redactFields } = createRedactor(RedactConfigSchema.parse({ bodyFields: [] }));

      expect(redactFields({ password: "p", note: "Bearer abc" })).toEqual({
        password: "p",
        note: "Bearer [REDACTED]",
      });
    });
  });
});

describe("redactor properties", () => {
  // Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
  const runOptions = { seed: 20261012, numRuns: 300 };
  const key = fc.oneof(
    fc.constantFrom("password", "Authorization", "x-api-key", "accessToken", "note", "[REDACTED]"),
    fc.string({ maxLength: 6 }),
  );
  const text = fc.oneof(
    fc.constantFrom("Bearer abc", "eyJa.eyJb.c", "AccountKey=k;x", "[REDACTED]", "plain"),
    fc.string({ maxLength: 10 }),
  );

  it("redactHeaders is idempotent", () => {
    fc.assert(
      fc.property(fc.dictionary(key, fc.oneof(text, fc.array(text, { maxLength: 3 }))), (h) => {
        const once = defaults.redactHeaders(h);

        expect(defaults.redactHeaders(once)).toEqual(once);
      }),
      runOptions,
    );
  });

  it("redactFields is idempotent", () => {
    const value = fc.letrec((tie) => ({
      node: fc.oneof(
        { depthSize: "small" },
        text,
        fc.integer(),
        fc.constant(null),
        fc.array(tie("node"), { maxLength: 3 }),
        fc.dictionary(key, tie("node"), { maxKeys: 3 }),
      ),
    })).node;
    fc.assert(
      fc.property(value, (body) => {
        const once = defaults.redactFields(body);

        expect(defaults.redactFields(once)).toEqual(once);
      }),
      runOptions,
    );
  });
});
