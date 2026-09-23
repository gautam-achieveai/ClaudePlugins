# Durable state and CLI contract

Runtime: `node "${CLAUDE_PLUGIN_ROOT}/scripts/progress.mjs"`; a worker without that variable uses the absolute runtime path from its brief. Node.js 20 or newer. No packages or network service are required. Work-state and source paths below are relative to the project supplied with `--root`, not the plugin checkout. `--input` and `--config` files resolve from the process working directory, so pass absolute paths.

## Commands

Every command prints one JSON object to stdout. Failure prints `{ "code": "...", "error": "..." }` to stderr and exits 1. `help` prints the complete command synopsis in a JSON `help` string.

```text
init --root <project> --work-id <id> --title <text> --goal <text> [--config <JSON-file>]
tick-start --root <project> --work-id <id> [--recover-stale]
append-events --root <project> --work-id <id> --token <token> --input <JSON-array-file>
reconcile --root <project> --work-id <id> --token <token>
check --root <project> --work-id <id>
render --root <project> --work-id <id> --token <token>
nudge-ack --root <project> --work-id <id> --token <token> --key <nudge-key> --delivery <description>
tick-finish --root <project> --work-id <id> --token <token> [--result <expected-result>]
archive --root <project> --work-id <id> --token <token>
```

- `init` refuses existing work IDs. IDs contain 1–80 ASCII letters, numbers, underscores or hyphens, beginning with a letter or number. Path traversal, device names and reserved object keys are rejected.
- `tick-start` returns `{token,tick,startedAt}`. Save the token for this tick. A live lock returns `BUSY`. Takeover requires `--recover-stale` and the configured timeout; it journals `lock_recovered` before replacing the tick lock. Recovery preserves the interrupted tick's comparison baseline, so committed but unreported progress is included in the next receipt.
- `append-events` validates the entire input array and replays the candidate transaction before appending. It returns `{appended,duplicates,journalCursor}`. Identical event-ID retries are no-ops; conflicting IDs reject the entire batch. Unknown kinds, unresolved dependencies, cycles, invalid evidence and unsupported transitions fail without appending.
- `reconcile` returns the complete canonical state, including classification, exact deltas, unchanged active workstreams and pending nudges. It checks required input paths for missing files and missing or aged successful source observations. It never parses worker prose or invents evidence.
- `check` is read-only. It validates replay against saved state and checks archive file hashes when archived. `STATE_LAG` means journal facts were committed but the state projection needs `reconcile`. Run after reconciliation, not while another command is mutating.
- `render` reconciles and regenerates the three topology sources plus Markdown and HTML. Optional architect-owned `diagrams/system.mmd` is included as readable source but is not rewritten.
- `nudge-ack` records a delivery already made by the host. It does not send a message. Same key and delivery are idempotent. A changed acknowledgement conflicts.
- `tick-finish` reconciles, persists a receipt, regenerates views and releases the tick lock. An optional expected result must match the computed one. If report publication fails after receipt commit, fix the obstruction and retry `tick-finish` with the same token: it reuses the receipt, publishes views and releases the lock without another tick, journal event or nudge. `render` can retry publication first while retaining the lock for `tick-finish`. Pending nudges remain honest and visible; missing host messaging does not prevent durable tick completion.
- `archive` requires terminal state. It finishes the active tick, retains the lock while creating an immutable terminal snapshot, then seals the work ID and releases the lock. A report-publication failure can be retried with the same token and committed receipt. If snapshot publication succeeded but sealing failed, retry validates every snapshot hash, exact config/journal bytes, work identity, and replayed state before restoring the seal; it never overwrites the existing snapshot or adds a tick. Mismatches fail closed with `ARCHIVE_CHANGED`. Start a new work ID for resumed scope.

All mutations after initialization require the active token. A separate exclusive command mutex rejects simultaneous mutations even when callers share a token. For an interrupted command, `tick-start --recover-stale` can recover a mutex owned by a dead process on this machine; it will not evict a live process or a lock from another host.

When a receipt is committed but report publication remains unfinished, domain append and nudge acknowledgement are rejected with `TICK_FINISHED`. Only reconciliation, rendering, finish retry or archive may continue under that token; the accepted receipt is immutable.

## Durable layout

```text
.progress/<work-id>/
  config.json
  events.jsonl
  state.json
  tick.lock                 # active tick ownership, not a source of progress
  mutation.lock             # exists only during a mutating command
  report.md
  report.html
  diagrams/{milestones,dependencies,workstreams}.mmd
  archive/terminal-<tick>/   # config, journal, state, views, source references and hashes
  archived.json             # final snapshot path and integrity hashes
```

`events.jsonl` is append-only. Each complete line is a transaction envelope:

```json
{"sequence":1,"events":[{"id":"...","kind":"..."}]}
```

Sequence starts at 1 and increases once per transaction. `journalCursor` is the last applied sequence. UTC source timestamps are provenance, not ordering: delayed observations with older timestamps are accepted. Exact event-ID duplicates are checked by recursively sorted JSON properties, so object key order is irrelevant; array order remains significant.

The journal is committed and flushed before projection replacement. Every append preserves the complete existing byte prefix and publishes the new journal through a flushed temporary sibling followed by atomic rename. A killed writer can leave an unused temporary file, but cannot leave a partial live transaction. This is logically append-only; prior rows are never changed. JSON, Markdown and HTML replacements use the same publication method. A process interruption after journal commit is recoverable by replay. An externally damaged final JSONL transaction fails closed with `JOURNAL_TAIL`; preserve the damaged file and recover the last complete transaction before continuing. The runtime never silently truncates history. Reports are reproducible views and never authoritative inputs.

## Configuration

`--config` reads an optional JSON object. `init` supplies schema version and work ID and uses the explicit CLI title and goal.

```json
{
  "doneWhen": [{"id":"tests","description":"Focused integration tests pass"}],
  "sources": ["docs/work-ledger.md"],
  "workerReports": ["reports/api.md"],
  "cadenceMinutes": 15,
  "staleAfterMinutes": 60,
  "noProgressThreshold": 1,
  "formats": ["markdown","html","mermaid"],
  "notifications": {"enabled":true}
}
```

Lists default to empty. Numeric defaults are 15, 60 and 1; all must be positive. Input paths are explicit paths, not globs. They can be absolute or project-relative. `sources`, `workerReports` and workstream `reportPaths` are required inputs. Every path needs an existing file and a successful `source` event observed within `staleAfterMinutes`; otherwise reconciliation records `STALE`. Merely finding a file does not prove that a scout read it. A fresh event must use the exact configured path string and the actual observation timestamp, not the source file's last modified time. A future observation beyond 30 seconds of clock tolerance is also stale.

`formats` and `notifications` are host preferences. Runtime rendering always writes all three formats; host delivery and recurring scheduling are the conductor's responsibility. `noProgressThreshold` controls the nudge `escalated` marker. Every unchanged active workstream gets a nudge requirement every tick, including ticks where another workstream progressed.

## Sourced event shape

Input files contain a JSON array of events:

```json
[
  {
    "id": "dispatch-api-1",
    "timestamp": "2026-09-22T08:00:00Z",
    "source": {"path":"docs/work-ledger.md","location":"lines 12-20"},
    "kind": "dispatch",
    "summary": "API team starts its slice",
    "workstreamId": "api",
    "evidence": [],
    "transition": {
      "title":"API slice",
      "owner":"api-team",
      "status":"active",
      "reportPaths":["reports/api.md"],
      "critical":true
    }
  }
]
```

Required fields: nonempty `id`, UTC ISO `timestamp`, `source.path`, `source.location`, `kind`, `summary`, and an `evidence` array. `workstreamId`, `milestoneId` and `transition` depend on kind. `_runtime:` event IDs are reserved.

Evidence entries:

```json
{
  "id":"api-tests-pass-1",
  "path":"reports/api-tests.txt",
  "detail":"node --test api.test.mjs: 8 passed, 0 failed",
  "verified":true,
  "criterionId":"tests"
}
```

All fields except `criterionId` are required. Evidence IDs are immutable. Reusing one with different content is rejected. `verified:false` observations are retained but cannot prove completion or count as verified progress. Scout must inspect the referenced evidence before setting `verified:true`. The runtime validates structure and association; it cannot establish that a reported test really ran or that a claim is true.

## Transitions

| Kind | Target | `transition` shape |
| --- | --- | --- |
| `dispatch` | `workstreamId` | Create/update `{title,owner,status,parentId?,dependencies?,milestoneId?,reportPaths?,critical?,nextAction?}`. Owner required. |
| `handoff` | existing `workstreamId` | Same optional update fields. Latest source, summary and timestamp are retained. |
| `milestone` | `milestoneId` | Create/update `{title?,status?,dependencies?,criteria?,nextAction?}`. `criteria` uses the doneWhen criterion shape. |
| `evidence`, `verdict` | workstream and/or milestone ID | No transition fields. Attach the event's evidence to existing targets. |
| `risk`, `blocker`, `ruling` | optional `workstreamId` | `{id,status,description,critical?}`. Status is `open`, `resolved` or `accepted`; non-open states require verified evidence. |
| `source` | `source.path` | `{status:"fresh"\|"stale",cursor?,gitHead?}`. Records successful or failed source refresh; event timestamp becomes `observedAt`. An unchanged cursor is valid freshness, never progress. |
| `terminal` | whole work item | `{status:"completed"\|"completed_with_risks"\|"blocked_terminal"\|"failed"}`. Requires verified evidence. |

Entity status is `active`, `waiting`, `blocked` or `completed`. Defaults: active, no dependencies, no evidence; workstreams also default to no parent, no report paths and `critical:true`.

Create dependencies and parent entities before referencing them. IDs, parent edges and dependency edges are validated. Milestone dependencies connect milestones; workstream dependencies connect workstreams. Cycles fail. Optional workstream `milestoneId` must reference an existing milestone.

Completing a workstream requires attached verified evidence and completed children. Unfinished children cannot be added under a completed parent. Completing a milestone requires attached verified evidence for every one of its criteria. Every dependency must already be completed. Completed terminal status requires:

- At least one configured doneWhen criterion, each proved by verified evidence attached to the terminal event.
- All workstreams and milestones completed.
- No open blockers, open risks or stale required sources.
- `completed_with_risks` when accepted risks remain.

`completed_with_risks` requires at least one accepted risk with verified acceptance evidence. With no accepted risks, use `completed`.

`failed` and `blocked_terminal` require verified evidence of that outcome, not successful doneWhen criteria. All terminal states reject subsequent domain events. Runtime tick, receipt, nudge and archive bookkeeping remains possible until archival.

Terminal append checks live source availability and freshness even before the first reconcile. Replay evaluates recorded freshness at the terminal event's timestamp, so later replay, archive checks and inspection remain deterministic.

## Canonical state and classification

State fields include `schemaVersion`, `workId`, `status`, `journalCursor`, `tickSequence`, `lastTickResult`, `sourceCursors`, `gitHead`, `milestones`, `workstreams`, `evidence`, `risks`, `blockers`, `rulings`, `staleSources`, `nextActions`, `nudges`, `activeTick` and `lastReceipt`. Entity collections are objects keyed by their IDs. Worker ownership, parent IDs, dependency IDs, report paths, last handoff, last verified evidence and no-progress counters live on workstream records.

`activeTick` includes `{tick,startedAt,baseline,deltas,unchangedWorkstreams,result}`. Each delta names `field`, optional entity `id`, and exact `before` / `after` material values. Receipts contain `{tick,result,startedAt,finishedAt,deltas,unchangedWorkstreams,pendingNudges}`.

Classification precedence:

1. `TERMINAL`: accepted terminal outcome.
2. `STALE`: a required input is missing, lacks a successful observation, has aged past the timeout, or a source refresh remains stale.
3. `BLOCKED`: critical work is blocked and no unblocked critical workstream advanced.
4. `PROGRESSED`: a material entity, topology, milestone association, milestone acceptance criteria, ownership, verified evidence or risk/blocker/ruling state changed.
5. `NO_PROGRESS`: no material change.

Title changes, prose churn, handoff timestamps, source cursors, rendering and nudges do not count as progress. Dependency IDs and milestone criteria are normalized for comparison. A risk, blocker or ruling change advances its associated workstream; reassignment affects both the old and new workstream. These associations drive unchanged lists, no-progress counters and obsolete-nudge superseding. The unchanged list always includes every currently active/waiting/blocked workstream without material progress, regardless of the overall tick result.

## Nudge delivery

Nudge key: `<work-id>:<tick>:<workstream-id>`. Reconciliation retries reuse it. Records contain owner, last verified progress, current blocker or missing evidence, exact report and ledger update paths, one diagnostic question and requested handoff statuses (`DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT`).

Delivery starts `pending`. Reports label this `nudge_required (pending delivery)`. Only an explicit `nudge-ack` after host delivery marks it `delivered`. Old pending requirements remain visible in later ticks; new ticks get their own keys. When a workstream progresses, completes or changes owner, reconciliation journals a `superseded` disposition for its obsolete pending nudges. Superseding does not claim delivery and obsolete requests cannot be acknowledged. Acknowledgements and superseding never count as progress.

## Views and archive

Markdown and HTML lead with the result, UTC as-of time, what progressed, each unchanged stream's explicit `NO_PROGRESS` marker and owner/last verified progress/next action, and what work is waiting on. Progress summaries name the workstream title and only fields that changed; evidence-only progress says the workstream gained verified evidence. Exact JSON deltas are secondary details. Markdown has compact status tables and Mermaid fenced code, with fences sized to contain arbitrary architecture source safely. HTML is standalone, escapes all dynamic content, uses semantic headings and tables, respects the browser's light/dark preference, and includes readable Mermaid source plus equivalent topology tables. It has no remote resources or executable scripts. The runtime does not claim browser-rendered Mermaid graphs.

The Done when table shows every global criterion ID, description and observed verified evidence IDs. Observed evidence does not establish final acceptance; the terminal transition performs that validation. Workstream tables show their milestone association, and the workstream diagram includes milestone-to-workstream edges.

Archive copies config, journal, state, Markdown, HTML, all three generated graphs and optional architect-owned `system.mmd`. `inputs.json` retains source/worker report location references and their recorded observations; raw source ledgers, worker notes and implementation files are not copied. `manifest.json` stores SHA-256 hashes. Archive paths are never overwritten; `archived.json` prevents further mutation and `check` detects changed archive bytes. This is application-level immutability; an operating-system user can still edit local files.
