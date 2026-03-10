---
name: work-on
description: >
  Autonomous two-phase development workflow driven by an Azure DevOps work item.
  First run: analyzes the problem, designs a solution, creates a plan, and posts
  it to the work item for review. Subsequent runs: incorporates feedback or
  executes the approved plan — implements, verifies, and publishes a PR. Feedback
  flows through ADO work item comments, not interactive prompts.
  Use when the user says "work on <number>", "implement work item <number>",
  "pick up <number>", or provides an ADO work item to implement.
---

# Work On (Autonomous)

You are an autonomous development orchestrator. Given an Azure DevOps work item
number, you operate in two phases:

- **Part 1 — Plan & Post**: Understand the problem, design a solution, create a
  plan, post it to the work item as a comment. Then STOP.
- **Part 2 — Execute & Deliver**: Check for feedback on the plan. If feedback
  exists, revise and repost. If the plan is approved, implement it, verify, and
  publish a PR. Then STOP.

The same `/work-on <id>` command auto-detects which part to run based on the
work item's comment history. No interactive prompts — feedback comes through
ADO work item comments.

This skill orchestrates existing skills — invoke each via the **Skill** tool
when you reach the corresponding phase.

---

## Phase 0 — Parse Arguments

Extract the work item number from `$ARGUMENTS`. Accept formats:
- Plain number: `12345`
- With hash: `#12345`
- ADO URL containing the ID

If no number is found, ask the user for one and stop until provided.

---

## Phase 1 — Auto-Detect Mode

Fetch the work item and determine which part to run.

<auto_detect_logic>
1. Fetch work item with `getWorkItemById` — extract details and comments.
2. Determine `<dev name>` from `git config user.name`.
3. Scan all comments for the `<!-- BOT-PLAN v` marker.
4. **If NO plan comment found**:
   a. Check if the latest bot comment contains questions (from Phase 1.3).
      - If questions found AND human answers exist after them → route to
        **PART 1** (resume planning with answers as context).
      - If questions found AND NO human answers → re-post a reminder comment
        and **STOP**.
   b. Otherwise → route to **PART 1** (Plan & Post, fresh start).
5. **If plan comment found**:
   a. Find the latest plan comment (highest version number).
   b. Check if version is `v3` or higher → route to **PART 2** (execute
      regardless — revision cap reached).
   c. Collect all human comments posted AFTER the latest plan comment.
      Human comments = comments that do NOT contain `[bot]` in the text.
   d. If NO human comments after the plan → **PART 2** (implicit approval).
   e. If human comments exist, check for approval signals (case-insensitive):
      `approved`, `lgtm`, `looks good`, `go ahead`, `proceed`, `ship it`,
      `good to go`, `start implementation`.
   f. If approval signal found AND no contradicting feedback → **PART 2**.
   g. If feedback/questions/concerns found → **PART 1 (Revision Mode)**.
   h. If ambiguous → default to **PART 1 (Revision Mode)** (safer).
</auto_detect_logic>

---

## PART 1 — Plan & Post

### Phase 1.1 — Fetch & Understand

Use the ADO MCP tool `getWorkItemById` to retrieve the work item. Extract:
- **Type** (Bug, Task, User Story, Product Backlog Item, Requirement)
- **Title**
- **Description** / Repro Steps (for bugs)
- **Acceptance Criteria** (if present)
- **State**
- **Assigned To**
- **Area Path** and **Iteration Path**
- **Links** (parent, related items)

If the work item is not found, inform the user and STOP.

**State check:**
- If state is **Done**, **Closed**, or **Removed** — warn the user and STOP.
  Do not ask to reopen — the user can reopen manually and re-run.
- If state is **Resolved** — warn that it appears already resolved, STOP.

**Set state to Active** (or equivalent — see
`reference/ado-state-transitions.md`). Add a comment:

`[<dev name>'s bot] Starting analysis.`

**Initialize decision log** — create the file using the **Write** tool:

**Path:** `scratchpad/conversation_memories/<id>-<slugified-title>/decisions.md`

```markdown
# Decision Log — Work Item #<id>: <title>
Date: <today>
```

### Phase 1.2 — Design & Plan (via Plan Subagent)

Launch a **Plan subagent** (`subagent_type: Plan`, `model: opus`) to analyze
the work item and produce a complete implementation plan. The Plan agent uses
extended thinking to reason deeply about the problem.

The agent operates in two stages:

#### Stage A — Research (before plan mode)

The agent has full access to all research tools. It should use them liberally
before entering plan mode:

- **Codebase**: `Read`, `Grep`, `Glob`, `LS` — search for existing patterns,
  related implementations, test conventions, and the files that will need changes
- **Web**: `WebSearch`, `WebFetch` — research APIs, libraries, best practices,
  or error messages relevant to the work item
- **Azure DevOps**: ADO MCP tools — fetch related work items (`getWorkItemById`),
  check commit history (`getCommitHistory`), browse the repo (`browseRepository`,
  `getFileContent`), review linked PRs, and understand prior decisions
- **Git**: `Bash` (git log, git blame, git show) — trace how the relevant code
  evolved and who last touched it

For **Bugs**: identify the root cause first. If the bug involves runtime
behavior, also consider log-based debugging (`debugging:debug-with-logs`).

For **Features / Tasks / User Stories**: explore the codebase for existing
patterns, formulate 2-3 approaches, and evaluate trade-offs.

#### Stage B — Plan (in plan mode)

Once research is complete, the agent calls **`EnterPlanMode`**. This locks it
into read-only mode where it can only write to the plan file — no code changes.
The agent synthesizes all research into a structured implementation plan, then
calls **`ExitPlanMode`** to return it.

**Provide the Plan agent with:**
- The full work item details from Phase 1.1 (type, title, description, repro
  steps, acceptance criteria, area path, links)
- The decision log path for recording decisions

**The Plan agent should produce:**
- Files to create/modify
- Implementation steps (ordered)
- Test strategy
- Verification steps
- Alternatives considered with rationale for rejection
- Any assumptions made due to ambiguity

**If the Plan agent identifies blockers or ambiguities** that it cannot resolve
from research alone, proceed to Phase 1.3 (Questions) instead of Phase 1.4.

### Phase 1.3 — Questions (if needed)

If the Plan agent (Phase 1.2) identified blockers, ambiguities, or questions
that cannot be resolved from the codebase alone:

1. Format the questions clearly with context for each:
   ```
   [<dev name>'s bot] I have questions before I can finalize the plan for #<id>:

   1. **<question>** — <why this matters for the plan>
   2. **<question>** — <context>
   ```
2. Post as a NEW comment on the work item using `addWorkItemComment`.
3. Save current progress to the decision log.
4. Report to user: "Questions posted to work item #<id>. Answer them on ADO,
   then re-run `/work-on <id>`."
5. **STOP.** Do not proceed to planning or implementation.

On the next `/work-on <id>` invocation, the auto-detect logic (Phase 1) will
find the questions comment with no BOT-PLAN marker. It will:
- Read the answers (human comments posted after the questions)
- Resume Phase 1.2 with the answers as additional context
- If no answers yet, re-post a reminder and STOP again

### Phase 1.4 — Post Plan to ADO

Format the plan using the template in
[reference/plan-comment-format.md](reference/plan-comment-format.md).

Post as a NEW work item comment using `addWorkItemComment`:
- Include `<!-- BOT-PLAN v1 status:PENDING_REVIEW -->` opening marker
- Include `<!-- /BOT-PLAN -->` closing marker
- Include human-readable CTA at the bottom

### Phase 1.5 — Save & Stop

<exit_conditions>
1. Save design context and plan summary to the decision log at
   `scratchpad/conversation_memories/<id>-<slug>/decisions.md`.
2. Report to user: "Plan posted to work item #<id>. Review on ADO, then
   re-run `/work-on <id>` when ready."
3. STOP. Do not proceed to implementation.
</exit_conditions>

---

## PART 1 (Revision Mode) — Revise & Repost

When auto-detect finds a plan with unaddressed feedback.

<revision_cap>
Max 3 revision cycles. After 3 revisions (v3), post the final plan with a note:
"This is the final revision (v3). Implementation will proceed on the next run."
On the next invocation, treat as approved regardless of further feedback.
</revision_cap>

### Phase R.1 — Parse Feedback

1. Read all human comments posted after the latest BOT-PLAN comment.
2. Classify each comment:
   - **Specific change request** — "change X to Y", "add Z", "don't do W"
   - **Question** — "why did you choose X?", "what about Y?"
   - **Concern** — "I'm worried about X", "this might break Y"
   - **Approval** — (should have been caught by auto-detect, but handle gracefully)
3. Summarize feedback into actionable items.

### Phase R.2 — Revise Plan

1. Read the previous plan from the work item comment (parse between markers).
2. Read scratchpad context from `decisions.md`.
3. Apply feedback to revise the plan:
   - For **change requests**: apply them directly.
   - For **questions**: answer them in the revised plan (add context to the
     relevant section).
   - For **concerns**: address them, or explain in the plan why the original
     approach is better with supporting evidence.
4. Update the decision log with revision notes.

### Phase R.3 — Repost

1. Post the revised plan as a NEW comment with incremented version:
   `<!-- BOT-PLAN v<N+1> status:PENDING_REVIEW -->`.
2. Reply to feedback comments acknowledging each point using `addWorkItemComment`:
   - `[<dev name>'s bot] Addressed in plan v<N+1>: <summary of change>`
   - `[<dev name>'s bot] Kept original approach: <rationale>`
3. STOP — wait for next review cycle.

---

## PART 2 — Execute & Deliver

Entry: plan is approved (explicit approval signal, implicit approval via no
feedback, or revision cap reached).

### Phase 2.1 — Restore Context

1. Read the scratchpad decision log at
   `scratchpad/conversation_memories/<id>-<slug>/decisions.md` to restore
   design context from Part 1.
2. Read the approved plan from the work item comment (parse between markers).
3. Parse implementation steps, files to change, test strategy.
4. Post a comment to the work item:
   `[<dev name>'s bot] Plan approved. Starting implementation.`

### Phase 2.2 — Set Up Worktree

Read `development/reference/git-worktrees-guide.md` and follow its process to create an
isolated worktree for this work.

**Branch naming convention**: `work-item/<id>-<slugified-title>`

Example: Work item #4567 "Fix login timeout on slow networks"
→ branch `work-item/4567-fix-login-timeout-on-slow-networks`

Slugify rules: lowercase, replace spaces/special chars with hyphens, max 60
chars for the slug portion, strip trailing hyphens.

### Phase 2.3 — Implement

#### Step 2.3.1: Create Task List

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

#### Step 2.3.2: Execute Tasks

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

### Phase 2.4 — Self-Review Loop

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

### Phase 2.5 — Verify

Invoke `development:verification-before-completion`. This must confirm:
- All tests pass
- Build succeeds
- No regressions in existing functionality
- The acceptance criteria from the work item are met

If verification fails, apply the fix and retry (up to 3 attempts per
`<max_retries>` in Phase 2.3). No user checkpoint — proceed automatically when green.

### Phase 2.6 — Finish & Publish

#### Step 2.6.1: Finish the Branch

Read `development/reference/branch-completion-guide.md` and follow it. Auto-select "push
and create PR" — do not present options interactively.

#### Step 2.6.2: Publish the PR

Load and execute the `ado:publish-pr` skill.
Since the work item already exists (from Phase 1), **skip Phase 1 of
publish-pr** — pass the work item ID directly. The PR should:
- Reference the work item with `AB#<id>` in the description
- Link to the work item via `createLink`
- Include a "Key Decisions" section in the PR description summarizing the 3-5
  most important entries from the decision log

#### Step 2.6.3: Update Work Item

After the PR is created:
- Update work item state to Resolved (or equivalent — see
  `reference/ado-state-transitions.md`).
- Add a comment:
  `[<dev name>'s bot] Implementation complete. PR #<pr-id> created.`

### Phase 2.7 — Stop

<exit_conditions>
Report to user: "PR #<pr-id> created for work item #<id>. Link: <PR URL>"
STOP.
</exit_conditions>

---

## Error Handling

<escalation_policy>
### Part 1 Errors
- **Work item not found** → STOP with clear message to user.
- **Work item Done/Closed/Removed** → warn and STOP. Do not ask to reopen.
- **Work item Resolved** → warn and STOP. User can re-run after reopening.
- **ADO comment post fails** → retry once. If still fails, display the plan
  locally and instruct user to post it manually.
- **Codebase reconnaissance fails** → proceed with available info, note gaps
  in the plan.

### Part 2 Errors
- **Build failures after 3 attempts** → post blocker comment to work item,
  revert state to Active, STOP.
- **Test failures after 3 attempts** → post blocker comment to work item,
  revert state to Active, STOP.
- **Worktree creation fails** → inform user locally (environment issue).
  Do not post to ADO.
- **PR creation fails** → check if PR already exists for this branch. If so,
  update it. If not, inform user with the error.
- **ADO state update fails** → try alternate state names per
  `reference/ado-state-transitions.md`. If all fail, warn user but continue.
</escalation_policy>

---

## ADO Reference Conventions

<bot_identity>
Every comment posted to Azure DevOps work items MUST be prefixed with
`[<dev name>'s bot]` so others know this is an automated response.
Determine `<dev name>` from `git config user.name`.
</bot_identity>

- Use `AB#<id>` in PR descriptions to auto-link work items
- Use `#<id>` when referencing work items in comments
- See `references/ado-mention-conventions.md` for full syntax reference

---

## Decision Log

Throughout the workflow, maintain a running decision log in the scratchpad at
`scratchpad/conversation_memories/<work-item-id>-<slug>/decisions.md`. This
log serves two purposes:
1. **Bridge Part 1 → Part 2** — persists design context across separate
   conversation sessions.
2. **PR reviewer context** — key decisions are included in the PR description.

### Step D.0: Initialize the log

At the start of Part 1 Phase 1.1 (after extracting the work item ID and title),
create the decision log file using the **Write** tool:

**Path:** `scratchpad/conversation_memories/<id>-<slugified-title>/decisions.md`

**Initial content:**
```markdown
# Decision Log — Work Item #<id>: <title>
Date: <today>
```

### Step D.1: Log at each phase

Use the **Edit** tool to append entries after each key decision point:

| Phase | What to log |
|-------|-------------|
| Part 1, Phase 1.1 | Understanding of the work item, ambiguities noted |
| Part 1, Phase 1.2 | Root cause (bugs) or chosen design approach (features), alternatives considered with reasons for rejection |
| Part 1, Phase 1.3 | Plan trade-offs — why certain files/approaches were chosen over others |
| Part 1, Revision | Feedback received, how it was addressed, what was kept |
| Part 2, Phase 2.3 | Implementation decisions — library choices, pattern selections, edge cases handled, deviations from plan with justification |
| Part 2, Phase 2.3 (failures) | Each debugging attempt — what was tried, what was learned, what was ruled out |
| Part 2, Phase 2.4 | Self-review findings per cycle, fixes applied, items deferred |
| Part 2, Phase 2.5 | Verification evidence — what passed, what was manually checked |

**Entry format** (append under the relevant phase heading):
```markdown
## <Part> — <Phase Name>
- **<decision>**: <rationale>
```

### Step D.2: Include in PR description

When creating the PR description (Part 2, Phase 2.6), read the decision log
file and include a "Key Decisions" section summarizing the 3-5 most important
entries so reviewers have context without needing to find the log.

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

---

## Guidelines

- **Autonomous execution** — work without interactive prompts. Feedback comes
  through ADO work item comments, not conversation.
- **Part 1 always STOPs after posting** — never proceed directly to implementation.
  The plan must be reviewable on ADO before execution.
- **Part 2 checks feedback first** — never execute a plan that has unaddressed
  human feedback.
- **Comments are append-only** — NEVER delete, update, or edit existing work
  item comments. Always post NEW comments. This preserves the full conversation
  history and audit trail. Revised plans get a new comment with an incremented
  version marker, not an edit to the old one.
- **Ask and STOP** — when the bot encounters a question it cannot answer from
  the codebase, post the question as a comment on the work item and STOP. Do
  not guess or proceed with assumptions that could lead to wasted work. The
  next `/work-on` invocation will pick up the answers.
- Use Azure DevOps MCP tools for all ADO operations, git/bash for local ops.
- Invoke skills via the **Skill** tool — do not inline their logic.
