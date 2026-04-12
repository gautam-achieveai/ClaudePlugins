# ADO Plugin

## MCP Prerequisite — Auto-Setup

All ADO skills depend on the Azure DevOps MCP server being configured and
reachable. **Before calling any Azure DevOps MCP tool**, verify the tools are
available. If the first ADO MCP call fails (connection error, tool not found,
or authentication failure):

1. **Do not ask the user to configure it manually.**
2. **Automatically invoke the `ado:setup-ado-mcp` skill** (`/setup-ado-mcp`) to
   configure the MCP server end-to-end.
3. After setup completes, retry the original operation.
4. If setup itself fails, report the error and stop.

This applies to every skill in this plugin: `ado-work-on`,
`ado-publish-pr`, `ado-babysit-pr`, `ado-work-items`,
`ado-draft-work-item`, and any future skills.

## Comments Are Append-Only

**NEVER delete, update, or edit existing Azure DevOps work item or PR comments.**
Always post NEW comments. This preserves the full conversation history and audit
trail. Revised plans, follow-up answers, and status updates are all new comments
— never edits to previous ones. This rule applies to all skills and agents in
this plugin.
