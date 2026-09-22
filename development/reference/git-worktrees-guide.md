# Using Git Worktrees

Adapted from obra/superpowers `using-git-worktrees` (MIT).

## Overview

Ensure work happens in an isolated workspace. Prefer the platform's native worktree tools. Fall back to manual git worktrees only when no native tool is available.

**Core principle:** Detect existing isolation first. Then use native tools. Then fall back to git. Never fight the harness.

## Step 0: Detect Existing Isolation

**Before creating anything, check whether you are already in an isolated workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "already in a worktree," verify you are not in a submodule:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** you are already in a linked worktree. Skip to Step 2. Do NOT create another worktree.

Report with branch state:
- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** you are in a normal checkout. Honor a declared worktree preference in the user's instructions. If there is none, ask for consent before creating a worktree:

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

If the user declines, work in place and skip to Step 2.

## Step 1: Create Isolated Workspace

### 1a. Native Worktree Tools (preferred)

If you have a native worktree tool — for example `EnterWorktree`, a `/worktree` command, or a `--worktree` flag — use it and skip to Step 2.

Native tools handle directory placement, branch creation, and cleanup. Using `git worktree add` when a native tool exists creates state the harness can't see or manage.

### 1b. Git Worktree Fallback

Use this only when Step 1a does not apply.

#### Directory Selection

Explicit user preference always beats observed filesystem state.

1. **Declared preference** in the user's instructions or CLAUDE.md — use it without asking.
2. **Existing project-local directory:**
   ```bash
   ls -d .worktrees 2>/dev/null     # Preferred (hidden)
   ls -d worktrees 2>/dev/null      # Alternative
   ```
   If both exist, `.worktrees` wins.
3. **Otherwise**, default to `.worktrees/` at the project root.

#### Safety Verification

**MUST verify the directory is ignored before creating a worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:** add it to `.gitignore` and tell the user; commit that change only if commits are authorized. An unignored worktree directory commits the whole tree into the repo.

#### Create the Worktree

```bash
path="$LOCATION/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** if `git worktree add` fails with a permission error, tell the user the sandbox blocked worktree creation and work in the current directory instead.

## Step 2: Project Setup

Auto-detect and run appropriate setup. Detect the package manager from the lockfile instead of assuming one:

```bash
# Node.js — lockfile picks the package manager
if [ -f package.json ]; then
  if   [ -f pnpm-lock.yaml ]; then pnpm install
  elif [ -f yarn.lock ];      then yarn install
  elif [ -f bun.lock ] || [ -f bun.lockb ]; then bun install
  else                             npm install
  fi
fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python — lockfile picks the package manager
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then
  if   [ -f uv.lock ];     then uv sync
  elif [ -f pdm.lock ];    then pdm install
  elif [ -f poetry.lock ]; then poetry install
  else                          pip install -e .
  fi
fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

## Step 3: Verify Clean Baseline

Run the project's tests so the workspace starts clean (`npm test` / `cargo test` / `pytest` / `go test ./...`).

**If tests fail:** report failures and ask whether to proceed or investigate.

**If tests pass:** report ready:

```text
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Skip creation (Step 0) |
| In a submodule | Treat as normal repo (Step 0 guard) |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | Git worktree fallback (Step 1b) |
| `.worktrees/` and `worktrees/` both exist | Use `.worktrees/` |
| Neither exists | Declared preference, else `.worktrees/` |
| Directory not ignored | Add to `.gitignore` |
| Permission error on create | Sandbox fallback, work in place |
| Tests fail during baseline | Report failures + ask |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'm obviously not in a worktree — no need to check" | Run Step 0. Harness-created isolation and submodules both fool eyeballing. |
| "`git worktree add` is quicker than hunting for a native tool" | A native tool owns placement, branching, and cleanup. Bypassing it creates state the harness can't manage. |
| "The worktree directory is surely ignored already" | Run `git check-ignore`. |
| "The workspace is fresh — baseline tests can wait" | A dirty baseline makes every later failure ambiguous. Run the tests now. |

## Integration

**Pairs with:**
- **`development/reference/branch-completion-guide.md`** - REQUIRED for cleanup after work is complete
