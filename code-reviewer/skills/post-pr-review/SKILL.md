---
name: post-pr-review
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
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
| `findings[]` | array | Graded findings from review — each with severity, blocker flag, category, file, line, issue, suggestion |
| `questions[]` | array | Context questions from Step 10 — each with file, line, uncertainty, what answering unlocks |
| `verdict` | enum | `APPROVE`, `APPROVE_WITH_COMMENTS`, or `REQUEST_CHANGES` |
| `reviewType` | enum | `initial` or `re-review` |
| `outputFormatMarkdown` | string | The formatted review summary markdown (from output-format.md template) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `project` | string | ADO project name, or GitHub `owner` (auto-detected from git remote if omitted) |
| `approveAfterPosting` | boolean | If `true` and verdict is APPROVE, approve the PR after posting. Default: `false` (confirm with user first) |
| `mergeAfterApproval` | boolean | If `true`, merge after approval. Default: `false` |
| `mergeStrategy` | enum | `squash`, `noFastForward`, `rebase`, `rebaseMerge`. Default: `squash` |
| `isSmallDelta` | boolean | When `true`, the caller is posting a trivial re-review delta and the summary must use small-delta mode. Default: `false` |
| `smallDeltaSummary` | string | Required when `isSmallDelta` is `true`. A 1-3 sentence delta-only summary reply |

### Finding Format

Each item in `findings[]` must have:

```
- Severity: CRITICAL | HIGH | MEDIUM | LOW
- Blocker: true | false
- Category: string (e.g., "Security", "Performance", "Code Quality")
- File: string (path relative to repo root)
- Line: integer (1-based line number, or null for file-level)
- Issue: string (description of the problem)
- Suggestion: string (proposed fix with code example)
```

### Question Format

Each item in `questions[]` must have:

```
- File: string (path relative to repo root)
- Line: integer (1-based line number)
- CodeContext: string (the code snippet that triggered the question)
- Uncertainty: string (what the reviewer cannot determine)
- WhatAnsweringUnlocks: string (what the reviewer could assess with an answer)
- SuggestedAnswers: string[] (optional — 2-3 possible answers to guide the author)
```

## Workflow

### Step 1: Validate Inputs

1. Verify all required fields are present and non-empty
2. Verify `findings[]` items have the required structure
3. Verify `questions[]` items have the required structure
4. If `isSmallDelta` is `true`, verify `reviewType` is `re-review`,
   `smallDeltaSummary` is present, and the summary is no longer than 3 sentences
5. If validation fails → return error with specific missing/invalid fields

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

When multiple agents flag the same issue (same file + same line range + similar
description), keep the more detailed version and discard the duplicate.

**Deduplication rules:**
- Same file + overlapping line range + similar category → keep the one with more
  detail in the suggestion
- If one finding has a code example and the other doesn't → keep the one with
  the code example
- If both are equally detailed → keep the one with higher severity

### Step 4: Post Finding Comments

Post findings in priority order (most severe first):

1. **CRITICAL findings** → post first
2. **HIGH findings** → post second
3. **MEDIUM findings** → post third
4. **LOW findings** → post last (only if total findings ≤ 20; otherwise skip LOW
   and note count in summary)

**For each finding, select the comment type:**

1. **Inline comment** (preferred) — when `Line` is not null:
   ```
   # Azure DevOps
   mcp__azure-devops__addPullRequestInlineComment
     repository: <repository>
     pullRequestId: <prNumber>
     path: /<file>
     position: { line: <line>, offset: 1 }
     comment: <formatted comment>

   # GitHub (gh CLI; commit_id = PR head SHA from `gh pr view <n> --json headRefOid`)
   gh api repos/<owner>/<repo>/pulls/<prNumber>/comments \
     -f body=<formatted comment> -f commit_id=<headSha> \
     -f path=<file> -F line=<line> -f side=RIGHT
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
```
<botPrefix> [BLOCKER] **<Severity>** (<Category>)

<Issue description>

**Suggestion:** <Suggestion with code example>
```

For non-blocking findings:
```
<botPrefix> **<Severity>** (<Category>)

<Issue description>

**Suggestion:** <Suggestion with code example>
```

**Blocker classification** (from [Review Thread State Machine](../../references/review-thread-state-machine.md)):
- **BLOCKER** (tag required): Bug/correctness, security vulnerability, significant design issue,
  significant simplification, data loss risk, user-visible performance issue
- **Non-blocking** (no tag): Style, minor suggestions, informational, documentation,
  minor performance, alternative approaches

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

**Reuse already-fetched comments:** If PR comment threads were already fetched
earlier in this workflow (e.g., by Step 4's finding dedup or any prior step),
reuse that data — do NOT call `getPullRequestComments` again. Only fetch if no
prior step has retrieved comments yet:

```
# Azure DevOps
mcp__azure-devops__getPullRequestComments
  repository: <repository>
  pullRequestId: <prNumber>

# GitHub
gh api repos/<owner>/<repo>/pulls/<prNumber>/comments      # inline/review threads
gh api repos/<owner>/<repo>/issues/<prNumber>/comments     # general comments
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

# GitHub
gh api repos/<owner>/<repo>/pulls/<prNumber>/comments \
  -f body=<formatted question> -f commit_id=<headSha> \
  -f path=<file> -F line=<line> -f side=RIGHT
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
- Each question is a separate comment thread (one question per comment)
- If the line is not in the diff, fall back to file comment, then general comment
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

   **Reuse already-fetched comments:** If Step 5a already fetched PR comment
   threads, reuse that cached data — do NOT call `getPullRequestComments` again.
   Only fetch if Step 5 was skipped (no questions to post):

   ```
   # Azure DevOps
   mcp__azure-devops__getPullRequestComments
     repository: <repository>
     pullRequestId: <prNumber>

   # GitHub
   gh api repos/<owner>/<repo>/issues/<prNumber>/comments
   ```
   Scan all comment threads for a thread whose root comment contains BOTH:
   - The `botPrefix` (e.g., `[<reviewer>'s bot]`)
   - A review summary heading: `# PR Review:` or `## Re-Review Summary:`

2. **If existing summary thread found → reply to it:**
   ```
   # Azure DevOps
   mcp__azure-devops__addPullRequestComment
     repository: <repository>
     pullRequestId: <prNumber>
     comment: <new summary markdown>

   # GitHub — reply in the existing review thread
   gh api repos/<owner>/<repo>/pulls/<prNumber>/comments/<rootCommentId>/replies \
     -f body=<new summary markdown>
   ```
   Post the new summary as a **reply to the existing thread** using the thread ID
   (ADO) or the root comment ID (GitHub/GH). This keeps all review summaries in one
   conversation thread.

   **How to reply to an existing thread:**
   - **Azure DevOps:** use `getPullRequestComments` to find the thread ID of the
     existing summary, then `addPullRequestComment` — the ADO MCP tools handle
     thread replies when you reference the parent thread.
   - **GitHub:** capture the root comment's `id` when scanning threads, then POST
     to `.../pulls/<prNumber>/comments/<id>/replies`. (For a summary posted as a
     general issue comment, post a new `gh pr comment` referencing the prior one.)

   **Note:** Do NOT close or resolve the old summary. The new reply supersedes it
   naturally. The thread stays Active until the PR is approved.

3. **If no existing summary thread → create new one:**
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
- These markers are how future invocations find the thread to reply to
</summary_thread_management>

<small_delta_summary>
If `reviewType` is `re-review` and `isSmallDelta` is `true`:
- Reply on the existing summary thread when one exists.
- Use `smallDeltaSummary` as the entire comment body.
- Keep the reply to 1-3 sentences.
- Cover only the incremental delta.
- Do NOT repeat previously verified claims or re-render prior tables.
- Do NOT restate the verdict unless it changed.
- If no existing summary thread is found, create a new general comment with the
  same short `smallDeltaSummary`.
</small_delta_summary>

**Summary content selection:**
- If small-delta mode applies, post `smallDeltaSummary`.
- Otherwise use the `outputFormatMarkdown` provided by the caller. Append a
  questions summary section if any questions were posted:

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
1. Verdict is `APPROVE`
2. `approveAfterPosting` is `true` OR user explicitly confirms
3. No `[BLOCKER]` findings exist

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
- **Summary**: <new thread | replied to existing thread #<threadId>>
- **Verdict**: <verdict>
- **Approved**: Yes / No
- **Merged**: Yes / No
- **Errors**: <any posting failures, with details>
```

## Error Handling

- **Provider tooling unavailable** (ADO MCP, or GitHub MCP / `gh` CLI) → use `ado:setup-ado-mcp` or `gh:setup-gh-mcp` and retry; if still failing, return error suggesting a config / `gh auth` check
- **Inline comment fails** → fall back to file comment → fall back to general comment
- **Summary thread search fails** → create new thread (safe fallback)
- **Approval fails** → report error but do NOT retry (may be policy-blocked)
- **Merge fails** → report error with details (likely policy or conflict)
- **Partial failure** → continue posting remaining items, report failures in confirmation

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
