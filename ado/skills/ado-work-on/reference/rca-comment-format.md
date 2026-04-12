# RCA Comment Format

This reference defines the format for Root Cause Analysis comments posted to
Azure DevOps work item comments when the work item is a **Bug**. It extends the
standard [plan-comment-format.md](plan-comment-format.md) with bug-specific
sections.

## Comment Template

```markdown
<!-- BOT-PLAN v1 status:PENDING_REVIEW type:RCA -->

[<dev>'s bot] **Root Cause Analysis & Fix Plan for #<id>: <title>**

## Reproduction

**Steps to reproduce:**
1. <exact step>
2. <exact step>
3. <observe: expected vs actual>

**Reliability:** <Always / Intermittent (N/M runs) / Environment-specific>

## Evidence Chain

| # | Source | Timestamp / Location | Finding |
|---|--------|---------------------|---------|
| 1 | Log | <timestamp> | <what the log entry shows> |
| 2 | Log | <timestamp> | <what the next entry shows> |
| 3 | Code | `<file>:<line>` | <what the code does at this point> |
| 4 | Query | DuckDB | <what the SQL query revealed> |

<Include the actual DuckDB SQL queries used, collapsed for readability:>

<details>
<summary>DuckDB queries used</summary>

\`\`\`sql
-- Query 1: <purpose>
SELECT ... FROM read_json_auto('...') WHERE ...;

-- Query 2: <purpose>
SELECT ... FROM read_json_auto('...') WHERE ...;
\`\`\`

</details>

## Root Cause

**<One sentence: what is broken and why>**

<2-3 sentence explanation linking the evidence chain to the root cause.
Every claim must reference a numbered evidence entry above.>

**Affected code:**
- `<file>:<line>` — <what this code does wrong>
- `<file>:<line>` — <related site, if any>

## Adversarial Review

This RCA was reviewed by <N> critique agents before posting:

- **Alternative hypotheses:** <dismissed / one addressed — brief summary>
- **Evidence completeness:** <no gaps / gaps closed — brief summary>
- **Scope check:** <contained / additional paths found — brief summary>

<If open questions remain after 2 critique rounds:>

**Open questions:**
- <question that could not be fully resolved from available evidence>

## Proposed Fix

**Strategy:** <1-2 sentence description of the fix approach>

### Implementation Steps

1. **<action> `<file path>`** — <description of change>
2. **<action> `<file path>`** — <description of change>
3. ...

### Regression Test

- <test that reproduces the bug — should fail before fix, pass after>
- <additional tests if blast radius was identified>

## Verification Plan

- `<build command>` succeeds
- `<test command>` passes (including new regression test)
- Original reproduction steps no longer trigger the bug
- <acceptance criteria from work item, if any>

## Files to Change

| File | Action | Description |
|------|--------|-------------|
| `path/to/file.cs` | Modify | <fix description> |
| `path/to/test.cs` | Add | <regression test> |

---
*Reply to this comment with feedback, or say "approved" / "LGTM" to proceed
with implementation.*

<!-- /BOT-PLAN -->
```

## Marker Format

RCA comments use the standard BOT-PLAN markers with an additional `type`
attribute:

### Opening Marker

```
<!-- BOT-PLAN v<N> status:<STATUS> type:RCA -->
```

- **`v<N>`** — Version number, starting at `v1`. Incremented on each revision.
- **`status`** — Same values as standard plans: `PENDING_REVIEW`, `APPROVED`,
  `EXECUTING`.
- **`type:RCA`** — Identifies this as a Root Cause Analysis (vs a standard
  implementation plan). Informational for the execution phase (Part 2) — the
  auto-detect logic does not use this attribute (it matches on `BOT-PLAN v`
  prefix only).

### Closing Marker

Same as standard plans:
```
<!-- /BOT-PLAN -->
```

## Required Sections (Bug RCA)

Every RCA comment MUST include these sections:

| Section | Purpose |
|---------|---------|
| Reproduction | Exact steps to trigger the bug — proves it's real and reproducible |
| Evidence Chain | Numbered log entries, code references, and query results — the proof |
| Root Cause | Single-sentence diagnosis grounded in evidence — not speculation |
| Adversarial Review | Summary of critique agent findings — shows rigor |
| Proposed Fix | Implementation steps to address the root cause |
| Regression Test | Test that proves the fix works |
| Verification Plan | Build + test commands + acceptance criteria |
| Files to Change | Quick-scan table of file-level impact |

### Optional Sections

| Section | When to include |
|---------|----------------|
| Open Questions | When critique rounds surfaced unresolved concerns |
| Blast Radius | When the same flaw exists in other code paths |
| Alternatives Considered | When multiple fix strategies were evaluated |

## Revision CTA Templates

For revision comments (v2+):
```markdown
---
*This is revision v<N> incorporating your feedback on the root cause analysis.
Reply with further feedback, or say "approved" / "LGTM" to proceed with
implementation.*
```

For final revision (v3):
```markdown
---
*This is the final revision (v3) of the root cause analysis. Implementation
will proceed on the next run of `/ado-work-on <id>` regardless of further feedback.*
```

## Parsing Instructions

The auto-detect logic in SKILL.md parses RCA comments identically to standard
plan comments — the `BOT-PLAN` marker prefix is the same. The `type:RCA`
attribute is informational for the execution phase (Part 2) to know it's
working from a debugged root cause rather than a design plan.
