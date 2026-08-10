## 1. Branch Detection

- [x] 1.1 Add `branchExists(dir, branch)` to `plugin/core/git.js` — `git rev-parse --verify --quiet refs/heads/<branch>` via `runGit`, return `exitCode === 0`, with JSDoc
- [x] 1.2 Export `branchExists` from `plugin/core/index.js`

## 2. Worktree Creation Fix

- [x] 2.1 In `createWorktreeWorkspace` (`plugin/core/worktree.js`), pass `{ createBranch: !(await branchExists(repoRoot, branch)) }` to `createWorktree` (single call site)

## 3. Resolution Fix

- [x] 3.1 Reorder `resolveWorktreeWorkspace` (`plugin/helpers.js`): whole-branch search across all repos first (1 = return, >1 = ambiguous)
- [x] 3.2 Gate `repo/branch` fallback on the first segment being an existing repo directory under the worktrees dir
- [x] 3.3 Remove the cwd-inference path (subsumed by the all-repos scan)

## 4. Tests

- [x] 4.1 `test/unit/git-worktree.test.js`: `branchExists` returns true for an existing branch, false for an unknown one
- [x] 4.2 `test/unit/worktree.test.js`: `createWorktreeWorkspace` with a pre-existing branch succeeds and the workspace checks out that branch (`git branch --show-current`); regression-fails before the fix
- [x] 4.3 `test/unit/helpers.test.js`: new `resolveWorktreeWorkspace` suite — slash-branch target, `repo/branch` syntax, ambiguity across repos, null when nothing matches
- [x] 4.4 `npm test` green (unit + integration)

## 5. Docs

- [x] 5.1 Update `plugin/command/worktree.md` if it implies new-branch-only targeting; note the in-use-branch error
- [x] 5.2 `docs/project-summary.md` — confirm no stale claims (expected unchanged)

## 6. Verification

- [x] 6.1 Tool-level: `/worktree <existing-branch>` from the main repo creates and targets the worktree; `/worktree <slash/branch>` resolves an existing worktree
