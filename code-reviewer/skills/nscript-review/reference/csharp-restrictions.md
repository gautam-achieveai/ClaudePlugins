# NScript C# Restrictions

NScript cannot transpile certain C# features. The compiler throws `NotSupportedException` or `NotImplementedException` for unsupported syntax nodes. Some features silently produce incorrect JS.

**CRITICAL — Will fail at transpilation or runtime:**

- **No string interpolation** (`$"..."`) — must use `"text " + var` or `string.Format()`
- **No `string.Join()`** — use manual loops
- **No `TimeSpan`** — not supported in JS runtime
- **No `dynamic`** keyword
- **No `yield`** — iterator blocks compile to `function*` with `GeneratorWrapper` but are fragile; avoid unless explicitly needed
- **No tuples** (`(int, string)`, `ValueTuple`) — use `Tupl<T, U>` from `McqdbClientCommon.Utils`
- **No pattern matching** — only `is null`, `is constant`, and `is Type varName` are supported; property patterns, tuple patterns, positional patterns, `switch` expressions with patterns all throw `NotImplementedException`
- **No `out` variables** (`out var x`)
- **No `foreach`** on most collections — use explicit `for` loops (LINQ `foreach` is OK)
- **No `Dictionary<K,V>`** — must use `StringDictionary<T>` (string keys) / `NumberDictionary<T>` (numeric keys)
- **No `T[]` arrays** — must use `NativeArray<T>` with explicit `.ToNativeArray()` / `.AsEnumerable()` for conversions
- **No `Regex`** — use `new RegularExpression(pattern)` which maps to JS `RegExp`
- **No multiple `catch` blocks** — only a single `catch` + optional `finally` is supported; the compiler throws `NotSupportedException`
- **No default interface methods** — not implemented
- **No using declarations** (`using var x = ...`) — not implemented
- **No nullable reference types** — annotations are silently ignored
- **No async streams** (`IAsyncEnumerable<T>`) — not implemented
- **No indices and ranges** (`^0`, `1..3`) — not implemented

**Type mapping reference:**

| Standard C# | NScript Equivalent | JS Output |
|---|---|---|
| `Dictionary<string, V>` | `StringDictionary<V>` | plain JS object `{}` |
| `Dictionary<int, V>` | `NumberDictionary<V>` | plain JS object `{}` |
| `Task<T>` | `Promise<T>` | native `Promise` |
| `Task.WhenAll` | `Promise.All` / `PromiseUtils.WhenAll` | `Promise.all()` |
| `(T, U)` / `ValueTuple` | `Tupl<T, U>` | plain object |
| `T[]` / `List<T>` (JS array) | `NativeArray<T>` | native `Array` |
| `Regex` | `RegularExpression` | native `RegExp` |
| `Task.Delay` | `PromiseUtils.Delay` | `setTimeout` in Promise |
