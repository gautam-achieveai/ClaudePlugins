# Scoped Re-Review Prompt Template

Adapted from obra/superpowers `subagent-driven-development` (MIT).

Use this template when dispatching a re-review after a fix round (task loop or final-review fix wave). The re-reviewer verifies the findings were addressed and checks the fix diff for new breakage. It is not a fresh review — the full review already happened.

```text
Agent tool (general-purpose):
  description: "Re-review Task N fix round R"
  model: [MODEL — REQUIRED: choose per SKILL.md Model Selection; an omitted
         model silently inherits the session's most expensive one]
  prompt: |
    You are re-reviewing one task's fix round. A previous review produced
    findings; an implementer attempted to fix them. Verdict each finding and
    inspect the fix diff — nothing else.

    ## The Task

    Read the task brief: [BRIEF_FILE]

    ## The Findings Under Verification

    [FINDINGS]

    ## The Fix

    Read the implementer's report (fix reports are appended at the end):
    [REPORT_FILE]

    **Fix base:** [FIX_BASE_SHA] (the head the previous review saw)
    **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    Read the diff file once — fix commits, stat summary, and the fix diff
    with context. Do not re-run git commands. If the diff file is missing:
    `git diff --stat [FIX_BASE_SHA]..[HEAD_SHA]` and
    `git diff [FIX_BASE_SHA]..[HEAD_SHA]`.

    Your review is read-only. Do not mutate the working tree, the index,
    HEAD, or branch state in any way.

    ## Sub-agents

    Do this re-review yourself. Never spawn another reviewer for a second
    opinion. A fix diff is small by design; if it is not, review it in
    passes and say so.

    ## Scope

    Your scope is the findings list and the fix diff. Verdict every finding.
    Inspect the fix diff for problems the fix itself introduced. Do NOT
    re-review code the fix did not touch: an issue entirely outside the fix
    diff goes under Out-of-Scope Observations — it does not block this task
    and does not extend the loop.

    ## Tests

    The implementer re-ran the tests covering the amended code and appended
    the results. Treat the report as unverified claims: confirm the fix
    report names the covering tests and shows their output, and verify the
    claims against the diff. Do not re-run the suite. Run a test only when
    the code raises a specific doubt no existing run answers — a focused
    test, never a package-wide suite.

    ## Output Format

    Your final message is the report itself: begin directly with the first
    finding's verdict. No preamble, no narration.

    ### Finding Verdicts
    For each finding, in order:
    - **[finding one-liner]** — ADDRESSED | NOT ADDRESSED, with file:line
      evidence. "Attempted" is not addressed: the defect must no longer exist.

    ### New Breakage in the Fix Diff
    Severity (Critical/Important/Minor) and file:line. "None" if clean.

    ### Out-of-Scope Observations
    Non-blocking; the controller ledgers these for the final review. "None"
    if none.

    ### Verdict
    **Fix round:** [All findings addressed, no new Critical/Important
    breakage | Findings remain open] — list the open ones.
```

**Placeholders:**

- `[MODEL]` — REQUIRED, per SKILL.md Model Selection; small fix diffs take a cheap-to-standard tier.
- `[BRIEF_FILE]` — the same brief the implementer worked from.
- `[FINDINGS]` — the open Critical/Important findings and spec gaps from the previous review, verbatim, one per bullet.
- `[REPORT_FILE]` — the implementer's report file (fix reports appended).
- `[FIX_BASE_SHA]` — the head the previous review saw. `[HEAD_SHA]` — current commit.
- `[DIFF_FILE]` — the path `review-package PLAN_FILE FIX_BASE HEAD` printed.

**Re-reviewer returns:** per-finding verdicts (ADDRESSED / NOT ADDRESSED), new breakage in the fix diff, out-of-scope observations, and a round verdict.
