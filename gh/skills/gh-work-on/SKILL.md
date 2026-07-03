---
name: gh-work-on
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: false
disable-model-invocation: true
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
   revise, or execute. To resume, re-run `/gh-work-on <id>`. On the next `/gh-work-on <id>` invocation, the shared workflow re-checks the latest issue comments before choosing the next phase.

## Notes

- All GitHub mention/reference conventions are applied by the shared workflow
  (via `gh:gh-mentions`).
- Comments are append-only — never edit existing GitHub issue or PR comments
  (see `gh/CLAUDE.md`).
