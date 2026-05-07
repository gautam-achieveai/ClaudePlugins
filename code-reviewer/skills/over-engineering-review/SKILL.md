---
name: over-engineering-review
description: >
  Code-review methodology for detecting over-engineering, gold-plating, and scope creep
  — places where the implementation does meaningfully more than the linked task, bug,
  or PR title actually required. Compares delivered diff to stated intent, not raw
  complexity in isolation. Particularly catches what AI- and LLM-generated PRs tend to
  produce: speculative abstractions for hypothetical futures, single-use helper
  extractions, defensive code for impossible scenarios, drive-by refactors bundled with
  bug fixes, premature optimization without measurement, unused configuration hooks,
  excessive logging, tutorial-style comments, unrequested features, and duplicate code
  paths added next to existing ones. Use whenever a reviewer says or thinks the diff
  feels too big for what was asked — e.g., "this bug fix introduces a new interface
  for one impl", "the AI added five helpers used once each", "fix login bug PR has 14
  files", "is this YAGNI?", or any audit of AI-generated code against an original
  prompt. NOT for general code quality, performance, security, exception handling,
  duplicate-finding, EUII, architecture, test generation, logging setup, or implementing
  work items — those have dedicated tools.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Over-Engineering Review — Methodology

This skill is the working methodology used by the `over-engineering-review` agent and any
other reviewer that needs to compare *delivered* code to *requested* scope. It catalogues the
ten patterns of LLM and developer over-achievement, with detection signals, severity
guidance, and explicit "what NOT to flag" rules for each.

## Core Principle

The cheapest line of code is the one you don't write. Every line that lands in the codebase
imposes a perpetual tax on future readers, refactorers, and reviewers. Over-engineering is
the failure mode where extra code lands without a current need — its tax is paid every day,
its benefit is hypothetical and often never realized.

A good implementation matches the task's actual shape. Smaller, more focused PRs land faster,
review faster, regress less, and roll back more cleanly. When a reviewer flags over-engineering
they are not being pedantic — they are protecting the team from a slow accumulation of
unjustified complexity.

## When to Use This Skill

Invoke this methodology when:

- Reviewing an LLM-generated PR or implementation — LLMs disproportionately over-produce.
- A PR's diff feels much larger than the task it's linked to.
- A PR introduces new abstractions, interfaces, or layers in an otherwise small change.
- A bug fix PR touches files unrelated to the bug's reported area.
- The user asks "is this PR doing too much?" or "is this over-engineered?"
- The reviewer notices speculative comments like "to support future X" without a concrete
  current X being addressed.

## The Ten Categories

Each category includes: detection signals, what the LLM/dev was probably trying to do, why
it's a problem, severity guidance, and "do NOT flag" exclusions.

---

### 1. Drive-by Refactor

A bug fix or small feature PR that also reformats, renames, or restructures unrelated code
in passing. "While I was in there..."

**Detection signals:**
- Files changed include directories or modules that have no apparent connection to the stated
  task.
- Renames or signature changes to functions called from many places, where only one call site
  is the actual subject of the PR.
- Whitespace, import-order, or comment-only edits in files whose logic is otherwise untouched.
- Commit messages or PR description that include phrases like "also cleaned up X", "fixed
  some unrelated nits", "took the opportunity to rename Y".

**Why it's a problem:**
- Bundles unrelated risk into a single rollback unit. If the bug fix needs reverting, you
  also lose the cleanup.
- Inflates the PR's review surface, increasing the chance real defects in the small change
  slip through.
- Pollutes git blame/log — a year from now, the commit "fix off-by-one in pagination" also
  contains an unrelated rename and someone bisecting will be confused.

**Severity:** MEDIUM by default. HIGH if the drive-by changes touch shared infrastructure
or files used by many other callers (regression blast radius). LOW if the drive-by is purely
local to a file already being meaningfully changed for the task.

**Recommendation pattern:** "Move this rename/reformat to its own follow-up PR (or commit)
so the bug fix can be reviewed and reverted independently."

**Do NOT flag:**
- Mechanical changes that are *required* for the in-scope work to compile (adding a `using`
  statement, threading a parameter through an existing chain).
- Reformatting that the project's auto-formatter applied automatically as part of a build
  step (these are not the author's choice).
- Renames explicitly authorized by the work item ("part of the API cleanup epic").

---

### 2. Speculative Abstraction

A new interface, abstract class, generic type, or strategy/factory pattern introduced for a
hypothetical future need that the current task does not require.

**Detection signals:**
- A new interface with exactly one concrete implementation, and no second implementation is
  mentioned in the work item, on the roadmap, or imminent in another open PR.
- An abstract base class introduced alongside its first concrete subclass — often with comments
  like `// Other foos can extend this in the future`.
- A `<T>` generic where every existing call site uses the same concrete type and there is no
  documented case for a second.
- New factory or strategy classes that select between exactly one option.
- Plugin/extension/handler architectures where there is exactly one plugin/extension/handler.

**Why it's a problem:**
- Abstractions designed without a second concrete use case are usually wrong — the chosen
  abstraction shape is biased to the only known implementation and bends awkwardly when the
  second one finally arrives. Better to wait.
- Adds indirection: every reader must trace through the interface to find the actual code.
- Establishes a precedent: future contributors will assume the abstraction "must be there for
  a reason" and dutifully add their new variants behind it, even when a direct call would
  suffice.

**Severity:** MEDIUM by default. HIGH when the abstraction is exposed across module boundaries
(other modules now have to depend on the interface, locking the design in). LOW when the
abstraction is purely internal to a class or file (easily refactored later).

**Recommendation pattern:** "Inline the concrete implementation. When a second use case
appears, the right abstraction will be obvious from the two concrete cases — and may differ
from this one. Three similar lines of code is better than a premature abstraction."

**Do NOT flag:**
- Interfaces required for testability when the codebase relies on mocking interfaces (e.g.,
  C# / Java with Moq / Mockito conventions). Even single-impl interfaces serve a real current
  need: enabling unit tests.
- Abstractions consistent with a codebase-wide pattern. If every entity has a repository, a
  new repository for a new entity is consistency, not speculation.
- Abstractions explicitly motivated by an upcoming task in the same epic — verify by checking
  the work item parent or sibling tickets.

---

### 3. Speculative Defensive Code

Null checks, try/catch blocks, validation, retry logic, or input sanitization for scenarios
that cannot occur given the call graph.

**Detection signals:**
- A new public method that is only called from one internal caller — and the new method
  immediately validates inputs that the caller cannot pass invalidly.
- `if (foo == null) throw ...` on a parameter whose only callers pass it directly from a
  constructor or a non-nullable type.
- `try { ... } catch (Exception ex) { _logger.LogError(...); throw; }` blocks that swallow
  no exceptions and add no recovery — pure noise.
- Retry loops or circuit breakers added to a one-shot internal call that has never reported
  flakiness.
- Re-validation in a service method of inputs already validated by the controller.

**Why it's a problem:**
- Adds untested code paths — the impossible branch will never be hit, so the catch/throw is
  effectively dead and unverified.
- Hides real coupling: if a caller suddenly *does* start passing null, the callee will silently
  reject it instead of the call chain breaking visibly.
- Creates a culture of paranoid coding. Future developers will copy the pattern and add their
  own impossible checks.

**Severity:** MEDIUM by default. LOW when the defensive code is at a public API or
trust-boundary entry point (validation at boundaries is correct — flag only that it's
duplicating boundary validation done elsewhere).

**Recommendation pattern:** "Remove the null check / try-catch / retry — the only callers
[name them] cannot trigger this branch. If a future caller does, the call chain should fail
visibly so we discover the real coupling rather than silently swallowing it."

**Do NOT flag:**
- Defensive code at trust boundaries — public APIs, deserialization of external input, parsing
  user-supplied data. Validation at the boundary is correct.
- Defensive code for resources that genuinely fail (network calls, file I/O, database
  operations) where retry/exception handling is part of normal operation.
- Validation explicitly required by the codebase's contract conventions (e.g., `ArgumentNullException`
  on every public method) — flag only deviations from convention, not adherence.

---

### 4. Premature Optimization

Caching layers, batching, parallelization, custom data structures, or algorithmic tricks
introduced without a measured performance need.

**Detection signals:**
- A new `IMemoryCache` or similar caching layer in a code path that handles low-frequency
  operations.
- A switch from a simple `foreach` to `Parallel.ForEach` or `await Task.WhenAll` without the
  workload size justifying it.
- Custom collection types or pools where the standard library types would be plenty fast for
  the data volumes involved.
- Comments like `// optimize this later if it becomes a bottleneck` next to code that is
  *already* optimized.
- Performance work in a PR whose stated task is functional, not performance-related.

**Why it's a problem:**
- Optimized code is harder to read and modify. The cost is paid every time someone touches it.
- Without a benchmark or production metric, you don't know if the optimization actually helps
  — and might be making things worse (e.g., parallelism on a tiny workload is slower than
  serial due to task-creation overhead).
- The "right" optimization for a hypothetical future load may be entirely different from
  what's been added now.

**Severity:** MEDIUM by default. HIGH when the optimization adds significant code complexity
(custom data structures, threading) without measurement. LOW when it's a one-line idiomatic
choice (e.g., `HashSet` instead of `List` for membership tests) consistent with the codebase.

**Recommendation pattern:** "Revert to the straightforward implementation. If a profiler or
production metric later shows this hot path is expensive, the right optimization will be
informed by real data. Performance-tune by measurement, not by anticipation."

**Do NOT flag:**
- Optimization explicitly motivated by the work item ("make endpoint X 2x faster, see attached
  perf trace").
- Idiomatic choices that don't add complexity (using LINQ `Any()` instead of `Count() > 0`,
  preferring `StringBuilder` for repeated concatenation in a hot loop).
- Following a documented pattern the codebase has already established (every endpoint caches
  for 30s — the new endpoint should too).

---

### 5. Unrequested Feature

The PR delivers functionality that wasn't asked for in the task description.

**Detection signals:**
- New endpoints, CLI flags, UI elements, or exported functions not mentioned in the work item.
- Comments or PR description that introduce additional features as "bonuses": "while I was
  adding X, I also wired up Y so users can also..."
- Test files for behaviors no part of the work item describes.
- Documentation entries describing features that don't appear in the task description.

**Why it's a problem:**
- Public API surface is sticky. Once an endpoint is shipped, customers may rely on it; once
  a CLI flag is documented, removing it is a breaking change. Unrequested features become
  permanent technical debt.
- Unrequested features are typically the least tested — they weren't in the test plan.
- They obscure the actual diff under review: the reviewer has to context-switch between
  evaluating the requested feature and an unrelated one.
- They circumvent product/design review — the team didn't approve the feature, but it ships
  anyway.

**Severity:** HIGH or BLOCKER for new public API surface (endpoints, exported functions,
schema changes, CLI flags). MEDIUM for internal features. LOW only when the addition is
genuinely tiny and the reviewer is confident it won't matter.

**Recommendation pattern:** "Move the [unrequested feature] to its own PR linked to its own
ticket. The current PR should ship only the work the task asked for. If the feature is
genuinely valuable, file a ticket so it can be prioritized and reviewed on its own merits."

**Do NOT flag:**
- Internal refactors that enable the requested feature (those are scope-required, not
  unrequested).
- Tests for the requested feature, even if there are several — testing depth is rarely
  over-engineering.
- Features explicitly part of a documented epic the work item belongs to.

---

### 6. Excessive Logging or Telemetry

Logging statements, metrics, or telemetry events added at every step of a code path when the
task didn't request observability work and the surrounding code is sparingly logged.

**Detection signals:**
- A new method with `_logger.LogInformation` at entry, between every step, and at exit — for
  a method that is purely a pass-through.
- New metrics counters (`metrics.Increment(...)`) added next to logic that didn't have any
  before, in a codebase that doesn't generally instrument that layer.
- Logging at `Information` or `Debug` level for events that are not actionable.
- Repetition of context already established by the calling layer (re-logging the user ID
  inside a method that was called from a controller that already logged it).

**Why it's a problem:**
- Log volume directly costs money (storage, ingestion) and degrades signal — the noisier the
  logs, the harder to find the one event that matters.
- Inconsistent logging density across the codebase makes log-based debugging unpredictable.
- Logging often duplicates EUII/PII (user IDs, emails) — more logs means more leakage risk.

**Severity:** MEDIUM by default. HIGH when the new logs include EUII (handed to the
`euii-leak-detector` agent for that aspect; you flag the *volume* aspect). LOW when the new
logs are at the right level and just slightly redundant.

**Recommendation pattern:** "Pare back to just the entry/exit log of the public boundary, or
to the specific failure paths that need tracing. Verbose logging is a debugging tool, not a
default — it should be added when there's a known reason to trace this path, not preemptively."

**Do NOT flag:**
- Logging in error/exception paths — those are usually the right place to log.
- Logging required by the codebase's structured logging conventions (every public service
  method logs entry/exit at Trace level).
- Telemetry explicitly requested by the work item ("instrument endpoint X for SLO tracking").

---

### 7. Tutorial-Style Commenting

Comments that explain *what* well-named code already says, written as if for a reader who
doesn't know the language.

**Detection signals:**
- `// Increment the counter` above `counter++`.
- `// Loop through the items` above `foreach (var item in items)`.
- Comments that paraphrase a method name without adding insight: `// Calculate the total cost
  of the order` above `decimal CalculateOrderTotalCost(...)`.
- Multi-line comments restating the type of every parameter when the type is in the signature.
- Comments narrating the LLM's own reasoning ("// We need to check this because...") that
  belongs in a commit message or PR description, not in the code.

**Why it's a problem:**
- Comments rot. As code is refactored, comments lag — and a wrong comment is worse than no
  comment because it actively misleads.
- Tutorial comments dilute the signal of *useful* comments (the ones explaining *why* a
  non-obvious choice was made). Readers learn to skim past comment blocks.
- They are a hallmark of LLM-generated code and a giveaway that the code wasn't reviewed by a
  human afterward.

**Severity:** LOW by default — these don't change behavior. MEDIUM only when comments are
dense enough to actually obscure the code (40%+ of the lines are comments saying nothing).

**Recommendation pattern:** "Delete these comments. Well-named identifiers and small functions
are the documentation. Reserve comments for the *why* of non-obvious choices: a workaround
for a specific bug, a hidden invariant, a constraint that would surprise a reader."

**Do NOT flag:**
- XML doc comments / JSDoc / docstrings on public APIs when the codebase has a documented
  convention of including them. (Quality of those docstrings is owned by `comment-analyzer`.)
- Comments explaining genuinely non-obvious decisions, workarounds, or constraints.
- Header comments required by the project's licensing or compliance policies.

---

### 8. Single-Use Helper Extraction

A method, function, or local helper extracted from code that is called from only one place,
where inlining would be clearer.

**Detection signals:**
- A new private method that is only called from the method it was extracted from, and the
  extracted method is short (< 10 lines).
- A new local function whose body is shorter than its parameter list.
- A new utility class or static helper whose only consumer is a single caller in the same PR.
- A "Step 1 / Step 2 / Step 3" decomposition where each step is a one-liner that doesn't earn
  its own name.

**Why it's a problem:**
- Premature DRY. The "rule of three" exists for a reason: extract when you have three concrete
  uses, because two might just be coincidental similarity.
- Forces readers to jump around to follow the logic instead of reading top-to-bottom.
- The extracted method's interface (parameters, return value) is shaped by the one caller and
  often warps awkwardly when a second caller eventually arrives — inlining first lets you see
  the second caller's needs clearly.

**Severity:** LOW by default. MEDIUM when the extracted helper is in a separate file or class
(which makes the indirection more painful) or when the extraction split closely-related logic
across multiple methods that have to be read together to make sense.

**Recommendation pattern:** "Inline this helper at the single call site. If a second use case
appears, extract it then — the right shape will be informed by both concrete uses."

**Do NOT flag:**
- Helpers that meaningfully clarify the caller by giving a chunk of logic a name (a
  20-line helper that the caller invokes as `var result = ComputeRiskAdjustedScore(input);`
  is documenting intent, not just decomposing).
- Helpers that already have a future second caller queued up (visible in the same PR or in a
  sibling PR).
- Decompositions that the codebase's style guide or testing conventions require.

---

### 9. Unused Configuration Hook

New configuration options, feature flags, environment variables, or options classes that
nothing in the codebase reads.

**Detection signals:**
- A new field added to an `IOptions<T>` class that no consumer references.
- A new feature flag check (`if (_features.IsEnabled("foo"))`) where the flag's other branch
  is unreachable or returns the same result.
- A new environment variable mentioned only in `appsettings.json` and the options class — no
  code path actually consumes it.
- A new constructor parameter, with a default value, that the constructor never uses.

**Why it's a problem:**
- The hook implies extensibility that doesn't exist — readers waste time looking for the code
  that consumes it.
- Hooks become permanent: removing them is a breaking change for anyone who started setting
  the value.
- They obscure which knobs in the system actually matter for behavior.

**Severity:** MEDIUM by default. HIGH when the hook is part of a public API or schema (it
becomes external-facing and harder to remove). LOW when the hook is purely internal and the
PR clearly intends to wire it up in a follow-up (verify by checking the work item).

**Recommendation pattern:** "Remove the unused hook. Add it back when the consumer is also
landing — preferably in the same PR so the hook and its consumer can be reviewed together."

**Do NOT flag:**
- Hooks explicitly part of a documented rollout plan (feature flag added now, consumer in next
  sprint per the epic).
- Hooks consumed externally (the codebase exports the options class as part of a public SDK).
- Default-valued constructor parameters required by a DI framework's conventions.

---

### 10. Duplicate Path Instead of Extending

The PR adds a new method, class, or code path next to an existing one with similar behavior,
instead of extending the existing one.

**Detection signals:**
- A new method `GetUserByIdV2(...)` next to existing `GetUserById(...)` where the difference
  is small and the existing method has only one or two callers.
- A new class `OrderProcessorWithFoo` next to `OrderProcessor` where the difference is one
  feature toggle.
- Branching logic at a high level (`if (request.IsNewFlow) NewFlow(); else OldFlow();`) where
  both flows share substantial implementation.
- Comments like "added new flow because the old one didn't quite fit" without an explanation
  of why the old one couldn't be extended.

**Why it's a problem:**
- Two paths that should be one will diverge over time. Bug fixes get applied to one and not
  the other. Behavior drifts.
- Doubles the maintenance surface and the test surface.
- Often signals an LLM that didn't fully read or understand the existing code and chose to
  build alongside instead of integrating with it.

**Severity:** HIGH by default — duplicate paths create lasting bifurcation. MEDIUM when the
duplication is purely additive and the original path has no callers being modified (the new
path is genuinely a new feature with coincidental similarity).

**Recommendation pattern:** "Extend the existing method/class instead of adding a parallel
one. If the existing implementation can't accommodate the new requirement cleanly, refactor
it first (as its own PR or commit) and then add the new behavior on top of the refactored
version."

**Do NOT flag:**
- Genuinely separate concerns that happen to look similar (e.g., a `User` repository and an
  `Order` repository — same shape, different domains, correctly separate).
- Versioned APIs where parallel paths are intentional (`/v1/users` and `/v2/users` exist for
  contract compatibility).
- Cases where the existing code is explicitly being deprecated and the new path will replace
  it once consumers migrate (verify by checking for deprecation comments or work item context).

---

## How to Use This Catalog

When reviewing, walk the diff once for each of the ten categories — most reviews touch only
two or three categories per PR. For each finding, populate the agent's output template with:

- **Stated task** (from the anchor source)
- **Delivered beyond that** (the specific code introducing the over-engineering)
- **Category** (from above)
- **Why it matters** (use the "Why it's a problem" notes for the chosen category)
- **Recommendation** (use the recommendation pattern, then specialize to the actual code)

If you find yourself unable to pick a category, you may be looking at a different concern.
Double-check it isn't owned by `code-simplifier` (block-level complexity), `class-design-simplifier`
(class-level abstract complexity), `architecture-review` (system-level structure), or
`duplicate-code-detector` (duplicate code). The over-engineering lens is specifically about
**delivered scope vs. stated scope**.

## Anchor Confidence — Self-Assessment Before Reporting

Before publishing your findings, sanity-check the anchor:

| Anchor source                    | Confidence  | Posture                                     |
|----------------------------------|-------------|---------------------------------------------|
| Work item with detailed acceptance criteria | HIGH | Confidently flag deviations from the criteria |
| Work item title only             | MEDIUM      | Flag obvious overruns; emit `[QUESTION]` for borderline cases |
| PR title + description           | MEDIUM      | Same as above |
| Commit messages only             | LOW         | Flag only egregious overruns; lean on YAGNI lens |
| No anchor                        | LOW         | YAGNI-only review; explicitly note the missing anchor |

Always state the anchor and your confidence level in the summary block. The reviewer needs
this metadata to decide how seriously to weight the findings.

## Final Reminders

- Be specific. "This abstraction is speculative" is weak. "This `IFooStrategy` interface has
  one implementation, the work item describes a single fixed strategy, and there is no second
  variant on the roadmap — inline the concrete `DefaultFooStrategy` until a second use case
  appears" is useful.
- Be charitable when uncertain. Emit `[QUESTION]` for borderline cases; reserve findings for
  cases you can defend with the anchor.
- Acknowledge clean PRs. If the diff matches the task scope, say so. Quiet reviewers who only
  surface negatives lose credibility — reviewers who say "this is well-scoped" when it is
  build trust.
