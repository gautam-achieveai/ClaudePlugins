---
name: setup-gh-mcp
description: >
  Set up GitHub MCP end-to-end for both Claude Code and GitHub Copilot CLI.
  Use when the user asks to "set up GitHub MCP", "configure GitHub for Claude
  and Copilot", "install the GitHub MCP server", or wants one command to
  configure everything automatically.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Setup GitHub MCP

Set up GitHub MCP without making the user hand-edit config files. Prefer
existing repo examples and git remote detection over questions.

## Goal

Configure all local MCP entrypoints needed for this repo in one run:

- repo-local `.mcp.json` for Claude Code
- repo-local `.claude/settings.local.json` only if the GitHub MCP server is not already enabled
- user-level `~/.copilot/mcp-config.json` for GitHub Copilot CLI

Use the committed examples as the canonical shapes. Reference files are in the
plugin's `examples/` directory.

## Workflow

### 1. Gather GitHub values without bothering the user

Resolve settings in this order:

1. Existing environment variables:
   - `GITHUB_PERSONAL_ACCESS_TOKEN`
   - `GITHUB_REPOSITORY`
   - `GH_HOST`
2. If host or repository is still missing, inspect `git remote get-url origin`
3. Parse common remote formats:
   - `https://github.com/{owner}/{repo}.git`
   - `git@github.com:{owner}/{repo}.git`
   - `https://{host}/{owner}/{repo}.git`
   - `git@{host}:{owner}/{repo}.git`
4. Defaults:
   - `GH_HOST=github.com`
   - `GITHUB_REPOSITORY=<owner>/<repo>` from the remote when available

Only ask the user for input if both environment variables and git remote
detection fail to produce the required host/repository values.

If a PAT is not present, still write the config using the
`${GITHUB_PERSONAL_ACCESS_TOKEN}` placeholder from the examples. Do not hardcode
secret values into config files.

### 2. Write or update Claude Code project MCP config

Target file: `.mcp.json`

- If `.mcp.json` does not exist, create it with a top-level `mcpServers` object.
- If it exists, merge only the `mcpServers.github` entry and preserve all other servers.
- Write the `github` server entry using the remote GitHub MCP server:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"
      },
      "defer_loading": true
    }
  }
}
```

Notes:

- Prefer the hosted GitHub MCP server unless the user explicitly wants a local
  Docker or binary setup.
- Do not embed the PAT directly; keep the `${GITHUB_PERSONAL_ACCESS_TOKEN}`
  placeholder.

### 3. Ensure Claude Code local settings enable the project MCP server

Target file: `.claude/settings.local.json`

- If the file does not exist, create it.
- If it exists, merge only the required GitHub MCP fields and preserve the rest.
- Ensure:
  - `enableAllProjectMcpServers` is `true`
  - `enabledMcpjsonServers` exists and includes `"github"` exactly once

Do not remove unrelated permissions or settings.

### 4. Write or update GitHub Copilot CLI MCP config

Target file: `~/.copilot/mcp-config.json`

- Ensure the `~/.copilot` directory exists.
- If the file does not exist, create it with a top-level `mcpServers` object.
- If it exists, merge only the `mcpServers.github` entry and preserve all other servers.
- Write the `github` server entry with this shape:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

Guidelines:

- Name the custom server `github` so it can coexist with Copilot CLI's built-in
  `github-mcp-server`.
- Keep the built-in server unless the user explicitly asks to replace it.

### 5. Validate every JSON file after writing

Validate all JSON files you touched:

- `.mcp.json`
- `.claude/settings.local.json`
- `~/.copilot/mcp-config.json`

Use the available shell to parse the JSON rather than assuming it is valid.

Examples:

- PowerShell: `Get-Content '<path>' -Raw | ConvertFrom-Json | Out-Null`
- Python: `python -c "import json; json.load(open('<path>'))"`
- Node: `node -e "JSON.parse(require('fs').readFileSync('<path>', 'utf8'))"`

If parsing fails, fix the file before reporting success.

### 6. Report the result clearly

At the end, summarize:

- which values were auto-detected
- which files were created or updated
- whether Claude Code MCP is enabled in `.claude/settings.local.json`
- how to verify:
  - Claude Code: `/mcp` or `claude mcp list`
  - Copilot CLI: `/mcp show github` and `/mcp show github-mcp-server`

## Behavior rules

- Prefer merging over overwriting.
- Preserve unrelated config.
- Do not modify committed example files.
- Do not ask the user to copy JSON by hand when you can write it for them.
- Do not claim success until the written JSON files parse successfully.
