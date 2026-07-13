---
name: ado-draft-work-item
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: true
disable-model-invocation: false
---

# Draft Work Item (Azure DevOps)

This is a thin Azure DevOps wrapper around the provider-agnostic
`development:draft-work-item` skill. It pins the backend to **Azure DevOps** and
makes sure ADO tooling is ready, then hands the conversation off to the shared
wizard.

## Steps

1. **Ensure ADO tooling is ready.** Before the first Azure DevOps operation,
   verify the ADO MCP tools are available. If the first call fails (connection
   error, tool not found, or auth failure), follow the auto-setup rule in
   `ado/CLAUDE.md`: automatically use the `ado:setup-ado-mcp` skill, then
   retry.

2. **Delegate to the shared wizard.** Load and execute the
   `development:draft-work-item` skill with the provider set to **Azure DevOps**
   (so it skips auto-detection) and pass through the user's raw requirement text.
   The shared wizard runs the ADO branch end to end: classify via
   `getWorkItemTypes`, resolve area path + team (`getTeams`), resolve sprint /
   iteration (`getCurrentSprint` / `getSprints`), duplicate check
   (`searchWorkItems`), optional assignment (`getTeamMembers`), preview, and
   `createWorkItem` with `Microsoft.VSTS.Common.Priority`.

3. **Follow-up.** When the wizard finishes, it offers the next step:
   Start `/ado-work-on <id>`, create another item, or stop here.

## Notes

- All Azure DevOps mention/reference conventions are applied by the shared wizard.
- Comments are append-only — never edit existing ADO work item or PR comments
  (see `ado/CLAUDE.md`).
