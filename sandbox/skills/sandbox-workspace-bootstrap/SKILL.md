---
name: sandbox-workspace-bootstrap
description: >-
  Use at the start of any non-trivial sandbox workspace task. Initializes the
  workspace coordination surface: Memory/ topic files, Memory/tasks/ task state,
  scripts/ helper directory, and a task-memory scaffold. Also use when the user
  asks how workspace files, memory, scripts, skills, or plugins should be used
  inside a sandbox.
argument-hint: <short task name>
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - PowerShell
user-invocable: true
shell: bash
---

# Sandbox Workspace Bootstrap

Use the workspace filesystem as the durable coordination surface for the task.
The chat-mode system prompt is intentionally small; this skill carries the
operating procedure.

## What To Create

Create these directories if they do not exist:

- `scripts/` for repeatable helper commands.
- `Memory/` for durable workspace memory.
- `Memory/tasks/` for per-task working notes and handoffs.

If the workspace uses an existing uppercase `Scripts/` directory, follow it. If
it already uses lowercase `scripts/`, keep lowercase and do not create a
duplicate just for casing.

## Procedure

1. Inspect the workspace root with `Glob`/`Bash` and check whether `scripts/`,
   `Scripts/`, and `Memory/` exist.
2. Read any existing hot-context files if present: `AGENTS.md`, `CLAUDE.md`,
   `.agent/rules.md`, and `Memory/README.md`.
3. If no task memory exists for this task, create one under
   `Memory/tasks/<task-slug>.md`.
4. If PowerShell is available, prefer the plugin-bundled helper for
   scaffolding. Its path is relative to this skill directory:
   `../../scripts/workspace-task-start.ps1`.

   ```bash
   pwsh ../../scripts/workspace-task-start.ps1 -TaskName "$ARGUMENTS"
   ```

   If the tool runner executes shell commands from the workspace root instead
   of the skill directory, first resolve the helper path relative to this
   `SKILL.md`. If the helper is unavailable, create a workspace-local helper in
   `scripts/` only when this task will benefit from repeatable scaffolding.
   Otherwise create the markdown file manually with the same sections: Goal,
   Context Map, Decisions, Work Log, Verification, Handoff.
5. Update `Memory/README.md` only if it is missing or clearly stale.

## Rules

- Read before editing. Use `Edit` for modifications whenever possible.
- Use `Write` only for new files or generated whole-file artifacts.
- Do not store secrets, tokens, Authorization headers, or copied credential
  values in `Memory/`.
- Do not overwrite or revert unrelated user changes.
- At completion, update the task memory with changed files, verification, and
  handoff notes.
