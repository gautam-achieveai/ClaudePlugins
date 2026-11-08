# Research & Experimentation

For unexpanded `${CLAUDE_PLUGIN_ROOT}`, substitute this plugin's absolute root from the loaded plugin location, including when following links inside references. Never use the working directory or assume the shell exports it.

Research develops explanations and identifies what remains unknown. Experimentation tests those ideas. Both phases share evidence-linked lessons across rounds.

The stable plugin ID remains `experimentation`; existing installs and skill commands continue to work. Additional research skills can be added under this package.

## Skills

- **evidence-research:** find sources, assess competing claims, synthesize findings and create owned research leads.
- **research:** coordinate research and experiment rounds for algorithms/compression, agent skills, historical strategies, product decisions and long-term stock theses.
- **research-learning:** consolidate results, reconcile contradictions and test whether lessons transfer.

All three descriptions are exposed for automatic selection. No always-on hook or model pin is required. Host/model selection is not guaranteed; explicit invocation remains available. In Claude Code: `/experimentation:evidence-research`, `/experimentation:research` and `/experimentation:research-learning`. Other hosts use their skill picker or supported invocation syntax.

Try: “Research recent agent-memory approaches and explain where their evidence disagrees,” “Our retained teams invite colleagues. What should we test next?” or “These two compression ideas failed separately. Investigate whether the combination could work.”

For a local Claude Code session from this repository: `claude --plugin-dir ./experimentation`. Load the plugin in other hosts through their local plugin/marketplace support. Adding files does not activate them in an already-running session.

## Storage and operation

Every iterative round starts with **research and recall → hypotheses → experiment/scenario/backtest → assess → save learning → renewed research**. Research and experimentation share the same study, sources, contradictions and lessons. See the [shared loop](${CLAUDE_PLUGIN_ROOT}/reference/research-loop.md). This does not create a background schedule.

Use project-local `.experimentation/<study>/` by default, or an existing suitable research store. Immutable JSON records link ideas, hypotheses, experiment plans, observations, lessons and decisions. New evidence never silently rewrites an original prediction.

The dependency-free Node 22+ [record utility](${CLAUDE_PLUGIN_ROOT}/scripts/research-store.mjs) handles creation, retrieval, validation and export. Read the [record guide](${CLAUDE_PLUGIN_ROOT}/reference/records.md) for commands and the [external-memory contract](${CLAUDE_PLUGIN_ROOT}/reference/external-memory.md) for provider capabilities, authoritative storage and recovery. Provider tools perform remote operations; this plugin has no automatic sync.

The skills keep only the shared loop and selection rubric in context. Domain references load on demand. The model supplies judgment; scripts supply identity and integrity checks. Store concise explanations, not private reasoning transcripts.

This package does not install providers, run live experiments, place trades or publish anything automatically. Method provenance and limitations are in [sources](${CLAUDE_PLUGIN_ROOT}/reference/sources.md).

## Predefined agents

The plugin includes `research-lead`, `evidence-investigator`, `experiment-designer`, `experiment-runner`, `evidence-reviewer` and `learning-curator`. The lead selects useful members from the [team rubric and handoff contract](${CLAUDE_PLUGIN_ROOT}/reference/agent-research.md); a small task can stay with one agent. All inherit the current model.

Hosts that load Markdown plugin agents can register these definitions. In other hosts, the skill supplies the corresponding instructions to native delegation, or performs that responsibility directly. Discovery and delegation limits vary by host; adding definitions does not prove native activation in an already-running session.

The research guidance is grounded mainly in [recent LLM studies](${CLAUDE_PLUGIN_ROOT}/reference/research-sources.md). Full source text is available on demand in the [local paper library](${CLAUDE_PLUGIN_ROOT}/reference/papers/index.md). Recent-first searches apply to fast-changing LLM/agent/harness topics; other questions use an appropriate historical scope. Paper publication date and actual tested model generation are checked separately.

## Verification

From the repository root, run `node --test tests/experimentation-*.test.mjs` and `node scripts/sync-host-manifests.mjs --check`. See [evaluation cases](${CLAUDE_PLUGIN_ROOT}/evals/scenarios.json) for discovery and method-selection prompts. A packaged description enables discovery; it does not prove automatic selection on every model.

Use the opt-in [native host evaluation](${CLAUDE_PLUGIN_ROOT}/evals/README.md) for repeated Claude/Codex runs against a disabled-skill baseline. It retains traces, artifacts, usage and deterministic state checks, with a separate human evidence-quality rubric. Ordinary CI tests the runner's grading logic without making model calls.

## License

The plugin's original code and instructions use the [MIT license](${CLAUDE_PLUGIN_ROOT}/LICENSE). Third-party paper text in `reference/papers/` retains its original terms and is excluded from that license.
