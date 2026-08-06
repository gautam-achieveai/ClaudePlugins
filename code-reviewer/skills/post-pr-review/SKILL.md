---
name: post-pr-review
description: >
  Internal helper. Load only when explicitly named by another skill or agent. Publishes goal-aligned, deduplicated PR feedback with clear blocker outcomes and stable closure criteria so reviews converge without repeated comment rounds.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Bash, Skill, mcp__azure-devops__*
---

# Post PR Review — Publish Results to GitHub or Azure DevOps

Publish structured review results (findings, context questions, and summary) to a
**GitHub or Azure DevOps** pull request. This skill owns the full "write to the PR
provider" workflow — the caller provides the data, this skill resolves the provider
(see [Provider Resolution & Tool Mapping](../../references/provider-resolution.md)) and
handles formatting, deduplication, thread management, and posting. Provider-specific
calls below show the `mcp__azure-devops__*` tool and its GitHub `gh` equivalent.

## When to Use

- **From pr-review Step 12** — after findings are graded and verdict is determined
- **From re-review workflow** — after delta review is complete
- **Standalone** — any workflow that needs to post structured comments to a PR

## Input Contract

The caller MUST provide the following fields. Validate all required fields before
proceeding — reject with a clear error if any are missing.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `prNumber` | integer | PR number (GitHub or Azure DevOps) |
| `repository` | string | Repository name (e.g., `MyRepository`) |
| `botPrefix` | string | Bot prefix for all comments (e.g., `[<reviewer>'s bot]`) |
| `reviewIntent` | object | Stable PR intent: stated problem, acceptance criteria, non-goals, goal coverage, solution direction, and evidence |
| `findings[]` | array | Graded findings — each with severity, blocker flag, issue, impact, required outcome, suggested path, and closure evidence |
| `reviewThreads[]` | array | Full durable state of non-terminal bot-owned finding threads plus new findings to post |
| `closedThreadArchive[]` | array | Compact terminal records ordered by `closedAt`, then `findingId` |
| `closedThreadArchiveOmittedCount` | integer | Cumulative number of terminal archive records omitted for provider size limits |
| `questions[]` | array | Context questions from Step 10 — each with file, line, uncertainty, what answering unlocks |
| `verdict` | enum | `APPROVE`, `APPROVE_WITH_COMMENTS`, or `REQUEST_CHANGES` |
| `reviewType` | enum | `initial` or `re-review` |
| `outputFormatMarkdown` | string | The formatted review summary markdown (from output-format.md template) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `project` | string | ADO project name, or GitHub `owner` (auto-detected from git remote if omitted) |
| `approveAfterPosting` | boolean | If `true` and verdict is `APPROVE` or `APPROVE_WITH_COMMENTS`, approve after posting. Default: `false` (confirm with user first) |
| `mergeAfterApproval` | boolean | If `true`, merge after approval. Default: `false` |
| `mergeStrategy` | enum | `squash`, `noFastForward`, `rebase`, `rebaseMerge`. Default: `squash` |
| `isSmallDelta` | boolean | When `true`, the caller is posting a trivial re-review delta and the summary must use small-delta mode. Default: `false` |
| `smallDeltaSummary` | string | Required when `isSmallDelta` is `true`. A 1-3 sentence delta-only summary reply |

### Finding Format

Each item in `findings[]` must have:

```text
- id: F-NNN
- severity: CRITICAL | HIGH | MEDIUM | LOW
- blocker: true | false
- category: string (e.g., "Security", "Performance", "Code Quality")
- file: string (path relative to repo root)
- line: integer (1-based line number, or null for file-level)
- issue: string (description of the problem)
- whyItMatters: string (concrete consequence for this PR)
- requiredOutcome: string (implementation-neutral condition; required for blockers)
- suggestedPath: string (minimal safe route or 1-2 viable options)
- doneWhen: string (objective closure evidence; required for blockers)
```

### Review Intent Format

`reviewIntent` uses this exact lower-camel shape:

```text
- statedProblem: string
- acceptanceCriteria: string[]
- explicitNonGoals: string[]
- deliveredApproach: string
- goalCoverage: SOLVED | PARTIALLY_SOLVED | NOT_SOLVED | UNCLEAR
- solutionDirection: RIGHT_BALLPARK | FUNDAMENTALLY_MISALIGNED | UNCLEAR
- evidence: string[]
```

### Review Thread Format

Each item in `reviewThreads[]` must have:

```text
- findingId: F-NNN
- threadId: provider thread/comment ID, or null for a new finding
- status: NEW | ACTIVE | RESOLVED | VERIFIED | WONT_FIX_ACCEPTED | HANDOFF_REQUIRED
- blocker: true | false
- authorAttemptCount: non-negative integer
- lastAuthorAttemptCommit: source commit SHA, or null
- pendingAction: POST | REPLY | CLOSE | HANDOFF | NONE
- actionId: deterministic action token, or null when pendingAction is NONE
- lastCompletedActionId: last reconciled provider action token, or null
- requiredOutcome: stable implementation-neutral condition
- doneWhen: stable objective closure evidence
- evidence: current resolution or remaining-risk evidence
```

### Question Format

Each item in `questions[]` must have:

```text
- File: string (path relative to repo root)
- Line: integer (1-based line number)
- CodeContext: string (the code snippet that triggered the question)
- Uncertainty: string (what the reviewer cannot determine)
- WhatAnsweringUnlocks: string (what the reviewer could assess with an answer)
- SuggestedAnswers: string[] (optional — 2-3 possible answers to guide the author)
```

## Workflow

### Step 1: Validate Inputs

1. Verify all required top-level fields are present. Arrays may be empty for a
  clean review; `requiredOutcome` and `doneWhen` may be empty only for
  non-blocking findings.
2. Verify `findings[]` items have the required structure
3. Verify finding/thread parity before deriving a verdict:
   - Every final finding ID is unique and has exactly one `reviewThreads[]` record.
   - Every review-thread finding ID is unique.
   - Matching finding/thread records have identical `blocker`,
     `requiredOutcome`, and `doneWhen` values after whitespace normalization.
   - A historical thread may lack a current final finding only when it has a
     provider `threadId`; unresolved historical blockers still affect verdicts.
   - `pendingAction = NONE` requires `actionId = null`; every non-`NONE`
     pending action requires a non-null deterministic `actionId`.
   Reject missing, duplicate, or contradictory records instead of guessing.
4. Verify archive state:
   - `closedThreadArchiveOmittedCount` is a non-negative integer and never
     decreases from the recovered canonical summary.
   - Each archive record has `findingId`, `threadId`, `status = CLOSED`,
     `blocker`, `closedAt`, and `lastCompletedActionId`. Record `closedAt` as a
     UTC ISO-8601 timestamp immediately after the provider confirms closure.
   - Finding IDs and provider thread IDs are unique across `reviewThreads[]` and
     `closedThreadArchive[]`.
   - Reject `status = CLOSED` in `reviewThreads[]`; terminal records belong only
     in `closedThreadArchive[]`.
5. Verify `questions[]` items have the required structure
6. Verify all seven `reviewIntent` fields are present with the exact names above;
  reject a verdict that contradicts `goalCoverage` or `solutionDirection`
7. For every blocking finding, require concrete `whyItMatters`,
  `requiredOutcome`, and objective `doneWhen`. If any is missing, return it to
  the caller for grading instead of posting an open-ended blocker.
8. Derive blocker sets from all current and historical `reviewThreads[]` records:
   - `substantiveBlockers`: blocker records in `NEW`, `ACTIVE`, `RESOLVED`, or
     `HANDOFF_REQUIRED`. These require `REQUEST_CHANGES`.
   - `closureCandidates`: blocker records in `VERIFIED` or
     `WONT_FIX_ACCEPTED`, each with `pendingAction = CLOSE`. These permit a
     provisional no-blocker verdict, but not a provider approval yet.
   - `providerOpenBlockers`: every blocker not in `CLOSED` state. This set must
     be empty after actions and summary persistence before approving.
   Reject `APPROVE` or `APPROVE_WITH_COMMENTS` when `substantiveBlockers` is
   non-empty. Reject `REQUEST_CHANGES` when it has no substantive blocker; a
   goal gap or unverified core outcome must be represented by an actionable blocker.
9. If Review Intent is `UNCLEAR` with no active blocker, require
  `APPROVE_WITH_COMMENTS` plus one focused question. Never accept `COMMENT` as
  a verdict value.
10. If `isSmallDelta` is `true`, verify `reviewType` is `re-review`,
   `smallDeltaSummary` is present, and the summary is no longer than 3 sentences
11. If validation fails → return error with specific missing/invalid fields

### Step 2: Resolve Provider, Repository and Project

Resolve the provider once from the git remote (full rules in
[Provider Resolution & Tool Mapping](../../references/provider-resolution.md)):

```bash
git remote get-url origin
```

- Host `github.com` → **GitHub**; parse `https://github.com/<owner>/<repo>`
  (`project` ≈ `<owner>`, `repository` = `<repo>`). Post via GitHub MCP tools when
  connected, else the `gh` CLI.
- Host `dev.azure.com` / `visualstudio.com` → **Azure DevOps**; parse
  `https://<org>.visualstudio.com/<project>/_git/<repository>`. Post via
  `mcp__azure-devops__*`.

### Step 3: Deduplicate Findings

Fetch provider thread state and top-level summary comments once, then cache both:

```text
# Azure DevOps
getPullRequestComments returns thread status, IDs, paths, lines, and comments.

# GitHub
Use GraphQL pullRequest.reviewThreads for id, isResolved, isOutdated, path,
line, and comments. Use issues/<prNumber>/comments separately for the canonical
summary issue comment. REST pulls/<prNumber>/comments alone does not expose
review-thread resolution state.
```

On GitHub, paginate `reviewThreads(first: 100, after: $cursor)` until
`pageInfo.hasNextPage` is false. Retain every unresolved thread even when
`isOutdated` is true: outdated means its line anchor moved, not that its risk was
resolved. Use `isOutdated` only when choosing a new reply anchor. Match the bot
prefix and stable `[F-NNN]` marker in the root comment.

When multiple agents flag the same issue (same file + same line range + similar
description), keep the more detailed version and discard the duplicate.

**Deduplication rules:**
- Same file + overlapping line range + similar category → keep the one with more
  complete impact and closure guidance
- If one finding has a code example and the other doesn't → keep the one with
  the code example
- If both are equally detailed → keep the one with higher severity

Build an existing-findings list from provider threads whose root comment contains
the `botPrefix` and stable `[F-NNN]` marker. Match exact `findingId` first; use
file plus substantially similar issue or `requiredOutcome` only to migrate a
legacy thread that has no marker.

For each incoming finding, match by file plus substantially similar issue or
`RequiredOutcome`:

- **Matching open thread**: do not create a duplicate. Execute only the
  corresponding `reviewThreads[].pendingAction`.
- **Matching closed thread**: do not repost unless new delta code reintroduces
  the same risk; if reintroduced, reference the prior thread.
- **No match**: add to `newFindings[]` for posting.
- **Non-blocking finding already summarized previously**: skip it. Optional
  guidance is not repeated to solicit a response.

Never open multiple threads for repeated instances when one bounded pattern-level
finding, verified location list, and shared closure condition will guide the fix.

Before applying an action, reconcile it against provider state. `actionId` is a
deterministic token such as
`<findingId>:<pendingAction>:<sourceCommit-or-none>:<authorAttemptCount>`.
Include `<!-- review-action:<actionId> -->` in every posted root comment, reply,
or handoff note. Then:

Complete every successful or recovered action as one atomic canonical-state
transition: copy the current `actionId` to `lastCompletedActionId`, set
`pendingAction = NONE`, and set `actionId = null`. Never persist an intermediate
combination of those three fields.

- If `actionId == lastCompletedActionId`, reset `pendingAction` to `NONE` and
  clear `actionId` to null.
- If the provider already contains the action marker, reconcile the resulting
  state, set `lastCompletedActionId`, reset `pendingAction` to `NONE`, and clear
  `actionId` without posting again.
- For `CLOSE`, treat an already-resolved provider thread as successful.
- Otherwise, apply each pending action exactly once:

- `POST`: post the new finding comment, capture its provider ID, set status to
  `ACTIVE`, set `lastCompletedActionId`, reset action to `NONE`, and clear
  `actionId`.
- `REPLY`: reply once with the exact unmet `doneWhen` and current evidence, then
  set `lastCompletedActionId`, reset action to `NONE`, and clear `actionId`.
- `CLOSE`: close/resolve the provider thread, then atomically remove it from
  `reviewThreads[]` and append its compact `status = CLOSED` record to
  `closedThreadArchive[]` with `closedAt` and `lastCompletedActionId`. Do not
  persist an intermediate terminal record in the active array.
- `HANDOFF`: do not post another fix suggestion. Set status to
  `HANDOFF_REQUIRED`, add one maintainer-decision item to the canonical summary,
  set `lastCompletedActionId`, reset action to `NONE`, and clear `actionId`.
- `NONE`: do nothing, even if the thread is still active.

Never infer an action from severity or from the mere existence of an active
thread. Persist the reconciled state in the canonical summary after provider
calls. If summary persistence fails, preserve the action markers for recovery,
report a retriable error, and do not approve the PR.

### Step 4: Post Finding Comments

Post `newFindings[]` in action priority, then severity order:

1. **Blockers** → post first, Critical to Medium
2. **Non-blocking Critical/High** → post when the risk is useful despite being mitigated
3. **Non-blocking Medium** → post only when directly actionable and specific to changed code
4. **Low findings** → do not post inline by default; consolidate them under
  `Optional Follow-up` in the summary. They must not require a response or re-review.

> **GitHub — batch findings + questions into ONE review. Do NOT post them one at a time.**
> `POST /repos/<owner>/<repo>/pulls/<pr>/comments` creates a *standalone* review comment,
> and GitHub wraps every standalone review comment in its own empty-bodied review — so
> posting N findings that way produces **N empty reviews** (the spam this skill must avoid).
> Instead, **accumulate** every GitHub inline finding (this step) and every new question
> (Step 5c) into a single `comments[]` array and submit them in ONE review **before Step 6**:
>
> ```
> # commit_id = PR head SHA (`gh pr view <prNumber> --json headRefOid -q .headRefOid`).
> # event=COMMENT SUBMITS it (never a PENDING draft). Assemble comments in priority order.
> gh api repos/<owner>/<repo>/pulls/<prNumber>/reviews --input - <<'JSON'
> {
>   "commit_id": "<headSha>",
>   "event": "COMMENT",
>   "comments": [
>     { "path": "<file>", "line": <line>, "side": "RIGHT", "body": "<formatted comment>" }
>   ]
> }
> JSON
> ```
> - Submit **exactly once per run**, carrying ALL findings + new questions in `comments[]`.
>   Omit the top-level `body` (the overall summary is its own thread in Step 6).
> - A finding/question whose line is NOT in the PR diff cannot go in `comments[]` (GitHub
>   422s the whole review). Anchor it to the nearest changed line in that file, or post it
>   as a general issue comment `gh pr comment <prNumber> --body <comment>` — an issue comment
>   does NOT create a review, so no empty review.
> - If the batch is empty (no new findings, no new questions), submit **no** review at all.
> - NEVER use `POST .../pulls/<pr>/comments` on GitHub. Thread *replies*
>   (`.../pulls/<pr>/comments/<id>/replies`, Step 6) are fine — they add to a thread and
>   do not create a review.
>
> (Azure DevOps has no review-wrapper: post each comment individually via the MCP tools
> below — that never creates empty reviews.)

**For each finding, select the comment type:**

1. **Inline comment** (preferred) — when `line` is not null:
   ```
   # Azure DevOps
   mcp__azure-devops__addPullRequestInlineComment
     repository: <repository>
     pullRequestId: <prNumber>
     path: /<file>
     position: { line: <line>, offset: 1 }
     comment: <formatted comment>

   # GitHub — do NOT post now. Add this finding to the batched review (see "GitHub —
   # batch findings + questions into ONE review" above) as one comments[] entry:
   #   { path: <file>, line: <line>, side: "RIGHT", body: <formatted comment> }
   ```

2. **File comment** (fallback) — when `Line` is null or inline fails:
   ```
   # Azure DevOps
   mcp__azure-devops__addPullRequestFileComment
     repository: <repository>
     pullRequestId: <prNumber>
     path: /<file>
     comment: <formatted comment>

   # GitHub — no line-less file comment exists: anchor an inline comment to the
   # file's first changed line, or fall back to the general comment (3) naming the file.
   ```

3. **General comment** (last resort) — when file is not in PR diff:
   ```
   # Azure DevOps
   mcp__azure-devops__addPullRequestComment
     repository: <repository>
     pullRequestId: <prNumber>
     comment: <formatted comment>

   # GitHub
   gh pr comment <prNumber> --body <formatted comment>
   ```

**Finding comment format:**

For blocking findings:
```markdown
<botPrefix> [BLOCKER] [<id>] **<severity>** (<category>)

<!-- review-action:<actionId> -->

<issue>

**Why this matters:** <whyItMatters>

**Required outcome:** <requiredOutcome>

**Suggested path:** <suggestedPath>

**Done when:** <doneWhen>
```

For non-blocking findings:
```markdown
<botPrefix> [NON-BLOCKING] [<id>] **<severity>** (<category>)

<!-- review-action:<actionId> -->

<issue>

**Why this may help:** <whyItMatters>

**Consider:** <suggestedPath; an equivalent choice or deferral is acceptable>
```

**Do not reclassify findings while posting.** Use the grader's `Blocker` value.
Severity and category alone do not make a finding blocking. If the classification
looks inconsistent or a blocker lacks closure evidence, return it to the caller
instead of guessing.

**Error handling:** If an inline comment fails (line not in diff), retry as a
file comment. If that also fails, fall back to a general comment referencing
the file and line.

### Step 5: Post Context Question Comments

Post each question as an inline comment anchored to the relevant code line.
Questions use the `[QUESTION]` tag — distinct from findings.

<question_deduplication>
**Step 5a: Check for existing questions (MUST do before posting)**

Before posting any questions, check for questions we already asked in a previous
review iteration. This requires the full set of PR comment threads.

**Reuse already-fetched comments:** Step 3 fetched and cached provider review
threads and top-level comments. Reuse that data — do NOT fetch either collection
again unless Step 3 failed:

```
# Azure DevOps
mcp__azure-devops__getPullRequestComments
  repository: <repository>
  pullRequestId: <prNumber>

# GitHub
# Re-run the Step 3 GraphQL reviewThreads query only if its cache is unavailable.
# Fetch issues/<prNumber>/comments only for top-level summary comments.
```

**Cache for later:** Store the fetched threads so Step 6 (summary thread
management) can reuse them instead of making another API call.

Scan all comment threads for existing `[QUESTION]` threads by looking for
threads whose root comment contains BOTH:
- The `botPrefix` (e.g., `[<reviewer>'s bot]`)
- The `[QUESTION]` tag

Build an existing-questions list from matching threads:
```
| File | Uncertainty (first 100 chars) | Thread Status | Thread ID |
```

**Step 5b: Filter out duplicate questions**

For each question in `questions[]`, check if it already exists by matching:
1. **Same file path** (exact match, case-insensitive)
2. **Similar question text** — the `Uncertainty` field substantially overlaps with
   an existing question's text (same core question, even if wording differs slightly)

If a match is found → **skip posting** and record it as a duplicate. The existing
thread already captures the question — re-posting would clutter the PR.

**What counts as a duplicate:**
- Same file + same or very similar uncertainty text → duplicate (skip)
- Same file + different question about different code → NOT a duplicate (post it)
- Different file + similar question text → NOT a duplicate (post it)
- Existing question was answered (thread resolved/closed) but same question still
  applies to new code → NOT a duplicate (post it, as the context has changed)

Track results:
```
skippedQuestions[] — questions that already exist on the PR
newQuestions[] — questions that need to be posted
```
</question_deduplication>

**Step 5c: Post new questions only**

**For each question in `newQuestions[]`** (same inline-comment mechanism as Step 4):

```
# Azure DevOps
mcp__azure-devops__addPullRequestInlineComment
  repository: <repository>
  pullRequestId: <prNumber>
  path: /<file>
  position: { line: <line>, offset: 1 }
  comment: <formatted question>

# GitHub — do NOT post now. Add this question to the SAME batched review as the findings
# (see Step 4's "GitHub — batch findings + questions into ONE review") as one comments[] entry:
#   { path: <file>, line: <line>, side: "RIGHT", body: <formatted question> }
```

**Question comment format:**

```
<botPrefix> [QUESTION] **Clarification Needed**

**Code:**
`<CodeContext>`

**Question:** <Uncertainty>

**Why this matters:** <WhatAnsweringUnlocks>

**Possible answers:** <SuggestedAnswers, if provided>
```

**Key rules:**
- Questions are **always non-blocking** — never use the `[BLOCKER]` tag
- Questions do NOT affect the verdict
- Each question is a separate comment thread (one question per `comments[]` entry / ADO comment)
- **GitHub:** once findings (Step 4) and new questions are assembled, SUBMIT the ONE batched
  `pulls/<pr>/reviews` review (event=COMMENT) carrying every finding + question in `comments[]`
  — exactly once per run, before Step 6. Never post via `pulls/<pr>/comments`. (ADO posts each
  comment individually as shown above.)
- If the line is not in the diff: **GitHub** — anchor to the nearest changed line or post a
  general issue comment (`gh pr comment`); **ADO** — fall back to file comment, then general comment
- Cap: if `newQuestions[]` has more than 10 items, post the top 10 (highest review
  impact) and note the remainder in the summary
- If all questions were duplicates, skip posting entirely and note in the summary:
  `"All <count> questions were already asked in a previous review iteration."`

### Step 6: Manage Review Summary Thread

The review summary is the top-level overview of the entire review. To keep the PR
clean, we **reuse the existing summary thread** instead of creating new ones.

<summary_thread_management>
**Workflow:**

1. **Search for existing summary thread:**

  **Reuse already-fetched comments:** Use Step 3's cached top-level comments.
  Do not confuse GitHub review-thread comments with issue comments:

   ```
   # Azure DevOps
   mcp__azure-devops__getPullRequestComments
     repository: <repository>
     pullRequestId: <prNumber>

   # GitHub
  gh api --paginate 'repos/<owner>/<repo>/issues/<prNumber>/comments?per_page=100'
   ```
  Scan all ADO threads or GitHub issue comments for an item containing BOTH:
   - The `botPrefix` (e.g., `[<reviewer>'s bot]`)
   - A review summary heading: `# PR Review:` or `## Re-Review Summary:`

2. **If existing summary found → update the canonical summary:**
   ```
   # Azure DevOps
   mcp__azure-devops__replyToComment
     repository: <repository>
     pullRequestId: <prNumber>
     threadId: <summaryThreadId>
     comment: <new summary markdown>

   # GitHub — summaries are issue comments, not review comments
   gh api --method PATCH repos/<owner>/<repo>/issues/comments/<summaryCommentId> \
     -f body=<new summary markdown>
   ```
   For ADO, reply in the existing summary thread. For GitHub, update the one
   canonical issue comment in place; GitHub issue comments do not support review
   thread replies. This avoids one new summary comment per iteration.

  **How to update an existing summary:**
   - **Azure DevOps:** use `getPullRequestComments` to find the summary thread
     ID, then call `replyToComment` with that exact ID. Do not call the generic
     add-comment operation and assume it will infer a parent.
   - **GitHub:** capture the summary issue comment's `id`, then PATCH
     `.../issues/comments/<id>`.

  **Note:** Do NOT create a second GitHub summary when the canonical comment can
  be updated. For ADO, keep the existing summary thread active until approval.

3. **If no existing summary thread → create new one:**

  Only take this branch after a successful, paginated search proves no canonical
  summary exists. If the search itself fails, stop with a retriable error; do
  not create a possible duplicate summary.

   ```
   # Azure DevOps
   mcp__azure-devops__addPullRequestComment
     repository: <repository>
     pullRequestId: <prNumber>
     comment: <summary markdown>

   # GitHub
   gh pr comment <prNumber> --body <summary markdown>
   ```
   Post as a new general comment. This becomes the summary thread for future
   re-reviews.

**Summary identification markers:**
- The summary MUST start with the `botPrefix` followed by a known heading
- Initial review heading: `# PR Review: <PR Title>`
- Re-review heading: `## Re-Review Summary: PR #<prNumber>`
- These markers are how future invocations find the ADO thread or canonical
  GitHub issue comment to update
</summary_thread_management>

<small_delta_summary>
If `reviewType` is `re-review` and `isSmallDelta` is `true`:
- Require `reviewIntent`, `reviewThreads`, `closedThreadArchive`, and verdict to
  be unchanged. If any changes, disable small-delta mode and post the full
  structured summary.
- On ADO, reply on the existing summary thread when one exists.
- On GitHub, retain the canonical summary body and update only a `Latest Delta`
  section with `smallDeltaSummary`; never replace serialized intent/state with
  the short text.
- On ADO, use `smallDeltaSummary` as the entire reply body.
- Keep the reply to 1-3 sentences.
- Cover only the incremental delta.
- Do NOT repeat previously verified claims or re-render prior tables.
- Do NOT restate the verdict unless it changed.
- If no existing canonical summary is found, disable small-delta mode and create
  the full structured summary so Review Intent and thread state are persisted.
</small_delta_summary>

**Summary content selection and durable state:**
- If small-delta mode applies, post `smallDeltaSummary`.
- Otherwise use the `outputFormatMarkdown` provided by the caller. Verify it
  starts from the same `reviewIntent` and includes:
  - whether the stated problem is solved
  - whether the solution is in the right ballpark
  - blockers only in a prioritized `Shortest Path to Approval`
  - Low and other optional feedback under `Optional Follow-up`, explicitly marked
    as not requiring another review cycle
- Include the complete serialized `reviewIntent` and all non-`CLOSED`
  `reviewThreads` after pending actions are reset to `NONE`. This canonical
  summary is the source for re-review recovery; do not omit acceptance criteria,
  non-goals, delivered approach, evidence, attempt counts, or last-attempt
  commit from non-terminal records.
- Move `CLOSED` records to `closedThreadArchive[]` using only `findingId`,
  `threadId`, `status`, `blocker`, `closedAt`, and `lastCompletedActionId`.
  Record `closedAt` immediately after provider closure succeeds, sort ascending
  by `closedAt`, and tie-break by `findingId`. Provider threads remain the source of
  the closed discussion; the archive retains enough identity for deduplication
  without carrying terminal evidence prose forever.
- Put `reviewThreads` and `closedThreadArchive` in one collapsed
  `<details><summary>Review state (machine-readable)</summary>` section after the
  human-facing shortest path so machine state does not compete with guidance.
- On GitHub, keep the complete summary at or below 60,000 characters to leave
  headroom below the provider comment limit. Apply this deterministic order:
  1. Render all non-terminal records in full and all closed records compactly.
  2. Remove already-posted `Optional Follow-up` prose, retaining its item count.
        3. While the rendered body exceeds 60,000 characters and archive candidates
          remain, remove exactly one compact archive entry in the defined
          `closedAt`/`findingId` order, non-blocking first and then blocking; increment
          `closedThreadArchiveOmittedCount`, re-render, and re-measure. Stop pruning
          immediately when the complete body is within budget. Provider threads
          remain the authoritative closed-history record.
        4. After the bounded pruning loop, measure the complete final comment body. If it still exceeds
          60,000 characters, stop with a specific `summary-body-overflow` error and
          do not post or approve. Never truncate Review Intent, active blocker closure
          criteria, handoff evidence, or action reconciliation fields.
- Set `canonicalStatePersisted = true` only after the provider confirms this
  summary update. Action markers allow recovery after a failed update, but they
  do not substitute for durable canonical state in the approval gate.
- Append a questions summary section if any questions were posted:

```markdown
## Context Questions Asked (<count>)

The following areas need clarification from the PR author. These are non-blocking
but answers will improve review confidence:

| # | File | Line | Question |
|---|------|------|----------|
| 1 | path/to/file.cs | 45 | <brief uncertainty> |
| ... | ... | ... | ... |
```

### Step 7: Approve / Merge (Optional)

**Approve** — only when ALL conditions are met:
1. Verdict is `APPROVE` or `APPROVE_WITH_COMMENTS`
2. `approveAfterPosting` is `true` OR user explicitly confirms
3. No blocker remains in `reviewThreads[]`; every newly closed blocker is in
  `closedThreadArchive[]` and provider closure is confirmed
4. No blocker action failed
5. `canonicalStatePersisted` is `true`
6. No `HANDOFF_REQUIRED` state exists

```
# Azure DevOps
mcp__azure-devops__approvePullRequest
  repository: <repository>
  pullRequestId: <prNumber>

# GitHub
gh pr review <prNumber> --approve --body "<short approval note>"
```

> On GitHub, a `REQUEST_CHANGES` verdict can be posted as a real review state with
> `gh pr review <prNumber> --request-changes --body "<summary>"`. Azure DevOps has
> no native request-changes verb — the findings and summary comments carry it.

**Merge** — only when ALL conditions are met:
1. PR is approved
2. `mergeAfterApproval` is `true` OR user explicitly confirms
3. User has confirmed merge strategy

```
# Azure DevOps
mcp__azure-devops__mergePullRequest
  repository: <repository>
  pullRequestId: <prNumber>
  mergeStrategy: <mergeStrategy>

# GitHub
gh pr merge <prNumber> --squash     # or --merge (noFastForward) / --rebase
```

Always confirm merge strategy with the user:
- **squash** — for feature branches (default) — GitHub `--squash`
- **noFastForward** — for release branches — GitHub `--merge`

### Step 8: Return Confirmation

Return a structured confirmation to the caller:

```
## Post-PR-Review Complete

- **PR**: #<prNumber> in <repository>
- **Findings posted**: <count> (<critical> critical, <high> high, <medium> medium, <low> low)
- **Questions posted**: <count> (<skipped> skipped as already asked)
- **Summary**: <ADO: new thread | replied to existing thread #<threadId>;
  GitHub: new issue comment | updated canonical issue comment #<commentId>>
- **Verdict**: <verdict>
- **Approved**: Yes / No
- **Merged**: Yes / No
- **Errors**: <any posting failures, with details>
```

## Error Handling

- **Provider tooling unavailable** (ADO MCP, or GitHub MCP / `gh` CLI) → use `ado:setup-ado-mcp` or `gh:setup-gh-mcp` and retry; if still failing, return error suggesting a config / `gh auth` check
- **Inline comment fails** → fall back to file comment → fall back to general comment
- **Summary search fails** → stop with a retriable error; do not create a
  potentially duplicate canonical summary
- **Approval fails** → report error but do NOT retry (may be policy-blocked)
- **Merge fails** → report error with details (likely policy or conflict)
- **Optional-comment failure** → continue posting remaining optional items and
  report failures in the confirmation
- **Blocker-action failure** → reconcile other actions, persist the resulting
  state when possible, report the failure, and do not approve
- **Summary persistence failure** → retain provider action markers for the next
  run, report a retriable error, and do not approve

## Comment Mention Conventions

Use the provider's mention conventions when referencing entities in comments —
[GitHub](../../references/gh-mention-conventions.md) /
[Azure DevOps](../../references/ado-mention-conventions.md).

- **Azure DevOps**: work items `#12345` (hash prefix), pull requests `!4567`
  (exclamation prefix). **IMPORTANT**: `!` is for PRs, `#` is for work items/bugs.
- **GitHub**: both issues and pull requests use `#123` — there is no `!` syntax.

## Integration Points

- **Called by**: `code-reviewer:pr-review` (Step 12), `code-reviewer:re-review` (Step 5)
- **Reads**: PR comment threads (for summary thread detection)
- **Writes**: PR inline comments, file comments, general comments, approval votes
- **References**: [Provider Resolution & Tool Mapping](../../references/provider-resolution.md),
  [Review Thread State Machine](../../references/review-thread-state-machine.md),
  [Output Format](../pr-review/reference/output-format.md)
