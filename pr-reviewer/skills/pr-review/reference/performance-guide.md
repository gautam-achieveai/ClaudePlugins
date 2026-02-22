# Performance Review Guide

## Database Performance

### N+1 Query Problems

**Bad:**
```csharp
var users = _context.Users.ToList();
foreach (var user in users)
{
    var orders = _context.Orders.Where(o => o.UserId == user.Id).ToList(); // N+1!
}
```

**Good:**
```csharp
var users = _context.Users
    .Include(u => u.Orders) // Eager loading
    .ToList();
```

### Missing Indexes

Look for queries on columns without indexes:
- Foreign keys
- Frequently filtered columns
- Join columns

### Unnecessary Eager Loading

**Bad:**
```csharp
var user = _context.Users
    .Include(u => u.Orders)
    .Include(u => u.Addresses)
    .Include(u => u.PaymentMethods)
    .FirstOrDefault(u => u.Id == id); // Loading everything!
```

**Good:**
```csharp
var user = _context.Users
    .FirstOrDefault(u => u.Id == id); // Only what's needed
```

### Large Result Sets Without Pagination

**Bad:**
```csharp
var allUsers = _context.Users.ToList(); // Could be millions!
```

**Good:**
```csharp
var users = _context.Users
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .ToList();
```

## Memory Management

### Memory Leaks

**Bad:**
```csharp
public class Service
{
    private HttpClient _client = new HttpClient(); // Never disposed!
}
```

**Good:**
```csharp
public class Service : IDisposable
{
    private readonly HttpClient _client;

    public Service(IHttpClientFactory factory)
    {
        _client = factory.CreateClient();
    }

    public void Dispose() => _client?.Dispose();
}
```

### Large Object Allocations

**Bad:**
```csharp
string result = "";
for (int i = 0; i < 10000; i++)
{
    result += i.ToString(); // Creates 10000 strings!
}
```

**Good:**
```csharp
var sb = new StringBuilder();
for (int i = 0; i < 10000; i++)
{
    sb.Append(i);
}
string result = sb.ToString();
```

## Algorithm Efficiency

### Poor Time Complexity

**Bad - O(n²):**
```csharp
foreach (var item1 in list1)
{
    foreach (var item2 in list2)
    {
        if (item1.Id == item2.Id) // Nested loop
        {
            // ...
        }
    }
}
```

**Good - O(n):**
```csharp
var dict = list2.ToDictionary(x => x.Id);
foreach (var item1 in list1)
{
    if (dict.TryGetValue(item1.Id, out var item2)) // Hash lookup
    {
        // ...
    }
}
```

### Unnecessary Loops

**Bad:**
```csharp
var count = list.Where(x => x.IsActive).Count();
var items = list.Where(x => x.IsActive).ToList(); // Iterates twice!
```

**Good:**
```csharp
var items = list.Where(x => x.IsActive).ToList();
var count = items.Count; // Use the already-filtered list
```

## Network Performance

### Multiple Sequential API Calls

**Bad:**
```csharp
var user = await _api.GetUser(id);
var orders = await _api.GetOrders(id);
var addresses = await _api.GetAddresses(id); // 3 sequential calls
```

**Good:**
```csharp
var tasks = new[]
{
    _api.GetUser(id),
    _api.GetOrders(id),
    _api.GetAddresses(id)
};
await Task.WhenAll(tasks); // Parallel calls
```

### Missing Caching

**Bad:**
```csharp
public async Task<Config> GetConfig()
{
    return await _api.GetConfig(); // Calls API every time
}
```

**Good:**
```csharp
private static Config _cachedConfig;
private static DateTime _cacheExpiry;

public async Task<Config> GetConfig()
{
    if (_cachedConfig == null || DateTime.UtcNow > _cacheExpiry)
    {
        _cachedConfig = await _api.GetConfig();
        _cacheExpiry = DateTime.UtcNow.AddMinutes(5);
    }
    return _cachedConfig;
}
```

## Performance Review Checklist

- [ ] No N+1 query issues
- [ ] Appropriate use of eager loading
- [ ] Pagination on large datasets
- [ ] IDisposable properly disposed
- [ ] No large object allocations in loops
- [ ] Efficient algorithms (avoid O(n²))
- [ ] API calls parallelized where possible
- [ ] Caching implemented for expensive operations
- [ ] No unnecessary string concatenation
- [ ] No excessive logging in hot paths
