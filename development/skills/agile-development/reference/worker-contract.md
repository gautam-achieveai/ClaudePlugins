# Worker Contract

Load when dispatching a role agent, reading its handoff, or resuming after compaction.

## Dispatch brief

Every brief contains these parts, in order:

1. **Goal** — one sentence of user-visible outcome.
2. **Inputs** — paths to the ledger entry, prior handoff files, and the plan section. Pass paths, not pasted history.
3. **Owned artifacts** — the only files this worker may write. Everything else is read-only.
4. **Acceptance** — criteria and the evidence that proves each one.
5. **Out of scope** — named exclusions.
6. **Model** — state it explicitly. An omitted model inherits the most expensive one.
7. **Stop condition** — when to return instead of continuing.
8. **Report file** — the path where the full handoff is written.
9. **Progress identity** — `workId`, `workstreamId`, `parentWorkstreamId` (null for a top-level stream), `milestoneId`, `reportPath`, owner/agent address, dependencies, and checkpoint cadence. Pass the same IDs to `progress-tracking:tracking-progress`.

Workers may start their own sub-agents; see Recursive delegation.

## Progress checkpoints

The report file is owned by that worker. Create it when starting, then append a UTC checkpoint after a meaningful outcome, before a long check, on a blocker, on a nudge, and before returning. Each checkpoint includes the progress identity, current action, last verified delta (or **NO_PROGRESS**), exact evidence locations and observed results, blockers, next action, and child IDs. Persist the final handoff in the same file. Never label activity alone as completed work.

The lead records each dispatch and report path in the ledger before starting a worker. Register children with their `parentWorkstreamId`; parents must not claim completion while a child has unfinished acceptance criteria. Resume the same IDs across compaction and retries. A replacement agent changes the owner address, not the workstream ID.

Progress Scout reads these reports; the lead verifies completion claims before producing verified evidence events. Workers do not edit the shared tracking journal, state, diagrams, or generated reports. Respond to a tracker nudge with a persisted checkpoint and a diagnostic answer. A report that cannot be fetched stays stale; missing reports are not proof of completion.

Coordination and diagnostic nudges within the assigned agent team are part of the dispatch, not external publication. They do not authorize messages to other people or external services.

## Handoff

The worker writes the full handoff to its report file, then returns at most 15 lines:

```text
STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Report: <report file path>
Changed: <files>
Evidence: <command → observed result>, one per line
Concerns / blocker / missing context: <one line each>
```

| Status | Lead action |
| --- | --- |
| `DONE` | Verify the claims (below), then advance. |
| `DONE_WITH_CONCERNS` | Verify, then record each concern as a Ruling or a follow-up task. |
| `BLOCKED` | Diagnose (see Retry rules). Do not re-dispatch the same brief. |
| `NEEDS_CONTEXT` | Send the named input to the same running worker. |

## Recursive delegation

Any worker may start sub-agents when a piece of its work is independent and large enough to repay the startup cost. The worker becomes the lead for its children:

- Each child gets a full dispatch brief from this contract.
- A child's owned artifacts are a subset of its parent's owned artifacts. A child never widens scope.
- Children that run at the same time follow `parallel-waves.md` inside the parent's scope.
- The parent verifies each child's handoff before relying on it, and reports the children's changes as its own.
- The parent never hands its whole brief down unchanged; that adds a layer without dividing work.

## Verify claims, not reports

A handoff is a claim. Before advancing:

- Inspect the actual diff and tree, not the reported paths.
- Re-run at least one claimed check yourself.
- Treat a weakened, skipped, or deleted test as a rejection.
- Treat a check that could not run as a failure.

## Rulings

Make routine reversible decisions yourself and log them in the ledger instead of stopping:

```text
Ruling: <what was decided> — <why> — <cost if wrong>
```

Show every Ruling in the final report. Stop for the user only when the next action is destructive, security-sensitive, has an external side effect (push, merge, publish, or a message to anyone other than the user), or the plan is so broken that every path is a guess.

## Retry rules

A retry with an unchanged brief is banned. First classify the failure, then change the configuration:

| Diagnosis | Change |
| --- | --- |
| Wrong scope | Narrow or widen owned artifacts. |
| Wrong depth | Change the acceptance bar or the model. |
| Wrong format | Restate the handoff shape. |
| Missing input | Supply the file, decision, or entry point. |
| Wrong role | Route to a different agent. |
| Capability gap | Use a stronger model, or do the step as lead. |

Fix-round budget per defect (in subagent-driven development, per task review): rounds 1–2 resume the same worker; round 3 uses a fresh worker on a stronger model. In Agile team mode, a third failed round fires the **Three strikes** alarm in `agile-development/SKILL.md`: stop fixing and re-plan. Outside it, the calling workflow's own breaker applies (subagent-driven development parks or re-plans with a Ruling). Any other course-correction alarm stops fix rounds early.

A worker that was dispatched but left no report file and is no longer running is re-dispatched, which is not a retry: send a new worker the same brief plus a pointer to the partial changes.
