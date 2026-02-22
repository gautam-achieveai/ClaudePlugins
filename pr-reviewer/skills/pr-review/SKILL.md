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
- **Checkout the pull request**: Use Start-PRReview.ps1 script to setup the code and work tree
- **Check previous comments**: Use `getPullRequestComments` to check for any previous comments on the pull request. Take note of any ongoing discussions or issues that need to be addressed.
- **Check for work items**: Use `getWorkItemById` to check for any work items associated with the pull request, if applicable.

2. **Understand the changes**: `<Launch agent to understand what the changes are doing and any salient features / bug fixes>`

- **Analyze the changes**: Now that you've checked out the branch and have the changes, analyze them to understand what has been modified, what the intent is, and how it fits into the overall project.
- **Double-check the changes**: Use getWorkItemById tool to double-check the work item associated with the pull request, if applicable.

3. **Check the code for coding Guidelines**: `<parallel agent>`

- **Review the code**: Look for adherence to coding standards, best practices, and project guidelines.
- **Check for tests**: Ensure that there are appropriate unit tests, integration tests, and end-to-end tests for the changes made.
- **Check for documentation**: Verify that any necessary documentation has been updated or created.

4. **Check the code Quality**: `<parllel agent>`

- **Run static analysis tools**: Use tools like linters and code analyzers to check for code quality issues.
- **Check for performance**: Look for any potential performance issues in the code changes.
- **Check for security vulnerabilities**: Ensure that the code changes do not introduce any security vulnerabilities.

5. **Design Principles**: `<parallel agent>`

- **Analyze the code base for duplication**: Use Sequential Thinking tools to analyze the code base for duplication and suggest refactoring if necessary.
- **Check for modularity**: Ensure that the code is modular and follows the Single Responsibility Principle.
- **Reanalyze if functionality can be simplified**: If you find any complex logic, suggest ways to simplify it or break it down into smaller, more manageable functions.
- **Check if code follows Design Patterns from the code base**: Ensure that the code follows the design patterns used in the code base, such as MVC, Singleton, Factory, etc.

6. **Domain-Specific Review**: `<parallel agents — dispatch based on changed file types>`

   Analyze the changed files and dispatch the appropriate specialized review agents in parallel. Only dispatch agents whose domain is present in the PR:

   - **`nscript-review`**: Dispatch when changed files include NScript client code — `.cs` files under `src/Client/` referencing `ObservableObject`, `Promise<T>`, `[AutoFire]`, `Mcqdb.NScript.Sdk`, or `.html`/`.less` template/style files in client projects. Covers AutoFire/nameof enforcement, Promise patterns, IoC registration, NScript C# restrictions, MVVM patterns, template bindings, LESS conventions, and JS interop attributes (`[JsonType]`, `[IgnoreNamespace]`, `[ScriptName]`).

   - **`orleans-review`**: Dispatch when changed files include Orleans grain code — classes inheriting `Grain`/`Grain<TState>`, grain interfaces (`IGrainWithStringKey`, etc.), `[Reentrant]`/`[AlwaysInterleave]` attributes, stream subscriptions, or silo configuration. Covers reentrancy/deadlock analysis, state management, stream anti-patterns, and async patterns within grains.

   - **`logging-review`**: Dispatch when changed files include logging statements — `ILogger`, `LoggerFactory`, `_logger.Log*`, structured logging templates, or test code with `Console.WriteLine`. Covers structured logging compliance, log levels, queryability, and test logging practices.

   **Dispatch rules:**
   - A single PR may trigger multiple agents (e.g., a PR touching both Orleans grains and NScript client code dispatches both `orleans-review` and `nscript-review`)
   - Run all applicable agents in parallel — they are independent
   - Collect findings from all agents before proceeding to step 7

7. **Provide Feedback**:

- **Add comments**: Use the `addPullRequestComment`, `addPullRequestFileComment`, and `addPullRequestInlineComment` tools to provide feedback on the pull request.
- **Prefer InlineComments**: Use `addPullRequestInlineComment` as hard as possible, if there are any issues, debug them first then move to `addPullRequestFileComment` and finally `addPullRequestComment`.
- **Include domain-specific findings**: Incorporate all findings from step 6 agents into the feedback, using the same severity levels (CRITICAL/HIGH/MEDIUM/LOW) from the agent outputs.
- **Suggest changes**: If there are issues that need to be addressed, suggest specific changes or improvements.
- **Approve the pull request**: If everything looks good, use the `approvePullRequest` tool to approve the pull request.

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
- `mcp__azure-devops__getAllPullRequestChanges` - Get file changes
- `mcp__azure-devops__addPullRequestComment` - Add general comment
- `mcp__azure-devops__addPullRequestInlineComment` - Add line-specific comment
- `mcp__azure-devops__approvePullRequest` - Approve PR

## Output Format

Provide structured feedback:

```markdown
# PR Review: [Title]

## Summary
Overall assessment, files changed, risk level

## Strengths
What was done well (with file:line references)

## Critical Issues (Must Fix)
Blocking issues with code examples

## Important Issues (Should Fix)
Code quality, performance concerns

## Testing Assessment
Coverage gaps, suggested tests

## Security Review
OWASP issues found (if any)

## Recommendations
Specific, actionable improvements
```

## Remember

**Goal:** Catch bugs before production, improve code quality, share knowledge, maintain standards

**Focus on:**

1. **Correctness** (bugs, security)
2. **Maintainability** (future developers)
3. **Performance** (user experience)
4. **Testing** (confidence in changes)

Be thorough but pragmatic. **Be specific, actionable, balanced, and professional.**
