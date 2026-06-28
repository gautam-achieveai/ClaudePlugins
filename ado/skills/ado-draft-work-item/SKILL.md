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
