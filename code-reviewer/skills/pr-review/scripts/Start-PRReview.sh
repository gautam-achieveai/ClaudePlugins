#!/usr/bin/env bash

# Set up an isolated pull-request review workspace on Linux.
# Requires Bash 4+ and Git.

set -Eeuo pipefail

if ((BASH_VERSINFO[0] < 4)); then
    printf 'ERROR: Start-PRReview.sh requires Bash 4 or later.\n' >&2
    exit 1
fi

readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
    readonly COLOR_CYAN=$'\033[36m'
    readonly COLOR_GREEN=$'\033[32m'
    readonly COLOR_YELLOW=$'\033[33m'
    readonly COLOR_RED=$'\033[31m'
    readonly COLOR_RESET=$'\033[0m'
else
    readonly COLOR_CYAN=''
    readonly COLOR_GREEN=''
    readonly COLOR_YELLOW=''
    readonly COLOR_RED=''
    readonly COLOR_RESET=''
fi

info() {
    printf '%s%s%s\n' "${COLOR_CYAN}" "$*" "${COLOR_RESET}"
}

success() {
    printf '%s%s%s\n' "${COLOR_GREEN}" "$*" "${COLOR_RESET}"
}

warn() {
    printf '%sWARNING: %s%s\n' "${COLOR_YELLOW}" "$*" "${COLOR_RESET}" >&2
}

die() {
    printf '%sERROR: %s%s\n' "${COLOR_RED}" "$*" "${COLOR_RESET}" >&2
    exit 1
}

usage() {
    cat <<'USAGE'
Usage:
  Start-PRReview.sh --pr-number <number> --source-branch <branch> [options]

Required:
  -n, --pr-number <number>       Pull request number to review
  -s, --source-branch <branch>   Source branch from the pull request

Optional:
  -b, --base-branch <branch>     Base branch; auto-detects origin/HEAD,
                                 then main, master, or dev
  -t, --pr-title <title>         Pull request title
  -a, --pr-author <author>       Pull request author
  -d, --pr-description <text>   Pull request description
      --skip-worktree            Use the current directory instead of creating
                                 an isolated worktree; HEAD must already equal
                                 the fetched source-branch tip
  -h, --help                     Show this help

Example:
    bash ./Start-PRReview.sh \
      --pr-number 12345 \
      --source-branch feature/add-bulk-upload \
      --pr-title "Add bulk upload feature" \
      --pr-author "Example Developer"
USAGE
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

append_exclusion() {
    local exclude_file=$1
    local entry=$2

    if grep -Eiq "^[[:space:]]*${entry}[[:space:]]*$" "${exclude_file}"; then
        info "   [exists] Git exclusion: ${entry}"
        return
    fi

    if [[ -s "${exclude_file}" ]] && [[ $(tail -c 1 "${exclude_file}" | wc -l) -eq 0 ]]; then
        printf '\n' >>"${exclude_file}"
    fi

    printf '%s\n' "${entry}" >>"${exclude_file}"
    success "   [added] Git exclusion: ${entry}"
}

initialize_git_exclusions() {
    local repository_root=$1
    local exclude_file

    exclude_file=$(git -C "${repository_root}" rev-parse --git-path info/exclude)
    if [[ "${exclude_file}" != /* ]]; then
        exclude_file="${repository_root}/${exclude_file}"
    fi

    mkdir -p "$(dirname "${exclude_file}")"
    if [[ ! -e "${exclude_file}" ]]; then
        printf '# git ls-files --others --exclude-from=.git/info/exclude\n' >"${exclude_file}"
    fi

    append_exclusion "${exclude_file}" worktrees
    append_exclusion "${exclude_file}" scratchpad
}

detect_base_branch() {
    local repository_root=$1
    local origin_head
    local candidate

    if origin_head=$(git -C "${repository_root}" symbolic-ref --quiet --short refs/remotes/origin/HEAD); then
        printf '%s\n' "${origin_head#origin/}"
        return
    fi

    for candidate in main master dev; do
        if git -C "${repository_root}" show-ref --verify --quiet "refs/remotes/origin/${candidate}"; then
            printf '%s\n' "${candidate}"
            return
        fi
    done

    die 'Unable to determine a base branch from origin/HEAD or main, master, and dev.'
}

validate_branch_name() {
    local branch=$1
    local label=$2

    git check-ref-format --branch "${branch}" >/dev/null 2>&1 ||
        die "Invalid ${label} branch name: ${branch}"
}

fetch_branch() {
    local repository_root=$1
    local branch=$2

    git -C "${repository_root}" fetch --quiet origin \
        "+refs/heads/${branch}:refs/remotes/origin/${branch}"
}

write_if_missing() {
    local destination=$1
    local display_name=$2

    if [[ -e "${destination}" ]]; then
        info "   [exists] ${display_name}"
        cat >/dev/null
        return
    fi

    cat >"${destination}"
    success "   [created] ${display_name}"
}

pr_number=''
source_branch=''
base_branch=''
pr_title=''
pr_author=''
pr_description=''
skip_worktree=false

while (($# > 0)); do
    case "$1" in
        -n | --pr-number)
            (($# >= 2)) || die "$1 requires a value."
            pr_number=$2
            shift 2
            ;;
        --pr-number=*)
            pr_number=${1#*=}
            shift
            ;;
        -s | --source-branch)
            (($# >= 2)) || die "$1 requires a value."
            source_branch=$2
            shift 2
            ;;
        --source-branch=*)
            source_branch=${1#*=}
            shift
            ;;
        -b | --base-branch)
            (($# >= 2)) || die "$1 requires a value."
            base_branch=$2
            shift 2
            ;;
        --base-branch=*)
            base_branch=${1#*=}
            shift
            ;;
        -t | --pr-title)
            (($# >= 2)) || die "$1 requires a value."
            pr_title=$2
            shift 2
            ;;
        --pr-title=*)
            pr_title=${1#*=}
            shift
            ;;
        -a | --pr-author)
            (($# >= 2)) || die "$1 requires a value."
            pr_author=$2
            shift 2
            ;;
        --pr-author=*)
            pr_author=${1#*=}
            shift
            ;;
        -d | --pr-description)
            (($# >= 2)) || die "$1 requires a value."
            pr_description=$2
            shift 2
            ;;
        --pr-description=*)
            pr_description=${1#*=}
            shift
            ;;
        --skip-worktree)
            skip_worktree=true
            shift
            ;;
        -h | --help)
            usage
            exit 0
            ;;
        *)
            die "Unknown argument: $1. Run ${SCRIPT_NAME} --help for usage."
            ;;
    esac
done

[[ "${pr_number}" =~ ^[1-9][0-9]*$ ]] || die '--pr-number must be a positive integer.'
[[ -n "${source_branch}" ]] || die '--source-branch is required.'

# Provider APIs commonly return refs/heads/<branch>; Git commands below use the
# short branch name.
source_branch=${source_branch#refs/heads/}
base_branch=${base_branch#refs/heads/}

require_command git

readonly script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly repo_root="$(cd -- "${script_dir}/../../../.." && pwd -P)"

git -C "${repo_root}" rev-parse --git-dir >/dev/null 2>&1 ||
    die "Expected a Git repository at: ${repo_root}"

printf 'Initializing git exclusions...\n'
initialize_git_exclusions "${repo_root}"
printf '\n'

if [[ -z "${base_branch}" ]]; then
    info 'Detecting base branch...'
    base_branch=$(detect_base_branch "${repo_root}")
    success "   [ok] Using base branch: ${base_branch}"
    printf '\n'
fi

validate_branch_name "${source_branch}" source
validate_branch_name "${base_branch}" base

info 'Fetching branches...'
fetch_branch "${repo_root}" "${base_branch}" ||
    die "Could not refresh base branch from origin: ${base_branch}"
success "   [ok] Fetched base branch: ${base_branch}"

fetch_branch "${repo_root}" "${source_branch}" ||
    die "Could not refresh source branch from origin: ${source_branch}"
success "   [ok] Fetched source branch: ${source_branch}"

git -C "${repo_root}" rev-parse --verify "refs/remotes/origin/${base_branch}^{commit}" >/dev/null 2>&1 ||
    die "Remote-tracking base branch not found: origin/${base_branch}"
git -C "${repo_root}" rev-parse --verify "refs/remotes/origin/${source_branch}^{commit}" >/dev/null 2>&1 ||
    die "Remote-tracking source branch not found: origin/${source_branch}"

merge_base=$(git -C "${repo_root}" merge-base \
    "origin/${source_branch}" "origin/${base_branch}") ||
    die "Could not calculate the merge base for origin/${source_branch} and origin/${base_branch}."

printf '\n'
printf '%s========================================%s\n' "${COLOR_CYAN}" "${COLOR_RESET}"
printf '%s  Pull Request Code Review Setup%s\n' "${COLOR_CYAN}" "${COLOR_RESET}"
printf '%s========================================%s\n' "${COLOR_CYAN}" "${COLOR_RESET}"
printf '\n'
printf 'PR Number:       #%s\n' "${pr_number}"
printf 'Source Branch:   %s\n' "${source_branch}"
printf 'Base Branch:     %s\n' "${base_branch}"
printf 'Merge Base:      %s\n' "${merge_base}"
[[ -n "${pr_title}" ]] && printf 'Title:           %s\n' "${pr_title}"
[[ -n "${pr_author}" ]] && printf 'Author:          %s\n' "${pr_author}"
printf '\n'

readonly review_dir_name="pr-${pr_number}-review"
readonly worktrees_root="${repo_root}/worktrees"
worktree_path="${worktrees_root}/${review_dir_name}"
analysis_path="${worktree_path}/scratchpad/pr_reviews/pr-${pr_number}"

success '[1/6] Using PR metadata from the caller...'
readonly effective_title="${pr_title:-PR #${pr_number}}"
readonly effective_author="${pr_author:-Unknown}"
readonly effective_description="${pr_description:-Review for PR #${pr_number}}"
success "   [ok] PR Title: ${effective_title}"
success "   [ok] PR Author: ${effective_author}"
success "   [ok] Source Branch: ${source_branch}"

if [[ "${skip_worktree}" == false ]]; then
    printf '\n'
    success '[2/6] Creating git worktree...'
    skip_worktree_creation=false

    if [[ -e "${worktree_path}" ]]; then
        warn "Worktree already exists at: ${worktree_path}"
        printf '   Remove and recreate it? [y/N] '
        read -r response

        if [[ "${response}" =~ ^[Yy]$ ]]; then
            info '   Removing existing worktree...'
            if ! git -C "${repo_root}" worktree remove "${worktree_path}" --force; then
                warn 'Git could not remove the worktree; removing the known review directory directly.'
                case "${worktree_path}" in
                    "${worktrees_root}"/pr-*-review) rm -rf -- "${worktree_path}" ;;
                    *) die "Refusing to remove unexpected path: ${worktree_path}" ;;
                esac
            fi
        else
            info '   Using the existing worktree.'
            existing_root=$(git -C "${worktree_path}" rev-parse --show-toplevel 2>/dev/null || true)
            existing_root=$(cd -- "${existing_root:-/}" 2>/dev/null && pwd -P || true)
            expected_root=$(cd -- "${worktree_path}" && pwd -P)
            [[ "${existing_root}" == "${expected_root}" ]] ||
                die "Existing path is not the registered review worktree: ${worktree_path}"

            registered_worktree=false
            while IFS= read -r worktree_record; do
                if [[ "${worktree_record}" == "worktree ${expected_root}" ]]; then
                    registered_worktree=true
                    break
                fi
            done < <(git -C "${repo_root}" worktree list --porcelain)
            [[ "${registered_worktree}" == true ]] ||
                die "Existing path is not registered by the parent repository: ${worktree_path}"

            git -C "${worktree_path}" checkout --detach "origin/${source_branch}" >/dev/null ||
                die "Could not update the existing worktree to origin/${source_branch}."

            expected_tip=$(git -C "${repo_root}" rev-parse "origin/${source_branch}")
            actual_tip=$(git -C "${worktree_path}" rev-parse HEAD)
            [[ "${actual_tip}" == "${expected_tip}" ]] ||
                die "Existing worktree HEAD does not match origin/${source_branch}."

            success '   [ok] Existing worktree updated to the fetched source tip.'
            skip_worktree_creation=true
        fi
    fi

    if [[ "${skip_worktree_creation}" == false ]]; then
        mkdir -p "${worktrees_root}"
        info "   Creating detached review worktree at: ${worktree_path}"
        git -C "${repo_root}" worktree add --detach "${worktree_path}" "origin/${source_branch}"
        success '   [ok] Worktree created successfully.'
    fi
else
    printf '\n'
    warn '[2/6] Skipping worktree creation; using the current directory.'
    worktree_path="$(pwd -P)"
    git -C "${worktree_path}" rev-parse --git-dir >/dev/null 2>&1 ||
        die "Current directory is not a Git worktree: ${worktree_path}"
    analysis_path="${worktree_path}/scratchpad/pr_reviews/pr-${pr_number}"

    source_tip=$(git -C "${repo_root}" rev-parse "origin/${source_branch}")
    current_tip=$(git -C "${worktree_path}" rev-parse HEAD)
    [[ "${source_tip}" == "${current_tip}" ]] ||
        die "Current HEAD differs from origin/${source_branch}; check out the source tip or omit --skip-worktree."
fi

printf '\n'
success '[3/6] Analyzing PR changes...'

changed_files=()
changed_output=''
if changed_output=$(git -C "${worktree_path}" diff --name-only "${merge_base}...HEAD"); then
    if [[ -n "${changed_output}" ]]; then
        mapfile -t changed_files <<<"${changed_output}"
    fi
else
    warn 'Could not enumerate changed files.'
fi

files_count=${#changed_files[@]}
stats=$(git -C "${worktree_path}" diff --shortstat "${merge_base}...HEAD" || true)
code_count=0
test_count=0
config_count=0
doc_count=0

if ((${#changed_files[@]} > 0)); then
    for changed_file in "${changed_files[@]}"; do
        case "${changed_file}" in
            *.cs | *.js | *.ts | *.tsx | *.jsx | *.py | *.java | *.go | *.rs | *.cpp | *.c | *.h)
                ((code_count += 1))
                ;;
        esac
        [[ "${changed_file}" =~ [Tt]est ]] && ((test_count += 1))
        case "${changed_file}" in
            *.json | *.yaml | *.yml | *.xml | *.config | *.ini) ((config_count += 1)) ;;
            *.md | *.txt | *.rst) ((doc_count += 1)) ;;
        esac
    done
fi

info "   Files changed: ${files_count}"
[[ -n "${stats}" ]] && info "   ${stats}"
info "   Code files: ${code_count}"
info "   Test files: ${test_count}"
info "   Config files: ${config_count}"
info "   Doc files: ${doc_count}"

printf '\n'
success '[4/6] Setting up review directory structure...'
readonly diffs_dir="${analysis_path}/diffs"
readonly analysis_dir="${analysis_path}/analysis"
readonly feedback_dir="${analysis_path}/feedback"

for directory in "${analysis_path}" "${diffs_dir}" "${analysis_dir}" "${feedback_dir}"; do
    if [[ -d "${directory}" ]]; then
        info "   [exists] ${directory}"
    else
        mkdir -p "${directory}"
        success "   [created] ${directory}"
    fi
done

printf '\n'
success '[5/6] Saving PR diff...'
readonly diff_path="${diffs_dir}/full_diff.patch"
readonly files_path="${diffs_dir}/changed_files.txt"

if git -C "${worktree_path}" diff "${merge_base}...HEAD" >"${diff_path}"; then
    success "   [ok] Diff saved to: ${diff_path}"
else
    warn 'Could not save the full diff.'
fi

if ((${#changed_files[@]} == 0)); then
    changed_files_written=true
    : >"${files_path}" || changed_files_written=false
elif printf '%s\n' "${changed_files[@]}" >"${files_path}"; then
    changed_files_written=true
else
    changed_files_written=false
fi

if [[ "${changed_files_written}" == true ]]; then
    success "   [ok] File list saved to: ${files_path}"
else
    warn 'Could not save the changed-file list.'
fi

printf '\n'
success '[6/6] Creating review templates...'
readonly review_started="$(date '+%Y-%m-%d %H:%M:%S')"
readonly review_date="$(date '+%Y-%m-%d')"
readonly readme_path="${analysis_path}/README.md"

write_if_missing "${readme_path}" 'README.md' <<EOF
# PR Review: #${pr_number} - ${effective_title}

## PR Information

- **PR Number**: #${pr_number}
- **Author**: ${effective_author}
- **Base Branch**: ${base_branch}
- **Status**: Under Review
- **Files Changed**: ${files_count}
- **Review Started**: ${review_started}

## Description

${effective_description}

## Review Structure

### Diffs (../diffs/)

- **full_diff.patch**: Complete diff of all changes
- **changed_files.txt**: List of all modified files

### Analysis (../analysis/)

- **code_quality_analysis.md**: Design, maintainability, and code smells
- **security_concerns.md**: Security vulnerabilities (OWASP Top 10)
- **performance_review.md**: Performance implications and bottlenecks
- **testing_assessment.md**: Test coverage and quality
- **recommendations.md**: Specific, actionable improvements

### Feedback (../feedback/)

- **pr_feedback.md**: Consolidated review feedback for the PR author

## Review Workflow

1. Setup complete: worktree and structure created
2. Review each changed file
3. Check security concerns
4. Assess performance
5. Evaluate testing
6. Fill in analysis templates
7. Create consolidated feedback

## Quick Commands

### View a specific file diff

~~~bash
git diff ${merge_base}...HEAD -- path/to/file.cs
~~~

### View commit history for the PR

~~~bash
git log ${merge_base}..HEAD --oneline
~~~

### Check a file at a specific commit

~~~bash
git show <commit>:path/to/file.cs
~~~

## Review Checklist

- [ ] All changed files examined
- [ ] Security vulnerabilities checked (OWASP Top 10)
- [ ] Performance implications assessed
- [ ] Error handling verified
- [ ] Testing adequacy reviewed
- [ ] Backward compatibility checked
- [ ] Design patterns validated
- [ ] Documentation updated
- [ ] Code smells identified
- [ ] Specific, actionable feedback provided
- [ ] File and line references included
- [ ] Positive feedback balanced with concerns

## Cleanup

When the review is complete:

~~~bash
cd "${repo_root}"
git worktree remove "${worktree_path}"
~~~

## Worktree Location

**Path**: ${worktree_path}
EOF

write_if_missing "${analysis_dir}/code_quality_analysis.md" 'code_quality_analysis.md' <<EOF
# Code Quality Analysis: PR #${pr_number}

## Summary

**Overall Code Quality**: [Excellent / Good / Needs Improvement / Poor]
**Files Reviewed**: ${files_count}
**Major Concerns**: [Number]
**Minor Concerns**: [Number]

## Design and Architecture

### Positive Patterns

- [List good design decisions with file and line references]

### Concerns

#### [Concern Title]

**Location**: path/to/file.cs:123
**Severity**: [Critical / High / Medium / Low]
**Issue**: [Description]

~~~csharp
// Current code
~~~

**Recommendation**: [How to improve]

~~~csharp
// Suggested code
~~~

## Code Maintainability

### Readability

- [Assessment of naming, structure, and comments]

### Complexity

- [Cyclomatic complexity concerns]
- [Long methods or classes]

### Duplication

- [Code duplication issues]

## Error Handling

- [Missing null checks with locations]
- [Improper exception handling]
- [Edge cases not covered]

## Code Smells

### [Smell Name]

**Location**: path/to/file.cs:45-67
**Description**: [What the smell is]
**Impact**: [Why it matters]
**Recommendation**: [How to refactor]

## Naming Conventions

- [Any naming issues]

## Overall Assessment

[Summary paragraph of code quality]
EOF

write_if_missing "${analysis_dir}/security_concerns.md" 'security_concerns.md' <<EOF
# Security Analysis: PR #${pr_number}

## Summary

**Security Risk Level**: [None / Low / Medium / High / Critical]
**Vulnerabilities Found**: [Number]
**OWASP Issues**: [Number]

## OWASP Top 10 Check

### 1. Broken Access Control

- [x] No issues found
- [ ] Issues found: [details with file and line]

### 2. Cryptographic Failures

- [x] No issues found
- [ ] Issues found: [hardcoded secrets, weak encryption, or other details]

### 3. Injection

- [x] No SQL injection
- [x] No XSS
- [x] No command injection
- [ ] Issues found: [details]

### 4. Insecure Design

- [x] No issues found
- [ ] Issues found: [details]

### 5. Security Misconfiguration

- [x] No issues found
- [ ] Issues found: [details]

### 6. Vulnerable Components

- [x] No vulnerable dependencies
- [ ] Vulnerable dependencies found: [details]

### 7. Authentication Failures

- [x] No issues found
- [ ] Issues found: [details]

### 8. Data Integrity Failures

- [x] No issues found
- [ ] Issues found: [details]

### 9. Logging Failures

- [x] Adequate logging
- [ ] Logging issues found: [details]

### 10. Server-Side Request Forgery

- [x] No SSRF risks
- [ ] SSRF risks found: [details]

## Critical Security Issues

### [Issue Title]

**Location**: path/to/file.cs:123
**OWASP Category**: [Category]
**Severity**: Critical
**Description**: [What is vulnerable]

~~~csharp
// Vulnerable code
~~~

**Attack Scenario**: [How it could be exploited]
**Fix**: [How to secure it]

~~~csharp
// Secure code
~~~

## Recommendations

1. [Security recommendation]
2. [Security recommendation]

## Overall Security Assessment

[Summary of security posture]
EOF

write_if_missing "${analysis_dir}/performance_review.md" 'performance_review.md' <<EOF
# Performance Analysis: PR #${pr_number}

## Summary

**Performance Impact**: [Positive / Neutral / Negative]
**Critical Issues**: [Number]
**Optimization Opportunities**: [Number]

## Database Performance

### N+1 Query Issues

- [x] No N+1 issues found
- [ ] N+1 issues found: [details]

**Location**: path/to/file.cs:123

~~~csharp
// Current code causing N+1 behavior
~~~

**Recommendation**:

~~~csharp
// Batched or eagerly loaded alternative
~~~

### Missing Indexes

- [Queries that might benefit from indexes]

### Query Efficiency

- [Large result sets without pagination]
- [Unnecessary data fetching]

## Memory Management

### Potential Leaks

- [IDisposable not disposed]
- [Event subscriptions not removed]

### Large Allocations

- [Large collections in memory]
- [String operations in loops]

## Algorithm Efficiency

**Location**: path/to/file.cs:45-67
**Current Complexity**: O(n^2)
**Issue**: [Description]
**Improved Complexity**: O(n)

## Network Performance

- [Multiple sequential API calls]
- [Large payloads]
- [Missing caching]

## Recommendations

### High Priority

1. [Critical performance fix]

### Medium Priority

1. [Important optimization]

### Low Priority

1. [Optional improvement]

## Overall Performance Assessment

[Summary of performance impact]
EOF

write_if_missing "${analysis_dir}/testing_assessment.md" 'testing_assessment.md' <<EOF
# Testing Assessment: PR #${pr_number}

## Summary

**Test Coverage**: [Excellent / Good / Adequate / Insufficient / None]
**New Tests Added**: [Number]
**Test Quality**: [High / Medium / Low]
**Critical Gaps**: [Number]

## Test Coverage Analysis

### New Features Tested

- [x] Feature 1 has tests
- [ ] Feature 2 is missing tests

### Edge Cases Tested

- [x] Null inputs
- [x] Empty collections
- [ ] Boundary conditions

### Error Paths Tested

- [x] Exception handling
- [ ] Validation errors

## Test Quality

### Well-Written Tests

- [Examples of good tests]

### Test Issues

**Test**: [Test name]
**Location**: path/to/test.cs:123
**Issue**: [Flaky / brittle / testing implementation details]
**Recommendation**: [How to improve]

## Missing Test Coverage

### Critical Scenarios Not Tested

1. **Scenario**: [Description]
   **Why Critical**: [Business impact]
   **Suggested Test**: [Behavior and expected result]

## Integration Tests

- [x] Critical flows have integration tests
- [ ] Integration tests missing for: [flows]

## Recommendations

### Must Add

1. [Critical test gap]

### Should Add

1. [Important test]

### Optional

1. [Optional test]

## Overall Testing Assessment

[Summary of testing adequacy]
EOF

write_if_missing "${analysis_dir}/pr_feedback.md" 'pr_feedback.md in analysis/' <<EOF
# PR Review Feedback: PR #${pr_number}

## Review Intent

~~~json
{
  "statedProblem": "...",
  "acceptanceCriteria": ["..."],
  "explicitNonGoals": ["..."],
  "deliveredApproach": "...",
  "goalCoverage": "SOLVED",
  "solutionDirection": "RIGHT_BALLPARK",
  "evidence": ["..."]
}
~~~

## Summary

- **Goal Coverage Rationale**: [Evidence]
- **Solution Direction Rationale**: [Evidence]
- **Overall Assessment**: [APPROVE / APPROVE_WITH_COMMENTS / REQUEST_CHANGES]
- **Files Changed**: ${files_count}
- **Risk Level**: [Low / Medium / High]
- **Blockers**: [Number]

## What Was Done Well

1. [Specific positive with file and line reference]
2. [Another positive aspect]

## Blocking Issues

### Issue 1: [Title]

**Finding ID**: F-001
**Location**: path/to/file.cs:123
**Severity**: Critical
**Category**: [Bug / Security / Performance / Design]

**Problem**: [Clear description]

**Why This Matters**: [Concrete consequence for this PR and its stated goal]

**Required Outcome**: [Implementation-neutral condition that must hold]

**Suggested Path**: [Minimal safe route or viable options]

**Done When**: [Objective test, behavior, validation result, or observable state]

## Non-Blocking Feedback

[Useful Medium findings that do not require another review cycle]

## Optional Follow-up

[Low-severity observations; no response required]

## Testing Feedback

**Coverage**: [Assessment]

## Security Review

[Security assessment]

## Performance Considerations

[Performance impact]

## Questions for Author

1. [Clarification question]

## Shortest Path to Approval

Include only when requesting changes. List blockers in priority order:

1. [Required outcome] - done when [objective evidence]

Optional feedback is excluded from this list and does not require another cycle.

## Maintainer Decision Required

[HANDOFF_REQUIRED findings only; include evidence and owner, not another AI fix suggestion]

<details>
<summary>Review state (machine-readable)</summary>

## Active Review Threads

~~~json
[
  {
    "findingId": "F-001",
    "threadId": null,
    "status": "NEW",
    "blocker": true,
    "authorAttemptCount": 0,
    "lastAuthorAttemptCommit": null,
    "pendingAction": "POST",
    "actionId": "F-001:POST:<head-sha>:0",
    "lastCompletedActionId": null,
    "requiredOutcome": "...",
    "doneWhen": "...",
    "evidence": "..."
  }
]
~~~

## Closed Thread Archive

~~~json
{
  "closedThreadArchiveOmittedCount": 0,
  "closedThreadArchive": [
    {
      "findingId": "F-000",
      "threadId": "provider-id",
      "status": "CLOSED",
      "blocker": false,
      "closedAt": "<provider-closure-time>",
      "lastCompletedActionId": "F-000:CLOSE:<head-sha>:0"
    }
  ]
}
~~~

</details>

## Approval Decision

**Status**: [APPROVE / APPROVE_WITH_COMMENTS / REQUEST_CHANGES]

**Reasoning**: [Goal fit, solution direction, and remaining blockers]

---

**Reviewed By**: [Your name]
**Review Date**: ${review_date}
EOF

write_if_missing "${analysis_dir}/recommendations.md" 'recommendations.md' <<EOF
# Recommendations: PR #${pr_number}

## Immediate Actions (Before Merge)

### 1. [Action Title]

**Priority**: Critical
**Effort**: [Low / Medium / High]
**File**: path/to/file.cs:123

**Current State**: [What needs fixing]

**Desired State**: [What it should be]

**Steps**:

1. [Step 1]
2. [Step 2]

**Code**:

~~~csharp
// Recommended implementation
~~~

## Short-Term Improvements (This Sprint)

[Medium-priority items]

## Long-Term Considerations

[Technical debt and refactoring opportunities]

## Learning Opportunities

- [Topic]: [Why it matters]

## Positive Patterns to Continue

[Good practices to replicate]

## Summary

[Overall recommendations summary]
EOF

write_if_missing "${feedback_dir}/pr_feedback.md" 'pr_feedback.md in feedback/' \
    <"${analysis_dir}/pr_feedback.md"

printf '\n'
printf '%s========================================%s\n' "${COLOR_CYAN}" "${COLOR_RESET}"
printf '%s  PR Review Setup Complete%s\n' "${COLOR_CYAN}" "${COLOR_RESET}"
printf '%s========================================%s\n' "${COLOR_CYAN}" "${COLOR_RESET}"
printf '\n'
printf 'README:       %s\n' "${readme_path}"
printf 'Diff:         %s\n' "${diff_path}"
printf 'Analysis:     %s\n' "${analysis_dir}"
printf 'Feedback:     %s\n' "${feedback_dir}"
printf 'Worktree:     %s\n' "${worktree_path}"
printf '\n'

# Machine-readable path output for callers.
printf 'WorktreePath=%s\n' "${worktree_path}"
printf 'AnalysisPath=%s\n' "${analysis_path}"
printf 'DiffsPath=%s\n' "${diffs_dir}"
printf 'AnalysisDir=%s\n' "${analysis_dir}"
printf 'FeedbackDir=%s\n' "${feedback_dir}"
printf 'ReadmePath=%s\n' "${readme_path}"
