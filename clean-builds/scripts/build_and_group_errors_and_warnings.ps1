#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Builds the solution and groups errors and warnings by code and message.

.DESCRIPTION
    This script performs a clean build of the solution and captures all errors and warnings.
    It then groups them by error/warning code and message, providing a summary of all violations.

.PARAMETER SolutionPath
    Path to the solution file. When omitted, the script discovers a *.sln under the current directory.

.PARAMETER OutputFormat
    Output format: 'Console' (default), 'Json', or 'Csv'

.PARAMETER SaveToFile
    Optional file path to save the grouped results
#>

param(
    [string]$SolutionPath,
    [ValidateSet("Console", "Json", "Csv")]
    [string]$OutputFormat = "Console",
    [string]$SaveToFile = ""
)

function Get-NormalizedPath {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return ""
    }

    return [System.IO.Path]::GetFullPath($Path).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
}

function Get-DirectoryDepth {
    param([string]$Path)

    $normalized = Get-NormalizedPath -Path $Path
    if (-not $normalized) {
        return 0
    }

    return $normalized.Split(@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar), [System.StringSplitOptions]::RemoveEmptyEntries).Count
}

function Test-IsSameOrAncestorPath {
    param(
        [string]$Ancestor,
        [string]$Descendant
    )

    $normalizedAncestor = Get-NormalizedPath -Path $Ancestor
    $normalizedDescendant = Get-NormalizedPath -Path $Descendant

    if ($normalizedAncestor -eq "" -or $normalizedDescendant -eq "") {
        return $false
    }

    if ($normalizedDescendant.Equals($normalizedAncestor, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $true
    }

    $ancestorWithSeparator = $normalizedAncestor + [System.IO.Path]::DirectorySeparatorChar
    return $normalizedDescendant.StartsWith($ancestorWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)
}

$currentWorkingDirectory = (Get-Location).Path

if ([string]::IsNullOrWhiteSpace($SolutionPath)) {
    $solutionFiles = @(Get-ChildItem -Path $currentWorkingDirectory -Filter *.sln -Recurse -File -ErrorAction SilentlyContinue)

    if ($solutionFiles.Count -eq 0) {
        throw "No solution (*.sln) files were found under '$currentWorkingDirectory'. Specify -SolutionPath explicitly."
    }

    if ($solutionFiles.Count -eq 1) {
        $SolutionPath = $solutionFiles[0].FullName
    }
    else {
        $candidates = $solutionFiles | ForEach-Object {
            $directory = Split-Path -Parent $_.FullName
            [PSCustomObject]@{
                FullName  = $_.FullName
                Directory = $directory
                Depth     = Get-DirectoryDepth -Path $directory
            }
        } | Sort-Object Depth, FullName

        $selectedCandidate = $null

        foreach ($candidate in $candidates) {
            $isAncestor = $true
            foreach ($other in $candidates) {
                if ($other.FullName -eq $candidate.FullName) {
                    continue
                }

                if (-not (Test-IsSameOrAncestorPath -Ancestor $candidate.Directory -Descendant $other.Directory)) {
                    $isAncestor = $false
                    break
                }
            }

            if ($isAncestor) {
                $selectedCandidate = $candidate
                break
            }
        }

        if ($null -eq $selectedCandidate) {
            $paths = $candidates | ForEach-Object { " - $($_.FullName)" }
            $details = [string]::Join([Environment]::NewLine, $paths)
            throw "Multiple solution (*.sln) files were found in different directory trees:$([Environment]::NewLine)$details$([Environment]::NewLine)Please rerun the script with -SolutionPath set to the desired solution."
        }

        $SolutionPath = $selectedCandidate.FullName
    }
}
elseif (Test-Path -LiteralPath $SolutionPath) {
    $SolutionPath = (Resolve-Path -LiteralPath $SolutionPath).Path
}

# Determine project root based on solution path
if ([System.IO.Path]::IsPathRooted($SolutionPath)) {
    # If absolute path provided, use its directory
    $projectRoot = Split-Path -Parent $SolutionPath
    Set-Location $projectRoot
}
elseif (Test-Path $SolutionPath) {
    # If relative path exists from current location, use current directory
    $projectRoot = (Get-Location).Path
}
else {
    # Fall back to calculating from script directory
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    # Script is in .claude\skills\clean-builds\scripts, need to go up 4 levels
    $projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $scriptDir)))
    Set-Location $projectRoot
}

# Colors for console output
$ErrorColor = "Red"
$WarningColor = "Yellow"
$InfoColor = "Cyan"
$SuccessColor = "Green"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Parse-BuildOutput {
    param([string[]]$BuildOutput)

    $issues = @()

    foreach ($line in $BuildOutput) {
        # Match error pattern: file(line,column): error CODE: message [project]
        if ($line -match "^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+([A-Z]+\d+):\s+(.+?)(?:\s+\[(.+?)\])?$") {
            $filePath = $matches[1]
            $lineNum = [int]$matches[2]
            $column = [int]$matches[3]
            $issueType = $matches[4]
            $code = $matches[5]
            $message = $matches[6].Trim()
            $project = if ($matches[7]) { $matches[7] } else { "" }

            # Extract URL from message if present
            $url = ""
            $messageText = $message
            if ($message -match "^(.+?)\s*\((https?://[^\)]+)\)\s*$") {
                $messageText = $matches[1].Trim()
                $url = $matches[2]
            }

            $issues += [PSCustomObject]@{
                File     = $filePath
                Line     = $lineNum
                Column   = $column
                Type     = $issueType
                Code     = $code
                Message  = $messageText
                Url      = $url
                Project  = $project
                FullLine = $line
            }
        }
        # Alternative pattern without column
        elseif ($line -match "^(.+?)\((\d+)\):\s+(error|warning)\s+([A-Z]+\d+):\s+(.+?)(?:\s+\[(.+?)\])?$") {
            $filePath = $matches[1]
            $lineNum = [int]$matches[2]
            $issueType = $matches[3]
            $code = $matches[4]
            $message = $matches[5].Trim()
            $project = if ($matches[6]) { $matches[6] } else { "" }

            # Extract URL from message if present
            $url = ""
            $messageText = $message
            if ($message -match "^(.+?)\s*\((https?://[^\)]+)\)\s*$") {
                $messageText = $matches[1].Trim()
                $url = $matches[2]
            }

            $issues += [PSCustomObject]@{
                File     = $filePath
                Line     = $lineNum
                Column   = 0
                Type     = $issueType
                Code     = $code
                Message  = $messageText
                Url      = $url
                Project  = $project
                FullLine = $line
            }
        }
        # Pattern for general errors/warnings
        elseif ($line -match "^.+:\s+(error|warning)\s+([A-Z]+\d+):\s+(.+?)(?:\s+\[(.+?)\])?$") {
            $issueType = $matches[1]
            $code = $matches[2]
            $message = $matches[3].Trim()
            $project = if ($matches[4]) { $matches[4] } else { "" }

            # Extract URL from message if present
            $url = ""
            $messageText = $message
            if ($message -match "^(.+?)\s*\((https?://[^\)]+)\)\s*$") {
                $messageText = $matches[1].Trim()
                $url = $matches[2]
            }

            $issues += [PSCustomObject]@{
                File     = "Unknown"
                Line     = 0
                Column   = 0
                Type     = $issueType
                Code     = $code
                Message  = $messageText
                Url      = $url
                Project  = $project
                FullLine = $line
            }
        }
    }

    return $issues
}

function Group-Issues {
    param([object[]]$Issues)

    # First deduplicate issues that are exactly the same
    $uniqueIssues = $Issues | Sort-Object File, Line, Column, Type, Code, Message -Unique

    # Group by Type and Code only (not Message)
    $grouped = $uniqueIssues | Group-Object Type, Code | ForEach-Object {
        # Get the most common message and URL for this code
        $messageGroup = $_.Group | Group-Object Message, Url | Sort-Object Count -Descending | Select-Object -First 1

        # Get all unique file/line combinations
        $allFiles = $_.Group | ForEach-Object {
            [PSCustomObject]@{
                File = $_.File
                Line = $_.Line
            }
        }
        $uniqueFiles = @($allFiles | Sort-Object File, Line -Unique)

        [PSCustomObject]@{
            Type       = $_.Group[0].Type
            Code       = $_.Group[0].Code
            Message    = $messageGroup.Group[0].Message
            Url        = $messageGroup.Group[0].Url
            Count      = $_.Count
            Files      = $uniqueFiles
            Violations = $_.Group
        }
    }

    return $grouped | Sort-Object Type, Code
}

function Format-ConsoleOutput {
    param([object[]]$GroupedIssues)

    $errorGroups = $GroupedIssues | Where-Object { $_.Type -eq "error" }
    $warningGroups = $GroupedIssues | Where-Object { $_.Type -eq "warning" }

    Write-ColorOutput ("-" * 3) $InfoColor
    Write-ColorOutput "BUILD ISSUES SUMMARY" $InfoColor
    Write-ColorOutput ("-" * 3) $InfoColor

    $totalErrors = ($errorGroups | Measure-Object Count -Sum).Sum
    $totalWarnings = ($warningGroups | Measure-Object Count -Sum).Sum

    # Show what's being displayed with breakdown
    if ($totalErrors -gt 0) {
        $errorBreakdown = ($errorGroups | Sort-Object Count -Descending | ForEach-Object { "$($_.Code)($($_.Count))" }) -join ', '
        Write-ColorOutput "Total Errors: $totalErrors - $errorBreakdown" $ErrorColor
    }

    if ($totalWarnings -gt 0) {
        $warningBreakdown = ($warningGroups | Sort-Object Count -Descending | ForEach-Object { "$($_.Code)($($_.Count))" }) -join ', '
        Write-ColorOutput "Total Warnings: $totalWarnings - $warningBreakdown" $WarningColor
    }

    # Additional context about what's shown
    if ($totalErrors -gt 0 -and $totalWarnings -eq 0) {
        Write-ColorOutput "(showing errors below)" $InfoColor
    }
    elseif ($totalErrors -eq 0 -and $totalWarnings -gt 0) {
        Write-ColorOutput "(showing warnings below)" $InfoColor
    }

    # Only show errors if they exist
    if ($errorGroups.Count -gt 0) {
        Write-ColorOutput ("-" * 3) $ErrorColor
        Write-ColorOutput "ERRORS BY CODE" $ErrorColor
        Write-ColorOutput ("-" * 3) $ErrorColor

        foreach ($group in $errorGroups) {
            # Format: CODE (Count): Message + URL
            $header = "$($group.Code) ($($group.Count)): $($group.Message)"
            if ($group.Url) {
                $header += " ($($group.Url))"
            }
            Write-ColorOutput $header $ErrorColor

            # Group files and their line numbers
            $fileGroups = $group.Files | Group-Object File | Sort-Object Name
            foreach ($fileGroup in $fileGroups) {
                $relativePath = $fileGroup.Name -replace [regex]::Escape($projectRoot), "."
                $lines = @($fileGroup.Group | Where-Object { $_.Line -gt 0 } | ForEach-Object { $_.Line } | Sort-Object -Unique)

                if ($lines.Count -gt 0) {
                    $linesList = $lines -join ', '
                    Write-ColorOutput "  - file: $relativePath" "Gray"
                    Write-ColorOutput "    lines: $linesList" "Gray"
                }
                else {
                    Write-ColorOutput "  - file: $relativePath" "Gray"
                }
            }
        }

        # Add note about warnings if they exist
        if ($totalWarnings -gt 0) {
            Write-ColorOutput ("=" * 80) $InfoColor
            Write-ColorOutput "Note: $totalWarnings warning(s) exist but are only shown when no errors are present" $InfoColor
            Write-ColorOutput ("=" * 80) $InfoColor
        }
    }
    # Only show warnings if no errors exist
    elseif ($warningGroups.Count -gt 0) {
        Write-ColorOutput ("=" * 80) $WarningColor
        Write-ColorOutput "WARNINGS BY CODE" $WarningColor
        Write-ColorOutput ("=" * 80) $WarningColor

        foreach ($group in $warningGroups) {
            # Format: CODE (Count): Message + URL
            $header = "$($group.Code) ($($group.Count)): $($group.Message)"
            if ($group.Url) {
                $header += " ($($group.Url))"
            }
            Write-ColorOutput $header $WarningColor

            # Group files and their line numbers
            $fileGroups = $group.Files | Group-Object File | Sort-Object Name
            foreach ($fileGroup in $fileGroups) {
                $relativePath = $fileGroup.Name -replace [regex]::Escape($projectRoot), "."
                $lines = @($fileGroup.Group | Where-Object { $_.Line -gt 0 } | ForEach-Object { $_.Line } | Sort-Object -Unique)

                if ($lines.Count -gt 0) {
                    $linesList = $lines -join ', '
                    Write-ColorOutput "  - file: $relativePath" "Gray"
                    Write-ColorOutput "    lines: $linesList" "Gray"
                }
                else {
                    Write-ColorOutput "  - file: $relativePath" "Gray"
                }
            }
        }
    }

    # Success message only when both are zero
    if ($totalErrors -eq 0 -and $totalWarnings -eq 0) {
        Write-ColorOutput "[OK] No errors or warnings found!" $SuccessColor
    }

    # Add suggestion to fetch web references if any issues have URLs
    $issuesWithUrls = $GroupedIssues | Where-Object { $_.Url }
    if ($issuesWithUrls.Count -gt 0) {
        Write-ColorOutput ""
        Write-ColorOutput "TIP: You're encouraged to fetch web reference for warnings to understand how to address these warnings/errors" $InfoColor
    }
    Write-ColorOutput "Use: Task tool to fix single kind of warning/error esp. formatting warnings. It helps maintain conversation context quality." $InfoColor
}

function Export-ToJson {
    param([object[]]$GroupedIssues, [string]$FilePath)

    $output = @{
        Summary = @{
            TotalErrors        = ($GroupedIssues | Where-Object { $_.Type -eq "error" } | Measure-Object Count -Sum).Sum
            TotalWarnings      = ($GroupedIssues | Where-Object { $_.Type -eq "warning" } | Measure-Object Count -Sum).Sum
            UniqueErrorTypes   = ($GroupedIssues | Where-Object { $_.Type -eq "error" }).Count
            UniqueWarningTypes = ($GroupedIssues | Where-Object { $_.Type -eq "warning" }).Count
            Timestamp          = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        Issues  = $GroupedIssues
    }

    $output | ConvertTo-Json -Depth 10 | Out-File -FilePath $FilePath -Encoding UTF8
    Write-ColorOutput "Results exported to: $FilePath" $SuccessColor
}

function Export-ToCsv {
    param([object[]]$GroupedIssues, [string]$FilePath)

    $csvData = foreach ($group in $GroupedIssues) {
        foreach ($file in $group.Files) {
            [PSCustomObject]@{
                Type    = $group.Type
                Code    = $group.Code
                Message = $group.Message
                Count   = $group.Count
                File    = $file.File
                Line    = $file.Line
            }
        }
    }

    $csvData | Export-Csv -Path $FilePath -NoTypeInformation -Encoding UTF8
    Write-ColorOutput "Results exported to: $FilePath" $SuccessColor
}

# Main execution
try {
    Write-ColorOutput "Starting clean build of $SolutionPath..." $InfoColor

    # Perform clean build and capture output
    Write-ColorOutput "Running: dotnet clean $SolutionPath" $InfoColor
    $cleanOutput = dotnet clean $SolutionPath 2>&1

    Write-ColorOutput "Running: dotnet build $SolutionPath" $InfoColor
    $buildOutput = dotnet build $SolutionPath 2>&1

    # Combine outputs
    $allOutput = @($cleanOutput) + @($buildOutput)

    Write-ColorOutput "Build completed. Analyzing output..." $InfoColor

    # Parse issues from build output
    $issues = Parse-BuildOutput -BuildOutput $allOutput

    if ($issues.Count -eq 0) {
        Write-ColorOutput "[OK] No issues found in build output!" $SuccessColor
        return
    }

    # Group issues
    $groupedIssues = Group-Issues -Issues $issues

    # Output based on format
    switch ($OutputFormat) {
        "Console" {
            Format-ConsoleOutput -GroupedIssues $groupedIssues
        }
        "Json" {
            if ($SaveToFile) {
                Export-ToJson -GroupedIssues $groupedIssues -FilePath $SaveToFile
            }
            else {
                $groupedIssues | ConvertTo-Json -Depth 10
            }
        }
        "Csv" {
            if ($SaveToFile) {
                Export-ToCsv -GroupedIssues $groupedIssues -FilePath $SaveToFile
            }
            else {
                Write-ColorOutput "CSV format requires -SaveToFile parameter" $ErrorColor
            }
        }
    }

    # Save to file if specified and format is Console
    if ($SaveToFile -and $OutputFormat -eq "Console") {
        $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
        $defaultFile = "build_issues_$timestamp.json"
        Export-ToJson -GroupedIssues $groupedIssues -FilePath $defaultFile
    }

    # Validation: Exit with error code if issues are found
    # Filter out submodule issues (we can't control external dependencies)
    $nonSubmoduleIssues = $groupedIssues | Where-Object {
        $hasNonSubmoduleFile = $false
        foreach ($file in $_.Files) {
            if (-not ($file.File -like "*\submodules\*")) {
                $hasNonSubmoduleFile = $true
                break
            }
        }
        $hasNonSubmoduleFile
    }

    $errorCount = ($nonSubmoduleIssues | Where-Object { $_.Type -eq "error" } | Measure-Object Count -Sum).Sum
    $warningCount = ($nonSubmoduleIssues | Where-Object { $_.Type -eq "warning" } | Measure-Object Count -Sum).Sum

    # Count submodule warnings for informational purposes
    $submoduleWarningCount = ($groupedIssues | Where-Object {
            $_.Type -eq "warning" -and
            ($_.Files | Where-Object { $_.File -like "*\submodules\*" }).Count -eq $_.Files.Count
        } | Measure-Object Count -Sum).Sum

    if ($errorCount -gt 0) {
        Write-ColorOutput "[ERROR] VALIDATION FAILED: $errorCount error(s) found" $ErrorColor
        exit 1
    }

    if ($warningCount -gt 0) {
        Write-ColorOutput "[WARNING] VALIDATION FAILED: $warningCount warning(s) found in project code" $WarningColor
        Write-ColorOutput "All warnings must be resolved before proceeding" $WarningColor
        exit 1
    }

    if ($submoduleWarningCount -gt 0) {
        Write-ColorOutput "[INFO] Note: $submoduleWarningCount warning(s) found in external submodules (not counted)" $InfoColor
    }

    Write-ColorOutput "[OK] VALIDATION PASSED: No errors or warnings found" $SuccessColor
    exit 0

}
catch {
    Write-ColorOutput "Error occurred: $($_.Exception.Message)" $ErrorColor
    exit 1
}
