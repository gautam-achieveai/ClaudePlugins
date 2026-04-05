# Execution Workflow

This reference covers the detailed implementation and self-review process for
Part 2 of the work-on skill. It includes task list creation, execution mode
selection, the self-review loop, and task decomposition for complex work items.

---

## Phase 2.3 — Implement

### Step 2.3.1: Create Task List

Before writing any code, decompose the approved plan into a concrete task list.
Each task should be small, clear, and independently verifiable.

<task_list>
Write the task list to `scratchpad/conversation_memories/<id>-<slug>/tasks.md`
using the following format:

```markdown
# Implementation Tasks — Work Item #<id>

## Tasks
- [ ] Task 1: <clear description — what file, what change, what outcome>
- [ ] Task 2: <clear description>
- [ ] Task 3: <clear description>
...

## Completion Criteria
- [ ] All tasks checked off
- [ ] Build passes
- [ ] All tests pass
- [ ] Self-review complete (Phase 2.4)
```

**Task granularity rules:**
- Each task should be completable in one focused step (one file or one logical
  change)
- Include test tasks explicitly — "Write test for X" is its own task, not
  implicit
- Include verification tasks — "Run build", "Run tests" after each logical
  group
- Order tasks by dependency — things that must happen first come first

Update this file as tasks are completed: check off each task (`- [x]`) after
it is done. This creates an audit trail of what was implemented and in what
order.
</task_list>

### Step 2.3.2: Execute Tasks

Work through the task list one by one, checking off each as completed.

**Auto-detect implementation mode** from the task structure:
- Count independent tasks (touch different files/modules with no dependencies).
- Count sequential tasks (output of one feeds into another, or same files).
- **3+ independent tasks** → invoke `development:subagent-driven-development`
- **Otherwise** → read `development/reference/executing-plans-guide.md` and follow it

**Test-Driven Development**: For either mode, also invoke
`development:test-driven-development` alongside. Auto-detect the test framework:
- `.csproj` with test references → `dotnet test`
- `package.json` with jest/vitest/mocha → the configured test runner
- `pytest.ini` / `pyproject.toml` / `conftest.py` → `pytest`
- If no test framework is detected, note this and rely on verification in
  Phase 2.5.

**Handling failures:**

If tests fail or implementation hits a wall:
1. Invoke `debugging:systematic-debugging` to diagnose
2. Apply the fix and re-run tests

<max_retries>
If still failing after 3 debugging attempts:
- Post a comment to the work item:
  `[<dev name>'s bot] Implementation blocked after 3 fix attempts.`
  Include: error messages, what was tried, hypothesis for root cause.
- Update work item state back to Active.
- STOP. Do not continue to self-review.
</max_retries>

---

## Phase 2.4 — Self-Review Loop

After all implementation tasks are complete, the work is NOT done. Every change
must pass a self-review cycle before it can be published.

<self_review>
Run a self-review loop that repeats until the code is clean:

**Cycle 1 (and each subsequent cycle):**

1. **Review** — Invoke the `code-reviewer:pr-review` skill in **local branch
   review mode** (no PR number — review current branch against base). This runs
   the full review workflow: code alignment, code quality, performance, security,
   domain-specific agents (exception handling, test coverage, etc.), and produces
   structured findings with severity ratings.

2. **Assess findings** — Collect all findings from the review. Categorize:
   - **Must fix** (HIGH / CRITICAL): bugs, security issues, missing tests for
     new behavior, incorrect exception handling, data loss risks
   - **Should fix** (MEDIUM): code quality, missing edge case tests,
     over-mocking, fragile tests, performance concerns
   - **Skip** (LOW / informational): naming suggestions, style preferences,
     documentation — do not fix these in the self-review loop

3. **Fix** — Address all Must Fix and Should Fix findings. For each fix:
   - Make the code change
   - Run the build and tests to confirm the fix doesn't break anything
   - Check off any related tasks in the task list

4. **Re-review** — Run `code-reviewer:pr-review` again on the updated code.
   Check whether the previous findings are resolved and whether the fixes
   introduced new issues.

5. **Repeat or exit:**
   - If new Must Fix or Should Fix findings exist → repeat the cycle
   - If only LOW/informational findings remain → exit the loop
   - **Hard cap: 3 review cycles maximum.** After 3 cycles, proceed to
     verification regardless. Log any remaining findings in the decision log.

**What the self-review covers (via pr-review skill):**
- Code alignment with project patterns and conventions
- SOLID principles, code smells, duplication
- Security (OWASP Top 10)
- Performance (N+1 queries, memory, efficiency)
- Exception handling patterns (swallowed exceptions, incorrect re-throws)
- Test coverage (missing tests, tests that don't cover the actual change)
- Temporary code, debug artifacts, hardcoded hacks

**What to log:** After each cycle, append to `decisions.md`:
```markdown
## Part 2 — Self-Review Cycle <N>
- Findings: <count> HIGH, <count> MEDIUM, <count> LOW
- Fixed: <list of fixes applied>
- Remaining: <list of items deferred or skipped with rationale>
```
</self_review>

---

## Task Decomposition for Complex Work Items

When a work item is large or complex (particularly bugs with multiple root
causes or features with many components), decompose it into child tasks in ADO.

**When to decompose:**
- The implementation plan has more than 5 distinct steps
- A bug has multiple root causes or requires changes across 3+ areas
- The work item has multiple acceptance criteria that can be verified independently

**When to trigger:** After the plan is approved in Part 2 Phase 2.1, before
implementation begins.

**How to decompose:**
1. Create child Task work items under the parent for each major checkpoint:
   - Use `createWorkItem` with type `Task` for each
   - Link each to the parent using `createLink` (parent-child relationship)
   - Title format: `[#<parent-id>] <checkpoint description>`
2. As each task is completed during Phase 2.3, update its state to Done/Closed
3. Include task IDs in commit messages: `Completes task #<id>: <description>`

**Example decomposition for a complex bug:**
- `[#4567] Reproduce and confirm root cause in auth module`
- `[#4567] Fix token refresh logic`
- `[#4567] Add regression tests for timeout scenarios`
- `[#4567] Verify fix against all acceptance criteria`
