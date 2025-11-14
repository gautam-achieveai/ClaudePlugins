# Workspace Code Formatting Script
# Automatically formats root projects discovered outside the submodules directory.

param(
    [string]$SolutionPath,
    [switch]$CheckOnly,
    [switch]$SubmodulesOnly,
    [switch]$RootOnly,
    [switch]$Help
)

$script:RootFormattingSucceeded = $true
$script:SubmoduleFormattingSucceeded = $true

function Show-Help {
    Write-Host "Workspace Code Formatting Script" -ForegroundColor Green
    Write-Host ""
    Write-Host "USAGE:"
    Write-Host "  pwsh .\\format-code.ps1                # Format auto-detected root projects"
    Write-Host "  pwsh .\\format-code.ps1 -CheckOnly     # Validate formatting without changes"
    Write-Host "  pwsh .\\format-code.ps1 -SolutionPath path\\My.sln"
    Write-Host "  pwsh .\\format-code.ps1 -SubmodulesOnly"
    Write-Host "  pwsh .\\format-code.ps1 -Help"
    Write-Host ""
    Write-Host "BEHAVIOR:"
    Write-Host "  - Discovers the top-most .sln outside submodules, falling back to .csproj files."
    Write-Host "  - Skips scanning inside the 'submodules' directory when locating targets."
    Write-Host "  - Formats submodules only when -SubmodulesOnly is explicitly provided."
    Write-Host "  - Formatting order: dotnet format → Roslynator → ReSharper CLT → CSharpier"
    Write-Host "  - CSharpier runs last to ensure consistent final formatting"
    Write-Host ""
    Write-Host "PREREQUISITES:"
    Write-Host "  dotnet SDK"
    Write-Host "  dotnet tool install -g csharpier"
    Write-Host "  dotnet tool install -g JetBrains.ReSharper.GlobalTools"
    Write-Host "  dotnet tool install -g Roslynator.DotNet.Cli"
}

function Test-ToolInstalled {
    param(
        [string]$ToolCommand,
        [string]$ToolName,
        [switch]$Required
    )

    try {
        & $ToolCommand --version > $null 2>&1
        return $true
    }
    catch {
        $prefix = $Required ? "[ERROR]" : "[INFO]"
        $color = $Required ? "Red" : "Yellow"
        Write-Host "$prefix $ToolName is not installed." -ForegroundColor $color
        return $false
    }
}

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

    if (-not $normalizedAncestor -or -not $normalizedDescendant) {
        return $false
    }

    if ($normalizedDescendant.Equals($normalizedAncestor, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $true
    }

    $ancestorWithSeparator = $normalizedAncestor + [System.IO.Path]::DirectorySeparatorChar
    return $normalizedDescendant.StartsWith($ancestorWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-IsSubmodulePath {
    param([string]$Path)

    $normalized = Get-NormalizedPath -Path $Path
    if (-not $normalized) {
        return $false
    }

    $separator = [System.IO.Path]::DirectorySeparatorChar
    $segment = "$separator" + "submodules" + "$separator"

    if ($normalized.EndsWith("submodules", [System.StringComparison]::OrdinalIgnoreCase)) {
        return $true
    }

    return $normalized.IndexOf($segment, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Get-RelativePath {
    param(
        [string]$BasePath,
        [string]$TargetPath
    )

    $baseNormalized = Get-NormalizedPath -Path $BasePath
    $targetNormalized = Get-NormalizedPath -Path $TargetPath

    if (-not $baseNormalized -or -not $targetNormalized) {
        return $TargetPath
    }

    $baseUri = New-Object System.Uri($baseNormalized + [System.IO.Path]::DirectorySeparatorChar)
    $targetUri = New-Object System.Uri($targetNormalized)
    return $baseUri.MakeRelativeUri($targetUri).ToString().Replace('/', [System.IO.Path]::DirectorySeparatorChar)
}

function Get-FilesExcludingSubmodules {
    param(
        [string]$RootPath,
        [string]$Filter
    )

    $results = @()
    $ignored = @("submodules", "bin", "obj", "node_modules", ".git", ".vs", ".idea")

    $rootItem = Get-Item -LiteralPath $RootPath -ErrorAction Stop
    $stack = New-Object System.Collections.Stack
    $stack.Push($rootItem)

    while ($stack.Count -gt 0) {
        $current = $stack.Pop()

        $files = Get-ChildItem -Path $current.FullName -Filter $Filter -File -ErrorAction SilentlyContinue
        if ($files) {
            $results += $files
        }

        $childDirs = Get-ChildItem -Path $current.FullName -Directory -ErrorAction SilentlyContinue
        foreach ($dir in $childDirs) {
            $name = $dir.Name.ToLowerInvariant()
            if ($ignored -contains $name) {
                continue
            }
            $stack.Push($dir)
        }
    }

    return $results
}

function Select-PrimaryCandidate {
    param([object[]]$Candidates)

    if (-not $Candidates -or $Candidates.Count -eq 0) {
        return $null
    }

    foreach ($candidate in $Candidates) {
        $isAncestor = $true
        foreach ($other in $Candidates) {
            if ($other.FullName -eq $candidate.FullName) {
                continue
            }

            if (-not (Test-IsSameOrAncestorPath -Ancestor $candidate.Directory -Descendant $other.Directory)) {
                $isAncestor = $false
                break
            }
        }

        if ($isAncestor) {
            return $candidate
        }
    }

    return $null
}

function Resolve-FormattingTargets {
    param(
        [string]$WorkspaceRoot,
        [string]$SolutionOverride
    )

    $solutionPath = $null
    $projectOverride = @()

    if (-not [string]::IsNullOrWhiteSpace($SolutionOverride)) {
        $resolvedOverride = (Resolve-Path -LiteralPath $SolutionOverride -ErrorAction Stop).Path

        if (Test-IsSubmodulePath -Path $resolvedOverride) {
            throw "Provided path '$SolutionOverride' resides under a submodule and cannot be used."
        }

        $extension = [System.IO.Path]::GetExtension($resolvedOverride)

        if ($extension -ieq ".sln") {
            $solutionPath = $resolvedOverride
        }
        elseif ($extension -ieq ".csproj") {
            $projectOverride = @($resolvedOverride)
        }
        else {
            throw "Provided path must be a .sln or .csproj file."
        }
    }

    if (-not $solutionPath) {
        $solutions = Get-FilesExcludingSubmodules -RootPath $WorkspaceRoot -Filter "*.sln"
        if ($solutions.Count -gt 0) {
            $candidates = $solutions | ForEach-Object {
                $dir = Split-Path -Parent $_.FullName
                [PSCustomObject]@{
                    FullName  = $_.FullName
                    Directory = $dir
                    Depth     = Get-DirectoryDepth -Path $dir
                }
            } | Sort-Object Depth, FullName

            $selected = Select-PrimaryCandidate -Candidates $candidates
            if ($null -eq $selected) {
                $list = $candidates | ForEach-Object { " - $($_.FullName)" } | Sort-Object
                $joined = [string]::Join([Environment]::NewLine, $list)
                throw "Multiple solution files were found outside submodules. Pass -SolutionPath to select one of the following:`n$joined"
            }

            $solutionPath = $selected.FullName
        }
    }

    $projectPaths = @()
    if ($projectOverride.Count -gt 0) {
        $projectPaths = $projectOverride
    }
    else {
        $projects = Get-FilesExcludingSubmodules -RootPath $WorkspaceRoot -Filter "*.csproj"
        if ($projects.Count -eq 0) {
            throw "No .csproj files were found outside submodules under '$WorkspaceRoot'."
        }
        $projectPaths = $projects | ForEach-Object { $_.FullName } | Sort-Object -Unique
    }

    $projectDirectories = $projectPaths | ForEach-Object { Split-Path -Parent $_ } | Sort-Object -Unique

    return [PSCustomObject]@{
        SolutionPath       = $solutionPath
        ProjectPaths       = $projectPaths
        ProjectDirectories = $projectDirectories
    }
}

function Format-RootProject {
    param(
        [bool]$CheckOnly,
        [string]$WorkspaceRoot,
        [string]$SolutionPath,
        [string[]]$ProjectPaths,
        [string[]]$ProjectDirectories
    )

    $script:RootFormattingSucceeded = $true

    if (-not $ProjectPaths -or $ProjectPaths.Count -eq 0) {
        Write-Host "No project files were discovered to format." -ForegroundColor Red
        $script:RootFormattingSucceeded = $false
        return
    }

    $dotnetTargets = if ($SolutionPath) { @($SolutionPath) } else { $ProjectPaths }
    $roslynatorTargets = $ProjectPaths
    $csharpierAvailable = Test-ToolInstalled "csharpier" "CSharpier"
    $roslynatorAvailable = Test-ToolInstalled "roslynator" "Roslynator CLI" -Required

    if (-not $CheckOnly) {
        if (-not (Test-ToolInstalled "jb" "ReSharper Command Line Tools" -Required)) {
            Write-Host "Install the ReSharper Global Tools with: dotnet tool install -g JetBrains.ReSharper.GlobalTools" -ForegroundColor Red
            return $false
        }
    }

    if (-not $roslynatorAvailable) {
        Write-Host "Install Roslynator with: dotnet tool install -g Roslynator.DotNet.Cli" -ForegroundColor Red
        $script:RootFormattingSucceeded = $false
        return
    }

    if ($CheckOnly) {
        Write-Host "Checking workspace formatting (no files will be modified)..." -ForegroundColor Yellow

        if ($csharpierAvailable) {
            foreach ($dir in $ProjectDirectories) {
                $relative = Get-RelativePath -BasePath $WorkspaceRoot -TargetPath $dir
                Write-Host "Checking CSharpier formatting in $relative" -ForegroundColor Cyan
                csharpier check $dir
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "[ERROR] CSharpier validation failed in $relative." -ForegroundColor Red
                    $script:RootFormattingSucceeded = $false
                    return
                }
            }
        }
        else {
            Write-Host "[INFO] CSharpier is not installed; skipping CSharpier checks." -ForegroundColor Yellow
        }

        foreach ($target in $dotnetTargets) {
            $relative = Get-RelativePath -BasePath $WorkspaceRoot -TargetPath $target
            Write-Host "Checking dotnet format style for $relative" -ForegroundColor Cyan
            dotnet format style $target --verify-no-changes --verbosity minimal
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ERROR] dotnet format verification failed for $relative." -ForegroundColor Red
                return $false
            }
        }

        $roslynatorAnalyzeFailures = @()
        foreach ($target in $roslynatorTargets) {
            $relative = Get-RelativePath -BasePath $WorkspaceRoot -TargetPath $target
            Write-Host "Checking Roslynator diagnostics for $relative" -ForegroundColor Cyan
            roslynator analyze $target --severity-level info --verbosity minimal
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ERROR] Roslynator analyze reported failures for $relative. Continuing with remaining projects." -ForegroundColor Red
                $script:RootFormattingSucceeded = $false
                $roslynatorAnalyzeFailures += $relative
                continue
            }
        }

        if ($roslynatorAnalyzeFailures.Count -gt 0) {
            Write-Host "[INFO] Roslynator analyze failed for the following projects:" -ForegroundColor Yellow
            foreach ($failure in $roslynatorAnalyzeFailures) {
                Write-Host "  - $failure" -ForegroundColor Yellow
            }
        }

        Write-Host "Note: ReSharper CLT does not support a check-only mode. Run the formatter without -CheckOnly to apply its fixes." -ForegroundColor Yellow
        return $true
    }

    Write-Host "Step 1: Applying dotnet format style fixes..." -ForegroundColor Cyan
    foreach ($target in $dotnetTargets) {
        $relative = Get-RelativePath -BasePath $WorkspaceRoot -TargetPath $target
        Write-Host "  - $relative" -ForegroundColor Gray
        dotnet format style $target --diagnostics "IDE0032 IDE0017 IDE0028 IDE0025" --verbosity minimal
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] dotnet format style failed for $relative." -ForegroundColor Red
            $script:RootFormattingSucceeded = $false
            return
        }
    }

    Write-Host "Step 2: Applying Roslynator fixes..." -ForegroundColor Cyan
    $roslynatorFixFailures = @()
    $roslynatorBuildFailures = @()
    foreach ($target in $roslynatorTargets) {
        $relative = Get-RelativePath -BasePath $WorkspaceRoot -TargetPath $target
        Write-Host "  - Building $relative before Roslynator" -ForegroundColor Gray
        dotnet build $target --verbosity minimal --nologo
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[WARNING] dotnet build failed for $relative. Skipping Roslynator for this project." -ForegroundColor Yellow
            $roslynatorBuildFailures += $relative
            continue
        }

        Write-Host "  - Running Roslynator fix on $relative" -ForegroundColor Gray
        roslynator fix $target --severity-level info --verbosity minimal --ignore-compiler-errors --fix-scope project
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[WARNING] Roslynator fix failed for $relative. Continuing with remaining projects." -ForegroundColor Yellow
            $roslynatorFixFailures += $relative
            continue
        }
    }

    if ($roslynatorBuildFailures.Count -gt 0) {
        Write-Host "[INFO] Skipped Roslynator for projects with build failures:" -ForegroundColor Yellow
        foreach ($failure in $roslynatorBuildFailures) {
            Write-Host "  - $failure" -ForegroundColor Yellow
        }
    }

    if ($roslynatorFixFailures.Count -gt 0) {
        Write-Host "[INFO] Roslynator fix failed for the following projects:" -ForegroundColor Yellow
        foreach ($failure in $roslynatorFixFailures) {
            Write-Host "  - $failure" -ForegroundColor Yellow
        }
    }

    Write-Host "Step 3: Formatting with ReSharper CLT..." -ForegroundColor Cyan
    $resharperFailures = @()
    foreach ($target in $dotnetTargets) {
        $relative = Get-RelativePath -BasePath $WorkspaceRoot -TargetPath $target
        Write-Host "  - $relative" -ForegroundColor Gray
        jb cleanupcode $target
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[WARNING] ReSharper CLT failed for $relative. Continuing with CSharpier..." -ForegroundColor Yellow
            $resharperFailures += $relative
            continue
        }
    }

    if ($resharperFailures.Count -gt 0) {
        Write-Host "[INFO] ReSharper CLT failed for the following targets:" -ForegroundColor Yellow
        foreach ($failure in $resharperFailures) {
            Write-Host "  - $failure" -ForegroundColor Yellow
        }
    }

    if ($csharpierAvailable) {
        Write-Host "Step 4: Running CSharpier (final formatting)..." -ForegroundColor Cyan
        foreach ($dir in $ProjectDirectories) {
            $relative = Get-RelativePath -BasePath $WorkspaceRoot -TargetPath $dir
            Write-Host "  - $relative" -ForegroundColor Gray
            csharpier format $dir
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ERROR] CSharpier failed in $relative." -ForegroundColor Red
                $script:RootFormattingSucceeded = $false
                return
            }
        }
    }
    else {
        Write-Host "[INFO] CSharpier is not installed; skipping final formatting." -ForegroundColor Yellow
    }

    Write-Host "Root workspace formatting completed successfully." -ForegroundColor Green
    $script:RootFormattingSucceeded = $true
    return
}

function Format-Submodules {
    param(
        [bool]$CheckOnly,
        [string]$WorkspaceRoot
    )

    $script:SubmoduleFormattingSucceeded = $true

    $submodulesRoot = Join-Path $WorkspaceRoot "submodules"

    if (-not (Test-Path $submodulesRoot)) {
        Write-Host "No submodules directory found at $submodulesRoot. Nothing to format." -ForegroundColor Yellow
        $script:SubmoduleFormattingSucceeded = $true
        return
    }

    $submoduleDirs = Get-ChildItem -Path $submodulesRoot -Directory -ErrorAction SilentlyContinue
    if ($submoduleDirs.Count -eq 0) {
        Write-Host "Submodules directory exists but contains no repositories." -ForegroundColor Yellow
        $script:SubmoduleFormattingSucceeded = $true
        return
    }

    if (-not (Test-ToolInstalled "csharpier" "CSharpier" -Required)) {
        Write-Host "Install CSharpier with: dotnet tool install -g csharpier" -ForegroundColor Red
        $script:SubmoduleFormattingSucceeded = $false
        return
    }

    $allSucceeded = $true
    foreach ($dir in $submoduleDirs) {
        $relative = Get-RelativePath -BasePath $WorkspaceRoot -TargetPath $dir.FullName
        Write-Host "Running CSharpier in $relative" -ForegroundColor Cyan
        Push-Location $dir.FullName
        try {
            if ($CheckOnly) {
                csharpier check .
            }
            else {
                csharpier format .
            }

            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ERROR] CSharpier failed in $relative." -ForegroundColor Red
                $allSucceeded = $false
                $script:SubmoduleFormattingSucceeded = $false
                break
            }
        }
        finally {
            Pop-Location
        }
    }

    if ($allSucceeded) {
        Write-Host "Submodule formatting completed." -ForegroundColor Green
        $script:SubmoduleFormattingSucceeded = $true
    }
    else {
        $script:SubmoduleFormattingSucceeded = $false
    }

    return
}

# Main script execution
if ($Help) {
    Show-Help
    exit 0
}

if ($RootOnly -and $SubmodulesOnly) {
    Write-Host "Use either -RootOnly or -SubmodulesOnly, not both." -ForegroundColor Red
    exit 1
}

$workspaceRoot = (Get-Location).Path
$formatTargets = $null

if (-not $SubmodulesOnly) {
    try {
        $formatTargets = Resolve-FormattingTargets -WorkspaceRoot $workspaceRoot -SolutionOverride $SolutionPath
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Workspace Code Formatting" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green

$success = $true

if ($SubmodulesOnly) {
    Format-Submodules -CheckOnly $CheckOnly -WorkspaceRoot $workspaceRoot
    $success = $script:SubmoduleFormattingSucceeded
}
else {
    Format-RootProject -CheckOnly $CheckOnly -WorkspaceRoot $workspaceRoot -SolutionPath $formatTargets.SolutionPath -ProjectPaths $formatTargets.ProjectPaths -ProjectDirectories $formatTargets.ProjectDirectories
    $success = $script:RootFormattingSucceeded
}

$successType = if ($null -ne $success) { $success.GetType().FullName } else { "<null>" }
Write-Verbose ("[format-code] success flag: {0} (type {1})" -f $success, $successType)

Write-Host ""
if ($success) {
    if ($CheckOnly) {
        Write-Host "✓ Formatting check completed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "✓ Code formatting completed successfully!" -ForegroundColor Green
        Write-Host "Tip: Run 'git diff' to review the applied changes." -ForegroundColor Gray
    }
    exit 0
}
else {
    Write-Host "✗ Formatting failed." -ForegroundColor Red
    exit 1
}
