import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { computeTestId, TITLE_PATH_SEPARATOR } from "./identity.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261012, numRuns: 500 };

// Any Unicode text, so non-ASCII titles and file names are covered.
const text = fc.string({ unit: "binary" });
const identity = fc.record(
  {
    project: text,
    file: text,
    titlePath: fc.array(text, { maxLength: 25 }),
  },
  { requiredKeys: ["file", "titlePath"] },
);

describe("computeTestId", () => {
  it("always returns 16 lowercase hex characters", () => {
    fc.assert(
      fc.property(identity, (test) => {
        expect(computeTestId(test)).toMatch(/^[0-9a-f]{16}$/);
      }),
      runOptions,
    );
  });

  it("returns the same id for the same input", () => {
    fc.assert(
      fc.property(identity, (test) => {
        expect(computeTestId(structuredClone(test))).toBe(computeTestId(test));
      }),
      runOptions,
    );
  });

  it("hashes sha1 of project, file and titlePath joined by | and › (02-data-model.md §9.3)", () => {
    // printf '%s' 'chromium|tests/cart.spec.ts|cart › checkout' | shasum -a 1
    expect(
      computeTestId({
        project: "chromium",
        file: "tests/cart.spec.ts",
        titlePath: ["cart", "checkout"],
      }),
    ).toBe("2417ec6bdaef918a");
  });

  it("hashes a missing project as an empty string", () => {
    // printf '%s' '|tests/cart.spec.ts|cart › checkout' | shasum -a 1
    const expected = "77170b81b86e01a4";

    expect(computeTestId({ file: "tests/cart.spec.ts", titlePath: ["cart", "checkout"] })).toBe(
      expected,
    );
    expect(
      computeTestId({
        project: undefined,
        file: "tests/cart.spec.ts",
        titlePath: ["cart", "checkout"],
      }),
    ).toBe(expected);
  });

  it("gives different ids when the project, file or title change", () => {
    const base = {
      project: "chromium",
      file: "tests/cart.spec.ts",
      titlePath: ["cart", "checkout"],
    };
    const ids = new Set([
      computeTestId(base),
      computeTestId({ ...base, project: "firefox" }),
      computeTestId({ ...base, file: "tests/checkout.spec.ts" }),
      computeTestId({ ...base, titlePath: ["cart", "checkout [2]"] }),
    ]);

    expect(ids.size).toBe(4);
  });

  it("gives different ids when the levels of the title are in a different order", () => {
    const file = "tests/cart.spec.ts";

    expect(computeTestId({ file, titlePath: ["cart", "checkout"] })).not.toBe(
      computeTestId({ file, titlePath: ["checkout", "cart"] }),
    );
  });

  it("gives the same id to a title split differently with the separator, as the formula joins the levels", () => {
    const file = "tests/cart.spec.ts";

    expect(computeTestId({ file, titlePath: [`cart${TITLE_PATH_SEPARATOR}checkout`] })).toBe(
      computeTestId({ file, titlePath: ["cart", "checkout"] }),
    );
  });
});

describe("TITLE_PATH_SEPARATOR", () => {
  it("is the single right-pointing angle quotation mark between spaces", () => {
    expect(TITLE_PATH_SEPARATOR).toBe(" › ");
  });
});
