# Orleans Grain & Serializer Compatibility Reference

Orleans grain calls and grain state cross silo boundaries during rolling deploys, and grain
state may have been persisted with an older format. The Orleans 7+ serializer (`[GenerateSerializer]`)
has strict rules about field identity — get them wrong and rolling deploys produce silent data
loss or `MissingFieldException`s.

## `[Id(N)]` Is The Wire Identity

In an Orleans serialized type, every field carries a numeric `[Id(N)]` tag that the wire
format uses as the field's identity. The rules mirror protobuf field numbers:

- The **id number** is the on-wire identifier. Renaming the C# property does *not* change the
  id and is safe across deploys.
- Changing the id number is a break: persisted state or in-flight messages from old silos
  reference the old number and silently drop on the new code, or worse — match a different
  field if the number was reused.
- Removing a field with no replacement leaves an "unknown field" in the persisted data. Orleans
  tolerates this on read by default, but if you later reuse that id for a different field,
  you get silent corruption.

```csharp
[GenerateSerializer]
public class OrderState
{
    [Id(0)] public string Id { get; set; }
    [Id(1)] public OrderStatus Status { get; set; }
    // Id(2) was removed — DO NOT reuse 2 for a new field
    [Id(3)] public DateTime CreatedAt { get; set; }
}
```

There is no `reserved` keyword in Orleans, so the discipline is by convention: leave a comment
noting which ids are retired, and **never recycle an id**.

## Surrogate Types and `[Alias]`

For types you don't own (BCL types, third-party types), Orleans uses **surrogate types** to
project to/from a serializable shape. Changes to the surrogate are schema changes — apply
all the patterns to the surrogate's `[Id]`-tagged fields, not the original type.

The `[Alias("name")]` attribute on a type fixes the wire name independently of the C# type
name. This is the only safe way to:

- Rename a class (apply `[Alias]` with the old name to preserve the old wire identity).
- Move a class between namespaces or assemblies without breaking persisted state.

Removing or changing an existing `[Alias]` is a break — old silos and old state references
the alias by string.

## Grain Interfaces

A grain interface is effectively a versioned RPC contract:

- **Adding a new method to a grain interface is safe.** Old silos won't see the call; new
  silos will.
- **Removing a method** breaks any caller still running the old code (during rolling deploy,
  the new silo no longer responds to method N, while old silos may still try to invoke it).
- **Changing a method signature** (adding/removing parameters, changing types) is a break.
  Orleans matches methods by ID (computed from the signature by default, or pinned with
  `[MethodId]`/`[Alias]`).
- Use `[Alias]` on grain interfaces and methods to pin the wire-level identity if you want to
  rename C# symbols.

## Grain Interface Versioning

Orleans supports explicit interface versioning via `[Version(N)]` on the grain interface, plus
the placement strategy can be configured to prefer compatible silos. Use this when an
interface change is unavoidable and the rolling-deploy window is real.

The agent should look for:
- A grain interface with a `[Version]` bump and the corresponding placement/registration update.
- A grain interface change with no version bump — that's almost certainly a bug during a
  rolling deploy.

## Persisted Grain State

Grain state stored via `IPersistentState<T>` is read back hours, days, or months after it was
written. Treat the state type as **forever-persisted data**:

- Every `[Id]` is permanent.
- Adding new `[Id]`-tagged fields with default values is safe (older state reads as the default).
- Removing fields strands the data on disk; future readers will be able to load the state but
  the field is gone. Mark the field obsolete and remove it only after a long settle window.
- Changing the type at an existing `[Id]` requires migration — typically done by adding a new
  `[Id]` with the new type, dual-writing during a transition, and removing the old one once
  every state object has been re-saved.

## Stream Payloads

Orleans streams may have producer and consumer running different builds. Apply the standard
patterns to any `[GenerateSerializer]` payload type used on a stream — the asymmetry of
rolling deploys means new producers may emit payloads that old consumers haven't been updated
to handle, and vice versa.

## Common Mistakes to Flag

1. **Reused `[Id]` number for a new field after a previous one was removed.** Silent state
   corruption.
2. **Renamed a `[GenerateSerializer]` class without adding `[Alias]` with the old name.**
   Persisted state and in-flight messages can't be deserialized.
3. **Removed a grain interface method during a rolling-deploy window with no `[Version]` bump
   or compatibility shim.**
4. **Changed a grain method's parameter types without a new method.** The method ID changes,
   and the old callers' calls fail with method-not-found.
5. **Changed the type at an existing `[Id]`.** Mid-flight state objects deserialize with the
   wrong type or fail outright. Use a new `[Id]` instead.
6. **Removed a `[Id]`-tagged field without leaving a comment to retire the number.** Future
   contributors may reuse it.
