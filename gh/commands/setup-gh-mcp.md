---
description: Set up GitHub MCP for Claude Code and GitHub Copilot CLI in one run
allowed-tools: [Read, Write, Edit, Bash]
---

Load and execute the `gh:setup-gh-mcp` skill. Follow its full workflow — detect the GitHub host and repository from the current repo or environment, update local `.mcp.json`, ensure `.claude/settings.local.json` enables the `github` project server if needed, merge a write-capable `github` server into `~/.copilot/mcp-config.json`, validate every written JSON file, and report exactly what changed.

Do not ask for user input unless both git remote detection and existing environment variables fail to produce the required GitHub host or repository values.
