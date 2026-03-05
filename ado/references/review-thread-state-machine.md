# Review Thread State Machine

> **Synced copy** — the canonical version lives in the `code-reviewer` plugin at
> `code-reviewer/references/review-thread-state-machine.md`. Keep both in sync.

## States

| State | Description |
|-------|-------------|
| **Active** | Thread is open. The reviewer posted a finding; the developer has not yet responded, or the reviewer reopened a previous response. |
| **Resolved** | The developer fixed the code and replied with evidence. Awaiting reviewer verification. |
| **Won't Fix** | The developer declined the suggestion with a rationale. Awaiting reviewer acceptance. |
| **Closed** | The reviewer verified the resolution (or accepted Won't Fix) and closed the thread. Terminal state. |

```
                  ┌──────────────────────────────┐
                  │                              │
                  ▼                              │
             ┌────────┐   fix + reply       ┌──────────┐   verify ok     ┌────────┐
             │ Active │ ─────────────────► │ Resolved │ ──────────────► │ Closed │
             └────────┘                     └──────────┘                 └────────┘
                  │                              ▲                           ▲
                  │  decline + reply             │ reopen                    │
                  ▼                              │ (fix insufficient)        │
             ┌───────────┐   accept rationale   │                           │
             │ Won't Fix │ ─────────────────────┼───────────────────────────┘
             └───────────┘                      │
                  │                              │
                  └──────────────────────────────┘
                    reopen (rationale rejected)
```

## Blocker Classification

Review comments that are blocking are tagged with `[BLOCKER]` in the comment
text, immediately after the bot prefix. Comments without a `[BLOCKER]` tag are
non-blocking by default.

### BLOCKER

A finding that **must** be addressed before the PR can merge:

- Bug or correctness issue (wrong logic, missing edge case, race condition)
- Security vulnerability (injection, auth bypass, credential exposure, OWASP Top 10)
- Significant class/architecture design issue (wrong abstraction, layer violation, broken encapsulation)
- Significant simplification available (400+ lines reducible to 50, entire class unnecessary)
- Data loss or corruption risk
- Performance issue with user-visible impact (N+1 in hot path, unbounded memory)

### Non-blocking (default)

Comments without `[BLOCKER]` are non-blocking — they improve quality but are
**not required** for merge:

- Style and naming suggestions
- Minor refactoring opportunities
- Informational observations ("FYI, this pattern exists elsewhere")
- Documentation improvements
- Minor performance suggestions (no user-visible impact)
- Alternative approaches that aren't clearly superior

## Developer-Side Transitions

### Active → Resolved

The developer fixes the code and replies:

```
[<dev name>'s bot] Fixed: <brief description of what was changed>
```

Requirements:
- Code must actually be changed (not just a reply)
- Reply must describe what was done, not just "fixed"

### Active → Won't Fix

The developer declines the suggestion and replies:

```
[<dev name>'s bot] Won't Fix: <technical rationale>
```

Requirements:
- Rationale is **mandatory** — a bare "Won't Fix" is not acceptable
- For BLOCKER items: rationale must be substantial (reference tests, architecture decisions, or constraints)
- For security BLOCKERs: always address unless there is an extremely strong justification; prefer to fix
- For non-blocking items: a reasonable one-line explanation suffices
- **Deferral is valid**: Won't Fix with a deferred work item/bug ID is acceptable
  (e.g., `Won't Fix: Deferred to #4567 for follow-up`). The reviewer can verify
  the work item exists.

## Reviewer-Side Transitions

### Resolved → Closed

The reviewer verifies the fix in the delta diff:
1. Confirm the code change actually addresses the finding
2. Confirm no regressions were introduced by the fix
3. Use `updatePullRequestThread` to close the thread

### Won't Fix → Closed

The reviewer evaluates the rationale:
1. For non-blocking items: accept if the rationale is reasonable
2. For BLOCKER items: accept only if the rationale is technically sound and the risk is mitigated
3. Use `updatePullRequestThread` to close the thread

### Resolved → Active (Reopen)

The reviewer finds the fix insufficient:
1. Reply with `replyToComment` explaining what is still wrong or missing
2. The thread remains Active (or is reopened)

### Won't Fix → Active (Reopen)

The reviewer rejects the rationale:
1. Reply explaining why the rationale is insufficient
2. For security BLOCKERs: default is to reopen unless the justification is compelling
3. The thread remains Active (or is reopened)

## Rules

1. **Only the reviewer closes threads** — the developer never resolves or closes threads in ADO
2. **Security BLOCKERs get strictest treatment** — Won't Fix on a security BLOCKER requires detailed justification from the developer AND explicit acceptance from the reviewer
3. **Non-blocker Won't Fix is lightweight** — a reasonable one-line explanation is sufficient
4. **Deferral is a valid Won't Fix** — if the developer creates a work item/bug to track the issue and references its ID, that counts as a valid Won't Fix rationale. The reviewer should verify the work item exists before closing.
5. **Every reply uses the bot prefix** — `[<dev name>'s bot]` for developer replies
6. **Evidence over assertions** — "Fixed" must point to actual code changes; "Won't Fix" must provide technical reasoning
