# Recent research behind the workflow

Reviewed 2026-11-06. These are primary studies, not reproduced benchmarks. Most LLM evidence below was first published within the prior 12 months. Refresh it when making a current capability claim. Check the tested model generation as well as the paper date. The plugin adapts useful mechanisms; it does not implement these frameworks or inherit their benchmark scores.

The [local paper index](${CLAUDE_PLUGIN_ROOT}/reference/papers/index.md) indexes local Markdown copies, exact versions and conversion limits. Reuse those copies for reading; use the canonical links below for citations and version checks. A supplied workspace library can supplement these copies.

## Search, synthesis and memory

| Source/version | Useful contribution | Limit |
| --- | --- | --- |
| [Search-behavior diagnosis](https://arxiv.org/html/2608.01913v1) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/diagnosing-search-agent-behavior-and-failures-v1.md), Aug 2026 | Separate retrieval gaps from evidence-utilization gaps; stop by useful coverage rather than search volume | Six open-weight agents in a common harness, including Kimi K2.6/GLM5.1/DeepSeek V4 Pro; BrowseComp settings, not all research |
| [TaxoBench](https://arxiv.org/html/2601.12369v6) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/taxobench-retrieval-and-synthesis-gap-v6.md), Oct 2026 revision | Check retrieval and source-grounded organization separately | October retest includes GPT-5.6-sol, Qwen3.8-Max and Kimi-K3; alignment to expert survey taxonomies is not universal correctness |
| [FS-Researcher](https://arxiv.org/html/2602.01566v2) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/fs-researcher-file-system-research-agents-v2.md), Apr 2026 revision | Durable source-linked workspace and focused section retrieval | Tested GPT-5, Sonnet4.5 and Gemini2.5; report judges and task-specific evaluation; not proof that two agents always help |
| [ScaffoldAgent](https://arxiv.org/abs/2606.20122v2) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/scaffoldagent-dynamic-outline-optimization-v2.md), Aug 2026 revision | Revise, expand or contract an evidence-grounded outline | Abstract-level review here; use as a design lead, not a validated model/architecture recommendation |
| [ADORE enterprise research](https://arxiv.org/html/2601.18267v1) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/orchestrating-agents-for-trustworthy-enterprise-rag-v1.md), Jan 2026 | Link claims to evidence; investigate missing section coverage | Enterprise/report evaluation; grounded memory does not guarantee true claims |
| [DeepSearchQA](https://arxiv.org/abs/2601.20975v1) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/deepsearchqa-comprehensive-research-answers-v1.md), Jan 2026 | Evaluate entity deduplication, precision, recall and stopping for complete answer sets | Fixed verifiable lists differ from open-ended explanation |
| [DeepResearch Bench II](https://arxiv.org/abs/2601.08536v3) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/deepresearch-bench-ii-expert-report-rubrics-v3.md), Sep 2026 revision | Assess information recall, analysis and presentation separately with inspectable criteria | Expert-report rubrics reflect a particular task set; not a current universal leaderboard |
| [HybridDeepResearch](https://arxiv.org/abs/2609.09410v1) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/hybrid-deep-research-databases-and-web-search-v1.md), Sep 2026 | Preserve constraints across web/structured-data handoffs | Benchmark tasks and tested models; not evidence that public data explains a particular product |

## Agent-team selection and responsibilities

| Source/version | Useful contribution | Limit |
| --- | --- | --- |
| [Scaling agent systems](https://arxiv.org/html/2512.08296v3) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/towards-a-science-of-scaling-agent-systems-v3.md), Dec 2025 / Apr 2026 revision | Match topology to dependencies; keep a strong single-agent baseline | Mixed model generations and imperfect budget comparability; fitted architecture predictions are not universal rules |
| [Self-organizing agents](https://arxiv.org/html/2603.28990v1) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/self-organizing-agents-beyond-hierarchy-and-roles-v1.md), Mar 2026 | Capable agents can adapt contributions within a communication protocol | Includes Sonnet4.6/GPT-5.4; synthetic tasks and LLM judges; compares team protocols, not optimized single-agent research |
| [Budget-controlled multi-hop reasoning](https://arxiv.org/html/2604.02460v2) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/single-vs-multi-agent-reasoning-equal-token-budgets-v2.md), Apr 2026 | Compare actual computation/context, not agent count alone | Qwen3, distilled R1, Gemini2.5; text reasoning excludes tool-driven evidence discovery; API caps are imperfect |
| [Strong single-agent workflow baseline](https://arxiv.org/html/2601.12307v1) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/rethinking-multi-agent-workflows-strong-single-agent-baseline-v1.md), Jan 2026 | Useful decomposition can remain inside one executor | Mainly GPT-4o-mini/Haiku3.5; not a frontier-model research comparison |
| [AgentCARD](https://arxiv.org/html/2606.20629v1) · [local text](${CLAUDE_PLUGIN_ROOT}/reference/papers/agentcard-specialized-roles-and-mixed-deployments-v1.md), May 2026 submission | Calibrate model-to-role choice against the observed bottleneck | Includes GPT-5.4/Opus4.6; team comparisons, fixed scaffold and deployment-dependent costs; no universal best roster |

**Design inference:** offer predefined responsibilities, then choose only the members that address actual gaps. Give them ownership, evidence requirements and a budget. Preserve a shared study and a single integration owner. Validate improvements on fresh relevant tasks instead of adopting headline gains or fixed model-role assignments.

## Durable foundations

[Cochrane search/selection guidance](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04) supports transparent selection and grouping reports by underlying study. [PRISMA-S](https://www.prisma-statement.org/prisma-search) supports reporting search methods. These older foundations remain useful for provenance; they neither establish modern LLM performance nor make a quick search a formal systematic review. See [experiment-method sources](${CLAUDE_PLUGIN_ROOT}/reference/sources.md) for the other half of the loop.
