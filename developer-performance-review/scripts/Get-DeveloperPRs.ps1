#!/usr/bin/env pwsh
# Requires PowerShell Core (pwsh) 7.0 or later

<#
.SYNOPSIS
    Extract all PRs and commits by a developer with detailed statistics

.DESCRIPTION
    Analyzes git history to extract PRs, commits, line counts, and generate
    comprehensive statistics for developer performance review

.PARAMETER Author
    Developer name or email to analyze

.PARAMETER Since
    Start date for analysis (format: YYYY-MM-DD)

.PARAMETER Until
    End date for analysis (format: YYYY-MM-DD)

.PARAMETER OutputPath
    Path to save JSON output (optional)

.PARAMETER Repository
    Path to git repository (defaults to current directory)

.EXAMPLE
    .\Get-DeveloperPRs.ps1 -Author "Saurabh Singh" -Since "2024-07-01" -Until "2025-06-30"

.EXAMPLE
    .\Get-DeveloperPRs.ps1 -Author "john.doe@company.com" -Since "2024-01-01" -OutputPath "analysis/prs.json"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Author,

    [Parameter(Mandatory=$true)]
    [string]$Since,

    [Parameter(Mandatory=$true)]
    [string]$Until,

    [Parameter(Mandatory=$false)]
    [string]$OutputPath,

    [Parameter(Mandatory=$false)]
    [string]$Repository = "."
)

Push-Location $Repository

Write-Host "Analyzing commits by: $Author" -ForegroundColor Cyan
Write-Host "Period: $Since to $Until" -ForegroundColor Cyan
Write-Host ""

# Get all commits with line stats
Write-Host "Extracting commit data..." -ForegroundColor Yellow
$commitData = git log --all --author="$Author" --since="$Since" --until="$Until" `
    --numstat --date=short --pretty=format:"COMMIT|%h|%ad|%s"

# Parse commit data
$commits = @()
$currentCommit = $null

foreach ($line in $commitData) {
    if ($line -match '^COMMIT\|(.+?)\|(.+?)\|(.+)$') {
        if ($currentCommit) {
            $commits += $currentCommit
        }
        $currentCommit = @{
            Hash = $Matches[1]
            Date = $Matches[2]
            Message = $Matches[3]
            Files = @()
            LinesAdded = 0
            LinesDeleted = 0
        }
    }
    elseif ($line -match '^(\d+|-)\s+(\d+|-)\s+(.+)$') {
        $added = if ($Matches[1] -eq '-') { 0 } else { [int]$Matches[1] }
        $deleted = if ($Matches[2] -eq '-') { 0 } else { [int]$Matches[2] }

        $currentCommit.Files += @{
            Path = $Matches[3]
            Added = $added
            Deleted = $deleted
        }
        $currentCommit.LinesAdded += $added
        $currentCommit.LinesDeleted += $deleted
    }
}

if ($currentCommit) {
    $commits += $currentCommit
}

# Extract PRs
Write-Host "Identifying PRs..." -ForegroundColor Yellow
$prs = @{}
foreach ($commit in $commits) {
    if ($commit.Message -match 'Merged PR (\d+):?\s*(.*)') {
        $prNumber = $Matches[1]
        $prTitle = $Matches[2]

        if (-not $prs.ContainsKey($prNumber)) {
            $prs[$prNumber] = @{
                Number = $prNumber
                Title = $prTitle
                Commits = @()
                FirstDate = $commit.Date
                LastDate = $commit.Date
                TotalLinesAdded = 0
                TotalLinesDeleted = 0
            }
        }

        $prs[$prNumber].Commits += $commit
        $prs[$prNumber].TotalLinesAdded += $commit.LinesAdded
        $prs[$prNumber].TotalLinesDeleted += $commit.LinesDeleted

        if ($commit.Date -lt $prs[$prNumber].FirstDate) {
            $prs[$prNumber].FirstDate = $commit.Date
        }
        if ($commit.Date -gt $prs[$prNumber].LastDate) {
            $prs[$prNumber].LastDate = $commit.Date
        }
    }
}

# Statistics
$totalCommits = $commits.Count
$totalPRs = $prs.Count
$totalLinesAdded = ($commits | Measure-Object -Property LinesAdded -Sum).Sum
$totalLinesDeleted = ($commits | Measure-Object -Property LinesDeleted -Sum).Sum

# Monthly breakdown
$monthlyStats = $commits | Group-Object { $_.Date.Substring(0, 7) } | ForEach-Object {
    @{
        Month = $_.Name
        Commits = $_.Count
        LinesAdded = ($_.Group | Measure-Object -Property LinesAdded -Sum).Sum
        LinesDeleted = ($_.Group | Measure-Object -Property LinesDeleted -Sum).Sum
    }
} | Sort-Object Month

# Display results
Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Green
Write-Host "Total Commits: $totalCommits"
Write-Host "Total PRs: $totalPRs"
Write-Host "Lines Added: $totalLinesAdded"
Write-Host "Lines Deleted: $totalLinesDeleted"
Write-Host "Net Lines: $($totalLinesAdded - $totalLinesDeleted)"
Write-Host ""

Write-Host "=== TOP 10 LARGEST PRs ===" -ForegroundColor Green
$prs.Values | Sort-Object TotalLinesAdded -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "PR $($_.Number): $($_.Title)"
    Write-Host "  +$($_.TotalLinesAdded) -$($_.TotalLinesDeleted) lines, $($_.Commits.Count) commits"
}
Write-Host ""

Write-Host "=== MONTHLY ACTIVITY ===" -ForegroundColor Green
foreach ($month in $monthlyStats) {
    $bar = "=" * [Math]::Min($month.Commits, 50)
    Write-Host "$($month.Month): $($month.Commits) commits $bar"
}
Write-Host ""

# Generate output object
$output = @{
    Author = $Author
    Period = @{
        Since = $Since
        Until = $Until
    }
    Summary = @{
        TotalCommits = $totalCommits
        TotalPRs = $totalPRs
        TotalLinesAdded = $totalLinesAdded
        TotalLinesDeleted = $totalLinesDeleted
        NetLines = $totalLinesAdded - $totalLinesDeleted
    }
    PRs = $prs.Values | Sort-Object Number
    MonthlyStats = $monthlyStats
    AllCommits = $commits | Select-Object Hash, Date, Message, LinesAdded, LinesDeleted
}

# Save to file if specified
if ($OutputPath) {
    $output | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputPath -Encoding UTF8
    Write-Host "Output saved to: $OutputPath" -ForegroundColor Green
}

Pop-Location

return $output
