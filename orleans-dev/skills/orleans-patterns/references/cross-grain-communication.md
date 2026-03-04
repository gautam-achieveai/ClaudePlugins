# Cross-Grain Communication Rules

## Calling Patterns

```csharp
var other = GrainFactory.GetGrain<IOtherGrain>(42);
var result = await other.SomeMethod(arg1, arg2);
```

- All grain calls are asynchronous. Always `await` the result.
- Calls involve serialization + network + deserialization — much more expensive than local method calls.
- Default timeout is 30 seconds. Use `[ResponseTimeout]` on the interface method to customize.

## Fan-Out Pattern

Call multiple grains in parallel:

```csharp
var tasks = new List<Task>();
foreach (var subscriber in subscribers)
    tasks.Add(subscriber.Notify(message));
await Task.WhenAll(tasks);
```

Or with LINQ:

```csharp
await Task.WhenAll(subscribers.Select(s => s.Notify(message)));
```

- Efficient: each target grain processes independently.
- Mind the degree — thousands of simultaneous calls create memory pressure from in-flight tasks.

## Passing Self-References

```csharp
public async Task JoinRoom(string roomName)
{
    var room = GrainFactory.GetGrain<IChatRoomGrain>(roomName);
    await room.OnJoinRoom(this.AsReference<IUserGrain>());
}
```

- Use `this.AsReference<T>()` — NEVER pass `this` directly.
- `AsReference<T>()` returns a grain reference proxy, not the activation instance.

## Observer / Callback Pattern

```csharp
// Publisher grain
public interface IPublisherGrain : IGrainWithStringKey
{
    Task Subscribe(ISubscriberGrain subscriber);
    Task Unsubscribe(ISubscriberGrain subscriber);
}

// Subscriber grain
public interface ISubscriberGrain : IGrainWithStringKey
{
    Task OnEvent(EventData data);
}
```

- Publisher stores grain references and calls subscribers on events.
- Grain references survive deactivation — calling a deactivated grain reactivates it.
- Consider using Orleans Streams instead for complex pub/sub.

## Aggregator Pattern — Avoiding Hot Grains

Problem: A single grain receiving millions of requests (e.g., a global counter).

Solution: Intermediate aggregator grains:

```
Reporters → Aggregator[0..N] → Global Grain
```

```csharp
// Reporter picks an aggregator by hashing
var aggregatorId = reporterId % NumberOfAggregators;
var aggregator = GrainFactory.GetGrain<IAggregatorGrain>(aggregatorId);
await aggregator.ReportValue(value);

// Aggregator periodically flushes to global grain
public class AggregatorGrain : Grain, IAggregatorGrain
{
    private int _accumulated;

    public Task ReportValue(int value)
    {
        _accumulated += value;
        return Task.CompletedTask;
    }

    // Timer-based flush to global grain
    private async Task Flush(object _)
    {
        var global = GrainFactory.GetGrain<IGlobalGrain>(0);
        await global.AddToTotal(_accumulated);
        _accumulated = 0;
    }
}
```

## Error Propagation

- Exceptions thrown by grain methods propagate back to the caller across network boundaries.
- Exceptions must be serializable. Unknown types become `UnavailableExceptionFallbackException` (preserving message, type name, and stack trace).
- Exceptions do NOT deactivate grains, except `InconsistentStateException` (from storage detecting state inconsistency).
- Handle `TimeoutException` on critical cross-grain calls.

## Best Practices

- **Avoid chatty communication**: Merge grains that exchange many small messages per operation.
- **Prefer coarse-grained messages**: `GetProfile()` returning all data, not `GetName()` + `GetAge()` + `GetEmail()` separately.
- **Avoid cycles**: A → B → A deadlocks without reentrancy.
- **Handle `TimeoutException`** on critical paths.
- **Use `this.AsReference<T>()`** — never pass `this`.
- **Cache grain references** in fields — creating is cheap but avoids repeated dictionary lookups.

## Anti-Patterns

| Pattern | Severity | Why |
|---------|----------|-----|
| Chatty grain-to-grain communication | Warning | Network overhead, latency, contention |
| Request-per-field patterns | Warning | Multiple round-trips instead of one |
| Passing `this` instead of `AsReference<T>()` | Critical | Breaks grain reference semantics |
| Single grain receiving all traffic | Warning | Bottleneck, single point of failure |
| Cyclic call graphs without reentrancy | Warning | Potential deadlock |
| `.Result` / `.Wait()` on grain calls | Critical | Deadlocks the calling grain |
| Storing grain class instances in state | Critical | Not serializable, wrong reference type |
| Not handling `TimeoutException` on critical calls | Info | Silent failures under load |
