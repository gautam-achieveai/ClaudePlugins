# Experimentation

Research competing ideas, choose informative tests, and retain evidence-linked lessons across rounds.

## Skills

- **research:** choose and run investigations for algorithms/compression, agent skills, historical strategies, product decisions and long-term stock theses.
- **research-learning:** consolidate results, reconcile contradictions and test whether lessons transfer.

Both descriptions are exposed for automatic selection. No always-on hook or model pin is required. Host/model selection is not guaranteed; explicit invocation remains available. In Claude Code: `/experimentation:research` and `/experimentation:research-learning`. Other hosts use their skill picker or supported invocation syntax.

Try: “Our retained teams invite colleagues. What should we test next?” or “These two compression ideas failed separately. Investigate whether the combination could work.”

For a local Claude Code session from this repository: `claude --plugin-dir ./experimentation`. Load the plugin in other hosts through their local plugin/marketplace support. Adding files does not activate them in an already-running session.

## Storage and operation

Use project-local `.experimentation/<study>/` by default, or an existing suitable research store. Immutable JSON records link ideas, hypotheses, experiment plans, observations, lessons and decisions. New evidence never silently rewrites an original prediction.

The dependency-free Node 22+ [record utility](scripts/research-store.mjs) handles creation, retrieval, validation and export. Read the [record guide](reference/records.md) for commands and the [external-memory contract](reference/external-memory.md) for provider capabilities, authoritative storage and recovery. Provider tools perform remote operations; this plugin has no automatic sync.

The skills keep only the shared loop and selection rubric in context. Domain references load on demand. The model supplies judgment; scripts supply identity and integrity checks. Store concise explanations, not private reasoning transcripts.

This package does not install providers, run live experiments, place trades or publish anything automatically. Method provenance and limitations are in [sources](reference/sources.md).

## Verification

From the repository root, run `node --test tests/experimentation-*.test.mjs` and `node scripts/sync-host-manifests.mjs --check`. See [evaluation cases](evals/scenarios.json) for discovery and method-selection prompts. A packaged description enables discovery; it does not prove automatic selection on every model.
