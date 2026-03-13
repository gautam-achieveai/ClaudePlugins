---
name: codebase-search-discipline
description: >
  Shared search discipline rules for all reviewer agents. Prevents false
  positive findings by enforcing source-branch search, scoped queries,
  PR diff checks, and build status evidence. Invoke before making any
  claim about what exists or doesn't exist in a codebase.
allowed-tools:
  - Read
---

# Codebase Search Discipline

Before making any claim about what exists or doesn't exist in a codebase — such as
"this symbol doesn't exist", "this won't compile", "there are no callers", or
"this is unused" — you MUST follow the search discipline rules.

## Load the Rules

Read the full discipline document:

```
reference/codebase-search-discipline.md
```

## Apply the 6 Rules

After loading, enforce every rule on every finding you produce:

1. **Search the source branch** — not the target branch
2. **Scope searches** — avoid timeouts on large repos
3. **Check the PR diff** — definitions may be in the PR itself
4. **Respect green builds** — if it compiles, don't claim it won't
5. **Escalate to deep review** — when verification is uncertain
6. **Qualify uncertainty** — use "unable to find" not "doesn't exist"

A false positive damages reviewer credibility more than a missed finding.
