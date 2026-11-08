# Native host evaluation

Run this opt-in pilot with installed, authenticated Claude Code and Codex CLIs. It consumes the `fact` negative-trigger and `repeat-round` resumed-study cases in `${CLAUDE_PLUGIN_ROOT}/evals/scenarios.json`. The default is two repetitions, both hosts, and enabled-skill versus unavailable-skill arms: 16 native sessions. Calls consume account usage; each Claude call has a $1.50 API-equivalent cap and each process has a time limit. No live evaluation runs in ordinary CI.

Substitute the absolute plugin root before executing. Use a new ordinary temporary directory outside `.claude`, `.codex` and `.agents`; these configuration trees can trigger sensitive-file permissions and confound the task. Keep outputs outside the installed plugin. Prior trials are never overwritten.

```text
node "${CLAUDE_PLUGIN_ROOT}/evals/run-host-evals.mjs" --out "<ordinary-temp>/host-evals" --host both --repeats 2
```

For a bounded diagnostic, use `--host claude` or `--host codex`, `--cases fact` or `--cases repeat-round`, `--arm skill` or `--arm baseline`, and `--timeout-seconds 240`. The runner keeps each trial's prompt, exact command, trace, answer, elapsed time, reported usage/cost, process status and deterministic grades. The package snapshot and source hashes identify what was evaluated.

Claude loads the package through its session-local `--plugin-dir`. Codex discovers unchanged skill folders through workspace `.agents/skills` links to the package snapshot. This exercises native skill discovery, not Codex marketplace installation. Baselines omit both mechanisms. Both arms explicitly disable an existing `experimentation@gb-plugins-marketplace` install for the session, so it cannot contaminate the baseline. Other installation IDs require the same treatment before a valid comparison. Claude's loaded-plugin inventory verifies absence in the baseline and the exact snapshot in the skill arm. Other user customizations still apply. No hook-trust or sandbox bypass is used. Do not compare models or hosts as if their budgets were equal.

If authorized to isolate user hooks for this benchmark, add `--isolate-claude-hooks true`. It passes a session-only `disableAllHooks` setting to both Claude arms; it does not edit settings files. Keep the normal-hook failures as separate evidence and report the isolation explicitly. Managed hooks can still apply. Codex hooks are unaffected.

## Grade observable outcomes

- **Execution:** require a successful completed host turn. A timeout remains a failure even when an answer arrived. Unreported cost/model fields remain unknown.
- **Activation:** require a native Skill call or a tool command reading the expected skill entrypoint. A model's claim that it used a skill is insufficient. The fact case must not activate any of these three skills.
- **State:** the resumed fixture must validate, retain every original byte, append a decision and link the contrary evidence. Inspect the new records as well as the final answer. Fixtures establish workflow behavior, not real compressor quality.
- **Evidence quality:** a human reviews whether the answer keeps the conflicting results conditional, identifies task/budget/corpus confounding, proposes a discriminating next comparison, and names a stopping condition. Mark each criterion met, absent or unsupported, with a trace/artifact locator. Review both arms by the same rubric; keyword matching is insufficient.

Report every trial, including setup errors, refusals and timeouts. Compare per-case success rates, failures, time and reported usage between arms. Two repetitions reveal some variability; they do not establish statistical superiority or general transfer. Keep the outcome report with the retained run directory and link it from the development audit.
