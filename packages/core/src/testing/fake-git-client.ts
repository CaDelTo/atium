import type { GitClient } from "../ci/git-client.js";
import { AtiumError } from "../errors.js";

/** State of the repository a {@link FakeGitClient} answers with. */
export interface FakeGitState {
  /** Answer of {@link GitClient.headCommit}. */
  readonly commitSha: string;
  /** Answer of {@link GitClient.currentBranch}; `undefined` for a detached HEAD. */
  readonly branch: string | undefined;
  /** Answer of {@link GitClient.isDirty}. */
  readonly dirty: boolean;
}

/** Method of {@link GitClient} called on a {@link FakeGitClient}. */
export type GitQuery = keyof GitClient;

/**
 * {@link GitClient} that answers from memory and records every query, so tests
 * can assert on whether Git was consulted.
 *
 * @example
 * ```ts
 * const git = new FakeGitClient({ dirty: true });
 * const { git: section } = await detectRunContext({ env: {}, cwd, git, logger });
 * expect(section.dirty).toBe(true);
 * ```
 */
export class FakeGitClient implements GitClient {
  readonly #state: FakeGitState | undefined;
  readonly #queries: GitQuery[] = [];

  /**
   * @param state - Repository state, over a clean `main` at a fixed commit, or
   * `"unavailable"` for a machine without Git: then every query throws
   * `GIT_UNAVAILABLE`, as {@link createGitClient} does.
   */
  constructor(state: Partial<FakeGitState> | "unavailable" = {}) {
    this.#state =
      state === "unavailable"
        ? undefined
        : {
            commitSha: "0123456789abcdef0123456789abcdef01234567",
            branch: "main",
            dirty: false,
            ...state,
          };
  }

  /** Every query so far, in order. */
  get queries(): readonly GitQuery[] {
    return this.#queries;
  }

  /** @returns The commit of the state. */
  headCommit(): Promise<string> {
    return this.#answer("headCommit", (state) => state.commitSha);
  }

  /** @returns The branch of the state. */
  currentBranch(): Promise<string | undefined> {
    return this.#answer("currentBranch", (state) => state.branch);
  }

  /** @returns Whether the state is dirty. */
  isDirty(): Promise<boolean> {
    return this.#answer("isDirty", (state) => state.dirty);
  }

  #answer<T>(query: GitQuery, read: (state: FakeGitState) => T): Promise<T> {
    this.#queries.push(query);
    if (this.#state === undefined) {
      return Promise.reject(
        new AtiumError("GIT_UNAVAILABLE", "Git is not available in this fake.", {
          hint: "Pass a state to FakeGitClient.",
        }),
      );
    }
    return Promise.resolve(read(this.#state));
  }
}
