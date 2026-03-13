# Promise / Task / Async Patterns

NScript uses `Promise<T>` (from `System` namespace, mapped to native JS `Promise`) for async operations, NOT `Task<T>`. The `[AsyncMethodBuilder(typeof(PromiseBuilder))]` attribute on `Promise` makes `async`/`await` work natively. The compiler emits `async function` in JS for methods returning `Promise<T>`.

**Correct patterns (from codebase):**

Async method returning Promise:
```csharp
public async Promise<bool> OnClickUpload() { ... }
```

`async void` for fire-and-forget event handlers:
```csharp
public async void GenerateEquationsForCurrentQues() { ... }
```

Promise chaining with `.Then()`:
```csharp
return Word.Run<T>(ctx => { ... })
    .Then(rc => { ctx.Load(rc); return ctx.Sync(rc); })
    .Then(rc => { ... });
```

Wrapping synchronous values:
```csharp
return Promise.Resolve(rv);
return Promise.Resolve<object>(null);
```

Parallel promise execution (use `PromiseUtils.WhenAll`, NOT `Task.WhenAll`):
```csharp
// Returns Tupl<T, U> — NScript's tuple type
PromiseUtils.WhenAll(promiseT, promiseU)
```

Delay (use `PromiseUtils.Delay`, NOT `Task.Delay`):
```csharp
await PromiseUtils.Delay(500);
// Internally: new Promise((resolve, reject) => _ = Globals.SetTimeout(() => resolve(), ms))
```

`LazyAsync<T>` — deferred async service (extends `Lazy<Promise<T>>`, is itself awaitable via `GetAwaiter()`):
```csharp
// Registration:
new LazyAsync<ProblemAccessService>(Promise.Resolve(rv.Resolve<ProblemAccessService>()))
// Usage — can be directly awaited:
var svc = await _lazyProblemService;
```

Awaiting array of promises:
```csharp
// NativeArray<Promise<T>> has GetAwaiter extension → await directly
var results = await promiseArray;
```

**What to flag:**

- `Task<T>` return types in NScript code — should be `Promise<T>` (except `async Task` used for `Type.AS<Promise<bool>, Task<bool>>()` interop) (CRITICAL)
- `.Result`, `.Wait()`, or synchronous blocking on Promises (CRITICAL)
- `await` on non-Promise types — NScript only supports awaiting `Promise`/`Task`/`LazyAsync<T>`/`NativeArray<Promise<T>>` (HIGH)
- `.Then()` callbacks that don't handle errors (MEDIUM)
- `Task.WhenAll` instead of `PromiseUtils.WhenAll` or `Promise.All` (CRITICAL)
- `Task.Delay` instead of `PromiseUtils.Delay` (CRITICAL)
- Using `ValueTuple` returns from async methods — use `Tupl<T, U>` instead (CRITICAL)

**What NOT to flag (correct NScript patterns):**

- `async void` — this IS the correct fire-and-forget pattern in NScript
- `_ = promise.Then(...)` — correct discard pattern for fire-and-forget
- `Promise.Resolve<T>(value)` — correct pattern for synchronous/immediate results
- `LazyAsync<T>` — correct pattern for deferred async service initialization
- `Type.AS<Promise<bool>, Task<bool>>(...)` — correct interop cast pattern
