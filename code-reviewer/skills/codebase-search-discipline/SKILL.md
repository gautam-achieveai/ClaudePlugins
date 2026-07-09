---
name: codebase-search-discipline
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: true
disable-model-invocation: false
allowed-tools:
  - Read
---

# Codebase Search Discipline

Before making any claim about what exists or doesn't exist in a codebase — or
making `only`, `all`, `always`, `never`, or `every` claims from search results
— you MUST follow the search discipline rules.

## Load the Rules

Read the full discipline document:

```
reference/codebase-search-discipline.md
```

## Apply the 7 Rules

After loading, enforce every rule on every finding you produce:

1. **Search the source branch** — not the target branch
2. **Scope searches** — avoid timeouts on large repos
3. **Check the PR diff** — definitions may be in the PR itself
4. **Respect green builds** — if it compiles, don't claim it won't
5. **Escalate to deep review** — when verification is uncertain
6. **Qualify uncertainty** — use "unable to find" not "doesn't exist"
7. **Match claim strength to evidence** — exhaustive wording requires exhaustive evidence

A false positive damages reviewer credibility more than a missed finding.
