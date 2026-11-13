import { FRAMEWORKS } from "@atium/eslint-plugin/syntax";
import type { AssertionKind } from "@atium/eslint-plugin/syntax";
import { z } from "zod";

/**
 * Version of the {@link FileIndexSchema}. The cache of the index (v1-31) keys
 * its entries by it, so it changes with every change to the shape.
 */
export const FILE_INDEX_SCHEMA_VERSION = 1;

/** The kinds of assertion that `assertionOf` recognizes (03-linter.md §11.3.1). */
const ASSERTION_KINDS = ["expect", "chained", "custom"] as const satisfies readonly AssertionKind[];

const NameSchema = z.string().min(1);

/** A place in the source: 1-based line and column, as in `Finding.location`. */
const PositionSchema = z
  .strictObject({
    /** 1-based line. */
    line: z.int().positive(),
    /** 1-based column. */
    column: z.int().positive(),
  })
  .readonly();

/** Where a node starts and ends. */
const RangeSchema = z
  .strictObject({
    /** First character of the node. */
    start: PositionSchema,
    /** Position just after the last character of the node. */
    end: PositionSchema,
  })
  .readonly();

/**
 * Level of a locator in the selector hierarchy (06-selector-advisor.md §14.1),
 * from 5, the most robust, to 1; `null` when it is not known.
 */
const LevelSchema = z.int().min(1).max(5).nullable();

/** A title path, outermost title first. */
const TitlesSchema = z.array(z.string()).readonly();

/** An action of a test, normalized for E2E013: its name and the level of its locator. */
const ActionSchema = z
  .strictObject({
    /** The method or command, such as `click` or `get`. */
    name: NameSchema,
    /**
     * Level of the nearest locator query in the chain of the action, the
     * action itself included (`cy.get` is both); `null` without one, as in
     * `page.goto()` or an action on a variable.
     */
    level: LevelSchema,
  })
  .readonly();

/** An assertion of a test. */
const AssertionSchema = z
  .strictObject({
    /** How it asserts. */
    kind: z.enum(ASSERTION_KINDS),
    /** The called name, such as `expect`, `should` or `verifyCart`. */
    name: NameSchema,
    /** Where the call starts. */
    location: PositionSchema,
  })
  .readonly();

/** A test of the file (03-linter.md §11.3.1). */
const TestSchema = z
  .strictObject({
    /** Titles of the describes that contain the test, and its own. */
    titlePath: TitlesSchema,
    /** The titles joined with `" › "`, as in the `testId`. */
    fullTitle: z.string(),
    /** Whether every title is static. */
    isStatic: z.boolean(),
    /** The declaring call. */
    range: RangeSchema,
    /** Actions in source order, those of its steps included. */
    actions: z.array(ActionSchema).readonly(),
    /** Assertions in source order. */
    assertions: z.array(AssertionSchema).readonly(),
    /**
     * Dotted names of the other calls, such as `login` or `loginPage.open`,
     * once each in order of first appearance; v1-30 resolves them to helpers.
     */
    calls: z.array(NameSchema).readonly(),
  })
  .readonly();

/** A locator query anywhere in the file: tests, hooks, helpers or Page Objects. */
const LocatorSchema = z
  .strictObject({
    /** The method, such as `locator`, `getByRole`, `get` or `xpath`. */
    method: NameSchema,
    /** The framework whose syntax the call uses. */
    framework: z.enum(FRAMEWORKS),
    /** The first argument normalized with `normalizeSelector`; `null` when it is not a literal. */
    selector: z.string().nullable(),
    /** Level of the query. */
    level: LevelSchema,
    /** Where the call starts. */
    location: PositionSchema,
    /** Source text of the call, for the fingerprint of a finding on it (03-linter.md §11.5). */
    code: z.string().min(1),
    /** The `titlePath` of the test that contains it; `null` outside every test. */
    testTitlePath: TitlesSchema.nullable(),
  })
  .readonly();

/**
 * What the cross-file rules need from one file (03-linter.md §11.4). Internal
 * and versioned: it is cached per file, so its shape changes only with a new
 * {@link FILE_INDEX_SCHEMA_VERSION}.
 */
export const FileIndexSchema = z
  .strictObject({
    /** See {@link FILE_INDEX_SCHEMA_VERSION}. */
    schemaVersion: z.literal(FILE_INDEX_SCHEMA_VERSION),
    /** The configured framework or the one its imports reveal; `null` when unknown. */
    framework: z.enum(FRAMEWORKS).nullable(),
    /** Tests in source order. */
    tests: z.array(TestSchema).readonly(),
    /** Locator queries in source order. */
    locators: z.array(LocatorSchema).readonly(),
  })
  .readonly();

/** The index of one file. See {@link FileIndexSchema}. */
export type FileIndex = z.infer<typeof FileIndexSchema>;

/** A test of a {@link FileIndex}. */
export type IndexedTest = FileIndex["tests"][number];

/** A locator of a {@link FileIndex}. */
export type IndexedLocator = FileIndex["locators"][number];
