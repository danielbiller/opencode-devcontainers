## Why

Slash commands (`/devcontainer`, `/worktree`, `/workspaces`) were installed by copying `plugin/command/*.md` files into the opencode config directory at plugin init. That mechanism was unreliable: the copy ran under a 2-second fire-and-forget timeout that could silently fail (observed: stale copies on real installs never refreshed), commands only took effect after the next opencode restart, and stale file copies shadowed newer registrations. There is no plugin API for registering commands directly, but the official plugin `config` hook receives the loaded config and can populate its `command` map — the same mechanism used by other published plugins.

## What Changes

- Remove the file-copy install (`installCommands`) and its init-time invocation.
- Add a `config` hook to the plugin export that registers `/devcontainer`, `/worktree`, and `/workspaces` into the loaded config's `command` map.
- Parse the command definitions from the existing `plugin/command/*.md` files (frontmatter `description` + body as `template`), keeping the md files as the single source of truth.
- Malformed command files (no `description` frontmatter) are skipped rather than registered.
- Registration is in-memory and effective in the same session; no files are written to the config directory. No legacy cleanup of previously copied files (first-install assumption).

## Capabilities

### New Capabilities

- `command-install`: how the plugin contributes slash commands to opencode — via the config hook, sourced from `plugin/command/*.md`, available same-session, no filesystem writes.

### Modified Capabilities

None.

## Impact

- `plugin/index.js`: delete `installCommands`, add `config` hook.
- `plugin/helpers.js`: add `parseCommandFile`.
- `test/unit/commands.test.js`: new tests for the parser and hook wiring.
- `README.md`: note the config-hook registration.
- Behavior change for existing users: previously copied command files in the config directory are no longer written or removed; the config-hook registration takes precedence when both exist.
