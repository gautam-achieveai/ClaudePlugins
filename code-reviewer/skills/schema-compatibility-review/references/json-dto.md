# JSON DTO / REST / OpenAPI Compatibility Reference

JSON has no formal schema enforcement at the wire — every property is optional unless the
deserializer chooses to make it required. That flexibility is also the failure mode: subtle
differences in deserializer configuration produce wildly different compatibility behavior.

## The Deserializer Decides Everything

Before reviewing any JSON DTO change, identify how the consuming side actually deserializes.
The same DTO change can be safe under one configuration and a break under another.

| Deserializer mode                          | Missing required field | Unknown extra field |
|--------------------------------------------|------------------------|---------------------|
| System.Text.Json default                   | Sets to `default(T)`   | Ignored             |
| `JsonSerializerOptions { RespectRequiredConstructorParameters = true }` | Throws | Ignored |
| Newtonsoft `[JsonRequired]`                | Throws                 | Ignored             |
| Newtonsoft `MissingMemberHandling = Error` | Tolerant of missing    | Throws              |
| Strict-mode OpenAPI schema validation      | Throws                 | Throws (without `additionalProperties: true`) |
| GraphQL request parsing                    | Throws on missing      | Throws on unknown   |

When reviewing, **read the configuration**, not just the DTO. A `[JsonRequired]` attribute on
a new property is a backward-compat break for any persisted JSON that lacks the field.

## Naming Policy Changes

Switching the serializer's naming policy (`CamelCase`, `SnakeCase`, etc.) globally is a
schema break for **every existing JSON consumer**. The bytes on the wire change for every
property. This is rarely the intent — usually someone wanted a new convention for new code
but didn't realize it applies retroactively.

If you must switch, pin the legacy contracts with explicit `[JsonPropertyName]` attributes
before the global switch so the wire-names stay stable for already-deployed consumers.

## Polymorphic Deserialization

When the JSON uses a discriminator field (`$type`, `kind`, `type`) and the deserializer picks
a concrete type from it, treat the discriminator value as an enum and apply the enum
compatibility rules:

- Adding a new discriminator value is safe **only if** all consumers have a default/unknown
  branch.
- Renaming or removing a discriminator value is a break — persisted records carry the old
  string and now match nothing.
- Removing a polymorphic subtype is a break for any record with that subtype.

## OpenAPI / Swagger Specs

OpenAPI specs are themselves a versioning surface:

- Code-generated clients re-generate against the spec. Any property removed from the spec
  disappears from the generated client class — strictly a break for clients on the old build.
- `additionalProperties: false` (often the default in stricter generators) means **any unknown
  field rejects the whole document.** Adding a new field is no longer additive — old servers
  produce documents that new clients reject, and vice versa.
- `required: [foo, bar]` arrays add to the schema's mandatory set. Adding a name to that list
  is a break for every existing producer that may omit the field.
- `nullable: true` removal is a break for any producer that emits `null`.

## Numbers and Precision

JSON numbers have no built-in distinction between integer and float. Different parsers
interpret them differently:

- JavaScript `JSON.parse` returns `number` (double precision) — large integers (> 2^53) lose
  precision. If the backend sends `int64`s, the frontend silently truncates.
- .NET `JsonSerializer` deserializes into `long` / `decimal` per the target property type.
- Migrating an ID from `int` to `long` on the server is a break for browser clients if those
  IDs ever exceed 2^53.

Recommendation: serialize large IDs as **strings**. The bytes look like numbers, but the
contract is explicit and the precision is preserved.

## Date / Time Formats

- ISO 8601 strings (`2026-05-14T12:34:56Z`) round-trip cleanly across most stacks.
- `DateTime.MinValue` serializes to `"0001-01-01T00:00:00"` in .NET, which is rarely meaningful
  to other clients.
- Switching between `DateTime` and `DateTimeOffset`, or between Unix epoch seconds and
  milliseconds, is a unit-change schema break (pattern 3 in the main methodology).

## Common Mistakes to Flag

1. **Adding `[JsonRequired]` or `required:` to an existing property.** Old payloads lacking
   the field now fail to deserialize.
2. **Removing a property from a DTO that round-trips through persistence.** Old JSON blobs in
   the cache, the database, or message queues still carry the field, and the next deserializer
   round trip drops it — silent data loss.
3. **Switching naming policy on a serializer used by multiple DTOs.** Massive surface change
   for what was probably intended as a local cleanup.
4. **Tightening OpenAPI `required` list or removing `nullable`.** Old producers/consumers
   become non-conformant.
5. **Changing `int` to `long` on an ID field consumed by browser clients.** Silent precision
   loss in JavaScript.
6. **Adding a polymorphic subtype without updating the discriminator's default branch.** New
   payloads cause deserialization errors on old consumers.
