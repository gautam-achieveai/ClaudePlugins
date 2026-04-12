# Review Reception Protocol

Follow this pattern when processing reviewer feedback on a PR. The same protocol
applies whether you are interactive (confirming with the user) or autonomous
(acting independently) — only the confirmation step differs.

## Response Pattern

**READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT**

1. **Read** the comment completely without reacting.
2. **Understand** — restate the technical requirement in your own words. If
   unclear, ask for clarification before implementing anything. Do not
   partially implement when some items are ambiguous.
3. **Verify** — check the suggestion against the codebase. Does the
   reviewer's assumption hold? Is the current implementation intentional?
4. **Evaluate** — is this technically sound for THIS codebase?
   - **YAGNI check**: If the reviewer suggests adding a feature or
     abstraction, grep for actual usage. If unused, flag it: "This isn't
     called anywhere — should we add it?"
   - **Regression check**: Will this change break existing functionality?
   - **Context check**: Does the reviewer have full context, or are they
     missing something?
5. **Respond** — either propose a fix, or push back with technical reasoning
   (reference working tests, code paths, or architectural decisions).
6. **Implement** — apply changes one at a time.

## Forbidden Responses

Code review requires technical evaluation, not emotional performance.

**NEVER use:**
- "You're absolutely right!"
- "Great point!" / "Excellent feedback!"
- "Thanks for catching that!"
- "Let me implement that now" (before verification)
- ANY gratitude expression

**INSTEAD:**
- Restate the technical requirement
- Ask clarifying questions if unclear
- Push back with technical reasoning if wrong
- Just start working (actions > words)

**When feedback IS correct:**
```
Fixed. [Brief description of what changed]
Good catch - [specific issue]. Fixed in [location].
[Just fix it and show in the code]
```

**Why no thanks:** Actions speak. Just fix it. The code itself shows you heard the feedback.

## Handling Unclear Multi-Item Feedback

```
IF any item is unclear:
  STOP - do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**Example:**
```
Reviewer gives feedback items 1-6.
You understand 1,2,3,6. Unclear on 4,5.

WRONG: Implement 1,2,3,6 now, ask about 4,5 later
RIGHT: "Understand 1,2,3,6. Need clarification on 4 and 5 before implementing."
```

## Gracefully Correcting Your Pushback

If you pushed back and were wrong:
```
"You were right - I checked [X] and it does [Y]. Implementing now."
"Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."
```
Do NOT write long apologies or defend why you pushed back. State the correction factually and move on.

## Implementation Order

When addressing multiple comments, fix in this priority:
1. Blocking issues (breaks, security vulnerabilities)
2. Simple fixes (typos, imports, naming)
3. Complex fixes (refactoring, logic changes)

## When to Push Back

Push back when:
- The suggestion breaks existing functionality
- The reviewer lacks full context (e.g., misses a related change in another file)
- It violates YAGNI — adds unused features or premature abstractions
- It is technically incorrect for this stack or architecture
- It conflicts with prior architectural decisions

How to push back:
- Use technical reasoning, not defensiveness
- Reference working tests, code paths, or design constraints
- Ask specific clarifying questions if uncertain

**YAGNI check for "professional" features:**
If a reviewer suggests "implementing properly" or adding abstractions:
1. Grep codebase for actual usage
2. If unused: "This endpoint/feature isn't called anywhere. Remove it (YAGNI)?"
3. If used: Then implement properly

## Comment Categorization (Autonomous Mode)

When acting autonomously (no user confirmation), categorize each comment:

### Won't Fix
Use when:
- The suggestion is already addressed elsewhere in the PR
- Implementing it would introduce a regression
- The reviewer misunderstood the code's intent or context
- It violates YAGNI — the feature/abstraction isn't used
- It's a style preference with no functional impact

Action: Reply with technical explanation and `[<developer name>'s bot]` prefix.

### Needs Addressing (Resolve)
Use when:
- It's a real bug, security issue, or missing error handling
- It's a meaningful improvement that benefits the codebase
- It fixes a correctness issue

Action: Fix the code, reply explaining the change with bot prefix.

> **Terminology note**: The `ado-babysit-pr-worker` agent uses "Resolve" for this
> disposition. "Needs Addressing" and "Resolve" are interchangeable — both mean
> "fix the code to address the reviewer's comment."

**Default to addressing** — only classify as Won't Fix when there's a clear
technical reason.

## Thread State Transitions (Developer Side)

Follow the [Review Thread State Machine](review-thread-state-machine.md) for the
full lifecycle. Summary of developer-side transitions:

### Transitioning to Resolved

When you fix the code to address a reviewer's comment:
1. Make the code change
2. Reply with: `[<dev name>'s bot] Fixed: <brief description of what was changed>`
3. The reply must describe what was done — not just "fixed"

### Transitioning to Won't Fix

When you decline a suggestion with a technical rationale:
1. Reply with: `[<dev name>'s bot] Won't Fix: <technical rationale>`
2. Rationale is **mandatory** — a bare "Won't Fix" is not acceptable
3. For `[BLOCKER]` items: provide substantial justification (reference tests,
   architecture decisions, or constraints). Be more conservative — default to
   fixing BLOCKERs unless there is a strong reason not to.
4. For security `[BLOCKER]` items: **always address** unless there is an
   extremely strong justification. Prefer to fix over Won't Fix.
5. For non-blocking items (no `[BLOCKER]` tag): a reasonable one-line explanation suffices
6. **Deferral is valid**: Won't Fix with a deferred work item/bug ID is acceptable
   (e.g., `Won't Fix: Deferred to #4567 for follow-up`)

### BLOCKER Awareness

Review comments tagged `[BLOCKER]` indicate the reviewer considers the issue
mandatory for merge. When processing comments:
- Prioritize `[BLOCKER]` items over non-blocking items (no tag)
- Be more conservative about Won't Fix on `[BLOCKER]` items
- Never Won't Fix a security `[BLOCKER]` without user approval (in interactive
  mode) or extremely strong justification (in autonomous mode)
- Deferring with a work item/bug ID is a valid Won't Fix rationale

### Rules

- **Never close or resolve threads yourself** — only the reviewer closes threads
- **Always provide evidence** — "Fixed" must point to actual code changes;
  "Won't Fix" must provide technical reasoning
- **Use the standard reply format** — always prefix with `[<dev name>'s bot]`
  followed by `Fixed:` or `Won't Fix:`
