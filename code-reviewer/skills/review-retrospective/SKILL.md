---
name: review-retrospective
description: Use when human comments, answers, or corrections arrive after a code review, or when asked to assess that review's quality and learn from it.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Skill, Task
---

# Review Retrospective

**Primary objective:** Learn from review outcomes and human feedback without rewriting the original verdict.
**Decision rule:** For relevant cases these steps do not cover, choose the next in-scope action that advances this objective; preserve explicit scope, safety, and output requirements.

Explain what the reviewer missed, why the human could answer, and what should
improve next time. Assess the review, not the developer. A posted review alone
does not trigger a retrospective; use new human feedback or an explicit request.

## 1. Recover the evidence

Read [the evidence and output contract](reference/evidence-contract.md). Reuse
the supplied review artifacts before fetching anything. If provider data is
needed, use the existing [provider mapping](../../references/provider-resolution.md)
for read-only retrieval of relevant comments and their surrounding threads.

Recover the review's recorded numbers before judging its cost or precision.
`reviewMetrics` and `findingOutcomes` are stored per review round by
`code-reviewer:update-pr-tracking` in `<storage>/reviews/pr-<number>.json`.
Read them; do not reconstruct counts from the posted summary. A `null` field is
missing telemetry, not zero — carry it into the evidence packet as UNKNOWN. If
the tracking file is absent or the round has no metrics, say so and continue;
the retrospective does not depend on them.

Identify the reviewed commit/round, Review Intent, actual maturity/exposure,
feedback cutoff, and prior processed comment revisions. Keep review-time
evidence separate from later facts and code changes. Mark unavailable history,
access, feedback, and telemetry explicitly. Process only changed evidence on
repeat runs. Unchanged inputs skip completed work, not pending stages. Resume
pending judgment, lesson challenge, or outputs when their prerequisite becomes
available or on explicit retry; reuse completed analysis and existing entries.
Do not retry an unchanged unavailable prerequisite merely to poll it.

## 2. Explain each material gap

For each answer, correction, disagreement, or human-discovered issue:

- Verify what changed in our understanding against the reviewed code and sources.
  Human agreement, rejection, and resolved threads do not establish correctness.
- Identify why the human could answer: unavailable knowledge/access, a
  discoverable source, stronger reasoning, or authority to decide. Do not guess
  their mental process; label unknown causes.
- Reconstruct the smallest reasonable investigation the reviewer could have
  performed then, its cost, and whether it would change the review decision.
- Classify knowledge, process, both, access limitation, human decision, or no
  supported lesson. If the source was already read, examine reasoning rather
  than prescribing another search. Check overlooked defects, constraints,
  dependencies, tests, unnecessary questions, and unjustified demands.

Inspect only evidence needed to resolve these gaps. Stop when the classification
and remedy are supported or the missing evidence is identified. Do not initiate
a fresh full review or manufacture lessons from silence.

## 3. Obtain independent judgment

Dispatch `code-reviewer:review-performance-judge` with the raw evidence packet
and the path to [the performance rubric](reference/performance-rubric.md).
Include the recovered `reviewMetrics` and `findingOutcomes` verbatim, with their
provenance and their gaps, so resource efficiency and finding precision are
judged on recorded numbers rather than impressions. Pass them as evidence, not
as a score: the numbers do not decide a dimension by themselves.
Do not pass self-scores or proposed lessons yet. After receiving its scorecard,
send the candidate lessons to the same judge to challenge their evidence,
scope, and added cost. Revise scores only if new evidence warrants it, explicitly.

If delegation is unavailable, save a provisional retrospective with judgment
pending; any local assessment must be labeled non-independent. Do not simulate
another agent or block useful evidence capture. The judge does not alter the PR
verdict, publish comments, or reopen resolved findings.

## 4. Retain the learning

Invoke `code-reviewer:apply-review-learning` with the source-linked gap records,
judge result/status, and the user's output request. It owns the two knowledge
and process outputs. Passing a retrospective is not permission to edit global
skills or publish anything.

Save the report, scorecard, evidence availability, processed revisions, and up
to three concrete improvement experiments using the contract's local paths.
Return artifact links and material uncertainties. Never claim complete defect
coverage, fabricated token savings, or demonstrated improvement from a proposal.
