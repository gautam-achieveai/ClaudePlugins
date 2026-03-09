# Azure DevOps Mention & Reference Conventions

> **Synced copy** — the canonical version lives in the `code-reviewer` plugin at
> `code-reviewer/references/ado-mention-conventions.md`. Keep both in sync.

Use these conventions when writing PR descriptions, commit messages, work item
comments, wiki pages, and bot replies in Azure DevOps.

## Quick Reference

| Artifact | Syntax | Where it works | Example |
|----------|--------|----------------|---------|
| Work item (Bug, Task, User Story, Epic, Feature) | `#ID` | PR descriptions, commit messages, comments, wiki | `#123` |
| Work item (from GitHub) | `AB#ID` | GitHub commits, PRs, issues | `AB#123` |
| Pull request (Azure Repos) | `!ID` | Work item discussions, wiki | `!456` |
| User / group mention | `@alias` | PR comments, work item discussions, wiki | `@johndoe` |

## Work Item References — `#ID`

Type `#` followed by the work item ID. Azure DevOps renders it as a clickable
link and shows a picker to search. Works for **all work item types**: Bug, Task,
User Story, Epic, Feature, Issue, Test Case, etc.

```
Fixed bug #123
See related user story #456
Depends on task #789
```

**In tables**: add a blank space before and after a `#ID` or `!ID` mention
so it renders correctly.

**Escaping**: If you use `#` for other purposes (e.g., hex colors `#FF0000`),
prefix with a backslash: `\#FF0000`.

## Pull Request References — `!ID`

Type `!` followed by the PR number in work item discussion fields. Azure DevOps
shows a picker to search and select. The PR is inserted as a clickable link.

```
This was addressed in !456
See review comments on !789
```

> **Note**: The `!ID` syntax references **GitHub pull requests** when the
> Azure Boards project is connected to GitHub repos. For Azure Repos PRs,
> use the `!ID` picker in work item discussions or link directly via the
> Development section.

## Cross-Platform References — `AB#ID`

Use `AB#ID` in **GitHub** commits, pull request descriptions, and issues to
link back to Azure Boards work items.

```
Fixed login timeout AB#123
Implements AB#456, AB#457
```

- Only works in the **PR description body** (not title or comments) for
  auto-linking to appear in the Development section.
- Removing `AB#ID` from the description also removes the link.

## State Transition Keywords

Use these keywords **before** a `#ID` or `AB#ID` to automatically transition
work items when a PR is merged to the default branch.

| Keyword | State transition | Example |
|---------|-----------------|---------|
| `fix`, `fixes`, `fixed` | → first **Resolved** state (or **Completed** if none) | `Fixes #123` |
| `close`, `closes`, `closed` | → **Closed** state | `Closes #123` |
| `resolve`, `resolves`, `resolved` | → **Resolved** state | `Resolves #123` |
| Any valid state name | → that specific state | `Review AB#123` |

**Rules**:
- Keywords are **case-insensitive**.
- A colon after the keyword is optional: `Fixes: #123` works.
- Each work item must have its own keyword: `Fixes #123, #124` only
  transitions `#123`. Use `Fixes #123, Fixes #124` to transition both.
- State transitions only apply when the PR merges to the **default branch**.

## User & Group Mentions — `@alias`

Type `@` to trigger the people picker. The mentioned user receives an email
notification.

```
@johndoe can you review the auth changes?
@backend-team FYI on the schema migration
```

**Where it works**: work item discussions, PR comments, commit comments,
changeset comments, shelveset comments, wiki pages.

**Do not** copy-paste `@mention` text from a previous comment — it won't
register as a true mention or send a notification.

## Bot Comment Prefix

When replying to PR comments as a bot, always prefix with:

```
[<developer name>'s bot] <your message>
```

This makes it clear to reviewers that the response is automated. Get the
developer name from `git config user.name` or the PR author field.

## PR Description Template

When creating PRs that link work items, use `AB#ID` in the description body:

```markdown
## Summary
<2-4 sentences>

## Changes
- <change 1>
- <change 2>

## Testing
<how tested>

## Related Work Items
AB#<work_item_id>
```

## Usage in Skills

Any skill that writes to Azure DevOps (PR descriptions, comments, work item
updates) should follow these conventions. Reference this document when:
- Composing PR descriptions (`publish-pr`)
- Posting review comments (`review-pr`)
- Replying to reviewer feedback (`publish-pr` Phase 3, `babysit-pr`)
- Creating or updating work items (`work-items`)
