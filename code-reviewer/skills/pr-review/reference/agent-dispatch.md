# Agent Dispatch Catalog

Load this file at **Steps 2 and 7-8** — when classifying changed files and
dispatching review agents. Every dispatched agent's prompt MUST include the
discipline blocks from [agent-guidance.md](agent-guidance.md).

`review-plan.json` is the authority for breadth. This catalog defines lane
ownership and file scope; it does not choose the review tier, add lanes beyond
the plan, or apply another size heuristic.

## File Classification (Step 2)

Classify files using evidence from the repository being reviewed:

1. Read the context pack's applicable `AGENTS.md`/`CLAUDE.md`, build manifests,
   dependency declarations, and architecture or test documentation.
2. Match changed files to the components and frameworks those sources establish.
   A directory name alone does not establish a framework or architectural rule.
3. Record the domain and its source in each planned lane's scope. If the domain
   is unknown, leave it unknown and keep the planned general correctness checks.
   Report missing framework evidence as a routing gap; do not invent a mapping.

This scopes the lanes already selected by `review-plan.json`. It does not add
agents or replace the classifier.

### Example: one repository's layout

The following paths and conventions illustrate a project-specific mapping.
Use a row only when the reviewed repository independently establishes that
mapping. These are not built-in path rules or defaults for other repositories.

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

## Model Intelligence Tiers

Every agent declares `modelintelligence` and `effort` in its own frontmatter.
Use `modelIntelligence`, not a concrete `model`, when a plan requests an
override. A host that routes on tiers resolves the model. Frontmatter is the
default for hosts without per-review overrides; a host type-policy may be
authoritative and replace both the spawn request and frontmatter. Record the
effective tier in review metrics. If it differs from the plan, report routing
configuration drift instead of pretending the requested tier ran.

| Tier | Level | Agents | Why this tier |
|---|---|---|---|
| **1** | L1 — follows instructions, summarizes, completes bounded agentic work | `temp-code-review`, `duplicate-code-detector`, `finding-verifier`, `code-simplifier`, `pr-context-gatherer`, the eligibility gate | Matching and citing, not judging. A stronger model does not find more `Console.WriteLine`. |
| **2** | L2 — narrow judgement inside a fixed rulebook | `euii-leak-detector`, `feature-flag-reviewer`, `history-context-review`, `class-design-simplifier` | Recognizable shapes with a little reasoning at the edges. |
| **3** | L3 — reasoning with domain expertise | `nscript-review`, `orleans-review`, `test-coverage-review`, `performance-review`, `review-performance-judge` | Real domain judgement, bounded by a written rulebook. |
| **4** | L4 — the heavy scanning lanes | `correctness-review`, `exception-handling-review`, `schema-compatibility-review`, `architecture-review`, `over-engineering-review` | Subtle defects where a weaker model's miss is the expensive outcome. Still grunt work: they read the diff. |
| **5** | L5 — reasons over other agents' findings, never scans | `review-grader`, `root-cause-synthesizer`, `remediation-planner` | Synthesis, calibration, and sequencing across the whole review. |
| **6** | L7 — decomposes a stuck disagreement into a decidable question | `review-adjudicator` only | Dispatched only on a contested review. Most reviews never call it. |

Distribution across the 23 tiered agents: tiers 1-2 = 9 (39%), tier 3 = 5
(22%), tier 4 = 5 (22% residual heavy-scanning work), tier 5 = 3 (13%), and
tier 6 = 1 (4%). The orchestrator remains untiered and inherits.

Two rules hold this together:

- **Tiers 5 and 6 do no grunt work.** They never scan a diff for defects. They
  receive findings other agents produced and reason about them. An agent that
  reads the diff looking for problems belongs at tier 4 or below, however hard
  its subject is.
- **Running every lane at the top tier is the largest avoidable cost in a
  review**, and the cheap lanes are the ones least helped by it. Agent count is
  not review quality, and neither is agent tier.

## Reasoning Agents (Steps 10c, 11a, 11b)

These three consume findings and never generate them.

- **`root-cause-synthesizer`** (step 10c, tier 5): groups verified findings by
  shared cause, where the test for "shared" is that one named edit dissolves
  every member. Returns causal clusters plus the findings that genuinely stand
  alone. Dispatched when 4 or more findings survive verification.

- **`remediation-planner`** (step 11b, tier 5): turns graded findings into an
  ordered plan — the minimum merge-unblocking set, dependencies between fixes,
  and conflicts between the findings' own suggested paths. Dispatched on
  `REQUEST_CHANGES` with 3 or more blocking findings or 2 or more clusters.

- **`review-adjudicator`** (step 11a, tier 6): rules when the review disagrees
  with itself — split verifier lenses, contradictory guidance, a `REDESIGN` ask
  on a narrow PR, an author's technical dispute, or a lane challenging the PR's
  intent. Dispatched only on those triggers.

## Core Lane Ownership (Step 4)

- **`correctness-review`**: logic defects in the changed code — inverted
  conditions, boundary errors, null and absence handling, state and ordering,
  resource lifetime, contract mismatches, copy-paste divergence, concurrency.
  Explicitly excludes anything a compiler, linter, or type checker catches.
  This lane exists because every other agent is organized by topic and quietly
  assumes someone else asked whether the code simply works.

- **`history-context-review`**: checks the change against what the repo already
  knows — git blame and log for the changed lines (is this undoing a bug fix?),
  review comments on earlier PRs that touched these files, and guidance written
  in nearby code comments or a directory `CLAUDE.md`. Skip only when every
  changed file is new in this PR.

- **`temp-code-review`**: owns temporary code and accidental inclusions.

## Domain Agents (Step 7)

The entries below define ownership and scope. Dispatch an agent only when it is
listed in `review-plan.json`; then limit it to the matching files/signals:

Framework/API names below are applicability examples. Confirm the framework and
version from the reviewed repository. Project conventions such as layering,
logging policy, naming, and build commands require a local source before they
can support a finding. File extensions are examples, not a language allowlist.

- **`nscript-review`**: Scope to changed code in a confirmed NScript project, wherever it lives. Evidence includes the NScript SDK/dependency or NScript-specific attributes such as `[AutoFire]`. A `src/Client/` path, `ObservableObject`, or a generic `Promise<T>` alone does not establish NScript. Review framework constraints and applicable repository conventions for interop, templates, bindings, and styling; do not export one project's MVVM, naming, or IoC rules to another.

- **`orleans-review`**: Dispatch when changed files include Orleans grain code — classes inheriting `Grain`/`Grain<TState>`, grain interfaces (`IGrainWithStringKey`, etc.), `[Reentrant]`/`[AlwaysInterleave]` attributes, stream subscriptions, or silo configuration. Covers reentrancy/deadlock analysis, state management, stream anti-patterns, grain-level architecture (upward level references, cross-level calls, missing marker interfaces, missing `[StorageProvider]`), and async patterns within grains.

- **`debugging:logging-review`**: Dispatch when changed files include logging statements — `ILogger`, `LoggerFactory`, `_logger.Log*`, structured logging templates, or test code with `Console.WriteLine`. Covers structured logging compliance, log levels, queryability, test logging practices, EUII policy enforcement, and client-side log forwarding checks.

- **`temp-code-review`**: Scans all changed files for temporary code, debugging artifacts, hardcoded bypasses/hacks, mistakenly committed files, test/mock data in production code, disabled tests, and accidental inclusions. Catches `Console.WriteLine` in production code, `// HACK`/`// TODO: remove` comments, hardcoded credentials, `.env` files, forced `if (true)` branches, `Debugger.Launch()`, and similar patterns that should never reach production.

- **`duplicate-code-detector`**: Dispatch when PR adds substantial new code (new classes, methods, or logic blocks). Finds exact duplicates, near-duplicate blocks with minor variations, repeated patterns, and structural duplication across the changed files and the broader codebase. Suggests concrete extractions (shared methods, base classes, utilities).

- **`euii-leak-detector`**: Dispatch when PR adds or modifies logging, telemetry, error messages, or HTTP logging. Scans for End User Identifiable Information (EUII) leaks — emails, names, tokens, IPs, passwords, connection strings. Uses heuristic field name matching to catch PII in log templates, exception messages, and API responses.

- **`security-review`**: Dispatch when changed files touch authentication or authorization, cryptographic APIs, deserialization of external input, outbound HTTP calls with user-influenced destinations, secrets or credentials, security configuration, or dependency manifests. Also dispatch when the PR description or linked work item mentions security, vulnerability, CVE, threat model, or penetration testing. Covers access-control bypasses, injection, SSRF, authentication/session failures, cryptographic misuse, insecure deserialization, and fail-open security defaults. Distinct from `euii-leak-detector` (PII and secrets in output) and `temp-code-review` (literal committed secrets and debug artifacts) — do not double-report the same finding.

- **`invariant-deletion-review`**: Dispatch when deleted diff lines or their replacements contain `Delete*`, `Remove*`, `Drop*`, `Purge*`, or `Truncate*` operations; deletion DDL; cascade or foreign-key changes; guard/validation APIs (`ThrowIf*`, `Ensure*`, `Validate*`, validation attributes); freshness/expiry fields; authorization/integrity checks; concurrency/cancellation tokens; uniqueness constraints; or state-transition checks. Also dispatch when a new write path bypasses an existing domain method that enforces one of those safeguards. Covers unsafe hard/bulk/cascade deletion and invariant erosion caused by removing or bypassing safeguards. Distinct from `schema-compatibility-review` (cross-deploy wire/persisted-shape compatibility) and `feature-flag-reviewer` (rollout containment) — this agent owns whether the change itself preserves data and correctness.

- **`class-design-simplifier`**: Dispatch when PR introduces NEW classes, interfaces, or architectural layers. Analyzes what the PR is trying to accomplish, then flags over-engineering: single-implementation interfaces, pass-through layers, premature generalization, deep inheritance hierarchies. Proposes merging, inlining, or flattening.

- **`code-simplifier`**: Dispatch when PR introduces complex control flow (deep nesting, long method chains, verbose conditional logic) or when changed methods exceed ~30 lines. Finds code blocks and method chains that are more complex than they need to be — unnecessary method chains, overly verbose patterns, expressions with simpler equivalents, and control flow that can be flattened. Complements `class-design-simplifier` (which focuses on class/layer-level complexity) by focusing on **expression and block-level** simplification. **Do NOT dispatch** for PRs that are purely mechanical (renames, formatting, bulk attribute changes) or documentation-only.

- **`over-engineering-review`**: Dispatch when a linked work item, PR description, or user-supplied task description gives a clear "what was asked" anchor — and the PR's diff feels larger or more elaborate than that anchor would justify. Compares delivered scope to stated intent and flags drive-by refactors, speculative abstractions for hypothetical futures, defensive code for impossible scenarios, premature optimization without measurement, unrequested features, excessive logging, tutorial-style comments, single-use helper extractions, unused configuration hooks, and parallel duplicate code paths added next to existing code instead of extending it. Especially valuable for LLM-generated PRs, which disproportionately over-produce. Distinct from `class-design-simplifier` and `code-simplifier`, which judge complexity in isolation; this agent judges complexity *relative to the task*. **Do NOT dispatch** when no anchor source is available (no work item, vague PR description, no commits/user context) and the diff is small — the YAGNI-only fallback is too noisy on tiny PRs.

- **`exception-handling-review`**: Dispatch when changed files contain `try`/`catch` blocks, `throw` statements, custom exception classes, or error-handling middleware. Reviews exception handling for swallowed exceptions, overly broad catches, incorrect re-throws (`throw ex` vs `throw`), missing logging in catch blocks, exceptions used for flow control, catch-log-rethrow duplication across layers, async exception pitfalls (`async void`, fire-and-forget), finally block issues, and missing guard clauses. Findings are HIGH-MEDIUM severity.

- **`test-coverage-review`**: Dispatch when the PR modifies production code (any non-test `.cs`, `.js`, `.ts` file). Maps production changes to test changes, verifies tests cover the actual behavior being modified (not just adjacent code), checks for over-mocking, test-driven production pollution, fragile tests, and missing edge cases. For bug fixes, applies the litmus test: "Would this test have FAILED before the fix?" Focuses on behavioral coverage over line coverage, with a 1-10 criticality rating. Findings are HIGH-MEDIUM severity.

- **`architecture-review`**: Dispatch when PR introduces new services, classes, or projects; modifies `.csproj` project references; changes DI registrations; adds cross-layer dependencies; or restructures module/project boundaries. Reviews layer boundary violations (controller accessing DB directly), dependency direction in project references, god class/service detection, circular dependencies, DI anti-patterns (service locator, captive dependencies), cross-cutting concern mismanagement, and bounded context violations. **Do NOT dispatch** when PR only modifies method bodies, configuration values, or styling with no structural changes. Complements `class-design-simplifier` (which focuses on class-level complexity) by analyzing system-level architectural health.

- **`performance-review`**: Dispatch when changed files contain async/await patterns, `HttpClient` usage, database access (EF Core, MongoDB, SQL queries), large collection operations (`.ToList()`, `.ToArray()` on queries), caching logic (`IMemoryCache`, `IDistributedCache`), serialization/deserialization, React components with hooks (`useState`, `useEffect`, `useMemo`, `useCallback`), `fetch`/`axios` calls, state management (Redux, Context), or bundle configuration. Also dispatch when the PR description or linked work item mentions performance, optimization, scaling, latency, memory, or throughput. Auto-detects backend (.NET/C#) vs frontend (React/JS/TS) domains from changed files and applies only relevant patterns. Covers: sync-over-async/thread pool starvation, OOM patterns (unbounded collections, LOH, missing dispose), N+1 HTTP/DB calls, HttpClient misuse, connection pool exhaustion, request waterfalls, bundle size anti-patterns, React re-render cascades, DOM performance, and frontend memory leaks. Findings range from CRITICAL (socket exhaustion, unbounded queries) to MEDIUM (missing memoization, over-serialization). **Do NOT dispatch** when the PR only modifies documentation, test-only files, configuration values, or CSS/LESS styling with no production logic changes.

- **`schema-compatibility-review`**: Dispatch when changed files include a `.proto` / `.thrift` / `.avsc` / `.fbs` / `.bond` schema file, a database migration (EF Core `Migrations/`, Flyway, Liquibase, raw SQL DDL), a type annotated for serialization (`[GenerateSerializer]`, `[Id]`, `[DataContract]`, `[DataMember]`, `[JsonPropertyName]`, `[ProtoMember]`, `[BondMember]`, `@JsonProperty`), a request/response DTO, a queue or event payload, a public-API or SDK-exported type, an enum used in persisted/transmitted data, or any code on either side of a serialize/deserialize boundary. Also dispatch when the PR description, work item, or commit message mentions rollout order, deploy window, rolling deploy, feature flag gating a wire change, capability negotiation, schema versioning, or forward/backward compatibility. Walks the five compatibility lenses (backward, forward, rollout sequencing, public-surface stickiness, serialize/deserialize symmetry) and nine change patterns (removed/renamed field, added required field, type/semantic change, enum value change, tightened constraint, rollout sequence violation, public-surface break, serializer-asymmetry, migration footgun). Findings default to BLOCKER for any backward-incompatible change to persisted or public-surface shapes; HIGH for rollout-sequence violations without a flag; HIGH/MEDIUM for serializer asymmetry being introduced or extended. Distinct from `architecture-review` (system structure), `performance-review` (runtime characteristics), and `over-engineering-review` (scope) — this agent specifically owns *wire-level and persisted compatibility across the deploy window*. **Do NOT dispatch** when the PR only touches in-process types that are never serialized, persisted, or sent over a network, and there is no migration file in the diff.

- **`feature-flag-reviewer`**: Dispatch when the PR introduces changes large or risky enough that a bad rollout would be expensive to reverse — and recommend whether the change should ship behind a feature flag. Specific triggers: new or modified business logic on a critical path, changed default values or validation rules, new/changed API contracts (request/response shapes, status codes), database schema migrations, new external service dependencies, changed retry/timeout/circuit-breaker configurations, new background jobs or async workflows, large refactors of code with broad fan-out, or work items tagged "risky" / "high-blast-radius" / "behind-flag". Assesses **blast radius** (how many users/requests the change touches), **reversibility** (can it be rolled back cleanly, or has it written persisted state), and **change type** (behavior change, data change, infra change) to recommend a flag strategy: full kill-switch, percentage rollout, ring-based rollout, or no flag needed. Findings are advisory MEDIUM by default; escalate to HIGH when the change is irreversible (e.g., persisted-data shape change with no rollback) and ships without a flag. Distinct from `schema-compatibility-review` (which owns *whether the change breaks compat*) — this agent owns *whether the change should be flag-gated regardless of compat*. **Do NOT dispatch** when the PR is purely additive in a low-risk area (new internal helper, documentation, test additions), purely cosmetic (renames, formatting), or already explicitly behind a flag named in the diff.

<plan_dispatch>
**Dispatch rules:**
- Dispatch every lane in `review-plan.json` and no unplanned lane.
- `correctness-review` and `temp-code-review` appear in every tier.
- `history-context-review` starts at SMALL; skip it for an all-new-file change.
- LARGE splits `correctness-review` by top-level area. Each instance receives
  only its slice plus shared contracts needed to reason across the boundary.
- Risk-triggered lanes retain the frontmatter intelligence tier shown above.
- **Every agent prompt carries the context pack** (diff path, changed-file list, convention-file paths, Review Intent) and the instruction not to fetch its own diff
- **Every agent returns the JSON finding schema**, at most 5 findings, `id: null`, no `blocker` field
- Run all applicable agents in parallel — they are independent
- Collect envelopes from all agents into one array, then run the mechanical filter (step 10a) before any verification or grading
</plan_dispatch>

## Server-Side Checks: Repository-Specific Examples

The tables below illustrate checks from a .NET/MongoDB repository. They are
not universal server-side requirements and do not cause agent dispatch.
`src/Server/`, WebApi.Core, IoC config, Server.sln, and VersionId are example
project details. Require a cited repository rule or a demonstrated correctness
failure before using any of these as a finding. Assign severity from the actual
consequence, not from membership in a table.

An already planned domain lane, or correctness when it owns the affected code,
may use a supported check. Without supporting evidence, skip it. In particular,
direct database access, constructor calls, missing index hints, and primary
reads are not inherently defects.

**Example architecture and resource checks:**

| Check | Evidence needed before reporting |
|---|---|
| Layer violation | A local boundary rule requires controllers to use WebApi.Core rather than `IMongoCollection<T>` directly |
| Cursor leak | The API transfers cursor ownership to this code and no path disposes it |
| Missing DI registration | A consumer resolves the service through DI, but no registration or discovery mechanism supplies it |
| Direct `new` of services | Construction bypasses a required lifetime, dependency, or repository rule |
| Wrong build tool | The repository's supported build instructions require MSBuild for Server.sln and the proposed command fails that requirement |

**Example MongoDB checks:**

| Check | Evidence needed before reporting |
|---|---|
| N+1 query | Repeated queries cause a demonstrated workload problem; batching preserves required semantics |
| Index selection | Query plans or workload evidence show an indexing problem; absence of an explicit hint alone is insufficient |
| Lost update | This repository uses VersionId-based optimistic concurrency and the changed write bypasses its required comparison |
| Unbounded materialization | The actual query can exceed the memory budget; pagination or streaming addresses that bound |
| Read preference | The documented consistency and routing policy permits secondary reads and the changed query violates that policy; primary reads alone are not a defect |

## External Agents (Step 8)

Beyond the plugin-owned domain agents, the environment provides additional review agents that add unique value for specific PR types. Dispatch them conditionally based on PR signals.

Evaluate the matrix from top to bottom. An agent is eligible only when its
`Dispatch When` condition is proven and its `Skip When` condition is false.
Remove unavailable agents without substitution. Then apply the plan limit:

- TINY and SMALL: dispatch none.
- MEDIUM: dispatch the first two eligible available agents.
- LARGE: dispatch every eligible available agent in matrix order.

This order is the tie-breaker. Do not ask the orchestrator to choose a preferred
second opinion.

**Agent Dispatch Matrix:**

| Agent | Dispatch When | Skip When |
|---|---|---|
| `pr-review-toolkit:type-design-analyzer` | PR introduces NEW classes, records, structs, interfaces — especially data models, domain entities, DTOs | PR only modifies method bodies without changing type signatures |
| `pr-review-toolkit:comment-analyzer` | PR adds/modifies XML doc comments, inline documentation blocks, or README content | PR has no comment changes |
| `orleans-dev:orleans-reviewer` | PR modifies Orleans grain code spanning 5+ grain files, changes cross-grain communication patterns, or restructures silo configuration. Provides deeper Orleans expertise than the code-reviewer plugin's `orleans-review` agent — dispatch both for complex Orleans PRs | PR touches 1-2 grain files with simple changes (step 7's `orleans-review` is sufficient) |
| `superpowers:code-reviewer` | **Dispatch whenever the PR's linked work item/bug/task has an implementation plan.** During step 1, when fetching work item details and comments, read the full comment/reply chain to determine if an implementation plan was posted (by a bot or a human). Also check the PR description for references to a plan, spec, design doc, or requirements. If any form of implementation plan exists, dispatch this agent — it reviews whether the actual code matches what was planned, catching drift, missed steps, partial implementations, and deviations without justification. | No linked work item exists, OR after reading the work item comments and PR description no implementation plan or spec is found, OR the PR is a hotfix with no prior planning |

**Agents excluded by default — each duplicates a lane we already run:**

| Excluded agent | Duplicates | Why the local lane wins |
|---|---|---|
| `pr-review-toolkit:silent-failure-hunter` | `exception-handling-review` | It reports "every instance, no matter how minor" — no cap, no diff anchoring, no schema. Its unique value (swallowed errors, bad fallbacks) is already in the local agent's categories. |
| `pr-review-toolkit:pr-test-analyzer` | `test-coverage-review` | The local agent maps production changes to tests and applies the "would this test have failed before the fix?" litmus. Two test lanes produce two near-identical finding sets to merge. |
| `pr-review-toolkit:code-simplifier` | `code-simplifier` | Same subject, same diff. |
| `code-simplifier:code-simplifier` | `code-simplifier` | Same subject, same diff. A "complementary perspective" on simplification is the lowest-yield second opinion available. |
| `pr-review-toolkit:code-reviewer` | steps 4 and 7 | General quality, without our guides or Review Intent. |
| `feature-dev:code-reviewer` | steps 4 and 7 | Same overlap. |
| `architecture-reviewer` | `architecture-review` | The local agent has project-specific context. |

A second opinion is only worth its cost when it brings a different **method**,
not a different author. Verification (step 10b) is the cheap way to raise
confidence in a finding; a second full review is the expensive way.

<dispatch_heuristics>
**Plan budgets:**
- **TINY**: no domain or external agents
- **SMALL**: the lanes in `review-plan.json` (every risk lane, history, tests);
  no external agents
- **MEDIUM**: the lanes in `review-plan.json`; at most 2 external agents with a
  distinct method
- **LARGE**: the lanes in `review-plan.json` and every distinct matching
  external method; correctness is split by area

The per-agent "Dispatch when" notes below scope a planned lane's files and
checks. They never add a lane the plan does not contain.

Agent count is not review quality. An extra agent adds its own fetch, its own
context, and its own findings for the filter and the verifier to process. Add
one only when the plan contains it and it owns a question no dispatched agent
is already asking. File count alone never selects an agent.
</dispatch_heuristics>

**Future-proofing for unknown agents:** An unknown agent is not added during an
active review. Record the missing capability as a routing gap so the classifier
and catalog can be updated together; ad-hoc dispatch would make the plan false.

**Execution:** Run all selected external agents in parallel. Where possible, dispatch concurrently with step 7 domain agents to minimize wall-clock time. Collect all findings before proceeding to step 9.
