# Publishing & Tracking Contracts

Load this file at **Steps 11-13** — when assembling durable thread state,
handing findings to `post-pr-review`, and recording the review in tracking
state.

## Step 11: Review Thread State Contract

Build `reviewThreads[]` from existing bot-owned finding threads plus new final
findings. Each record:

```text
- findingId: F-NNN
- threadId: provider thread/comment ID, or null for a new finding
- status: NEW | ACTIVE | RESOLVED | VERIFIED | WONT_FIX_ACCEPTED | HANDOFF_REQUIRED
- blocker: true | false
- authorAttemptCount: non-negative integer
- lastAuthorAttemptCommit: source commit SHA, or null
- pendingAction: POST | REPLY | CLOSE | HANDOFF | NONE
- actionId: <findingId>:<pendingAction>:<sourceCommit-or-none>:<authorAttemptCount>, or null
- lastCompletedActionId: last provider-reconciled action ID, or null
- requiredOutcome: stable implementation-neutral condition
- doneWhen: stable objective closure evidence
- evidence: current resolution or remaining-risk evidence
```

Increment `authorAttemptCount` only when a new source commit, different from
`lastAuthorAttemptCommit`, attempts to address that finding. A review
invocation by itself is not an attempt. Set exactly one `pendingAction` from
the state transition and derive a deterministic `actionId`; the posting skill
reconciles that ID and resets the action to `NONE` after success. Emit exactly
one thread record for every final finding, with matching blocker and closure
fields, while retaining unresolved historical blocker records.

`NEW`, `ACTIVE`, `RESOLVED`, and `HANDOFF_REQUIRED` are substantive blocker
states. `VERIFIED` and `WONT_FIX_ACCEPTED` are closure candidates and must have
`pendingAction = CLOSE`. After provider closure, move the record out of
`reviewThreads[]` and into `closedThreadArchive[]`; only then may the posting
skill cast an approval vote after canonical state persistence succeeds.

Full lifecycle rules:
[Review Thread State Machine](../../../references/review-thread-state-machine.md).

## Step 12: post-pr-review Input Contract

Delegate all comment posting, question posting, and summary thread management to
the `post-pr-review` skill (`skill: "code-reviewer:post-pr-review"`). Pass:

| Field | Source |
|-------|--------|
| `prNumber` | PR number from Step 1 |
| `repository` | Repository name from Step 1 |
| `botPrefix` | `[<dev name>'s bot]` — the standard bot prefix for all comments |
| `reviewIntent` | Stable Review Intent record from Step 3 |
| `findings[]` | Posting-ready final findings from Step 11 (exact schema: graded severity, remediation, blocker/lane, instances, underlyingProblem, whyItMatters, requiredOutcome, suggestedPath, doneWhen) |
| `reviewThreads[]` | Full durable state for non-terminal and new finding threads (contract above) |
| `closedThreadArchive[]` | Compact terminal records recovered from the canonical summary plus newly closed records |
| `closedThreadArchiveOmittedCount` | Cumulative omitted archive count; `0` on initial review |
| `questions[]` | Consolidated context questions from Step 10 |
| `isSmallDelta` | `true` when a re-review delta qualifies for small-delta mode per [re-review-workflow.md](re-review-workflow.md); otherwise `false` |
| `smallDeltaSummary` | A 1-3 sentence delta-only reply used when `isSmallDelta` is `true` |
| `verdict` | Determined from Review Intent + graded blocker status — see verdict rules in SKILL.md Step 12 |
| `reviewType` | `initial` or `re-review` |
| `outputFormatMarkdown` | The formatted review summary (from [output-format.md](output-format.md)) |

The `post-pr-review` skill handles:
- Posting inline/file/general comments for findings (3-tier priority with fallback)
- Posting inline comments for context questions (with `[QUESTION]` tag)
- Action reconciliation against provider state (retry-safe, deterministic action IDs)
- Updating the existing summary: reply in the ADO thread, or PATCH the canonical
  GitHub issue comment in place (instead of creating a new one)
- Optionally approving the PR (for either no-blocker verdict, when the user confirms)
- Optionally merging the PR (if user requests, with merge strategy confirmation)

**Posting is automatic** — do NOT ask the user for permission to post findings,
questions, or the summary to the PR. Post immediately after determining the
verdict.

**Exception — approve/merge still require confirmation:**
- Approving the PR (if verdict is APPROVE) — confirm with user first
- Merging the PR — always confirm with user first

## Mention Conventions

Use the provider's mention conventions when referencing entities in comments —
[GitHub](../../../references/gh-mention-conventions.md) /
[Azure DevOps](../../../references/ado-mention-conventions.md).
IMPORTANT (Azure DevOps): reference a work item with `#` (e.g. `#12354`) and a PR
with `!` (e.g. `!4212`) — `!` is for PRs, `#` is for bugs/work items.
On GitHub, both issues and PRs use `#` (e.g. `#123`); there is no `!` syntax.

## Step 13: Tracking Contract

**Skip for Local Branch Reviews** (no PR number) — tracking only applies to
remote pull requests.

Persist the review via `skill: "code-reviewer:update-pr-tracking"` so
`code-reviewer:review-pending-prs` (and future runs) know this PR was reviewed.
Pass:

| Field | Source |
|-------|--------|
| `prNumber` | PR number from Step 1 |
| `title` | PR title from the provider |
| `sourceBranch` | Source branch (GitHub `headRefName`; ADO without `refs/heads/`) |
| `targetBranch` | Target branch (GitHub `baseRefName`; ADO without `refs/heads/`) |
| `author` | PR author (GitHub `author.login`; ADO `createdBy.displayName`) |
| `createdAt` | PR creation date from the provider |
| `lastKnownPushAt` | Latest push timestamp (GitHub head-commit date; ADO `lastMergeSourceCommit.committer.date`) |
| `verdict` | Verdict from Step 12 (`APPROVE`, `APPROVE_WITH_COMMENTS`, `REQUEST_CHANGES`) |
| `status` | `completed` (or `error` if review failed) |
| `reviewType` | `initial` or `re-review` (based on whether previous comments existed) |
| `sourceCommitId` | HEAD commit of source branch |
| `findings` | `{ critical, high, medium, low }` counts from review |
| `commentsSummary` | Top 5 findings (one-line each) |
| `blockerCount` | Number of `[BLOCKER]`-tagged findings |
| `questionsAsked` | Number of `[QUESTION]` comments posted |

The `code-reviewer:update-pr-tracking` skill handles all storage path detection,
`tracking.json` management, and per-PR review history. See its
[SKILL.md](../../update-pr-tracking/SKILL.md) for full details.

**Error handling**: If tracking fails, the skill warns but does NOT fail the
review. Tracking is best-effort — the review posted to the PR is the primary
output.
