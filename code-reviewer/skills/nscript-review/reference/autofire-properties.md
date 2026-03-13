# `[AutoFire]` and `nameof()` Enforcement

NScript provides `[AutoFire]` to auto-generate property change notification boilerplate. The compiler generates a backing field `_propertyName`, a getter returning it, and a setter that checks `_propertyName !== value` before assigning and calling `firePropertyChanged("PropertyName")`. The `[AutoFire]` attribute accepts optional `params string[] alsoFire` — additional property names to fire when this property changes. It is only valid on instance properties of classes implementing `INotifyPropertyChanged` (i.e., extending `ObservableObject`).

**Correct patterns (from codebase):**

Simple auto-fire (most common):
```csharp
[AutoFire]
public bool IsLastMessage { get; set; }
```

Auto-fire with dependent computed property:
```csharp
[AutoFire(nameof(CanSendMessage))]
public bool HasAttachedImage { get; set; }

public bool CanSendMessage => !Streaming && !string.IsNullOrEmpty(UserMessage?.Trim());
```

Multi-property manual fire with nameof (acceptable when logic is needed):
```csharp
FirePropertyChanged(nameof(UserMessage), nameof(CanSendMessage));
```

**What to flag:**

- `FirePropertyChanged("StringLiteral")` instead of `FirePropertyChanged(nameof(Property))` — legacy code uses string literals like `this.FirePropertyChanged("TestDetailsList")`, new code MUST use `nameof()` (HIGH)
- Manual property setter boilerplate (backing field + `FirePropertyChanged`) on auto-properties that should use `[AutoFire]` (MEDIUM)
- `[AutoFire("OtherProp")]` with hardcoded string instead of `[AutoFire(nameof(OtherProp))]` (HIGH)
- `AddPropertyChangedListener("StringLiteral", ...)` instead of using `nameof()` — note: string literals on external control elements in tests are acceptable (HIGH)
- `AddLinkedProperty("source", "target")` with hardcoded strings instead of `nameof()` for both args (HIGH)
- `[AutoFire(nameof(Dep1), nameof(Dep2))]` where `Dep1` or `Dep2` don't exist as properties on the same class (CRITICAL)
- `AddLinkedProperty` where source or target property doesn't exist on the class (CRITICAL)
- `[AutoFire]` on a static property — the compiler will error: only valid on instance properties (CRITICAL)
- `[AutoFire]` on a class that doesn't extend `ObservableObject` — the compiler will error (CRITICAL)

---

## Connected / Linked / Computed Properties

Property dependency wiring ensures UI updates propagate correctly. There are three mechanisms:

**`AddLinkedProperty(source, dependent)`** — Registered in constructor. Declares "when `source` changes, also fire notification for `dependent`." Uses internal `StringDictionary<string[]> linkedProperties`. Best for read-only computed properties that derive from one or more source properties.
```csharp
// In constructor:
AddLinkedProperty(nameof(SubTopics), nameof(CanExpand));
AddLinkedProperty(nameof(SubTopics), nameof(UISubTopics));
AddLinkedProperty(nameof(IsExpanded), nameof(UISubTopics));
// Computed property:
public List<TopicWrapper> UISubTopics => IsExpanded ? SubTopics : null;
```

**`[AutoFire(nameof(...))]`** — Attribute on the source property. Best for simple one-to-one dependencies where the source property uses `[AutoFire]` anyway.
```csharp
[AutoFire(nameof(IsUpdating))]
public ParsePreviewViewModel ParsePreviewVM { get; set; }
public bool IsUpdating => ParsePreviewVM != null;
```

**`AddPropertyChangedListener(propertyName, callback)`** — Registered in constructor. Triggers a method/lambda when a property changes. Best for side-effects (API calls, document updates, etc.), not just notification forwarding. Callback signature: `Action<INotifyPropertyChanged, string>`.
```csharp
AddPropertyChangedListener(nameof(SelectedTemplate), OnSelectedTemplateChanged);
AddPropertyChangedListener(nameof(CurrentIssue), (_, __) => _wordApiWrapper.ClearDocument());
```

**What to flag:**

- New property that derives from other properties but lacks `AddLinkedProperty` or `[AutoFire(nameof(...))]` wiring (HIGH)
- `AddLinkedProperty(source, target)` where the target property has a setter that also fires notifications — target should be read-only/computed (MEDIUM)
- Duplicate wiring: same dependency declared via BOTH `AddLinkedProperty` AND `[AutoFire(nameof(...))]` (HIGH)
- `FirePropertyChanged` firing multiple property names where `[AutoFire]` with dependent names or `AddLinkedProperty` would be cleaner (LOW)
- Complex dependency chains (A->B->C) where intermediate notifications don't propagate correctly — `AddLinkedProperty` handles transitive chains via recursive fire (CRITICAL)
- Using `AddPropertyChangedListener` for simple notification forwarding — should use `AddLinkedProperty` instead (LOW)
