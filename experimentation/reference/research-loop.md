# One research and experimentation loop

Use this cycle for iterative studies. Research and experimentation share one study identity, canonical store and linked history. Do not start separate stores for phases or agents.

**Research and recall → hypotheses → test or scenario → assess → save learning → renewed research.**

1. **Research and recall at the start of every round.** Retrieve the study summary, current decisions, relevant lessons, original evidence, contradictions and unfinished leads. Inspect bounded-retrieval omissions. Use [evidence-research](${CLAUDE_PLUGIN_ROOT}/skills/evidence-research/SKILL.md) to investigate the next gaps and relevant new sources. Refresh unstable facts; preserve prior searches and record when no useful new evidence was found. This is a focused research pass, not a full literature review every time.
2. **Form or revise hypotheses from that evidence.** State mechanism, scope, prediction and what would count against it. Preserve alternatives, combinations and the assumptions they share. Keep old predictions intact; add linked revisions.
3. **Choose a discriminating investigation.** Use the [research rubric](${CLAUDE_PLUGIN_ROOT}/skills/research/SKILL.md). Record method, comparison, metric, inputs, budget and stopping rule before execution. A thought experiment checks implications of assumptions; a scenario computes consequences; a backtest examines historical cases. None creates a new real-world observation.
4. **Assess actual evidence.** Separate implementation or measurement failure from failure of the hypothesis. Report deviations, uncertainty and contrary results. Do the findings support the claim within its conditions, contradict it, or leave it unresolved? Check claims rather than accepting an agent's verdict.
5. **Save learning before the next round.** Persist evidence, conditional lessons and a decision to continue, revise, combine, park, adopt or stop. Assign the next lead, next research question and reopening condition. Return to research and recall; do not jump straight into another tweak.

## Shared memory and handoffs

Use [records](${CLAUDE_PLUGIN_ROOT}/reference/records.md) for the common CLI and [external memory](${CLAUDE_PLUGIN_ROOT}/reference/external-memory.md) for provider authority. The coordinator owns the current decision and integration. Other agents return record IDs or drafts and source locators. Give each artifact one writer; serialize canonical record writes or assign distinct IDs and respect store locks. A worker must not overwrite another worker's result.

At a checkpoint save: the current question, evidence/record IDs, contradictions, completed work, unresolved leads, owners and the next action. A brief or search log is a navigation aid; the linked evidence and immutable records remain authoritative. Resume by reading them, not only the latest summary.

Run another round within the user's scope and budget when it can improve the decision. This cycle defines continuity, not an automatic daily schedule. Do not imply that a future search, experiment, external write or trade has run.
