/**
 * Cross-file index of a test suite (03-linter.md §11.4, ADR-0005): what the
 * cross-file rules of `atium lint` need from each file.
 *
 * Internal: only Atium's own packages use it.
 *
 * @packageDocumentation
 */
export { extractFileIndex } from "./extract-file-index.js";
export type { ExtractFileIndexOptions } from "./extract-file-index.js";
export { FILE_INDEX_SCHEMA_VERSION, FileIndexSchema } from "./file-index.js";
export type { FileIndex, IndexedLocator, IndexedTest } from "./file-index.js";
