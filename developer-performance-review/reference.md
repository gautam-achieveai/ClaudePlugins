# DevReviewer Skill

## Purpose
Guide Claude through conducting comprehensive, quality-focused developer performance reviews. This skill goes beyond surface metrics to examine actual code quality, testing adequacy, design patterns, and time-to-value justification.

## When to Use This Skill
- Conducting annual or quarterly performance reviews for developers
- Analyzing developer productivity and code quality
- Identifying training needs and improvement areas
- Preparing feedback for performance discussions
- Investigating quality issues or patterns

## Core Philosophy

**Quality over Quantity**: A developer's value is measured by the quality of solutions delivered, not the number of PRs or lines of code. Focus on:
1. **What problems were solved** (not just what code was written)
2. **How well solutions work** (bugs, edge cases, testing)
3. **Time justified by value** (appropriate effort for complexity)
4. **Code maintainability** (reusability, design, patterns)

## Review Framework: The 5 Dimensions

### 1. Code Quality & Design
**What to examine**:
- Actual code diffs from major PRs
- Design patterns and architecture choices
- Code reusability and maintainability
- Adherence to SOLID principles
- Defensive programming (null checks, validation)
- Error handling and edge cases

**Red flags**:
- Copy-paste errors across multiple files
- Missing basic validations (null checks, [FromBody] attributes)
- Business logic in UI/command layers
- Hardcoded values requiring manual updates
- Breaking changes in public APIs

**Questions to ask**:
```
- Does the code handle edge cases?
- Is the design reusable or tightly coupled?
- Are there defensive programming practices?
- Would this code be easy to maintain?
```

### 2. Testing Adequacy
**What to examine**:
- What types of bugs occurred?
- Could these bugs have been caught by tests?
- Integration test coverage for critical flows
- Test quality (flaky tests, brittle tests)
- Pre-production validation

**Red flags**:
- Basic bugs reaching production (NRE, serialization)
- Critical flows breaking (payment, auth, core business logic)
- Same bug type recurring
- Production debugging (adding/removing logs)
- Multiple rollbacks

**Questions to ask**:
```
- What integration tests exist for this feature?
- Why wasn't this caught before production?
- Are there test environments for validation?
- Were tests written or just code?
```

### 3. Requirements & Scenario Mapping
**What to examine**:
- Evidence of upfront planning
- "Missed cases" patterns (rework due to incomplete scenarios)
- Refactoring frequency (design → implement → redesign)
- Feature iterations (should have been in V1)

**Red flags**:
- Auth/security features with missed scenarios
- Logic moved between controllers/layers
- Multiple PRs for what should be one feature
- "Quick fix" followed by "proper fix" pattern

**Questions to ask**:
```
- Were all user scenarios mapped before coding?
- Did the implementation miss obvious cases?
- Was there proper design review?
- Why did this require rework?
```

### 4. Time-to-Value Justification
**What to examine**:
- Time between commits on same feature
- Lines of code vs time invested
- Feature complexity vs delivery timeline
- Gaps in activity (context switching, blockers?)

**Red flags**:
- Simple changes taking months
- Large gaps with no visible progress
- Features dragging across quarters
- Mismatch: trivial code, long timeline

**Questions to ask**:
```
- What caused delays in delivery?
- Was developer blocked or context switching?
- Is timeline justified by complexity?
- Were there competing priorities?
```

### 5. User Satisfaction & Impact
**What to examine**:
- Manager/stakeholder feedback on deliverables
- Production incidents caused
- Business value delivered
- User-facing bugs vs internal refactoring

**Critical questions for manager**:
```
- Overall satisfaction with this feature?
- Production incidents or rollbacks?
- Was quality acceptable for complexity?
- How well is it working in production?
```

## Step-by-Step Review Process

### Phase 1: Data Collection (Use Scripts)

1. **Extract commit data**:
```powershell
.\Get-DeveloperPRs.ps1 -Author "DeveloperName" -Since "2024-07-01" -Until "2025-06-30"
```

2. **Analyze timeline**:
```powershell
.\Analyze-CommitTimeline.ps1 -Author "DeveloperName" -OutputPath "analysis/"
```

3. **Identify major PRs** (>100 lines or high impact):
```powershell
.\Get-MajorPRs.ps1 -Author "DeveloperName" -MinLines 100
```

### Phase 2: Context Gathering

**Critical: Get user feedback BEFORE deep analysis**

Use `ask_human` tool to gather:
1. Overall satisfaction with major features
2. Production incidents/rollbacks
3. Quality concerns or patterns observed
4. Timeline/productivity concerns
5. Reasons for activity gaps

**Example questions**:
```
Q1: "What was your overall satisfaction with the Phase 2 migration?
     Given 10 follow-up bug fixes, was this acceptable for complexity?"

Q2: "For the ML Classification feature taking 5 months, what caused
     the delays? Were there blockers or quality issues?"

Q3: "Are there specific PRs where the time investment didn't match
     the code complexity?"
```

### Phase 3: Code-Level Analysis

For each major PR identified:

1. **Get the diff**:
```powershell
.\Get-PRDiff.ps1 -PRNumber 9192 -OutputPath "analysis/pr_9192.diff"
```

2. **Analyze using sequential thinking**:
```
- What problem was being solved?
- How was it solved (design pattern)?
- What bugs followed (integration issues)?
- What tests would have caught issues?
- Time between this PR and bug fixes?
```

3. **Document findings**:
```markdown
### PR 9192: Phase 2 Migration

**Code Quality**:
- Missing null check on line 28 → NRE same day
- [Evidence: git show 27c12da3ba]

**Testing Gap**:
- Should have integration test for null environment variable
- Would catch this before deployment

**Time Analysis**:
- PR: Aug 19, 437 lines added
- Bug fix: Aug 19 (same day) - suggests inadequate pre-deployment testing
```

### Phase 4: Pattern Identification

Look for patterns across PRs:

**Thrashing Pattern**:
```
- Added feature → Removed next day
- Added logs → Removed logs (production debugging)
- Implemented in Location A → Moved to Location B
```

**Missed Cases Pattern**:
```
- Implemented scenario X
- Bug: scenario Y not handled
- Bug: scenario Z not handled
- Pattern: incomplete scenario mapping
```

**Quality Pattern**:
```
- Same type of bug recurring (serialization, null checks)
- Multiple files with same mistake (copy-paste)
- Basic issues reaching production
```

**Design Pattern**:
```
- Business logic in wrong layer
- Tight coupling to infrastructure
- Not designed for reusability
- Hardcoded values
```

### Phase 5: Timeline Analysis

1. **Create activity timeline**:
```powershell
.\Create-ActivityTimeline.ps1 -Author "Developer" -OutputPath "timeline.md"
```

2. **Identify gaps** (>2 weeks with no commits):
```powershell
.\Find-ActivityGaps.ps1 -Author "Developer" -MinGapDays 14
```

3. **For each gap, ask manager**:
   - What was developer working on?
   - Was this OnCall duty, vacation, or different project?
   - Were there blockers?

4. **For long-running features**:
   - Track first commit → merge PR
   - Identify idle periods
   - Calculate actual work days vs calendar days

### Phase 6: Synthesis & Documentation

Create comprehensive analysis with:

1. **Executive Summary**:
   - Overall assessment (rating)
   - Key achievements
   - Key concerns
   - Recommendation

2. **Detailed Code Quality Analysis**:
   - PR-by-PR breakdown with diffs
   - Specific quality issues with examples
   - Testing gaps identified
   - Design problems documented

3. **Pattern Analysis**:
   - Recurring issues
   - Root causes
   - Systemic vs individual problems

4. **Timeline Justification**:
   - Time-to-value analysis
   - Gaps explained (or unexplained)
   - Productivity assessment

5. **Recommendations**:
   - Specific, actionable improvements
   - Training needs
   - Process improvements
   - Next career steps

### Phase 7: Review Preparation

**Create talking points document**:

```markdown
## Performance Review: [Developer Name]

### Opening (Positive)
- Acknowledge accomplishments
- Recognize technical skills
- Appreciate contributions

### Accomplishments to Celebrate
1. [Major feature] - delivered X lines, solved Y problem
2. [Technical skill] - demonstrated expertise in Z
3. [Impact] - enabled business outcome

### Concerns to Discuss (Frame constructively)
1. **Testing Quality**
   - Observation: [specific example]
   - Impact: [production issue]
   - Question: "How can we improve our testing strategy?"

2. **Code Design**
   - Observation: [specific example]
   - Impact: [maintenance burden]
   - Question: "What would help you with design reviews?"

### Goals for Next Period
1. Improve integration testing before major releases
2. Design review for new features
3. [Specific technical goal]

### Career Discussion
- Interest in technical lead role?
- Areas for growth
- Training opportunities

### Closing (Positive)
- Reaffirm value
- Express confidence
- Confirm next steps
```

## Key Principles

### 1. Evidence-Based Review
- Every claim backed by specific PR, commit, or code example
- Use actual diffs, not just commit messages
- Quote line numbers and file paths

### 2. Context-Aware Analysis
- Consider project complexity
- Account for OnCall duties, context switching
- Understand team dynamics
- Factor in mentoring responsibilities

### 3. Balanced Perspective
- Celebrate wins before discussing concerns
- Acknowledge systemic issues vs individual issues
- Recognize growth and learning
- Frame concerns as opportunities

### 4. Actionable Feedback
- Specific examples, not vague criticisms
- Concrete recommendations
- Measurable goals
- Support offered (training, mentoring, tools)

### 5. Root Cause Focus
- Don't just list bugs, understand why
- Identify patterns, not isolated incidents
- Distinguish: skill gap vs process gap vs systemic issue

## Common Pitfalls to Avoid

### ❌ Don't Do This:
1. **Count PRs without examining code**: 100 trivial PRs < 10 high-quality PRs
2. **Judge by lines of code**: 10,000 lines of spaghetti < 500 lines of clean code
3. **Ignore context**: Developer may have valid reasons for delays
4. **Blame for systemic issues**: Lack of integration tests is a team/process issue
5. **Compare developers directly**: Different roles, projects have different complexity

### ✅ Do This:
1. **Examine actual code changes**: Read the diffs, understand the solutions
2. **Assess value delivered**: Focus on problems solved, not code written
3. **Gather context first**: Ask about gaps, challenges, blockers
4. **Distinguish root causes**: Individual skill vs team process vs systemic issue
5. **Benchmark appropriately**: Compare against project complexity and team standards

## Using the Automation Scripts

### 1. Get-DeveloperPRs.ps1
**Purpose**: Extract all PRs by author with statistics

**Usage**:
```powershell
.\Get-DeveloperPRs.ps1 -Author "Saurabh" -Since "2024-07-01" -Until "2025-06-30" -OutputPath "analysis/prs.json"
```

**Output**: JSON file with PR list, line counts, dates

### 2. Analyze-CommitTimeline.ps1
**Purpose**: Create visual timeline of developer activity

**Usage**:
```powershell
.\Analyze-CommitTimeline.ps1 -Author "Saurabh" -OutputPath "timeline.md"
```

**Output**: Markdown with monthly/weekly activity breakdown

### 3. Get-MajorPRs.ps1
**Purpose**: Identify PRs requiring deep review

**Usage**:
```powershell
.\Get-MajorPRs.ps1 -Author "Saurabh" -MinLines 100 -OutputPath "major_prs.txt"
```

**Output**: List of PR numbers for detailed analysis

### 4. Get-PRDiff.ps1
**Purpose**: Extract full diff for a PR

**Usage**:
```powershell
.\Get-PRDiff.ps1 -PRNumber 9192 -OutputPath "pr_9192.diff"
```

**Output**: Complete diff with file paths and line numbers

### 5. Find-ActivityGaps.ps1
**Purpose**: Detect gaps in developer activity

**Usage**:
```powershell
.\Find-ActivityGaps.ps1 -Author "Saurabh" -MinGapDays 14 -OutputPath "gaps.md"
```

**Output**: Report of activity gaps with dates

### 6. Analyze-BugPatterns.ps1
**Purpose**: Identify recurring bug patterns

**Usage**:
```powershell
.\Analyze-BugPatterns.ps1 -Author "Saurabh" -Keywords "fix,bug,hotfix" -OutputPath "bug_patterns.md"
```

**Output**: Analysis of bug types and frequency

## Example Review Flow

```
User: "Review Saurabh's work from July 2024 to June 2025"

Claude:
1. Runs Get-DeveloperPRs.ps1 to extract all PRs
2. Uses ask_human to get satisfaction feedback
3. Runs Get-MajorPRs.ps1 to identify significant work
4. For each major PR:
   - Runs Get-PRDiff.ps1
   - Uses sequential thinking to analyze
   - Documents quality issues
5. Runs Find-ActivityGaps.ps1 to detect timeline issues
6. Uses ask_human to clarify gaps
7. Compiles comprehensive analysis
8. Creates talking points document

Output:
- detailed_code_quality_analysis.md
- timeline_analysis.md
- talking_points.md
- recommendations.md
```

## Integration with Other Tools

### Use with Sequential Thinking
For complex analysis (Phase 2 quality, pattern identification):
```
Use sequential thinking to:
- Analyze root causes of bugs
- Map testing gaps
- Understand design decisions
- Justify conclusions
```

### Use with Ask Human
For critical context:
```
Always ask before judging:
- User satisfaction with features
- Reasons for timeline gaps
- Context for delays
- Quality expectations vs reality
```

### Use with TodoWrite
Track review progress:
```
- [ ] Extract commit data
- [ ] Get user feedback
- [ ] Analyze Phase 2 PRs
- [ ] Review ML Classification code
- [ ] Document findings
- [ ] Create talking points
```

## Quality Checklist

Before finalizing review, ensure:

- [ ] Examined actual code diffs (not just commit messages)
- [ ] Got user feedback on major features
- [ ] Identified specific quality issues with examples
- [ ] Analyzed testing gaps
- [ ] Justified timeline concerns with data
- [ ] Documented positive examples
- [ ] Created actionable recommendations
- [ ] Prepared talking points for discussion
- [ ] Considered context (OnCall, blockers, complexity)
- [ ] Balanced praise with constructive feedback

## Output Structure

Always create these documents:

1. **README.md**: Quick summary and navigation
2. **detailed_code_quality_analysis.md**: PR-level review with diffs
3. **timeline_analysis.md**: Activity patterns and gaps
4. **talking_points.md**: Structured discussion guide
5. **recommendations.md**: Specific, actionable improvements

Store in: `scratchpad/conversation_memories/review_{developer}_{date}/`

## Remember

**The goal is not to criticize but to improve**. A thorough review should:
- Help the developer grow
- Identify systemic issues
- Celebrate achievements
- Set clear goals
- Build trust

**Be fair, be specific, be constructive.**
