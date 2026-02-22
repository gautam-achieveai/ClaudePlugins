# Developer Assessment Framework

## Five Assessment Dimensions

Evaluate developer performance across these areas:

### 1. Code Quality & Design

**What to Assess:**
- SOLID principles adherence
- Design pattern usage
- Defensive programming (null checks, validation)
- Code reusability and maintainability
- Error handling completeness
- Separation of concerns

**Evidence to Gather:**
- Code review findings across PRs
- Recurring design issues
- Use of appropriate abstractions
- Technical debt introduced vs resolved

**Red Flags:**
- Business logic in UI layers
- Missing validations repeatedly
- Copy-paste errors
- God classes/methods
- Magic numbers throughout code

**Assessment Questions:**
- Does code follow project design patterns?
- Is code designed for future maintenance?
- Are SOLID principles understood and applied?
- Is defensive programming practiced?

---

### 2. Testing Adequacy

**What to Assess:**
- Test coverage for new features
- Quality of tests (behavior vs implementation)
- Integration test coverage
- Edge case consideration
- Pre-production validation

**Evidence to Gather:**
- Bugs that could have been caught by tests
- Test code quality
- Coverage metrics
- Production incidents

**Red Flags:**
- Basic bugs reaching production
- Same bug recurring
- Multiple rollbacks
- No tests for new features
- Tests only covering happy path

**Assessment Questions:**
- Could production bugs have been caught by better tests?
- Are edge cases and error paths tested?
- Do tests validate behavior or just implementation?
- Are integration tests present for critical flows?

---

### 3. Requirements Analysis

**What to Assess:**
- Evidence of upfront planning
- Completeness of scenario mapping
- Rework frequency
- Feature iteration patterns
- Anticipation of edge cases

**Evidence to Gather:**
- Missed cases pattern instances
- Number of bug fixes per feature
- PR review comments about missing scenarios
- Thrashing patterns

**Red Flags:**
- Features requiring 5+ bug fixes
- Authentication/authorization with missed cases
- Logic moved between layers multiple times
- Unexpected scenarios discovered in production

**Assessment Questions:**
- Is there evidence of upfront scenario analysis?
- How complete is initial implementation?
- How often are features reopened for missed cases?
- Are edge cases discovered upfront or in production?

---

### 4. Time-to-Value

**What to Assess:**
- Time between commits on same feature
- Lines changed vs time invested
- Complexity justification
- Activity gaps analysis
- Productivity relative to task complexity

**Evidence to Gather:**
- Git commit history
- PR timelines
- Activity gap reports
- Code complexity metrics
- Blocker documentation

**Red Flags:**
- Simple changes taking months
- Large unexplained gaps
- Mismatch between code complexity and timeline
- Started work not completed

**Assessment Questions:**
- Is time investment justified by complexity?
- What caused activity gaps?
- Were blockers external or internal?
- Is productivity impacted by context switching?

**CRITICAL:** Always ask about gaps via `ask_human` - could be OnCall, blockers, legitimate reasons

---

### 5. User Satisfaction

**What to Assess:**
- Manager/stakeholder feedback
- Production incidents impact
- Business value delivered
- User-facing quality
- Team collaboration

**Evidence to Gather:**
- User feedback via `ask_human`
- Production incident severity
- Revenue/business impact
- Team dynamics feedback
- Customer complaints

**Red Flags:**
- Features causing revenue loss
- Customer escalations
- Multiple production rollbacks
- Team members blocked by this developer
- Manual processes created instead of automated

**Assessment Questions (via ask_human):**
- Overall satisfaction with deliverables?
- Any business impact issues?
- Work ethic or responsiveness concerns?
- Operational issues (blocking teams, manual work)?
- Customer satisfaction with features?

**CRITICAL:** Never finalize review without user validation phase

---

## Assessment Rubric

For each dimension, rate as:

### Excellent (5/5)
- Consistently exceeds expectations
- Sets example for others
- Proactively improves processes
- Zero critical issues

### Good (4/5)
- Meets expectations consistently
- Minor issues, quickly addressed
- Shows growth
- Few production issues

### Adequate (3/5)
- Meets basic expectations
- Some issues but acceptable
- Needs improvement in specific areas
- Occasional production issues

### Needs Improvement (2/5)
- Below expectations
- Recurring issues
- Pattern of problems
- Regular production issues

### Unacceptable (1/5)
- Consistently fails to meet expectations
- Critical recurring issues
- Significant business impact
- Requires immediate action

---

## Evidence-Based Assessment

**For Each Rating, Document:**

1. **Specific Examples**
   - PR numbers
   - Code snippets
   - Timeline data

2. **Patterns**
   - Frequency of issues
   - Improvement over time
   - Consistency

3. **Impact**
   - Business consequences
   - Team impact
   - User experience

4. **Context**
   - Project complexity
   - Blockers
   - OnCall duties
   - Learning curve

---

## Red Flag Severity

**Critical (Action Required):**
- Revenue-impacting bugs
- Security vulnerabilities
- Data loss incidents
- Repeated same mistakes

**High (Must Address):**
- Frequent production issues
- Poor testing discipline
- Design anti-patterns
- Blocked team members

**Medium (Should Improve):**
- Code quality issues
- Missing edge cases
- Moderate tech debt
- Timeline concerns

**Low (Minor):**
- Naming conventions
- Comment quality
- Formatting issues
- Documentation gaps

---

## Combining Dimensions

**Final Assessment considers:**
- Weighted importance (security > comments)
- Improvement trajectory
- Business context
- User validation input

**Never rely on single dimension**
**Always validate with user via ask_human**
**Always consider context**

---

## Special Considerations

### For New Developers
- Expect learning curve
- Focus on trajectory, not absolute performance
- Provide more specific guidance

### For Senior Developers
- Higher expectations
- Should mentor others
- Should improve processes
- Should reduce team tech debt

### For OnCall Heavy Periods
- Factor in context switching
- Adjust timeline expectations
- Note in assessment

### For Complex Projects
- Adjust difficulty weighting
- Consider pioneering work
- Note innovation vs maintenance
