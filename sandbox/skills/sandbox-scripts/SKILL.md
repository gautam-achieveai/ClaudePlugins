---
name: sandbox-scripts
description: >-
  Use when a sandbox workspace task needs repeatable setup, discovery,
  scaffolding, or verification commands. Guides when to create scripts, how to
  run them, and what not to automate.
argument-hint: <task or command intent>
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

# Sandbox Scripts

Use scripts for repeatable mechanical work. Keep source edits deliberate.

## Directory

1. Search for an existing script directory.
2. If `Scripts/` exists, use it.
3. Else if `scripts/` exists, use it.
4. If neither exists, create `scripts/`.
5. Never create both.

If both `scripts/` and `Scripts/` exist as distinct directories, use the one that already contains the majority of project scripts.

## Good Script Uses

- Task memory scaffolding.
- Build/test/check wrappers that encode project commands.
- Discovery helpers that summarize deterministic workspace state.
- Environment validation.
- Data conversion or generation where inputs and outputs are explicit.

## Bad Script Uses

- Hidden source rewrites.
- Auto-fixing build errors or warnings without review.
- Destructive cleanup unless explicitly requested.
- Anything that stores or prints secrets.

## Procedure

1. Search for existing scripts and project commands.
2. Read before editing existing scripts.
3. Keep scripts parameterized and deterministic.
4. Run the script after creation or modification with a safe argument.
   If the script exits with a non-zero status, report the full output to the user and stop. Do not attempt automatic fixes unless the user explicitly requests it.
5. Record the command and result in `Memory/tasks/<task>.md` when the task has
   task memory.

## PowerShell Task Helper

If PowerShell exists, the sandbox plugin includes a task-memory helper at
`../../scripts/workspace-task-start.ps1` relative to this skill directory.
If you cannot run from the skill directory, compute the absolute path first:

```bash
SKILL_DIR=$(dirname "$(realpath "$0")") && pwsh "$SKILL_DIR/../../scripts/workspace-task-start.ps1" -TaskName "$ARGUMENTS"
```

If `pwsh` is unavailable and the task does not require repeated scaffolding,
skip the PowerShell helper and proceed directly to step 1 of the Procedure
using available shell tools.

If `pwsh` is unavailable and the task needs repeated task-memory scaffolding,
create a workspace-local helper in the workspace's `scripts/` directory.
