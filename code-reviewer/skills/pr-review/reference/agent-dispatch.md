# Agent Dispatch Catalog

Load this file at **Steps 2 and 7-8** — when classifying changed files and
dispatching review agents. Every dispatched agent's prompt MUST include the
discipline blocks from [agent-guidance.md](agent-guidance.md).

## File Classification (Step 2)

Categorize each changed file by domain to determine which checks and agents to apply:

| Path Pattern | Domain | Checks to Apply |
|---|---|---|
| `src/Client/BLogic/**` or `src/Client/Apps/**` | NScript Client | NScript compliance, MVVM patterns |
| `src/Client/**/*.html` | Templates | Binding syntax, xmlns, skin attributes |
| `src/Client/**/*.less` or `*.css` | Styling | LESS conventions, camelCase classes |
| `src/Server/Sources/WebServers/**` | Server Controllers | Layer discipline, no direct DB access |
| `src/Server/Sources/BLogic/**` | Server Business Logic | Layer discipline, MongoDB patterns |
| `src/Server/Sources/Orleans/**` | Orleans Grains | Grain architecture, reentrancy |
| `src/Server/Tests/**` | Tests | Test quality, coverage mapping |
| `*.csproj` | Project Config | SDK, references, compile items |

## Domain Agents (Step 7)

Based on file classification, dispatch the appropriate specialized review agents in parallel. Only dispatch agents whose domain is present in the PR:

- **`nscript-review`**: Dispatch when changed files include NScript client code — `.cs` files under `src/Client/` referencing `ObservableObject`, `Promise<T>`, `[AutoFire]`, `Mcqdb.NScript.Sdk`, or `.html`/`.less` template/style files in client projects. Covers AutoFire/nameof enforcement, Promise patterns, IoC registration, NScript C# restrictions, MVVM patterns, template bindings, LESS conventions, and JS interop attributes (`[JsonType]`, `[IgnoreNamespace]`, `[ScriptName]`).

- **`orleans-review`**: Dispatch when changed files include Orleans grain code — classes inheriting `Grain`/`Grain<TState>`, grain interfaces (`IGrainWithStringKey`, etc.), `[Reentrant]`/`[AlwaysInterleave]` attributes, stream subscriptions, or silo configuration. Covers reentrancy/deadlock analysis, state management, stream anti-patterns, grain-level architecture (upward level references, cross-level calls, missing marker interfaces, missing `[StorageProvider]`), and async patterns within grains.

- **`debugging:logging-review`**: Dispatch when changed files include logging statements — `ILogger`, `LoggerFactory`, `_logger.Log*`, structured logging templates, or test code with `Console.WriteLine`. Covers structured logging compliance, log levels, queryability, test logging practices, EUII policy enforcement, and client-side log forwarding checks.

- **`temp-code-review`**: **Always dispatch for every PR.** Scans all changed files for temporary code, debugging artifacts, hardcoded bypasses/hacks, mistakenly committed files, test/mock data in production code, disabled tests, and accidental inclusions. Catches `Console.WriteLine` in production code, `// HACK`/`// TODO: remove` comments, hardcoded credentials, `.env` files, forced `if (true)` branches, `Debugger.Launch()`, and similar patterns that should never reach production.

- **`duplicate-code-detector`**: Dispatch when PR adds substantial new code (new classes, methods, or logic blocks). Finds exact duplicates, near-duplicate blocks with minor variations, repeated patterns, and structural duplication across the changed files and the broader codebase. Suggests concrete extractions (shared methods, base classes, utilities).

- **`euii-leak-detector`**: Dispatch when PR adds or modifies logging, telemetry, error messages, or HTTP logging. Scans for End User Identifiable Information (EUII) leaks — emails, names, tokens, IPs, passwords, connection strings. Uses heuristic field name matching to catch PII in log templates, exception messages, and API responses.

- **`class-design-simplifier`**: Dispatch when PR introduces NEW classes, interfaces, or architectural layers. Analyzes what the PR is trying to accomplish, then flags over-engineering: single-implementation interfaces, pass-through layers, premature generalization, deep inheritance hierarchies. Proposes merging, inlining, or flattening.

- **`code-simplifier`**: Dispatch when PR introduces complex control flow (deep nesting, long method chains, verbose conditional logic) or when changed methods exceed ~30 lines. Finds code blocks and method chains that are more complex than they need to be — unnecessary method chains, overly verbose patterns, expressions with simpler equivalents, and control flow that can be flattened. Complements `class-design-simplifier` (which focuses on class/layer-level complexity) by focusing on **expression and block-level** simplification. **Do NOT dispatch** for PRs that are purely mechanical (renames, formatting, bulk attribute changes) or documentation-only.

- **`over-engineering-review`**: Dispatch when a linked work item, PR description, or user-supplied task description gives a clear "what was asked" anchor — and the PR's diff feels larger or more elaborate than that anchor would justify. Compares delivered scope to stated intent and flags drive-by refactors, speculative abstractions for hypothetical futures, defensive code for impossible scenarios, premature optimization without measurement, unrequested features, excessive logging, tutorial-style comments, single-use helper extractions, unused configuration hooks, and parallel duplicate code paths added next to existing code instead of extending it. Especially valuable for LLM-generated PRs, which disproportionately over-produce. Distinct from `class-design-simplifier` and `code-simplifier`, which judge complexity in isolation; this agent judges complexity *relative to the task*. **Do NOT dispatch** when no anchor source is available (no work item, vague PR description, no commits/user context) and the diff is small — the YAGNI-only fallback is too noisy on tiny PRs.

- **`exception-handling-review`**: Dispatch when changed files contain `try`/`catch` blocks, `throw` statements, custom exception classes, or error-handling middleware. Reviews exception handling for swallowed exceptions, overly broad catches, incorrect re-throws (`throw ex` vs `throw`), missing logging in catch blocks, exceptions used for flow control, catch-log-rethrow duplication across layers, async exception pitfalls (`async void`, fire-and-forget), finally block issues, and missing guard clauses. Findings are HIGH-MEDIUM severity.

- **`test-coverage-review`**: Dispatch when the PR modifies production code (any non-test `.cs`, `.js`, `.ts` file). Maps production changes to test changes, verifies tests cover the actual behavior being modified (not just adjacent code), checks for over-mocking, test-driven production pollution, fragile tests, and missing edge cases. For bug fixes, applies the litmus test: "Would this test have FAILED before the fix?" Focuses on behavioral coverage over line coverage, with a 1-10 criticality rating. Findings are HIGH-MEDIUM severity.

- **`architecture-review`**: Dispatch when PR introduces new services, classes, or projects; modifies `.csproj` project references; changes DI registrations; adds cross-layer dependencies; or restructures module/project boundaries. Reviews layer boundary violations (controller accessing DB directly), dependency direction in project references, god class/service detection, circular dependencies, DI anti-patterns (service locator, captive dependencies), cross-cutting concern mismanagement, and bounded context violations. **Do NOT dispatch** when PR only modifies method bodies, configuration values, or styling with no structural changes. Complements `class-design-simplifier` (which focuses on class-level complexity) by analyzing system-level architectural health.

- **`performance-review`**: Dispatch when changed files contain async/await patterns, `HttpClient` usage, database access (EF Core, MongoDB, SQL queries), large collection operations (`.ToList()`, `.ToArray()` on queries), caching logic (`IMemoryCache`, `IDistributedCache`), serialization/deserialization, React components with hooks (`useState`, `useEffect`, `useMemo`, `useCallback`), `fetch`/`axios` calls, state management (Redux, Context), or bundle configuration. Also dispatch when the PR description or linked work item mentions performance, optimization, scaling, latency, memory, or throughput. Auto-detects backend (.NET/C#) vs frontend (React/JS/TS) domains from changed files and applies only relevant patterns. Covers: sync-over-async/thread pool starvation, OOM patterns (unbounded collections, LOH, missing dispose), N+1 HTTP/DB calls, HttpClient misuse, connection pool exhaustion, request waterfalls, bundle size anti-patterns, React re-render cascades, DOM performance, and frontend memory leaks. Findings range from CRITICAL (socket exhaustion, unbounded queries) to MEDIUM (missing memoization, over-serialization). **Do NOT dispatch** when the PR only modifies documentation, test-only files, configuration values, or CSS/LESS styling with no production logic changes.

- **`schema-compatibility-review`**: Dispatch when changed files include a `.proto` / `.thrift` / `.avsc` / `.fbs` / `.bond` schema file, a database migration (EF Core `Migrations/`, Flyway, Liquibase, raw SQL DDL), a type annotated for serialization (`[GenerateSerializer]`, `[Id]`, `[DataContract]`, `[DataMember]`, `[JsonPropertyName]`, `[ProtoMember]`, `[BondMember]`, `@JsonProperty`), a request/response DTO, a queue or event payload, a public-API or SDK-exported type, an enum used in persisted/transmitted data, or any code on either side of a serialize/deserialize boundary. Also dispatch when the PR description, work item, or commit message mentions rollout order, deploy window, rolling deploy, feature flag gating a wire change, capability negotiation, schema versioning, or forward/backward compatibility. Walks the five compatibility lenses (backward, forward, rollout sequencing, public-surface stickiness, serialize/deserialize symmetry) and nine change patterns (removed/renamed field, added required field, type/semantic change, enum value change, tightened constraint, rollout sequence violation, public-surface break, serializer-asymmetry, migration footgun). Findings default to BLOCKER for any backward-incompatible change to persisted or public-surface shapes; HIGH for rollout-sequence violations without a flag; HIGH/MEDIUM for serializer asymmetry being introduced or extended. Distinct from `architecture-review` (system structure), `performance-review` (runtime characteristics), and `over-engineering-review` (scope) — this agent specifically owns *wire-level and persisted compatibility across the deploy window*. **Do NOT dispatch** when the PR only touches in-process types that are never serialized, persisted, or sent over a network, and there is no migration file in the diff.

- **`feature-flag-reviewer`**: Dispatch when the PR introduces changes large or risky enough that a bad rollout would be expensive to reverse — and recommend whether the change should ship behind a feature flag. Specific triggers: new or modified business logic on a critical path, changed default values or validation rules, new/changed API contracts (request/response shapes, status codes), database schema migrations, new external service dependencies, changed retry/timeout/circuit-breaker configurations, new background jobs or async workflows, large refactors of code with broad fan-out, or work items tagged "risky" / "high-blast-radius" / "behind-flag". Assesses **blast radius** (how many users/requests the change touches), **reversibility** (can it be rolled back cleanly, or has it written persisted state), and **change type** (behavior change, data change, infra change) to recommend a flag strategy: full kill-switch, percentage rollout, ring-based rollout, or no flag needed. Findings are advisory MEDIUM by default; escalate to HIGH when the change is irreversible (e.g., persisted-data shape change with no rollback) and ships without a flag. Distinct from `schema-compatibility-review` (which owns *whether the change breaks compat*) — this agent owns *whether the change should be flag-gated regardless of compat*. **Do NOT dispatch** when the PR is purely additive in a low-risk area (new internal helper, documentation, test additions), purely cosmetic (renames, formatting), or already explicitly behind a flag named in the diff.

<mandatory_dispatch>
**Dispatch rules:**
- **`temp-code-review` is mandatory** — dispatch it for every PR regardless of domain
- A single PR may trigger multiple agents (e.g., a PR touching both Orleans grains and NScript client code dispatches both `orleans-review` and `nscript-review`)
- Run all applicable agents in parallel — they are independent
- Collect findings from all agents before proceeding to step 8
</mandatory_dispatch>

## Server-Side Checks (applied directly, no agent needed)

These checks apply to server-side code (`src/Server/`) and should be performed as part of the general review in steps 4-6:

**Server Layer Discipline (HIGH severity):**

| Check | What to Flag |
|---|---|
| Layer violation | Controller directly accessing `IMongoCollection<T>` (should go through WebApi.Core helper) |
| Cursor leak | `ToCursorAsync()` without `using` block or `.ForEachCursor()`/`.ToEnumerableAsync()` wrapper |
| Missing DI registration | New service class without corresponding registration in IoC config |
| Direct `new` of services | `new MyService()` instead of DI injection |
| Wrong build tool | References to `dotnet build` for Server.sln (should be MSBuild) |

**MongoDB Patterns (MEDIUM severity):**

| Check | What to Flag |
|---|---|
| N+1 query | Loop with individual `.Find()` calls (should use `Filter.In` for batch) |
| Missing index hint | New filter field not covered by existing indexes |
| No VersionId on update | `FindOneAndUpdateAsync` without `VersionId` in filter for concurrency-sensitive docs |
| Large ToListAsync | `.ToListAsync()` on potentially large collections (should use cursor with `BatchSize`) |
| Missing read preference | Read-heavy query without `WithReadPreference(SecondaryPreferred)` |

## External Agents (Step 8)

Beyond the plugin-owned domain agents, the environment provides additional review agents that add unique value for specific PR types. Dispatch them conditionally based on PR signals.

**Agent Dispatch Matrix:**

| Agent | Dispatch When | Skip When |
|---|---|---|
| `pr-review-toolkit:silent-failure-hunter` | PR contains try-catch blocks, error handling, fallback logic, `.catch()`, `Result<T>` | PR is purely additive with no error handling, or only config/styling |
| `pr-review-toolkit:type-design-analyzer` | PR introduces NEW classes, records, structs, interfaces — especially data models, domain entities, DTOs | PR only modifies method bodies without changing type signatures |
| `pr-review-toolkit:pr-test-analyzer` | PR includes test file changes OR adds new public methods that should have tests | PR is test-only with no source changes, or documentation-only |
| `pr-review-toolkit:comment-analyzer` | PR adds/modifies XML doc comments, inline documentation blocks, or README content | PR has no comment changes |
| `pr-review-toolkit:code-simplifier` | PR is LARGE (20+ files) AND introduces complex new logic (deep nesting, long methods) | PR is small/medium or straightforward changes |
| `orleans-dev:orleans-reviewer` | PR modifies Orleans grain code spanning 5+ grain files, changes cross-grain communication patterns, or restructures silo configuration. Provides deeper Orleans expertise than the code-reviewer plugin's `orleans-review` agent — dispatch both for complex Orleans PRs | PR touches 1-2 grain files with simple changes (step 7's `orleans-review` is sufficient) |
| `code-simplifier:code-simplifier` | PR introduces verbose or complex logic that could benefit from a second simplification pass — especially when step 7's `code-simplifier` has already flagged issues and you want a complementary perspective | Step 7's `code-simplifier` found no issues, or PR is small/mechanical |
| `superpowers:code-reviewer` | **Dispatch whenever the PR's linked work item/bug/task has an implementation plan.** During step 1, when fetching work item details and comments, read the full comment/reply chain to determine if an implementation plan was posted (by a bot or a human). Also check the PR description for references to a plan, spec, design doc, or requirements. If any form of implementation plan exists, dispatch this agent — it reviews whether the actual code matches what was planned, catching drift, missed steps, partial implementations, and deviations without justification. | No linked work item exists, OR after reading the work item comments and PR description no implementation plan or spec is found, OR the PR is a hotfix with no prior planning |

**Agents excluded by default (overlap with steps 4-7):**
- `pr-review-toolkit:code-reviewer` — Steps 4-5 already cover general code quality with project-specific reference guides
- `feature-dev:code-reviewer` — Same overlap with steps 4-5
- `architecture-reviewer` — Step 7's `architecture-review` agent covers architectural issues with project-specific context; skip the external `architecture-reviewer`
- **Exception**: Dispatch `feature-dev:code-reviewer` as a second-opinion safety net when PR is **30+ files** OR touches **security-sensitive code** (auth, crypto, payment)

<dispatch_heuristics>
**Size-based dispatch heuristics:**
- **Small PR (1-5 files)**: 0-1 external agents — only dispatch if strong signal match
- **Medium PR (6-19 files)**: 1-2 external agents — dispatch best-matching agents
- **Large PR (20+ files)**: All matching agents — cast a wide net
</dispatch_heuristics>

**Future-proofing for unknown agents:** For agents NOT listed in the catalog above (newly added to the environment), evaluate by reading their description and checking: (a) does it cover something not already addressed in steps 4-7? (b) does this PR have relevant signals for it? If both answers are yes, dispatch the agent.

**Execution:** Run all selected external agents in parallel. Where possible, dispatch concurrently with step 7 domain agents to minimize wall-clock time. Collect all findings before proceeding to step 9.
