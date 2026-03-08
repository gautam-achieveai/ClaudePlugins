# Output Format

Present findings in severity-grouped format:

```markdown
# PR Review: [Title]

## Summary
- Total files reviewed: X
- Findings: X Critical, X High, X Medium, X Low
- Test coverage: adequate / needs improvement / missing
- Domain areas touched: [NScript Client, Server, Orleans, Tests, etc.]
- Branch convention: OK / non-conforming

## Strengths
What was done well (with file:line references)

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

## Testing Assessment
Coverage gaps, suggested tests, missing test project mappings

## Security Review
OWASP issues found (if any)

## Recommendations
Specific, actionable improvements

## Verdict
**APPROVE** / **APPROVE WITH COMMENTS** / **REQUEST CHANGES**
- APPROVE — No Critical or High issues, few or no Medium issues
- APPROVE WITH COMMENTS — No Critical issues, some High/Medium issues that should be addressed
- REQUEST CHANGES — Any Critical issues, or multiple High issues that must be fixed
```

## Remember

**Goal:** Catch bugs before production, improve code quality, share knowledge, maintain standards

**Focus on:**

1. **Correctness** (bugs, security)
2. **Maintainability** (future developers)
3. **Performance** (user experience)
4. **Testing** (confidence in changes)

Be thorough but pragmatic. **Be specific, actionable, balanced, and professional.**
