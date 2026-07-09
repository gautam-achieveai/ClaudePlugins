---
name: gh-mentions
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: true
disable-model-invocation: false
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

## When to Use

Use this skill before:
- Composing PR descriptions (`gh-publish-pr`)
- Posting review comments or replies (`gh-babysit-pr`, `gh-pr-tender`)
- Creating or updating issues/project items (`gh-work-items`, `gh-draft-work-item`)
- Posting plan or status comments to issues (`gh-work-on`)
- Writing project notes or follow-up issue links
