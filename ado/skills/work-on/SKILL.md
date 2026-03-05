---
name: work-on
description: >
  End-to-end development workflow driven by an Azure DevOps work item. Reads the
  work item, designs a solution (debugging for bugs, brainstorming for features),
  writes an implementation plan, sets up an isolated worktree, implements the
  changes, verifies everything passes, and publishes a PR linked to the work item.
  Use when the user says "work on <number>", "implement work item <number>",
  "pick up <number>", or provides an ADO work item to implement.
---

# Work On

You are an end-to-end development orchestrator. Given an Azure DevOps work item
number, you guide the entire lifecycle from understanding the problem through
publishing a reviewed PR.

This skill orchestrates existing skills — invoke each via the **Skill** tool
when you reach the corresponding phase.

---

## Phase 0 — Parse Arguments

Extract the work item number from `$ARGUMENTS`. Accept formats:
- Plain number: `12345`
- With hash: `#12345`
- ADO URL containing the ID

If no number is found, ask the user for one and stop until provided.

---

## Phase 1 — Read & Understand the Work Item

### Step 1.1: Fetch the Work Item

Use the ADO MCP tool `getWorkItem` to retrieve the work item by ID. Extract:
- **Type** (Bug, Task, User Story, Product Backlog Item, Requirement)
- **Title**
- **Description** / Repro Steps (for bugs)
- **Acceptance Criteria** (if present)
- **State**
- **Assigned To**
- **Area Path** and **Iteration Path**
- **Links** (parent, related items)

If the work item is not found, inform the user and stop.

### Step 1.2: Check State

- If state is **Done**, **Closed**, or **Removed** — warn the user and ask
  whether to proceed or reopen.
- If state is **Resolved** — warn that it appears already resolved, ask to
  confirm re-work.

### Step 1.3: Confirm Understanding

Present a summary to the user:

> **Work Item #ID: Title**
> - Type: `<type>`
> - State: `<state>`
> - Description: `<summary>`
> - Acceptance Criteria: `<criteria or "none specified">`
>
> **My understanding:** `<your interpretation of what needs to be done>`
>
> Is this correct? Should I proceed?

**Wait for user confirmation before continuing.**

### Step 1.4: Set State to Active

Update the work item state to Active (or equivalent — see
`reference/ado-state-transitions.md`). Add a comment:

`[<dev name>'s bot] Starting implementation.`

Determine `<dev name>` from `git config user.name`.

---

## Phase 2 — Design the Approach

Branch based on work item type:

### For Bugs

Invoke the `superpowers:systematic-debugging` skill. Follow its full workflow
to identify the root cause before moving to Phase 3.

If the bug involves runtime behavior that needs log analysis, also invoke
`debugging:debug-with-logs` to instrument and capture structured logs.

### For Features / Tasks / User Stories

Invoke the `superpowers:brainstorming` skill. Follow its full workflow to
explore the design space, requirements, and approach.

Present the chosen design to the user for approval before continuing.

**User override**: If the user says "skip" or provides their own approach
directly, accept it and move on.

---

## Phase 3 — Create Implementation Plan

Invoke the `superpowers:writing-plans` skill. Use the output from Phase 2
(root cause analysis or approved design) as input.

The plan should cover:
- Files to create/modify
- Test strategy
- Verification steps
- Rollback considerations (if any)

**Wait for user approval of the plan before continuing.**

---

## Phase 4 — Set Up Worktree

Invoke the `superpowers:using-git-worktrees` skill to create an isolated
worktree for this work.

**Branch naming convention**: `work-item/<id>-<slugified-title>`

Example: Work item #4567 "Fix login timeout on slow networks"
→ branch `work-item/4567-fix-login-timeout-on-slow-networks`

Slugify rules: lowercase, replace spaces/special chars with hyphens, max 60
chars for the slug portion, strip trailing hyphens.

---

## Phase 5 — Implement

Ask the user which implementation mode they prefer:

> **Implementation mode:**
> 1. **Subagent-driven** — I'll dispatch parallel agents for independent tasks
>    (faster, less interactive)
> 2. **Step-by-step** — I'll execute the plan one step at a time with review
>    checkpoints (more control)
>
> Which do you prefer? (default: step-by-step)

### Option 1: Subagent-driven

Invoke `superpowers:subagent-driven-development` with the implementation plan
from Phase 3.

### Option 2: Step-by-step

Invoke `superpowers:executing-plans` with the implementation plan from Phase 3.

### Test-Driven Development

For either mode, also invoke `superpowers:test-driven-development` to write
tests before or alongside implementation. Auto-detect the test framework:
- `.csproj` with test references → `dotnet test`
- `package.json` with jest/vitest/mocha → the configured test runner
- `pytest.ini` / `pyproject.toml` / `conftest.py` → `pytest`
- If no test framework is detected, note this and rely on manual verification
  in Phase 6.

### Handling Failures

If tests fail or implementation hits a wall:
1. Invoke `superpowers:systematic-debugging` to diagnose
2. Apply the fix and re-run tests
3. If still failing after 3 debugging attempts, stop and present the situation
   to the user with what you've tried and what you've learned

---

## Phase 6 — Verify

Invoke `superpowers:verification-before-completion`. This must confirm:
- All tests pass
- Build succeeds
- No regressions in existing functionality
- The acceptance criteria from the work item are met

Present verification results to the user:

> **Verification Results:**
> - Build: PASS/FAIL
> - Tests: X passed, Y failed
> - Acceptance criteria: <status for each criterion>
>
> Ready to publish PR?

**Wait for user confirmation before continuing.**

---

## Phase 7 — Finish & Publish

### Step 7.1: Finish the Branch

Invoke `superpowers:finishing-a-development-branch`. Follow its workflow to
prepare the branch for PR.

### Step 7.2: Publish the PR

Load and execute the **publish-pr** skill (`skills/publish-pr/SKILL.md`).
Since the work item already exists (from Phase 1), **skip Phase 1 of
publish-pr** — tell it the work item ID directly. The PR
should:
- Reference the work item with `AB#<id>` in the description
- Link to the work item via `createLink`

### Step 7.3: Update Work Item to Resolved

After the PR is created, update the work item state to Resolved (or equivalent
— see `reference/ado-state-transitions.md`). Add a comment:

`[<dev name>'s bot] Implementation complete. PR #<pr-id> created.`

---

## Error Handling

- **Work item not found** → stop immediately with clear message
- **Work item already Done/Closed** → warn, ask to reopen or abort
- **Brainstorming stalls** → user can skip and provide approach directly
- **Test failures** → `superpowers:systematic-debugging`, escalate after 3 attempts
- **Build failures** → diagnose, fix, retry; escalate after 3 attempts
- **ADO state update fails** → try alternate state names per
  `reference/ado-state-transitions.md`, warn user if all fail

## ADO Reference Conventions

- Prefix all ADO comments with `[<dev name>'s bot]`
- Use `AB#<id>` in PR descriptions to auto-link work items
- Use `#<id>` when referencing work items in comments

## Decision Log

Throughout the workflow, maintain a running decision log in the scratchpad at
`scratchpad/conversation_memories/<work-item-id>-<slug>/decisions.md`. This
log serves as reviewable evidence for PR reviewers and future debugging.

### Step D.0: Initialize the log

At the start of Phase 1 (after extracting the work item ID and title), create
the decision log file using the **Write** tool:

**Path:** `scratchpad/conversation_memories/<id>-<slugified-title>/decisions.md`

**Initial content:**
```markdown
# Decision Log — Work Item #<id>: <title>
Date: <today>
```

### Step D.1: Log at each phase

Use the **Edit** tool to append entries after each key decision point:

| Phase | What to log |
|-------|-------------|
| 1 | Understanding of the work item, ambiguities resolved with user |
| 2 | Root cause (bugs) or chosen design approach (features), alternatives considered with reasons for rejection |
| 3 | Plan trade-offs — why certain files/approaches were chosen over others |
| 5 | Implementation decisions — library choices, pattern selections, edge cases handled, deviations from plan with justification |
| 5 (failures) | Each debugging attempt — what was tried, what was learned, what was ruled out |
| 6 | Verification evidence — what passed, what was manually checked |

**Entry format** (append under the relevant phase heading):
```markdown
## Phase <N> — <Phase Name>
- **<decision>**: <rationale>
```

For Phase 2, also include:
```markdown
- **Alternatives rejected:**
  - <alternative>: <why rejected>
```

### Step D.2: Include in PR description

When creating the PR description (Phase 7), read the decision log file and
include a "Key Decisions" section summarizing the 3-5 most important entries
so reviewers have context without needing to find the log.

---

## Task Decomposition for Complex Work Items

When a work item is large or complex (particularly bugs with multiple root
causes or features with many components), decompose it into child tasks in ADO.

**When to decompose:**
- The implementation plan (Phase 3) has more than 5 distinct steps
- A bug has multiple root causes or requires changes across 3+ areas
- The work item has multiple acceptance criteria that can be verified independently

**How to decompose:**
1. After the plan is approved in Phase 3, create child Task work items under
   the parent work item for each major checkpoint:
   - Use `createWorkItem` with type `Task` for each
   - Link each to the parent using `createLink` (parent-child relationship)
   - Title format: `[#<parent-id>] <checkpoint description>`
2. As each task is completed during Phase 5, update its state to Done/Closed
3. Include task IDs in commit messages: `Completes task #<id>: <description>`

**Example decomposition for a complex bug:**
- `[#4567] Reproduce and confirm root cause in auth module`
- `[#4567] Fix token refresh logic`
- `[#4567] Add regression tests for timeout scenarios`
- `[#4567] Verify fix against all acceptance criteria`

This gives reviewers and stakeholders granular visibility into progress and
creates an audit trail of what was done for each part of the fix.

---

## Guidelines

- **Interactive checkpoints** — always wait for user confirmation at: understanding
  (Phase 1), design approval (Phase 2), plan approval (Phase 3), pre-PR review
  (Phase 6)
- **Autonomous execution** — between checkpoints, work autonomously without
  unnecessary pauses
- Use Azure DevOps MCP tools for all ADO operations, git/bash for local ops
- Invoke skills via the **Skill** tool — do not inline their logic
