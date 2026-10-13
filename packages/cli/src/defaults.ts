/**
 * Namespace of the CLI's logger: it starts every log line and is what
 * `DEBUG=atium:*` matches.
 *
 * Source: 03-errors-logging.md, "Logging".
 */
export const LOG_NAMESPACE = "atium:cli";

/**
 * Config file created by `atium init`.
 *
 * Source: 18-cli-config.md §26.1.
 */
export const INIT_CONFIG_FILE = "atium.config.ts";

/**
 * For each adapter that `atium init` can detect, the packages whose presence
 * in `package.json` adds it, in the order the adapters are written.
 *
 * Source: 18-cli-config.md §26.1.
 */
export const FRAMEWORK_PACKAGES = Object.freeze([
  Object.freeze({
    adapter: "playwright",
    packages: Object.freeze(["@playwright/test", "playwright"]),
  }),
  Object.freeze({ adapter: "cypress", packages: Object.freeze(["cypress"]) }),
] as const);

/**
 * Package that the config created by `atium init` imports `defineConfig` from.
 *
 * Source: 18-cli-config.md §26.3.
 */
export const CONFIG_PACKAGE = "@atium/core";

/**
 * Largest `package.json`, in bytes, that `atium init` reads: 1 MiB. A larger
 * one is not read and no framework is detected (06-security.md, input sizes
 * are limited before processing).
 *
 * Source: 18-cli-config.md §26.1.
 */
export const MANIFEST_MAX_BYTES = 1024 * 1024;
