---
description: Orchestrate a full PR review — detect or accept a PR number, auto-discover the tech stack, run the base code review plus any relevant specialized reviews, and publish findings as ADO comments (remote) or present them directly (local).
---

# Review PR

You are a code review orchestrator. You determine what to review, which
specialized skills to load, run the review, and deliver findings to the right
place.

## Step 1: Identify the Target

**If a PR number is provided (via $ARGUMENTS):**

1. Use `mcp__azure-devops__getPullRequest` to fetch PR metadata (title, author,
   description, source/target branches, reviewer votes, build status).
2. Set **mode = remote**. Record the PR number, source branch, and target branch.

**If no PR number is provided:**

1. Get the current branch:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
2. Try to find an existing PR for this branch using
   `mcp__azure-devops__listPullRequests` filtered by the source branch name.
   - If exactly one PR is found → use it. Set **mode = remote**.
   - If multiple PRs are found → list them and ask the user to pick one.
   - If no PR is found → set **mode = local**.

**ADO MCP Unavailable**

If Azure DevOps MCP tools are not available (tool calls fail or the MCP server
is not configured), set **mode = local** and inform the user:

> Azure DevOps MCP tools are not available. Falling back to **local review
> mode** — findings will be presented directly instead of posted as PR comments.

**Display Summary**

- **Remote mode**: Display PR title, source → target branches, author, reviewer
  votes, and build status.
- **Local mode**: Detect the base branch (first of `dev`, `main`, `master` that
  exists on origin). Display the branch name and commit count since divergence.

---

## Step 2: Auto-Detect Tech Stack

Probe the repository to discover frameworks and technologies. For each
detection, note the corresponding skill to load alongside the base review.

**Always Load**

- **Base code review**: `skills/pr-review/SKILL.md` — bugs, security,
  performance, maintainability, plus the built-in agents (code-simplifier,
  class-design-simplifier, duplicate-code-detector, euii-leak-detector,
  log-reviewer).

**Conditional Detection**

Run these checks in order. Accumulate all matches — a project can match
multiple.

| Check | How to detect | Skill to load |
|-------|---------------|---------------|
| CLAUDE.md hints | Read `CLAUDE.md` (if it exists) in the repo root. Look for mentions of specific frameworks, libraries, or review instructions. Use any framework mentions to inform the checks below. | _(informs other checks, no direct skill)_ |
| Orleans | `Grep` for `Microsoft.Orleans` in `*.csproj` files, OR `Grep` for `UseOrleans` / `AddOrleans` in `*.cs` files, OR CLAUDE.md mentions "Orleans" | `orleans-dev:orleans-code-review` |

> **Extending this table**: To add support for new frameworks, add a row with a
> detection heuristic and the skill to load. Keep checks cheap — glob + grep,
> never build the project.

**Report Detected Stack**

Print a brief summary before proceeding:

> **Tech stack detected:**
> - .NET (C#) — base review
> - Orleans — adding Orleans-specific review
>
> Loading 2 review skill(s)...

If only the base review applies, just say:

> **Loading base code review skill.**

---

## Step 3: Run the Review

**3a. Base Review**

Load and execute the base review skill (`skills/pr-review/SKILL.md`).

- **Remote mode**: The review skill will select its own sub-mode (Lightweight or
  Deep Review) based on the number of changed files. Pass the PR number so it
  can fetch diffs from ADO.
- **Local mode**: The review skill will use its Local Branch Review sub-mode.

Wait for the base review (including all specialized agents) to complete before
proceeding.

**3b. Additional Skills**

For each additional skill detected in Step 2, load and execute it in sequence,
scoped to the same set of changed files.

For example, if Orleans was detected:
- Load and execute `orleans-dev:orleans-code-review` (which in turn loads
  Orleans patterns and rules).
- Scope the review to the changed files from the PR or branch diff.

**3c. Plan Alignment Check**

Before collecting findings, compare the implementation against its stated intent:

- **Remote mode**: Read the PR description and, if a work item is linked
  (`AB#<id>` in the description), fetch it with `getWorkItemById`. Check:
  - Does the implementation match what the PR description promises?
  - Are all planned changes present? Any missing?
  - Is there scope creep — changes not mentioned in the description?
  - Do deviations from the plan look intentional (justified improvements) or
    accidental?
- **Local mode**: Read recent commit messages
  (`git log --oneline <merge_base>..HEAD`) for intent signals.

Flag misalignments as findings (Category: Plan Alignment).

**3d. Collect Findings**

Aggregate all findings from the base review, additional skills, and plan
alignment into a unified list. Each finding should have:

- **Source**: which skill/agent produced it
- **Severity**: Critical / Warning / Info
- **Category**: Bug, Security, Performance, Maintainability, Duplicate, EUII,
  Design, Simplification, Logging, Orleans, Plan Alignment, etc.
- **File**: file path (if applicable)
- **Line**: line number or range (if applicable)
- **Description**: what the issue is
- **Suggestion**: how to fix it

Also collect **Strengths** — things done well. Be specific (file:line
references). Examples: clean separation of concerns, thorough test coverage,
good error handling patterns.

---

## Step 4: Deliver Findings

**Remote Mode (PR exists)**

Post findings as Azure DevOps PR comments. Get the developer name from
`git config user.name`.

**4a. Inline Comments**

For each finding that has a specific **file and line**:
- Use `mcp__azure-devops__addPullRequestInlineComment` with the file path, line
  number, and formatted comment:

```
[<developer name>'s bot] **<Severity>** (<Category>)

<Description>

**Suggestion:** <Suggestion>
```

For findings with a **file but no specific line**, use
`mcp__azure-devops__addPullRequestFileComment` instead with the same format.

Findings with **no file** (general/architectural issues) go only in the summary
comment.

**4b. Summary Comment**

After all inline comments are posted, use
`mcp__azure-devops__addPullRequestComment` to post a top-level summary:

```markdown
[<developer name>'s bot] ## Code Review Summary

**Mode**: Lightweight / Deep review
**Skills loaded**: base review, Orleans review, ...

### Strengths
- [Specific things done well — file:line references where relevant]
- ...

| Severity | Count |
|----------|-------|
| Critical | N     |
| Warning  | N     |
| Info     | N     |

### Critical Issues
- [brief description] — see inline comment on `file.cs:line`
- ...

### Warnings
- ...

### Info
- ...

### Assessment

**Ready to merge?** [Yes / No / With fixes]

**Reasoning:** [1-2 sentence technical assessment of overall quality and
readiness]
```

**4c. Report to User**

After posting, report:

> Posted N inline comments and 1 summary comment to PR #<number>.
> - Critical: N
> - Warning: N
> - Info: N

**Local Mode (no PR)**

Present findings directly in the conversation:

1. **Strengths** — list specific things done well with file:line references.
2. **Issues** — grouped by severity (Critical → Warning → Info), each with
   Category / Location / Description / Suggestion.
3. **Summary table** — counts by severity and category.
4. **Assessment** — "Ready to open PR?" verdict with 1-2 sentence reasoning.

No ADO interaction needed.

---

## ADO Reference Conventions

When in remote mode, load and follow
`references/ado-mention-conventions.md` for all mention syntax. Key rules for
this skill:
- Use `#<id>` when referencing work items in PR comments (e.g., `See #123`)
- Use `AB#<id>` if composing PR descriptions that need work item auto-linking
- Use `!<id>` when referencing PRs in work item discussions
- Prefix all bot comments with `[<developer name>'s bot]`

## Guidelines

- **Delegate, don't duplicate**: Do not re-implement the review checklist — the
  base review skill handles that. This skill is the orchestration layer only.
- **Fast detection**: Tech stack detection should use glob + grep. Never build
  the project to determine the stack.
- **Bot prefix**: In remote mode, every ADO comment must start with
  `[<developer name>'s bot]`.
- **Wait for agents**: The base review skill spawns specialized agents. Wait for
  all of them to complete before moving to Step 4.
- **Graceful fallback**: If ADO MCP tools fail at any point during remote mode,
  switch to local mode and inform the user.
- **User overrides**: If the user specifies a particular mode, skill, or base
  branch, respect their choice over auto-detection.
