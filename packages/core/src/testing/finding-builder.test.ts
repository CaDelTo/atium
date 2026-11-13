import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { FindingSchema } from "../findings/finding.js";
import { aFinding } from "./finding-builder.js";

describe("aFinding", () => {
  it("builds a valid, frozen E2E001 warning of the lint analyzer with only the required fields", () => {
    const finding = aFinding().build();

    expect(FindingSchema.safeParse(finding).success).toBe(true);
    expect(finding).toMatchObject({ analyzer: "lint", ruleId: "E2E001", severity: "warning" });
    expect(new Set(Object.keys(finding))).toEqual(
      new Set([
        "analyzer",
        "category",
        "confidence",
        "fingerprint",
        "message",
        "ruleId",
        "severity",
        "source",
      ]),
    );
    expect(Object.isFrozen(finding)).toBe(true);
  });

  it("builds the same finding every time", () => {
    expect(aFinding().build()).toStrictEqual(aFinding().build());
  });

  it("overrides any field with `with`", () => {
    const finding = aFinding()
      .with({ severity: "error", location: { file: "tests/cart.spec.ts", line: 3 } })
      .build();

    expect(finding.severity).toBe("error");
    expect(finding.location).toEqual({ file: "tests/cart.spec.ts", line: 3 });
  });

  it("is not changed by later changes to a patch given to `with`", () => {
    const location = { file: "tests/cart.spec.ts", line: 3 };
    const builder = aFinding().with({ location });

    location.line = 9;

    expect(builder.build().location?.line).toBe(3);
  });

  it("does not change the builder it was called on", () => {
    const original = aFinding();
    const before = original.build();

    original.with({ ruleId: "E2E002" });

    expect(original.build()).toStrictEqual(before);
  });

  it("throws a ZodError when the fields set make the finding invalid", () => {
    expect(() => aFinding().with({ message: "" }).build()).toThrow(ZodError);
  });
});
