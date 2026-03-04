# Testing Assessment Guide

## Test Coverage

### What Should Be Tested

**New Features:**
- Happy path (expected behavior)
- Edge cases (boundaries, nulls, empty)
- Error paths (invalid input, exceptions)
- Integration points (API calls, database)

**Bug Fixes:**
- Regression test for the bug
- Related scenarios

### Coverage Gaps to Identify

```csharp
// Code being reviewed
public decimal CalculateDiscount(User user, decimal amount)
{
    if (user.IsPremium)
        return amount * 0.1m;

    if (amount > 1000)
        return amount * 0.05m;

    return 0;
}

// Missing tests to suggest:
// 1. Premium user with small amount
// 2. Premium user with large amount
// 3. Non-premium user with amount > 1000
// 4. Non-premium user with amount < 1000
// 5. Null user
// 6. Negative amount
// 7. Zero amount
```

## Test Quality

### Good Tests

**Characteristics:**
- Readable (clear Arrange-Act-Assert)
- Tests behavior, not implementation
- Independent (no execution order dependency)
- Fast (no unnecessary waits)
- Reliable (not flaky)

**Example:**
```csharp
[Test]
public void CalculateDiscount_PremiumUser_Returns10PercentDiscount()
{
    // Arrange
    var user = new User { IsPremium = true };
    var amount = 100m;

    // Act
    var discount = _calculator.CalculateDiscount(user, amount);

    // Assert
    Assert.AreEqual(10m, discount);
}
```

### Poor Tests

**Red Flags:**
```csharp
// BAD - Testing implementation
[Test]
public void ProcessOrder_CallsDatabaseSave()
{
    _service.ProcessOrder(order);
    _mockDb.Verify(x => x.Save(It.IsAny<Order>()), Times.Once);
    // What if implementation changes but behavior is same?
}

// GOOD - Testing behavior
[Test]
public void ProcessOrder_OrderIsPersisted()
{
    _service.ProcessOrder(order);
    var saved = _db.Orders.Find(order.Id);
    Assert.IsNotNull(saved);
}

// BAD - Flaky (timing dependent)
[Test]
public async Task SendEmail_EmailSentWithin5Seconds()
{
    await _service.SendEmail(email);
    await Task.Delay(5000);
    Assert.IsTrue(_emailSent); // Might fail on slow machines
}

// BAD - Order dependent
[Test]
public void Test1() { _sharedState = "value"; }

[Test]
public void Test2() { Assert.AreEqual("value", _sharedState); } // Depends on Test1!
```

## Integration Tests

### When Needed

- Critical business flows
- Complex database queries
- API integrations
- Authentication/authorization
- Payment processing

### Example:
```csharp
[Test]
[Category("Integration")]
public async Task CompleteCheckout_ValidOrder_CreatesOrderAndSendsEmail()
{
    // Arrange
    var cart = CreateTestCart();

    // Act
    var result = await _checkoutService.CompleteCheckout(cart);

    // Assert
    var order = await _db.Orders.FindAsync(result.OrderId);
    Assert.IsNotNull(order);
    Assert.AreEqual(OrderStatus.Pending, order.Status);

    var email = _emailService.GetSentEmails().Last();
    Assert.AreEqual(order.CustomerEmail, email.To);
}
```

## Testing Checklist

- [ ] New features have tests
- [ ] Happy path tested
- [ ] Edge cases tested (null, empty, boundaries)
- [ ] Error paths tested (exceptions, invalid input)
- [ ] Integration tests for critical flows
- [ ] Tests are readable (clear AAA pattern)
- [ ] Tests test behavior, not implementation
- [ ] No flaky tests (timing, order dependency)
- [ ] No hardcoded dates/times
- [ ] Appropriate use of mocks
- [ ] Test names are descriptive
- [ ] Fast execution (< 100ms per unit test)

## Common Testing Issues

### Insufficient Coverage
- New code without tests
- Only happy path tested
- Missing edge cases

### Poor Test Quality
- Tests too complex
- Testing private methods
- Too many mocks
- Brittle tests

### Missing Integration Tests
- Complex flows only unit tested
- Database queries not tested end-to-end
- API integrations mocked instead of tested
