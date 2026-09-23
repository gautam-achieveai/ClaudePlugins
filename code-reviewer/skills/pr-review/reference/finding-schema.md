# Finding Schema — One Contract From Agent to Posting

Load this file **before dispatching any review agent (Steps 4-8)**, at **Step 10a**
(mechanical filter), **Step 10b** (verification), and **Step 11** (grading).

Every dispatched agent emits findings in **this exact JSON shape**. The
orchestrator never re-types a finding into another format: it merges, filters,
verifies, and grades the same records end to end, and hands them to
`post-pr-review` unchanged except for fields the grader is allowed to set.

## Agent Output Envelope

Each agent returns **one JSON object** and nothing else before or after it:

```json
{
  "agent": "performance-review",
  "findings": [],
  "questions": [],
  "omittedSimilarCount": 0,
  "coverageNote": "what this agent examined and what it could not reach"
}
```

## Finding Record

```json
{
  "id": null,
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "remediation": "TRIVIAL | SMALL | SUBSTANTIAL | REDESIGN",
  "category": "Correctness | Security | Performance | Conventions | Architecture | Testing | Compatibility | Scope | Temp-Code | Privacy",
  "file": "path/relative/to/repo/root.cs",
  "line": 42,
  "instances": ["other/file.cs:17"],
  "diffAnchor": "IN_DIFF | ENABLED_BY_DIFF | PRE_EXISTING",
  "enablingChange": "file.cs:88 — the changed line that makes this reachable, required when diffAnchor is ENABLED_BY_DIFF",
  "issue": "what is wrong, one or two sentences",
  "underlyingProblem": "the mechanism behind the symptom, one sentence",
  "whyItMatters": "the concrete consequence for this PR",
  "requiredOutcome": "implementation-neutral condition that must become true",
  "suggestedPath": "the smallest correction that resolves it, labeled as a floor",
  "doneWhen": "objective evidence that closes this finding",
  "evidence": "the search or read that supports the claim, including scope",
  "confidence": "CONFIRMED | PROBABLE | UNVERIFIED"
}
```

**Field rules:**

- `id` is always `null` from an agent. Only the orchestrator assigns `F-NNN`,
  at the end of Step 10b, before synthesis and grading. IDs are stable across
  re-reviews.
- `line` is a 1-based line in the **post-change** file, or `null` when the
  finding is file-level. The mechanical filter reads only the diff, so it cannot
  detect a `line` past the end of the file — the verifier must confirm the cited
  line exists before judging the claim.
- `blocker` is **absent** from agent output. The lane is the grader's decision
  (Step 11), never an agent's.
- `confidence` is the agent's own read of its evidence. It is an input to
  verification, never a substitute for it: self-scored confidence has been
  measured as close to random, so nothing is filtered on this field alone.
- `evidence` for any absence claim ("undefined", "unused", "no handler") must
  quote the search performed (pattern + scope) and the nearest place that would
  define the thing.

## Diff Anchoring

Every finding declares where it lives relative to the change:

| `diffAnchor` | Meaning | Survives filtering |
|---|---|---|
| `IN_DIFF` | The cited code is on a line this PR added or modified | Yes |
| `ENABLED_BY_DIFF` | The cited code is unchanged, but a changed line makes it reachable, wrong, or newly dangerous | Only with a concrete `enablingChange` |
| `PRE_EXISTING` | The PR touches this area but did not make it worse | Never blocks; reported separately |

Unchanged-context findings are the single largest source of false positives in
LLM review. `PRE_EXISTING` findings are not discarded — they are reported in
their own section so the author can see them without them gating the merge.

## Finding Cap

**Each agent returns at most 5 findings.** Keep the highest-impact ones. When
more instances of the *same mechanism* exist, merge them into one record and
list the rest in `instances` — that is clustering, not omission. When genuinely
distinct lower-value findings are dropped, set `omittedSimilarCount` to how many
and say so in `coverageNote`.

A cap is not a quality loss. An agent that reports 30 findings buries its three
real ones, and every additional finding costs a verification pass downstream.

## Questions

```json
{
  "file": "path.cs",
  "line": 42,
  "codeContext": "the specific snippet",
  "uncertainty": "what cannot be determined and why",
  "whatAnsweringUnlocks": "what could be assessed with an answer",
  "suggestedAnswers": []
}
```

Questions are never findings, never blocking, and never go to the grader.

## Verification Fields (added at Step 10b)

The verifier appends to each record it judges. It never edits the fields above:

```json
{
  "verification": {
    "verdict": "TRUE_POSITIVE | FALSE_POSITIVE | UNPROVEN",
    "lens": "REACHABILITY | CORRECTNESS | DEFENSES",
    "citedEvidence": ["file.cs:120 — the guard that is missing", "file.cs:88 — the caller"],
    "reasoning": "one paragraph, including what stopped a full trace if anything did"
  }
}
```

## Grader Fields (set at Step 11)

The grader may set `blocker` and adjust `severity` / `remediation`. It
must preserve `id`, `file`, `line`, `instances`, `diffAnchor`, `issue`, and
`evidence` exactly as verified. Never reconstruct a location from grader prose.
