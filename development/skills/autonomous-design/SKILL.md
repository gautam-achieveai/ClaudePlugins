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
- `code-reviewer:pr-context-gatherer` to extract context from related work items, PRs, or issues.

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

### Step 6: Design-Review Gate (MANDATORY — before finalizing)

<design_review_gate>
This is a **hard gate**: pressure-test the chosen approach BEFORE it is
finalized and handed off. Do NOT skip it because the change looks small —
this is where over-engineering, design-pattern smells, and blind spots get
caught while they are still cheap to fix.

Dispatch reviewers in parallel across **two tracks**, then triage.

**Track 1 — Structured design reviewers** (`code-reviewer:*` agents). At design
time there is no diff, so run only the ones that can reason about the *described*
approach — skip an agent whose trigger surface (schema, hot path, new type) the
design doesn't actually name:

- `code-reviewer:architecture-review` — layer boundaries, dependency
  direction, SOLID, coupling, DI patterns; flags structural risks early
- `code-reviewer:over-engineering-review` — compares the proposed scope
  against the stated intent; flags speculative abstractions, unrequested
  features, premature optimization, and other YAGNI violations
- `code-reviewer:class-design-simplifier` — over-abstracted hierarchies,
  unnecessary layers, premature generalization, and other design-pattern
  complexity in the proposed types/components
- `code-reviewer:feature-flag-reviewer` — assesses blast radius,
  reversibility, and change type to recommend whether the change should
  ship behind a feature flag
- `code-reviewer:schema-compatibility-review` — when the design touches
  schemas, DTOs, migrations, queue payloads, or any wire-contract surface;
  catches forward/backward compat breaks and rollout-sequencing risks
- `code-reviewer:performance-review` — when the design touches hot paths,
  large collections, async/concurrency, caching, or data-access patterns

**Track 2 — Blind-spot (adversarial) critique.** Dispatch 2-3 `Explore` agents
in parallel, each acting as a devil's advocate against the chosen approach.
Their job is to find what the design MISSED, not to confirm it. Each should
attack a different angle:

- **Alternatives** — is there a simpler/safer approach that was dismissed too
  quickly? What would a skeptic pick instead, and why?
- **Requirements & edge cases** — which acceptance criteria, error paths,
  concurrency/ordering cases, or failure modes does the approach not cover?
- **Blast radius & coupling** — what existing callers, consumers, data, or
  invariants does this silently affect? What breaks if an assumption is wrong?

(This mirrors the Bug RCA adversarial review used elsewhere in the work-on flow.)

**Triage and loop.** Collect all findings and classify by severity:

- **BLOCKER / HIGH** — the chosen approach is wrong, materially over-engineered,
  breaks compatibility, or misses a requirement. **Return to Step 3/4**, revise
  or re-select the approach, and re-run this gate. Cap at **2 revision rounds**;
  if still contested after 2, record the trade-off in the decision log and pick
  the lower-risk option.
- **MEDIUM / LOW** — fold the fix into the design decision and note it; no
  re-run required.

Record the gate outcome (which reviewers ran, key findings, what changed) in the
decision log so the rationale survives into the plan and PR.
</design_review_gate>

Note: there is no dedicated design-time security reviewer in the
code-reviewer plugin — security concerns are evaluated at code-review time
via the `pr-review` skill's OWASP checklist. If the design has obvious
security implications (authentication, authorization, crypto, payment, PII
handling), surface them explicitly in the design decision so they're not
discovered late.

### Step 7: Implementation Handoff

Apply the gate's feedback, finalize the design decision, and hand it back to the
calling workflow. This skill produces a **design decision, not code** — it does
not implement. The caller turns the design into a concrete plan and then
executes:

- **`development:work-on`** (used by `ado:ado-work-on` and `gh:gh-work-on`):
  the design decision feeds **Phase 1.2-Feature Stage B**, where a Plan subagent
  details it into a file-by-file implementation plan; implementation then runs in
  **Phase 2**, which delegates to the [`development:implement`](../implement/SKILL.md) skill.
- **Any other caller**: hand off the design decision plus the decision-log path
  to that workflow's planning/implementation step.

## Output

The output of this skill is a **review-vetted design decision** (chosen approach,
rationale, rejected alternatives, assumptions, and the design-review gate
outcome) ready to feed into an implementation plan. The calling skill (e.g.,
`development:work-on` via `ado:ado-work-on` or `gh:gh-work-on`) takes this output
and proceeds to plan creation.

## Key Principles

- **No interactive gates** — this skill never asks the user for approval
- **Document assumptions** — since there's no user to clarify, log what you assumed
- **Favor simplicity** — when in doubt, choose the simpler approach
- **Follow existing patterns** — consistency with the codebase beats novelty
- **YAGNI** — do not propose features beyond what the requirements specify
- **Tribal Knowledge** — Tap into clarifying questions for the developer (at the end of the plan), to capture any tribal knowledge that may not be in the codebase but is relevant to the design decision.
