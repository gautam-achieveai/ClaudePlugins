---
name: tracking-progress
description: Use when tracking a large work item across agent teams, refreshing progress reports, resuming long-running delivery, or diagnosing unchanged workstreams.
user-invocable: true
disable-model-invocation: false
---

# Track progress

Run one durable tracking loop per work item. Use [state-contract](../../reference/state-contract.md) for the CLI and data formats and [tick-contract](../../reference/tick-contract.md) for scheduling, messaging, recovery, and publication.

## Start or resume

1. Resolve the project root, stable work ID, goal, done-when criteria, milestone dependencies, worker IDs/addresses, existing ledger and report paths. Keep sensitive content out of reports.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/progress.mjs" --help`.
3. Initialize missing work with `init`. Read existing config/state/journal before resuming. Never initialize over existing state. Configure the actual source and worker-report paths. Do not import an unrelated project.
4. Record the recurring scheduler identity and cadence in the existing ledger. Use `/loop 15m` or the host's recurring facility; list existing jobs before creating one. Re-establish an expired/missing job on restart.
5. If recurring execution is unavailable, say monitoring is **event-driven**, then refresh on checkpoints, handoffs, blockers, and before long commands. This plugin does not install a daemon or stay alive after the host closes.

## Tick

Every agent brief includes the resolved absolute paths to this plugin's `scripts/progress.mjs` runtime and `reference/state-contract.md`, the applicable helper skill paths, project root, work directory, work ID, tick identity, owned candidate/report path, and source report paths. Supply the ownership token only to the active mutating stage. Do not assume plugin-relative paths are resolved from the worker's current directory.

1. `tick-start` returns the tick ID and ownership token. BUSY means another tick owns the work. Do not dispatch another pipeline.
2. Dispatch `progress-tracking:progress-scout` with source cursors, report paths, tick identity, and one owned candidate-event file. Inspect its sourced events; serialize `append-events` calls through the conductor. No new events is valid.
3. Dispatch `progress-tracking:progress-tracker` with state, new events, done-when criteria, and evidence. It runs `reconcile` through the validated runtime and returns the result, exact deltas, stale inputs, and pending nudges. Independent evidence verification is still a lead responsibility.
4. Dispatch `progress-tracking:progress-architect` only when accepted architecture changed. It owns optional `diagrams/system.mmd`. Generated milestone/dependency/workstream diagrams belong to the renderer.
5. Run `check` and `render`. Load `progress-tracking:progress-accessible-style` for the human report. Inspect `report.md`, `report.html`, and Mermaid sources.
6. Lead with the computed tick result and verified delta. For each unchanged active workstream, state **NO_PROGRESS** and name its owner, last evidence, blocker, and next diagnostic action, even if another stream advanced.
7. Deliver every new pending nudge through the host agent messaging tool. Use its saved owner address; update a replaced worker's address from the dispatch ledger first. Record actual success with `nudge-ack`. Never acknowledge an attempted or unavailable delivery. Keep unavailable delivery as `nudge_required` for the lead, visible in the report.
8. Re-render after acknowledgements. For nonterminal work, `tick-finish` records the receipt, refreshes reports, and releases ownership; then publish those final views. A failed stage retains recoverable state; do not label it success. Pending delivery may close the tick but must remain visible for retry.
9. On `TERMINAL`, use `progress-tracking:progress-archive` with the current token instead of `tick-finish`; archive closes the tick itself. Publish the final receipt, then cancel only this work item's recurring job. Until then, continue monitoring unblocked work.

## Host integration

Use `mcp__hitl__ReadWork` before resuming an existing living report and `mcp__hitl__UpdateWork` to publish its current view when available. Reuse the same work ID. Respect task revisions and distinguish saved from published. These are projections; they do not replace local evidence.

Without those tools, give the user the local report path and concise result. Agent tools differ by host: use the discovered send-message capability; no external email/chat service is implied.

## Boundaries

Tracking observes and asks for diagnosis. It does not implement fixes, redefine acceptance criteria, commit, publish code, or grant itself broader authority. A handoff is a claim; terminal completion requires the configured criteria and verified evidence. Do not count report timestamps, chatter, retries, or nudges as progress.

Read detailed errors and recovery in the tick contract. Return the result, report paths, progress delta, unchanged streams, pending delivery, and next refresh.
