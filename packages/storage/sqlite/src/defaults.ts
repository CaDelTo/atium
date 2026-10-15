import { ATIUM_DIRECTORY } from "@atium/core";

/** Path of the local database, relative to the repository root (15-storage.md §23.6). */
export const SQLITE_DATABASE_PATH = `${ATIUM_DIRECTORY}/atium.db` as const;

/**
 * How long a statement waits for another connection to release its lock
 * before failing with `SQLITE_BUSY`, in milliseconds: the default of
 * better-sqlite3 (15-storage.md §23.6).
 */
export const SQLITE_BUSY_TIMEOUT_MS = 5000;

/**
 * Permissions of a new database file: only its owner can read it, like run
 * files (15-storage.md §23.6, §23.2.1). SQLite gives its `-wal` and `-shm`
 * files the same permissions.
 */
export const SQLITE_FILE_MODE = 0o600;

/** Permissions of the directories created for the database: only their owner can list them (15-storage.md §23.6). */
export const SQLITE_DIRECTORY_MODE = 0o700;
