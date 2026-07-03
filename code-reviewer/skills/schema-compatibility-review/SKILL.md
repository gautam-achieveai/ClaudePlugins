---
name: schema-compatibility-review
description: >
  Internal helper. Load only when explicitly named by another skill or agent.
user-invocable: false
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Schema Compatibility Review — Methodology

This skill is the working methodology for any reviewer (human or agent) checking that schema and
wire-contract changes are safe to deploy. It applies to every place where data crosses a version
boundary: a write today must be readable by code deployed yesterday and by code deployed tomorrow.

## Core Principle

You cannot atomically upgrade a client, a server, a database, and all the persisted data they
have already written. There is always a deploy window — sometimes minutes, sometimes weeks,
sometimes (for stored data) **forever** — during which **old and new code coexist**. Every
shape that crosses that window must be readable by both sides.

The damage from a compatibility break is asymmetric:
- A correctness bug fails loudly: a test breaks, a request 500s, someone reverts the PR.
- A compatibility break fails *silently* at a *distance*: old clients post requests that new
  servers reject; new clients post requests that old servers accept but misinterpret; old code
  reads new data and drops a field; new code reads old data and crashes on a missing column.

Once data is written in the new shape, the old shape is gone. You cannot roll back the schema
without losing the writes that happened after the migration. That makes schema changes one of
the few categories where "we'll fix it forward" is genuinely a one-way door.

Hold a high bar here. **Default backward-incompatible schema changes to BLOCKER** until an
explicit migration plan is in place.

## When to Use This Skill

Use this methodology when a PR touches any of the following:

- A `.proto`, `.thrift`, `.fbs`, `.avsc`, `.bond`, or other schema-definition file.
- A type annotated for serialization: `[GenerateSerializer]` / `[Id]` (Orleans), `[DataContract]` /
  `[DataMember]`, `[JsonPropertyName]`, `[ProtoMember]`, `[BondMember]`, `@JsonProperty`, etc.
- A request, response, DTO, view-model, or "model" class consumed by a REST/gRPC/SignalR/queue
  boundary.
- A database migration file (EF, Flyway, Liquibase, Alembic, raw SQL DDL).
- A configuration object exposed over the wire or persisted to disk (`appsettings.*`,
  `settings.json`, cache entries).
- A queue/event payload, including Kafka, Service Bus, Event Hub, or in-process bus envelopes
  that may be read by a different deployable.
- An enum used in any of the above. Enum values are particularly dangerous: removing or
  renumbering one is almost always a break.
- A serializer/deserializer pair where the two sides use different concrete types for the
  "same" payload.

You should also use this skill whenever a reviewer or work item raises a compatibility
question — "old clients won't have this field," "this rolls out before the server side," "what
about clients still on the previous build?", "is this safe for a rolling deploy?", etc.

## The Five Lenses

Every schema review walks the same five lenses. Most PRs only touch two or three, but check
each one.

| Lens                              | The question                                                       |
|-----------------------------------|--------------------------------------------------------------------|
| 1. Backward compatibility         | Can **new code** read data written by **old code**?                |
| 2. Forward compatibility          | Can **old code** safely handle data written by **new code**?       |
| 3. Rollout sequencing             | If client and server land in different deploys, who moves first?   |
| 4. Public-surface stickiness      | Is this shape consumed by something we can't redeploy in lockstep? |
| 5. Serialize/deserialize symmetry | Do the sender and receiver agree on the type shape?                |

The catalog below is organized by change pattern, but each pattern maps to one or more of these
five lenses. If you find a finding that doesn't fit any lens, it probably belongs to a different
review skill.

---

## The Nine Change Patterns

Each pattern includes: detection signals, which lens it violates, severity guidance,
recommendation, and explicit "do NOT flag" rules.

### 1. Removed or Renamed Field

A field that previously existed in the schema has been deleted, or had its serialized name or
wire identifier changed.

**Detection signals:**
- Deleted property on a `[GenerateSerializer]`, `[DataContract]`, `[JsonPropertyName]`, or
  `[ProtoMember]`-annotated class.
- Renamed property where the wire-name attribute (`[JsonPropertyName("foo")]`,
  `[ProtoMember(3, Name = "foo")]`) was also changed.
- A column drop in a database migration, or a column rename in a migration that doesn't add
  the new name as an alias first.
- Proto: a `reserved` keyword *not* added next to the removed field number.
- Orleans: a property with `[Id(N)]` removed, where N is not added to `[GenerateSerializer]`'s
  reserved list.

**Lens:** Backward compatibility (new code drops data that old code wrote) and forward
compatibility (old code may still try to write this field).

**Why it matters:**
- Persisted data already contains the field. After deploy, new code either silently discards
  the value or throws on encountering it.
- Old clients still on the previous build will keep emitting the field. The server now ignores
  it or, worse, fails strict-mode deserialization.
- Renaming the wire identifier (the field number, the JSON key, the `[Id]` number) is the same
  as deleting and re-adding — the old data is unreadable under the new name.

**Severity:** **BLOCKER** by default for any shape that is persisted, sent over a network, or
written to a queue. HIGH if the type is purely in-process but crosses a deployable boundary.
LOW only when you can prove no instance of the old shape exists anywhere — typically a brand-new
type added and removed in the same PR.

**Recommendation:** Don't remove or rename. Instead:
1. Mark the field obsolete/deprecated and keep it readable.
2. Stop *writing* it in a release after every reader has been updated.
3. Only after the last writer is gone and any persisted data has aged out (or been migrated)
   should the field be physically removed.
4. For protobuf, *reserve* the removed field number and name in the same change so it can never
   be accidentally reused for a different type.

**Do NOT flag:**
- Removal of a field that was added in an unreleased branch and never deployed (verify by
  checking git history — was this field ever in a tagged release / production deploy?).
- Internal refactors of a type that is never serialized (no `[GenerateSerializer]`,
  `[DataContract]`, `[JsonPropertyName]`, no `JsonSerializer.Serialize` call site, not a DTO).
- Cleanup of a `reserved` placeholder or sentinel that was clearly never meaningful data.

---

### 2. Added Required Field

A new field that lacks a sensible default, is marked non-nullable, or is enforced as required
by the serializer or database.

**Detection signals:**
- A new property with no default value, where the serializer treats missing-from-the-wire as
  an error (`JsonSerializerOptions` with `RespectRequiredConstructorParameters = true`,
  `[JsonRequired]`, proto3 `optional` keyword absent, Bond required-modifier, etc.).
- A migration that adds a `NOT NULL` column without a default and without a backfill step.
- A constructor parameter added to a `[GenerateSerializer]` type with no default value.
- A new property added to a request DTO where the controller binds with `[FromBody]` and
  rejects requests missing the field.

**Lens:** Backward compatibility (old writers don't include the field; new readers reject the
payload).

**Why it matters:**
- Every payload written before the deploy lacks the field. New readers refuse to deserialize
  them, or read `null`/`default` and propagate it silently into business logic that doesn't
  expect it.
- Database NOT-NULL constraints without a default cause the migration itself to fail on
  any non-empty table.

**Severity:** **BLOCKER** when persisted data or in-flight messages may lack the field. HIGH
for new wire contracts where old clients exist. MEDIUM when the field is added to a brand-new
type only created by the new code.

**Recommendation:** Make the field optional (`?`, `Option<T>`, proto3 `optional`, nullable
column) with a sensible default. If the value is genuinely required for new logic, treat
"absent" as a domain-level signal — fall back to a default or compute it from other fields —
and only enforce required-ness at the boundary that owns the new behavior, not at the
deserializer.

For DB migrations: add the column nullable, deploy, backfill in a second migration, then
optionally tighten to NOT NULL only after every row is filled.

**Do NOT flag:**
- New required fields on a type that does not yet exist in any persisted/transmitted form (a
  brand-new endpoint, a brand-new event, no historical instances).
- Fields where the serializer's behavior on missing values is documented to be a safe default
  (e.g., System.Text.Json default of `default(T)` on missing properties, where the consuming
  code already handles `default`).

---

### 3. Changed Field Type or Semantics

The field name stayed the same, but its type, units, encoding, or meaning changed.

**Detection signals:**
- `int` → `long`, `string` → enum, `decimal` → `double`, `DateTime` → `DateTimeOffset`.
- A field renamed conceptually but kept the same wire name (e.g., `timeoutMs` now interpreted
  as seconds; `userId` now stores a tenant-qualified ID).
- A proto field whose type changed even though the field number stayed the same.
- An enum whose underlying integer type changed (`byte` → `int`) — wire-incompatible in binary
  formats.
- Switching JSON serialization of an enum from integer to string (or vice versa).

**Lens:** Backward compatibility AND forward compatibility — both sides will misinterpret data
that crosses the boundary.

**Why it matters:**
- Numeric narrowing (`long` → `int`) silently truncates large values.
- Numeric widening (`int` → `long`) may break strict deserializers and overflow downstream
  consumers that still expect `int`.
- Unit changes (`ms` → `s`, `bytes` → `KB`) cause off-by-1000 bugs that no test catches because
  both sides individually look correct.
- Enum encoding flips break every previously-persisted value.

**Severity:** **BLOCKER** when the change crosses a persistence or network boundary. HIGH for
purely in-process changes if the type is shared across deployables.

**Recommendation:** Don't change types in place. Add a new field with the new type, populate
both during the transition, switch readers to the new field, then deprecate the old. For unit
or semantic changes, *rename* the field — the rename forces every reader to be updated
consciously, which is the point.

**Do NOT flag:**
- Strictly-additive changes that are protocol-equivalent (e.g., proto3 `int32` to `sint32` is
  wire-different but the same source change usually isn't done; check the wire format).
- Type changes inside a class that is never serialized.
- Enum widening on a binary format that explicitly handles unknown integer values as a default
  fallback.

---

### 4. Removed, Reordered, or Renumbered Enum Value

An enum value was deleted, renamed, or had its underlying integer changed.

**Detection signals:**
- An enum member deleted in a `.cs` / `.proto` file where the enum is serialized.
- Enum members reordered when the serializer uses ordinal position (rare but real — some
  legacy binary formats).
- A renumbered protobuf enum value.
- A `[JsonStringEnumConverter]` enum where a value's display name changed.

**Lens:** Backward compatibility — persisted records carry the old integer or string. The new
code either rejects them or silently maps them to a different value.

**Why it matters:**
- Enums are typically persisted as integers in databases and binary protocols. Removing the
  integer that meant "Pending" leaves rows in the database whose value no longer parses.
- Renumbering is worse: the integer `3` previously meant "Cancelled" and now means "Refunded".
  Every old row is silently mis-categorized.
- For string-encoded enums, renaming a value breaks JSON deserialization and any downstream
  filter/query that referenced the old name.

**Severity:** **BLOCKER** for any enum that is persisted or transmitted. HIGH for purely
in-process enums that cross a deployable boundary.

**Recommendation:** Don't remove enum values. Mark them `[Obsolete]` and stop *producing* them
in a release after all consumers have updated their handling. Don't renumber — for protobuf,
`reserved` the old number permanently. For string enums, treat the old name as an alias rather
than renaming.

**Do NOT flag:**
- Adding new enum values is generally fine — but check that all consumers have a default/fallback
  branch for unknown values. If a `switch` statement throws on unknown values, the new value
  becomes a forward-compat break.
- Reordering of an enum that is serialized by name (not ordinal).

---

### 5. Tightened Constraint

A constraint became stricter: nullable became required, an optional column became NOT NULL,
a min/max range narrowed, a regex pattern got tighter, a unique index was added.

**Detection signals:**
- `int? Foo` → `int Foo`.
- `[Required]` added to an existing property.
- `ALTER COLUMN ... SET NOT NULL` in a migration.
- Validation attributes tightened (`[StringLength(100)]` → `[StringLength(50)]`,
  `[Range(0, 100)]` → `[Range(10, 50)]`).
- A new unique or check constraint on an existing column with data already in it.

**Lens:** Backward compatibility — existing data may violate the new constraint.

**Why it matters:**
- The migration itself can fail at deploy time when applied to data that violates the new rule.
- Old clients can keep emitting values that no longer pass validation; their requests start
  failing for no apparent reason.
- Unique constraints can fail on legitimate historical duplicates that were valid at the time.

**Severity:** **BLOCKER** if the constraint applies to persisted data and existing rows might
violate it. HIGH for API request validation tightening (old clients silently break). LOW when
the constraint is on a brand-new field added in the same PR.

**Recommendation:** Audit existing data first. Either:
- Backfill / clean the data to satisfy the new constraint before tightening, or
- Apply the constraint only to new rows (check constraint with a "valid from" cutoff), or
- Leave the constraint at the application layer and treat violating records as legacy.

**Do NOT flag:**
- Constraint tightening on a column the same PR adds (no historical data exists).
- Loosening constraints (nullable → non-nullable is tightening; the reverse is fine).
- Tightening in places that have no historical data path (e.g., in-memory caches that are
  rebuilt on startup).

---

### 6. Rollout Sequence Violation (Client Ahead of Server)

The client speaks a new dialect — sends a new field, expects a new response shape, calls a new
endpoint — that the deployed server doesn't yet support, with no flag or version gate to hold
the new behavior until the server is ready.

**Detection signals:**
- A new request field, header, or query parameter being sent unconditionally from client code,
  paired with a server-side handler in the same PR.
- A client-side call to a new endpoint with no fallback if the endpoint 404s.
- A new response field being read by the client with no null/missing handling.
- Client and server changes in the same PR with no feature flag, capability negotiation, or
  version check between them.
- In a monorepo, client and server are deployed from different pipelines (check the build/deploy
  config) — even though they're in the same PR, they ship at different times.

**Lens:** Rollout sequencing.

**Why it matters:**
- Production deploys are not atomic. The client rolls out via the CDN or app store; the server
  rolls out via the deployment pipeline. There is always a window — minutes to days — where
  one side has the new code and the other doesn't.
- Older client builds may live for *months* (mobile apps, cached SPAs, embedded devices). Any
  change that assumes "the latest client is everywhere" will produce real user errors.
- Even in service-to-service contexts with rolling deploys, the same service has old and new
  pods running simultaneously during the rollout.

**Severity:** **BLOCKER** when the rollout would produce a user-visible failure (client errors,
500s, broken pages). HIGH when there is a graceful degradation but no flag (the new behavior
quietly doesn't work for a window). MEDIUM if both sides are internal services with coordinated
deploy and the window is short.

**Recommendation:** One of:
- **Flag-gate the client behavior.** Wrap the new request/response shape in `if (featureEnabled)`
  so that until the flag flips, the client speaks the old dialect. The flag flips only after
  the server-side change is fully deployed.
- **Server first, client second.** Land the server-side change in an earlier release; then in
  a later PR, switch the client to use it. The server must be backward-compatible during the
  window.
- **Capability negotiation.** Have the client query a `/capabilities` or version endpoint and
  switch on the result.

For service-to-service: the consumer must tolerate the producer running either the old or new
build for the entire duration of the rolling deploy.

**Do NOT flag:**
- A monolithic deployable where client and server ship as one unit and a single deploy swaps
  both at once (e.g., a server-rendered web app with no separately-cached client). Verify by
  reading the deploy pipeline.
- Strictly-additive request fields that the server simply ignores if the client doesn't send
  them, AND strictly-additive response fields that the client tolerates missing.

---

### 7. Public-Surface or External-Consumer Break

The change touches a shape consumed by something outside the team's control: an external SDK,
a customer integration, a third-party webhook, persisted data with a long retention policy.

**Detection signals:**
- Changes inside an `api/`, `public/`, `sdk/`, `contracts/`, `dto/`, `schema/`, or otherwise
  externally-named module.
- Changes to a type that is exported in a NuGet/npm package the team publishes.
- Changes to an OpenAPI / Swagger spec, or to types code-generated from one.
- DB columns or tables that are exported to a data warehouse or a downstream analytics system.
- Webhook payload shapes — even the addition of a new field changes the JSON the consumer
  sees and may break a strict schema validator on their side.

**Lens:** Public-surface stickiness.

**Why it matters:**
- External consumers cannot be redeployed in lockstep. Their upgrade cadence is their own.
- Public APIs and SDKs effectively become forever — once a customer integrates against
  `userId: string`, you cannot change it to `userId: int` without breaking them, period.
- Even strictly-additive changes can break consumers running strict-mode schema validation.

**Severity:** **BLOCKER** for any back-incompat change to a public/external surface, unless the
PR explicitly documents a versioning strategy (`/v2/users`, breaking change in a major SDK
version with announcement).

**Recommendation:** Treat public surface as append-only or versioned:
- Add new endpoints / new fields rather than changing old ones.
- For genuine breaking changes, introduce a new version (`/v2`, a new SDK major) and keep the
  old one alive for a deprecation window. Document the deprecation policy.
- Coordinate with whoever owns the consumers (customer success, the SDK team, the data
  platform) before merging.

**Do NOT flag:**
- Additive changes to surfaces where consumers are documented to tolerate unknown fields
  (e.g., JSON consumers using lenient deserialization).
- Changes inside types that are *not* exported even if the module is named `api/` — check the
  actual access modifier and the public-symbol list of the package.

---

### 8. Serialize/Deserialize Type-Shape Mismatch

The sender and receiver of a payload use *different concrete types* for the "same" data, and
those types can drift independently. A renamed field on one side silently drops data on the
other.

**Detection signals:**
- A handler that deserializes JSON into `ClientUserRequest` while the producer serialized
  `ServerUserResponse` — and the two types are defined in separate files with no shared base
  type or contract test.
- A queue consumer that deserializes into a manually-defined `EventPayloadDto` whose fields
  duplicate (but don't share) the producer's type.
- A `dynamic`, `JObject`, or `JsonElement` deserializer extracting fields by string name — if
  the producer ever renames the field, the consumer goes silent.
- Two `[GenerateSerializer]` types in a project's `Models/` and `Contracts/` directories with
  near-identical field sets and no test that round-trips between them.
- Code that uses reflection or property-name strings to read deserialized payloads
  (`(string)dict["userId"]`) — drift is undetectable until production.

**Lens:** Serialize/deserialize symmetry.

**Why it matters:**
- Compiler doesn't help. The fields on each side are independently typed, named, and
  documented. A producer rename or addition will compile, run, and pass unit tests on both
  sides — and silently corrupt the payload in flight.
- These mismatches are invisible to static analysis: the data passes as bytes/JSON and only
  the runtime shape matters.
- The fix is usually obvious in retrospect (share the type, generate from a schema, add a
  contract test) but the bug can sit dormant for months until a field is touched.

**Severity:** HIGH when the mismatch is on a critical path or a frequently-changed type;
MEDIUM otherwise. BLOCKER when the PR is *introducing* the duplication (now is the cheapest
moment to fix it).

**Recommendation:** Use one of:
- **Share the type.** Move the DTO to a shared library/project that both producer and consumer
  reference. The compiler then enforces shape agreement.
- **Generate from a schema.** Define the contract in a `.proto` / `.avsc` / OpenAPI spec and
  generate the types for both sides. Schema is the source of truth; the generated code can't
  drift.
- **Contract tests.** If you cannot share the type (e.g., cross-language), add a round-trip
  test: serialize the producer's type, deserialize into the consumer's type, assert every
  field matches. Run it in CI for both sides.

If the PR is *touching* an existing mismatched pair, flag the underlying issue even if the
specific change is fine. The next change will be the one that breaks.

**Do NOT flag:**
- Independent types that intentionally diverge (e.g., a public API DTO and a fuller internal
  domain model that the API DTO projects from — these *should* be separate, with explicit
  mapping code).
- Cases where the two sides communicate via a self-describing format (a versioned envelope,
  a discriminated union with version tags) and the asymmetry is part of the design.

---

### 9. Database Migration Without a Reversal or Backfill Plan

A migration changes the shape of persisted data in a way that can't be rolled back cleanly,
or that requires data to exist before it can succeed.

**Detection signals:**
- A migration that adds a NOT NULL column with no default and no backfill step (covered also
  in pattern 2, but called out here for the DB-specific lens).
- A migration that drops a column with no documented backup of the data.
- A migration that renames a table or column without a transition step (view alias, parallel
  column, or a multi-stage rename).
- A migration with no corresponding `Down` / rollback script when the project's convention is
  to provide one.
- A migration that runs DDL operations expected to be online (concurrent index creation, lock-
  light alter) using blocking syntax — the deploy will lock the table and stall the service.

**Lens:** Backward compatibility AND rollout sequencing AND public-surface stickiness — DB
migrations hit all three because the database outlives every individual deploy.

**Why it matters:**
- Schema migrations cannot be atomically deployed with code. Either the code runs against the
  old schema briefly (forward compat) or the new schema briefly without the code (backward
  compat). Both windows must be safe.
- A migration that fails partway leaves the database in a state that neither old nor new code
  can handle.
- Reverting code is cheap; reverting migrations after data has been written under the new
  shape is expensive or impossible.

**Severity:** **BLOCKER** by default. The blast radius of a bad migration is the whole product;
even a working migration that hasn't been thought through for rolling deploys can break
production.

**Recommendation:** Apply the **expand–migrate–contract** pattern:
1. **Expand:** add new shape alongside the old. New column is nullable; new table coexists
   with the old; new enum value is added before any code emits it.
2. **Migrate:** backfill data, dual-write from the application, update all readers in a follow-
   up deploy.
3. **Contract:** only after every reader and writer has moved to the new shape, and any
   transition data has been processed, remove the old shape.

Each step is a separate deploy. Each step is independently reversible.

**Do NOT flag:**
- Migrations whose project conventions don't require Down scripts and that fit the codebase's
  established pattern.
- Strictly-additive migrations on tables with no existing rows (verify by reading the table's
  history or the migration's preconditions).

---

## How to Use This Catalog

When reviewing a PR, walk the diff with these questions in order:

1. **Identify the schemas being changed.** Read every modified file and tag the type as one
   of: persisted-shape, network-shape, queue-shape, public-surface, internal-only. Internal-
   only types crossing a deployable boundary still count as a wire shape.
2. **For each schema change, walk the nine patterns above.** Most PRs hit two or three.
3. **Cross-check the rollout plan.** If the PR touches both client and server, look for the
   flag/version gate. If it touches a migration, look for the backfill / expand-migrate-contract
   structure. If it touches a public API, look for the versioning strategy.
4. **Look for serialize/deserialize asymmetry separately.** This is the easiest pattern to
   miss because it's not about a *change* — it's about a *structure* that the PR may be
   extending or introducing. A grep for matching pairs of types in producer/consumer paths is
   cheap and high-value.

For each finding, populate the agent's output template with:
- **Schema affected** (type name, file, what kind of shape — persisted/network/public/internal)
- **The change** (the actual diff)
- **Lens violated** (one of the five)
- **Pattern** (one of the nine)
- **Why it matters in this codebase** (specific consumers, specific persisted data, specific
  rollout window)
- **Severity** with justification
- **Recommendation** with concrete steps

## Tech-Specific Reference Files

The patterns above are universal, but each schema technology has fiddly per-tech rules — proto
field numbers, Orleans `[Id]` slots, EF migration conventions, JSON converter behaviors. Load
the relevant reference only when the PR involves that technology:

- **Protobuf / gRPC** — see `references/protobuf.md` (field numbers, reserved, wire-compatible
  type changes, well-known types).
- **JSON DTOs / REST / OpenAPI** — see `references/json-dto.md` (serializer mode flags, naming
  policies, additionalProperties, polymorphic deserialization).
- **Orleans grain interfaces & `[GenerateSerializer]` types** — see `references/orleans.md`
  (`[Id]` discipline, `[Alias]`, surrogate types, grain interface versioning).
- **Database migrations (EF Core, raw SQL)** — see `references/db-migrations.md` (expand-
  migrate-contract templates, online-DDL caveats, default-value pitfalls).
- **Binary formats (MessagePack, Bond, Avro)** — see `references/binary-formats.md` (schema
  evolution rules per format, default handling, union types).

## Anchor Confidence — Self-Assessment Before Reporting

| Anchor source                                   | Confidence  | Posture                                                            |
|-------------------------------------------------|-------------|--------------------------------------------------------------------|
| Work item that explicitly addresses compatibility / migration | HIGH        | Confidently flag deviations from the stated plan                   |
| PR description names rollout order / a flag / a migration plan | HIGH        | Same                                                               |
| Schema change with no compatibility discussion  | MEDIUM      | Flag confidently; emit `[QUESTION]` if you can't tell what's persisted vs. ephemeral |
| Ambiguous (client and server in same PR, no mention of how they roll out) | LOW | Emit `[QUESTION]` on rollout pattern 6, flag confidently on the others |

State the anchor and confidence level in the summary block.

## Final Reminders

- **Be specific.** "This is a backward-incompatible change" is weak. "Field `OrderId` is removed
  from `OrderCreatedEvent` (Models/Events/OrderCreatedEvent.cs:42). This event is published to
  Service Bus topic `orders` and consumed by the `BillingService` and `NotificationService`,
  which deserialize into their own copies of the type and read `OrderId`. After this deploy, in-
  flight messages written by the old producer will deserialize into a `null` `OrderId` on the
  consumer side and silently fail." is useful.
- **Compatibility is asymmetric in cost.** A false-negative (you miss a real break) is much
  worse than a false-positive (you flag something safe). When uncertain, flag with `[QUESTION]`
  and request clarification rather than waving the change through.
- **Acknowledge safe schema changes.** Strictly-additive changes with sensible defaults, proper
  reserved markers, and a documented rollout plan are exactly what you want to see. Say so
  explicitly. Reviewers who only surface negatives lose credibility.
