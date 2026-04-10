---
name: publish-pr
description: Publish local changes as a GitHub pull request — analyzes commits, creates or links a work item (backed by a GitHub issue), pushes the branch, composes a PR description, and optionally tends to reviewer feedback and failing checks until the PR is merged.
---

# Publish PR

You are a GitHub publishing assistant. Guide the user's local changes through a
complete pull request lifecycle: issue creation/linking, PR submission, and
iterative feedback resolution.

This skill has three phases. Phases 1 and 2 always run together. Phase 3 is
opt-in and can also be invoked independently (for example, "Tend to PR #123").

## Prerequisites

Verify before starting:

1. The current directory is a git repo with an `origin` remote.
2. There are local commits on a feature branch (not the base branch).
3. GitHub access is available:
   - prefer GitHub MCP
   - otherwise verify `gh auth status`
   - if neither works, follow the auto-setup rule in `gh/CLAUDE.md`

If prerequisites 1 or 2 fail, explain what is missing and how to fix it.

## Phase 1 — Create or Link a Work Item

### Step 1.1: Analyze Changes

Gather context about what changed:

```bash
git rev-parse --abbrev-ref HEAD
git fetch origin
for BASE in dev main master; do
  git rev-parse --verify "origin/$BASE" 2>/dev/null && break
done
MERGE_BASE=$(git merge-base HEAD "origin/$BASE")
git log --oneline "$MERGE_BASE"..HEAD
git diff --stat "$MERGE_BASE"...HEAD
git diff "$MERGE_BASE"...HEAD
```

### Step 1.2: Propose the GitHub Issue

Based on the analysis, propose a GitHub-backed work item:

- **Type** — represent it with labels such as `bug`, `feature`, or `task`
- **Title** — concise summary under 80 characters
- **Body** — what changed, why, files affected, risks, and acceptance notes

Present the proposal and **wait for user confirmation** before creating.

If the user already has an issue, skip creation and use that issue ID.

### Step 1.3: Create the Issue

Create the issue using GitHub MCP issue tools or `gh issue create`.

If the repo uses a GitHub Project for backlog management, add the issue to it
when the user wants that.

Record the issue number for Phase 2.

## Phase 2 — Create the Pull Request

### Step 2.1: Push the Branch

```bash
git rev-parse --abbrev-ref @{upstream} 2>/dev/null || git push -u origin HEAD
```

If the push fails, inform the user and stop.

### Step 2.2: Compose the PR Description

Use the PR description template from `references/gh-mention-conventions.md`.
Include an explicit issue reference such as `Fixes #<issue_id>` or
`Relates to #<issue_id>` in the **Related Issues** section.

### Step 2.3: Create the Pull Request

Create the PR with:
- **Source branch**: current branch name
- **Target branch**: detected base branch (`dev` > `main` > `master`)
- **Title**: same as the issue title, or a refined version
- **Description**: the composed PR description

Use GitHub MCP pull request tools or `gh pr create`.

### Step 2.4: Link the Issue to the PR

Prefer native GitHub linkage:
- `Fixes #<id>` in the PR body when the issue should close on merge
- `Relates to #<id>` when the PR should not close it yet

If needed, add an issue comment linking back to the PR URL.

Report the created PR number, URL, and linked issue number.

## Phase 3 — Tend to the PR

**Standalone entry:** If the user says "Tend to PR #123", skip Phases 1-2 and
start here with the given PR number.

Before entering, ask:

> The PR is created. Would you like me to monitor and address feedback?
>
> - Say **yes** to start interactive tending (I'll confirm each change with you).
> - Say **babysit** to hand off to the autonomous `gh:babysit-pr` skill instead.
> - Say **no** to stop here.

If the user declines, the skill ends. If the user chooses babysit, load and
execute `gh:babysit-pr` with the PR number.

For interactive tending, delegate to the `gh:pr-tender` agent. Pass:
- the PR number from Phase 2
- `"Interactive mode"` (confirm changes with the user)

The `gh:pr-tender` agent handles the full tending loop: reading feedback,
addressing review comments, fixing failing checks, pushing updates, and
re-checking until the PR is ready to merge or the user says "stop".

## Error Handling

- **Push rejected** → inform the user (likely needs pull/rebase), stop
- **Issue creation fails** → check GitHub connectivity/auth, ask user whether to continue with an existing issue
- **PR creation fails** → check if a PR already exists for the branch, inform the user
- **Issue/PR linking fails** → warn the user, continue if the PR itself exists

## Usage Examples

- "Publish my changes as a PR"
- "Publish PR and tend to feedback"
- "Create an issue and PR for my current branch"
- "Tend to PR #123"
- "Check my PR for new comments"

## GitHub Reference Conventions

Invoke the `gh:gh-mentions` skill before composing any PR description, comment,
or reply.

## Guidelines

- **Always confirm** before creating issues, PRs, or making code changes.
- Use git/bash for local operations; use GitHub MCP first, then `gh` / `gh api`.
- Keep PR descriptions comprehensive but concise — prefer "what" and "why" over "how".
- If the user already has a work item, skip Phase 1 and ask for its issue ID.
- If the user already has a PR, skip to Phase 3.
- Base branch priority: `dev` > `main` > `master` (let the user override).
