import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MIN_NODE_VERSION } from "../../defaults.js";
import { checkNode, compareVersions, parseVersion } from "./node.js";
import type { Version } from "./node.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261013, numRuns: 500 };

const part = fc.nat({ max: 1000 });
const version: fc.Arbitrary<Version> = fc.record({
  numbers: fc.tuple(part, part, part),
  prerelease: fc.boolean(),
});

function v(numbers: readonly [number, number, number], prerelease = false): Version {
  return { numbers, prerelease };
}

describe("parseVersion", () => {
  it("reads major, minor and patch, with or without a leading v", () => {
    expect(parseVersion("22.12.0")).toEqual(v([22, 12, 0]));
    expect(parseVersion("v24.1.3")).toEqual(v([24, 1, 3]));
  });

  it("marks a pre-release and ignores build metadata", () => {
    expect(parseVersion("25.0.0-nightly2026")).toEqual(v([25, 0, 0], true));
    expect(parseVersion("25.0.0+build7")).toEqual(v([25, 0, 0]));
  });

  it("returns undefined for text without three numbers", () => {
    expect(parseVersion("22.12")).toBeUndefined();
    expect(parseVersion("unknown")).toBeUndefined();
    expect(parseVersion("")).toBeUndefined();
  });

  it("reads back any version it is given as text", () => {
    fc.assert(
      fc.property(version, (parsed) => {
        const text = `${parsed.numbers.join(".")}${parsed.prerelease ? "-pre" : ""}`;
        expect(parseVersion(text)).toEqual(parsed);
      }),
      runOptions,
    );
  });
});

describe("compareVersions", () => {
  it("orders by major, then minor, then patch", () => {
    expect(compareVersions(v([22, 12, 0]), v([22, 11, 9]))).toBeGreaterThan(0);
    expect(compareVersions(v([22, 12, 0]), v([23, 0, 0]))).toBeLessThan(0);
    expect(compareVersions(v([22, 12, 1]), v([22, 12, 0]))).toBeGreaterThan(0);
    expect(compareVersions(v([22, 12, 0]), v([22, 12, 0]))).toBe(0);
  });

  it("puts a pre-release before the release of the same numbers, and after older numbers", () => {
    expect(compareVersions(v([22, 12, 0], true), v([22, 12, 0]))).toBeLessThan(0);
    expect(compareVersions(v([22, 12, 0], true), v([22, 11, 9]))).toBeGreaterThan(0);
  });

  it("is antisymmetric", () => {
    fc.assert(
      fc.property(version, version, (first, second) => {
        const forward = Math.sign(compareVersions(first, second));
        const backward = Math.sign(compareVersions(second, first));
        expect(forward + backward).toBe(0);
      }),
      runOptions,
    );
  });

  it("agrees with ordering the numbers as tuples, then releases after pre-releases", () => {
    const key = (version: Version): readonly number[] => [
      ...version.numbers,
      version.prerelease ? 0 : 1,
    ];
    fc.assert(
      fc.property(version, version, (first, second) => {
        const [a, b] = [key(first), key(second)];
        const index = a.findIndex((value, position) => value !== b[position]);
        const expected = index === -1 ? 0 : Math.sign((a[index] ?? 0) - (b[index] ?? 0));
        expect(Math.sign(compareVersions(first, second))).toBe(expected);
      }),
      runOptions,
    );
  });
});

describe("checkNode", () => {
  it("passes on the minimum version", () => {
    expect(checkNode(MIN_NODE_VERSION)).toEqual({
      id: "node",
      status: "pass",
      message: `Node.js ${MIN_NODE_VERSION}; Atium needs ${MIN_NODE_VERSION} or later.`,
      details: { version: MIN_NODE_VERSION, required: MIN_NODE_VERSION },
    });
  });

  it("passes on a newer major version", () => {
    expect(checkNode("24.0.0").status).toBe("pass");
  });

  it("fails with a hint on an older version", () => {
    expect(checkNode("22.11.9")).toEqual({
      id: "node",
      status: "fail",
      message: `Node.js "22.11.9" is not supported: Atium needs ${MIN_NODE_VERSION} or later.`,
      hint: `Install Node.js ${MIN_NODE_VERSION} or later.`,
      details: { version: "22.11.9", required: MIN_NODE_VERSION },
    });
  });

  it("fails on a pre-release of the minimum version", () => {
    expect(checkNode(`${MIN_NODE_VERSION}-rc.1`).status).toBe("fail");
  });

  it("fails when the version cannot be read", () => {
    const check = checkNode("not-a-version");

    expect(check.status).toBe("fail");
    expect(check.message).toContain('"not-a-version"');
  });
});
