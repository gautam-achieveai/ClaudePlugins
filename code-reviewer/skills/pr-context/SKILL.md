---
name: pr-context
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: false
disable-model-invocation: true
allowed-tools: Read, Bash, Skill, Agent, mcp__azure-devops__*
---

# PR Context — Work Item / Issue Hierarchy Gatherer

Build a complete picture of a PR's business context by traversing the work item /
issue graph on **GitHub or Azure DevOps**. This helps reviewers understand not just
WHAT the code changes, but WHY it exists and WHERE it fits in the larger initiative.

> **Provider note:** Resolve the provider once from the git remote (see
> [provider-resolution.md](../../references/provider-resolution.md)). On Azure DevOps
> this walks the work-item hierarchy; on GitHub it walks linked issues and
> sub-issues. Shared workflow names use the `ado:` / `gh:` namespaces respectively.

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

Use during Step 1 or Step 3 of the PR review workflow:

```
skill: "code-reviewer:pr-context"
args: "5234"
```

## Workflow

### 1. Identify the PR and Repository

Parse the argument to extract the PR number. Resolve the provider and repository:

- If a repository name is provided (e.g., `MyRepository#5234`), use it directly.
- Otherwise resolve from the git remote (see
  [provider-resolution.md](../../references/provider-resolution.md)):
  ```bash
  git remote get-url origin
  ```
  - **GitHub** — `https://github.com/<owner>/<repo>`
  - **Azure DevOps** — `https://<org>.visualstudio.com/<project>/_git/<repository>`

### 2. Dispatch the Context Gatherer Agent

Launch the `pr-context-gatherer` agent with the provider, PR number, and repository:

```
Agent:
  subagent_type: pr-context-gatherer (from code-reviewer plugin agents)
  prompt: |
    Provider: <github | ado>. Gather the full linked-item hierarchy for
    PR #<number> in repository <repo>. Walk the parent chain to the top
    (ADO: up to Epic; GitHub: parent sub-issue / tracking issue) and collect
    siblings at each level. Output the structured context tree.
```

The agent handles:
- Fetching PR details and linked work items (ADO) / linked issues (GitHub)
- Walking the parent chain (ADO Task → User Story → Feature → Epic; GitHub
  sub-issue → parent / tracking issue)
- Collecting sibling items at each level
- Building the structured context tree
- Writing the Context Summary

### 3. Present Results

The agent returns a structured context document. Present it to the caller (or
include it in the review context if used by pr-review).

**Key sections to highlight:**
- **Hierarchy tree** — shows the full ancestry path
- **Sibling items** — reveals scope and completeness
- **Context Summary** — natural language explanation of where this PR fits

### 4. Integration with PR Review

When used by the `pr-review` skill, the context output should inform:

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

- **ADO MCP tools unavailable** — use `ado:setup-ado-mcp` for this ADO flow (`gh:setup-gh-mcp` is the GitHub counterpart), then retry
- **PR not found** — verify the PR number and repository name
- **Work items inaccessible** — note which IDs couldn't be fetched; continue with available data
- **No work items linked** — report clearly and suggest the author link the relevant work item
