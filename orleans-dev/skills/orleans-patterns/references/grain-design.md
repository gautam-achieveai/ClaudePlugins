# Grain Design Rules

## Grain Interface Rules

- All methods MUST return `Task`, `Task<T>`, `ValueTask`, or `ValueTask<T>`.
- Interfaces MUST inherit from a key type: `IGrainWithGuidKey`, `IGrainWithIntegerKey`, `IGrainWithStringKey`, `IGrainWithGuidCompoundKey`, or `IGrainWithIntegerCompoundKey`.
- Choose the key type matching the domain entity's natural identity.
- Support `CancellationToken` as the last parameter.
- Use `[ResponseTimeout("HH:MM:SS")]` on interface methods (not implementations) for per-method timeouts. Default is 30 seconds.

```csharp
public interface IPlayerGrain : IGrainWithGuidKey
{
    Task<IGameGrain> GetCurrentGame(CancellationToken ct = default);
    Task JoinGame(IGameGrain game, CancellationToken ct = default);

    [ResponseTimeout("00:00:05")]
    Task LeaveGame(IGameGrain game, CancellationToken ct = default);
}
```

## Grain Class Rules

- Inherit from `Grain` (or `Grain<TState>`) and implement one or more grain interfaces.
- Use constructor injection for dependencies. Orleans fully supports .NET DI.
- NEVER use static mutable state — shared across all activations on a silo, breaks isolation.
- NEVER use `async void` — crashes the process on unhandled exceptions.

```csharp
public class PlayerGrain : Grain, IPlayerGrain
{
    private readonly ILogger<PlayerGrain> _logger;
    private IGameGrain _currentGame;

    public PlayerGrain(ILogger<PlayerGrain> logger) => _logger = logger;

    public Task<IGameGrain> GetCurrentGame(CancellationToken ct) =>
        Task.FromResult(_currentGame);

    public Task JoinGame(IGameGrain game, CancellationToken ct)
    {
        _currentGame = game;
        return Task.CompletedTask;
    }

    public Task LeaveGame(IGameGrain game, CancellationToken ct)
    {
        _currentGame = null;
        return Task.CompletedTask;
    }
}
```

## Lifecycle

- `OnActivateAsync(CancellationToken)` — initialization (load state, set up timers, subscribe to streams). Throwing here fails activation.
- `OnDeactivateAsync(DeactivationReason, CancellationToken)` — best-effort cleanup only. NOT guaranteed to run (server crash, hard kill). NEVER rely on it for critical persistence.

```csharp
public override async Task OnActivateAsync(CancellationToken ct)
{
    await base.OnActivateAsync(ct);
    // Load external data, set up timers, subscribe to streams
}

public override async Task OnDeactivateAsync(DeactivationReason reason, CancellationToken ct)
{
    // Best-effort only — e.g., flush metrics, close connections
    await base.OnDeactivateAsync(reason, ct);
}
```

## State and Persistence

### Simple — `Grain<TState>`

```csharp
public class UserGrain : Grain<UserState>, IUserGrain
{
    public async Task SetName(string name)
    {
        State.Name = name;
        await WriteStateAsync(); // MUST call after mutation
    }
}

[GenerateSerializer]
public class UserState
{
    [Id(0)] public string Name { get; set; }
}
```

### Advanced — Injected `IPersistentState<T>`

```csharp
public class UserGrain : Grain, IUserGrain
{
    private readonly IPersistentState<UserProfile> _profile;
    private readonly IPersistentState<UserPrefs> _prefs;

    public UserGrain(
        [PersistentState("profile", "ProfileStore")] IPersistentState<UserProfile> profile,
        [PersistentState("prefs", "PrefsStore")] IPersistentState<UserPrefs> prefs)
    {
        _profile = profile;
        _prefs = prefs;
    }
}
```

- State classes MUST have `[GenerateSerializer]` + `[Id]` attributes.
- Forgetting `WriteStateAsync()` means changes are lost on deactivation.
- Storage defaults to Newtonsoft.Json. Be aware of serialization differences when evolving state types.

## Sizing Guidelines

- Model grains around domain entities: one per user, device, order, session, game.
- Prefer many small grains over few large ones — better parallelism and load distribution.
- Merge chatty grains that constantly communicate.
- Avoid "god grains" with too many responsibilities — they become bottlenecks.
- Avoid "hot grains" receiving disproportionate traffic — use aggregator patterns.

## Grain References

```csharp
// Inside a grain
IPlayerGrain player = GrainFactory.GetGrain<IPlayerGrain>(playerId);

// From a client
IPlayerGrain player = client.GetGrain<IPlayerGrain>(playerId);

// Pass self to another grain
await room.OnJoinRoom(this.AsReference<IUserGrain>());
```

- Getting a reference is local — does NOT activate the grain. Only calling a method does.
- References are serializable — can be passed as arguments, returned, or stored in state.
- Use `this.AsReference<IMyGrain>()` to pass self. NEVER pass `this` directly.

## Return Value Patterns

```csharp
// Non-async void-equivalent
public Task MyMethod() => Task.CompletedTask;

// Non-async with value
public Task<int> GetCount() => Task.FromResult(_count);

// Async
public async Task<SomeType> GetDataAsync() => await FetchAsync();

// Streaming large results
public async IAsyncEnumerable<DataItem> GetAllItemsAsync()
{
    for (int i = 0; i < 1000; i++)
        yield return await FetchItemAsync(i);
}
```

- NEVER use `async void` — crashes the process on unhandled exceptions.

## Anti-Patterns

| Pattern | Severity | Why |
|---------|----------|-----|
| Interface methods with non-Task return types | Critical | Won't compile / breaks Orleans contract |
| Missing `[GenerateSerializer]` on state classes | Critical | State won't persist correctly |
| Static mutable fields in grain classes | Critical | Shared across activations, breaks isolation |
| `OnDeactivateAsync` for critical persistence | Warning | Not guaranteed to run |
| Missing `WriteStateAsync()` after mutation | Warning | Changes lost on deactivation |
| `async void` methods | Critical | Crashes process on exception |
| God grains (many responsibilities) | Info | Bottleneck, hard to maintain |
| Passing `this` instead of `AsReference<T>()` | Critical | Breaks grain reference semantics |
