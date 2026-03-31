---
name: pr-review
description: Conduct code reviews of individual pull requests analyzing performance, code alignment, correct usage of external libraries, testing coverage, and code quality. Provides structured feedback with file:line references and code examples. Use when asked to "review PR #[number]", "code review pull request", "check PR for issues", or "analyze PR changes". Works with PR numbers, branch names, or Azure DevOps URLs. NOT for developer performance reviews over time.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch, Skill, mcp__azure-devops__*
---
# Pull Request Code Reviewer

Review individual PRs for code quality, security (OWASP Top 10), performance, and testing adequacy.

<reviewer_philosophy>
## Guardian Mindset

The reviewer is the **guardian of the codebase**. Every PR is a gate — code that
passes through lives in the codebase indefinitely. Slow, incremental slippage is
the primary threat: one missing null check, one untested edge case, one
copy-pasted block, one swallowed exception — each individually minor, but
compounding over months into a codebase that is fragile, unpredictable, and
expensive to change.

**Core beliefs:**

- **No "just this once"** — If a pattern is wrong, it's wrong regardless of PR
  size, deadline pressure, or author seniority. Letting it slide once creates
  precedent. The next developer will copy the pattern and cite this PR.
- **Entropy is the default** — Without active resistance, codebases degrade.
  Every review is an opportunity to hold the line or push quality forward.
  Accepting "good enough" repeatedly is how good codebases become bad ones.
- **Small issues compound** — A missing test today means a regression tomorrow.
  A duplicated block today means divergent behavior next quarter. Flag it now.
- **The PR is the last checkpoint** — Once merged, fixing issues costs 5-10x
  more (context switching, regression risk, discovery lag). Catching problems
  here is the cheapest intervention point.
- **Protect future developers** — The person reading this code next year should
  not have to wonder "why was this done this way?" or discover a latent bug
  through a production incident.

**What this means in practice:**

- Do NOT soften findings to be "nice" — be direct, specific, and honest. A
  clear `[BLOCKER]` tag is kinder than a production outage.
- Do NOT skip issues because "it's a small PR" — small PRs with bad patterns
  are the most dangerous because they fly under the radar.
- Do NOT approve with known issues just because the PR has been open too long.
  Time pressure is not a reason to lower the bar.
- DO acknowledge genuinely good work — but only when it's genuinely good, not
  as a social lubricant before delivering criticism.
- DO provide the fix, not just the complaint — every finding should include a
  concrete suggestion or code example.
- DO distinguish between BLOCKER (must fix) and non-blocking (should fix) —
  not everything is equally important, but nothing is beneath notice.
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

## Basics, identify which repo to use

When you check git remote, you will see something like this:

```
origin	https://mcqdbdev.visualstudio.com/MCQdb_Development/_git/MCQdb (fetch)
origin	https://mcqdbdev.visualstudio.com/MCQdb_Development/_git/MCQdb (push)
```

From this you can check ADO variables\
1. AZURE_DEVOPS_ORG_URL = https://mcqdbdev.visualstudio.com/
2. AZURE_DEVOPS_PROJECT = MCQdb_Development
3. AZURE_DEVOPS_REPOSITORY = MCQdb

Use this mechanism to discover repository name.

Template:
<AZURE_DEVOPS_ORG_URL>/<PROJECT>/_git/<REPOSITORY>

## Quick Start

**LLM Workflow:**

1. Fetch PR data using MCP:

```
mcp__azure-devops__getPullRequest -pullRequestId 12345 -de
```

2. Extract source branch from response (e.g., `sourceRefName: "refs/heads/developers/gb/feature"`)
3. Call `pwsh` script with parameters:

```pwsh
<PATH_FOR_PR-REVIEWER_SKILL_ROOT_DIRECTORY>\scripts\Start-PRReview.ps1 `
    -PRNumber 12345 `
    -SourceBranch "developers/gb/feature" `
    -PRTitle "Add bulk upload feature" `
    -PRAuthor "Gautam Bhakar"
```

Creates isolated worktree with analysis templates.

4. Take a note of mergeBase (Make sure both target and source are based on origin) e.g.

```bash
git merge-base origin/dev origin/feature/user/feature_name
```

NOTE: everything is based of origin.

5. From this point onwards, all diffs are against merge-base-commit-id

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
1. Use `mcp__azure-devops__getPullRequest` to fetch PR metadata (title, author, description, source/target branches).
2. Use `mcp__azure-devops__getPullRequestFileChanges` and `mcp__azure-devops__getPullRequestChangesCount` to get the list and count of changed files.
3. **Assess complexity** (see [Complexity Assessment](#complexity-assessment) below). If high-complexity signals are present, switch to Deep Review.
4. Use `mcp__azure-devops__getFileContent` or git diff commands to view the actual changes.
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
1. Use `mcp__azure-devops__getPullRequest` to fetch PR metadata.
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
   If the user doesn't specify a base branch, auto-detect by checking which of `dev`, `main`, `master` exists on origin (in that order).
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

> "This PR changes 4 files with a focused bug fix — I'll do a **lightweight review** from the diffs."

> "This PR touches 25 files across 3 layers and introduces a new bulk upload feature — I'll do a **deep review** with a worktree checkout so I can trace the full call chain."

> "No PR yet — I'll find the merge-base against `dev` and review your branch changes locally."

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

- **Get PR Details**: Use mcp__azure-devops__getPullRequest to get the basic pr details
- **Triage PR scope**: Call `mcp__azure-devops__getPullRequestChangesCount` to get a quick summary (X files added, Y modified, Z deleted). Use this to gauge PR scope and decide how many parallel agents to dispatch.
- **Checkout the pull request**: Use Start-PRReview.ps1 script to setup the code and work tree
- **Check previous comments**: Use `getPullRequestComments` to check for any previous comments on the pull request. Take note of any ongoing discussions or issues that need to be addressed. **If previous review comments exist from this reviewer (or Claude), switch to the [Re-Review Workflow](#re-review--update-workflow) instead of continuing the initial review.**
- **Check for work items**: Use `getWorkItemById` to check for any work items associated with the pull request, if applicable.

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
- **Verify branch convention**: Expected format: `developers/{initials}/{work_item_id}_work_item_title_in_snake_case`. Target branch should be `dev`. Flag non-conforming branch names (LOW severity).

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

   - **`exception-handling-review`**: Dispatch when changed files contain `try`/`catch` blocks, `throw` statements, custom exception classes, or error-handling middleware. Reviews exception handling for swallowed exceptions, overly broad catches, incorrect re-throws (`throw ex` vs `throw`), missing logging in catch blocks, exceptions used for flow control, catch-log-rethrow duplication across layers, async exception pitfalls (`async void`, fire-and-forget), finally block issues, and missing guard clauses. Findings are HIGH-MEDIUM severity.

   - **`test-coverage-review`**: Dispatch when the PR modifies production code (any non-test `.cs`, `.js`, `.ts` file). Maps production changes to test changes, verifies tests cover the actual behavior being modified (not just adjacent code), checks for over-mocking, test-driven production pollution, fragile tests, and missing edge cases. For bug fixes, applies the litmus test: "Would this test have FAILED before the fix?" Focuses on behavioral coverage over line coverage, with a 1-10 criticality rating. Findings are HIGH-MEDIUM severity.

   - **`architecture-review`**: Dispatch when PR introduces new services, classes, or projects; modifies `.csproj` project references; changes DI registrations; adds cross-layer dependencies; or restructures module/project boundaries. Reviews layer boundary violations (controller accessing DB directly), dependency direction in project references, god class/service detection, circular dependencies, DI anti-patterns (service locator, captive dependencies), cross-cutting concern mismanagement, and bounded context violations. **Do NOT dispatch** when PR only modifies method bodies, configuration values, or styling with no structural changes. Complements `class-design-simplifier` (which focuses on class-level complexity) by analyzing system-level architectural health.

   - **`performance-review`**: Dispatch when changed files contain async/await patterns, `HttpClient` usage, database access (EF Core, MongoDB, SQL queries), large collection operations (`.ToList()`, `.ToArray()` on queries), caching logic (`IMemoryCache`, `IDistributedCache`), serialization/deserialization, React components with hooks (`useState`, `useEffect`, `useMemo`, `useCallback`), `fetch`/`axios` calls, state management (Redux, Context), or bundle configuration. Also dispatch when the PR description or linked work item mentions performance, optimization, scaling, latency, memory, or throughput. Auto-detects backend (.NET/C#) vs frontend (React/JS/TS) domains from changed files and applies only relevant patterns. Covers: sync-over-async/thread pool starvation, OOM patterns (unbounded collections, LOH, missing dispose), N+1 HTTP/DB calls, HttpClient misuse, connection pool exhaustion, request waterfalls, bundle size anti-patterns, React re-render cascades, DOM performance, and frontend memory leaks. Findings range from CRITICAL (socket exhaustion, unbounded queries) to MEDIUM (missing memoization, over-serialization). **Do NOT dispatch** when the PR only modifies documentation, test-only files, configuration values, or CSS/LESS styling with no production logic changes.

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

   Verify the PR includes adequate test coverage by mapping source projects to their expected test projects:

   | Source Project | Expected Test Project |
   |---|---|
   | `McqDb.Core` | `McqDb.Core.Tests` |
   | `Mcqdb.WebApi` / `Mcqdb.WebApi.Core` | `McqDb.WebApi.UnitTests` |
   | `McqDb.Service` | `McqDb.Service.Tests` |
   | Orleans grains | `Mcqdb.Grains.Tests` |
   | `JobRunner` | `JobRunner.Tests` |

   If `pr-review-toolkit:pr-test-analyzer` was dispatched in step 8, cross-reference its behavioral findings with the structural test-to-source mapping here.

   Flag if:
   - New public methods have no corresponding test methods
   - Existing tests were modified but not in a way that covers the new behavior
   - Test methods lack `[TestCategory("CI")]` for CI pipeline inclusion

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
   findings through 10 impact dimensions. This is **mandatory for every review** — the grader
   catches findings that domain agents classified too softly, especially code health,
   convention, and completeness issues.

   **How to dispatch:**

   1. Consolidate all findings from steps 4-9 into a structured list
   2. De-duplicate first: when multiple agents flag the same issue, keep the more detailed version
   3. Format each finding as:
      ```
      ## Finding [N]
      - Original Severity: [CRITICAL/HIGH/MEDIUM/LOW]
      - Blocker: [Yes/No]
      - Category: [e.g., Conventions, Architecture, Security, etc.]
      - File: [path:line]
      - Issue: [description]
      - Suggestion: [proposed fix]
      ```
   4. Dispatch `review-grader` with the formatted findings list
   5. When the grader returns, **use the graded severities** (not the originals) for verdict
      determination in Step 12

   **What the grader returns:**
   - Escalated findings with dimension scores and rationale
   - Confirmed findings (correctly graded, no change)
   - Graded verdict recommendation (may differ from what original severities would imply)
   - Pushback narrative (if the grader recommends a stricter verdict)

   If the grader escalates any finding, note the escalation in the review summary so the PR
   author understands why the severity differs from what a domain agent might suggest.

12. **Provide Feedback**: `<Invoke post-pr-review skill>`

    Delegate all comment posting, question posting, and summary thread management to the
    `post-pr-review` skill. This skill owns the full "publish review results to ADO"
    workflow.

    **Invoke:**

    ```
    skill: "code-reviewer:post-pr-review"
    ```

    **Pass the following inputs:**

    | Field | Source |
    |-------|--------|
    | `prNumber` | PR number from Step 1 |
    | `repository` | Repository name from Step 1 |
    | `botPrefix` | `[<dev name>'s bot]` — the standard bot prefix for all comments |
    | `findings[]` | Graded findings list from Step 11 (with graded severities) |
    | `questions[]` | Consolidated context questions from Step 10 |
    | `verdict` | Determined from graded findings — see verdict rules below |
    | `reviewType` | `initial` or `re-review` |
    | `outputFormatMarkdown` | The formatted review summary (from [Output Format](reference/output-format.md)) |

    **Determine verdict before invoking** — default posture is skeptical; approve only when
    confident the code improves (or at minimum does not degrade) the codebase:
    - **APPROVE** — No Critical/High issues, no Medium issues, code genuinely
      improves the codebase. This is the highest bar — reserve it for clean PRs.
    - **APPROVE WITH COMMENTS** — No Critical/High issues, some Medium/Low
      issues that should be addressed but are non-blocking. The PR is net
      positive for the codebase despite minor issues.
    - **REQUEST CHANGES** — Any Critical/High issues, or a pattern of Medium
      issues that collectively indicate quality slippage (e.g., missing tests +
      duplicated code + no error handling = systemic problem even if each is
      individually Medium)

    **Always confirm with the user before invoking** — show the findings, questions,
    and verdict first. The user must approve what gets posted to ADO.

    The `post-pr-review` skill handles:
    - Posting inline/file/general comments for findings (3-tier priority with fallback)
    - Posting inline comments for context questions (with `[QUESTION]` tag)
    - Detecting existing summary threads and replying to them (instead of creating new ones)
    - Optionally approving the PR (if verdict is APPROVE and user confirms)
    - Optionally merging the PR (if user requests, with merge strategy confirmation)

    After the skill completes, proceed to Step 13 to update tracking state.

    For re-review workflow, load [reference/re-review-workflow.md](reference/re-review-workflow.md).

13. **Update Review Tracking** (after posting feedback):

   **Skip this step for Local Branch Reviews** (no PR number) — tracking only
   applies to ADO pull requests.

   Persist this review in the local tracking state so `code-reviewer:review-pending-prs`
   (and future runs of `code-reviewer:pr-review`) know this PR was reviewed.

   Invoke the shared tracking skill:

   ```
   skill: "code-reviewer:update-pr-tracking"
   ```

   Pass the following context from this review:

   | Field | Source |
   |-------|--------|
   | `prNumber` | PR number from Step 1 |
   | `title` | PR title from ADO |
   | `sourceBranch` | Source branch (without `refs/heads/`) |
   | `targetBranch` | Target branch (without `refs/heads/`) |
   | `author` | `createdBy.displayName` from ADO |
   | `createdAt` | PR `creationDate` from ADO |
   | `lastKnownPushAt` | `lastMergeSourceCommit.committer.date` from ADO |
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
   review. Tracking is best-effort — the review posted to ADO is the primary output.

## Error Handling

<error_handling>
- **getPullRequest fails** → verify PR number, check ADO connectivity, inform user
- **Worktree script fails** → fall back to lightweight review mode
- **Agent dispatch fails** → skip that agent, note in findings, continue with others
- **Comment posting fails** → retry once, then present findings to user in conversation
</error_handling>

## Critical Principles

**1. Be Specific and Actionable**

- ❌ "This code has issues"
- ✅ "Line 45: Missing null check for `user` parameter can cause NullReferenceException when called from endpoint X"

**2. Include Code Examples**

- Show current problematic code
- Explain why it's problematic
- Show recommended fix

**3. Reference Exact Locations**

- Format: `path/to/file.cs:123` or `UserService.cs:45-67`

**4. Lead with Substance**

- Acknowledge genuinely good patterns when they exist — but never manufacture
  praise to soften criticism. Empty compliments dilute the signal.
- Lead with the most important findings. The reviewer's job is to protect the
  codebase, not to make the author feel good.
- End with clear action items prioritized by severity.

**5. Hold the Line on Standards**

- Do not lower the bar because a PR is small, the author is senior, or the
  deadline is tight. Standards exist precisely for when it's inconvenient to
  follow them.
- Flag patterns that would be copied by future developers — a bad pattern in
  the codebase is an implicit recommendation to repeat it.
- When the same issue appears in multiple files, flag every instance — not just
  the first one. Partial fixes create inconsistency.

**6. Verify Before Claiming — Avoid False Positives**

Do NOT claim something "doesn't exist", "won't compile", "has no callers", or
"is unused" unless you have high-confidence evidence. Search tools on large repos
are unreliable. A false positive damages reviewer credibility more than a missed
finding. Always search the source branch, scope searches to avoid timeouts, check
the PR diff itself, and respect green build status as authoritative evidence.

For full rules, see [Codebase Search Discipline](../../references/codebase-search-discipline.md).

## Quick Reference Checklist

Start with [Code Alignment Guide](reference/code-project-alignment-guide.md) — verifying project patterns, duplication, and framework usage is the highest-priority check.

- [ ] **Code Alignment** (do first): Follows project patterns, no duplication, framework best practices
- [ ] Bugs & Correctness: Logic errors, off-by-one, null/undefined handling, edge cases, incorrect API usage
- [ ] Security: OWASP Top 10, injection, hardcoded secrets, input validation, insecure defaults
- [ ] Performance: N+1 queries, memory leaks, algorithm efficiency, redundant computations, missing caching
- [ ] Code Quality: SOLID, code smells, duplication
- [ ] Maintainability: Code clarity, overly complex logic, misleading names
- [ ] Testing: Coverage, edge cases, integration tests
- [ ] EUII / PII: No user-identifiable info in logs, telemetry, or error messages
- [ ] Specific feedback with file:line references
- [ ] Code examples for issues and fixes
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

Publishing comments in ADO: IMPORTANT!!!, when referencing ADO work item, use `#` prefix e.g. `#12354` where 12354 is bug/workitem id, and `!` exclamation mark for PRs, e.g. `!4212` where 4212 is PR ID. <-- VERY IMPORTANT, don't forgat `!` is for PRs and `#` is for bugs/workitems.