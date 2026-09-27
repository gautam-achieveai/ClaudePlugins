# Filter & Verify — Steps 10a and 10b

Load this file at **Step 10a**, after every dispatched agent has returned its
JSON envelope and before anything is graded.

These stages test candidate claims before publication. False positives waste
author effort; false negatives ship defects. Require evidence for both support
and refutation, and preserve material unresolved claims rather than voting them away.

## Step 10a: Mechanical filter

Free, deterministic, runs before any model sees a finding. Collect every
agent's JSON envelope into one array file, then:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/filter-findings.mjs" \
  --diff <scratch>/pr-<number>/diff.patch \
  --findings <scratch>/pr-<number>/findings.json \
  --out <scratch>/pr-<number>/filtered.json
```

The script anchors each finding to the diff, merges exact candidates across agents,
and applies the per-agent cap. It outputs `toVerify`, `preExisting`, `dropped`,
and `merges`, plus a `stats` block that feeds `reviewMetrics` at step 13.

The script reads only `findings`. Before running it, copy each envelope's
`outsideMapCheck` and `mapGaps[]` into the report's coverage section, keyed by
agent. List any lane that had its own `### Lane:` section but returned either
field missing, nested in `coverageNote`, or `null`. `mapGaps` entries are
evidence about the start map, not findings.

- `toVerify` continues to step 10b.
- Preserve `candidateSources` on every record. Exact duplicates retain all
  source evidence; nearby or similarly worded claims remain separate until a
  reviewer verifies causal equivalence. Never discard lifecycle distinctions,
  guards, or exposure qualifiers to shorten the list.
- `preExisting` never blocks and never goes to the grader. Report it in its own
  summary section so the author sees it without it gating merge.
- A finding whose `anchorMatch` is `NEAR` had its line cited close to, but not
  on, a changed line. Pass that flag to the verifier — it re-checks the anchor
  first.

Unchanged-context findings are the largest single source of false positives in
LLM review, and a deterministic check costs nothing. Never skip this step in
favour of asking a model whether a finding is pre-existing. If the script
fails, say so and anchor by hand against the diff — do not silently proceed
with unanchored findings.

## Step 10b: Verification

Dispatch one `finding-verifier` per finding in `toVerify` using the plan's tier, each with:
the single finding, the context pack paths, and one lens (`REACHABILITY`,
`CORRECTNESS`, or `DEFENSES` — pick the lens that checks its decisive premise),
and every `candidateSources` record.

- Verifiers run in parallel and never see each other's verdicts.
- Preserve every result in `verification.checks[]`; aggregate using the
  [finding schema](finding-schema.md), not a vote or a last-writer-wins verdict.
- For a `CRITICAL` or `HIGH` finding, run a **second verifier on a different
  lens**, even if the first refutes it. Both must establish the causal chain
  for it to remain supported. Use the plan's stronger second-lens tier.
- If checks disagree, retain the candidate and both results as contested,
  with aggregate `UNPROVEN`. Dispatch the planned adjudicator now, before
  dropping or grading, at any review size. Preserve original severity as a
  proposal in the audit record, not a confirmed blocker.
- Apply only evidence-backed rulings to the aggregate. If the crux remains
  unknown, keep `UNPROVEN`, the exact missing evidence, and the author question.
- Drop only a finally refuted `FALSE_POSITIVE` candidate. Keep its sources,
  decisive counterevidence, and disposition in artifacts. `UNPROVEN` continues
  separately, never blocks, and has a reporting ceiling of MEDIUM; describe
  any conditional consequence without presenting it as established impact.

Agreement is not verification. Check the deciding code path, guard, or
version-specific contract independently. The grader calibrates only after
this factual disposition; it can request targeted re-verification when new
counterevidence appears, but cannot silently discard a supported chain.

## Lens selection

| Finding shape | Lens |
|---|---|
| "this crashes / returns the wrong value when X" | `CORRECTNESS` |
| "an attacker or caller can reach this state" | `REACHABILITY` |
| "nothing validates / guards / disposes this" | `DEFENSES` |
| cited on unchanged code, or `anchorMatch: NEAR` | `REACHABILITY`, and check the anchor first |

For the second pass on a `CRITICAL` or `HIGH` finding, pick a different lens
than the first — two passes on the same lens mostly reproduce the same answer.
