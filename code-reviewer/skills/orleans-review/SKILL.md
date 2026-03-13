---
name: orleans-review
description: >
  Orleans PR review skill — delegates to orleans-dev:orleans-patterns for domain
  knowledge, then loads review-specific bridge content (output format, PR edge cases,
  severity mapping).
allowed-tools:
  - Read
  - Skill
---

# Orleans Review — Delegating Domain Loader

This skill loads Orleans domain knowledge from the `orleans-dev` plugin and adds
review-specific context on top. It does NOT maintain its own copy of Orleans rules.

## Step 1: Load Domain Knowledge

Invoke the orleans-dev plugin's comprehensive Orleans patterns skill:

```
skill: "orleans-dev:orleans-patterns"
```

This provides all grain design, concurrency, cross-grain communication, streams, and
serialization rules with code examples and anti-pattern tables.

## Step 2: Load Review Bridge

Read the review-specific additions that the dev skill does not cover:

```
reference/review-bridge.md
```

This provides PR output format, edge case handling for review context, Orleans version
detection guidance, and severity mapping from dev-skill anti-patterns to review findings.
