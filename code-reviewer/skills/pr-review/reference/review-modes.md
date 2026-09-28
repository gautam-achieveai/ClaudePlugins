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
right now? For a previously reviewed PR, recover the completed baseline and
changed discussion/pending actions using [re-review-workflow.md](re-review-workflow.md)
before deciding that empty code or the same head means no work. Only affected
closure/evidence work proceeds in a state-only round; no code-scanner fan-out.
Unknown discussion state is a gap, not proof that nothing changed.
Otherwise stop and report if any of these is true:

- The PR is closed, merged, or a draft.
- It is machine-generated in a way that carries no review value — a dependency
  bump with no code change, a lockfile-only update, a generated-file refresh.
- The diff is empty or formatting-only and no review-state action remains.
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

After building `context.json` for the active full/delta scope, run the classifier.
State-only re-reviews skip classification and use their changed-state gates.

```bash
node "${CLAUDE_SKILL_DIR}/scripts/classify-review.mjs" \
  --context <scratch>/pr-<number>/context.json \
  --out <scratch>/pr-<number>/review-signals.json
```

`review-signals.json` (schema 2) contains one tier (`TINY`, `SMALL`, `MEDIUM`,
or `LARGE`), the matching rule, measurements, risk signals and cost guidance.
It contains no lanes or gate agents. The scout chooses reviewers using
[scout-planning.md](scout-planning.md); the controller validates and saves the
accepted selection plus fixed gates as `review-plan.json` before dispatch.

- Do not estimate a tier yourself.
- Do not apply another file-count, line-count, or "complexity" heuristic.
- Size alone does not split correctness or activate overlapping design lanes.
  Return bounded independent investigations and new questions to the scout;
  the controller records accepted revisions and cost before dispatch. Retain
  valid completed work when escalating.
- Adjudication is conditional at every tier. Resolve split verification before
  dropping candidates, regardless of review size.
- A user may request a higher tier. Never lower the classifier's tier.
- Escalation is upward only. A surviving HIGH or CRITICAL finding moves the
  review up one tier. Apply its fixed gates and ask the scout to reassess scope;
  do not mechanically append reviewers or repeat completed work.
- Risk signals raise a TINY classification to SMALL but not further by themselves.
  The scout accounts for each signal with an owner or sourced non-applicability;
  the signal does not choose an agent or establish a defect.
- A uniform mechanical edit is capped at SMALL after the script verifies its
  hunk shape. Never infer "mechanical" from a title or description.

## The Context Pack (Step 1)

**Fetch the diff exactly once and write it to disk.** Every dispatched agent
receives the same pack by path. No agent fetches its own diff: N agents
re-fetching the same diff is N times the tokens for identical bytes, and
agents that fetch separately can end up reviewing different commits.

Write to the review scratch directory:

```text
<scratch>/pr-<number>/diff.patch          initial: merge-base to head; re-review: reviewed head to head
<scratch>/pr-<number>/changed-files.txt   one path per line, with status
<scratch>/pr-<number>/context.json        the pack manifest
<scratch>/pr-<number>/review-signals.json deterministic measurements and cost guidance
<scratch>/pr-<number>/review-plan.json    accepted scout selection and controller gates
```

`context.json` carries:

```json
{
  "provider": "github | azdo",
  "repository": "<owner/repo or ADO repo>",
  "prNumber": 123,
  "headCommit": "<sha>",
  "mergeBase": "<sha>",
  "reviewType": "initial",
  "reviewBase": "<sha>",
  "diffPath": "<abs path to diff.patch>",
  "changedFiles": [{"path": "src/Foo.cs", "status": "modified", "addedLines": 12, "removedLines": 3}],
  "conventionFiles": ["CLAUDE.md", "src/Server/CLAUDE.md", ".code-reviewer.yml"],
  "reviewIntent": {},
  "reviewSignalsPath": "<abs path to review-signals.json>",
  "reviewPlanPath": "<abs path to review-plan.json>",
  "workspacePath": "<repo root or worktree root>"
}
```

Omit `reviewPlanPath` until scout selection is accepted; the scout initially
receives `reviewSignalsPath`, source/access limits and the available catalog.
Schema-1 classifier output is not an executable fallback; regenerate signals
and obtain scout selection for the current snapshot.

For initial reviews, `reviewBase` equals `mergeBase`. Re-reviews require
`reviewType: "re-review"` and the recovered completed review's head as
`reviewBase`. Keep prior intent, thread/claim state and source-cited context
separate from the delta's `changedFiles`. Carry prior completion evidence and
scoped exceptions in the local pack; do not alter daemon schema-v1 payloads.
State-only rounds omit `reviewSignalsPath` and code-scanner plan fields; retain
the empty diff, baseline and changed-source revisions for run/assignment identity.
They follow re-review closure/dispute handling without entering code scanning.

`conventionFiles` lists **paths only** — the root `CLAUDE.md` plus any
`CLAUDE.md` in a directory this PR touches. Agents read the ones relevant to
their files; the orchestrator does not inline them.

Every agent prompt in steps 4-8 includes: the pack paths, `reviewPlanPath`, the
Review Intent, its assigned lane entry, and the instruction *"read the diff
from `diffPath`; open full files only when the diff cannot settle a question."*

Initialize a unique run under the authorized scratch root using
[review-handoffs.md](../../../references/review-handoffs.md). Persist assignments,
raw settled responses, validated stage artifacts and a receipt manifest there.
Snapshot identity covers captured diff content as well as repository/head/base;
uncommitted edits and untracked files must not reuse a HEAD-only result.
Incremental identity also binds `reviewType` and `reviewBase`; old unbound
receipts cannot prove this round complete. Initial-review IDs stay compatible.
For saved local content baselines, also pass `reviewBaseSnapshotId`; equal HEADs
do not make two dirty/untracked snapshots equivalent. Hashing cannot recover
content omitted from the supplied diff; establish the comparison first.
Raw results are immutable. Pass artifacts by absolute path, and validate run,
snapshot, stage, attempt and completion before downstream use.

## The Three Modes

### Lightweight Review (diff-only)

Use `review-signals.json.costGuidance.workspaceMode` for initial setup and the
accepted `review-plan.json.plan.workspaceMode` thereafter. For `LIGHTWEIGHT`, review from
the shared diff and open full files only to settle a specific question.

### Deep Review (worktree checkout)

`DEEP` is guidance for LARGE reviews; create a worktree only when authorized by
the user. An explicit workspace choice overrides cost guidance.

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
2. Initial committed review: use the merge-base for the comparison below.
   On re-review, use the completed baseline and delta procedure in
   [re-review-workflow.md](re-review-workflow.md) instead. For working-tree
   review, capture tracked/untracked content as well; these commit-only examples
   do not include it. Compare exact saved/current content for later local rounds,
   or stop with the baseline gap. Same HEAD is not proof of no local changes.
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

`Review signals: MEDIUM / MEDIUM_CHANGED_LINES / LIGHTWEIGHT; specialist selection pending; risk flags: PERFORMANCE.`

For a state-only round, echo `Review route: state-only; code scanners: 0`.

For a local branch, append `source: LOCAL_BRANCH`. The classifier measures the
active diff; the scout selects its lanes. State-only rounds have no code tier.

## No Second Complexity Assessment

Do not add a parallel complexity score after classification. If review evidence
shows the selected tier is too low, apply the plan's upward-only escalation rule
and record the evidence. Do not silently reinterpret the numeric rubric.
