---
name: review-pending-prs
description: >
  Discover all active pull requests from Azure DevOps, compare against local
  tracking data, and review PRs with updates older than 15 minutes since last
  review. Invokes code-reviewer:pr-review for each PR needing review and
  maintains persistent review history. Use when asked to "review all pending PRs",
  "check for unreviewed PRs", "review pending pull requests", "catch up on PR
  reviews", "batch review PRs", or "review all open PRs".
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, TodoWrite, Skill, mcp__azure-devops__*
---

# Review Pending PRs — Batch Orchestrator

Discover active PRs from Azure DevOps, compare against local tracking state, and review PRs that have updates older than 15 minutes since the last review. Delegates each individual review to the `code-reviewer:pr-review` skill.

> **Namespace note:** This workflow is Azure DevOps-only. When related docs refer
> to shared workflow components, read them here as `ado:ado-publish-pr`,
> `ado:ado-babysit-pr`, `ado:ado-work-on`, and `ado:ado-draft-work-item`.
> GitHub counterparts use the matching `gh:gh-...` names.

## Constants

```
STALENESS_THRESHOLD_MINUTES = 15
MAX_REVIEWS_PER_RUN = 10
```

---

## Step 1: Entry — Parse Arguments & Detect Context

### 1a. Parse Arguments

Accept optional arguments from `$ARGUMENTS`:
- `"mine"` — filter to PRs authored by the current user
- `"<author name>"` — filter to PRs by a specific author
- `"max:<N>"` — override MAX_REVIEWS_PER_RUN (e.g., `max:5`)
- No arguments — review all active PRs

### 1b. Detect Storage Path

Determine the target repo root (current working directory). Then detect storage path:

```bash
# Check in priority order
if [ -d ".claude" ]; then
    STORAGE_PATH=".claude/.pull-requests"
elif [ -d ".copilot" ]; then
    STORAGE_PATH=".copilot/.pull-requests"
else
    STORAGE_PATH="scratchpad/pull-requests"
fi
```

Create `$STORAGE_PATH` and `$STORAGE_PATH/reviews/` if they don't exist.

### 1c. Discover Repository

Parse `git remote -v` to extract ADO variables (same pattern as `code-reviewer:pr-review` lines 70-86):

```
origin	https://<org>.visualstudio.com/<project>/_git/<repo> (fetch)
```

Extract:
- `AZURE_DEVOPS_ORG_URL` = `https://<org>.visualstudio.com/`
- `AZURE_DEVOPS_PROJECT` = `<project>`
- `AZURE_DEVOPS_REPOSITORY` = `<repo>`

Template: `<AZURE_DEVOPS_ORG_URL>/<PROJECT>/_git/<REPOSITORY>`

---

## Step 2: List Active PRs from ADO

```
mcp__azure-devops__listPullRequests(status: "active", repository: "<AZURE_DEVOPS_REPOSITORY>")
```

Extract per PR:
- `pullRequestId`
- `title`
- `isDraft`
- `sourceRefName` (strip `refs/heads/` prefix)
- `targetRefName` (strip `refs/heads/` prefix)
- `creationDate`
- `createdBy.displayName`
- `lastMergeSourceCommit.committer.date` (latest push timestamp)

**Filter out draft PRs**: Remove any PR where `isDraft` is `true`. Draft PRs are
work-in-progress and should not be reviewed until the author publishes them.
Note drafts in the Step 9 summary as "Skipped (draft)".

If the result is empty (or all PRs are drafts), report "No active PRs found" and exit normally.

---

## Step 3: Load Tracking State

Read `$STORAGE_PATH/tracking.json` using the Read tool.

**If file not found** (first run):
- Initialize empty tracking state:
```json
{
  "version": 1,
  "repository": "<AZURE_DEVOPS_REPOSITORY>",
  "project": "<AZURE_DEVOPS_PROJECT>",
  "orgUrl": "<AZURE_DEVOPS_ORG_URL>",
  "lastRunAt": null,
  "pullRequests": {}
}
```

**If file found**, validate:
1. `repository` matches `AZURE_DEVOPS_REPOSITORY`
2. `project` matches `AZURE_DEVOPS_PROJECT`

If mismatch: rename to `tracking.json.bak`, reinitialize, warn user.

If file is corrupt (invalid JSON): rename to `tracking.json.bak`, reinitialize, warn user.

For full schema details, load [reference/tracking-schema.md](reference/tracking-schema.md).

---

## Step 4: Diff & Filter — Determine Review Queue

For each active PR from Step 2, apply this decision logic:

```
needsReview(adoPR, trackingEntry):
    latestPush = adoPR.lastMergeSourceCommit.committer.date
    now = current UTC time

    # Too fresh — author may still be pushing
    if (now - latestPush) < STALENESS_THRESHOLD_MINUTES:
        return SKIP (reason: "too-fresh")

    # Never reviewed
    if trackingEntry is null:
        return REVIEW (reason: "never-reviewed")

    # Has new pushes since last review
    if latestPush > trackingEntry.lastKnownPushAt:
        return REVIEW (reason: "updated-since-review")

    # No new pushes — up to date
    return SKIP (reason: "up-to-date")
```

**Rationale for 15-minute threshold**: If a developer just pushed 5 minutes ago, they might push again. Reviewing too early wastes effort.

Apply any argument filters (author, "mine", max count) after the needs-review check.

---

## Step 5: Cleanup Stale Tracking Entries

For PRs in `tracking.json` with `status: "active"` that are NOT in the ADO active list:
- Set `status: "closed"`, add `closedAt: <now>`
- Keep review files as historical record (don't delete `reviews/pr-<number>.json`)

Write updated `tracking.json` after cleanup.

---

## Step 6: Build Review Queue

Create one todo item per PR needing review using TodoWrite:

```
[ ] Review PR #<number>: <title> (reason: <never-reviewed|updated-since-review>)
```

**Sort order**: never-reviewed first, then by staleness (oldest update first).

If the queue is empty, report "All active PRs are up-to-date" and proceed to Step 9.

If the queue exceeds MAX_REVIEWS_PER_RUN, truncate and note the remaining count.

---

## Step 7: Execute Reviews (Loop)

For each queued PR, invoke the `code-reviewer:pr-review` skill:

```
skill: "code-reviewer:pr-review", args: "<pr-number>"
```

The `code-reviewer:pr-review` skill handles everything autonomously:
- Fetches PR details, determines review mode (lightweight vs deep)
- Detects previous comments → triggers re-review workflow if applicable
- Runs all review agents, posts findings to ADO

After each review completes, immediately proceed to Step 8 before starting the next PR.

**Exit conditions** (check after each review):
1. **Queue complete** — all pending PRs reviewed successfully
2. **User says "stop"** — halt immediately
3. **Max reviews reached** — after MAX_REVIEWS_PER_RUN PRs, stop and report remaining queue
4. **Unrecoverable error** — ADO connectivity lost (MCP tools unavailable after retry)

---

## Step 8: Verify Tracking & Update Todo (after each review)

The `code-reviewer:pr-review` skill (Step 11) invokes `code-reviewer:update-pr-tracking`
to write tracking data after each review. This step verifies that happened, handles
fallback, updates `lastRunAt`, and marks the todo item.

### 8a. Verify Tracking Was Updated

Read `$STORAGE_PATH/tracking.json` and confirm the PR entry was updated by
`code-reviewer:pr-review`:
- `lastReviewedAt` should be recent (within the last few minutes)
- `lastReviewVerdict` should be set

If `code-reviewer:pr-review` **did not** update tracking (e.g., it errored before
reaching Step 11), invoke the shared tracking skill as a fallback:

```
skill: "code-reviewer:update-pr-tracking"
```

Pass the PR data from Step 2 with `status: "error"`, `verdict: null`,
`reviewType: "initial"` (safe default when pr-review failed before determining
re-review status), and `errorReason` describing why the review failed. The
tracking skill handles all storage path detection, file initialization, and
write logic.

### 8b. Update `lastRunAt`

Set `tracking.json` → `lastRunAt` to current UTC time after each review.
This field is owned by this batch orchestrator — `code-reviewer:update-pr-tracking`
does NOT update it.

### 8c. Update Todo

Mark the TodoWrite item as `[x]`.

### 8d. Handle Write Failures

If writing tracking files fails: warn user, continue reviews without persistence.

---

## Step 9: Report Summary

After all reviews complete (or exit condition reached), output:

```
## Review Run Summary

- **Active PRs found**: X
- **Skipped (draft)**: D (not published yet)
- **Reviewed this run**: Y
- **Skipped (too fresh)**: Z (< 15 min since last push)
- **Skipped (up-to-date)**: W (no changes since last review)
- **Errors**: E
- **Closed (merged/abandoned)**: C

### Reviews Performed
| PR | Title | Verdict | Findings |
|----|-------|---------|----------|
| #123 | Add feature X | REQUEST_CHANGES | 2 HIGH, 3 MEDIUM |
| #456 | Fix bug Y | APPROVE | 0 issues |

### Remaining Queue (if truncated)
- PR #789: Some other feature (never-reviewed)
```

---

## Error Handling

| Scenario | Action |
|---|---|
| ADO MCP tools unavailable | Invoke `ado:setup-ado-mcp` for this ADO workflow (`gh:setup-gh-mcp` is the GitHub counterpart), retry once. If still fails, STOP with clear error message. |
| `listPullRequests` returns empty | Report "No active PRs found", exit normally. |
| `tracking.json` corrupt (invalid JSON) | Rename to `tracking.json.bak`, reinitialize, warn user. |
| `tracking.json` repo mismatch | Warn user, rename to `tracking.json.bak`, reinitialize for current repo. |
| Individual `code-reviewer:pr-review` fails | Log as `lastReviewStatus: "error"` in tracking, continue to next PR. |
| Write to tracking file fails | Warn user, continue reviews without persistence. |
| `reviews/` directory missing | Create it before writing first per-PR file. |
