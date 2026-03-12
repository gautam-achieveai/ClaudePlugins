# Tracking Data Schema

## Storage Path Detection

The skill detects which tool context it's running in and uses the appropriate directory **in the target repo** (not the plugin repo):

| Priority | Condition | Path |
|----------|-----------|------|
| 1 | `.claude/` exists at repo root | `.claude/.pull-requests/` |
| 2 | `.copilot/` exists at repo root | `.copilot/.pull-requests/` |
| 3 | Fallback | `scratchpad/pull-requests/` |

Both `.claude/` and `scratchpad/` are typically git-excluded, so tracking data stays local.

## Directory Structure

```
<storage-path>/
├── tracking.json              # Master index — one entry per PR, keyed by PR number
└── reviews/
    └── pr-<number>.json       # Per-PR append-only review history
```

## `tracking.json` Schema

```json
{
  "version": 1,
  "repository": "MCQdb",
  "project": "MCQdb_Development",
  "orgUrl": "https://mcqdbdev.visualstudio.com/",
  "lastRunAt": "2026-03-12T10:30:00Z",
  "pullRequests": {
    "12345": {
      "prNumber": 12345,
      "title": "Add bulk upload feature",
      "sourceBranch": "developers/gb/bulk-upload",
      "targetBranch": "dev",
      "author": "Gautam Bhakar",
      "status": "active",
      "lastKnownPushAt": "2026-03-12T09:45:00Z",
      "lastReviewedAt": "2026-03-12T10:15:00Z",
      "lastReviewVerdict": "REQUEST_CHANGES",
      "lastReviewStatus": "completed",
      "reviewCount": 2,
      "createdAt": "2026-03-10T14:00:00Z"
    }
  }
}
```

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Schema version for future migrations. Current: `1` |
| `repository` | string | ADO repository name. Guard against using tracking data from wrong repo |
| `project` | string | ADO project name |
| `orgUrl` | string | ADO organization URL |
| `lastRunAt` | ISO 8601 | Timestamp of the last batch review run |
| `pullRequests` | object | Dictionary keyed by PR number string for O(1) lookup |

### Per-PR Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `prNumber` | number | PR number |
| `title` | string | PR title at time of last review |
| `sourceBranch` | string | Source branch name (without `refs/heads/`) |
| `targetBranch` | string | Target branch name (without `refs/heads/`) |
| `author` | string | PR author display name |
| `status` | string | `"active"` or `"closed"`. Closed entries kept for history but not processed |
| `lastKnownPushAt` | ISO 8601 | Latest source commit timestamp at time of last review. Compared against ADO's current `lastMergeSourceCommit.committer.date` to detect updates |
| `lastReviewedAt` | ISO 8601 | Timestamp of the last review |
| `lastReviewVerdict` | string or null | `"APPROVE"`, `"APPROVE_WITH_COMMENTS"`, `"REQUEST_CHANGES"`, or `null` |
| `lastReviewStatus` | string | `"completed"` or `"error"` |
| `reviewCount` | number | Total number of reviews performed on this PR |
| `createdAt` | ISO 8601 | PR creation date from ADO |
| `closedAt` | ISO 8601 | Set when status changes to `"closed"` |

## `reviews/pr-<number>.json` Schema

```json
{
  "prNumber": 12345,
  "title": "Add bulk upload feature",
  "author": "Gautam Bhakar",
  "reviews": [
    {
      "reviewedAt": "2026-03-10T16:00:00Z",
      "reviewType": "initial",
      "verdict": "REQUEST_CHANGES",
      "status": "completed",
      "sourceCommitId": "abc123def456",
      "findings": { "critical": 1, "high": 3, "medium": 5, "low": 2 },
      "commentsSummary": [
        "[BLOCKER] HIGH: Missing null check in UserService.cs:45",
        "MEDIUM: Duplicated validation logic in BulkUploadController.cs:120"
      ],
      "blockerCount": 1
    }
  ]
}
```

### Review Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `reviewedAt` | ISO 8601 | Timestamp when the review completed |
| `reviewType` | string | `"initial"` (first review) or `"re-review"` (subsequent reviews) |
| `verdict` | string | `"APPROVE"`, `"APPROVE_WITH_COMMENTS"`, `"REQUEST_CHANGES"` |
| `status` | string | `"completed"` or `"error"` |
| `sourceCommitId` | string | HEAD commit hash of the source branch at time of review |
| `findings` | object | Count of findings by severity: `critical`, `high`, `medium`, `low` |
| `commentsSummary` | string[] | Top findings (not all). Full findings live in ADO |
| `blockerCount` | number | Number of findings tagged as `[BLOCKER]` |

## Initialization

On first run (no `tracking.json` exists), create:

```json
{
  "version": 1,
  "repository": "<detected-repo>",
  "project": "<detected-project>",
  "orgUrl": "<detected-org-url>",
  "lastRunAt": null,
  "pullRequests": {}
}
```

Also create the `reviews/` subdirectory.

## Validation

Before using `tracking.json`, verify:
1. `repository` matches the current repo (from `git remote -v`)
2. `project` matches the current project
3. `version` is `1` (current schema version)

If any mismatch: rename to `tracking.json.bak`, reinitialize, warn user.
