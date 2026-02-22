#!/usr/bin/env pwsh
# Requires PowerShell Core (pwsh) 7.0 or later

<#
.SYNOPSIS
    Detect gaps in developer activity (periods with no commits)

.DESCRIPTION
    Identifies periods where a developer had no visible commits for specified duration.
    Useful for understanding context switching, OnCall duties, vacation, or blockers.

.PARAMETER Author
    Developer name or email to analyze

.PARAMETER Since
    Start date for analysis (format: YYYY-MM-DD)

.PARAMETER Until
    End date for analysis (format: YYYY-MM-DD)

.PARAMETER MinGapDays
    Minimum gap duration in days to report (default: 14)

.PARAMETER OutputPath
    Path to save markdown report (optional)

.PARAMETER Repository
    Path to git repository (defaults to current directory)

.EXAMPLE
    .\Find-ActivityGaps.ps1 -Author "Saurabh Singh" -Since "2024-07-01" -Until "2025-06-30" -MinGapDays 14

.EXAMPLE
    .\Find-ActivityGaps.ps1 -Author "john@company.com" -MinGapDays 7 -OutputPath "gaps.md"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Author,

    [Parameter(Mandatory=$false)]
    [string]$Since = "1 year ago",

    [Parameter(Mandatory=$false)]
    [string]$Until = "now",

    [Parameter(Mandatory=$false)]
    [int]$MinGapDays = 14,

    [Parameter(Mandatory=$false)]
    [string]$OutputPath,

    [Parameter(Mandatory=$false)]
    [string]$Repository = "."
)

Push-Location $Repository

Write-Host "Detecting activity gaps for: $Author" -ForegroundColor Cyan
Write-Host "Period: $Since to $Until" -ForegroundColor Cyan
Write-Host "Minimum gap: $MinGapDays days" -ForegroundColor Cyan
Write-Host ""

# Get all commit dates
$commitDates = git log --all --author="$Author" --since="$Since" --until="$Until" `
    --date=short --pretty=format:"%ad" | Sort-Object -Unique

if ($commitDates.Count -eq 0) {
    Write-Host "No commits found for this author in the specified period." -ForegroundColor Red
    Pop-Location
    return
}

# Convert to DateTime objects
$dates = $commitDates | ForEach-Object { [DateTime]::ParseExact($_, "yyyy-MM-dd", $null) }

# Find gaps
$gaps = @()
for ($i = 0; $i -lt $dates.Count - 1; $i++) {
    $gapDays = ($dates[$i + 1] - $dates[$i]).Days

    if ($gapDays -ge $MinGapDays) {
        $gaps += @{
            StartDate = $dates[$i].ToString("yyyy-MM-dd")
            EndDate = $dates[$i + 1].ToString("yyyy-MM-dd")
            DurationDays = $gapDays
            DurationWeeks = [Math]::Round($gapDays / 7.0, 1)
        }
    }
}

# Display results
Write-Host "=== ACTIVITY GAPS ===" -ForegroundColor Yellow
Write-Host ""

if ($gaps.Count -eq 0) {
    Write-Host "No significant gaps detected (>= $MinGapDays days)" -ForegroundColor Green
}
else {
    Write-Host "Found $($gaps.Count) gap(s):" -ForegroundColor Red
    Write-Host ""

    foreach ($gap in $gaps) {
        Write-Host "Gap: $($gap.StartDate) to $($gap.EndDate)" -ForegroundColor Red
        Write-Host "  Duration: $($gap.DurationDays) days ($($gap.DurationWeeks) weeks)" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Create markdown report
$markdown = @"
# Activity Gap Analysis

**Developer**: $Author
**Analysis Period**: $Since to $Until
**Minimum Gap Threshold**: $MinGapDays days
**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## Summary

- **Total Commits**: $($dates.Count)
- **First Commit**: $($dates[0].ToString("yyyy-MM-dd"))
- **Last Commit**: $($dates[-1].ToString("yyyy-MM-dd"))
- **Gaps Detected**: $($gaps.Count)

---

## Activity Gaps

"@

if ($gaps.Count -eq 0) {
    $markdown += @"

No significant gaps detected. Developer maintained consistent activity throughout the period.

"@
}
else {
    $markdown += @"

The following periods show gaps of $MinGapDays+ days with no visible commits:

| Start Date | End Date | Duration (Days) | Duration (Weeks) |
|------------|----------|-----------------|------------------|
"@

    foreach ($gap in $gaps) {
        $markdown += "`n| $($gap.StartDate) | $($gap.EndDate) | $($gap.DurationDays) | $($gap.DurationWeeks) |"
    }

    $markdown += @"


---

## Questions to Investigate

For each gap, consider asking the developer or manager:

1. **What was the developer working on during this period?**
   - Different repository/project?
   - Non-coding tasks (architecture, planning, meetings)?
   - OnCall rotation or support duties?

2. **Were there any blockers or dependencies?**
   - Waiting for code review?
   - Blocked on another team's work?
   - Infrastructure or tooling issues?

3. **Was this planned downtime?**
   - Vacation or leave?
   - Training or conferences?
   - Company holidays?

4. **For extended gaps (> 1 month):**
   - Was developer assigned to different project?
   - Were there performance concerns?
   - Context switching between priorities?

"@
}

# Visual timeline
$markdown += @"

---

## Visual Timeline

"@

# Group commits by week
$weeklyActivity = $dates | Group-Object { Get-Date $_ -UFormat "%Y-W%V" }
$markdown += "`n``````"
$markdown += "`nWeek    | Commits"
$markdown += "`n--------|" + ("-" * 50)

foreach ($week in $weeklyActivity) {
    $bar = "█" * [Math]::Min($week.Count, 50)
    $markdown += "`n$($week.Name) | $($week.Count) $bar"
}

$markdown += "`n``````"

# Save to file if specified
if ($OutputPath) {
    $markdown | Out-File -FilePath $OutputPath -Encoding UTF8
    Write-Host "Report saved to: $OutputPath" -ForegroundColor Green
}

Pop-Location

return @{
    Gaps = $gaps
    Summary = @{
        TotalCommits = $dates.Count
        FirstCommit = $dates[0].ToString("yyyy-MM-dd")
        LastCommit = $dates[-1].ToString("yyyy-MM-dd")
        GapsDetected = $gaps.Count
    }
    Markdown = $markdown
}
