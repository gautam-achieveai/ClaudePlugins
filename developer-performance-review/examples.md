# Developer Review Skill - Real Examples

This document shows real examples from actual performance reviews conducted using this skill.

## Example 1: Complete Review Workflow

### User Request
```
"Review Saurabh's work from July 2024 to June 2025"
```

### Step 1: Data Collection

```powershell
# Run in .claude/skills/dev-reviewer/scripts/
.\Get-DeveloperPRs.ps1 -Author "Saurabh Singh" -Since "2024-07-01" -Until "2025-06-30" -OutputPath "../../../analysis/prs.json"
```

**Output**: Found 186 commits, 59 PRs, ~8,000 lines changed

### Step 2: Context Gathering

**Question to Manager**:
> "What was your overall satisfaction with the Phase 2 .NET Core migration? Given that it required 10 follow-up bug fixes over 4 months, was this acceptable given the complexity?"

**Response**:
> "Moderate concerns - more bugs than ideal. Few bugs were critical, we had to roll back deployment multiple times. Issues popped in core areas like auth, feature flights, and payment."

### Step 3: Deep Code Analysis

**Extract diff for Phase 2 PR**:
```powershell
.\Get-PRDiff.ps1 -PRNumber 9192 -OutputPath "../../../analysis/pr_9192.diff" -IncludeStats
```

**Findings from code review**:

```csharp
// PR 9259 (same-day bug fix after Phase 2)
// BEFORE (BROKEN):
public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
    WebHost.CreateDefaultBuilder(args)
        .UseContentRoot(
            Environment.GetEnvironmentVariable(ContentRootPath))  // ❌ No null check

// AFTER (FIXED):
if (Environment.GetEnvironmentVariable(ContentRootPath) != null)  // ✅ Added null check
{
    webHostBuilder = webHostBuilder.UseContentRoot(...);
}
```

**Quality Issue Identified**:
- Missing defensive programming (null check)
- Should have been caught by code review or deployment smoke test
- Caused NullReferenceException on production deployment

### Step 4: Pattern Detection

**Thrashing Pattern Found**:
- **Oct 23** (PR 9487): Added verbose debugging logs to production
- **Oct 24** (PR 9497): Removed logs next day + refactored cookie logic

**Root Cause**: Production debugging instead of pre-production testing

**Missed Cases Pattern**:
```csharp
// Initially: Cookie set in HomeController.Index() - WRONG
// Later: Moved to AccountController.Login() - CORRECT

// Pattern: Implementation didn't map auth flow scenarios before coding
```

### Step 5: Timeline Analysis

```powershell
.\Find-ActivityGaps.ps1 -Author "Saurabh Singh" -MinGapDays 14 -OutputPath "../../../analysis/gaps.md"
```

**Gap Found**: Feb-Mar 2025 (2 months)

**Follow-up Question**:
> "There was a 2-month gap (Feb-Mar 2025) with zero commits. Was this due to OnCall duties, other work, or vacation?"

**Response**:
> "I think he was working on MLProject with AI Explanations for CFP. Should validate. But this work took too long."

**Investigation**: Found work in MLProjects repo - analysis updated to include both repositories.

### Step 6: Final Assessment

**Generated Documents**:
1. `detailed_code_quality_analysis.md` - 26 KB with code examples
2. `timeline_analysis.md` - Activity patterns and gaps
3. `bug_patterns.md` - Categorized issues
4. `talking_points.md` - Discussion guide
5. `recommendations.md` - Actionable improvements

**Overall Rating**: 4/5 (Strong Performer)

**Key Findings**:
- ✅ Delivered major features (Phase 2, ML Classification, Web Crawler)
- ⚠️ Quality issues: inadequate integration testing
- ⚠️ Pattern: "missed cases" requiring rework
- ⚠️ Timeline: some features took longer than code complexity suggests

---

## Example 2: Bug Pattern Analysis

### User Request
```
"Analyze Saurabh's bug fix patterns to identify testing gaps"
```

### Execution

```powershell
.\Analyze-BugPatterns.ps1 -Author "Saurabh Singh" -Since "2024-07-01" -Until "2025-06-30" -OutputPath "bugs.md"
```

### Findings

**Categories Detected**:
- NullReference: 3 bugs
- Serialization: 2 bugs
- Authentication: 8 bugs
- Configuration: 6 bugs
- Logging: 5 bugs

**Hotfixes to Release Branches**: 15 (indicating production issues)

**Temporal Clustering**:
- Oct 2024: 8 bugs (right after Phase 2 release)
- Dec 2024: 6 bugs (logging iteration)

### Analysis Generated

**Red Flag**: "Recurring authentication issues (8 bugs) suggests incomplete scenario mapping"

**Recommendation**: "Create comprehensive auth flow test suite covering login, cookie setting, flight checking, and session management"

**Systemic Issue Identified**: "15 hotfixes indicates insufficient pre-production validation. Strengthen QA process and add staging environment smoke tests."

---

## Example 3: Code Reusability Review

### User Request
```
"Check if the ML Classification code is designed for reusability"
```

### Investigation

Read code files:
```
autogen.net/Agentic.Console/AddTopicSubtopicArgs.cs
autogen.net/Agentic.Console/AiQuestionFixer/SubjectTopicClassifier.cs
```

### Findings

**Problem Identified**:
```csharp
// Business logic embedded in command class
[Verb("add-topic-subtopic")]
public class AddTopicSubtopicArgs : ICommandArgs
{
    public async Task Run()
    {
        var serviceProvider = Program.CreateServiceProvider();  // ❌ Coupled to Program
        // ... classification logic in command handler
    }
}
```

**Issue**: Business logic tightly coupled to console app. Cannot be invoked from web API, job runner, or other contexts.

**Recommendation**:
```
Refactor structure:
  Agentic.Classification/              ← Separate library
  ├── ISubjectClassifier.cs           ← Interface
  ├── SubjectTopicClassifier.cs       ← Pure business logic
  └── ClassificationService.cs        ← Service implementation

  Agentic.Console/
  └── AddTopicSubtopicCommand.cs      ← Thin wrapper calling library
```

---

## Example 4: Time-to-Value Analysis

### Question to Manager
```
"The ML Classification feature took 5 months (Jan 23 → Jun 26). What caused the delays?"
```

### Response
> "Good question. I think there were some design iterations and he was context-switching between MCQdb and MLProjects."

### Timeline Extracted

```
Jan 23: Initial commit
Feb 10: Major changes (551 insertions)
Mar 27: Minor fixes
[Gap]
Apr 15: Minor fixes
May 4-6: Resolve comments, more fixes
Jun 5: Final changes
Jun 26: Merged
```

### Analysis

**Pattern**: 5-month delivery with multiple iteration cycles and gaps

**Time Analysis**:
- Actual coding: ~2 weeks of commits
- Gaps: 3+ months across the timeline
- Suggests: Context switching, blocking issues, or rework cycles

**Recommendation**: "Investigate what caused delays. If context switching, consider dedicated time blocks for major features. If rework, improve upfront design reviews."

---

## Example 5: Cross-Repository Analysis

### Challenge
Developer worked on multiple repositories (MCQdb, MLProjects)

### Solution

```powershell
# Analyze MCQdb
cd D:/Source/repos/MCQdbDEV
.\Get-DeveloperPRs.ps1 -Author "Saurabh" -OutputPath "../analysis/mcqdb.json"

# Analyze MLProjects
cd D:/Source/repos/MLProjects
.\Get-DeveloperPRs.ps1 -Author "Saurabh" -OutputPath "../analysis/mlprojects.json"
```

### Combined Analysis

**Initial Impression** (MCQdb only):
- Q1 2025: Very low activity (3 PRs, all logging)
- Looked like productivity decline

**Revised Assessment** (both repos):
- Q1 2025: Actually working on MLProjects
- Delivered 5,400+ lines of ML code in Q2
- Not a productivity decline, just project reallocation

**Key Lesson**: Always check all repositories developer has access to before judging productivity.

---

## Example 6: Identifying Surgical vs Sloppy Fixes

### Surgical Fix Example ✅

**PR 9990: Darwin 2025 Questions Fix**

```csharp
// One-line change:
case AppId.NeetUG:
case AppId.MDS:
-   tagIds.AddRange(new string[] { "2020", "2021", "2022", "2023", "2024" });
+   tagIds.AddRange(new string[] { "2021", "2022", "2023", "2024", "2025" });
```

**Assessment**: Clean, focused, minimal risk. Shows developer can make precise fixes when problem is well-understood.

### Sloppy Pattern Example ❌

**PR 9670: Fix Wrong Questions (Jan 3, 2025)**

- **Timeline**: Phase 2 released Aug 19 → Fix on Jan 3 = **4.5 months**
- **Change**: Added `[FromBody]` attribute to 17 controllers
- **Issue**: Copy-paste error across multiple files
- **Impact**: Wrong questions displayed to users

**Assessment**:
- Simple fix took 4.5 months to implement
- Basic ASP.NET Core mistake repeated 17 times
- Should have been caught by integration tests

**Pattern**: Copy-paste without understanding framework requirements

---

## Key Learnings from Real Reviews

### What Worked Well

1. **Scripts automated tedious data collection** (minutes vs hours)
2. **User feedback crucial** for understanding quality vs expectations
3. **Actual code diffs revealed issues** commit messages didn't show
4. **Pattern detection** identified systemic problems (not just isolated bugs)
5. **Sequential thinking** helped reason through root causes
6. **Multiple repositories** required checking to get complete picture

### What Required Care

1. **Context gathering first** - avoid premature judgments
2. **Distinguish patterns from one-offs** - need multiple examples
3. **Separate individual from systemic** - testing gaps are team issues
4. **Timeline gaps need explanation** - could be legitimate (OnCall, vacation)
5. **Balance positive with constructive** - celebrate wins before concerns

### Template for Asking Good Questions

**Bad**: "Why did this take so long?"
**Good**: "For Feature X taking N months, were there blockers, context switching, or design iterations?"

**Bad**: "The code has bugs"
**Good**: "PR 9192 had 10 follow-up bug fixes. Given the migration complexity, was this within acceptable bounds?"

**Bad**: "Activity dropped in Q1"
**Good**: "Q1 shows 3 PRs in MCQdb. Was developer working on different project or were there other factors?"

---

## Workflow Summary

```
1. Run Get-DeveloperPRs.ps1          → Get overview
2. Run Find-ActivityGaps.ps1         → Detect timeline issues
3. Ask user about gaps               → Gather context
4. Run Get-MajorPRs.ps1             → Identify PRs for deep review
5. For each major PR:
   a. Get-PRDiff.ps1                 → Extract code
   b. Analyze with sequential thinking → Understand quality
   c. Document findings               → Specific examples
6. Run Analyze-BugPatterns.ps1       → Detect recurring issues
7. Ask user about satisfaction       → Validate technical findings
8. Synthesize comprehensive report   → Evidence + context + recommendations
9. Create talking points             → Structured discussion guide
```

## Scripts Used in Examples

All scripts available in `dev-reviewer/scripts/`:
- `Get-DeveloperPRs.ps1` - Extract commits and PRs
- `Find-ActivityGaps.ps1` - Detect timeline gaps
- `Get-MajorPRs.ps1` - Identify significant PRs
- `Get-PRDiff.ps1` - Extract code diffs
- `Analyze-BugPatterns.ps1` - Categorize bugs

See `scripts/README.md` for complete documentation.
