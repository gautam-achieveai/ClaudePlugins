# Split `draft-work-item` into a router + deep feature/bug sub-skills

**Date:** 2026-06-22
**Status:** Approved design — ready for implementation plan
**Plugin:** `development`

## Problem

`development:draft-work-item` is a single conversational wizard that turns rough
requirements into a GitHub issue or Azure DevOps work item. It handles Bug,
Feature, and Task types with the same shallow flow: classify → a few clarifying
questions → compose → preview → create.

That shallow flow is fine for trivial items but leaves quality on the table for
real features (ambiguity, blind spots, over-engineering, duplicate effort) and
real bugs (unvalidated root-cause guesses). The user wants the skill broken into
focused sub-skills with deeper, purpose-built workflows:

1. a flow that focuses on **creating a new feature**, and
2. a flow that focuses on **writing an issue (bug)**.

## Goals

- Replace the one-size flow with a **router + two deep sub-skills**, keeping a
  lightweight path for Task/other items.
- Run a **deep, looping feature workflow** (context → clarify → blind spots →
  requirements → over-engineering review → post).
- Run a **deep, evidence-based bug workflow** (evidence → hypotheses →
  regression-test validation → understanding → post).
- Apply **blind-spot detection to every path**, implemented as **dispatched
  agent invocations** (fresh-context subagents that aren't anchored to the
  author's framing).
- Keep all provider (GitHub/ADO) handling, tooling setup, preview-before-create,
  and follow-up logic **shared in one place**.
- Change **nothing** in `gh/`, `ado/`, or the test suite. The split lives
  entirely inside `development/skills/`.

## Non-goals

- No change to the `gh`/`ado` wrapper skills, their commands, or
  `tests/plugin-component-prefixes.test.mjs`.
- The bug flow does **not** mutate the user's repository — no commits, no
  branches, no left-behind files (see Decisions).
- No new provider backends.

## Constraints (from the test suite)

`tests/plugin-component-prefixes.test.mjs` pins the `gh`/`ado` skill directory
lists, command delegation strings, and the `Start \`/gh-work-on <id>\`` snippet,
and forbids stale `gh:draft-work-item` / `ado:draft-work-item` references. It
does **not** inspect `development/skills/`. Therefore:

- The `gh:gh-draft-work-item` and `ado:ado-draft-work-item` wrappers and their
  commands stay exactly as they are — they keep delegating to
  `development:draft-work-item`.
- All restructuring is additive inside the `development` plugin.

## Architecture

```
/gh-draft-work-item  ─▶ gh:gh-draft-work-item  (wrapper, UNCHANGED, provider=GitHub)
/ado-draft-work-item ─▶ ado:ado-draft-work-item (wrapper, UNCHANGED, provider=ADO)
"draft a work item" (natural language)
                     └─▶ development:draft-work-item ──── ROUTER ────
                            0.  resolve provider (explicit > git-remote autodetect)
                            0b. ensure tooling (soft setup-gh-mcp / setup-ado-mcp)
                            1.  classify intent
                                  ├─ Bug        ─▶ development:draft-bug      (deep)
                                  ├─ Feature    ─▶ development:draft-feature  (deep)
                                  └─ Task/other ─▶ inline quick wizard (today's flow)
                            2.  (sub-skill returns {title, body, type, meta})
                            3.  duplicate check · preview · create · follow-up
```

The router owns shared concerns **once**; the sub-skills focus purely on
*deriving good requirements* and return a composed `{title, body, type, meta}`
to the router, which performs the provider-specific create call.

### Components

| Component | Type | Responsibility |
|---|---|---|
| `development:draft-work-item` | skill (router) | Provider resolution, tooling check, classification, dispatch to sub-skill, the lightweight Task/quick path, duplicate check, preview, create, follow-up. |
| `development:draft-feature` | skill | Deep 8-phase feature requirements flow. Returns composed requirements; does **not** create. |
| `development:draft-bug` | skill | Deep 6-phase bug flow with hypothesis + regression-test validation. Returns composed understanding; does **not** create. |
| `development:blind-spot-detector` | agent | Fresh-context subagent that surfaces what the author's focus misses. Dispatched by all three paths with a type-specific lens. |
| `reference/blind-spot-checklist.md` | reference | The lens definitions (feature / bug / task) the agent and skills share. |
| `reference/gh-mention-conventions.md` | reference | Existing — unchanged. |
| `reference/ado-mention-conventions.md` | reference | Existing — unchanged. |

### Interface between router and sub-skills

The router invokes a sub-skill with a resolved context and expects a structured
return:

- **Input:** `{ provider, rawRequirement, priorAnswers }`
  - `provider` ∈ `GitHub | Azure DevOps` (already resolved; sub-skill never
    re-detects).
  - `rawRequirement` — the user's original text.
  - `priorAnswers` — anything the user already volunteered, so the sub-skill
    doesn't re-ask.
- **Output:** `{ type, title, body, meta }`
  - `type` — bug/feature/task mapped to the provider's vocabulary hint.
  - `title` — concise, < 80 chars.
  - `body` — composed Markdown (mention conventions already applied).
  - `meta` — optional placement/priority/assignee hints gathered along the way.

The sub-skill performs **no create call** and **no provider detection** — those
stay in the router so provider branching exists in exactly one place.

## The `draft-feature` flow (8 phases)

1. **Gather context.** Dispatch parallel `Explore` subagents over the codebase;
   search existing issues/work items (`searchWorkItems` / issue search) for
   related or overlapping work; use `WebSearch` only when the requirement
   references external/unfamiliar tech or standards. Collect findings.
2. **Clarify (loop).** Convert the ambiguities between the high-level ask and the
   discovered context into questions asked **one at a time**, multiple-choice
   where possible. New answers loop back to Phase 1 to re-ground understanding.
3. **Blind-spot scan (agent).** When ambiguities are resolved, dispatch the
   `development:blind-spot-detector` agent with the **feature lens** against the
   working requirements + gathered context. It looks for what the feature focus
   misses: edge cases, cross-cutting impact, non-functional needs (perf,
   security, a11y, observability), migration/compat, and unhandled states.
4. **Clarify blind spots (loop).** Resolve what the scan surfaced; if it reopens
   requirements, loop back to the relevant earlier phase (down to Phase 1).
5. **Write requirements.** Compose **Summary / Value / Acceptance Criteria**,
   grounded in the gathered context, applying the provider's mention conventions.
6. **Review for over-engineering & duplication.** Dispatch the
   `code-reviewer:over-engineering-review` agent (and
   `code-reviewer:duplicate-code-detector` when the requirement looks like it may
   duplicate existing functionality) against the drafted requirements. Focus:
   gold-plating, scope creep, duplicate effort/functionality.
7. **Address review feedback.** Trim scope, fold in findings; ask the user about
   any ambiguity the review raised; loop back to the relevant phase if needed.
8. **Return to router.** Hand back `{type, title, body, meta}` → router runs
   duplicate check → preview → create → follow-up.

## The `draft-bug` flow (6 phases)

1. **Gather evidence.** Collect context in code and any proof of the bug — logs,
   stack traces, failing output, repro steps. Dispatch `Explore` subagents as
   needed to locate the relevant code paths.
2. **Clarify.** Ask the user clarifying questions **only if** the defect isn't
   already clear from the evidence.
3. **Hypothesize root causes.** Enumerate multiple candidate root causes. Spawn
   **one subagent per hypothesis** to investigate in parallel; each may build/run
   the application and inspect logs (best-effort) to confirm or refute its branch.
4. **Validate by regression test.** For each surviving hypothesis, write a
   candidate regression test to a **scratch location** and run it best-effort.
   - **No repo mutation** — nothing is committed, no branches, no files left in
     the working tree. (See Decisions.)
   - Only hypotheses whose test **actually reproduces the bug** advance.
   - The test source + run output are captured for the issue body as repro proof.
   - If the project can't be built/run, record that and fall back to static
     reasoning for that hypothesis.
5. **Blind-spot scan (agent) + write understanding.** Dispatch the
   `development:blind-spot-detector` agent with the **bug lens**: other call
   sites sharing the same root cause, adjacent/related defects, regression-risk
   areas, data-integrity and migration fallout. Then compose the bug document:
   **Summary / Steps to Reproduce / Expected / Actual / Root Cause / Repro Proof**
   (the scratch test + result) / **Related Risk** (blind-spot findings),
   applying the provider's mention conventions.
6. **Return to router.** Hand back `{type, title, body, meta}` → router runs
   duplicate check → preview → create → follow-up.

## The quick / Task path (inside the router)

For Task and trivially-clear items, the router keeps today's lightweight flow:
classify → 2–3 clarifying questions → compose → preview → create. Before preview
it runs a **single lightweight blind-spot pass** — dispatch the
`development:blind-spot-detector` agent with the **task lens** (dependencies,
done-definition gaps, side effects). This keeps the discipline uniform without
the full feature/bug machinery.

## Blind-spot detection as an agent

`development:blind-spot-detector` is a new agent in `development/agents/`.

- **Why an agent, not inline reasoning:** blind spots are, by definition, what
  the author's current focus hides. A fresh-context subagent that receives only
  the drafted artifact + a lens prompt isn't anchored to the framing that created
  the blind spot, so it catches more.
- **Input:** the working artifact (requirements draft or bug understanding), the
  lens (`feature` | `bug` | `task`), and pointers to relevant code/context.
- **Output:** a structured list of blind-spot findings (each: what's missing, why
  it matters, suggested clarifying question or mitigation).
- **Lenses** live in `reference/blind-spot-checklist.md` so the skill and the
  agent share one source of truth. Feature/bug flows may dispatch **multiple
  detectors in parallel** for breadth; the quick path dispatches one.
- Findings feed the clarify-and-loop step (feature/bug) or are folded into the
  preview (task).

## Decisions (confirmed with user)

1. **Router + two sub-skills** — `draft-work-item` becomes a thin router that
   resolves provider, classifies, and delegates to `draft-feature` / `draft-bug`,
   keeping the lightweight Task path inline.
2. **Task → quick wizard** — feature/bug get the deep flows; Task and trivial
   items fall back to the existing lightweight classify→preview→create path.
3. **Requirements review → `code-reviewer:over-engineering-review` agent** — not
   `review-pr` (which is code-PR oriented). Optionally pair with
   `duplicate-code-detector`.
4. **Bug artifacts: draft tests, don't commit; best-effort run** — regression
   tests go to scratch, are run to confirm repro, and are embedded (as text +
   results) in the issue body. The repo is never mutated; if the project can't be
   built/run, fall back to static analysis.
5. **Blind spots apply to all paths** — feature, bug, and task.
6. **Blind-spot detection is wrapped as agent invocations** — via the new
   `development:blind-spot-detector` agent, dispatched with a type-specific lens.

## Shared concerns kept in the router

Provider resolution & tooling (`setup-gh-mcp` / `setup-ado-mcp` soft fallback),
mention conventions, duplicate check, the **mandatory preview-before-create
confirmation**, the provider create calls, and the `/gh-work-on` · `/ado-work-on`
follow-up. The append-only rule (never edit prior comments/items) is preserved.

## Files

### Create
- `development/skills/draft-feature/SKILL.md` — deep feature flow.
- `development/skills/draft-bug/SKILL.md` — deep bug flow.
- `development/skills/draft-work-item/reference/blind-spot-checklist.md` — shared
  lens definitions (feature/bug/task).
- `development/agents/blind-spot-detector.md` — the blind-spot agent.

> Note: if the sub-skills need their own copies of the mention-convention and
> blind-spot references (skills can't easily read another skill's `reference/`),
> the plan will resolve whether to share via the agent + router or duplicate the
> small reference files into each sub-skill. Leaning toward: router applies
> mention conventions and dispatches the blind-spot agent, so sub-skills don't
> need those reference files directly.

### Modify
- `development/skills/draft-work-item/SKILL.md` — convert to router: keep
  Phase 0/0b (provider + tooling), add a classification + dispatch step, retain
  the lightweight Task/quick path, keep duplicate-check/preview/create/follow-up;
  delegate feature/bug to the sub-skills.
- `development/.claude-plugin/plugin.json` — extend description (router + deep
  feature/bug drafting + blind-spot agent); bump version 1.2.0 → 1.3.0.
- `.claude-plugin/marketplace.json` — development entry: add `draft-feature`,
  `draft-bug`, `blind-spot-detector` keywords; bump version to 1.3.0; update
  description.
- `README.md` — development skills list: add `draft-feature`, `draft-bug`; note
  the blind-spot agent; bump heading to v1.3.0.

### Unchanged
- Everything under `gh/` and `ado/` (wrappers, commands).
- `tests/plugin-component-prefixes.test.mjs`.

## Verification

1. `node --test tests/` — full suite stays green (11/11). The pinned gh/ado
   lists, command strings, and snippets are untouched.
2. `node -e "JSON.parse(...marketplace.json); JSON.parse(...development plugin.json)"`
   — both valid.
3. Skill-routing trace (no MCP calls needed):
   - `/gh-draft-work-item add a dark-mode toggle` → gh wrapper → router
     (provider=GitHub) → classifies Feature → `draft-feature` → returns
     requirements → router previews → create.
   - `/ado-draft-work-item login returns 500` → ado wrapper → router
     (provider=ADO) → classifies Bug → `draft-bug` → hypotheses + scratch
     regression test → returns understanding → router previews → create.
   - Natural-language "draft a task to bump the linter" in a github.com repo →
     router auto-detects GitHub → quick path → blind-spot agent (task lens) →
     preview → create.
4. Confirm `draft-bug` leaves the working tree clean (no stray test files, no
   commits) after a run.
5. Grep: no stale `gh:draft-work-item` / `ado:draft-work-item` forms anywhere.
