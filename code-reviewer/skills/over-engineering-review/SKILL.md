---
name: over-engineering-review
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: true
disable-model-invocation: false
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Over-Engineering Review — Methodology

**Primary objective:** Compare the requested outcome with the delivered solution and its complexity.
**Decision rule:** For relevant cases these steps do not cover, choose the next in-scope action that advances this objective; preserve explicit scope, safety, and output requirements.

This skill is the working methodology used by the `over-engineering-review` agent and any
other reviewer that needs to compare *delivered* code to *requested* scope. It catalogues
ten excess-scope patterns and six implementation-fit checks, with evidence requirements,
ownership, and explicit "what NOT to flag" rules.

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

Use this methodology when:

- Reviewing an implementation for unnecessary complexity or claims of completion that
  do not match the changed behavior, regardless of who wrote it.
- A PR's diff feels much larger than the task it's linked to.
- A PR introduces new abstractions, interfaces, or layers in an otherwise small change.
- A bug fix PR touches files unrelated to the bug's reported area.
- The user asks "is this PR doing too much?" or "is this over-engineered?"
- The reviewer notices speculative comments like "to support future X" without a concrete
  current X being addressed.

## Evidence Gate

A pattern is a lead, not a finding. Never infer AI authorship from naming,
verbosity, formatting, or recognizable code shapes. "AI slop" is shorthand for
an evidenced implementation problem, not a finding category or a claim about
the author. Use the same standard for human and generated code.

Before reporting:

1. Establish the requirement or current contract, not the absence of a word in a ticket.
   Read applicable acceptance criteria, repository conventions, and approved rollout plans.
2. Trace the changed behavior or maintenance burden. Cite the entry point, consumer,
   or duplicated policy that makes it matter; missing context goes in `questions`.
3. Check disqualifiers: a single implementation or caller, a large diff, defensive
   code, or a new dependency alone does not prove over-engineering. Verify legitimate
   test seams, framework requirements, trust boundaries, and current operational needs.
4. Before claiming a symbol, registration, or consumer is absent, quote the scoped
   search and check generated code, reflection, dependency injection, external consumers,
   and the actual dependency version. Unavailable evidence is not proof of absence.
5. State the smallest correction that preserves required behavior, compatibility,
   and useful tests. If the simpler alternative cannot meet those constraints, do
   not recommend it merely because it is shorter.

Severity follows demonstrated impact, not the pattern name, comment density,
number of mocks, or public visibility alone. Category severities below are
conditional guidance, not automatic findings. Do not set `blocker`; the grader
owns merge-blocking decisions. Preferences and harmless redundancy do not block.

## The Ten Categories

Each category includes detection signals, potential consequences, severity guidance,
and "do NOT flag" exclusions. Establish intent from sources rather than guessing motives.

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

**Severity:** MEDIUM for evidenced unnecessary indirection or coupling. HIGH requires
a concrete cross-module contract or operability risk, not exposure alone.

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
- Repeated checks on a closed internal call path whose validated invariant remains
  unchanged between the checks; establish that invariant from the actual callers.
- `try { ... } catch (Exception ex) { _logger.LogError(...); throw; }` blocks that swallow
  no exceptions and add no recovery — pure noise.
- Retry loops or circuit breakers around a deterministic internal operation with no
  transient failure mode; lack of past incidents alone is not evidence.
- Re-validation in a service method of inputs already validated by the controller.

**Why it's a problem:**
- Adds untested code paths — the impossible branch will never be hit, so the catch/throw is
  effectively dead and unverified.
- Repeated validation can create divergent copies of one invariant and obscure which
  boundary owns it. A fail-fast guard is not itself a silent failure.

**Severity:** MEDIUM only for demonstrated redundant policy or unnecessary control flow.
Do not flag necessary validation at a public API or trust boundary.

**Recommendation pattern:** "Consolidate the repeated check at [existing invariant owner];
the traced callers [name them] preserve that invariant, and [test] verifies the required
failure behavior remains intact." A non-nullable annotation alone does not prove a
runtime value cannot be null.

**Do NOT flag:**
- Defensive code at trust boundaries — public APIs, deserialization of external input, parsing
  user-supplied data. Validation at the boundary is correct.
- Defensive code for resources that genuinely fail (network calls, file I/O, database
  operations) where retry/exception handling is part of normal operation.
- Validation explicitly required by the codebase's contract conventions (e.g., `ArgumentNullException`
  on every public method) — flag only deviations from convention, not adherence.
- Revalidation across a trust, mutation, or concurrency boundary where the earlier check
  no longer guarantees the invariant.

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

**Severity:** MEDIUM for demonstrated unnecessary complexity. HIGH requires a concrete
correctness or resource risk, not missing benchmarks alone. Do not flag an idiomatic
choice such as a `HashSet` for membership tests merely because it lacks a benchmark.

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
- A simple algorithmic improvement justified by known input bounds or a stated capacity
  requirement, even when a production trace is not yet available.

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

**Severity:** MEDIUM for an evidenced scope overrun with material maintenance cost.
HIGH requires a demonstrated compatibility, exposure, or release-contract risk.
Public API additions explicitly required by the task are not overruns.

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

**Severity:** MEDIUM for demonstrated excessive volume or diagnostic noise.
Privacy leakage belongs to `euii-leak-detector`; do not borrow its severity for
an otherwise minor volume finding.

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
- Redundant prose can bury a non-obvious invariant or conflict with a changed contract;
  demonstrate that consequence rather than guessing how the comments were written.

**Severity:** Usually omit harmless restatements. LOW for a specific readability issue;
materially false guarantees use the Misleading Documentation check below.

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
- A value accepted by parsing or stored in options but never reaching the behavior
  it claims to control; trace registration, binding, and the consuming branch.

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
- A custom utility or new dependency reimplementing an existing suitable repository
  helper or standard-library capability; compare semantics and supported versions,
  not just names or line counts.

**Why it's a problem:**
- Two paths that should be one will diverge over time. Bug fixes get applied to one and not
  the other. Behavior drifts.
- Doubles the maintenance surface and the test surface.
- Can bypass an existing suitable integration path; establish the missed reuse
  opportunity from the code rather than attributing it to the author.

**Severity:** MEDIUM for demonstrated unnecessary policy duplication. HIGH requires
a concrete divergence or compatibility risk. Coincidental similarity is not a finding.

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
- A dependency needed for protocol correctness, security, accessibility, licensing,
  or platform support that the existing helper cannot provide.

---

## Implementation-Fit Checks

Apply these alongside the ten scope categories in the same scoped pass. Check
whether the implementation delivers the claimed outcome, not merely whether it
contains plausible scaffolding. Do not turn this lane into a second general
correctness, security, or test audit.

| Pattern | Detection signal | Required evidence | Do NOT flag | Primary defect owner |
| --- | --- | --- | --- | --- |
| Superficial Completion | A new handler, option, UI control, adapter, or service is present but disconnected, no-op, or backed by a fixed sample response. | Trace the promised acceptance outcome from its real entry point through registration and configuration to the observable effect; identify the broken link. | Approved scaffolding, explicit non-goals, test fixtures, or a documented staged rollout that makes no premature completion claim. | `correctness-review` for broken behavior; `agent-contract-review` for agent/tool handoffs; `temp-code-review` for accidental stubs. |
| Fabricated Integration | A call, dependency option, payload field, or comment assumes an API or library behavior that is not supported. | Verify the actual dependency version, local definitions or authoritative documentation, and the caller/consumer; distinguish invented behavior from an unrequested but real API. | Generated APIs, reflection or runtime registration, external SDK contracts verified from their sources, or failures already reported by the compiler/type checker. | `correctness-review` for API misuse; `agent-contract-review` for host/tool mismatches. |
| Success-Shaped Fallback | An error becomes fabricated data, an empty result, or a success status that downstream code treats as completed work. | Trace a reachable failure into the fallback and its consumer; show the lost failure signal and the requirement it violates. | Contracted degraded operation, explicit partial/unknown states, best-effort optional work, or intentionally empty results that consumers handle correctly. | `exception-handling-review` for local failure propagation; `reliability-review` for end-to-end recovery. |
| Hollow Tests | Assertions only restate constants, reproduce production logic, snapshot scaffolding, weaken prior checks, or confirm mocked calls while the claimed outcome is untested. | Name the incorrect implementation that would still pass, relate it to the changed acceptance criterion, and inspect existing behavioral coverage. | Interaction tests where the interaction is the contract, meaningful snapshots, established test seams, or unchanged regression tests protecting existing behavior. | `test-coverage-review` for test validity and lost regression protection. |
| Misleading Documentation | Comments, reports, names, or README text promise validation, atomicity, retries, safety, or integration the implementation does not provide. | Cite the exact claim and contradictory code path, configuration, or observed result; explain which caller or operator could rely on the claim. | Rationale, accurate limitations, clearly marked future work, mandated API documentation, or harmless restated comments. | This lane owns claim-to-implementation drift; coordinate any underlying behavioral defect with `correctness-review`. |
| Workaround Accumulation | New special cases, duplicated guards, casts, validation bypasses, or fallback branches patch symptoms around an unchanged faulty invariant. | Trace the recurring failure to its shared cause and demonstrate a smaller correction that handles the stated cases without breaking compatibility. | Protocol quirks, compatibility shims, validated third-party workarounds, intentional feature gates, or branches representing genuinely different business rules. | This lane owns unnecessary compensating complexity; `correctness-review` owns remaining wrong behavior. |

Assign one primary owner per mechanism. When that specialist is already planned,
pass the trace and candidate location through `coverageNote` for the orchestrator
to route or consolidate; do not emit a duplicate finding. If no owning specialist
is planned, report the evidenced issue in the shared schema with the appropriate
category; do not silently omit it or launch another agent.

Do not remove existing tests merely because they do not fail before this PR;
that counterfactual applies to tests claimed to prove the new fix. Preserve
useful regression coverage and behavior while correcting hollow new tests.
Never claim a runtime check or mutation test was executed when only a static
counterexample was traced.

## How to Use This Catalog

Walk the assigned diff once, mapping relevant scope categories and implementation-fit
checks to concrete changes. Trace only candidates that survive the Evidence Gate;
do not perform sixteen independent scans or invent findings to fill categories.

This catalog does not define an output layout. Findings are emitted in the JSON contract at
`../pr-review/reference/finding-schema.md`: one JSON object per agent, **at most 5
findings**, `id: null` (only the orchestrator assigns IDs), **no `blocker` field** (the lane
is the grader's call), and every record carrying `diffAnchor` (`IN_DIFF` / `ENABLED_BY_DIFF`
/ `PRE_EXISTING`) and `confidence`. The same over-engineering mechanism repeated across
several sites is one record with the extra locations in `instances` — that is clustering,
not omission.

Map this catalog onto that contract:

- **Stated task or claimed contract** and **implementation mismatch** make up `issue`,
  with the anchor quote and the traced code, read, or search in `evidence`.
- **Category** (from above) — name it in `issue` or `underlyingProblem`. The schema's own
  `category` field is `Scope` for scope overrun, `Architecture` for speculative structure,
  or the matching `Correctness`, `Testing`, or `Compatibility` category for an
  implementation-fit defect.
- **Why it matters** (use the "Why it's a problem" notes for the chosen category) goes in
  `whyItMatters`.
- **Recommendation** (use the recommendation pattern, then specialize to the actual code)
  goes in `suggestedPath` as the smallest correction, with the implementation-neutral
  condition in `requiredOutcome` and the closing evidence in `doneWhen`.

If you find yourself unable to pick a category, you may be looking at a different concern.
Double-check it isn't owned by `code-simplifier` (block-level complexity), `class-design-simplifier`
(class-level abstract complexity), `architecture-review` (system-level structure), or
`duplicate-code-detector` (duplicate code). The over-engineering lens is specifically about
**delivered behavior and complexity vs. stated scope and claims**.

## Anchor Confidence — Self-Assessment Before Reporting

Before publishing your findings, sanity-check the anchor:

| Anchor source                    | Confidence  | Posture                                     |
|----------------------------------|-------------|---------------------------------------------|
| Work item with detailed acceptance criteria | HIGH | Confidently flag deviations from the criteria |
| Work item title only             | MEDIUM      | Flag obvious overruns; put borderline cases in `questions` |
| PR title + description           | MEDIUM      | Same as above |
| Commit messages only             | LOW         | Flag only egregious overruns; lean on YAGNI lens |
| No anchor                        | LOW         | Check evidenced unnecessary complexity and explicit implementation claims; do not invent acceptance criteria |

State the anchor and its confidence in `coverageNote`. Finding confidence uses the
separate schema vocabulary `CONFIRMED`, `PROBABLE`, or `UNVERIFIED`, based on the
finding's evidence, not the anchor label. Record checks performed, exclusions,
unresolved gaps, and specialist handoffs; a missing trace is not a clean result.

## Final Reminders

- Be specific. "This abstraction is speculative" is weak. "This `IFooStrategy` interface has
  one implementation, the work item describes a single fixed strategy, and there is no second
  variant on the roadmap — inline the concrete `DefaultFooStrategy` until a second use case
  appears" is useful.
- Be charitable when uncertain. Put borderline cases in the `questions` array; reserve
  findings for cases you can defend with the anchor.
- Acknowledge clean PRs. If the diff matches the task scope, say so in `coverageNote`. Quiet
  reviewers who only surface negatives lose credibility — reviewers who say "this is
  well-scoped" when it is build trust.
