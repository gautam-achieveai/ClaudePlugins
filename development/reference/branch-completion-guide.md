# Finishing a Development Branch

Adapted from obra/superpowers `finishing-a-development-branch` (MIT).

## Overview

**Core principle:** Verify tests → Detect environment → Present options → Execute choice → Clean up.

## Step 1: Verify Tests

Run the project's full test suite (`npm test` / `cargo test` / `pytest` / `go test ./...`).

**If tests fail**, report the failures and leave the finishing flow — fix them first; the menu comes after a green suite:

```text
Tests failing (<N> failures). Must fix before completing:

[Show failures]
```

**If tests pass:** continue to Step 2.

## Step 2: Detect Environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
# Capture now, while still inside the workspace — Step 5 changes directory
# before cleanup (Step 6) needs this value
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

If `GIT_DIR != GIT_COMMON`, rule out a submodule before treating it as a worktree: a path from `git rev-parse --show-superproject-working-tree` means a submodule — treat it as a normal repo.

This determines which menu to show and how cleanup works:

| State | Menu | Cleanup |
|-------|------|---------|
| `GIT_DIR == GIT_COMMON` (normal repo) | Standard 3 options | No worktree to clean up |
| `GIT_DIR != GIT_COMMON`, named branch | Standard 3 options | Provenance-based (see Step 6) |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Reduced 2 options (no merge) | Externally managed — leave in place |

## Step 3: Determine Base Branch

The base branch is whatever this work forked from — usually named in the plan, the work item, the conversation, or the branch's upstream. If it is not already known, check the fork point:

```bash
# Candidate branch whose tip is closest to this branch's fork point
git for-each-ref --format='%(refname:short)' refs/remotes/origin | while read b; do
  echo "$(git rev-list --count "$(git merge-base HEAD "$b")"..HEAD) $b"
done | sort -n | head -1
```

When the base came from the plan or work item, use it. When you derived it, confirm before merging: "This branch split from <best guess> - is that correct?" Merging into the wrong base is expensive to undo.

## Step 4: Present Options

**Normal repo and named-branch worktree — present exactly these 3 options:**

```text
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

**Detached HEAD — present exactly these 2 options:**

```text
Implementation complete. You're on a detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)

Which option?
```

Present the menu exactly as written. Discarding the work happens only when the user explicitly asks for it (see "If the user asks to discard the work" below). Wait for their answer; the integration decision is theirs. The user's choice is the approval for that merge or push. A calling workflow that pre-selects an option (for example `work-on` choosing "push and create PR") skips the menu only when it already holds the user's approval to publish this work, such as an approved plan that includes opening the PR.

## Step 5: Execute Choice

### Option 1: Merge Locally

```bash
# Get main repo root for CWD safety
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# Stop and report if the main checkout has uncommitted changes, or if
# <base-branch> is checked out in another worktree — never disturb them.
git status --porcelain

# Merge first — verify success before removing anything
git checkout <base-branch>
git pull
git merge <feature-branch>

# Verify tests on merged result
<test command>
```

If tests fail on the merged result: stop, leave the worktree and branch in place, and investigate — nothing has been pushed, so the merge is local and recoverable.

Once the merged result is green: clean up the worktree (Step 6), then delete the branch:

```bash
git branch -d <feature-branch>
```

### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>
# From a detached HEAD, name the new branch on the remote:
# git push origin HEAD:refs/heads/<new-branch>
```

Then create the PR against <base-branch> using the **active provider's tooling**, following the repo's PR template if present, with a body of this shape:

```markdown
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
```

- **GitHub** — the `gh:gh-publish-pr` skill, or `gh pr create --title "<title>" --body "<body>"`.
- **Azure DevOps** — the `ado:ado-publish-pr` skill, or `az repos pr create --title "<title>" --description "<body>"`.

Report the PR URL. Keep the worktree — PR feedback gets fixed there.

### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

### If the user asks to discard the work

This path exists only as a response to an explicit request to throw the work away. Confirm first:

```text
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for that exact confirmation. When it arrives:

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

Then clean up the worktree (Step 6) and delete the branch:

```bash
git branch -D <feature-branch>
```

## Step 6: Cleanup Workspace

**Runs for Option 1 and confirmed discards.** Options 2 and 3 always preserve the worktree. Both callers have already changed directory to the main repo root — worktree removal must run from outside the worktree — and use the `GIT_DIR`/`GIT_COMMON`/`WORKTREE_PATH` values captured in Step 2.

**If `GIT_DIR == GIT_COMMON`:** Normal repo, no worktree to clean up. Done.

**If `WORKTREE_PATH` is under `.worktrees/` or `worktrees/`:** this workflow created the worktree, so it owns cleanup:

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune  # Clean up any stale registrations
```

**If removal is refused** (`contains modified or untracked files`): the worktree holds files that exist nowhere else. Never `--force` on your own initiative. Show the user what is at stake and ask:

```bash
git -C "$WORKTREE_PATH" status --porcelain -uall
```

```text
Worktree removal refused — these files were never committed:

<file list>

1. Commit them to <branch> before cleanup
2. Move them into <main repo root>
3. Delete them (unrecoverable)

Which?
```

Carry out the choice, then remove the worktree.

**Otherwise:** the host environment owns this workspace — leave it in place. If the platform provides a workspace-exit tool (for example `ExitWorktree`), use it before deleting the branch. If the branch is still checked out in any worktree, keep the branch and report that instead of deleting it.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | yes | - | - | yes |
| 2. Create PR | - | yes | yes | - |
| 3. Keep as-is | - | - | yes | - |
| Discard (explicit request only) | - | - | - | yes (force) |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Tests passed earlier this session" | Run the suite on the tree you are about to integrate. A green run only proves the tree it ran on. |
| "They obviously want it merged" | Integration is the user's decision. Present the menu and wait. |
| "They seem done with this feature — I'll offer to discard it" | The menu is complete as written. Discard happens only when the user asks for it in so many words. |
| "'Yeah, get rid of it' counts as confirmation" | Only the typed word `discard` authorizes deletion. |
| "The PR is up, so the worktree is clutter now" | PR feedback gets fixed in that worktree. It stays until the work lands. |
| "This other worktree looks stale — I'll clean it too" | Clean up only worktrees under `.worktrees/` or `worktrees/`. Everything else belongs to the host. |
| "Removal refused — `--force` is just finishing the cleanup" | The refusal means files exist only in that worktree. `--force` destroys them permanently. Show the user and ask. |
| "The merged-result failure is probably flaky" | A failing merged result stops everything. Branch and worktree stay put while you investigate. |
| "The base branch is obviously main" | Confirm the fork point or ask. Merging into the wrong base is expensive to undo. |
| "The push was rejected — force-push will fix it" | A rejected push means the remote moved. Investigate; force-push only on the user's explicit request. |

## Integration

**Pairs with:**
- **`development/reference/git-worktrees-guide.md`** - Cleans up the worktree created by that guide
