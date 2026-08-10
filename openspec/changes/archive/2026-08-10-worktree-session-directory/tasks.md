## 1. Session Move Module

- [x] 1.1 Create `plugin/core/sessionMove.js` with `moveSessionDirectory(client, sessionID, directory)` — posts to `/experimental/control-plane/move-session` via `client._client.post` with `{ moveChanges: false }`, never throw
- [x] 1.2 Export both functions from `plugin/core/index.js`

## 2. /worktree Tool Changes

- [x] 2.1 In the "resolved" branch of the `worktree` tool, fire-and-forget the move to `workspace` after `saveSession` (via existing `runWithTimeout`); toast on error, never fail the tool
- [x] 2.2 Same in the "created" branch after `saveSession`
- [x] 2.3 Replace the `off` branch with `exit`/`quit`/`off` flow: restore the session to `session.mainRepo`, and only after a successful restore `deleteSession`; on restore failure keep the session state, toast, and return a message stating the session was not moved; clear/updated messages for worktree vs devcontainer vs no-session cases
- [x] 2.4 Update status message, tool description, and arg descriptions: `/worktree exit`/`quit` wording, remove all `HOST:` references

## 3. Remove HOST: and Injection

- [x] 3.1 Delete `HOST_COMMANDS` and `shouldRunOnHost` from `plugin/helpers.js`
- [x] 3.2 In `tool.execute.before`: remove the `HOST:` prefix stripping, the `shouldRunOnHost` check, and the worktree `workdir` override; keep a no-op early return for `session.type === "worktree"` so worktree sessions are never wrapped in devcontainer exec
- [x] 3.3 Remove the `HOST:` mention from the `devcontainer` status message in `plugin/index.js`

## 4. Tests

- [x] 4.1 Add `test/unit/sessionMove.test.js`: stubbed client asserting the move post is called with `{ moveChanges: false }`, and no-throw on API error
- [x] 4.2 Remove `HOST_COMMANDS` and `shouldRunOnHost` tests from `test/unit/helpers.test.js` (and their imports)
- [x] 4.3 Add a test asserting worktree sessions in `tool.execute.before` are left unwrapped (no `devcontainer exec` in the command) and no workdir override is set
- [x] 4.4 `npm test` green

## 5. Docs

- [x] 5.1 Update `plugin/command/worktree.md`: `exit`/`quit` usage, session follows the worktree, same-turn absolute-path caveat, no `HOST:`
- [x] 5.2 Update `plugin/command/devcontainer.md` if it references `HOST:`
- [x] 5.3 Update `README.md`: session follows the worktree on `/worktree`, `/worktree exit` restores, `HOST:` removed
- [x] 5.4 Update `CONTRIBUTING.md` project structure to include `sessionMove.js`

## 6. Live Verification

- [x] 6.1 PTY test: launch in main repo, `/worktree <branch>` → fresh-turn `pwd` is the worktree; `/diff` shows worktree changes
- [x] 6.2 Restart opencode → session visible in the original directory's session list; `/diff` still shows the worktree
- [x] 6.3 `/worktree exit` → `/diff` shows the main repo again
- [x] 6.4 DB spot-check: session row `directory` = worktree, `project_id` = main repo's project id
- [x] 6.5 `/workspaces` listing and devcontainer mode untouched

## 7. Bug Found During Verification

- [x] 7.1 `cleanupStaleSessions` used `client.session.list()`, which returns only the current server's sessions (empty at init), so every fresh `opencode run`/TUI start deleted all session state files — `/worktree exit` after a restart reported "No workspace was active". Replaced with an mtime-based prune (30 days); session state now survives process restarts (verified: state file recreated, survived a fresh run, exit restored `directory` to the main repo)
