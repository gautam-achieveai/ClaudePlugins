---
name: gh-mentions
description: >
  GitHub mention and reference syntax — #ID for issues and PRs, owner/repo#ID
  for cross-repo links, @login for users, closing keywords, bot comment prefix,
  and PR description conventions. Invoke before writing any content to GitHub
  (issues, PR descriptions, PR comments, review replies, project notes).
allowed-tools:
  - Read
---

# GitHub Mention & Reference Conventions

This skill loads the GitHub mention conventions so you use the correct syntax
when writing to GitHub.

## Load the Reference

Read the full conventions document:

```
references/gh-mention-conventions.md
```

Note: the path is relative to the `gh` plugin root (`gh/references/`).

## Quick Summary

| What | Syntax | Example |
|------|--------|---------|
| Issue or pull request | `#ID` | `#123` |
| Cross-repo issue or PR | `owner/repo#ID` | `octo-org/platform#456` |
| User / team | `@login` | `@octocat` |
| State transition | keyword + `#ID` | `Fixes #123` |
| Bot comment prefix | `[<dev>'s bot]` | `[Jane's bot] Fixed: ...` |

## When to Invoke

Invoke this skill before:
- Composing PR descriptions (`publish-pr`)
- Posting review comments or replies (`babysit-pr`, `pr-tender`)
- Creating or updating issues/project items (`work-items`, `draft-work-item`)
- Posting plan or status comments to issues (`work-on`)
- Writing project notes or follow-up issue links
