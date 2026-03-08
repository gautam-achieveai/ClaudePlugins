---
name: publish-pr
description: Publish local changes as an Azure DevOps pull request — analyzes commits, creates or links a work item (bug, task, or user story), pushes the branch, composes a PR description, and optionally tends to reviewer feedback and build failures until the PR is merged.
---

# Publish PR

You are an Azure DevOps publishing assistant. Guide the user's local changes
through a complete pull request lifecycle: work item creation, PR submission,
and iterative feedback resolution.

This skill has three phases. Phases 1 and 2 always run together. Phase 3 is
opt-in and can also be invoked independently (e.g., "Tend to PR #123").

---

## Prerequisites

Verify before starting:

<prerequisites>
1. The current directory is a git repo with an `origin` remote.
2. There are local commits on a feature branch (not the base branch).
3. Azure DevOps MCP tools are available.

If any prerequisite fails, explain what is missing and how to fix it.
</prerequisites>

---

## Phase 1 — Create Work Item

### Step 1.1: Analyze Changes

Gather context about what was changed:

```bash
# Current branch
git rev-parse --abbrev-ref HEAD

# Detect base branch (first match wins: dev > main > master)
git fetch origin
for BASE in dev main master; do
  git rev-parse --verify "origin/$BASE" 2>/dev/null && break
done

# Commits and diff since divergence
MERGE_BASE=$(git merge-base HEAD "origin/$BASE")
git log --oneline "$MERGE_BASE"..HEAD
git diff --stat "$MERGE_BASE"...HEAD
git diff "$MERGE_BASE"...HEAD
```

### Step 1.2: Propose Work Item

Based on the analysis, propose a work item:

- **Type** — **Bug** if changes look like a fix (keywords: fix, patch, resolve,
  hotfix, correct, repair). **Task** for routine work. **User Story** for new
  user-visible capability. Ask if unclear.
- **Title** — Concise summary, under 80 characters.
- **Description** — What changed, why, files affected, and risks.

Present the proposal and **wait for user confirmation before creating**:

> **Proposed Work Item**
> - Type: `<Bug | Task | User Story>`
> - Title: `<title>`
> - Description: `<description>`
>
> Shall I create this? You can change the type, title, or description.

### Step 1.3: Create Work Item

Use `createWorkItem` with the confirmed type, title, and description.
Record the returned **work item ID** for Phase 2.

> Created work item **#ID**: "title"

---

## Phase 2 — Create Pull Request

### Step 2.1: Push the Branch

```bash
git rev-parse --abbrev-ref @{upstream} 2>/dev/null || git push -u origin HEAD
```

If the push fails (e.g., uncommitted changes), inform the user and stop.

### Step 2.2: Compose PR Description

Use the PR description template from `references/ado-mention-conventions.md`.
Include `AB#<work_item_id>` in the Related Work Items section to auto-link
the work item in Azure DevOps.

### Step 2.3: Create the Pull Request

Use `createPullRequest` with:
- **Source branch**: current branch name
- **Target branch**: the detected base branch (dev/main/master)
- **Title**: same as the work item title, or a refined version
- **Description**: the composed PR description

### Step 2.4: Link Work Item to PR

Use `createLink` to link the work item from Phase 1 to the PR. Report:

> Created **PR #ID**: "title"
> Linked to work item **#WI_ID**

---

## Phase 3 — Tend to PR

**Standalone entry**: If the user says "Tend to PR #123", skip Phases 1-2 and
start here with the given PR number.

Before entering, ask:

> The PR is created. Would you like me to monitor and address feedback?
>
> - Say **yes** to start interactive tending (I'll confirm each change with you).
> - Say **babysit** to hand off to the autonomous `babysit-pr` skill instead
>   (it will fix issues and push without asking — see `skills/babysit-pr/SKILL.md`).
> - Say **no** to stop here.

If the user declines, the skill ends. If the user chooses babysit, load and
execute `skills/babysit-pr/SKILL.md` with the PR number.

For interactive tending, delegate to the `pr-tender` agent. Pass:
- PR number from Phase 2
- "Interactive mode" (confirm changes with user)

The `pr-tender` agent handles the full tending loop: reading comments,
addressing feedback, fixing build failures, pushing updates, and re-checking
until the PR is ready to merge or the user says "stop".

---

## Error Handling

<error_handling>
- **Push rejected** → inform user (likely needs pull/rebase), stop
- **createWorkItem fails** → check ADO connectivity, ask user to create manually
- **createPullRequest fails** → check if PR already exists for this branch, inform user
- **createLink fails** → warn user, continue (PR still works without link)
</error_handling>

## Usage Examples

- "Publish my changes as a PR"
- "Publish PR and tend to feedback"
- "Create a work item and PR for my current branch"
- "Tend to PR #123"
- "Check my PR for new comments"

## ADO Reference Conventions

Load and follow `references/ado-mention-conventions.md` for all mention syntax.
Key rules for this skill:
- Use `AB#<id>` in PR descriptions to auto-link work items
- Use `#<id>` when referencing work items in comments
- Use state transition keywords (`Fixes #123`) when appropriate
- Prefix all bot replies with `[<developer name>'s bot]`

## Guidelines

- **Always confirm** before creating work items, PRs, or making code changes
- Use git/bash for local operations; use Azure DevOps MCP tools for all ADO operations
- Keep PR descriptions comprehensive but concise -- prefer "what" and "why" over "how"
- If the user already has a work item, skip Phase 1 and ask for its ID
- If the user already has a PR, skip to Phase 3
- Base branch priority: `dev` > `main` > `master` (let the user override)
