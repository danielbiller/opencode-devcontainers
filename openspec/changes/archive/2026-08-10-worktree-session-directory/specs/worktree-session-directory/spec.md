## Purpose

Makes a `/worktree` session behave as if it were launched inside the worktree: the session's working directory follows the worktree, all tools and session-scoped commands target it, and the session returns to the main repo on exit.

## ADDED Requirements

### Requirement: Session follows the active worktree
When a worktree is targeted or created via `/worktree <branch>`, the session's working directory SHALL move to the worktree directory. Built-in tools SHALL resolve relative paths and default working directories against the worktree, and session-scoped commands (`/diff`, `/undo`, LSP) SHALL operate on the worktree as if the session had been launched there.

#### Scenario: New turn runs in the worktree
- **WHEN** a session targets a worktree and a new turn begins
- **THEN** a bash command without an explicit working directory runs in the worktree directory

#### Scenario: Built-in tools resolve against the worktree
- **WHEN** a built-in tool (`glob`, `grep`, `read`, `write`, `edit`) is invoked with a relative path while a worktree is targeted
- **THEN** the path resolves against the worktree directory

#### Scenario: Diff viewer shows worktree changes
- **WHEN** the user opens `/diff` while a worktree is targeted
- **THEN** the viewer shows the worktree's working-tree changes

### Requirement: Session stays visible in the original project's session list
Moving the session SHALL preserve the session's project membership, so the session remains listed among the sessions of the launch directory's project, including after an opencode restart.

#### Scenario: Session listed after move
- **WHEN** a session is moved to a worktree and the user opens the session list from the launch directory
- **THEN** the session appears in that list

#### Scenario: Session survives restart
- **WHEN** opencode is restarted while a session targets a worktree
- **THEN** the session is still listed in the launch directory's project and still targets the worktree

### Requirement: /worktree exit restores the main repository
`/worktree exit` (aliases `quit` and `off`) SHALL move the session back to the main repository directory. The worktree SHALL remain on disk with its branch checked out. The command SHALL NOT remove the worktree or change any branch checkouts.

#### Scenario: Exit returns session to main repo
- **WHEN** the user runs `/worktree exit` while a worktree is targeted
- **THEN** the session's working directory is the main repo directory and `/diff` shows the main repo's changes

#### Scenario: Worktree persists after exit
- **WHEN** the user runs `/worktree exit` while a worktree is targeted
- **THEN** the worktree directory still exists and still has its branch checked out

### Requirement: No HOST: escape hatch
The plugin SHALL provide no `HOST:` command-prefix escape. Commands prefixed with `HOST:` SHALL be executed unmodified, without prefix stripping or any other special handling.

#### Scenario: HOST: prefix is not honored
- **WHEN** a bash command prefixed with `HOST:` is run while a worktree is targeted
- **THEN** the command is executed unmodified (no prefix stripping) in the session's working directory

### Requirement: Move failure does not break the command
If a session move fails — on target or on exit — the `/worktree` command SHALL NOT throw. The failure SHALL be surfaced to the user (toast), and the plugin's session state SHALL stay consistent with the server state so the command can be retried: on a failed target move the session state remains saved, and on a failed exit restore the session state is retained rather than cleared.

#### Scenario: Move API fails while targeting a worktree
- **WHEN** the session move API returns an error while targeting a worktree
- **THEN** the `/worktree` command still returns success with the worktree session state saved, and the user is notified of the failed move

#### Scenario: Move API fails on exit
- **WHEN** the session move API returns an error during `/worktree exit`
- **THEN** the command does not throw, the session state is retained (so exit can be retried), the user is notified, and the session remains in the worktree
