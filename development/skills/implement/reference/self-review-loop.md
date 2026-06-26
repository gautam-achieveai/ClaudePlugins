# Self-Review Loop

Detailed mechanics for Phase 3 of `development:implement`. After all
implementation tasks are complete, the work is **not** done — every change must
pass an independent review of the whole diff against the purpose brief before it
can be verified and published.

Why a separate review (not just self-checking): a reviewer running in a fresh
context sees only the diff and the criteria — not the reasoning that produced the
change — so it evaluates the result on its own terms and catches what
self-justification misses.

<self_review>
Run a review-fix-recheck loop until the code is clean.

**Each cycle:**

1. **Review** — Invoke `code-reviewer:pr-review` in **local branch review mode**
   (no PR number — review the current branch against its base). This runs the
   full review: alignment with project patterns, code quality (SOLID, smells,
   duplication), security (OWASP), performance (N+1, memory), exception handling,
   test coverage, and temporary/debug artifacts — with severity-rated findings.

2. **Assess findings** — categorize each:
   - **Must fix** (HIGH / CRITICAL): bugs, security issues, missing tests for new
     behavior, incorrect exception handling, data-loss risks.
   - **Should fix** (MEDIUM): code-quality issues, missing edge-case tests,
     over-mocking, fragile tests, performance concerns.
   - **Skip** (LOW / informational): naming, style, docs — do **not** fix these
     here (chasing every nit leads to over-engineering). Check skipped items
     against the purpose brief: only act if they affect a consumer or correctness.

3. **Fix** — address all Must Fix and Should Fix findings. For each:
   - Make the change.
   - Run the build and tests to confirm it doesn't break anything (read output).
   - Check off any related tasks in `tasks.md`.

4. **Re-review** — run `code-reviewer:pr-review` again. Confirm prior findings are
   resolved and that the fixes introduced no new issues.

5. **Repeat or exit:**
   - New Must/Should findings → repeat the cycle.
   - Only LOW/informational remain → exit.
   - **Hard cap: 3 cycles.** After 3, proceed to Phase 4 regardless and log any
     remaining findings in the decision log.

**Log each cycle** to `decisions.md`:

```markdown
## Self-Review Cycle <N>
- Findings: <count> HIGH, <count> MEDIUM, <count> LOW
- Fixed: <list of fixes applied>
- Remaining: <deferred/skipped, with rationale tied to the purpose brief>
```
</self_review>
