# GH Plugin

## MCP Prerequisite — Auto-Setup

All GH skills depend on GitHub access being configured. Prefer the GitHub MCP
server for GitHub operations, then fall back to `gh` / `gh api` only when MCP
coverage or auth is insufficient.

**Before calling GitHub MCP tools**, verify the tools are available. If the
first GitHub MCP call fails (connection error, tool not found, missing write
toolsets, or authentication failure):

1. **Do not ask the user to configure it manually.**
2. **Automatically invoke the `gh:setup-gh-mcp` skill** (`/setup-gh-mcp`) to
    configure the MCP server end-to-end.
3. After setup completes, retry the original operation.
4. If setup itself fails, try the equivalent `gh` / `gh api` workflow when
   possible.
5. If neither MCP nor `gh` access is usable, report the error and stop.

This applies to every skill in this plugin: `work-on`, `publish-pr`,
`babysit-pr`, `work-items`, `draft-work-item`, and any future skills.

## Comments Are Append-Only

**NEVER delete, update, or edit existing GitHub issue or PR comments.** Always
post NEW comments. This preserves the full conversation history and audit
trail. Revised plans, follow-up answers, and status updates are all new comments
— never edits to previous ones. This rule applies to all skills and agents in
this plugin.
