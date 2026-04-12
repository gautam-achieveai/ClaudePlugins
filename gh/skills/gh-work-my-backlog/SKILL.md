---
name: gh-work-my-backlog
description: >
  Autonomous backlog processor that works through assigned GitHub work items
  (GitHub Issues + Projects), advancing each through its lifecycle. Classifies
  every Bug, Task, and Feature into stages — fresh (needs plan), in-progress
  (needs revision/approval/implementation), or PR-published (needs babysitting)
  — then delegates to gh:gh-work-on or gh:gh-babysit-pr accordingly. Tracks
  persistent state across loop iterations so it remembers what it did last pass.
  Use when the user says "work my backlog", "process my work items", "work
  through my sprint", "handle my assigned items", or wants to autonomously
  progress all assigned work items through planning, implementation, and PR
  stages.
---

# Work My Backlog

Autonomous backlog processor. Single-pass design — scan, classify, advance
eligible items, report, exit. Designed to run in a loop via:

```text
/loop 15m /gh-work-my-backlog
```

All querying, classification, and context-gathering is handled by
`scripts/scan.mjs`. The LLM handles only the actions that require reasoning.

## Phase 0 — Run the Scanner

### 0.1 — Run the Scan

The scanner is zero-dependency (Node.js + `gh`). Run:

```bash
node <skill-dir>/scripts/scan.mjs --repo-root <repo-root>
```

Auth:
- prefers existing `gh` auth
- can also use `GITHUB_TOKEN` / `GITHUB_PERSONAL_ACCESS_TOKEN`

Scope:
- scope processing to assigned issues in the current GitHub Project iteration
  when assigned items expose current-iteration metadata
- otherwise fall back to assigned open issues in the repository

The scanner outputs a `ScanResult` JSON to **stdout** and logs to **stderr**.

The scanner handles:
- resolving repo and developer identity
- fetching assigned issues plus project metadata
- fetching issue comments and linked open PRs
- classifying each item into stages using BOT-PLAN markers
- treating comment authors with GitHub actor metadata as the source of truth for
  bot vs human feedback when available
- for PR-stage items, fetching review / checks / mergeability context, including
  unresolved review threads, review-summary bodies, and top-level PR comments
- latest-activity rescan decisions based on issue updates plus linked open PR
  updates, so Stage 3 items are revisited when PR reviews / checks / draft /
  conflict state changes even if the issue timestamp does not
- saving per-work-item state to `.ai/work-my-backlog/`
- verifying recorded worktree hints and clearing stale `worktreePath` /
  `branch` values when the referenced worktree no longer exists

### 0.2 — Parse the ScanResult

The JSON has this shape:

```json
{
  "timestamp": "...",
  "iteration": "...",
  "passCount": 5,
  "devName": "...",
  "actionable": [ ... ],
  "skipped": [ ... ],
  "errors": [ ... ],
  "summary": "..."
}
```

Print the `summary` field.

## Phase 1 — Process Actionable Items

For each item in `actionable`, the `action` field tells you what to do.

### `action: "plan"` — fresh item, needs planning

Spawn a background agent that invokes `gh:gh-work-on <workItemId>`.

The packet includes the issue's title, description, labels, milestone, project
fields, and linked items — but `gh:gh-work-on` will fetch its own context anyway.
The key value is knowing THIS item needs a plan.

**Concurrency**: All Stage 1 items can run in parallel (planning is read-only).

### `action: "revise_plan"` — feedback exists, needs plan revision

Spawn a background agent that invokes `gh:gh-work-on <workItemId>` and pass the
captured feedback so it can revise the posted plan.

The packet includes:
- `planVersion`: current plan version (for example, 2)
- `planText`: the full plan text
- `feedback[]`: the exact human feedback captured after the plan

Pass the feedback array to the agent so it has context without needing to
re-fetch comments. `gh:gh-work-on` auto-detects revision mode.

**Concurrency**: All Stage 2b items can run in parallel (comment-only work).

### `action: "implement"` — approved or revision-cap plan

Verify the approval source is:
- `"human"` (explicit approval), or
- `"revision_cap"` (plan v3+)

For each item:
1. **Ensure worktree exists** — create at `.worktrees/wi-<id>/` with branch
   `work-item/<id>-<slugified-title>` if not already present.
2. **Spawn a background agent** in the worktree that invokes
   `gh:gh-work-on <workItemId>`.

The packet includes the approved plan text and any approver feedback.

**Concurrency**: Independent items can run in parallel (isolated worktrees).
Items with dependency relationships (from the scanner state and work-item links)
should be sequenced.

### `action: "babysit_pr"` — linked PR exists

Spawn the `gh:gh-babysit-pr-worker` agent for a **single pass** using the
pre-fetched PR / review / checks context, including:
- `prId`, `sourceBranch`, `targetBranch`
- `mergeStatus`, draft state, review decision, reviewer votes
- `builds[]`
- `unresolvedThreads[]`
- `reviewSummaries[]`
- `conversationComments[]`
- `addressedThreadIds[]`

Provide all pre-fetched context so the worker does not need to re-query GitHub.

**Concurrency**: All Stage 3 items can run in parallel (each in its own worktree).

## Phase 2 — Processing Order

Process items in this order (closest to done first):

1. **Stage 3** (`babysit_pr`) — all in parallel
2. **Stage 2c/2d** (`implement`) — parallel by execution group
3. **Stage 2b** (`revise_plan`) — all in parallel
4. **Stage 1** (`plan`) — all in parallel

Wait for each stage group to complete before starting the next only if there
are dependency relationships between items across groups.

## Phase 3 — Report

Print a summary of what was done:

```text
Backlog Processing Complete — Pass #<passCount>
================================================

Stage 3 (PR Babysitting):
  #123  PR #45 updated, review threads addressed

Stage 2c/2d (Implementation):
  #124  implementation in progress / PR updated

Stage 2b (Plan Revision):
  #125  plan revised and reposted

Stage 1 (Planning):
  #126  implementation plan posted

Skipped:
  #127  Plan awaiting review

Errors:
  #128  API timeout (will retry next pass)
```

## Error Handling

- **Scanner fails** → verify Node.js and `gh auth status`, then retry
- **GitHub auth unavailable** → invoke `gh:setup-gh-mcp` or ask the user to authenticate `gh` if MCP is not available
- **Individual work-item errors** → log and continue
- **Agent failures** → report and continue with the remaining items

## State

All scanner state lives under `.ai/work-my-backlog/`:

| File | Purpose |
|------|---------|
| `scan-state.json` | Global pass count, last run, developer identity, and scope label (`iteration`) |
| `last-scan.json` | Latest `ScanResult` payload |
| `wi-<id>.json` | Per-work-item lifecycle state (`stage`, `subState`, plan metadata, `prId`, `addressedThreadIds`, optional `worktreePath` / `branch`, `errorCount`) |
| `activity.jsonl` | Append-only activity log |

There is no aggregate `state.json` and no `pr-<id>.json`. When an issue is no
longer assigned/open its `wi-<id>.json` file is removed on the next scan.

## When NOT to Use This Skill

- To work on a single specific work item → use `/gh-work-on <id>`
- To babysit a single PR → use `/gh-babysit-pr <pr-id>`
- To create a new work item → use `/gh-draft-work-item`
- To query work items without processing → use `/gh-work-items`
