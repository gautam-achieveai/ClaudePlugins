---
description: Set up Azure DevOps MCP for Claude Code and GitHub Copilot CLI in one run
allowed-tools: [Read, Write, Edit, Bash]
---

Load and execute the `setup-ado-mcp` skill. Follow its full workflow — detect Azure DevOps org, project, and repository from the current repo or environment, update local `.mcp.json`, ensure `.claude/settings.local.json` enables the `azure-devops` project server if needed, merge `azure-devops` into `~/.copilot/mcp-config.json`, validate every written JSON file, and report exactly what changed.

Do not ask for user input unless both git remote detection and existing environment variables fail to produce the required Azure DevOps org and project values.
