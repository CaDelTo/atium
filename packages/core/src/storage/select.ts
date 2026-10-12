/** What a list cap keeps, in the original order, and how many items it dropped. */
export interface Kept<T> {
  /** The items kept, in their original order. */
  readonly items: readonly T[];
  /** How many items the cap dropped; 0 when the list fits. */
  readonly dropped: number;
}

/** An item with its position in the original list. */
export interface Indexed<T> {
  /** The item. */
  readonly item: T;
  /** Its position in the original list, from 0. */
  readonly index: number;
}

function assertCap(cap: number): void {
  if (!Number.isSafeInteger(cap) || cap < 1) {
    throw new RangeError(`A list cap must be a positive integer, got ${String(cap)}.`);
  }
}

/**
 * Keeps the first `cap` items.
 *
 * @param items - List to cap.
 * @param cap - Items kept. A positive integer.
 * @returns The items kept and how many were dropped.
 * @throws RangeError if `cap` is not a positive integer.
 */
export function keepFirst<T>(items: readonly T[], cap: number): Kept<T> {
  assertCap(cap);
  return items.length <= cap
    ? { items, dropped: 0 }
    : { items: items.slice(0, cap), dropped: items.length - cap };
}

/**
 * Keeps the last `cap` items.
 *
 * @param items - List to cap.
 * @param cap - Items kept. A positive integer.
 * @returns The items kept and how many were dropped.
 * @throws RangeError if `cap` is not a positive integer.
 */
export function keepLast<T>(items: readonly T[], cap: number): Kept<T> {
  assertCap(cap);
  return items.length <= cap
    ? { items, dropped: 0 }
    : { items: items.slice(items.length - cap), dropped: items.length - cap };
}

/**
 * Keeps the first item and the last `cap - 1`.
 *
 * @param items - List to cap.
 * @param cap - Items kept. A positive integer.
 * @returns The items kept and how many were dropped.
 * @throws RangeError if `cap` is not a positive integer.
 */
export function keepFirstAndLast<T>(items: readonly T[], cap: number): Kept<T> {
  assertCap(cap);
  if (items.length <= cap) {
    return { items, dropped: 0 };
  }
  const first = items.slice(0, 1);
  const last = cap === 1 ? [] : items.slice(items.length - (cap - 1));
  return { items: [...first, ...last], dropped: items.length - cap };
}

/**
 * Keeps the `cap` items that rank first by `compare`, in their original order.
 * Ties that `compare` leaves (it returns 0) go to the lower original index.
 *
 * @param items - List to cap.
 * @param cap - Items kept. A positive integer.
 * @param compare - Negative when `a` ranks before `b`, as in `Array.sort`.
 * @returns The items kept and how many were dropped.
 * @throws RangeError if `cap` is not a positive integer.
 */
export function keepRanked<T>(
  items: readonly T[],
  cap: number,
  compare: (a: Indexed<T>, b: Indexed<T>) => number,
): Kept<T> {
  assertCap(cap);
  if (items.length <= cap) {
    return { items, dropped: 0 };
  }
  const ranked = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => compare(a, b) || a.index - b.index);
  const kept = ranked
    .slice(0, cap)
    .sort((a, b) => a.index - b.index)
    .map(({ item }) => item);
  return { items: kept, dropped: items.length - cap };
}
