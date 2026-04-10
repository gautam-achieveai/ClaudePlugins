# GitHub Mention & Reference Conventions

> **Loaded by** the `gh:gh-mentions` skill. Invoke the skill rather than
> reading this file directly.

Use these conventions when writing issue bodies, PR descriptions, PR comments,
review replies, project notes, and bot responses on GitHub.

## Quick Reference

| Artifact | Syntax | Where it works | Example |
|----------|--------|----------------|---------|
| Issue or pull request in the same repo | `#ID` | Issues, PRs, commit messages, comments | `#123` |
| Issue or pull request in another repo | `owner/repo#ID` | Issues, PRs, commit messages, comments | `octo-org/platform#456` |
| Commit SHA | short SHA or full SHA | Issues, PRs, comments | `9f8c1ab` |
| User / team mention | `@login` | Issues, PRs, review replies, project notes | `@octocat` |

## Issue and Pull Request References — `#ID`

Type `#` followed by the number. GitHub auto-links the referenced issue or pull
request in the current repository.

```markdown
Fixes #123
Follow-up in #456
Related to #789
```

For another repository, qualify the reference:

```markdown
Blocked by octo-org/platform#123
Follow-up tracked in octo-org/backend#456
```

## State Transition Keywords

Use these keywords in a PR description or commit message to automatically close
linked GitHub issues when the PR merges to the default branch.

| Keyword | State transition | Example |
|---------|-----------------|---------|
| `fix`, `fixes`, `fixed` | closes the issue | `Fixes #123` |
| `close`, `closes`, `closed` | closes the issue | `Closes #123` |
| `resolve`, `resolves`, `resolved` | closes the issue | `Resolves #123` |

**Rules**:
- Keywords are **case-insensitive**.
- Each issue should have its own keyword: `Fixes #123, #124` reliably closes
  only the first issue. Use `Fixes #123` and `Fixes #124`.
- Auto-closing happens when the PR merges to the default branch.

## User & Team Mentions — `@login`

Type `@` followed by a GitHub user or team slug. GitHub notifies the mentioned
party if they have access to the repo.

```markdown
@johndoe can you review the auth changes?
@octo-org/platform-team FYI on the schema migration
```

Use real mentions in newly posted comments instead of copying raw text from old
comments.

## Bot Comment Prefix

When replying to issue or PR comments as a bot, always prefix with:

```
[<developer name>'s bot] <your message>
```

This makes it clear to reviewers that the response is automated. Get the
developer name from `git config user.name` or the PR author field.

## PR Description Template

When creating PRs that link issues, prefer a clear summary plus an explicit
linked-issue section:

```markdown
## Summary
<2-4 sentences>

## Changes
- <change 1>
- <change 2>

## Testing
<how tested>

## Related Issues
Fixes #<issue_id>
```

## Full URL Patterns (No Shorthand)

For artifacts without shorthand mention syntax, use explicit URLs:

| Artifact | URL Pattern |
|----------|------------|
| GitHub Actions run | `https://github.com/{owner}/{repo}/actions/runs/{id}` |
| Project view | `https://github.com/orgs/{owner}/projects/{number}` |
| Repo file | `https://github.com/{owner}/{repo}/blob/{branch}/path/to/file` |
| Specific commit | `https://github.com/{owner}/{repo}/commit/{sha}` |

## Usage in Skills

Any skill that writes to GitHub (issue bodies, PR descriptions, PR comments,
issue comments, project notes) should invoke the `gh:gh-mentions` skill, which
loads this document. Applicable skills:
- Composing PR descriptions (`publish-pr`)
- Posting review comments (`babysit-pr`, `pr-tender`)
- Creating or updating work items backed by issues (`work-items`, `draft-work-item`)
- Posting comments to work items / issues (`work-on`)
