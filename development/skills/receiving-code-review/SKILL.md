---
name: receiving-code-review
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: true
disable-model-invocation: false
---

# Acting on Code Review Feedback

## Overview

Code review feedback is a list of **suggestions to evaluate, not orders to follow.**

Two independent judgments run on every item:

1. **Is it real and worth addressing?** → severity × cost **triage**.
2. **Is the suggested fix right for THIS codebase?** → practicality + alignment **grade**.

**Core principle:** Verify before implementing. Triage before acting. Technical correctness over social comfort. No performative agreement.

## The Response Pattern

```
WHEN receiving code review feedback:

1. READ:      Take in the complete feedback without reacting
2. UNDERSTAND: Restate each item in your own words (or ask if unclear)
3. VERIFY:    Check each claim against codebase reality
4. TRIAGE:    Assign severity, estimate cost, decide address / defer
5. GRADE:     Practicality + alignment — raise conflicts BEFORE fixing
6. RESPOND:   Technical acknowledgment, reasoned pushback, or deferral note
7. IMPLEMENT: Must-fix first, one item at a time, test each
```

If ANY item is unclear, STOP — do not implement anything yet. Items may be related; partial understanding produces wrong implementation. Clarify all unclear items first.

## Calibrate Skepticism to the Source

How hard you verify before acting scales with **who** gave the feedback:

- **Your human partner / the user (direct instruction):** Trusted. Implement after understanding — still ask if scope is unclear, still triage what's worth it, but do not treat their directives with adversarial skepticism. Their instructions outrank a reviewer's suggestion.
- **External or automated reviewers (PR bots, AI reviewers, drive-by comments):** Be skeptical and verify carefully. They frequently **lack full project context** — history, constraints, prior decisions. Run the practicality/alignment gate before implementing anything.
- **Conflict:** If external feedback contradicts a decision your human partner already made, STOP and discuss with them — do not silently implement the reviewer's version.

## Triage — What's Worth Addressing

The whole point of this skill: **not every valid suggestion is worth implementing.** Match effort to impact.

### Step 1 — Classify severity

Use the standard severity ladder (same vocabulary as the code-reviewer plugin):

| Severity | Meaning |
|----------|---------|
| **Critical / Blocker** | Must not ship: breaks the build, data loss/corruption, security hole, broken core behavior, regression. "Blocker" = blocks merge/release regardless of nominal severity. |
| **High** | Serious correctness, reliability, or maintainability problem that will bite soon — but doesn't strictly block this merge. |
| **Medium** | Real improvement: a latent edge case, missing test, awkward abstraction, minor perf issue. |
| **Low** | Nit: naming, style, a clearer line, a typo in a comment. |

### Step 2 — Estimate cost

Cost = lines changed **plus** review/test/regression risk and blast radius. A 5-line change that touches a serialization contract is not "cheap." Line counts below are a **rough signal of cost, not a hard cutoff** — use judgment on edge cases.

### Step 3 — Apply the decision matrix

| Severity | Address it? | Cost ceiling |
|----------|-------------|--------------|
| **Critical / Blocker** | **Always.** | None. Fix irrespective of cost. |
| **High** | **Almost always.** | Fix even when the change is large — up to roughly half the effort of the original work. Defer only if the cost is wildly disproportionate (e.g. a near-rewrite), and then **escalate explicitly** — never silently. |
| **Medium** | **Only if cheap.** | ~1-30 LOC (rough signal). If it balloons past that, defer and surface it. |
| **Low** | **Only if trivial.** | ~1-3 LOC (rough signal). Anything more, defer. |

### Deferring is a decision, not silence

When you defer a Medium/High/Low because cost exceeds its ceiling, **say so** — don't quietly skip it:

```
✅ "Deferred — Medium severity but ~120 LOC across the cache layer.
    Out of proportion for the payoff. Tracking as follow-up: <where>."
✅ "High but a near-rewrite of the auth module (~3 days). Flagging for
    explicit decision before I take it on — fix now or schedule separately?"
```

Silently dropping a finding reads as "I missed it." A one-line deferral note shows you triaged it deliberately.

## The Practicality & Alignment Gate

Severity/cost decides **whether the underlying issue is worth addressing.** This gate decides **whether the reviewer's specific suggested fix is the right way to address it.** It applies to **every** item — including must-fix ones.

Before implementing any suggestion, grade it:

```
1. PRACTICAL?  Technically correct for THIS codebase, stack, versions, platforms?
2. ALIGNED?    Consistent with the project's goals, architecture, and existing
               coding practices/patterns?
3. NET-POSITIVE? Does it leave the code better, or just "different"?
```

**If a suggestion is good in the abstract but conflicts with project goals or existing practice → RAISE it before fixing.** Do not silently implement a misaligned fix, and do not silently ignore a real problem.

- The **issue** is a real Critical bug, but the **suggested fix** clashes with the codebase's conventions → still fix the bug, but propose an aligned alternative and say why you diverged.
- The suggestion would introduce an unused "professional" feature → run a YAGNI check (`grep` for actual usage). If unused: "Nothing calls this — implement it (YAGNI), or drop?"
- The suggestion contradicts a prior architectural decision → stop and discuss before acting.

```
✅ "Agree the null path is a real bug (Critical). The suggested try/catch
    swallows it though — this codebase surfaces failures via Result<T>.
    Fixing with that pattern instead."
✅ "Valid point, but our convention is X for a reason: <reason>. Implementing
    it the suggested way would fight the rest of the module. Keep as-is, or
    change the convention project-wide?"
```

## No Performative Agreement

**NEVER:**
- "You're absolutely right!" (explicit CLAUDE.md violation)
- "Great point!" / "Excellent feedback!" / "Thanks for catching that!" — any praise or gratitude
- "Let me implement that now" — before verification and triage

**INSTEAD:** Restate the technical requirement, ask a clarifying question, push back with reasoning, or just fix it and show the change. Actions speak — the code shows you heard the feedback. If you catch yourself about to write "Thanks," delete it and state the fix.

## When To Push Back

Push back — with technical reasoning, not defensiveness — when the suggestion:
- Breaks existing functionality or has a legacy/compatibility reason for the current code
- Is technically incorrect for this stack/platform/version
- Violates YAGNI (unused feature)
- Conflicts with a prior architectural decision
- Comes from a reviewer who lacks full project context (history, constraints, prior decisions)
- Is below its cost-justified threshold (a 200-line Low)

How: reference working tests/code, ask specific questions, propose the aligned alternative. If you pushed back and were wrong: `"You were right — checked X, it does Y. Implementing now."` State the correction factually and move on. No long apology, no defending the pushback.

If you can't verify a claim: say so — `"I can't verify this without <X>. Investigate, ask, or proceed?"` Don't proceed on an unverified assumption.

## Implementation Order

Once triage and grading are done, implement in this order:

```
1. Clarify anything still unclear (already done in step 3 — confirm).
2. Critical / Blocker fixes (breaks, security, data loss).
3. High fixes.
4. Cheap Medium / Low fixes that passed the gate.
5. Test each fix individually; verify no regressions before the next.
```

One item at a time. Batching changes without testing each hides which one broke things.

## Acknowledging Correct Feedback

```
✅ "Fixed. <brief description of what changed>"
✅ "Good catch — <specific issue>. Fixed in <location>."
✅ [Just fix it and show it in the code]

❌ "You're absolutely right!" / "Great point!" / "Thanks for catching that!"
```

## GitHub / Azure DevOps Thread Replies

When replying to inline review comments, reply **in the comment thread**, not as a top-level PR comment:
- GitHub: `gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`
- Azure DevOps: reply to the thread via the PR thread API / MCP `replyToComment`.

## The Bottom Line

**Triage decides what to spend effort on. The gate decides how to do it right.**

Critical/Blocker always. High even when it hurts. Medium and Low only when they're cheap — and a deferral is a stated decision, never silence. Verify every claim, grade every suggestion against this codebase's goals and practice, and push back when something is wrong or misaligned.

Verify. Triage. Question. Then implement.
