---
name: sandbox-memory
description: >-
  Use whenever a sandbox task needs durable state, task notes, handoff material,
  or project facts remembered across turns. Maintains Memory/ topic files and
  Memory/tasks/ task files instead of relying on hidden model state.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
user-invocable: true
---

# Sandbox Memory

Memory is a workspace artifact, not hidden model state. Persist important
findings in files so another agent or future turn can recover the task.

## Layout

Use this layout unless the workspace already contains a Memory/ directory with a README.md. If such a directory exists, extend it rather than restructuring it:

```text
Memory/
  README.md
  glossary.md
  workspace-workflow.md
  auth-flow.md
  skills.md
  tasks/
    <task-slug>.md
```

## Lookup Order

1. Read hot context: `AGENTS.md`, `CLAUDE.md`, `.agent/rules.md` when present.
2. Read `Memory/README.md` and `Memory/glossary.md` when present. If a Memory file is present but empty or unparseable, log a note in the active task file under Work Log and recreate it from scratch using the prescribed template rather than aborting the lookup step.
3. Read only topic files whose titles match a domain mentioned in the current task — e.g., read auth-flow.md only when the task involves authentication or egress, skills.md only when the task requires discovering or invoking plugins.
4. Read or create the active task file in `Memory/tasks/`. Name task files using lowercase kebab-case derived from the task goal, e.g., Memory/tasks/add-oauth-provider.md. Reuse an existing slug if a file for the same goal already exists.

## What Goes Where

| Information | File |
| --- | --- |
| Current task plan, context map, decisions, verification | `Memory/tasks/<task>.md` |
| Stable shorthand and decoder terms | `Memory/glossary.md` |
| Workspace operating procedure | `Memory/workspace-workflow.md` |
| Sandbox egress/auth facts | `Memory/auth-flow.md` |
| Skills/plugins discovered or required | `Memory/skills.md` |

## Task File Template

```markdown
# <Task Name>

Created: <YYYY-MM-DD>

## Goal

- 

## Context Map

| File | Purpose | Notes |
| --- | --- | --- |

## Decisions

- 

## Work Log

- 

## Verification

- 

## Handoff

- 

## Task Completion

When a task is fully verified and handed off, append a `Closed: <YYYY-MM-DD>` line at the top of the task file and move it to Memory/tasks/archive/ to prevent stale files from polluting future lookups.
```

## Rules

- Promote a fact to a topic file when it is (a) reusable across more than one task and (b) stable enough that it would not change within the current session — e.g., a discovered API endpoint, an auth mechanism, or a recurring file path pattern.
- Keep task-local details in `Memory/tasks/`.
- Mark assumptions explicitly and replace them with verified facts when known.
- Never store secrets, tokens, raw auth headers, private keys, or full logs that
  may contain credentials.
