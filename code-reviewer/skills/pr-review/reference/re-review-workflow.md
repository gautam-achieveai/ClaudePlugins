# Re-Review / Update Workflow

When a PR was previously reviewed, the author pushed fixes, and the reviewer's vote was reset (e.g., "Vote of X was reset: Changes pushed to source branch"), the reviewer needs to focus on what changed since their last review — not re-review the entire PR.

This workflow specializes the shared PR-review pipeline; it does not launch a
second review. Resolve Steps 1-2 before classification or context gathering.
The delta is the default scope for every stage, including quality triage.

> **Provider note:** This workflow is provider-agnostic. The `mcp__azure-devops__*`
> tools named below have GitHub `gh` equivalents — see
> [Provider Resolution & Tool Mapping](../../../references/provider-resolution.md)
> (`getPullRequestComments` → `gh api .../pulls/<n>/comments`,
> `getCommitHistory` → `gh api .../pulls/<n>/commits`, `replyToComment` →
> `gh api .../comments/<id>/replies`, `updatePullRequestThread` → GraphQL
> `resolveReviewThread`).

## Step 1: Detect re-review context

- Fetch existing review comments and resolution state — ADO
  `mcp__azure-devops__getPullRequestComments`; GitHub GraphQL
  `pullRequest.reviewThreads` (`id`, `isResolved`, `isOutdated`, `path`, `line`,
  and comments) plus `issues/<n>/comments` for the canonical summary. Do not use
  REST review comments alone to infer resolved/open state.
- A completed prior review record establishes a re-review, even if it had no
  findings. Previous comments from this reviewer also require recovering that
  round; comments or an attempted/failed review alone do not prove completion.
- Extract the previous issue list (numbered issues with severities) from the last review summary comment
- Note which issues the author responded to (replies to review threads)
- Recover the complete serialized **Review Intent**, full non-terminal
  `reviewThreads[]`, compact `closedThreadArchive[]`, and cumulative
  `closedThreadArchiveOmittedCount` from the canonical summary. Non-terminal
  state includes acceptance criteria, non-goals,
  delivered approach, evidence, thread status, attempt count, and last-attempt
  commit. Closed archive records retain finding/thread identity, provider
  closure time, and the last completed action. Keep them unchanged unless newly
  discovered authoritative context or a verified state transition applies.
  Never reset or decrement the recovered omission count. Review comments do not
  redefine scope.
- For a legacy summary without these objects, reconstruct them once from the
  original work item/PR and provider threads, mark unknown fields explicitly,
  and persist the canonical objects in this re-review summary.
- Recover `unresolvedClaims[]` from the latest full canonical summary (on ADO,
  look past delta-only replies). Preserve claims until new evidence changes
  their disposition. An explicit empty array means none remain; a missing
  legacy collection is unknown, not empty. Persist the updated collection even
  when all claims are resolved.
- **Extract previous `[QUESTION]` threads** — identify which questions were answered
  and which remain unanswered. Read the answers to build additional review context.

## Step 2: Find what changed since last review

- Recover the exact last **completed** reviewed head, target merge-base and
  completion evidence for this repository/PR/reviewer. Reconcile the saved run's
  `reviewBaseline` with the bot-owned `code-reviewer:lastCompletedReview` marker
  in the canonical GitHub summary or latest ADO summary-thread reply. Validate
  provider author, repository, PR, reviewer and a completed summary write.
  Use the newest **comparable completed content** by ancestry and snapshot,
  even when an older local cursor exists. If cursors diverge or their content
  cannot be compared, report the gap. A later failed attempt's `sourceCommitId`
  never supersedes a completed cursor.
  For legacy reviews, use a provider-native completed review commit or local
  `lastCompletedReview` with corroborating completion evidence. Dates help
  locate records; never infer the baseline from the newest comment or a
  timestamp. If neither source is valid, report the precise comparison gap.
- Set `reviewType: "re-review"` and `reviewBase` to that reviewed head. Keep
  `mergeBase` as the current target merge-base; do not overload it with the
  reviewed head. Pin current `headCommit` before reading source.
- Compare `reviewBase` to `headCommit`, not the original PR merge-base. Derive
  both `diffPath` and `changedFiles` from this comparison, including renames and
  deletions. Classify this delta only; discard full-PR/prior-round cost signals
  and reviewer rosters. A lower tier than the previous round is valid because
  this is a new scope, not a downgrade within one review.
- **Local working-tree reviews:** commits alone do not represent reviewed
  dirty/untracked content. Compare the saved completed content snapshot with
  the current captured tracked and untracked content, even at the same HEAD.
  Recover the prior run's immutable context/diff and needed file contents;
  bind `reviewBaseSnapshotId` to its recorded snapshot ID. Keep `reviewBase`
  as the corresponding commit, not the content comparison itself. If either
  snapshot cannot be reconstructed reliably (including binary/untracked files),
  report the baseline gap before scanning. Never infer an empty local delta
  from equal commit IDs or replace it with a merge-base scan.
- Check that the old tree is available and identify force-push/rebase or target
  base movement. Recover exact old/new trees and account for inherited target
  changes before claiming a comparable delta. An ancestry check alone does not
  prove equivalent content. If comparison remains untrustworthy, stop code
  planning with the precise gap; never silently use a whole-PR fallback.
- Reuse prior context only with its source/revision and a check that the delta
  or new discussion did not invalidate it. Refresh affected settings, contracts,
  callers and answers; do not repeat unrelated hierarchy/history discovery.
- With an empty code delta, skip code classification, scout scanning and the
  mechanical filter. Process only changed answers/evidence and pending closure
  actions through the affected prior owner. Invoke verification/adjudication
  only for a new substantive judgment; retain unchanged verdicts and findings.
  If neither code, relevant evidence nor pending actions changed, stop without
  posting. The same head is not proof that discussion state is unchanged.
  Save a state-only context/run with the empty delta and changed-source revisions;
  record affected-owner assignments in the existing handoff manifest. Proceed
  through Steps 3/3.5 and 5, not the shared code-scanning/filtering pipeline.

### Scoped exceptions and small teams

The scout selects the smallest sufficient team for this round, normally **0-2
scanning specialists**, not the initial review's 3-7 guide. Zero is appropriate
for no code work; do not suppress a supported risk to meet a cap. Each owner
beyond two needs a distinct evidenced question and scope in the accepted plan.
Verification, grading and adjudication remain separate conditional gates;
count their invocations separately so total review effort stays visible.

Reuse an affected owner for related closure, test, temporary-artifact and
quality questions it can settle. Existing specialist charters do not require
every specialist to run. Do not redispatch unchanged historical lanes, rerun
settled investigations, or spin up a specialist just to repeat context.

Outside-delta reads need a named reason: verifying an attempted fix against
its original closure contract; tracing a changed contract into callers, stored
data or deployment boundaries; or assessing new authoritative evidence of a
material risk. Record trigger, source, exact scope, owner and stop condition in
`scopeExceptions[]`. Reuse the assigned owner; return an independent new risk
to the scout for a scoped amendment. Broad class size or PR age is not a reason.

The delta stays the finding anchor. For a delta-activated failure in unchanged
code, cite the real `enablingChange`; never fabricate one or widen the filter.
New evidence about an old thread/claim uses its existing dispute/closure path,
with targeted verification. Unrelated unchanged-code cleanup remains out of scope.
Offline and daemon reviews use only supplied baseline/evidence or their existing
context owner; missing history does not authorize live enrichment.

## Step 3: Build issue resolution tracker

Create a table tracking each previous issue:

```text
| ID | Issue | Severity | Blocker | Status | Attempts | Last Attempt | Pending Action | Action ID | Last Completed Action | Required Outcome / Done When | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| F-001 | Incorrect cache lifetime | HIGH | Yes | RESOLVED | 1 | abc123 | NONE | null | F-001:REPLY:abc123:1 | Requests cannot share user state / isolation test passes | Author supplied a fix; verification pending |
| F-002 | Duplicate helper | MEDIUM | No | WONT_FIX_ACCEPTED | 0 | null | CLOSE | F-002:CLOSE:head456:0 | null | Optional follow-up | Deferral accepted |
```

Status values: `NEW`, `ACTIVE`, `RESOLVED`, `VERIFIED`,
`WONT_FIX_ACCEPTED`, `CLOSED`, `HANDOFF_REQUIRED`.

### Build question resolution tracker

Create a separate table tracking each previous `[QUESTION]` thread:

```text
| # | Previous Question | File:Line | Status | Answer Summary |
|---|---|---|---|---|
| 1 | Why is retry count hardcoded to 3? | RetryService.cs:45 | ANSWERED | "Business rule: max 3 retries per SLA" |
| 2 | Is partial update intentional? | BulkUpload.cs:120 | UNANSWERED | — |
```

Status values: `ANSWERED`, `UNANSWERED`

**Using answered questions:**

- Feed answered questions into the re-review context — the reviewer now has
  information they lacked in the previous review
- An answer may cause previously uncertain code to become a finding (if the
  answer reveals the code is wrong) or confirm correctness (if the answer
  justifies the approach)
- Close answered question threads using `updatePullRequestThread`
- Leave unanswered questions open — they are non-blocking and carry forward

## Step 3.5: Satisfaction Check

Delegate only changed closure obligations to the affected selected owner (or
the prior finding's domain owner for a state-only round), with original records
and delta paths. The controller routes disputed evidence to verification/adjudication;
the publisher applies the returned transitions. Do not repeat the code analysis
in the controller or reset historical closure criteria.

For each thread in the tracker, verify the resolution using the delta diff and
the [Review Thread State Machine](../../../references/review-thread-state-machine.md):

**RESOLVED threads** — verify fix in the delta diff:

1. Find the code or evidence that addresses the original finding.
2. Evaluate it against the original `Required Outcome` and `Done When`, not the
   reviewer's suggested implementation.
3. Accept any safe equivalent solution that meets those conditions.
4. Check only for regressions caused by the fix.
5. If the conditions are met, set `status = VERIFIED`,
   `pendingAction = CLOSE`, and a deterministic `actionId`. `RESOLVED` alone
   means the author supplied a fix; it remains blocking until this verification.
6. If a source commit attempts the fix but the conditions are not met, increment
  `authorAttemptCount` and store the commit only when it is different from
  `lastAuthorAttemptCommit`. Do not count repeated review runs, the same commit,
  or unrelated commits.
7. After the first unsuccessful author attempt, keep `status = ACTIVE` and set
   `pendingAction = REPLY` with the exact unmet condition and evidence. Derive
   `actionId` from finding ID, action, source commit, and attempt count.
8. After the second unsuccessful author attempt, set
   `status = HANDOFF_REQUIRED`, `pendingAction = HANDOFF`, and a new
   deterministic `actionId`. Do not generate a third AI fix suggestion or add
   new requirements to the thread.

<blocker_enforcement>
**WON'T FIX threads — evaluate by blocker status and concrete risk:**

- **Blocking finding**: accept when the author proves the finding is factually
  incorrect, supplies evidence that the required outcome already holds, or fully
  mitigates the merge risk in this PR. A follow-up item alone is insufficient when
  the demonstrated risk would remain live after merge.
- **Non-blocking finding**: accept a reasonable one-line rationale, explicit
  deferral, or author preference among valid alternatives. Close the thread; it
  must not create another required review cycle.
- **Security finding**: require evidence proportional to the concrete exploit or
  exposure. Do not accept an unmitigated security blocker as merely out of scope.

If the original thread has no implementation-neutral `Required Outcome` and
objective `Done When`, clarify those once before rejecting the author's response.
The reviewer may not keep the thread open against an unwritten standard.

When a rationale is accepted, set `status = WONT_FIX_ACCEPTED`,
`pendingAction = CLOSE`, and a deterministic `actionId`. The posting skill moves
it to `CLOSED` only after provider reconciliation succeeds.
</blocker_enforcement>

**ACTIVE threads** (no developer reply):

- For blockers, keep the thread active and list its existing closure condition in
  the summary with `pendingAction = NONE`. Do not post a generic reminder on
  every run or increment the attempt count without a new fix commit.
- For non-blockers, do not chase a response or carry the item into the verdict.

## Step 4: Review only the delta

- Run only the scout-selected owners for delta questions and changed closure
  obligations; do not carry forward the previous domain roster.
- Focus on: Did the fix actually address the issue? Did the fix introduce new issues?
- Look for regressions: Did fixing issue A break something else?
- Pass the original Review Intent to every agent and to `review-grader`.
- New findings must arise from the delta, newly supplied authoritative context, or
  a newly demonstrated material risk directly activated by the delta. Do not add
  new Medium/Low comments on unchanged code that was available in the initial review.
- Do not regrade an existing thread or change its closure criteria without new evidence.
- Do not dispatch domain agents for a `HANDOFF_REQUIRED` finding unless a
  maintainer records a decision or new authoritative evidence changes the risk.
- Build the context pack from the **delta diff** (last reviewed commit to the
  new head), not the full PR diff. The mechanical filter (step 10a) then anchors
  new findings to the delta, which is what enforces "new findings must arise
  from the delta" mechanically rather than by reviewer discipline alone.
- Verification (step 10b) runs on new findings. An unchanged carried finding
  keeps its verdict and stable `id`; do not re-verify it automatically. New
  authoritative evidence that disputes a prior judgment permits targeted
  verification/adjudication through that thread/claim's existing path.
- Report only merge-blocking findings and substantive new ones on a re-review.
  No new nits on a later round: a finding not worth raising in round one is not
  worth raising in round three.

## Step 4.5: Self-Contribution Count

<self_contribution_count>
Before writing the summary, count your own contribution to this round:

1. For each NEW finding, determine whether it sits inside text or code that was
   **added or rewritten to satisfy a previous round of this review** (trace the
   delta hunks back to the prior findings that caused them).
2. Compute: "Of my N new findings, M are inside changes made to satisfy my
   previous review."
3. **This line MUST open the re-review summary.** It is the reviewer's own
   convergence metric, visible to the author.

When M is a majority of N, the review loop itself is generating the review
surface. Respond by **converging, not expanding**:

- Keep every fix suggestion to the smallest scope that resolves the defect
  (one cell, one sentence, one guard — not a new section or subsystem).
- Do not request a different shape for content whose shape your previous
  round demanded — genuine defects inside it still count, redesigns do not.
- If the growth added in response to your review is itself the main source of
  new defects, consider recommending that the growth be reverted or simplified
  instead of patched further.
- Real merge-blocking defects (per their closure contracts) are still reported
  regardless of self-contribution — this rule shapes scope, never silence.
</self_contribution_count>

## Step 5: Post re-review summary

<verdict_gate>
**Before determining the verdict, apply the unresolved gate:**

If any blocker is `NEW`, `ACTIVE`, `RESOLVED`, or `HANDOFF_REQUIRED` after
evaluating its original closure criteria, the verdict is **REQUEST_CHANGES**.
Severity alone does not determine this gate; non-blocking Critical/High/Medium
guidance does not prevent approval.

When the stated problem is solved, the solution remains in the right ballpark,
and every blocker is `VERIFIED`, `WONT_FIX_ACCEPTED`, or `CLOSED`, use the
provisional verdict `APPROVE` or `APPROVE_WITH_COMMENTS` according to the
remaining optional feedback. The posting skill casts an approval only after all
closure candidates become `CLOSED` and canonical state persistence succeeds.

The verdict is the MORE restrictive of:

- Review Intent (goal coverage and solution direction)
- The unresolved gate result (from blocker status)
- The delta review result (new issues found in Step 4)
</verdict_gate>

### Verdict Stability

On re-review, the verdict MUST NOT regress unless:
  (a) a new finding was introduced in the delta, OR
  (b) new authoritative evidence proves an existing finding was materially misgraded, OR
  (c) a previously RESOLVED thread was reopened as ACTIVE because the attempted fix was insufficient.
If none of (a)-(c) happened, carry the previous verdict forward.

Changing reviewer preference, discovering optional cleanup in unchanged code, or
rewriting an already-satisfied closure condition cannot regress the verdict.

`APPROVE` from iteration N must stay `APPROVE` on iteration N+1 when the
incremental diff introduces no new issues and no prior thread was reopened.

Unless small-delta mode applies, use a structured format:

```markdown
## Re-Review Summary: PR #XXXX

**Self-contribution**: Of my [N] new findings, [M] are inside changes made to
satisfy my previous review. [One sentence on what that means for this round's
scope — converge vs. expand.]

### Intent Check
- Goal coverage: SOLVED / PARTIALLY_SOLVED / NOT_SOLVED / UNCLEAR
- Solution direction: RIGHT_BALLPARK / FUNDAMENTALLY_MISALIGNED / UNCLEAR

### Previous Issues Resolution Status
| # | Issue | Severity | Blocker | Resolution / Remaining Done When |
|---|---|---|---|---|

### Previous Questions Status
| # | Question | Status | Impact on Review |
|---|----------|--------|------------------|

### New Issues Found (in updated code)
#### [SEVERITY] - [Issue Title]
...

### New Context Questions
(if any new uncertainties arose from the delta or from answered questions)

### Verdict
APPROVE / APPROVE_WITH_COMMENTS / REQUEST_CHANGES (still)

### Unresolved Issues Blocking Approval (if any)
- [List only active blockers as: required outcome — done when closure evidence]

### Follow-up Issues (do NOT block approval)
- [Non-blocking findings — offer to file each as a work item / issue so it
  leaves the merge gate but stays tracked]

### Shortest Path to Approval (if REQUEST_CHANGES)
1. [Required outcome] — done when [objective evidence]

### Maintainer Decision Required (if any)
- [F-NNN: evidence-backed blocker after two author attempts; no further AI reply]

### Canonical Review State
- [Complete serialized reviewIntent]
- [Complete non-terminal reviewThreads with action IDs and reconciled provider state]
- [Compact closedThreadArchive with terminal finding/thread identities]
```

## Re-review rules

<re_review_rules>

- **Open with the self-contribution count** — the summary's first line states
  how many of this round's new findings sit inside changes made to satisfy the
  previous round (Step 4.5). A majority means converge: smallest-scope fixes
  only, no reshaping of content your own review caused to exist.
- **Two-attempt convergence limit per blocker** — the first unsuccessful fix gets
  one precise reply naming the unmet `Done When`. If the same blocker remains
  disputed after a second author attempt, stop generating alternative AI review
  suggestions. Post one consolidated statement of the remaining evidence and
  route the decision to a synchronous discussion or code owner/maintainer. Keep
  `REQUEST_CHANGES` only while the blocker remains evidence-backed; do not start a
  third asynchronous AI loop over the same unchanged issue.
- **Persist handoff state** — `HANDOFF_REQUIRED`, `authorAttemptCount = 2`, and
  `lastAuthorAttemptCommit` stay in the canonical summary. Automated review does
  not clear or reply to this state; only a maintainer decision or new
  authoritative evidence can transition it.
- **Reconcile actions before retrying** — if a provider comment already contains
  the deterministic action marker, or a CLOSE target is already resolved, record
  `lastCompletedActionId` and do not repeat the action.
- **Don't re-litigate resolved issues** — if the author fixed it, acknowledge and move on
- **Track deferred blockers only when needed** — optional items can be acknowledged
  and closed without requiring a follow-up work item. A deferred blocker needs a
  mitigation in this PR plus an owner/tracking item for the remaining risk.
- **Focus on the delta** — only flag new issues in the updated code
- **Won't Fix must meet the blocker bar** — evaluate whether concrete merge risk
  remains, not whether the author used the suggested implementation.
- **Keep the bar stable over iterations** — neither time pressure nor a fresh
  reviewer preference changes the original `Required Outcome` or `Done When`.
- **Call out NEW issues** — clearly distinguish new findings from previous ones
- **Update the existing summary** — on ADO, reply to the existing summary
  thread; on GitHub, PATCH the canonical flat issue comment in place. The
  `post-pr-review` skill handles provider-specific detection. Do not create a
  new top-level summary item when the canonical one exists.
- **Use small-delta mode for trivial re-reviews** — if the delta is limited to
  doc string edits, URL updates, formatting, or config/MCP tweaks under ~30
  changed lines, set `isSmallDelta = true` and pass a 1-3 sentence
  `smallDeltaSummary` to `post-pr-review`. In small-delta mode, do NOT
  re-render prior verified claims or issue tables, and do NOT restate the
  verdict unless it changed. If the delta touches business logic, authorization,
  error handling, or security-relevant code, use the full structured summary
  and appropriate checks on the delta regardless of size. Summary format does
  not expand the scan to the entire PR or restore the old reviewer roster.
- **Disable small-delta mode when state changes** — any Review Intent, verdict,
  thread status, attempt count, pending-action, or `unresolvedClaims[]` change
  requires the full structured summary so durable state is not lost. Compare
  the current collection with recovered state, including additions, evidence
  changes, and resolutions to empty. If prior claim state is unknown or cannot
  be compared, use the full summary. Apply the posting skill's comparison rules;
  unchanged claim state may retain small-delta mode when other checks pass.
- **DO NOT POST** if no code, relevant evidence or pending action changed.
- **Incorporate answered questions** — read answers to previous `[QUESTION]`
  threads. Use the context they provide to inform the re-review. Close answered
  question threads. If an answer reveals a defect, open a new finding thread
  (not a question).
- **Ask new questions sparingly on re-review** — only ask new questions if the
  delta code introduces new uncertainties. Do not re-ask questions that were
  already answered.
</re_review_rules>

## Retrospective handoff

After completing this round, dispatch the `code-reviewer:review-retrospective` agent when
new or edited human comments/answers exist, or a pending retrospective stage can
now complete, even if no source code changed.
Pass the original reviewed commit/round for each item, the current delta,
Review Intent, original comments, human replies with revision identifiers,
and existing investigation/effort artifacts. The retrospective processes only
changed evidence and keeps its outputs local; unchanged evidence skips completed
stages while allowing pending work to resume when its prerequisite is available.
Do not attribute defects introduced by the new delta to the earlier review,
change the canonical thread state, or post a scorecard as part of this handoff.
For review-depth planning, reuse only applicable knowledge and process entries
from the known learning location; revalidate stale facts before relying on them.
