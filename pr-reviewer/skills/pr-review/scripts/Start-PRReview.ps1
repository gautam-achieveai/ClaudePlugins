#!/usr/bin/env pwsh
# Requires PowerShell Core (pwsh) 7.0 or later

<#
.SYNOPSIS
    Start a comprehensive pull request code review with automated setup.

.DESCRIPTION
    This script automates the PR review workflow:
    - Creates a dedicated git worktree for the PR review
    - Fetches PR metadata and changes
    - Analyzes code statistics
    - Sets up review directory structure with templates
    - Prepares environment for thorough code analysis

    The worktree is created in the 'worktrees' directory which is excluded from git.

.PARAMETER PRNumber
    The pull request number to review

.PARAMETER SourceBranch
    The source branch name for the PR (e.g., "developers/gb/bulkUpload").
    This should be obtained by the LLM using mcp__azure-devops__getPullRequest.

.PARAMETER Repository
    Optional repository name (defaults to current repo). Use for Azure DevOps.

.PARAMETER BaseBranch
    The base branch to compare against (defaults to 'dev')

.PARAMETER PRTitle
    Optional PR title (obtained from MCP by LLM)

.PARAMETER PRAuthor
    Optional PR author (obtained from MCP by LLM)

.PARAMETER PRDescription
    Optional PR description (obtained from MCP by LLM)

.PARAMETER SkipWorktree
    If set, skips worktree creation and uses current directory

.EXAMPLE
    # LLM workflow:
    # 1. LLM calls: mcp__azure-devops__getPullRequest -repository "MCQdbDEV" -pullRequestId 12345
    # 2. LLM extracts sourceRefName, title, author, description
    # 3. LLM calls this script with parameters:

    .\Start-PRReview.ps1 -PRNumber 12345 -SourceBranch "developers/gb/feature_xyz"

.EXAMPLE
    .\Start-PRReview.ps1 `
        -PRNumber 10395 `
        -SourceBranch "developers/gb/bulkUpload" `
        -Repository "MCQdbDEV" `
        -BaseBranch "dev" `
        -PRTitle "Add bulk upload feature" `
        -PRAuthor "Gautam Bhakar"

.NOTES
    Author: MCQdb Development Team
    Version: 1.0.0

    This script requires:
    - Git installed and available in PATH
    - PowerShell 5.1 or higher
    - Azure DevOps MCP tools (for Azure DevOps PRs)
    - GitHub CLI (for GitHub PRs) - optional
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "Pull request number to review")]
    [int]$PRNumber,

    [Parameter(Mandatory = $true, HelpMessage = "Source branch name from PR (e.g., 'developers/gb/feature')")]
    [string]$SourceBranch,

    [Parameter(Mandatory = $false)]
    [string]$Repository = "MCQdbDEV",

    [Parameter(Mandatory = $false)]
    [string]$BaseBranch = "dev",

    [Parameter(Mandatory = $false)]
    [string]$PRTitle = "",

    [Parameter(Mandatory = $false)]
    [string]$PRAuthor = "",

    [Parameter(Mandatory = $false)]
    [string]$PRDescription = "",

    [Parameter(Mandatory = $false)]
    [switch]$SkipWorktree
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

# Script directory
$ScriptDir = $PSScriptRoot

# Repository root (4 levels up: .claude/skills/pr-reviewer/scripts)
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

# Fetch branches before calculating merge base
Write-Host "Fetching branches..." -ForegroundColor Cyan
Push-Location $RepoRoot
try {
    # Fetch base branch
    Write-Host "   Fetching base branch: $BaseBranch" -ForegroundColor Gray
    git fetch origin "${BaseBranch}:${BaseBranch}" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        git fetch origin $BaseBranch 2>&1 | Out-Null
    }

    # Fetch source branch
    Write-Host "   Fetching source branch: $SourceBranch" -ForegroundColor Gray
    git fetch origin "${SourceBranch}:${SourceBranch}" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        git fetch origin $SourceBranch 2>&1 | Out-Null
    }

    Write-Host "   ✓ Branches fetched" -ForegroundColor Green
}
catch {
    Write-Warning "Could not fetch branches: $_"
}
finally {
    Pop-Location
}

$gitMergeBase = git merge-base ("origin/" + $SourceBranch) ("origin/" + $BaseBranch)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Pull Request Code Review Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PR Number:      " -NoNewline -ForegroundColor Yellow
Write-Host "#$PRNumber" -ForegroundColor White
Write-Host "Source Branch:  " -NoNewline -ForegroundColor Yellow
Write-Host $SourceBranch -ForegroundColor White
Write-Host "Base Branch:    " -NoNewline -ForegroundColor Yellow
Write-Host $BaseBranch -ForegroundColor White
Write-Host "Merge Base:     " -NoNewline -ForegroundColor Yellow
Write-Host $gitMergeBase -ForegroundColor White


if ($PRTitle) {
    Write-Host "Title:          " -NoNewline -ForegroundColor Yellow
    Write-Host $PRTitle -ForegroundColor White
}
if ($PRAuthor) {
    Write-Host "Author:         " -NoNewline -ForegroundColor Yellow
    Write-Host $PRAuthor -ForegroundColor White
}
Write-Host ""

# Create directory names
$reviewDirName = "pr-$PRNumber-review"
$worktreePath = Join-Path $RepoRoot "worktrees\$reviewDirName"
$analysisPath = Join-Path $worktreePath "scratchpad\pr_reviews\pr-$PRNumber"

# Step 1: Use provided PR information
Write-Host "[1/6] Using PR metadata from LLM..." -ForegroundColor Green

# Use provided parameters (LLM fetched these via MCP)
$prBranch = $SourceBranch
$prTitle = if ($PRTitle) { $PRTitle } else { "PR #$PRNumber" }
$prAuthor = if ($PRAuthor) { $PRAuthor } else { "Unknown" }
$prDescription = if ($PRDescription) { $PRDescription } else { "Review for PR #$PRNumber" }

Write-Host "   ✓ PR Title: $prTitle" -ForegroundColor Green
Write-Host "   ✓ PR Author: $prAuthor" -ForegroundColor Green
Write-Host "   ✓ Source Branch: $prBranch" -ForegroundColor Green

# Step 2: Create worktree (if not skipped)
if (-not $SkipWorktree) {
    Write-Host ""
    Write-Host "[2/6] Creating git worktree..." -ForegroundColor Green

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
            try {
                # Ensure worktree is on the correct branch
                Write-Host "   Checking out source branch: $prBranch" -ForegroundColor Cyan
                git checkout $prBranch 2>&1 | Out-Null

                # Pull latest changes
                Write-Host "   Pulling latest changes..." -ForegroundColor Cyan
                git pull origin $prBranch 2>&1 | Out-Null

                Write-Host "   ✓ Worktree updated" -ForegroundColor Green
            }
            catch {
                Write-Warning "Could not update worktree: $_"
            }
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

            # Create worktree from the source branch (already fetched earlier)
            git worktree add $worktreePath $prBranch

            if ($LASTEXITCODE -ne 0) {
                throw "Failed to create git worktree for branch: $prBranch"
            }

            Write-Host "   ✓ Worktree created successfully" -ForegroundColor Green
            Push-Location $worktreePath
        }
        catch {
            Pop-Location
            throw
        }
    }
}
else {
    Write-Host ""
    Write-Host "[2/6] Skipping worktree creation (using current directory)..." -ForegroundColor Yellow
    $worktreePath = Get-Location
    $analysisPath = Join-Path $worktreePath "scratchpad\pr_reviews\pr-$PRNumber"
}

# Step 3: Analyze PR changes
Write-Host ""
Write-Host "[3/6] Analyzing PR changes..." -ForegroundColor Green

Push-Location $worktreePath

try {
    # Get changed files
    $changedFiles = git diff --name-only "$gitMergeBase...HEAD"
    $filesCount = ($changedFiles | Measure-Object).Count

    # Get line changes
    $stats = git diff --shortstat "$gitMergeBase...HEAD"

    Write-Host "   Files changed: $filesCount" -ForegroundColor Cyan
    Write-Host "   $stats" -ForegroundColor Cyan

    # Categorize files
    $codeFiles = $changedFiles | Where-Object { $_ -match '\.(cs|js|ts|tsx|jsx|py|java|go|rs|cpp|c|h)$' }
    $testFiles = $changedFiles | Where-Object { $_ -match '[Tt]est' }
    $configFiles = $changedFiles | Where-Object { $_ -match '\.(json|yaml|yml|xml|config|ini)$' }
    $docFiles = $changedFiles | Where-Object { $_ -match '\.(md|txt|rst)$' }

    Write-Host "   Code files: $(($codeFiles | Measure-Object).Count)" -ForegroundColor Cyan
    Write-Host "   Test files: $(($testFiles | Measure-Object).Count)" -ForegroundColor Cyan
    Write-Host "   Config files: $(($configFiles | Measure-Object).Count)" -ForegroundColor Cyan
    Write-Host "   Doc files: $(($docFiles | Measure-Object).Count)" -ForegroundColor Cyan

}
catch {
    Write-Warning "Could not analyze changes: $_"
}

Pop-Location

# Step 4: Create directory structure
Write-Host ""
Write-Host "[4/6] Setting up review directory structure..." -ForegroundColor Green

$directories = @(
    $analysisPath,
    (Join-Path $analysisPath "diffs"),
    (Join-Path $analysisPath "analysis"),
    (Join-Path $analysisPath "feedback")
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

# Step 5: Save PR diff
Write-Host ""
Write-Host "[5/6] Saving PR diff..." -ForegroundColor Green

Push-Location $worktreePath

try {
    $diffPath = Join-Path $analysisPath "diffs\full_diff.patch"
    git diff "$gitMergeBase...HEAD" > $diffPath
    Write-Host "   ✓ Diff saved to: $diffPath" -ForegroundColor Green

    # Save file list
    $filesPath = Join-Path $analysisPath "diffs\changed_files.txt"
    git diff --name-only "$gitMergeBase...HEAD" > $filesPath
    Write-Host "   ✓ File list saved to: $filesPath" -ForegroundColor Green

}
catch {
    Write-Warning "Could not save diff: $_"
}

Pop-Location

# Step 6: Create review templates
Write-Host ""
Write-Host "[6/6] Creating review templates..." -ForegroundColor Green

$analysisDir = Join-Path $analysisPath "analysis"
$feedbackDir = Join-Path $analysisPath "feedback"

# README template
$readmeContent = @"
# PR Review: #$PRNumber - $prTitle

## PR Information

- **PR Number**: #$PRNumber
- **Author**: $prAuthor
- **Base Branch**: $BaseBranch
- **Status**: Under Review
- **Files Changed**: $filesCount
- **Review Started**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Description

$prDescription

## Review Structure

### Diffs (../diffs/)
- **full_diff.patch**: Complete diff of all changes
- **changed_files.txt**: List of all modified files

### Analysis (../analysis/)
- **code_quality_analysis.md**: Design, maintainability, code smells
- **security_concerns.md**: Security vulnerabilities (OWASP Top 10)
- **performance_review.md**: Performance implications and bottlenecks
- **testing_assessment.md**: Test coverage and quality

### Feedback (../feedback/)
- **pr_feedback.md**: Consolidated review feedback for the PR author
- **recommendations.md**: Specific, actionable improvements

## Review Workflow

1. ✅ **Setup Complete** - Worktree and structure created
2. ⏳ **Code Analysis** - Review each changed file
3. ⏳ **Security Check** - Check for OWASP Top 10 issues
4. ⏳ **Performance Review** - Identify bottlenecks
5. ⏳ **Testing Assessment** - Evaluate test coverage
6. ⏳ **Documentation** - Fill in analysis templates
7. ⏳ **Provide Feedback** - Create consolidated feedback

## Quick Commands

### View specific file diff:
\`\`\`bash
git diff $gitMergeBase...HEAD -- path/to/file.cs
\`\`\`

### View commit history for PR:
\`\`\`bash
git log $gitMergeBase..HEAD --oneline
\`\`\`

### Check file at specific commit:
\`\`\`bash
git show <commit>:path/to/file.cs
\`\`\`

## Review Checklist

- [ ] All changed files examined
- [ ] Security vulnerabilities checked (OWASP Top 10)
- [ ] Performance implications assessed
- [ ] Error handling verified
- [ ] Testing adequacy reviewed
- [ ] Backwards compatibility checked
- [ ] Design patterns validated
- [ ] Documentation updated
- [ ] Code smells identified
- [ ] Specific, actionable feedback provided
- [ ] File:line references included
- [ ] Positive feedback balanced with concerns

## Cleanup

When review is complete:
\`\`\`powershell
cd $RepoRoot
git worktree remove $worktreePath
\`\`\`

## Worktree Location

**Path**: $worktreePath
"@

$readmePath = Join-Path $analysisPath "README.md"
Set-Content -Path $readmePath -Value $readmeContent
Write-Host "   ✓ Created: README.md" -ForegroundColor Green

# Analysis templates
$templates = @{
    "code_quality_analysis.md" = @"
# Code Quality Analysis: PR #$PRNumber

## Summary

**Overall Code Quality**: [Excellent / Good / Needs Improvement / Poor]
**Files Reviewed**: $filesCount
**Major Concerns**: [Number]
**Minor Concerns**: [Number]

## Design & Architecture

### Positive Patterns
- [List good design decisions with file:line references]

### Concerns

#### [Concern Title]
**Location**: \`path/to/file.cs:123\`
**Severity**: [Critical / High / Medium / Low]
**Issue**: [Description]
\`\`\`csharp
// Current code
\`\`\`
**Recommendation**: [How to improve]
\`\`\`csharp
// Suggested code
\`\`\`

---

## Code Maintainability

### Readability
- [Assessment of naming, structure, comments]

### Complexity
- [Cyclomatic complexity concerns]
- [Long methods/classes]

### Duplication
- [Code duplication issues]

## Error Handling

### Issues Found
- [Missing null checks with locations]
- [Improper exception handling]
- [Edge cases not covered]

## Code Smells

### [Smell Name]
**Location**: \`path/to/file.cs:45-67\`
**Description**: [What's the smell]
**Impact**: [Why it matters]
**Recommendation**: [How to refactor]

---

## Naming Conventions

- [Any naming issues]

## Overall Assessment

[Summary paragraph of code quality]
"@

    "security_concerns.md"     = @"
# Security Analysis: PR #$PRNumber

## Summary

**Security Risk Level**: [None / Low / Medium / High / Critical]
**Vulnerabilities Found**: [Number]
**OWASP Issues**: [Number]

## OWASP Top 10 Check

### 1. Broken Access Control
- [X] No issues found
- [ ] Issues found (see below)

**Details**: [If issues found, describe with file:line]

### 2. Cryptographic Failures
- [X] No issues found
- [ ] Issues found (see below)

**Details**: [Any hardcoded secrets, weak encryption, etc.]

### 3. Injection
- [X] No SQL injection
- [X] No XSS
- [X] No command injection
- [ ] Issues found (see below)

**Details**: [Any injection vulnerabilities]

### 4. Insecure Design
- [X] No issues found
- [ ] Issues found (see below)

**Details**: [Design-level security issues]

### 5. Security Misconfiguration
- [X] No issues found
- [ ] Issues found (see below)

**Details**: [Configuration security issues]

### 6. Vulnerable Components
- [X] No vulnerable dependencies
- [ ] Vulnerable dependencies found

**Dependencies Added/Updated**:
- [List with security status]

### 7. Authentication Failures
- [X] No issues found
- [ ] Issues found (see below)

**Details**: [Authentication/session issues]

### 8. Data Integrity Failures
- [X] No issues found
- [ ] Issues found (see below)

**Details**: [Data integrity concerns]

### 9. Logging Failures
- [X] Adequate logging
- [ ] Logging issues found

**Details**: [Logging gaps or security issues]

### 10. Server-Side Request Forgery
- [X] No SSRF risks
- [ ] SSRF risks found

**Details**: [SSRF concerns]

## Critical Security Issues

### [Issue Title]
**Location**: \`path/to/file.cs:123\`
**OWASP Category**: [Category]
**Severity**: Critical
**Description**: [What's vulnerable]
\`\`\`csharp
// Vulnerable code
\`\`\`
**Attack Scenario**: [How it could be exploited]
**Fix**: [How to secure]
\`\`\`csharp
// Secure code
\`\`\`

---

## Recommendations

1. [Security recommendation 1]
2. [Security recommendation 2]

## Overall Security Assessment

[Summary of security posture]
"@

    "performance_review.md"    = @"
# Performance Analysis: PR #$PRNumber

## Summary

**Performance Impact**: [Positive / Neutral / Negative]
**Critical Issues**: [Number]
**Optimization Opportunities**: [Number]

## Database Performance

### N+1 Query Issues
- [X] No N+1 issues found
- [ ] N+1 issues found (see below)

**Details**:
**Location**: \`path/to/file.cs:123\`
\`\`\`csharp
// Current code causing N+1
\`\`\`
**Recommendation**:
\`\`\`csharp
// Use eager loading
\`\`\`

### Missing Indexes
- [Any queries that might benefit from indexes]

### Query Efficiency
- [Large result sets without pagination]
- [Unnecessary data fetching]

## Memory Management

### Potential Leaks
- [IDisposable not disposed]
- [Event subscriptions not removed]

### Large Allocations
- [Large collections in memory]
- [String operations in loops]

## Algorithm Efficiency

### Time Complexity Issues

**Location**: \`path/to/file.cs:45-67\`
**Current Complexity**: O(n²)
**Issue**: [Description]
\`\`\`csharp
// Current O(n²) code
\`\`\`
**Improved Complexity**: O(n)
\`\`\`csharp
// Optimized O(n) code
\`\`\`

### Unnecessary Iterations
- [Multiple passes over same data]

## Network Performance

- [Multiple sequential API calls]
- [Large payloads]
- [Missing caching]

## Recommendations

### High Priority
1. [Critical performance fix]

### Medium Priority
1. [Important optimization]

### Low Priority
1. [Nice-to-have improvement]

## Overall Performance Assessment

[Summary of performance impact]
"@

    "testing_assessment.md"    = @"
# Testing Assessment: PR #$PRNumber

## Summary

**Test Coverage**: [Excellent / Good / Adequate / Insufficient / None]
**New Tests Added**: [Number]
**Test Quality**: [High / Medium / Low]
**Critical Gaps**: [Number]

## Test Coverage Analysis

### New Features Tested
- [X] Feature 1 has tests
- [ ] Feature 2 missing tests

### Edge Cases Tested
- [X] Null inputs
- [X] Empty collections
- [ ] Boundary conditions (missing)

### Error Paths Tested
- [X] Exception handling
- [ ] Validation errors (missing)

## Test Quality

### Well-Written Tests
- [Examples of good tests]

### Test Issues

**Test**: [Test name]
**Location**: \`path/to/test.cs:123\`
**Issue**: [Flaky / Brittle / Testing implementation / etc.]
**Recommendation**: [How to improve]

## Missing Test Coverage

### Critical Scenarios Not Tested

1. **Scenario**: [Description]
   **Why Critical**: [Business impact]
   **Suggested Test**:
   \`\`\`csharp
   [TestMethod]
   public void TestScenario()
   {
       // Suggested test code
   }
   \`\`\`

## Integration Tests

- [X] Critical flows have integration tests
- [ ] Integration tests missing for:
  - [Flow 1]
  - [Flow 2]

## Recommendations

### Must Add
1. [Critical test gap to fill]

### Should Add
1. [Important test to add]

### Nice to Have
1. [Optional test]

## Overall Testing Assessment

[Summary of testing adequacy]
"@

    "pr_feedback.md"           = @"
# PR Review Feedback: PR #$PRNumber

## Summary

- **Overall Assessment**: [Approve / Request Changes / Comment]
- **Files Changed**: $filesCount
- **Risk Level**: [Low / Medium / High]

## What Was Done Well ✨

1. [Specific positive with file:line reference]
2. [Another positive aspect]
3. [Good practice observed]

## Critical Issues (Must Fix Before Merge) 🚨

### Issue 1: [Title]
**Location**: \`path/to/file.cs:123\`
**Severity**: Critical
**Category**: [Bug / Security / Performance / Design]

**Problem**:
[Clear description of the issue]

**Current Code**:
\`\`\`csharp
// Problematic code
\`\`\`

**Why This Matters**:
[Business/technical impact]

**Recommended Fix**:
\`\`\`csharp
// Suggested solution
\`\`\`

---

## Important Issues (Should Fix) ⚠️

[Non-blocking but important concerns]

## Suggestions (Nice to Have) 💡

[Optional improvements]

## Testing Feedback 🧪

**Coverage**: [Assessment]

**Missing Tests**:
1. [Test scenario]
2. [Another scenario]

## Security Review 🔒

[Security assessment - reference security_concerns.md]

## Performance Considerations ⚡

[Performance impact - reference performance_review.md]

## Documentation 📚

- [ ] Code comments adequate
- [ ] README updated
- [ ] API documentation updated
- [ ] Breaking changes documented

## Questions for Author ❓

1. [Clarification question]
2. [Design decision question]

## Next Steps

- [ ] Author addresses critical issues
- [ ] Author responds to questions
- [ ] Additional review after changes
- [ ] Approval

## Approval Decision

**Status**: [Approve / Request Changes / Comment Only]

**Reasoning**:
[Why this decision]

---

**Reviewed By**: [Your name]
**Review Date**: $(Get-Date -Format 'yyyy-MM-dd')
"@

    "recommendations.md"       = @"
# Recommendations: PR #$PRNumber

## Immediate Actions (Before Merge)

### 1. [Action Title]
**Priority**: Critical
**Effort**: [Low / Medium / High]
**File**: \`path/to/file.cs:123\`

**Current State**:
[What needs fixing]

**Desired State**:
[What it should be]

**Steps**:
1. [Step 1]
2. [Step 2]

**Code**:
\`\`\`csharp
// Recommended implementation
\`\`\`

---

## Short-Term Improvements (This Sprint)

[Medium priority items]

## Long-Term Considerations

[Technical debt, refactoring opportunities]

## Learning Opportunities

[Areas for author to explore/learn]
- [Topic 1]: [Why important]
- [Topic 2]: [Resources]

## Positive Patterns to Continue

[Good practices to replicate]

## Summary

[Overall recommendations summary]
"@
}

foreach ($templateName in $templates.Keys) {
    $templatePath = Join-Path $analysisDir $templateName
    if (-not (Test-Path $templatePath)) {
        Set-Content -Path $templatePath -Value $templates[$templateName]
        Write-Host "   ✓ Created: $templateName" -ForegroundColor Green
    }
    else {
        Write-Host "   ○ Template exists: $templateName" -ForegroundColor Gray
    }
}

# Create consolidated feedback template
$feedbackTemplate = Join-Path $feedbackDir "pr_feedback.md"
if (-not (Test-Path $feedbackTemplate)) {
    Set-Content -Path $feedbackTemplate -Value $templates["pr_feedback.md"]
    Write-Host "   ✓ Created: pr_feedback.md in feedback/" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PR Review Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Review README at:" -ForegroundColor White
Write-Host "   $readmePath" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Examine diff at:" -ForegroundColor White
Write-Host "   $(Join-Path $analysisPath 'diffs\full_diff.patch')" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Fill in analysis templates in:" -ForegroundColor White
Write-Host "   $analysisDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Create consolidated feedback in:" -ForegroundColor White
Write-Host "   $feedbackDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Worktree: $worktreePath" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Pop-Location

# Return paths for programmatic use
return @{
    WorktreePath = $worktreePath
    AnalysisPath = $analysisPath
    DiffsPath    = Join-Path $analysisPath "diffs"
    AnalysisDir  = Join-Path $analysisPath "analysis"
    FeedbackDir  = Join-Path $analysisPath "feedback"
    ReadmePath   = $readmePath
}