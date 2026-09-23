# PR Context Gatherer — Pre-Supplied-Context Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `code-reviewer:pr-context-gatherer` a pre-supplied-context mode so a caller (the
CodeReviewDaemon review host) that already fetched compact PR-linkage data can skip redundant
PR-level discovery, while ordinary (autonomous) invocation keeps today's behavior unchanged.

**Architecture:** The agent's dispatch prompt may now carry a `## Daemon-Supplied Context` block —
compact navigation data only. When present, Step 1 skips only PR-level linkage discovery because
those IDs are already given; it still fetches PR title, author, and branches when needed for the
unchanged output header. Steps 2-6 (fetch each linked item's full details, walk the parent chain,
collect siblings/related items, build the tree and summary) run exactly as before — the daemon
supplies IDs, not synthesis. When the block is absent, all six steps run unchanged. The skill entry
point (`code-reviewer:pr-context`) gets a matching instruction so a caller dispatching through the
skill can pass the same block through.

**Tech Stack:** Markdown agent/skill definitions (Claude Code plugin format), JSON plugin manifests,
`claude plugin eval` scenario files (JSON), PowerShell (`Select-String`) for content assertions.

**Spec:** `B:\sources\LmDotnetTools\docs\superpowers\specs\2026-08-30-daemon-review-engagement-design.md`
(§5, §13, §14 — approved 2026-08-30). This plan implements the companion-repo dependency called out
there: "a pre-supplied-context mode must live in the agent definition itself... Rollout is blocked
until a released `code-reviewer` plugin version containing this mode is installed and exposed to
both review hosts."

## Global Constraints

- The `## Daemon-Supplied Context` block is compact navigation data only: work-item/issue IDs+links,
  related PR IDs+links, changed-file names, base SHA, head SHA, merge-base SHA, review-thread refs,
  workspace root, KB path. No diff, no file contents, no full work-item bodies, no large conversation
  bodies (spec §5, §65-67).
- Pre-supplied-context mode skips **redundant PR-level discovery only** (rediscovering linkage the
  daemon already supplied). It does **not** skip fetching linked item/PR details needed to build the
  hierarchy — Steps 2-6 (or the skill's equivalent walk) still run (spec §5, corrected semantics).
- Ordinary invocation (no supplied block) is fully autonomous and unchanged — same six steps as today.
- No repo-local same-key shadow/duplicate agent. The mode lives in the one real
  `code-reviewer/agents/pr-context-gatherer.md` definition (spec §5, "Rejected").
- Rollout gate must be **content-based** — resolve the actual installed/exposed agent template and
  check for the mode's marker text. Never gate on a plugin version-number comparison (spec §13 test 2,
  task instructions).
- Every code-reviewer feature commit in this repo's history bumps `code-reviewer/.claude-plugin/plugin.json`
  `version` **and** `.claude-plugin/marketplace.json`'s per-plugin `version` **and** its root
  `metadata.version`, together, in one commit (verified: commit `0eb2c9d` bumped code-reviewer
  1.19.5→1.21.0 alongside marketplace 1.14.6→1.15.0; commit `9441304` "bump code-reviewer and
  marketplace versions" did the same). This is a non-breaking, additive feature (new mode; unchanged
  default behavior) — following that convention, minor-bump both: code-reviewer 1.21.0→1.22.0,
  marketplace metadata 1.15.0→1.16.0. This version number is informational only — never load-bearing
  for the rollout gate (see above).
- This repo cannot modify `B:\sources\LmDotnetTools`. No daemon-side test is added here. Do not edit
  `DaemonAgentFactoryTests.cs` or anything else under LmDotnetTools — that repo has its own companion
  plan.

---

## Task 1: Add pre-supplied-context branch to the agent definition

**Files:**
- Modify: `code-reviewer/agents/pr-context-gatherer.md`

**Interfaces:**
- Produces: the exact marker heading `## Daemon-Supplied Context` (detected in the dispatch prompt)
  and the exact section heading `## Pre-Supplied Context Mode` (detected in the agent's own body by
  any downstream consumer verifying the mode is installed). Both strings are the "precise
  prerequisite contract" Task 5 hands to LmDotnetTools — do not rename either heading in later tasks.

- [ ] **Step 1: Write the failing content check (RED)**

Run in `B:\sources\claude_plugins`:

```powershell
Select-String -Path code-reviewer/agents/pr-context-gatherer.md -Pattern '^## Pre-Supplied Context Mode$'
```

Expected: no match (the section does not exist yet).

- [ ] **Step 2: Add the "Pre-Supplied Context Mode" section**

Insert a new section immediately after the existing `## Input` section and before `## Workflow`
(currently lines 42-49 read `## Input` ... `- A list of work item IDs already extracted from a PR`
... blank line ... `## Workflow`). Add a fourth input bullet and the new section:

```markdown
## Input

You receive one of:
- A PR number (e.g., `5234`)
- A PR number with repository name (e.g., `MyRepository#5234`)
- A list of work item IDs already extracted from a PR
- A dispatch prompt that also contains a `## Daemon-Supplied Context` block (see
  [Pre-Supplied Context Mode](#pre-supplied-context-mode) below)

## Pre-Supplied Context Mode

If your dispatch prompt contains a `## Daemon-Supplied Context` block, you are running in
pre-supplied-context mode. That block is compact navigation data a review host already fetched:
linked work-item/issue IDs and links, related PR IDs and links, changed-file names only, base/head
SHA and merge-base commit ID, relevant discussion/thread refs, workspace root, and KB path — no diff,
no file contents, no full work-item bodies.

In this mode:
- **Skip Step 1's linkage discovery.** Take linked item/issue IDs from the supplied block instead of
  calling `getPullRequest`/`gh pr view` to rediscover them. A metadata-only PR fetch for the real
  title, author, source branch, and target branch is still required when those output-header fields
  were not supplied; that fetch is not linkage discovery. If the block names no linked items, apply
  the existing **No work items linked to PR** edge case and stop.
- **Still run Steps 2-6 unchanged.** The daemon supplies IDs, not synthesis — you still fetch each
  linked item's full details, walk the parent chain, collect siblings and related items, and build
  the Context Tree and Context Summary yourself.
- **You may still call provider tools.** Pre-supplied context removes *redundant PR-level discovery*
  only. If you need a related PR's details, or a linked item the block only names by ID, fetch it —
  the block is a starting point, not a ceiling. Related PRs in the supplied block are navigation
  only and are not added to the unchanged output unless the hierarchy walk independently identifies
  them as related items.

Without a `## Daemon-Supplied Context` block, ignore this section — run Steps 1-6 exactly as written
below (today's fully autonomous behavior; unaffected by this mode).

## Workflow
```

- [ ] **Step 3: Wire the branch into Step 1 itself**

`### Step 1: Get PR-Linked Work Items` currently opens with "If given a PR number, fetch the PR with
its linked items:". Change the opening line so the branch is visible at the point where it is read,
not only in the prose section above:

```markdown
### Step 1: Get PR-Linked Work Items

**Pre-supplied-context mode:** if your dispatch prompt has a `## Daemon-Supplied Context` block,
skip only linked-item discovery — take those IDs from the block. Fetch PR metadata only when needed
to populate the real title, author, source branch, and target branch in the unchanged output header.
If the block names no linked items, apply the existing no-linked-items edge case and stop. Otherwise
(no supplied block), fetch the PR with its linked items:
```

Also update Step 1's existing metadata instruction from `Record the PR metadata (title, source
branch, author)` to `Record the PR metadata (title, author, source branch, target branch)` so the
unchanged output header has every named field. Leave the rest of Step 1, and Steps 2-6, unchanged —
this task changes only that metadata list, the opening lines above, and the new section from Step 2.

- [ ] **Step 4: Run the content check again (GREEN)**

```powershell
Select-String -Path code-reviewer/agents/pr-context-gatherer.md -Pattern '^## Pre-Supplied Context Mode$'
Select-String -Path code-reviewer/agents/pr-context-gatherer.md -Pattern 'Daemon-Supplied Context'
Select-String -Path code-reviewer/agents/pr-context-gatherer.md -Pattern 'skip only linked-item discovery'
```

Expected: all three match at least once.

- [ ] **Step 5: Focused test — mode is opt-in, not a rewrite of autonomous behavior**

```powershell
Select-String -Path code-reviewer/agents/pr-context-gatherer.md -Pattern 'Without a `## Daemon-Supplied Context` block'
```

Expected: match — the "unaffected otherwise" sentence is present, proving the branch is additive.

- [ ] **Step 6: Regression — untouched sections still intact**

```powershell
Select-String -Path code-reviewer/agents/pr-context-gatherer.md -Pattern '^### Step 6: Build the Context Tree$'
Select-String -Path code-reviewer/agents/pr-context-gatherer.md -Pattern '^## Edge Cases$'
Select-String -Path code-reviewer/agents/pr-context-gatherer.md -Pattern '^## Guiding Principles$'
```

Expected: all three still match — Steps 2-6, Output Format, Edge Cases, and Guiding Principles were
not touched by this task.

- [ ] **Step 7: Commit**

```bash
git add code-reviewer/agents/pr-context-gatherer.md
git commit -m "feat(code-reviewer): add pre-supplied-context mode to pr-context-gatherer"
```

---

## Task 2: Wire the skill entry point to pass supplied context through

**Files:**
- Modify: `code-reviewer/skills/pr-context/SKILL.md`

**Interfaces:**
- Consumes: `## Daemon-Supplied Context` marker from Task 1 (must match exactly).
- Produces: an updated dispatch example a caller can copy when it already holds compact navigation
  data (e.g. the daemon review host).

- [ ] **Step 1: Write the failing content check (RED)**

```powershell
Select-String -Path code-reviewer/skills/pr-context/SKILL.md -Pattern 'Daemon-Supplied Context'
```

Expected: no match.

- [ ] **Step 2: Extend the dispatch step**

In `### 2. Dispatch the Context Gatherer Agent`, the current prompt template ends after
`Output the structured context tree.` Add a paragraph and an extended prompt variant right after it:

```markdown
### 2. Dispatch the Context Gatherer Agent

Launch the `pr-context-gatherer` agent with the provider, PR number, and repository:

```
Agent:
  subagent_type: pr-context-gatherer (from code-reviewer plugin agents)
  prompt: |
    Provider: <github | ado>. Gather the full linked-item hierarchy for
    PR #<number> in repository <repo>. Walk the parent chain to the top
    (ADO: up to Epic; GitHub: parent sub-issue / tracking issue) and collect
    siblings at each level. Output the structured context tree.
```

**When the caller already has compact navigation data** (e.g. a review host that already fetched
linked work-item/issue IDs, related PR IDs, changed-file names, and base/head/merge-base SHAs),
append a `## Daemon-Supplied Context` block to the same prompt instead of letting the agent
rediscover that linkage:

```
Agent:
  subagent_type: pr-context-gatherer (from code-reviewer plugin agents)
  prompt: |
    Provider: <github | ado>. Gather the full linked-item hierarchy for
    PR #<number> in repository <repo>.

    ## Daemon-Supplied Context
    - Linked work items/issues: <id> — <link>
    - Related PRs: <id> — <link>
    - Changed files: <path>, <path>, ...
    - Base SHA: <sha>
    - Head SHA: <sha>
    - Merge-base SHA: <sha>
    - Review-thread refs: <ref>, <ref>, ...
    - Workspace root: <path>
    - KB path: <path>
```

The agent skips redundant PR-level discovery (it already has the linked IDs) but still fetches each
linked item's details, walks the parent chain, and builds the hierarchy exactly as in the autonomous
example above.
```

- [ ] **Step 3: Run the content check again (GREEN)**

```powershell
Select-String -Path code-reviewer/skills/pr-context/SKILL.md -Pattern 'Daemon-Supplied Context'
Select-String -Path code-reviewer/skills/pr-context/SKILL.md -Pattern 'skips redundant PR-level discovery'
```

Expected: both match.

- [ ] **Step 4: Focused test — the plain dispatch example is untouched**

```powershell
Select-String -Path code-reviewer/skills/pr-context/SKILL.md -Pattern 'Output the structured context tree\.'
```

Expected: still matches once — the original autonomous prompt example was not deleted, only extended.

- [ ] **Step 5: Regression — rest of SKILL.md unchanged**

```powershell
Select-String -Path code-reviewer/skills/pr-context/SKILL.md -Pattern '^### 3\. Present Results$'
Select-String -Path code-reviewer/skills/pr-context/SKILL.md -Pattern '^## Error Handling$'
```

Expected: both still match.

- [ ] **Step 6: Commit**

```bash
git add code-reviewer/skills/pr-context/SKILL.md
git commit -m "feat(code-reviewer): document pre-supplied-context dispatch in pr-context skill"
```

---

## Task 3: Add eval scenarios covering both modes

**Files:**
- Create: `code-reviewer/skills/pr-context/evals/evals.json`

**Interfaces:**
- Consumes: the exact `## Daemon-Supplied Context` marker (Task 1) and the skill's extended dispatch
  example (Task 2).
- Produces: three eval scenarios runnable via `claude plugin eval`, following the same schema used by
  `ado/skills/ado-work-my-backlog/evals/evals.json` (`skill_name`, `notes`, `evals[]` with `id`,
  `name`, `prompt`, `expected_output`, `assertions[]`).

- [ ] **Step 1: Write the failing check (RED)**

```powershell
Test-Path code-reviewer/skills/pr-context/evals/evals.json
```

Expected: `False` (file does not exist yet).

- [ ] **Step 2: Write the eval scenarios**

```json
{
  "skill_name": "pr-context",
  "notes": "These evals distinguish pre-supplied-context mode (daemon already fetched linkage) from ordinary autonomous invocation. Both dispatch the pr-context-gatherer agent; the assertions check which discovery calls it makes, not just its final output shape.",
  "evals": [
    {
      "id": 1,
      "name": "pre-supplied-context-skips-linkage-discovery",
      "prompt": "Dispatch code-reviewer:pr-context-gatherer with a prompt that includes a `## Daemon-Supplied Context` block naming linked work item #4821 and PR #5234 in repo MyRepository, with base/head/merge-base SHAs and no title, author, or branch metadata.",
      "expected_output": "The agent does not rediscover PR #5234's linked items. It performs only the metadata fetch needed to obtain the real PR title, author, source branch, and target branch; fetches work item #4821's full details (getWorkItemById/gh issue view); walks its parent chain; collects siblings; and returns the unchanged header, full Context Tree, and Context Summary.",
      "assertions": [
        {
          "name": "no_redundant_linkage_fetch",
          "description": "No PR call requests linked items or closing issues, since work item #4821 was already supplied; a metadata-only PR call is allowed"
        },
        {
          "name": "header_fields_present",
          "description": "The unchanged output header contains the provider's real PR title, author, source branch, and target branch — no missing or invented values"
        },
        {
          "name": "linked_item_still_fetched",
          "description": "getWorkItemById/gh issue view is called for work item #4821 to get its full details"
        },
        {
          "name": "hierarchy_still_built",
          "description": "Output includes the parent chain, siblings, and a Context Summary — not just an echo of the supplied block"
        }
      ]
    },
    {
      "id": 2,
      "name": "autonomous-mode-unchanged-without-supplied-context",
      "prompt": "Dispatch code-reviewer:pr-context-gatherer with only 'Provider: ado. Gather the full linked-item hierarchy for PR #5234 in repository MyRepository.' — no Daemon-Supplied Context block.",
      "expected_output": "The agent runs Step 1 as written: fetches the PR via getPullRequest(include: [\"workItems\"]) to discover linked work items, then proceeds through Steps 2-6 exactly as in today's behavior.",
      "assertions": [
        {
          "name": "pr_fetch_performed",
          "description": "getPullRequest (or gh pr view) is called to discover the PR's linked work items — Step 1 is not skipped"
        },
        {
          "name": "hierarchy_built",
          "description": "Output includes the parent chain, siblings, and a Context Summary, matching autonomous-mode behavior"
        }
      ]
    },
    {
      "id": 3,
      "name": "full-navigation-block-is-tolerant-and-paths-stay-navigation-only",
      "prompt": "Dispatch code-reviewer:pr-context-gatherer for PR #5234 in MyRepository with a `## Daemon-Supplied Context` block containing all nine field kinds: linked issue #4821 plus link; related PR #5200 plus link; changed files `src/Foo.cs` and `tests/FooTests.cs`; base, head, and merge-base SHAs; review-thread refs `gh-review:77` and `gh-issue:88`; workspace root `/workspace`; and KB path `KnowledgeBase/`.",
      "expected_output": "The agent accepts the prose block without rigid-schema validation, uses linked issue #4821 to build the normal hierarchy, and treats related PR, changed files, review-thread refs, workspace root, and KB path as navigation data rather than work-item fetch targets. The output shape remains the existing PR Context header, hierarchy, related items, and Context Summary.",
      "assertions": [
        {
          "name": "all_navigation_fields_tolerated",
          "description": "All nine field kinds are accepted without schema or indentation failure"
        },
        {
          "name": "changed_paths_not_fetch_targets",
          "description": "No provider issue/work-item fetch is attempted for `src/Foo.cs`, `tests/FooTests.cs`, workspace root, KB path, or review-thread refs"
        },
        {
          "name": "output_shape_unchanged",
          "description": "Output uses the existing PR Context header, hierarchy, Related Items section, and Context Summary; navigation-only related PR #5200 is not invented as a hierarchy item"
        }
      ]
    }
  ]
}
```

- [ ] **Step 3: Run the check again (GREEN)**

```powershell
Test-Path code-reviewer/skills/pr-context/evals/evals.json
```

Expected: `True`.

- [ ] **Step 4: Focused test — JSON is well-formed**

```powershell
Get-Content code-reviewer/skills/pr-context/evals/evals.json -Raw | ConvertFrom-Json | Out-Null
```

Expected: no error.

- [ ] **Step 5: Regression — run the eval suite**

```bash
claude plugin eval code-reviewer/skills/pr-context/evals/evals.json
```

Expected: all three scenarios run and their assertions are checked (do not require a specific verdict
here — this is new coverage, not a re-run of an existing green suite — but a crash or "skill not
found" is a regression and must be fixed before continuing).

- [ ] **Step 6: Commit**

```bash
git add code-reviewer/skills/pr-context/evals/evals.json
git commit -m "test(code-reviewer): add pre-supplied-context eval scenarios for pr-context"
```

---

## Task 4: Bump plugin and marketplace versions

**Files:**
- Modify: `code-reviewer/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

**Interfaces:**
- Produces: `code-reviewer` version `1.22.0` in both files; marketplace `metadata.version` `1.16.0`.
  This version is a release marker only — Task 5's rollout contract explicitly forbids gating on it.

- [ ] **Step 1: Write the failing check (RED)**

```powershell
Select-String -Path code-reviewer/.claude-plugin/plugin.json -Pattern '"version": "1.22.0"'
Select-String -Path .claude-plugin/marketplace.json -Pattern '"version": "1.16.0"'
```

Expected: no matches (both files still carry the old versions).

- [ ] **Step 2: Bump `code-reviewer/.claude-plugin/plugin.json`**

Change:

```json
  "version": "1.21.0"
```

to:

```json
  "version": "1.22.0"
```

- [ ] **Step 3: Bump `.claude-plugin/marketplace.json`**

Change the root metadata:

```json
  "metadata": {
    "description": "A marketplace for custom plugins and skills",
    "version": "1.15.0"
  },
```

to:

```json
  "metadata": {
    "description": "A marketplace for custom plugins and skills",
    "version": "1.16.0"
  },
```

And the `code-reviewer` plugin entry's own `version` field (the one immediately after its
`description`, currently `"version": "1.21.0",` at line 184):

```json
      "version": "1.21.0",
```

to:

```json
      "version": "1.22.0",
```

- [ ] **Step 4: Run the check again (GREEN)**

```powershell
Select-String -Path code-reviewer/.claude-plugin/plugin.json -Pattern '"version": "1.22.0"'
Select-String -Path .claude-plugin/marketplace.json -Pattern '"version": "1.16.0"'
$marketplace = Get-Content .claude-plugin/marketplace.json -Raw | ConvertFrom-Json
($marketplace.plugins | Where-Object name -eq 'code-reviewer').version
```

Expected: the first two checks match, and the per-plugin `code-reviewer` version prints `1.22.0`.

- [ ] **Step 5: Focused test — both JSON files still parse**

```powershell
Get-Content code-reviewer/.claude-plugin/plugin.json -Raw | ConvertFrom-Json | Out-Null
Get-Content .claude-plugin/marketplace.json -Raw | ConvertFrom-Json | Out-Null
```

Expected: no error.

- [ ] **Step 6: Regression — repo's own JSON validator**

```powershell
./clean-builds/scripts/validate-json-files.ps1
```

Expected: passes (or, if this script only covers a different file set, confirm it does not fail on
the two files touched here — either result is fine as long as it is not a new failure this task
introduced).

- [ ] **Step 7: Commit**

```bash
git add code-reviewer/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore(code-reviewer): bump to 1.22.0, marketplace to 1.16.0 for pre-supplied-context mode"
```

---

## Task 5: Verify exposure on both review hosts and hand off the prerequisite contract

**Files:**
- None to create or modify in this repo. This task is a verification procedure plus a fixed
  contract other repos consume — it does not touch source, tests, or manifests beyond what Tasks 1-4
  already changed.

**Interfaces:**
- Consumes: the two markers from Tasks 1-2 (`## Daemon-Supplied Context`, `## Pre-Supplied Context
  Mode`), and the version bump from Task 4 (informational only).
- Produces: the **prerequisite contract** below, verbatim, for LmDotnetTools' companion plan to cite.

### Why this task exists (grounding, not guesswork)

Both review hosts share one physical sandbox gateway. The live LmStreaming configuration maps the
gateway directory alias `claude_plugins` to `B:\sources\claude_plugins`, the checkout this plan
edits. The marketplace manifest's internal name is `gb-plugins-marketplace`; the daemon separately
requests `gb-plugins` through `LmStreamingReviewMarketplace`, `Marketplaces`, and
`SubAgentMarketplaces`. Those three strings are not interchangeable. Verification must resolve the
actual runtime alias mapping before claiming either host sees this plugin. The gateway reads
`.claude-plugin/marketplace.json` and treats each subdirectory with `.claude-plugin/plugin.json` as a
plugin (see `SandboxWorkspaceGuide.md`, "Plugins (Claude-plugin marketplaces)").
`CodeReviewDaemon.Sample` talks to the same gateway through LmStreaming — there is one gateway, not
one per host. A single gateway restart re-reads this repo's markdown once alias resolution passes.

Two discovery paths exist on the LmDotnetTools side (do not touch either — verification only):
`MarketplaceSubAgentLoader` (`GET /api/v1/marketplaces/preview`) returns a **best-effort stub** system
prompt built only from `name`/`description` — it never carries the real markdown body. The path that
matters for this feature is `WorkspaceSubAgentLoader` / `SandboxSessionRegistry.ListDiscoveredAsync`
(`GET /api/v1/sandboxes/{id}/discovered`, `kind == "subagent"`), which — per
`WorkspaceSubAgentLoader.cs`'s own comment, "marketplace sub-agents arrive with their full markdown
body inline" — returns `item.Content` containing the actual `pr-context-gatherer.md` body, including
the new section from Task 1. That is the path a rollout gate must resolve against, not the preview
stub.

### Verification steps (run after Tasks 1-4 are committed)

- [ ] **Step 1: Confirm the gateway points at this checkout**

```powershell
Select-String -Path "B:\sources\LmDotnetTools\samples\LmStreaming.Sample\appsettings.Development.json" -Pattern 'PluginsDirs'
```

Expected: contains `claude_plugins=B:\sources\claude_plugins` (or an equivalent path to this repo's
working tree/checkout). If it points elsewhere, exposure verification must run against that path
instead — do not assume the path above without checking.

- [ ] **Step 2: Restart the shared gateway**

Stop and relaunch the gateway process (or restart `LmStreaming.Sample`'s backend, which auto-spawns
it per `SandboxWorkspaceGuide.md`). Skills and plugins are read at gateway startup — a running gateway
does not pick up this plan's edits on its own.

- [ ] **Step 3: Resolve the runtime marketplace aliases before checking exposure**

Enumerate the running gateway's advertised aliases from its startup log (`Discovered plugins in
marketplace, alias=...`) or `GET /api/v1/marketplaces/preview`. Record the exact alias requested by
each path:

- LmStreaming: the alias key on `SandboxGateway:PluginsDirs` (currently `claude_plugins`).
- CodeReviewDaemon: `CodeReviewDaemon:LmStreamingReviewMarketplace` and each value in
  `CodeReviewDaemon:SubAgentMarketplaces` / `Marketplaces` (currently `gb-plugins`).
- Manifest identity: `.claude-plugin/marketplace.json` name (currently `gb-plugins-marketplace`).

Pass only when every alias each host requests is advertised by the running gateway and resolves to
`B:\sources\claude_plugins` (or the checked working-tree equivalent). If `gb-plugins` is not an
advertised alias for that checkout, record the skew as a rollout prerequisite for LmDotnetTools'
companion daemon plan; do not call it a failure of this plan's Tasks 1-4, and do not enable the daemon
prompt until the companion config/deployment resolves it.

- [ ] **Step 4: Confirm both agent and skill exposure through each host's session**

For a workspace/sandbox session created through each host using its resolved alias, call
`GET /api/v1/sandboxes/{sessionId}/discovered`. Locate:

1. `kind == "subagent"`, `name == "pr-context-gatherer"`; its `content` must contain both markers.
2. When discovery exposes `kind == "skill"`, locate the `pr-context` skill and confirm its `content`
   contains `## Daemon-Supplied Context` and the pre-supplied dispatch guidance. If this gateway
   surface does not return skills, invoke `code-reviewer:pr-context` through the normal Skill tool and
   inspect the resolved `SKILL.md` content instead; absence of `kind == "skill"` alone is not failure.

```powershell
# Examples once each discovered item's content is saved for inspection:
Select-String -Path <subagent-content-dump>.md -Pattern '## Pre-Supplied Context Mode'
Select-String -Path <subagent-content-dump>.md -Pattern '## Daemon-Supplied Context'
Select-String -Path <skill-content-dump>.md -Pattern '## Daemon-Supplied Context'
Select-String -Path <skill-content-dump>.md -Pattern 'skips redundant PR-level discovery'
```

Expected: all checks match for a session created through `LmStreaming.Sample` **and** one created
through `CodeReviewDaemon.Sample` — proving both entry points are exposed to both hosts.

- [ ] **Step 5: Record the result**

Record each host's requested alias, its resolved checkout, and agent/skill pass or fail in the
PR/work item. Do not report rollout ready until both hosts pass. Alias skew follows Step 3's companion
handoff instead of being misreported as a plugin implementation failure.

### Prerequisite contract for LmDotnetTools (cite this, do not re-derive it)

1. **Input marker (daemon → agent):** the dispatch prompt must contain the literal heading
   `## Daemon-Supplied Context` for the agent to enter pre-supplied-context mode. No other spelling,
   casing, or wrapping is recognized.
2. **Fields under that heading** (compact navigation data only, prose lines — parsing is tolerant, not
   a rigid schema): linked work-item/issue IDs + links, related PR IDs + links, changed-file names
   only, base SHA, head SHA, merge-base SHA, discussion/thread refs, workspace root, KB path. No diff,
   file contents, full work-item bodies, or large conversation bodies.
3. **Behavior guarantee:** with the marker present, the agent skips redundant linkage discovery,
   but may fetch PR title/author/branches for the unchanged header and still fetches linked-item
   details to build the hierarchy (Steps 2-6). An empty linked-item list uses the existing no-items
   edge case. Without the marker, behavior remains fully autonomous.
4. **Alias prerequisite:** before exposure checks, enumerate the running gateway's aliases and prove
   the alias requested by each host resolves to this checkout. Today the relevant names are directory
   alias `claude_plugins`, daemon selector `gb-plugins`, and manifest name
   `gb-plugins-marketplace`; similarity is not a mapping. An unresolved selector is handed to the
   LmDotnetTools companion plan and blocks prompt enablement.
5. **Installed-mode markers (for the rollout gate):** resolve the actual installed/exposed
   `pr-context-gatherer` subagent through `GET /api/v1/sandboxes/{id}/discovered` (not only the
   `/marketplaces/preview` stub). Check its content for `## Pre-Supplied Context Mode` and
   `## Daemon-Supplied Context`. Verify the `pr-context` skill's `## Daemon-Supplied Context`
   guidance from a discovered `kind == "skill"` item when available; otherwise invoke the normal
   Skill tool and inspect its resolved `SKILL.md`. **Do not** gate on a plugin version number.
6. **Version shipped in this plan (informational only):** `code-reviewer` 1.22.0,
   `.claude-plugin/marketplace.json` `metadata.version` 1.16.0.
7. **Shared gateway:** both review hosts use one gateway, but each host's session must be verified
   with the alias it actually requests after one restart.

- [ ] **Step 6: Notify the companion plan's author**

Send the contract above plus the recorded alias map to whoever executes LmDotnetTools'
`2026-08-31-daemon-review-engagement*` plan, citing this plan's path and commit range. Any alias skew
is an explicit rollout prerequisite there; do not invent a commit ID or enable the daemon prompt
before it is resolved.

---

## Self-Review

**Spec coverage** (against `2026-08-30-daemon-review-engagement-design.md`):
- §5 pre-supplied-context mode, lives in the real agent definition, no repo-local shadow agent →
  Task 1.
- §5 "asks the primary... to invoke the agent or its skill entry point" → both entry points covered:
  Task 1 (agent), Task 2 (skill).
- §5 corrected semantics (skip redundant PR-level discovery, not every fetch) → Task 1 Steps 2-3, and
  Task 3's eval scenario 1 assertions distinguish "no redundant PR fetch" from "linked item still
  fetched."
- §13 "Resolve the actual installed/exposed `pr-context-gatherer` template... assert its
  pre-supplied-context mode contains/obeys the no-refetch branch" → Task 5, prerequisite contract
  item 5.
- §13 "Deployment order: release and install the code-reviewer plugin update... before enabling the
  daemon's context-first prompt" → Task 5 verification steps + Step 6 handoff.
- §14 "Companion repository: `code-reviewer/agents/pr-context-gatherer.md`" → this is the only file
  this plan's core change touches (Task 1).
- Version/rollout must be content-based, not version-comparison-based → Global Constraints, Task 5
  contract item 5 (explicit "do not gate on version number").

**Placeholder scan:** no `TODO`/`TBD`; every code/JSON/PowerShell block above is the actual text to
write, not a description of it; no invented file paths — every path was read directly from the repo
during research for this plan.

**Consistency:** `## Daemon-Supplied Context` and `## Pre-Supplied Context Mode` are used identically,
verbatim, across Tasks 1, 2, 3, and 5's contract — no drift in spelling or casing. Version numbers
(1.22.0 / 1.16.0) match across Task 4's two files and Task 5's contract item 6.

**Path, line count, task count:** this file —
`B:\sources\claude_plugins\docs\superpowers\plans\2026-08-31-pr-context-gatherer-pre-supplied-context.md`
— 5 tasks (agent branch, skill wiring, evals, version bump, exposure verification + contract
handoff). Line count: see file (this document).

**Unresolved verified constraint:** The live LmStreaming configuration was read on 2026-08-31 and
contains `PluginsDirs = claude_plugins=B:\sources\claude_plugins`. The remaining open deployment
fact is alias mapping: the daemon currently requests `gb-plugins`, while the directory alias is
`claude_plugins` and the manifest name is `gb-plugins-marketplace`. Task 5 Step 3 must resolve that
mapping from the running gateway before either host is declared exposed; skew is handed to the
LmDotnetTools companion plan and blocks prompt enablement, not Tasks 1-4.
