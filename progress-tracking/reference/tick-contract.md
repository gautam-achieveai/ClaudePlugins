# Tick contract

Read with [state-contract.md](state-contract.md). The CLI owns local data; the host owns scheduling, agent execution, messaging, and publication.

## One controller per work item

Keep the schedule ID, active tick identity, last receipt, source paths, and owner addresses in the existing execution ledger. A schedule prompt carries the project root, work ID, and conductor skill name. List host jobs before creating a replacement so session restarts do not create duplicate loops.

Scheduled prompt:

> Use progress-tracking:tracking-progress for project <absolute root>, work ID <stable ID>. Reload saved state, perform one tick, publish its exact delta and unchanged streams, deliver pending worker nudges, and record the receipt. On terminal state archive and cancel this schedule only.

Use the host's actual scheduler API or `/loop 15m`. Do not assume a Cron tool, fixed job expiry, or automatic restarts. Record last/next refresh and the current mode (recurring or event-driven) in the ledger and user-facing update. A stopped host cannot execute skill instructions. Resume explicitly on the next session.

## Transaction and ownership

1. Acquire tick ownership with `tick-start`.
2. Scout produces a candidate file; controller appends it through the runtime.
3. Tracker reconciles and checks through the runtime.
4. Architect updates optional `system.mmd` if topology changed.
5. Controller renders, delivers messages, records acknowledgements, and renders again. Nonterminal work uses `tick-finish`, then publishes the receipt and final views. Terminal work uses `archive` instead; it finishes the tick and seals the snapshot before publication.

Run these stages in order. Pass the token only to the current state-changing stage. Do not run two agents that mutate runtime state at once. All mutations use the CLI; agents do not write config, state, journal, locks, receipts, or archives by hand. The runtime's short mutation guard is separate from the tick's ownership lease.

Run `--help` for exact recovery flags. BUSY is an existing owner, not permission to delete its lock. Confirm the owner is abandoned before explicit stale recovery. Reconcile durable journal events after interruption. Never clear a lock or rewrite journal history to make a failing check pass.

Use the host's agent/session inventory and saved controller identity to establish abandonment; elapsed time alone does not prove it. If the runtime's recovery timeout has not elapsed, report BUSY with the earliest eligible retry and continue unrelated delivery work. Retry at that time through the existing scheduler or the next event-driven invocation. Do not launch another writer or delete the lock to bypass the timeout.

## Source observation

Read configured ledgers/reports at each tick. Successful observation with unchanged content is fresh data and may produce NO_PROGRESS. Missing access, missing report files, parse failures, and unverified head divergence are stale inputs. Preserve the last known value and its date.

Keep one event ID per source fact. Retries submit the same content under that ID. Corrected facts need new IDs with a source explanation. Cursor movement follows accepted observations; never skip a failed source or use page time as source time.

## Nudge delivery

For each pending runtime nudge, resolve the current live worker address from the dispatch registry. Use the host's available agent messaging tool (for example SendMessage or collaboration.send_message). Send a diagnostic request:

```text
Work: <workId>; stream: <workstreamId>; tick: <tick>
No verified progress since: <last evidence time>
Current blocker or missing evidence: <facts>
Update report: <reportPath>; ledger: <ledgerPath>
What prevents the next acceptance check, and what is your next action?
Persist a checkpoint and reply DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT.
Nudge key: <stable key>
```

Call `nudge-ack` only after the host confirms delivery. Include the delivery receipt or returned message ID where available. If the worker exited, ask its parent/lead for diagnosis. If no route exists, keep the nudge pending and expose `nudge_required`. Notify the user only for a meaningful blocker or newly missing capability; ordinary quiet ticks update the same report.

A pending nudge does not justify blocking all monitoring. Finish the tick with its pending delivery visible, retry through a valid route later, and never count delivery as progress. A crash between send and acknowledgement may repeat a message: include its stable nudge key so the receiving team can deduplicate. Exactly-once external delivery is not promised.

## Publication

Publish from validated local state. If HITL is available, reuse a living `UpdateWork` document and read its task revision with `ReadWork` before replacing that task. Keep source facts and delivery receipts in local state. Check `saved` and `published` separately. Retry an uncertain identical publication with the same update ID; use a new ID when its content changes.

Without HITL, return `report.md`, `report.html`, diagram paths, tick result, actual progress, unchanged streams, and pending delivery in the conversation. A generated file alone is not proof the user received an update.

## Completion and failures

Tracking stops only on a validated terminal work outcome or explicit user cancellation. Report a scheduler interruption as an interruption, never completion. Before canceling a terminal schedule, render, archive, and publish the terminal receipt. Cancel only the saved schedule ID for this work item.

When a stage fails, preserve the error and last safe stage in the execution ledger. Retry the failed stage after diagnosing it; do not repeat implementation work. Failed rendering does not invalidate verified project evidence, but it does invalidate a claim that the report is current. Failed source fetches remain stale. Never infer acceptance from silence or an absent worker.
