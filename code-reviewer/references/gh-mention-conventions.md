# GitHub Mention & Reference Conventions

Use these conventions when writing PR descriptions, PR review comments, review
replies, issue comments, and bot responses on GitHub. This is the GitHub
counterpart to [ado-mention-conventions.md](ado-mention-conventions.md); pick the
file matching the provider resolved per [provider-resolution.md](provider-resolution.md).

## Quick Reference

| Artifact | Syntax | Where it works | Example |
|----------|--------|----------------|---------|
| Issue or pull request in the same repo | `#ID` | Issues, PRs, commit messages, comments | `#123` |
| Issue or pull request in another repo | `owner/repo#ID` | Issues, PRs, commit messages, comments | `octo-org/platform#456` |
| Commit SHA | short or full SHA | Issues, PRs, comments | `9f8c1ab` |
| User / team mention | `@login` | Issues, PRs, review replies | `@octocat` |

## Issue and Pull Request References — `#ID`

Type `#` followed by the number. GitHub auto-links the referenced issue or pull
request in the current repository. Unlike Azure DevOps, GitHub uses `#ID` for
**both** issues and pull requests — there is no separate `!ID` PR syntax.

```markdown
Fixes #123
Follow-up in #456
Related to #789
```

For another repository, qualify the reference: `octo-org/platform#123`.

## State Transition Keywords

Use these keywords in a PR description or commit message to automatically close
linked GitHub issues when the PR merges to the default branch.

| Keyword | Effect | Example |
|---------|--------|---------|
| `fix`, `fixes`, `fixed` | closes the issue | `Fixes #123` |
| `close`, `closes`, `closed` | closes the issue | `Closes #123` |
| `resolve`, `resolves`, `resolved` | closes the issue | `Resolves #123` |

**Rules**:
- Keywords are **case-insensitive**.
- Each issue needs its own keyword: `Fixes #123, #124` reliably closes only the
  first. Use `Fixes #123` and `Fixes #124`.
- Auto-closing happens only when the PR merges to the default branch.

## User & Team Mentions — `@login`

Type `@` followed by a GitHub user or team slug. GitHub notifies the mentioned
party if they have repo access.

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

## Posting Review Comments

- **Inline (line) comment** — `gh api repos/<owner>/<repo>/pulls/<n>/comments`
  with `path`, `line`, `side=RIGHT`, and `commit_id` set to the PR head SHA.
- **Reply in an existing thread** —
  `gh api repos/<owner>/<repo>/pulls/<n>/comments/<commentId>/replies`.
  Reply **in the thread**, not as a new top-level comment.
- **General PR comment** — `gh pr comment <n> --body "<text>"`.
- GitHub has no line-less "file comment": anchor to the file's first changed line
  or use a general comment that names the file.

## PR Description Template

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

| Artifact | URL Pattern |
|----------|------------|
| GitHub Actions run | `https://github.com/{owner}/{repo}/actions/runs/{id}` |
| Project view | `https://github.com/orgs/{owner}/projects/{number}` |
| Repo file | `https://github.com/{owner}/{repo}/blob/{branch}/path/to/file` |
| Specific commit | `https://github.com/{owner}/{repo}/commit/{sha}` |

## Usage in Skills

Any skill or agent that writes to GitHub (PR descriptions, review comments, issue
updates) should follow these conventions. Shared workflow names refer to the
`gh:` plugin entries; the Azure DevOps counterparts use the `ado:` namespace
(e.g. `gh:gh-publish-pr` ↔ `ado:ado-publish-pr`, `gh:setup-gh-mcp` ↔
`ado:setup-ado-mcp`).
