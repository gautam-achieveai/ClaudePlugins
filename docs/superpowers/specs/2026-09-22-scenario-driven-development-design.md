# Scenario-driven development replaces TDD as the default

**Status:** draft for review · **Date:** 2026-09-22 · **Plugin:** `development`

## Goal

Make this the default testing flow everywhere in the plugin:

1. **Scenario manual testing** — prove the change works the way a user uses it.
2. **Regression tests** — lock in what manual testing proved, at the cheapest layer.
3. **Coverage-guided tests** — use coverage to find untested changed code; add the fewest tests that cover the most.

Tests must be fast. TDD stays available, but only when someone asks for it.

## Approaches considered

- **A. New skill + TDD as opt-in (chosen).** One new skill, `development:scenario-driven-development`, owns the flow. TDD keeps its skill but opens with "opt-in; not the default". Callers switch to the new skill.
- **B. Spread the rules into existing skills.** No new skill; edit verification, agents, and plans. Rejected: the rules scatter and drift.
- **C. Rewrite TDD in place under its old name.** Rejected: the name would lie, and you asked to keep TDD available.

## The new skill: `scenario-driven-development`

### Stage 1 — Scenario manual testing

- Turn each acceptance criterion into scenarios. Each scenario is walked as entry → action → result → destination → aftermath, plus empty, boundary, error, and re-entry states.
- Expose an entry point for every scenario (CLI, endpoint, script, UI path). No entry point → add one before testing.
- Run each scenario by hand. Record commands, output, screenshots, and structured logs.
- Verdict per scenario: pass, fail, or blocked (environment). A scenario that could not run is not a pass.
- Diagnose with structured JSONL logs and `debugging:debug-with-logs`.

### Stage 2 — Regression tests

- Only after the scenarios pass by hand.
- Lock each passing scenario at the **cheapest layer that still proves it** (unit over integration over end-to-end).
- Every defect found in Stage 1 gets a test that fails when its fix is reverted. Show that failure once.
- **Bug fixes:** reproduce by hand → reproduce in code (a failing test) → fix until green → re-run the manual scenario.

### Stage 3 — Coverage-guided tests

- Run coverage on the changed code with the language's own tool (table below).
- List uncovered changed lines and branches. Rank them by risk: error paths, boundaries, security, data loss first.
- Add the fewest tests that cover the most risky surface. One test that walks a whole branch beats three that each touch one line.
- No % target. Each uncovered line left behind gets one line of reason (unreachable, trivial, covered by a manual-only scenario).

| Stack | Tool |
|---|---|
| C# / .NET | `dotnet test --collect:"XPlat Code Coverage"` (coverlet), or `dotnet-coverage collect`; report with ReportGenerator |
| JS / TS | `vitest --coverage`, `jest --coverage`, or `c8` |
| Python | `pytest --cov` (coverage.py) |
| Go | `go test -coverprofile` |
| Rust | `cargo llvm-cov` |
| Other | the project's existing coverage command; else say none exists |

### Speed budgets

- Each new test runs in **under 1 second**.
- The focused suite for a change runs in **under 30 seconds**.
- No sleeps, no real network, no shared mutable state between tests.
- A slower test is marked integration and carries a one-line reason.

### Carried over from the current TDD skill

- `writing-good-tests.md` moves to the new skill (name the production change that makes a test fail; derive expected values by hand; no change detectors).
- "Instrumented logging" moves to the new skill as a reference — it serves manual testing.
- "Green means the whole suite, every failure named" stays.

## TDD skill after the change

- Opens with: "**Opt-in.** The default mode is `development:scenario-driven-development`. Use TDD only when the user asks for it."
- Description triggers only on an explicit TDD request.
- Links the moved references instead of duplicating them.

## Callers updated

Every place that sends work to TDD by default switches to the new skill:

- Agents: `developer`, `test-planner` (Test Planner plans scenarios → regression → coverage).
- Skills: `agile-development`, `implement` (+ execution-loop), `work-on`, `subagent-driven-development` (implementer + task reviewer prompts), `brainstorming`, `verification-before-completion`.
- Guides: `writing-plans-guide.md` (task steps become: implement → run scenario → regression test → coverage check), `executing-plans-guide.md`.
- `debugging:systematic-debugging`: the bug-fix order above.
- Metadata: `development/plugin.json`, `marketplace.json`, `README.md`.
- Your global `~/.claude/CLAUDE.md`: "TDD for behavior changes and bug fixes" and the Test Planner reference.

## Proof

- Contract tests fail first, then pass: the new skill exists with its three stages in order, speed budgets, and coverage table; TDD opens with the opt-in banner; no caller names TDD as its default.
- A fresh-context scenario run: a feature, a bug fix, and a C# change each follow the new flow.
- The node suite is green for the tests this work owns.

## Out of scope

- Adding coverage tooling to any project. The skill uses what exists or names what's missing.
- Wave 3 items (hooks, course-correction, compound-learning). They come after this.
