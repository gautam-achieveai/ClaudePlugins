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

### Phase 1.2 — Route by Work Item Type

The approach depends on the work item type extracted in Phase 1.1:

- **Bug** → Phase 1.2-Bug (Debug & Prove Root Cause)
- **Task / User Story / Product Backlog Item / Requirement** → Phase 1.2-Feature
  (Design & Plan)

---

### Phase 1.2-Bug — Debug & Prove Root Cause

For bugs, speculation is not acceptable. The root cause must be **proven from
evidence** (logs, code traces, DuckDB queries) before any fix plan is posted.

Read and follow [reference/bug-rca-workflow.md](reference/bug-rca-workflow.md).
It defines three stages:

1. **Stage A — Reproduce & Collect Evidence**: Invoke `debugging:debug-with-logs`
   to reproduce the bug, collect JSONL logs, and query them with DuckDB. If
   reproduction fails, post questions (Phase 1.3) and STOP.

2. **Stage B — Formulate Root Cause Analysis**: Extract a structured RCA where
   every claim traces to a log entry, code path, or query result. No opinions —
   only observed facts.

3. **Stage C — Adversarial RCA Review**: Launch 2-3 explore agents in parallel
   to critique the RCA — challenge alternative hypotheses, audit evidence
   completeness, and check blast radius. If blockers are found, return to
   Stage A/B (max 2 critique rounds).

**Output**: A grounded RCA ready for formatting per
[reference/rca-comment-format.md](reference/rca-comment-format.md).

**If the RCA workflow identifies blockers or ambiguities** that cannot be
resolved from the codebase or logs, proceed to Phase 1.3 (Questions) instead
of Phase 1.4.

---

### Phase 1.2-Feature — Design & Plan (via Plan Subagent)

For features, tasks, and user stories, launch a **Plan subagent**
(`subagent_type: Plan`, `model: opus`) to analyze the work item and produce
a complete implementation plan. The Plan agent uses extended thinking to reason
deeply about the problem.

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

Explore the codebase for existing patterns, formulate 2-3 approaches, and
evaluate trade-offs.

#### Stage B — Plan (in plan mode)

Once research is complete, the agent calls **`EnterPlanMode`**. This locks it
into read-only mode where it can only write to the plan file — no code changes.
The agent synthesizes all research into a structured implementation plan, then
calls **`ExitPlanMode`** to return it.

**Provide the Plan agent with:**
- The full work item details from Phase 1.1 (type, title, description,
  acceptance criteria, area path, links)
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

If the Plan agent (Phase 1.2-Feature) or the RCA workflow (Phase 1.2-Bug)
identified blockers, ambiguities, or questions that cannot be resolved from the
codebase alone:

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

Select the comment format based on work item type:

- **Bug** → Format using
  [reference/rca-comment-format.md](reference/rca-comment-format.md).
  Use `<!-- BOT-PLAN v1 status:PENDING_REVIEW type:RCA -->` opening marker.
- **Feature / Task / Story** → Format using
  [reference/plan-comment-format.md](reference/plan-comment-format.md).
  Use `<!-- BOT-PLAN v1 status:PENDING_REVIEW -->` opening marker.

Post as a NEW work item comment using `addWorkItemComment`:
- Include the appropriate opening marker (with or without `type:RCA`)
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
   For bug RCAs, preserve the type attribute:
   `<!-- BOT-PLAN v<N+1> status:PENDING_REVIEW type:RCA -->`.
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

Read and follow [reference/execution-workflow.md](reference/execution-workflow.md)
for the full implementation process. It covers:

1. **Task list creation** — decompose the plan into granular, checkable tasks
2. **Execution mode** — auto-detect parallel (subagent-driven) vs sequential,
   with TDD alongside
3. **Failure handling** — invoke `debugging:systematic-debugging`, max 3 retries
   before posting blocker to ADO

For complex work items (5+ steps, multiple root causes, cross-area changes),
also follow the **Task Decomposition** section in the same reference to create
child work items in ADO before implementing.

### Phase 2.4 — Self-Review Loop

Read and follow the **Phase 2.4** section in
[reference/execution-workflow.md](reference/execution-workflow.md). It defines
a review-fix-recheck cycle using `code-reviewer:pr-review` in local branch
mode, with severity-based triage and a hard cap of 3 review cycles.

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

Invoke the `ado:ado-mentions` skill before composing any comment, PR description,
or work item update. It loads the full mention syntax reference.

<bot_identity>
Every comment posted to Azure DevOps work items MUST be prefixed with
`[<dev name>'s bot]` so others know this is an automated response.
Determine `<dev name>` from `git config user.name`.
</bot_identity>

- Use `AB#<id>` in PR descriptions to auto-link work items
- Use `#<id>` when referencing work items in comments

---

## Decision Log

Maintain a running decision log throughout the workflow. Read and follow
[reference/decision-log-guide.md](reference/decision-log-guide.md) for the
full process — initialization, what to log at each phase, and how to include
key decisions in the PR description.

---

## Task Decomposition for Complex Work Items

See the **Task Decomposition** section in
[reference/execution-workflow.md](reference/execution-workflow.md) for when and
how to break large work items into child tasks in ADO.

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
