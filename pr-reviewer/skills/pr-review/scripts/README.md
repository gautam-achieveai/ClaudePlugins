# PR Reviewer Scripts

Automation scripts for conducting comprehensive pull request code reviews.

## Quick Start

**LLM Workflow** (Claude uses this approach):

1. Fetch PR metadata using MCP:
```
$pr = mcp__azure-devops__getPullRequest -repository "MCQdbDEV" -pullRequestId 12345
$sourceBranch = $pr.sourceRefName -replace '^refs/heads/', ''  # e.g., "developers/gb/feature"
```

2. Call script with extracted parameters:
```powershell
cd .claude/skills/pr-reviewer/scripts

.\Start-PRReview.ps1 `
    -PRNumber 12345 `
    -SourceBranch $sourceBranch `
    -PRTitle $pr.title `
    -PRAuthor $pr.createdBy.displayName
```

This creates an isolated worktree with complete review setup.

## Start-PRReview.ps1

**Purpose**: All-in-one script to set up a complete PR review environment

**Key Features**:
- Creates isolated git worktree for review work
- Fetches PR metadata and changes
- Analyzes code statistics and categorizes files
- Sets up organized directory structure
- Creates pre-filled review templates
- Saves complete diff for offline review
- Worktree is excluded from git (in `worktrees/` directory)

**Parameters**:
- `-PRNumber` (Required): Pull request number to review
- `-SourceBranch` (Required): Source branch name from PR (LLM fetches via MCP)
- `-Repository` (Optional): Repository name (defaults to "MCQdbDEV")
- `-BaseBranch` (Optional): Branch to compare against (defaults to "dev")
- `-PRTitle` (Optional): PR title (LLM fetches via MCP)
- `-PRAuthor` (Optional): PR author (LLM fetches via MCP)
- `-PRDescription` (Optional): PR description (LLM fetches via MCP)
- `-SkipWorktree` (Optional): Skip worktree creation, use current directory

**Example - Full Parameters** (Recommended):
```powershell
.\Start-PRReview.ps1 `
    -PRNumber 12345 `
    -SourceBranch "developers/gb/feature_xyz" `
    -PRTitle "Add bulk upload feature" `
    -PRAuthor "Gautam Bhakar"
```

**Example - Minimal** (Missing metadata):
```powershell
.\Start-PRReview.ps1 -PRNumber 10395 -SourceBranch "developers/gb/bugfix"
```

**Example - Without Worktree**:
```powershell
.\Start-PRReview.ps1 `
    -PRNumber 98765 `
    -SourceBranch "feature/new-api" `
    -SkipWorktree
```

**Output Structure**:
```
worktrees/
└── pr-12345-review/                           # Isolated worktree
    └── scratchpad/
        └── pr_reviews/
            └── pr-12345/
                ├── README.md                  # Instructions and checklist
                ├── diffs/                     # PR diffs
                │   ├── full_diff.patch
                │   └── changed_files.txt
                ├── analysis/                  # Review templates
                │   ├── code_quality_analysis.md
                │   ├── security_concerns.md
                │   ├── performance_review.md
                │   ├── testing_assessment.md
                │   └── recommendations.md
                └── feedback/                  # Final feedback
                    └── pr_feedback.md
```

**Returns**: Hashtable with paths to all directories created

**Clean Up After Review**:
```powershell
# From repository root
git worktree remove worktrees/pr-12345-review
```

## Review Workflow

### 1. Setup
```powershell
.\Start-PRReview.ps1 -PRNumber 12345
```

### 2. Review Templates

The script creates these analysis templates:

**code_quality_analysis.md**: Analyze design, maintainability, code smells
**security_concerns.md**: Check OWASP Top 10 vulnerabilities
**performance_review.md**: Identify performance bottlenecks
**testing_assessment.md**: Evaluate test coverage and quality
**recommendations.md**: Specific, actionable improvements

### 3. Consolidated Feedback

**pr_feedback.md**: Final review feedback to share with PR author

### 4. Review Checklist

The README.md includes a comprehensive checklist:
- [ ] All changed files examined
- [ ] Security vulnerabilities checked
- [ ] Performance implications assessed
- [ ] Testing adequacy reviewed
- [ ] And more...

## Integration with Azure DevOps MCP

When reviewing Azure DevOps PRs, you can use MCP tools to:

**Fetch PR Details**:
```
mcp__azure-devops__getPullRequest
```

**Get File Changes**:
```
mcp__azure-devops__getAllPullRequestChanges
mcp__azure-devops__getPullRequestFileChanges
```

**Add Review Comments**:
```
mcp__azure-devops__addPullRequestComment           # General comment
mcp__azure-devops__addPullRequestInlineComment     # Line-specific
mcp__azure-devops__addPullRequestFileComment       # File-level
```

**Approve PR**:
```
mcp__azure-devops__approvePullRequest
```

## Review Quality Standards

Your review should check for:

### Security (OWASP Top 10)
1. Broken Access Control
2. Cryptographic Failures
3. Injection (SQL, XSS, Command)
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable Components
7. Authentication Failures
8. Data Integrity Failures
9. Logging Failures
10. SSRF

### Performance
- N+1 query issues
- Memory leaks
- Algorithm efficiency
- Network performance
- Caching opportunities

### Code Quality
- Design patterns
- SOLID principles
- Code smells
- Anti-patterns
- Maintainability

### Testing
- Test coverage
- Edge cases
- Integration tests
- Test quality

## Tips for Effective Reviews

1. **Be Specific**: Always include file:line references
2. **Show Examples**: Include code snippets for issues and fixes
3. **Be Balanced**: Praise good work along with concerns
4. **Be Actionable**: Provide clear, implementable recommendations
5. **Consider Context**: Understand PR scope and constraints
6. **Be Professional**: Respectful, objective feedback

## Version History

- **v1.0.0** (2025-11-02): Initial pr-reviewer script
  - Automated worktree setup
  - Comprehensive review templates
  - Security, performance, testing analysis
  - Azure DevOps MCP integration
