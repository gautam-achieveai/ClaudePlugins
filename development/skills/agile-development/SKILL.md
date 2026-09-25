---
name: agile-development
description: Use when a large feature spans multiple independent workstreams or the user asks for Agile team mode, autonomous end-to-end delivery, or sustained single-prompt development.
user-invocable: true
disable-model-invocation: false
---

# Agile Development

Deliver a large feature through thin, manually testable slices while preserving enough durable state to continue autonomously until the whole acceptance contract is complete.

Keep this workflow model-neutral. Modern long-horizon models, including Claude Fable 5.1 and GPT-6 Astra, need clear completion boundaries and persistent project state more than detailed handholding.

## Start contract

Before dispatching work:

1. Define the outcome, consumers, non-goals, hard constraints, and **done-when** evidence.
2. Inspect only the code, tests, history, and external facts needed for the current slice. Before planning workstreams, run the read-back of `development:compound-learning` and carry its shortlist into the plan as constraints and approaches to avoid.
3. Keep one ledger in the caller's existing scratchpad: milestones, dependencies, owners, base SHAs, Rulings, current status, and verification evidence. Do not create a competing source of truth. After compaction, reload the ledger first and never re-dispatch work it records as integrated.
4. Treat routine reversible choices as implementation decisions. Ask only when interpretations materially change the result, new authority is required, or progress is genuinely blocked.
5. Continue through every milestone until all done-when checks pass or the blocked stop condition is met. A first implementation is not completion. Urgency shortens waits; it never removes a gate or a role from a team's loop.

## Team routing

Use Agile team mode when the user requests it or the feature has at least two independent workstreams. Keep tightly coupled work in one team. Use one writer per artifact. Delegation is recursive: any agent may start sub-agents under the recursive delegation rules in `reference/worker-contract.md`.

| Role | Agent | Required outcome |
|---|---|---|
| Architect | `development:architect` | Smallest viable architecture and thin end-to-end slice |
| Manual Tester | `development:manual-tester` | First runnable scenario, continuous hands-on evidence, defect reproductions, final coverage review and retrospective |
| Developer | `development:developer` | Observable slices, failing regression tests for observed defects, behavioral contract tests, then coverage-gap tests |
| Critic | `development:critic` | Adversarial design and first-scenario verdict |
| Code Reviewer | `code-reviewer:code-reviewer` | Independent final review and readiness verdict |

Build every dispatch brief and read every handoff with `reference/worker-contract.md`. It defines the brief, the report file, the four worker statuses, the Ruling log, and the retry rules. Tell each agent that other workers share the repository and that unrelated edits must be preserved.

The lead must continue other safe, independent work while agents run. Wait only when the next action depends on an agent's result.

## Execution loop

### 1. Build the thin slice

Start with one thin end-to-end slice so manual testing and dog-fooding begin before the design hardens.

1. Dispatch the Architect. Send the result to the Critic. Resolve every BLOCKER or MATERIAL finding.
2. Dispatch the Manual Tester to choose the tiniest observable scenario and its entry point with the Developer. Send that first-scenario choice to the Critic when it carries a material assumption; resolve BLOCKER or MATERIAL findings without delaying routine implementation.
3. Dispatch the Developer to expose that runnable slice with enough observability for hands-on testing. The Manual Tester starts as soon as it runs, while the Developer builds the next slice.
4. For each observed defect, have the Manual Tester supply a minimal reproduction. The Developer writes a focused failing regression test, fixes the bug, and returns it for manual re-test. When behavior is unclear, pair them using `debugging:debug-with-logs`, structured JSONL file logs, and DuckDB queries.
5. As behavior stabilizes, have the Manual Tester identify each material acceptance contract and the Developer add at least one automated behavioral test at the cheapest useful layer. One test may protect several contracts; do not mirror every scenario.
6. Loop new slices, Developer fixes, contract tests, and Manual Tester re-tests until the Manual Tester records a thumbs-up for every scenario and material corner case.
7. Only after all manual scenarios pass, have the Manual Tester and Developer inspect changed-code coverage. The Developer adds the fewest tests for risky uncovered behavior following Stage 3 of `development:scenario-driven-development`.
8. Run the narrowest meaningful build, lint, type, and test checks. Record exact commands and observed results.

The Manual Tester starts at the first tiny slice so usability and observability failures surface while the design can still change. Observed-defect regression tests start immediately; stable material acceptance contracts receive behavioral protection; coverage-guided tests wait for the complete manual pass.

- **Critic passes.** When the slice touches one component and adds no new interface (route, public API, schema, event, or cross-component call), send the architecture and first runnable scenario to the Critic together in one pass. Otherwise review the architecture first and ask for a focused scenario review only if material assumptions remain.
- **Manual testing.** The Manual Tester uses the smallest consumer-facing driver that proves the scenario: page interaction through an app browser or Playwright, an HTTP script for a web API, or a disposable public-API driver for a library. Use an existing UI or API to exercise backend behavior when practical. Each path is walked as entry → action → result → destination → aftermath, plus empty, boundary, error, and re-entry states. A path the tester could not run is never a pass: fail when the product is at fault, blocked when the environment is.
- **Tests from evidence.** Every defect fixed during manual testing gets a test seen failing before the fix and passing afterward; when authored later, demonstrate it fails when the fix is reverted. Every material acceptance contract gets automated behavioral protection after it stabilizes, but interaction variants do not each need a separate test. After all manual checks, add only tests for risky uncovered behavior. Each test runs under 1 second and the focused suite under 30 seconds. Use `development:test-driven-development` only when the user explicitly asks for TDD; the manual thumbs-up is still required before done.
- **Scope smell.** The Critic treats a slice that touches more than 8 files, adds more than 2 new abstractions, or puts a single implementation behind an interface as MATERIAL until the goal justifies it.

### 2. Expand by independent workstream

Use feedback from the thin slice to adjust remaining milestones. Before running anything concurrently, apply the coupling check and wave contract in `reference/parallel-waves.md`. Each team repeats the same architecture, critique, manual-test, automated-test, and verification loop.

The lead integrates one unit at a time. Repair failing validation before advancing. Record decisions that prevent later teams from reopening settled interfaces.

### 3. Track sustained work

For large work items, use **progress-tracking:tracking-progress** before the first worker dispatch. Supply the existing ledger path, done-when criteria, stable work and workstream IDs, owners, dependency graph, and worker report paths from `reference/worker-contract.md`. The ledger remains the decision record; `.progress/<work-id>/state.json` is its validated progress projection. Do not maintain a second handwritten status board.

Start `/loop 15m` progress tracking when the host supports recurring loops. The conductor owns the scheduler and all tracking writes; workers only update their assigned reports. Save the host schedule ID and recreate missing or expired schedules on resume. A skill cannot keep running after its host session ends; report that gap and use explicit resume.

- Refresh the generated Markdown, Mermaid, and HTML views from the same canonical state. Report the last tick's exact verified delta.
- Every unchanged active workstream must be named, even when another stream progressed. Deliver its diagnostic nudge through the host's agent messaging tool and record delivery; unavailable delivery stays pending for the lead.
- Stamp each refresh with a UTC as-of time. Mark data it could not fetch as stale; never invent it.
- Keep a **Waiting on** section for items blocked on the user or an external change. A source that stays stale for 3 ticks moves there.
- When something lands in **Waiting on**, notify the user through the host's notification channel and keep working on unblocked work.
- When the loop ends, write a receipt: why it stopped, tick count, and last state. A timeout is not success.

Without recurring-loop support, run a conductor tick at each milestone, worker handoff, blocker, and before long commands. If the progress plugin is missing, report the missing dependency and keep ledger checkpoints; do not claim continuous monitoring. Do not rely on conversation context as the only project memory.

### Stalls and course correction

A tracker nudge requests diagnosis and an evidence checkpoint; it never instructs a blind retry. Classify the failure with the retry rules in `reference/worker-contract.md` and change the configuration before any retry.

Stop when any `development:course-correction` tripwire fires (patch stacking, spreading diff, three strikes, growing special cases, fighting the framework, unexplainable state, "too far in"). Load that skill: it owns the freeze, snapshot, patch-then-revert, and re-plan gate. Bring the re-plan to the Architect; the gate's "why the old approach failed" sentence is the Architect's input.

### 4. Review and finish

After all workstreams integrate:

1. Dispatch `code-reviewer:code-reviewer`, which follows `code-reviewer:pr-review` for the complete diff and stable acceptance criteria.
2. Send valid findings to the owning Developer. Re-review corrections, with at most two correction rounds before a controller tie-break.
3. Use `development:verification-before-completion` for fresh whole-feature evidence.
4. Require the Manual Tester to run the final user flow and write the critical retrospective. Record at most one durable lesson from it through `development:compound-learning` — a lesson a future team would repeat without — and update an existing lesson instead of duplicating it.
5. Close only when every done-when criterion has evidence and no BLOCKER or MATERIAL finding remains.

Use `code-reviewer:over-engineering-review` when scope or architecture drift is suspected. Prefer removal and reuse over new abstraction.

## Terminal outcomes

- **COMPLETED** — all criteria pass, manual and automated evidence is recorded, review is clear, and the retrospective exists.
- **COMPLETED_WITH_RISKS** — criteria pass and only explicitly accepted residual risks remain.
- **BLOCKED** — the same blocking condition survives two attempted corrections and progress requires user input, new authority, credentials, or an external state change.
- **FAILED** — verification proves the requested outcome cannot be delivered safely within the approved scope.

Do not stop because the task is long, context is compacted, a milestone passed, or a first version works. Reload the durable state and continue.
