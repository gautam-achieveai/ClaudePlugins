# Tool & Agent Catalog

Resolve the repository provider first (see
[Provider Resolution & Tool Mapping](../../../references/provider-resolution.md)),
then use the matching tool set below.

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

## GitHub Tools (`gh` CLI / GitHub MCP)

Used when the resolved provider is GitHub. Prefer GitHub MCP tools when connected;
otherwise the `gh` CLI (run via `Bash`, authenticated with `gh auth`).

- `gh pr view <n> --json …` - Fetch PR details (`title,author,headRefName,baseRefName,body,isDraft,createdAt,headRefOid,closingIssuesReferences,comments,reviews`)
- `gh pr diff <n> --name-only` - Changed files list (and count); `gh pr diff <n>` for the full diff
- `gh pr list --state open --json …` - List active PRs (filter with `--author`, `--limit`)
- `gh api repos/<owner>/<repo>/pulls/<n>/comments` - Get/post inline (review) comments
- `gh api repos/<owner>/<repo>/issues/<n>/comments` - Get/post general comments
- `gh api repos/<owner>/<repo>/pulls/<n>/comments/<id>/replies` - Reply in a review thread
- `gh api repos/<owner>/<repo>/pulls/<n>/commits` - Commits on the PR (re-review delta)
- `gh pr comment <n> --body …` - Add a general PR comment
- `gh pr review <n> --approve|--request-changes --body …` - Record an approval / request-changes review
- `gh pr merge <n> --squash|--merge|--rebase` - Merge the PR
- `gh issue view <n> --json …` / `gh api repos/<owner>/<repo>/issues/<n>` - Linked-issue details and parent/sub-issue relations

## Specialized Review Agents (dispatched in step 7)

- `nscript-review` - NScript C#-to-JS transpiler compliance, MVVM, template/skin patterns
- `orleans-review` - Orleans grain architecture, reentrancy, state management, streams
- `debugging:logging-review` - Structured logging compliance, log levels, queryability, EUII policy enforcement, client-side log forwarding checks
- `temp-code-review` - **(always dispatched)** Temporary code, debug artifacts, hardcoded hacks, mistaken files
- `duplicate-code-detector` - Exact/near duplicates, repeated patterns, structural duplication; suggests extractions
- `euii-leak-detector` - EUII/PII leaks in logs, telemetry, error messages, HTTP logging
- `security-review` - Access control, injection, SSRF, cryptography, deserialization, authentication, and security defaults
- `invariant-deletion-review` - Unsafe deletion and removed or bypassed correctness safeguards
- `class-design-simplifier` - Over-engineering flags: single-impl interfaces, pass-through layers, premature generalization
- `code-simplifier` - Expression, control-flow, and method-level simplification
- `over-engineering-review` - Scope creep and complexity relative to the requested work
- `exception-handling-review` - Exception patterns: swallowed exceptions, broad catches, incorrect re-throws, missing logging, async pitfalls, flow control abuse
- `test-coverage-review` - Test coverage adequacy, behavioral coverage, over-mocking, test-production pollution, missing regression tests, integration point coverage
- `architecture-review` - Layer boundaries, dependency direction, DI, and system-level design
- `performance-review` - Backend and frontend runtime, resource, query, and rendering performance
- `schema-compatibility-review` - Wire, persisted-schema, public-surface, and rolling-deploy compatibility
- `feature-flag-reviewer` - Blast radius, reversibility, and rollout-containment strategy
- `review-grader` - Severity grading and quality gate for candidate findings

## Context Agents (dispatched once in step 1)

- `pr-context-gatherer` - Walks the PR-linked item hierarchy — ADO work items (up to Epic level) or GitHub linked issues / sub-issues — collecting siblings and related items to build a full business context tree. Use `code-reviewer:pr-context` skill to invoke. **Mutually exclusive launch ownership**: `pr-review` dispatches `code-reviewer:pr-context` (which launches this agent) *unless* the invocation carries `Context Gatherer Owner: daemon-direct`, in which case the daemon has already launched this agent directly and `pr-review` must not dispatch `code-reviewer:pr-context` or launch this agent a second time — exactly one launch, never both, never neither. **Reserved for this role only**: no other step — including Step 3's `general-purpose` "PR Intent & Scope Analyst" — may dispatch `subagent_type: pr-context-gatherer`; it owns Step 1's context gather exclusively and carries a network/provider tool surface no other step needs.

## External Review Agents (dispatched conditionally in step 8)

- `architecture-reviewer` - External generic architecture review; skip when the internal `architecture-review` already covers the change
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
