---
name: clean-builds
description: This skill guides developers through achieving zero-warning builds, consistent code style, and NuGet package version consistency. It provides a comprehensive workflow combining Roslynator analyzer integration (200+ code analyzers), code formatting, build quality checks, and package version validation. This skill should be used when preparing code for commit, validating build quality, fixing code style issues, ensuring all warnings are addressed, or consolidating package versions before merging.
---

# Clean Builds Skill

## ⚠️ IMPORTANT: Path Resolution for LLM

**All script paths in this skill are relative to the skill's base directory, which is provided when this skill is used.**

When you see paths like:
- `scripts/format-code.ps1` → Prepend the skill's base path provided in the tool response
- `references/troubleshooting.md` → Located at `<skill_base_path>/references/troubleshooting.md`

**How to invoke scripts**:
1. The skill's base path will be provided when this skill is used (e.g., `Base Path: B:\sources\DOC_Project_2025\.claude\skills\clean-builds\`)
2. Prepend this base path to all script references
3. **Run scripts from the user's current working directory** (the project root), NOT from the skill directory

**Example**: If base path is `B:\sources\DOC_Project_2025\.claude\skills\clean-builds\` and user is in their project root:
```pwsh
# Construct full path to script using base path
pwsh B:\sources\DOC_Project_2025\.claude\skills\clean-builds\scripts\format-code.ps1

# Script runs in current directory (project root), but is invoked from skill directory
# User stays in their project root: B:\their-project\
```

**Critical**: Never `cd` to the skill directory. Always run scripts FROM the skill's base path while staying IN the user's project directory.

## Purpose

This skill enables developers to achieve **zero-warning builds**, **consistent code style**, and **NuGet package version consistency** through a proven three-step workflow:

1. **Format Code** - Automatically fix code style and apply code analysis
2. **Build & Check** - Verify the build is clean with no errors or warnings
3. **Validate Packages** - Ensure NuGet package versions are consistent across projects

Use this skill to:
- Prepare code for commit with confidence
- Fix all build warnings and errors systematically
- Maintain consistent code style across the project
- Identify and fix NuGet package version inconsistencies
- Validate quality before merging pull requests

## When to Use This Skill

Use this skill when you need to:
- Format and validate code changes before committing
- Fix build warnings that are blocking progress
- Check for NuGet package version inconsistencies
- Perform comprehensive pre-commit quality checks
- Achieve zero-warning builds for release preparation

## Quick Start

### Prerequisites (One-Time Setup)

Before first use, complete the one-time setup:

```pwsh
# NOTE: Prepend skill base path to all script references below
# Run from user's project directory, not from skill directory

# Step 1: Enable code style enforcement
pwsh <skill_base_path>/scripts/validate-code-style-enforcement.ps1 -Enforce

# Step 2: Enable Roslynator analyzers
pwsh <skill_base_path>/scripts/enable-roslynator-analyzers.ps1 -ExcludeSubmodules

# Step 3: Configure .editorconfig
pwsh <skill_base_path>/scripts/configure-roslynator-editorconfig.ps1 -Severity warning

# Step 4: Validate package versions
pwsh <skill_base_path>/scripts/validate-package-versions.ps1
```

**📖 Detailed Guide**: [One-Time Setup Guide](references/one-time-setup-guide.md)

### Regular Workflow

Execute before every commit:

```pwsh
# NOTE: Prepend skill base path to all script references
# Run from user's project directory

# 1. Validate packages
pwsh <skill_base_path>/scripts/validate-package-versions.ps1

# 2. Format code
pwsh <skill_base_path>/scripts/format-code.ps1

# 3. Build and check
pwsh <skill_base_path>/scripts/build_and_group_errors_and_warnings.ps1

# 4. Fix warnings (if any)
# 5. Repeat 2-3 until clean
```

**📖 Detailed Guide**: [Complete Workflow Example](examples/complete-workflow.md)

## Common Workflows

### Workflow 1: Format Code and Fix Warnings

**Step 1: Run the Formatter**

```pwsh
# Prepend skill base path to script reference
pwsh <skill_base_path>/scripts/format-code.ps1
```

**What happens**:
- Removes unused `using` statements (IDE0005)
- Fixes code style issues (IDE0017, IDE0028, IDE0032, etc.)
- Applies Roslynator fixes (if installed)
- Cleans up code organization with ReSharper

**Expected output**:
```
[INFO] Formatting codebase...
[INFO] Running dotnet format style...
[SUCCESS] dotnet format completed
[INFO] Running Roslynator fixes...
[SUCCESS] Roslynator completed (45 fixes applied)
[INFO] Running ReSharper cleanup...
[SUCCESS] Complete!
```

**Step 2: Identify Remaining Warnings**

```pwsh
pwsh <skill_base_path>/scripts/build_and_group_errors_and_warnings.ps1
```

**Expected output**:
```
=====================================
Build Summary
=====================================
Total Errors: 0
Total Warnings: 12

Unique Error Codes: 0
Unique Warning Codes: 3

=====================================
Warnings by Code
=====================================

[CA1826] Use property instead of Linq method (8 occurrences)
  src/Services/UserService.cs:42
  src/Services/MessageService.cs:18
  src/Services/ChatService.cs:35
  ...

[CA1859] Use concrete types when possible for improved performance (3 occurrences)
  src/Models/ChatContext.cs:15
  ...

[IDE0052] Remove unread private members (1 occurrence)
  src/Services/LegacyService.cs:33
```

**Step 3: Fix Warnings**

**For CA1826** (Use property instead of LINQ):

```csharp
// Before (warning)
var first = users.Where(u => u.IsActive).FirstOrDefault();

// After (fixed)
var first = users.FirstOrDefault(u => u.IsActive);
```

**For CA1859** (Use concrete types):

```csharp
// Before (warning)
IEnumerable<string> names = GetNames();

// After (fixed)
List<string> names = GetNames();  // If GetNames() returns List<string>
```

**For IDE0052** (Remove unread members):

```csharp
// Before (warning)
private string _unused = "never read";

// After (fixed)
// Simply delete the unused field
```

**Step 4: Re-run Format and Build**

```pwsh
# Format again to ensure consistency
pwsh <skill_base_path>/scripts/format-code.ps1

# Build and verify
pwsh <skill_base_path>/scripts/build_and_group_errors_and_warnings.ps1
```

**Success output**:
```
Total Errors: 0
Total Warnings: 0

✅ Build is clean!
```

### Workflow 2: Fix Package Version Issues

**Step 1: Validate Packages**

```pwsh
pwsh <skill_base_path>/scripts/validate-package-versions.ps1
```

**If you see CRITICAL issues**:
```
🔴 Microsoft.Orleans.Core
   Versions: 9.0.0, 9.2.1
   Impact: Orleans framework version mismatch can cause runtime failures
   Projects:
     - server/AIChat.LoadTesting/AIChat.LoadTesting.csproj (9.0.0)
     - server/AIChat.Server/AIChat.Server.csproj (9.2.1)
   Recommended: Update all to version 9.2.1
```

**Step 2: Fix the Mismatch**

Open `server/AIChat.LoadTesting/AIChat.LoadTesting.csproj` and update:

```xml
<!-- Before -->
<PackageReference Include="Microsoft.Orleans.Core" Version="9.0.0" />

<!-- After -->
<PackageReference Include="Microsoft.Orleans.Core" Version="9.2.1" />
```

**Step 3: Re-validate**

```pwsh
pwsh <skill_base_path>/scripts/validate-package-versions.ps1
```

**Success output**:
```
Total Packages: 152
Inconsistent Packages: 0
CRITICAL issues: 0

✅ All packages consistent!
```

### Workflow 3: Pre-Commit Checklist

**Complete workflow before every commit**:

```pwsh
# NOTE: Prepend skill base path to all script references
# Run from user's project directory

# 1. Validate packages (fix CRITICAL issues if found)
pwsh <skill_base_path>/scripts/validate-package-versions.ps1

# 2. Format code
pwsh <skill_base_path>/scripts/format-code.ps1

# 3. Build and check
pwsh <skill_base_path>/scripts/build_and_group_errors_and_warnings.ps1

# 4. If warnings found, fix them and repeat steps 2-3

# 5. When clean, commit
git add .
git commit -m "Your commit message"
```

### Workflow 4: Using Roslynator Auto-Fix

If you have many warnings after enabling Roslynator:

```pwsh
# Auto-fix what can be automated
roslynator fix DOC_Project_2025.sln --ignore-compiler-errors --format
```

**Expected output**:
```
Analyzing solution...
Fixed 312 diagnostics in 45 files
  RCS1002: 45 fixes (Remove unnecessary braces)
  RCS1036: 89 fixes (Remove unnecessary blank line)
  RCS1080: 12 fixes (Use Count/Length property)
  ...
```

**Then verify**:
```pwsh
pwsh <skill_base_path>/scripts/build_and_group_errors_and_warnings.ps1
```

## Available Scripts

> **Note**: All scripts are located in the `scripts/` directory relative to the skill's base path. Prepend the base path when invoking scripts.

| Script | Purpose | Documentation |
|--------|---------|---------------|
| `build_and_group_errors_and_warnings.ps1` | Build & group warnings by code **IMPORTANT**| [→ Details](<skill_base_path>/references/scripts/build-and-group-errors.md) |
| `format-code.ps1` | Auto-fix code style issues **IMPORTANT** | [→ Details](<skill_base_path>/references/scripts/format-code.md) |
| `validate-package-versions.ps1` | Detect NuGet version mismatches | [→ Details](<skill_base_path>/references/scripts/validate-package-versions.md) |
| `enable-roslynator-analyzers.ps1` | Add Roslynator to all projects | [→ Details](<skill_base_path>/references/scripts/enable-roslynator-analyzers.md) |
| `configure-roslynator-editorconfig.ps1` | Configure .editorconfig rules | [→ Details](<skill_base_path>/references/scripts/configure-roslynator-editorconfig.md) |
| `validate-code-style-enforcement.ps1` | Enable code style during build | [→ Details](<skill_base_path>/references/scripts/validate-code-style-enforcement.md) |

## Handling Issues

### Build Warnings

When you run `build_and_group_errors_and_warnings.ps1`, warnings are **grouped by code** for efficient batch fixing.

#### Common Warnings and How to Fix Them

**IDE0005: Remove unnecessary using directive**

Auto-fixed by `format-code.ps1`:
```csharp
// Before
using System;
using System.Collections.Generic;  // ← Not used, will be removed
using System.Linq;

// After (auto-fixed)
using System;
using System.Linq;
```

**CA1826: Use property instead of Linq method**

Manual fix required:
```csharp
// Before (warning)
var first = users.Where(u => u.IsActive).FirstOrDefault();

// After (fixed)
var first = users.FirstOrDefault(u => u.IsActive);
```

**CA1859: Use concrete types when possible**

Manual fix:
```csharp
// Before (warning)
IEnumerable<string> names = new List<string>();

// After (fixed)
List<string> names = new List<string>();
```

**IDE0052: Remove unread private members**

Manual fix - delete the unused field:
```csharp
// Before (warning)
private string _unused = "never read";

// After (fixed)
// Simply delete it
```

**RCS1036: Remove unnecessary blank line**

Auto-fixed by Roslynator:
```pwsh
roslynator fix DOC_Project_2025.sln --ignore-compiler-errors --format
```

#### Batch Fixing Strategy

1. **Run build and identify warnings**:
   ```pwsh
   pwsh <skill_base_path>/scripts/build_and_group_errors_and_warnings.ps1
   ```

2. **Fix auto-fixable warnings first**:
   ```pwsh
   pwsh <skill_base_path>/scripts/format-code.ps1
   ```

3. **Review grouped output** - Warnings are grouped by code (e.g., all CA1826 together)

4. **Fix one warning type at a time** - Use IDE find/replace for patterns

5. **Re-run build** to verify fixes

6. **Repeat** until zero warnings

**📖 Detailed Guide**: [Warning Codes Guide](<skill_base_path>/references/warning-codes-guide.md)

### Package Version Issues

**🔴 CRITICAL** (must fix immediately):
- Orleans framework version mismatches
- Major version differences

**🟡 WARNING** (should review):
- Minor/patch version variations

**📖 Detailed Guide**: [Package Version Management](<skill_base_path>/references/package-version-management.md)

### Troubleshooting

Common issues and solutions:

- **Tool not found** → Install missing tools
- **IDE0005 not detected** → Enable `EnforceCodeStyleInBuild`
- **Too many Roslynator warnings** → Start with lower severity
- **Build time increased** → Exclude submodules from analysis

**📖 Detailed Guide**: [Troubleshooting Guide](<skill_base_path>/references/troubleshooting.md)

## Best Practices

**Core Principles**:

1. ✅ **Complete one-time setup first** - Configure all tools before using
2. ✅ **Format frequently** - Don't accumulate style issues
3. ✅ **Fix warnings immediately** - Don't let them pile up
4. ✅ **Never suppress warnings** - Fix root causes, not symptoms
5. ✅ **Understand each warning** - Learn from the messages
6. ✅ **Validate packages regularly** - Catch version drift early
7. ✅ **Pre-commit validation** - Always run full workflow before commit
8. ✅ **Enable Roslynator** - Get 200+ code quality rules
9. ✅ **Team consistency** - Commit .editorconfig and .csproj changes

**📖 Detailed Guide**: [Best Practices](<skill_base_path>/references/best-practices.md)

## Roslynator Analyzers (Optional but Recommended)

Roslynator provides 200+ code analyzers that run during every build.

**Benefits**:
- 🎯 Build-time enforcement of code quality
- 💡 Real-time IDE feedback
- 📋 Consistent team standards
- ⚡ Catch issues early

**Setup** (one-time):

```pwsh
# NOTE: Prepend skill base path to script references

# Add analyzers
pwsh <skill_base_path>/scripts/enable-roslynator-analyzers.ps1 -ExcludeSubmodules

# Configure severity
pwsh <skill_base_path>/scripts/configure-roslynator-editorconfig.ps1 -Severity warning

# Auto-fix issues
roslynator fix DOC_Project_2025.sln --ignore-compiler-errors --format
```

**Expected impact**:
- Build time: +10-30%
- Initial warnings: 100s
- Auto-fixable: 200-300+

**📖 Detailed Guide**: [Roslynator Setup Guide](<skill_base_path>/references/roslynator-setup.md)

## Examples

- **[Complete Workflow](<skill_base_path>/examples/complete-workflow.md)** - Full workflow from start to commit
- **[First-Time Setup](<skill_base_path>/examples/first-time-setup.md)** - Initial configuration walkthrough
- **[Fixing Warnings in Bulk](<skill_base_path>/examples/fixing-warnings-bulk.md)** - Batch fixing strategies
- **[Package Version Fixes](<skill_base_path>/examples/package-version-fixes.md)** - Step-by-step package fixes
- **[Roslynator Auto-Fix](<skill_base_path>/examples/roslynator-auto-fix.md)** - Using `roslynator fix` command

## References

- **[One-Time Setup Guide](<skill_base_path>/references/one-time-setup-guide.md)** - Complete setup checklist
- **[Warning Codes Guide](<skill_base_path>/references/warning-codes-guide.md)** - Detailed warning explanations
- **[Package Version Management](<skill_base_path>/references/package-version-management.md)** - NuGet version guide
- **[Roslynator Setup](<skill_base_path>/references/roslynator-setup.md)** - Comprehensive Roslynator guide
- **[Best Practices](<skill_base_path>/references/best-practices.md)** - Zero-warning build strategies
- **[Troubleshooting](<skill_base_path>/references/troubleshooting.md)** - Common issues and solutions

### Script Documentation

- **[format-code.ps1](<skill_base_path>/references/scripts/format-code.md)** - Code formatting
- **[build_and_group_errors_and_warnings.ps1](<skill_base_path>/references/scripts/build-and-group-errors.md)** - Build validation
- **[validate-package-versions.ps1](<skill_base_path>/references/scripts/validate-package-versions.md)** - Package validation
- **[enable-roslynator-analyzers.ps1](<skill_base_path>/references/scripts/enable-roslynator-analyzers.md)** - Enable analyzers
- **[configure-roslynator-editorconfig.ps1](<skill_base_path>/references/scripts/configure-roslynator-editorconfig.md)** - Configure rules
- **[validate-code-style-enforcement.ps1](<skill_base_path>/references/scripts/validate-code-style-enforcement.md)** - Style enforcement

## Next Steps

After achieving a clean build:

1. Review changes: `git diff`
2. Commit your changes
3. Create a pull request
4. Ensure CI/CD pipeline passes

**Remember**: Zero warnings before commit is the goal!
**IMPORTANT!!**: MUST use scripts from within the clean-builds SKILL base directory. Always start with build_and_group_errors_and_warnings.ps1 scripts, you'll know what to do next.
