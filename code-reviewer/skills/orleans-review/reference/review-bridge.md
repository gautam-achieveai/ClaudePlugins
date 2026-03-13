# Orleans Review — Bridge Content

This file contains review-specific additions that complement the domain knowledge
loaded from `orleans-dev:orleans-patterns`. It does NOT duplicate domain rules.

---

## PR Review Output Format

Provide findings in this structure:

```
## Orleans Review Summary

### Call Graph Analysis
- Diagram or description of grain-to-grain calls found in the PR
- Any cycles detected (or confirmation that none exist)

### Issues Found

#### [CRITICAL/HIGH/MEDIUM/LOW] - [Issue Title]
- **File**: `path/to/file.cs:line`
- **Problem**: Description of the issue
- **Risk**: What can go wrong (deadlock, data loss, performance, thundering herd)
- **Current Code**: The problematic code snippet
- **Recommendation**: What should be done instead
- **Example Fix**: Code showing the correct approach

### Positive Findings
- List well-implemented Orleans patterns found in the PR

### Missing Items
- List any expected patterns that are absent (e.g., missing error handling on WriteStateAsync)
```

---

## PR Context Edge Cases

- **Only flag NEW issues** — if existing code already has call graph cycles, only flag cycles introduced or extended by the PR
- **Respect existing `[Reentrant]`** — if a grain is already marked `[Reentrant]` and the PR adds state mutations, flag the interaction risk but don't flag the reentrancy attribute itself
- **Configuration-only PRs** — if the PR only changes silo configuration (stream providers, storage providers), verify configuration correctness but skip grain code analysis
- **Interface-only PRs** — if only grain interfaces change without implementations, review interface design for potential reentrancy implications in downstream implementors

---

## Orleans Version Detection

Determine the Orleans version from the codebase to apply the correct rules:

| Signal | Version |
|--------|---------|
| `GetStreamProvider`, `IGrainWithStringKey` inheritance | 3.x (legacy) |
| `[GenerateSerializer]`, `[Id]` attributes on state | 7.x+ (modern) |
| `[Alias]` on grain interfaces | 7.x+ |
| Adaptive stateless worker scaling | 9.x |
| `Grain<TState>` base class | Both (check other signals) |

When version is ambiguous, check NuGet references (`Microsoft.Orleans.*` package versions) or `Directory.Packages.props`.

---

## Severity Mapping from Dev Skill Anti-Patterns

Map the `orleans-dev:orleans-patterns` anti-pattern checklist items to review severity:

| Anti-Pattern Category | Review Severity |
|-----------------------|----------------|
| Cyclic calls without reentrancy | CRITICAL |
| `task.Wait()`, `.Result`, `.GetAwaiter().GetResult()` | CRITICAL |
| `Thread.Sleep` in grain code | CRITICAL |
| `OnDeactivateAsync` for critical persistence | CRITICAL |
| External code bypassing grain to modify grain-owned data | CRITICAL |
| `[ImplicitStreamSubscription]` on widely instantiated grains | CRITICAL |
| Grain state accessed inside `Task.Run` | HIGH |
| Chatty grain-to-grain patterns | HIGH |
| Missing `WriteStateAsync()` after state mutation | HIGH |
| Non-idempotent stream handlers | HIGH |
| Passing `this` instead of `this.AsReference<T>()` | HIGH |
| Missing `[GenerateSerializer]` or `[Id]` attributes | MEDIUM |
| Missing `ResumeAsync` in `OnActivateAsync` | MEDIUM |
| `ConfigureAwait(false)` in grain code | MEDIUM |
| Reused/changed `[Id]` values | MEDIUM |
| Missing `[Alias]` on long-lived stored types | LOW |
| Using deprecated APIs when modern alternatives exist | LOW |
