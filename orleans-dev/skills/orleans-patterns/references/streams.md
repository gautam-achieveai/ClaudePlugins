# Orleans Streams Rules

## Core Concepts

- Streams are virtual — always logically exist. Getting a handle is a local operation.
- Multiple producers and multiple consumers supported.
- Subscriptions are durable — survive grain deactivation and reactivation.
- `IAsyncStream<T>` implements both `IAsyncObserver<T>` (producing) and `IAsyncObservable<T>` (consuming).

## Getting a Stream Handle

```csharp
// Inside a grain
IStreamProvider provider = this.GetStreamProvider("MyProvider");
StreamId streamId = StreamId.Create("MyNamespace", this.GetPrimaryKey());
IAsyncStream<MyEvent> stream = provider.GetStream<MyEvent>(streamId);

// From a client
IStreamProvider provider = client.GetStreamProvider("MyProvider");
IAsyncStream<MyEvent> stream = provider.GetStream<MyEvent>(streamId);
```

- Stream identity = namespace (string) + key (GUID), forming a `StreamId`.
- Getting a handle does NOT create resources or make network calls.

## Producing Events

```csharp
await stream.OnNextAsync(myEvent);       // send an event
await stream.OnCompletedAsync();          // signal stream completion
await stream.OnErrorAsync(exception);     // signal an error
```

- If the producer dies, it just gets a new handle and continues. No special recovery needed.
- ALWAYS await `OnNextAsync` for FIFO ordering guarantees.

## Explicit Subscriptions

### Subscribing

```csharp
StreamSubscriptionHandle<MyEvent> handle = await stream.SubscribeAsync(
    onNextAsync: (evt, token) =>
    {
        // Process event
        return Task.CompletedTask;
    },
    onErrorAsync: ex =>
    {
        // Handle error
        return Task.CompletedTask;
    },
    onCompletedAsync: () =>
    {
        // Handle completion
        return Task.CompletedTask;
    }
);
```

### Unsubscribing

```csharp
await handle.UnsubscribeAsync();
```

### Recovery on Reactivation — CRITICAL

Subscriptions are durable but processing logic is not. On reactivation, re-attach handlers:

```csharp
public override async Task OnActivateAsync(CancellationToken ct)
{
    var provider = this.GetStreamProvider("MyProvider");
    var stream = provider.GetStream<MyEvent>(
        StreamId.Create("MyNamespace", this.GetPrimaryKey()));

    var handles = await stream.GetAllSubscriptionHandles();
    foreach (var handle in handles)
    {
        await handle.ResumeAsync(
            onNextAsync: (evt, token) => { /* process */ return Task.CompletedTask; }
        );
    }
}
```

- If you don't `ResumeAsync` in `OnActivateAsync`, the grain is still subscribed but events are **silently dropped**.
- Call `GetAllSubscriptionHandles()` to discover all active subscriptions.
- Call `ResumeAsync` to re-attach processing logic.
- Call `UnsubscribeAsync` on handles you no longer need.

### Avoiding Duplicate Subscriptions

```csharp
// Check before subscribing
var handles = await stream.GetAllSubscriptionHandles();
if (handles.Count == 0)
    await stream.SubscribeAsync(onNextAsync: ...);
else
    foreach (var h in handles)
        await h.ResumeAsync(onNextAsync: ...);
```

## Implicit Subscriptions

Grains are automatically subscribed based on identity and namespace attribute:

```csharp
[ImplicitStreamSubscription("ChatMessages")]
public class ChatListenerGrain : Grain, IAsyncObserver<string>, IStreamSubscriptionObserver
{
    public async Task OnSubscribed(IStreamSubscriptionHandleFactory handleFactory)
    {
        var handle = handleFactory.Create<string>();
        await handle.ResumeAsync(this);
    }

    public Task OnNextAsync(string item, StreamSequenceToken? token = null)
    {
        // Process the event
        return Task.CompletedTask;
    }

    public Task OnCompletedAsync() => Task.CompletedTask;
    public Task OnErrorAsync(Exception ex) => Task.CompletedTask;
}
```

- Stream `<GUID-X, "ChatMessages">` auto-delivers to grain `<GUID-X, ChatListenerGrain>`.
- Grain is activated automatically when events arrive.
- Cannot unsubscribe — permanent for the grain identity.
- Exactly one subscription per grain per namespace (no multiplicity).
- Grain MUST still attach processing logic via `OnSubscribed`.

## Implicit vs Explicit Comparison

| Feature | Implicit | Explicit |
|---|---|---|
| Creation | Automatic (attribute) | Manual (`SubscribeAsync`) |
| Unsubscribe | Not possible | `UnsubscribeAsync()` |
| Multiple subscriptions | No (exactly one) | Yes |
| Recovery | `OnSubscribed` | `GetAllSubscriptionHandles` + `ResumeAsync` |
| Activates grain on event | Yes | No |
| Producer needs to know consumer | No | Typically yes |

## Stream Providers

| Provider | Durability | Ordering | Rewindable |
|---|---|---|---|
| MemoryStreams | None | FIFO | No |
| Azure Queue Streams | Durable | FIFO only failure-free | No |
| Event Hub Streams | Durable | Partition-level | Yes |

### Configuration

```csharp
siloBuilder
    .AddMemoryStreams("MyStreamProvider")
    .AddAzureTableGrainStorage("PubSubStore", options => ...);
```

- ALWAYS configure a `PubSubStore` storage provider for subscription tracking.
- For production, use durable storage. For dev, memory is fine.

## Delivery Semantics

- Events delivered one at a time per consumer (or limited batches).
- Runtime awaits each delivery before sending the next — backpressure built in.
- SMS with `FireAndForgetDelivery = false` (default): FIFO if producer awaits `OnNextAsync`.
- Azure Queue: FIFO only in failure-free execution.

## IAsyncEnumerable vs Streams

| Feature | `IAsyncEnumerable<T>` | Orleans Streams |
|---|---|---|
| Pattern | Request-response (pull) | Pub-sub (push) |
| Lifetime | Single call | Persistent subscriptions |
| Direction | Grain to caller only | Any to any |
| Backpressure | Built-in | Provider-dependent |
| Multiple consumers | No | Yes |

Use `IAsyncEnumerable<T>` for pull-based query results. Use Streams for push-based event distribution.

## Anti-Patterns

| Pattern | Severity | Why |
|---------|----------|-----|
| Missing `ResumeAsync` in `OnActivateAsync` | Critical | Events silently dropped after reactivation |
| Missing `OnSubscribed` for implicit subscriptions | Critical | Events silently dropped |
| No `PubSubStore` configured | Critical | Subscriptions not tracked |
| Not awaiting `OnNextAsync` | Warning | Breaks FIFO ordering |
| Not implementing `OnErrorAsync` | Warning | Errors silently swallowed |
| Subscribing without checking existing handles | Warning | Duplicate event delivery |
| Using streams for request-response | Info | Use direct calls or `IAsyncEnumerable` instead |
| Trying to unsubscribe from implicit subscription | Info | Not possible — redesign |
