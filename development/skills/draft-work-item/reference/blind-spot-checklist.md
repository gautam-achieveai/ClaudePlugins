# Blind-Spot Lenses

Shared lens definitions for blind-spot detection. Loaded by the
`development:blind-spot-detector` agent and referenced by the
`development:draft-work-item` router and its `draft-feature` / `draft-bug`
sub-skills.

A "blind spot" is whatever the author's current focus hides. The point of running
detection in a **fresh-context agent** is that it is not anchored to the framing
that created the blind spot. Each lens below is a checklist of questions to push
against the working artifact (a requirements draft or a bug understanding). For
each finding, report: **what is missing**, **why it matters**, and a **suggested
clarifying question or mitigation**.

---

## Feature lens

Apply when drafting a new feature / user story.

- **Edge cases & states** — empty, first-run, max-scale, concurrent, partial
  failure, offline, cancelled, retried. Which states are unspecified?
- **Cross-cutting impact** — what existing flows, callers, or screens does this
  touch? Anything that silently changes behavior elsewhere?
- **Non-functional needs** — performance/latency, security/authz, privacy (EUII),
  accessibility, internationalization, observability/telemetry. Which are
  unstated but expected?
- **Data & compatibility** — schema/migration impact, backward/forward
  compatibility, rollout/feature-flag needs, data backfill.
- **Boundaries & contracts** — API/wire-contract changes, versioning, what other
  teams or clients depend on this.
- **Failure & recovery** — what happens when a dependency is down? Error
  surfacing, idempotency, rollback.
- **Acceptance gaps** — does each acceptance criterion have a clear pass/fail
  signal? Any criterion that can't be verified?
- **Scope honesty** — is anything in the draft actually not needed for the stated
  value (defer it)? Flag possible over-reach.

## Bug lens

Apply when drafting a bug / defect.

- **Same root cause elsewhere** — what other call sites, modules, or inputs share
  the same faulty code path or pattern? Is the bug a symptom of a broader defect?
- **Adjacent defects** — does the evidence hint at related but distinct bugs that
  would otherwise be missed?
- **Regression-risk areas** — what nearby behavior could a fix plausibly break?
  What should regression coverage protect?
- **Data integrity & migration fallout** — has the bug already corrupted or
  mis-written persisted data? Is a data fix/backfill needed in addition to the
  code fix?
- **Trigger conditions** — environment, configuration, timing/race, scale, or
  user-specific conditions under which it does or does not reproduce.
- **Severity & blast radius** — who is affected, how widely, and is there active
  data loss or a security/privacy angle that raises priority?
- **Workaround** — is there an interim mitigation worth recording for whoever
  picks up the work?

## Task lens

Apply on the lightweight Task / quick path.

- **Dependencies** — is this blocked by, or blocking, other work?
- **Done-definition gaps** — is "done" concrete and verifiable, or vague?
- **Side effects** — does the change ripple into builds, CI, other consumers, or
  configuration that isn't mentioned?
- **Hidden scope** — does the task quietly imply follow-on work that should be
  named now?
