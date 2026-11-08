# Study records and tools

Use an existing study before creating another. For iterative work without an established store, suggest `.experimentation/<study-slug>/` in the working project. The user may choose another path. Keep one-off answers in the requested format; do not create a study merely because the skill loaded.

```text
.experimentation/<study>/
  study.json              question and identity
  records/<id>.json       immutable linked research records
  artifacts/              optional raw outputs, data recipes, notebooks
```

Keep data outside the installed plugin and personal agent memory. Discuss tracking/sharing when relevant; the utility does not change gitignore. Store references to large or sensitive data instead of copying it into notes. Avoid storing credentials or unnecessary user-level telemetry.

## Utility

Use `${CLAUDE_PLUGIN_ROOT}/scripts/research-store.mjs`, substituting the resolved plugin root before execution. Requires Node 22+. Successful commands return JSON; failures use stderr and a nonzero exit. Quote paths. Use JSON files for record input rather than shell interpolation. The script never executes artifact references or contacts a service.

```text
node <store-script> init --root <study-path> --question "Which design should we test?" --id example-study
node <store-script> schema --kind hypothesis
node <store-script> add --root <study-path> --file <record-input.json>
node <store-script> list --root <study-path> --kind hypothesis
node <store-script> list --root <study-path> --query retention --history
node <store-script> context --root <study-path> --id hypothesis-a
node <store-script> summary --root <study-path>
node <store-script> validate --root <study-path>
node <store-script> export --root <study-path>
node <store-script> validate --file <exported-bundle.json>
```

`schema` is the machine contract for fields and enums. Example input:

```json
{
  "id": "hypothesis-a",
  "kind": "hypothesis",
  "title": "First value precedes collaboration",
  "summary": "Test whether individual success is a prerequisite.",
  "links": [],
  "data": {
    "prediction": "The combined onboarding and invitation design improves the target outcome.",
    "falsifier": "A sufficiently precise comparison rules out the proposed useful benefit.",
    "scope": "New workspaces in the defined study population."
  }
}
```

Record kinds: idea, hypothesis, experiment, evidence, lesson, decision. Use `tests` links from plans to hypotheses; `supports`/`contradicts` from evidence; `derived-from` from lessons to evidence; `depends-on` and `related` across branches. Add targets first. Exact stable-ID retries are idempotent; conflicting content is rejected. Generated IDs are convenient, but supply a stable ID for retries.

## Sources, leads and shared checkpoints

Use these same kinds for source research; do not invent `source`, `claim` or `lead` kinds or extra JSON fields. The schema is strict.

- **Source finding:** evidence with `mode: literature` for published claims, or the appropriate observed/historical/simulation mode. Put canonical URI/path, version, publication/data period, retrieval date and exact locator in `data.source`; the relevant finding in `data.observation`; access, method and applicability limits in `data.limitations`. Preserve underlying study identity in that provenance so copies are not counted independently.
- **Research lead:** idea with its unresolved question in the title/summary and why it matters in `data.mechanism`; link its evidence with `derived-from` or `related`. Promote it to a separate linked hypothesis only when a prediction and falsifier are meaningful.
- **Lead assignment/disposition:** decision linked to the idea. Use `data.action` for investigate/park/close, `data.rationale` for decision value, and `data.next` for owner, next check, budget and stop/reopening condition. Use unassigned when no owner accepted. Revise an assignment by superseding its decision, not the underlying evidence.
- **Current checkpoint:** decision linked to the round's important records. Include the current conclusion, unresolved contradictions and next research-and-recall question. `summary` exposes active decisions; `context` retrieves their evidence.

An optional `artifacts/research-log.md` holds queries/filters, searched collections, exclusions, source/claim coverage and unfinished leads with record IDs. Optional briefs and queues are derived navigation aids; canonical findings and decisions stay in records. Keep one writer per artifact. Do not create separate research and experimentation directories or competing copies of the evidence. For a one-off answer, a cited brief alone can suffice.

## Resume and revise

Start with `summary`, then `list` and relevant `context`. Context includes connected records, inbound evidence, and supersession. Inspect reported omissions; increase `--limit` as needed rather than treating a bounded result as complete. Load original sources only when the decision needs them.

Correct a record with a new ID and `supersedes` pointing to the previous version. Original bytes remain. Results are new evidence linked to the plan; do not replace a prediction with its outcome. Branch disposition belongs in a decision record. The script validates structure and links, not truth, causal strength, or whether a pending experiment actually ran.

Writers take an exclusive `.write-lock`. A conflict means retry after the writer finishes. After a crash, inspect the lock, writer state and store validation before explicitly removing a stale lock under the applicable authorization. Never remove a live lock or silently rewrite damaged records. Export includes history; validate it before transfer or using a provider snapshot. See [external memory](${CLAUDE_PLUGIN_ROOT}/reference/external-memory.md) when another system participates.
