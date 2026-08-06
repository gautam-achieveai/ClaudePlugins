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

For every Critical, High, or blocking Medium finding, provide:

- **Why it matters** — the concrete consequence, tied to this PR and its goal.
- **Required outcome** — what must be true before merge, without over-prescribing.
- **Suggested path** — the smallest safe fix or 1-2 viable options when helpful.
- **Done when** — a test, behavior, build result, or observable condition that
  lets the next reviewer close the thread without reinterpretation.

Keep non-blocking feedback visibly optional. Consolidate nits and follow-up ideas
instead of turning them into additional asynchronous review cycles.
</reviewer_philosophy>

## Skill Scope

**This skill is for:**

- Reviewing individual pull requests
- Code review with security, performance, testing analysis
- Providing structured feedback on specific PR changes

**Examples:**

- "Review PR #12345" → Use **pr-reviewer** ✅
- "Code review this pull request" → Use **pr-reviewer** ✅
- "Re-review PR #12345 after updates" → Use **pr-reviewer** (re-review mode) ✅
- "Check what changed since my last review on PR #12345" → Use **pr-reviewer** (re-review mode) ✅

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
  `gh:setup-gh-mcp` or `ado:setup-ado-mcp` and retry.

For brevity, the provider-specific steps below name the `mcp__azure-devops__*`
tool and its GitHub `gh` equivalent; when only one is shown, use the mapped
counterpart from the provider-resolution table for the other provider.

## Quick Start

**LLM Workflow:**

1. Fetch PR data using the provider's tooling (see [provider mapping](../../references/provider-resolution.md)):

```
# GitHub
gh pr view 12345 --json number,title,author,headRefName,baseRefName,body
# Azure DevOps
mcp__azure-devops__getPullRequest -pullRequestId 12345 -de
```

2. Extract source branch from response (`headRefName` on GitHub; `sourceRefName: "refs/heads/<source-branch>"` on Azure DevOps)
3. Call the setup script for the current operating system:

```pwsh
<PATH_FOR_PR-REVIEWER_SKILL_ROOT_DIRECTORY>\scripts\Start-PRReview.ps1 `
    -PRNumber 12345 `
  -SourceBranch "<source-branch-without-refs/heads-prefix>" `
    -PRTitle "<pull-request-title>" `
    -PRAuthor "<pull-request-author>"
```

  ```bash
  bash <PATH_FOR_PR-REVIEWER_SKILL_ROOT_DIRECTORY>/scripts/Start-PRReview.sh \
    --pr-number 12345 \
    --source-branch "<source-branch-or-full-refs/heads-ref>" \
    --pr-title "<pull-request-title>" \
    --pr-author "<pull-request-author>"
  ```

Creates isolated worktree with analysis templates.

4. Take a note of mergeBase (Make sure both target and source are based on origin) e.g.

```bash
git merge-base origin/<target-branch> origin/<source-branch>
```

NOTE: everything is based of origin.

5. From this point onwards, all diffs are against merge-base-commit-id

## Prerequisite: Load Repo Conventions

Before enforcing repo-specific policy, load [Repo Conventions](reference/repo-conventions.md).

1. Look for `.code-reviewer.yml` at the repo root. If this is a monorepo, also
   check `sources/*/.code-reviewer.yml`.
2. Prefer the PR's actual `targetRefName` over any default base branch.
3. If no convention file exists, auto-detect the default base branch with
   `git symbolic-ref refs/remotes/origin/HEAD`; if that fails, fall back to
   checking `main`, then `master`, then `dev`.
4. If conventions are still unknown, do **not** invent branch naming rules,
   test project mappings, or CI markers from another repo.

## Step 0: Determine Review Mode

Before starting the review, determine which review mode is appropriate. There are three modes:

### Lightweight Review (diff-only)

Use this mode when changes are **low-complexity and self-contained** — the diffs alone provide enough context to understand and evaluate the PR. This is the **default and most common mode**.

**Low-complexity signals — a lightweight review is appropriate when:**
- **Localized scope**: Changes are confined to a single feature, module, or layer (e.g., a bug fix in one service, a config update, documentation)
- **Low cognitive load**: A reviewer can understand each changed file in isolation — no need to mentally model how changes interact across the codebase
- **Shallow dependency fan-out**: The changed code doesn't call into or get called by many other parts of the system; side effects are contained
- **Mechanical or repetitive changes**: Renames, find-and-replace, namespace updates, formatting fixes, bulk attribute additions — even across many files — are inherently low-complexity because each diff is structurally identical
- **Self-explanatory diffs**: The surrounding context in the diff is sufficient to judge correctness; you don't need to open other files, trace call chains, or check consumer usage
- **No new abstractions**: The PR works within existing patterns and doesn't introduce new classes, interfaces, services, or architectural layers

**How it works:**
1. Fetch PR metadata (title, author, description, source/target branches) — GitHub `gh pr view <n> --json …`, ADO `mcp__azure-devops__getPullRequest`.
2. Get the list and count of changed files — GitHub `gh pr diff <n> --name-only`, ADO `mcp__azure-devops__getPullRequestFileChanges` + `getPullRequestChangesCount`.
3. **Assess complexity** using the Complexity Assessment below. If high-complexity signals are present, switch to Deep Review.
4. View the actual changes — GitHub `gh pr diff <n>` or git diff, ADO `mcp__azure-devops__getFileContent` / git diff.
5. Perform the review directly from the diffs — no worktree needed.

### Deep Review (worktree checkout)

Use this mode when the PR has **high complexity** — you need the full source tree to understand how changes interact with the broader codebase.

**High-complexity signals — escalate to deep review when any are present:**
- **Cross-cutting changes**: Modifications span multiple layers or modules (e.g., API controller + service + data layer + tests all in one PR)
- **New abstractions or architectural changes**: PR introduces new classes, interfaces, design patterns, or restructures existing architecture
- **High dependency fan-out**: Changed code is called by or calls into many other components — side effects can't be judged from the diff alone
- **Core business logic changes**: Modifications to critical algorithms, rules, or workflows where correctness has significant downstream impact
- **Complex control flow**: New logic with deep nesting, state machines, concurrency patterns, or intricate conditional branches
- **Shared infrastructure changes**: Modifications to base classes, shared utilities, DI registrations, or interfaces with many consumers — you need to check all usage sites
- **External dependency changes**: Updating NuGet packages, SDK versions, or third-party library usage where compatibility and breaking changes need full-context evaluation
- **Unclear or missing PR context**: The PR description doesn't explain the "why" — you need to explore the codebase to understand the motivation and impact
- **The user explicitly requests a deep review**

**How it works:**
1. Fetch PR metadata — GitHub `gh pr view <n> --json …`, ADO `mcp__azure-devops__getPullRequest`.
2. Run the setup script to create an isolated worktree (see Quick Start above).
3. Perform the review from within the worktree, where you have full access to the source tree.
4. Use the generated templates in `scratchpad/pr_reviews/pr-<number>/analysis/` to structure your findings.
5. When the review is complete, remind the user to clean up the worktree:
   ```bash
   git worktree remove worktrees/pr-<number>-review
   ```

### Local Branch Review (no PR)

Use this mode when reviewing changes on the **current branch** before a PR has been created — comparing local work against a base branch.

**When to use:**
- The user asks to review their current branch or local changes
- No PR number is provided
- The user wants a pre-PR review to catch issues before opening a pull request

**How it works:**
1. Find the merge-base between HEAD and the base branch:
   ```bash
   git fetch origin <base_branch> && git merge-base HEAD origin/<base_branch>
   ```
   If the user doesn't specify a base branch, use `default_base_branch` from repo
   conventions when available. Otherwise auto-detect from `origin/HEAD`; if that
   fails, check which of `main`, `master`, `dev` exists on origin (in that order).
2. Use the merge-base commit to scope all diffs:
   ```bash
   # List changed files
   git diff --name-only <merge_base>...HEAD

   # Full diff
   git diff <merge_base>...HEAD

   # Diff for a specific file
   git diff <merge_base>...HEAD -- path/to/file

   # Commit log since divergence
   git log --oneline <merge_base>..HEAD
   ```
3. Review the diffs the same way as a lightweight review. You already have the full source tree since you're on the branch.

### Making the Decision

After understanding what the user wants reviewed, state which mode you're using and why. If the user disagrees, switch modes. For example:

"This PR changes 4 files with a focused bug fix — I'll do a **lightweight review** from the diffs."

"This PR touches 25 files across 3 layers and introduces a new bulk upload feature — I'll do a **deep review** with a worktree checkout so I can trace the full call chain."

"No PR yet — I'll find the merge-base against the repo's default base branch and review your branch changes locally."

### Complexity Assessment

Use this framework after fetching PR metadata and the changes summary to decide between Lightweight and Deep Review. Evaluate each dimension qualitatively — **no single metric alone determines complexity**; it's the combination that matters.

| Dimension | Low Complexity (→ Lightweight) | High Complexity (→ Deep Review) |
|---|---|---|
| **Scope** | Changes confined to one feature, service, or layer | Changes span multiple layers, modules, or projects |
| **Nature of logic** | Mechanical/repetitive (renames, formatting, bulk updates) or straightforward fixes | Novel business logic, new algorithms, complex control flow, concurrency |
| **Dependency impact** | Changed code has few callers/consumers; side effects are obvious | Changed code is widely referenced — base classes, shared utilities, interfaces, DI registrations |
| **Cognitive load** | Each file's diff can be understood in isolation | You need to hold a mental model of how multiple changed files interact |
| **Context adequacy** | PR description + diff context tells the full story | You need to explore the repo to understand motivation, calling code, or downstream effects |

**Key principle**: A PR that touches many files but makes the same mechanical change everywhere is lower complexity than a PR that touches one file but rewrites a core algorithm. Always assess the **nature and impact** of changes, not just their volume.

## Essential Workflow

1. **Setup code**: `<Use Agent to complete this step> Expectation is that agent sets up the worktree using script provided and returns basic details for further review`

- **Get PR Details**: Fetch the basic PR details — GitHub `gh pr view <n> --json …`, ADO `mcp__azure-devops__getPullRequest`.
- **Triage PR scope**: Get a quick summary (X files added, Y modified, Z deleted) — GitHub derive from `gh pr diff <n> --name-only`, ADO `mcp__azure-devops__getPullRequestChangesCount`. Use this to gauge PR scope and decide how many parallel agents to dispatch.
- **Checkout the pull request**: Use `Start-PRReview.ps1` on PowerShell or
  `Start-PRReview.sh` on Linux/Bash to set up the code and worktree. Both are
  provider-agnostic and operate on Git.
- **Check previous comments**: Check for previous comments on the PR — GitHub `gh pr view <n> --json comments,reviews` / `gh api .../pulls/<n>/comments`, ADO `getPullRequestComments`. Note any ongoing discussions or issues that need addressing. **If previous review comments exist from this reviewer (or Claude), switch to the [Re-Review Workflow](reference/re-review-workflow.md) instead of continuing the initial review.**
- **Check for linked items**: Check for any linked work items (ADO `getWorkItemById`) or linked issues (GitHub `gh pr view <n> --json closingIssuesReferences`) associated with the PR, if applicable.

2. **Classify changed files**: `<Part of step 1 agent output>`

   Categorize each changed file by domain to determine which checks and agents to apply:

   | Path Pattern | Domain | Checks to Apply |
   |---|---|---|
   | `src/Client/BLogic/**` or `src/Client/Apps/**` | NScript Client | NScript compliance, MVVM patterns |
   | `src/Client/**/*.html` | Templates | Binding syntax, xmlns, skin attributes |
   | `src/Client/**/*.less` or `*.css` | Styling | LESS conventions, camelCase classes |
   | `src/Server/Sources/WebServers/**` | Server Controllers | Layer discipline, no direct DB access |
   | `src/Server/Sources/BLogic/**` | Server Business Logic | Layer discipline, MongoDB patterns |
   | `src/Server/Sources/Orleans/**` | Orleans Grains | Grain architecture, reentrancy |
   | `src/Server/Tests/**` | Tests | Test quality, coverage mapping |
   | `*.csproj` | Project Config | SDK, references, compile items |

3. **Understand the changes**: `<Launch agent to understand what the changes are doing and any salient features / bug fixes>`

- **Analyze the changes**: Now that you've checked out the branch and have the changes, analyze them to understand what has been modified, what the intent is, and how it fits into the overall project.
- **Double-check the changes**: Use getWorkItemById tool to double-check the work item associated with the pull request, if applicable.
- **Verify branch convention**: Verify branch and target conventions from the
  repo's actual policy — not from a skill-level default. If repo conventions
  specify `branch_prefix_pattern` or `default_base_branch`, use them. Otherwise
  skip enforcement and emit a `[QUESTION]` only if the branch name looks
  generated (for example `{prefix}/{id}_{title}`) but the policy is unclear.
- **Check PR scope match**: If the PR title or description scope does not match
  the diff (for example, the title says "fix X" but the diff also adds unrelated
  config), emit a `[QUESTION]` on the first review pass. Do not re-raise the same
  scope concern on later re-reviews unless the new delta introduces additional
  unrelated work.

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

4. **Check the code for coding Guidelines**: `<parallel agent — use reference/code-project-alignment-guide.md>`

   <agent_question_guidance>
   **Context Question Emission — applies to ALL agents dispatched in steps 4-8:**

   When reviewing code, if you encounter an area where you **cannot confidently
   determine correctness** due to missing context, emit a `[QUESTION]` item alongside
   your findings. Do NOT guess or silently skip — surface the uncertainty.

   **Emit a question when:**
   - Code does something unusual but it might be intentional (business rule, edge case)
   - A design choice seems suboptimal but could be justified by context you don't have
   - A TODO/HACK comment exists but the urgency and plan are unclear
   - Domain-specific logic that you don't fully understand
   - A dependency is used in a way that might be correct for the specific integration

   **Do NOT emit a question when:**
   - You can determine correctness from the code alone
   - The issue is clearly a defect — emit a finding instead
   - The PR description or work item already explains the intent

   **Question format:**

   ```
   ## Question [N]
   - File: [path:line]
   - Code Context: [the specific code snippet]
   - Uncertainty: [what you cannot determine and why]
   - What Answering Unlocks: [what you could assess with an answer]
   - Suggested Answers: [optional — 2-3 possible answers]
   ```

    Include questions in your output alongside findings. They will be collected
    in Step 10 and posted as `[QUESTION]` inline comments.
    </agent_question_guidance>

    <claim_strength_discipline>
    **Claim-Strength Discipline — applies to ALL agents dispatched in steps 4-8:**

    When proposing doc changes or prescriptive fixes:
    1. If the finding enumerates N instances (for example, "5 controllers do X"),
       verify the corrective wording holds for EACH of the N. Never generalize a
       pattern found in some to a "must" applied to all.
    2. `only`, `all`, `always`, `never`, and `every` claims require exhaustive
       search evidence, not scope-limited grep. If the search was scope-limited,
       soften to "in the searched scope we found only X" and name the scope.
    3. When pushing back on a pattern (for example, "don't hardcode version X"),
       do not use the same pattern in your own verified evidence or suggestion text.
    4. If you cannot safely verify a repo-wide or doc-wide prescription, downgrade
       to a scoped suggestion or emit a `[QUESTION]`.
    </claim_strength_discipline>

    <convergence_guidance>
    Include the Review Intent in every agent prompt. Require each finding to say
    how the changed code affects the stated goal or creates a concrete merge risk.
    A different-but-valid implementation is not a finding. For Critical, High,
    and Medium findings, ask agents for a required outcome and objective closure
    check; suggestions should describe a minimal path, not impose one exact design.
    </convergence_guidance>

- **Code alignment (CRITICAL FIRST)**: Read [Code Alignment Guide](reference/code-project-alignment-guide.md) and verify code follows existing project patterns, no duplication, proper framework usage, consistency with team standards.
- **Review the code**: Look for adherence to coding standards, best practices, and project guidelines.
- **Check for tests**: Use [Testing Assessment Guide](reference/testing-guide.md) — ensure there are appropriate unit tests, integration tests, and end-to-end tests for the changes made.
- **Check for documentation**: Verify that any necessary documentation has been updated or created.

5. **Check the code Quality**: `<parallel agent — use reference guides>`

- **Code quality**: Read [Code Quality Guide](reference/code-quality-guide.md) — check for SOLID violations, code smells, duplication.
- **Performance**: Read [Performance Review Guide](reference/performance-guide.md) — check for N+1 queries, memory leaks, algorithm efficiency.
- **Security**: Read [Security Checklist](reference/security-checklist.md) — check OWASP Top 10, injection risks, auth issues.

6. **Design Principles**: `<parallel agent>`

- **Analyze the code base for duplication**: Use Sequential Thinking tools to analyze the code base for duplication and suggest refactoring if necessary.
- **Check for modularity**: Ensure that the code is modular and follows the Single Responsibility Principle.
- **Reanalyze if functionality can be simplified**: If you find any complex logic, suggest ways to simplify it or break it down into smaller, more manageable functions.
- **Check if code follows Design Patterns from the code base**: Ensure that the code follows the design patterns used in the code base, such as MVC, Singleton, Factory, etc.

7. **Domain-Specific Review**: `<parallel agents — dispatch based on file classification from step 2>`

   Based on file classification from step 2, dispatch the appropriate specialized review agents in parallel. Only dispatch agents whose domain is present in the PR:

   - **`nscript-review`**: Dispatch when changed files include NScript client code — `.cs` files under `src/Client/` referencing `ObservableObject`, `Promise<T>`, `[AutoFire]`, `Mcqdb.NScript.Sdk`, or `.html`/`.less` template/style files in client projects. Covers AutoFire/nameof enforcement, Promise patterns, IoC registration, NScript C# restrictions, MVVM patterns, template bindings, LESS conventions, and JS interop attributes (`[JsonType]`, `[IgnoreNamespace]`, `[ScriptName]`).

   - **`orleans-review`**: Dispatch when changed files include Orleans grain code — classes inheriting `Grain`/`Grain<TState>`, grain interfaces (`IGrainWithStringKey`, etc.), `[Reentrant]`/`[AlwaysInterleave]` attributes, stream subscriptions, or silo configuration. Covers reentrancy/deadlock analysis, state management, stream anti-patterns, grain-level architecture (upward level references, cross-level calls, missing marker interfaces, missing `[StorageProvider]`), and async patterns within grains.

   - **`debugging:logging-review`**: Dispatch when changed files include logging statements — `ILogger`, `LoggerFactory`, `_logger.Log*`, structured logging templates, or test code with `Console.WriteLine`. Covers structured logging compliance, log levels, queryability, test logging practices, EUII policy enforcement, and client-side log forwarding checks.

   - **`temp-code-review`**: **Always dispatch for every PR.** Scans all changed files for temporary code, debugging artifacts, hardcoded bypasses/hacks, mistakenly committed files, test/mock data in production code, disabled tests, and accidental inclusions. Catches `Console.WriteLine` in production code, `// HACK`/`// TODO: remove` comments, hardcoded credentials, `.env` files, forced `if (true)` branches, `Debugger.Launch()`, and similar patterns that should never reach production.

   - **`duplicate-code-detector`**: Dispatch when PR adds substantial new code (new classes, methods, or logic blocks). Finds exact duplicates, near-duplicate blocks with minor variations, repeated patterns, and structural duplication across the changed files and the broader codebase. Suggests concrete extractions (shared methods, base classes, utilities).

   - **`euii-leak-detector`**: Dispatch when PR adds or modifies logging, telemetry, error messages, or HTTP logging. Scans for End User Identifiable Information (EUII) leaks — emails, names, tokens, IPs, passwords, connection strings. Uses heuristic field name matching to catch PII in log templates, exception messages, and API responses.

   - **`class-design-simplifier`**: Dispatch when PR introduces NEW classes, interfaces, or architectural layers. Analyzes what the PR is trying to accomplish, then flags over-engineering: single-implementation interfaces, pass-through layers, premature generalization, deep inheritance hierarchies. Proposes merging, inlining, or flattening.

   - **`code-simplifier`**: Dispatch when PR introduces complex control flow (deep nesting, long method chains, verbose conditional logic) or when changed methods exceed ~30 lines. Finds code blocks and method chains that are more complex than they need to be — unnecessary method chains, overly verbose patterns, expressions with simpler equivalents, and control flow that can be flattened. Complements `class-design-simplifier` (which focuses on class/layer-level complexity) by focusing on **expression and block-level** simplification. **Do NOT dispatch** for PRs that are purely mechanical (renames, formatting, bulk attribute changes) or documentation-only.

   - **`over-engineering-review`**: Dispatch when a linked work item, PR description, or user-supplied task description gives a clear "what was asked" anchor — and the PR's diff feels larger or more elaborate than that anchor would justify. Compares delivered scope to stated intent and flags drive-by refactors, speculative abstractions for hypothetical futures, defensive code for impossible scenarios, premature optimization without measurement, unrequested features, excessive logging, tutorial-style comments, single-use helper extractions, unused configuration hooks, and parallel duplicate code paths added next to existing code instead of extending it. Especially valuable for LLM-generated PRs, which disproportionately over-produce. Distinct from `class-design-simplifier` and `code-simplifier`, which judge complexity in isolation; this agent judges complexity *relative to the task*. **Do NOT dispatch** when no anchor source is available (no work item, vague PR description, no commits/user context) and the diff is small — the YAGNI-only fallback is too noisy on tiny PRs.

   - **`exception-handling-review`**: Dispatch when changed files contain `try`/`catch` blocks, `throw` statements, custom exception classes, or error-handling middleware. Reviews exception handling for swallowed exceptions, overly broad catches, incorrect re-throws (`throw ex` vs `throw`), missing logging in catch blocks, exceptions used for flow control, catch-log-rethrow duplication across layers, async exception pitfalls (`async void`, fire-and-forget), finally block issues, and missing guard clauses. Findings are HIGH-MEDIUM severity.

   - **`test-coverage-review`**: Dispatch when the PR modifies production code (any non-test `.cs`, `.js`, `.ts` file). Maps production changes to test changes, verifies tests cover the actual behavior being modified (not just adjacent code), checks for over-mocking, test-driven production pollution, fragile tests, and missing edge cases. For bug fixes, applies the litmus test: "Would this test have FAILED before the fix?" Focuses on behavioral coverage over line coverage, with a 1-10 criticality rating. Findings are HIGH-MEDIUM severity.

   - **`architecture-review`**: Dispatch when PR introduces new services, classes, or projects; modifies `.csproj` project references; changes DI registrations; adds cross-layer dependencies; or restructures module/project boundaries. Reviews layer boundary violations (controller accessing DB directly), dependency direction in project references, god class/service detection, circular dependencies, DI anti-patterns (service locator, captive dependencies), cross-cutting concern mismanagement, and bounded context violations. **Do NOT dispatch** when PR only modifies method bodies, configuration values, or styling with no structural changes. Complements `class-design-simplifier` (which focuses on class-level complexity) by analyzing system-level architectural health.

   - **`performance-review`**: Dispatch when changed files contain async/await patterns, `HttpClient` usage, database access (EF Core, MongoDB, SQL queries), large collection operations (`.ToList()`, `.ToArray()` on queries), caching logic (`IMemoryCache`, `IDistributedCache`), serialization/deserialization, React components with hooks (`useState`, `useEffect`, `useMemo`, `useCallback`), `fetch`/`axios` calls, state management (Redux, Context), or bundle configuration. Also dispatch when the PR description or linked work item mentions performance, optimization, scaling, latency, memory, or throughput. Auto-detects backend (.NET/C#) vs frontend (React/JS/TS) domains from changed files and applies only relevant patterns. Covers: sync-over-async/thread pool starvation, OOM patterns (unbounded collections, LOH, missing dispose), N+1 HTTP/DB calls, HttpClient misuse, connection pool exhaustion, request waterfalls, bundle size anti-patterns, React re-render cascades, DOM performance, and frontend memory leaks. Findings range from CRITICAL (socket exhaustion, unbounded queries) to MEDIUM (missing memoization, over-serialization). **Do NOT dispatch** when the PR only modifies documentation, test-only files, configuration values, or CSS/LESS styling with no production logic changes.

   - **`schema-compatibility-review`**: Dispatch when changed files include a `.proto` / `.thrift` / `.avsc` / `.fbs` / `.bond` schema file, a database migration (EF Core `Migrations/`, Flyway, Liquibase, raw SQL DDL), a type annotated for serialization (`[GenerateSerializer]`, `[Id]`, `[DataContract]`, `[DataMember]`, `[JsonPropertyName]`, `[ProtoMember]`, `[BondMember]`, `@JsonProperty`), a request/response DTO, a queue or event payload, a public-API or SDK-exported type, an enum used in persisted/transmitted data, or any code on either side of a serialize/deserialize boundary. Also dispatch when the PR description, work item, or commit message mentions rollout order, deploy window, rolling deploy, feature flag gating a wire change, capability negotiation, schema versioning, or forward/backward compatibility. Walks the five compatibility lenses (backward, forward, rollout sequencing, public-surface stickiness, serialize/deserialize symmetry) and nine change patterns (removed/renamed field, added required field, type/semantic change, enum value change, tightened constraint, rollout sequence violation, public-surface break, serializer-asymmetry, migration footgun). Findings default to BLOCKER for any backward-incompatible change to persisted or public-surface shapes; HIGH for rollout-sequence violations without a flag; HIGH/MEDIUM for serializer asymmetry being introduced or extended. Distinct from `architecture-review` (system structure), `performance-review` (runtime characteristics), and `over-engineering-review` (scope) — this agent specifically owns *wire-level and persisted compatibility across the deploy window*. **Do NOT dispatch** when the PR only touches in-process types that are never serialized, persisted, or sent over a network, and there is no migration file in the diff.

   - **`feature-flag-reviewer`**: Dispatch when the PR introduces changes large or risky enough that a bad rollout would be expensive to reverse — and recommend whether the change should ship behind a feature flag. Specific triggers: new or modified business logic on a critical path, changed default values or validation rules, new/changed API contracts (request/response shapes, status codes), database schema migrations, new external service dependencies, changed retry/timeout/circuit-breaker configurations, new background jobs or async workflows, large refactors of code with broad fan-out, or work items tagged "risky" / "high-blast-radius" / "behind-flag". Assesses **blast radius** (how many users/requests the change touches), **reversibility** (can it be rolled back cleanly, or has it written persisted state), and **change type** (behavior change, data change, infra change) to recommend a flag strategy: full kill-switch, percentage rollout, ring-based rollout, or no flag needed. Findings are advisory MEDIUM by default; escalate to HIGH when the change is irreversible (e.g., persisted-data shape change with no rollback) and ships without a flag. Distinct from `schema-compatibility-review` (which owns *whether the change breaks compat*) — this agent owns *whether the change should be flag-gated regardless of compat*. **Do NOT dispatch** when the PR is purely additive in a low-risk area (new internal helper, documentation, test additions), purely cosmetic (renames, formatting), or already explicitly behind a flag named in the diff.

   <mandatory_dispatch>
   **Dispatch rules:**
   - **`temp-code-review` is mandatory** — dispatch it for every PR regardless of domain
   - A single PR may trigger multiple agents (e.g., a PR touching both Orleans grains and NScript client code dispatches both `orleans-review` and `nscript-review`)
   - Run all applicable agents in parallel — they are independent
   - Collect findings from all agents before proceeding to step 8
   </mandatory_dispatch>

   **Server-side checks (applied directly, no agent needed):**

   These checks apply to server-side code (`src/Server/`) and should be performed as part of the general review in steps 4-6:

   **Server Layer Discipline (HIGH severity):**

   | Check | What to Flag |
   |---|---|
   | Layer violation | Controller directly accessing `IMongoCollection<T>` (should go through WebApi.Core helper) |
   | Cursor leak | `ToCursorAsync()` without `using` block or `.ForEachCursor()`/`.ToEnumerableAsync()` wrapper |
   | Missing DI registration | New service class without corresponding registration in IoC config |
   | Direct `new` of services | `new MyService()` instead of DI injection |
   | Wrong build tool | References to `dotnet build` for Server.sln (should be MSBuild) |

   **MongoDB Patterns (MEDIUM severity):**

   | Check | What to Flag |
   |---|---|
   | N+1 query | Loop with individual `.Find()` calls (should use `Filter.In` for batch) |
   | Missing index hint | New filter field not covered by existing indexes |
   | No VersionId on update | `FindOneAndUpdateAsync` without `VersionId` in filter for concurrency-sensitive docs |
   | Large ToListAsync | `.ToListAsync()` on potentially large collections (should use cursor with `BatchSize`) |
   | Missing read preference | Read-heavy query without `WithReadPreference(SecondaryPreferred)` |

8. **External Agent Discovery and Dispatch**: `<parallel agents — dispatch based on PR characteristics from steps 2-3>`

   Beyond the plugin-owned domain agents in step 7, the environment provides additional review agents that add unique value for specific PR types. Dispatch them conditionally based on PR signals.

   **Agent Dispatch Matrix:**

   | Agent | Dispatch When | Skip When |
   |---|---|---|
   | `pr-review-toolkit:silent-failure-hunter` | PR contains try-catch blocks, error handling, fallback logic, `.catch()`, `Result<T>` | PR is purely additive with no error handling, or only config/styling |
   | `pr-review-toolkit:type-design-analyzer` | PR introduces NEW classes, records, structs, interfaces — especially data models, domain entities, DTOs | PR only modifies method bodies without changing type signatures |
   | `pr-review-toolkit:pr-test-analyzer` | PR includes test file changes OR adds new public methods that should have tests | PR is test-only with no source changes, or documentation-only |
   | `pr-review-toolkit:comment-analyzer` | PR adds/modifies XML doc comments, inline documentation blocks, or README content | PR has no comment changes |
   | `pr-review-toolkit:code-simplifier` | PR is LARGE (20+ files) AND introduces complex new logic (deep nesting, long methods) | PR is small/medium or straightforward changes |
   | `orleans-dev:orleans-reviewer` | PR modifies Orleans grain code spanning 5+ grain files, changes cross-grain communication patterns, or restructures silo configuration. Provides deeper Orleans expertise than the code-reviewer plugin's `orleans-review` agent — dispatch both for complex Orleans PRs | PR touches 1-2 grain files with simple changes (step 7's `orleans-review` is sufficient) |
   | `code-simplifier:code-simplifier` | PR introduces verbose or complex logic that could benefit from a second simplification pass — especially when step 7's `code-simplifier` has already flagged issues and you want a complementary perspective | Step 7's `code-simplifier` found no issues, or PR is small/mechanical |
   | `superpowers:code-reviewer` | **Dispatch whenever the PR's linked work item/bug/task has an implementation plan.** During step 1, when fetching work item details and comments, read the full comment/reply chain to determine if an implementation plan was posted (by a bot or a human). Also check the PR description for references to a plan, spec, design doc, or requirements. If any form of implementation plan exists, dispatch this agent — it reviews whether the actual code matches what was planned, catching drift, missed steps, partial implementations, and deviations without justification. | No linked work item exists, OR after reading the work item comments and PR description no implementation plan or spec is found, OR the PR is a hotfix with no prior planning |

   **Agents excluded by default (overlap with steps 4-7):**
   - `pr-review-toolkit:code-reviewer` — Steps 4-5 already cover general code quality with project-specific reference guides
   - `feature-dev:code-reviewer` — Same overlap with steps 4-5
   - `architecture-reviewer` — Step 7's `architecture-review` agent covers architectural issues with project-specific context; skip the external `architecture-reviewer`
   - **Exception**: Dispatch `feature-dev:code-reviewer` as a second-opinion safety net when PR is **30+ files** OR touches **security-sensitive code** (auth, crypto, payment)

   <dispatch_heuristics>
   **Size-based dispatch heuristics:**
   - **Small PR (1-5 files)**: 0-1 external agents — only dispatch if strong signal match
   - **Medium PR (6-19 files)**: 1-2 external agents — dispatch best-matching agents
   - **Large PR (20+ files)**: All matching agents — cast a wide net
   </dispatch_heuristics>

   **Future-proofing for unknown agents:** For agents NOT listed in the catalog above (newly added to the environment), evaluate by reading their description and checking: (a) does it cover something not already addressed in steps 4-7? (b) does this PR have relevant signals for it? If both answers are yes, dispatch the agent.

   **Execution:** Run all selected external agents in parallel. Where possible, dispatch concurrently with step 7 domain agents to minimize wall-clock time. Collect all findings before proceeding to step 9.

9. **Cross-Reference Test Coverage**:

   Verify the PR includes adequate test coverage using repo conventions:

   - If repo conventions define `test_project_map`, use it.
   - Otherwise infer likely test projects from naming patterns such as
     `<Project>.Tests`, `<Project>.UnitTests`, or `<Project>.IntegrationTests`,
     and note uncertainty when the mapping is ambiguous.
   - Only enforce repo-specific CI test markers or test attributes when the repo
     conventions explicitly define them.

   If `pr-review-toolkit:pr-test-analyzer` was dispatched in step 8, cross-reference its behavioral findings with the structural test-to-source mapping here.

   Flag if:
   - New public methods have no corresponding test methods
   - Existing tests were modified but not in a way that covers the new behavior
   - Repo-specific test inclusion markers are missing when configured for this repo

10. **Consolidate Context Questions**: `<Collect from all agent outputs>`

    During steps 4-9, review agents may encounter code where they **cannot confidently
    determine correctness** because they lack business context, intent, or domain
    knowledge. Instead of guessing or silently skipping, agents emit `[QUESTION]` items
    alongside their findings. This step consolidates those questions.

    <context_questions_philosophy>
    **Why questions matter:**

    A reviewer who silently skips an uncertain area provides a false sense of coverage.
    A reviewer who guesses creates false positives that erode trust. Context questions
    are the honest middle ground — they say "I noticed something that might be wrong,
    but I need your input to know for sure." This is more valuable than either silence
    or noise.

    **Questions are NOT findings.** They don't assert a defect. They signal reviewer
    uncertainty and request author clarification. They are always non-blocking.
    </context_questions_philosophy>

    **When agents should emit questions (guidance given to all agents in steps 4-8):**

    - The code does something unusual but it might be intentional (business rule, edge case handling, legacy constraint)
    - A design choice seems suboptimal but could be justified by context the reviewer doesn't have
    - The PR implements partial logic and it's unclear if the rest is in a sibling PR or missing
    - A TODO/HACK comment exists but the urgency and plan are unclear
    - The code handles a scenario the reviewer doesn't fully understand (domain-specific logic)
    - A dependency or external service is used in a way that might be correct for the specific integration but looks wrong in isolation

    **Question format (as emitted by agents):**

    ```
    ## Question [N]
    - File: [path:line]
    - Code Context: [the specific code snippet that triggered the question]
    - Uncertainty: [what the reviewer cannot determine and why]
    - What Answering Unlocks: [what the reviewer could assess if this question is answered]
    - Suggested Answers: [optional — 2-3 possible answers to guide the author's response]
    ```

    **Consolidation workflow:**

    1. Collect all `[QUESTION]` items from agent outputs in steps 4-9
    2. De-duplicate: if two agents ask about the same code area, merge into one question
       that captures both angles
    3. Filter out questions that are already answered by the PR description, work item
       context (from `pr-context`), or inline code comments
    4. Rank by review impact: questions that would affect severity grading or verdict
       determination rank higher
    5. Cap at **10 questions per review** — if more exist, keep the highest-impact ones
       and note "N additional questions omitted for brevity"

    **What flows forward:**
    - Questions do NOT go to the review-grader (Step 11) — they are separate from findings
    - Questions go directly to the `post-pr-review` skill (Step 12) for posting as
      inline comments with `[QUESTION]` tag

11. **Severity Grading — Quality Gate**: `<Dispatch review-grader agent>`

   Before determining the verdict, dispatch the `review-grader` agent to re-evaluate all
  findings against the Review Intent and impact dimensions. This is **mandatory for every
  review** — the grader protects both code quality and convergence by correcting over- and
  under-weighted findings, separating severity from blocking status, and making substantive
  feedback ready to resolve in one focused pass.

   **How to dispatch:**

  1. Start the grader input with the unchanged Review Intent from Step 3.
  2. Consolidate all findings from steps 4-9 into a structured list.
  3. De-duplicate first: when multiple agents flag the same issue, keep the more detailed version.
  4. Assign each finding a stable ID (`F-001`, `F-002`, ...). Reuse the same ID
    on re-review; IDs never change when severity or wording changes.
  5. Format each finding as:

    ```text
    ## Finding [N]
    - Id: [F-NNN]
    - Original Severity: [CRITICAL/HIGH/MEDIUM/LOW]
    - Blocker: [Yes/No]
    - Category: [e.g., Conventions, Architecture, Security, etc.]
    - File: [path]
    - Line: [1-based line or null]
    - Issue: [description]
    - Why It Matters: [concrete consequence for this PR, or "not supplied"]
    - Required Outcome: [condition that must be true, or "not supplied"]
    - Suggested Path: [minimal fix or options, or "not supplied"]
    - Done When: [objective closure evidence, or "not supplied"]
    ```

  6. Dispatch `review-grader` with the Review Intent and formatted findings list.
  7. Require the grader to return each surviving finding using the exact
    posting schema from `post-pr-review`: `id`, `severity`, `blocker`,
    `category`, `file`, `line`, `issue`, `whyItMatters`, `requiredOutcome`,
    `suggestedPath`, and `doneWhen`. Merge by stable `id`; never reconstruct
    location or issue text from grader prose.
  8. Use both the **graded severity and graded blocker status** for verdict
    determination in Step 12. Do not infer blocking from severity alone.

   **What the grader returns:**

  - Posting-ready final findings with stable IDs and the exact schema above
  - Regrading rationale and dimension scores, including de-escalations
  - IDs of out-of-scope or unsubstantiated findings to omit
   - Graded verdict recommendation (may differ from what original severities would imply)
  - Verdict rationale and the shortest path to approval when changes are requested

  If the grader changes severity or blocker status, use the final classification without
  exposing internal agent disagreement. Explain the concrete impact and closure condition
  to the author; that is what helps them act.

  **Assemble durable thread state before Step 12.** Build `reviewThreads[]`
  from existing bot-owned finding threads plus new final findings:

  ```text
  - findingId: F-NNN
  - threadId: provider thread/comment ID, or null for a new finding
  - status: NEW | ACTIVE | RESOLVED | VERIFIED | WONT_FIX_ACCEPTED | HANDOFF_REQUIRED
  - blocker: true | false
  - authorAttemptCount: non-negative integer
  - lastAuthorAttemptCommit: source commit SHA, or null
  - pendingAction: POST | REPLY | CLOSE | HANDOFF | NONE
  - actionId: <findingId>:<pendingAction>:<sourceCommit-or-none>:<authorAttemptCount>, or null
  - lastCompletedActionId: last provider-reconciled action ID, or null
  - requiredOutcome: stable implementation-neutral condition
  - doneWhen: stable objective closure evidence
  - evidence: current resolution or remaining-risk evidence
  ```

  Increment `authorAttemptCount` only when a new source commit, different from
  `lastAuthorAttemptCommit`, attempts to address that finding. A review
  invocation by itself is not an attempt. Set exactly one `pendingAction` from
  the state transition and derive a deterministic `actionId`; the posting skill
  reconciles that ID and resets the action to `NONE` after success. Emit exactly
  one thread record for every final finding, with matching blocker and closure
  fields, while retaining unresolved historical blocker records.

  `NEW`, `ACTIVE`, `RESOLVED`, and `HANDOFF_REQUIRED` are substantive blocker
  states. `VERIFIED` and `WONT_FIX_ACCEPTED` are closure candidates and must have
  `pendingAction = CLOSE`. After provider closure, move the record out of
  `reviewThreads[]` and into `closedThreadArchive[]`; only then may the posting
  skill cast an approval vote after canonical state persistence succeeds.

12. **Provide Feedback**: `<Use post-pr-review skill>`

    Delegate all comment posting, question posting, and summary thread management to the
    `post-pr-review` skill. This skill owns the full "publish review results to the PR
    provider (GitHub or Azure DevOps)" workflow.

    **Use:**

    ```
    skill: "code-reviewer:post-pr-review"
    ```

    **Pass the following inputs:**

    | Field | Source |
    |-------|--------|
    | `prNumber` | PR number from Step 1 |
    | `repository` | Repository name from Step 1 |
    | `botPrefix` | `[<dev name>'s bot]` — the standard bot prefix for all comments |
    | `reviewIntent` | Stable Review Intent record from Step 3 |
    | `findings[]` | Posting-ready final findings from Step 11 using the exact schema |
    | `reviewThreads[]` | Full durable state for non-terminal and new finding threads |
    | `closedThreadArchive[]` | Compact terminal records recovered from the canonical summary plus newly closed records |
    | `closedThreadArchiveOmittedCount` | Cumulative omitted archive count; `0` on initial review |
    | `questions[]` | Consolidated context questions from Step 10 |
    | `isSmallDelta` | `true` when a re-review delta qualifies for small-delta mode per `reference/re-review-workflow.md`; otherwise `false` |
    | `smallDeltaSummary` | A 1-3 sentence delta-only reply used when `isSmallDelta` is `true` |
    | `verdict` | Determined from graded findings — see verdict rules below |
    | `reviewType` | `initial` or `re-review` |
    | `outputFormatMarkdown` | The formatted review summary (from [Output Format](reference/output-format.md)) |

    **Determine verdict before using** — use the Review Intent and graded blocker status:
    - **`APPROVE`** — The stated problem is solved, the solution is in the right
      ballpark, and no blockers remain. Reserve this for reviews with no
      substantive follow-up; optional nits may be summarized without delaying merge.
    - **`APPROVE_WITH_COMMENTS`** — The stated problem is solved, the solution is
      in the right ballpark, and no blockers remain, but useful non-blocking
      Medium/Low follow-up exists. These comments must not create another required cycle.
    - **`REQUEST_CHANGES`** — The stated problem is not solved, the solution is
      fundamentally misaligned, or one or more evidence-backed blockers remain.
      Multiple Medium findings justify this verdict only when their combined,
      concrete impact makes the PR unsafe or incomplete to merge; an abstract
      pattern of polish concerns is not enough.

    If Review Intent is `UNCLEAR` and no merge risk is demonstrated, use
    `APPROVE_WITH_COMMENTS` and ask one non-blocking question. If the missing
    evidence prevents verification of a core outcome or safety property, create
    one evidence blocker with objective `Done When` and use `REQUEST_CHANGES`.
    Do not invent a fourth `COMMENT` verdict.

    Never request changes solely for personal style, a valid alternative design,
    unrelated cleanup, speculative precedent, or perfection beyond the PR goal.
    When requesting changes, the summary must give a prioritized **shortest path
    to approval** using the stable `Required Outcome` and `Done When` fields.

    **Posting is automatic** — do NOT ask the user for permission to post findings,
    questions, or the summary to the PR (GitHub or Azure DevOps). The whole point of
    the review workflow is to publish feedback. Post immediately after determining the verdict.

    **Exception — approve/merge still require confirmation:**
    - Approving the PR (if verdict is `APPROVE` or `APPROVE_WITH_COMMENTS`) — confirm with user first
    - Merging the PR — always confirm with user first

    The `post-pr-review` skill handles:
    - Posting inline/file/general comments for findings (3-tier priority with fallback)
    - Posting inline comments for context questions (with `[QUESTION]` tag)
    - Updating the existing summary: reply in the ADO thread, or PATCH the
      canonical GitHub issue comment in place (instead of creating a new one)
    - Optionally approving the PR (for either no-blocker verdict when the user confirms)
    - Optionally merging the PR (if user requests, with merge strategy confirmation)

    After the skill completes, proceed to Step 13 to update tracking state.

    For re-review workflow, load [reference/re-review-workflow.md](reference/re-review-workflow.md).

13. **Update Review Tracking** (after posting feedback):

   **Skip this step for Local Branch Reviews** (no PR number) — tracking only
   applies to remote pull requests (GitHub or Azure DevOps).

   Persist this review in the local tracking state so `code-reviewer:review-pending-prs`
   (and future runs of `code-reviewer:pr-review`) know this PR was reviewed.

   Use the shared tracking skill:

   ```
   skill: "code-reviewer:update-pr-tracking"
   ```

   Pass the following context from this review:

   | Field | Source |
   |-------|--------|
   | `prNumber` | PR number from Step 1 |
   | `title` | PR title from the provider |
   | `sourceBranch` | Source branch (GitHub `headRefName`; ADO without `refs/heads/`) |
   | `targetBranch` | Target branch (GitHub `baseRefName`; ADO without `refs/heads/`) |
   | `author` | PR author (GitHub `author.login`; ADO `createdBy.displayName`) |
   | `createdAt` | PR creation date from the provider |
   | `lastKnownPushAt` | Latest push timestamp (GitHub head-commit date; ADO `lastMergeSourceCommit.committer.date`) |
   | `verdict` | Verdict from Step 12 (`APPROVE`, `APPROVE_WITH_COMMENTS`, `REQUEST_CHANGES`) |
   | `status` | `completed` (or `error` if review failed) |
   | `reviewType` | `initial` or `re-review` (based on whether previous comments existed) |
   | `sourceCommitId` | HEAD commit of source branch |
   | `findings` | `{ critical, high, medium, low }` counts from review |
   | `commentsSummary` | Top 5 findings (one-line each) |
   | `blockerCount` | Number of `[BLOCKER]`-tagged findings |
   | `questionsAsked` | Number of `[QUESTION]` comments posted |

   The `code-reviewer:update-pr-tracking` skill handles all storage path detection, `tracking.json` management, and per-PR review history. See its [SKILL.md](../update-pr-tracking/SKILL.md) for full details (`code-reviewer:update-pr-tracking` skill).

   **Error handling**: If tracking fails, the skill warns but does NOT fail the
   review. Tracking is best-effort — the review posted to the PR is the primary output.

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

**2. Guide the Finding to Closure**

- Tie the consequence to the stated PR goal or a concrete merge risk
- State the required outcome without prescribing the author's exact implementation
- Offer a minimal fix or code example when it materially reduces author effort
- Define observable evidence that will close the thread

**3. Reference Exact Locations**

- Format: `path/to/file.cs:123` or `UserService.cs:45-67`

**4. Lead with Substance**

- Start with whether the PR solves its stated problem and whether the solution
  is substantially sound.
- Acknowledge genuinely good patterns when they exist — but never manufacture
  praise to soften criticism. Empty compliments dilute the signal.
- Lead with the most important findings. The reviewer's job is to protect the
  codebase and help the author reach a mergeable result.
- End with the shortest path to approval, prioritized by blocker status and impact.

**5. Hold a Stable, Evidence-Based Bar**

- Do not lower the bar because a PR is small, the author is senior, or the
  deadline is tight. Standards exist precisely for when it's inconvenient to
  follow them.
- Do not raise or reinterpret the bar after the author addresses the stated
  required outcome. Accept equivalent safe fixes.
- Consolidate repeated instances into one pattern-level finding with bounded,
  verified locations and one closure condition. Do not create a thread per
  occurrence when one fix strategy addresses all of them.
- Keep optional improvements explicitly non-blocking and out of future required
  re-review cycles.

**6. Verify Before Claiming — Avoid False Positives**

Do NOT claim something "doesn't exist", "won't compile", "has no callers", "is
unused", or that code "only/all/always/never" behaves a certain way unless you
have high-confidence evidence. Search tools on large repos are unreliable. A
false positive or over-claimed generalization damages reviewer credibility more
than a missed finding. Always search the source branch, scope searches to avoid
timeouts, check the PR diff itself, respect green build status as authoritative
evidence, and qualify scope-limited evidence in the wording of your finding. When
suggesting documentation or policy wording across multiple instances, verify it
against each enumerated instance before recommending it.

For full rules, see [Codebase Search Discipline](../../references/codebase-search-discipline.md).

## Quick Reference Checklist

Start with [Code Alignment Guide](reference/code-project-alignment-guide.md) — verifying project patterns, duplication, and framework usage is the highest-priority check.

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
- [ ] Specific feedback with file:line references
- [ ] Required outcome and objective closure check for every blocker
- [ ] Minimal fix guidance or code examples where they reduce iteration time
- [ ] Balanced positive and constructive feedback

## Detailed Guides

For comprehensive checklists and examples:

- [Security Checklist (OWASP Top 10)](reference/security-checklist.md)
- [Performance Review Guide](reference/performance-guide.md)
- [Code Quality Guide](reference/code-quality-guide.md)
- **[Code Alignment Guide](reference/code-project-alignment-guide.md)** — start here for consistency
- [Testing Assessment Guide](reference/testing-guide.md)
- [Scripts Documentation](scripts/README.md)

## Integration with Tools

For tool and agent catalog, see [reference/tool-catalog.md](reference/tool-catalog.md).

For output format template, load [reference/output-format.md](reference/output-format.md).

Publishing comments — use the provider's mention conventions
([GitHub](../../references/gh-mention-conventions.md) /
[Azure DevOps](../../references/ado-mention-conventions.md)).
IMPORTANT (Azure DevOps): reference a work item with `#` (e.g. `#12354`) and a PR
with `!` (e.g. `!4212`) — `!` is for PRs, `#` is for bugs/work items.
On GitHub, both issues and PRs use `#` (e.g. `#123`); there is no `!` syntax.
