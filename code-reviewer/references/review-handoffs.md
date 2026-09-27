# Review Routing and Durable Handoffs

Use this contract for review orchestration and every delegated stage. Skills
define workflows; invoking a skill does not create an isolated agent context.

## Skill owners

| Skill | Associated agent | Boundary |
|---|---|---|
| `pr-review` | `code-reviewer` | Review controller, never its own scanning lane |
| `pr-context` | `pr-context-gatherer` | Context, intent, resource discovery, question resolution |
| `nscript-review` | `nscript-review` | NScript methodology |
| `orleans-review` | `orleans-review` | Orleans methodology |
| `over-engineering-review` | `over-engineering-review` | Evidenced scope/complexity questions |
| `schema-compatibility-review` | `schema-compatibility-review` | Contract compatibility |
| `post-pr-review` | `post-pr-review` | Final assembly and authorized publication |
| `update-pr-tracking` | `update-pr-tracking` | Local tracking persistence |
| `review-pending-prs` | `review-pending-prs` | Batch coordination |
| `review-retrospective` | `review-retrospective` | Feedback analysis, not PR verdict |
| `apply-review-learning` | `apply-review-learning` | Validated lessons at the authorized destination |

All names use the `code-reviewer:` prefix. Definitions are
`${CLAUDE_PLUGIN_ROOT}/agents/<agent>.md`. `codebase-search-discipline` is an
inline methodology, not a separately dispatchable task. Direct skill entrypoints
remain valid; wrappers execute their skill rather than dispatching themselves.

Check host delegation capability before choosing a controller context. If nested
delegation is unavailable, keep the batch/review/retrospective controller in the
top-level session and dispatch leaf workers there. Do not launch a controller
that cannot launch its required workers, simulate independent review, or create
recursive reviewer teams. A missing required worker is an incomplete review.

## Thin, accountable controller

Own scope, snapshot, routing, budgets, completion, schema validation, and receipts.
Use the classifier and filter for deterministic work. Read stage receipts and
only the records necessary to decide the next route, not every agent's full
research. Do not independently scan the code, regrade findings, decide causal
equivalence, or paraphrase away uncertainty.

Substantive owners:
- Context gatherer establishes sourced intent and file groups, checks repository
  conventions and linked requirements, retrieves relevant lessons, and resolves
  context questions on a bounded follow-up. For offline/daemon context, preserve
  its existing mode; never launch live enrichment just to fill missing fields.
- Scanners trace defects and answer assigned questions. Correctness owns
  re-review closure checks under `re-review-workflow.md`; historical state and
  closure criteria remain invariant. Missing facts go back to their owner.
- Verifiers settle premises; the adjudicator resolves conflicts. The controller
  applies their explicit results without substituting its own judgment.
- Synthesizer supplies folded records and member mappings; grader calibrates
  them and returns a verdict plus all retained and unresolved records.
- Publication agent consumes those records, applies adjudication effects,
  assembles questions/thread state/summary, and publishes under the posting
  skill's gates. For local reviews, return the report without provider writes.
  Suspected new defects or contradictory rulings go back to the appropriate
  owner before publication, not into silent assembly edits.

Skip conditional synthesis, adjudication, and remediation when not needed. A
clean result is complete; it is not a reason to launch another scanner.

## Artifact transport

Use a run directory in the caller's authorized scratch storage, never source
files. Assign unique stage/attempt paths before dispatch. Read-only workers
return their native result; the host/controller captures the exact settled
response to a raw file using tool-output export when available, otherwise a
literal byte-preserving save. Do not reconstruct records from prose or scrape
JSON out of Markdown. If exact capture is unavailable, report a handoff failure.
Do not grant reviewers broad Write permissions to enable this transport.

Use `${CLAUDE_PLUGIN_ROOT}/skills/pr-review/scripts/review-artifacts.mjs`:

```text
node review-artifacts.mjs snapshot --context <context.json>
node review-artifacts.mjs capture --assignment <assignment.json> --input <raw-result> --out <artifact.json>
node review-artifacts.mjs read --assignment <assignment.json> --input <artifact.json>
```

Use absolute paths in dispatches. Freeze the exact diff, including untracked
content for local work, and repository/head/base identity before computing the
snapshot. If checkout content changes, stop or create a new snapshot; never
reuse results merely because HEAD is unchanged.

Each assignment contains `schemaVersion: 1`, `runId`, `snapshotId`, `stageId`,
`attemptId`, `agent`, `format` (`json` or `markdown`), `resultKind`, and absolute
`outputPath`. Record `inputArtifactPaths` in the controller's run manifest.
For `resultKind: accounted`, also supply `expectedCandidateIds`.

Capture only after a successful settled worker response. Capture/read failures
are explicit failures, never clean results. The helper validates the envelope,
snapshot identity, payload hash and selected structural contract; it does not
prove semantic correctness or that an agent really executed. Retain the tool
execution receipt separately. Never accept an arbitrary existing file as a
completed worker. Read validates against the controller-owned assignment.

Use `scanner` for scanner JSON, `verification` for verifier JSON, `accounted`
for derived finding stages, and `generic` for other native payloads. Markdown
is permitted only when the stage's native contract requires it (context,
legacy reports); it is not a replacement for scanner or verifier JSON.
Do not wrap or change the daemon's schema-v1 response on its wire: the artifact
envelope is local storage, and the consumer receives its original `result`.

After capture, return/pass the artifact path and validated receipt identity.
Downstream workers read the relevant upstream artifacts and original sources;
they do not rely on a short receipt as evidence. Never load every artifact
into every worker or overwrite an earlier attempt.

## Candidate accounting

Assign each raw candidate a stable run-local `candidateId` before filtering,
distinct from the public `F-NNN` ID assigned after verification. Keep a mapping
to the original artifact and array position; raw payloads remain immutable.
Derived records retain source IDs and `candidateSources`. Exact filter merges,
pre-existing records and capped records all need dispositions, not deletion.

For stages that transform a candidate set, return a JSON object with native
stage fields plus `dispositions`:

```json
{
  "dispositions": [
    {"candidateId": "scan-correctness:0", "outcome": "retained"},
    {"candidateId": "scan-reliability:0", "outcome": "merged", "targetId": "F-001"}
  ]
}
```

Allowed outcomes: `retained`, `refuted`, `unresolved`, `merged`, `pre-existing`,
`capped`, `out-of-scope`. Every expected candidate occurs exactly once; unknown,
duplicate or absent IDs fail validation. For merges, verify the target exists
in the resulting records and preserves source evidence. A disposition is not
permission to refute or change severity: only the assigned evidence owner can
make that decision. Check the verdict, retained/unresolved collections and
member mappings against the dispositions before publishing.

The controller derives filter dispositions from the script's actual output;
it does not invent them. Verifier and adjudicator decisions supply later
dispositions. Grader and publisher must account for every input candidate,
including explicit reasons/evidence for omissions. Never count a lost candidate
as an empty review.

## Persistence is not learning

Retain raw, derived and publication receipts for retries and retrospective
inspection under the caller's retention policy. Do not store credentials or
publish internal research automatically. Raw claims are evidence, not reusable
policy; only the retrospective and learning workflows promote verified lessons.
