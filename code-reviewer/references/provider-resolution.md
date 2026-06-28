# Provider Resolution & Tool Mapping

The code-reviewer plugin works against **two repository providers** — GitHub and
Azure DevOps. Every skill/agent that fetches PR data, posts comments, discovers
PRs, or gathers work-item/issue context resolves the provider **once** from the
git remote, then uses the matching tools. This file is the single source of truth
for that mapping — skills link here instead of repeating it.

## Resolve the Provider (do this first)

1. **Explicit wins.** If the caller already told you the provider, use it.
2. **Otherwise auto-detect** from the git remote:
   ```bash
   git remote get-url origin
   ```
   - Host contains `github.com` → **GitHub**
   - Host contains `dev.azure.com` or `visualstudio.com` → **Azure DevOps**
   - State the detected provider in one short line and proceed.
3. **Only ask if genuinely ambiguous** — no remote, or a host matching neither.

Derive the repo coordinates from the remote:

| | GitHub | Azure DevOps |
|---|---|---|
| Remote shape | `https://github.com/<owner>/<repo>` | `https://dev.azure.com/<org>/<project>/_git/<repo>` or `https://<org>.visualstudio.com/<project>/_git/<repo>` |
| Coordinates | `<owner>`, `<repo>` | `AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_REPOSITORY` |

If no usable remote exists, **ask the user** for the coordinates — do NOT guess
from prior reviews or hardcoded defaults.

## Ensure Tooling Is Ready (soft)

Before the first provider call, make sure the backend's tools are reachable. On a
failure (connection error, tool not found, auth failure), follow the matching
plugin's setup rule rather than asking the user to configure it manually:

- **GitHub** → use `gh:setup-gh-mcp`, then retry; fall back to the `gh` / `gh api` CLI.
- **Azure DevOps** → use `ado:setup-ado-mcp`, then retry.

> **GitHub tooling note:** GitHub MCP tools may or may not be connected. Prefer
> them when available; otherwise the **`gh` CLI** (run via `Bash`) is the reliable
> path and is assumed throughout this mapping. `gh` must be authenticated
> (`gh auth status`).

## PR Operation → Tool Mapping

For each operation, use the cell for the resolved provider. GitHub commands show
the `gh` CLI form; substitute the equivalent GitHub MCP tool when one is connected.

| Operation | GitHub (`gh` CLI / GitHub MCP) | Azure DevOps (MCP) |
|---|---|---|
| Fetch PR metadata | `gh pr view <n> --json number,title,author,headRefName,baseRefName,body,isDraft,createdAt,url` | `mcp__azure-devops__getPullRequest` |
| List changed files | `gh pr diff <n> --name-only` (or `gh pr view <n> --json files`) | `mcp__azure-devops__getPullRequestFileChanges` |
| Changed-files count / scope | derive counts from `gh pr diff <n> --name-only` | `mcp__azure-devops__getPullRequestChangesCount` |
| Full diff | `gh pr diff <n>` | `mcp__azure-devops__getAllPullRequestChanges` |
| File content at a ref | `gh api repos/<owner>/<repo>/contents/<path>?ref=<branch>` (or read from the worktree) | `mcp__azure-devops__getFileContent` |
| Existing PR comments / threads | `gh api repos/<owner>/<repo>/pulls/<n>/comments` (review/inline) + `gh api repos/<owner>/<repo>/issues/<n>/comments` (general) + `gh pr view <n> --json comments,reviews` | `mcp__azure-devops__getPullRequestComments` |
| Commits / history since a date | `gh api repos/<owner>/<repo>/pulls/<n>/commits` or `git log --after="<date>" origin/<source>` | `mcp__azure-devops__getCommitHistory` |
| List active PRs | `gh pr list --state open --json number,title,isDraft,headRefName,baseRefName,createdAt,updatedAt,author` | `mcp__azure-devops__listPullRequests(status: "active", …)` |
| Post inline (line) comment | `gh api repos/<owner>/<repo>/pulls/<n>/comments -f body=<text> -f commit_id=<headSha> -f path=<file> -F line=<line> -f side=RIGHT` | `mcp__azure-devops__addPullRequestInlineComment` |
| Post file-level comment | GitHub has no line-less file comment → anchor an inline comment to the file's first changed line, or fall back to a general comment that names the file | `mcp__azure-devops__addPullRequestFileComment` |
| Post general PR comment | `gh pr comment <n> --body <text>` | `mcp__azure-devops__addPullRequestComment` |
| Reply to a comment thread | `gh api repos/<owner>/<repo>/pulls/<n>/comments/<commentId>/replies -f body=<text>` | `mcp__azure-devops__replyToComment` |
| Resolve / update a thread | GraphQL `resolveReviewThread` (best-effort) | `mcp__azure-devops__updatePullRequestThread` |
| Approve PR | `gh pr review <n> --approve --body <text>` | `mcp__azure-devops__approvePullRequest` |
| Request changes | `gh pr review <n> --request-changes --body <text>` | (post comments; ADO has no native request-changes verb — use a "Waiting for author" vote / comment) |
| Merge PR | `gh pr merge <n> --squash` / `--merge` / `--rebase` | `mcp__azure-devops__mergePullRequest` (squash, noFastForward, rebase, rebaseMerge) |
| Linked work items / issues | `gh pr view <n> --json closingIssuesReferences` + parse `#`/`owner/repo#` refs in the body | `mcp__azure-devops__getPullRequest` with `include: ["workItems"]`, then `getWorkItemById` / `getWorkItemsBatch` |

## Issue / Work-Item Hierarchy

GitHub does not have ADO's fixed Epic → Feature → User Story → Task ladder. Map
context-gathering as follows:

| Concept | GitHub | Azure DevOps |
|---|---|---|
| Item linked to the PR | Closing/linked **issue** (`closingIssuesReferences`, body `#refs`) | Linked **work item** |
| Parent | **Sub-issue parent** (`gh api .../issues/<n>` → `parent`/ GraphQL), task-list parent, or tracking issue; else **Project** field | `⬆️ #NNN (Parent)` relation |
| Children | **Sub-issues** / task-list items / issues referencing this one | `⬇️ #NNN (Child)` relations |
| Siblings | Other sub-issues of the same parent / issues in the same Project/Milestone | Other children of the same parent |
| Grouping | **Milestone**, **Project**, labels | Iteration/Area path, Epic/Feature |

When the GitHub repo has no issue hierarchy, report the linked issue(s) flat and
note that no parent/child structure was found — do not invent one.

## Mention / Reference Conventions

- **GitHub** → [gh-mention-conventions.md](gh-mention-conventions.md)
- **Azure DevOps** → [ado-mention-conventions.md](ado-mention-conventions.md)

## Tracking Storage

Local review tracking (`tracking.json`, per-PR history) is **provider-neutral** —
it keys on PR number and stores the provider plus repo coordinates so a repo is
never confused with another. See `code-reviewer:update-pr-tracking`.
