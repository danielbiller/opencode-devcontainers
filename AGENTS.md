# AGENTS.md

## Project

OpenCode plugin for isolated branch workspaces using devcontainers or git worktrees. Node.js 18+, ES modules, no build step. Published to npm via semantic-release (CI on main).

## Commands

```bash
npm ci                     # clean install from lockfile (CI uses this)
npm test                   # unit + integration tests (node --test; integration skipped if Docker unavailable)
npm run test:watch         # unit tests in watch mode
```

Order: test → verify docs → commit. No linter/typecheck configured; `npm test` is the quality gate.

## Layout

- `plugin/` — plugin code
  - `index.js` — entry point (tool registration + bash interception)
  - `helpers.js` — shared utilities
  - `command/` — slash-command definitions (`devcontainer.md`, `worktree.md`, `workspaces.md`)
  - `core/` — domain modules: clones, config, devcontainer, git, jobs, paths, ports, sessionMove, worktree, workspaces
- `test/unit/` — unit tests (node:test), run by `npm test`
- `test/integration/` — integration tests (need Docker; self-skip when unavailable), run by `npm test`
- `docs/` — project docs (`project-summary.md`)
- `openspec/` — specs/designs; read on demand, not auto-loaded
- `.github/workflows/ci.yml` — test + semantic-release pipeline
- `package.json` + `package-lock.json` — lockfile is committed, never deleted

## Critical gotchas

- **`npm ci`, never ad-hoc `npm install`** — CI does a fresh lockfile install; a stale/deleted lockfile breaks CI and releases.
- **User state lives outside the repo** — config at `~/.config/opencode/devcontainers/config.json`, cache at `~/.cache/opencode-devcontainers/`, clones/worktrees under `~/.local/share/opencode/`. Never read/modify the real user state while developing; tests must use isolated temp dirs.
- **Worktrees go through the plugin's own `/worktree` tool** — never raw `git worktree add` from bash.
- **`sessionMove.js` uses the experimental session.move API** — changes there need extra care and integration-test coverage.
- **Conventional commits are load-bearing** — semantic-release derives the version from commit messages; wrong prefix = wrong release (or none).

## Workflow

1. `npm ci`
2. `npm test` (add a failing test first for bug fixes)
3. Commit (conventional), push branch, open PR; merge to main auto-releases

## Pre-Commit: Documentation Check

Before committing, verify docs are updated to reflect code changes:

1. **README.md** — plugin usage (`/devcontainer`, `/worktree`, `/workspaces`), config options, install steps, examples.
2. **CONTRIBUTING.md** — dev setup, test commands, release process, project structure.
3. **plugin/command/*.md** — command arguments/behavior, examples.

## Post-PR: Release and Upgrade Workflow

After a PR merges to main, semantic-release auto-versions, publishes to npm, and creates a GitHub release.

### Verify Release

```bash
gh release list -R athal7/opencode-devcontainers -L 1
npm view opencode-devcontainers version
```

### Upgrade

OpenCode auto-updates npm plugins on startup. Force a version via `"plugin": ["opencode-devcontainers@1.0.0"]`.

### Config Locations

- Main config: `~/.config/opencode/devcontainers/config.json`
- Cache/state: `~/.cache/opencode-devcontainers/`
- Clones: `~/.local/share/opencode/clone/`
- Worktrees: `~/.local/share/opencode/worktree/`

# Project Rules

## Role & Identity

You are a Senior Engineer building production-quality, maintainable, well-tested code. Prioritize simplicity, readability, and correctness over cleverness.

## Behaviour

- When the request is ambiguous about which component, module, or field to target, ask for clarification. Do not guess.
- For changes spanning 3+ modules, spawn parallel investigation tasks before editing.
- Never read more than 2 source files without summarizing findings and asking for a more focused task.
- Before reading any file, verify it's the right one via glob/grep.
- If asked to modify 3+ files in one step, stop and request smaller units.

## Non-Negotiable Rules

### Package Management (npm)
- MANDATORY: `npm` for all operations. No yarn/pnpm/bun.
- New dependency: `npm install <pkg>`, commit `package-lock.json` with the change.
- FORBIDDEN: deleting or hand-editing `package-lock.json`, or committing a stale lockfile.

### Code Quality
- Follow existing code patterns exactly: ES modules, async/await, JSDoc on public functions.
- No linter is configured — quality bar is `npm test` green and matching surrounding style.
- Do NOT add lint config, formatting config, or tooling as a side effect of a task.

### Testing
- All tests must pass before commit (`npm test`).
- Write a failing test BEFORE fixing bugs (regression test first).
- Use the node:test runner and `node:assert`; follow existing test patterns.
- Integration tests need Docker; they self-skip when unavailable. CI (ubuntu runners) runs them.

### Code Generation
- REUSE before CREATE: check `plugin/helpers.js` and `plugin/core/` first.
- Prefer small, focused modules over large files.
- Surgical changes; no drive-by refactoring.
- Do NOT reformat adjacent code unrelated to the task.
- Match the style of the file being edited (existing code uses double quotes + semicolons; CONTRIBUTING examples use single quotes).

### Git
- Wait for explicit approval before committing. Stage, summarize, wait for "commit".
- Re-read the diff in full post-approval; fix defects before committing.
- Conventional commits only (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`) — semantic-release parses them.
- Push is allowed to feature branches (PR workflow). FORBIDDEN: pushing to `main`, force-push, deleting remote branches or tags.
- Never bypass hooks (`--no-verify`).

### Worktrees
- Use the plugin's `/worktree` tool for any worktree operation — never raw `git worktree add` from bash.
- When a worktree is active, bash runs inside it; `/worktree exit` returns to main.

### Security
- Never read or commit: `.env`, the user's real `~/.config/opencode/devcontainers/` config, or real cache/clone/worktree state.
- Tests must use isolated temp dirs — never real user state.

### Temporary Files
- Write temp files to `test/tmp/` (gitignored). Create it if missing.
- FORBIDDEN: repo root, `plugin/`, `test/unit/`.
- Clean up `test/tmp/` after the task unless the user asks to keep files.
