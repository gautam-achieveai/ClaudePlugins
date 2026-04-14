---
name: developer-performance-review
description: >
  This skill should be used when the user asks to "review [developer]'s work from [date] to [date]",
  "analyze developer productivity patterns", "prepare performance feedback", "conduct a performance review",
  "assess developer growth over time", or mentions evaluating a developer over weeks or months.
  Analyzes git history, PRs, work item context, and code quality patterns with emphasis on quality over quantity.
  NOT for single PR code reviews — use pr-review for that.
version: 1.2.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Task
  - mcp__azure-devops__*
  - mcp__hitl__*
---

# Developer Performance Review

Review a developer's work over time (weeks/months) combining git analysis, Azure DevOps PR context, and manager feedback for evidence-based assessment. Quality of work matters more than quantity.

## Phase 1: Data Collection

### 1A. Auto-Detect Primary Branch

Do NOT hardcode any branch. Auto-detect the repo's primary branch:

```powershell
# Run from the TARGET repo (not the plugin directory)
$ref = git symbolic-ref refs/remotes/origin/HEAD 2>$null
$primaryBranch = if ($ref) { $ref -replace 'refs/remotes/origin/', '' } else { $null }
# Fallback: check main, master, dev, develop, trunk
if (-not $primaryBranch) {
    foreach ($candidate in @('main', 'master', 'dev', 'develop', 'trunk')) {
        git rev-parse --verify "origin/$candidate" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $primaryBranch = $candidate; break }
    }
}
```

### 1B. Collect Git Data (TWO Datasets)

```powershell
# Dataset 1 — ALL authored work (includes branches, WIP, experiments)
git log --all --author="Developer" --since="START" --until="END" --numstat --pretty=format:"%H|%s|%ad"

# Dataset 2 — PRIMARY BRANCH landed work only (features actually shipped)
git log --first-parent "origin/$primaryBranch" --author="Developer" --since="START" --until="END" --numstat --pretty=format:"%H|%s|%ad"
```

The gap between Dataset 1 and Dataset 2 reveals WIP, rework, and abandoned branches.

Or run the automation script from the TARGET repo:
```powershell
& "${CLAUDE_SKILL_DIR}/scripts/Start-DeveloperReview.ps1" `
    -DeveloperName "Developer" -StartDate "YYYY-MM-DD" -EndDate "YYYY-MM-DD" `
    -Repository (git rev-parse --show-toplevel)
```

### 1C. Enrich PRs via Azure DevOps (CRITICAL)

Determine the ADO repository name from git remote: `git remote get-url origin` → extract the repo name.

For EVERY PR identified from git history:

1. `azure-devops-getPullRequest(repo, prId, include=["description","workItems","reviewers"])` — get rich PR data
2. For each linked work item: `azure-devops-getWorkItemById(id, fullDescription=true)` — get context
3. Walk parent chain: Task/Bug → User Story → Feature → Epic
4. Record which **customer feature** each PR served — this is key for impact assessment

Also query ADO directly for the developer's PRs to catch any missed by git grep:
`azure-devops-listPullRequests(repo, creatorId=developer, status="completed")`

Build a **Feature → PR mapping**: group PRs by their parent Feature/Epic. This reveals:
- Which customer features the developer contributed to
- How many PRs per feature (breadth vs depth)
- Bug PRs vs feature PRs ratio per feature area

### 1D. Run Analysis Scripts

- `Get-MajorPRs.ps1` — filter significant PRs (>100 lines changed)
- `Find-ActivityGaps.ps1` — detect inactivity periods (>14 days)
- `Analyze-BugPatterns.ps1` — categorize bug-related commits

## Phase 2: Context Gathering

**ALWAYS gather context BEFORE making any judgments.**

Use `mcp__hitl__AskUserQuestion` to ask the manager:
1. Satisfaction with specific features delivered (reference work item hierarchy from Phase 1C)
2. Known production incidents or rollbacks during the review period
3. Quality concerns observed from a business perspective
4. Reasons for activity gaps (OnCall rotations, blockers, vacation, team events)
5. Work ethic, collaboration, mentoring contributions

Frame questions with ADO context:
> "PR #9192 delivered 'Platform Migration' (Feature: Cloud Modernization).
> It had 3 follow-up bug fixes. Was this acceptable given the complexity?"

## Phase 3: Deep Analysis

### Code Quality (for each major PR)
- Get diff via `Get-PRDiff.ps1` or `git show`
- Evaluate: design patterns, defensive programming, SOLID, error handling, testing
- Cross-reference with follow-up bugs from work item hierarchy
- Document findings with file:line references

### Pattern Detection
Across all PRs, look for:
- **Thrashing**: add/remove/re-add in consecutive PRs within 48hrs
- **Missed Cases**: feature PR followed by 3+ bug PRs within 30 days
- **Review Churn**: PRs needing 3+ review rounds before approval
- **Incomplete Delivery**: Stories still Active with child Tasks Done
- **Production Debugging**: log-add/log-remove commits within 24hrs

### Impact Assessment (Quality > Quantity)
- Features DELIVERED end-to-end (from ADO work items and epic context)
- Bugs GENERATED per feature (quality signal)
- Review feedback received and how it was addressed
- Customer impact of delivered features (epic/feature-level context)

## Phase 4: Synthesis

### Assess across 6 dimensions:
1. **Code Quality & Design** — SOLID, defensive programming, maintainability
2. **Testing Adequacy** — coverage, quality, preventable production bugs
3. **Requirements Analysis** — upfront planning, completeness, rework frequency
4. **Time-to-Value** — timeline vs complexity, activity patterns, landed work
5. **User Satisfaction** — manager feedback, team collaboration, stakeholder trust
6. **Customer Impact & Business Value** — features delivered end-to-end, ADO epic alignment, bug-to-feature ratio

### Create these documents:
1. `detailed_code_quality_analysis.md` — PR-by-PR breakdown with code examples and file:line refs
2. `timeline_analysis.md` — activity patterns, gaps with context, feature delivery timelines
3. `talking_points.md` — structured discussion guide: accomplishments, concerns, goals
4. `recommendations.md` — specific, actionable improvements with measurable goals

### Critical Principles
- **Evidence-based**: Every claim backed by PR #, file:line, work item ID
- **Context-aware**: OnCall, blockers, complexity, learning curve
- **Balanced**: celebrate wins (20-30%), constructive feedback (40-50%), support plan (20-30%)
- **Root-cause focused**: testing gap vs requirements gap vs skill gap
- **Quality > Quantity**: few excellent PRs beat many mediocre ones

**NEVER finalize without manager validation via `mcp__hitl__AskUserQuestion`.**

## Reference Guides

Load these on demand for detailed frameworks:
- [Assessment Framework](references/assessment-framework.md) — 6-dimension rubric with evidence requirements
- [Pattern Catalog](references/pattern-catalog.md) — thrashing, missed cases, quality anti-patterns
- [Review Best Practices](references/review-best-practices.md) — principles, pitfalls, checklist
- [Examples](references/examples.md) — real review examples
- [Script Documentation](scripts/README.md) — automation tools and parameters
