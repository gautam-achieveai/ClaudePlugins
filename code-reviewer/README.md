# Pull Request Code Reviewer Skill

A comprehensive Claude Code skill for conducting thorough code reviews of individual pull requests with focus on security, performance, testing, and code quality.

## Overview

This skill enables deep analysis of pull request changes, examining security vulnerabilities (OWASP Top 10), performance issues, testing adequacy, and overall code quality. It provides structured, actionable feedback with specific file:line references.

## Review Pipeline

The review is a funnel. Each stage is cheaper than the one it protects.

| Stage | What runs | Purpose |
|---|---|---|
| **Eligibility gate** | one haiku call | Stop on closed, draft, generated-only, empty, or already-reviewed PRs before any fan-out. |
| **Review tier** | `classify-review.mjs` | Deterministic: picks TINY, SMALL, MEDIUM, or LARGE and the exact lanes from file count, changed lines, structure, and code or executable-agent-definition signals. |
| **Context pack** | one fetch | The diff is fetched once and written to disk. Every agent reads the same bytes; no agent fetches its own. |
| **Core lanes** | `correctness-review`, `history-context-review`, `temp-code-review` | Logic defects, what the repo's history and past review comments already say, and debugging leftovers. |
| **Domain + external agents** | the lanes in `review-plan.json` | Only the agents the plan selected for this tier and its risk flags. |
| **Mechanical filter** | `filter-findings.mjs` | Deterministic and free: anchors every finding to the diff, merges cross-agent duplicates, applies the per-agent cap. |
| **Verification** | one `finding-verifier` per finding | Each finding gets an agent whose job is to disprove it. Critical and High findings face a second verifier on a different lens. |
| **Grading** | `review-grader` | Calibrates severity, assigns the merge-blocking or follow-up lane, decides the verdict. |
| **Publishing** | `post-pr-review` | Inline comments, questions, and the canonical summary. |

Two ideas carry most of the weight. **Findings are anchored before they are
judged**, because code the PR never touched is the largest source of false
positives. And **every surviving finding is attacked before it is posted**,
because disproving a finding is cheaper than generating one, and a confident
wrong finding costs more credibility than a missed one.

Every agent emits the same JSON record, capped at five findings, defined once in
`skills/pr-review/reference/finding-schema.md`.

### Focused Specialists

The top-level `code-reviewer` agent remains user-invokable for independent
feature and merge-readiness reviews. All bundled specialist and supporting
agents are LLM-only: `user-invocable: false` hides them from the agent picker,
while `disable-model-invocation: false` keeps them available for dispatch.
The `pr-review` skill remains user-invokable. It does not dispatch the
top-level agent, which invokes the skill itself.

The review team targets 3-7 specialists with distinct ownership, not every
available agent. Required risk coverage can exceed that target with an explicit
reason. These lanes run only when the classifier detects applicable changes:

| Agent | Focus |
| --- | --- |
| `accessibility-review` | UI semantics, keyboard/focus behavior, and visual-access barriers. |
| `css-consistency-review` | Existing tokens and component-style reuse, stylesheet ownership, cascade conflicts, and theme/responsive consistency. |
| `agent-contract-review` | Agent/skill/prompt definitions, MCP/tool contracts, context availability, and handoff failures. |
| `security-review` | Trust boundaries, authorization, attacker-controlled input, and evidenced abuse paths. |
| `reliability-review` | Partial failures, retries, duplicate side effects, recovery, and operational checks. |

Ordinary documentation mentions do not select these lanes. Executable agent
and skill Markdown is intentionally routed to agent-contract review. UI changes
select accessibility; stylesheet and styling-API changes also select CSS review.
Style modules include bare names such as `theme.ts` and `tokens.json`, as well
as suffixed and nested modules. Reliability settings are recognized with
unquoted keys or quoted JSON/YAML keys, including removed settings.
Each specialist follows the guardian-and-mentor philosophy, uses the shared
finding schema, and distinguishes static evidence from unperformed runtime tests.

The existing `over-engineering-review` lane also checks implementation fit:
superficial completion, fabricated integrations, success-shaped fallbacks,
hollow tests, misleading documentation, and accumulated workarounds. Its
[methodology](skills/over-engineering-review/SKILL.md) requires a concrete trace,
false-positive exclusions, and one owner per mechanism. It does not infer AI
authorship or add another parallel reviewer; intelligence and routing are unchanged.

## Skill Structure

```
pr-reviewer/
├── .claude-plugin/
│   └── plugin.json               # Plugin manifest
├── README.md                     # This file - skill documentation
├── SKILL.md                      # Main skill definition (used by Claude)
├── reference/                    # Reference guides
│   ├── finding-schema.md         # The output contract every agent emits
│   ├── review-modes.md           # Eligibility gate, review tiers, workspace modes
│   ├── agent-dispatch.md         # Which agents run, on which triggers, at which model tier
│   ├── agent-guidance.md         # Discipline blocks copied into every agent prompt
│   ├── grading-rubric.md         # Calibration principles, loaded by the grader on demand
│   ├── code-project-alignment-guide.md     # Code alignment with project or frameworks
│   ├── code-quality-guide.md     # Code quality best practices
│   ├── performance-guide.md      # Performance optimization guide
│   ├── performance-patterns-backend.md     # .NET detection catalog
│   ├── performance-patterns-frontend.md    # React/bundler detection catalog
│   ├── architecture-patterns.md  # Architectural anti-pattern catalog
│   ├── security-checklist.md     # Security vulnerability checklist
│   └── testing-guide.md          # Testing best practices
├── templates/                    # Review templates
└── scripts/                      # Cross-platform review automation
    ├── Start-PRReview.ps1        # Initialize review workflow on PowerShell
    ├── Start-PRReview.sh         # Initialize review workflow on Linux/Bash
    ├── filter-findings.mjs       # Deterministic diff anchoring, dedupe, and cap
    └── README.md                 # Script documentation
```

## How It Works

### Automatic Use

Claude will automatically use this skill when you ask questions like:

- "Review PR #12345"
- "Code review this pull request"
- "Check PR for security issues"
- "Analyze changes in this PR"

### Manual Use

You can also explicitly use it:

```
Use the pr-reviewer skill to analyze PR #12345
```

## Quick Start

### 1. Fetch PR Data

The plugin auto-detects the repository provider (GitHub or Azure DevOps) from the
git remote — see [references/provider-resolution.md](references/provider-resolution.md).

```
# GitHub
gh pr view 12345 --json number,title,author,headRefName,baseRefName,body

# Azure DevOps
mcp__azure-devops__getPullRequest -repository "YourRepo" -pullRequestId 12345
```

### 2. Run Review Script

```pwsh
<PATH_FOR_PR-REVIEWER_SKILL_ROOT_DIRECTORY>\scripts\Start-PRReview.ps1 `
    -PRNumber 12345 `
    -SourceBranch "feature/add-bulk-upload" `
    -PRTitle "Add bulk upload feature" `
    -PRAuthor "Example Developer"
```

On Linux:

```bash
bash <PATH_FOR_PR-REVIEWER_SKILL_ROOT_DIRECTORY>/scripts/Start-PRReview.sh \
    --pr-number 12345 \
    --source-branch feature/add-bulk-upload \
    --pr-title "Add bulk upload feature" \
    --pr-author "Example Developer"
```

This creates an isolated worktree with analysis templates.

### 3. Use the Skill

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
- **reference/repo-conventions.md**: Repo-specific defaults and overrides
- **.claude-plugin/plugin.json**: Plugin manifest for Claude Code marketplace

## Learning from Human Review Feedback

Use `code-reviewer:review-retrospective` after human answers, corrections, or
comments arrive, or explicitly ask it to assess a completed review. It examines
what the reviewer could reasonably have known, separates knowledge from process
gaps, and dispatches `review-performance-judge` for an independent assessment.
The existing `review-grader` still grades findings before publication.

The judge uses [14 dimensions](skills/review-retrospective/reference/performance-rubric.md),
including over-review, under-review, maturity alignment, leniency, and language.
Scores require evidence; missing feedback or token telemetry stays unknown.
The initial judgment uses raw evidence before proposed lessons are supplied.

`code-reviewer:apply-review-learning` writes knowledge and process lessons to
the lesson store shared with `development:compound-learning`:
`docs/superpowers/learnings/<category>/<slug>.md`, one lesson per file.
Knowledge lessons record the verified fact, source, scope, confidence, and when
to revalidate. Process lessons record the remedy, `applies_when` and `skip_when`
triggers, expected cost and benefit, and a validation case. The per-PR report
lists both classes, saying "No supported entries" when one class has none.

If the prompt requests one report, the lessons go into two labeled sections of
that report instead. Matching lessons are updated in place, including
retractions. Later reviews and plans read the store back at triage. See the
[evidence/output contract](skills/review-retrospective/reference/evidence-contract.md).

Initial and repeat review workflows hand off when new human feedback exists,
a pending stage can now complete, or a retrospective is requested. Unchanged
completed work is reused. No polling, PR publication, or automatic edits to
global review methodology are implied. Downstream changes require a request
covering those edits; already authorized changes do not need fresh permission.

Example: “Run `code-reviewer:review-retrospective` on these review artifacts and
human replies. Capture knowledge and process lessons in one local report.”

## Requirements

- PowerShell Core (pwsh) 7.0 or later
- Git installed and in PATH
- Access to git repositories being reviewed
- Claude Code with skills support
- One of, for PR data fetching/posting: GitHub MCP or the `gh` CLI (authenticated) for GitHub repos; Azure DevOps MCP for Azure DevOps repos

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
