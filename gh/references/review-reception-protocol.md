# Review Reception Protocol

Use this protocol when processing GitHub pull request feedback. On GitHub,
actionable feedback can arrive as:

- review conversations on specific lines or files
- summary comments attached to a **Comment**, **Approve**, or **Request changes**
  review
- top-level PR comments in the conversation timeline

Treat unresolved review conversations and **Request changes** reviews as
actionable until you either fix the issue or rebut it with evidence. If a
reviewer points to a failing check, workflow, or annotation, inspect the exact
run or annotation before changing code.

## Response Pattern

**READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT**

1. **Read** the full feedback unit before reacting. On GitHub, that may mean the
   review summary plus all inline comments submitted with that review.
2. **Understand** — restate the technical requirement in your own words. If
   multiple comments are related, treat them as one review concern until you
   confirm otherwise.
3. **Verify** — check the suggestion against the current PR head:
   - is the comment based on stale diff context?
   - is the issue already fixed later in the PR?
   - does the referenced check, workflow, or annotation still fail on the
     latest commit?
4. **Evaluate** — is this technically sound for THIS codebase?
   - **YAGNI check**: If the reviewer suggests adding a feature or abstraction,
     search for actual usage first.
   - **Regression check**: Will this change break existing functionality?
   - **Context check**: Is the reviewer missing repo-specific context, or did
     you miss something linked from the PR description, issue, or prior thread?
5. **Respond** — either fix it or push back with technical reasoning grounded in
   the current diff, tests, checks, or architecture.
6. **Implement** — apply changes one concern at a time.

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
- Ask a specific clarifying question if needed
- Push back with technical reasoning when the suggestion is wrong
- Fix the issue and show the concrete result

**When feedback IS correct:**
```
Fixed. [Brief description of what changed]
Good catch - [specific issue]. Fixed in [location].
[Just fix it and show in the code]
```

## Handling Unclear Multi-Item Feedback

```
IF any item is unclear:
  STOP - do not partially implement linked items
  interactive mode: ask the user or reviewer for clarification
  autonomous mode: reply on the GitHub thread with the specific question,
                   or leave the item pending for human follow-up
```

**Why:** GitHub reviews often bundle several inline comments under one summary
review. Partial understanding leads to partial fixes and reopened reviews.

## Gracefully Correcting Your Pushback

If you pushed back and were wrong:
```
"You were right - I checked [X] and it does [Y]. Implementing now."
"Verified this against the latest PR head and you're correct. Fixing."
```

Do not write long apologies or defend the earlier pushback. State the corrected
fact and move on.

## Implementation Order

When addressing multiple review items, fix in this priority:
1. Blocking correctness or security issues
2. `Request changes` items tied to required checks, branch protection, or
   reviewer-blocking concerns
3. Simple fixes (typos, imports, naming, missing guards)
4. Complex fixes (refactoring, logic changes, broader cleanup)

## When to Push Back

Push back when:
- The suggestion breaks existing functionality
- The reviewer is commenting on stale diff context already fixed in the PR head
- The reviewer lacks full context from linked issues, prior comments, or repo
  conventions
- It violates YAGNI — adds unused features or premature abstractions
- It is technically incorrect for this stack or architecture
- It conflicts with prior architectural decisions

How to push back:
- Use technical reasoning, not defensiveness
- Reference the current diff, test evidence, failing/passing checks, or design
  constraints
- Ask a specific clarifying question if the reviewer intent is ambiguous

## Comment Categorization (Autonomous Mode)

When acting autonomously, classify each feedback item into one of these
dispositions:

### Resolve
Use when:
- It's a real bug, security issue, or missing error handling
- It's a meaningful improvement that benefits the codebase
- It fixes a correctness issue

Action:
- Fix the code
- Reply on the relevant GitHub conversation or PR comment with the bot prefix
- Resolve the conversation after replying **only if** the GitHub tooling and repo
  permissions support it; otherwise leave the reply for the reviewer to close

### Won't Fix (reply only)
Use when:
- The suggestion is already addressed elsewhere in the PR
- Implementing it would introduce a regression
- The reviewer misunderstood the code's intent or context
- It violates YAGNI — the feature or abstraction is not used
- It's a style preference with no functional impact

Action:
- Reply with technical explanation using the bot prefix
- For threaded conversations, leave the thread open unless your GitHub tooling
  supports resolving it after the rationale is posted and that matches repo
  norms

### Won't Fix (defer with follow-up issue)
Use when:
- The concern is valid but truly out of scope for the current PR
- The fix would require changes outside the files or behavior this PR should own
- The reviewer surfaced a broader pre-existing issue that deserves its own work
- The concern is important enough that dropping it would be negligent

Action:
- Create a follow-up GitHub issue
- Reply with a GitHub issue reference, for example:
  `[<dev name>'s bot] Won't Fix: Deferred to #456 for follow-up.`

**Default to Resolve** — only choose a Won't Fix path when there is a clear,
defensible technical reason.

## Feedback Type Handling

### Review conversations (line or file comments)

Follow the [Review Thread State Machine](review-thread-state-machine.md) for the
full lifecycle.

### Review summary comments and top-level PR comments

These do not always map to a resolvable conversation. Reply in the PR timeline
using the same `Fixed:` / `Won't Fix:` conventions, but do not invent a thread
state change that GitHub does not provide for that feedback type.

If the review state is **Request changes**, treat every unresolved actionable
point in that review as blocking until addressed or rebutted. GitHub branch
rules decide whether the review blocks merge technically, but autonomous triage
should still treat it as a blocking review state.

## Thread State Transitions (Developer Side)

### Transitioning to Resolved

When you fix code to address a GitHub review conversation:
1. Make the code change
2. Push the commit so the fix is visible in the PR head
3. Reply with: `[<dev name>'s bot] Fixed: <brief description of what changed>`
4. Resolve the conversation only when the toolchain supports it and you have
   permission; otherwise leave the reply and let the reviewer resolve it

### Transitioning to Won't Fix

When you decline a suggestion with a technical rationale:
1. Reply with: `[<dev name>'s bot] Won't Fix: <technical rationale>`
2. Rationale is **mandatory** — a bare "Won't Fix" is not acceptable
3. For deferred work, include the follow-up GitHub issue reference (`#123` or
   `owner/repo#123`)
4. For `[BLOCKER]` items, provide substantial justification grounded in tests,
   architecture, or constraints
5. For security `[BLOCKER]` items, prefer to fix rather than decline
6. For non-blocking items, a concise one-line explanation is usually enough

## BLOCKER Awareness

`[BLOCKER]` is a repo convention, not a native GitHub review state. Treat
comments tagged `[BLOCKER]` as merge-critical concerns from the reviewer:

- Prioritize `[BLOCKER]` items over non-blocking comments
- Be more conservative about Won't Fix on `[BLOCKER]` items
- Never Won't Fix a security `[BLOCKER]` without extremely strong justification
- Deferring with a follow-up GitHub issue reference is a valid Won't Fix
  rationale when the concern is real but out of scope

## Rules

- **Never resolve a conversation without evidence** — only resolve after a code
  change is pushed or a rationale is posted
- **Always provide evidence** — `Fixed:` must point to actual code changes;
  `Won't Fix:` must provide technical reasoning
- **Use the standard reply format** — always prefix with `[<dev name>'s bot]`
  followed by `Fixed:` or `Won't Fix:`
- **Use GitHub issue references consistently** — defer to `#123` or
  `owner/repo#123`
- **Re-request review when appropriate** — after addressing a `Request changes`
  review, use the repo's normal GitHub workflow to signal the reviewer that the
  PR is ready again
