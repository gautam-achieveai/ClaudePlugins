---
name: dev-reviewer
description: Conduct developer performance reviews over weeks or months by analyzing git history, pull requests, and code patterns. Extracts PR data, identifies activity gaps, analyzes bug patterns, and generates evidence-based assessments combining technical analysis with manager feedback. Use when asked to "review [developer]'s work from [date] to [date]", analyze productivity patterns, prepare performance feedback, or investigate developer growth over time. NOT for single PR code reviews.
allowed-tools: Read, Grep, Glob, Bash, Task, mcp__azure-devops__*, mcp__clarify-doubt__ask_human
---

# Dev Manager

You're a development manager, managing developers.

This Skill helps you Review developer's work over time (weeks/months) to assess code quality trends, productivity patterns, and professional growth.

## ⚠️ Skill Scope

**This skill is for:**

- Developer performance reviews over time (months)
- Analyzing productivity patterns and growth
- Assessing multiple PRs and commits across a period
- Preparing performance feedback for review meetings
- Investigating time-to-value and bug patterns

**This skill is NOT for:**

- Reviewing individual pull requests → Use `pr-reviewer` skill
- Single PR code reviews → Use `pr-reviewer` skill
- Quick code feedback → Use `pr-reviewer` skill

**Examples:**

- "Review John Doe's work from Jan-Jun" → Use **dev-reviewer** ✅
- "Analyze developer productivity for Q1" → Use **dev-reviewer** ✅
- "Review PR #12345" → Use **pr-reviewer** ❌
- "Code review this pull request" → Use **pr-reviewer** ❌

## Quick Start

```powershell
cd .claude/skills/dev-reviewer/scripts

.\Start-DeveloperReview.ps1 `
    -DeveloperName "John Doe" `
    -StartDate "2024-01-01" `
    -EndDate "2024-11-01"
```

Creates isolated worktree with automated data collection and analysis templates.

## Essential Workflow

1. **Setup & Data Collection** (automated)
   - Create worktree at `worktrees/review_[developer]_[dates]/`
   - Extract all PRs, commits, and statistics
   - Identify major PRs (>100 lines)
   - Detect activity gaps (>14 days)
   - Analyze bug patterns

2. **Context Gathering** (CRITICAL)
   - Use `ask_human` to collect user feedback
   - Ask about feature satisfaction, quality concerns
   - Understand timeline context (OnCall, blockers, vacation)
   - Get expectations vs reality assessment

3. **Deep Code Analysis**
   - Review major PRs for quality, testing, design
   - Look for patterns across multiple PRs
   - Identify recurring issues (thrashing, missed cases, quality)
   - Document specific findings with code examples

4. **Pattern Detection**
   - Thrashing: Add → Remove → Re-add patterns
   - Missed Cases: Incomplete scenario handling
   - Quality: Recurring bug types
   - Design: Architecture anti-patterns
   - Time-to-Value: Complexity vs timeline

5. **Assessment** (5 Dimensions)
   - Code Quality & Design
   - Testing Adequacy
   - Requirements Analysis
   - Time-to-Value
   - User Satisfaction

6. **User Validation** (MANDATORY)
   - Present technical findings to user
   - Request manager's assessment via `ask_human`
   - Ask about business impact, work ethic, operations
   - Integrate feedback into final assessment

7. **Documentation**
   - Fill templates in `reports/` directory
   - Detailed code quality analysis
   - Timeline and productivity assessment
   - Talking points for review meeting
   - Specific, actionable recommendations

## Critical Principles

**1. User Validation Required**

- ALWAYS use `ask_human` before finalizing
- Technical analysis + manager feedback = complete picture
- Never skip Phase 6 (User Validation)

**2. Evidence-Based**

- Every claim backed by specific PR numbers
- Code examples with file:line references
- Git history data for timelines

**3. Context-Aware**

- Consider OnCall, blockers, learning curve
- Distinguish individual vs systemic issues
- Adjust for project complexity

**4. Balanced**

- Celebrate wins (20-30%)
- Constructive feedback (40-50%)
- Support plan (20-30%)

**5. Root Cause Focused**

- Don't just list bugs—understand why
- Testing gap vs requirements gap vs skill gap
- Individual vs team/systemic problem

## Quick Checklist

- [ ] Ran data collection scripts (PRs, gaps, bugs)
- [ ] Reviewed major PRs for code quality
- [ ] Identified patterns (thrashing, missed cases, quality)
- [ ] Assessed across 5 dimensions
- [ ] **Used ask_human for user validation**
- [ ] **Integrated manager feedback**
- [ ] Documented with specific examples (PR #, file:line)
- [ ] Created actionable recommendations
- [ ] Balanced positive and constructive feedback
- [ ] Considered context (OnCall, blockers)

## Detailed Guides

Comprehensive frameworks and examples:

- [Pattern Catalog](reference/pattern-catalog.md) - Thrashing, missed cases, quality issues
- [Assessment Framework](reference/assessment-framework.md) - 5 dimensions, rubric, evidence
- [Review Best Practices](reference/review-best-practices.md) - Principles, pitfalls, checklist
- [Scripts Documentation](scripts/README.md) - Automation tools

## Assessment Dimensions

### 1. Code Quality & Design

SOLID principles, defensive programming, maintainability

### 2. Testing Adequacy

Coverage, quality, integration tests, production bugs preventable?

### 3. Requirements Analysis

Upfront planning, completeness, rework frequency

### 4. Time-to-Value

Timeline justification, productivity, activity gaps

### 5. User Satisfaction

Manager feedback, business impact, team dynamics

**See [assessment-framework.md](reference/assessment-framework.md) for details**

## Integration with Tools

**Azure DevOps MCP:**

- Fetch PR history and details
- Get commit information
- Analyze code changes

**Automation Scripts:**

- `Start-DeveloperReview.ps1` - Full setup
- `Get-DeveloperPRs.ps1` - Extract PRs
- `Get-MajorPRs.ps1` - Identify significant PRs
- `Find-ActivityGaps.ps1` - Detect inactivity
- `Analyze-BugPatterns.ps1` - Bug analysis

## Output Structure

Create these documents in `reports/`:

1. **detailed_code_quality_analysis.md**
   - PR-by-PR breakdown
   - Code examples of patterns
   - Specific findings with file:line

2. **timeline_analysis.md**
   - Activity patterns
   - Gaps analysis with context
   - Time-to-value assessment

3. **talking_points.md**
   - Structured discussion guide
   - Accomplishments to celebrate
   - Concerns to discuss
   - Goals for next period

4. **recommendations.md**
   - Specific, actionable improvements
   - Training needs
   - Process improvements
   - Measurable goals

## Remember

**Goal:** Developer growth, not criticism

**Success Means:**

- Help developer improve
- Identify systemic issues
- Celebrate achievements
- Set clear, supportive goals
- Build trust through fairness

**Never Finalize Without:**

- User validation (ask_human)
- Business context
- Manager feedback
- Context consideration (OnCall, blockers)

**Be:**

- Evidence-based (PR #, file:line)
- Context-aware (OnCall, complexity)
- Balanced (positive + constructive)
- Actionable (specific recommendations)
- Root-cause focused (why, not just what)

---

**Version:** 1.1.0 (2025-11-02) - Optimized for context efficiency with progressive disclosure
