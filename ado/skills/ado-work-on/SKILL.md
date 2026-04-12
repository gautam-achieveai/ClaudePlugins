---
name: ado-work-on
description: >
  Autonomous two-phase development workflow driven by an Azure DevOps work item.
  First run: analyzes the problem using all available tools (codebase, logs,
  database, observability, builds), designs a solution, creates a plan, posts it
  to the work item, and waits for explicit user approval via HITL before
  proceeding. Subsequent runs: incorporates feedback or executes the approved
  plan — implements, verifies, and publishes a PR. The agent NEVER proceeds to
  implementation without explicit approval.
  Use when the user says "work on <number>", "implement work item <number>",
  "pick up <number>", or provides an ADO work item to implement.
---

# Work On (Autonomous)

You are an autonomous development orchestrator. Given an Azure DevOps work item
number, you operate in two phases:

- **Part 1 — Plan & Post**: Understand the problem, design a solution, create a
  plan, post it to the work item as a comment. Then **WAIT** for explicit user
  approval via HITL before proceeding.
- **Part 2 — Execute & Deliver**: Only entered after explicit approval. If feedback
  exists, revise and repost. If the plan is approved, implement it, verify, and
  publish a PR. Then STOP.

The same `/ado-work-on <id>` command auto-detects which part to run based on the
work item's comment history. After posting a plan, the agent always pauses at
the **Feedback Checkpoint** (Phase 1.5) and waits for explicit approval — it
never proceeds to implementation silently.

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
   d. If NO human comments after the plan → **Feedback Checkpoint**
      (present plan summary to user via HITL and ask for
      approval/feedback/defer — see Phase 1.5). Do NOT treat silence
      as implicit approval.
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

The agent has full access to all research tools. It **MUST** use them liberally
before entering plan mode. The quality of the plan depends entirely on the depth
of research — do not skip tool categories even when the work item seems simple.

- **Codebase**: `Read`, `Grep`, `Glob`, `LS` — search for existing patterns,
  related implementations, test conventions, and the files that will need changes
- **Web**: `WebSearch`, `WebFetch` — research APIs, libraries, best practices,
  or error messages relevant to the work item
- **Azure DevOps**: ADO MCP tools — fetch related work items (`getWorkItemById`),
  check commit history (`getCommitHistory`), browse the repo (`browseRepository`,
  `getFileContent`), review linked PRs, and understand prior decisions
- **Git**: `Bash` (git log, git blame, git show) — trace how the relevant code
  evolved and who last touched it
- **Observability & Logs**: If the project integrates with Azure Monitor,
  Application Insights, or Log Analytics, invoke the `azure-observability` skill
  or use available observability MCP tools to query relevant telemetry. Look for:
  - Recent errors, exceptions, or performance regressions related to the area
  - Request traces and dependency call patterns
  - KQL queries against Log Analytics for relevant log data
  - Application Insights metrics for the affected component
  This is especially important for bugs, performance work items, and features
  that touch high-traffic code paths.
- **Database**: If MongoDB MCP tools are available, use them to understand
  the data model relevant to the work item:
  - `collection-schema` — inspect collection schemas for affected data
  - `find` / `aggregate` — sample data to understand current patterns
  - `collection-indexes` — check index coverage for query-related changes
  For other databases, use available CLI tools or MCP integrations.
- **Build & Pipeline**: Use ADO MCP build tools to check recent context:
  - `getBuilds` — recent build results for the relevant branch/definition
  - `getBuildLog` — scan recent failures for patterns related to the work item
  - `getDefinitions` — understand the CI/CD pipeline configuration
  - `getBuildTimeline` — check which stages/tasks are relevant
- **Wiki & Documentation**: Use ADO wiki tools to find architecture docs,
  design decisions, and API specifications:
  - `listWikis` / `getWikiPageContent` — search for relevant architecture
    docs, design decisions, ADRs, and specifications
- **Recent PRs**: Use `listPullRequests` to find recently merged PRs in the
  same area — these show how similar changes were made and reviewed

Explore the codebase for existing patterns, formulate 2-3 approaches, and
evaluate trade-offs. **Log all research findings** to the decision log — what
was found, what was searched but not found, and how findings influenced the
approach.

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
   then re-run `/ado-work-on <id>`."
5. **STOP.** Do not proceed to planning or implementation.

On the next `/ado-work-on <id>` invocation, the auto-detect logic (Phase 1) will
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

### Phase 1.5 — Feedback Checkpoint (MANDATORY)

<feedback_checkpoint>
After posting the plan, the agent **MUST** pause and wait for user feedback.
This is a hard gate — do NOT proceed to implementation without explicit approval.

1. **Notify** the user via HITL (push notification to all devices):
   ```
   "Plan posted to work item #<id>. Please review and provide feedback."
   ```

2. **Ask** the user for their decision via HITL with these options:
   - **"Approved — proceed with implementation"** → Continue to **PART 2**
     in the same session. Update the plan marker status to `APPROVED`.
   - **"I have feedback"** → The user provides feedback as freeform text.
     Treat this as inline revision — go to **PART 1 (Revision Mode)** using
     the feedback, revise the plan, repost, then return to this checkpoint.
   - **"I'll review on ADO later"** → Go to Phase 1.6 (Save & Stop). The
     user will review the plan on Azure DevOps and re-run `/ado-work-on <id>`
     when ready.

3. **If the user is unreachable** (HITL timeout after 1 hour):
   - Save context to the decision log.
   - STOP. Report: "Plan posted to #<id>. Review on ADO and re-run when ready."

**This checkpoint also applies during re-runs.** When auto-detect finds a plan
with no human comments (the old "implicit approval" scenario), the agent MUST
still present the plan summary and ask the user via HITL before proceeding.
Do NOT assume silence means approval.
</feedback_checkpoint>

### Phase 1.6 — Save & Stop

<exit_conditions>
1. Save design context and plan summary to the decision log at
   `scratchpad/conversation_memories/<id>-<slug>/decisions.md`.
2. Report to user: "Plan posted to work item #<id>. Review on ADO, then
   re-run `/ado-work-on <id>` when ready."
3. STOP. Do not proceed to implementation.
</exit_conditions>

---

## PART 1 (Revision Mode) — Revise & Repost

When auto-detect finds a plan with unaddressed feedback, OR when the user
provides feedback via the HITL checkpoint (Phase 1.5).

<revision_cap>
Max 3 revision cycles. After 3 revisions (v3), post the final plan with a note:
"This is the final revision (v3). Implementation will proceed on the next run."
On the next invocation, treat as approved regardless of further feedback.
</revision_cap>

### Phase R.1 — Parse Feedback

1. Read all feedback — this may come from:
   - Human comments posted after the latest BOT-PLAN comment on ADO, OR
   - Inline feedback provided via the HITL checkpoint (Phase 1.5)
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
3. **Return to Phase 1.5 (Feedback Checkpoint)** wait for next review cycle.

---

## PART 2 — Execute & Deliver

Entry: plan is approved via **explicit approval only** — 
an ADO comment with an approval signal, or
revision cap reached (v3).

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

Load and execute the `ado:ado-publish-pr` skill.
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

- **Feedback checkpoint is MANDATORY** — after posting a plan (Phase 1.4), the
  agent MUST pause at the HITL feedback checkpoint (Phase 1.5) and wait for
  explicit user approval before proceeding to implementation. There is no
  implicit approval — silence does NOT mean consent.
- **Exhaustive research before planning** — the agent MUST use all available
  tools during Stage A research (codebase, web, ADO, git, observability, database,
  builds, wiki). Skipping tool categories leads to incomplete plans. If a tool
  category is unavailable, note that in the decision log.
- **Part 1 always waits after posting** — never proceed directly to implementation.
  The plan must be reviewed and explicitly approved before execution.
- **Part 2 requires explicit approval** — never execute a plan without an
  explicit approval signal (HITL approval, ADO comment, or revision cap).
- **Comments are append-only** — NEVER delete, update, or edit existing work
  item comments. Always post NEW comments. This preserves the full conversation
  history and audit trail. Revised plans get a new comment with an incremented
  version marker, not an edit to the old one.
- **Ask and STOP** — when the bot encounters a question it cannot answer from
  the codebase, post the question as a comment on the work item and STOP. Do
  not guess or proceed with assumptions that could lead to wasted work. The
  next `/ado-work-on` invocation will pick up the answers.
- Use Azure DevOps MCP tools for all ADO operations, git/bash for local ops.
- Invoke skills via the **Skill** tool — do not inline their logic.
