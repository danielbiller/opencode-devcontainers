## Purpose

`/worktree` can target any branch — existing or new — creating a worktree with that branch checked out, and slash-containing branch names resolve correctly instead of being misread as `repo/branch` syntax.

## ADDED Requirements

### Requirement: Worktree creation accepts existing local branches
`createWorktreeWorkspace` SHALL detect whether the target branch exists as a local ref (`refs/heads/<branch>`) and, when it does, create the worktree WITHOUT `-b` so the existing branch is checked out in the new worktree. When the branch does not exist, worktree creation SHALL continue to use `-b` to create it.

#### Scenario: Existing branch
- **WHEN** `/worktree <branch>` targets a branch that exists in the repo and no worktree for it is materialized
- **THEN** a worktree is created at the standard workspace path, that branch is checked out in it, and no error is raised

#### Scenario: New branch (unchanged)
- **WHEN** `/worktree <branch>` targets a branch that does not exist
- **THEN** a new branch is created and checked out in the worktree, as before

#### Scenario: Branch checked out elsewhere
- **WHEN** the target branch is currently checked out in the main repo or another worktree
- **THEN** the command fails with git's branch-in-use error (`'<branch>' is already checked out at ...` or `already used by worktree at ...`), no worktree is created, and no branch refs change

### Requirement: Slash-containing branch names resolve as whole branches
`resolveWorktreeWorkspace` SHALL search all repos for the full target branch name (slashes intact) before considering `repo/branch` syntax, and SHALL apply the `repo/branch` interpretation only when the first path segment names an existing repo directory under the worktrees dir.

#### Scenario: Slash-branch worktree resolves
- **WHEN** a worktree exists at `<worktrees>/<repo>/fix/command-install` and the target is `fix/command-install`
- **THEN** resolution returns that worktree with repo `<repo>` and branch `fix/command-install`

#### Scenario: repo/branch syntax still works
- **WHEN** `<worktrees>/<repo>/feature-branch` exists, the target is `<repo>/feature-branch`, and no whole-branch match exists
- **THEN** resolution returns repo `<repo>` and branch `feature-branch`

#### Scenario: Ambiguity across repos
- **WHEN** the same whole branch name is materialized in two repos and no repo prefix is given
- **THEN** resolution reports the target as ambiguous with both matches

#### Scenario: Nothing matches
- **WHEN** neither the whole-branch nor the `repo/branch` interpretation matches anything
- **THEN** resolution returns null and the tool proceeds to worktree creation
