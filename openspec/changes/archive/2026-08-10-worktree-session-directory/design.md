## Context

See proposal.md - Why. Current state: the plugin redirects only bash via `tool.execute.before` (`output.args.workdir = session.workspace`) and provides a `HOST:` escape (`shouldRunOnHost` in helpers.js). `session.directory` is fixed at launch and no plugin API previously could change it; opencode 1.18.15 adds the experimental session-move capability (`/experimental/control-plane/move-session`, verified live: updates the session row's `directory`, preserves `project_id`; the server re-reads the row per session-scoped request, and the TUI follows via the `session.moved` event). The worktree tool (`plugin/index.js`) already saves per-session state to JSON (`loadSession`/`saveSession`/`deleteSession` in helpers.js).

## Goals / Non-Goals

**Goals:**
- Session directory follows the worktree via `session.move`, so all tools and session-scoped commands target the worktree with zero plugin-side tool overrides.
- `/worktree exit` (aliases `quit`, `off`) restores the session to `mainRepo`.
- Remove `HOST:` and all worktree workdir/path injection.

**Non-Goals:**
- Removing the worktree or moving the checked-out branch back to the main repo on exit (deferred feature).
- Devcontainer mode changes (its wrapping logic stays; the worktree no-op early return in the hook is the only shared code touched).
- Any direct DB access or `.git/opencode` cache writes — the server resolves the project itself.

## Decisions

1. **`session.move` API over SQLite mutation.** The previous design (opencode-dir style: `UPDATE session SET directory, project_id, permission` + `.git/opencode` project-id cache + `external_directory` permission appends) is rejected: it duplicated opencode's project-id algorithm (known mismatch bugs), wrote git files, and drifted with schema/permission formats. The move API is server-owned: per-request middleware resolution (verified in the binary), `project_id` preserved, no permission appends needed (worktree paths are in-scope once the directory is the worktree). Alternative "keep workdir injection" rejected: it never covered `read`/`write`/`edit` defaults, `/diff`, or the session list.
2. **Fire-and-forget move, never fail the tool.** Post the move (`sessionID`, `destination: { directory }`, `moveChanges: false`) to `/experimental/control-plane/move-session` in the existing `runWithTimeout` pattern; on error show a toast (`client.tui.showToast`) and return the normal success message. The session JSON is the plugin's source of truth for the *intent*; the move is best-effort state sync.
3. **`/worktree exit` is non-destructive.** It only moves the session back to `session.mainRepo` (stored in the session JSON — no git reads) and clears the session JSON. The worktree stays on disk; the branch stays in the worktree. Bring-branch-back requires `git worktree remove` + switch and is deferred (dirty-tree handling).
4. **Remove `HOST:` and injection wholesale.** Delete `HOST_COMMANDS`/`shouldRunOnHost` from helpers.js, their hook handling, and the worktree workdir override — replaced by a **no-op early return** (`if (session.type === "worktree") return`) so worktree sessions do not fall through into `buildDevcontainerExecCommand` wrapping.
5. **Transition-turn strategy: absolute paths, no injection.** The turn running `/worktree` snapshots the old location; the agent uses absolute paths that turn. Injecting workdir/path would only serve that one turn and would persist as stale overrides afterward.
6. **Module shape: thin `sessionMove.js`.** `plugin/core/sessionMove.js` (~30 lines) exports a single `moveSessionDirectory(client, sessionID, directory)`: the 1.18.x SDK does not expose `client.session.move` (verified live), so it posts to `/experimental/control-plane/move-session` via `client._client` and never throws. Exported through `core/index.js`; unit-tested with a stubbed client. Same function moves back to `mainRepo` on `/worktree exit`.

## Risks / Trade-offs

- [Same-turn snapshot: tools in the `/worktree` turn still use the old directory] → Accepted & documented; agent uses absolute paths that turn; everything from the next request onward is correct.
- [Experimental API removed/changed in a future opencode] → Isolated in `sessionMove.js`; the never-throw contract degrades to today's behavior (no move) without breaking `/worktree`.
- [Hook fall-through into devcontainer wrapping if worktree branch is removed carelessly] → Explicit no-op early return + unit test asserting worktree sessions are not wrapped.
- [Permission prompt when reading worktree files with absolute paths during the transition turn] → One-time, documented in worktree.md.
- [Move succeeds but TUI state stale (session.moved missed)] → Server re-reads the row per request; `/diff` and session list follow the row regardless of event delivery.

## Migration Plan

No config or data migration. Behavior change ships with the plugin: `/worktree` now also moves the session; `HOST:` stops being special (BREAKING per proposal). Rollback: revert the commit; `session.move` calls simply no longer run and the plugin returns to directory-redirect behavior. No feature flag.

## Open Questions

None — decisions are complete and the spec is unaffected by remaining unknowns (e.g., exact toast text).
