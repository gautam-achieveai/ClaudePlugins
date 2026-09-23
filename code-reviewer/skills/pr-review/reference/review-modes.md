# Review Modes & Setup

Load this file at **Step 0** — before starting any review. It covers the
eligibility gate, deterministic review-tier selection, the context pack,
workspace setup, and
repo-convention loading.

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

## Gate 0: Eligibility (cheap, before anything else)

Dispatch a **haiku** agent to answer one question: is this PR worth a review
right now? Stop and report if any of these is true:

- The PR is closed, merged, or a draft.
- It is machine-generated in a way that carries no review value — a dependency
  bump with no code change, a lockfile-only update, a generated-file refresh.
- The diff is empty, or the change is formatting-only.
- This reviewer already reviewed this exact head commit and nothing has changed
  since. (A new commit means re-review, not a repeat review — see
  [re-review-workflow.md](re-review-workflow.md).)

Re-run this same check once more immediately before posting. A PR that was
merged or updated while the review ran should not receive stale feedback.

This gate costs one cheap call and saves the entire fan-out on PRs that need
nothing.

## Review Tier and Workspace Mode

The review tier is not a workspace mode. The tier controls review cost and
thoroughness. The workspace mode controls where the review reads code.

After building `context.json`, run the deterministic classifier:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/classify-review.mjs" \
  --context <scratch>/pr-<number>/context.json \
  --out <scratch>/pr-<number>/review-plan.json
```

`review-plan.json` is authoritative. It contains exactly one tier (`TINY`,
`SMALL`, `MEDIUM`, or `LARGE`), the numeric rule that matched, risk flags,
the exact lanes to run, model-intelligence and effort requests, verification
rules, reasoning-agent conditions, and the workspace mode.

- Do not estimate a tier yourself.
- Do not apply another file-count, line-count, or "complexity" heuristic.
- A user may request a higher tier. Never lower the classifier's tier.
- Escalation is upward only. A surviving HIGH or CRITICAL finding moves the
  review up one tier. Apply the next tier's complete plan: run newly added lanes
  plus newly required verification and reasoning work, without repeating
  equivalent completed work.
- Risk flags add their named lane at any size. They raise a TINY review to
  SMALL but do not raise it further by themselves.
- A uniform mechanical edit is capped at SMALL after the script verifies its
  hunk shape. Never infer "mechanical" from a title or description.

## The Context Pack (Step 1)

**Fetch the diff exactly once and write it to disk.** Every dispatched agent
receives the same pack by path. No agent fetches its own diff: N agents
re-fetching the same diff is N times the tokens for identical bytes, and
agents that fetch separately can end up reviewing different commits.

Write to the review scratch directory:

```text
<scratch>/pr-<number>/diff.patch          full unified diff vs the merge-base
<scratch>/pr-<number>/changed-files.txt   one path per line, with status
<scratch>/pr-<number>/context.json        the pack manifest
<scratch>/pr-<number>/review-plan.json    deterministic tier and lane plan
```

`context.json` carries:

```json
{
  "provider": "github | azdo",
  "repository": "<owner/repo or ADO repo>",
  "prNumber": 123,
  "headCommit": "<sha>",
  "mergeBase": "<sha>",
  "diffPath": "<abs path to diff.patch>",
  "changedFiles": [{"path": "src/Foo.cs", "status": "modified", "addedLines": 12, "removedLines": 3}],
  "conventionFiles": ["CLAUDE.md", "src/Server/CLAUDE.md", ".code-reviewer.yml"],
  "reviewIntent": {},
  "reviewPlanPath": "<abs path to review-plan.json>",
  "workspacePath": "<repo root or worktree root>"
}
```

`conventionFiles` lists **paths only** — the root `CLAUDE.md` plus any
`CLAUDE.md` in a directory this PR touches. Agents read the ones relevant to
their files; the orchestrator does not inline them.

Every agent prompt in steps 4-8 includes: the pack paths, `reviewPlanPath`, the
Review Intent, its assigned lane entry, and the instruction *"read the diff
from `diffPath`; open full files only when the diff cannot settle a question."*

## The Three Modes

### Lightweight Review (diff-only)

Use when `review-plan.json` says `workspaceMode: "LIGHTWEIGHT"`. Review from
the shared diff and open full files only to settle a specific question.

### Deep Review (worktree checkout)

Use when `review-plan.json` says `workspaceMode: "DEEP"`, or when the user
explicitly asks for a worktree. The classifier uses DEEP for LARGE reviews.

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

Echo the classifier result. Do not restate a qualitative judgment:

`Review route: MEDIUM / MEDIUM_CHANGED_LINES / LIGHTWEIGHT; 6 lanes; risk flags: PERFORMANCE.`

For a local branch, append `source: LOCAL_BRANCH`; the tier and lane plan still
come from the same classifier.

## No Second Complexity Assessment

Do not add a parallel complexity score after classification. If review evidence
shows the selected tier is too low, apply the plan's upward-only escalation rule
and record the evidence. Do not silently reinterpret the numeric rubric.
