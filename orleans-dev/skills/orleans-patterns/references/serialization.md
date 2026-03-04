# Orleans Serialization Rules

## Two Kinds of Serialization

1. **Grain call serialization**: Objects passed to/from grain methods. Uses Orleans.Serialization (high-performance binary).
2. **Grain storage serialization**: Objects persisted to storage. Defaults to Newtonsoft.Json (configurable per provider).

These are separate systems. Types used in both grain calls AND storage need to be compatible with both.

## Basic Pattern — `[GenerateSerializer]` + `[Id]`

```csharp
[GenerateSerializer]
public class Employee
{
    [Id(0)] public string Name { get; set; }
    [Id(1)] public int Age { get; set; }
    [Id(2)] public DateTime HireDate { get; set; }
}
```

- `[GenerateSerializer]` generates high-performance serializers at compile time.
- `[Id(n)]` assigns a stable numeric identity. The ID is what's serialized, not the member name.
- ALL types in grain calls, state, or streams MUST be serializable.
- Every field/property you want serialized MUST have `[Id]`. Members without it are silently excluded.

## Inheritance

Each level in the hierarchy has its own independent ID space:

```csharp
[GenerateSerializer]
public class Publication
{
    [Id(0)] public string Title { get; set; }
}

[GenerateSerializer]
public class Book : Publication
{
    [Id(0)] public string ISBN { get; set; }  // No conflict with Publication's [Id(0)]
}
```

- IDs are scoped to the declaring type level, not the hierarchy.
- Both base and derived can independently start at `[Id(0)]`.
- Add/remove members from any level independently.
- CANNOT insert a new base class after deployment.

## Record Types

```csharp
[GenerateSerializer]
public record MyRecord(string A, string B)
{
    [Id(0)]
    public string C { get; init; }  // Body members separate from constructor params
}
```

- Primary constructor parameters have implicit IDs based on order.
- CANNOT reorder primary constructor parameters after deployment.
- Body members have independent IDs that don't clash with constructor params.
- Use `[GenerateSerializer(IncludePrimaryConstructorParameters = false)]` to exclude constructor params.
- NEVER change `record` ↔ `class` — different wire representations.

## Type Aliases

```csharp
[GenerateSerializer]
[Alias("employee-v1")]
public class Employee
{
    [Id(0)] public string Name { get; set; }
}
```

- By default, Orleans encodes the full type name. Renaming/moving the class breaks deserialization.
- `[Alias]` makes serialization resilient to renames and assembly moves.
- Aliases are globally scoped — no duplicates allowed.
- For generic types: `[Alias("mytype`2")]` (backtick + arity).
- BEST PRACTICE: Always use `[Alias]` on types stored long-term or sent across versioned services.

## Surrogates — For Foreign Types

When you need to serialize types you don't control:

```csharp
// Foreign type (can't modify)
public struct ExternalPoint { public int X; public int Y; }

// Your surrogate
[GenerateSerializer]
public struct ExternalPointSurrogate
{
    [Id(0)] public int X;
    [Id(1)] public int Y;
}

// Converter
[RegisterConverter]
public sealed class ExternalPointConverter :
    IConverter<ExternalPoint, ExternalPointSurrogate>
{
    public ExternalPoint ConvertFromSurrogate(in ExternalPointSurrogate s) =>
        new() { X = s.X, Y = s.Y };

    public ExternalPointSurrogate ConvertToSurrogate(in ExternalPoint v) =>
        new() { X = v.X, Y = v.Y };
}
```

- Use `IConverter<TValue, TSurrogate>` for value types or sealed classes.
- Additionally implement `IPopulator<TValue, TSurrogate>` if the foreign type is unsealed (can be inherited).
- Surrogates should prefer plain fields over properties for performance.
- MUST have `[RegisterConverter]` on the converter class.

## Immutability and Copying

Orleans deep-copies objects on grain calls by default for isolation:

```csharp
[Immutable, GenerateSerializer]
public class ImmutableEvent
{
    [Id(0)] public string Data { get; init; }
}
```

- `[Immutable]` on a type skips deep copying entirely — significant performance benefit.
- `[Immutable]` on individual members skips copying just that member.
- ONLY use on truly immutable types (all fields readonly/init-only, no mutable collections).
- Marking a mutable type `[Immutable]` breaks isolation and introduces concurrency bugs.

## Version Tolerance Rules

### What You CAN Do

- Add new members (with new `[Id]` values)
- Remove members (old IDs become unused — don't reuse them)
- Widen numeric types: `int` → `long`, `float` → `double`
- Rename types (if using `[Alias]`)
- Add new subclasses to existing hierarchies

### What You CANNOT Do

- Change `[Id]` values of existing members
- Reuse `[Id]` values of removed members for different members
- Change signedness: `int` ↔ `uint`
- Change `record` ↔ `class`
- Insert a new base class into an existing hierarchy
- Reorder `record` primary constructor parameters
- Narrow numeric types if values exceed target range (runtime exception)

## Grain Storage Serialization

```csharp
siloBuilder.AddAzureBlobGrainStorage("MyStorage",
    (OptionsBuilder<AzureBlobStorageOptions> opts) =>
    {
        opts.Configure<IMySerializer>(
            (options, serializer) => options.GrainStorageSerializer = serializer);
    });
```

- Defaults to Newtonsoft.Json. Configurable per provider via `IGrainStorageSerializer`.
- Be aware: Orleans.Serialization preserves object identity and polymorphism; Newtonsoft.Json may not.

## External Serializer Support

| Serializer | Format | Fidelity | Payload Size | Cross-Platform |
|---|---|---|---|---|
| Orleans Native | Binary | Excellent | Small | .NET only |
| MessagePack (8.2+) | Binary | Good | Smallest | Any MessagePack client |
| System.Text.Json | JSON | Limited | Largest | Any JSON client |
| Newtonsoft.Json | JSON | Good | Large | Any JSON client |

Multiple serializers can be configured; checked in order of registration.

## Anti-Patterns

| Pattern | Severity | Why |
|---------|----------|-----|
| Missing `[GenerateSerializer]` | Critical | Type won't serialize in grain calls |
| Missing `[Id]` attributes | Critical | Members silently excluded |
| Reusing removed `[Id]` values | Critical | Deserialization maps wrong data |
| Mutable type marked `[Immutable]` | Critical | Breaks isolation, race conditions |
| `record` ↔ `class` change | Critical | Different wire format, breaks compat |
| Reordering record constructor params | Critical | Breaks existing serialized data |
| Inserting new base class | Critical | Breaks hierarchy serialization |
| Changing numeric signedness | Critical | `int` ↔ `uint` not compatible |
| Missing `[Alias]` on stored types | Warning | Rename/move breaks deserialization |
| Missing `[RegisterConverter]` | Warning | Surrogate not discovered |
| Using `[Serializable]` instead of `[GenerateSerializer]` | Info | Legacy, lower performance |
