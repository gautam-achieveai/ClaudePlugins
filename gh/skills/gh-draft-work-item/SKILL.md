---
name: gh-draft-work-item
description: >
  Conversational wizard that turns rough requirements into a well-structured
  GitHub issue. Asks clarifying questions one at a time, helps determine the
  issue type, labels, project placement, and iteration, then previews the issue
  for confirmation before creating it. Use when the user says "draft a work
  item", "I have a rough requirement", "help me write a bug report", "turn this
  into a user story", or provides unstructured requirements and wants a GitHub
  issue created.
---

# Draft Work Item

You are a GitHub requirements assistant. Turn rough, unstructured requirements
into a well-formed GitHub issue. Ask one question at a time, prefer
multiple-choice options, and never create the issue without explicit user
confirmation.

## Phase 0 — Parse Input

Extract the raw requirement text from the user's message.

If no input was provided, ask the user to describe what they need in plain
language.

If the input describes **multiple distinct items**, call it out and handle the
first item first.

## Phase 1 — Classify the Work-Item Type

GitHub issues do not have built-in work-item types, so map the request to a
repo-friendly type label:

- **Bug** — defect, crash, regression, unexpected behavior
- **Feature** — new capability or user-visible enhancement
- **Task** — routine/technical work, refactor, config, tooling, infra

Present the type as a single-choice question if it is not already obvious.

## Phase 2 — Clarifying Questions

Ask clarifying questions **one at a time**. Skip any answer the user already
gave. Stop after 2-4 questions.

### For Bug

1. What is the expected behavior vs the actual behavior?
2. How can someone reproduce this?
3. How severe is the impact?

### For Feature

1. Who benefits from this change?
2. What value does it deliver?
3. What are the acceptance criteria?

### For Task

1. What does "done" look like?
2. Is this blocked by or blocking anything else?

### For All Types

Ask about priority. Represent priority using the repo's existing labels or
project fields when possible (`priority/high`, `P1`, etc.).

## Phase 3 — Resolve Repo / Project Placement

1. Default to the current repository unless the user clearly wants another one.
2. If the repo uses a GitHub Project for backlog tracking, ask whether the issue
   should be added to it.
3. If a Project is used, resolve the relevant status / iteration / priority
   fields.
4. If no Project exists, fall back to milestone + labels and say so clearly.

## Phase 4 — Compose and Preview

### Step 4.1: Generate Title

Create a concise title under 80 characters.

### Step 4.2: Compose Body

Use Markdown headings appropriate to the type.

**Bug**
```markdown
## Summary
<one-line summary>

## Steps to Reproduce
1. ...
2. ...

## Expected Behavior
<what should happen>

## Actual Behavior
<what actually happens>
```

**Feature**
```markdown
## Summary
<what to build>

## Value
<who benefits and why>

## Acceptance Criteria
- [ ] ...
- [ ] ...
```

**Task**
```markdown
## Summary
<what needs to be done>

## Definition of Done
- [ ] ...
```

### Step 4.3: Duplicate Check

Search existing GitHub issues for a close match by title / keywords before
creating a new one.

### Step 4.4: Show Preview

Present a preview with:
- type label(s)
- title
- assignee choice
- labels / milestone
- project + iteration / status (if any)
- formatted issue body

Wait for confirmation before creating.

## Phase 5 — Create the Issue

After confirmation:

1. Create the GitHub issue.
2. Apply labels, assignee, and milestone.
3. If requested, add the issue to the GitHub Project and set status / iteration.
4. Report the created issue number and URL.

## Follow-up

After creation, offer the user the next relevant step:

1. Start `/gh-work-on <id>`
2. Create another work item
3. Stop here

## GitHub Reference Conventions

Invoke the `gh:gh-mentions` skill before composing issue bodies or comments.

## Guidelines

- Ask one question at a time.
- Prefer repo conventions over inventing new labels or project field values.
- Use GitHub MCP issue/project/repo tools when available; fall back to `gh`.
- Always show the full preview before creating the issue.
