# Protobuf / gRPC Compatibility Reference

Protobuf is the most rigorously specified evolution model among common schema formats. The
rules below are not opinions — they are encoded in the wire format itself.

## Field Numbers Are Permanent Identity

The field *name* is for humans. The wire format references each field by its **field number**
only. Two rules follow:

- **Renaming a field is safe on the wire.** Old and new builds emit the same number; the field
  name on the proto doesn't affect bytes. Code-generated APIs change, of course, so callers
  must be updated — but persisted bytes remain readable.
- **Renumbering a field is a break.** The new number is interpreted as a different field
  entirely. Persisted data with the old number becomes either an unknown field (silently
  dropped) or, worse, mistakenly matched to a different field if the old number was reused.

## `reserved` Is Mandatory When Removing Fields

When you delete a field, add a `reserved` clause for both the number and the name in the same
change:

```proto
message Order {
  reserved 5, 7 to 9;
  reserved "old_field_name", "another_removed_field";

  string id = 1;
  // field 5 was deleted; field 6 is still present
  string status = 6;
}
```

Without `reserved`, a future engineer can innocently introduce a new field at number 5, and
every old persisted message with the old field-5 data is silently re-interpreted as the new
field. This is a real production bug, not a theoretical one.

## Wire-Compatible Type Changes

Within the same wire type, some Go-style "type changes" are actually safe because the wire
representation is identical:

| From       | To         | Safe?                                                     |
|------------|------------|-----------------------------------------------------------|
| `int32`    | `int64`    | Yes (varint wire type, sign-extended)                     |
| `int64`    | `int32`    | NO — values > 2^31 are silently truncated                 |
| `uint32`   | `uint64`   | Yes                                                       |
| `sint32`   | `sint64`   | Yes                                                       |
| `int32`    | `sint32`   | NO — different wire encoding (zigzag vs. two's complement)|
| `string`   | `bytes`    | Yes (same length-delimited wire type)                     |
| `bool`     | `int32`    | Yes (both varint, `true` = 1 / `false` = 0)               |
| singular   | `repeated` | Yes for primitive types; consumers get a length-1 list    |

Always verify the wire types match (`varint`, `length-delimited`, `32-bit`, `64-bit`). If they
match and the value range is preserved, the change is safe.

## proto3 Default Behavior — Easy to Miss

- In proto3, scalar fields have no notion of "not set" by default. A missing field on the wire
  is indistinguishable from a field explicitly set to its zero value. If you need to detect
  presence, use the `optional` keyword (proto3.15+).
- Switching a field from `optional` to non-`optional` (or vice versa) **changes presence
  semantics** even though the wire format may be identical. Old code that checks `HasField`
  will start returning false on values that the new code considers "set".

## Enum Values

- Adding new enum values is generally safe for proto3 (unknown values are kept on the wire and
  passed through), but consumers must have a `default:` or "unknown" handling branch.
- proto2 with `closed enum` semantics rejects unknown values and corrupts the message.
- Renumbering enum values is a break, period. `reserved` the old number.
- Renaming an enum value is safe on the wire but breaks generated code.

## gRPC Service Definitions

- Adding new RPC methods is additive — old clients ignore them.
- Removing an RPC method breaks any client that calls it. Treat it as a public-surface change
  even if both client and server live in the same repo.
- Changing a method's request or response type is a full schema change — apply the patterns
  above to the affected message types.
- Streaming-direction changes (unary → server-streaming, etc.) are wire-level breaks; clients
  using the old signature will not interoperate.

## Common Mistakes to Flag

1. **Field number reuse after a removed field with no `reserved`.** The classic "we renamed it,
   it should be fine" mistake.
2. **`int64` → `int32` "to save space".** Silently truncates large IDs.
3. **Adding a required-by-convention field with no default.** proto3 has no `required`, but
   business logic may treat the default as invalid (e.g., empty string IDs).
4. **Removing a value from a `closed enum` in proto2.** Persisted data becomes unparseable.
5. **Switching between `oneof` members in incompatible ways.** Adding a new member is safe;
   removing a member is a break.
