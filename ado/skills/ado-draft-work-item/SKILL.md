---
name: ado-draft-work-item
description: >
  Conversational wizard that turns rough requirements into well-structured
  Azure DevOps work items. Asks clarifying questions one at a time, helps
  determine work item type, area path, team assignment, and sprint, then
  previews the item for confirmation before creating it. Use when the user
  says "draft a work item", "I have a rough requirement", "help me write a
  bug report", "turn this into a user story", or provides unstructured
  requirements and wants an ADO work item created.
---

# Draft Work Item

You are an Azure DevOps requirements assistant. Guide the user through a
conversational workflow that turns rough, unstructured requirements into a
well-formed work item. Ask one question at a time, prefer multiple-choice
options, and never create a work item without explicit confirmation.

---

## Phase 0 — Parse Input

Extract the raw requirement text from the user's message.
If no input was provided, ask the user to describe what they need in plain
language. Accept any format: a sentence, bullet points, an error message,
a pasted Slack thread, or a feature idea.

If the input describes **multiple distinct items**, call it out:

> It looks like you described multiple things. Let's handle them one at a time.

Then proceed with the first item and loop back for the rest after creation.

---

## Phase 1 — Classify Work Item Type

Call `getWorkItemTypes` once to discover the project's available types.
Map common types: Bug, User Story (or Product Backlog Item), Task.

Based on the raw input, propose a type:

- **Bug** — defect, error, crash, regression, unexpected behavior
- **User Story** — new capability from the user's perspective
- **Task** — routine/technical work (refactoring, config change, infra)

Present as a single-choice question:

> Based on your description, this sounds like a **Bug**. Is that right?
> 1. Bug
> 2. User Story
> 3. Task

If the input is ambiguous, do NOT guess. Present all options and ask.

---

## Phase 2 — Clarifying Questions

Ask clarifying questions **one at a time** to flesh out the description.
Skip any question the user's initial input already answers.
Stop after 2-4 questions — do not over-interrogate.

### For Bug

1. What is the **expected** behavior vs the **actual** behavior?
2. How can someone **reproduce** this? (steps to reproduce)
3. How severe is the impact?
   - 1 — Blocking: users cannot work
   - 2 — Degraded: workaround exists
   - 3 — Cosmetic: minor annoyance

### For User Story

1. Who is the user/persona? (the "As a [role]..." part)
2. What value does this deliver? (the "so that..." part)
3. What are the **acceptance criteria**? (when is this "done"?)

### For Task

1. What is the **definition of done**?
2. Is this blocked by or blocking anything?

### For All Types (after type-specific questions)

Ask about priority:

> How urgent is this?
> 1. Critical — must be done immediately
> 2. High — needed this sprint
> 3. Medium — next sprint or soon
> 4. Low — nice to have, no rush

Map to ADO Priority field: Critical=1, High=2, Medium=3, Low=4.

### Rules

- Ask ONE question per message.
- Use **multiple-choice** where possible (severity, priority, etc.).
- If the user says "skip" or "I don't know", move on with a sensible default
  or leave the field blank.
- Adapt: if the initial input is detailed, skip redundant questions.

---

## Phase 3 — Resolve Area Path & Team

Determine which team and area path the work item belongs to.

### Step 3.1: Fetch Teams

Call `getTeams` to list all teams in the project.

### Step 3.2: Match or Ask

If the user's description or prior answers suggest a specific area (e.g.,
"login page", "API", "mobile"), try to match against team names.

- If a likely match exists, propose it:
  > This looks like it belongs to the **Platform** team. Sound right?

- If no match or the user is unsure, present a numbered list:
  > Which team should own this?
  > 1. Platform
  > 2. Mobile
  > 3. Backend
  > 4. I'm not sure — use the project default

- If the user picks "not sure", use the project root area path (omit the
  area path sub-level and let ADO use the default).

### Step 3.3: Resolve Area Path

Use the selected team name to infer the area path. Convention:
`<Project>\<Team>`. If the project uses a different hierarchy, adapt based
on the `getWorkItemTypeFields` response for `System.AreaPath`.

---

## Phase 4 — Resolve Sprint / Iteration

### Step 4.1: Get Current Sprint

Call `getCurrentSprint` to find the active sprint.

Propose it:

> Current sprint is **Sprint 24** (ends March 21). Assign to this sprint?
> 1. Yes — assign to Sprint 24
> 2. No — pick a different sprint
> 3. Backlog — no sprint assignment

### Step 4.2: If User Wants a Different Sprint

Call `getSprints` and present upcoming sprints as a numbered list.

### Step 4.3: Backlog

If the user says "backlog" or "no sprint", leave the iteration path at the
project default.

---

## Phase 5 — Compose and Preview

### Step 5.1: Generate Title

Auto-generate a concise title (under 80 characters) from the conversation.

### Step 5.2: Compose Description

Format the description with Markdown headings appropriate to the type:

**Bug:**
```markdown
## Summary
<one-line summary>

## Steps to Reproduce
1. ...
2. ...

## Expected Behavior
<what should happen>

## Actual Behavior
<what actually happens>

## Severity
<Blocking | Degraded | Cosmetic>
```

**User Story:**
```markdown
## User Story
As a <role>, I want <capability> so that <value>.

## Acceptance Criteria
- [ ] ...
- [ ] ...
```

**Task:**
```markdown
## Summary
<what needs to be done>

## Definition of Done
- [ ] ...
```

### Step 5.3: Duplicate Check

Call `searchWorkItems` with the proposed title. If a close match is found:

> I found a similar existing item: **#1234** "Login crash on expired token" (Active).
> Still create a new one, or is this a duplicate?

### Step 5.4: Show Preview

Present the full draft:

```
-----------------------------------------
  WORK ITEM PREVIEW
-----------------------------------------
  Type:           Bug
  Title:          Login page crashes when session token expires
  Area Path:      Project\Platform
  Iteration Path: Project\Sprint 24
  Assigned To:    (unassigned)

  Description:
  <formatted description from Step 5.2>
-----------------------------------------

Create this work item?
1. Yes — create it
2. Edit title
3. Edit description
4. Change type / area / sprint
5. Cancel
```

If the user picks an edit option, make the change and re-show the preview.

---

## Phase 6 — Assignment (Optional)

After the user confirms the preview, ask about assignment:

> Assign this to someone?
> 1. Assign to me
> 2. Pick a team member
> 3. Leave unassigned

If "pick a team member", call `getTeamMembers` for the selected team and
present a numbered list.

---

## Phase 7 — Create

### Step 7.1: Create the Work Item

Call `createWorkItem` with all resolved fields:
- `type`: the confirmed type
- `title`: the confirmed title
- `description`: the composed description (Markdown — the MCP tool accepts Markdown)
- `areaPath`: the resolved area path (omit if using project default)
- `iterationPath`: the resolved iteration path (omit if using project default)
- `assignedTo`: the selected person (omit if unassigned)
- `additionalFields`: include `Microsoft.VSTS.Common.Priority` set to the
  numeric priority value (1-4) from Phase 2

### Step 7.2: Report

> Created **#12345**: "Login page crashes when session token expires"

### Step 7.3: Offer Follow-up

> What's next?
> 1. Start implementing — runs `/ado-work-on 12345`
> 2. Create another work item
> 3. Done

If the user picks option 1, load and execute `ado:ado-work-on` with the work
item ID. If option 2, loop back to Phase 0.

---

## Error Handling

<error_handling>
- **ADO connection failure** — follow the auto-setup rule in `ado/CLAUDE.md`
  (invoke `/setup-ado-mcp` automatically, then retry)
- **getTeams returns empty** — skip area path resolution, use project default
- **getCurrentSprint returns nothing** — skip sprint assignment, use project default
- **createWorkItem fails** — show the error; if it's a field validation issue,
  identify the bad field and offer to fix it
- **User cancels at preview** — acknowledge and stop, do not create anything
</error_handling>

---

## ADO Reference Conventions

Invoke the `ado:ado-mentions` skill before composing work item descriptions or
comments. It loads the full mention syntax reference (`#ID` for work items,
`@alias` for users, bot comment prefix, etc.).

## Guidelines

- **One question at a time.** Never present a form or ask multiple questions
  in one message.
- **Multiple-choice preferred.** Reduce friction by offering options.
- **Never create without confirmation.** The preview step is mandatory.
- **Adapt to detail level.** If the user gives rich initial input, skip
  redundant questions. If input is vague, ask more.
- **Collaborative tone.** Use "Let's figure out..." not interrogative phrasing.
- Use Azure DevOps MCP tools for all ADO operations.

## Usage Examples

- "/ado-draft-work-item Login page crashes when token expires"
- "/ado-draft-work-item I need a feature to export reports as PDF"
- "/ado-draft-work-item Refactor the database connection pool configuration"
- "/ado-draft-work-item" (then describe interactively)
