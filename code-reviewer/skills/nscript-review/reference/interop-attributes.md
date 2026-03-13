# JS Interop & Type Attributes

NScript has several attributes for controlling how C# types map to JavaScript. Misuse causes silent runtime errors.

**`[JsonType]` — Plain JS object (no prototype):**

Marks a class as a plain JSON object. The compiler skips prototype generation and TypeId registration. Used for API payloads, external JS bridge types, and service worker messages.

Constraints enforced by the compiler (`ConverterContext.GetTypeKind()`):
- All properties MUST be `extern` (no backing fields, no computed logic)
- NO constructors with parameters
- NO methods (no prototype to attach them to)
- Can only derive from other `[JsonType]` types or `object`
- Cannot be combined with `[Extended]` or `[ImportedType]`
- Nullable value types are allowed (`uint?`, `int?`)

```csharp
[JsonType]
public class FacebookAuthResponse
{
    public extern bool Session_key { get; set; }
    public extern string AccessToken { get; set; }
    public extern string UserID { get; set; }
}
```

**`[IgnoreNamespace]` + `[ScriptName("...")]` — JS global binding:**

Used on static classes that wrap existing JS globals. `[IgnoreNamespace]` places the type at the global JS scope; `[ScriptName]` maps to a specific JS variable path.

```csharp
[IgnoreNamespace, ScriptName("facebookConnectPlugin")]
public static class FacebookConnectPlugin
{
    public static extern void Login(
        NativeArray<string> scopes,
        Action<FacebookLoginData> success,
        Action<object> error);
}

[IgnoreNamespace, ScriptName("window.plugins.googleplus")]
public static class GooglePlusConnectPlugin { ... }
```

**`extern` on methods/properties — JS-native API surface:**

On non-`[JsonType]` classes, `extern` declares "this is implemented in JavaScript." No C# body is provided.

```csharp
private static extern NativeArray<PerformanceTiming> GetEntriesByName(string name);
public static extern string BaseUrl { get; set; }
```

**`[Skin("Assembly.Namespace.Class:SkinId")]` — Static skin reference:**

Declares a static property that references an HTML `<skin id="SkinId">` element. The compiler replaces the getter with a call to the compiled template loader.

```csharp
[Skin("AiChat.ViewModels.ChatViewModel:DefaultSkin")]
public static Skin DefaultSkin => null;

[Skin("AiChat.ViewModels.ChatViewModel:MessageSkin")]
public static Skin MessageSkin => null;
```

In templates, skins are referenced as: `Skin="{vm:ChatViewModel.DefaultSkin}"`

**What to flag:**

- `[JsonType]` class with non-`extern` properties (CRITICAL — compiler error)
- `[JsonType]` class with a constructor that has parameters (CRITICAL)
- `[JsonType]` class with methods (CRITICAL — no prototype to attach them)
- `[JsonType]` class inheriting from non-`[JsonType]` (except `object`) (CRITICAL)
- `[IgnoreNamespace]` without `[ScriptName]` when the C# class name doesn't match the JS global (HIGH)
- `[ScriptName]` path that doesn't match the actual JS global variable (CRITICAL — silent runtime error)
- `extern` method/property without corresponding JS implementation available at runtime (CRITICAL)
- `[Skin]` string that doesn't match any `<skin id="...">` in the corresponding `.html` file (CRITICAL)
- `[Skin]` on a non-static property (HIGH)
- Missing `[JsonType]` on classes intended as API DTOs / external interop (HIGH)
