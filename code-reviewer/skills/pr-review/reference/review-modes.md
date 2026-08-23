# Review Modes & Setup

Load this file at **Step 0** — before starting any review. It covers mode
selection, worktree setup, and repo-convention loading.

## Prerequisite: Load Repo Conventions

Before enforcing repo-specific policy, load [Repo Conventions](repo-conventions.md).

1. Look for `.code-reviewer.yml` at the repo root. If this is a monorepo, also
   check `sources/*/.code-reviewer.yml`.
2. Prefer the PR's actual `targetRefName` over any default base branch.
3. If no convention file exists, auto-detect the default base branch with
   `git symbolic-ref refs/remotes/origin/HEAD`; if that fails, fall back to
   checking `main`, then `master`, then `dev`.
4. If conventions are still unknown, do **not** invent branch naming rules,
   test project mappings, or CI markers from another repo.

## The Three Modes

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
3. **Assess complexity** (see [Complexity Assessment](#complexity-assessment) below). If high-complexity signals are present, switch to Deep Review.
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

**Worktree setup (Deep Review):**

1. Fetch PR data using the provider's tooling (see [provider mapping](../../../references/provider-resolution.md)):

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

Creates isolated worktree with analysis templates (provider-agnostic — it operates on git).

4. Take a note of mergeBase (Make sure both target and source are based on origin) e.g.

```bash
git merge-base origin/<target-branch> origin/<source-branch>
```

NOTE: everything is based off origin. From this point onwards, all diffs are
against the merge-base commit id.

5. Use the generated templates in `scratchpad/pr_reviews/pr-<number>/analysis/` to structure your findings.
6. When the review is complete, remind the user to clean up the worktree:
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

## Making the Decision

After understanding what the user wants reviewed, state which mode you're using and why. If the user disagrees, switch modes. For example:

"This PR changes 4 files with a focused bug fix — I'll do a **lightweight review** from the diffs."

"This PR touches 25 files across 3 layers and introduces a new bulk upload feature — I'll do a **deep review** with a worktree checkout so I can trace the full call chain."

"No PR yet — I'll find the merge-base against the repo's default base branch and review your branch changes locally."

## Complexity Assessment

Use this framework after fetching PR metadata and the changes summary to decide between Lightweight and Deep Review. Evaluate each dimension qualitatively — **no single metric alone determines complexity**; it's the combination that matters.

| Dimension | Low Complexity (→ Lightweight) | High Complexity (→ Deep Review) |
|---|---|---|
| **Scope** | Changes confined to one feature, service, or layer | Changes span multiple layers, modules, or projects |
| **Nature of logic** | Mechanical/repetitive (renames, formatting, bulk updates) or straightforward fixes | Novel business logic, new algorithms, complex control flow, concurrency |
| **Dependency impact** | Changed code has few callers/consumers; side effects are obvious | Changed code is widely referenced — base classes, shared utilities, interfaces, DI registrations |
| **Cognitive load** | Each file's diff can be understood in isolation | You need to hold a mental model of how multiple changed files interact |
| **Context adequacy** | PR description + diff context tells the full story | You need to explore the repo to understand motivation, calling code, or downstream effects |

**Key principle**: A PR that touches many files but makes the same mechanical change everywhere is lower complexity than a PR that touches one file but rewrites a core algorithm. Always assess the **nature and impact** of changes, not just their volume.
