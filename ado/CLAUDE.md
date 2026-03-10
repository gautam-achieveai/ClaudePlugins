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

This applies to every skill in this plugin: `work-on`, `publish-pr`,
`babysit-pr`, `work-items`, `draft-work-item`, and any future skills.
