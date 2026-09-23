---
name: progress-evidence
description: Internal helper. Load only when explicitly named by a progress-tracking agent.
user-invocable: true
disable-model-invocation: false
---

# Progress evidence

Use [state-contract](../../reference/state-contract.md). Read config, current state, and the journal cursor before collecting anything. Read only configured sources and explicitly referenced evidence.

## Collection

- Read ledger/checkpoint additions and changed report files. Record source path and line/section, UTC observation time, workstream/milestone IDs, and exact evidence locations.
- Observe every required path: configured sources, configured worker reports, and registered workstream report paths. Emit a `source` event for each attempted refresh, even when no domain facts changed. Use `fresh` after a successful read and `stale` after a failed read. Its timestamp is this observation's UTC time, not the file's last-modified time.
- On a successful fetch with no changes, retain the unchanged cursor. An empty diff is not a fetch failure. Source-observation IDs include the tick/observation identity so a later read refreshes freshness; retries of that same observation reuse its exact ID and timestamp.
- On missing, unreadable, truncated, replaced, or rewritten input, report the problem. Do not advance its cursor beyond verified content. After truncation/rewrite, rescan that one source and deduplicate stable events; never skip its new beginning.
- Read a Git range only if the old head exists and is an ancestor. Otherwise report divergence and inspect the changed range explicitly. Read-only Git queries are allowed; no Git writes.
- Register every observed worker dispatch and child relationship. Keep `workstreamId` stable when its agent address changes.
- Record a handoff as a claim. Mark evidence verified only after the lead/tester has inspected the artifact or run the named check. A commit hash or bare "done" cannot prove all criteria.
- Conflicting evidence remains visible. A newer claim does not override a failed test until the relevant failure is resolved.
- Use stable source-derived event IDs. Replaying an identical event is safe; reusing its ID for different content must fail.

Write candidate JSON to the assigned scratch file. The conductor submits it with `append-events`. The runtime owns the append-only journal; do not edit it directly. Do not load generated HTML to discover facts.

Return candidate path, source cursors, evidence found, successfully unchanged sources, stale sources, and conflicts. No new domain facts is valid; keep the source-observation events needed to prove this tick actually checked its inputs.
