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

### Needs Addressing
Use when:
- It's a real bug, security issue, or missing error handling
- It's a meaningful improvement that benefits the codebase
- It fixes a correctness issue

Action: Fix the code, reply explaining the change with bot prefix.

**Default to addressing** — only classify as Won't Fix when there's a clear
technical reason.
