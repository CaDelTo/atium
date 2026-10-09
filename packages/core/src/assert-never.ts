/**
 * Marks a branch that the type checker proves unreachable, such as the
 * `default` case of an exhaustive `switch` over a discriminated union.
 *
 * If a new member is added to the union and not handled, the call no longer
 * type-checks, so the omission is caught at compile time. At runtime it only
 * runs when a value outside the declared type slips through.
 *
 * @param value - The value that should have been narrowed to `never`.
 * @returns Never returns.
 * @throws {@link Error} Always, with the unexpected value serialized as JSON in
 * the message.
 *
 * @example
 * ```ts
 * type State = { kind: "stable" } | { kind: "flaky" };
 *
 * function label(state: State): string {
 *   switch (state.kind) {
 *     case "stable": return "Stable";
 *     case "flaky": return "Flaky";
 *     default: return assertNever(state);
 *   }
 * }
 * ```
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
