---
name: ado-work-on
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: true
disable-model-invocation: false
---

# Work On (Azure DevOps)

This is a thin Azure DevOps wrapper around the provider-agnostic
`development:work-on` skill. It pins the backend to **Azure DevOps** and makes
sure ADO tooling is ready, then hands the work item off to the shared autonomous
workflow.

## Steps

1. **Ensure ADO tooling is ready.** Before the first Azure DevOps operation,
   verify the ADO MCP tools are available. If the first call fails (connection
   error, tool not found, or auth failure), follow the auto-setup rule in
   `ado/CLAUDE.md`: automatically use the `ado:setup-ado-mcp` skill, then
   retry.

2. **Delegate to the shared workflow.** Load and execute the `development:work-on`
   skill with the provider set to **Azure DevOps** (so it skips auto-detection)
   and pass through `$ARGUMENTS` (the work item ID). The shared skill runs the
   full ADO branch end to end: auto-detect plan vs execute mode (`getWorkItemById`),
   Part 1 (research via ADO MCP build/wiki/PR tools, plan, post via
   `addWorkItemComment`, HITL feedback checkpoint), Part 1 revision mode, and
   Part 2 (worktree, implement, self-review, verify, publish via
   `ado:ado-publish-pr` with `AB#<id>` + `createLink`, update work item state).

3. **Re-runs.** The same `/ado-work-on <id>` command resumes the workflow — the
   shared skill reads the work item's comment history to decide whether to plan,
   revise, or execute.

## Notes

- All Azure DevOps mention/reference conventions are applied by the shared
  workflow (via `ado:ado-mentions`).
- Comments are append-only — never edit existing ADO work item or PR comments
  (see `ado/CLAUDE.md`).
