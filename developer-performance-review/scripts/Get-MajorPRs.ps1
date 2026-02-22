#!/usr/bin/env pwsh
# Requires PowerShell Core (pwsh) 7.0 or later

<#
.SYNOPSIS
    Identify major PRs that require detailed code review

.DESCRIPTION
    Filters PRs by size, complexity, or keywords to identify those requiring
    deep analysis during performance review

.PARAMETER Author
    Developer name or email to analyze

.PARAMETER Since
    Start date for analysis (format: YYYY-MM-DD)

.PARAMETER Until
    End date for analysis (format: YYYY-MM-DD)

.PARAMETER MinLines
    Minimum total line changes (added + deleted) to consider "major" (default: 100)

.PARAMETER Keywords
    Comma-separated keywords in PR title to flag (e.g., "Phase,Migration,Refactor")

.PARAMETER OutputPath
    Path to save report (optional)

.PARAMETER Repository
    Path to git repository (defaults to current directory)

.EXAMPLE
    .\Get-MajorPRs.ps1 -Author "Saurabh" -MinLines 100

.EXAMPLE
    .\Get-MajorPRs.ps1 -Author "john@company.com" -Keywords "Migration,Refactor,Phase" -OutputPath "major_prs.md"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Author,

    [Parameter(Mandatory=$false)]
    [string]$Since = "1 year ago",

    [Parameter(Mandatory=$false)]
    [string]$Until = "now",

    [Parameter(Mandatory=$false)]
    [int]$MinLines = 100,

    [Parameter(Mandatory=$false)]
    [string]$Keywords = "",

    [Parameter(Mandatory=$false)]
    [string]$OutputPath,

    [Parameter(Mandatory=$false)]
    [string]$Repository = "."
)

Push-Location $Repository

Write-Host "Finding major PRs for: $Author" -ForegroundColor Cyan
Write-Host "Criteria: >= $MinLines lines changed" -ForegroundColor Cyan
if ($Keywords) {
    Write-Host "Keywords: $Keywords" -ForegroundColor Cyan
}
Write-Host ""

# Get all commits with stats
$commitData = git log --all --author="$Author" --since="$Since" --until="$Until" `
    --numstat --date=short --pretty=format:"COMMIT|%h|%ad|%s"

# Parse commits and group by PR
$prs = @{}
$currentCommit = $null
$currentLines = @{ Added = 0; Deleted = 0 }

foreach ($line in $commitData) {
    if ($line -match '^COMMIT\|(.+?)\|(.+?)\|(.+)$') {
        $hash = $Matches[1]
        $date = $Matches[2]
        $message = $Matches[3]

        if ($message -match 'Merged PR (\d+):?\s*(.*)') {
            $prNumber = $Matches[1]
            $prTitle = $Matches[2]

            if (-not $prs.ContainsKey($prNumber)) {
                $prs[$prNumber] = @{
                    Number = $prNumber
                    Title = $prTitle
                    Date = $date
                    Hash = $hash
                    LinesAdded = 0
                    LinesDeleted = 0
                    TotalLines = 0
                }
            }

            $currentCommit = $prs[$prNumber]
            $currentLines = @{ Added = 0; Deleted = 0 }
        }
    }
    elseif ($line -match '^(\d+|-)\s+(\d+|-)\s+(.+)$' -and $currentCommit) {
        $added = if ($Matches[1] -eq '-') { 0 } else { [int]$Matches[1] }
        $deleted = if ($Matches[2] -eq '-') { 0 } else { [int]$Matches[2] }

        $currentLines.Added += $added
        $currentLines.Deleted += $deleted
    }
}

# Update totals for last commit
if ($currentCommit) {
    $currentCommit.LinesAdded += $currentLines.Added
    $currentCommit.LinesDeleted += $currentLines.Deleted
    $currentCommit.TotalLines = $currentCommit.LinesAdded + $currentCommit.LinesDeleted
}

# Filter major PRs
$keywordList = if ($Keywords) { $Keywords -split ',' } else { @() }
$majorPRs = $prs.Values | Where-Object {
    $_.TotalLines -ge $MinLines -or
    ($keywordList.Count -gt 0 -and ($keywordList | Where-Object { $_.Title -match $_ }).Count -gt 0)
} | Sort-Object TotalLines -Descending

# Display results
Write-Host "=== MAJOR PRs REQUIRING REVIEW ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Found $($majorPRs.Count) major PR(s):" -ForegroundColor Green
Write-Host ""

$markdown = @"
# Major PRs Requiring Detailed Review

**Developer**: $Author
**Analysis Period**: $Since to $Until
**Criteria**: >= $MinLines lines changed$(if ($Keywords) { " OR keywords: $Keywords" } else { "" })
**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## Summary

Found **$($majorPRs.Count) major PRs** requiring detailed code review:

| PR # | Date | Lines Changed | Title |
|------|------|---------------|-------|
"@

foreach ($pr in $majorPRs) {
    $complexity = if ($pr.TotalLines -ge 500) { "🔴 Very High" }
                  elseif ($pr.TotalLines -ge 200) { "🟠 High" }
                  elseif ($pr.TotalLines -ge 100) { "🟡 Medium" }
                  else { "🟢 Low" }

    Write-Host "PR $($pr.Number): $($pr.Title)" -ForegroundColor Cyan
    Write-Host "  Date: $($pr.Date)" -ForegroundColor Gray
    Write-Host "  Lines: +$($pr.LinesAdded) -$($pr.LinesDeleted) (total: $($pr.TotalLines))" -ForegroundColor Yellow
    Write-Host "  Complexity: $complexity" -ForegroundColor Yellow
    Write-Host "  Hash: $($pr.Hash)" -ForegroundColor Gray
    Write-Host ""

    $markdown += "`n| $($pr.Number) | $($pr.Date) | +$($pr.LinesAdded) -$($pr.LinesDeleted) | $($pr.Title) |"
}

$markdown += @"


---

## Detailed Analysis

"@

foreach ($pr in $majorPRs) {
    $complexity = if ($pr.TotalLines -ge 500) { "🔴 Very High" }
                  elseif ($pr.TotalLines -ge 200) { "🟠 High" }
                  elseif ($pr.TotalLines -ge 100) { "🟡 Medium" }
                  else { "🟢 Low" }

    $markdown += @"

### PR $($pr.Number): $($pr.Title)

**Metadata**:
- **Date**: $($pr.Date)
- **Commit**: \`$($pr.Hash)\`
- **Lines Changed**: +$($pr.LinesAdded) -$($pr.LinesDeleted)
- **Total Lines**: $($pr.TotalLines)
- **Complexity**: $complexity

**Review Checklist**:
- [ ] Review full diff: \`git show $($pr.Hash)\`
- [ ] Examine code quality and design patterns
- [ ] Check for testing adequacy
- [ ] Identify follow-up bug fixes
- [ ] Analyze time-to-value justification
- [ ] Document quality issues found

**Key Questions**:
1. What problem was this PR solving?
2. How was the solution designed?
3. What tests were added/modified?
4. Were there follow-up bug fixes?
5. Did the time invested match the complexity?

**Get the diff**:
\`\`\`powershell
git show $($pr.Hash) > pr_$($pr.Number).diff
\`\`\`

---

"@
}

# Save to file if specified
if ($OutputPath) {
    $markdown | Out-File -FilePath $OutputPath -Encoding UTF8
    Write-Host "Report saved to: $OutputPath" -ForegroundColor Green
}

Pop-Location

return @{
    MajorPRs = $majorPRs
    Count = $majorPRs.Count
    Markdown = $markdown
}
