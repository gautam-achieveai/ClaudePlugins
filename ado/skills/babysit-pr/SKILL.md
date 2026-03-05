---
description: Autonomously monitor an Azure DevOps pull request — polls every 15+ minutes, fixes build breaks, test failures, and code coverage gaps, categorizes review comments as Won't Fix or Needs Addressing, and self-reviews all changes before pushing.
---

# Babysit PR

You are an autonomous PR babysitter. You monitor an Azure DevOps pull request in
a continuous loop, collecting issues and delegating fixes to the
`babysit-pr-worker` agent each iteration. You do NOT ask for user confirmation
on individual fixes — you act, push, and re-check.

## Entry

1. **Identify the PR** — Use the PR number from `$ARGUMENTS`. If none provided,
   detect from the current branch using `listPullRequests` filtered by source
   branch. If multiple PRs match, list them and ask the user to pick one.
2. **Validate** — Use `getPullRequest` to confirm the PR exists. Display a
   status summary: title, source → target branch, reviewer votes, build status,
   active comment count.
3. **Detect build tool** — Inspect the repo root to determine the project type:
   - `.sln` or `.csproj` → `dotnet build` / `dotnet test`
   - `package.json` → `npm run build` / `npm test`
   - `pom.xml` → `mvn compile` / `mvn test`
   - `Makefile` → `make` / `make test`
   - None of the above → skip local build, rely on CI results only

---

## The Babysit Loop

Repeat until an exit condition is met:

### Step 1: Check PR Status

Use `getPullRequest` to check:
- Merge status (merged? completed? abandoned?)
- Reviewer votes (approved? waiting? rejected?)
- Build/CI status (succeeded? failed? in progress?)

**Exit if**: PR is merged, completed, or abandoned. Also exit if all builds are
green, all comment threads are resolved, and at least one reviewer has approved.

### Step 2: Collect All Issues

Gather every actionable issue into a structured list:

#### 2a. Build Breaks
- Check build/CI status from the PR
- If failed, retrieve build logs and error messages
- Summarize the core issue (compilation error, missing reference, config problem)

#### 2b. Test Failures
- Check test run results from CI
- For each failing test, capture: test name, error message, stack trace

#### 2c. Code Coverage Gaps
- Check if a coverage policy is failing on the PR
- If so, identify which code blocks lack coverage from the coverage report

#### 2d. Code Review Comments
- Use `getPullRequestComments` to fetch all comment threads
- Filter to **active (unresolved)** threads only
- For each thread, capture: comment text, file path, line number, reviewer name
- Skip threads you have already replied to in a previous iteration
- For each new thread, check for the `[BLOCKER]` tag from the reviewer
  (absence means non-blocking). Apply stricter criteria to BLOCKERs: Won't
  Fix on a BLOCKER requires stronger justification.
- Pre-classify before delegating using the evaluation steps in
  `references/review-reception-protocol.md` (verify, YAGNI check, context
  check) and `references/review-thread-state-machine.md` for state transitions.
  Flag as Won't Fix or Needs Addressing.

### Step 3: Delegate to Worker Agent

If there are any issues to address, spawn the `babysit-pr-worker` agent with:
- The collected issue list (build breaks, test failures, coverage gaps, comments)
- PR number and branch name
- Detected build/test commands
- List of previously addressed comment thread IDs (to avoid re-work)
- Pre-classification notes from Step 2d (YAGNI flags, context gaps, verification results)

**Worker review-reception rules** — instruct the worker to follow
`references/review-reception-protocol.md` in autonomous mode (no user
confirmation). Pass the pre-classification notes so the worker can act on them.

The worker agent handles all fixes, self-review, build verification, commit, and
push for this iteration. Wait for it to complete and record which issues it
addressed.

If there are no issues (everything is green but awaiting reviewer action), skip
to Step 4.

### Step 4: Wait & Re-poll

Report a brief status summary of what was done (or that everything is clean and
waiting on reviewers). Then wait **15 minutes** before looping back to Step 1.

---

## Exit Conditions

Stop the loop when:
- PR is merged, completed, or abandoned
- All builds green + all comment threads resolved + reviewer approved
- All remaining issues were classified as Won't Fix with no new issues for two
  consecutive iterations (nothing left to act on — waiting on reviewer action)
- User interrupts with "stop" or "enough"

When exiting, display a final summary: total iterations, issues fixed, comments
addressed, current PR status.

---

## ADO Reference Conventions

Load and follow `references/ado-mention-conventions.md` for all mention syntax.
Key rules for this skill:
- Use `#<id>` when referencing work items in comments or replies
- Use `!<id>` when referencing PRs in work item discussions
- Prefix all bot replies with `[<developer name>'s bot]`

## Guidelines

- Act autonomously — do not ask for user confirmation on each fix
- Maintain a running log of addressed comment thread IDs across iterations to
  prevent duplicate work
- If the worker agent reports it could not fix something, note it in the status
  summary but do not retry the same issue next iteration unless the context has
  changed (e.g., new comments on the same thread)
- Use Azure DevOps MCP tools for all ADO operations, git/bash for local ops
- Follow `references/review-reception-protocol.md` for all reviewer feedback
  evaluation — verify before implementing, push back when wrong, fix in
  priority order (blocking → simple → complex)

## Tools

- **Azure DevOps MCP**: `getPullRequest`, `getPullRequestComments`,
  `getPullRequestFileChanges`, `listPullRequests`
- **Agent**: `babysit-pr-worker` (spawned each iteration)
