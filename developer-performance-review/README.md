# Developer Performance Review Skill

A comprehensive Claude Code skill for conducting evidence-based, quality-focused developer performance reviews.

## Overview

This skill enables thorough analysis of developer work through git history examination, Azure DevOps PR context enrichment, code quality assessment, pattern detection, and evidence-based reporting. It goes beyond surface metrics to evaluate actual code quality, testing adequacy, design patterns, and customer value delivery.

**Quality over Quantity**: Few excellent PRs beat many mediocre ones. The skill focuses on what problems were solved, how well solutions work, and the customer impact of delivered features.

## Skill Structure

```
developer-performance-review/
├── .claude-plugin/
│   └── plugin.json                              # Plugin manifest
├── README.md                                    # This file
└── skills/developer-performance-review/
    ├── SKILL.md                                 # Main skill definition (invoked by Claude)
    ├── references/
    │   ├── assessment-framework.md              # 6-dimension evaluation rubric
    │   ├── pattern-catalog.md                   # Thrashing, missed cases, quality patterns
    │   ├── review-best-practices.md             # Principles, pitfalls, checklist
    │   ├── examples.md                          # Real-world usage examples
    │   └── quick-reference.md                   # Condensed review framework
    └── scripts/
        ├── Start-DeveloperReview.ps1            # Full automated setup
        ├── Get-DeveloperPRs.ps1                 # Extract commits and PRs
        ├── Get-MajorPRs.ps1                     # Filter significant PRs
        ├── Get-PRDiff.ps1                       # Extract code diffs
        ├── Find-ActivityGaps.ps1                # Detect inactivity periods
        ├── Analyze-BugPatterns.ps1              # Categorize bugs
        └── README.md                            # Script documentation
```

## How It Works

### Automatic Invocation

Claude will automatically use this skill when you ask questions like:

- "Review [Developer]'s work from [date] to [date]"
- "Analyze [Developer]'s code quality over the last year"
- "Prepare performance feedback for [Developer]"
- "Conduct a performance review for [Developer]"

### Key Capabilities

1. **Auto-detects primary branch** — works on any repo (main, master, dev, etc.)
2. **Two-dataset analysis** — separates all authored work from landed primary-branch work
3. **Azure DevOps enrichment** — fetches PR descriptions, work items, feature/epic context
4. **Manager feedback loop** — gathers business context via `mcp__hitl__AskUserQuestion`
5. **Evidence-based output** — every claim backed by PR #, file:line, work item ID

## Quick Start

Run from the **target repository** being reviewed:

```powershell
# The skill auto-detects the primary branch and repo — no hardcoding needed
& "path/to/skills/developer-performance-review/scripts/Start-DeveloperReview.ps1" `
    -DeveloperName "Developer Name" `
    -StartDate "2024-01-01" `
    -EndDate "2024-12-31"
```

Or simply ask Claude:
```
Review [Developer]'s work from January to December 2024
```

## Review Dimensions

1. **Code Quality & Design** — SOLID principles, defensive programming, maintainability
2. **Testing Adequacy** — coverage, quality, preventable production bugs
3. **Requirements Analysis** — upfront planning, completeness, rework frequency
4. **Time-to-Value** — timeline vs complexity, activity patterns, feature delivery
5. **User Satisfaction** — manager feedback, team collaboration, stakeholder trust
6. **Customer Impact & Business Value** — features delivered end-to-end, bug-to-feature ratio

## Documentation

- **SKILL.md**: Core workflow — 4 phases (Data Collection → Context → Analysis → Synthesis)
- **references/**: Detailed frameworks, patterns, rubrics, and real examples
- **scripts/README.md**: PowerShell automation tools and parameters

## Requirements

- PowerShell Core (pwsh) 7.0+
- Git installed and in PATH
- Access to the git repository being analyzed
- Azure DevOps MCP tools (for PR context enrichment)
- Claude Code with skills support

## Version

v1.2.0 — Restructured for progressive disclosure, auto-branch detection, ADO enrichment
