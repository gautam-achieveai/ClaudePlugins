# Claude Plugins Development

This repository contains custom Claude Code plugins. Each plugin is a self-contained directory with skills, agents, commands, and supporting resources.

## Plugin Directory Structure

Each plugin follows this layout:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest (name, version, description)
├── agents/                  # Subagent definitions
│   └── agent-name.md        # One .md file per agent
├── skills/                  # On-demand skill workflows
│   └── skill-name/
│       ├── SKILL.md          # Required — skill entrypoint
│       ├── scripts/          # Optional — helper scripts
│       ├── reference/        # Optional — docs loaded on-demand
│       └── assets/           # Optional — templates, images
├── commands/                 # Custom slash commands (optional)
│   └── command-name.md       # Filename = /command-name
├── .mcp.json                 # MCP server configs (optional)
├── CLAUDE.md                 # Plugin-level context (optional)
└── README.md
```

## File Formats

### SKILL.md — Skill Definition

YAML frontmatter + Markdown body. The **only required file** in a skill folder.

```yaml
---
name: skill-name               # Required. Lowercase + hyphens. Must match directory name.
description: >                  # Required. Max 1024 chars. What it does AND when to use it.
  Describe the skill's purpose and trigger conditions here.
license: MIT                    # Optional.
allowed-tools:                  # Optional. Pre-approved tools list.
  - Read
  - Grep
metadata:                       # Optional. Custom key-value pairs.
  category: development
---

# Skill Instructions

Detailed instructions in Markdown...
```

**Progressive loading model:**
1. **Discovery** — Only `name` + `description` loaded at startup (~100 tokens each)
2. **Activation** — Full SKILL.md body loaded when skill is deemed relevant
3. **Execution** — Referenced files (scripts, references) loaded only as needed

### Agent .md — Subagent Definition

YAML frontmatter + system prompt body. Placed in `agents/` directory.

```yaml
---
name: agent-name               # Required. Lowercase + hyphens. Max 64 chars.
description: >                  # Required. Max 1024 chars. What it does AND when to delegate to it.
  Describe when Claude should invoke this agent.
tools:                          # Optional. Inherits parent's tools if omitted.
  - Read
  - Write
  - Grep
  - Glob
  - WebSearch
model: sonnet                   # Optional. Specific model override.
permissionMode: default         # Optional.
skills:                         # Optional. Skills this agent can use.
  - pr-review
hooks: []                       # Optional. Event handlers.
---

# System Prompt

Natural language instructions defining the agent's responsibilities, workflow, and output format.
```

**Agent placement & precedence (highest → lowest):**
- CLI flags → Project (`.claude/agents/`) → User (`~/.claude/agents/`) → Plugin (`agents/`)

### Command .md — Custom Slash Command

Plain Markdown, **no frontmatter**. Filename becomes the command name.

```markdown
<!-- commands/review.md → invoked as /review -->
Review the following code. Focus on: $ARGUMENTS
```

- `$ARGUMENTS` or `$1` — replaced with user input after the slash command

### CLAUDE.md — Project/Plugin Context

Plain Markdown, **no frontmatter**. Loaded at the start of every session.
Keep concise (~120 lines max) to avoid context dilution.

## Naming Conventions

- **Directories & files**: `kebab-case` (e.g., `code-reviewer`, `pr-review`)
- **Skill names**: Must match their containing directory name
- **Agent names**: Lowercase letters, numbers, hyphens only. Max 64 chars.
- **Descriptions**: Should clearly state **when** to use the skill/agent (acts as trigger)

## Marketplace Registry

The root `.claude-plugin/marketplace.json` registers all plugins with metadata:
- `name`, `source`, `description`, `version`, `category`, `tags`, `keywords`

## Key Principles

- **Skills vs Agents**: Skills are reusable instruction workflows. Agents are specialized personas with their own tools and context windows.
- **Skills vs Rules**: Skills are on-demand (loaded when relevant). Rules (`.claude/rules/`) are always-on.
- **Skills vs CLAUDE.md**: CLAUDE.md is broad project context. Skills are focused, task-specific workflows.
- **Progressive disclosure**: Minimize token usage — load details only when needed.
- **Reference files**: Move detailed docs to `reference/` subdirectories; keep SKILL.md focused.
