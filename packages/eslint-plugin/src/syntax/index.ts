/**
 * Shared E2E syntax of the linter (ADR-0023): pure functions over the ESTree
 * AST of typescript-eslint that recognize the framework, tests and their
 * `titlePath`, actions, assertions, locators and fixed waits. The rules of
 * `@atium/eslint-plugin`, `@atium/suite-index` and the analyzers use them.
 *
 * Internal: not part of the public API. It never loads ESLint.
 *
 * @packageDocumentation
 */
export type { Action } from "./actions.js";
export { actionOf } from "./actions.js";
export type { Assertion, AssertionKind, NameMatcher } from "./assertions.js";
export { assertionOf, createNameMatcher } from "./assertions.js";
export type { TestContext, TitlePath } from "./context.js";
export { enclosingBlocks, testContextOf, titlePathOf } from "./context.js";
export type { Framework } from "./framework.js";
export { detectFramework, FRAMEWORKS } from "./framework.js";
export type { LocatorCall, LocatorQuery, LocatorRefinement } from "./locators.js";
export { locatorOf } from "./locators.js";
export type { BlockKind, BlockModifier, BlockRunner, TestBlock } from "./structure.js";
export { classifyBlock } from "./structure.js";
export type { Title } from "./title.js";
export { titleOf } from "./title.js";
export type { FixedWait, FixedWaitKind } from "./waits.js";
export { fixedWaitOf } from "./waits.js";
