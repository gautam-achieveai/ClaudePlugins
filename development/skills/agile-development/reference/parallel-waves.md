# Parallel Waves

Load before running two or more workstreams, or two or more writers, at the same time.

## Coupling check

Different files are not proof of independence. Build a table of every workstream pair and mark it **parallel** only when none of these is shared:

| Coupling surface | Examples |
| --- | --- |
| Unstable contract | Shared type, API shape, event schema, config key still being decided |
| Schema | Database migration, serialized format |
| Manifests, generated or lock files | Package manifest, lockfile, generated client, snapshot, build output |
| Runtime resource | One dev server, port, database, or test fixture |
| Hidden write surface | Registry, DI setup, route table, barrel/index file, shared constants |

Any shared surface means run in sequence, or move that surface to one owner first. Do not start a wave while every workstream depends on an unsettled architectural decision; settle it through the Architect and Critic first.

## Wave contract

- Give every wave member a stable `workstreamId`, parent ID, milestone ID, dependencies, owner address, and report path from `worker-contract.md`. Register the whole wave with `progress-tracking:tracking-progress` before dispatch. Record integration evidence per unit; one member advancing must not hide another member's missing progress.

- A wave runs at most 5 concurrent writers; a team counts as one writer, and the lead does not use a slot. Small units that do not repay a worker's startup cost stay with the lead.
- Start each wave from a known base and record it in the ledger: a clean commit's SHA when the lead may commit, otherwise the current SHA plus a saved `git diff` patch file in the scratchpad.
- One owner per file, including hidden write surfaces. When a shared file must change, the lead owns it and applies changes one at a time.
- Workers do not commit, rebase, or run other git write commands in a shared tree.
- Any write to a file nobody owns aborts that worker's result.
- In an isolated worktree, the worker confirms `HEAD` matches the given base SHA before editing.

## Integration

- The lead integrates one unit at a time, in dependency order.
- After each unit, the lead runs the narrowest meaningful verification before integrating the next.
- A unit that is green alone but red after integration returns to its owner with the failing command and output.
- Record each integrated unit in the ledger so a resumed run never re-dispatches it.
