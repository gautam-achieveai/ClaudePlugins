# Execution Loop

Detailed mechanics for Phases 1-2 of `development:implement`: building the task
list, executing tasks one at a time with TDD, committing each green increment,
handling failures, and detecting drift. Provider-agnostic — all GitHub/ADO
specifics live in the calling skill.

---

## Task List

Before writing any code, decompose the approved plan into a concrete task list.
Each task should be small, clear, independently verifiable, and traceable to the
purpose brief (Phase 0).

<task_list>
Write the task list to `scratchpad/conversation_memories/<id>-<slug>/tasks.md`
(the working directory the caller supplies — it holds `decisions.md` too; see
SKILL.md Phase 0):

```markdown
# Implementation Tasks — <work item / plan title>

## Tasks
- [ ] Task 1: <what file, what change, what outcome>
- [ ] Task 2: <...>
- [ ] Task 3: <...>

## Completion Criteria
- [ ] All tasks checked off
- [ ] Build passes
- [ ] All tests pass
- [ ] Self-review complete (Phase 3)
- [ ] Acceptance criteria verified (Phase 4)
```

**Granularity rules:**
- One focused step per task — one file or one logical change.
- Test tasks are **explicit** — "Write test for X" is its own task, not implicit.
- Verification tasks ("Run build", "Run tests") follow each logical group.
- Order by dependency — prerequisites first.

Check off each task (`- [x]`) as it is completed. This is the audit trail of what
was implemented and in what order.
</task_list>

---

## Execution

Work through the task list one task at a time, checking off each as completed.

### Mode auto-detection

Inspect the task structure:
- **3+ independent tasks** (touch different files/modules, no ordering
  dependency) → invoke `development:subagent-driven-development` — a fresh
  subagent per task, with spec-compliance review then code-quality review after
  each. Keeps context clean and reviews automatic.
- **Otherwise** (tightly coupled or sequential) → read and follow
  [`../../../reference/executing-plans-guide.md`](../../../reference/executing-plans-guide.md)
  and execute sequentially.

### Test-Driven Development (both modes)

Invoke `development:test-driven-development` for every task: write the failing
test, watch it fail for the right reason, write the minimal code to pass, refactor
green. Auto-detect the test runner:
- `.csproj` with test references → `dotnet test`
- `package.json` with jest/vitest/mocha → the configured runner
- `pytest.ini` / `pyproject.toml` / `conftest.py` → `pytest`
- No framework detected → note it and rely on Phase 4 verification.

### Commit discipline

After each task reaches green **and** is in scope:
1. Run the build and the relevant tests; read the output.
2. Commit the increment with a descriptive message (what changed and why).
3. Check the task off in `tasks.md`.

Small commits per green step are the undo button — progress lives in git, not the
context window. Do not batch many unrelated changes into one commit.

### Failure handling

If a test fails or implementation hits a wall:
1. Invoke `debugging:systematic-debugging` to find the root cause (read logs /
   evidence before changing anything — don't guess).
2. Apply the fix and re-run the test.

<max_retries>
If still failing after **3** debugging attempts on the same task, do not thrash:
return the **blocked** outcome (see SKILL.md → Guardrails & Outcomes) with the
failing task, error output, what was tried, and a root-cause hypothesis. STOP —
do not continue to later tasks or self-review.
</max_retries>

### Drift & "cheating" detection

Stop and reassess (revert the last step if needed) the moment you notice:
- **Looping** — repeating the same failed change.
- **Unrequested functionality** — building beyond the current task/purpose brief.
- **Going green dishonestly** — deleting, disabling, skipping, or weakening tests;
  stubbing/placeholdering instead of implementing; suppressing errors.

These are signals the work has lost the thread. Revert to the last good commit
rather than pushing forward on a wrong path.

---

## Decomposing complex work

When a plan is large (5+ distinct steps, or changes across 3+ areas, or multiple
independently-verifiable acceptance criteria), split it into checkpoints **before**
implementing, e.g.:

- `Reproduce and confirm root cause in <area>`
- `Implement <core change>`
- `Add regression tests for <scenario>`
- `Verify against all acceptance criteria`

Each checkpoint becomes a group of tasks in `tasks.md`. Promoting checkpoints into
tracked child items/issues on a provider (GitHub/ADO) is the **caller's**
responsibility — this skill stays provider-agnostic and works the local task list.
