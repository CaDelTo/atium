import { describe, expect, it } from "vitest";
import { parseListRunsQuery } from "./list-runs-query.js";

describe("parseListRunsQuery", () => {
  it("keeps the branch and the limit as given", () => {
    expect(parseListRunsQuery({ branch: "main", limit: 5 })).toStrictEqual({
      branch: "main",
      limit: 5,
    });
  });

  it("turns since into the same instant in milliseconds, whatever its offset", () => {
    const utc = parseListRunsQuery({ since: "2026-10-08T14:03:00Z", limit: 1 });
    const withOffset = parseListRunsQuery({ since: "2026-10-08T16:03:00+02:00", limit: 1 });

    expect(utc).toStrictEqual({ sinceMs: Date.UTC(2026, 9, 8, 14, 3), limit: 1 });
    expect(withOffset).toStrictEqual(utc);
  });

  it("accepts the largest safe integer as limit", () => {
    expect(parseListRunsQuery({ limit: Number.MAX_SAFE_INTEGER }).limit).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects a limit of %s",
    (limit) => {
      expect(() => parseListRunsQuery({ limit })).toThrow(RangeError);
    },
  );

  it.each(["yesterday", "2026-10-08T14:03:00", "2026-10-08"])("rejects %s as since", (since) => {
    expect(() => parseListRunsQuery({ since, limit: 1 })).toThrow(RangeError);
  });
});
