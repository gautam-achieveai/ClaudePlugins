# Fresh standalone repository: `achieveai/sandbox-plugins`

**Date:** 2026-08-10
**Status:** Approved design — ready for execution
**Source repo:** `B:\sources\claude_plugins` (this repo; not modified except for this spec)
**Destination:** new private GitHub repository `achieveai/sandbox-plugins` (**not created by this
spec** — creation happens in a later, separate step)

## Problem

`claude_plugins` is a personal, dual-homed marketplace (GitHub personal account + a private
Azure DevOps org) hosting eight plugins. Two of them — `sandbox` and `sandbox-auth` — are
self-contained, reusable outside that context, and worth publishing as the seed of a dedicated
marketplace under the `achieveai` GitHub organization. Everything else in `claude_plugins`
(other plugins, org-private config, personal scripts, unrelated docs/tests) must not carry over.

## Goals

- Stand up a new, independent git history containing only `sandbox` and `sandbox-auth` plus a
  curated set of root files needed to make the new repo a valid, self-describing Claude Code
  plugin marketplace.
- Keep the new marketplace **extensible**: it must not be described or structured as permanently
  limited to two Sandbox-branded plugins.
- Establish the architectural principle that **Sandbox is the expected runtime context**, not a
  taxonomy every plugin must be named after. Future plugins are named by domain.
- Exclude every trace of the source repo's private Azure DevOps org, personal local paths, and
  unrelated content.

## Non-goals

- Do not create the `achieveai/sandbox-plugins` GitHub repository as part of this spec — that is
  a later, separate action once this design is reviewed.
- Do not modify `sandbox/` or `sandbox-auth/` in the source repo.
- Do not import source-repo git history into the new repo (explicit user decision: fresh
  history, single initial commit).
- Do not carry over `AGENTS.md`, `CONTRIBUTING.md`, root `tests/`, or the inspiration-cloning
  script — see Exclusions.

## Architecture

### Sandbox is runtime context, not taxonomy

The new repository's marketplace will eventually host plugins unrelated to sandbox internals —
for example `email`, `collaboration`, `azure-devops` domain skills. Those future plugins are
expected to *run inside* a sandboxed agent session, but that is an execution-environment fact,
not an identity. Naming and ownership follow the plugin's actual domain, not the fact that it
happens to execute in a sandbox.

This yields two related but distinct concerns already split across the two seed plugins, and the
split must be preserved and documented going forward:

- **`sandbox`** owns **runtime/workspace concerns**: bootstrapping a workspace's memory and
  scripts directories, maintaining task handoff state across a session, and script-based
  repeatable workflows for the sandboxed agent itself. It is about *operating inside* the
  sandbox.
- **`sandbox-auth`** owns **egress authentication concerns**: the wire contract for
  authenticating outbound network calls from inside a sandbox that sits behind a MITM
  egress-proxy + gateway auth-webhook. This covers the HTTP 511 `auth_pending` handshake, 403
  deny handling, backoff polling, human-in-the-loop device-code relay, transparent server-side
  token injection (the agent never holds tokens), warm-then-run, and a portable Python probe
  engine, plus thin per-service skills (GitHub, Azure DevOps, Microsoft Graph, generic connect)
  that reference the shared egress-auth mechanics with service-specific probe URLs/scopes.

Rule for all future additions to this marketplace: a plugin is named and scoped by what it does
(`email`, `collaboration`, `azure-devops`), never prefixed `sandbox-` merely because it is
expected to execute inside a sandbox. Reserve the `sandbox` name for the workspace/runtime
plugin and `sandbox-auth` for the egress-authentication plugin; do not overload either with
domain-specific logic that belongs in a new, separately named plugin.

### Marketplace registry stays extensible

`.claude-plugin/marketplace.json` in the new repo is a **new file**, not a filtered copy of the
source repo's version. It starts with exactly two entries (`sandbox-auth`, `sandbox`, copied
verbatim from the corresponding entries in the source repo's `marketplace.json`, byte-for-byte
description/tags/keywords) but:

- `metadata.version` resets to `1.0.0` (new artifact, not a continuation of the source repo's
  `1.14.8` lineage).
- `name` becomes `sandbox-plugins-marketplace` (distinct from the source repo's
  `gb-plugins-marketplace` identity, matching the new repo name).
- `owner.name` stays `"Gautam Bhakar"` — this is the user's own marketplace, ownership doesn't
  change with the repo's rename.
- The registry's shape (a `plugins` array of `{name, source, description, version, category,
  tags, keywords}` objects) is unchanged from the source repo's schema, so adding a third,
  fourth, etc. plugin later is a matter of appending another entry — no structural change
  needed. The README and CLAUDE.md written for the new repo describe this as an open marketplace,
  not a fixed two-plugin one.

## Exact initial inventory

### Plugin trees — copied verbatim, unmodified

Every file below is `git ls-files`-tracked in the source repo today and copied byte-for-byte
into the same relative path under the new repo root. No content edits, no renames.

```
sandbox/
├── .claude-plugin/plugin.json
├── README.md
├── evals/sandbox-memory/eval.yaml
├── evals/sandbox-memory/tasks/negative-trigger-1.yaml
├── evals/sandbox-memory/tasks/positive-trigger-1.yaml
├── evals/sandbox-memory/tasks/positive-trigger-2.yaml
├── scripts/workspace-task-start.ps1
└── skills/
    ├── sandbox-auth-flow/SKILL.md
    ├── sandbox-memory/SKILL.md
    ├── sandbox-scripts/SKILL.md
    └── sandbox-workspace-bootstrap/SKILL.md

sandbox-auth/
├── .claude-plugin/plugin.json
├── README.md
├── references/architecture.md
├── scripts/sandbox-auth-fetch.py
├── scripts/warm-github-auth.py
└── skills/
    ├── azure-devops/SKILL.md
    ├── connect/SKILL.md
    ├── egress-auth/SKILL.md
    ├── egress-auth/scripts/sandbox-auth-fetch.py
    ├── egress-auth/scripts/warm-github-auth.py
    ├── github/SKILL.md
    └── microsoft-graph/
        ├── SKILL.md
        └── references/
            ├── calendar.md
            ├── files-sharepoint.md
            ├── mail.md
            ├── meetings.md
            ├── search-directory.md
            └── teams-chat.md
```

Not copied even though present on disk: `sandbox-auth/scripts/__pycache__/*.pyc`. It is untracked
(matches the source repo's `__pycache__/` gitignore rule), a compiled artifact, and regenerates
on first Python run — copying it would embed a stale, platform-specific binary in a fresh repo.

### Root files — curated, not a filtered copy

| Path in new repo | Origin | Treatment |
|---|---|---|
| `.claude-plugin/marketplace.json` | new file | Authored per "Marketplace registry stays extensible" above — two entries copied verbatim from source, version reset to `1.0.0`, `name` changed. |
| `.gitattributes` | `claude_plugins/.gitattributes` | Copied as-is — generic line-ending rules (`*.md`/`*.json`/`*.yml`/`*.yaml`/`*.sh` → LF; `*.bat`/`*.cmd`/`*.ps1` → CRLF), nothing source-specific. |
| `.gitignore` | `claude_plugins/.gitignore`, trimmed | Copied with three dead lines removed: `.ai/work-my-backlog/`, `code-reviewer/skills/pr-review/claude_plugins.code-workspace`, and `code-reviewer/skills/over-engineering-review-workspace/` (paths belonging to plugins/workflows that don't exist in the new repo). Everything else kept (node/python/IDE/log/env/build/OS/temp rules, `.mcp.json` user-config rule, `*.mcpb`/`.mcp-build/`, the `scratchpad/**` + `!scratchpad/README.md` pair, `inspirations/`). |
| `CLAUDE.md` | `claude_plugins/CLAUDE.md` | Copied as-is — it documents the generic plugin/skill/agent/command file-format conventions and naming rules; none of it is source-repo-specific. |
| `README.md` | new file | Rewritten from scratch, scoped to the two seed plugins and describing the marketplace as extensible (see below). |
| `scratchpad/README.md` | `claude_plugins/scratchpad/README.md` | Copied as-is, to carry forward the scratchpad/conversation-memory convention the user's global CLAUDE.md instructions already require. |

New `README.md` must cover, at minimum: what the repo is (a Claude Code plugin marketplace,
private, under `achieveai`), the install command pointing at
`achieveai/sandbox-plugins`, a short description of each of the two current plugins
(`sandbox` = runtime/workspace, `sandbox-auth` = egress auth), and an explicit statement that the
marketplace is expected to grow with domain-named plugins (e.g. `email`, `collaboration`,
`azure-devops`) that may run inside a sandbox but are not renamed to `sandbox-*` for that reason
alone.

### Explicitly omitted, with reason

| Path | Reason |
|---|---|
| `.mcp.json` (untracked) | Hardcodes the private Azure DevOps org (`AZURE_DEVOPS_ORG_URL=https://mcqdbdev.visualstudio.com/`, project `MCQdb_Development`, repo `MCQdbDev`). Not used by either seed plugin. |
| `.codex/config.toml` | Same private ADO org/project values as `.mcp.json`. Clearest source of org leakage found in research; must not carry forward. |
| `.claude/settings.local.json` | Contains a Bash permission entry hardcoding the local path `/b/sources/claude_plugins`. Personal/local, not portable. Regenerate fresh in the new repo if needed. |
| `.ai/work-my-backlog/` (untracked) | Belongs to the gh/ado backlog workflow, not tracked, not relevant. |
| `scripts/clone-inspirations.sh` | References a second private-looking repo (`gautam-msft/claude-plugin-mp`) and pulls public inspiration repos for whole-marketplace plugin authoring; unrelated to the two seed plugins. |
| `inspirations/` (untracked) | Scratch clones produced by the script above. |
| `tests/*.test.mjs` (3 files) | All three hardcode assertions about `ado`/`gh`/`code-reviewer`/`development` directory layouts that won't exist in the new repo — copying would produce a permanently-failing or dead test suite; none test `sandbox`/`sandbox-auth`. No root `package.json`/test runner exists to carry over either. |
| `docs/superpowers/specs/2026-06-22-split-draft-work-item-design.md` | Design doc for an unrelated `development`-plugin feature. |
| `AGENTS.md` | Codex-compatibility mirror of `CLAUDE.md`; no evidence either seed plugin needs Codex support. Omit until a concrete need arises — cheap to add later. |
| `CONTRIBUTING.md` | Describes a `plugins/` subdirectory layout that doesn't match the actual repo layout (plugins live at repo root) — a pre-existing inaccuracy in the source repo. Not worth faithfully reproducing into a fresh repo; low value for a small personal marketplace. Re-add, corrected, if the repo later goes public/multi-contributor. |
| `worktrees/`, `.ai/`, `.git/`, `.gk/` | Local tooling/VCS internals of this checkout; the new repo gets its own fresh `.git`. |

## Copy and adaptation rules

1. **Verbatim plugin copy.** Every file under `sandbox/` and `sandbox-auth/` (per the inventory
   above) is byte-for-byte copied — same content, same relative path, same file mode. No text
   substitution, no path rewriting inside skill/reference files.
2. **New root files are authored, not templated.** `marketplace.json` and `README.md` are written
   fresh for the new repo's identity; they are not produced by regex-stripping the source repo's
   versions, to avoid silently carrying over a stray reference (e.g. the old repo URL or plugin
   count) that a mechanical strip could miss.
3. **Copied-as-is root files get no edits.** `.gitattributes` and `CLAUDE.md` are copied without
   modification because they are already generic. `scratchpad/README.md` likewise.
4. **`.gitignore` gets a minimal, enumerated trim.** Only the three dead-path lines identified in
   the inventory table are removed; every other line is preserved unchanged and in its original
   order.
5. **Version numbers are not renumbered on copy.** The two plugin.json files
   (`sandbox` at `1.0.0`, `sandbox-auth` at `2.1.1`) and their marketplace.json entries keep their
   existing version strings — only the marketplace-level `metadata.version` resets to `1.0.0`,
   because that field describes the marketplace artifact itself, which is new.
6. **No history import.** The new repo starts from `git init` in an empty local directory, adds
   the curated file set as a single initial commit, and is pushed as the entire history — nothing
   from `claude_plugins`'s commit log, branches, or tags carries over.

## Safety and error handling

- **Never read or copy `.mcp.json`, `.codex/config.toml`, or `.claude/settings.local.json`** into
  the staging directory used to build the new repo, even temporarily — these are the confirmed
  org-leakage vectors. Building the new repo's file set should enumerate an explicit include list
  (the inventory above), not a "copy everything except a blocklist" approach, so a future
  untracked/ignored file added to the source repo can't accidentally slip through.
- **Verify no ADO org strings before first push.** Before pushing the initial commit, grep the
  entire staged tree for `mcqdbdev`, `MCQdb_Development`, and `MCQdbDev` (case-insensitive) and
  confirm zero hits. This is a hard gate — if any hit is found, stop and remove the offending
  file/line before proceeding.
- **Verify no personal absolute paths.** Grep the staged tree for `/b/sources/claude_plugins`,
  `B:\sources\claude_plugins`, and the current OS username, confirming zero hits.
- **Confirm plugin trees are an exact match against `git ls-files` output** (no extra files, no
  missing files), i.e. re-run
  `git -C <source-repo> ls-files sandbox sandbox-auth` at copy time and diff the resulting path
  list against the inventory in this spec — catches drift if either plugin has changed since this
  design was written.
- **Do not touch the source repository's working tree.** All copying is read-only against
  `claude_plugins`; the only source-repo write in this whole effort is this spec file. The
  untracked `ado/scripts/ado-cli.js` and any other current source-repo changes stay untouched and
  unstaged.
- **New repo starts private.** `achieveai/sandbox-plugins` is created as a **private** GitHub
  repository under the `achieveai` org (per the task requirement) — this is a constraint for the
  later creation step, not something this spec's file-copy work can violate, but it's recorded
  here so the creation step doesn't default to public.

## Validation

Before considering the new repo's initial commit ready to push:

1. **Structural check** — the staged tree matches the inventory in this spec exactly: diff a
   recursive file listing of the staging directory against the "Exact initial inventory" section
   above (plugin trees + curated root files), zero unexpected extra files, zero missing files.
2. **JSON validity** — `marketplace.json`, `sandbox/.claude-plugin/plugin.json`, and
   `sandbox-auth/.claude-plugin/plugin.json` all parse as valid JSON and match the source repo's
   plugin.json content byte-for-byte for the two plugin manifests.
3. **Marketplace schema check** — `marketplace.json`'s `plugins` array has exactly two entries,
   `name: "sandbox-auth"` and `name: "sandbox"`, each with `source` pointing at `./sandbox-auth`
   and `./sandbox` respectively, matching the copied plugin directories.
4. **No org/personal leakage** — the two greps from the Safety section (ADO org strings, personal
   paths) both return zero hits against the fully staged tree.
5. **No stray artifacts** — no `__pycache__/`, no `.git`/`.gk`/`.ai` directories, no
   `node_modules/`, nothing matching the new `.gitignore`'s patterns present in the initial
   commit's tracked file list.
6. **Skill self-containment holds** — re-run the cross-reference grep from the research phase
   (searching both plugin trees for `ado:`, `gh:`, `code-reviewer:`, `development:`,
   `orleans-dev:`, `clean-builds:`, `debugging:`, `developer-performance-review:` namespace
   references) against the staged copies and confirm it still returns zero real hits, confirming
   nothing in the copied files depends on a plugin that didn't come along.

## Publish verification

After the new repository is created and the initial commit is pushed (a later step, out of scope
for this spec but planned here so the later step has a checklist):

1. Confirm `achieveai/sandbox-plugins` exists, is **private**, and has exactly one commit on its
   default branch.
2. Confirm the pushed tree matches the local staged tree exactly (e.g. `git diff` between local
   HEAD and the remote's fetched HEAD is empty).
3. Confirm the repo's default branch name matches what `gh repo create` produced (`main`, per
   standard `gh` behavior) and that no other branches or tags exist.
4. Confirm the repository is installable as a Claude Code marketplace: `marketplace.json` is
   reachable at the repo root and both plugin entries' `source` paths resolve to real directories
   in the same push.
5. Re-run the two leakage greps (ADO org strings, personal paths) against the **remote** clone (not
   just the local staging directory) as a final independent confirmation before treating the repo
   as done.
