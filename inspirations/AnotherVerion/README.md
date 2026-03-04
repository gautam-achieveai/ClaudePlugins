# gb-astra-plugins

Internal Claude Code plugin marketplace — a curated collection of skills, agents, and hooks for developer productivity.

## Plugins

| Plugin | Type | Description |
|--------|------|-------------|
| **code-reviewer** | Skill | Reviews code for bugs, security vulnerabilities, and performance issues |
| **git-helper** | Agent | Git operations assistant for branching, merging, and repo management |
| **lint-on-save** | Hook | Automatically runs ESLint after file edits |
| **azure-devops-helper** | Skill + Agent | Azure DevOps work item management and workflow assistance |

## Installation

Add this marketplace to Claude Code for local testing:

```bash
claude /plugin marketplace add ./
```

Install an individual plugin:

```bash
claude /plugin add ./plugins/code-reviewer
```

## Plugin Structure

Each plugin lives under `plugins/` and contains:

- `.claude-plugin/plugin.json` — plugin manifest (name, description, version)
- `skills/` — skill definitions with `SKILL.md` frontmatter
- `agents/` — agent definitions as markdown files
- `hooks/` — hook configurations in `hooks.json`

## Contributing

1. Create a new directory under `plugins/` with your plugin name
2. Add a `.claude-plugin/plugin.json` manifest
3. Add your skill, agent, or hook files
4. Register the plugin in `.claude-plugin/marketplace.json`
5. Submit a PR for review
