# Publishing & Tracking Contracts

Load this file at **Steps 11-13** — when assembling durable thread state,
handing findings to `post-pr-review`, and recording the review in tracking
state.

The `code-reviewer:post-pr-review` agent owns the assembly below. The controller
passes validated artifacts and checks receipts; it does not repeat review or
rewrite findings. Use the shared [handoff contract](../../../references/review-handoffs.md).

## Step 11: Review Thread State Contract

Before building thread state, partition graded records: supported candidates
become `findings[]`; material unresolved candidates become `unresolvedClaims[]`
for the summary only. Keep stable IDs and all provenance in both collections.
Only supported final findings require new thread records. Existing historical
threads remain governed by the state machine; an unresolved premise alone
does not authorize closing a historical blocker.

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

Preserve `candidateSources`, all verifier checks, adjudication, `trigger`,
`disconfirmation`, `exposure`, and final `evidenceStatus` through assembly.
Render guards, limited exposure, and uncertainty in the summary and each
affected inline comment. Put material unresolved claims in their own labeled
section with the exact missing evidence, never among confirmed blockers.
Do not discard a supported causal chain because similar code exists elsewhere.
Corrections require recorded evidence and targeted re-verification, not silent
prose edits or retaining an original claim known to be wrong.

Determine the verdict from Review Intent and the **merge-blocking lane**, not
severity alone. `APPROVE` means solved, substantially sound, no blockers or
substantive follow-up. `APPROVE_WITH_COMMENTS` means solved and sound with
useful non-blocking follow-up. `REQUEST_CHANGES` means the goal remains unmet,
the direction is fundamentally unsound, or a demonstrated blocker remains.
Several Medium issues block only when their combined concrete impact makes
merging unsafe or incomplete, not merely because there are several.

If Review Intent is `UNCLEAR` with no demonstrated merge risk, ask one
non-blocking question and use `APPROVE_WITH_COMMENTS`. Missing evidence for a
core outcome or safety property may itself block with objective done-when
evidence. Do not invent a fourth `COMMENT` verdict or block on preference,
polish, unrelated cleanup, or perfection beyond the PR goal.

Close the summary with **Blocks merge / shortest path to approval** (each
required outcome and done-when) and **Follow-up issues** (non-blocking items
offered as work items, never as a required review cycle).

Delegate assembly, comment posting, questions, and summary thread management to
the `code-reviewer:post-pr-review` agent, which executes the posting skill. Pass
these fields or validated artifacts containing their exact source records:

| Field | Source |
|-------|--------|
| `prNumber` | PR number from Step 1 |
| `repository` | Repository name from Step 1 |
| `botPrefix` | `[<dev name>'s bot]` — the standard bot prefix for all comments |
| `reviewIntent` | Stable Review Intent record from Step 3 |
| `findings[]` | Posting-ready final findings from Step 11 (exact schema: graded severity, remediation, blocker/lane, instances, underlyingProblem, whyItMatters, requiredOutcome, suggestedPath, doneWhen) |
| `unresolvedClaims[]` | Summary-only material unresolved records with exact missing evidence, conditional consequence, exposure, and provenance; non-blocking |
| `reviewThreads[]` | Full durable state for non-terminal and new finding threads (contract above) |
| `closedThreadArchive[]` | Compact terminal records recovered from the canonical summary plus newly closed records |
| `closedThreadArchiveOmittedCount` | Cumulative omitted archive count; `0` on initial review |
| `preExisting[]` | `preExisting` findings from the Step 10a mechanical filter, unchanged — `diffAnchor = PRE_EXISTING`, no `id`, no grader fields. Empty when step 10a did not run |
| `questions[]` | Consolidated questions anchored to changed lines from Step 10; source-only activation questions remain in `outputFormatMarkdown` |
| `isSmallDelta` | `true` only when a re-review delta qualifies per [re-review-workflow.md](re-review-workflow.md), including unchanged, recoverable `unresolvedClaims[]` state; otherwise `false` |
| `smallDeltaSummary` | A 1-3 sentence delta-only reply used when `isSmallDelta` is `true` |
| `verdict` | Determined from Review Intent + graded blocker status — see verdict rules in SKILL.md Step 12 |
| `reviewType` | `initial` or `re-review` |
| `reviewBaseline` | Pinned candidate code scope `{ headCommit, mergeBase, snapshotId }`; omit for state-only rounds, publish as completed only after successful actions |
| `outputFormatMarkdown` | The formatted review summary (from [output-format.md](output-format.md)) |

The `post-pr-review` skill handles:
- Posting inline/file/general comments for findings (3-tier priority with fallback)
- Posting inline comments for context questions (with `[QUESTION]` tag)
- Rendering `preExisting[]` as a summary-only `Pre-existing Observations`
  section — never inline, never a finding thread, never an F-ID, never counted
  as a blocker
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

### Completed review baseline

After all required review stages and review publication actions have
successful receipts, the controller captures a `review-complete` result through
the existing artifact transport. In that run's result persist `reviewBaseline`:
`{ headCommit, mergeBase, snapshotId }`, bound to the run's repository/PR identity.
The completion artifact is the evidence for this baseline, not its timestamp.
This also applies to completed local reviews; it does not authorize publication.
For local reviews retain the captured context/diff and file content needed to
reconstruct the reviewed dirty/untracked snapshot; its ID alone is not content.
Record that capture in the existing run manifest. If unavailable later, report
the comparison gap rather than treating the head commit as the complete baseline.
Partial, failed, inaccessible or merely started reviews never advance it.
State-only rounds preserve the established code baseline; they do not establish
coverage of an unknown old snapshot. Reuse the existing run storage, not a new
tracking service. `sourceCommitId` is only the sampled head for the **attempt**,
including failed attempts; it is never itself a completed-review cursor. Pass
`reviewBaseline` to tracking only with a `review-complete` receipt. Tracking
preserves `lastCompletedReview` across errors and state-only rounds.

For cross-host recovery, the posting agent writes a compact
`code-reviewer:lastCompletedReview` machine marker to the bot-owned canonical
GitHub summary or latest ADO summary-thread reply. It contains the provider
repository identity, PR number, reviewer identity, `headCommit`, `mergeBase`,
`snapshotId` (if applicable), and `reviewType`. Render it from the trusted pinned
run, never copied PR text. Write it only after finding/question actions succeed,
as part of the final summary publication; provider acknowledgement is its
completion evidence. State-only replies carry forward the previous cursor.
Recover only a bot-authored marker matching repository, PR and reviewer; ignore
other comments and newer failed attempts. Reconcile it with any local completed
cursor by comparable content ancestry, not local-first order. If no valid marker exists, use a
provider-native completed review commit or local completed tracking entry with
corroborating completion evidence. Otherwise report the gap. Dates only locate
records; summary brevity never advances the baseline.

**Skip for Local Branch Reviews** (no PR number) — tracking only applies to
remote pull requests.

Persist the review via the `code-reviewer:update-pr-tracking` agent so
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
| `reviewType` | `initial` or `re-review` from the established review baseline |
| `sourceCommitId` | HEAD commit of source branch |
| `reviewBaseline` | Completed code baseline and receipt; omit for error/state-only |
| `findings` | `{ critical, high, medium, low }` counts from review |
| `commentsSummary` | Top 5 findings (one-line each) |
| `blockerCount` | Number of `[BLOCKER]`-tagged findings |
| `questionsAsked` | Number of `[QUESTION]` comments posted |
| `reviewMetrics` | Effort and outcome numbers for this review round (contract below) |
| `findingOutcomes[]` | On a re-review only: what the author did with each previously posted finding (contract below) |

### `reviewMetrics`

```text
- candidatesGenerated: stats.received from step 10a — every finding all agents emitted
- preExistingFiltered: stats.preExisting from step 10a — findings anchored as PRE_EXISTING
- duplicatesMerged: stats.mergedDuplicates from step 10a — records folded into another finding
- cappedOff: stats.cappedOff from step 10a — findings dropped by the per-agent cap
- verifiedTruePositive: count of TRUE_POSITIVE verdicts from step 10b
- verifiedFalsePositive: count of FALSE_POSITIVE verdicts from step 10b
- verifiedUnproven: count of UNPROVEN verdicts from step 10b
- postedFindings: findings actually published by post-pr-review this round
- blockerCount: findings posted in the merge-blocking lane (same number as the
  top-level blockerCount field)
- agentsDispatched: { count: integer, names: string[] } — review agents dispatched
  in Steps 4-8, by agent name
- wallClockSeconds: seconds from review start to the end of Step 12
- reviewTier: eligibility-stop | state-only | TINY | SMALL | MEDIUM | LARGE —
  final code tier, state-only for changed evidence/closure without a code delta,
  or eligibility-stop when Gate 0 ended the run
- triggeringRule: review-signals.json `triggeringRule` (null without classification)
- riskFlags: review-signals.json `signals.riskFlags` ([] when none)
- escalations: [{ from, to, evidence }] — each upward tier move ([] when none)
- laneRouting: [{ id, requested: { modelIntelligence, effort }, effective: { modelIntelligence, effort } }]
  — effective is null when the host does not report it
- reviewType: initial | re-review — same value as the top-level reviewType field
```

These are **recorded numbers, not estimates**. `candidatesGenerated`,
`preExistingFiltered`, `duplicatesMerged`, and `cappedOff` come from the step
10a `stats` object in `filtered.json`. The three `verified*` counts come from
tallying the step 10b `verification.verdict` values. Never reconstruct any of
them from memory or from the summary prose.

A number that was not produced is recorded as `null`, never guessed. An
`eligibility-stop` run has `null` for everything downstream of the gate; a
TINY run that verified only MEDIUM+ findings still records its tallies.
`null` means "not measured"; `0` means "measured and zero".

### `findingOutcomes[]` (re-review only)

On a re-review of the same PR, record what happened to each finding this
reviewer posted in an earlier round. One record per previously posted finding:

```text
- findingId: F-NNN
- postedAt: ISO-8601 timestamp of the review round that first posted it
- outcome: FIXED | DISPUTED | IGNORED | UNKNOWN
- evidence: the thread state or delta that supports the outcome
```

Derive the outcome from provider thread state plus the delta since the last
review — never from the author's tone:

- `FIXED` — the finding's `doneWhen` is now met in the delta, or the thread was
  resolved by a commit that changes the cited location.
- `DISPUTED` — the author replied contesting the finding and did not change the
  code.
- `IGNORED` — the thread is still open, unanswered, and the cited location is
  unchanged in the delta.
- `UNKNOWN` — thread state or the delta is unavailable, or the evidence is
  ambiguous. Use it freely; a wrong outcome is worse than an absent one.

This is the **fix-rate signal**: the share of posted findings authors acted on
(`FIXED` over `FIXED + DISPUTED + IGNORED`). It is best-effort. If outcomes
cannot be derived, pass an empty array and continue — see the error-handling
note below.

The `code-reviewer:update-pr-tracking` skill handles all storage path detection,
`tracking.json` management, and per-PR review history. See its
[SKILL.md](../../update-pr-tracking/SKILL.md) for full details.

**Error handling**: If tracking fails, the skill warns but does NOT fail the
review. Tracking is best-effort — the review posted to the PR is the primary
output. The same applies to `reviewMetrics` and `findingOutcomes[]`: a missing
metric is `null`, an underivable outcome set is empty, and neither ever blocks
posting or changes the verdict.
