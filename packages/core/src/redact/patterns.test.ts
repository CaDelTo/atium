import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createTextRedactor, REDACT_PATTERN_IDS } from "./patterns.js";
import type { RedactPatternId } from "./patterns.js";

// Secrets are assembled from parts so that secret scanners do not flag this
// file. None of them is a real credential.
const JWT = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0In0", "c2lnbmF0dXJl-_"].join(".");
const UNSIGNED_JWT = ["eyJhbGciOiJub25lIn0", "eyJzdWIiOiIxIn0", ""].join(".");
const AWS_KEY = ["AKIA", "IOSFODNN7EXAMPLE"].join("");
const GCP_KEY = ["AIza", "SyD-fake_key_", "0123456789abcdefghijkl"].join("");
const AZURE_KEY = `${"a1+/".repeat(21)}ab==`;

const redactAll = createTextRedactor(REDACT_PATTERN_IDS);

/** Cases where the text changes: `[input, expected]`. */
type Positive = readonly [string, string];

const PATTERN_CASES: Readonly<
  Record<RedactPatternId, { positive: readonly Positive[]; negative: readonly string[] }>
> = {
  jwt: {
    positive: [
      [`token ${JWT} expired`, "token [REDACTED] expired"],
      [UNSIGNED_JWT, "[REDACTED]"],
      [`{"jwt":"${JWT}"}`, '{"jwt":"[REDACTED]"}'],
      [`/cb?t=${JWT}&x=1`, "/cb?t=[REDACTED]&x=1"],
      [`${JWT}\n${JWT}`, "[REDACTED]\n[REDACTED]"],
    ],
    negative: [
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0",
      "eyJhbGciOiJIUzI1NiJ9.abc.def",
      `x${JWT}`,
      `-${JWT}`,
      "version 1.2.3",
    ],
  },
  bearer: {
    positive: [
      ["Authorization: Bearer abc.DEF-123_~+/==", "Authorization: Bearer [REDACTED]"],
      ["bearer xyz", "bearer [REDACTED]"],
      ["BEARER xyz", "BEARER [REDACTED]"],
      ["Bearer\t xyz rest", "Bearer\t [REDACTED] rest"],
      ['{"auth":"Bearer abc"}', '{"auth":"Bearer [REDACTED]"}'],
      ["Bearer abc%2Fdef next", "Bearer [REDACTED] next"],
      ["Bearer abc:def", "Bearer [REDACTED]"],
      ["Bearer abcédef", "Bearer [REDACTED]"],
      ["bearer a=b;c", "bearer [REDACTED];c"],
    ],
    negative: ["Bearer", "Bearer ", "Bearer\nabc", "Bearer: abc", "forbearer abc", "Bearer [x]"],
  },
  "aws-key": {
    positive: [
      [AWS_KEY, "[REDACTED]"],
      [`aws_access_key_id=${AWS_KEY}`, "aws_access_key_id=[REDACTED]"],
      [`"${AWS_KEY.replace("AKIA", "ASIA")}"`, '"[REDACTED]"'],
      [AWS_KEY.replace("AKIA", "A3TX"), "[REDACTED]"],
      [`AWS_KEY_${AWS_KEY}`, "AWS_KEY_[REDACTED]"],
    ],
    negative: [
      AWS_KEY.toLowerCase(),
      AWS_KEY.slice(0, -1),
      `${AWS_KEY}Z`,
      `X${AWS_KEY}`,
      "AKIA0000000000000000",
      AWS_KEY.replace("AKIA", "AKIB"),
    ],
  },
  "gcp-key": {
    positive: [
      [GCP_KEY, "[REDACTED]"],
      [
        `https://maps.example/api?key=${GCP_KEY}&q=1`,
        "https://maps.example/api?key=[REDACTED]&q=1",
      ],
    ],
    negative: [GCP_KEY.slice(0, -1), `${GCP_KEY}x`, `x${GCP_KEY}`, GCP_KEY.replace("AIza", "AIzb")],
  },
  "azure-key": {
    positive: [
      [
        `DefaultEndpointsProtocol=https;AccountName=acc;AccountKey=${AZURE_KEY};EndpointSuffix=core.windows.net`,
        "DefaultEndpointsProtocol=https;AccountName=acc;AccountKey=[REDACTED];EndpointSuffix=core.windows.net",
      ],
      ["Endpoint=sb://ns/;SharedAccessKey=abc+/=", "Endpoint=sb://ns/;SharedAccessKey=[REDACTED]"],
      ["AccountKey=ab-cd_e==;x", "AccountKey=[REDACTED];x"],
      ["SharedAccessKey=abc%2Bdef", "SharedAccessKey=[REDACTED]"],
      ["accountkey=abc", "accountkey=[REDACTED]"],
      ["AccountKey = abc", "AccountKey = [REDACTED]"],
    ],
    negative: ["MyAccountKey=abc", "AccountKey=", "AccountKey=;x", "AccountKey:abc"],
  },
};

describe.each(REDACT_PATTERN_IDS)("the %s pattern", (id) => {
  const redact = createTextRedactor([id]);
  const { positive, negative } = PATTERN_CASES[id];

  it.each(positive)("redacts %j", (input, expected) => {
    expect(redact(input)).toBe(expected);
  });

  it.each(negative)("leaves %j unchanged", (input) => {
    expect(redact(input)).toBe(input);
  });
});

describe("createTextRedactor", () => {
  it("applies only the selected patterns", () => {
    const redact = createTextRedactor(["jwt"]);

    expect(redact(`Bearer abc ${AWS_KEY} ${JWT}`)).toBe(`Bearer abc ${AWS_KEY} [REDACTED]`);
  });

  it("applies nothing when no pattern is selected", () => {
    expect(createTextRedactor([])(`Bearer ${JWT}`)).toBe(`Bearer ${JWT}`);
  });

  it("ignores duplicated ids", () => {
    expect(createTextRedactor(["bearer", "bearer"])("Bearer abc")).toBe("Bearer [REDACTED]");
  });

  it("keeps the scheme when a bearer token is a JWT", () => {
    expect(redactAll(`Authorization: Bearer ${JWT}`)).toBe("Authorization: Bearer [REDACTED]");
  });

  it("redacts the word after `bearer` in prose, an accepted false positive", () => {
    expect(redactAll("The bearer of this message")).toBe("The bearer [REDACTED] this message");
  });

  it("carries no regex state from one call to the next", () => {
    // A global regex that kept `lastIndex` after a long text would start the
    // next search past the secret of a short one.
    redactAll(`${"x".repeat(100)} Bearer abc ${AWS_KEY} ${GCP_KEY} AccountKey=k`);

    expect(redactAll(`Bearer abc ${AWS_KEY}`)).toBe("Bearer [REDACTED] [REDACTED]");
  });

  it.each([
    "",
    "Error: expect(locator).toBeVisible() failed\n\nLocator: getByRole('button', { name: 'Pay' })",
    "TimeoutError: page.goto: Timeout 30000ms exceeded.\n    at /repo/tests/cart.spec.ts:12:5",
    "Expected token to be defined, received undefined",
    "GET https://api.example.test/v1/orders?page=2 → 500",
    "sha 3f2a9c1e0b7d4a6f8e5c2b1a0d9f8e7c6b5a4d3e, build 1.4.0-rc.1",
    "Ünïcödé ✓ 😀 text",
  ])("leaves text without secrets unchanged: %j", (text) => {
    expect(redactAll(text)).toBe(text);
  });
});

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261012, numRuns: 1000 };

describe("redaction properties", () => {
  it("leaves text without secret prefixes unchanged", () => {
    // Lowercase letters without `b` (no `bearer`), digits and punctuation: no
    // pattern can start in this alphabet.
    const safeChar = fc.constantFrom(
      ..."acdefghijklmnopqrstuvwxyz0123456789 .,:;-_/=+~()[]{}'\"\n\t".split(""),
    );
    fc.assert(
      fc.property(fc.string({ unit: safeChar, maxLength: 200 }), (text) => {
        expect(redactAll(text)).toBe(text);
      }),
      runOptions,
    );
  });

  it("is idempotent", () => {
    const fragment = fc.oneof(
      fc.constantFrom(JWT, UNSIGNED_JWT, AWS_KEY, GCP_KEY, `AccountKey=${AZURE_KEY}`),
      fc.constantFrom("Bearer ", "bearer\t", "eyJ", "AKIA", "AIza", "AccountKey=", "A3T"),
      fc.constantFrom("accountkey = ", "SharedAccessKey=", "KEY_"),
      fc.constantFrom(".", "-", "_", "=", " ", "\n", "[", "]", "[REDACTED]", ";", "/"),
      fc.constantFrom("%2F", ":", "é", '"', "'", ",", "<", ">"),
      fc.string({ unit: fc.constantFrom(..."aZ09eyJ+/=-_. ".split("")), maxLength: 8 }),
      fc.string({ maxLength: 4 }),
    );
    fc.assert(
      fc.property(fc.array(fragment, { maxLength: 20 }), (parts) => {
        const once = redactAll(parts.join(""));

        expect(redactAll(once)).toBe(once);
      }),
      runOptions,
    );
  });
});

describe("redaction time", () => {
  // 06-security.md, "Entradas": linear time on untrusted text. A quadratic
  // regex needs about 10^11 steps on 1 MiB, minutes instead of milliseconds,
  // so this generous budget does not make the test flaky.
  const ONE_MIB = 1024 * 1024;
  const BUDGET_MS = 2000;

  function fill(unit: string, prefix = ""): string {
    return prefix + unit.repeat(Math.ceil(ONE_MIB / unit.length));
  }

  it.each([
    ["a long token without dots", fill("eyJa-")],
    ["a JWT header followed by a long payload without dots", fill("eyJa-", "eyJa.")],
    ["many JWT-like segments", fill("eyJa.")],
    ["repeated JWT prefixes", fill("eyJ")],
    ["a bearer scheme followed by spaces", fill(" ", "Bearer")],
    ["repeated bearer schemes", fill("bearer ")],
    ["repeated AWS prefixes", fill("AKIA")],
    ["repeated GCP prefixes", fill("AIza")],
    ["repeated Azure prefixes", fill("AccountKey=")],
    ["an Azure prefix followed by spaces", fill(" ", "AccountKey =")],
    ["repeated spaced Azure prefixes", fill("accountkey = ")],
    ["a long word", fill("a")],
    ["many real secrets", fill(`${JWT} Bearer x ${AWS_KEY} ${GCP_KEY} AccountKey=k; `)],
  ])("is linear on 1 MiB of %s", (_label, text) => {
    const start = performance.now();
    redactAll(text);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(BUDGET_MS);
  });
});
