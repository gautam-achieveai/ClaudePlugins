---
name: orleans-patterns
description: Comprehensive Orleans patterns and rules — grain design, concurrency, cross-grain communication, streams, and serialization
---

# Orleans Patterns and Best Practices

You are an expert in Microsoft Orleans. Help the user design, implement, and review Orleans applications against the patterns and rules documented here and in the reference files.

## Reference Files

Detailed rules, code examples, and anti-patterns for each area are in:

- `references/grain-design.md` — Interfaces, classes, lifecycle, state, sizing, grain references
- `references/concurrency.md` — Single-threaded model, reentrancy, deadlocks, Task scheduling, background threads
- `references/cross-grain-communication.md` — Calling patterns, fan-out, aggregation, error propagation
- `references/streams.md` — Producers, consumers, implicit/explicit subscriptions, providers, recovery
- `references/serialization.md` — GenerateSerializer, Id attributes, surrogates, versioning, immutability

Read the relevant reference file(s) when working on a specific area.

## Quick Reference — Anti-Patterns Checklist

### Grain Design
- [ ] Interface methods with non-Task return types
- [ ] Missing `[GenerateSerializer]` on state classes
- [ ] Static mutable fields in grain classes
- [ ] `OnDeactivateAsync` for critical persistence
- [ ] Missing `WriteStateAsync()` after state mutation
- [ ] `async void` methods

### Concurrency
- [ ] `task.Wait()`, `.Result`, `.GetAwaiter().GetResult()`
- [ ] `ConfigureAwait(false)` in grain code
- [ ] `Thread.Sleep` instead of `Task.Delay`
- [ ] `lock`, `Mutex`, `Semaphore` in grains
- [ ] Grain state accessed inside `Task.Run`
- [ ] Missing `.Unwrap()` on `Task.Factory.StartNew` with async delegates
- [ ] Cyclic calls without reentrancy

### Communication
- [ ] Chatty grain-to-grain patterns
- [ ] Passing `this` instead of `this.AsReference<T>()`
- [ ] Hot grains without aggregation
- [ ] Request-per-field instead of batch responses

### Streams
- [ ] Missing `ResumeAsync` in `OnActivateAsync` for explicit subscriptions
- [ ] Missing `OnSubscribed` for implicit subscriptions
- [ ] No `PubSubStore` configured
- [ ] Not awaiting `OnNextAsync` (breaks ordering)
- [ ] Duplicate subscriptions without checking existing handles

### Serialization
- [ ] Missing `[GenerateSerializer]` or `[Id]` attributes
- [ ] Reused/changed `[Id]` values
- [ ] Mutable types marked `[Immutable]`
- [ ] `record` ↔ `class` changes
- [ ] Missing `[Alias]` on long-lived stored types
- [ ] Missing `[RegisterConverter]` on surrogate converters
