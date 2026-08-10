## Why

`/worktree <branch>` currently only redirects bash commands (via `tool.execute.before` setting `workdir`); the opencode session itself stays pinned to the launch directory, so built-in tools (`glob`, `grep`, `read`, `write`, `edit`), the `/diff` viewer, project session listing, and LSP context all keep operating against the wrong directory. The session should follow the worktree.

## What Changes

- `/worktree <branch>` moves the opencode **session** into the worktree directory via the experimental session-move endpoint (`moveChanges: false`), so all built-in tools resolve relative paths against the worktree and all session-scoped commands (`/diff`, `/undo`, project session list, LSP) follow it.
- Sessions remain visible in the **original directory's session list**: the move preserves `project_id`, and session listing is project-scoped, so the session stays in the launch project's list and after restart.
- `/worktree exit` (aliases `quit`, and `off` for backward compatibility) moves the session back to the main repo directory; the worktree persists, the branch stays checked out in the worktree. (Bringing the branch back to the main repo is explicitly out of scope — future feature.)
- **BREAKING**: the `HOST:` command-prefix escape hatch is removed entirely (functionality and docs). `/worktree exit` is the way out.
- The existing workdir/path injection for worktree sessions is removed — no tool-default overrides after the transition turn; during the same turn as `/worktree`, the agent uses absolute paths.
- Known limitation (documented, accepted): the turn that runs `/worktree` snapshots the session location at request start; the move takes effect from the next request onward. Reads of worktree files during that transition turn may trigger a one-time permission prompt.

## Capabilities

### New Capabilities
- `worktree-session-directory`: the session's working directory follows the active worktree — tool defaults, session-scoped commands, and session-list visibility behave as if the session were launched inside the worktree, and restore to the main repo on `/worktree exit`.

### Modified Capabilities
- None (no existing specs in this repo).

## Impact

- `plugin/index.js` — `worktree` tool execute (move on resolve/create, exit/quit/off flow), `tool.execute.before` (remove workdir injection and `HOST:` handling; keep no-op early return for worktree sessions so they don't fall into devcontainer wrapping).
- `plugin/helpers.js` — remove `HOST_COMMANDS` and `shouldRunOnHost`.
- New thin module posting to `/experimental/control-plane/move-session` (the 1.18.x SDK does not expose `session.move` — verified live).
- `test/unit/helpers.test.js` — remove HOST-related tests; add tests for the move wrapper.
- Docs: `README.md`, `plugin/command/worktree.md`, `plugin/command/devcontainer.md` (HOST: mention), `docs/project-summary.md` (already reflects this design).
- No new dependencies; no DB access from the plugin (the server resolves the project itself).
