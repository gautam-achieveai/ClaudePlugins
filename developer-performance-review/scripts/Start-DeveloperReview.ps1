#!/usr/bin/env pwsh
# Requires PowerShell Core (pwsh) 7.0 or later

<#
.SYNOPSIS
    Start a comprehensive developer performance review with automated setup.

.DESCRIPTION
    This script automates the developer review workflow:
    - Creates a dedicated git worktree for the review
    - Sets up directory structure for analysis artifacts
    - Runs data collection scripts (PRs, gaps, bugs)
    - Prepares environment for deep code analysis

    The worktree is created in the 'worktrees' directory which is excluded from git.

.PARAMETER DeveloperName
    The name of the developer to review (used in git log --author)

.PARAMETER StartDate
    Start date for the review period (YYYY-MM-DD format)

.PARAMETER EndDate
    End date for the review period (YYYY-MM-DD format). Defaults to today.

.PARAMETER Branch
    The branch to checkout for review. Defaults to 'dev'.

.PARAMETER MinorPRLines
    Minimum lines changed to consider a PR "major". Defaults to 100.

.PARAMETER MinGapDays
    Minimum days of inactivity to flag as a gap. Defaults to 14.

.PARAMETER SkipDataCollection
    If set, skips automated data collection scripts (useful for re-running analysis)

.EXAMPLE
    .\Start-DeveloperReview.ps1 -DeveloperName "John Doe" -StartDate "2024-01-01" -EndDate "2024-11-01"

    Starts a full review for John Doe covering January through November 2024.

.EXAMPLE
    .\Start-DeveloperReview.ps1 -DeveloperName "Jane Smith" -StartDate "2024-06-01" -Branch "main"

    Reviews Jane Smith's work from June 2024 to now on the main branch.

.EXAMPLE
    .\Start-DeveloperReview.ps1 -DeveloperName "John Doe" -StartDate "2024-01-01" -SkipDataCollection

    Re-opens an existing review without re-running data collection scripts.

.NOTES
    Author: MCQdb Development Team
    Version: 1.0.0

    This script requires:
    - Git installed and available in PATH
    - PowerShell 5.1 or higher
    - Repository must have 'dev' branch (or specify alternative with -Branch)
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "Developer name to review (as it appears in git commits)")]
    [string]$DeveloperName,

    [Parameter(Mandatory = $true, HelpMessage = "Start date for review period (YYYY-MM-DD)")]
    [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
    [string]$StartDate,

    [Parameter(Mandatory = $false, HelpMessage = "End date for review period (YYYY-MM-DD)")]
    [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
    [string]$EndDate = (Get-Date -Format 'yyyy-MM-dd'),

    [Parameter(Mandatory = $false)]
    [string]$Branch = "dev",

    [Parameter(Mandatory = $false)]
    [int]$MinorPRLines = 100,

    [Parameter(Mandatory = $false)]
    [int]$MinGapDays = 14,

    [Parameter(Mandatory = $false)]
    [switch]$SkipDataCollection
)

# Ensure running under PowerShell Core (pwsh), not Windows PowerShell
if ($PSVersionTable.PSEdition -ne 'Core') {
    Write-Host "ERROR: This script requires PowerShell Core (pwsh), not Windows PowerShell" -ForegroundColor Red
    Write-Host ""
    Write-Host "You are currently running:" -ForegroundColor Yellow
    Write-Host "  Edition: $($PSVersionTable.PSEdition)" -ForegroundColor White
    Write-Host "  Version: $($PSVersionTable.PSVersion)" -ForegroundColor White
    Write-Host ""
    Write-Host "Please install PowerShell Core and run with 'pwsh' instead of 'powershell':" -ForegroundColor Cyan
    Write-Host "  Download: https://github.com/PowerShell/PowerShell/releases" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script with:" -ForegroundColor Cyan
    Write-Host "  pwsh $($MyInvocation.MyCommand.Path)" -ForegroundColor White
    Write-Host ""
    exit 1
}

$ErrorActionPreference = "Stop"

function Initialize-GitExclusions {
    <#
    .SYNOPSIS
        Ensures worktrees and scratchpad are excluded from git tracking
    
    .DESCRIPTION
        Finds the git root, ensures .git/info/exclude exists, and adds
        worktrees and scratchpad entries if not already present (case-insensitive).
    #>
    
    # Find git root
    $gitRoot = git rev-parse --show-toplevel 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Not in a git repository"
    }
    
    # Convert to Windows path if needed
    $gitRoot = $gitRoot -replace '/', '\\'
    
    # Path to .git/info/exclude
    $excludeFile = Join-Path $gitRoot ".git\info\exclude"
    
    # Ensure .git/info directory exists
    $infoDir = Split-Path $excludeFile -Parent
    if (-not (Test-Path $infoDir)) {
        New-Item -ItemType Directory -Path $infoDir -Force | Out-Null
    }
    
    # Create exclude file if it doesn't exist
    if (-not (Test-Path $excludeFile)) {
        Set-Content -Path $excludeFile -Value "# git ls-files --others --exclude-from=.git/info/exclude" -Encoding UTF8
    }
    
    # Read existing content
    $content = Get-Content -Path $excludeFile -ErrorAction SilentlyContinue
    if ($null -eq $content) {
        $content = @()
    }
    
    # Check if worktrees and scratchpad are already excluded (case-insensitive)
    $hasWorktrees = $content | Where-Object { $_ -match '^\s*worktrees\s*$' }
    $hasScratchpad = $content | Where-Object { $_ -match '^\s*scratchpad\s*$' }
    
    $modified = $false
    
    if (-not $hasWorktrees) {
        Add-Content -Path $excludeFile -Value "worktrees" -Encoding UTF8
        Write-Host "   ✓ Added 'worktrees' to .git/info/exclude" -ForegroundColor Cyan
        $modified = $true
    }
    
    if (-not $hasScratchpad) {
        Add-Content -Path $excludeFile -Value "scratchpad" -Encoding UTF8
        Write-Host "   ✓ Added 'scratchpad' to .git/info/exclude" -ForegroundColor Cyan
        $modified = $true
    }
    
    if (-not $modified) {
        Write-Host "   ○ Git exclusions already configured" -ForegroundColor Gray
    }
}

# Initialize git exclusions before doing any work
Write-Host "Initializing git exclusions..." -ForegroundColor Green
Initialize-GitExclusions
Write-Host ""

# Script directory (where this script is located)
$ScriptDir = $PSScriptRoot

# Repository root (4 levels up from scripts dir: .claude/skills/dev-reviewer/scripts)
$RepoRoot = Split-Path (Split-Path (Split-Path (Split-Path $ScriptDir -Parent) -Parent) -Parent) -Parent

# Validate we're in a git repository
Push-Location $RepoRoot
try {
    $gitCheck = git rev-parse --git-dir 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Not in a git repository. Expected repository root at: $RepoRoot"
    }
}
finally {
    Pop-Location
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Developer Performance Review Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Developer:    " -NoNewline -ForegroundColor Yellow
Write-Host $DeveloperName -ForegroundColor White
Write-Host "Period:       " -NoNewline -ForegroundColor Yellow
Write-Host "$StartDate to $EndDate" -ForegroundColor White
Write-Host "Branch:       " -NoNewline -ForegroundColor Yellow
Write-Host $Branch -ForegroundColor White
Write-Host ""

# Create sanitized directory name from developer name and dates
$devInitials = ($DeveloperName -split '\s+' | ForEach-Object { $_[0] }) -join ''
$devNameSafe = $DeveloperName -replace '[^\w\s-]', '' -replace '\s+', '_'
$dateRange = "$($StartDate -replace '-', '')_$($EndDate -replace '-', '')"
$reviewDirName = "review_${devNameSafe}_${dateRange}"
$worktreePath = Join-Path $RepoRoot "worktrees\$reviewDirName"
$analysisPath = Join-Path $worktreePath "scratchpad\conversation_memories\$reviewDirName"

# Step 1: Create worktree
Write-Host "[1/5] Creating git worktree..." -ForegroundColor Green

if (Test-Path $worktreePath) {
    Write-Host "   ⚠️  Worktree already exists at: $worktreePath" -ForegroundColor Yellow

    $response = Read-Host "   Do you want to remove and recreate it? (y/n)"
    if ($response -eq 'y') {
        Write-Host "   Removing existing worktree..." -ForegroundColor Yellow
        Push-Location $RepoRoot
        try {
            git worktree remove $worktreePath --force 2>&1 | Out-Null
        }
        catch {
            Write-Warning "Failed to remove worktree via git, trying manual cleanup..."
            Remove-Item -Path $worktreePath -Recurse -Force
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host "   Using existing worktree." -ForegroundColor Cyan
        Push-Location $worktreePath
        $skipWorktreeCreation = $true
    }
}

if (-not $skipWorktreeCreation) {
    Push-Location $RepoRoot
    try {
        # Ensure worktrees directory exists
        $worktreesRoot = Join-Path $RepoRoot "worktrees"
        if (-not (Test-Path $worktreesRoot)) {
            New-Item -ItemType Directory -Path $worktreesRoot -Force | Out-Null
        }

        Write-Host "   Creating worktree at: $worktreePath" -ForegroundColor Cyan
        git worktree add $worktreePath $Branch

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create git worktree"
        }

        Write-Host "   ✓ Worktree created successfully" -ForegroundColor Green
        Push-Location $worktreePath
    }
    catch {
        Pop-Location
        throw
    }
}

# Step 2: Create analysis directory structure
Write-Host ""
Write-Host "[2/5] Setting up analysis directory structure..." -ForegroundColor Green

$directories = @(
    $analysisPath,
    (Join-Path $analysisPath "data"),
    (Join-Path $analysisPath "reports"),
    (Join-Path $analysisPath "code_reviews")
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   ✓ Created: $dir" -ForegroundColor Cyan
    }
    else {
        Write-Host "   ○ Exists: $dir" -ForegroundColor Gray
    }
}

# Step 3: Run data collection scripts
if (-not $SkipDataCollection) {
    Write-Host ""
    Write-Host "[3/5] Running data collection scripts..." -ForegroundColor Green

    $dataDir = Join-Path $analysisPath "data"

    # Get developer PRs
    Write-Host "   📊 Collecting PR data..." -ForegroundColor Cyan
    $prsOutput = Join-Path $dataDir "prs.json"
    & "$ScriptDir\Get-DeveloperPRs.ps1" `
        -Author $DeveloperName `
        -Since $StartDate `
        -Until $EndDate `
        -OutputPath $prsOutput

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ PR data saved to: $prsOutput" -ForegroundColor Green
    }
    else {
        Write-Warning "Failed to collect PR data"
    }

    # Get major PRs
    Write-Host "   📊 Identifying major PRs..." -ForegroundColor Cyan
    $majorPrsOutput = Join-Path $dataDir "major_prs.md"
    & "$ScriptDir\Get-MajorPRs.ps1" `
        -Author $DeveloperName `
        -MinLines $MinorPRLines `
        -OutputPath $majorPrsOutput

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Major PRs report saved to: $majorPrsOutput" -ForegroundColor Green
    }
    else {
        Write-Warning "Failed to identify major PRs"
    }

    # Find activity gaps
    Write-Host "   📊 Analyzing activity gaps..." -ForegroundColor Cyan
    $gapsOutput = Join-Path $dataDir "activity_gaps.md"
    & "$ScriptDir\Find-ActivityGaps.ps1" `
        -Author $DeveloperName `
        -MinGapDays $MinGapDays `
        -OutputPath $gapsOutput

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Activity gaps report saved to: $gapsOutput" -ForegroundColor Green
    }
    else {
        Write-Warning "Failed to analyze activity gaps"
    }

    # Analyze bug patterns
    Write-Host "   📊 Analyzing bug patterns..." -ForegroundColor Cyan
    $bugsOutput = Join-Path $dataDir "bug_patterns.md"
    & "$ScriptDir\Analyze-BugPatterns.ps1" `
        -Author $DeveloperName `
        -OutputPath $bugsOutput

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Bug patterns report saved to: $bugsOutput" -ForegroundColor Green
    }
    else {
        Write-Warning "Failed to analyze bug patterns"
    }
}
else {
    Write-Host ""
    Write-Host "[3/5] Skipping data collection (as requested)..." -ForegroundColor Yellow
}

# Step 4: Create template files
Write-Host ""
Write-Host "[4/5] Creating template files..." -ForegroundColor Green

$reportsDir = Join-Path $analysisPath "reports"

# Create README with instructions
$readmeContent = @"
# Developer Review: $DeveloperName
## Period: $StartDate to $EndDate

## Review Structure

### Data Collection (Automated)
Located in \`data/\` directory:
- **prs.json**: All PRs by the developer
- **major_prs.md**: PRs with significant code changes (>$MinorPRLines lines)
- **activity_gaps.md**: Periods of inactivity (>$MinGapDays days)
- **bug_patterns.md**: Analysis of bugs and fix patterns

### Reports (Manual Analysis)
Located in \`reports/\` directory:
- **detailed_code_quality_analysis.md**: PR-by-PR code review with examples
- **timeline_analysis.md**: Activity patterns and productivity assessment
- **talking_points.md**: Structured discussion guide for review meeting
- **recommendations.md**: Specific, actionable improvements

### Code Reviews (Deep Dives)
Located in \`code_reviews/\` directory:
- Individual PR diffs and analysis for major PRs

## Review Workflow

1. ✅ **Data Collection Complete** - Automated scripts have run
2. ⏳ **Review Data** - Examine automated reports in data/
3. ⏳ **Deep Code Analysis** - Review major PRs using Get-PRDiff.ps1
4. ⏳ **Document Findings** - Fill in reports/ templates
5. ⏳ **User Validation** - Present findings and gather feedback (CRITICAL)
6. ⏳ **Finalize Assessment** - Integrate user feedback into final review

## Commands

### Get PR diff for detailed review:
\`\`\`powershell
cd $ScriptDir
.\Get-PRDiff.ps1 -PRNumber <NUMBER> -OutputPath "$analysisPath\code_reviews\pr_<NUMBER>.diff"
\`\`\`

### Re-run data collection:
\`\`\`powershell
cd $ScriptDir
.\Start-DeveloperReview.ps1 ``
    -DeveloperName "$DeveloperName" ``
    -StartDate "$StartDate" ``
    -EndDate "$EndDate" ``
    -Branch "$Branch"
\`\`\`

### Clean up when done:
\`\`\`powershell
cd $RepoRoot
git worktree remove $worktreePath
\`\`\`

## Important Reminders

- **Always validate findings with user via ask_human before finalizing**
- Use specific code examples, not vague observations
- Consider context (OnCall, blockers, project complexity)
- Balance positive feedback with constructive criticism
- Focus on root causes, not just symptoms

## Generated Information
- **Review Started**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- **Worktree Path**: $worktreePath
- **Analysis Path**: $analysisPath
- **Branch**: $Branch
"@

$readmePath = Join-Path $analysisPath "README.md"
Set-Content -Path $readmePath -Value $readmeContent
Write-Host "   ✓ Created: README.md" -ForegroundColor Green

# Create report templates
$templates = @{
    "detailed_code_quality_analysis.md" = @"
# Detailed Code Quality Analysis: $DeveloperName
## Review Period: $StartDate to $EndDate

## Summary

**Total PRs**: [TO BE FILLED]
**Lines Added**: [TO BE FILLED]
**Lines Removed**: [TO BE FILLED]
**Major PRs Reviewed**: [TO BE FILLED]

## PR-by-PR Analysis

### PR #[NUMBER] - [Title]
**Date**: [DATE]
**Lines Changed**: [+XXX -YYY]
**Purpose**: [Brief description]

#### Code Quality
- [Quality observation with code example]

#### Testing
- [Testing adequacy assessment]

#### Issues Found
- [Bugs or concerns]

---

[Repeat for each major PR]

## Patterns Identified

### Positive Patterns
- [List strengths observed across multiple PRs]

### Areas for Improvement
- [List recurring issues with specific examples]

## Specific Code Examples

### Example 1: [Pattern Name]
**Location**: [File path:line number]
**Issue**: [Description]
\`\`\`csharp
// Code example
\`\`\`
**Recommendation**: [How to improve]

---

[Add more examples as needed]
"@

    "timeline_analysis.md"              = @"
# Timeline & Productivity Analysis: $DeveloperName
## Review Period: $StartDate to $EndDate

## Activity Overview

**Total Commits**: [TO BE FILLED]
**Total PRs**: [TO BE FILLED]
**Active Days**: [TO BE FILLED]
**Activity Gaps**: [TO BE FILLED] (see data/activity_gaps.md)

## Activity Gaps Analysis

[Review data/activity_gaps.md and provide context for each gap]

### Gap 1: [Dates]
**Duration**: [X days]
**Context**: [Reason - OnCall, blockers, vacation, etc.]
**Impact**: [Assessment]

---

## Time-to-Value Assessment

### Feature Implementation Timeline

| Feature | Start Date | End Date | Duration | Lines Changed | Assessment |
|---------|------------|----------|----------|---------------|------------|
| [Feature] | [Date] | [Date] | [X days] | [+XXX -YYY] | [Justified/Concerning] |

### Analysis
- [Discussion of whether timelines are justified by complexity]
- [Comparison with similar features]
- [Identification of potential blockers or inefficiencies]

## Productivity Patterns

### High-Productivity Periods
- [Identify when and why productivity was high]

### Low-Productivity Periods
- [Identify when and why productivity was low]
- [Distinguish between individual and systemic factors]

## Recommendations
- [Specific suggestions to improve time-to-value]
"@

    "talking_points.md"                 = @"
# Performance Review Discussion Guide: $DeveloperName
## Review Period: $StartDate to $EndDate

## Opening (Positive)

### Major Accomplishments
1. [Accomplishment 1 with impact]
2. [Accomplishment 2 with impact]
3. [Accomplishment 3 with impact]

### Technical Skills Demonstrated
- [Skill 1: example]
- [Skill 2: example]
- [Skill 3: example]

### Business Value Delivered
- [Value 1]
- [Value 2]

---

## Accomplishments to Celebrate

### [Feature/Project Name]
**Impact**: [Business value]
**Technical Highlights**: [What was done well]
**Recognition**: [Specific praise]

---

## Concerns to Discuss (Constructive)

### Area 1: [e.g., Testing Adequacy]
**Observation**: [Specific pattern observed]
**Example**: [Code example or PR reference]
**Question**: "Can you help me understand [context]?"
**Growth Opportunity**: [How to improve]

### Area 2: [e.g., Code Quality]
**Observation**: [Specific pattern observed]
**Example**: [Code example or PR reference]
**Question**: "Can you help me understand [context]?"
**Growth Opportunity**: [How to improve]

---

## Goals for Next Period

### Goal 1: [Specific, Measurable Goal]
**Success Criteria**: [How we'll measure]
**Support Offered**: [Training, mentoring, resources]
**Timeline**: [Check-in dates]

### Goal 2: [Specific, Measurable Goal]
**Success Criteria**: [How we'll measure]
**Support Offered**: [Training, mentoring, resources]
**Timeline**: [Check-in dates]

### Goal 3: [Specific, Measurable Goal]
**Success Criteria**: [How we'll measure]
**Support Offered**: [Training, mentoring, resources]
**Timeline**: [Check-in dates]

---

## Closing (Positive)

### Reaffirm Value
- [Statement of developer's value to team]
- [Confidence in their growth]

### Next Steps
1. [Follow-up action 1]
2. [Follow-up action 2]
3. [Next check-in date]

### Open Discussion
- "What questions do you have?"
- "Is there anything you'd like to discuss?"
- "What support do you need from me?"

---

## Notes from Discussion

[Space for notes during the actual review meeting]
"@

    "recommendations.md"                = @"
# Recommendations: $DeveloperName
## Review Period: $StartDate to $EndDate

## Priority 1: Critical Improvements

### Recommendation 1: [Title]
**Current State**: [What's happening now]
**Desired State**: [What should happen]
**Action Steps**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Resources Needed**: [Training, tools, mentoring]
**Timeline**: [When to achieve]
**Success Metrics**: [How to measure]

---

## Priority 2: Important Improvements

### Recommendation 2: [Title]
**Current State**: [What's happening now]
**Desired State**: [What should happen]
**Action Steps**:
1. [Step 1]
2. [Step 2]

**Resources Needed**: [Training, tools, mentoring]
**Timeline**: [When to achieve]
**Success Metrics**: [How to measure]

---

## Priority 3: Nice-to-Have Improvements

### Recommendation 3: [Title]
**Current State**: [What's happening now]
**Desired State**: [What should happen]
**Action Steps**:
1. [Step 1]

**Resources Needed**: [Training, tools, mentoring]
**Timeline**: [When to achieve]
**Success Metrics**: [How to measure]

---

## Training & Development Plan

### Technical Skills
- [Skill to develop]: [How to develop it]

### Process Skills
- [Skill to develop]: [How to develop it]

### Tools & Resources
- [Tool/Resource 1]: [Purpose and how to access]
- [Tool/Resource 2]: [Purpose and how to access]

---

## Systemic Issues Identified

[Issues that are not individual but team/process related]

### Issue 1: [System Issue]
**Impact on Developer**: [How it affects them]
**Recommended Solution**: [Team/process change needed]
**Owner**: [Who should address]

---

## Follow-up Schedule

| Date | Activity | Owner |
|------|----------|-------|
| [Date] | [Check-in on Goal 1] | [Manager/Developer] |
| [Date] | [Training completion] | [Developer] |
| [Date] | [Progress review] | [Both] |
"@
}

foreach ($templateName in $templates.Keys) {
    $templatePath = Join-Path $reportsDir $templateName
    if (-not (Test-Path $templatePath)) {
        Set-Content -Path $templatePath -Value $templates[$templateName]
        Write-Host "   ✓ Created template: $templateName" -ForegroundColor Green
    }
    else {
        Write-Host "   ○ Template exists: $templateName" -ForegroundColor Gray
    }
}

# Step 5: Summary and next steps
Write-Host ""
Write-Host "[5/5] Review setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Review automated reports in:" -ForegroundColor Yellow
Write-Host "   $analysisPath\data\" -ForegroundColor White
Write-Host ""
Write-Host "2. For major PRs, get detailed diffs using:" -ForegroundColor Yellow
Write-Host "   cd $ScriptDir" -ForegroundColor White
Write-Host "   .\Get-PRDiff.ps1 -PRNumber <NUMBER> -OutputPath `"$analysisPath\code_reviews\pr_<NUMBER>.diff`"" -ForegroundColor White
Write-Host ""
Write-Host "3. Document findings in report templates:" -ForegroundColor Yellow
Write-Host "   $analysisPath\reports\" -ForegroundColor White
Write-Host ""
Write-Host "4. CRITICAL: Validate findings with user via ask_human" -ForegroundColor Red
Write-Host ""
Write-Host "5. Open README for full instructions:" -ForegroundColor Yellow
Write-Host "   $readmePath" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Review workspace: $worktreePath" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Pop-Location

# Return the paths for programmatic use
return @{
    WorktreePath    = $worktreePath
    AnalysisPath    = $analysisPath
    DataPath        = Join-Path $analysisPath "data"
    ReportsPath     = Join-Path $analysisPath "reports"
    CodeReviewsPath = Join-Path $analysisPath "code_reviews"
    ReadmePath      = $readmePath
}
