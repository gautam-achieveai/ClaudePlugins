#!/usr/bin/env pwsh
# Requires PowerShell Core (pwsh) 7.0 or later

<#
.SYNOPSIS
    Analyze bug fix patterns and recurring issues

.DESCRIPTION
    Identifies bug-fix commits/PRs, categorizes them, and detects patterns
    that indicate testing gaps or quality issues

.PARAMETER Author
    Developer name or email to analyze

.PARAMETER Since
    Start date for analysis (format: YYYY-MM-DD)

.PARAMETER Until
    End date for analysis (format: YYYY-MM-DD)

.PARAMETER Keywords
    Comma-separated bug keywords (default: "fix,bug,hotfix,bugfix,issue")

.PARAMETER OutputPath
    Path to save analysis report

.PARAMETER Repository
    Path to git repository (defaults to current directory)

.EXAMPLE
    .\Analyze-BugPatterns.ps1 -Author "Saurabh" -Since "2024-07-01" -Until "2025-06-30"

.EXAMPLE
    .\Analyze-BugPatterns.ps1 -Author "john@company.com" -Keywords "fix,bug,crash,error" -OutputPath "bugs.md"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Author,

    [Parameter(Mandatory = $false)]
    [string]$Since = "1 year ago",

    [Parameter(Mandatory = $false)]
    [string]$Until = "now",

    [Parameter(Mandatory = $false)]
    [string]$Keywords = "fix,bug,hotfix,bugfix,issue,crash,error,nre,null",

    [Parameter(Mandatory = $false)]
    [string]$OutputPath,

    [Parameter(Mandatory = $false)]
    [string]$Repository = "."
)

Push-Location $Repository

Write-Host "Analyzing bug patterns for: $Author" -ForegroundColor Cyan
Write-Host "Period: $Since to $Until" -ForegroundColor Cyan
Write-Host ""

$keywordList = $Keywords -split ','

# Get all commits
$commits = git log --all --author="$Author" --since="$Since" --until="$Until" `
    --date=short --pretty=format:"%h|%ad|%s"

# Filter bug-related commits
$bugCommits = @()
foreach ($commit in $commits) {
    $parts = $commit -split '\|'
    $hash = $parts[0]
    $date = $parts[1]
    $message = $parts[2]

    # Check if message contains bug keywords
    $matchedKeywords = $keywordList | Where-Object { $message -match $_ }

    if ($matchedKeywords.Count -gt 0) {
        # Extract PR number if present
        $prNumber = if ($message -match 'Merged PR (\d+)') { $Matches[1] } else { $null }

        $bugCommits += @{
            Hash     = $hash
            Date     = $date
            Message  = $message
            PRNumber = $prNumber
            Keywords = $matchedKeywords
        }
    }
}

Write-Host "Found $($bugCommits.Count) bug-related commits" -ForegroundColor Yellow
Write-Host ""

# Categorize bugs
$categories = @{
    'NullReference'  = @()
    'Serialization'  = @()
    'Configuration'  = @()
    'Authentication' = @()
    'Payment'        = @()
    'Logging'        = @()
    'Test'           = @()
    'General'        = @()
}

foreach ($bug in $bugCommits) {
    $message = $bug.Message.ToLower()

    $categorized = $false

    if ($message -match 'null|nre|nullreference') {
        $categories.NullReference += $bug
        $categorized = $true
    }
    if ($message -match 'serial|deserial') {
        $categories.Serialization += $bug
        $categorized = $true
    }
    if ($message -match 'config|setting|appsettings') {
        $categories.Configuration += $bug
        $categorized = $true
    }
    if ($message -match 'auth|cookie|login|user') {
        $categories.Authentication += $bug
        $categorized = $true
    }
    if ($message -match 'payment|paytm|stripe|billing') {
        $categories.Payment += $bug
        $categorized = $true
    }
    if ($message -match 'log|logging|nlog') {
        $categories.Logging += $bug
        $categorized = $true
    }
    if ($message -match 'test|testing') {
        $categories.Test += $bug
        $categorized = $true
    }

    if (-not $categorized) {
        $categories.General += $bug
    }
}

# Detect hotfixes (commits to release branches)
Write-Host "Checking for hotfixes to release branches..." -ForegroundColor Yellow
$hotfixes = @()

foreach ($bug in $bugCommits) {
    $branches = git branch -a --contains $bug.Hash 2>$null | Where-Object { $_ -match 'origin/release' }
    if ($branches) {
        $hotfixes += $bug
    }
}

# Temporal analysis (bug clustering)
$bugsByMonth = $bugCommits | Group-Object { $_.Date.Substring(0, 7) } | ForEach-Object {
    @{
        Month = $_.Name
        Count = $_.Count
        Bugs  = $_.Group
    }
} | Sort-Object Month

# Generate report
$markdown = @"
# Bug Pattern Analysis

**Developer**: $Author
**Analysis Period**: $Since to $Until
**Bug Keywords**: $Keywords
**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## Executive Summary

- **Total Bug Commits**: $($bugCommits.Count)
- **Hotfixes (to release branches)**: $($hotfixes.Count)
- **Peak Bug Month**: $(($bugsByMonth | Sort-Object Count -Descending | Select-Object -First 1).Month) with $(($bugsByMonth | Sort-Object Count -Descending | Select-Object -First 1).Count) bugs

---

## Bug Categories

"@

foreach ($category in $categories.Keys | Sort-Object) {
    $count = $categories[$category].Count
    if ($count -gt 0) {
        $markdown += @"

### $category ($count bugs)

"@
        foreach ($bug in $categories[$category]) {
            $prText = if ($bug.PRNumber) { "PR $($bug.PRNumber)" } else { "Commit" }
            $markdown += '- **$($bug.Date)** - $prText: $($bug.Message) [`$($bug.Hash)`]`n'
        }
    }
}

$markdown += @"

---

## Hotfixes to Release Branches

$(if ($hotfixes.Count -eq 0) {
    "✅ No hotfixes detected. All bug fixes were merged through normal development flow."
} else {
    "🚩 **$($hotfixes.Count) hotfixes** were pushed directly to release branches, indicating production issues:`n"
    foreach ($hf in $hotfixes) {
        $prText = if ($hf.PRNumber) { "PR $($hf.PRNumber)" } else { "Commit" }
        '`n- **$($hf.Date)** - $prText: $($hf.Message) [`$($hf.Hash)`]'
    }
})

---

## Temporal Distribution

| Month | Bug Count | Trend |
|-------|-----------|-------|
"@

foreach ($month in $bugsByMonth) {
    $bar = "█" * [Math]::Min($month.Count, 20)
    $markdown += "`n| $($month.Month) | $($month.Count) | $bar |"
}

$markdown += @"


---

## Quality Insights

### Red Flags 🚩

"@

# Detect patterns
$nullRefCount = $categories.NullReference.Count
$serializationCount = $categories.Serialization.Count
$authCount = $categories.Authentication.Count

if ($nullRefCount -ge 3) {
    $markdown += "`n- **Recurring NullReference issues** ($nullRefCount bugs): Suggests inadequate defensive programming or null-checking patterns`n"
}

if ($serializationCount -ge 2) {
    $markdown += "`n- **Multiple serialization bugs** ($serializationCount bugs): Indicates integration testing gaps for data persistence`n"
}

if ($authCount -ge 3) {
    $markdown += "`n- **Authentication issues** ($authCount bugs): Critical security area with $authCount bugs suggests incomplete scenario mapping`n"
}

if ($hotfixes.Count -ge 5) {
    $markdown += "`n- **High hotfix count** ($($hotfixes.Count) hotfixes): Indicates quality issues reaching production`n"
}

# Check for bug clustering
$clusteredMonths = $bugsByMonth | Where-Object { $_.Count -ge 5 }
if ($clusteredMonths.Count -gt 0) {
    $markdown += "`n- **Bug clustering**: High bug counts in: $($clusteredMonths.Month -join ', '). Investigate what was released during these periods.`n"
}

$markdown += @"


### Recommendations

Based on the bug patterns identified:

1. **Testing Strategy**:
   $(if ($nullRefCount -ge 2) { "- Implement null-checking analysis tools (e.g., nullable reference types in C#)`n   " })
   $(if ($serializationCount -ge 2) { "- Add integration tests for serialization/deserialization`n   " })
   $(if ($authCount -ge 2) { "- Create comprehensive auth flow test suite`n   " })

2. **Code Review**:
   - Focus on defensive programming practices
   - Verify edge case handling
   - Check for proper error handling

3. **Pre-Production Validation**:
   $(if ($hotfixes.Count -ge 3) { "- Strengthen QA process before production deployment`n   " })
   - Add smoke tests for critical flows
   - Use staging environment for validation

---

## All Bug Fixes

| Date | PR/Commit | Message |
|------|-----------|---------|
"@

foreach ($bug in $bugCommits | Sort-Object Date) {
    $prText = if ($bug.PRNumber) { "PR $($bug.PRNumber)" } else { $bug.Hash }
    $markdown += "`n| $($bug.Date) | $prText | $($bug.Message) |"
}

# Display summary
Write-Host "=== BUG CATEGORIES ===" -ForegroundColor Green
foreach ($category in $categories.Keys | Sort-Object) {
    $count = $categories[$category].Count
    if ($count -gt 0) {
        Write-Host "$category: $count" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== HOTFIXES ===" -ForegroundColor Red
Write-Host "Hotfixes to release branches: $($hotfixes.Count)"

# Save to file if specified
if ($OutputPath) {
    $markdown | Out-File -FilePath $OutputPath -Encoding UTF8
    Write-Host ""
    Write-Host "Report saved to: $OutputPath" -ForegroundColor Green
}

Pop-Location

return @{
    TotalBugs  = $bugCommits.Count
    Categories = $categories
    Hotfixes   = $hotfixes
    ByMonth    = $bugsByMonth
    Markdown   = $markdown
}
