#!/usr/bin/env pwsh
# Requires PowerShell Core (pwsh) 7.0 or later

<#
.SYNOPSIS
    Find the merge-base commit between the current branch and a base branch for code review.

.DESCRIPTION
    Use this script when reviewing local changes that don't have a PR yet.
    It determines the merge-base (the point where the current branch diverged
    from the base branch), fetches the latest base branch from origin, and
    outputs diff statistics so the reviewer knows what to look at.

    Output includes:
    - Current branch name
    - Base branch name
    - Merge-base commit hash
    - Number of files changed and line stats
    - Ready-to-use git diff commands

.PARAMETER BaseBranch
    The base branch to compare against. If not specified, the script
    auto-detects by checking for dev, main, and master (in that order).

.EXAMPLE
    # Auto-detect base branch
    .\Get-BranchDiffBase.ps1

.EXAMPLE
    # Explicit base branch
    .\Get-BranchDiffBase.ps1 -BaseBranch "dev"

.EXAMPLE
    # Compare against main
    .\Get-BranchDiffBase.ps1 -BaseBranch "main"

.NOTES
    Author: MCQdb Development Team
    Version: 1.0.0

    This script requires:
    - Git installed and available in PATH
    - PowerShell Core (pwsh) 7.0 or higher
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false, HelpMessage = "Base branch to compare against (auto-detects if not specified)")]
    [string]$BaseBranch
)

# Ensure running under PowerShell Core (pwsh), not Windows PowerShell
if ($PSVersionTable.PSEdition -ne 'Core') {
    Write-Host "ERROR: This script requires PowerShell Core (pwsh), not Windows PowerShell" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run with: pwsh $($MyInvocation.MyCommand.Path)" -ForegroundColor Cyan
    exit 1
}

$ErrorActionPreference = "Stop"

# Validate we're in a git repository
$gitRoot = git rev-parse --show-toplevel 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not in a git repository." -ForegroundColor Red
    exit 1
}

# Get current branch
$currentBranch = git rev-parse --abbrev-ref HEAD 2>&1
if ($LASTEXITCODE -ne 0 -or $currentBranch -eq "HEAD") {
    Write-Host "ERROR: Could not determine current branch (detached HEAD?)." -ForegroundColor Red
    exit 1
}

# Auto-detect base branch if not specified
if (-not $BaseBranch) {
    $candidates = @("dev", "main", "master")
    foreach ($candidate in $candidates) {
        $exists = git rev-parse --verify "origin/$candidate" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $BaseBranch = $candidate
            break
        }
    }

    if (-not $BaseBranch) {
        Write-Host "ERROR: Could not auto-detect base branch. None of (dev, main, master) found on origin." -ForegroundColor Red
        Write-Host "Specify one explicitly: .\Get-BranchDiffBase.ps1 -BaseBranch <branch>" -ForegroundColor Yellow
        exit 1
    }
}

# Fetch latest base branch
Write-Host "Fetching origin/$BaseBranch..." -ForegroundColor Cyan
git fetch origin $BaseBranch 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not fetch origin/$BaseBranch. Using local copy." -ForegroundColor Yellow
}

# Compute merge base
$mergeBase = git merge-base HEAD "origin/$BaseBranch" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not find merge-base between HEAD and origin/$BaseBranch." -ForegroundColor Red
    Write-Host "Make sure your branch was created from $BaseBranch." -ForegroundColor Yellow
    exit 1
}

$mergeBaseShort = $mergeBase.Substring(0, [Math]::Min(12, $mergeBase.Length))

# Gather stats
$changedFiles = git diff --name-only "$mergeBase...HEAD"
$filesCount = ($changedFiles | Measure-Object).Count
$stats = git diff --shortstat "$mergeBase...HEAD"

# Categorize files
$codeFiles = $changedFiles | Where-Object { $_ -match '\.(cs|js|ts|tsx|jsx|py|java|go|rs|cpp|c|h)$' }
$testFiles = $changedFiles | Where-Object { $_ -match '[Tt]est' }
$configFiles = $changedFiles | Where-Object { $_ -match '\.(json|yaml|yml|xml|config|ini)$' }

# Commits since merge base
$commitCount = git rev-list --count "$mergeBase..HEAD"

# Output
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Branch Diff Base" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Current Branch: " -NoNewline -ForegroundColor Yellow
Write-Host $currentBranch -ForegroundColor White
Write-Host "Base Branch:    " -NoNewline -ForegroundColor Yellow
Write-Host $BaseBranch -ForegroundColor White
Write-Host "Merge Base:     " -NoNewline -ForegroundColor Yellow
Write-Host "$mergeBase ($mergeBaseShort)" -ForegroundColor White
Write-Host "Commits:        " -NoNewline -ForegroundColor Yellow
Write-Host $commitCount -ForegroundColor White
Write-Host ""
Write-Host "--- Change Summary ---" -ForegroundColor Cyan
Write-Host "Files changed:  $filesCount" -ForegroundColor White
Write-Host "  Code files:   $(($codeFiles | Measure-Object).Count)" -ForegroundColor Gray
Write-Host "  Test files:   $(($testFiles | Measure-Object).Count)" -ForegroundColor Gray
Write-Host "  Config files: $(($configFiles | Measure-Object).Count)" -ForegroundColor Gray
Write-Host "$stats" -ForegroundColor White
Write-Host ""
Write-Host "--- Useful Commands ---" -ForegroundColor Cyan
Write-Host "  # Full diff" -ForegroundColor Gray
Write-Host "  git diff $mergeBaseShort...HEAD" -ForegroundColor White
Write-Host ""
Write-Host "  # Changed file list" -ForegroundColor Gray
Write-Host "  git diff --name-only $mergeBaseShort...HEAD" -ForegroundColor White
Write-Host ""
Write-Host "  # Diff for a specific file" -ForegroundColor Gray
Write-Host "  git diff $mergeBaseShort...HEAD -- <file>" -ForegroundColor White
Write-Host ""
Write-Host "  # Commit log" -ForegroundColor Gray
Write-Host "  git log --oneline $mergeBaseShort..HEAD" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Return structured data for programmatic use
return @{
    CurrentBranch = $currentBranch
    BaseBranch    = $BaseBranch
    MergeBase     = $mergeBase
    MergeBaseShort = $mergeBaseShort
    FilesChanged  = $filesCount
    CommitCount   = [int]$commitCount
    ChangedFiles  = $changedFiles
}
