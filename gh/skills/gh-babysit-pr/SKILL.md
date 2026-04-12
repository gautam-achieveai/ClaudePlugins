---
name: gh-babysit-pr
description: >
  Use when the user asks to "babysit a PR", "babysit my pull request",
  "monitor my PR", "watch my pull request", "keep my PR green", "fix PR check
  failures automatically", "handle PR review comments", or wants autonomous
  GitHub PR monitoring that fixes build breaks, test failures, coverage gaps,
  and review comments on a polling loop.
---

# Babysit PR

Autonomous PR babysitter. Monitor a GitHub pull request in a continuous loop,
collect issues, and delegate fixes to the `gh:gh-babysit-pr-worker` agent each
iteration. Act without asking for user confirmation on individual fixes — fix,
push, and re-check.

## Entry

1. **Identify the PR**
   - use the PR number from `$ARGUMENTS`, or
   - detect it from the current branch with GitHub MCP / `gh pr view`
2. **Validate**
   - fetch PR title, source -> target branch, review decision, mergeability,
     check status, and active discussion count
3. **Detect build/test commands**
   - `.sln` / `.csproj` -> `dotnet build` / `dotnet test`
   - `package.json` -> `npm run build` / `npm test`
   - `pom.xml` -> `mvn compile` / `mvn test`
   - `Makefile` -> `make` / `make test`
   - otherwise rely on CI only
4. **Detect linked work-item context**
   - resolve linked issues from the PR body or closing references
   - if the linked issue belongs to a GitHub Project, capture project metadata so
     the worker can create follow-up issues consistently

## The Babysit Loop

Repeat until an exit condition is met.

### Step 1: Check PR Status

Use GitHub MCP pull-request/actions tools or `gh pr view` / `gh pr checks` to
check:

- merge conflicts / mergeability
- review decision and outstanding review requests
- check / workflow status
- draft vs ready-for-review state

**Exit if**:
- the PR is merged or closed
- all required checks are green, actionable review threads are handled, and the
  PR is waiting only on human reviewer action

### Step 2: Collect All Actionable Issues

Build one structured checklist for the iteration.

#### 2a. Merge conflicts

- detect mergeability problems first
- list conflicting files
- treat this as the highest priority

#### 2b. PR policy / readiness failures

Capture actionable items such as:
- PR still draft when it should be ready
- missing linked issue / missing project placement
- failing required checks
- unresolved actionable review threads

Note but do not try to automate purely human items such as "needs reviewer
approval" unless the user explicitly asked for that.

#### 2c. Build / workflow failures

- inspect failing checks / workflow runs
- pull the failure summary and root error

#### 2d. Test failures

- capture failing test names, error text, and stack traces when available

#### 2e. Coverage gaps

- if a coverage-related check fails, capture the gap summary and affected area

#### 2f. Code review comments

- fetch active review threads, review-summary comments, and top-level PR
  conversation comments
- capture feedback text, reviewer, date, file path / line number when present,
  and whether the thread is already addressed in a prior iteration
- treat `[BLOCKER]` comments as highest-priority review items
- pre-classify each thread using
  `references/review-reception-protocol.md` (verification, stale-diff check,
  YAGNI/context evaluation, disposition rules) and
  `references/review-thread-state-machine.md` (conversation state handling) as:
  1. **Resolve**
  2. **Won't Fix (reply)**
  3. **Won't Fix (defer with follow-up issue)**

Default to **Resolve** unless there is a clear, defensible technical reason not
to do so.

### Step 3: Plan the Iteration

Convert the collected issues into concrete todo items before any fixes begin.
Each todo should be specific enough that the worker agent can act on it without
re-analyzing the whole PR.

Priority order:

1. merge conflicts
2. blocking review comments
3. failed checks / builds
4. failed tests
5. coverage gaps
6. non-blocking review comments

### Step 4: Delegate to the Worker Agent

Spawn `gh:gh-babysit-pr-worker` with:

- the todo plan
- PR number, source branch, target branch
- detected build/test commands
- list of already-addressed thread IDs
- pre-classification notes from Step 2f (stale diff checks, YAGNI flags, context
  gaps, and linked check evidence)
- top-level review-summary / PR-conversation feedback captured in Step 2f
- linked GitHub issue / project context for deferred follow-up issues

The worker should follow `references/review-reception-protocol.md` in
autonomous mode when replying, pushing back, or deciding whether to resolve a
conversation.

The worker addresses the todos, performs self-review, verifies locally when
possible, commits, pushes, and reports what it did.

### Step 5: Wait & Re-poll

Report a brief status summary, then wait **15 minutes** before looping back to
Step 1.

## Exit Conditions

Stop when:

- PR is merged or closed
- all actionable issues are handled and only human approval remains
- user says "stop" or "enough"
- after 20 iterations without full resolution, stop and report status

## GitHub Reference Conventions

Invoke the `gh:gh-mentions` skill before composing any comment or reply.

## Guidelines

- Use GitHub MCP pull-request/actions/issue tools when available.
- Use `gh` / `gh api` as the fallback path.
- Act autonomously — do not ask for confirmation on each fix.
- Maintain a running log of addressed review thread IDs across iterations.
- Prefer follow-up issues over silently dropping valid out-of-scope concerns.
- Follow `references/review-reception-protocol.md` for review evaluation and
  `references/review-thread-state-machine.md` for conversation closure behavior.
