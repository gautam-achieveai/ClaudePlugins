# IoC / Dependency Injection

NScript apps use a custom `IocContainer` (from `Sunlight.Framework`) with runtime resolution via `TypeId` string keys backed by `StringDictionary<TypeRegistry>`. Misconfigured registrations cause runtime failures. The container has built-in cycle detection (throws after 100 resolution depth).

**Standard bootstrap pattern:**

Entry point (`Program.cs`):
```csharp
[EntryPoint]
public static void Main()
{
    McqDbApp.RealMainApp(new Lazy<IocContainer>(AppConfiguration.GetConfiguration));
}
```

Configuration (`AppConfiguration.cs`) chains extension methods:
```csharp
public static IocContainer GetConfiguration()
{
    IocContainer rv = new IocContainer()
        .RegisterServices()
        .RegisterTestVMs()
        .RegisterNavigationStuff(new string[] { WorkoutHomeViewModel.PageUrl, ... })
        .RegisterNavigationServices()
        .RegisterPremiumAndContribution(...);
    // Page URL routing:
    rootUrlToPageVM.Add(GradePageVM.PageUrl, () => rv.Resolve<GradePageVM>());
    return rv;
}
```

Registration extension methods (`IocRegistrations.cs`):
```csharp
public static class IocRegistrations
{
    public static IocContainer RegisterServices(this IocContainer rv) { ... }
    public static IocContainer RegisterTestVMs(this IocContainer rv) { ... }
}
```

**Registration patterns:**

```csharp
// Singleton with dependencies
rv.Register(() => new ClarityService(
        rv.Resolve<DataService>(),
        rv.Resolve<EventBus>(),
        rv.Resolve<LoggerFactory>()))
    .IsSingleton();

// Interface alias
rv.Register(() => new UserInfoApiService(rv.Resolve<DataService>(), endpoint))
    .As<IUserInfoApiService>()
    .IsSingleton();

// Transient (no .IsSingleton())
rv.Register(() => new TableCache());
```

**Resolution patterns:**

```csharp
rv.Resolve<T>()           // throws if not registered
rv.TryResolve<T>()        // returns null if not registered
rv.ResolveAsync<T>()      // returns LazyAsync<T>
rv.TryResolveAsync<T>()   // returns nullable LazyAsync<T>
rv.ResolveLazy<T>()       // returns Lazy<T>
rv.TryResolveLazy<T>()    // returns nullable Lazy<T>
rv.ResolveFactory<T>()    // returns Factory<T>
```

**What to flag:**

- `rv.Register(() => new Service(...))` where constructor dependencies are not resolved via `rv.Resolve<T>()` (CRITICAL)
- Services marked `.IsSingleton()` that are mutable but not `ObservableObject` — must be stateless or thread-safe (HIGH)
- `.As<IInterface>()` where the concrete class doesn't implement that interface (CRITICAL)
- `rv.Resolve<T>()` called for a type not registered in any `AppConfiguration` or `IocRegistrations` (CRITICAL)
- Services registered but never `Resolve`d anywhere (LOW)
- Expensive services (DB, network) eagerly resolved instead of using `LazyAsync<T>` or `Lazy<T>` (MEDIUM)
- New registrations missing from relevant app-specific `AppConfiguration.cs` files — each app (NeetPG, CFA, CSEET, CFP, etc.) has its own config (HIGH)
- Registrations not grouped in extension methods on `IocContainer` (e.g., `RegisterServices()`, `RegisterCommonViewModels()`) (LOW)
- Missing page URL routing: new `PageVM` subclass without `rootUrlToPageVM.Add(MyVM.PageUrl, ...)` entry (HIGH)
- Using `Resolve<T>` where `TryResolve<T>` is more appropriate (the service may not be registered in all app configs) (MEDIUM)
