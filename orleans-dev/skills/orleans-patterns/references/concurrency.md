# Concurrency and Threading Rules

## Single-Threaded Execution Model

- Each grain processes one request at a time, beginning to completion, before the next (by default).
- Grain code NEVER runs in parallel — even with reentrancy, only one thread executes at a time.
- At `await` points, execution yields but no other request starts (unless reentrancy is enabled).
- NO locks, mutexes, or synchronization primitives are needed for grain state.
- You CAN freely read/write grain fields without race conditions (in non-reentrant grains).

## Reentrancy Options

| Mechanism | Scope | When to Use |
|---|---|---|
| `[Reentrant]` | All methods on the grain class | Grain is stateless or interleaving is universally safe |
| `[AlwaysInterleave]` | Single interface method | Method is safe to interleave with everything |
| `[ReadOnly]` | Single interface method | Method does not modify grain state |
| `AllowCallChainReentrancy()` | Current call site (scoped) | Specific call-back cycle needs to be allowed |
| `[MayInterleave(predicate)]` | Per-request runtime decision | Interleaving safety depends on request content |

### `[Reentrant]` — Grain-Level

```csharp
[Reentrant]
public class MyGrain : Grain, IMyGrain
{
    public async Task Foo()
    {
        await task1;    // another request can start here
        DoSomething();  // still single-threaded, but interleaved
    }
}
```

- ALL requests may interleave at any `await` point.
- WARNING: State can change between `await` points from other requests. Reason about intermediate state carefully.

### `[AlwaysInterleave]` — Method-Level

```csharp
public interface IMyGrain : IGrainWithIntegerKey
{
    Task MutateState();

    [AlwaysInterleave]
    Task<int> GetStatus();
}
```

- This method interleaves with ALL requests, including non-interleaving methods.

### `[ReadOnly]` — Read-Only Methods

```csharp
public interface IMyGrain : IGrainWithIntegerKey
{
    Task<int> IncrementCount(int amount);

    [ReadOnly]
    Task<int> GetCount();
}
```

- Multiple `[ReadOnly]` requests execute concurrently.
- Does NOT interleave with non-ReadOnly requests (unlike `[AlwaysInterleave]`).

### Call Chain Reentrancy — Scoped

```csharp
public async ValueTask JoinRoom(string roomName)
{
    using var scope = RequestContext.AllowCallChainReentrancy();
    var room = GrainFactory.GetGrain<IChatRoomGrain>(roomName);
    await room.OnJoinRoom(this.AsReference<IUserGrain>());
    // room can now call back into this grain without deadlocking
}
```

- Only grains further down THIS call chain can call back.
- Scope is disposed automatically, ending the reentrancy window.
- Most fine-grained control — prefer this over `[Reentrant]`.

### `[MayInterleave]` — Predicate-Based

```csharp
[MayInterleave(nameof(ShouldInterleave))]
public class MyGrain : Grain, IMyGrain
{
    public static bool ShouldInterleave(IInvokable req)
    {
        return req.Arguments.Length == 1
            && req.Arguments[0]?.GetType()
                    .GetCustomAttribute<InterleaveAttribute>() != null;
    }
}
```

## Deadlocks

### Classic Deadlock Pattern

```
Grain A calls Grain B → B calls back to A → DEADLOCK
Both grains are "busy" waiting for each other. Orleans times out after 30s.
```

```csharp
// This can deadlock!
await Task.WhenAll(a.CallOther(b), b.CallOther(a));
```

### Prevention Strategies

1. **Avoid cycles** in grain call graphs (best approach).
2. Use `[Reentrant]` on grains that participate in cycles.
3. Use `AllowCallChainReentrancy()` at the call site initiating the potential cycle.
4. Use `[AlwaysInterleave]` on specific methods safe to interleave.
5. Use `[ReadOnly]` on methods that don't modify state.

## Task Scheduling Rules

### Stays in Grain Context (respects grain scheduler)

- `await`
- `Task.Delay`
- `Task.WhenAll`, `Task.WhenAny`
- `Task.Factory.StartNew` (default scheduler)
- `Task.ContinueWith` (default scheduler)

### Escapes Grain Context (runs on .NET ThreadPool)

- `Task.Run` — always uses `TaskScheduler.Default`
- `ConfigureAwait(false)` — explicitly escapes
- `Task.Factory.FromAsync` endMethod delegate

### Safe Pattern — Offload Then Return

```csharp
public async Task MyGrainMethod()
{
    var input = State.Data;                          // grain context — safe
    var result = await Task.Run(() => Heavy(input)); // ThreadPool — no grain state!
    State.Result = result;                           // grain context again — safe
    await WriteStateAsync();
}
```

### Async Work in Grain Context

```csharp
// MUST use Unwrap() for async delegates with StartNew
var task = Task.Factory.StartNew(async () =>
{
    await SomeAsyncWork(); // runs in grain context
}).Unwrap();
```

### Making Grain Calls from ThreadPool

```csharp
public async Task MyGrainMethod()
{
    var fooGrain = GrainFactory.GetGrain<IFooGrain>(0);
    int result = await Task.Run(async () =>
    {
        // On ThreadPool — grain calls work fine from here
        return await fooGrain.MakeGrainCall();
        // Continuation stays on ThreadPool (not grain context)
    });
    // Back in grain context after outer await
}
```

### Libraries Using ConfigureAwait(false)

This is fine. Library code runs on ThreadPool internally, but after `await` in your grain code, you return to the grain context. No special handling needed.

## NEVER Do These in Grain Code

| Forbidden | Why | Fix |
|-----------|-----|-----|
| `task.Wait()` | Deadlocks the grain | Use `await task` |
| `task.Result` | Deadlocks the grain | Use `await task` |
| `task.GetAwaiter().GetResult()` | Deadlocks the grain | Use `await task` |
| `ConfigureAwait(false)` | Breaks single-threaded guarantee | Remove it (fine in libraries) |
| `async void` | Crashes process on exception | Use `async Task` |
| `Thread.Sleep` | Blocks the grain thread | Use `await Task.Delay` |
| `lock` / `Mutex` / `Semaphore` / `Monitor` | Unnecessary, can deadlock | Remove — single-threaded model handles it |
| Access grain state in `Task.Run` | Outside grain context, no thread-safety | Copy data before `Task.Run`, write back after `await` |
| `Task.Factory.StartNew(async)` without `.Unwrap()` | Returns `Task<Task>`, not awaiting inner task | Add `.Unwrap()` |

## Anti-Patterns

| Pattern | Severity | Why |
|---------|----------|-----|
| `.Wait()`, `.Result`, `.GetAwaiter().GetResult()` | Critical | Deadlocks grain |
| `ConfigureAwait(false)` in grain code | Critical | Breaks threading guarantee |
| `async void` | Critical | Crashes process |
| `Thread.Sleep` | Critical | Blocks grain thread |
| `lock`/`Mutex`/`Semaphore` in grains | Warning | Unnecessary, can deadlock |
| Grain state accessed inside `Task.Run` | Critical | Race condition, no thread-safety |
| Missing `.Unwrap()` on `StartNew` with async delegate | Warning | Inner task not awaited |
| Cyclic calls without reentrancy | Warning | Potential deadlock |
| `[Reentrant]` on grain with complex mutable state | Info | Risk of interleaving bugs |
