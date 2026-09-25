# Grading Rubric — Dimension Detail and Risk Calibration

Loaded by the `review-grader` agent **on demand**. Read this file before you
change any finding's severity or blocker status, before you drop a finding, and
whenever a finding is contested. It holds the full scoring detail for the 11
dimensions and the software-development risk principles behind them. The agent
prompt holds the compact table; this file holds the reasoning that makes a score
defensible.

No principle here bypasses the relevance test, the verification verdict rules, or
the blocker test in the agent prompt.

---

## Severity Model — Two Axes, Two Lanes

Grade **impact** (CRITICAL / HIGH / MEDIUM / LOW) independently from the
smallest real **remediation** (TRIVIAL / SMALL / SUBSTANTIAL / REDESIGN).
The resulting lane is the blocker flag: merge-blocking is `blocker: true`,
follow-up is `blocker: false`.

**Blocks merge:** demonstrated CRITICAL or HIGH impact regardless of fix size;
violations of documented or enforced convention contracts (including release
metadata and public API); persisted schema, migration, or wire compatibility
risks; and MEDIUM defects with a TRIVIAL or SMALL correction. A claimed blocker
must explain why shipping now is unsafe or incomplete, not merely invoke a
category.

**Follow-up:** MEDIUM issues requiring SUBSTANTIAL or REDESIGN work, LOW issues,
pre-existing problems not worsened by the PR, and preferences without a
demonstrated merge risk. These never gate the verdict. A finding not placed
explicitly in the blocking lane is follow-up by default.

Every review ends with two lists: the shortest path to approval (required
outcome and done-when for each blocker) and follow-up issues. A one-cell HIGH
and a redesign HIGH require different author responses; include both axes.

## Grader Handoff (Step 11)

Dispatch `code-reviewer:review-grader` only when the review plan's `when`
condition is true. Start its input with the unchanged Review Intent and pass
verified finding records with their `verification` objects. Send folded Step
10c clusters as findings, never raw synthesizer output. Keep stable IDs;
cluster any remaining shared mechanisms instead of posting repeated findings.

The grader returns the same records with `id`, `severity`, `remediation`,
`blocker`, `category`, `file`, `line`, `instances`, `issue`,
`underlyingProblem`, `whyItMatters`, `requiredOutcome`, `suggestedPath`, and
`doneWhen`. It may change severity, remediation, and blocker status but must
preserve `id`, `file`, `line`, `instances`, `diffAnchor`, `issue`, and `evidence`
byte-exact. Merge by stable `id`; never reconstruct locations from grader prose.
Use both graded severity and blocker status for the verdict. For a clean TINY
review without a grader, apply the same written severity and verdict rules.

---

## The 11 Scoring Dimensions — Detail

For each surviving finding, evaluate these 11 dimensions. Score each 0-3:

- **0** = No concern on this dimension
- **1** = Minor concern
- **2** = Significant concern
- **3** = Critical concern

Not every dimension applies to every finding. Most findings will score 0 on most dimensions.
Score only demonstrated impact in the changed scope. A hypothetical future, personal preference,
or generic best-practice statement is not evidence for a 2 or 3.

---

### Group 1: Impact & Risk

**1. Correctness Risk** — Could this finding, if left unfixed, cause wrong behavior?

Think beyond "does it crash." Wrong return values, silent data corruption, race conditions,
off-by-one in business logic — these are correctness risks even if no exception is thrown.

- 0: Pure style/convention, no behavioral impact
- 1: Unlikely but possible edge case
- 2: Likely to cause wrong behavior under specific conditions
- 3: Will cause wrong behavior in normal usage

**2. Operational Risk** — Could this cause production incidents, monitoring gaps, or
deployment issues?

Missing health checks, swallowed errors that hide failures, configuration that works in dev
but breaks in prod, missing metrics on a critical path.

- 0: No operational concern
- 1: Minor gap in observability
- 2: Could cause hard-to-diagnose production issues
- 3: Will cause outages or silent failures in production

**3. Blast Radius** — How many consumers, dependents, or downstream systems are affected?

A bug in a shared utility affects every caller. A wrong version number confuses every
consumer. A bad pattern in a base class propagates to every subclass.

- 0: Isolated to the changed code, no external consumers
- 1: A few direct callers within the same module
- 2: Multiple modules or external consumers
- 3: Public API, shared infrastructure, or published package

---

### Group 2: Code Health

**4. Code Health Impact** — Does leaving this unfixed degrade maintainability, readability,
or the ability to reason about the code?

This is about the compounding cost. One unclear method is fine. But if the pattern is
established, every future developer copies it, and the codebase slowly becomes harder to
work in.

- 0: No impact on maintainability
- 1: Minor readability concern
- 2: Makes the surrounding code notably harder to understand or modify
- 3: Creates a maintenance burden that will grow over time

**5. Testing Implications** — Does this affect testability or test reliability?

Untestable code is unverifiable code. If a finding makes the code harder to test, or if
fixing it would make tests more reliable, that's a signal the severity should be higher.

- 0: No testing impact
- 1: Makes testing slightly harder but doable
- 2: Significantly reduces testability or introduces test fragility
- 3: Makes the code effectively untestable or breaks existing test reliability

**6. Team Knowledge / Onboarding** — Will this confuse new developers or create tribal
knowledge requirements?

Code that only makes sense if you "know the history" or "talked to the right person" is
a knowledge trap. New team members will misunderstand it, use it wrong, or copy it
incorrectly.

- 0: Self-explanatory, any developer can understand it
- 1: Slightly non-obvious but discoverable
- 2: Requires context that isn't in the code or docs
- 3: Active trap — looks correct but behaves unexpectedly without insider knowledge

---

### Group 3: Standards & Completeness

**7. Consistency** — Does this match established codebase and industry conventions?

Distinguish enforceable contracts from preferences. A documented repository rule, compiler or
lint rule, public protocol, or package standard carries more weight than a pattern inferred from a
few neighboring files. Explain the concrete consequence of inconsistency; do not use convention
alone as a proxy for impact.

- 0: Follows all relevant conventions
- 1: Minor deviation from a loose, informal convention
- 2: Violates a documented or clearly established codebase contract with concrete maintenance cost
- 3: Violates an external-facing standard or enforced policy and would mislead or break consumers

**8. Completeness** — Is the change "finished" without addressing this finding?

Judge completeness against the stated problem, acceptance criteria, and release contract for this
change. Do not expand the PR into unrelated documentation, cleanup, or speculative supporting work.
Missing migrations, required configuration, tests needed to verify changed behavior, or incorrect
shipping metadata are genuine completeness gaps when this PR depends on them.

- 0: Change is complete — all code AND artifacts are correct
- 1: Nice-to-have polish that doesn't affect shipping
- 2: Missing or incorrect artifact required to safely deliver or verify this change
- 3: Change is demonstrably incomplete — a release from this branch would carry
  incorrect metadata or miss required components

---

### Group 4: Strategic / Compounding

**9. Precedent Risk** — Will this pattern be copied? Does it normalize bad practice?

Consider precedent only when the changed code is a discoverable template or shared abstraction and
the copied behavior has a concrete downside. Speculation that someone might copy an isolated choice
cannot independently make a finding blocking.

- 0: One-off situation, unlikely to be copied
- 1: Could be copied but alternatives are also visible
- 2: Likely to become the "template" for future similar work
- 3: A shared or canonical example that would predictably propagate a harmful pattern

**10. Future Fix Cost** — How expensive is this to fix later compared to now?

Some things are trivially fixable anytime (rename a variable). Others become exponentially
harder once shipped (published API, database schema, version number). The ratio matters:
if fixing later costs 10x more than fixing now, that's a signal to escalate.

- 0: Equally easy to fix now or later
- 1: Slightly harder to fix later (more files to touch)
- 2: Significantly harder (API compatibility, data migration, consumer coordination)
- 3: Effectively irreversible once shipped (published version, external contract)

---

**11. Prescription Safety** — Could the suggested fix, if adopted verbatim,
introduce a new factual error or misleading guidance?

This catches findings where the problem statement is valid but the suggested fix
over-generalizes the evidence: "all controllers must...", "only used in X", or
"always do Y" without verifying the claim across every cited instance.

- 0: Suggestion is narrowly scoped or already verified for each affected instance
- 1: Slightly broad wording, but clearly limited to the changed code or named scope
- 2: Prescriptive or absolute wording across multiple instances without proof it holds everywhere
- 3: Suggestion would likely create false docs, policy, or reviewer guidance if copied verbatim

---

## Calibration: Software Development Risk Principles

The 11 dimensions give you a structured way to evaluate each finding. But dimensions alone
don't tell you what to look out for. The principles below describe the fundamental risk
categories in software development — the "big pitfalls" that cause the most damage when
misgraded. When a finding touches one of these principles, investigate its concrete likelihood,
impact, blast radius, and relationship to the Review Intent. No principle bypasses the relevance
or blocker tests above.

---

### Principle 1: Irreversibility — "Can we undo this after shipping?"

The single most important question for grading severity. Some changes are trivially
reversible (rename a variable, fix a typo). Others become exponentially harder to undo
once they leave the developer's machine:

- **Published versions** — A version number can't be retracted once consumers depend on it.
  Semver major bumps signal "breaking changes." If the change is additive, a major bump
  actively misleads every consumer and wastes the next major version slot.
- **Database schemas** — A migration that alters existing data (adds columns, changes types,
  drops constraints) is near-irreversible once deployed. Rolling back requires another
  migration, a data backfill, coordinated deployment, and possibly downtime.
- **Public APIs and contracts** — Once external consumers integrate against an API shape,
  changing it requires versioning, deprecation, and migration support.
- **Data transformations** — Lossy operations (truncation, format conversion, field removal)
  permanently destroy information.

**Rule of thumb**: If fixing later costs 10x more than fixing now, that supports at least Medium
severity and blocker consideration. Effective irreversibility supports High severity when the
harmful outcome is realistic for this PR.

---

### Principle 2: Undefined Behavior — "What happens to existing state?"

Every system has existing state — database rows, cached data, configuration, user sessions.
When code changes interact with existing state in ways that aren't explicitly handled, the
result is undefined behavior: it works until it doesn't, and when it fails, it fails in
unpredictable ways.

The most common sources:

- **Schema changes without transition paths** — Adding a column with no default value
  creates NULL for every existing row. If the service layer doesn't defensively handle
  NULL, every existing user hits an unhandled code path. This is a "future minefield" —
  it may work in testing (empty database) but fail in production (millions of rows).
- **State machine gaps** — New states or transitions added without handling all existing
  states. What happens to entities already in an old state?
- **Configuration changes** — New required config without defaults. Works in dev (config
  is present), fails in prod (not yet deployed).
- **Concurrency assumptions** — Code that works for a single caller but has undefined
  behavior under concurrent access.

**Rule of thumb**: If changed code leaves reachable existing state without a safe interpretation,
grade the demonstrated failure path, affected population, and rollout conditions. Likely material
failures are High and blocking; a merely possible path without supporting evidence should be
narrowed or clarified rather than asserted as guaranteed.

---

### Principle 3: Convention as Contract — "What does this signal to others?"

Conventions make a codebase predictable, but their authority and consequences vary. Separate:

- **Enforced or documented contracts** — repository policy, compiler/linter rules, wire formats,
  semver, release metadata, and public API conventions. Violations may be merge risks when they
  break automation, compatibility, or consumer expectations.
- **Strong local patterns** — repeated project practices that improve maintainability. Flag a
  deviation when evidence shows meaningful confusion or maintenance cost.
- **Reviewer preference** — an alternative that is merely more familiar or aesthetically
  preferred. This is not a finding when the author's approach is valid.

**Rule of thumb**: Explain the concrete effect and grade that effect. A convention violation can
block when it breaks an applicable contract; convention alone does not override a goal-complete,
sound PR or force another review iteration.

---

### Principle 4: Silent Failures — "Will we know when this breaks?"

Code that fails visibly (crashes, error responses, build failures) is annoying but
manageable — you see the problem and fix it. Code that fails silently is far more
dangerous because the damage accumulates undetected:

- **Swallowed exceptions** — `catch (Exception) { return default; }` hides every possible
  failure behind a "success" response. Monitoring sees green, users see wrong data.
- **Incorrect success signals** — HTTP 200 on error, "operation completed" when it didn't,
  green status checks that didn't actually check.
- **Missing observability** — No logging, no metrics, no health checks on a critical path.
  The first sign of trouble is a user complaint, not an alert.
- **Graceful degradation without notification** — Fallback logic that silently serves stale
  data, skips failed operations, or drops events without logging.

**Rule of thumb**: A reachable silent failure that can return false success, lose data, or suppress
a material production fault is normally High and blocking. Missing optional telemetry or a
well-signaled fallback is not the same failure mode; grade its actual operational consequence.

---

### Principle 5: Compound Effects — "What happens when this is copied 10 times?"

Software codebases grow by accretion, and developers often learn from existing examples. That
matters most when changed code becomes a shared abstraction, generated template, or clearly
canonical example. Do not turn an isolated stylistic choice into a blocker based only on a
hypothetical future copy.

- **First-instance anti-patterns** — A shared god class, layer violation, or generated template can
  propagate concrete coupling or correctness costs. Verify that this code is actually likely to be
  reused before scoring precedent risk.
- **Missing tests on new code** — The author has the freshest context right now. Every day
  that passes, writing accurate tests gets harder. Treat missing tests as blocking when they are
  needed to verify risky changed behavior or an acceptance condition, not as a universal rule.
- **Combined findings** — Several findings can interact to produce a concrete failure or incomplete
  delivery. Name that combined effect; a count of unrelated Low findings is not evidence by itself.

**Rule of thumb**: Ask whether this change is genuinely a template and what measurable harm copying
it would cause. Precedent can strengthen a finding, but it cannot replace present evidence or make
optional feedback blocking by itself.

---

### Principle 6: Blast Radius — "Who else is affected?"

The severity of any issue scales with the number of consumers who will encounter it:

- **Internal utility method** — 1-2 callers. LOW blast radius.
- **Shared service** — Multiple modules depend on it. MEDIUM blast radius.
- **Published package/API** — Every external consumer is affected. HIGH blast radius.
- **Database schema** — Every row, every query, every service that reads the table. HIGH.
- **Base class or interface** — Every implementation inherits the problem. HIGH.

**Rule of thumb**: If you're unsure about severity, check the blast radius. A minor issue
in a shared utility is more important than a major issue in dead code.

---

### What domain agents almost always get right

- Security vulnerabilities (OWASP, injection, auth bypass)
- Null reference / crash bugs (obvious runtime impact)
- Duplicate code (detectors are well-calibrated)
- Performance issues on hot paths (measurable impact)

### Common calibration blind spots

- **Metadata and packaging** (version numbers, changelog, config) — agents focus on code
- **Undefined state for existing data** (migration without defaults, new states without
  transition handling)
- **Convention violations that "work fine"** — technically correct but misleading
- **First instances of new patterns** — no track record of harm, so agents see no risk
- **Completeness gaps** (feature works but isn't properly shipped — missing tests, docs,
  migration, config)
- **Silent failure modes** (catch-all handlers, missing logging, graceful degradation
  without notification)
- **Reviewer preference presented as design correctness** — a valid alternative is not a defect
- **Pre-existing or unrelated debt** — do not make this PR own code it did not worsen
- **Severity treated as blocker status** — explicitly decide whether the PR can safely merge
- **Open-ended prescriptions** — a blocker without stable closure evidence causes repeated rounds

### The "it works" trap

"It works" is not enough when the change has demonstrated correctness, visibility, compatibility,
or reversibility risks. But "not perfect" is not a defect either. Your job is to determine whether
the PR solves its stated problem with a substantially sound implementation, then surface only the
material risks and useful optional guidance that evidence supports.

---

## Normalizing author guidance

For every Critical, High, and Medium finding, normalize the author guidance:

- **Underlying problem**: the mechanism behind the symptom, one sentence —
  required for every finding, in the summary AND in the inline comment
- **Why it matters**: consequence in this PR's real execution or delivery context
- **Required outcome**: implementation-neutral condition to satisfy
- **Suggested path**: smallest safe route or 1-2 viable options; never the only
  accepted design. State the defect, don't prescribe the remedy: the smallest
  correction is a floor, not a spec. A suggestion that adds API surface — new
  types, actions, endpoints, tables, config — must state why no smaller
  correction exists.
- **Done when**: objective test, behavior, validation result, or observable state

---

## Why calibration matters

Code review must protect both code health and delivery flow. Both calibration errors carry cost:

- **Under-weighting** can merge a correctness, security, data, compatibility, or operational
  risk that becomes expensive to repair.
- **Over-weighting** can create unnecessary implementation work, repeated asynchronous rounds,
  and distrust in valid review feedback.
