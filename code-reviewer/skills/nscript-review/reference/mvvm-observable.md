# MVVM & Observable Patterns

NScript uses a strict MVVM pattern. `ObservableObject` (from `Sunlight.Framework.Observables`) is the base for all ViewModels and provides the property notification system. Page-level ViewModels extend `PageVM` which extends `ObservableObject` and implements `IDisposable`.

**`ObservableObject` core API:**

```csharp
// Fire notifications (overloads for 1-5 property names + params)
void FirePropertyChanged(string propertyName)
void FirePropertyChanged(string p1, string p2)
void FirePropertyChanged(string p1, string p2, string p3, string p4, string p5)
void FireAllPropertiesChanged()

// Per-property listeners
void AddPropertyChangedListener(string propertyName, Action<INotifyPropertyChanged, string> callback)
void RemovePropertyChangedListener(string propertyName, Action<INotifyPropertyChanged, string> callback)

// Linked property dependencies
void AddLinkedProperty(string sourceProperty, string otherProperty)

// Global listener
event Action<INotifyPropertyChanged, string> AnyPropertyListener

// Cleanup
void ClearListeners()
```

**Dispose pattern — `PageVM` base class:**
```csharp
public abstract class PageVM : ObservableObject, IDisposable
{
    private bool _disposed;

    public void Dispose()
    {
        if (!_disposed)
        {
            _disposed = true;
            this.InternalDispose();
        }
    }

    protected virtual void InternalDispose() { }
}
```

Subclasses override `InternalDispose()`:
```csharp
protected override void InternalDispose()
{
    ClearListeners();
    _eventBus.UnSubscribe<SomeEvent>(OnSomeEvent);
    base.InternalDispose();
}
```

**Navigation pattern — each PageVM declares a `PageUrl` constant:**
```csharp
public const string PageUrl = "grade";

public override string NavigateToParams(UrlInfo parameters) { ... }
public virtual void CanNavigateTo(UrlInfo parameters, Action<bool> callback) { ... }
```

Navigation is event-driven:
```csharp
_eventBus.Raise(new NavigateToUrlEvent("#" + GamePageViewModel.PageUrl));
_eventBus.Raise(new NavigateBackEvent());
```

**Dialog/popup pattern — via EventBus events (not direct service calls):**
```csharp
_eventBus.Raise(new DisplayMessageBoxEvent(
    title: "...", message: "...",
    okText: "OK", cancelText: "Cancel",
    onOk: () => { ... }, onCancel: null));
_eventBus.Raise(new DisplayPopupEvent(...));
```

Common event types: `NavigateToUrlEvent`, `NavigateBackEvent`, `DisplayMessageBoxEvent`, `DisplayPopupEvent`, `RightBarDisplayEvent`, `AppStartedEvent`, `CurrentStatusUpdateEvent`.

**`ObservableCollection<T>` — for UI-bound lists:**
```csharp
// Initialized once, mutated in-place. Do NOT use [AutoFire] — the collection fires its own change events.
public ObservableCollection<Conversation> Conversations { get; } = new ObservableCollection<Conversation>();
```

**What to flag:**

- ViewModel class not inheriting `ObservableObject` (or `PageVM` for page-level VMs) (CRITICAL)
- `IDisposable` using direct `Dispose()` override instead of `InternalDispose()` override pattern (HIGH)
- Missing `_disposed` field check (dispose guard) before cleanup (MEDIUM)
- Missing `ClearListeners()` call in `InternalDispose()` (HIGH)
- `EventBus.Subscribe<T>(handler)` without matching `EventBus.UnSubscribe<T>(handler)` in `InternalDispose()` (CRITICAL)
- `List<T>` used for UI-bound collections instead of `ObservableCollection<T>` (HIGH)
- `[AutoFire]` on an `ObservableCollection<T>` property — collections should be initialized once, not reassigned (MEDIUM)
- New `PageVM` without `PageUrl` constant (HIGH)
- New `PageVM` without `NavigateToParams` override (MEDIUM)
- Dialog/popup shown by direct service call instead of `EventBus.Raise(new DisplayMessageBoxEvent(...))` (MEDIUM)
- Missing `base.InternalDispose()` call in override (HIGH)
