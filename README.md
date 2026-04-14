# Claude Plugins Marketplace

A curated marketplace of plugins for Claude Code, extending capabilities with custom skills, agents, commands, and tool integrations.

## Quick Start

Add the marketplace to Claude Code:

```
/install-plugin https://github.com/gautam-achieveai/ClaudePlugins.git
```

## Available Plugins

### ado (v3.0.0)

Azure DevOps integration — work item management, PR publishing, iterative PR tending, autonomous work item implementation, and backlog processing.

**Skills**: `ado-work-on`, `ado-publish-pr`, `ado-babysit-pr`, `ado-work-my-backlog`, `ado-draft-work-item`, `ado-pr-tender`

### gh (v2.0.0)

GitHub integration — issue/project management, PR publishing, iterative PR tending, issue-driven implementation, and backlog processing.

**Skills**: `gh-work-on`, `gh-publish-pr`, `gh-babysit-pr`, `gh-work-my-backlog`, `gh-pr-tender`

### development (v1.0.1)

Development methodology toolkit — design-first brainstorming, autonomous design, TDD, parallel subagent-driven execution with review gates, and evidence-based completion verification.

**Skills**: `brainstorming`, `autonomous-design`, `test-driven-development`, `subagent-driven-development`, `verification-before-completion`

### code-reviewer (v1.15.1)

Code review toolkit with specialized agents for duplicate detection, EUII leak scanning, exception handling, test coverage, design simplification, architecture review, performance review, and severity grading. Includes batch PR review orchestration with persistent tracking.

**Skills**: `pr-review`, `post-pr-review`, `pr-context`, `review-pending-prs`, `update-pr-tracking`, `codebase-search-discipline`

### developer-performance-review (v1.2.0)

Evidence-based developer performance reviews over weeks/months. Analyzes git history, PRs, ADO work item context, bug patterns, and code quality. Auto-detects primary branch, two-dataset model (all work vs landed work), 6-dimension assessment framework.

**Skills**: `developer-performance-review`

### orleans-dev (v1.0.2)

Microsoft Orleans patterns, best practices, and code review for virtual actor model applications — grain design, concurrency, cross-grain communication, streams, and serialization.

**Skills**: `orleans-patterns`, `orleans-code-review`

### clean-builds (v1.0.0)

Zero-warning builds through systematic warning elimination, code formatting (ReSharper, Roslynator, dotnet format), and NuGet package version validation.

**Skills**: `clean-builds`

### debugging (v1.3.0)

Log-first debugging methodology using structured JSONL logs queried with DuckDB. Includes logging enablement for codebases, logging compliance review, and systematic root-cause debugging.

**Skills**: `debug-with-logs`, `logging-enablement`, `systematic-debugging`

## Repository Structure

```
claude-plugins/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace catalog (8 plugins)
├── ado/                          # Azure DevOps integration
├── gh/                           # GitHub integration
├── development/                  # Dev methodology (brainstorming, TDD, etc.)
├── code-reviewer/                # PR code review toolkit
├── developer-performance-review/ # Developer performance reviews
├── orleans-dev/                  # Orleans patterns & review
├── clean-builds/                 # Zero-warning builds
├── debugging/                    # Log-first debugging
├── scratchpad/                   # Research and development notes
└── README.md                     # This file
```

Each plugin follows the standard structure:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json        # Plugin manifest (name, version, description)
├── skills/
│   └── skill-name/
│       ├── SKILL.md        # Skill entrypoint
│       ├── references/     # On-demand reference docs
│       └── scripts/        # Automation scripts
├── agents/                 # Subagent definitions (optional)
├── commands/               # Slash commands (optional)
└── README.md
```

## Adding a Plugin

1. Create your plugin directory at the repo root
2. Add `.claude-plugin/plugin.json` with name, description, version
3. Add an entry to `.claude-plugin/marketplace.json`
4. Commit and push

## License

This marketplace is MIT licensed. Individual plugins may have their own licenses.
