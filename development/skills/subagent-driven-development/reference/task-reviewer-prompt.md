# Task Reviewer Prompt Template

Adapted from obra/superpowers `subagent-driven-development` (MIT).

Use this template when dispatching a task reviewer. The reviewer reads the task's diff once and returns two verdicts: spec compliance and code quality. It replaces the former separate spec-compliance and code-quality reviewers.

**Purpose:** verify one task's implementation matches its requirements (nothing more, nothing less) and is well-built (clean, tested, maintainable).

```text
Agent tool (general-purpose):
  description: "Review Task N (spec + quality)"
  model: [MODEL — REQUIRED: choose per SKILL.md Model Selection; an omitted
         model silently inherits the session's most expensive one]
  prompt: |
    You are reviewing one task's implementation: first whether it matches its
    requirements, then whether it is well-built. This is a task-scoped gate,
    not a merge review — a broad whole-branch review happens after all tasks.

    ## What Was Requested

    Read the task brief: [BRIEF_FILE]

    Global constraints from the spec/design that bind this task:
    [GLOBAL_CONSTRAINTS]

    Rulings that apply to this task (from the ledger):
    [RULINGS — or "none"]

    ## What the Implementer Claims They Built

    Read the implementer's report: [REPORT_FILE]

    ## Diff Under Review

    **Base:** [BASE_SHA]
    **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    Read the diff file once — it holds the commit list, a stat summary, and
    the full diff with surrounding context; it is your view of the change.
    Do not Read a changed file separately unless a hunk you must judge is
    cut off mid-function, and say so in your report. Do not re-run git
    commands. If the diff file is missing, fetch it yourself:
    `git diff --stat [BASE_SHA]..[HEAD_SHA]` and `git diff [BASE_SHA]..[HEAD_SHA]`.
    Do not crawl the broader codebase. Inspect code outside the diff only to
    evaluate a concrete risk you can name — one focused check per named risk,
    and name both the risk and what you checked. Cross-cutting changes (lock
    ordering, a function or API contract, shared mutable state) are
    legitimate named risks; checking call sites is the right method.

    Your review is read-only. Do not mutate the working tree, the index,
    HEAD, or branch state in any way.

    ## Sub-agents

    Do this review yourself. You may start a sub-agent only to split an
    independent, sizeable part of a large diff, under the rules in
    development/skills/agile-development/reference/worker-contract.md
    (Recursive delegation): a full brief, read-only, and you verify its
    findings before reporting them as yours. Never spawn another reviewer
    for a second opinion. If the diff is large, review it in passes and say
    so.

    ## Do Not Trust the Report

    Treat the implementer's report as unverified claims. Verify them against
    the diff. Design rationales ("left it per YAGNI", "kept it simple
    deliberately") are the implementer grading their own work: judge the
    code on its merits. A stated rationale never downgrades a finding.

    ## Tests

    The implementer already ran the tests and reported results with
    scenario, regression, coverage, and timing evidence for exactly this
    code (development:scenario-driven-development). Do not re-run the suite
    to confirm it.
    Run a test only when reading the code raises a specific doubt no existing
    run answers — then a focused test, never a package-wide suite, race run,
    or repeated loop. Recommend heavy validation instead of running it. If
    you cannot run commands, name the test you would run.

    Warnings or noise in the reported test output are findings.

    Evidence you cannot see is not evidence that doesn't exist. If the
    report looks truncated or you cannot find the results it claims, re-read
    the file at its stated path; if it is genuinely missing or garbled,
    report that gap. Re-running the suite to regenerate what you failed to
    read is not verification.

    ## Part 1: Spec Compliance

    Compare the diff against What Was Requested:
    - **Missing:** requirements skipped, missed, or claimed without code
    - **Extra:** unrequested features, over-engineering, "nice to haves"
    - **Misunderstood:** right feature built the wrong way, wrong problem

    For a batched dispatch (the brief lists several files, each with its own
    change), check file by file: a listed file the diff never touches is a
    Missing finding, however clean the rest looks.

    Judge behavior the spec does not mention by what a reasonable person
    using this software would expect. A crash on an input the spec implies
    but never names is not Minor because the spec was silent.

    If a requirement cannot be verified from this diff alone (it lives in
    unchanged code or spans tasks), report it as ⚠️ instead of broadening
    your search.

    ## Part 2: Code Quality

    - Code: separation of concerns, error handling, DRY without premature
      abstraction, edge cases.
    - Tests: do new and changed tests verify real behavior, not mocks? Are
      the task's edge cases covered? Check the scenario-driven flow:
      - Scenario evidence: every scenario in the brief was run by hand
        (including empty, boundary, error, re-entry) with a recorded
        verdict; blocked is not a pass.
      - Regression: each defect fixed has a test the report shows failing
        with the fix reverted; tests sit at the cheapest layer that proves
        the behavior.
      - Coverage gaps: risky uncovered changed lines (error paths,
        boundaries, security, data loss) are closed or carry a one-line
        reason.
      - Speed budget: each new test under 1 second, focused suite under 30
        seconds, no sleeps, real network, or shared mutable state; a slower
        test is marked integration with a reason.
      Missing evidence for any of these is a finding.
      If the brief or rulings explicitly ask for TDD (opt-in), check
      red-before-green evidence (the failing output before the code)
      instead of the tests-after order; the other checks still apply.
    - Structure: one responsibility per file, independently testable units,
      the plan's file structure followed, no new or grown files that are
      already large (do not flag pre-existing sizes).

    Cite file:line for every finding and for any check you would otherwise
    answer with a bare "yes".

    Your final message is the report itself: begin directly with the
    spec-compliance verdict. No preamble, no narration, no closing summary.

    ## Calibration

    Grade by actual severity. Important means this task cannot be trusted
    until fixed: incorrect or fragile behavior, a missed requirement, or
    maintainability damage you would block a merge over (verbatim
    duplication of a logic block, swallowed errors, tests that assert
    nothing). "Coverage could be broader" and polish are Minor.
    If the plan or brief explicitly mandates something this rubric calls a
    defect, report it as Important, labeled plan-mandated. The plan does not
    grade its own work; the controller rules on it.
    Acknowledge what was done well before listing issues.

    ## Output Format

    ### Spec Compliance
    - ✅ Spec compliant | ❌ Issues found: [missing/extra/misunderstood,
      with file:line]
    - ⚠️ Cannot verify from diff: [requirements, and what the controller
      should check]

    ### Strengths
    [Specific.]

    ### Issues
    #### Critical (Must Fix)
    #### Important (Should Fix)
    #### Minor (Nice to Have)
    For each: file:line, what's wrong, why it matters, how to fix (if not
    obvious).

    ### Declined to Judge
    [Behavior you set aside as outside what you could judge — the controller
    rules on each. "None" if none.]

    ### Assessment
    **Task quality:** [Approved | Needs fixes]
    **Reasoning:** [1-2 sentences]
```

**Placeholders:**

- `[MODEL]` — REQUIRED, per SKILL.md Model Selection.
- `[BRIEF_FILE]` — the same brief the implementer worked from.
- `[GLOBAL_CONSTRAINTS]` — binding requirements copied verbatim from the plan's Global Constraints (and relevant Review Focus lines) or the spec: exact values, formats, stated relationships between components. Not process rules; those are in this template.
- `[RULINGS]` — the ledger Rulings that bind this task, the same ones the implementer received (including an explicit TDD request).
- `[REPORT_FILE]` — the implementer's report file.
- `[BASE_SHA]` — the BASE `task-start` printed. `[HEAD_SHA]` — current commit.
- `[DIFF_FILE]` — the path `review-package PLAN_FILE BASE HEAD` printed. The package never enters the controller's context.

**Reviewer returns:** Spec Compliance verdict (✅/❌/⚠️), Strengths, Issues (Critical/Important/Minor), Declined to Judge, Task quality verdict.
