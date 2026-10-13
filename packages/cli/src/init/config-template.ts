import { CONFIG_PACKAGE } from "../defaults.js";

/**
 * The `atium.config.ts` that `atium init` creates: the adapters and nothing
 * else, since every other section has defaults (18-cli-config.md §26.3).
 *
 * @param adapters - Adapter names, in the order to write them.
 * @returns The file content, ending in a newline.
 */
export function configTemplate(adapters: readonly string[]): string {
  const list = adapters.map((name) => JSON.stringify(name)).join(", ");
  return [
    `import { defineConfig } from ${JSON.stringify(CONFIG_PACKAGE)};`,
    "",
    "export default defineConfig({",
    `  adapters: [${list}],`,
    "});",
    "",
  ].join("\n");
}
