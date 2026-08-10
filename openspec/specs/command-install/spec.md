# command-install Specification

## Purpose
Defines how the plugin contributes its slash commands (`/devcontainer`, `/worktree`, `/workspaces`) to opencode: registered from packaged markdown files via the official plugin `config` hook, effective in the same session, without writing any files.
## Requirements
### Requirement: Commands registered from packaged command files
The plugin SHALL register its three slash commands — `devcontainer`, `worktree`, and `workspaces` — into the loaded opencode config's `command` map. Each command's description SHALL come from the `description` field of the corresponding `plugin/command/<name>.md` file's frontmatter, and its template SHALL be the file's body.

#### Scenario: All three commands registered
- **WHEN** the plugin loads with a config whose `command` map is empty
- **THEN** the `command` map contains `devcontainer`, `worktree`, and `workspaces`

#### Scenario: Description sourced from frontmatter
- **WHEN** the plugin registers the `worktree` command
- **THEN** its description equals the `description:` frontmatter value in `plugin/command/worktree.md`

#### Scenario: Template sourced from file body
- **WHEN** the plugin registers a command
- **THEN** its template is the body of the corresponding markdown file

### Requirement: Registration is in-memory and same-session
Command registration SHALL take effect in the session in which the plugin loads, without an opencode restart. The plugin SHALL NOT write command files or any other files to the opencode configuration directory.

#### Scenario: Commands available without restart
- **WHEN** opencode starts with the plugin installed and the session begins
- **THEN** the three commands are available in the command list immediately

#### Scenario: No files written to the config directory
- **WHEN** the plugin loads against a fresh config directory
- **THEN** no `command` directory or command files are created in the config directory

### Requirement: Malformed command files are skipped
A command file without a `description` in its frontmatter SHALL NOT be registered, and SHALL NOT prevent the other commands from registering.

#### Scenario: Missing description is skipped
- **WHEN** a command file lacks a `description` frontmatter field
- **THEN** no command is registered for that file and the remaining commands still register

