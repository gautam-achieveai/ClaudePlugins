#!/usr/bin/env pwsh
# Requires PowerShell Core (pwsh) 7.0 or later

<#
.SYNOPSIS
    Extract complete diff for a specific PR

.DESCRIPTION
    Retrieves the full code diff for a PR by its number or commit hash.
    Useful for detailed code quality analysis during performance review.

.PARAMETER PRNumber
    PR number to analyze (will search commit messages for "Merged PR {number}")

.PARAMETER CommitHash
    Specific commit hash (alternative to PRNumber)

.PARAMETER OutputPath
    Path to save the diff file

.PARAMETER Repository
    Path to git repository (defaults to current directory)

.PARAMETER IncludeStats
    Include file statistics (lines changed per file) at the top

.EXAMPLE
    .\Get-PRDiff.ps1 -PRNumber 9192 -OutputPath "pr_9192.diff"

.EXAMPLE
    .\Get-PRDiff.ps1 -CommitHash "4278da2e67" -OutputPath "phase2.diff" -IncludeStats
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$PRNumber,

    [Parameter(Mandatory=$false)]
    [string]$CommitHash,

    [Parameter(Mandatory=$true)]
    [string]$OutputPath,

    [Parameter(Mandatory=$false)]
    [string]$Repository = ".",

    [Parameter(Mandatory=$false)]
    [switch]$IncludeStats
)

if (-not $PRNumber -and -not $CommitHash) {
    Write-Error "Must specify either -PRNumber or -CommitHash"
    exit 1
}

Push-Location $Repository

# Find commit hash if PR number specified
if ($PRNumber) {
    Write-Host "Finding commit for PR $PRNumber..." -ForegroundColor Cyan

    $commits = git log --all --oneline --grep="Merged PR $PRNumber" | Select-Object -First 1

    if (-not $commits) {
        Write-Error "PR $PRNumber not found"
        Pop-Location
        exit 1
    }

    $CommitHash = ($commits -split ' ')[0]
    Write-Host "Found commit: $CommitHash" -ForegroundColor Green
}

# Get PR details
Write-Host "Extracting diff for commit $CommitHash..." -ForegroundColor Cyan

$commitInfo = git show --stat --oneline $CommitHash | Select-Object -First 10
$prTitle = ($commitInfo | Select-Object -First 1) -replace "$CommitHash ", ""

Write-Host "PR: $prTitle" -ForegroundColor Yellow
Write-Host ""

# Get statistics
if ($IncludeStats) {
    Write-Host "File Statistics:" -ForegroundColor Yellow
    $stats = git show --stat $CommitHash
    $stats | Write-Host
    Write-Host ""
}

# Get full diff
Write-Host "Generating diff..." -ForegroundColor Yellow
$diff = git show $CommitHash

# Create comprehensive output
$output = @"
================================================================================
COMMIT: $CommitHash
PR: $prTitle
DATE: $(git show -s --format=%ai $CommitHash)
AUTHOR: $(git show -s --format="%an <%ae>" $CommitHash)
================================================================================

"@

if ($IncludeStats) {
    $output += @"
FILE STATISTICS:
--------------------------------------------------------------------------------
$(git show --stat $CommitHash)

================================================================================

"@
}

$output += @"
FULL DIFF:
--------------------------------------------------------------------------------

$diff

================================================================================
"@

# Save to file
$output | Out-File -FilePath $OutputPath -Encoding UTF8
Write-Host "Diff saved to: $OutputPath" -ForegroundColor Green

# Summary
$fileCount = (git show --name-only --format="" $CommitHash | Measure-Object -Line).Lines
$additions = git show --numstat --format="" $CommitHash | ForEach-Object {
    if ($_ -match '^(\d+)') { [int]$Matches[1] } else { 0 }
} | Measure-Object -Sum | Select-Object -ExpandProperty Sum

$deletions = git show --numstat --format="" $CommitHash | ForEach-Object {
    if ($_ -match '^\d+\s+(\d+)') { [int]$Matches[1] } else { 0 }
} | Measure-Object -Sum | Select-Object -ExpandProperty Sum

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Green
Write-Host "Files changed: $fileCount"
Write-Host "Lines added: $additions"
Write-Host "Lines deleted: $deletions"
Write-Host "Net change: $($additions - $deletions)"

Pop-Location

return @{
    CommitHash = $CommitHash
    PRTitle = $prTitle
    FilesChanged = $fileCount
    LinesAdded = $additions
    LinesDeleted = $deletions
    DiffPath = $OutputPath
}
