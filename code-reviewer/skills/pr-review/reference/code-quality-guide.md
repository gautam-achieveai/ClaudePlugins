# Code Quality Review Guide

## Design & Architecture

### SOLID Principles

**Single Responsibility:**
```csharp
// BAD - Multiple responsibilities
public class UserService
{
    public void CreateUser() { }
    public void SendEmail() { }
    public void LogActivity() { }
    public void ProcessPayment() { }
}

// GOOD - Single responsibility
public class UserService { public void CreateUser() { } }
public class EmailService { public void SendEmail() { } }
public class AuditService { public void LogActivity() { } }
public class PaymentService { public void ProcessPayment() { } }
```

**Separation of Concerns:**
```csharp
// BAD - Business logic in UI
public class UserController
{
    public IActionResult Create(UserDto dto)
    {
        if (string.IsNullOrEmpty(dto.Email)) return BadRequest();
        var user = new User { Email = dto.Email };
        _context.Users.Add(user);
        _context.SaveChanges();
        _emailService.Send(user.Email, "Welcome!");
        return Ok();
    }
}

// GOOD - Business logic in service
public class UserController
{
    public IActionResult Create(UserDto dto)
    {
        var result = _userService.CreateUser(dto);
        return result.Success ? Ok() : BadRequest(result.Error);
    }
}
```

## Code Smells

### Duplicated Code

**Detection:** Look for copy-pasted code blocks

**Fix:** Extract to shared method/class

### Long Methods

**Detection:** Methods > 50 lines

**Fix:** Break into smaller, focused methods

### Too Many Parameters

**Detection:** Methods with > 5 parameters

**Fix:** Use parameter object

```csharp
// BAD
public void CreateUser(string firstName, string lastName, string email,
    string phone, string address, string city, string state, string zip)

// GOOD
public void CreateUser(UserData userData)
```

### Magic Numbers

**Detection:** Hardcoded numbers without explanation

**Fix:** Use named constants

```csharp
// BAD
if (users.Count > 100) { }

// GOOD
const int MAX_BULK_USERS = 100;
if (users.Count > MAX_BULK_USERS) { }
```

### God Classes

**Detection:** Classes > 500 lines or doing too much

**Fix:** Split responsibilities

## Best Practices

### Naming Conventions

**Classes:** PascalCase, nouns
**Methods:** PascalCase, verbs
**Variables:** camelCase, descriptive
**Constants:** UPPER_CASE or PascalCase
**Booleans:** is/has/can prefix

```csharp
// GOOD
public class UserValidator
{
    private const int MaxNameLength = 50;

    public bool IsValid(User user)
    {
        return ValidateName(user.Name);
    }

    private bool ValidateName(string name)
    {
        return !string.IsNullOrEmpty(name) && name.Length <= MaxNameLength;
    }
}
```

### Error Handling

**BAD:**
```csharp
try
{
    DoSomething();
}
catch (Exception)
{
    // Swallow exception!
}
```

**GOOD:**
```csharp
try
{
    DoSomething();
}
catch (SpecificException ex)
{
    _logger.LogError(ex, "Failed to do something");
    throw; // Re-throw or handle properly
}
```

### Defensive Programming

```csharp
public void ProcessUser(User user)
{
    if (user == null)
        throw new ArgumentNullException(nameof(user));

    if (string.IsNullOrEmpty(user.Email))
        throw new ArgumentException("Email is required", nameof(user));

    // Process user
}
```

## Code Quality Checklist

- [ ] SOLID principles followed
- [ ] Business logic separated from UI/infrastructure
- [ ] No duplicated code
- [ ] Methods < 50 lines
- [ ] Classes < 500 lines
- [ ] < 5 parameters per method
- [ ] No magic numbers
- [ ] Clear, descriptive naming
- [ ] Proper error handling
- [ ] Defensive programming (null checks, validation)
- [ ] No empty catch blocks
- [ ] Code is self-documenting
- [ ] Comments explain why, not what
