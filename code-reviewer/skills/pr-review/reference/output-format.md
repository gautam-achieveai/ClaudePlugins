# Output Format

Present findings in severity-grouped format:

````markdown
# PR Review: [Title]

## Review Intent

Persist this complete object unchanged unless authoritative PR/work-item context
changes. Use empty arrays rather than omitting fields.

```json
{
   "statedProblem": "...",
   "acceptanceCriteria": ["..."],
   "explicitNonGoals": ["..."],
   "deliveredApproach": "...",
   "goalCoverage": "SOLVED",
   "solutionDirection": "RIGHT_BALLPARK",
   "evidence": ["..."]
}
```

## Summary
- Goal coverage rationale: [brief evidence]
- Solution direction rationale: [brief evidence]
- Total files reviewed: X
- Findings: X Critical, X High, X Medium, X Low
- Blockers: X
- Context questions: X (non-blocking clarifications asked)
- Test coverage: adequate / needs improvement / missing
- Domain areas touched: [NScript Client, Server, Orleans, Tests, etc.]
- Branch convention: configured OK / non-conforming / not configured / question asked

## Strengths
Genuinely good patterns worth noting (with file:line references).
Only include if there are real strengths — do not manufacture praise.

## Critical Issues
| # | File | Line | Blocker? | Issue / Why It Matters | Required Outcome | Done When |
|---|---|---|---|---|---|---|

## High Issues
| # | File | Line | Blocker? | Issue / Why It Matters | Required Outcome | Done When |
|---|---|---|---|---|---|---|

## Medium Issues
| # | File | Line | Blocker? | Issue / Why It Matters | Required Outcome | Done When |
|---|---|---|---|---|---|---|

## Optional Follow-up

Non-blocking Medium/Low ideas that may improve the code but do not require a
response, another review cycle, or inclusion in this PR.

| # | File | Line | Observation | Suggested Path |
|---|---|---|---|---|

## Context Questions (non-blocking)

Areas where the reviewer needs clarification to make a confident assessment.
These do NOT affect the verdict — they are posted as separate `[QUESTION]`
inline comments for the PR author to answer.

| # | File | Line | Question | What Answering Unlocks |
|---|------|------|----------|------------------------|

## Testing Assessment
Coverage gaps, suggested tests, missing test project mappings

## Security Review
OWASP issues found (if any)

## Shortest Path to Approval

Include only when the verdict is `REQUEST_CHANGES`. List blockers in priority
order using their stable closure contracts:

1. [Required outcome] — done when [objective evidence]
2. [...]

## Maintainer Decision Required

Include only `HANDOFF_REQUIRED` blockers. State the evidence and decision owner;
do not add another AI fix suggestion.

<details>
<summary>Review state (machine-readable)</summary>

## Active Review Threads

Persist every non-terminal bot-owned finding thread and every new finding to
post. The posting skill updates provider IDs/statuses and resets successful
actions to `NONE` before writing this canonical summary.

```json
[
  {
    "findingId": "F-001",
    "threadId": "provider-id-or-null",
    "status": "ACTIVE",
    "blocker": true,
    "authorAttemptCount": 1,
    "lastAuthorAttemptCommit": "abc123-or-null",
    "pendingAction": "NONE",
      "actionId": null,
      "lastCompletedActionId": "F-001:REPLY:abc123:1",
    "requiredOutcome": "...",
    "doneWhen": "...",
    "evidence": "..."
  }
]
```

## Closed Thread Archive

```json
{
   "closedThreadArchiveOmittedCount": 0,
   "closedThreadArchive": [
      {
         "findingId": "F-000",
         "threadId": "provider-id",
         "status": "CLOSED",
         "blocker": false,
         "closedAt": "2026-08-06T12:00:00Z",
         "lastCompletedActionId": "F-000:CLOSE:def456:0"
      }
   ]
}
```

</details>

## Verdict
**APPROVE** / **APPROVE_WITH_COMMENTS** / **REQUEST_CHANGES**
- APPROVE — Stated problem solved, solution in the right ballpark, no blockers,
   and no substantive follow-up
- APPROVE_WITH_COMMENTS — Stated problem solved, solution in the right ballpark,
   no blockers, and useful optional feedback remains
- REQUEST_CHANGES — Stated problem not solved, solution fundamentally
   misaligned, or one or more evidence-backed blockers remain
````

## Remember

**Goal:** Help the developer land a solution that addresses the PR's stated
problem while protecting the codebase from material risk. Be ruthless about
real blockers and equally ruthless about keeping preferences, perfection, and
unrelated cleanup from creating extra review cycles.

**Focus on:**

1. **Correctness** (bugs, security — the code must be right)
2. **Maintainability** (future developers inherit what merges today)
3. **Performance** (problems compound — an N+1 in a hot path today is a P1 next quarter)
4. **Testing** (untested code is unverified code — it's a liability, not an asset)
5. **Convergence** (stable required outcomes, objective closure checks, no moved goalposts)

Be thorough and direct. **Be specific, actionable, and honest.** Acknowledge
good work when it is genuinely good. Separate severity from blocker status and
accept any safe implementation that meets the required outcome.

### Claim-Strength Discipline

When proposing doc changes or prescriptive fixes:

1. If a finding enumerates N instances, verify the corrective wording holds for
   each instance before recommending a universal rule.
2. `only`, `all`, `always`, `never`, and `every` require exhaustive-search
   evidence. If evidence is scope-limited, say "in the searched scope..." and
   name the scope.
3. Do not use the same pattern in your own verified evidence that you are
   telling the author to avoid.
