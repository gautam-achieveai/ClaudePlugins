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

<severity_enforcement>
**WON'T FIX threads** — evaluate by severity:

The guardian does not let CRITICAL, HIGH, or MEDIUM issues slide. The developer's
reply must be **satisfactory** — meaning it proves the finding was wrong, or
demonstrates the risk is fully mitigated. "Will fix later" is not satisfactory.

**CRITICAL — Won't Fix is almost never acceptable:**
- Accept ONLY if the developer proves the finding is factually incorrect (the
  code path is unreachable, the reviewer misread the code, a test already
  covers the scenario)
- "Out of scope", "will fix later", or a deferred work item are NOT acceptable
- If the rationale does not prove the finding wrong → reopen (thread returns to ACTIVE state)

**HIGH — Requires strong technical justification:**
- The developer must provide specific technical reasoning showing why the issue
  does not apply or is already mitigated in this PR
- A deferred work item is acceptable ONLY if the risk is mitigated in this PR
  (guard clause, feature flag, documented known limitation)
- "Will fix in follow-up" without mitigation → reopen

**MEDIUM — Requires reasonable technical rationale:**
- The developer must explain why the suggestion doesn't apply or would be
  net-negative for the codebase
- A deferred work item with brief justification is acceptable
- Bare "won't fix" or "style preference" without reasoning → reopen

**LOW — Accept readily:**
- Any reasonable one-line explanation suffices → close

**Security issues (any severity) — strictest bar:**
- Always reopen unless the developer proves the finding is factually incorrect
- "Out of scope" is never acceptable for security findings
</severity_enforcement>

**ACTIVE threads** (no developer reply at all) — escalate:
1. Reply with `replyToComment`: "This issue is still outstanding — please address
   or provide a rationale for Won't Fix."
2. The thread stays Active.

## Step 4: Review only the delta

- Run the same domain-specific agents (step 7) but ONLY on files changed since last review
- Focus on: Did the fix actually address the issue? Did the fix introduce new issues?
- Look for regressions: Did fixing issue A break something else?

## Step 5: Post re-review summary

<verdict_gate>
**Before determining the verdict, apply the unresolved gate:**

If ANY CRITICAL, HIGH, or MEDIUM thread is still ACTIVE (unresolved or Won't Fix
rejected) → the verdict MUST be **REQUEST CHANGES**. No exceptions. The guardian
does not approve PRs with unresolved substantive issues regardless of how many
iterations have passed or how long the PR has been open.

Only when every CRITICAL, HIGH, and MEDIUM thread is satisfactorily resolved or
has an accepted Won't Fix rationale (meeting the severity bar above) can the
verdict be APPROVE or APPROVE WITH COMMENTS.

The verdict is the MORE restrictive of:
- The unresolved gate result (from CRITICAL/HIGH/MEDIUM thread status)
- The delta review result (new issues found in Step 4)
</verdict_gate>

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

### Unresolved Issues Blocking Approval (if any)
- [List each CRITICAL/HIGH/MEDIUM thread still active]
```

## Re-review rules

<re_review_rules>
- **Max 5 re-review iterations** — after 5 re-review cycles, post a final summary and stop. If CRITICAL/HIGH/MEDIUM issues remain, the final verdict is still REQUEST CHANGES — iteration count does not reduce severity or lower the bar.
- **Don't re-litigate resolved issues** — if the author fixed it, acknowledge and move on
- **Track DEFERRED items** — note them as "acknowledged, not blocking" but keep them visible, ask to open bug or work item for it. 
- **Focus on the delta** — only flag new issues in the updated code
- **Won't Fix must meet the severity bar** — evaluate the developer's rationale
  against the finding's severity tier (see Satisfaction Check). CRITICAL and HIGH
  Won't Fix replies are challenged by default. Only accept when the developer
  proves the finding was wrong or the risk is fully mitigated in this PR.
- **Don't lower the bar over iterations** — the third re-review applies the same
  standards as the first. Time pressure and iteration count are not reasons to
  accept unresolved CRITICAL/HIGH/MEDIUM issues.
- **Call out NEW issues** — clearly distinguish new findings from previous ones
- **Post summary in same thread** — always reply to the last review comment, no need to add new threads. Resolve this thread if all issues are resolved.
- **DO NOT POST** anything if nothing changed in the PR since last review.
</re_review_rules>
