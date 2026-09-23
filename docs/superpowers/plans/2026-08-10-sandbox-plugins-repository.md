# Sandbox Plugins Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `B:\sources\sandbox-plugins` as a fresh-history repository containing the existing `sandbox` and `sandbox-auth` plugins, then publish it privately as `achieveai/sandbox-plugins`.

**Architecture:** Build from an explicit allowlist. Copy both plugin trees byte-for-byte, author only the marketplace identity and root README, preserve approved generic root files, validate privacy and structure, create one initial commit, publish privately, and verify through a fresh clone.

**Tech Stack:** PowerShell 7+, Git, GitHub CLI, JSON.

## Global Constraints

- Never overwrite an existing `B:\sources\sandbox-plugins`; stop if it exists unexpectedly.
- Use fresh Git history with one initial commit on `main`.
- Copy all 29 tracked files under `sandbox/` and `sandbox-auth/` byte-for-byte.
- Never copy `.mcp.json`, `.codex/config.toml`, `.claude/settings.local.json`, unrelated plugins, root tests, inspirations, or source history.
- Author `.claude-plugin/marketplace.json` and `README.md` specifically for this repository.
- Copy `.gitattributes`, `CLAUDE.md`, and `scratchpad/README.md` unchanged.
- Trim only the three obsolete plugin-specific lines identified by the design from `.gitignore`.
- Keep plugin versions: `sandbox` `1.0.0`; `sandbox-auth` `2.1.1`. Marketplace metadata starts at `1.0.0`.
- The marketplace is extensible. Sandbox is the runtime context, not the taxonomy. Future plugins use domain names such as `email`, `collaboration`, and `azure-devops`.
- Do not modify or stage unrelated source-repository changes.
- Create only `achieveai/sandbox-plugins`, with visibility `PRIVATE`.
- Do not push until every validation gate passes.
- Commit and PR text must contain no AI signature or `Co-Authored-By` line.

---

### Task 1: Preflight source, destination, and GitHub

**Files:** Read-only checks.

**Interfaces:**
- Produces source path `B:\sources\claude_plugins` and destination path `B:\sources\sandbox-plugins`.

- [ ] Set `$SourceRepo = 'B:\sources\claude_plugins'` and `$DestRepo = 'B:\sources\sandbox-plugins'`.
- [ ] Run `Test-Path $DestRepo`; require `False`. If `True`, inspect and stop rather than overwrite.
- [ ] Run `git --version`, `gh --version`, and `gh auth status`; require active GitHub authentication with repository creation access.
- [ ] Run `gh repo view achieveai/sandbox-plugins`; require the repository not to exist before creation.
- [ ] Run `git -C $SourceRepo status --porcelain sandbox sandbox-auth`; require no changes in either source plugin tree.
- [ ] Run `git -C $SourceRepo ls-files sandbox sandbox-auth`; require the approved 29-file inventory from the design spec.

### Task 2: Initialize the fresh local repository

**Files:**
- Create: `B:\sources\sandbox-plugins\.git\`

- [ ] Create `B:\sources\sandbox-plugins` only after the absent-path check passes.
- [ ] Run `git -C $DestRepo init -b main`.
- [ ] Run `git -C $DestRepo branch --show-current`; require `main`.
- [ ] Run `git -C $DestRepo log --oneline`; require no commits.

### Task 3: Copy the two approved plugin trees

**Files:**
- Create: all source-controlled files under `sandbox/` and `sandbox-auth/`.

- [ ] Build the copy list directly from `git -C $SourceRepo ls-files sandbox sandbox-auth` after verifying it matches the 29-file specification.
- [ ] For each approved path, create its destination parent and use `Copy-Item` on the individual file. Do not recursively copy directories.
- [ ] Require exactly 29 copied plugin files.
- [ ] Compare SHA-256 hashes for every source/destination pair; require no mismatches.
- [ ] Require no nested `.git`, `__pycache__`, or `node_modules` directory.

### Task 4: Build the curated marketplace root

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `README.md`
- Create: `.gitattributes`
- Create: `.gitignore`
- Create: `CLAUDE.md`
- Create: `scratchpad/README.md`

- [ ] Copy `.gitattributes`, `CLAUDE.md`, and `scratchpad/README.md` byte-for-byte from the source.
- [ ] Generate `.gitignore` from the source while removing exactly:
  - `.ai/work-my-backlog/`
  - `code-reviewer/skills/pr-review/claude_plugins.code-workspace`
  - `code-reviewer/skills/over-engineering-review-workspace/`
- [ ] Author `.claude-plugin/marketplace.json` with:
  - top-level name `sandbox-plugins-marketplace`
  - owner `Gautam Bhakar`
  - metadata version `1.0.0`
  - exactly two initial entries: `sandbox-auth` from `./sandbox-auth` at `2.1.1`, and `sandbox` from `./sandbox` at `1.0.0`
  - the complete descriptions, tags, and keywords from the source entries
- [ ] Author `README.md` with:
  - purpose and private ownership
  - installation commands for `achieveai/sandbox-plugins`
  - `sandbox` as workspace/runtime concerns
  - `sandbox-auth` as egress-auth concerns
  - explicit extensibility statement: future plugins are named by domain, not automatically prefixed with `sandbox-`
- [ ] Require exactly these six curated root files plus the two plugin directories.

### Task 5: Validate before committing

**Files:** Read-only validation.

- [ ] Parse marketplace and both plugin manifests with `ConvertFrom-Json`; require success.
- [ ] Require marketplace name `sandbox-plugins-marketplace`, metadata version `1.0.0`, two plugins, and valid relative sources.
- [ ] Compare both copied `plugin.json` files with source bytes; require equality.
- [ ] Search all non-`.git` files for `mcqdbdev`, `MCQdb_Development`, and `MCQdbDev`; require zero hits.
- [ ] Search for `/b/sources/claude_plugins` and `B:\sources\claude_plugins`; require zero hits.
- [ ] Search for `Gautam Bhakar`; permit exactly the intentional marketplace `owner.name` occurrence and nothing else.
- [ ] Search plugin trees for excluded namespaces (`ado:`, `gh:`, `code-reviewer:`, `development:`, `orleans-dev:`, `clean-builds:`, `debugging:`, `developer-performance-review:`); require zero hits.
- [ ] Compare the complete working tree against the approved 35-file inventory; require no missing or extra files.
- [ ] Run the plugin validator against both plugins and marketplace structure; fix any confirmed issue before committing.

### Task 6: Create and independently review the initial commit

**Files:**
- Modify: `.git` history only.

- [ ] Run `git -C $DestRepo add -A`.
- [ ] Inspect `git -C $DestRepo status --short`; require only intended additions.
- [ ] Run `git -C $DestRepo diff --cached --check`; require no errors.
- [ ] Run an independent pre-commit review of all staged files for scope, privacy, structure, and naming.
- [ ] Commit with `git -C $DestRepo commit -m 'Initial sandbox plugin marketplace'`.
- [ ] Require exactly one commit and branch `main`.
- [ ] Require a clean working tree.

### Task 7: Create and push the private GitHub repository

**Files:** Creates external private repository.

- [ ] Reconfirm `achieveai/sandbox-plugins` does not already exist immediately before creation.
- [ ] Run `gh repo create achieveai/sandbox-plugins --private --description 'Extensible Claude Code plugin marketplace for skills used in Sandbox' --source=$DestRepo --remote=origin`.
- [ ] Verify `origin` equals `https://github.com/achieveai/sandbox-plugins.git`.
- [ ] Run `git -C $DestRepo push -u origin main`.
- [ ] Run `gh repo view achieveai/sandbox-plugins --json nameWithOwner,visibility,defaultBranchRef,url`; require correct owner/name, `PRIVATE`, and default branch `main`.

### Task 8: Verify the remote through a fresh clone

**Files:**
- Temporary: `B:\sources\sandbox-plugins-verify-clone\` (remove after verification).

- [ ] Require remote `main` to contain exactly one commit and no tags.
- [ ] Require local `HEAD` and `origin/main` to match.
- [ ] Clone the remote to a fresh temporary path.
- [ ] Require marketplace, sandbox manifest, and sandbox-auth manifest to exist and parse.
- [ ] Re-run the structure, privacy, excluded-namespace, and file-count checks against the clone.
- [ ] Confirm `gh repo view` still reports `PRIVATE` and `main`.
- [ ] Remove the temporary verification clone.
- [ ] Report the repository URL, local path, initial commit hash, included plugins, visibility, and validation results.

## Self-Review

- Spec coverage: source/destination safety, explicit copy allowlist, curated root, fresh history, privacy gates, private publication, extensible taxonomy, and fresh-clone verification are all mapped to tasks.
- Placeholder scan: no TODO/TBD steps remain.
- Consistency: all tasks use the same source, destination, marketplace identity, plugin versions, branch, and GitHub repository.
