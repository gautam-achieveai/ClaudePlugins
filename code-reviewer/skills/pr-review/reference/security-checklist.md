# Security Checklist for PR Reviews

## OWASP Top 10 Security Issues

### 1. Broken Access Control
**Check for:**
- Missing authorization checks
- Insecure direct object references
- Elevation of privilege

**Example Issues:**
```csharp
// BAD - No authorization check
public IActionResult DeleteUser(int userId)
{
    _userService.Delete(userId); // Anyone can delete any user!
    return Ok();
}

// GOOD - With authorization
[Authorize(Policy = "AdminOnly")]
public IActionResult DeleteUser(int userId)
{
    if (userId == _currentUser.Id || !_currentUser.IsAdmin)
        return Forbid();

    _userService.Delete(userId);
    return Ok();
}
```

### 2. Cryptographic Failures
**Check for:**
- Hardcoded secrets
- Weak encryption
- Sensitive data exposure

**Example Issues:**
```csharp
// BAD - Hardcoded secret
string apiKey = "sk-1234567890abcdef";

// BAD - Weak encryption
var encrypted = Convert.ToBase64String(Encoding.UTF8.GetBytes(password)); // Just encoding!

// GOOD - Use configuration and proper encryption
string apiKey = _configuration["ApiKey"];
var encrypted = _encryptionService.Encrypt(password); // Proper encryption
```

### 3. Injection
**Check for:**
- SQL injection
- Command injection
- XSS (Cross-Site Scripting)

**Example Issues:**
```csharp
// BAD - SQL Injection
string query = $"SELECT * FROM Users WHERE Id = {userId}";

// BAD - XSS
<div>@Html.Raw(userInput)</div>

// GOOD - Parameterized queries
var user = _context.Users.FirstOrDefault(u => u.Id == userId);

// GOOD - Escaped output
<div>@userInput</div>
```

### 4. Insecure Design
**Check for:**
- Missing rate limiting
- No input validation
- Insecure workflows

### 5. Security Misconfiguration
**Check for:**
- Default credentials
- Unnecessary features enabled
- Verbose error messages

### 6. Vulnerable Components
**Check for:**
- Outdated dependencies
- Known vulnerabilities (use `dotnet list package --vulnerable`)
- Unpatched libraries

### 7. Authentication Failures
**Check for:**
- Weak password policy
- No MFA
- Session fixation
- Insecure password storage

### 8. Data Integrity Failures
**Check for:**
- Unverified deserialization
- No integrity checks
- Untrusted data

### 9. Logging Failures
**Check for:**
- Missing audit logs
- Insufficient logging
- Log injection
- Logging sensitive data

### 10. Server-Side Request Forgery (SSRF)
**Check for:**
- Unvalidated URLs
- Internal network access
- Cloud metadata access

## Quick Security Audit

For each PR, ask:
- [ ] Are there any user inputs? Are they validated?
- [ ] Are there any database queries? Are they parameterized?
- [ ] Are there any secrets? Are they in configuration/vault?
- [ ] Are there any authentication checks? Are they proper?
- [ ] Are there any file operations? Are paths validated?
- [ ] Are there any external API calls? Are URLs validated?
- [ ] Are errors logged properly without exposing secrets?
- [ ] Are new dependencies scanned for vulnerabilities?
