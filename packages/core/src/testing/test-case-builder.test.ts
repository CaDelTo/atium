import { describe, expect, it } from "vitest";
import { TestCaseSchema } from "../model/test-case.js";
import { aTestCase } from "./test-case-builder.js";

describe("aTestCase", () => {
  it("builds a valid, frozen test by default", () => {
    const test = aTestCase().build();

    expect(TestCaseSchema.safeParse(test).success).toBe(true);
    expect(test).toMatchObject({ titlePath: ["example test"], tags: [] });
    expect(Object.isFrozen(test)).toBe(true);
  });

  it("builds the same test every time", () => {
    expect(aTestCase("checkout").build()).toStrictEqual(aTestCase("checkout").build());
  });

  it("sets the file, project and tags", () => {
    const test = aTestCase("checkout")
      .inFile("tests/cart.spec.ts")
      .inProject("firefox")
      .withTags("@smoke", "@slow")
      .build();

    expect(test).toMatchObject({
      file: "tests/cart.spec.ts",
      project: "firefox",
      titlePath: ["checkout"],
      tags: ["@smoke", "@slow"],
    });
  });

  it("derives a different testId when the title, file or project change", () => {
    const ids = new Set([
      aTestCase("checkout").build().testId,
      aTestCase("login").build().testId,
      aTestCase("checkout").inFile("tests/cart.spec.ts").build().testId,
      aTestCase("checkout").inProject("firefox").build().testId,
    ]);

    expect(ids.size).toBe(4);
  });

  it("derives different testIds for titles that only differ in how they are split", () => {
    expect(
      aTestCase()
        .with({ titlePath: ["cart › checkout"] })
        .build().testId,
    ).not.toBe(
      aTestCase()
        .with({ titlePath: ["cart", "checkout"] })
        .build().testId,
    );
  });

  it("is not changed by later changes to a patch given to `with`", () => {
    const tags = ["@smoke"];
    const builder = aTestCase().with({ tags });

    tags.push("@slow");

    expect(builder.build().tags).toEqual(["@smoke"]);
  });

  it("keeps a testId set with `with`", () => {
    expect(aTestCase().with({ testId: "00000000000000aa" }).build().testId).toBe(
      "00000000000000aa",
    );
  });

  it("does not change the builder it was called on", () => {
    const original = aTestCase();
    const before = original.build();

    original.inFile("tests/other.spec.ts");
    original.inProject("webkit");
    original.withTags("@smoke");
    original.with({ titlePath: ["other"] });

    expect(original.build()).toStrictEqual(before);
  });

  it("throws when the fields set make the test invalid", () => {
    expect(() =>
      aTestCase()
        .with({ location: { line: 0, column: 1 } })
        .build(),
    ).toThrow();
  });
});
