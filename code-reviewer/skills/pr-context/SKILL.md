---
name: pr-context
description: >
  Gather full business context for a pull request by walking the Azure DevOps work item
  hierarchy. Given a PR number, traces linked work items up through their parent chain
  (Task/Bug → User Story → Feature → Epic) and down through siblings to build a complete
  context tree showing where the PR fits in the broader initiative. Use this skill when
  you need to understand the "why" behind a PR, check if a PR fully covers its parent
  work item, see what other tasks are part of the same effort, or add business context
  to a code review. Trigger when: reviewing a PR and needing work item context, asked
  "what's the context for this PR", "show me the work item hierarchy", "what epic does
  this belong to", "show related work items for PR #X", or when the pr-review skill
  needs to understand the scope of changes. Also use proactively during code reviews
  when the PR description is sparse or when cross-cutting changes suggest the reviewer
  needs to understand the bigger picture.
allowed-tools: mcp__azure-devops__*
---

# PR Context — Work Item Hierarchy Gatherer

Build a complete picture of a PR's business context by traversing the ADO work item
graph. This helps reviewers understand not just WHAT the code changes, but WHY it
exists and WHERE it fits in the larger initiative.

> **Namespace note:** This skill gathers Azure DevOps work item context. When
> related docs mention shared workflow names, use the `ado:` namespace here;
> GitHub-side counterparts use the `gh:` namespace.

## When to Use

- **During code review** — to understand the business motivation behind changes
- **Scope validation** — to check if a PR fully implements a user story or just one task
- **Context for feedback** — to give more informed review comments that reference the
  feature/epic goals
- **Dependency discovery** — to find related work items that might be affected by the PR

## Quick Start

### Standalone Usage

```
/pr-context 5234
```

### From pr-review Skill

Invoke during Step 1 or Step 3 of the PR review workflow:

```
skill: "code-reviewer:pr-context"
args: "5234"
```

## Workflow

### 1. Identify the PR and Repository

Parse the argument to extract the PR number. Determine the repository:

- If a repository name is provided (e.g., `MCQdbDEV#5234`), use it directly
- Otherwise, detect from git remote:
  ```bash
  git remote get-url origin
  ```
  Extract the repository name from the URL pattern:
  `https://<org>.visualstudio.com/<project>/_git/<repository>`

### 2. Dispatch the Context Gatherer Agent

Launch the `pr-context-gatherer` agent with the PR number and repository:

```
Agent:
  subagent_type: pr-context-gatherer (from code-reviewer plugin agents)
  prompt: |
    Gather the full work item hierarchy for PR #<number> in repository <repo>.
    Walk the parent chain up to the Epic level and collect siblings at each level.
    Output the structured context tree.
```

The agent handles:
- Fetching PR details and linked work items
- Walking the parent chain (Task → User Story → Feature → Epic)
- Collecting sibling items at each level
- Building the structured context tree
- Writing the Context Summary

### 3. Present Results

The agent returns a structured context document. Present it to the caller (or
include it in the review context if invoked from pr-review).

**Key sections to highlight:**
- **Hierarchy tree** — shows the full ancestry path
- **Sibling items** — reveals scope and completeness
- **Context Summary** — natural language explanation of where this PR fits

### 4. Integration with PR Review

When invoked from the `pr-review` skill, the context output should inform:

- **Step 3 (Understand the changes)** — compare the PR's changes against the
  work item's acceptance criteria and description
- **Step 4 (Code alignment)** — verify the implementation matches the feature's
  intent, not just the task title
- **Step 11 (Feedback)** — reference work item context in review comments where
  it adds value (e.g., "This task is part of #1234 Bulk Upload — the sibling
  task #5678 handles validation, so this PR correctly skips it")

## Output Interpretation Guide

### Completeness Check

Look at the sibling items under the PR's parent work item:
- If most siblings are Done/Closed → this PR is one of the final pieces
- If most siblings are Active/New → this is early work, expect follow-up PRs
- If this PR's work items are the ONLY children → the PR should fully implement
  the parent work item

### Scope Alignment

Compare the PR's changes against the parent User Story / Feature:
- Does the PR title match the work item's intent?
- Does the branch name follow convention: `developers/{initials}/{work_item_id}_title`?
- Are the code changes consistent with what the work item describes?

### Risk Signals

- **Orphan PR** (no linked work items) — the PR lacks traceability; suggest linking
- **Top-level work item** (no parent) — the work item isn't part of a planned initiative;
  may indicate ad-hoc work
- **Many open siblings** — large initiative with many moving parts; changes in this
  PR might conflict with sibling work
- **Work item in wrong state** — PR is open but work item is Closed/Resolved (or vice versa)

## Error Handling

- **ADO MCP tools unavailable** — invoke `ado:setup-ado-mcp` for this ADO flow (`gh:setup-gh-mcp` is the GitHub counterpart), then retry
- **PR not found** — verify the PR number and repository name
- **Work items inaccessible** — note which IDs couldn't be fetched; continue with available data
- **No work items linked** — report clearly and suggest the author link the relevant work item
