# Developer Performance Review Skill

A comprehensive Claude Code skill for conducting evidence-based, quality-focused developer performance reviews.

## Overview

This skill enables thorough analysis of developer work through git history examination, code quality assessment, pattern detection, and evidence-based reporting. It goes beyond surface metrics to evaluate actual code quality, testing adequacy, design patterns, and value delivery.

## Skill Structure

```
dev-reviewer/
├── .claude-plugin/
│   └── plugin.json               # Plugin manifest
├── skills/
│   └── dev-reviewer/
│       └── SKILL.md              # Main skill definition (invoked by Claude)
├── README.md                     # This file - skill documentation
├── reference.md                  # Detailed review framework and patterns
├── examples.md                   # Real-world usage examples
├── reference/                    # Additional reference materials
└── scripts/                      # PowerShell automation scripts
    ├── Get-DeveloperPRs.ps1      # Extract all commits and PRs
    ├── Find-ActivityGaps.ps1     # Detect timeline gaps
    ├── Get-MajorPRs.ps1         # Identify PRs for deep review
    ├── Get-PRDiff.ps1           # Extract code diffs
    ├── Analyze-BugPatterns.ps1  # Categorize and analyze bugs
    └── README.md                 # Script documentation
```

## How It Works

### Automatic Invocation

Claude will automatically use this skill when you ask questions like:

- "Review [Developer]'s work from [date] to [date]"
- "Analyze [Developer]'s code quality over the last year"
- "Prepare performance feedback for [Developer]"
- "What patterns do you see in [Developer]'s bug fixes?"

### Manual Invocation

You can also explicitly invoke it:

```
Use the dev-reviewer skill to analyze [Developer]'s performance...
```

## Quick Start

### 1. Run Data Collection Scripts

```powershell
cd .claude/skills/dev-reviewer/scripts

# Extract all PRs and commits
.\Get-DeveloperPRs.ps1 -Author "Developer Name" -Since "2024-07-01" -Until "2025-06-30" -OutputPath "analysis/prs.json"

# Identify major PRs
.\Get-MajorPRs.ps1 -Author "Developer Name" -MinLines 100 -OutputPath "analysis/major_prs.md"

# Detect activity gaps
.\Find-ActivityGaps.ps1 -Author "Developer Name" -MinGapDays 14 -OutputPath "analysis/gaps.md"

# Analyze bug patterns
.\Analyze-BugPatterns.ps1 -Author "Developer Name" -OutputPath "analysis/bugs.md"
```

### 2. Invoke the Skill

In Claude Code:

```
Claude, use the dev-reviewer skill to analyze [Developer Name]'s performance
from [start date] to [end date] using the data in analysis/
```

### 3. Review Outputs

The skill generates comprehensive analysis in:

```
scratchpad/conversation_memories/review_[developer]_[date]/
├── detailed_code_quality_analysis.md
├── timeline_analysis.md
├── bug_patterns.md
├── talking_points.md
└── recommendations.md
```

## Key Features

### 1. Evidence-Based Analysis

- Examines actual code diffs, not just commit messages
- Backs every claim with specific PR numbers, commits, and line numbers
- Provides code examples for quality issues

### 2. Context-Aware Assessment

- Gathers user feedback before judging
- Considers OnCall duties, complexity, team dynamics
- Distinguishes individual vs systemic issues

### 3. Pattern Detection

- Identifies thrashing (add/remove within 24hrs)
- Detects "missed cases" patterns (incomplete scenario mapping)
- Recognizes recurring bug types
- Spots code quality trends

### 4. Comprehensive Reporting

- Code quality analysis with examples
- Timeline and productivity assessment
- Bug pattern categorization
- Actionable recommendations
- Structured talking points for review discussion

### 5. Automation

- PowerShell scripts for data collection
- Batch processing of multiple PRs
- Cross-repository analysis
- Consistent, repeatable process

## Review Dimensions

The skill evaluates developers across 5 dimensions:

1. **Code Quality & Design**
   - Design patterns and SOLID principles
   - Defensive programming
   - Code reusability
   - Error handling

2. **Testing Adequacy**
   - Could bugs have been caught by tests?
   - Integration test coverage
   - Test quality (flaky/brittle)
   - Pre-production validation

3. **Requirements Analysis**
   - Upfront planning evidence
   - Scenario mapping completeness
   - Rework frequency
   - Feature iteration patterns

4. **Time-to-Value**
   - Time vs code complexity
   - Activity gap analysis
   - Feature delivery timelines
   - Productivity patterns

5. **User Satisfaction**
   - Manager/stakeholder feedback
   - Production incidents
   - Business value delivered
   - Impact assessment

## Output Quality

Every review includes:

✅ Specific code examples with diffs
✅ PR numbers and commit hashes
✅ User feedback integration
✅ Pattern identification with evidence
✅ Root cause analysis
✅ Balanced praise and constructive feedback
✅ Actionable recommendations
✅ Structured talking points

## Best Practices

### Do ✅

- Run scripts to collect data first
- Ask for user feedback via `ask_human` before judging
- Examine actual code diffs, not just messages
- Gather context about gaps and delays
- Distinguish patterns from one-time issues
- Celebrate achievements before discussing concerns
- Provide specific, actionable recommendations

### Don't ❌

- Count PRs without examining code quality
- Judge by lines of code alone
- Ignore context (OnCall, blockers, complexity)
- Blame individuals for systemic issues
- Compare developers without context
- Make premature judgments

## Real Example

**User Request**: "Review Saurabh's work from July 2024 to June 2025"

**Process**:

1. Ran scripts → Found 186 commits, 59 PRs
2. Asked about satisfaction → "Moderate concerns with Phase 2"
3. Analyzed code → Found missing null checks, copy-paste errors
4. Detected patterns → Auth cookie thrashing, missed cases
5. Timeline analysis → Gaps explained by MLProjects work
6. Generated reports → 5 comprehensive documents
7. Created talking points → 4/5 rating with specific feedback

**Time**: Comprehensive analysis completed in one session

## Documentation

- **skills/dev-reviewer/SKILL.md**: Core skill definition and process
- **reference.md**: Detailed framework and patterns catalog
- **examples.md**: Real-world usage examples from actual reviews
- **scripts/README.md**: Complete script documentation
- **.claude-plugin/plugin.json**: Plugin manifest for Claude Code marketplace

## Requirements

- PowerShell Core (pwsh) 7.0 or later
- Git installed and in PATH
- Access to git repositories being analyzed
- Claude Code with skills support

## Support

For questions or issues:

1. Check `examples.md` for real-world usage
2. See `reference.md` for detailed framework
3. Review `scripts/README.md` for script help
4. Use `-Verbose` flag on scripts for debugging

## Version

Created: 2025-10-29
Based on: Real performance review of 186 commits across 2 repositories
Tested on: MCQdbDEV and MLProjects codebases

## License

This skill is part of the MCQdbDEV project and follows the same license.
