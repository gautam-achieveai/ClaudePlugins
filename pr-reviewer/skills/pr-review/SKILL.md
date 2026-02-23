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

## Quick Start

**LLM Workflow:**

1. Fetch PR data using MCP:

```
mcp__azure-devops__getPullRequest -repository "MCQdbDEV" -pullRequestId 12345
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
| 2 | Code duplication 400+ lines | HIGH | PARTIALLY RESOLVED | 60% reduced via ProficiencyMapCalculator |
| 3 | No fallback mechanism | HIGH | RESOLVED | ExecuteWithFallbackAsync added |
| 4 | No automated tests | HIGH | DEFERRED | Author acknowledged, deferred to follow-up |
```

Status values: `RESOLVED`, `PARTIALLY RESOLVED`, `DEFERRED`, `NOT ADDRESSED`, `WONTFIX`

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
- [ ] Security: OWASP Top 10 checked 🛡️
- [ ] Performance: N+1 queries, memory leaks, algorithm efficiency ⚡
- [ ] Code Quality: SOLID, code smells, duplication 📋
- [ ] Testing: Coverage, edge cases, integration tests 🧪
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
- `mcp__azure-devops__approvePullRequest` - Approve PR
- `mcp__azure-devops__mergePullRequest` - Complete/merge a PR (squash, rebase, noFastForward)

**Specialized Review Agents (dispatched in step 7):**

- `nscript-review` - NScript C#-to-JS transpiler compliance, MVVM, template/skin patterns
- `orleans-review` - Orleans grain architecture, reentrancy, state management, streams
- `logging-review` - Structured logging compliance, log levels, queryability
- `temp-code-review` - **(always dispatched)** Temporary code, debug artifacts, hardcoded hacks, mistaken files

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
| # | File | Line | Issue | Fix |
|---|---|---|---|---|

## High Issues
| # | File | Line | Issue | Fix |
|---|---|---|---|---|

## Medium Issues
| # | File | Line | Issue | Fix |
|---|---|---|---|---|

## Low Issues
| # | File | Line | Issue | Fix |
|---|---|---|---|---|

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
