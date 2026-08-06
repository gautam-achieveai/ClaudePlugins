# Re-Review / Update Workflow

When a PR was previously reviewed, the author pushed fixes, and the reviewer's vote was reset (e.g., "Vote of X was reset: Changes pushed to source branch"), the reviewer needs to focus on what changed since their last review — not re-review the entire PR.

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
- If previous review comments exist from this reviewer (or Claude), this is a re-review
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
- **Extract previous `[QUESTION]` threads** — identify which questions were answered
  and which remain unanswered. Read the answers to build additional review context.

## Step 2: Find what changed since last review

- Find commits pushed after the last review date — ADO `mcp__azure-devops__getCommitHistory`, GitHub `gh api repos/<owner>/<repo>/pulls/<n>/commits` (or `git log --after="<date>" origin/<source>`)
- Use `git log --after="<last-review-date>" origin/<source-branch>` locally to see new commits
- Use `git diff <last-review-commit>..<current-head>` to see ONLY the delta since last review
- **Critical difference from initial review**: diff against last-review-point, not merge-base

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

- Run the same domain-specific agents (step 7) but ONLY on files changed since last review
- Focus on: Did the fix actually address the issue? Did the fix introduce new issues?
- Look for regressions: Did fixing issue A break something else?
- Pass the original Review Intent to every agent and to `review-grader`.
- New findings must arise from the delta, newly supplied authoritative context, or
  a newly demonstrated material risk directly activated by the delta. Do not add
  new Medium/Low comments on unchanged code that was available in the initial review.
- Do not regrade an existing thread or change its closure criteria without new evidence.
- Do not dispatch domain agents for a `HANDOFF_REQUIRED` finding unless a
  maintainer records a decision or new authoritative evidence changes the risk.

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
  error handling, or security-relevant code, do a full re-review regardless of
  size.
- **Disable small-delta mode when state changes** — any Review Intent, verdict,
  thread status, attempt count, or pending-action change requires the full
  structured summary so durable state is not lost.
- **DO NOT POST** anything if nothing changed in the PR since last review.
- **Incorporate answered questions** — read answers to previous `[QUESTION]`
  threads. Use the context they provide to inform the re-review. Close answered
  question threads. If an answer reveals a defect, open a new finding thread
  (not a question).
- **Ask new questions sparingly on re-review** — only ask new questions if the
  delta code introduces new uncertainties. Do not re-ask questions that were
  already answered.
</re_review_rules>
