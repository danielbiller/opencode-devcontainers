# Project Summary: Worktree Session Directory

## Goal

`/worktree <branch>` must move the opencode **session** into the worktree directory, so that:

- The agent's bash commands run in the worktree **without** specifying a path.
- All built-in tools (`glob`, `grep`, `read`, `write`, `edit`) resolve relative paths against the worktree.
- The user can use all session-scoped TUI commands (`/diff`, `/undo`, project session list, LSP) against the worktree.
- Sessions remain visible in the **original directory's session list** (project-scoped list; `project_id` is preserved by the move) and after restart.

This replaces the previous approach (workdir injection via `tool.execute.before`), which only redirected bash — everything else stayed pinned to the launch directory.

## Mechanism: the experimental session-move endpoint

The plugin posts a move (`sessionID`, `destination: { directory: <worktree> }`, `moveChanges: false`) to `/experimental/control-plane/move-session` fire-and-forget after `/worktree` resolves/creates a worktree, and posts the reverse to `mainRepo` on `/worktree exit` (alias `quit`).

Why this works end-to-end (verified in opencode 1.18.15):

1. **Server-side move**: the API updates the session row's `directory`; `project_id` is preserved (verified live — worktrees share the main repo's project).
2. **Per-request directory resolution**: the server's session-location middleware reads the session row on every session-scoped request and overrides the client-sent directory. Tool execution happens inside the `prompt` route (session-scoped), so all tool defaults — bash `workdir`, glob/grep `path`, read/write/edit relative bases — resolve against the moved directory. Verified in the binary.
3. **TUI follows**: the TUI session store updates via the `session.moved` event (verified in the binary's event handler), so `/diff` (queries `/vcs/diff?directory=<session.directory>`), project listing, and LSP context (follows session location) all use the worktree.
4. **Permissions work for free**: once the session's directory IS the worktree, files under it are in-scope — no `external_directory` allow rules needed.

### Same-turn visibility caveat (the one real limitation)

The turn that runs `/worktree` snapshots the session location at request start — the move takes effect from the **next request onward**. Within the same turn, the agent specifies **absolute paths** where needed (read/write/edit, git commands); note these are outside the pre-move session scope, so such reads may trigger a one-time permission prompt. No workdir/path injection anywhere — it would only cover the transition turn and would clutter tool defaults thereafter.

Everything the user cares about (slash commands, `/diff`, subsequent turns) uses the worktree from the first request after the move.

## Git files: no client access needed after the move (resolved)

- The only git-file **write** is `git worktree add` at creation time, run from the main repo **before** the move. Nothing writes git files post-move.
- `getMainRepoFromWorktree` (parses the worktree's `.git` file) is a **read**, path-relative to the worktree — works after the move.
- The old design's `.git/opencode` project-id cache write is **dropped** — the server resolves the project itself.
- `/worktree exit` restores using the stored `mainRepo` from the session JSON — no git read needed.
- Server-side git ops on the worktree (`git -C <worktree> status/diff`) work natively — worktrees are complete git repos sharing the object store via `commondir`.
- **`HOST:` prefix: removed entirely** (functionality and docs). `/worktree exit` is the escape.

## Implementation shape

No DB code. A thin module replaces the previously-planned `sessionDir.js` (which was never written):

- `sessionMove.js` (~30 lines): posts to `/experimental/control-plane/move-session` via `client._client` (the 1.18.x SDK does not expose `session.move`), never throws; the same function restores on `exit` from `session.mainRepo`.
- `index.js` hook points: after both `saveSession` calls in the `worktree` tool ("resolved" and "created" branches, shared `activateWorktree` helper) and in the `exit` branch; failure → toast, never fail the tool.
- **No workdir/path injection, no `HOST:` escape** — the worktree branch in `tool.execute.before` is removed, but a **no-op early return for worktree sessions must remain** (`if (session.type === "worktree") return`), otherwise they fall through into devcontainer exec wrapping (devcontainer wrapping untouched).

Not in scope (future feature): `/worktree exit` bringing the checked-out branch back to the main repo (requires `git worktree remove` + switch; complications with uncommitted changes).

## Verification plan (live, in this environment)

1. `npm test` green (existing tests unaffected; add unit tests for `sessionMove.js` with a stubbed client).
2. PTY test: launch in main repo → `/worktree rss-export` → confirm `pwd` in a fresh turn is the worktree; `/diff` shows worktree changes.
3. Restart opencode → session still visible in the **original directory's session list**; `/diff` still shows the worktree.
4. `/worktree exit` → `/diff` shows the main repo again.
5. Spot-check DB row: `directory` = worktree, `project_id` = main repo's id.
6. `/workspaces` listing and devcontainer mode untouched (no `HOST:` escape anywhere).

## Deliverables

1. `sessionMove.js` + `index.js` hook points; remove `HOST:`/workdir injection (helpers.js, `tool.execute.before`).
2. Unit tests; `npm test` green.
3. Live verification (above) + DB spot-check.
4. Docs: README (session follows the worktree; `/worktree exit` restores), `plugin/command/worktree.md` (same-turn relative-path caveat), CONTRIBUTING structure.
5. Conventional commits; PR upstream.
