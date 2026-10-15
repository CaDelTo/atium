/**
 * Timeout of a test that is slow by nature, such as a property with hundreds
 * of runs or one that caps and validates results with every field at its cap:
 * one that takes 0.8 s or more in any run of `pnpm test --force`, next to the
 * rest of the suite. A loaded CI runner can make such a test about six times
 * slower and push it past Vitest's 5 s default (#99).
 *
 * Pass it as the third argument of `it`; never raise the global `testTimeout`
 * or lower the runs of a property instead (04-testing.md, "Determinismo").
 */
export const HEAVY_TEST_TIMEOUT_MS = 60_000;
