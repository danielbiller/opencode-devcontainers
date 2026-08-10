---
description: Target a git worktree - /worktree <branch> or exit
---

Call the `worktree` tool with:
- `target`: $ARGUMENTS
- `workdir`: the current working directory (use the directory you are working in)

If no arguments provided, call `worktree` with no target to show current status.

Targeting a worktree moves the session directory to the worktree, so all tools and commands run there. In the turn that targets the worktree, use absolute paths for worktree files (the move takes effect from the next turn); such reads may trigger a one-time permission prompt.

To return to the main repository, use `exit` (or `quit`): `worktree(target: "exit")`. The worktree stays on disk with its branch checked out.

Example: `worktree(target: "feature-branch", workdir: "/path/to/repo")`
