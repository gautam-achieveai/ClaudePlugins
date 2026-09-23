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

## Step 0: Eligibility, Review Tier, and Workspace Mode

**Load [reference/review-modes.md](reference/review-modes.md) now.** It covers
the cheap eligibility gate, repo-convention loading, deterministic tiering,
and workspace setup.

Run the eligibility gate **before** any fan-out: closed, draft,
generated-only, empty, or already reviewed at this exact commit? Stop and say
why. Re-run this check immediately before posting.

**The review tier is not a workspace mode.** Tier chooses cost and thoroughness.
Workspace mode chooses diff-only, worktree, or local-branch setup.

After Step 1 builds the context pack, `scripts/classify-review.mjs` emits the
only authoritative tier and lane plan. The closed vocabulary is:
`TINY | SMALL | MEDIUM | LARGE`.

The script evaluates these rows in order. First match wins:

| Order | Tier | Numeric/structural rule | Review emphasis |
|---:|---|---|---|
| 1 | **LARGE** | more than 25 files; or more than 1200 changed lines; or a new project/module; or 3+ top-level areas | architecture, cross-area correctness, scope fit, over-engineering, AI slop, blind spots |
| 2 | **MEDIUM** | 11-25 files; or 401-1200 changed lines; or a new public type/interface; or DI/project-reference change | integration, contracts, rollout, errors, performance |
| 3 | **SMALL** | 3-10 files; or 51-400 changed lines; or any risk flag | correctness plus changed callers/default consumers, history, and tests |
| 4 | **TINY** | 1-2 files and 0-50 changed lines | correctness, boundaries, the regression test, and temp artifacts |

Risk is a separate axis. Each risk flag adds its named lane whatever the size;
`SECURITY` is the one exception because it adds the required
`security-checklist` to correctness or the owning domain lane instead of
inventing a duplicate security agent. Any risk raises TINY to SMALL; it does not
raise a review further by itself. A uniform mechanical change that the script
proves from normalized hunk shapes is capped at SMALL. Titles and descriptions
never earn the mechanical discount.

| Tier | Lane budget | Verification and reasoning | Workspace |
|---|---|---|---|
| **TINY** | correctness + temp-code | verify MEDIUM+; written verdict rules; grader only if HIGH/CRITICAL survives | Lightweight |
| **SMALL** | + history, all risk lanes, tests when behavior changed | verify survivors; one grader | Lightweight |
| **MEDIUM** | + duplicate detection, architecture on a DI or project-reference change; max 2 unique external agents | grader; synthesizer at 4 findings; planner/adjudicator only on their triggers | Lightweight |
| **LARGE** | + architecture, over-engineering, class design, simplification; correctness split by area | full conditional reasoning pipeline | Deep worktree |

A user may raise the tier. Never lower the classifier's tier. Escalation is
upward only: a surviving HIGH or CRITICAL finding moves the review one tier up
and applies the next tier's complete plan. Run newly added lanes and newly
required verification or reasoning work; do not repeat equivalent work already
completed. Example: TINY to SMALL runs SMALL's always-on grader even when no new
scanning lane is needed.

## Essential Workflow

1. **Setup — build the context pack once**: `<Use Agent to complete this step>`
   - Fetch PR details — GitHub `gh pr view <n> --json …`, ADO `getPullRequest`.
   - Triage scope (files added/modified/deleted) to gauge how many parallel
     agents to dispatch.

   **Build the context pack** — fetch the diff once, write it to the review
   scratch directory, and pass its paths to every agent. No agent fetches its
   own diff: N agents re-fetching the same diff is N times the tokens for
   identical bytes, and separate fetches can end up reviewing different
   commits. Full manifest in
   [reference/review-modes.md](reference/review-modes.md#the-context-pack-step-1).
   - Run the classifier and persist the exact plan:
     ```bash
     node "${CLAUDE_SKILL_DIR}/scripts/classify-review.mjs" \
       --context <scratch>/pr-<number>/context.json \
       --out <scratch>/pr-<number>/review-plan.json
     ```
   - Add the absolute `reviewPlanPath` to `context.json`. Echo the result as:
     `Review route: <tier> / <triggeringRule> / <workspaceMode>; <N> lanes; risk flags: <flags|none>.`
   - Follow `review-plan.json` exactly. Do not reclassify from prose or add a
     second size heuristic. If it selects DEEP, run the worktree setup from
     `reference/review-modes.md` before dispatch.
   - **Check previous comments** — GitHub `gh pr view <n> --json comments,reviews`,
     ADO `getPullRequestComments`. **If previous review comments exist from this
     reviewer (or Claude), load
     [reference/re-review-workflow.md](reference/re-review-workflow.md) and
     switch to the re-review workflow instead of continuing.**
   - **Gather business context** — exactly one of the two branches below runs;
     never both, never neither when a hierarchy is expected:
     - **Daemon-direct mode**: if this invocation's dispatch prompt carries the
       literal marker `Context Gatherer Owner: daemon-direct`, the caller (the
       review daemon) has already launched `pr-context-gatherer` directly and
       owns that dispatch itself. In this mode, do **not** dispatch
       `skill: "code-reviewer:pr-context"` and do **not** launch
       `pr-context-gatherer` yourself by any path — consume the gatherer's
       already-rendered context tree as the Step 3 input. That tree is
       delimited by the labeled heading
       `## Context Gatherer Result (Daemon-Supplied):`, which follows the
       marker line; everything after that heading, verbatim, is the
       daemon-direct context tree, and Step 3 treats it as the exact
       equivalent of a `code-reviewer:pr-context` hierarchy — never as a
       reason to gather again. This mode is mutually exclusive with the
       branch below: a daemon-direct invocation never also dispatches
       `code-reviewer:pr-context`.
     - **Otherwise** (the `Context Gatherer Owner: daemon-direct` marker is
       absent — this covers standalone/interactive use): dispatch
       `skill: "code-reviewer:pr-context"` with the PR number (and repository,
       when resolved) — this invokes the `pr-context-gatherer` agent to walk
       the linked work-item / issue hierarchy. Do not fetch linked work items
       or issues ad hoc; the returned context tree is consumed in Step 3.
       Always forward the PR details fetched above as the seed — this step's
       own routine fetch (title, branch, author, body) already qualifies as
       `Review-setup Context:` on its own, with no prior gather or caller
       payload required; a prior gather this run or a caller-supplied payload
       only makes that same seed more complete. Forward whatever is on hand,
       partial or complete, to the skill as `Review-setup Context:` instead of
       dispatching a second live lookup with nothing: this is the default,
       enrichment-mode seed described in
       [Context modes](../pr-context/SKILL.md#context-modes), reused verbatim
       and enriched rather than re-fetched from scratch. Missing pieces (e.g.
       discussion) are fetched by the gatherer itself; a gap in one piece
       never blocks reusing the pieces already known.
       The narrower case — the inline payload is already the *complete*
       gathered hierarchy and closed-world rendering with no further live
       lookups is actually wanted — is an explicit opt-in on top of this: add
       `Context Mode: deterministic-offline` alongside the payload (forwarded
       as `Pre-fetched Context:`) to select
       [Deterministic Context Mode](../../agents/pr-context-gatherer.md#deterministic-context-mode)
       instead of enrichment. Do not add that marker by default just because
       the payload happens to be complete.

2. **Classify changed files**: derive domains from the reviewed repository's
   conventions, manifests, dependencies, and architecture documentation using
   [reference/agent-dispatch.md](reference/agent-dispatch.md). Its project path
   tables and server checks are conditional examples. Require local evidence
   before applying them; a matching path alone is insufficient.

3. **Understand the changes** — dispatch the **PR Intent & Scope Analyst**:

   ```
   Agent:
     subagent_type: general-purpose
     description: "PR Intent & Scope Analyst"
   ```

   Set `subagent_type: general-purpose` for this dispatch — an unset
   `subagent_type` is exactly what let a prior run silently reuse the Step 1
   context gatherer's template here instead of doing this step's own job.
   **Never** dispatch this step with `subagent_type: pr-context-gatherer` (or
   any prompt/description implying that role). `pr-context-gatherer` is
   reserved for the daemon-required deterministic context gather that Step 1
   owns (`code-reviewer:pr-context`, or the daemon-direct hand-off) — it has
   no other role anywhere in this workflow. Reusing it here hands the analyst
   the gatherer's network/provider tool surface instead of a general-purpose
   one, and silently skips the actual intent/scope analysis this step exists
   to do.

   - Analyze what was modified, the intent, and how it fits the project.
   - Cross-check against the hierarchy gathered in Step 1 (the linked work
     item's acceptance criteria, parent feature/epic, and open siblings), if
     any — this is the `code-reviewer:pr-context` hierarchy in the
     interactive/Pre-fetched-Context branch, or the tree under
     `## Context Gatherer Result (Daemon-Supplied):` in daemon-direct mode;
     the two are equivalent inputs to this step and Step 1's
     mutual-exclusivity contract guarantees exactly one of them exists. Never
     re-dispatch `skill: "code-reviewer:pr-context"` or launch
     `pr-context-gatherer` here to refresh or double-check either tree —
     Step 1 already resolved the one gather this run gets; this step only
     consumes its output.
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

   **Use relevant prior learning:** run the read-back of
   `development:compound-learning` on `docs/superpowers/learnings/` in the target
   repo, matching this PR's components and risk words; at most 5 lessons. Without
   that plugin, grep the same frontmatter directly. Use a caller-supplied single
   learning report instead when that is the recorded home. Revalidate
   stale/contradicted facts; `proposed` lessons are leads, not policy.
   Do not read all historical retrospectives. Record maturity and actual exposure
   alongside the review artifacts without changing the Review Intent schema.

4. **Run the planned scanning lanes** — `<parallel agents>`:

   Dispatch exactly the entries in `review-plan.json.plan.lanes`.
   `correctness-review` and `temp-code-review` appear at every tier.
   `history-context-review` starts at SMALL. LARGE reviews split correctness by
   top-level area so one scanner never absorbs the whole diff. Each lane owns
   only its assigned files and focus. Risk lanes keep their base intelligence
   even when the review is otherwise TINY or SMALL.

   **Before dispatching ANY agent in steps 4-8, load
   [reference/agent-guidance.md](reference/agent-guidance.md) and include its
   discipline blocks in every agent prompt**: Context Question Emission,
   Claim-Strength Discipline, Defect-Statement Discipline (smallest-fix
   floors, quoted searches for absence claims, mandatory `underlyingProblem`),
   Convergence Guidance (include the Review Intent), and the Output Contract
   (the JSON schema and the 5-finding cap).
   **Also load [reference/finding-schema.md](reference/finding-schema.md) now** —
   it is the output contract for every agent from here to posting.
   Every agent prompt names the reference directory as an absolute path —
   `${CLAUDE_SKILL_DIR}/reference/` — so the files an agent must load resolve
   from the reviewed repository's working directory. When
   `plan.requiredGuides` is non-empty, give each guide's absolute path to the
   owning lane named in step 5.
   Include the lane's `modelIntelligence` and `effort` in the spawn request when
   the host permits per-spawn routing. Never choose a concrete model name.

5. **Guide ownership — no generic quality pass.** The review guides are loaded
   by the agent that owns the subject, not by a separate general-purpose agent
   sweeping all of them:

   | Guide | Loaded by |
   |---|---|
   | [Code Alignment](reference/code-project-alignment-guide.md) | the domain agent for the changed stack, plus `history-context-review` for convention history |
   | [Code Quality](reference/code-quality-guide.md) | `class-design-simplifier`, `code-simplifier` |
   | [Performance](reference/performance-guide.md) | `performance-review` |
   | [Security Checklist](reference/security-checklist.md) | `correctness-review` when the diff touches auth, crypto, input handling, or data access; otherwise the domain agent for that area |
   | [Testing](reference/testing-guide.md) | `test-coverage-review` |

   A separate generic pass over the same guides produced near-duplicate
   findings that step 11 then had to de-duplicate — paying twice to generate
   and once more to merge. Dispatch the owning agent instead. If no owning
   agent matches a guide and the PR clearly needs it, dispatch one agent for
   that single guide and say why.

6. **Design and duplication**: dispatched as part of step 7 via
   `class-design-simplifier`, `code-simplifier`, and `duplicate-code-detector`
   on their triggers. Do not run an additional design pass here.

7. **Domain-specific review**: `<parallel agents>` — **Load
   [reference/agent-dispatch.md](reference/agent-dispatch.md) now.** Dispatch
   only domain agents present in the plan. Use the catalog to scope their files
   and checks, not to choose review breadth. If a new risk signal is found,
   escalate one tier and record the evidence; never append an unplanned lane
   silently. Run planned lanes in parallel and collect their
   JSON envelopes into one array for step 10a.

8. **External agents**: `<parallel agents>` — from the same catalog, dispatch
   only agents selected by its ordered external-agent matrix and the plan's
   `externalAgentLimit`. TINY and SMALL use none; MEDIUM uses the first two
   eligible available agents; LARGE uses every eligible available agent in
   matrix order. File count alone never makes an agent eligible.

9. **Cross-reference test coverage** when the plan includes
   `test-coverage-review`: use `test_project_map` from repo
   conventions when defined; otherwise infer `<Project>.Tests`-style mappings
   and note uncertainty. Flag new public methods without tests, and modified
   tests that don't cover the new behavior. Only enforce repo-specific CI test
   markers when conventions define them.

10. **Consolidate context questions**: collect `[QUESTION]` items from all
    agent outputs; de-duplicate, filter ones already answered by PR/work-item
    context, rank by review impact, cap at 10. Full workflow and philosophy in
    [reference/agent-guidance.md](reference/agent-guidance.md). Questions are
    always non-blocking and never affect the verdict.

10a-b. **Filter, then verify** — **Load
    [reference/filter-and-verify.md](reference/filter-and-verify.md) now.**

    1. Run `${CLAUDE_SKILL_DIR}/scripts/filter-findings.mjs` over the collected agent envelopes and
       the context-pack diff. It anchors every finding to the diff, merges
       cross-agent duplicates, and applies the per-agent cap, deterministically
       and for free. `preExisting` findings never block and never reach the
       grader.
    2. Apply `review-plan.json.plan.verification`. TINY verifies only MEDIUM or
       higher findings; LOW findings are not posted. Other tiers verify every
       surviving finding. `FALSE_POSITIVE` is dropped; `UNPROVEN` can never
       block and never exceeds MEDIUM. HIGH and CRITICAL findings get the
       configured stronger second lens.
    3. Assign each surviving finding a stable ID (`F-001`, `F-002`, ...) now,
       before synthesis and grading. Reuse the same ID on re-review; IDs never
       change when severity or wording changes.

    Disproving a finding is cheaper than generating one. Never post a finding
    that no verifier tried to disprove, and never let a model grade its own
    confidence in place of this step.

10c. **Synthesize root causes** — when the plan contains
    `root-cause-synthesizer` and step 10b leaves 4 or more verified findings,
    dispatch it. Pass the Review Intent,
    the context-pack paths, and the verified findings. It returns causal
    clusters: for each, the one underlying mistake, the findings it dissolves,
    and the single fix that dissolves them.

    Eleven findings are rarely eleven mistakes. An author handed eleven items
    fixes eleven things and misses the one that generated them. Pass the
    clusters to the grader so it calibrates causes rather than symptoms. Below
    4 findings there is nothing to synthesize — skip and say so.

    Fold the synthesizer output here, once, before grading:
    - **Predicted symptoms are findings like any other.** Run one
      `finding-verifier` on each non-null `predictedSymptom` under the step 10b
      rules. Drop it on `FALSE_POSITIVE`; otherwise give it the next free ID and
      add it to its cluster.
    - **Each cluster becomes one finding record.** It keeps the lowest dissolved
      ID; `instances` lists every member's `file:line`; `underlyingProblem` is
      the cause and `suggestedPath` the single fix. It carries its members'
      `verification` objects. If no member is `TRUE_POSITIVE`, the `UNPROVEN`
      limits apply. Standalone findings pass through unchanged.

11. **Severity grading — planned quality gate**: dispatch `review-grader` only
    when its `when` condition in `review-plan.json` is true. A clean TINY review
    skips it. For an ungraded TINY review, apply the written Severity Model and
    verdict rules directly. The grader corrects over- and under-weighted
    findings, separates severity from blocking status, and makes substantive
    feedback ready to resolve in one focused pass.

    1. Start the grader input with the unchanged Review Intent from Step 3.
    2. Pass the verified findings from step 10b as JSON records in the
       [finding schema](reference/finding-schema.md), each carrying its
       `verification` object. Mechanical de-duplication and clustering already
       happened in step 10a — do not redo them by hand.
    3. Step 10c clusters arrive already folded into finding records. Never pass
       the raw synthesizer output; the grader grades a cluster as one finding
       whose instances are its dissolved members.
    4. Keep the IDs assigned in step 10b. The grader never renumbers them.
    5. **Cluster by mechanism** where the script could not: findings in
       different files that share one root cause are one finding with the
       instances listed beneath it. A repeated mechanism is the primary
       finding — never N separate findings, never a "secondary theme"
       paragraph.
    6. The grader returns the same records, carrying the full posting contract:
       `id`, `severity`, `remediation`, `blocker`, `category`, `file`, `line`,
       `instances`, `issue`, `underlyingProblem`, `whyItMatters`,
       `requiredOutcome`, `suggestedPath`, and `doneWhen`. It may set
       `blocker` and adjust `severity` / `remediation`; it preserves `id`, `file`,
       `line`, `instances`, `diffAnchor`, `issue`, and `evidence` byte-exact.
       Merge by stable `id`; never reconstruct location or issue text from
       grader prose.
    7. Use both the **graded severity and graded blocker status** (not the
       originals) for verdict determination in Step 12. Do not infer blocking
       from severity alone.

    **Assemble durable thread state before Step 12** — build `reviewThreads[]`
    from existing bot-owned finding threads plus new final findings, per the
    thread-state contract in
    [reference/publish-and-track.md](reference/publish-and-track.md).

11a. **Adjudicate contested findings** — dispatch `review-adjudicator` only
    when it appears in the plan **and** the review disagrees with itself.
    Exactly one of these must
    hold, and most reviews match none:

    - a `CRITICAL` or `HIGH` finding whose two verifier lenses disagreed
    - two findings whose resolutions cannot both be followed
    - a blocking finding whose remediation is `REDESIGN` on a narrow PR
    - a re-review where the author disputed a blocking finding on technical grounds
    - a lane asserting the PR's stated intent was itself wrong

    The adjudicator reduces the disagreement to the one factual question that
    decides it, answers that question in the code, and rules. Its `effect`
    block is the only place after grading where a severity or blocker changes.
    Apply the rulings to the graded findings before step 11b. A ruling made on
    `ASYMMETRY` rather than `EVIDENCE` always carries a question for the
    author — post it.

11b. **Plan remediation** — dispatch `remediation-planner` only when it appears
    in the plan, the verdict is `REQUEST_CHANGES`, and either 3 or more findings
    block or the synthesizer returned 2 or more clusters. Pass the graded
    findings and the clusters.

    It returns the minimum merge-unblocking set, an ordered plan with
    dependencies, and any conflicts between the findings' own suggested paths.
    Each finding's `suggestedPath` was written by an agent that could see only
    that finding; independently sensible fixes collide. Use the planner's
    ordering for the "Blocks merge / shortest path to approval" list in step 12.
    Below that threshold the grader's own shortest-path line is the better
    answer and the planner is not dispatched.

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

13. **Record what this review cost and caught, then update tracking.** Before
    calling the tracking skill, assemble `reviewMetrics` from data you already
    have: the step 10a `stats` block, the step 10b verdict tally, the review
    tier, triggering rule, risk flags, requested and effective model
    intelligence/effort per lane, agents actually dispatched, upward
    escalations, and elapsed wall-clock time. Record a number you did not
    measure as `null` — never estimate one.
    These counts are what later makes "was this review worth its cost?" a
    question with an answer instead of an opinion.

    Then use `skill: "code-reviewer:update-pr-tracking"`
    with the field mapping in
    [reference/publish-and-track.md](reference/publish-and-track.md). Skip for
    Local Branch Reviews. Tracking is best-effort — a tracking failure never
    fails the review.

14. **Learn from human feedback:** when new human comments/answers are available,
    a pending retrospective stage can now complete, or when explicitly requested,
    invoke `skill: "code-reviewer:review-retrospective"`
    with the reviewed commit, Review Intent, original findings/questions, relevant
    human threads, and existing investigation/effort artifacts. Otherwise skip;
    do not poll or launch a judge merely because a review was posted. Keep the
    retrospective local and separate from the PR verdict and canonical thread
    state. It must not reopen closed findings or publish a scorecard automatically.

## Error Handling

<error_handling>
- **PR fetch fails** → verify PR number, check provider connectivity (GitHub `gh auth status` / ADO MCP), inform user
- **Worktree script fails** → fall back to lightweight review mode
- **Classifier fails** → report the error and use LARGE as the safe fallback;
  never ask a model to recreate the numeric classification by judgment. A
  context/diff file mismatch is a classifier failure, not permission to classify
  an incomplete diff.
- **Agent dispatch fails** → skip that agent, note in findings, continue with others
- **Agent returns malformed JSON** → ask that one agent to re-emit its envelope; if it fails twice, drop its output and record the gap in the summary. Never hand-transcribe findings out of prose — that is how locations drift.
- **Filter script fails** → report the failure, then anchor findings by hand against the diff before verifying. Never skip anchoring and post unanchored findings.
- **Verifier fails or times out** → treat that finding as `UNPROVEN`: it can be reported, but it cannot block and cannot exceed MEDIUM.
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
- [ ] `review-plan.json` exists; one tier and triggering rule were echoed
- [ ] Every dispatched lane appears in the plan; every skipped conditional lane records why
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
- [ ] Every finding anchored to the diff, or reported as pre-existing
- [ ] Every posted finding survived an adversarial verification pass
- [ ] Every blocker: required outcome + objective done-when closure check
- [ ] Summary ends with the two lists (blocks merge / follow-up issues)

## Reference Index (load at the step that names them)

- [Review Modes, Gates & Setup](reference/review-modes.md) — Step 0
- [Finding Schema](reference/finding-schema.md) — Steps 4-11, the output contract
- [Agent Dispatch Catalog](reference/agent-dispatch.md) — Steps 2, 4, 7-8
- [Filter & Verify](reference/filter-and-verify.md) — Steps 10a-b
- [Agent Guidance / Discipline Blocks](reference/agent-guidance.md) — Steps 4-8, 10
- [Grading Rubric](reference/grading-rubric.md) — loaded by `review-grader` on demand
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
