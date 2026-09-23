# Orleans Review — Bridge Content

This file contains review-specific additions that complement the domain knowledge
loaded from `orleans-dev:orleans-patterns`. It does NOT duplicate domain rules.

---

## Where Findings Go

This file does not define an output layout. Findings are emitted in the JSON
contract at `../../pr-review/reference/finding-schema.md`: one JSON object per
agent, **at most 5 findings**, `id: null` (only the orchestrator assigns IDs),
**no `blocker` field** (the lane is the grader's call), and every record carrying
`diffAnchor` (`IN_DIFF` / `ENABLED_BY_DIFF` / `PRE_EXISTING`) and `confidence`.
The same Orleans mechanism repeated across grains is one record with the extra
locations listed in `instances` — that is clustering, not omission.

The content the old report structure carried still has a home:

- **Call graph analysis** — the grain-to-grain call trace, and whether a cycle
  was found or ruled out, goes in `evidence` for a cycle finding, and in
  `coverageNote` when no cycle exists.
- **Risk** (deadlock, data loss, performance, thundering herd) goes in
  `whyItMatters`.
- **Recommendation / example fix** goes in `suggestedPath` as the smallest
  correction, with the implementation-neutral condition in `requiredOutcome` and
  the closing evidence in `doneWhen`.
- **Positive findings** — well-implemented Orleans patterns, and expected
  patterns checked and found present — go in `coverageNote`. An expected pattern
  that is *absent* (e.g. no error handling on `WriteStateAsync`) is a finding,
  not a note.
- **Orleans version detected** and which rule set was applied go in
  `coverageNote`.

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
