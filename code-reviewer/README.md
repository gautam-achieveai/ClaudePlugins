# Pull Request Code Reviewer Skill

A comprehensive Claude Code skill for conducting thorough code reviews of individual pull requests with focus on security, performance, testing, and code quality.

## Overview

This skill enables deep analysis of pull request changes, examining security vulnerabilities (OWASP Top 10), performance issues, testing adequacy, and overall code quality. It provides structured, actionable feedback with specific file:line references.

## Skill Structure

```
pr-reviewer/
├── .claude-plugin/
│   └── plugin.json               # Plugin manifest
├── README.md                     # This file - skill documentation
├── SKILL.md                      # Main skill definition (invoked by Claude)
├── reference/                    # Reference guides
│   ├── code-project-alignment-guide.md     # Code alignemnt with project or frameworks
│   ├── code-quality-guide.md     # Code quality best practices
│   ├── performance-guide.md      # Performance optimization guide
│   ├── security-checklist.md     # Security vulnerability checklist
│   └── testing-guide.md          # Testing best practices
├── templates/                    # Review templates
└── scripts/                      # PowerShell automation scripts
    ├── Start-PRReview.ps1        # Initialize PR review workflow
    └── README.md                 # Script documentation
```

## How It Works

### Automatic Invocation

Claude will automatically use this skill when you ask questions like:

- "Review PR #12345"
- "Code review this pull request"
- "Check PR for security issues"
- "Analyze changes in this PR"

### Manual Invocation

You can also explicitly invoke it:

```
Use the pr-reviewer skill to analyze PR #12345
```

## Quick Start

### 1. Fetch PR Data

Using Azure DevOps MCP:

```
mcp__azure-devops__getPullRequest -repository "YourRepo" -pullRequestId 12345
```

### 2. Run Review Script

```pwsh
<PATH_FOR_PR-REVIEWER_SKILL_ROOT_DIRECTORY>\scripts\Start-PRReview.ps1 `
    -PRNumber 12345 `
    -SourceBranch "developers/gb/feature" `
    -PRTitle "Add bulk upload feature" `
    -PRAuthor "Gautam Bhakar"
```

This creates an isolated worktree with analysis templates.

### 3. Invoke the Skill

In Claude Code:

```
Claude, use the pr-reviewer skill to analyze PR #12345
```

### 4. Review Outputs

The skill generates structured feedback covering:

- Security vulnerabilities (OWASP Top 10)
- Performance issues
- Testing adequacy
- Code quality concerns
- Best practice violations

## Key Features

### 1. Security Analysis (OWASP Top 10)

- Injection vulnerabilities
- Broken authentication
- Sensitive data exposure
- XML external entities
- Broken access control
- Security misconfiguration
- Cross-site scripting (XSS)
- Insecure deserialization
- Vulnerable dependencies
- Insufficient logging

### 2. Performance Review

- Algorithmic complexity
- Database query optimization
- Memory management
- Caching opportunities
- Resource cleanup

### 3. Testing Assessment

- Test coverage adequacy
- Edge case handling
- Integration test needs
- Test quality (flaky/brittle tests)
- Assertion effectiveness

### 4. Code Quality

- SOLID principles
- Design patterns
- Code maintainability
- Error handling
- Code duplication

### 5. Structured Feedback

- File:line references for every issue
- Code examples showing problems
- Specific recommendations
- Severity ratings (Critical/High/Medium/Low)
- Actionable improvement suggestions

## Review Categories

The skill provides feedback in these categories:

1. **Security**: OWASP Top 10 vulnerabilities
2. **Performance**: Efficiency and optimization
3. **Testing**: Coverage and quality
4. **Code Quality**: Design and maintainability
5. **Best Practices**: Industry standards compliance

## Output Quality

Every review includes:

✅ Specific file:line references
✅ Code examples for each issue
✅ Severity ratings
✅ Detailed explanations
✅ Actionable recommendations
✅ Links to reference documentation

## Best Practices

### Do ✅

- Review actual code diffs, not just descriptions
- Check for security vulnerabilities systematically
- Verify test coverage for changes
- Consider performance implications
- Provide specific, actionable feedback
- Include code examples in recommendations
- Reference files and line numbers

### Don't ❌

- Focus only on style issues
- Ignore security implications
- Skip testing analysis
- Provide vague feedback
- Overlook performance issues
- Forget edge cases

## Documentation

- **skills/pr-reviewer/SKILL.md**: Core skill definition and review process
- **reference/security-checklist.md**: OWASP Top 10 security checklist
- **reference/performance-guide.md**: Performance optimization patterns
- **reference/code-quality-guide.md**: Code quality best practices
- **reference/testing-guide.md**: Testing adequacy guidelines
- **.claude-plugin/plugin.json**: Plugin manifest for Claude Code marketplace

## Requirements

- PowerShell Core (pwsh) 7.0 or later
- Git installed and in PATH
- Access to git repositories being reviewed
- Claude Code with skills support
- Azure DevOps MCP (optional, for PR data fetching)

## Skill Scope

**This skill is for:**

- Individual pull request reviews
- Security, performance, and quality analysis
- Structured feedback on specific changes

**This skill is NOT for:**

- Developer performance reviews over time → Use `dev-reviewer` skill
- Multi-month productivity analysis → Use `dev-reviewer` skill

## Support

For questions or issues:

1. Check the reference guides in `reference/`
2. Review `scripts/README.md` for script help
3. Use `-Verbose` flag on scripts for debugging

## Version

Created: 2025-11-03
Updated: 2025-11-04

## License

MIT
