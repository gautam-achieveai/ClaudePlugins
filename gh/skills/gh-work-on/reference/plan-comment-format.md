# Plan Comment Format

This reference defines the format for implementation plans posted to GitHub issue
comments. The format is both human-readable (Markdown) and machine-parseable
(HTML comment markers).

## Comment Template

```markdown
<!-- BOT-PLAN v1 status:PENDING_REVIEW -->

[<dev>'s bot] **Implementation Plan for #<id>: <title>**

## Understanding

**Type:** <Bug | Task | Feature>
**Summary:** <1-3 sentence summary of what needs to be done>
**Root Cause:** <for bugs only - what is causing the issue>
**Acceptance Criteria:**
1. <criterion from the issue body, project item, or linked spec>
2. <criterion from the issue body, project item, or linked spec>

## Approach

**Strategy:** <1-2 sentence description of the chosen approach>

**Alternatives Considered:**
- <alternative 1>: <why rejected>
- <alternative 2>: <why rejected>

## Implementation Steps

1. **<action> `<file path>`** — <description of change>
2. **<action> `<file path>`** — <description of change>
3. ...

## Test Strategy

- <what tests will be written or modified>
- <how acceptance criteria will be verified>

## Verification Plan

- `<build command>` succeeds
- `<test command>` passes
- Acceptance criterion 1: <how verified>
- Acceptance criterion 2: <how verified>

## Files to Change

| File | Action | Description |
|------|--------|-------------|
| `path/to/file.cs` | Modify | <what changes> |
| `path/to/test.cs` | Add | <new test file> |

---
*Reply to this comment with feedback, or say "approved" / "LGTM" to proceed
with implementation.*

<!-- /BOT-PLAN -->
```

## Marker Format

### Opening Marker

```
<!-- BOT-PLAN v<N> status:<STATUS> [type:<TYPE>] -->
```

- **`v<N>`** — Version number, starting at `v1`. Incremented on each revision.
- **`status`** — One of:
  - `PENDING_REVIEW` — Plan posted, awaiting human feedback
  - `APPROVED` — Human approved (updated when execution begins)
  - `EXECUTING` — Implementation in progress
- **`type`** (optional) — One of:
  - `RCA` — Root Cause Analysis for bugs. Uses the format in
    [rca-comment-format.md](rca-comment-format.md).
  - Omitted — Standard implementation plan (default for features/tasks).

### Closing Marker

```
<!-- /BOT-PLAN -->
```

Always present at the end of the plan comment.

### Version Numbering

- First plan posted → `v1`
- First revision after feedback → `v2`
- Second revision → `v3`
- After `v3`, the plan is final — proceed to execution regardless of further
  feedback (see revision cap in SKILL.md)

## Required Sections

Every plan comment MUST include these sections:

| Section | Required For | Purpose |
|---------|-------------|---------|
| Understanding | All | Confirms the bot interpreted the work item correctly |
| Approach | All | Design decision with alternatives considered |
| Implementation Steps | All | Ordered list of code changes |
| Test Strategy | All | What tests prove the change works |
| Verification Plan | All | Build + test commands + acceptance criteria mapping |
| Files to Change | All | Quick-scan table of file-level impact |
| Root Cause | Bugs only | What is causing the defect (see [rca-comment-format.md](rca-comment-format.md) for the full bug template) |
| Alternatives Considered | Features | Why this approach over others |

## Parsing Instructions

When re-entering `/gh-work-on <id>` (Part 2), the bot must find and parse the
latest plan:

### Finding the Latest Plan

1. Fetch issue comments (chronologically ordered)
2. Scan each comment body for `<!-- BOT-PLAN v` prefix
3. Extract version number from each match
4. Select the comment with the highest version number
5. Extract the plan content between `<!-- BOT-PLAN ... -->` and `<!-- /BOT-PLAN -->`

### Finding Human Feedback

1. Note the timestamp of the latest BOT-PLAN comment
2. Collect all comments posted AFTER that timestamp
3. Filter out comments with `[bot]` in the text (automated replies)
4. Remaining comments are human feedback

## Approval Detection

### Approval Signals (case-insensitive)

Any of these in a human comment after the plan = **APPROVED**:

```
approved, lgtm, looks good, go ahead, proceed, ship it,
greenlight, good to go, let's do it, start implementation
```

### Feedback Signals

Any substantive comment that does NOT match an approval signal = **FEEDBACK**.
Substantive means more than just an emoji reaction — it contains words or
sentences providing direction.

### Decision Algorithm

```
1. Find latest BOT-PLAN comment
2. Collect human comments after it
3. If NO human comments:
   → AWAITING REVIEW — present plan summary via HITL and ask for explicit approval
     (Do NOT assume silence means approval)
4. If human comments exist:
   a. Check latest human comment for approval signals
   b. If approval signal present AND no contradicting feedback → APPROVED
   c. If feedback/questions/concerns present → FEEDBACK (revise)
   d. If ambiguous → default to FEEDBACK (safer)
```

### Explicit Approval via HITL

When the user re-runs `/gh-work-on <id>` and there are zero human comments after
the latest bot plan comment, the agent MUST still present the plan summary and
ask the user via HITL before proceeding. The agent never assumes that a re-run
alone signals approval — explicit confirmation through the HITL checkpoint is
always required.

## CTA (Call-to-Action) Template

Every plan comment ends with this CTA before the closing marker:

```markdown
---
*Reply to this comment with feedback, or say "approved" / "LGTM" to proceed
with implementation.*
```

For revision comments (v2+), adjust the CTA:

```markdown
---
*This is revision v<N> incorporating your feedback. Reply with further feedback,
or say "approved" / "LGTM" to proceed with implementation.*
```

For final revision (v3):

```markdown
---
*This is the final revision (v3). Implementation will proceed on the next run
of `/gh-work-on <id>` regardless of further feedback.*
```
