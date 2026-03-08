# Re-Review / Update Workflow

When a PR was previously reviewed, the author pushed fixes, and the reviewer's vote was reset (e.g., "Vote of X was reset: Changes pushed to source branch"), the reviewer needs to focus on what changed since their last review — not re-review the entire PR.

## Step 1: Detect re-review context

- Call `mcp__azure-devops__getPullRequestComments` to check for existing review comments
- If previous review comments exist from this reviewer (or Claude), this is a re-review
- Extract the previous issue list (numbered issues with severities) from the last review summary comment
- Note which issues the author responded to (replies to review threads)

## Step 2: Find what changed since last review

- Use `mcp__azure-devops__getCommitHistory` to find commits pushed after the last review comment date
- Use `git log --after="<last-review-date>" origin/<source-branch>` locally to see new commits
- Use `git diff <last-review-commit>..<current-head>` to see ONLY the delta since last review
- **Critical difference from initial review**: diff against last-review-point, not merge-base

## Step 3: Build issue resolution tracker

Create a table tracking each previous issue:

```
| # | Previous Issue | Severity | Status | Evidence |
|---|---|---|---|---|
| 1 | MockDistributionMetricManager | CRITICAL | RESOLVED | Replaced with CachedDistributionMetricManager |
| 2 | Code duplication 400+ lines | HIGH | RESOLVED | Reduced via ProficiencyMapCalculator |
| 3 | No fallback mechanism | HIGH | RESOLVED | ExecuteWithFallbackAsync added |
| 4 | No automated tests | HIGH | WON'T FIX | Author: "Will follow up in separate PR" |
```

Status values: `RESOLVED`, `ACTIVE`, `WON'T FIX`

## Step 3.5: Satisfaction Check

For each thread in the tracker, verify the resolution using the delta diff and
the [Review Thread State Machine](../references/review-thread-state-machine.md):

**RESOLVED threads** — verify fix in the delta diff:
1. Find the code change that addresses the original finding
2. Confirm it actually fixes the issue (not just a cosmetic change)
3. Confirm no regressions were introduced
4. If the fix is good → use `updatePullRequestThread` to close the thread
5. If the fix is insufficient → reply with `replyToComment` explaining what is
   still wrong or missing. The thread stays Active.

<blocker_policy>
**WON'T FIX threads** — evaluate the developer's rationale:
1. Read the developer's `Won't Fix:` reply
2. For non-blocking items (no `[BLOCKER]` tag): accept if the rationale is reasonable → close
3. For `[BLOCKER]` items: accept only if the rationale is technically sound and
   the risk is mitigated → close. Otherwise, reply explaining why the rationale
   is insufficient and reopen.
4. For security `[BLOCKER]` items: default is to reopen unless the justification
   is compelling. Security issues require the highest bar for Won't Fix.
</blocker_policy>

**ACTIVE threads** — escalate:
1. Reply with `replyToComment`: "This issue is still outstanding — please address
   or provide a rationale for Won't Fix."
2. The thread stays Active.

## Step 4: Review only the delta

- Run the same domain-specific agents (step 7) but ONLY on files changed since last review
- Focus on: Did the fix actually address the issue? Did the fix introduce new issues?
- Look for regressions: Did fixing issue A break something else?

## Step 5: Post re-review summary

Use a structured format:

```markdown
## Re-Review Summary: PR #XXXX

### Previous Issues Resolution Status
| # | Issue | Severity | Resolution |
|---|---|---|---|

### New Issues Found (in updated code)
#### [SEVERITY] - [Issue Title]
...

### Verdict
APPROVE / APPROVE WITH COMMENTS / REQUEST CHANGES (still)
```

## Re-review rules

<re_review_rules>
- **Max 3 re-review iterations** — after 3 re-review cycles, post a final summary and stop. If issues remain, note them as unresolved in the summary.
- **Don't re-litigate resolved issues** — if the author fixed it, acknowledge and move on
- **Track DEFERRED items** — note them as "acknowledged, not blocking" but keep them visible
- **Focus on the delta** — only flag new issues in the updated code
- **When author replies "won't fix" with valid reasoning** — respect it and note as WONTFIX
- **Call out NEW issues** — clearly distinguish new findings from previous ones
</re_review_rules>
