# Decision Log Guide

Throughout the workflow, maintain a running decision log in the scratchpad at
`scratchpad/conversation_memories/<work-item-id>-<slug>/decisions.md`. This
log serves two purposes:
1. **Bridge Part 1 → Part 2** — persists design context across separate
   conversation sessions.
2. **PR reviewer context** — key decisions are included in the PR description.

---

## Step D.0: Initialize the log

At the start of Part 1 Phase 1.1 (after extracting the work item ID and title),
create the decision log file using the **Write** tool:

**Path:** `scratchpad/conversation_memories/<id>-<slugified-title>/decisions.md`

**Initial content:**
```markdown
# Decision Log — Work Item #<id>: <title>
Date: <today>
```

## Step D.1: Log at each phase

Use the **Edit** tool to append entries after each key decision point:

| Phase | What to log |
|-------|-------------|
| Part 1, Phase 1.1 | Understanding of the work item, ambiguities noted |
| Part 1, Phase 1.2-Bug (Stage A) | Reproduction steps, log files collected, DuckDB queries run |
| Part 1, Phase 1.2-Bug (Stage B) | Root cause statement, evidence chain, affected code |
| Part 1, Phase 1.2-Bug (Stage C) | Adversarial critique results — dismissed alternatives, closed gaps, open questions |
| Part 1, Phase 1.2-Feature | Chosen design approach, alternatives considered with reasons for rejection |
| Part 1, Phase 1.3 | Plan trade-offs — why certain files/approaches were chosen over others |
| Part 1, Revision | Feedback received, how it was addressed, what was kept |
| Part 2, Phase 2.3 | Implementation decisions — library choices, pattern selections, edge cases handled, deviations from plan with justification |
| Part 2, Phase 2.3 (failures) | Each debugging attempt — what was tried, what was learned, what was ruled out |
| Part 2, Phase 2.4 | Self-review findings per cycle, fixes applied, items deferred |
| Part 2, Phase 2.5 | Verification evidence — what passed, what was manually checked |

**Entry format** (append under the relevant phase heading):
```markdown
## <Part> — <Phase Name>
- **<decision>**: <rationale>
```

## Step D.2: Include in PR description

When creating the PR description (Part 2, Phase 2.6), read the decision log
file and include a "Key Decisions" section summarizing the 3-5 most important
entries so reviewers have context without needing to find the log.
