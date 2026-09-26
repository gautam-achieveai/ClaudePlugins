---
name: update-pr-tracking
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Bash, Glob
---

# Update PR Tracking

**Primary objective:** Keep PR review tracking accurate and tied to observed review outcomes.
**Decision rule:** For relevant cases these steps do not cover, choose the next in-scope action that advances this objective; preserve explicit scope, safety, and output requirements.

Persist review results to local tracking files so future reviews know what was
already reviewed and when. This skill is the single source of truth for all
tracking file operations — other skills use it rather than writing tracking
files directly.

For full schema details, load [reference/tracking-schema.md](../review-pending-prs/reference/tracking-schema.md).

## Input

The calling skill passes these values as `$ARGUMENTS` or context:

| Field | Required | Source |
|-------|----------|--------|
| `prNumber` | Yes | PR number from the provider |
| `title` | Yes | PR title |
| `sourceBranch` | Yes | Without `refs/heads/` prefix |
| `targetBranch` | Yes | Without `refs/heads/` prefix |
| `author` | Yes | PR author (GitHub `author.login`; ADO `createdBy.displayName`) |
| `createdAt` | Yes | PR creation date from the provider |
| `lastKnownPushAt` | Yes | Latest push timestamp (GitHub head-commit date; ADO `lastMergeSourceCommit.committer.date`) |
| `verdict` | Yes | `APPROVE`, `APPROVE_WITH_COMMENTS`, `REQUEST_CHANGES`, or `null` (if error) |
| `status` | Yes | `completed` or `error` |
| `reviewType` | Yes | `initial` or `re-review` |
| `sourceCommitId` | No | HEAD commit hash of source branch |
| `findings` | No | `{ critical, high, medium, low }` counts |
| `commentsSummary` | No | Array of top findings (one-line each) |
| `blockerCount` | No | Number of `[BLOCKER]`-tagged findings |
| `reviewMetrics` | No | Recorded effort/outcome numbers for this review (see below) |
| `findingOutcomes` | No | Re-review only: what the author did with each previously posted finding (see below) |
| `errorReason` | No | Error description if `status` is `error` |

### `reviewMetrics`

| Field | Source |
|-------|--------|
| `candidatesGenerated` | `stats.received` from the mechanical filter |
| `preExistingFiltered` | `stats.preExisting` from the mechanical filter |
| `duplicatesMerged` | `stats.mergedDuplicates` from the mechanical filter |
| `cappedOff` | `stats.cappedOff` from the mechanical filter |
| `verifiedTruePositive` | Count of `TRUE_POSITIVE` verification verdicts |
| `verifiedFalsePositive` | Count of `FALSE_POSITIVE` verification verdicts |
| `verifiedUnproven` | Count of `UNPROVEN` verification verdicts |
| `postedFindings` | Findings actually published to the PR this round |
| `blockerCount` | Merge-blocking findings posted (mirrors the top-level field) |
| `agentsDispatched` | `{ "count": <integer>, "names": [<agent names>] }` |
| `wallClockSeconds` | Seconds from review start to the end of posting |
| `reviewTier` | `eligibility-stop`, `TINY`, `SMALL`, `MEDIUM`, or `LARGE` (final tier after escalation) |
| `triggeringRule` | The classifier's `triggeringRule` |
| `riskFlags` | The classifier's risk flags (array) |
| `escalations` | Array of `{ from, to, evidence }` upward tier moves |
| `laneRouting` | Array of `{ id, requested, effective }` model-intelligence/effort per lane |
| `reviewType` | `initial` or `re-review` (mirrors the top-level field) |

Store every value exactly as the caller supplied it. These are measured
numbers, not estimates — do not compute, infer, or backfill a missing one from
the other fields. A value the caller did not supply is stored as `null`; `0`
means measured and zero.

### `findingOutcomes`

Array; present only on a re-review. One record per finding a previous round
posted:

| Field | Source |
|-------|--------|
| `findingId` | `F-NNN` |
| `postedAt` | ISO-8601 timestamp of the review round that first posted it |
| `outcome` | `FIXED`, `DISPUTED`, `IGNORED`, or `UNKNOWN` |
| `evidence` | The thread state or delta the caller derived the outcome from |

The caller derives outcomes; this skill only persists them. Store an empty
array when none were supplied.

## Step 1: Detect Storage Path

Determine the storage path at the **target repo root** (current working
directory, not the plugin repo):

```bash
if [ -d ".claude" ]; then
    STORAGE_PATH=".claude/.pull-requests"
elif [ -d ".copilot" ]; then
    STORAGE_PATH=".copilot/.pull-requests"
else
    STORAGE_PATH="scratchpad/pull-requests"
fi
```

Create `$STORAGE_PATH` and `$STORAGE_PATH/reviews/` if they don't exist.

## Step 2: Discover Repository

Resolve the provider and repo coordinates from `git remote -v` (see
[provider-resolution.md](../../references/provider-resolution.md)):

- **GitHub** (`github.com`): `provider = "github"`, `repository = <repo>`,
  `project = <owner>`, `orgUrl = https://github.com/<owner>`.
- **Azure DevOps** (`dev.azure.com` / `visualstudio.com`): `provider = "ado"`,
  `repository = <repo>`, `project = <project>`, `orgUrl = https://<org>.visualstudio.com/`.

## Step 3: Load or Initialize `tracking.json`

Read `$STORAGE_PATH/tracking.json`.

**If not found** (first run) — initialize:

```json
{
  "version": 1,
  "provider": "<github | ado>",
  "repository": "<repo>",
  "project": "<project | owner>",
  "orgUrl": "<org/owner URL>",
  "lastRunAt": null,
  "pullRequests": {}
}
```

**If found** — validate:
1. `repository` matches the detected repo
2. `project` matches the detected project/owner

If mismatch → rename to `tracking.json.bak`, reinitialize, warn user.

If corrupt (invalid JSON) → rename to `tracking.json.bak`, reinitialize, warn user.

## Step 4: Update PR Entry in `tracking.json`

Update (or create) the entry keyed by PR number:

```json
{
  "prNumber": <number>,
  "title": "<title>",
  "sourceBranch": "<source>",
  "targetBranch": "<target>",
  "author": "<author>",
  "status": "active",
  "lastKnownPushAt": "<from input>",
  "lastReviewedAt": "<current UTC time>",
  "lastReviewVerdict": "<verdict from input>",
  "lastReviewStatus": "<status from input>",
  "reviewCount": <previous + 1, or 1 if new>,
  "createdAt": "<from input>"
}
```

Do NOT update `lastRunAt` — that field is owned by the
`code-reviewer:review-pending-prs` batch orchestrator.

Write `tracking.json`.

## Step 5: Append to `reviews/pr-<number>.json`

If the file doesn't exist, create it:

```json
{
  "prNumber": <number>,
  "title": "<title>",
  "author": "<author>",
  "reviews": []
}
```

Append a new entry to the `reviews` array:

```json
{
  "reviewedAt": "<current UTC time>",
  "reviewType": "<from input>",
  "verdict": "<from input>",
  "status": "<from input>",
  "sourceCommitId": "<from input, or null>",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "commentsSummary": [],
  "blockerCount": 0,
  "reviewMetrics": {
    "candidatesGenerated": null,
    "preExistingFiltered": null,
    "duplicatesMerged": null,
    "cappedOff": null,
    "verifiedTruePositive": null,
    "verifiedFalsePositive": null,
    "verifiedUnproven": null,
    "postedFindings": null,
    "blockerCount": null,
    "agentsDispatched": { "count": null, "names": [] },
    "wallClockSeconds": null,
    "reviewTier": null,
    "triggeringRule": null,
    "riskFlags": [],
    "escalations": [],
    "laneRouting": [],
    "reviewType": "<from input>"
  },
  "findingOutcomes": []
}
```

Populate `findings`, `commentsSummary`, and `blockerCount` from input if
provided. If status is `error`, set `commentsSummary` to
`["Review failed: <errorReason>"]`.

Populate `reviewMetrics` from the input object, key by key. Keep `null` for any
key the caller did not supply — never substitute an estimate, a count derived
from `findings`, or a value carried over from the previous review entry. Write
`findingOutcomes` from input, or `[]` when absent. Both live inside the review
entry, so each review round keeps its own numbers and earlier rounds are never
rewritten.

Write the file.

## Step 6: Report

Return a brief confirmation to the calling skill:
- Storage path used
- PR number updated
- Review count (new total)
- Any warnings (reinitialized tracking, write failures)

## Error Handling

**Tracking is best-effort.** If any write fails, warn the calling skill but do
NOT fail the review. The review itself (posted to the PR) is the primary output —
tracking is supplementary.

| Scenario | Action |
|---|---|
| Storage path doesn't exist | Create it |
| `tracking.json` corrupt | Rename to `.bak`, reinitialize, warn |
| `tracking.json` repo mismatch | Rename to `.bak`, reinitialize, warn |
| `reviews/` directory missing | Create it |
| `reviewMetrics` absent, partial, or malformed | Store the keys you have, `null` for the rest, warn; never fail the review |
| `findingOutcomes` absent or underivable | Store `[]`, warn; never fail the review |
| Write fails | Warn, return error status to caller |
