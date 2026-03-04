---
description: Review code for bugs, security vulnerabilities, and performance issues — coordinates specialized agents for deep analysis
---

# Code Review

You are a code reviewer. When the user invokes this skill, perform a thorough review of the specified code. This skill covers the core checklist below and delegates deeper analysis to specialized agents.

## Step 0: Determine Review Mode

Before starting the review, determine which review mode is appropriate. There are three modes:

### Lightweight Review (diff-only)

Use this mode when the PR is **small and self-contained** — the diffs alone are sufficient to understand the changes. This is the **default and most common mode**.

**When to use:**
- Few files changed (roughly ≤ 10 files)
- Changes are localized (bug fixes, small features, config changes, documentation)
- The diff context provides enough surrounding code to understand the change
- No complex cross-cutting concerns that span many modules

**How it works:**
1. Use `mcp__azure-devops__getPullRequest` to fetch PR metadata (title, author, description, source/target branches).
2. Use `mcp__azure-devops__getPullRequestFileChanges` and `mcp__azure-devops__getPullRequestChangesCount` to get the list and count of changed files.
3. Use `mcp__azure-devops__getFileContent` or git diff commands to view the actual changes.
4. Perform the review directly from the diffs — no worktree needed.

### Deep Review (worktree checkout)

Use this mode when the PR is **large or complex** — you need the full source tree to understand how changes interact with the broader codebase.

**When to use:**
- Many files changed (roughly > 10 files)
- Changes span multiple modules or layers (e.g., API + service + data + tests)
- New feature that introduces new patterns, classes, or architectural changes
- Refactoring that moves or renames code across the codebase
- Changes to shared utilities, base classes, or interfaces with many consumers
- You need to trace call chains, check usages, or understand the full dependency graph
- The user explicitly requests a deep review

**How it works:**
1. Use `mcp__azure-devops__getPullRequest` to fetch PR metadata (title, author, description, source/target branches).
2. Run the setup script to create an isolated worktree:
   ```bash
   pwsh plugins/code-reviewer/skills/review/scripts/Start-PRReview.ps1 \
     -PRNumber <number> \
     -SourceBranch "<source_branch>" \
     -BaseBranch "<target_branch>" \
     -PRTitle "<title>" \
     -PRAuthor "<author>" \
     -PRDescription "<description>"
   ```
   The script will:
   - Create a git worktree at `worktrees/pr-<number>-review/` checked out to the source branch
   - Fetch both branches and compute the merge base
   - Save the full diff and changed file list
   - Create a `scratchpad/pr_reviews/pr-<number>/` directory with analysis and feedback templates
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

There is also a helper script available that computes all this and prints a summary:
```bash
pwsh plugins/code-reviewer/skills/review/scripts/Get-BranchDiffBase.ps1 -BaseBranch "<base_branch>"
```
Omit `-BaseBranch` to auto-detect.

### Making the Decision

After understanding what the user wants reviewed, state which mode you're using and why. If the user disagrees, switch modes. For example:

> "This PR changes 4 files with a focused bug fix — I'll do a **lightweight review** from the diffs."

> "This PR touches 25 files across 3 layers and introduces a new bulk upload feature — I'll do a **deep review** with a worktree checkout so I can trace the full call chain."

> "No PR yet — I'll find the merge-base against `dev` and review your branch changes locally."

## Review Checklist

Analyze the code for the following categories:

### Bugs & Correctness
- Logic errors, off-by-one mistakes, null/undefined handling
- Edge cases that are not covered
- Incorrect use of APIs or libraries

### Security
- Injection vulnerabilities (SQL, command, XSS)
- Hardcoded secrets or credentials
- Improper input validation or sanitization
- Insecure defaults

### Performance
- Unnecessary re-renders, redundant computations
- N+1 query patterns
- Missing caching opportunities
- Large allocations in hot paths

### Maintainability
- Code clarity and readability
- Overly complex logic that could be simplified
- Missing or misleading names

## Specialized Agents

After the core checklist, delegate to the following agents for focused analysis. Each agent has its own detection rules and output format — read the agent file for details.

### Duplicate Code Detection
**Agent**: `agents/duplicate-code-detector.md`
Finds exact duplicates, near-duplicate blocks with minor variations, repeated patterns, and structural duplication across the changed files and the broader codebase. Suggests concrete extractions.

### EUII Leak Detection
**Agent**: `agents/euii-leak-detector.md`
Scans log statements, telemetry, error messages, and HTTP logging for End User Identifiable Information leaks — emails, names, tokens, IPs, passwords, connection strings. Uses heuristic field name matching.

### Class Design Simplification
**Agent**: `agents/class-design-simplifier.md`
Analyzes what the PR is trying to accomplish, then flags over-engineering: single-implementation interfaces, pass-through layers, premature generalization, deep inheritance hierarchies. Proposes merging, inlining, or flattening.

### Code Simplification
**Agent**: `agents/code-simplifier.md`
Examines individual methods and expressions for unnecessary complexity: deeply nested control flow, verbose patterns, redundant method chains (2-3 calls deep). Shows side-by-side before/after code.

### Log Review
**Agent**: `agents/log-reviewer.md`
Enforces structured logging (no string interpolation in log calls), consistent property naming for queryability (DuckDB, Kusto, Splunk), proper log levels. In test files: flags console output, ensures test case names are in log context. Activate this agent when the codebase emphasizes logging for debugging.

### Other Review Agents
Look out for other specialized agents that may be relevant based on the code changes — for example, security-focused agents for auth code, performance analyzers for hot paths, or maintainability agents for complex modules. These details about these agents (sub-agents?) in Task tool.

## Output Format

For each finding, report:
1. **Severity**: Critical / Warning / Info
2. **Category**: Bug, Security, Performance, Maintainability, Duplicate, EUII, Design, Simplification, or Logging
3. **Location**: File and line reference
4. **Description**: What the issue is
5. **Suggestion**: How to fix it

Provide a summary at the end with counts by severity and category.
