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

/**
 * Lowest Node.js version `atium doctor` accepts: the `engines` of this
 * package, which Commander 15 requires, within the Node 22 LTS of ADR-0002.
 *
 * Source: 18-cli-config.md §26.1.
 */
export const MIN_NODE_VERSION = "22.12.0";

/**
 * Directory of Atium's local files, such as the SQLite database and the run
 * files, relative to the root of the repository, which in the CLI is the
 * working directory. `atium doctor` checks it can be written.
 *
 * Source: 15-storage.md and 18-cli-config.md §26.1.
 *
 * Same value as `ATIUM_DIRECTORY` of `@atium/core`, kept here on purpose:
 * messages.ts uses it in the help, which `atium --help` loads without
 * `@atium/core` (05-performance.md, "Arranque del CLI"). defaults.test.ts
 * keeps both equal.
 */
export const ATIUM_DIRECTORY = ".atium";

/**
 * Values of `--format` that `atium doctor` accepts; the first is the default.
 *
 * Source: 18-cli-config.md §26.1.
 */
export const DOCTOR_FORMATS = Object.freeze(["text", "json"] as const);
