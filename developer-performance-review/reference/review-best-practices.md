# Developer Review Best Practices

## Critical Principles

### 1. User Validation Required

**ALWAYS present findings to user before finalizing**

**Why:**
- Technical analysis shows code patterns
- User provides business context
- Manager knows impact on revenue, team, operations
- Performance reviews need both technical AND behavioral assessment

**When:**
After Phase 5 (Assessment) but BEFORE Phase 7 (Documentation)

**How:**
Use `ask_human` tool to gather:
- Overall satisfaction with work
- Business impact issues (revenue, delays, customer impact)
- Work ethic or responsiveness concerns
- Operational issues (blocking teams, manual work)
- Context for activity gaps

**Never:**
- Finalize review without user input
- Make final ratings without manager feedback
- Assume technical analysis is complete picture

---

### 2. Evidence-Based

**Every observation must be backed by:**
- Specific PR numbers and commit hashes
- Actual code diffs with line numbers
- File paths and change details
- Timeline data from git history
- Concrete examples, not vague statements

**Bad:**
- "Developer writes poor quality code"
- "Testing is inadequate"
- "Productivity is low"

**Good:**
- "PR #123 (UserService.cs:45-67): Missing null checks led to 3 production bugs (#124, #125, #126)"
- "5 of 8 major features lack integration tests, resulting in bugs #200, #201 discovered in production"
- "3-month gap (Jan-Mar) was due to OnCall rotation (verified with manager)"

---

### 3. Context-Aware

**Always consider:**

**Project Complexity:**
- New technology/framework?
- Legacy codebase maintenance?
- Greenfield vs brownfield?
- Dependencies on other teams?

**OnCall Duties:**
- Context switching impact
- Emergency response time
- Production support load

**Team Dynamics:**
- Mentoring junior developers?
- Blocked by dependencies?
- Solo on critical path?

**Learning Curve:**
- New domain expertise?
- Technology stack switch?
- First time with specific patterns?

**Systemic vs Individual:**
- Is this a team-wide issue?
- Process gap vs skill gap?
- Tooling limitation?

---

### 4. Balanced Perspective

**Structure:**
1. **Open with Positives** (20-30%)
   - Major accomplishments
   - Skills demonstrated
   - Business value delivered

2. **Constructive Feedback** (40-50%)
   - Specific areas for improvement
   - Patterns identified
   - Root cause analysis

3. **Support Plan** (20-30%)
   - Training recommendations
   - Process improvements
   - Mentoring opportunities
   - Clear, measurable goals

**Tone:**
- Celebrate wins genuinely
- Frame concerns as growth opportunities
- Acknowledge context and constraints
- Recognize effort and learning

**Avoid:**
- All criticism
- All praise (insincere)
- Vague feedback
- Personal attacks

---

### 5. Actionable Feedback

**Components:**

**Specific:**
- Not: "Improve code quality"
- But: "Add null checks before object dereference (see pattern in PRs #100, #150, #200)"

**Concrete:**
- Include code examples
- Show before/after
- Reference resources

**Measurable:**
- "Reduce production bugs from 8/quarter to 2/quarter"
- "Achieve 80% test coverage on new features"
- "Complete features within estimated timeline 90% of time"

**Supported:**
- Training offered
- Mentoring assigned
- Tools provided
- Pair programming sessions

**Time-Bound:**
- Check-in dates
- Progress reviews
- Timeline for improvement

---

### 6. Root Cause Focus

**Don't just list symptoms:**

**Symptom:** "5 null reference bugs in production"

**Root Cause Analysis:**
- Testing gap? (No unit tests)
- Skill issue? (Doesn't know defensive programming)
- Process issue? (No code review)
- One-time mistake? (New to language)

**Ask:**
- Why did this happen?
- Is there a pattern?
- Individual or systemic?
- Preventable how?

**Examples:**

**Bug Pattern:**
- Symptom: Null reference exceptions
- Root Cause: Skill gap in defensive programming
- Solution: Training + pair programming + code review focus

**Thrashing Pattern:**
- Symptom: Feature added/removed/re-added
- Root Cause: Inadequate requirements analysis
- Solution: Requirements review process + upfront design session

**Timeline Issues:**
- Symptom: Simple task took 3 weeks
- Root Cause: OnCall + 3 P0 incidents
- Solution: Recognize context, not developer issue

---

## Common Pitfalls to Avoid

### Don't Do This

**❌ Count PRs without examining quality**
- 100 PRs of 1-line changes != 10 PRs of significant features

**❌ Judge by lines of code alone**
- Deleting code can be more valuable than adding

**❌ Ignore context**
- OnCall, blockers, learning curve matter

**❌ Blame individuals for systemic issues**
- Process gaps, tooling issues, team problems

**❌ Compare developers directly**
- Different projects, complexities, contexts

**❌ Use second-person language**
- "You did X wrong" is accusatory
- "PR #123 shows X pattern" is objective

### Do This Instead

**✅ Examine actual code changes**
- Look at diffs, design, patterns

**✅ Assess value delivered**
- Business impact, user satisfaction

**✅ Gather context via ask_human**
- Understand blockers, constraints

**✅ Distinguish root causes**
- Individual vs team vs process

**✅ Benchmark against project complexity**
- Adjust for difficulty, novelty

**✅ Use imperative language**
- "Add null checks" not "You need to add"
- "Fix pattern" not "You're doing it wrong"

---

## Review Output Quality Checklist

Before finalizing:

- [ ] Examined actual code diffs (not just messages)
- [ ] Got user feedback via `ask_human` on major features
- [ ] **Presented findings to user and requested assessment (Phase 6)**
- [ ] **Integrated user's business, operational, behavioral feedback**
- [ ] **Updated rating based on combined technical + user input**
- [ ] Identified specific quality issues with code examples
- [ ] Analyzed testing gaps with concrete examples
- [ ] Justified timeline concerns with data
- [ ] Documented positive examples
- [ ] Created actionable recommendations
- [ ] Prepared talking points document
- [ ] Considered context (OnCall, blockers, complexity)
- [ ] Balanced praise with constructive feedback
- [ ] Used evidence-based claims throughout
- [ ] Distinguished individual vs systemic issues
- [ ] Root cause analysis, not just symptoms

---

## Remember the Goal

**Purpose:** Developer growth, not criticism

**A thorough review should:**
- Help the developer improve
- Identify systemic issues for team improvement
- Celebrate achievements genuinely
- Set clear, supportive goals
- Build trust through fairness and specificity

**Balance:**
- Technical analysis (what the code shows)
- Business context (what the impact is)
- Human factors (what the constraints were)
- Growth trajectory (where they're headed)

**Never:**
- Finalize without user validation
- Ignore business context
- Focus only on negatives
- Make assumptions without evidence

**Always:**
- Be evidence-based
- Be context-aware
- Be balanced
- Be actionable
- Be focused on root causes
