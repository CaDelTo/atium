/**
 * Timeout of a test that is slow by nature, such as a property with hundreds
 * of runs or one that caps and validates results with every field at its cap.
 * It takes a second or more next to the rest of the suite, and a loaded CI
 * runner can make it several times slower than Vitest's 5 s default (#99).
 *
 * Pass it as the third argument of `it`; never raise the global `testTimeout`
 * or lower the runs of a property instead (04-testing.md, "Determinismo").
 */
export const HEAVY_TEST_TIMEOUT_MS = 60_000;
