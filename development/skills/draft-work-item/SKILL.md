---
name: draft-work-item
description: >
  Router that turns rough requirements into a well-structured work item and posts it to GitHub (issue) or Azure DevOps (work item). Detects the backend automatically from the git remote, classifies the intent, then delegates to a deep sub-skill — draft-feature for new features/user stories, draft-bug for defects — or handles Tasks and trivial items inline. Owns provider resolution, tooling setup, duplicate check, the confirmation preview, creation, and follow-up. Use when the user says "draft a work item", "I have a rough requirement", "help me write a bug report", "turn this into a user story", or provides unstructured requirements and wants an issue or work item created.
user-invocable: true
disable-model-invocation: true
---

# Draft Work Item (Router)

You are the entry point for turning a rough requirement into a posted work item —
a **GitHub issue** or an **Azure DevOps work item**. You resolve the provider
once, classify the intent, and route to the right depth of workflow. You own
everything that is shared across types: provider/tooling, duplicate check, the
preview-before-create confirmation, the create call, and the follow-up.

Deep flows live in dedicated sub-skills; you stay thin and shared:

| Intent | Route |
|---|---|
| **Feature / user story** | delegate to `development:draft-feature` |
| **Bug / defect** | delegate to `development:draft-bug` |
| **Task / trivial** | handle inline (Quick Path below) |

Sub-skills derive requirements and hand back `{type, title, body, meta}`; **only
this router creates the item.**

## Phase 0 — Resolve the Provider

1. **Explicit wins.** If the caller (e.g. the `gh:gh-draft-work-item` or
   `ado:ado-draft-work-item` wrapper) already told you the provider is GitHub or
   Azure DevOps, use it and skip detection.
2. **Otherwise auto-detect silently** from the git remote:
   - Run `git remote get-url origin`.
   - `github.com` → **GitHub**.
   - `dev.azure.com` or `visualstudio.com` → **Azure DevOps**.
   - State the detected provider in one short line and proceed
     (e.g. "Targeting GitHub (detected from origin)."). Do not interrogate.
3. **Only ask if genuinely ambiguous** — no remote, or a remote that matches
   neither host. Then ask once which backend to target.

### Phase 0b — Ensure Tooling Is Ready (soft)

Before the first provider call, make sure the backend's tools are reachable. If a
call fails (connection error, tool not found, auth failure), follow the matching
plugin's auto-setup rule rather than asking the user to configure it manually:

- GitHub → use `gh:setup-gh-mcp`, then retry; fall back to the `gh` CLI.
- Azure DevOps → use `ado:setup-ado-mcp`, then retry.

(When reached through a wrapper, the wrapper has usually already done this check —
only re-run on an actual failure.)

## Phase 1 — Classify Intent and Route

Propose a type from the raw input:

- **Bug** — defect, crash, regression, unexpected behavior → route to
  **`development:draft-bug`**.
- **Feature / User Story** — new capability or user-visible enhancement → route to
  **`development:draft-feature`**.
- **Task / trivial** — routine/technical work, refactor, config, tooling, infra,
  or anything small and unambiguous → handle on the **Quick Path** below.

If the type isn't obvious, show the options and ask — do not guess. When you
delegate, pass the resolved context to the sub-skill:

```
{ provider, rawRequirement, priorAnswers }
```

The sub-skill returns `{ type, title, body, meta }`. Continue at Phase 3
(Finalize) with that result. **Provider mapping for the type:**

| | GitHub | Azure DevOps |
|---|---|---|
| Type source | No built-in types — map to a repo-friendly **label** (`bug`, `feature`, `task`) | Call `getWorkItemTypes` once; map to **Bug / User Story (or PBI) / Task** |

## Phase 2 — Quick Path (Task / trivial, inline)

For Tasks and trivially-clear items, run the lightweight wizard here:

1. **Clarify** — ask 2–3 questions, one at a time, multiple-choice where possible:
   - What does "done" look like (definition of done)?
   - Is this blocked by or blocking anything else?
   - Priority? (Critical / High / Medium / Low)
2. **Blind-spot check (agent)** — dispatch the
   **`development:blind-spot-detector`** agent with the **task lens**
   (dependencies, done-definition gaps, side effects, hidden scope). Fold
   confirmed findings in; ask the user about anything material.
3. **Compose** — title (< 80 chars) + body:
   ```markdown
   ## Summary
   <what needs to be done>

   ## Definition of Done
   - [ ] ...
   ```
4. Continue at Phase 3 with `{ type: task, title, body, meta }`.

## Phase 3 — Finalize (shared for all routes)

Whatever produced the `{type, title, body, meta}` — a sub-skill or the Quick
Path — finalize it here.

### 3.1 Apply Mention Conventions
Ensure the body uses the active provider's mention/reference syntax:

- GitHub → [reference/gh-mention-conventions.md](reference/gh-mention-conventions.md)
- Azure DevOps → [reference/ado-mention-conventions.md](reference/ado-mention-conventions.md)

### 3.2 Resolve Placement

| | GitHub | Azure DevOps |
|---|---|---|
| Container | Default to the current repository unless the user clearly wants another | Resolve **Area Path + Team**: call `getTeams`, match the description to a team or ask, then derive area path `<Project>\<Team>` (adapt via `getWorkItemTypeFields` for `System.AreaPath`) |
| Board / iteration | If the repo uses a **GitHub Project**, ask whether to add the issue and set status/iteration/priority; otherwise fall back to milestone + labels and say so | Propose `getCurrentSprint`; offer a different sprint (`getSprints`) or "Backlog — no sprint" |
| Priority | Repo's existing labels (`priority/high`, `P1`, …) | `Microsoft.VSTS.Common.Priority` numeric: Critical=1, High=2, Medium=3, Low=4 |

If the user is unsure on ADO, use the project's root/default area path.

### 3.3 Duplicate Check

| | GitHub | Azure DevOps |
|---|---|---|
| Search | Search existing **issues** by title/keywords | Call `searchWorkItems` with the proposed title |

If a close match is found, surface it and ask whether to continue or treat it as a
duplicate.

### 3.4 Assignment (optional)

| | GitHub | Azure DevOps |
|---|---|---|
| Assignee | Assign a GitHub user directly | "Assign to me" / "Pick a team member" (`getTeamMembers`) / leave unassigned |

### 3.5 Preview — Mandatory Confirmation
Present a full preview and **wait for explicit confirmation** before creating:
- type (label / work-item type)
- title
- assignee choice
- placement: repo + project / iteration & status (GitHub) **or** area path +
  iteration path (ADO)
- labels / milestone (GitHub) or priority field (ADO)
- formatted body

Offer edit options (title / body / type / placement / cancel) and re-show the
preview after any edit. **Never create without explicit confirmation.**

## Phase 4 — Create

After confirmation, create the item on the resolved provider:

**GitHub**
1. Create the GitHub issue.
2. Apply labels, assignee, and milestone.
3. If requested, add the issue to the GitHub Project and set status / iteration.
4. Report the created issue number and URL.

**Azure DevOps**
1. Call `createWorkItem` with: `type`, `title`, `description` (Markdown),
   `areaPath` (omit if default), `iterationPath` (omit if default), `assignedTo`
   (omit if unassigned), and `additionalFields` including
   `Microsoft.VSTS.Common.Priority` (1-4).
2. Report the created work item ID.

Use the provider's MCP tools for all operations; fall back to `gh` CLI for GitHub
when MCP coverage is insufficient.

## Follow-up

After creation, offer the next relevant step for the active provider:

- GitHub → Start `/gh-work-on <id>` · Create another · Stop here
- Azure DevOps → Start `/ado-work-on <id>` · Create another · Stop here

If the user picks "create another", loop back to Phase 1 (the provider is already
known) and start the next item.

## Guidelines

- Resolve the provider once, up front, then keep the flow identical.
- Route by intent: features and bugs get the deep sub-skills; tasks stay inline.
- Blind-spot detection runs on **every** path — via the deep sub-skills for
  features/bugs, and the task lens on the Quick Path.
- Ask one question at a time; prefer multiple-choice options.
- Prefer existing repo/project conventions over inventing new labels, types, or
  field values.
- Always show the full preview before creating.
- Comments and items are append-only on both backends — never edit prior
  comments when posting follow-ups.
