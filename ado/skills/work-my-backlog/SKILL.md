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

Autonomous sprint processor. Single-pass design — classify all assigned work
items, advance what you can, report, exit. Designed to run in a loop via
`/loop 15m /work-my-backlog`. State persists between passes via a JSON file.

---

## Phase 0 — Load State & Gather Context

### 0.1 — Load Persistent State

State file location: `scratchpad/work-my-backlog/state.json`

If the file exists, read it. This is the memory of all previous passes — what
stage each work item was in, what action was taken, when, and what worktree/
branch/PR is associated with it.

**State schema:**

```json
{
  "last_run": "2026-03-19T10:30:00Z",
  "sprint": "O365 Core\\Iteration 03-09",
  "pass_count": 5,
  "dev_name": "Gautam Bhakar",
  "dev_email": "gautamb@microsoft.com",
  "work_items": {
    "7084551": {
      "title": "Comprehensive Observability...",
      "type": "User Story",
      "stage": 1,
      "last_action": "plan_posted",
      "last_action_time": "2026-03-19T10:30:00Z",
      "worktree_path": null,
      "branch": null,
      "pr_id": null,
      "addressed_thread_ids": [],
      "error_count": 0,
      "notes": "Plan v1 posted, awaiting feedback"
    }
  }
}
```

If the file does not exist, initialize an empty state object. The file will be
written at the end of this pass (Phase 6).

### 0.2 — Identify the User

Run `git config user.email` and `git config user.name` to get the user's
identity. Cache in state for bot comment prefixes (`[<dev name>'s bot]`).

### 0.3 — Get Current Sprint

Call `getCurrentSprint` to get the active sprint iteration path.

### 0.4 — Query Assigned Work Items

Use `getMyWorkItems` or `listWorkItems` with a WIQL query:

```
SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State],
       [System.AssignedTo]
FROM WorkItems
WHERE [System.AssignedTo] = @Me
  AND [System.IterationPath] UNDER '<current sprint path>'
  AND [System.WorkItemType] IN ('Bug', 'Task', 'User Story')
  AND [System.State] NOT IN ('Closed', 'Done', 'Removed', 'Resolved')
ORDER BY [System.ChangedDate] DESC
```

**Fallback for stale sprints**: If the current sprint has ended (past its end
date) or the query returns zero results, fall back to querying by state only:

```
WHERE [System.AssignedTo] = @Me
  AND [System.WorkItemType] IN ('Bug', 'Task', 'User Story')
  AND [System.State] IN ('New', 'Active')
ORDER BY [System.ChangedDate] DESC
```

If still no work items, report "No open work items assigned to you" and STOP.

### 0.5 — Verify Worktree Inventory

If state has any work items with `worktree_path` set, verify those worktrees
still exist on disk:

```bash
git worktree list
```

For each worktree in state:
- If the directory still exists on disk → keep it
- If the directory is gone (manually deleted) → clear `worktree_path` and
  `branch` from state. If the work item is still active, a new worktree will
  be created when needed.

Also clean up completed items: if a work item in state has a linked PR that is
now merged/completed, remove its worktree (`git worktree remove <path>`) and
remove the item from `state.work_items`.

---

## Phase 1 — Classify & Order Work Items

### 1.1 — Classify Each Work Item

For each work item, fetch full details with `getWorkItemById` and
`getWorkItemComments` to inspect comments and linked PRs. **Fetch all work
items in parallel** — make concurrent `getWorkItemById` + `getWorkItemComments`
calls for every item simultaneously to minimize classification time.

**Classification logic** (check in this order):

1. **Check for linked active PRs** — Look at the work item's relations/links
   for pull request links. For each linked PR, call `getPullRequest` to check
   if it's active (not merged, completed, or abandoned).

   - **Has active PR** → **Stage 3** (PR published, needs babysitting)

2. **Check for BOT-PLAN marker** — Scan all comments for `<!-- BOT-PLAN v`.

   - **Has plan comment** → **Stage 2** (plan exists — work-on will auto-detect
     whether to revise, await approval, or implement)

3. **Neither** → **Stage 1** (fresh — needs initial planning)

**Cross-check with saved state**: If a work item was Stage 2 last pass but now
has a PR, it advanced to Stage 3. If it was Stage 3 but the PR is now merged,
it's done — remove from tracking. Update the state accordingly.

### 1.2 — Resolve Dependencies

Before processing, check for dependency relationships that affect ordering.

For each work item, inspect its `Relations` field (from `getWorkItemById`):
- **Parent / Child** — children should be processed before parent (parent
  can't be resolved until children are done)
- **Predecessor / Successor** — predecessors first
- **Related** — no strict ordering, but group them so related items run
  in sequence (they likely touch the same code)

Build a simple dependency graph within each stage. If work item A is a
predecessor of B, process A before B within the same stage. If A (Stage 2) is
a parent of B (Stage 1), B should be planned first since A depends on it.

For **cross-stage dependencies**, note them but don't reorder across stages.
Stage 3 always processes first (closest to done). Within a stage, respect the
dependency order.

If circular dependencies are detected, log a warning and fall back to
`ChangedDate DESC` ordering.

### 1.3 — Present the Classification

Log the classification summary:

```
Sprint: <sprint name> | Pass #<N> | Last run: <time>

Stage 3 — PR Published (babysit):
  #1234  Fix login timeout bug         PR !567  [worktree: .worktrees/wi-1234]
  #1235  Add retry logic               PR !568  [worktree: .worktrees/wi-1235]

Stage 2 — Plan In Progress (work-on):
  #1240  Refactor auth middleware       Plan v2, feedback pending
    └─ depends on: #1241 (Stage 1, not yet planned)

Stage 1 — Fresh (plan needed):
  #1250  Implement user preferences
  #1251  Add export to CSV
  #1252  Dashboard loading optimization
```

**Auto mode (default)**: Proceed immediately without waiting for confirmation.
Only pause if the user explicitly asked to be consulted.

---

## Phase 2 — Process Stage 3 (PR Babysitting)

Process Stage 3 items first — they're closest to completion.

### Concurrency: All items in parallel

For each Stage 3 work item, check whether babysitting is actually needed before
spawning an agent. A quick-check with `getPullRequest` can reveal:
- All builds green + all threads resolved + reviewer approved → **no-op**, skip
- PR merged/completed/abandoned → **no-op**, mark as done in state, skip
- Otherwise → needs babysitting

For items that need work, spawn the `ado:babysit-pr-worker` **agent** directly
(not the full `babysit-pr` skill) for a **single pass**. Each PR operates in
its own worktree, so run **all babysit agents in parallel** using background
agents — no cap needed since worktree isolation prevents conflicts.

This is critical: the full `babysit-pr` skill runs a continuous polling loop
that would block the backlog processor. Since `work-my-backlog` is itself run
in a loop, each invocation does one pass per PR and exits. The next loop
iteration picks up anything still pending.

When spawning each `babysit-pr-worker` agent, provide:
- PR number and source/target branches
- Build/test commands (detect from repo root: `.sln` → dotnet, `package.json`
  → npm, etc.)
- Previously addressed thread IDs (from `state.work_items[id].addressed_thread_ids`)
- ADO context (project name, area path from the work item)
- **Worktree path**: The agent must work in the work item's dedicated worktree
  (see Phase 5 — Worktree Management). Pass the worktree path so the agent
  operates in isolation.

After all Stage 3 agents complete:
- Update `addressed_thread_ids` in state with newly resolved threads
- Record `last_action` and `last_action_time`
- Report which PRs had issues fixed, which were no-ops

---

## Phase 3 — Process Stage 2 (Plan Revision / Implementation)

Process Stage 2 items next — they have momentum.

### Concurrency: Parallel by dependency group

Stage 2 work items go through `ado:work-on`. Since each work item operates in
its own dedicated worktree (Phase 5), items that are **independent of each
other** can safely run in parallel. Only items with direct dependency
relationships (parent/child, predecessor/successor, or touching the same code
area) must be sequenced.

### 3.1 — Build Execution Groups

Using the dependency graph from Phase 1.2, partition Stage 2 items into
**execution groups** — sets of items that can run concurrently:

1. **Identify independent items** — Items with NO dependency edges between
   them (no parent/child, no predecessor/successor, not related) go into the
   same execution group.
2. **Sequence dependent chains** — If A must precede B, put A in an earlier
   group. B goes in the next group (it runs after A's group completes).
3. **Separate revision vs implementation** — Items in **revision mode** (plan
   has unaddressed feedback) are lightweight (just posting a comment). These
   can ALL run in a single parallel batch regardless of dependencies since
   they don't touch code.

**Example grouping:**
```
Revision batch (parallel — no code changes):
  #1240 — has feedback, needs plan revision
  #1243 — has feedback, needs plan revision

Implementation group 1 (parallel — independent):
  #1241 — approved, no deps
  #1245 — approved, no deps to group-1 items

Implementation group 2 (parallel — depends on group 1):
  #1242 — predecessor #1241 finished in group 1
```

### 3.2 — Process Revision Batch

For items in revision mode (plan has unaddressed feedback), spawn all as
**parallel background agents** — each invokes `ado:work-on <id>` to revise
the plan and repost. No worktrees needed. Run ALL revision items concurrently
since they only post comments to ADO (no code changes, no conflicts).

### 3.3 — Process Implementation Groups

For each execution group (in dependency order):

Spawn **parallel background agents** for all items in the group. For each:

1. **Ensure worktree exists** (see Phase 5) — each item gets its own isolated
   worktree so parallel agents never conflict.
2. **Spawn a background agent** that:
   - Changes to the work item's dedicated worktree directory
   - Invokes `ado:work-on <work-item-id>` via the Skill tool
   - `work-on` auto-detects the right action:
     - Plan approved → implements, verifies, publishes PR
     - Plan at v3 cap → implements regardless
3. Wait for **all agents in this group** to complete before starting the next
   group (dependencies require it).

### 3.4 — Update State After All Groups

After all groups complete:
- **Update state** for each item: record what happened (plan revised, PR
  published, etc.), update stage if it advanced (Stage 2 → Stage 3 after PR
  publish), record branch name and PR ID if created.
- If `work-on` needed user clarification (posted questions to the work item),
  note this in state (`last_action: "questions_posted"`) — the next loop pass
  will pick it up.

---

## Phase 4 — Process Stage 1 (Fresh Work Items — Planning)

Process Stage 1 items last — planning is the bottleneck since it requires
human review before implementation.

### Concurrency: All items in parallel

Planning is read-only — no branches, no code changes, just codebase analysis
and posting a plan comment. This means **all Stage 1 items can be planned in
parallel** without risk of conflicts, and dependency ordering does not matter
here (it only matters at Stage 2 when code is being written).

Spawn **one background agent per Stage 1 work item** — all concurrently. Each
agent invokes `ado:work-on <work-item-id>` and will:
1. Analyze the work item
2. Research the codebase
3. Create an implementation plan
4. Post the plan as a comment on the work item
5. STOP (waiting for human review)

No worktrees needed — planning agents only read the codebase and post comments.
No cap on parallel agents since there are no shared-state conflicts.

After all agents complete, update state for each item:
- `stage: 2` (now has a plan)
- `last_action: "plan_posted"`
- `last_action_time: <now>`

---

## Phase 5 — Worktree Management

Each work item that enters implementation (Stage 2 with approved plan, or
Stage 3) gets its own dedicated git worktree. This ensures multiple work items
can be worked on without branch conflicts.

### Creating a Worktree

When a work item first needs a worktree (transitioning from planning to
implementation):

1. **Check if one already exists** — Look in `state.work_items[id].worktree_path`.
   If it has a path and the directory exists, reuse it.

2. **Create a new worktree** — Follow `development/reference/git-worktrees-guide.md`:
   - Directory: `.worktrees/wi-<id>/` (e.g., `.worktrees/wi-7084551/`)
   - Branch: `work-item/<id>-<slugified-title>` (same convention as `work-on`)
   - Save the path to `state.work_items[id].worktree_path`
   - Save the branch to `state.work_items[id].branch`

3. **Pass to agents** — When spawning `work-on` or `babysit-pr-worker`, provide
   the worktree path. The agent must `cd` to the worktree before doing any work.

### Cleaning Up Worktrees

When a work item is fully done (PR merged, state = Closed/Resolved):
- Remove the worktree: `git worktree remove <path>`
- Clear `worktree_path` and `branch` from state
- Remove the work item from `state.work_items`

### Worktree Inventory

Handled in Phase 0.5 at the start of each pass — see that section for details.

---

## Phase 6 — Save State & Summary

### 6.1 — Save State

Write the updated state to `scratchpad/work-my-backlog/state.json`. This is
the most important step — it's the memory that makes the loop work.

Update:
- `last_run` timestamp
- `pass_count` increment
- Each work item's `stage`, `last_action`, `last_action_time`, worktree/branch/
  PR info, addressed thread IDs, and notes

Remove work items that are fully done (PR merged, work item Closed/Resolved).

### 6.2 — Present Summary

```
Backlog Processing Complete — Pass #<N>
========================================

Stage 3 (PR Babysitting):
  #1234 — Fixed 2 review comments, builds green
  #1235 — No-op, already approved and green

Stage 2 (Implementation):
  #1240 — Plan revised to v3 based on feedback, reposted

Stage 1 (Planning):
  #1250 — Implementation plan posted, awaiting review
  #1251 — Implementation plan posted, awaiting review
  #1252 — Had questions, posted to work item for clarification

Dependency notes:
  #1240 depends on #1241 — #1241 still in Stage 1, blocking implementation

Next loop iteration will pick up feedback and advance items further.
```

---

## Error Handling

- **ADO MCP not configured** — If the first MCP call fails, invoke
  `ado:setup-ado-mcp` to auto-configure, then retry.
- **Work item fetch fails** — Skip that item, increment `error_count` in state,
  report the error, continue with others.
- **work-on or babysit-pr fails** — Report the failure, increment `error_count`,
  continue with remaining items. After 3 consecutive errors for the same item
  across passes, flag it as stuck and skip it on future passes until the user
  intervenes.
- **Worktree creation fails** — Inform user (environment issue). Skip that work
  item's implementation but continue with others.
- **State file corrupted** — If JSON parse fails, back up the corrupted file
  as `state.json.bak`, initialize fresh state, and continue. Log a warning.

---

## When NOT to Use This Skill

- To work on a single specific work item → use `ado:work-on <id>` directly
- To babysit a single PR → use `ado:babysit-pr <pr-id>` directly
- To create new work items → use `ado:draft-work-item`
- To query work items without processing → use `ado:work-items`
