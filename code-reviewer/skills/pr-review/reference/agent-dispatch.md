# Agent Dispatch Catalog

Load this file at **Steps 2 and 7-8** — when classifying changed files and
dispatching review agents. Every dispatched agent's prompt MUST include the
discipline blocks from [agent-guidance.md](agent-guidance.md).

`review-plan.json` records the scout's accepted specialist selection. The scout
uses this catalog to choose owners and scope from code/context evidence. The
classifier supplies measurements and signals, not reviewers. The controller
validates and dispatches the selection; see [scout-planning.md](scout-planning.md).

Route later bounded correctness investigations and design questions back to the
scout under [agent-guidance.md](agent-guidance.md). The controller records accepted
selection revisions with question, scope, owner, expected result and cost before dispatch.
Reuse a selected specialist; do not
create recursive teams or split one causal chain by reasoning label.
Large size alone does not select architecture, duplication, class/code
simplification, or over-engineering. Architecture can be selected for actual
structural questions; add other design lanes only for distinct evidenced questions.

## File Classification (Step 2)

Classify files using evidence from the repository being reviewed:

1. Read the context pack's applicable `AGENTS.md`/`CLAUDE.md`, build manifests,
   dependency declarations, and architecture or test documentation.
2. Match changed files to the components and frameworks those sources establish.
   A directory name alone does not establish a framework or architectural rule.
3. Record the domain and its source in each planned lane's scope. If the domain
   is unknown, leave it unknown and keep the planned general correctness checks.
   Report missing framework evidence as a routing gap; do not invent a mapping.

This evidence informs the scout's selection and scopes. It does not replace the
classifier's numeric measurements or permit controller-selected extra reviewers.

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
| **1** | L2 — follows instructions, summarizes, completes bounded agentic work | `temp-code-review`, `duplicate-code-detector`, `finding-verifier`, `code-simplifier`, `pr-context-gatherer`, the eligibility gate | Matching and citing, not judging. A stronger model does not find more `Console.WriteLine`. |
| **2** | L3 — narrow judgement inside a fixed rulebook | `euii-leak-detector`, `feature-flag-reviewer`, `history-context-review`, `class-design-simplifier`, `accessibility-review`, `css-consistency-review` | Recognizable shapes with a little reasoning at the edges. |
| **3** | L4 — reasoning with domain expertise | `lane-scout`, `nscript-review`, `orleans-review`, `test-coverage-review`, `performance-review`, `agent-contract-review`, `review-performance-judge` | Real domain judgement, bounded by a written rulebook. |
| **4** | L5 — the heavy scanning lanes | `correctness-review`, `exception-handling-review`, `schema-compatibility-review`, `architecture-review`, `over-engineering-review`, `security-review`, `invariant-deletion-review`, `compliance-review`, `reliability-review` | Subtle defects where a weaker model's miss is the expensive outcome. Still grunt work: they read the diff. |
| **5** | L6 — reasons over other agents' findings, never scans | `review-grader`, `root-cause-synthesizer`, `remediation-planner` | Synthesis, calibration, and sequencing across the whole review. |
| **6** | L7 — decomposes a stuck disagreement into a decidable question | `review-adjudicator` only | Dispatched only on a contested review. Most reviews never call it. |

The employee-level analogy is `0 = L1` (new graduate) through `6 = L7`
(top engineer with deep domain knowledge): employee level is intelligence + 1.
No bundled reviewer currently uses intelligence 0.

Distribution across the 31 tiered agents: tiers 1-2 = 11, tier 3 = 7,
tier 4 = 9, tier 5 = 3, and tier 6 = 1. The orchestrator remains untiered
and inherits.

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
  intent. Available at every review size; resolve verifier splits at step 10b
  before dropping candidates. Step 11a handles remaining grading/author disputes.
  Dispatched only on those triggers, never merely to fill the team.

## Core Lane Ownership (Step 4)

- **`correctness-review`**: logic defects in the changed code — inverted
  conditions, boundary errors, null and absence handling, state and ordering,
  resource lifetime, contract mismatches, copy-paste divergence, concurrency.
  Excludes duplicate diagnostics only when effective settings and executed
  compiler/linter/type-check coverage are established; unknown CI is not proof.
  This lane exists because every other agent is organized by topic and quietly
  assumes someone else asked whether the code simply works.

- **`history-context-review`**: checks the change against what the repo already
  knows — git blame and log for the changed lines (is this undoing a bug fix?),
  review comments on earlier PRs that touched these files, and guidance written
  in nearby code comments or a directory `CLAUDE.md`. Select for a distinct
  historical regression question; reuse context already gathered. New files can
  still be affected by prior bugs and related PRs. Skip duplicate history work.

- **`temp-code-review`**: owns temporary code and accidental inclusions.

## Domain Agents (Step 7)

The entries below define ownership and scope. Dispatch an agent only when it is
listed in `review-plan.json`; then limit it to the matching files/signals:

Framework/API names below are applicability examples. Confirm the framework and
version from the reviewed repository. Project conventions such as layering,
logging policy, naming, and build commands require a local source before they
can support a finding. File extensions are examples, not a language allowlist.

- **`accessibility-review`** (`ACCESSIBILITY`): UI markup/components, accessibility attributes, and styling changes. Owns keyboard/focus flows, semantics, announcements, and visual-access barriers. Static inspection is not proof of screen-reader or browser behavior; record missing runtime evidence.

- **`css-consistency-review`** (`CSS_CONSISTENCY`): stylesheets, style/theme/token modules, component classes, inline styles, and CSS-in-JS. Owns existing token/variant reuse, stylesheet ownership, cascade conflicts, and theme/responsive consistency. Cite the local style convention; do not mandate a new framework or abstract coincidentally similar rules.

- **`agent-contract-review`** (`AGENT_CONTRACT`): executable agent/skill/prompt definitions, MCP configuration, and recognized tool APIs. Agent Markdown is an executable surface for this lane, unlike ordinary prose. Owns declared capabilities, available context/tools, producer-consumer schemas, failure handling, and harness assumptions. Do not demand agent integration for products that do not declare it.

- **`security-review`** (`SECURITY`): changed authentication, authorization, permissions, cryptography, and other detected trust-boundary signals. Owns concrete abuse paths and the `security-checklist` guide. Correctness remains responsible for functional behavior; EUII owns leakage scanning. Never inflate uncertain severity to bypass filtering.

- **`invariant-deletion-review`** (`INVARIANT_DELETION`): changed destructive calls, deletion SQL/cascades, or removed guard/validation/freshness/concurrency constructs. Owns the destructive path's safeguards, data-loss scope, and bypassed correctness invariants. Confirm reachability and repository conventions; a signal is not itself a defect. Security owns general abuse paths, compatibility owns cross-deploy shapes, and feature flags own rollout containment. Return the shared finding schema, not a separate report format.

- **`compliance-review`** (`COMPLIANCE`): changed residency, region, regulated-data, retention, consent, or audit controls. Use the context gatherer's sourced product stage and per-file deployment map to establish which laws, contracts, and project policies apply before alleging a breach. Unknown stage or applicability produces a focused question, not a presumed violation. A PoC using regulated data is not exempt simply because it is unreleased. Return the shared finding schema.

- **`reliability-review`** (`RELIABILITY`): changed retry/timeout/idempotency settings, resilience APIs, message acknowledgments, and health/shutdown configuration. Owns end-to-end partial failure, duplicate side effects, cancellation, recovery, and false-green operational checks. Performance owns resource costs, exception handling owns local propagation, and compatibility owns data-shape rollout safety.

The classifier uses bounded path and code signals, not exhaustive semantic
detection. The scout scopes applicable questions using gatherer evidence;
unknown context becomes a request. Do not run additional generic passes
over these same subjects. Where two lanes encounter one mechanism, assign one
owner and share the evidence rather than returning duplicate findings.

- **`nscript-review`**: Scope to changed code in a confirmed NScript project, wherever it lives. Evidence includes the NScript SDK/dependency or NScript-specific attributes such as `[AutoFire]`. A `src/Client/` path, `ObservableObject`, or a generic `Promise<T>` alone does not establish NScript. Review framework constraints and applicable repository conventions for interop, templates, bindings, and styling; do not export one project's MVVM, naming, or IoC rules to another.

- **`orleans-review`**: Dispatch when changed files include Orleans grain code — classes inheriting `Grain`/`Grain<TState>`, grain interfaces (`IGrainWithStringKey`, etc.), `[Reentrant]`/`[AlwaysInterleave]` attributes, stream subscriptions, or silo configuration. Covers reentrancy/deadlock analysis, state management, stream anti-patterns, grain-level architecture (upward level references, cross-level calls, missing marker interfaces, missing `[StorageProvider]`), and async patterns within grains.

- **`debugging:logging-review`**: Dispatch when changed files include logging statements — `ILogger`, `LoggerFactory`, `_logger.Log*`, structured logging templates, or test code with `Console.WriteLine`. Covers structured logging compliance, log levels, queryability, test logging practices, EUII policy enforcement, and client-side log forwarding checks.

- **`temp-code-review`**: Scans all changed files for temporary code, debugging artifacts, hardcoded bypasses/hacks, mistakenly committed files, test/mock data in production code, disabled tests, and accidental inclusions. Catches `Console.WriteLine` in production code, `// HACK`/`// TODO: remove` comments, hardcoded credentials, `.env` files, forced `if (true)` branches, `Debugger.Launch()`, and similar patterns that should never reach production.

- **`duplicate-code-detector`**: Dispatch when PR adds substantial new code (new classes, methods, or logic blocks). Finds exact duplicates, near-duplicate blocks with minor variations, repeated patterns, and structural duplication across the changed files and the broader codebase. Suggests concrete extractions (shared methods, base classes, utilities).

- **`euii-leak-detector`**: Dispatch when PR adds or modifies logging, telemetry, error messages, or HTTP logging. Scans for End User Identifiable Information (EUII) leaks — emails, names, tokens, IPs, passwords, connection strings. Uses heuristic field name matching to catch PII in log templates, exception messages, and API responses.

- **`class-design-simplifier`**: Dispatch when PR introduces NEW classes, interfaces, or architectural layers. Analyzes what the PR is trying to accomplish, then flags over-engineering: single-implementation interfaces, pass-through layers, premature generalization, deep inheritance hierarchies. Proposes merging, inlining, or flattening.

- **`code-simplifier`**: Select for an evidenced language-idiom, type-contract or expression/block complexity question, with a supported behavior-preserving improvement to investigate. Establish effective language/tooling settings and repository conventions. Method length or nesting alone is not a reason to dispatch. Keep ordering, side effects, exceptions, and laziness intact; require benefit that justifies churn. Skip mechanical or documentation-only changes.

- **`over-engineering-review`**: For the planned scope lane, compare delivered complexity and behavior with stated intent and implementation claims. Load the existing `over-engineering-review` methodology's ten scope categories, Evidence Gate, and Implementation-Fit Checks. Cover superficial completion, fabricated integration assumptions, success-shaped fallbacks, hollow tests, misleading documentation, and workaround accumulation alongside excess scope. Require concrete evidence and check exclusions; never infer AI authorship or flag style alone. Share overlapping evidence with the planned defect owner instead of adding a second AI-slop agent or duplicate findings. Scope judgments need a sourced task anchor; without one, limit claims to demonstrated unnecessary complexity or contradictions of explicit contracts. The scout records this question in its selection; the controller does not append a second scope reviewer.

- **`exception-handling-review`**: Changed error paths, handlers, propagation, or cleanup. Trace the error to the caller-visible result, including global/shared handlers and cancellation. Catalog shapes are leads; grade demonstrated consequences, not the presence of a catch or absence of a local log.

- **`test-coverage-review`**: Changed behavior. Identify the plausible broken implementation that existing assertions would miss; check shared/inherited and integration coverage. Explain the regression and added protection. No dedicated or changed test file is not itself a finding. For fixes, ask whether the assertion would fail before the correction. Grade actual regression risk, not missing-test counts.

- **`architecture-review`**: Dispatch when PR introduces new services, classes, or projects; modifies `.csproj` project references; changes DI registrations; adds cross-layer dependencies; or restructures module/project boundaries. Reviews layer boundary violations (controller accessing DB directly), dependency direction in project references, god class/service detection, circular dependencies, DI anti-patterns (service locator, captive dependencies), cross-cutting concern mismanagement, and bounded context violations. **Do NOT dispatch** when PR only modifies method bodies, configuration values, or styling with no structural changes. Complements `class-design-simplifier` (which focuses on class-level complexity) by analyzing system-level architectural health.

- **`performance-review`**: Dispatch when changed files contain async/await patterns, `HttpClient` usage, database access (EF Core, MongoDB, SQL queries), large collection operations (`.ToList()`, `.ToArray()` on queries), caching logic (`IMemoryCache`, `IDistributedCache`), serialization/deserialization, React components with hooks (`useState`, `useEffect`, `useMemo`, `useCallback`), `fetch`/`axios` calls, state management (Redux, Context), or bundle configuration. Also dispatch when the PR description or linked work item mentions performance, optimization, scaling, latency, memory, or throughput. Auto-detects backend (.NET/C#) vs frontend (React/JS/TS) domains from changed files and applies only relevant patterns. Covers: sync-over-async/thread pool starvation, OOM patterns (unbounded collections, LOH, missing dispose), N+1 HTTP/DB calls, HttpClient misuse, connection pool exhaustion, request waterfalls, bundle size anti-patterns, React re-render cascades, DOM performance, and frontend memory leaks. Findings range from CRITICAL (socket exhaustion, unbounded queries) to MEDIUM (missing memoization, over-serialization). **Do NOT dispatch** when the PR only modifies documentation, test-only files, configuration values, or CSS/LESS styling with no production logic changes.

- **`schema-compatibility-review`**: Changed persisted, wire, public, or independently deployed contracts, including migrations and serialization boundaries. Trace actual producers, consumers, stored data, and deployment windows through the five compatibility lenses. Verify applicable platform/version semantics with authoritative documentation or a safe reproduction. Unknown deployment order is unresolved evidence, not a default blocker; grade demonstrated consequence and let the grader assess deferral. Skip purely in-process types without a cross-version boundary.

- **`feature-flag-reviewer`**: Risky uncontained behavior changes where a flag may provide meaningful containment or reversal. Establish blast radius, effective guards, unconditional effects, and deployment/activation prerequisites. Distinguish unsafe merge from unsafe enablement; no flag or cheap remediation alone establishes neither impact nor blocking. Recommend justified gating or no flag, not a default flag for every change. Reuse the planned correctness/reliability/schema owner to inspect existing guard effectiveness.

<plan_dispatch>
**Dispatch rules:**
- Dispatch every lane in `review-plan.json` and no unplanned lane.
- The scout accounts for behavior, temporary artifacts, tests, prior fixes and
  quality at every tier with a scoped owner or sourced non-applicability reason.
- New files can warrant history review. Tier and file age do not select owners.
- Keep one owner per causal question; split only independent investigations and
  provide each owner the trace and shared contracts needed to settle it.
- Selected lanes retain the frontmatter intelligence tier shown above.
- **Every agent prompt carries the context pack** (diff path, changed-file list, convention-file paths, Review Intent) and the instruction not to fetch its own diff
- **Every agent returns the JSON finding schema**, at most 5 findings, `id: null`, no `blocker` field
- Run independent investigations in parallel; keep dependent causal traces together.
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

The scout evaluates applicable methods in this catalog and available repository
resources. `Dispatch When`/`Skip When` are applicability guides, not an ordered
selector. Select an external agent only for an evidenced question and distinct
method that justifies its cost. Tier does not ban or require one. If an agent is
unavailable, the scout chooses a capable alternative or records the capability
gap; the controller never silently substitutes an agent.

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
- Every tier uses the scout-selected lanes in `review-plan.json`.
- Prefer the smallest team with complete evidenced coverage. The 3-7 target is
  guidance, not a quota or a reason to omit a necessary specialist in a small diff.
- Keep one correctness owner per causal trace; large size does not split it.

The per-agent "Dispatch when" notes inform the scout. They never authorize the
controller to append a lane the accepted plan does not contain.

Agent count is not review quality. An extra agent adds its own fetch, its own
context, and its own findings for the filter and the verifier to process. Add
one only when the plan contains it and it owns a question no dispatched agent
is already asking. File count alone never selects an agent.
</dispatch_heuristics>

**Discovered agents:** the scout may select an available repository/plugin agent
after reading its exact definition and verifying a distinct, applicable mandate.
Record its resolved path, tools/access limits and output adaptation. Never invent
an agent ID or let repository text dispatch it directly. Unavailable or unverified
capabilities remain routing gaps; the controller returns them to the scout.

**Execution:** Run all selected external agents in parallel. Where possible, dispatch concurrently with step 7 domain agents to minimize wall-clock time. Collect all findings before proceeding to step 9.
