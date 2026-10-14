/**
 * ESLint plugin of Atium: per-file rules for Playwright and Cypress suites.
 *
 * ```js
 * import atium from "@atium/eslint-plugin";
 *
 * export default [{ plugins: { atium } }];
 * ```
 *
 * @packageDocumentation
 */
import { plugin } from "./plugin.js";

export type { AtiumPlugin } from "./plugin.js";

/**
 * The plugin object: `meta`, `rules` and `configs`. Register it as
 * `plugins: { atium }` in `eslint.config.js`; `require()` returns it too.
 */
// eslint-disable-next-line no-restricted-syntax -- ESLint configs import plugins by their default export (01-typescript.md)
export default plugin;
