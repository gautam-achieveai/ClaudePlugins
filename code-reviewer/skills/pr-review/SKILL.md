---
name: pr-reviewer
description: Conduct code reviews of individual pull requests analyzing performance, code alignment, correct usage of external libraries, testing coverage, and code quality. Provides structured feedback with file:line references and code examples. Use when asked to "review PR #[number]", "code review pull request", "check PR for issues", or "analyze PR changes". Works with PR numbers, branch names, or Azure DevOps URLs. NOT for developer performance reviews over time.
allowed-tools: Read, Grep, Glob, Bash, WebFetch, mcp__azure-devops__*
---
# Pull Request Code Reviewer

Review individual PRs for code quality, security (OWASP Top 10), performance, and testing adequacy.

## ⚠️ Skill Scope

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

   - **`logging-review`**: Dispatch when changed files include logging statements — `ILogger`, `LoggerFactory`, `_logger.Log*`, structured logging templates, or test code with `Console.WriteLine`. Covers structured logging compliance, log levels, queryability, and test logging practices.

   - **`temp-code-review`**: **Always dispatch for every PR.** Scans all changed files for temporary code, debugging artifacts, hardcoded bypasses/hacks, mistakenly committed files, test/mock data in production code, disabled tests, and accidental inclusions. Catches `Console.WriteLine` in production code, `// HACK`/`// TODO: remove` comments, hardcoded credentials, `.env` files, forced `if (true)` branches, `Debugger.Launch()`, and similar patterns that should never reach production.

   - **`duplicate-code-detector`**: Dispatch when PR adds substantial new code (new classes, methods, or logic blocks). Finds exact duplicates, near-duplicate blocks with minor variations, repeated patterns, and structural duplication across the changed files and the broader codebase. Suggests concrete extractions (shared methods, base classes, utilities).

   - **`euii-leak-detector`**: Dispatch when PR adds or modifies logging, telemetry, error messages, or HTTP logging. Scans for End User Identifiable Information (EUII) leaks — emails, names, tokens, IPs, passwords, connection strings. Uses heuristic field name matching to catch PII in log templates, exception messages, and API responses.

   - **`class-design-simplifier`**: Dispatch when PR introduces NEW classes, interfaces, or architectural layers. Analyzes what the PR is trying to accomplish, then flags over-engineering: single-implementation interfaces, pass-through layers, premature generalization, deep inheritance hierarchies. Proposes merging, inlining, or flattening.

   **Dispatch rules:**
   - **`temp-code-review` is mandatory** — dispatch it for every PR regardless of domain
   - A single PR may trigger multiple agents (e.g., a PR touching both Orleans grains and NScript client code dispatches both `orleans-review` and `nscript-review`)
   - Run all applicable agents in parallel — they are independent
   - Collect findings from all agents before proceeding to step 8

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
   | `architecture-reviewer` | PR introduces new classes/services, changes project structure, adds cross-layer dependencies, or modifies DI registration | PR only modifies method bodies, config, or styling |
   | `pr-review-toolkit:silent-failure-hunter` | PR contains try-catch blocks, error handling, fallback logic, `.catch()`, `Result<T>` | PR is purely additive with no error handling, or only config/styling |
   | `pr-review-toolkit:type-design-analyzer` | PR introduces NEW classes, records, structs, interfaces — especially data models, domain entities, DTOs | PR only modifies method bodies without changing type signatures |
   | `pr-review-toolkit:pr-test-analyzer` | PR includes test file changes OR adds new public methods that should have tests | PR is test-only with no source changes, or documentation-only |
   | `pr-review-toolkit:comment-analyzer` | PR adds/modifies XML doc comments, inline documentation blocks, or README content | PR has no comment changes |
   | `pr-review-toolkit:code-simplifier` | PR is LARGE (20+ files) AND introduces complex new logic (deep nesting, long methods) | PR is small/medium or straightforward changes |

   **Agents excluded by default (overlap with steps 4-6):**
   - `pr-review-toolkit:code-reviewer` — Steps 4-5 already cover general code quality with project-specific reference guides
   - `feature-dev:code-reviewer` — Same overlap with steps 4-5
   - **Exception**: Dispatch `feature-dev:code-reviewer` as a second-opinion safety net when PR is **30+ files** OR touches **security-sensitive code** (auth, crypto, payment)

   **Size-based dispatch heuristics:**
   - **Small PR (1-5 files)**: 0-1 external agents — only dispatch if strong signal match
   - **Medium PR (6-19 files)**: 1-2 external agents — dispatch best-matching agents
   - **Large PR (20+ files)**: All matching agents — cast a wide net

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

10. **Provide Feedback**: `<Post comments via Azure DevOps MCP tools>`

   Consolidate all findings from steps 4-9 (reference guide checks, domain agent results, external agent results, server-side checks, test coverage) and post them to the PR. When an external agent from step 8 flags the same issue already found in steps 4-7, keep the more detailed version and discard the duplicate.

   **Comment posting priority (most specific first):**

   1. **Inline comments** (`mcp__azure-devops__addPullRequestInlineComment`) — Use for issues tied to specific lines. This is the PREFERRED method. Requires file path, line number, and comment text. If inline commenting fails (e.g., line not in diff), fall back to file-level.
   2. **File comments** (`mcp__azure-devops__addPullRequestFileComment`) — Use when the issue is about the file but not a specific line (e.g., missing imports, wrong naming convention).
   3. **General comments** (`mcp__azure-devops__addPullRequestComment`) — Use for cross-cutting concerns, summary, and verdict. Post the full review summary as a general comment.

   **Comment format with blocker tag:**

   Blocking findings MUST include the `[BLOCKER]` tag:

   ```
   [<dev name>'s bot] [BLOCKER] **<Severity>** (<Category>)

   <Description>

   **Suggestion:** <Suggestion>
   ```

   Omit the `[BLOCKER]` tag for non-blocking findings (non-blocking is the default).

   **Blocker classification rubric** (see [Review Thread State Machine](references/review-thread-state-machine.md) for full details):
   - **BLOCKER** (tag required): Bug/correctness, security vulnerability, significant design issue, significant simplification, data loss risk, user-visible performance issue
   - **Non-blocking** (no tag needed): Style, minor suggestions, informational, documentation, minor performance, alternative approaches

   **Workflow:**
   - **Always confirm with the user before posting** — show the comment text first
   - Post all CRITICAL and HIGH issues as inline/file comments first
   - Post MEDIUM issues as inline/file comments
   - Post the review summary (from Output Format below) as a general comment
   - **Determine verdict**: Choose one of:
     - **APPROVE** — No Critical or High issues, few or no Medium issues
     - **APPROVE WITH COMMENTS** — No Critical issues, some High/Medium issues that should be addressed
     - **REQUEST CHANGES** — Any Critical issues, or multiple High issues that must be fixed
   - **Approve the pull request**: Only use `mcp__azure-devops__approvePullRequest` if verdict is APPROVE and user confirms
   - **Merge the pull request** (optional): If the user requests it after approval, use `mcp__azure-devops__mergePullRequest` with the appropriate merge strategy (squash for feature branches, noFastForward for release branches). Always confirm merge strategy with the user first.

## Re-Review / Update Workflow

When a PR was previously reviewed, the author pushed fixes, and the reviewer's vote was reset (e.g., "Vote of X was reset: Changes pushed to source branch"), the reviewer needs to focus on what changed since their last review — not re-review the entire PR.

### Step 1: Detect re-review context

- Call `mcp__azure-devops__getPullRequestComments` to check for existing review comments
- If previous review comments exist from this reviewer (or Claude), this is a re-review
- Extract the previous issue list (numbered issues with severities) from the last review summary comment
- Note which issues the author responded to (replies to review threads)

### Step 2: Find what changed since last review

- Use `mcp__azure-devops__getCommitHistory` to find commits pushed after the last review comment date
- Use `git log --after="<last-review-date>" origin/<source-branch>` locally to see new commits
- Use `git diff <last-review-commit>..<current-head>` to see ONLY the delta since last review
- **Critical difference from initial review**: diff against last-review-point, not merge-base

### Step 3: Build issue resolution tracker

Create a table tracking each previous issue:

```
| # | Previous Issue | Severity | Status | Evidence |
|---|---|---|---|---|
| 1 | MockDistributionMetricManager | CRITICAL | RESOLVED | Replaced with CachedDistributionMetricManager |
| 2 | Code duplication 400+ lines | HIGH | RESOLVED | Reduced via ProficiencyMapCalculator |
| 3 | No fallback mechanism | HIGH | RESOLVED | ExecuteWithFallbackAsync added |
| 4 | No automated tests | HIGH | WON'T FIX | Author: "Will follow up in separate PR" |
```

Status values: `RESOLVED`, `NOT ADDRESSED`, `WON'T FIX`

### Step 3.5: Satisfaction Check

For each thread in the tracker, verify the resolution using the delta diff and
the [Review Thread State Machine](references/review-thread-state-machine.md):

**RESOLVED threads** — verify fix in the delta diff:
1. Find the code change that addresses the original finding
2. Confirm it actually fixes the issue (not just a cosmetic change)
3. Confirm no regressions were introduced
4. If the fix is good → use `updatePullRequestThread` to close the thread
5. If the fix is insufficient → reply with `replyToComment` explaining what is
   still wrong or missing. The thread stays Active.

**WON'T FIX threads** — evaluate the developer's rationale:
1. Read the developer's `Won't Fix:` reply
2. For non-blocking items (no `[BLOCKER]` tag): accept if the rationale is reasonable → close
3. For `[BLOCKER]` items: accept only if the rationale is technically sound and
   the risk is mitigated → close. Otherwise, reply explaining why the rationale
   is insufficient and reopen.
4. For security `[BLOCKER]` items: default is to reopen unless the justification
   is compelling. Security issues require the highest bar for Won't Fix.

**NOT ADDRESSED threads** — escalate:
1. Reply with `replyToComment`: "This issue is still outstanding — please address
   or provide a rationale for Won't Fix."
2. The thread stays Active.

### Step 4: Review only the delta

- Run the same domain-specific agents (step 7) but ONLY on files changed since last review
- Focus on: Did the fix actually address the issue? Did the fix introduce new issues?
- Look for regressions: Did fixing issue A break something else?

### Step 5: Post re-review summary

Use a structured format:

```markdown
## Re-Review Summary: PR #XXXX

### Previous Issues Resolution Status
| # | Issue | Severity | Resolution |
|---|---|---|---|

### New Issues Found (in updated code)
#### [SEVERITY] - [Issue Title]
...

### Verdict
APPROVE / APPROVE WITH COMMENTS / REQUEST CHANGES (still)
```

### Re-review rules

- **Don't re-litigate resolved issues** — if the author fixed it, acknowledge and move on
- **Track DEFERRED items** — note them as "acknowledged, not blocking" but keep them visible
- **Focus on the delta** — only flag new issues in the updated code
- **When author replies "won't fix" with valid reasoning** — respect it and note as WONTFIX
- **Call out NEW issues** — clearly distinguish new findings from previous ones

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

**4. Balance Feedback**

- Start with what's done well
- Then address concerns constructively
- End with clear action items

**5. Consider Context**

- PR complexity and scope
- Author experience level
- Business priorities

## Quick Reference Checklist

> ### ⭐ **CRITICAL FIRST STEP: Code Alignment**
>
> **Before reviewing anything else**, check the [Code Alignment Guide](reference/code-project-alignment-guide.md) to ensure:
>
> - Code follows existing project patterns
> - No code duplication
> - Proper framework usage
> - Consistency with team standards

- [ ] **Code Alignment**: Follows project patterns, no duplication, framework best practices ⭐
- [ ] Bugs & Correctness: Logic errors, off-by-one, null/undefined handling, edge cases, incorrect API usage 🐛
- [ ] Security: OWASP Top 10, injection, hardcoded secrets, input validation, insecure defaults 🛡️
- [ ] Performance: N+1 queries, memory leaks, algorithm efficiency, redundant computations, missing caching ⚡
- [ ] Code Quality: SOLID, code smells, duplication 📋
- [ ] Maintainability: Code clarity, overly complex logic, misleading names 🧹
- [ ] Testing: Coverage, edge cases, integration tests 🧪
- [ ] EUII / PII: No user-identifiable info in logs, telemetry, or error messages 🔒
- [ ] Specific feedback with file:line references
- [ ] Code examples for issues and fixes
- [ ] Balanced positive and constructive feedback

## Detailed Guides

For comprehensive checklists and examples:

- 🛡️ [Security Checklist (OWASP Top 10)](reference/security-checklist.md)
- ⚡ [Performance Review Guide](reference/performance-guide.md)
- 📋 [Code Quality Guide](reference/code-quality-guide.md)
- ⭐ **[Code Alignment Guide](reference/code-project-alignment-guide.md)** ← **CRITICAL FOR CONSISTENCY**
- 🧪 [Testing Assessment Guide](reference/testing-guide.md)
- 🔧 [Scripts Documentation](scripts/README.md)

## Integration with Tools

**Azure DevOps MCP:**

- `mcp__azure-devops__getPullRequest` - Fetch PR details
- `mcp__azure-devops__getPullRequestFileChanges` - Get changed files list
- `mcp__azure-devops__getPullRequestChangesCount` - Quick scope check: total files changed, adds/edits/deletes
- `mcp__azure-devops__getAllPullRequestChanges` - Get all file changes with diffs
- `mcp__azure-devops__getPullRequestComments` - Get existing PR comments/discussions
- `mcp__azure-devops__getCommitHistory` - Get commit log with optional file path filter (used in re-review to find commits since last review)
- `mcp__azure-devops__listPullRequests` - List active/completed/abandoned PRs, filter by creator/reviewer
- `mcp__azure-devops__getWorkItemById` - Get linked work item details
- `mcp__azure-devops__listWorkItems` - WIQL query for work items
- `mcp__azure-devops__searchWorkItems` - Search work items by text
- `mcp__azure-devops__getFileContent` - Read file content from repo
- `mcp__azure-devops__addPullRequestComment` - Add general comment
- `mcp__azure-devops__addPullRequestFileComment` - Add file-level comment (not tied to a specific line)
- `mcp__azure-devops__addPullRequestInlineComment` - Add line-specific comment
- `mcp__azure-devops__addWorkItemComment` - Comment on a work item (link review findings to work items)
- `mcp__azure-devops__replyToComment` - Reply to an existing comment thread (used in re-review to reopen or escalate)
- `mcp__azure-devops__updatePullRequestThread` - Update thread status (used in re-review to close verified threads)
- `mcp__azure-devops__approvePullRequest` - Approve PR
- `mcp__azure-devops__mergePullRequest` - Complete/merge a PR (squash, rebase, noFastForward)

**Specialized Review Agents (dispatched in step 7):**

- `nscript-review` - NScript C#-to-JS transpiler compliance, MVVM, template/skin patterns
- `orleans-review` - Orleans grain architecture, reentrancy, state management, streams
- `logging-review` - Structured logging compliance, log levels, queryability
- `temp-code-review` - **(always dispatched)** Temporary code, debug artifacts, hardcoded hacks, mistaken files
- `duplicate-code-detector` - Exact/near duplicates, repeated patterns, structural duplication; suggests extractions
- `euii-leak-detector` - EUII/PII leaks in logs, telemetry, error messages, HTTP logging
- `class-design-simplifier` - Over-engineering flags: single-impl interfaces, pass-through layers, premature generalization

**External Review Agents (dispatched conditionally in step 8):**

- `architecture-reviewer` - SOLID principles, coupling analysis, design pattern review
- `pr-review-toolkit:silent-failure-hunter` - Silent failures, swallowed exceptions
- `pr-review-toolkit:type-design-analyzer` - Type invariants, encapsulation, type system design
- `pr-review-toolkit:pr-test-analyzer` - Behavioral test coverage, edge case analysis
- `pr-review-toolkit:comment-analyzer` - Comment accuracy, documentation rot
- `pr-review-toolkit:code-simplifier` - Code clarity (large PRs only)
- Additional agents discovered dynamically from the environment

**Reference Guides (used in steps 4-5):**

- [Code Alignment Guide](reference/code-project-alignment-guide.md) — project patterns, duplication, framework usage
- [Code Quality Guide](reference/code-quality-guide.md) — SOLID, code smells
- [Performance Guide](reference/performance-guide.md) — N+1 queries, memory, efficiency
- [Security Checklist](reference/security-checklist.md) — OWASP Top 10
- [Testing Guide](reference/testing-guide.md) — coverage, edge cases, CI categories

## Output Format

Present findings in severity-grouped format:

```markdown
# PR Review: [Title]

## Summary
- Total files reviewed: X
- Findings: X Critical, X High, X Medium, X Low
- Test coverage: adequate / needs improvement / missing
- Domain areas touched: [NScript Client, Server, Orleans, Tests, etc.]
- Branch convention: OK / non-conforming

## Strengths
What was done well (with file:line references)

## Critical Issues
| # | File | Line | Blocker? | Issue | Fix |
|---|---|---|---|---|---|

## High Issues
| # | File | Line | Blocker? | Issue | Fix |
|---|---|---|---|---|---|

## Medium Issues
| # | File | Line | Blocker? | Issue | Fix |
|---|---|---|---|---|---|

## Low Issues
| # | File | Line | Blocker? | Issue | Fix |
|---|---|---|---|---|---|

## Testing Assessment
Coverage gaps, suggested tests, missing test project mappings

## Security Review
OWASP issues found (if any)

## Recommendations
Specific, actionable improvements

## Verdict
**APPROVE** / **APPROVE WITH COMMENTS** / **REQUEST CHANGES**
- APPROVE — No Critical or High issues, few or no Medium issues
- APPROVE WITH COMMENTS — No Critical issues, some High/Medium issues that should be addressed
- REQUEST CHANGES — Any Critical issues, or multiple High issues that must be fixed
```

## Remember

**Goal:** Catch bugs before production, improve code quality, share knowledge, maintain standards

**Focus on:**

1. **Correctness** (bugs, security)
2. **Maintainability** (future developers)
3. **Performance** (user experience)
4. **Testing** (confidence in changes)

Be thorough but pragmatic. **Be specific, actionable, balanced, and professional.**
