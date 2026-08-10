## Context

See proposal.md — Why. The plugin ships command definitions as markdown files in `plugin/command/` (frontmatter `description` + body). OpenCode 1.18.x offers no runtime API to register slash commands (the server `/command` endpoint is read-only and the plugin API only exposes interception hooks), so commands must reach the loaded config. The official plugin `config` hook receives the loaded config object and is the mechanism used by published plugins (e.g., ponytail) to contribute commands.

## Goals / Non-Goals

- Goals: commands registered reliably, in-session, from the existing md files; no filesystem writes; no startup timeout.
- Non-Goals: registering skills via `config.skills.paths`; supporting `agent`/`model`/`subtask` command options; removing previously copied command files from user config directories (first-install assumption); a full YAML parser.

## Decisions

- **Register via the `config` hook instead of file copying.** The previous approach (copy `plugin/command/*.md` into `~/.config/opencode/command/`) relied on `client.path.get()` under a 2-second fire-and-forget timeout: the copy silently failed when slow, commands only appeared after the next restart (config is parsed at startup), and stale copies shadowed newer registrations (file commands win over config commands on merge). The `config` hook mutates the loaded config before the command state initializes, so registration is reliable and same-session. Alternative considered: shipping commands as skills (`config.skills.paths` pointing at a package skills dir) — works, but exposes the commands as skills to every session; rejected as unnecessary surface.
- **Parse md files with a minimal regex instead of a YAML library.** The files are repo-owned with a single `description` field; a ~6-line parser covers it. A dependency or generic frontmatter loop would be overkill. Malformed files return null and are skipped (never assign null into the config, which would corrupt the schema).
- **No legacy cleanup.** Removing previously copied files would require `client.path.get()` (the very network call that made the old mechanism racy) and only matters for upgrade scenarios; the change targets first installs. Stale file copies, if any, are shadowed-by-themselves at startup — acceptable, and documented in the proposal's impact section.

## Risks / Trade-offs

- [Config hook timing is version-coupled] → Verified live on 1.18.x: the hook runs during config load, before the command state initializes; the same mechanism is proven by other npm plugins.
- [Regex parser breaks on unusual frontmatter] → Files are repo-owned and tested; the parser fails safe (returns null → command skipped), never crashes startup.

## Migration Plan

Rollout is the next release: the copy mechanism is removed and the `config` hook added. Rollback: revert the change; previously copied files (if any) still exist and resume being the registration mechanism's source only if old code is restored. No data migration.

## Open Questions

None.
