# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer subagent.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**Only dispatch after spec compliance review passes.**

```
Task tool (code-reviewer:code-reviewer or general-purpose):
  description: "Code quality review for Task N"
  prompt: |
    Review the code changes between BASE_SHA and HEAD_SHA for quality.

    ## What Was Implemented
    [from implementer's report]

    ## Plan Reference
    Task N from [plan-file]

    ## Your Job

    Review for:
    - Code quality (clean, maintainable, follows project patterns)
    - Test quality (tests verify behavior, not mocks)
    - Architecture (appropriate abstractions, no over-engineering)
    - Naming (clear, accurate names)
    - Error handling (appropriate, not excessive)

    Report:
    - Strengths (what was done well)
    - Issues (Critical/Important/Minor with file:line references)
    - Assessment (Ready to proceed? Yes/No/With fixes)
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment
