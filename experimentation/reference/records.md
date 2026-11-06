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

Resolve `../../scripts/research-store.mjs` relative to the loaded skill directory. Requires Node 22+. Successful commands return JSON; failures use stderr and a nonzero exit. Quote paths. Use JSON files for record input rather than shell interpolation. The script never executes artifact references or contacts a service.

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

## Resume and revise

Start with `summary`, then `list` and relevant `context`. Context includes connected records, inbound evidence, and supersession. Inspect reported omissions; increase `--limit` as needed rather than treating a bounded result as complete. Load original sources only when the decision needs them.

Correct a record with a new ID and `supersedes` pointing to the previous version. Original bytes remain. Results are new evidence linked to the plan; do not replace a prediction with its outcome. Branch disposition belongs in a decision record. The script validates structure and links, not truth, causal strength, or whether a pending experiment actually ran.

Writers take an exclusive `.write-lock`. A conflict means retry after the writer finishes. After a crash, inspect the lock, writer state and store validation before explicitly removing a stale lock under the applicable authorization. Never remove a live lock or silently rewrite damaged records. Export includes history; validate it before transfer or using a provider snapshot. See [external memory](external-memory.md) when another system participates.
