import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { keepFirst, keepFirstAndLast, keepLast, keepRanked } from "./select.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261012, numRuns: 500 };

const list = fc.array(fc.integer({ min: -50, max: 50 }), { maxLength: 60 });
const cap = fc.integer({ min: 1, max: 30 });

/** Items numbered by position, so order and identity can be checked. */
function numbered(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

describe("keepFirst, keepLast and keepFirstAndLast", () => {
  it("return the list itself, with nothing dropped, when it fits", () => {
    const items = numbered(3);

    expect(keepFirst(items, 3)).toEqual({ items, dropped: 0 });
    expect(keepLast(items, 5)).toEqual({ items, dropped: 0 });
    expect(keepFirstAndLast(items, 3)).toEqual({ items, dropped: 0 });
  });

  it("keep the first items, the last items, or the first and the last cap - 1", () => {
    const items = numbered(10);

    expect(keepFirst(items, 4)).toEqual({ items: [0, 1, 2, 3], dropped: 6 });
    expect(keepLast(items, 4)).toEqual({ items: [6, 7, 8, 9], dropped: 6 });
    expect(keepFirstAndLast(items, 4)).toEqual({ items: [0, 7, 8, 9], dropped: 6 });
    expect(keepFirstAndLast(items, 1)).toEqual({ items: [0], dropped: 9 });
  });

  it.each([0, -1, 1.5, Number.NaN])("reject a cap of %s", (badCap) => {
    expect(() => keepFirst([1], badCap)).toThrow(RangeError);
    expect(() => keepRanked([1], badCap, () => 0)).toThrow(RangeError);
  });
});

describe("keepRanked", () => {
  it("keeps at most cap items and counts the rest as dropped", () => {
    fc.assert(
      fc.property(list, cap, (items, maxItems) => {
        const kept = keepRanked(items, maxItems, (a, b) => a.item - b.item);

        expect(kept.items).toHaveLength(Math.min(items.length, maxItems));
        expect(kept.dropped).toBe(items.length - kept.items.length);
      }),
      runOptions,
    );
  });

  it("keeps the best ranked items in their original order, ties to the lower index", () => {
    fc.assert(
      fc.property(list, cap, (values, maxItems) => {
        const items = values.map((value, index) => ({ value, index }));
        const kept = keepRanked(items, maxItems, (a, b) => a.item.value - b.item.value);
        const keptIndexes = kept.items.map((item) => item.index);
        const dropped = items.filter((item) => !keptIndexes.includes(item.index));

        expect(keptIndexes).toEqual([...keptIndexes].sort((a, b) => a - b));
        for (const out of dropped) {
          for (const inside of kept.items) {
            const better =
              inside.value < out.value || (inside.value === out.value && inside.index < out.index);
            expect(better).toBe(true);
          }
        }
      }),
      runOptions,
    );
  });
});
