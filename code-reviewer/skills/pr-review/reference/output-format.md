# Output Format

Present findings in severity-grouped format:

```markdown
# PR Review: [Title]

## Summary
- Total files reviewed: X
- Findings: X Critical, X High, X Medium, X Low
- Context questions: X (non-blocking clarifications asked)
- Test coverage: adequate / needs improvement / missing
- Domain areas touched: [NScript Client, Server, Orleans, Tests, etc.]
- Branch convention: OK / non-conforming

## Strengths
Genuinely good patterns worth noting (with file:line references).
Only include if there are real strengths — do not manufacture praise.

## Critical Issues
| # | File | Line | Blocker? | Issue | Fix |
|---|---|---|---|---|---|

## High Issues
| # | File | Line | Blocker? | Issue | Fix |
|---|---|---|---|---|---|

## Medium Issues
| # | File | Line | Blocker? | Issue | Fix |
|---|---|---|---|---|---|

## Low Issues
| # | File | Line | Blocker? | Issue | Fix |
|---|---|---|---|---|---|

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

## Recommendations
Specific, actionable improvements

## Verdict
**APPROVE** / **APPROVE WITH COMMENTS** / **REQUEST CHANGES**
- APPROVE — No Critical/High/Medium issues, code genuinely improves the codebase
- APPROVE WITH COMMENTS — No Critical/High issues, some Medium/Low issues that are non-blocking but should be addressed
- REQUEST CHANGES — Any Critical/High issues, or a pattern of Medium issues that collectively indicate quality slippage
```

## Remember

**Goal:** Guard the codebase — catch bugs before production, prevent quality
erosion, ensure every merge leaves the codebase better than or equal to before.

**Focus on:**

1. **Correctness** (bugs, security — the code must be right)
2. **Maintainability** (future developers inherit what merges today)
3. **Performance** (problems compound — an N+1 in a hot path today is a P1 next quarter)
4. **Testing** (untested code is unverified code — it's a liability, not an asset)
5. **Pattern integrity** (bad patterns get copied — one bad example becomes ten)

Be thorough and direct. **Be specific, actionable, and honest.** Acknowledge
good work when it's genuinely good. Do not soften findings — a clear finding
now prevents a production incident later.
