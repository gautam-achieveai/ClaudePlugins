# Binary Format Compatibility Reference

Binary serializers (MessagePack, Bond, Avro, FlatBuffers, BinaryFormatter) trade human-
readability for speed and density. Different formats have different evolution rules — what's
safe in one is a break in another. Identify the format first, then apply its rules.

## MessagePack (`MessagePack-CSharp`)

The dominant .NET binary format for performance-sensitive paths. It has two modes:

### Key Mode (`[MessagePackObject(true)]` or `[Key("name")]`)

Fields are keyed by string. The evolution rules look like JSON:

- Renaming a `[Key]` is a wire-level break (the new name doesn't match the old bytes).
- Adding a new property with a default is safe.
- Removing a property is safe on the wire (the old key is ignored), but consider whether old
  writers will keep emitting it.

### Integer-Key Mode (`[Key(N)]`)

Fields are keyed by integer — denser and faster, but the rules tighten to mirror protobuf:

- The integer is the wire identity. **Never reuse a number after removing a field.**
- Renaming the C# property is safe on the wire (the integer key is unchanged).
- Reordering integer keys does not change the wire format (each field carries its own key).

### Contractless Mode

When the serializer is configured contractless (no attributes), it uses property names by
default. This is convenient but means **every property rename is a schema break** by default,
which is easy to miss in a refactor. Pin the contract with attributes or move to an explicit
key mode when the type crosses a deploy boundary.

## Bond (Microsoft)

Bond schemas resemble protobuf but with stricter ordinals and explicit `required` /
`optional` modifiers. Common breaks:

- Changing a field from `optional` to `required` (or vice versa) is a break.
- Removing a `required` field breaks every old payload — they'll fail validation.
- Renumbering ordinals breaks every persisted payload.
- Bond TypeAliases: changing the alias of a type changes how the value is serialized; treat
  it as a type change.

## Avro

Avro's distinguishing feature is **the schema travels with the data** (or is registered in a
schema registry). Compatibility is enforced by the reader resolving its schema against the
writer's schema. The compatibility modes are:

- **Backward**: new schema can read old data. (Default for most consumer-driven systems.)
- **Forward**: old schema can read new data. (Producer-driven.)
- **Full**: both directions.

The Schema Registry compatibility setting governs what's allowed. Reviewers should:

- Identify the registry compatibility mode for the topic.
- Apply the rules for that mode — adding a field with a default is backward-compat; removing
  one is forward-compat only; type promotion (int → long) is backward-compat.
- Flag changes that the registered mode would reject.

## FlatBuffers / Cap'n Proto

Zero-copy binary formats. Evolution rules are similar to protobuf with one important
difference:

- Adding a new field to a `table` is safe (additive, with defaults).
- **Adding a field to a `struct` is a break.** Structs are fixed-layout in the binary; their
  offsets are baked in. Use tables for anything that needs to evolve.
- Reordering fields in a table is safe (each field has its own slot). Reordering in a struct
  is a break.

## BinaryFormatter (.NET — Deprecated)

Listed only as a warning. `BinaryFormatter` is deprecated due to security issues, but legacy
payloads still exist. Its evolution model is:

- Tied to the exact CLR type's name, assembly, and field names.
- Renaming a class, namespace, field, or even moving to a different assembly version is a
  break.
- There is no formal forward-compatibility mechanism.

If a PR touches a `BinaryFormatter`-serialized type, the **primary recommendation should
usually be to migrate off `BinaryFormatter`**, not to make the change "compatible" — there is
no robust compatibility story.

## Common Mistakes to Flag

1. **MessagePack integer-key reuse after a field was removed.** Same class of bug as proto
   field-number reuse, with the same silent corruption mode.
2. **MessagePack contractless mode with a property rename.** Every persisted/transmitted
   instance becomes unparseable.
3. **Bond `optional` → `required`.** Old payloads without the field fail validation.
4. **FlatBuffers / Cap'n Proto struct change.** Layout shift breaks every consumer.
5. **Avro change incompatible with the topic's registry mode.** Producer succeeds, consumer
   fails — silent stuck queue.
6. **Touching a `BinaryFormatter`-serialized type.** Recommend migrating off, not patching
   compatibility.

## When the Format Is Unclear

If you can't tell which binary format is in use:

- Search for the serializer's NuGet/package reference and entry point (`MessagePackSerializer`,
  `Serializer.Marshal`, `AvroSerializer`, etc.).
- Look at the file extension or magic bytes of any sample payloads in the repo.
- Check the message-bus or storage config — often the format is named in the topic/queue
  config.

If still uncertain, emit a `[QUESTION]` rather than guessing — different formats have
incompatible rules, and applying the wrong ruleset produces false findings.
