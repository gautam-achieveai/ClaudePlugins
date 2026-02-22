# DevReviewer PowerShell (pwsh) Scripts

Automation scripts for conducting comprehensive developer performance reviews.

## Overview

These scripts automate the data collection and analysis needed for quality-focused performance reviews. They work together to extract git history, analyze patterns, and generate reports.

## Quick Start

### 🚀 RECOMMENDED: Automated Review Setup

**Use the all-in-one setup script to create an isolated worktree with everything pre-configured:**

```powershell
.\Start-DeveloperReview.ps1 `
    -DeveloperName "John Doe" `
    -StartDate "2024-01-01" `
    -EndDate "2024-11-01"
```

**What this does:**

1. ✓ Creates isolated git worktree in `worktrees/review_[developer]_[dates]/`
2. ✓ Runs all data collection scripts automatically
3. ✓ Sets up organized directory structure
4. ✓ Creates pre-filled report templates
5. ✓ Generates README with next steps

**Result:** A complete review workspace ready for analysis at:
`worktrees/review_[developer]_[dates]/scratchpad/conversation_memories/review_[developer]_[dates]/`

See [Start-DeveloperReview.ps1](#start-developerreviewps1) for full documentation.

---

### Manual Review Workflow (Individual Scripts)

If you prefer running scripts individually or need to re-run specific analysis:

```powershell
# 1. Extract all PRs and commits
.\Get-DeveloperPRs.ps1 -Author "John Doe" -Since "2024-01-01" -Until "2024-12-31" -OutputPath "analysis/prs.json"

# 2. Identify major PRs for deep review
.\Get-MajorPRs.ps1 -Author "John Doe" -Since "2024-01-01" -Until "2024-12-31" -MinLines 100 -OutputPath "analysis/major_prs.md"

# 3. Detect activity gaps
.\Find-ActivityGaps.ps1 -Author "John Doe" -Since "2024-01-01" -Until "2024-12-31" -MinGapDays 14 -OutputPath "analysis/gaps.md"

# 4. Analyze bug patterns
.\Analyze-BugPatterns.ps1 -Author "John Doe" -Since "2024-01-01" -Until "2024-12-31" -OutputPath "analysis/bugs.md"

# 5. Get detailed diffs for major PRs
.\Get-PRDiff.ps1 -PRNumber 9192 -OutputPath "analysis/pr_9192.diff" -IncludeStats
```

## Script Reference

### Start-DeveloperReview.ps1

**Purpose**: All-in-one script to set up a complete developer review environment with automated data collection

**Key Features**:

- Creates isolated git worktree for review work
- Automatically runs all data collection scripts
- Sets up organized directory structure
- Creates pre-filled report templates
- Generates comprehensive README with instructions
- Worktree is excluded from git (in `worktrees/` directory)

**Parameters**:

- `-DeveloperName` (Required): Name as it appears in git commits
- `-StartDate` (Required): Review period start date (YYYY-MM-DD)
- `-EndDate` (Optional): Review period end date (defaults to today)
- `-Branch` (Optional): Branch to checkout (defaults to "dev")
- `-MinorPRLines` (Optional): Minimum lines for "major" PR (defaults to 100)
- `-MinGapDays` (Optional): Minimum inactivity gap to flag (defaults to 14)
- `-SkipDataCollection` (Optional): Skip running data collection scripts

**Example - Basic Usage**:

```powershell
.\Start-DeveloperReview.ps1 `
    -DeveloperName "John Doe" `
    -StartDate "2024-01-01" `
    -EndDate "2024-11-01"
```

**Example - Custom Parameters**:

```powershell
.\Start-DeveloperReview.ps1 `
    -DeveloperName "Jane Smith" `
    -StartDate "2024-06-01" `
    -Branch "main" `
    -MinorPRLines 200 `
    -MinGapDays 21
```

**Example - Re-open Existing Review**:

```powershell
.\Start-DeveloperReview.ps1 `
    -DeveloperName "John Doe" `
    -StartDate "2024-01-01" `
    -SkipDataCollection
```

**Output Structure**:

```
worktrees/
└── review_John_Doe_20240101_20241101/
    └── scratchpad/
        └── conversation_memories/
            └── review_John_Doe_20240101_20241101/
                ├── README.md                    # Instructions and commands
                ├── data/                        # Automated reports
                │   ├── prs.json
                │   ├── major_prs.md
                │   ├── activity_gaps.md
                │   └── bug_patterns.md
                ├── reports/                     # Manual analysis templates
                │   ├── detailed_code_quality_analysis.md
                │   ├── timeline_analysis.md
                │   ├── talking_points.md
                │   └── recommendations.md
                └── code_reviews/                # PR diff storage
```

**Returns**: Hashtable with paths to all directories created

**Clean Up After Review**:

```powershell
# From repository root
git worktree remove worktrees/review_[developer]_[dates]
```

---

### Get-DeveloperPRs.ps1

**Purpose**: Extract all commits and PRs with comprehensive statistics

**Key Features**:

- Groups commits by PR
- Calculates line changes (additions/deletions)
- Generates monthly activity breakdown
- Identifies top 10 largest PRs
- Exports to JSON for further processing

**Example**:

```powershell
$result = .\Get-DeveloperPRs.ps1 -Author "John Doe" -Since "2024-01-01" -Until "2024-12-31"

# Access the data
Write-Host "Total PRs: $($result.Summary.TotalPRs)"
Write-Host "Net Lines: $($result.Summary.NetLines)"

# Export for Claude analysis
$result | ConvertTo-Json -Depth 10 | Out-File "developer_stats.json"
```

**Output Structure**:

```json
{
  "Author": "Developer Name",
  "Summary": {
    "TotalCommits": 186,
    "TotalPRs": 59,
    "TotalLinesAdded": 12500,
    "TotalLinesDeleted": 8300,
    "NetLines": 4200
  },
  "PRs": [ ... ],
  "MonthlyStats": [ ... ]
}
```

---

### Find-ActivityGaps.ps1

**Purpose**: Detect periods with no visible commits

**Key Features**:

- Identifies gaps >= specified days (default: 14)
- Calculates gap duration in days and weeks
- Generates visual timeline
- Suggests investigation questions

**Example**:

```powershell
.\Find-ActivityGaps.ps1 -Author "Jane Smith" -MinGapDays 7 -OutputPath "gaps_report.md"
```

**Use Cases**:

- Identify context switching or blocking issues
- Understand OnCall rotation impact
- Detect vacation periods
- Investigate productivity concerns

**Questions to Ask** (auto-generated in report):

- What was the developer working on?
- Were there blockers or dependencies?
- Was this planned downtime (vacation, training)?
- For extended gaps: project reassignment?

---

### Get-MajorPRs.ps1

**Purpose**: Filter PRs requiring detailed code review

**Key Features**:

- Filters by line count threshold
- Keyword-based filtering (e.g., "Migration", "Refactor")
- Complexity rating (Low/Medium/High/Very High)
- Auto-generates review checklist for each PR

**Example**:

```powershell
# Find large PRs
.\Get-MajorPRs.ps1 -Author "Alice" -MinLines 200 -OutputPath "major_prs.md"

# Find migration/refactor PRs regardless of size
.\Get-MajorPRs.ps1 -Author "Alice" -Keywords "Phase,Migration,Refactor" -OutputPath "strategic_prs.md"

# Combine criteria
.\Get-MajorPRs.ps1 -Author "Alice" -MinLines 100 -Keywords "Migration,Auth,Payment" -OutputPath "critical_prs.md"
```

**Complexity Ratings**:

- 🟢 Low: < 100 lines
- 🟡 Medium: 100-199 lines
- 🟠 High: 200-499 lines
- 🔴 Very High: 500+ lines

---

### Get-PRDiff.ps1

**Purpose**: Extract complete code diff for detailed analysis

**Key Features**:

- Retrieves full diff by PR number or commit hash
- Includes file statistics
- Formatted output with metadata
- Ready for code quality analysis

**Example**:

```powershell
# By PR number
.\Get-PRDiff.ps1 -PRNumber 9192 -OutputPath "phase2_diff.txt" -IncludeStats

# By commit hash
.\Get-PRDiff.ps1 -CommitHash "4278da2e67" -OutputPath "commit_diff.txt"

# Batch process major PRs
$majorPRs = 9192, 9259, 9670, 9632
foreach ($pr in $majorPRs) {
    .\Get-PRDiff.ps1 -PRNumber $pr -OutputPath "diffs/pr_$pr.diff" -IncludeStats
}
```

**Output Includes**:

- Commit metadata (hash, author, date)
- File statistics (if -IncludeStats)
- Complete diff with line numbers
- Summary (files changed, lines added/deleted)

---

### Analyze-BugPatterns.ps1

**Purpose**: Identify recurring bugs and quality issues

**Key Features**:

- Categorizes bugs (NullReference, Serialization, Auth, etc.)
- Detects hotfixes to release branches
- Temporal analysis (bug clustering by month)
- Auto-generates quality insights and recommendations

**Example**:

```powershell
# Standard analysis
.\Analyze-BugPatterns.ps1 -Author "Bob" -Since "2024-07-01" -Until "2025-06-30" -OutputPath "bug_analysis.md"

# Custom bug keywords
.\Analyze-BugPatterns.ps1 -Author "Bob" -Keywords "crash,exception,error,fail" -OutputPath "critical_bugs.md"
```

**Bug Categories**:

- NullReference
- Serialization
- Configuration
- Authentication
- Payment
- Logging
- Test
- General

**Red Flags Detected**:

- Recurring same-type bugs (>= 3)
- High hotfix count (>= 5)
- Bug clustering in specific months
- Critical area issues (auth, payment)

---

## Integration with Claude

### 1. Data Collection Phase

Run all scripts to gather data:

```powershell
# Create analysis directory
New-Item -ItemType Directory -Path "review_analysis" -Force

# Run all data collection scripts
.\Get-DeveloperPRs.ps1 -Author "Developer Name" -Since "2024-07-01" -Until "2025-06-30" -OutputPath "review_analysis/prs.json"
.\Find-ActivityGaps.ps1 -Author "Developer Name" -Since "2024-07-01" -Until "2025-06-30" -OutputPath "review_analysis/gaps.md"
.\Get-MajorPRs.ps1 -Author "Developer Name" -MinLines 100 -OutputPath "review_analysis/major_prs.md"
.\Analyze-BugPatterns.ps1 -Author "Developer Name" -Since "2024-07-01" -Until "2025-06-30" -OutputPath "review_analysis/bugs.md"

Write-Host "Analysis data ready in review_analysis/" -ForegroundColor Green
```

### 2. Invoke DevReviewer Skill

In Claude Code:

```
Claude, use the dev-reviewer skill to analyze the data in review_analysis/
and conduct a comprehensive performance review for [Developer Name].
```

### 3. Deep Code Analysis

For major PRs identified:

```powershell
# Read major PRs list
$majorPRs = Get-Content "review_analysis/major_prs.md" |
    Select-String "PR (\d+)" |
    ForEach-Object { $_.Matches.Groups[1].Value } |
    Select-Object -Unique

# Extract diffs for each
foreach ($pr in $majorPRs) {
    .\Get-PRDiff.ps1 -PRNumber $pr -OutputPath "review_analysis/diffs/pr_$pr.diff" -IncludeStats
}

Write-Host "Diffs ready for analysis in review_analysis/diffs/" -ForegroundColor Green
```

Then ask Claude:

```
Review the code diffs in review_analysis/diffs/ and analyze for:
1. Code quality issues
2. Design patterns
3. Testing adequacy
4. Defensive programming
```

---

## Advanced Usage

### Cross-Repository Analysis

For developers working across multiple repos:

```powershell
# Analyze MCQdbDEV
cd D:\Source\repos\MCQdbDEV
.\Get-DeveloperPRs.ps1 -Author "Dev" -Since "2024-07-01" -OutputPath "..\analysis\mcqdb_prs.json"

# Analyze MLProjects
cd D:\Source\repos\MLProjects
.\Get-DeveloperPRs.ps1 -Author "Dev" -Since "2024-07-01" -OutputPath "..\analysis\ml_prs.json"

# Claude can then combine both for complete picture
```

### Timeline Correlation

```powershell
# Generate activity timeline
.\Find-ActivityGaps.ps1 -Author "Dev" -MinGapDays 7 -OutputPath "timeline.md"

# Correlate with bug patterns
.\Analyze-BugPatterns.ps1 -Author "Dev" -OutputPath "bugs.md"

# Ask Claude: "Do bug clusters correspond with gaps or context switching?"
```

### Feature-Specific Analysis

```powershell
# Get all auth-related work
git log --all --author="Dev" --since="2024-07-01" --grep="auth" -i --oneline > auth_commits.txt

# Extract diffs for review
$authPRs = Get-Content "auth_commits.txt" |
    Select-String "Merged PR (\d+)" |
    ForEach-Object { $_.Matches.Groups[1].Value } |
    Select-Object -Unique

foreach ($pr in $authPRs) {
    .\Get-PRDiff.ps1 -PRNumber $pr -OutputPath "auth_analysis/pr_$pr.diff"
}
```

---

## Troubleshooting

### Common Issues

**Issue**: "Command not found" or execution policy error

**Solution**:

```powershell
# Set execution policy for current session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Or permanently for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

**Issue**: No commits found

**Solution**:

```powershell
# Verify author name
git log --all --format="%an" | Sort-Object -Unique

# Try with email instead
.\Get-DeveloperPRs.ps1 -Author "developer@company.com" ...

# Check date format
.\Get-DeveloperPRs.ps1 -Author "Dev" -Since "2024-01-01" -Until "2024-12-31"
```

---

**Issue**: PR number not found

**Solution**:

```powershell
# Search for PR in all branches
git log --all --oneline | Select-String "9192"

# Check if using correct repository
git remote -v
```

---

## Script Output Summary

| Script | Primary Output | Format | Use In Review |
|--------|---------------|--------|---------------|
| Get-DeveloperPRs.ps1 | All commits & PRs | JSON | Overview, metrics |
| Find-ActivityGaps.ps1 | Timeline gaps | Markdown | Productivity analysis |
| Get-MajorPRs.ps1 | PRs needing review | Markdown | Deep code analysis |
| Get-PRDiff.ps1 | Code changes | Diff | Quality assessment |
| Analyze-BugPatterns.ps1 | Bug categories | Markdown | Testing gaps |

---

## Best Practices

### 1. Run Scripts in Order

Always start with `Get-DeveloperPRs.ps1` to get overview, then drill down with other scripts.

### 2. Save All Outputs

Use `-OutputPath` for every script to create audit trail:

```powershell
New-Item -ItemType Directory -Path "review_$(Get-Date -Format 'yyyy-MM-dd')" -Force
# Run scripts with -OutputPath pointing to this directory
```

### 3. Document Context

Add notes files alongside script outputs:

```powershell
@"
Context Notes for Review
========================
- Developer was OnCall Sep 15-30
- Working on MLProjects during Q1
- Phase 2 was strategic priority
"@ | Out-File "review_2024/context_notes.md"
```

### 4. Combine with User Feedback

Script data + manager feedback = complete picture:

```
Scripts show: High bug count in October
Manager confirms: "Phase 2 had rollbacks"
Combined insight: Need better integration testing
```

---

## Future Enhancements

Potential additions:

- Code complexity analysis (cyclomatic complexity)
- Test coverage tracking
- Code review participation metrics
- Merge conflict frequency
- Collaboration patterns (co-authored commits)

---

## Support

For issues or suggestions:

1. Check script comments for detailed parameter descriptions
2. Use `-Verbose` flag for debugging
3. Review git log commands to understand data source

**Remember**: These scripts provide data. Human judgment (yours and Claude's) interprets quality and context.
