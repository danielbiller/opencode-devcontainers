## Why

`/worktree <branch>` fails when the branch already exists in the repo: the plugin unconditionally runs `git worktree add -b <branch> <path>`, which git rejects with `fatal: a branch named '<branch>' already exists`. Only brand-new branches can be targeted; any existing local branch (e.g. `main`, `fix/command-install`) fails with `Failed to create worktree: ...`.

Second, branch names containing `/` (the project's `fix/*` convention) are misparsed during resolution: `resolveWorktreeWorkspace` treats *any* target with a slash as `repo/branch` syntax, so `fix/command-install` is read as repo `fix` + branch `command-install` and never resolves to an existing worktree under `<repo>/fix/command-install`.

## What Changes

- Creating a worktree for an **existing local branch** works: `createWorktreeWorkspace` detects the branch (`git rev-parse --verify --quiet refs/heads/<branch>`) and creates the worktree **without** `-b` (which checks the branch out in the worktree). New branches keep the existing `-b` behavior.
- A branch checked out in the main repo or another worktree continues to fail, with git's standard `already used by worktree` error — unchanged handling, no partial state.
- `resolveWorktreeWorkspace` resolves slash-containing targets as **whole branch names first** (searching all repos), and only falls back to `repo/branch` syntax when the first segment is an actual repo directory under the worktrees dir. `fix/command-install` now resolves to `<worktrees>/<repo>/fix/command-install`; `<repo>/feature-branch` still works; the cwd-based repo inference is removed (subsumed by the all-repos scan).
- No breaking changes, no new dependencies, no migration.

## Capabilities

### New Capabilities
- `worktree-existing-branch`: `/worktree` can target any branch — existing or new — and slash-containing branch names resolve correctly, including ambiguity reporting across repos.

### Modified Capabilities
- None.

## Impact

- `plugin/core/git.js` — new exported `branchExists(dir, branch)` (JSDoc'd, follows `runGit` style).
- `plugin/core/index.js` — add `branchExists` to the explicit git.js export block.
- `plugin/core/worktree.js` — `createWorktreeWorkspace` passes `{ createBranch: !(await branchExists(repoRoot, branch)) }` to `createWorktree`; single-line change at the one call site.
- `plugin/helpers.js` — `resolveWorktreeWorkspace`: reorder to whole-branch-first search; gate `repo/branch` fallback on the first segment being an existing repo dir; drop the cwd-inference path.
- `test/unit/git-worktree.test.js` — `branchExists` true/false cases.
- `test/unit/worktree.test.js` — `createWorktreeWorkspace` succeeds for a pre-existing branch; workspace checks out that branch.
- `test/unit/helpers.test.js` — new `resolveWorktreeWorkspace` suite (slash-branch, repo/branch syntax, ambiguous, null).
- Docs — `plugin/command/worktree.md` if it implies new-branch-only targeting; `docs/project-summary.md` expected unchanged.
