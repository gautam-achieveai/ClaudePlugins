# Filter & Verify — Steps 10a and 10b

Load this file at **Step 10a**, after every dispatched agent has returned its
JSON envelope and before anything is graded.

These two stages exist because of one asymmetry: **generating a plausible
finding is cheap, and checking one is cheaper still.** A review that ships a
confident, wrong finding costs more credibility than one that misses something,
so everything between "an agent said it" and "we posted it" is filtering.

## Step 10a: Mechanical filter

Free, deterministic, runs before any model sees a finding. Collect every
agent's JSON envelope into one array file, then:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/filter-findings.mjs" \
  --diff <scratch>/pr-<number>/diff.patch \
  --findings <scratch>/pr-<number>/findings.json \
  --out <scratch>/pr-<number>/filtered.json
```

The script anchors each finding to the diff, merges duplicates across agents,
and applies the per-agent cap. It outputs `toVerify`, `preExisting`, `dropped`,
and `merges`, plus a `stats` block that feeds `reviewMetrics` at step 13.

- `toVerify` continues to step 10b.
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

Dispatch one `finding-verifier` (haiku) per finding in `toVerify`, each with:
the single finding, the context pack paths, and one lens (`REACHABILITY`,
`CORRECTNESS`, or `DEFENSES` — pick the lens most likely to kill this
particular finding).

- Verifiers run in parallel and never see each other's verdicts.
- Attach each verdict to its finding as the `verification` object.
- `FALSE_POSITIVE` findings are dropped before grading. Keep them in the review
  artifacts with their reason so the retrospective can measure the filter.
- `UNPROVEN` findings continue, but can never block and never exceed MEDIUM
  severity.
- For a `CRITICAL` or `HIGH` finding, run a **second verifier on a different
  lens**. Both must avoid `FALSE_POSITIVE` for it to stay at that severity.

**The vote is counted here, in the workflow.** Never ask one model to
adjudicate its own confidence: self-scored confidence has been measured as
close to random, so it selects a lens and nothing more.

## Lens selection

| Finding shape | Lens |
|---|---|
| "this crashes / returns the wrong value when X" | `CORRECTNESS` |
| "an attacker or caller can reach this state" | `REACHABILITY` |
| "nothing validates / guards / disposes this" | `DEFENSES` |
| cited on unchanged code, or `anchorMatch: NEAR` | `REACHABILITY`, and check the anchor first |

For the second pass on a `CRITICAL` or `HIGH` finding, pick a different lens
than the first — two passes on the same lens mostly reproduce the same answer.
