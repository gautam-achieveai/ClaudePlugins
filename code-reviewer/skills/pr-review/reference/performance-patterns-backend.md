# Performance Anti-Pattern Catalog — Backend

Reference material for `code-reviewer:performance-review`. Load this file when
the PR touches backend (.NET) code. Frontend patterns live in the sibling file
`performance-patterns-frontend.md`; load that one instead, or both only when the
PR genuinely touches both stacks.

Companion file: `performance-guide.md` in this same directory holds
language-agnostic before/after code examples for the generic cases (N+1,
indexes, eager loading, pagination, memory leaks, large allocations, algorithmic
complexity, sequential API calls, caching). It does not overlap substantively
with this file — use the guide for worked examples, this catalog for detection.

## Index

| § | Section |
|---|---------|
| 1 | Async/Await Anti-Patterns |
| 2 | Memory & Allocation Hazards |
| 3 | HTTP/Network Anti-Patterns |
| 4 | Database Performance |
| 5 | Concurrency & Thread Pool |
| 6 | Caching Anti-Patterns |
| 7 | Serialization & Payload |

---

## Backend Performance Patterns

### 1. Async/Await Anti-Patterns (HIGH severity)

The most common source of production performance failures in .NET services.
Incorrect async usage causes thread pool starvation, deadlocks, and cascading
timeouts under load.

**What to grep for:** `.Result`, `.Wait()`, `.GetAwaiter().GetResult()`,
`async void`, `Task.Run` wrapping async calls, missing `await`, `Thread.Sleep`
in async code, missing `CancellationToken` parameters.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **Sync-over-async** | `task.Result`, `task.Wait()`, `task.GetAwaiter().GetResult()` | Blocks a thread pool thread waiting for async work. Under load, all threads block → thread pool starvation → cascading timeouts. The #1 cause of "works in dev, dies in prod." | HIGH |
| **Async void** | `async void HandleEvent(...)` instead of `async Task` | Cannot be awaited, exceptions crash the process, caller doesn't know when it completes. Only valid for event handlers in UI frameworks. | HIGH |
| **Fire-and-forget** | `_ = DoWorkAsync();` or `Task.Run(() => DoWorkAsync())` without error handling | Silent failures. If the service is disposed before the task completes, `ObjectDisposedException`. If the task throws, nobody knows. | HIGH |
| **Forgotten await** | `DoWorkAsync();` without `await` (compiler warning CS4014) | Code continues before operation completes — data races, incomplete writes, misleading success responses. | HIGH |
| **Thread.Sleep in async** | `Thread.Sleep(1000)` instead of `await Task.Delay(1000)` | Blocks the thread pool thread. Use `Task.Delay` in async code. | MEDIUM |
| **Missing CancellationToken** | Async methods without `CancellationToken` parameter, especially in controllers/handlers | Cannot cancel long-running operations when clients disconnect. Wasted server resources processing abandoned requests. | MEDIUM |
| **Unbounded Task.WhenAll** | `Task.WhenAll(items.Select(x => CallApiAsync(x)))` on large collections | Fires all requests simultaneously — saturates thread pool, exhausts connections, overwhelms downstream services. Batch with `SemaphoreSlim` or `Parallel.ForEachAsync`. | HIGH |

### 2. Memory & Allocation Hazards (HIGH severity)

Patterns that cause out-of-memory crashes or excessive garbage collection
pressure, particularly under sustained load.

**What to grep for:** `static` collections (`List`, `Dictionary`, `ConcurrentDictionary`),
string concatenation in loops (`+=`), `new byte[` with large sizes, `ToArray()`,
`ToList()` on unbounded queries, `GC.Collect`.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **Unbounded static collections** | `static List<T>`, `static Dictionary<K,V>` that only add, never evict | Grows forever → OOM. Common in caches without eviction, event registries, connection trackers. | HIGH |
| **String concatenation in loops** | `result += item.ToString()` inside `for`/`foreach` | Strings are immutable — each `+=` allocates a new string. O(n²) allocations. Use `StringBuilder`. | MEDIUM |
| **Large Object Heap allocations** | `new byte[85001]`, large arrays, huge strings per-request | Objects >85KB go to LOH → Gen2 GC, compaction pauses. Use `ArrayPool<T>.Shared.Rent()` or `RecyclableMemoryStream`. | HIGH |
| **Per-request large buffers** | `new MemoryStream()`, `new byte[bufferSize]` in request handlers | High GC pressure under load. Pool with `ArrayPool<T>` or `ObjectPool<T>`. | MEDIUM |
| **Event handler leaks** | `event += handler` without corresponding `-=` | Publisher prevents subscriber from being GC'd. Common with long-lived services subscribing to events. | HIGH |
| **IDisposable not disposed** | `new SqlConnection()`, `new HttpClient()`, `new StreamReader()` without `using` | Leaked file handles, sockets, connections. Especially dangerous for DB connections (pool exhaustion). | HIGH |

### 3. HTTP/Network Anti-Patterns (HIGH severity)

Network calls are the slowest operations in most services. Misuse causes socket
exhaustion, cascading failures, and unnecessary latency.

**What to grep for:** `new HttpClient()`, `HttpClient` in loops, missing
`Timeout`, missing retry policies, sequential `await` calls that could be
parallel, `GetStringAsync` or `ReadAsStringAsync` on large payloads.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **HttpClient per-request** | `using var client = new HttpClient()` | Socket exhaustion (TIME_WAIT state, 240s cooldown). Use `IHttpClientFactory` or a singleton. Microsoft's #1 HttpClient anti-pattern. | CRITICAL |
| **N+1 HTTP calls** | `foreach (var id in ids) { await client.GetAsync($"/api/{id}"); }` | 100 items = 100 round trips. Batch into a single request or use `Task.WhenAll` with throttling. | HIGH |
| **Missing timeout** | `HttpClient` without `Timeout` set, or very long timeouts | One slow downstream service hangs the caller forever. Default is 100s — often too long. Set explicit timeouts. | HIGH |
| **Sequential awaits (should be parallel)** | `var a = await GetA(); var b = await GetB(); var c = await GetC();` when independent | Three sequential round trips. If independent, use `Task.WhenAll(GetA(), GetB(), GetC())`. | HIGH |
| **Retry storms** | Aggressive retry (5 retries, no backoff) on transient failures | When downstream is overloaded, retries multiply load 5x → makes outage worse. Use exponential backoff + jitter + circuit breaker. | HIGH |
| **Reading large response into string** | `await response.Content.ReadAsStringAsync()` on large payloads | Entire response in memory as string (2 bytes/char in .NET). For large JSON, use `ReadAsStreamAsync` + streaming deserialization. | MEDIUM |

### 4. Database Performance (HIGH severity)

Database patterns that work in development but cause cascading failures at
production scale.

**What to grep for:** `.Find()` or `.FirstOrDefault()` in loops, `.ToList()`
without `.Take()`, `.Include()` chains, missing `.AsNoTracking()`, synchronous
DB calls in async context, `SaveChanges()` vs `SaveChangesAsync()`.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **N+1 queries** | `foreach (var x in items) { db.Find(x.Id); }` or lazy loading in loops | 100 items = 101 queries (1 list + 100 lookups). Use `.Include()`, batch queries, or `Filter.In` for MongoDB. | HIGH |
| **Unbounded result sets** | `.ToList()` or `.ToListAsync()` without `.Take()` or pagination | Returns entire table to memory. 1M rows × 1KB each = 1GB. Always limit with `Take(N)` or cursor-based pagination. | HIGH |
| **Cartesian explosion** | Multiple `.Include()` on collection navigations | EF Core produces a cartesian join — 10 orders × 10 items × 10 tags = 1000 rows. Use `.AsSplitQuery()`. | HIGH |
| **Tracking queries for reads** | `.Where(...).ToList()` without `.AsNoTracking()` on read-only queries | Change tracking allocates a snapshot per entity. For reads, `.AsNoTracking()` reduces memory and CPU. | MEDIUM |
| **Connection pool exhaustion** | Long-held connections, missing `using`, non-async calls on pooled connections | All connections busy → new requests queue → timeouts. Always dispose connections promptly and use async. | HIGH |
| **Premature materialization** | `.ToList().Where(...)` or `.ToList().OrderBy(...)` | Pulls entire table to memory, then filters in C#. Push filtering to the database. | HIGH |

### 5. Concurrency & Thread Pool (HIGH severity)

Patterns that cause thread starvation, deadlocks, and race conditions under
concurrent load.

**What to grep for:** `lock(this)`, `lock` on hot paths, `Monitor.Enter`,
`Mutex` in request handlers, `Task.Run` in ASP.NET, `Thread.Sleep`,
`.Result`, `ConcurrentDictionary` misuse.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **Thread pool starvation** | `.Result`/`.Wait()` in async context consuming thread pool threads | Each blocking call holds a thread. Under load, all 500+ threads block → no threads for incoming requests → cascading timeouts. | HIGH |
| **Lock contention on hot paths** | `lock(_sync) { await DoWorkAsync(); }` or locks around I/O | Long-held locks serialize request processing. Holding a lock across an await is especially dangerous (different thread may resume). | HIGH |
| **lock(this) or lock on public type** | `lock(this)`, `lock(typeof(MyClass))` | External code can lock on the same reference → deadlock. Use `private readonly object _lock = new();` | MEDIUM |
| **Unbounded Task.Run in ASP.NET** | `Task.Run(() => CpuWork())` in every request handler | Each request queues work to thread pool → under load, queue grows unbounded. For CPU-bound work, consider rate limiting. | MEDIUM |

### 6. Caching Anti-Patterns (MEDIUM severity)

Missing or misused caching that puts unnecessary load on downstream services
and databases.

**What to grep for:** `IMemoryCache`, `IDistributedCache`, `GetOrCreate`,
cache keys, expiration settings, static dictionaries used as caches.

**Patterns to flag:**

| Pattern | Why It's Dangerous | Severity |
|---------|-------------------|----------|
| **Cache without expiration** | Stale data served indefinitely. All caches need a TTL or explicit invalidation. | MEDIUM |
| **Unbounded cache growth** | `MemoryCache` or `Dictionary` without size limit → OOM under high cardinality. Use `SizeLimit` option. | HIGH |
| **Cache stampede** | Hundreds of requests hit expired cache simultaneously → all query the DB. Use `GetOrCreateAsync` with locking or stale-while-revalidate. | MEDIUM |
| **Missing cache for hot data** | Same expensive query executed per-request for data that changes infrequently. | MEDIUM |

### 7. Serialization & Payload (MEDIUM severity)

Patterns that waste memory and CPU on unnecessary data transformation.

**What to grep for:** `JsonConvert.SerializeObject`, `JsonConvert.DeserializeObject`,
`System.Text.Json`, `ReadAsStringAsync` before deserialization, large DTOs.

**Patterns to flag:**

| Pattern | Why It's Dangerous | Severity |
|---------|-------------------|----------|
| **Deserialize + re-serialize for pass-through** | Full round-trip when the data just passes through. Use raw JSON forwarding or `JsonElement`. | MEDIUM |
| **ReadAsString then Deserialize** | `var json = await resp.Content.ReadAsStringAsync(); var obj = JsonConvert.DeserializeObject(json);` — double allocation. Use `ReadAsStreamAsync` + `DeserializeAsync`. | MEDIUM |
| **Over-serialization** | Returning full entity (50 fields) when consumer needs 5 fields. Large payloads waste bandwidth, serialization CPU, and client parse time. | LOW |
| **Newtonsoft.Json for simple cases** | `System.Text.Json` is 2-5x faster for typical serialization. Use Newtonsoft only when its features (converters, dynamic) are needed. | LOW |
