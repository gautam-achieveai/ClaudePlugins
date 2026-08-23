---
name: pr-review
description: >
  Conduct goal-aligned code reviews of individual pull requests, analyzing correctness, solution fit, performance, code alignment, testing coverage, and code quality while helping authors converge quickly on a mergeable change. Provides prioritized, actionable feedback with stable closure criteria. Use when asked to "review PR #[number]", "code review pull request", "check PR for issues", or "analyze PR changes". Works on GitHub or Azure DevOps, with PR numbers, branch names, or GitHub/Azure DevOps PR URLs. NOT for developer performance reviews over time.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch, Skill, Task, TodoWrite, mcp__azure-devops__*
---

# Pull Request Code Reviewer

Review individual PRs for code quality, security (OWASP Top 10), performance, and testing adequacy.

**Progressive loading:** this file is the workflow spine. Each step names the
reference file to load WHEN you reach it. Load references at their step, not
up front — the load instructions are mandatory, not optional.

<reviewer_philosophy>
## Rigorous Reviews That Converge

The reviewer protects the codebase **and** helps the developer land the right
change without avoidable review rounds. Rigor and flow are not competing goals:
the review succeeds when material risk is exposed early, the author knows the
shortest path to resolve it, and the acceptance bar remains stable.

Apply this decision order throughout the review:

1. **Does the code solve the stated problem?** Check the linked work item, PR
   description, acceptance criteria, and explicit non-goals.
2. **Is the solution substantially in the right ballpark?** The implementation
   may not be the reviewer's preferred design, but it must be sound, fit the
   codebase, and avoid a fundamental architectural dead end.
3. **What must change before merge?** Be ruthless about demonstrated correctness,
   security, data-loss, compatibility, and material operability risks. Do not
   block on perfection, personal preference, or unrelated cleanup.
4. **How can the author close each blocker efficiently?** State the required
   outcome, offer a minimal viable path when useful, and define objective
   evidence that will close the thread.

**Core beliefs:**

- **The PR goal is the invariant anchor.** Never let accumulated review comments
  replace the original problem as the purpose of the PR.
- **Improve, do not perfect.** Favor approval once a PR solves its stated problem,
  uses a substantially sound approach, and improves or preserves overall code
  health, even when optional improvements remain.
- **Severity and blocking are separate decisions.** Severity describes impact;
  `[BLOCKER]` means the issue must be resolved in this PR. A Medium observation
  is not automatically a reason for another iteration.
- **Evidence outranks reviewer taste.** Accept any implementation that satisfies
  the required outcome safely; do not require the author to use the reviewer's
  exact suggestion.
- **Do not move the goalposts.** Re-reviews verify the original closure criteria
  against the delta. New blocking findings require new evidence or new code, not
  a fresh preference about unchanged code.

**What this means in practice:**

- Do NOT soften findings to be "nice" — be direct, specific, and honest. A
  clear `[BLOCKER]` tag is kinder than a production outage.
- Do NOT approve with known merge risks just because the PR has been open too
  long — time pressure is not a reason to lower the bar. Equally, do not hold
  a goal-complete PR for polish.
- DO acknowledge genuinely good work — but only when it's genuinely good, not
  as a social lubricant before delivering criticism.
- DO state the defect precisely. When suggesting a remedy, propose the
  **smallest correction that fixes it** and label it as a floor, not a spec.
  A suggestion that adds API surface (new types, actions, endpoints, tables)
  must first state why no smaller correction exists — oversized suggestions
  get adopted verbatim, the artifact grows, and the next review round finds
  contradictions inside the growth.
- DO assign every finding a lane — **merge-blocking** or **follow-up** (see
  Severity Model below). A reviewer that cannot separate "ships broken" from
  "should be fixed eventually" forces every observation into a blocker and
  generates micro-work instead of quality.
- DO give every Critical, High, or blocking Medium finding a closure contract:
  **why it matters**, an implementation-neutral **required outcome**, a minimal
  **suggested path**, and objective **done-when** evidence the next round can
  verify without reinterpretation.
</reviewer_philosophy>

<severity_model>
## Severity Model — Two Axes, Two Lanes

Every finding is graded on **two independent axes**:

| Axis | Values | Question |
|---|---|---|
| **Impact** | CRITICAL / HIGH / MEDIUM / LOW | How bad is it if this ships? |
| **Remediation** | TRIVIAL / SMALL / SUBSTANTIAL / REDESIGN | How big is the smallest real fix? |

A one-cell HIGH and a redesign HIGH need completely different author
responses. Fifteen findings all marked HIGH with no remediation axis is zero
signal.

The two axes assign each finding to one of **two lanes**. The lane IS the
blocker flag: merge-blocking = `blocker: true`, follow-up = `blocker: false`.

**Merge-blocking lane** (gates the verdict):
- CRITICAL or HIGH impact — any remediation size (verify, don't infer: the
  blocker must answer why this cannot safely merge now)
- Violations of documented or enforced convention contracts — semver, release
  metadata, repository policy, wire formats, public API shape. The fix is
  trivial, but approving one tells the team the contract is optional.
- Schema / migration / wire-compatibility issues — near-irreversible once
  shipped; undefined behavior for existing state is a future minefield
- MEDIUM-impact defects with TRIVIAL or SMALL remediation — real defect, cheap
  to fix now

**Follow-up lane** (never gates the verdict — becomes issues/work items):
- MEDIUM impact requiring SUBSTANTIAL or REDESIGN remediation — file an issue
  against the implementation; do not hold the PR hostage to a redesign
- Informal-preference deviations without a demonstrated merge risk (a valid
  alternative design is not a finding)
- Pre-existing problems the PR touches but did not make worse
- LOW-impact findings

**Every review MUST end with two lists**: "These block merge" (the shortest
path to approval, with each blocker's required outcome and done-when) and
"These become follow-up issues". A finding not explicitly placed in the
blocking lane is follow-up by default.
</severity_model>

## Skill Scope

Reviews individual pull requests (GitHub or Azure DevOps) or the current local
branch, including re-reviews after updates. NOT for developer performance
reviews over time.

## Step 0a: Resolve the Provider & Repo

This skill reviews PRs on **GitHub or Azure DevOps**. Resolve the provider once
from the git remote, then use the matching tools throughout — full mapping in
[Provider Resolution & Tool Mapping](../../references/provider-resolution.md).

- `git remote get-url origin` → host `github.com` = **GitHub** (`<owner>/<repo>`);
  host `dev.azure.com` / `visualstudio.com` = **Azure DevOps**
  (`AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_REPOSITORY`).
- State the detected provider in one line and proceed. If no usable remote
  exists, **ask the user** for the coordinates — do NOT guess from prior reviews
  or hardcoded defaults.
- **GitHub** uses GitHub MCP tools when connected, else the `gh` CLI (via `Bash`).
  **Azure DevOps** uses `mcp__azure-devops__*`. On a tooling failure, use
  `gh:setup-gh-mcp` or `ado:setup-ado-mcp` and retry. When only one provider's
  tool is named below, use the mapped counterpart for the other.

## Step 0: Determine Review Mode

**Load [reference/review-modes.md](reference/review-modes.md) now.** It covers
repo-convention loading, the three modes, and their setup:

| Mode | When | Setup |
|---|---|---|
| **Lightweight** (default) | Low-complexity, self-contained changes — diffs tell the full story | Review directly from diffs, no worktree |
| **Deep** | Cross-cutting changes, new abstractions, high fan-out, unclear context | Worktree checkout via `Start-PRReview.ps1` |
| **Local Branch** | No PR yet — review current branch against a base | Merge-base scoped diffs |

State the chosen mode and why; switch if the user disagrees.

## Essential Workflow

1. **Setup**: `<Use Agent to complete this step>`
   - Fetch PR details — GitHub `gh pr view <n> --json …`, ADO `getPullRequest`.
   - Triage scope (files added/modified/deleted) to gauge how many parallel
     agents to dispatch.
   - Deep mode: run the worktree setup from `reference/review-modes.md`.
   - **Check previous comments** — GitHub `gh pr view <n> --json comments,reviews`,
     ADO `getPullRequestComments`. **If previous review comments exist from this
     reviewer (or Claude), load
     [reference/re-review-workflow.md](reference/re-review-workflow.md) and
     switch to the re-review workflow instead of continuing.**
   - Check linked work items (ADO `getWorkItemById`) or issues (GitHub
     `closingIssuesReferences`).

2. **Classify changed files**: categorize each changed file by domain — use the
   classification table in
   [reference/agent-dispatch.md](reference/agent-dispatch.md).

3. **Understand the changes**: `<Launch agent>`
   - Analyze what was modified, the intent, and how it fits the project.
   - Cross-check the linked work item, if any.
   - Verify branch/target conventions from the repo's actual policy (repo
     conventions) — never from a skill-level default. Emit a `[QUESTION]` only
     if the branch name looks generated but the policy is unclear.
   - If PR title/description scope does not match the diff, emit a `[QUESTION]`
     on the first pass only.

   <review_intent_gate>
   **Create the Review Intent before judging individual findings.** This record
   is the stable anchor for domain agents, grading, verdict selection, and every
   re-review:

   ```yaml
   reviewIntent:
     statedProblem: <the user/developer outcome the PR must deliver>
     acceptanceCriteria: [<observable condition>, ...]
     explicitNonGoals: [<out-of-scope item>, ...]
     deliveredApproach: <brief implementation summary>
     goalCoverage: SOLVED | PARTIALLY_SOLVED | NOT_SOLVED | UNCLEAR
     solutionDirection: RIGHT_BALLPARK | FUNDAMENTALLY_MISALIGNED | UNCLEAR
     evidence: [<work item, PR description, test, or code-path reference>, ...]
   ```

   Use empty arrays when acceptance criteria, non-goals, or evidence are not
   supplied. Keep these exact lower-camel field names at every handoff and
   persist the complete object in the review summary for future re-reviews.

   Use sources in this order: explicit acceptance criteria and non-goals, linked
   work item, PR description, implementation plan, then commit/user context. Do
   not silently substitute a reviewer's preferred scope for the stated scope.

   - `NOT_SOLVED` or `PARTIALLY_SOLVED`: identify the smallest concrete gaps
     between delivered behavior and the stated outcome. These gaps can block.
   - `FUNDAMENTALLY_MISALIGNED`: explain the unsafe or unsustainable direction
     and guide the author toward the nearest sound correction, not a wholesale
     redesign unless one is genuinely required.
   - `SOLVED` + `RIGHT_BALLPARK`: enter **convergence mode**. Continue reviewing
     rigorously, but create blockers only for evidence-backed merge risks. Keep
     preferences, polish, and unrelated cleanup non-blocking.
   - `UNCLEAR`: ask one consolidated, high-value context question. Uncertainty
     alone is not a blocker; inability to verify a core acceptance condition can
     become a blocker only when the missing evidence itself creates merge risk.

   Pass this exact Review Intent unchanged to every dispatched reviewer and to
   `review-grader`. Revisions require newly discovered authoritative context and
   must be called out explicitly; review comments themselves never redefine it.
   </review_intent_gate>

4. **Coding guidelines**: `<parallel agent>` — Read
   [Code Alignment Guide](reference/code-project-alignment-guide.md) (CRITICAL
   FIRST: project patterns, duplication, framework usage), then coding
   standards, tests ([Testing Assessment Guide](reference/testing-guide.md)),
   and documentation.

   **Before dispatching ANY agent in steps 4-8, load
   [reference/agent-guidance.md](reference/agent-guidance.md) and include its
   four discipline blocks in every agent prompt**: Context Question Emission,
   Claim-Strength Discipline, Defect-Statement Discipline (smallest-fix
   floors, quoted searches for absence claims, mandatory `Underlying problem:`
   line), and Convergence Guidance (include the Review Intent; findings must
   tie to the stated goal or a concrete merge risk).

5. **Code quality**: `<parallel agent>` — [Code Quality Guide](reference/code-quality-guide.md)
   (SOLID, smells, duplication), [Performance Guide](reference/performance-guide.md)
   (N+1, leaks, efficiency), [Security Checklist](reference/security-checklist.md)
   (OWASP Top 10, injection, auth).

6. **Design principles**: `<parallel agent>` — duplication analysis, modularity
   / SRP, simplification opportunities, consistency with the codebase's design
   patterns.

7. **Domain-specific review**: `<parallel agents>` — **Load
   [reference/agent-dispatch.md](reference/agent-dispatch.md) now.** Dispatch
   the domain agents whose triggers match the file classification from step 2,
   plus the server-side checks it lists. `temp-code-review` is **mandatory for
   every PR**. Run all applicable agents in parallel; collect findings before
   step 8.

8. **External agents**: `<parallel agents>` — from the same
   [reference/agent-dispatch.md](reference/agent-dispatch.md): dispatch
   matching external agents per its matrix and size heuristics, concurrently
   with step 7 where possible.

9. **Cross-reference test coverage**: use `test_project_map` from repo
   conventions when defined; otherwise infer `<Project>.Tests`-style mappings
   and note uncertainty. Flag new public methods without tests, and modified
   tests that don't cover the new behavior. Only enforce repo-specific CI test
   markers when conventions define them.

10. **Consolidate context questions**: collect `[QUESTION]` items from all
    agent outputs; de-duplicate, filter ones already answered by PR/work-item
    context, rank by review impact, cap at 10. Full workflow and philosophy in
    [reference/agent-guidance.md](reference/agent-guidance.md). Questions are
    always non-blocking and never affect the verdict.

11. **Severity grading — quality gate**: `<Dispatch review-grader agent>` —
    mandatory for every review. The grader protects both code quality and
    convergence: it corrects over- and under-weighted findings, separates
    severity from blocking status, and makes substantive feedback ready to
    resolve in one focused pass.

    1. Start the grader input with the unchanged Review Intent from Step 3.
    2. Consolidate all findings from steps 4-9 into a structured list
    3. De-duplicate: when multiple agents flag the same issue, keep the more
       detailed version
    4. **Cluster by mechanism**: if 3+ findings share the same underlying
       mechanism (same root cause, same mistaken pattern), merge them into ONE
       finding with the instances listed as evidence beneath it. A repeated
       mechanism is the primary finding — never file it as N separate findings
       and never demote it to a "secondary theme" paragraph.
    5. Assign each finding a stable ID (`F-001`, `F-002`, ...). Reuse the same
       ID on re-review; IDs never change when severity or wording changes.
    6. Format each finding as:
       ```
       ## Finding [N]
       - Id: [F-NNN]
       - Original Severity: [CRITICAL/HIGH/MEDIUM/LOW]
       - Remediation: [TRIVIAL/SMALL/SUBSTANTIAL/REDESIGN — size of the smallest real fix]
       - Blocker: [Yes/No — the lane, per the Severity Model]
       - Category: [e.g., Conventions, Architecture, Security, etc.]
       - File: [path]
       - Line: [1-based line or null]
       - Instances: [file:line list — only for clustered findings]
       - Issue: [description]
       - Underlying Problem: [the mechanism behind the symptom, one sentence]
       - Why It Matters: [concrete consequence for this PR, or "not supplied"]
       - Required Outcome: [condition that must be true, or "not supplied"]
       - Suggested Path: [smallest fix, labeled as a floor, or "not supplied"]
       - Done When: [objective closure evidence, or "not supplied"]
       - Evidence: [for absence claims — the search run and the nearest place that would define the thing]
       ```
    7. Dispatch `review-grader` with the Review Intent and formatted list.
       Require the grader to return each surviving finding using the exact
       posting schema from `post-pr-review`: `id`, `severity`, `remediation`,
       `blocker`, `category`, `file`, `line`, `instances`, `issue`,
       `underlyingProblem`, `whyItMatters`, `requiredOutcome`, `suggestedPath`,
       and `doneWhen`. Merge by stable `id`; never reconstruct location or
       issue text from grader prose.
    8. Use both the **graded severity and graded blocker status** (not the
       originals) for verdict determination in Step 12. Do not infer blocking
       from severity alone.

    **Assemble durable thread state before Step 12** — build `reviewThreads[]`
    from existing bot-owned finding threads plus new final findings, per the
    thread-state contract in
    [reference/publish-and-track.md](reference/publish-and-track.md).

12. **Provide feedback**: **Load
    [reference/publish-and-track.md](reference/publish-and-track.md) now** for
    the `post-pr-review` input contract, then delegate all posting to
    `skill: "code-reviewer:post-pr-review"`.

    **Determine verdict first** — use the Review Intent and graded blocker
    status. The verdict is driven by the **merge-blocking lane only** (see
    Severity Model). Follow-up-lane findings never gate the verdict:
    - **`APPROVE`** — The stated problem is solved, the solution is in the
      right ballpark, the merge-blocking lane is empty, and no substantive
      follow-up remains. Reserve for clean PRs.
    - **`APPROVE_WITH_COMMENTS`** — The stated problem is solved, the solution
      is in the right ballpark, the merge-blocking lane is empty, but useful
      follow-up findings exist. They are posted as comments and offered as
      work items — they must not create another required review cycle.
    - **`REQUEST_CHANGES`** — The stated problem is not solved, the solution is
      fundamentally misaligned, or any merge-blocking finding remains. Multiple
      Medium findings justify this only when their combined, concrete impact
      makes the PR unsafe or incomplete to merge — a clustered mechanism whose
      instances are individually Medium can qualify; an abstract pattern of
      polish concerns cannot.

    If Review Intent is `UNCLEAR` and no merge risk is demonstrated, use
    `APPROVE_WITH_COMMENTS` and ask one non-blocking question. If the missing
    evidence prevents verification of a core outcome or safety property, create
    one evidence blocker with objective `Done When` and use `REQUEST_CHANGES`.
    Do not invent a fourth `COMMENT` verdict.

    Never request changes solely for personal style, a valid alternative
    design, unrelated cleanup, speculative precedent, or perfection beyond the
    PR goal.

    **After the verdict, ALWAYS close with the two lists:**
    1. **Blocks merge / shortest path to approval** — each merge-blocking
       finding in priority order, one line each, using its stable
       `Required Outcome` and `Done When`
    2. **Follow-up issues** — each follow-up finding, one line each. Offer to
       file these as work items (ADO `convertFindingsToWorkItems` /
       `createWorkItem`; GitHub `gh issue create`) so they leave the merge
       gate but stay tracked.

    Use the summary template from
    [reference/output-format.md](reference/output-format.md). Posting is
    automatic — but approving or merging the PR always requires user
    confirmation first.

13. **Update review tracking**: use `skill: "code-reviewer:update-pr-tracking"`
    with the field mapping in
    [reference/publish-and-track.md](reference/publish-and-track.md). Skip for
    Local Branch Reviews. Tracking is best-effort — a tracking failure never
    fails the review.

## Error Handling

<error_handling>
- **PR fetch fails** → verify PR number, check provider connectivity (GitHub `gh auth status` / ADO MCP), inform user
- **Worktree script fails** → fall back to lightweight review mode
- **Agent dispatch fails** → skip that agent, note in findings, continue with others
- **Comment posting fails** → retry once, then present findings to user in conversation
</error_handling>

## Critical Principles

**1. Be Specific and Actionable**

- ❌ "This code has issues"
- ✅ "Line 45: Missing null check for `user` parameter can cause NullReferenceException when called from endpoint X"

**2. Include Code Examples** — show the problematic code, why it's a problem,
and the recommended (minimal) fix.

**3. Reference Exact Locations** — `path/to/file.cs:123` or `UserService.cs:45-67`.

**4. Lead with Substance**

- Acknowledge genuinely good patterns when they exist — but never manufacture
  praise to soften criticism. Empty compliments dilute the signal.
- Lead with the most important findings. End with clear action items
  prioritized by severity.

**5. Hold a Stable, Evidence-Based Bar**

- Do not lower the bar because a PR is small, the author is senior, or the
  deadline is tight.
- Do not raise or reinterpret the bar after the author addresses the stated
  required outcome. Accept equivalent safe fixes.
- Flag patterns that would be copied by future developers — a bad pattern in
  the codebase is an implicit recommendation to repeat it — but verify the
  code is genuinely a template before treating precedent as impact.
- When the same issue appears in multiple files, capture every instance — but
  as ONE clustered finding (the mechanism) with the instances listed as
  evidence beneath it, one closure condition covering all of them, not as N
  separate findings. Partial fixes create inconsistency; N copies of the same
  finding create micro-work and bury the actual pattern.

**6. Verify Before Claiming — Avoid False Positives**

Do NOT claim something "doesn't exist", "won't compile", "has no callers", "is
unused", or that code "only/all/always/never" behaves a certain way unless you
have high-confidence evidence. A false positive damages reviewer credibility
more than a missed finding. **Quote your search in the finding**: an absence
claim ("X is undefined") must show the search performed and the nearest section
that would define X, demonstrating it doesn't. Qualify scope-limited evidence
in the wording. Full rules:
[Codebase Search Discipline](../../references/codebase-search-discipline.md).

## Quick Reference Checklist

- [ ] **Code Alignment** (do first): Follows project patterns, no duplication, framework best practices
- [ ] **Goal Alignment**: Solves the stated problem and satisfies acceptance criteria
- [ ] **Solution Direction**: Substantially sound and in the right ballpark
- [ ] Bugs & Correctness: Logic errors, off-by-one, null/undefined handling, edge cases, incorrect API usage
- [ ] Security: OWASP Top 10, injection, hardcoded secrets, input validation, insecure defaults
- [ ] Performance: N+1 queries, memory leaks, algorithm efficiency, redundant computations, missing caching
- [ ] Code Quality: SOLID, code smells, duplication
- [ ] Maintainability: Code clarity, overly complex logic, misleading names
- [ ] Testing: Coverage, edge cases, integration tests
- [ ] EUII / PII: No user-identifiable info in logs, telemetry, or error messages
- [ ] Every finding: file:line, Underlying problem line, both axes, a lane
- [ ] Every blocker: required outcome + objective done-when closure check
- [ ] Summary ends with the two lists (blocks merge / follow-up issues)

## Reference Index (load at the step that names them)

- [Review Modes & Setup](reference/review-modes.md) — Step 0
- [Agent Dispatch Catalog](reference/agent-dispatch.md) — Steps 2, 7-8
- [Agent Guidance / Discipline Blocks](reference/agent-guidance.md) — Steps 4-8, 10
- [Re-Review Workflow](reference/re-review-workflow.md) — when prior review comments exist
- [Output Format](reference/output-format.md) — Step 12
- [Publishing & Tracking Contracts](reference/publish-and-track.md) — Steps 12-13
- Domain guides: [Code Alignment](reference/code-project-alignment-guide.md) ·
  [Code Quality](reference/code-quality-guide.md) ·
  [Performance](reference/performance-guide.md) ·
  [Security](reference/security-checklist.md) ·
  [Testing](reference/testing-guide.md) ·
  [Tool Catalog](reference/tool-catalog.md) ·
  [Scripts](scripts/README.md)
