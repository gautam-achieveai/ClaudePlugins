# Codebase Search Discipline — Avoiding False Positives

When reviewing code, do NOT claim that something "doesn't exist", "will not
compile", "is missing", "has no callers", or "is unused" unless you have
**high-confidence evidence**. Search tools (Grep, Glob, `git grep`, ripgrep)
are unreliable on large repos — they timeout, return partial results, or miss
files outside the searched scope.

**A false positive damages reviewer credibility more than a missed finding.**
If you're unsure whether something exists, say so — don't assert that it doesn't.

---

## Rule 1: Search the PR's source branch, not just the target branch

Symbols, types, methods, or patterns may be introduced by the PR itself or by a
parent branch that hasn't merged yet. Always search the source branch:

```bash
# Correct — searches the PR's actual code
git grep -l "SymbolName" origin/<source-branch> -- "src/**"

# Wrong — misses symbols introduced by the PR
git grep -l "SymbolName" origin/dev -- "src/**"
```

Never rely solely on searching the target branch or the local working directory.

## Rule 2: Scope searches to avoid timeouts on large repos

If the repo has many files (>5k), do NOT search from the root. Scope to the
relevant subtree:

```bash
# Good — scoped to relevant directory
git grep "SymbolName" origin/<branch> -- "src/Server/**"
Grep pattern="SymbolName" path="src/Server"

# Bad — searches everything, may timeout or return partial results
Grep pattern="SymbolName"
rg "SymbolName"
```

If a scoped search returns nothing, widen the scope incrementally rather than
concluding the symbol doesn't exist.

## Rule 3: Check the PR diff before flagging missing definitions

If changed code references `FooHelper.DoSomething()`, check whether
`FooHelper` is defined in one of the PR's own changed files first. The
definition may be part of the same PR. Also check for:
- Generated code (files produced by build tools, T4 templates, source generators)
- Partial classes split across files
- Extension methods in different namespaces
- Framework-provided base class members

## Rule 4: If the build passes, do not claim compilation errors

If the PR's merge status is "Succeeded" or CI is green, the code compiles and
links. Do not override this evidence with search results. If you can't find a
symbol but the build passes, your search was incomplete — not the code broken.

This applies equally to:
- "This type doesn't exist" — it does, you didn't find it
- "This method has no implementation" — it does, possibly in a different project
- "This interface isn't registered in DI" — it is, possibly in a startup file
  you didn't search

## Rule 5: Escalate to deep review when verification matters

If you need to verify cross-project references, shared utilities, generated
code, or framework internals, recommend switching to a **deep review with
worktree checkout** rather than guessing from a lightweight review. The worktree
gives the full source tree at the PR's commit, making searches reliable.

## Rule 6: Qualify uncertainty in findings

When search results are inconclusive, use qualifying language:

- **High confidence** (found definitive evidence): "This method is not called
  anywhere in the changed files or their immediate dependencies."
- **Low confidence** (search may be incomplete): "I was unable to find callers
  for this method in the searched scope — verify this is intentional."
- **Never**: "This doesn't exist" / "This will not compile" / "There are no
  usages" (without evidence)

---

## Quick Summary

| Before claiming... | First verify... |
|---|---|
| "Symbol X doesn't exist" | Searched source branch, checked PR diff, checked build status |
| "Method Y has no callers" | Scoped search covered all relevant directories |
| "Interface Z isn't registered" | Checked DI/IoC setup files, startup configs |
| "This won't compile" | Build/merge status is actually failing |
| "This pattern isn't used anywhere" | Search wasn't cut short by timeout |
