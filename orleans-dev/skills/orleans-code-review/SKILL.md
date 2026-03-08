---
name: orleans-code-review
description: Review Orleans code for correctness — loads orleans-patterns rules and systematically checks grain design, concurrency, communication, streams, and serialization
---

# Orleans Code Review

You are a senior Microsoft Orleans expert performing a code review. Before reviewing, load the Orleans rules from the **orleans-patterns** skill and its reference files:

- `../orleans-patterns/references/grain-design.md`
- `../orleans-patterns/references/concurrency.md`
- `../orleans-patterns/references/cross-grain-communication.md`
- `../orleans-patterns/references/streams.md`
- `../orleans-patterns/references/serialization.md`

Read the relevant reference files before checking code against them.

## Review Workflow

### Step 1: Discover Orleans Code

Search the codebase for:

- Grain interfaces (`IGrainWith*Key`)
- Grain classes (`Grain`, `Grain<T>`)
- Serializable types (`[GenerateSerializer]`, `[Serializable]`)
- Stream usage (`IAsyncStream`, `IStreamProvider`, `ImplicitStreamSubscription`)
- Configuration (`UseOrleans`, `AddMemoryStreams`, `AddAzureQueueStreams`)
- State classes (`IPersistentState<T>`, `Grain<T>`)

### Step 2: Review by Focus Area

For each area below, read the matching reference file, then check the code.

**Grain Design** (ref: `grain-design.md`)
- [ ] Interface methods return `Task` / `Task<T>` / `ValueTask<T>`
- [ ] Interface inherits from `IGrainWith*Key`
- [ ] No static mutable state
- [ ] `OnDeactivateAsync` not used for critical persistence
- [ ] `WriteStateAsync()` called after state mutations
- [ ] State classes have `[GenerateSerializer]` + `[Id]`
- [ ] Single responsibility, appropriately sized grains
- [ ] Constructor injection for dependencies
- [ ] No `async void`

**Concurrency** (ref: `concurrency.md`)
- [ ] No `.Wait()`, `.Result`, `.GetAwaiter().GetResult()`
- [ ] No `ConfigureAwait(false)` in grain code
- [ ] No `Thread.Sleep`
- [ ] No `lock` / `Mutex` / `Semaphore`
- [ ] `Task.Run` does not access grain state
- [ ] `Task.Factory.StartNew` with async uses `.Unwrap()`
- [ ] Reentrancy applied where cyclic calls exist
- [ ] `[ReadOnly]` on methods that don't modify state

**Cross-Grain Communication** (ref: `cross-grain-communication.md`)
- [ ] No chatty patterns
- [ ] `this.AsReference<T>()` not `this`
- [ ] No hot grains without aggregation
- [ ] Coarse-grained messages
- [ ] Cyclic call graphs have reentrancy protection

**Serialization** (ref: `serialization.md`)
- [ ] `[GenerateSerializer]` on all serializable types
- [ ] `[Id]` on all serialized members
- [ ] No reused/changed `[Id]` values
- [ ] `[Alias]` on long-lived stored types
- [ ] `[Immutable]` only on truly immutable types
- [ ] `[RegisterConverter]` on surrogate converters

**Streams** (ref: `streams.md`)
- [ ] Explicit subscriptions resumed in `OnActivateAsync`
- [ ] Implicit subscriptions implement `OnSubscribed`
- [ ] `PubSubStore` configured
- [ ] `OnNextAsync` awaited by producers
- [ ] `OnErrorAsync` implemented
- [ ] No duplicate subscriptions

### Step 3: Report

## Severity Levels

- **Critical**: Runtime failures, deadlocks, data loss, crashes. Must fix.
- **Warning**: Issues under load, during failures, or edge cases. Should fix.
- **Info**: Best practice violation. Suboptimal but functional.

## Output Format

```
## Orleans Code Review Results

### Summary
- Critical: N issues
- Warning: N issues
- Info: N issues

### Grain Design
| Severity | Location | Issue | Fix |
|----------|----------|-------|-----|

### Concurrency
| Severity | Location | Issue | Fix |
|----------|----------|-------|-----|

### Cross-Grain Communication
| Severity | Location | Issue | Fix |
|----------|----------|-------|-----|

### Serialization
| Severity | Location | Issue | Fix |
|----------|----------|-------|-----|

### Streams
| Severity | Location | Issue | Fix |
|----------|----------|-------|-----|
```

## Guidelines

- Read ALL grain-related files before reporting. Do not review in isolation.
- Understand the grain call graph before flagging deadlock risks.
- Consider the application domain when assessing grain sizing.
- Flag patterns, not just individual lines.
- Provide concrete, copy-pasteable fix suggestions.
- If code is correct and well-structured, say so.
