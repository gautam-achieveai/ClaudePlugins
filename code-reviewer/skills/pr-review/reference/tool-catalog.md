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

## Core Lanes (always dispatched, step 4)

- `correctness-review` - logic defects in the changed code: inverted conditions, boundary errors, null handling, state/ordering, resource lifetime, contract mismatch, concurrency
- `history-context-review` - git blame and log for the changed lines, review comments on earlier PRs touching these files, guidance in nearby code comments
- `temp-code-review` - temporary code, debug artifacts, hardcoded hacks, mistaken files

## Specialized Review Agents (dispatched in step 7)

- `security-review` - Concrete abuse paths across changed trust boundaries
- `invariant-deletion-review` - Unsafe deletion, destructive scope, and removed or bypassed correctness safeguards
- `compliance-review` - Applicable obligations for changed data handling and regional deployment, calibrated to sourced release stage
- `nscript-review` - NScript C#-to-JS transpiler compliance, MVVM, template/skin patterns
- `orleans-review` - Orleans grain architecture, reentrancy, state management, streams
- `debugging:logging-review` - Structured logging compliance, log levels, queryability, EUII policy enforcement, client-side log forwarding checks
- `duplicate-code-detector` - Exact/near duplicates, repeated patterns, structural duplication; suggests extractions
- `euii-leak-detector` - EUII/PII leaks in logs, telemetry, error messages, HTTP logging
- `class-design-simplifier` - Over-engineering flags: single-impl interfaces, pass-through layers, premature generalization
- `exception-handling-review` - Exception patterns: swallowed exceptions, broad catches, incorrect re-throws, missing logging, async pitfalls, flow control abuse
- `test-coverage-review` - Test coverage adequacy, behavioral coverage, over-mocking, test-production pollution, missing regression tests, integration point coverage
- `code-simplifier` - Expression and block-level complexity: deep nesting, long chains, verbose conditionals
- `architecture-review` - Layer boundaries, dependency direction, god classes, circular dependencies, DI anti-patterns
- `performance-review` - Backend and frontend performance: async misuse, N+1, allocation, re-render cascades
- `over-engineering-review` - Delivered scope against the stated task: speculative abstraction, unrequested features
- `schema-compatibility-review` - Wire-level and persisted compatibility across the deploy window
- `feature-flag-reviewer` - Blast radius, reversibility, and whether a change should ship flag-gated

## Reasoning Agents (consume findings, never scan)

Tiers 5 and 6. Each receives other agents' output and reasons over it.

- `root-cause-synthesizer` (tier 5) - groups verified findings by shared cause, where one named edit must dissolve every member; step 10c, when 4+ findings survive
- `review-grader` (tier 5) - severity calibration, merge-blocking lane assignment, verdict; step 11, always
- `review-adjudicator` (tier 6) - rules when the review disagrees with itself: split verifier lenses, contradictory guidance, a REDESIGN ask on a narrow PR, an author's technical dispute; step 11a, on trigger only
- `remediation-planner` (tier 5) - minimum merge-unblocking set, fix ordering, conflicts between suggested paths; step 11b, on REQUEST_CHANGES with 3+ blockers or 2+ clusters

## Context Agents (dispatched in step 1/3)

- `pr-context-gatherer` - Walks the PR-linked item hierarchy — ADO work items (up to Epic level) or GitHub linked issues / sub-issues — collecting siblings and related items to build a full business context tree. Use `code-reviewer:pr-context` skill to invoke.

## External Review Agents (dispatched conditionally in step 8)

- `pr-review-toolkit:type-design-analyzer` - Type invariants, encapsulation, type system design
- `pr-review-toolkit:comment-analyzer` - Comment accuracy, documentation rot
- `feature-dev:code-reviewer` - second opinion, only for 30+ file or security-sensitive PRs
- Additional agents discovered dynamically from the environment

**Excluded by default** — `architecture-reviewer`, `pr-review-toolkit:silent-failure-hunter`,
`pr-review-toolkit:pr-test-analyzer`, `pr-review-toolkit:code-simplifier`,
`code-simplifier:code-simplifier`, and `pr-review-toolkit:code-reviewer` each
duplicate a lane we already run. See the exclusion table in
[agent-dispatch.md](agent-dispatch.md).

## Verification and Filtering

- `finding-verifier` (haiku) - one per finding, tries to disprove it; step 10b
- `scripts/filter-findings.mjs` - deterministic diff anchoring, cross-agent dedupe, per-agent cap; step 10a

## Reference Guides (loaded by the owning agent, per SKILL.md step 5)

- [Code Alignment Guide](code-project-alignment-guide.md) — project patterns, duplication, framework usage
- [Code Quality Guide](code-quality-guide.md) — SOLID, code smells
- [Performance Guide](performance-guide.md) — N+1 queries, memory, efficiency
- [Security Checklist](security-checklist.md) — OWASP Top 10
- [Testing Guide](testing-guide.md) — coverage, edge cases, CI categories
