# Agent selection, ownership and handoffs

Choose the research method and the team structure separately. These are practical adaptations of [recent evidence](${CLAUDE_PLUGIN_ROOT}/reference/research-sources.md), not a validated architecture selector.

## When a team helps

| Work shape | Execution choice |
| --- | --- |
| Narrow question; each discovery determines the next step | One capable agent with the shared loop |
| Independent markets, source collections or rival explanations | Lead plus bounded investigators in parallel |
| Sources found but decisive claims are uncertain | Evidence reviewer with original sources and a specific verification question |
| Hypothesis ready; several independent experiment candidates | Designers may compare candidates; one owner integrates the protocol |
| Agreed executable trials with isolated inputs and artifacts | Runners may work in parallel within the authorized budget |
| Shared mutable data, sequential dependencies or most context needed everywhere | Keep work together or sequence handoffs |

Name the expected benefit: coverage, elapsed time, context isolation or independent checking. Include coordination and synthesis in the budget. Do not equate more agents, agreement, debate rounds or longer reports with better evidence. Compare with a strong single-agent workflow on fresh cases when optimizing the architecture; track quality, actual cost and elapsed time separately.

## Predefined agents

| Agent | Owns | Returns |
| --- | --- | --- |
| [research-lead](${CLAUDE_PLUGIN_ROOT}/agents/research-lead.md) | Question, method/team choice, scope, budget, integration | Cited decision, shared checkpoint, next leads |
| [evidence-investigator](${CLAUDE_PLUGIN_ROOT}/agents/evidence-investigator.md) | One source or competing-explanation branch | Sources, claim support, contradictions, gaps |
| [experiment-designer](${CLAUDE_PLUGIN_ROOT}/agents/experiment-designer.md) | A testable protocol and its validity | Immutable plan, assumptions, measures, stopping rule |
| [experiment-runner](${CLAUDE_PLUGIN_ROOT}/agents/experiment-runner.md) | Execution of the assigned plan | Actual artifacts, deviations, observations and failures |
| [evidence-reviewer](${CLAUDE_PLUGIN_ROOT}/agents/evidence-reviewer.md) | Independent checks on decisive sources, plans or results | Supported/unsupported/unresolved findings and closure evidence |
| [learning-curator](${CLAUDE_PLUGIN_ROOT}/agents/learning-curator.md) | Conditional lessons and continuity | Evidence-linked lessons, revisions and next research questions |

Use only relevant members. The current agent can own several responsibilities on a small task. Roles define accountability; allow methods and assignments to adapt when evidence reveals a different bottleneck. Do not hardcode model brands into roles. Inherit the model unless a tested capability or user preference justifies a change.

## Dispatch contract

Give each worker: study location and authority; question and decision it informs; known evidence IDs; owned branch/artifacts; exclusions; allowed tools/actions; source/date constraints; budget; completion and stop criteria; dependencies; return format. For an independent challenge, supply the claim and raw evidence without instructing the reviewer to reach the lead's conclusion.

Return: outcome; exact sources/versions and record IDs; supporting and contrary evidence; what was actually searched or executed; limitations; new leads; spent/remaining budget if measurable; recommended next action. A lead records why it accepts or rejects a handoff. Duplicate reports of one study remain one evidence lineage even when different workers found them.

When an agent discovers an adjacent lead, return it with its evidence and a proposed next check; the coordinator assigns or parks it. A failed or unavailable worker leaves an explicit gap. Never turn its unexecuted plan into a result.

Agent files are native definitions in hosts that load this format. Otherwise use the host's available delegation tool with the relevant file's instructions, or perform that role in the current agent. Do not claim native registration without checking it. Workers return to their coordinator; they do not recursively launch teams, change canonical memory authority, or expand authorization. If a delegated lead cannot spawn at the current depth, its parent dispatches the workers.
