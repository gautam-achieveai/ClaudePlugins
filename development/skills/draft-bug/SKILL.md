---
name: draft-bug
description: >
  Deep, evidence-based workflow for writing a BUG / defect issue. Gathers proof
  in code and logs, enumerates multiple root-cause hypotheses and investigates
  each with a subagent, validates survivors with a scratch regression test
  (run best-effort, never committed), dispatches a blind-spot scan, then composes
  a rigorous bug write-up (Summary / Steps / Expected / Actual / Root Cause /
  Repro Proof / Related Risk). Used by the development:draft-work-item router
  once the intent is classified as a bug; the router resolved the provider and
  handles the final preview and create. Use when turning a defect report into a
  root-caused, reproducible issue rather than a quick stub.
---

# Draft Bug

You produce a **root-caused, reproducible bug write-up** from a defect report.
You do NOT create the work item and you do NOT detect the provider — the
`development:draft-work-item` router resolved the provider and will handle
duplicate-check, preview, and creation. Your output is a composed
`{type, title, body, meta}` handed back to the router.

**Inputs from the router:** `provider` (GitHub or Azure DevOps), `rawRequirement`
(the user's report), and `priorAnswers` (anything already volunteered).

> **Repository safety:** this flow never mutates the user's repo. Regression
> tests are written to a **scratch location** and run there. Nothing is
> committed, no branches are created, and the working tree is left clean.

## Phase 1 — Gather Evidence

Collect grounding and proof:

- Find the relevant code paths — dispatch `Explore` subagents as needed.
- Pull any proof: logs, stack traces, failing output, the reported repro steps.
- Note what is established fact vs. what is still assumed.

## Phase 2 — Clarify

Ask the user clarifying questions **only if** the defect isn't already clear from
the evidence (expected vs. actual, how to reproduce, impact). Skip anything in
`priorAnswers`. Don't over-interrogate.

## Phase 3 — Hypothesize Root Causes

Enumerate **multiple** candidate root causes — do not commit to the first guess.
Spawn **one subagent per hypothesis** to investigate in parallel. Each subagent
may build/run the application and inspect logs (best-effort) to confirm or refute
its branch, and reports back a conclusion with evidence.

## Phase 4 — Validate by Regression Test

For each surviving hypothesis:

1. Write a candidate regression test to a **scratch location** (the session
   scratch dir — never inside the repo's tracked tree).
2. Run it best-effort. The test should **fail in a way that demonstrates the
   bug** (red proves the repro).
3. Keep only hypotheses whose test **actually reproduces the bug**. Capture the
   test source and its run output as repro proof for the issue body.
4. If the project can't be built or run, record that explicitly and fall back to
   static reasoning for that hypothesis.

Leave nothing behind: no committed files, no branches, clean working tree.

## Phase 5 — Blind-Spot Scan (agent) + Write Understanding

Dispatch the **`development:blind-spot-detector`** agent with the **bug lens**:
other call sites sharing the same root cause, adjacent/related defects,
regression-risk areas, and data-integrity/migration fallout. You may run multiple
detectors in parallel.

Then compose the body, applying the active provider's mention conventions (the
router supplies these; if working standalone, GitHub →
`../draft-work-item/reference/gh-mention-conventions.md`, ADO →
`../draft-work-item/reference/ado-mention-conventions.md`):

```markdown
## Summary
<one-line summary>

## Steps to Reproduce
1. ...
2. ...

## Expected Behavior
<what should happen>

## Actual Behavior
<what actually happens>

## Root Cause
<the validated root cause>

## Repro Proof
<the scratch regression test + its run output>

## Related Risk
<blind-spot findings: same-root-cause call sites, regression risk, data fallout>
```

Generate a concise title (< 80 chars).

## Phase 6 — Hand Back to Router

Return `{type: bug, title, body, meta}` to `development:draft-work-item`. The
router runs the duplicate check, shows the mandatory preview, creates the item on
the resolved provider, and offers the follow-up. **You never create the item
yourself.**

## Guidelines

- Never commit to a single root cause without validation — multiple hypotheses,
  one subagent each.
- Only test-validated hypotheses advance; describe-only guesses do not.
- Repo stays clean — scratch only, nothing committed.
- The item is created only after the router's explicit-confirmation preview.
