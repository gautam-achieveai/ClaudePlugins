---
name: implement
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: true
disable-model-invocation: false
---

# Implement

The engine that turns an **approved plan** into **working, reviewed, verified
code**. It sits between planning and publishing:

```
plan / design decision  →  [ implement ]  →  verified change on a branch  →  finish & publish (caller)
```

It orchestrates existing skills rather than re-inventing them — use each (via
the **Skill** tool) at the right phase:
`development:test-driven-development`, `development:subagent-driven-development`,
`debugging:systematic-debugging`, `code-reviewer:pr-review`,
`development:verification-before-completion`.

## When to Use

- After a plan/design decision is approved and you need to build it.
- Called by `development:work-on` Phase 2, or standalone given a plan file.

**Do not** start on `main`/`master` without explicit consent — work on a branch
or worktree (the caller normally sets this up; if not, create one first).

## Core Principles

The non-negotiables that govern every phase below.

- **Purpose at the center.** Keep *why* this work exists and *who consumes it*
  in front of you the whole time. Every task and review is checked against it.
- **One atomic step at a time.** Never big-bang. Small, testable increments;
  "one item per loop." Don't get ahead of yourself.
- **Test-first.** Red → green per task (`development:test-driven-development`).
  Don't advance on red.
- **Evidence, not assertions.** A change is "done" only when a runnable check
  (tests / build / lint / type-check) returns pass — and you've *read* that
  output. "If you can't verify it, don't ship it."
- **Commit each green increment.** Progress lives in files and git, not the
  context window. Small commits are your undo button.
- **Fresh context per task.** Use subagents for independent tasks and for
  review/verification in a clean context; don't let one bloated thread carry
  every task.
- **Independent review before done.** A reviewer that sees only the diff and the
  criteria — not the reasoning that produced it — catches what self-justification
  misses.
- **Stay in scope.** No speculative features, no placeholders/stubs, no drive-by
  refactors. Fix root causes, never suppress errors.
- **Know when to stop.** On repeated failure or drift, revert rather than push
  forward; after the retry cap, STOP and report — do not guess.

---

## Phase 0 — Establish Purpose & Consumption (the North Star)

<purpose_brief>
**Before decomposing anything**, write down what this work is *for* and how its
output will be *consumed*. This brief is the reference every later task and review
is measured against — it is the single best defense against scope creep,
misalignment, and "technically correct but wrong" changes.

1. **Gather context.** Read the approved plan, the design decision, and the
   decision log. If there's a linked work item / issue and you need the broader
   "why," use `code-reviewer:pr-context` (or pass through the context the
   caller already gathered) to walk the work-item hierarchy.

2. **Write the Purpose & Consumption brief** as a section in the decision log
   (`decisions.md`). The log lives in the working directory
   `scratchpad/conversation_memories/<id>-<slug>/` that the caller supplies
   (work-on uses `<id>-<slug>`); standalone, derive it from the work-item id +
   slugified title, or a slugified plan title when there is no work item.
   `tasks.md` and `decisions.md` share this directory. Append the brief under the
   Part 2 heading — do not add a second top-level title:

   ```markdown
   ## Purpose & Consumption — <work item / plan title>

   ### Why this exists (purpose)
   - Problem / outcome: <the user/business problem this solves>
   - Definition of done: <the acceptance criteria, restated concretely>

   ### How it will be consumed
   - Callers / consumers: <who calls this — APIs, UI, downstream services, jobs>
   - Contracts & invariants: <inputs/outputs, DTO/schema shapes, behaviors callers rely on>
   - Surfaces touched: <public API, persisted data, events/queues, UI>

   ### Constraints
   - <compatibility, performance, security, conventions to honor>

   ### Out of scope (do NOT build)
   - <explicit non-goals — guards against scope creep>
   ```

3. **Keep it central.** Reference this brief when decomposing (Phase 1), when
   reviewing each task, and at verification (Phase 4). If a task or finding
   doesn't serve the purpose or a consumer, it's probably out of scope.
</purpose_brief>

---

## Phase 1 — Decompose into Atomic Tasks

Turn the plan into a concrete, ordered task list. Each task is small, clear, and
independently verifiable, and traces back to the purpose brief.

Read and follow [reference/execution-loop.md](reference/execution-loop.md) →
**"Task List"** for the `tasks.md` format and granularity rules. In short:
one file / one logical change per task; test tasks are explicit, not implicit;
verification tasks ("run build", "run tests") follow each logical group; order by
dependency.

For large/complex plans (5+ distinct steps, or changes across 3+ areas),
decompose into checkpoints first — see
[reference/execution-loop.md](reference/execution-loop.md) → **"Decomposing
complex work."** (Creating provider child items/issues is the caller's job, not
this skill's.)

---

## Phase 2 — Execute the Tasks

Work the list one task at a time, test-first, committing each green increment.

Read and follow [reference/execution-loop.md](reference/execution-loop.md) →
**"Execution"**. It covers:

- **Mode auto-detection** — 3+ independent tasks → `development:subagent-driven-development`
  (fresh subagent per task + spec-then-quality review); otherwise sequential per
  [`../../reference/executing-plans-guide.md`](../../reference/executing-plans-guide.md).
- **TDD alongside** — `development:test-driven-development` for every task
  (red → green → refactor), with the test framework auto-detected.
- **Commit discipline** — commit each green, in-scope increment with a
  descriptive message; check the task off in `tasks.md`.
- **Failure handling** — on a failing test or wall, use
  `debugging:systematic-debugging`; **max 3 attempts** per task, then return the
  **blocked** outcome (see Guardrails) instead of thrashing.
- **Drift detection** — stop on the drift / "cheating" signals catalogued in
  [reference/execution-loop.md](reference/execution-loop.md) (looping, unrequested
  functionality, going green by disabling/stubbing tests).

---

## Phase 3 — Self-Review Loop

Implementation isn't done when the tests pass — it's done when an independent
review of the whole diff against the purpose brief comes back clean.

Read and follow [reference/self-review-loop.md](reference/self-review-loop.md).
In short: run `code-reviewer:pr-review` in **local branch mode**, triage findings
by severity (fix Must/Should, skip Low/style), fix → re-review, **cap 3 cycles**,
and log each cycle to the decision log.

---

## Phase 4 — Verify (Definition of Done)

<definition_of_done>
Use `development:verification-before-completion` and produce **fresh evidence**
— never assert success you haven't observed this run. Confirm:

- **Build succeeds** (exit 0).
- **All tests pass** (read the count: `N/N`, 0 failures).
- **Lint / type-check clean** where the project has them.
- **No regressions** in existing functionality.
- **Acceptance criteria met** — re-read the purpose brief and check each
  criterion line-by-line, not just "tests pass."

If verification fails, fix and re-verify; if it still fails after 3 attempts,
return the **blocked** outcome. When green, record the evidence in the decision
log and return the **success** outcome.
</definition_of_done>

---

## Guardrails & Outcomes

<outcomes>
This skill returns one of two outcomes to its caller:

- **success** — change is implemented, self-reviewed, and verified on the branch,
  ready for the caller's finish/publish step. Include: what was built, the
  verification evidence (build/test output), and the key decisions.
- **blocked** — after the retry cap (3 attempts) on a task, verification, or a
  drift/cheating signal, STOP. Return: the failing task, error output, what was
  tried, and a root-cause hypothesis. Do **not** guess past a blocker or fake
  progress. The caller decides what to do next (e.g., post a provider blocker
  comment, revert state, ask a human).
</outcomes>

<never>
**Never:**
- Start on `main`/`master` without explicit consent.
- Mark a task done without reading real pass/fail output.
- Delete, disable, or weaken tests to make a suite go green.
- Ship placeholder/stub implementations or suppress errors to move on.
- Bundle unrequested features or drive-by refactors (out-of-scope = stop).
- Claim completion without fresh verification evidence (Phase 4).
</never>

---

## Inputs & Outputs

**Inputs (from the caller or the plan file):**
- Approved implementation plan (files to change, ordered steps, test strategy).
- Design decision + decision-log path (from `development:autonomous-design`, if used).
- Acceptance criteria / definition of done.
- Optional: linked work-item/business context for the purpose brief.

**Output:** a `success` or `blocked` outcome (see Guardrails), an updated
`tasks.md` audit trail, commits on the branch, and decision-log entries
(purpose brief, self-review cycles, verification evidence).

## Integration

- **Called by:** `development:work-on` Phase 2 (which adds worktree setup and
  provider-specific finish/publish + blocked handling around it).
- **Orchestrates:** `development:test-driven-development`,
  `development:subagent-driven-development`, `debugging:systematic-debugging`,
  `code-reviewer:pr-review`, `development:verification-before-completion`.
- **Reference guides:** [`../../reference/executing-plans-guide.md`](../../reference/executing-plans-guide.md),
  [`../../reference/git-worktrees-guide.md`](../../reference/git-worktrees-guide.md),
  [`../../reference/branch-completion-guide.md`](../../reference/branch-completion-guide.md)
  (branch completion is the caller's step, after a `success` outcome).
