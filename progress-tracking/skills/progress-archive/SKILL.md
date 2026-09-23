---
name: progress-archive
description: Use when a tracked work item reaches a terminal outcome or a user needs a preserved progress snapshot.
user-invocable: true
disable-model-invocation: false
---

# Archive progress

Use the runtime `archive` command from [state-contract](../../reference/state-contract.md). Reuse the current tick token, reconcile, validate, and render before archiving a terminal work item. If no tick is active, acquire a token first. Archive closes its tick; do not call `tick-finish` afterwards.

Archive the exact validated state, config, event history, and generated report/diagram artifacts. Keep snapshots immutable; do not overwrite a previous snapshot. A snapshot is evidence of the recorded state, not an independent claim that the project passed.

Keep the recorded state for audit. Archived work is sealed; resumed scope uses a new work ID with a reference to the prior outcome. Do not move, delete, commit, or upload source ledgers or worker notes. The runtime does not scan arbitrary notes for secrets. Sanitize inputs before creating shared reports or publishing snapshots.

For retrieval, list this work item's archive and read the selected snapshot. Never merge archived state over live state by hand.

Return archive path, terminal outcome, evidence receipt, and any pending delivery. Report archive failure without changing the work outcome.
