---
name: ado-mentions
description: >
  Azure DevOps mention and reference syntax — #ID for work items, !ID for PRs,
  @alias for users, AB#ID for cross-platform, state transition keywords, bot
  comment prefix, PR description template. Invoke before writing any content to
  Azure DevOps (PR descriptions, comments, work item updates, wiki pages).
allowed-tools:
  - Read
---

# Azure DevOps Mention & Reference Conventions

This skill loads the ADO mention conventions so you use the correct syntax when
writing to Azure DevOps.

## Load the Reference

Read the full conventions document:

```
references/ado-mention-conventions.md
```

Note: the path is relative to the ado plugin root (`ado/references/`).

## Quick Summary

| What | Syntax | Example |
|------|--------|---------|
| Work item | `#ID` | `#123` |
| Pull request | `!ID` | `!456` |
| User/group | `@alias` | `@johndoe` |
| Cross-platform (GitHub → ADO) | `AB#ID` | `AB#123` |
| State transition | keyword + `#ID` | `Fixes #123` |
| Bot comment prefix | `[<dev>'s bot]` | `[Jane's bot] Fixed: ...` |

## When to Invoke

Invoke this skill before:
- Composing PR descriptions (`publish-pr`)
- Posting review comments or replies (`babysit-pr`, `pr-tender`)
- Creating or updating work items (`work-items`, `draft-work-item`)
- Posting comments to work items (`work-on`)
- Writing wiki content that references ADO artifacts

## Full URL Patterns (No Shorthand)

For artifacts without shorthand syntax, use explicit URLs:

| Artifact | URL Pattern |
|----------|------------|
| Build / pipeline run | `https://dev.azure.com/{org}/{project}/_build/results?buildId={id}` |
| Release | `https://dev.azure.com/{org}/{project}/_release?releaseId={id}` |
| Pipeline definition | `https://dev.azure.com/{org}/{project}/_build?definitionId={id}` |
| Build artifacts | `https://dev.azure.com/{org}/{project}/_build/results?buildId={id}&view=artifacts` |
| Wiki page | `/{project}/_wiki/wikis/{wikiName}?pagePath=/PageName` |
| Repo file | `https://dev.azure.com/{org}/{project}/_git/{repo}?path=/file.cs` |
| Specific commit | `https://dev.azure.com/{org}/{project}/_git/{repo}/commit/{sha}` |
