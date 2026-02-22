# Pattern Catalog for Developer Reviews

## Thrashing Patterns

### Description
Repeatedly adding and removing code, indicating uncertainty or lack of planning.

### Examples

**Feature Thrashing:**
- PR #123: Added feature X
- PR #125: Removed feature X
- PR #130: Re-added feature X differently

**Production Debugging:**
- PR #200: Added extensive logging to Class A
- PR #202: Removed all logging from Class A
- Indicates debugging in production rather than local/test environments

**Location Thrashing:**
- PR #300: Implemented logic in Controller
- PR #302: Moved logic to Service
- PR #305: Moved logic to Helper class
- Indicates poor initial design decisions

### What It Reveals
- Incomplete requirements analysis
- Lack of upfront design
- Unclear architecture understanding
- Inadequate testing before production

---

## Missed Cases Patterns

### Description
Features that repeatedly need bug fixes for unhandled scenarios.

### Examples

**Authentication Feature:**
- PR #400: Add user authentication
- Bug #401: Handle null username
- Bug #403: Handle empty password
- Bug #405: Handle SQL injection
- Bug #410: Handle session timeout
- **Pattern**: Incomplete scenario mapping upfront

**Payment Processing:**
- PR #500: Add payment flow
- Bug #501: Handle declined cards
- Bug #503: Handle network timeouts
- Bug #505: Handle duplicate charges
- **Pattern**: Missing error path analysis

### What It Reveals
- Inadequate requirements analysis
- Missing edge case consideration
- Insufficient testing
- Reactive rather than proactive development

---

## Quality Patterns

### Description
Recurring bugs of the same type across different PRs.

### Examples

**Null Reference Bugs:**
- Bug in PR #100: NullReferenceException in UserService
- Bug in PR #150: NullReferenceException in OrderService
- Bug in PR #200: NullReferenceException in PaymentService
- **Pattern**: Not practicing defensive programming

**Serialization Issues:**
- Bug in PR #220: JSON serialization fails for DateTime
- Bug in PR #230: JSON serialization fails for decimal
- Bug in PR #240: JSON serialization fails for enum
- **Pattern**: Not understanding serialization properly

**Copy-Paste Errors:**
- Bug in PR #300: Wrong variable name in copied code
- Bug in PR #320: Wrong constant in copied code
- **Pattern**: Code duplication instead of abstraction

### What It Reveals
- Skill gaps in specific areas
- Not learning from previous mistakes
- Lack of code review effectiveness
- Need for specific training

---

## Design Anti-Patterns

### Description
Architectural issues that create maintenance problems.

### Examples

**Business Logic in UI:**
```csharp
// Found in multiple PRs
public class UserController
{
    public IActionResult Create(UserDto dto)
    {
        // Validation
        if (string.IsNullOrEmpty(dto.Email)) return BadRequest();

        // Business logic
        var user = new User { Email = dto.Email };

        // Data access
        _context.Users.Add(user);
        _context.SaveChanges();

        // Integration
        _emailService.Send(user.Email, "Welcome!");

        return Ok();
    }
}
```
**Pattern**: Tight coupling, hard to test, violates separation of concerns

**Tight Coupling to Infrastructure:**
```csharp
// Found repeatedly
public class OrderService
{
    public void ProcessOrder(Order order)
    {
        var connection = new SqlConnection("connection string");
        var command = new SqlCommand("INSERT INTO...", connection);
        // Direct database access
    }
}
```
**Pattern**: Hard to test, database-dependent, can't swap implementations

**Not Designed for Reusability:**
```csharp
// Feature-specific, hardcoded
public void ProcessUserOrder(User user, Order order)
{
    if (user.Type == "Premium")
    {
        order.Discount = 10;
    }
    // Logic tightly coupled to specific use case
}
```
**Pattern**: Code duplication when similar needs arise

### What It Reveals
- Lack of design pattern knowledge
- Focus on "working" over "maintainable"
- Insufficient architecture guidance
- Need for design review process

---

## Time-to-Value Issues

### Description
Work taking disproportionately long relative to complexity.

### Examples

**Simple Feature, Long Timeline:**
- PR #600: Add "Email Verification" link to profile page
  - Lines changed: +12 -0
  - Time taken: 3 weeks
  - **Issue**: Simple UI change shouldn't take 3 weeks

**Context Switching:**
- 5 PRs started, none completed for weeks
- Multiple OnCall interruptions
- **Issue**: May not be developer's fault - systemic

**Blocked Work:**
- PR in draft for 2 months waiting for dependency team
- **Issue**: External blocker, not developer issue

### What It Reveals
- Developer productivity
- Blockers and obstacles
- Context switching impact
- Need to distinguish individual vs systemic issues

---

## Bug Response Patterns

### Description
How quickly and thoroughly bugs are addressed.

### Examples

**Good Pattern:**
- Bug reported: Monday 9am
- Fix PR created: Monday 11am
- Tests added: Monday 2pm
- Fix deployed: Monday 4pm
- **Shows**: Responsive, thorough, well-tested

**Poor Pattern:**
- Bug reported: Week 1
- Quick fix PR: Week 2 (band-aid solution)
- Bug reopened: Week 3 (fix didn't work)
- Proper fix: Week 4
- **Shows**: Rushed fixes, insufficient testing

**Recurring Bugs:**
- Same bug fixed 3 times in different ways
- Indicates not understanding root cause

### What It Reveals
- Problem-solving approach
- Testing thoroughness
- Root cause analysis skills
- Quick fix vs proper fix mindset

---

## How to Use This Catalog

1. **During Code Analysis**: Look for these patterns across PRs
2. **Document Instances**: Note specific PR numbers and examples
3. **Quantify**: How many instances of each pattern?
4. **Distinguish**: Individual skill gap vs systemic/team issue
5. **Evidence-Based**: Use concrete examples, not assumptions
6. **Context-Aware**: Consider OnCall, blockers, learning curve
7. **Actionable**: Translate patterns into specific training needs
