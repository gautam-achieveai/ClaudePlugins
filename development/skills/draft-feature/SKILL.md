---
name: draft-feature
description: >
  Deep requirements workflow for a NEW FEATURE or user story. Gathers codebase
  and prior-art context, loops through clarification, dispatches blind-spot and
  over-engineering review agents, and composes well-grounded requirements
  (Summary / Value / Acceptance Criteria) ready to post. Used by the
  development:draft-work-item router once the intent is classified as a feature;
  the router has already resolved the provider (GitHub or Azure DevOps) and
  handles the final preview and create. Use when turning a rough feature idea
  into a rigorous, reviewed work item rather than a quick stub.
---

# Draft Feature

You derive **high-quality feature requirements** from a rough idea. You do NOT
create the work item and you do NOT detect the provider — the
`development:draft-work-item` router already resolved the provider and will
handle duplicate-check, preview, and creation. Your output is a composed
`{type, title, body, meta}` handed back to the router.

**Inputs from the router:** `provider` (GitHub or Azure DevOps), `rawRequirement`
(the user's original text), and `priorAnswers` (anything already volunteered —
never re-ask these).

Work the phases below in order. Phases loop: new understanding sends you back to
re-ground earlier phases. Ask questions **one at a time**, multiple-choice where
possible.

## Phase 1 — Gather Context

Build real grounding before asking anything:

- Dispatch parallel `Explore` subagents over the codebase to find the components,
  patterns, and existing conventions this feature would touch.
- Search existing work for overlap: GitHub issue search or ADO `searchWorkItems`
  for related/duplicate efforts already tracked.
- Use `WebSearch` **only** when the requirement leans on external/unfamiliar
  tech, standards, or APIs.

Summarize what you learned and where the requirement meets reality.

## Phase 2 — Clarify (loop)

Turn the gaps between the high-level ask and the discovered context into
questions, asked **one at a time**. Skip anything in `priorAnswers`. When the
user's answers materially change your understanding, **loop back to Phase 1** to
re-ground against the code. Stop when the core intent, users, and value are clear.

## Phase 3 — Blind-Spot Scan (agent)

When ambiguities are resolved, dispatch the **`development:blind-spot-detector`**
agent with the **feature lens**, passing the working requirements plus the
context you gathered. It surfaces what your feature focus misses: edge cases,
cross-cutting impact, non-functional needs (perf, security/authz, privacy/EUII,
a11y, i18n, observability), data/migration/compat, and acceptance gaps.

You may dispatch **multiple detectors in parallel** for breadth on a larger
feature.

## Phase 4 — Clarify Blind Spots (loop)

Resolve what the scan surfaced. Fold confirmed gaps into the requirements; for
open questions, ask the user (one at a time). If a finding reopens the core
requirement, **loop back to the relevant earlier phase** (down to Phase 1).

## Phase 5 — Write Requirements

Compose the body, applying the active provider's mention conventions (the router
supplies these; if working standalone, GitHub →
`../draft-work-item/reference/gh-mention-conventions.md`, ADO →
`../draft-work-item/reference/ado-mention-conventions.md`).

```markdown
## Summary
<what to build>

## Value
<who benefits and why — the user/persona and the value delivered>

## Acceptance Criteria
- [ ] <verifiable, pass/fail>
- [ ] ...
```

Generate a concise title (< 80 chars). Every acceptance criterion must have a
clear pass/fail signal.

## Phase 6 — Review for Over-Engineering & Duplication

Dispatch the **`code-reviewer:over-engineering-review`** agent against the drafted
requirements, focused on gold-plating, scope creep, and unrequested scope. When
the feature looks like it may overlap existing functionality, also dispatch
**`code-reviewer:duplicate-code-detector`** to catch duplicate effort.

## Phase 7 — Address Feedback

Trim scope and fold in the review findings. Ask the user about any genuine
ambiguity the review raised (one at a time). If the changes are substantial,
**loop back to the relevant phase** to re-validate.

## Phase 8 — Hand Back to Router

Return `{type: feature/user-story, title, body, meta}` to
`development:draft-work-item`. The router runs the duplicate check, shows the
mandatory preview, creates the item on the resolved provider, and offers the
follow-up. **You never create the item yourself.**

## Guidelines

- Ground every requirement in gathered context — no speculative requirements.
- One question at a time; prefer multiple-choice.
- Loop freely: clarification and blind-spot findings are meant to send you back.
- YAGNI — defer anything not needed for the stated value.
- The item is created only after the router's explicit-confirmation preview.
