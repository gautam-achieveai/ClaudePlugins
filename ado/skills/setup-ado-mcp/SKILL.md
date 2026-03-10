---
name: setup-ado-mcp
description: >
  Set up the Azure DevOps MCP server end-to-end for both Claude Code and GitHub Copilot CLI.
  Use when the user asks to "set up Azure DevOps MCP", "configure Azure DevOps for Claude
  and Copilot", "install the Azure DevOps MCP server", or wants one command to configure
  everything automatically.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Setup Azure DevOps MCP

Set up Azure DevOps MCP without making the user hand-edit config files. Prefer auto-detection and existing repo examples over questions.

## Goal

Configure all local MCP entrypoints needed for this repo in one run:

- repo-local `.mcp.json` for Claude Code
- repo-local `.claude/settings.local.json` only if the Azure DevOps MCP server is not already enabled
- user-level `~/.copilot/mcp-config.json` for GitHub Copilot CLI

Use the committed examples as the canonical shapes. Reference files are in the plugin's `examples/` directory.

## Workflow

### 1. Gather Azure DevOps values without bothering the user

Resolve settings in this order:

1. Existing environment variables:
   - `AZURE_DEVOPS_ORG_URL`
   - `AZURE_DEVOPS_PROJECT`
   - `AZURE_DEVOPS_REPOSITORY`
   - `AZURE_DEVOPS_IS_ON_PREMISES`
   - `AZURE_DEVOPS_AUTH_TYPE`
2. If org, project, **or repository** is still missing, inspect `git remote get-url origin`
3. Parse the same remote formats supported by `scripts/launch-ado-mcp.sh`:
   - `https://{org}.visualstudio.com/{project}/_git/{repo}`
   - `https://dev.azure.com/{org}/{project}/_git/{repo}`
   - `git@ssh.dev.azure.com:v3/{org}/{project}/{repo}`
   - `{org}@vs-ssh.visualstudio.com:v3/{org}/{project}/{repo}`
4. **Always extract all three values** (org, project, and repository) from the git remote URL. The repository name is the segment after `/_git/` (HTTPS) or the last path segment (SSH).
5. Defaults:
   - `AZURE_DEVOPS_IS_ON_PREMISES=false`
   - `AZURE_DEVOPS_AUTH_TYPE=entra`

Only ask the user for input if both environment variables and git remote detection fail to produce the required org/project/repository values.

6. **Detect platform**: Run `uname -s` or check the `$OS` variable to determine if the host is Windows (`MINGW*`, `MSYS*`, `CYGWIN*`, or `$OS` = `Windows_NT`) or Unix/macOS. This determines the `command`/`args` shape for MCP server entries.

### 2. Write or update Claude Code project MCP config

Target file: `.mcp.json`

- If `.mcp.json` does not exist, create it with a top-level `mcpServers` object.
- If it exists, merge only the `mcpServers.azure-devops` entry and preserve all other servers.
- Write the `azure-devops` server entry. The `command` and `args` depend on the platform:

**Windows** — Claude Code uses a bash shell, so MCP server processes must be launched via `cmd` to reach `npx` correctly:

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "cmd",
      "args": [
        "/c", "npx", "-y", "@achieveai/azuredevops-mcp"
      ],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "resolved-org-url",
        "AZURE_DEVOPS_PROJECT": "resolved-project",
        "AZURE_DEVOPS_REPOSITORY": "resolved-repository",
        "AZURE_DEVOPS_IS_ON_PREMISES": "false",
        "AZURE_DEVOPS_AUTH_TYPE": "entra"
      },
      "defer_loading": true
    }
  }
}
```

**macOS / Linux** — use the launch script, which also provides runtime auto-detection as a fallback:

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "bash",
      "args": [
        "${CLAUDE_PLUGIN_ROOT}/scripts/launch-ado-mcp.sh"
      ],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "resolved-org-url",
        "AZURE_DEVOPS_PROJECT": "resolved-project",
        "AZURE_DEVOPS_REPOSITORY": "resolved-repository",
        "AZURE_DEVOPS_IS_ON_PREMISES": "false",
        "AZURE_DEVOPS_AUTH_TYPE": "entra"
      },
      "defer_loading": true
    }
  }
}
```

Notes:

- Always resolve `AZURE_DEVOPS_REPOSITORY` from the git remote URL. If detection fails, ask the user for the repository name rather than leaving it empty.
- On macOS/Linux, use `${CLAUDE_PLUGIN_ROOT}/scripts/launch-ado-mcp.sh` so the config works regardless of where the plugin is installed.
- On Windows, call `npx` via `cmd /c` because Claude Code's bash environment cannot reliably spawn `npx` directly as an MCP server process.

### 3. Ensure Claude Code local settings enable the project MCP server

Target file: `.claude/settings.local.json`

- If the file does not exist, create it.
- If it exists, merge only the required Azure DevOps MCP fields and preserve the rest.
- Ensure:
  - `enableAllProjectMcpServers` is `true`
  - `enabledMcpjsonServers` exists and includes `"azure-devops"` exactly once

Do not remove unrelated permissions or settings.

### 4. Write or update GitHub Copilot CLI MCP config

Target file: `~/.copilot/mcp-config.json`

- Ensure the `~/.copilot` directory exists.
- If the file does not exist, create it with a top-level `mcpServers` object.
- If it exists, merge only the `mcpServers.azure-devops` entry and preserve all other servers.
- Write the `azure-devops` server entry with this shape:

```json
{
  "mcpServers": {
    "azure-devops": {
      "type": "local",
      "command": "npx",
      "args": [
        "-y",
        "@achieveai/azuredevops-mcp"
      ],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "resolved-org-url",
        "AZURE_DEVOPS_PROJECT": "resolved-project",
        "AZURE_DEVOPS_REPOSITORY": "resolved-repository",
        "AZURE_DEVOPS_IS_ON_PREMISES": "false",
        "AZURE_DEVOPS_AUTH_TYPE": "entra"
      },
      "tools": [
        "*"
      ]
    }
  }
}
```

Guidelines:

- Always include `AZURE_DEVOPS_REPOSITORY` — it should have been resolved in step 1.
- Keep `tools` as `["*"]` unless the user explicitly asked to narrow the tool list.

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
  - Copilot CLI: `/mcp show azure-devops`

## Behavior rules

- Prefer merging over overwriting.
- Preserve unrelated config.
- Do not modify committed example files.
- Do not ask the user to copy JSON by hand when you can write it for them.
- Do not claim success until the written JSON files parse successfully.
