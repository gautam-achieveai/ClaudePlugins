# Implementer Subagent Prompt Template

Adapted from obra/superpowers `subagent-driven-development` (MIT).

Use this template when dispatching an implementer subagent. It carries the eight brief parts of [`development/skills/agile-development/reference/worker-contract.md`](../../agile-development/reference/worker-contract.md) and that contract's handoff shape.

```text
Agent tool (general-purpose):
  description: "Implement Task N: [task name]"
  model: [MODEL — REQUIRED: choose per SKILL.md Model Selection; an omitted
         model silently inherits the session's most expensive one]
  prompt: |
    You are implementing Task N: [task name]

    ## Goal

    [One sentence of user-visible outcome, and one line on where this task
    fits in the project.]

    ## Inputs

    Read your task brief first: [BRIEF_FILE]
    It is your requirements, with the exact values to use verbatim.

    Interfaces and decisions from earlier tasks the brief cannot know:
    [INTERFACES — or "none"]

    Rulings that apply to this task (from the ledger):
    [RULINGS — or "none"]

    ## Owned Artifacts

    You may write only: [FILES — from the brief's Files / Interfaces]
    Everything else is read-only. Other workers may share this repository;
    preserve changes you did not make.

    ## Acceptance

    [Criteria and the evidence that proves each — normally the brief's tests
    and Expected outputs.]

    ## Out of Scope

    [Named exclusions.]

    ## Stop Condition

    Return when the acceptance criteria are met with evidence, or as soon
    as you are BLOCKED or NEEDS_CONTEXT (see below).

    ## Before You Begin

    If you have questions about the requirements, the approach, dependencies,
    or anything unclear in the brief, **ask them now.**

    ## Your Job

    1. Implement exactly what the brief specifies
    2. Test it per development:scenario-driven-development:
       a. Run each scenario by hand through a real entry point (entry →
          action → result → destination → aftermath, plus empty, boundary,
          error, re-entry). Record pass / fail / blocked with evidence; a
          scenario that could not run is not a pass.
       b. After the scenarios pass, add regression tests at the cheapest
          layer that still proves each one. Every defect you fixed gets a
          test that fails when its fix is reverted — show that failure once.
       c. Run the language's coverage tool on the changed code; add the
          fewest tests that cover the riskiest uncovered lines. No % target;
          one-line reason for each line left uncovered.
       Bug fix: reproduce by hand → reproduce in code (failing test) → fix
       until green → re-run the scenario. This order replaces step 1's
       implement-first order.
       Speed: each test under 1 second, focused suite under 30 seconds, no
       sleeps, real network, or shared state.
       Use development:test-driven-development only when the brief or [RULINGS] explicitly asks for TDD (opt-in): then write the failing test before the code; 2a and 2c still apply.
    3. Verify the implementation works
    4. Commit your work [or, in a parallel wave in a shared tree: DO NOT
       commit; leave the change uncommitted for the controller to integrate]
    5. Self-review (see below)
    6. Write the report file and reply

    Work from: [directory]

    While you work, if something is unexpected or unclear and the brief, plan, and code don't resolve it, stop and return `NEEDS_CONTEXT` naming the missing input. Don't guess.

    While iterating, run the focused test for what you are changing; run the
    project's whole suite once before committing, not after every edit.

    ## Sub-agents

    You may start sub-agents only for an independent, sizeable part of this
    task, under the worker contract's Recursive delegation rules: each child
    gets a full brief, owns a subset of your owned artifacts, and you verify
    its work before relying on it. Report the children's changes as your
    own. Never hand this whole brief down unchanged.

    Never spawn a reviewer of your own work. After you report, the controller
    dispatches a task reviewer against your diff; a reviewer you spawn
    duplicates that seat and its approval counts for nothing. Self-review
    means reading your own diff.

    ## Code Organization

    - Follow the file structure defined in the plan.
    - Each file should have one clear responsibility and interface.
    - If a file you create grows beyond the plan's intent, stop and report
      DONE_WITH_CONCERNS — do not split files without plan guidance.
    - If an existing file you modify is already large or tangled, work
      carefully and note it as a concern.
    - Follow established patterns. Improve code you touch the way a good
      developer would, but do not restructure things outside your task.

    ## When You're in Over Your Head

    It is always OK to say "this is too hard for me." Bad work is worse than
    no work. STOP and escalate when:
    - The task needs an architectural decision with multiple valid approaches
    - You need code context beyond what was provided and cannot find clarity
    - You are uncertain whether your approach is correct
    - The task restructures existing code in ways the plan did not anticipate
    - You have been reading file after file without progress

    Report BLOCKED or NEEDS_CONTEXT with what you are stuck on, what you
    tried, and what help you need.

    ## Before Reporting Back: Self-Review

    - Completeness: everything in the brief? edge cases?
    - Quality: clear names (what, not how)? clean and maintainable?
    - Discipline: no overbuilding (YAGNI)? only what was requested?
      existing patterns followed?
    - Testing: scenarios run by hand before tests? tests verify behavior,
      not mocks, at the cheapest layer? risky uncovered lines closed? speed
      budget met? output pristine (no stray warnings)?

    Fix what you find before reporting.

    ## After Review Findings

    If the task review finds issues, you will be resumed with the findings.
    Fix them, re-run the tests covering the amended code, and append a fix
    report to your report file: what you changed, the covering tests, the
    command, and the output. Reviewers will not re-run tests for you — your
    report is the test evidence. Then reply with the same short handoff.

    ## Report

    Write your full report to [REPORT_FILE]:
    - What you implemented (or attempted, if blocked)
    - What you tested and the results
    - Scenario evidence: each scenario, its entry point, command/output or
      screenshot, and verdict (pass / fail / blocked)
    - Regression evidence: for each defect fixed, the test, its failing
      output with the fix reverted, and its passing output with the fix
    - Coverage evidence: coverage command, uncovered changed lines before
      and after, and a one-line reason for each line left uncovered
    - Timing: slowest new test and focused-suite duration
    - Files changed (including any sub-agent's)
    - Self-review findings
    - Issues or concerns

    Then reply with ONLY this (at most 15 lines):

    STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    Report: <report file path>
    Changed: <files>
    Commits: <short SHA + subject, one per line, or "none (parallel wave)">
    Evidence: <command → observed result>, one per line
    Concerns / blocker / missing context: <one line each>

    If BLOCKED or NEEDS_CONTEXT, put the specifics in the reply itself.
    Use DONE_WITH_CONCERNS if you finished but doubt correctness. Never
    silently produce work you are unsure about.
```

**Placeholders:**

- `[MODEL]` — REQUIRED, per SKILL.md Model Selection.
- `[BRIEF_FILE]` — the path `task-start` / `task-brief` printed.
- `[INTERFACES]`, `[RULINGS]` — only what the brief cannot know; never pasted prior-task history.
- `[FILES]` — the task's owned artifacts. In a parallel wave, disjoint from every other unit's (see `parallel-waves.md`).
- `[REPORT_FILE]` — the brief's path with `-brief.md` replaced by `-report.md`.
