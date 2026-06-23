param(
    [Parameter(Mandatory = $true)]
    [string]$TaskName,

    [string]$MemoryRoot = "Memory"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Convert-ToSlug {
    param([string]$Value)

    $slug = $Value.Trim().ToLowerInvariant()
    $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-")
    $slug = $slug.Trim("-")

    if ([string]::IsNullOrWhiteSpace($slug)) {
        return "task"
    }

    return $slug
}

$workspaceRoot = (Get-Location).Path
$memoryPath = Join-Path $workspaceRoot $MemoryRoot
$tasksPath = Join-Path $memoryPath "tasks"

New-Item -ItemType Directory -Force -Path $memoryPath | Out-Null
New-Item -ItemType Directory -Force -Path $tasksPath | Out-Null

$slug = Convert-ToSlug $TaskName
$taskPath = Join-Path $tasksPath "$slug.md"
$today = Get-Date -Format "yyyy-MM-dd"

if (-not (Test-Path $taskPath)) {
    $content = @"
# $TaskName

Created: $today

## Goal

- 

## Context Map

| File | Purpose | Notes |
| --- | --- | --- |

## Decisions

- 

## Work Log

- ${today}: Task memory created.

## Verification

- 

## Handoff

- 
"@

    Set-Content -Path $taskPath -Value $content -Encoding utf8
}

Write-Output $taskPath
