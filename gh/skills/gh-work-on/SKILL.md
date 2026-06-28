---
name: gh-work-on
description: >
  Autonomous two-phase development workflow driven by a GitHub work item backed
  by a GitHub issue. First run: analyzes the problem using all available tools
  (codebase, logs, database, observability, Actions), designs a solution,
  creates a plan, posts it to the issue, and waits for explicit user approval
  via HITL before proceeding. Subsequent runs: incorporate feedback or execute
  the approved plan — implement, verify, and publish a PR. The agent NEVER
  proceeds to implementation without explicit approval. Use when the user says
  "work on <number>", "implement work item <number>", "pick up <number>", or
  provides a GitHub issue to implement.
---

# Work On (GitHub)

This is a thin GitHub wrapper around the provider-agnostic `development:work-on`
skill. It pins the backend to **GitHub** and makes sure GitHub tooling is ready,
then hands the work item off to the shared autonomous workflow.

## Steps

1. **Ensure GitHub tooling is ready.** Before the first GitHub operation, verify
   the GitHub MCP tools are available. If the first call fails (connection error,
   tool not found, missing write toolsets, or auth failure), follow the auto-setup
   rule in `gh/CLAUDE.md`: automatically use the `gh:setup-gh-mcp` skill, then
   retry. Fall back to the `gh` / `gh api` CLI when MCP coverage is insufficient.

2. **Delegate to the shared workflow.** Load and execute the `development:work-on`
   skill with the provider set to **GitHub** (so it skips auto-detection) and pass
   through `$ARGUMENTS` (the issue number). The shared skill runs the full GitHub
   branch end to end: auto-detect plan vs execute mode, Part 1 (research, plan,
   post to the issue, HITL feedback checkpoint), Part 1 revision mode, and Part 2
   (worktree, implement, self-review, verify, publish via `gh:gh-publish-pr`,
   update issue/Project state).

3. **Re-runs.** The same `/gh-work-on <id>` command resumes the workflow — the
   shared skill reads the issue's comment history to decide whether to plan,
   revise, or execute.

## Notes

- All GitHub mention/reference conventions are applied by the shared workflow
  (via `gh:gh-mentions`).
- Comments are append-only — never edit existing GitHub issue or PR comments
  (see `gh/CLAUDE.md`).
