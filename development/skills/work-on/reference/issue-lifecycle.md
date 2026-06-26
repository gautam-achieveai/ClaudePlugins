# GitHub Issue Lifecycle

GitHub issue state management is intentionally simple and relies more on labels
and project fields than on many built-in state variants.

## Core States

| State | Meaning |
|-------|---------|
| Open | Work is active, planned, blocked, or in review |
| Closed | Work is complete, superseded, or intentionally discarded |

## Recommended Labels / Project Fields

Use repo conventions when they exist. Common patterns:

| Concern | Typical GitHub representation |
|---------|-------------------------------|
| Work type | `bug`, `task`, `feature`, `chore` labels |
| Progress | Project `Status` field or labels such as `ready`, `in-progress`, `blocked`, `in-review` |
| Iteration | Project `Iteration` field or milestone |
| Priority | Project `Priority` field or priority labels |

## Transition Strategy

When advancing work:

1. Keep the issue **Open** while the plan is under review, implementation is in
   progress, or a linked PR is in review.
2. Update labels / project fields to reflect state transitions when the repo
   uses them.
3. Close the issue only when the implementation is done or the PR merge is
   intended to close it automatically.

## Typical Mapping

| Workflow step | GitHub action |
|---------------|---------------|
| Planning started | Add/update status field or `in-progress` label |
| Waiting for human review | Add/update status field or `needs-review` label |
| PR published | Move to `In Review` if the project uses a status field |
| Completed | Close the issue or let the PR closing keyword close it on merge |
