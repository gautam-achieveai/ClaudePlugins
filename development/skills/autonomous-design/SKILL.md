---
name: autonomous-design
description: >
  Non-interactive design workflow for autonomous contexts (e.g., namespaced
  `ado-work-on` / `gh-work-on` flows such as `ado:ado-work-on` or
  `gh:gh-work-on`). Mirrors
  brainstorming methodology but auto-selects the best approach instead of
  requiring user approval. Use when designing features/tasks without
  interactive user feedback — requirements come from tracked work items/issues,
  specs, or task descriptions rather than live conversation.
---

# Autonomous Design

## Overview

Design a solution without interactive user approval. Requirements come from
structured sources (tracked work items/issues, specs, acceptance criteria)
rather than live conversation.

This is the autonomous counterpart to `development:brainstorming`. Use
brainstorming when a user is in the loop; use this skill when operating
autonomously inside a namespaced workflow (e.g., `ado:ado-work-on` or
`gh:gh-work-on`).

When similarly named workflows exist in multiple plugins, keep the namespace so
the target system stays explicit.

<KEY-DIFFERENCE>
`development:brainstorming` has a HARD-GATE requiring user approval.
This skill auto-selects the best approach based on simplicity and pattern
consistency. There is no interactive approval step.
</KEY-DIFFERENCE>

## When to Use

- Autonomous workflows where no user is available for interactive design review
- Work item or issue implementation (requirements come from the tracked ticket
  description)
- Batch processing where designs must be produced without human-in-the-loop

## The Process

### Step 1: Requirements Extraction

List all functional requirements from the available context:
- Work item or issue description and acceptance criteria
- Task specification or ticket content
- Any linked documents or referenced specs

Note any ambiguities — these become assumptions to document.

### Step 2: Codebase Reconnaissance

Use Grep/Glob/Read to understand the relevant code area. Identify:
- **Existing patterns** — how similar features are implemented
- **Files to modify** — what will need changes
- **Related tests** — test patterns and test framework conventions
- **Impact areas** — callers, consumers, downstream effects

### Step 3: Approach Formulation

Propose 2-3 approaches. For each:
- Describe the approach in 1-2 sentences
- List pros and cons
- Estimate complexity (files touched, risk level)

### Step 4: Auto-Selection

Choose the approach that best balances:
1. **Simplicity** — fewer moving parts, less code
2. **Pattern consistency** — follows existing codebase conventions
3. **Completeness** — addresses all requirements without gaps

Document the reasoning for the selection.

### Step 5: Decision Logging

Append to the decision log (if one exists):

```markdown
## Design Decision
- **Chosen approach**: <approach description>
- **Rationale**: <why this over alternatives>
- **Alternatives rejected:**
  - <alternative>: <why rejected>
- **Assumptions**: <any ambiguities resolved by assumption>
```

## Output

The output of this skill is a design decision ready to feed into an
implementation plan. The calling skill (e.g., `ado:ado-work-on` or
`gh:gh-work-on`) takes this output and proceeds to plan creation.

## Key Principles

- **No interactive gates** — this skill never asks the user for approval
- **Document assumptions** — since there's no user to clarify, log what you assumed
- **Favor simplicity** — when in doubt, choose the simpler approach
- **Follow existing patterns** — consistency with the codebase beats novelty
- **YAGNI** — do not propose features beyond what the requirements specify
