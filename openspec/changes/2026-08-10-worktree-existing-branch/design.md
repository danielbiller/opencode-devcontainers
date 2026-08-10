## Context

See proposal.md - Why. Current state: `createWorktree` (plugin/core/git.js) already supports existing branches via `{ createBranch: false }` (unit-tested at the git layer), but `createWorktreeWorkspace` (plugin/core/worktree.js) calls it without options, so `createBranch` defaults to `true` and every creation runs `git worktree add -b <branch> <path>`. Git rejects `-b` when the branch exists, surfacing as `Failed to create worktree: git worktree add failed: fatal: a branch named '<branch>' already exists` from the tool (plugin/index.js). The tool's "already exists" shortcut (`resolveWorktreeWorkspace` in plugin/helpers.js) only matches materialized worktrees on disk under the worktrees dir — it never consults the repo's branch list, and it splits any target containing `/` at the first slash into `repo`/`branch`, so slash-branch names (`fix/command-install`) never resolve.

## Goals / Non-Goals

**Goals:**
- `/worktree <branch>` creates a worktree for any branch — existing or new — with the branch checked out.
- Slash-containing branch names resolve as whole branches; `repo/branch` syntax remains available.
- Surgical diff: one guard in the shared creation path, one reordered resolution function.

**Non-Goals:**
- Remote-only branches (a branch without `refs/heads/<name>` still creates a new local branch — existing semantics, unchanged).
- Freeing a branch checked out elsewhere; git's `already used by worktree` error is the message.
- Anything in worktree removal, session-move, or devcontainer flows.

## Decisions

1. **Branch detection: `git rev-parse --verify --quiet refs/heads/<branch>`.** Exit code is the answer (0 = exists); `--quiet` suppresses stderr for missing branches; no output parsing. Implemented as `branchExists(dir, branch)` in git.js next to the other git helpers, exported through `core/index.js`.
2. **One guard at the root cause.** `createWorktreeWorkspace` is the single production caller of `createWorktree`; passing `{ createBranch: !exists }` there fixes every path (tool create, future callers) instead of patching callers. The git layer keeps its explicit `createBranch` option for direct callers and tests.
3. **Resolution order: whole branch first.** `resolveWorktreeWorkspace` scans all repos under the worktrees dir for `<repo>/<full target>` (slashes intact): exactly 1 → return; >1 → ambiguous. Only if nothing matches does it try `repo/branch` syntax, and only when the first segment names an actual repo directory under the worktrees dir. The old cwd-inference block (`git rev-parse --show-toplevel` basename) is subsumed by the all-repos scan and removed.
4. **Ambiguity precedence: whole-branch wins.** If both `<repos>/<repoA>/fix/command-install` and `<worktrees>/fix/command-install` exist, the whole-branch match wins — the project's own convention is `fix/*` branch names. The `repo/branch` form still resolves the other interpretation.
5. **Error surfacing unchanged.** In-use-branch failures propagate git's own message through the existing `Failed to create worktree:` wrapper; no new error taxonomy, no new cleanup code (git creates nothing on `-b`/ref-check failure, verified).

## Risks / Trade-offs

- [Branch checked out in the main repo or another worktree] → git fails with `'<branch>' is already checked out at <path>` / `already used by worktree at <path>`; user must free the branch first. Accepted; documented in `plugin/command/worktree.md`.
- [Whole-branch and repo/branch interpretations both materialized] → whole-branch wins (decision 4); the other interpretation is still reachable only when its first segment is a repo dir — accepted edge case.
- [rev-parse exit-code semantics] → stable git plumbing; `--quiet` behavior is version-independent.

## Migration Plan

None. Behavior fix ships with the plugin; rollback is reverting the commit. No feature flag, no config change.
