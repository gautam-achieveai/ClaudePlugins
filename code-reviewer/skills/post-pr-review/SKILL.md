---
name: post-pr-review
description: >
  Publish PR review results to Azure DevOps — posts findings as inline/file/general
  comments, posts context questions as inline `[QUESTION]` comments, manages the review
  summary thread (replies to existing thread instead of creating duplicates), and
  optionally approves or merges the PR. Use this skill when the pr-review workflow
  reaches Step 12 and needs to publish its collected findings, questions, and verdict
  to ADO. Also usable standalone for any workflow that needs structured comment posting
  to a PR. Trigger when: "post review results", "publish findings to PR", or when
  invoked from pr-review Step 12. NOT for analysis or grading — this skill only handles
  the publishing/posting workflow.
allowed-tools: mcp__azure-devops__*
---

# Post PR Review — Publish Results to Azure DevOps

Publish structured review results (findings, context questions, and summary) to an
Azure DevOps pull request. This skill owns the full "write to ADO" workflow — the
caller provides the data, this skill handles formatting, deduplication, thread
management, and posting.

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
| `prNumber` | integer | PR number in Azure DevOps |
| `repository` | string | Repository name (e.g., `MCQdb`) |
| `botPrefix` | string | Bot prefix for all comments (e.g., `[Gautam's bot]`) |
| `findings[]` | array | Graded findings from review — each with severity, blocker flag, category, file, line, issue, suggestion |
| `questions[]` | array | Context questions from Step 10 — each with file, line, uncertainty, what answering unlocks |
| `verdict` | enum | `APPROVE`, `APPROVE_WITH_COMMENTS`, or `REQUEST_CHANGES` |
| `reviewType` | enum | `initial` or `re-review` |
| `outputFormatMarkdown` | string | The formatted review summary markdown (from output-format.md template) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `project` | string | ADO project name (auto-detected from git remote if omitted) |
| `approveAfterPosting` | boolean | If `true` and verdict is APPROVE, approve the PR after posting. Default: `false` (confirm with user first) |
| `mergeAfterApproval` | boolean | If `true`, merge after approval. Default: `false` |
| `mergeStrategy` | enum | `squash`, `noFastForward`, `rebase`, `rebaseMerge`. Default: `squash` |

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
4. If validation fails → return error with specific missing/invalid fields

### Step 2: Detect Repository and Project

If `project` is not provided, auto-detect from git remote:

```bash
git remote get-url origin
```

Parse: `https://<org>.visualstudio.com/<project>/_git/<repository>`

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
   mcp__azure-devops__addPullRequestInlineComment
     repository: <repository>
     pullRequestId: <prNumber>
     path: /<file>
     position: { line: <line>, offset: 1 }
     comment: <formatted comment>
   ```

2. **File comment** (fallback) — when `Line` is null or inline fails:
   ```
   mcp__azure-devops__addPullRequestFileComment
     repository: <repository>
     pullRequestId: <prNumber>
     path: /<file>
     comment: <formatted comment>
   ```

3. **General comment** (last resort) — when file is not in PR diff:
   ```
   mcp__azure-devops__addPullRequestComment
     repository: <repository>
     pullRequestId: <prNumber>
     comment: <formatted comment>
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

**For each question in `questions[]`:**

```
mcp__azure-devops__addPullRequestInlineComment
  repository: <repository>
  pullRequestId: <prNumber>
  path: /<file>
  position: { line: <line>, offset: 1 }
  comment: <formatted question>
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
- Cap: if `questions[]` has more than 10 items, post the top 10 (highest review
  impact) and note the remainder in the summary

### Step 6: Manage Review Summary Thread

The review summary is the top-level overview of the entire review. To keep the PR
clean, we **reuse the existing summary thread** instead of creating new ones.

<summary_thread_management>
**Workflow:**

1. **Search for existing summary thread:**
   ```
   mcp__azure-devops__getPullRequestComments
     repository: <repository>
     pullRequestId: <prNumber>
   ```
   Scan all comment threads for a thread whose root comment contains BOTH:
   - The `botPrefix` (e.g., `[Gautam's bot]`)
   - A review summary heading: `# PR Review:` or `## Re-Review Summary:`

2. **If existing summary thread found → reply to it:**
   ```
   mcp__azure-devops__addPullRequestComment
     repository: <repository>
     pullRequestId: <prNumber>
     comment: <new summary markdown>
   ```
   Post the new summary as a **reply to the existing thread** using the thread ID.
   This keeps all review summaries in one conversation thread.

   **How to reply to an existing thread:**
   Use `getPullRequestComments` to find the thread ID of the existing summary.
   Then use `addPullRequestComment` — the ADO MCP tools handle thread replies
   when you reference the parent thread.

   **Note:** Do NOT close or resolve the old summary. The new reply supersedes it
   naturally. The thread stays Active until the PR is approved.

3. **If no existing summary thread → create new one:**
   ```
   mcp__azure-devops__addPullRequestComment
     repository: <repository>
     pullRequestId: <prNumber>
     comment: <summary markdown>
   ```
   Post as a new general comment. This becomes the summary thread for future
   re-reviews.

**Summary identification markers:**
- The summary MUST start with the `botPrefix` followed by a known heading
- Initial review heading: `# PR Review: <PR Title>`
- Re-review heading: `## Re-Review Summary: PR #<prNumber>`
- These markers are how future invocations find the thread to reply to
</summary_thread_management>

**Summary content:** Use the `outputFormatMarkdown` provided by the caller. Append
a questions summary section if any questions were posted:

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
mcp__azure-devops__approvePullRequest
  repository: <repository>
  pullRequestId: <prNumber>
```

**Merge** — only when ALL conditions are met:
1. PR is approved
2. `mergeAfterApproval` is `true` OR user explicitly confirms
3. User has confirmed merge strategy

```
mcp__azure-devops__mergePullRequest
  repository: <repository>
  pullRequestId: <prNumber>
  mergeStrategy: <mergeStrategy>
```

Always confirm merge strategy with the user:
- **squash** — for feature branches (default)
- **noFastForward** — for release branches

### Step 8: Return Confirmation

Return a structured confirmation to the caller:

```
## Post-PR-Review Complete

- **PR**: #<prNumber> in <repository>
- **Findings posted**: <count> (<critical> critical, <high> high, <medium> medium, <low> low)
- **Questions posted**: <count>
- **Summary**: <new thread | replied to existing thread #<threadId>>
- **Verdict**: <verdict>
- **Approved**: Yes / No
- **Merged**: Yes / No
- **Errors**: <any posting failures, with details>
```

## Error Handling

- **ADO MCP tools unavailable** → return error, suggest checking MCP configuration
- **Inline comment fails** → fall back to file comment → fall back to general comment
- **Summary thread search fails** → create new thread (safe fallback)
- **Approval fails** → report error but do NOT retry (may be policy-blocked)
- **Merge fails** → report error with details (likely policy or conflict)
- **Partial failure** → continue posting remaining items, report failures in confirmation

## ADO Comment Conventions

When referencing ADO entities in comments:
- Work items: `#12345` (hash prefix)
- Pull requests: `!4567` (exclamation prefix)
- **IMPORTANT**: `!` is for PRs, `#` is for work items/bugs

## Integration Points

- **Called by**: `code-reviewer:pr-review` (Step 12), `code-reviewer:re-review` (Step 5)
- **Reads**: PR comment threads (for summary thread detection)
- **Writes**: PR inline comments, file comments, general comments, approval votes
- **References**: [Review Thread State Machine](../../references/review-thread-state-machine.md),
  [Output Format](../pr-review/reference/output-format.md)
