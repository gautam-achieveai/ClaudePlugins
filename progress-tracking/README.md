# Progress tracking

Track a large work item across teams, milestones, and sessions. Each refresh highlights verified progress and unchanged active work, then records diagnostic nudges to the relevant workers.

Requires Node.js 20 or newer. There are no runtime package dependencies.

## Start

Invoke `progress-tracking:tracking-progress` with a project root, work ID, goal, acceptance criteria, and source ledger/report paths:

> Track the export-dashboard feature in this project. Use the existing Agile ledger and each worker's report. Refresh every 15 minutes, show Markdown and Mermaid progress, and ping every unchanged active team until the feature is complete.

The skill discovers host scheduling, agent messaging, and optional HITL reporting. Recurring monitoring requires a running host. Without a scheduler, checkpoints drive updates; after the host exits, resume the work ID in a new session.

For the local CLI:

```text
node <plugin-path>/scripts/progress.mjs --help
node <plugin-path>/scripts/progress.mjs init --root <project-root> --work-id export-dashboard --title "Export dashboard" --goal "Export filtered issue data" --config <config.json>
```

Define done-when criteria and source paths in `--config` before initialization. Work initialized without criteria cannot claim successful completion. See [state-contract](reference/state-contract.md) for exact JSON shapes and command syntax. Initialization does not overwrite existing work; do not hand-edit its configuration afterward.

## How the parts cooperate

| Component | Reads | Produces |
| --- | --- | --- |
| Conductor: `tracking-progress` | Configuration, state, host capabilities | Tick ownership, ordered dispatch, delivery/publication receipts |
| `progress-scout` + `progress-evidence` | Configured ledgers and worker reports | Sourced candidate events, unchanged/stale inputs |
| `progress-tracker` + `progress-status-board` | Accepted events, state, criteria | Validated reconciliation, delta, pending nudges |
| `progress-architect` + `progress-system-picture` | Accepted architecture | Optional `diagrams/system.mmd` |
| `progress-accessible-style` | Report content | Readability and evidence rules |
| `progress-archive` | Terminal state and generated reports | Immutable local snapshot |

`accessible-progress-report` remains a compatibility route to the conductor. It does not start a second tracking loop.

## Durable files

Each `.progress/<work-id>/` holds configuration, append-only `events.jsonl`, validated `state.json`, generated `report.md` and `report.html`, Mermaid sources, and terminal archives. The journal stores evidence observations; state is its current projection. Existing source ledgers remain authoritative for design decisions and raw worker claims.

The script validates events and controls canonical state. Workers update only their assigned checkpoint files. The conductor serializes all mutations using a tick ownership token. See [tick-contract](reference/tick-contract.md) for retries, scheduler identity, messaging, and publication.

## Every update tells the truth

- Show `PROGRESSED`, `NO_PROGRESS`, `BLOCKED`, `STALE`, or `TERMINAL`, plus exact deltas.
- Name unchanged active streams even when another stream advanced.
- Timestamp churn, status chatter, and nudge delivery do not count as progress.
- A queued nudge is not a delivered message. Pending delivery remains visible.
- A fresh read with no changes is distinct from a failed source fetch.
- Completion requires evidence for the configured acceptance criteria.

Markdown includes Mermaid code blocks for capable viewers. `.mmd` files can be opened in Mermaid tools. Standalone HTML works offline with readable source sections and equivalent status tables; it does not load a remote chart renderer. Report visual validation separately from source validation.

## Agile integration

`development:agile-development` registers work before dispatch. Its worker contract supplies work ID, workstream and parent IDs, milestone, owner address, dependencies, and report path. Workers checkpoint when starting, after outcomes, before long checks, on blockers, on nudges, and at handoff. The lead verifies claimed evidence before acceptance.

Workstream IDs survive replacement agents and context compaction. The tracker does not implement changes, expand scope, or accept completion from a handoff alone. Tracking can also be used without the development plugin by supplying the same sources and identities directly.

## Recovery and privacy

On restart, reload state and inspect the prior receipt. A live tick returns BUSY. Use explicit stale recovery only for an abandoned owner. Preserve the journal; reconciliation replays unapplied events. Diagnose a failed stage and retry that stage.

Keep `.progress/` local or review its contents before sharing. Add it to the target project's existing ignore policy when appropriate. Initialization does not modify Git configuration. Reports can contain work item names, source locations, and evidence; the runtime does not promise secret scanning. Archiving copies this work's state and reports, not arbitrary source notes. No automatic commit, upload, or external team message occurs in the Node script.

## Verify changes to this plugin

```text
node --test tests/progress-tracking-runtime.test.mjs tests/progress-tracking-plugin.test.mjs
```

Run from the marketplace repository. Integration tests use temporary project directories. The host-mediated scheduler and message delivery need an available host; local tests prove durable queues and receipts, not an unattended service.
