# Tool & Agent Catalog

## Azure DevOps MCP Tools

- `mcp__azure-devops__getPullRequest` - Fetch PR details (use `include: ["workItems"]` for linked work items)
- `mcp__azure-devops__getPullRequestFileChanges` - Get changed files list
- `mcp__azure-devops__getPullRequestChangesCount` - Quick scope check: total files changed, adds/edits/deletes
- `mcp__azure-devops__getAllPullRequestChanges` - Get all file changes with diffs
- `mcp__azure-devops__getPullRequestComments` - Get existing PR comments/discussions
- `mcp__azure-devops__getCommitHistory` - Get commit log with optional file path filter (used in re-review to find commits since last review)
- `mcp__azure-devops__listPullRequests` - List active/completed/abandoned PRs, filter by creator/reviewer
- `mcp__azure-devops__getWorkItemById` - Get linked work item details (includes Relations: parent `⬆️`, child `⬇️`, related, PR links)
- `mcp__azure-devops__getWorkItemsBatch` - Fetch multiple work items efficiently by ID array
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

## Specialized Review Agents (dispatched in step 7)

- `nscript-review` - NScript C#-to-JS transpiler compliance, MVVM, template/skin patterns
- `orleans-review` - Orleans grain architecture, reentrancy, state management, streams
- `debugging:logging-review` - Structured logging compliance, log levels, queryability, EUII policy enforcement, client-side log forwarding checks
- `temp-code-review` - **(always dispatched)** Temporary code, debug artifacts, hardcoded hacks, mistaken files
- `duplicate-code-detector` - Exact/near duplicates, repeated patterns, structural duplication; suggests extractions
- `euii-leak-detector` - EUII/PII leaks in logs, telemetry, error messages, HTTP logging
- `class-design-simplifier` - Over-engineering flags: single-impl interfaces, pass-through layers, premature generalization
- `exception-handling-review` - Exception patterns: swallowed exceptions, broad catches, incorrect re-throws, missing logging, async pitfalls, flow control abuse
- `test-coverage-review` - Test coverage adequacy, behavioral coverage, over-mocking, test-production pollution, missing regression tests, integration point coverage

## Context Agents (dispatched in step 1/3)

- `pr-context-gatherer` - Walks ADO work item hierarchy from PR-linked items up to Epic level; collects siblings and related items to build full business context tree. Use `code-reviewer:pr-context` skill to invoke.

## External Review Agents (dispatched conditionally in step 8)

- `architecture-reviewer` - SOLID principles, coupling analysis, design pattern review
- `pr-review-toolkit:silent-failure-hunter` - Silent failures, swallowed exceptions
- `pr-review-toolkit:type-design-analyzer` - Type invariants, encapsulation, type system design
- `pr-review-toolkit:pr-test-analyzer` - Behavioral test coverage, edge case analysis
- `pr-review-toolkit:comment-analyzer` - Comment accuracy, documentation rot
- `pr-review-toolkit:code-simplifier` - Code clarity (large PRs only)
- Additional agents discovered dynamically from the environment

## Reference Guides (used in steps 4-5)

- [Code Alignment Guide](code-project-alignment-guide.md) — project patterns, duplication, framework usage
- [Code Quality Guide](code-quality-guide.md) — SOLID, code smells
- [Performance Guide](performance-guide.md) — N+1 queries, memory, efficiency
- [Security Checklist](security-checklist.md) — OWASP Top 10
- [Testing Guide](testing-guide.md) — coverage, edge cases, CI categories
