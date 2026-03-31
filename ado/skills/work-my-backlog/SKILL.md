---
name: work-my-backlog
description: >
  Autonomous backlog processor that works through all assigned Azure DevOps work
  items in the current sprint, advancing each through its lifecycle. Classifies
  every Bug, Task, and User Story into stages — fresh (needs plan), in-progress
  (needs revision/approval/implementation), or PR-published (needs babysitting) —
  then delegates to ado:work-on or ado:babysit-pr accordingly. Tracks persistent
  state across loop iterations so it remembers what it did last pass.
  Use when the user says "work my backlog", "process my work items",
  "work through my sprint", "handle my assigned items", "advance my work items",
  "work on everything assigned to me", or wants to autonomously progress all
  their current sprint work items through planning, implementation, and PR stages.
---

# Work My Backlog

Autonomous sprint processor. Single-pass design — scan, classify, advance
eligible items, report, exit. Designed to run in a loop via
`/loop 15m /work-my-backlog`.

All querying, classification, and context-gathering is handled by the
`scripts/scan.mjs` scanner. The LLM only handles the actions that
require reasoning (planning, implementing, reviewing).

---

## Phase 0 — Run the Scanner

### 0.1 — Run the Scan

The scanner is zero-dependency (uses Node.js built-in `fetch()`). Just run:

```bash
node <skill-dir>/scripts/scan.mjs --repo-root <repo-root>
```

Auth: requires `AZURE_DEVOPS_PAT` environment variable (or
`AZURE_DEVOPS_BEARER_TOKEN`). Org/project auto-detected from git remote, or
set via `AZURE_DEVOPS_ORG_URL` and `AZURE_DEVOPS_PROJECT` env vars.

The scanner outputs a `ScanResult` JSON to **stdout** (logs go to stderr).
Capture the JSON output and parse it.

The scanner handles ALL of:
- Connecting to Azure DevOps (PAT auth via REST API)
- Getting the current sprint
- Querying assigned work items via WIQL
- Fetching work item details, comments, and linked PRs
- Classifying each into stages (1, 2a-2d, 3) using BOT-PLAN markers
- For Stage 3 (PR) items: fetching unresolved threads, build status, failure logs
- Timestamp-based skip optimization (no re-fetch if nothing changed)
- Saving per-work-item state to `.ai/work-my-backlog/`

### 0.2 — Parse the ScanResult

The JSON has this structure:

```json
{
  "timestamp": "...",
  "sprint": "...",
  "passCount": 5,
  "devName": "...",
  "actionable": [ ... ],
  "skipped": [ ... ],
  "errors": [ ... ],
  "summary": "..."
}
```

Print the `summary` field — it's a pre-formatted text overview of the scan.

---

## Phase 1 — Process Actionable Items

For each item in the `actionable` array, the `action` field tells you what to do:

### `action: "plan"` — Stage 1 (Fresh, needs planning)

Spawn a **background agent** that invokes `ado:work-on <workItemId>`.

The packet includes the work item's title, description, acceptance criteria,
area path, and linked items — but `work-on` will fetch its own context anyway.
The key value is knowing THIS item needs a plan.

**Concurrency**: All Stage 1 items can run in parallel (planning is read-only).

### `action: "revise_plan"` — Stage 2b (Feedback, needs revision)

Spawn a **background agent** that invokes `ado:work-on <workItemId>`.

The packet includes:
- `planVersion`: Current plan version (e.g., 2)
- `planText`: The full plan text
- `feedback[]`: Array of `{ author, date, text }` — the exact human feedback

Pass the feedback array to the agent so it has context without needing to
re-fetch comments. `work-on` auto-detects revision mode.

**Concurrency**: All Stage 2b items can run in parallel (only posting comments).

### `action: "implement"` — Stage 2c/2d (Approved or revision cap)

**GATE CHECK**: Verify `approvalSource` is either `"human"` (explicit approval)
or `"revision_cap"` (plan v3+). This is the safety gate — never implement
without one of these conditions.

For each item:
1. **Ensure worktree exists** — Create at `.worktrees/wi-<id>/` with branch
   `work-item/<id>-<slugified-title>` if not already present.
2. **Spawn a background agent** in the worktree that invokes
   `ado:work-on <workItemId>`.

The packet includes the approved plan text and any approver feedback.

**Concurrency**: Independent items can run in parallel (isolated worktrees).
Items with dependency relationships (from the scanner's state files) should
be sequenced.

### `action: "babysit_pr"` — Stage 3 (PR published)

The packet includes everything pre-fetched:
- `prId`, `sourceBranch`, `targetBranch`
- `mergeStatus`: `{ hasConflicts, status }`
- `reviewerVotes[]`: `{ name, vote }`
- `builds[]`: `{ buildId, result, definitionName, failureSummary }`
- `unresolvedThreads[]`: `{ threadId, status, filePath, lineNumber, comments[] }`
- `addressedThreadIds[]`: Thread IDs already addressed in previous passes

Spawn the `ado:babysit-pr-worker` **agent** (NOT the full babysit-pr skill)
for a **single pass**. Provide all the pre-fetched context so the agent
doesn't need to re-query ADO.

**Concurrency**: All Stage 3 items can run in parallel (each in its own worktree).

---

## Phase 2 — Processing Order

Process items in this order (closest to done first):

1. **Stage 3** (babysit PRs) — all in parallel
2. **Stage 2c/2d** (implement approved plans) — parallel by execution group
3. **Stage 2b** (revise plans) — all in parallel
4. **Stage 1** (create plans) — all in parallel

Wait for each stage group to complete before starting the next only if there
are dependency relationships between items across groups.

---

## Phase 3 — Report

Print a summary of what was done:

```
Backlog Processing Complete — Pass #<passCount>
================================================

Stage 3 (PR Babysitting):
  #1234 — Fixed 2 review comments, builds green
  #1235 — No-op, already healthy

Stage 2c/2d (Implementation):
  #1240 — Implementation complete, PR !570 created

Stage 2b (Plan Revision):
  #1243 — Plan revised to v2, reposted

Stage 1 (Planning):
  #1250 — Implementation plan posted

Skipped:
  #1244 — Plan v1 awaiting review (no human response)
  #1245 — No changes since last scan

Errors:
  #1246 — API timeout (will retry next pass)

Next loop iteration will pick up feedback and advance items further.
```

---

## Error Handling

- **Scanner fails to run** (Node.js not available, script error): Check
  `node --version` is 18+. If persistent, report the error.
- **ADO MCP not configured** (scanner auth fails): Invoke `ado:setup-ado-mcp`
  to auto-configure, then retry the scan.
- **Individual work item errors**: Reported in `errors[]` — log and continue.
  The scanner tracks `errorCount` per item; after 3 consecutive errors it
  auto-skips the item.
- **Agent failures**: If `work-on` or `babysit-pr-worker` fails, log the error
  and continue with remaining items.

---

## State

All state is managed by the scanner at `.ai/work-my-backlog/`:

| File | Purpose |
|------|---------|
| `scan-state.json` | Global: pass count, sprint, dev identity |
| `last-scan.json` | Latest ScanResult (for daemon consumption) |
| `wi-<id>.json` | Per-work-item: stage, sub-state, timestamps, PR link |
| `pr-<id>.json` | Per-PR: last commit, build result |
| `activity.jsonl` | Append-only event log |

The LLM does NOT need to manage state — the scanner handles it.

---

## When NOT to Use This Skill

- To work on a single specific work item → use `ado:work-on <id>` directly
- To babysit a single PR → use `ado:babysit-pr <pr-id>` directly
- To create new work items → use `ado:draft-work-item`
- To query work items without processing → use `ado:work-items`
