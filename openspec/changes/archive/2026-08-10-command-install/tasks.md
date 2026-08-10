## 1. Command Parser

- [x] 1.1 Add `parseCommandFile(content)` to `plugin/helpers.js` — extract `description` from YAML frontmatter and body as `template`; return null when frontmatter is missing or `description` is absent
- [x] 1.2 Verify the parser against all three `plugin/command/*.md` files (frontmatter carries only `description`)

## 2. Config Hook

- [x] 2.1 Delete `installCommands` from `plugin/index.js` and its `runWithTimeout` init call; remove now-unused `mkdirSync`/`copyFileSync` imports
- [x] 2.2 Add a `config` hook to the plugin export that registers `devcontainer`, `worktree`, `workspaces` from `plugin/command/*.md` (read with `readFileSync`, parsed with `parseCommandFile`, skipped when null)

## 3. Tests

- [x] 3.1 Add `test/unit/commands.test.js`: parser behavior (description/template extraction, null on missing description) and config-hook wiring (all three commands registered with correct names, descriptions, and templates)
- [x] 3.2 `npm test` green (223 passing)

## 4. Documentation

- [x] 4.1 README: note that commands are registered through the plugin's `config` hook and available immediately after the plugin loads

## 5. Verification

- [x] 5.1 Live check in an isolated opencode env: all three commands present in the command list in the same session; no command files written to the config directory (commit `05059d9`, squashed as `da1bad8`)
