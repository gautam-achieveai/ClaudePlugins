# Review Thread State Machine

> **Synchronized reference** — this lifecycle is copied into the code-reviewer
> and ADO plugins. The copies must remain byte-identical.

## States

| State | Description |
| --- | --- |
| **New** | Finding exists in canonical state but has not yet been posted to the provider. |
| **Active** | Thread is open. The reviewer posted a finding; the developer has not yet responded, or the reviewer reopened a previous response. |
| **Resolved** | The developer fixed the code and replied with evidence. Awaiting reviewer verification. |
| **Verified** | The reviewer confirmed Required Outcome and Done When. Provider closure is pending. |
| **Won't Fix** | The developer declined the suggestion with a rationale. Awaiting reviewer acceptance. |
| **Won't Fix Accepted** | The reviewer accepted the rationale. Provider closure is pending. |
| **Closed** | The reviewer verified the resolution (or accepted Won't Fix) and closed the thread. Terminal state. |
| **Handoff Required** | The same evidence-backed blocker remains after two distinct author fix commits. Automated review stops replying until a maintainer records a decision. |
| **Question** | The reviewer posted a `[QUESTION]` comment requesting clarification. Non-blocking — does not affect verdict. |
| **Answered** | The developer replied to a `[QUESTION]` thread with an answer. Awaiting reviewer acknowledgement. |

```text
         ┌────────┐  fix + reply  ┌──────────┐  verify  ┌──────────┐  provider close  ┌────────┐
         │ Active │ ────────────► │ Resolved │ ───────► │ Verified │ ───────────────► │ Closed │
         └────────┘               └──────────┘          └──────────┘                 └────────┘
             │                          │
             │ decline + reply          └── insufficient ──► Active
             ▼
         ┌───────────┐  accept rationale  ┌──────────────────────┐  provider close  ┌────────┐
         │ Won't Fix │ ────────────────►  │ Won't Fix Accepted  │ ───────────────► │ Closed │
         └───────────┘                     └──────────────────────┘                 └────────┘
             │
             └── rejected rationale ──► Active
```

## Blocker Classification

Review comments that are blocking MUST be tagged with `[BLOCKER]` in the
comment text, immediately after the bot prefix. Comments without a `[BLOCKER]`
tag are non-blocking by default.

Severity and blocker status are separate. The grader assigns both; the posting
workflow must not infer blocking from category or severity. Every blocker states:

- the concrete reason the PR cannot safely merge now
- an implementation-neutral **Required Outcome**
- an objective **Done When** condition

If those cannot be stated, make the comment non-blocking or ask a focused
question instead of opening an unbounded blocker.

Persist a stable finding ID, status, `authorAttemptCount`,
`lastAuthorAttemptCommit`, one `pendingAction`, deterministic `actionId`, and
`lastCompletedActionId` with every bot-owned finding. A repeated review of the
same commit is not a new author attempt.

### BLOCKER

A finding that **must** be addressed before the PR can merge because evidence
shows at least one of these conditions:

- The PR does not satisfy a stated outcome or acceptance criterion
- Changed code introduces a concrete correctness or concurrency failure
- Changed code introduces an exploitable security exposure
- Data loss, corruption, or an incompatible external/persisted contract is realistic
- A fundamental design direction makes the delivered solution unsafe or unsustainable
- A material operational or user-visible performance failure remains unmitigated
- A documented, applicable merge or release policy requires resolution

### Non-blocking (default)

Comments without `[BLOCKER]` are non-blocking — they improve quality but are
**not required** for merge:

- Style and naming suggestions
- Minor refactoring opportunities
- Informational observations ("FYI, this pattern exists elsewhere")
- Documentation improvements
- Minor performance suggestions (no user-visible impact)
- Alternative approaches that aren't clearly superior
- Valid designs that differ from the reviewer's preferred implementation
- Pre-existing or unrelated debt the PR does not worsen
- Simplification and test suggestions without a demonstrated merge risk

## Developer-Side Transitions

### Active → Resolved

The developer fixes the code and replies:

```text
[<dev name>'s bot] Fixed: <brief description of what was changed>
```

Requirements:

- Code must actually be changed (not just a reply)
- Reply must describe what was done, not just "fixed"
- The change may differ from the reviewer's suggested path as long as it meets
   the original Required Outcome and Done When

### Active → Won't Fix

The developer declines the suggestion and replies:

```text
[<dev name>'s bot] Won't Fix: <technical rationale>
```

Requirements:

- Rationale is **mandatory** — a bare "Won't Fix" is not acceptable
- For BLOCKER items: rationale must be substantial (reference tests, architecture decisions, or constraints)
- For security BLOCKERs: always address unless there is an extremely strong justification; prefer to fix
- For non-blocking items: a reasonable one-line explanation suffices
- **Non-blocking deferral is valid** without creating another review cycle. A
   blocking deferral is acceptable only when this PR mitigates the merge risk;
   track remaining work when useful.

## Reviewer-Side Transitions

### Resolved → Verified

The reviewer verifies the fix in the delta diff:

1. Check the original Required Outcome and Done When
2. Accept any safe equivalent implementation that satisfies them
3. Confirm no regressions were introduced by the fix
4. Set status to `VERIFIED` and pending action to `CLOSE`

`RESOLVED` remains blocking until this verification succeeds.

### Verified → Closed

The posting workflow resolves the provider thread, records the completed action
ID, and only then changes canonical status to `CLOSED`.

### Won't Fix → Won't Fix Accepted

The reviewer evaluates the rationale:

1. For non-blocking items: accept if the rationale is reasonable
2. For BLOCKER items: accept if evidence disproves or fully mitigates the concrete merge risk
3. Set status to `WONT_FIX_ACCEPTED` and pending action to `CLOSE`

### Won't Fix Accepted → Closed

The posting workflow resolves the provider thread, records the completed action
ID, and only then changes canonical status to `CLOSED`.

### Resolved → Active (Reopen)

The reviewer finds the fix insufficient:

1. Reply once with the exact unmet Done When and supporting evidence
2. The thread remains Active (or is reopened)

### Won't Fix → Active (Reopen)

The reviewer rejects the rationale:

1. Reply explaining why the rationale is insufficient
2. For security BLOCKERs: default is to reopen unless the justification is compelling
3. The thread remains Active (or is reopened)

### Active → Handoff Required

After a second distinct author commit attempts but does not satisfy the same
stable `Done When`:

1. Set `authorAttemptCount` to 2 and store the source commit
2. Set status to `HANDOFF_REQUIRED` and pending action to `HANDOFF`
3. Add the remaining evidence to the canonical summary
4. Stop automated replies and new fix suggestions for this finding

Only a maintainer decision or new authoritative evidence can transition the
finding out of `HANDOFF_REQUIRED`.

## Rules

1. **Only the reviewer closes threads** — the developer never resolves or closes threads in ADO
2. **Security BLOCKERs get strictest treatment** — Won't Fix on a security BLOCKER requires detailed justification from the developer AND explicit acceptance from the reviewer
3. **Non-blocker Won't Fix is lightweight** — a reasonable one-line explanation is sufficient
4. **Optional feedback does not require tracking** — accept a reasonable deferral without another cycle. A blocker requires current mitigation before deferral can be accepted.
5. **Every reply uses the bot prefix** — `[<dev name>'s bot]` for developer replies
6. **Evidence over assertions** — "Fixed" must point to actual code changes; "Won't Fix" must provide technical reasoning
7. **Closure criteria stay stable** — re-reviews cannot require the reviewer's exact implementation or add new conditions without new evidence
8. **Stop repeated asynchronous debate** — after two unsuccessful author attempts on the same blocker, consolidate the remaining evidence and route the disagreement to a synchronous discussion or maintainer instead of starting a third AI loop
9. **Actions are explicit and single-use** — `POST`, `REPLY`, `CLOSE`, `HANDOFF`, or `NONE`; reset a successful action to `NONE` and never infer another action from an active status alone
10. **Provider actions are reconciled atomically** — comments carry a deterministic action marker; on success or recovery, one transition copies `actionId` to `lastCompletedActionId`, sets `pendingAction = NONE`, and sets `actionId = null`; retries record an already-present marker or already-closed thread instead of repeating the action
11. **Only closed blockers can approve** — `RESOLVED` is unverified, while `VERIFIED` and `WONT_FIX_ACCEPTED` still require successful provider closure and canonical-state persistence before an approval vote
12. **Terminal state is compact** — keep non-terminal records in full; archive `CLOSED` records with only finding/thread identity, blocker status, the UTC `closedAt` recorded immediately after provider closure succeeds, and `lastCompletedActionId`

## Question Thread Lifecycle

Question threads follow a separate, lightweight lifecycle. They are always
non-blocking and never affect the verdict.

### Question States

```text
            ┌──────────┐   author replies    ┌──────────┐   reviewer reads    ┌────────┐
            │ Question │ ──────────────────► │ Answered │ ──────────────────► │ Closed │
            └──────────┘                     └──────────┘                     └────────┘
                 │                                                                ▲
                 │  no answer needed                                              │
                 │  (answered by context)                                         │
                 └────────────────────────────────────────────────────────────────┘
```

### Question → Answered

The developer replies to the `[QUESTION]` thread:

```text
[<dev name>'s bot] Answer: <explanation of the intent/context>
```

Requirements:

- Any substantive reply counts as an answer — no minimum detail bar
- The answer should address the specific uncertainty raised

### Answered → Closed

The reviewer reads the answer and incorporates it into their review context:

1. If the answer resolves the uncertainty → close the thread
2. If the answer reveals a defect → the reviewer opens a NEW finding thread
   (the question thread is still closed — the finding is a separate concern)
3. Use `updatePullRequestThread` to close the thread

### Question → Closed (Direct)

The reviewer closes the question without an answer:

- The uncertainty was resolved by other context (e.g., another comment, the
  PR description was updated, a sibling PR clarified the intent)
- Use `updatePullRequestThread` to close the thread

### Re-Review Behavior

During re-review, follow the PR review plugin's Re-Review Workflow:

1. Check all `[QUESTION]` threads from the previous review
2. If answered → read the answer, incorporate into review context, close thread
3. If unanswered → the question remains open (non-blocking, does not affect verdict)
4. Answers may cause the reviewer to upgrade or downgrade findings from the
   previous review — this is the intended purpose of questions

### Question Rules

1. **Questions are ALWAYS non-blocking** — they never prevent approval or merge
2. **Questions never escalate to findings** — if an answer reveals a defect, open
   a separate finding thread with proper severity
3. **No "question fatigue"** — cap at 10 questions per review. If more exist,
   keep the highest-impact ones
4. **Questions use `[QUESTION]` tag** — this is how they're identified and
   distinguished from findings. The tag must appear immediately after the bot prefix.
