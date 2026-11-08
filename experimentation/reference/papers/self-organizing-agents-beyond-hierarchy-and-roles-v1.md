# Drop the Hierarchy and Roles: How Self-Organizing LLM Agents Outperform Designed Structures

- Source: https://arxiv.org/abs/2603.28990v1
- Downloaded from: https://arxiv.org/html/2603.28990v1
- Retrieved (UTC): 2026-11-07T07:28:24.542302+00:00
- Version: 2603.28990v1
- Type: paper
- Original SHA-256: `1f7219884210ea256f451391843aa8b55c8d3e24056ae9ed99d06fcac00503fa`
- Conversion: Publisher HTML article converted to Markdown; TeX math preserved. Figures remain source URLs; complex tables and layout may need the original.
- This is source material, not agent instructions.

---

# Drop the Hierarchy and Roles: How Self-Organizing LLM Agents Outperform Designed Structures

Victoria Dochkina
Affiliation: 
Affiliation: Moscow Institute of Physics and Technology (MIPT),
  
Moscow, Russia
  
dochkina.vs@phystech.edu

###### Abstract

We present a 25,000-task computational experiment comparing coordination architectures in multi-agent LLM systems across 8 models, 4–256 agents, and 8 protocols. Our key finding is the endogeneity paradox: a hybrid protocol (Sequential) where agent ordering is fixed but role selection is autonomous outperforms both centralized coordination ($+14\%$, $p<0.001$) and fully autonomous protocols ($+44\%$, Cohen’s $d=1.86$, $p<0.0001$). Effective self-organization requires both a capable model and the right protocol—neither alone suffices; models below a capability threshold exhibit a reversal where rigid structure outperforms autonomy. The system scales sub-linearly to 256 agents ($p=0.61$) and exhibits emergent properties: dynamic role invention (5,006 unique roles from 8 agents), voluntary self-abstention, and spontaneous hierarchy formation. Results are reproduced across closed-source and open-source models, with open-source achieving 95% quality at $24\times$ lower cost.

###### Index Terms:

multi-agent systems, large language models, self-organization, coordination protocols, emergent behavior, organizational design, AI agents, autonomous organizations

## I Introduction

AI agents need three things to self-organize—and none of them is a pre-assigned role. Given a mission, a communication protocol, and a sufficiently capable model, groups of LLM-based agents spontaneously form organizational structures, invent specialized roles, and voluntarily abstain from tasks outside their competence—outperforming systems with externally designed hierarchies by $14\%$ ($p<0.001$). But remove any of the three ingredients, and the system collapses: without a strong model, self-organization reverses and rigid structure becomes necessary; without the right protocol, even the strongest model underperforms.

These are the findings of a 25,000-task computational experiment—the largest to date—comparing coordination architectures in multi-agent systems based on large language models (LLMs). A fundamental question has been overlooked: what coordination architecture enables the best trade-off between solution quality, cost, scalability, and resilience to disruptions?

Current research splits into two directions. Vertical self-improvement focuses on making individual agents smarter—exemplified by Meta’s DGM-Hyperagents [[10](https://arxiv.org/html/2603.28990v1#bib.bib10)], which achieves open-ended self-improvement through metacognitive self-modification. Horizontal coordination addresses how groups of agents collaborate, dominated by systems that replicate human organizational patterns: fixed roles, centralized task allocation, rigid hierarchies [[1](https://arxiv.org/html/2603.28990v1#bib.bib1), [2](https://arxiv.org/html/2603.28990v1#bib.bib2), [3](https://arxiv.org/html/2603.28990v1#bib.bib3), [4](https://arxiv.org/html/2603.28990v1#bib.bib4)]. Vertical self-improvement does not answer how multiple agents should coordinate; horizontal frameworks provide structure but may impose unnecessary constraints on agents whose computational nature is fundamentally different from human workers—an LLM agent can instantaneously change specialization, process the full organizational context, and contribute zero marginal cost when idle.

This paper addresses horizontal coordination with a key insight: effective self-organization requires two conditions simultaneously—a capable foundation model and the right coordination protocol. The protocol unlocks the model’s potential, like sheet music unlocks an orchestra; but an orchestra of beginners (weak models) plays better with a conductor than without one.

In this work, we conduct the largest systematic computational experiment on coordination in multi-agent LLM systems to date, spanning:

- •

  25,000+ task runs across 20,810 unique configurations;
- •

  8 LLM models (closed-source: Claude Sonnet 4.6, GPT-5.4, GPT-4o, GPT-4.1-mini, Gemini-3-flash, GigaChat 2 Max; open-source: DeepSeek v3.2, GLM-5);
- •

  4 to 256 agents per system;
- •

  8 coordination protocols, from centralized (Coordinator) to fully autonomous (Shared);
- •

  4 task complexity levels (L1–L4), from single-domain to adversarial multi-stakeholder tasks.

We distinguish between exogenous coordination (structure imposed externally) and endogenous coordination (structure emerging from within the system). Our central finding is the endogeneity paradox: neither maximal external control nor maximal agent autonomy produces optimal results. Instead, a hybrid protocol that provides minimal structural scaffolding (fixed ordering) while allowing maximal role autonomy (self-selected specialization) achieves significantly superior outcomes.

The main contributions of this paper are:

1. 1.

   A framework for characterizing coordination protocols from exogenous (externally controlled) to endogenous (self-organized), with empirical validation across 8 protocols.
2. 2.

   The discovery of the endogeneity paradox: the hybrid Sequential protocol outperforms the fully decentralized Shared protocol by $44\%$ in a controlled pilot (Cohen’s $d=1.86$, $p<0.0001$), and outperforms the centralized Coordinator by $14\%$ at scale ($p<0.001$).
3. 3.

   Evidence that among strong models, coordination protocol choice ($44\%$ quality variation) and model selection ($\sim 14\%$) are both critical, with neither alone sufficient for self-organization.
4. 4.

   Demonstration of sub-linear scaling from 4 to 256 agents without quality degradation ($p=0.61$), with emergent phenomena including dynamic role invention ($\text{RSI}\to 0$), voluntary self-abstention, and shallow self-organized hierarchies.
5. 5.

   Cross-validation of self-organization across closed-source and open-source LLMs, establishing a capability threshold below which self-organization reverses and fixed structure becomes beneficial.
6. 6.

   A three-ring constitutional framework for governing autonomous multi-agent organizations.

## II Related Work

### II-A Multi-Agent LLM Systems

Multi-agent LLM systems have gained significant attention, with several comprehensive surveys mapping the landscape [[20](https://arxiv.org/html/2603.28990v1#bib.bib20), [21](https://arxiv.org/html/2603.28990v1#bib.bib21), [19](https://arxiv.org/html/2603.28990v1#bib.bib19)]. Prominent frameworks include ChatDev [[1](https://arxiv.org/html/2603.28990v1#bib.bib1)], which assigns fixed software engineering roles to agents in a waterfall pipeline; MetaGPT [[2](https://arxiv.org/html/2603.28990v1#bib.bib2)], which encodes Standard Operating Procedures as inter-agent protocols; and AutoGen [[3](https://arxiv.org/html/2603.28990v1#bib.bib3)], which provides a conversation-based framework for multi-agent collaboration. AgentVerse [[4](https://arxiv.org/html/2603.28990v1#bib.bib4)] introduces dynamic team formation but retains a centralized “recruiter” agent. GPTSwarm [[16](https://arxiv.org/html/2603.28990v1#bib.bib16)] models agents as optimizable computation graphs, and Mixture-of-Agents [[17](https://arxiv.org/html/2603.28990v1#bib.bib17)] demonstrates that layering LLM outputs improves quality. Recent work on scaling multi-agent collaboration [[18](https://arxiv.org/html/2603.28990v1#bib.bib18)] has explored team size effects but with fixed architectures. These systems use exogenous coordination: roles, hierarchies, and interaction patterns are designed by humans and fixed before execution.

### II-B Emergent Coordination and Self-Organization

Self-organization in multi-agent systems has deep roots in both classical MAS theory [[11](https://arxiv.org/html/2603.28990v1#bib.bib11), [13](https://arxiv.org/html/2603.28990v1#bib.bib13), [12](https://arxiv.org/html/2603.28990v1#bib.bib12)] and biological complexity science [[14](https://arxiv.org/html/2603.28990v1#bib.bib14), [15](https://arxiv.org/html/2603.28990v1#bib.bib15)]. In the LLM era, recent work has explored more autonomous coordination. EvoAgentX [[5](https://arxiv.org/html/2603.28990v1#bib.bib5)] uses evolutionary optimization (TextGrad) to adapt agent populations but requires gradient-based training. AgentNet [[6](https://arxiv.org/html/2603.28990v1#bib.bib6)] retrieves optimal Directed Acyclic Graphs (DAGs) for agent routing but remains centralized. MAS-ZERO [[7](https://arxiv.org/html/2603.28990v1#bib.bib7)] employs a meta-designer for zero-shot multi-agent generation but lacks runtime adaptation. ReSo [[8](https://arxiv.org/html/2603.28990v1#bib.bib8)] trains a Contribution Reward Model for DAG optimization, requiring labeled data. HiVA [[9](https://arxiv.org/html/2603.28990v1#bib.bib9)] proposes semantic-topological evolution but has been tested only at small scale.

### II-C Self-Improving Agent Systems

A complementary research direction focuses on individual agents that recursively improve themselves. The Darwin Gödel Machine (DGM) and its extension DGM-Hyperagents [[10](https://arxiv.org/html/2603.28990v1#bib.bib10)] achieve impressive open-ended self-improvement through metacognitive self-modification, where the improvement procedure itself is editable. This work advances vertical intelligence—making each agent individually stronger. Our work advances horizontal intelligence—making groups of agents collectively effective. The two directions are orthogonal and synergistic: stronger individual agents (as produced by Hyperagents-style self-improvement) benefit more from self-organizing coordination protocols (as studied here). Together, they represent two complementary paths toward more capable AI systems.

### II-D Gap and Positioning

Existing approaches address different facets of the multi-agent challenge: fixed-architecture coordination [[1](https://arxiv.org/html/2603.28990v1#bib.bib1), [2](https://arxiv.org/html/2603.28990v1#bib.bib2)], training-based adaptation [[5](https://arxiv.org/html/2603.28990v1#bib.bib5), [8](https://arxiv.org/html/2603.28990v1#bib.bib8)], and individual agent self-improvement [[10](https://arxiv.org/html/2603.28990v1#bib.bib10)]. Our study contributes to this landscape by focusing on a question that has received less attention: how does the degree of agent autonomy in coordination—from centralized to fully self-organized—affect collective performance at scale? To our knowledge, this is the first work to systematically vary coordination protocols across an exogenous-to-endogenous spectrum, test groups up to 256 agents, compare 8 LLM models, and demonstrate zero-shot runtime self-organization (Table [I](https://arxiv.org/html/2603.28990v1#S2.T1 "Table I ‣ II-D Gap and Positioning ‣ II Related Work ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")).

TABLE I: Positioning relative to existing multi-agent LLM systems. ∗DGM-Hyperagents focuses on single-agent self-improvement (vertical), not multi-agent coordination (horizontal); included for completeness.

| System | Configs | Max Agents | Models | Protocols | Coordination | Training |
| --- | --- | --- | --- | --- | --- | --- |
| ChatDev [[1](https://arxiv.org/html/2603.28990v1#bib.bib1)] | 6 | 8 | 1–2 | 1 | Fixed exogenous | No |
| MetaGPT [[2](https://arxiv.org/html/2603.28990v1#bib.bib2)] | 4 | 5 | 1 | 1 | Fixed exogenous | No |
| AgentVerse [[4](https://arxiv.org/html/2603.28990v1#bib.bib4)] | 8 | 8 | 1–2 | 3 | Fixed exogenous | No |
| EvoAgentX [[5](https://arxiv.org/html/2603.28990v1#bib.bib5)] | – | $\sim$10 | 1–2 | 1 | Evolved | Yes (TextGrad) |
| AgentNet [[6](https://arxiv.org/html/2603.28990v1#bib.bib6)] | – | $\sim$12 | 1 | 1 | Fixed (DAG) | Yes (retrieval) |
| MAS-ZERO [[7](https://arxiv.org/html/2603.28990v1#bib.bib7)] | – | $\sim$10 | 1 | 1 | Meta-designed | No |
| DGM-Hyperagents [[10](https://arxiv.org/html/2603.28990v1#bib.bib10)] | – | 1∗ | 1 | – | Self-modifying | Yes (evolutionary) |
| This work | 20,810 | 256 | 8 | 8 | Exo $\to$ endo | No (zero-shot) |

## III Methodology

### III-A System Architecture

We model an autonomous AI organization as a discrete-time system. At each time step $t$, a task $\tau_{t}$ is presented to a group of $N$ LLM agents. The system state $x_{t}$ encodes agent roles, interaction topology, and accumulated organizational memory. The dynamics follow:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$x_{t+1}=F(x_{t},u_{t},\tau_{t},w_{t},\varepsilon_{t})$$ |  | (1) |

where $u_{t}$ represents coordination decisions (protocol, routing), $w_{t}$ captures external shocks (regulatory changes, agent failures, priority shifts), and $\varepsilon_{t}$ represents LLM stochasticity.

At each step, we measure five metrics:

- •

  $Q_{t}\in[0.25,1.0]$: solution quality (multi-criteria LLM-as-judge);
- •

  $T_{t}$: execution time;
- •

  $C_{t}$: cost (token consumption);
- •

  $R_{t}$: risk (compliance failures, errors);
- •

  $M_{t}\in[0.25,1.0]$: mission relevance.

The optimization objective is:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\max_{\{u_{t}\}}J=\mathbb{E}\left[\sum_{t=1}^{T}\left(\alpha_{Q}Q_{t}+\alpha_{M}M_{t}-\alpha_{T}T_{t}-\alpha_{C}C_{t}-\alpha_{R}R_{t}\right)\right]$$ |  | (2) |

with $\alpha_{i}>0$ and constraints on acceptable risk and cost levels.

### III-B Coordination Protocols: From Exogenous to Endogenous

Four primary coordination protocols were evaluated, spanning a spectrum from fully exogenous (structure imposed externally) to fully endogenous (structure emerging from within):

Coordinator (centralized, exogenous): Agent 0 acts as an external coordinator, analyzing the task and assigning roles and phases to all other agents, who execute in parallel. A single point of control determines the organizational structure. LLM calls: $N+1$ (1 sequential + $N$ parallel).

Sequential (hybrid): Agents process the task in a fixed order. Each agent observes the completed outputs of all predecessors and autonomously selects its role, decides whether to participate or abstain, and contributes accordingly. The ordering is exogenous, but role selection and participation decisions are fully endogenous. LLM calls: $N$ (sequential). This is analogous to a sports draft where each pick is informed by all previous selections.

Broadcast (signal-based, endogenous): Two rounds—agents first broadcast role intentions simultaneously, then make final decisions informed by all intentions. LLM calls: $2N$ (parallel per round).

Shared (fully autonomous, endogenous): Agents have access to a shared organizational memory (role history from previous tasks) and make all decisions simultaneously and independently. LLM calls: $N$ (parallel).

Four additional bio-inspired protocols (Morphogenetic, Clonal, Stigmergic, Ripple) were also tested; their detailed results will be reported in a forthcoming companion paper.

### III-C Task Complexity Levels

Tasks span four complexity levels:

- •

  L1 (Single-domain): 1 domain, 3–5 steps, no dependencies (e.g., Application Programming Interface (API) security review);
- •

  L2 (Cross-domain): 2 domains, 5–10 steps, knowledge integration required;
- •

  L3 (Multi-phase): 3+ domains, 10–20 steps, sequential dependencies between phases (e.g., zero-trust migration planning);
- •

  L4 (Adversarial): 3+ domains with conflicting stakeholder interests, incomplete information, no single correct answer (e.g., CEO vs. Legal vs. CFO resource conflicts).

### III-D Evaluation Framework

Quality assessment uses a multi-criteria LLM-as-a-judge methodology. An independent judge model—separate from the agent model to avoid self-evaluation bias—evaluates each solution across five dimensions on a 4-point scale with verbal anchors. The judge model was GPT-4o in Series 1–2 and GPT-5.4 in Series 3; within each series, the judge was held constant across all conditions:

1. 1.

   Accuracy ($s_{\text{acc}}$): factual correctness;
2. 2.

   Completeness ($s_{\text{comp}}$): coverage of task requirements;
3. 3.

   Coherence ($s_{\text{coh}}$): logical consistency and structure;
4. 4.

   Actionability ($s_{\text{act}}$): readiness for practical application;
5. 5.

   Mission Relevance ($s_{\text{mis}}$): contribution to organizational mission.

Quality is aggregated as:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$Q_{t}=\frac{s_{\text{acc}}+s_{\text{comp}}+s_{\text{coh}}+s_{\text{act}}}{16},\quad Q_{t}\in[0.25,1.0]$$ |  | (3) |

The lower bound of $0.25$ arises because each sub-score has a minimum of $1$ (not $0$) on the 4-point scale, so the minimum aggregate is $4/16=0.25$.

The evaluation methodology was iteratively refined through four versions (binary $\to$ 10-point $\to$ multi-criteria $5\times 4$) to achieve stable differentiation. The judge model changed between series (GPT-4o in Series 1–2, GPT-5.4 in Series 3); however, all cross-protocol and cross-model comparisons within each series use the same judge, ensuring internal validity. We acknowledge that inter-series comparisons should be interpreted with this caveat in mind.

A Balance Index aggregates all metrics:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$B_{t}=w_{Q}\hat{Q}_{t}+w_{M}\hat{M}_{t}+w_{T}\hat{T}_{t}+w_{C}\hat{C}_{t}+w_{R}\hat{R}_{t}$$ |  | (4) |

where $\hat{\cdot}$ denotes normalized values and $\sum w_{i}=1$ (weights: $w_{Q}=0.25$, $w_{M}=0.20$, $w_{T}=0.20$, $w_{C}=0.20$, $w_{R}=0.15$).

### III-E Experimental Design

The experiment comprises three series (Table [II](https://arxiv.org/html/2603.28990v1#S3.T2 "Table II ‣ III-E Experimental Design ‣ III Methodology ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")):

TABLE II: Experimental design overview.

| Series | Focus | Models | Agents | Tasks |
| --- | --- | --- | --- | --- |
| 1 | Foundational | GPT-4o | 4 | 660 |
| 2 | Scaling | GPT-4.1-mini | 4–64 | 8,020 |
| 3 | Multi-model | 8 LLMs | 8–256 | 12,130 |
|  | Total |  |  | $\sim$20,810 |

Series 1 (Foundation, 660 tasks): Three coordination models were evaluated—Mean-Field Game (fixed roles, population-level coordination), Sparse Graph (topology-dependent coordination across complete, chain, and power-law networks), and Spectral Hierarchy (dynamically emergent hierarchy based on spectral analysis of agent contributions).

Series 2 (Scaling, 8,020 tasks): Nine campaigns tested scaling from 4 to 64 agents across multiple topologies, complexity levels, and shock scenarios using GPT-4.1-mini.

Series 3 (Multi-model & Protocols, 12,130 tasks): Six blocks evaluated scaling to 256 agents, multi-model comparison (4 models), task complexity (L1–L4), evolutionary hybrids, organizational memory, and self-organizing roles across 4 closed/open-source models with multiple coordination protocols.

Shock resilience was tested by introducing perturbations: random agent removal, hub agent removal, model substitution for 25% of agents, and regulatory/priority shifts.

Reproducibility details. All API-based models were accessed between February and March 2026 via official APIs or OpenRouter. Temperature was set to $0.7$ for agent models and $0.0$ for judge models to minimize evaluation variance. All prompts, configuration files, and run logs are preserved for reproducibility. We note that API-based models may be updated by providers over time; the exact model snapshots used are identified by run timestamps in our logs.

## IV Results

### IV-A The Endogeneity Paradox: Protocol Determines Quality

![Refer to caption](https://arxiv.org/html/2603.28990v1/figures/fig5_protocols.png)


Fig. 1: Quality comparison across coordination protocols. Solid bars: pilot ($N=8$, GPT-4.1-mini, L3+L4 average). Hatched bars: final ($N=16$, Claude Sonnet 4.6, L3). The hybrid Sequential protocol achieves the highest quality in both settings.

The direct comparison of four protocols under identical conditions (same agents, model, and tasks) revealed that the coordination mechanism has a decisive impact on solution quality—comparable to or exceeding the effect of model choice (Table [III](https://arxiv.org/html/2603.28990v1#S4.T3 "Table III ‣ IV-A The Endogeneity Paradox: Protocol Determines Quality ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")).

TABLE III: Protocol comparison. Pilot: $N=8$, GPT-4.1-mini, average over L3+L4 tasks. Final ($Q_{\text{L3}}$): $N=16$, Claude Sonnet 4.6, L3 tasks only.

| Protocol | Type | $Q_{\text{pilot}}$ | $Q_{\text{L3}}$ | Balance | Resilience |
| --- | --- | --- | --- | --- | --- |
| Coordinator | Centralized | 0.640 | 0.767 | 0.478 | 0.774 |
| Sequential | Hybrid | 0.724 | 0.875 | 0.510 | 0.829 |
| Broadcast | Signal-based | 0.510 | — | 0.363 | 0.580 |
| Shared | Fully auton. | 0.503 | — | 0.369 | 0.589 |

The relative quality difference between the best (Sequential) and worst (Shared) protocol is $44\%$, with effect size Cohen’s $d=1.86$ ($p<0.0001$).

The paradox lies in the non-monotonic relationship between agent autonomy and quality: neither maximal external control (Coordinator—single point of failure) nor maximal autonomy (Shared—role duplication due to lack of real-time visibility) achieves optimality. The hybrid Sequential protocol succeeds because it provides agents with the optimal information type: not intentions (which may change, as in Broadcast), not history (which may be stale, as in Shared), not someone else’s plan (which may be suboptimal, as in Coordinator), but completed outputs—the factual results of predecessors in the current task.

Cross-model replication. The Sequential advantage over Coordinator was confirmed across all three tested strong models on L3 tasks (Table [IV](https://arxiv.org/html/2603.28990v1#S4.T4 "Table IV ‣ IV-A The Endogeneity Paradox: Protocol Determines Quality ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")).

TABLE IV: Sequential vs. Coordinator quality on L3 tasks (N=16, 120 tasks per model, judge: GPT-5.4).

| Model | $Q_{\text{Seq}}$ | $Q_{\text{Coord}}$ | $\Delta$ | $p$ |
| --- | --- | --- | --- | --- |
| Claude Sonnet 4.6 | 0.875 | 0.767 | $+14.1\%$ | $<0.001$ |
| DeepSeek v3.2 | 0.829 | 0.738 | $+12.4\%$ | $<0.001$ |
| GLM-5 | 0.800 | 0.713 | $+12.2\%$ | $<0.001$ |

### IV-B Scaling: Sub-Linear Cost, Stable Quality

![Refer to caption](https://arxiv.org/html/2603.28990v1/figures/fig3_scaling.png)


Fig. 2: Scaling behavior in Series 2 (fixed roles, GPT-4.1-mini, $N=8\to 64$). Quality remains stable ($Q\in[0.949,0.955]$) while cost grows only $11.8\%$ (coefficient of variation CV $=4.4\%$) despite an $8\times$ increase in agents.

Scaling experiments across two series demonstrated remarkable stability.

Series 2 (fixed roles, $N=8\to 64$, GPT-4.1-mini): Quality remained virtually constant across an $8\times$ increase in group size (Table [V](https://arxiv.org/html/2603.28990v1#S4.T5 "Table V ‣ IV-B Scaling: Sub-Linear Cost, Stable Quality ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")), with cost growing only $11.8\%$.

TABLE V: Series 2 scaling (fixed roles, GPT-4.1-mini, 8,020 tasks).

| $N$ | $Q$ | $C$ (tokens) | $T$ (min) |
| --- | --- | --- | --- |
| 8 | 0.954 | 3,164 | 14.5 |
| 16 | 0.952 | 3,200 | 14.4 |
| 32 | 0.955 | 3,270 | 14.0 |
| 64 | 0.949 | 3,537 | 14.8 |

Series 3 (self-organization, $N=64\to 256$, GPT-4.1-mini): Scaling continued to 256 agents with no statistically significant quality degradation (Table [VI](https://arxiv.org/html/2603.28990v1#S4.T6 "Table VI ‣ IV-B Scaling: Sub-Linear Cost, Stable Quality ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")).

TABLE VI: Series 3 Block 1 scaling (self-organization, L1 tasks, 6,000 runs).

| $N$ | $Q\pm\sigma$ | Coord. overhead | $T$ (min) |
| --- | --- | --- | --- |
| 64 | $0.964\pm 0.039$ | 0.180 | 10.9 |
| 96 | $0.962\pm 0.040$ | 0.180 | 10.9 |
| 128 | $0.958\pm 0.038$ | 0.180 | 11.5 |
| 256 | $0.967\pm 0.032$ | 0.179 | 13.0 |

The Kruskal-Wallis test yields $H=1.84$, $p=0.61$—no statistically significant quality difference between 64 and 256 agents. Emergent properties intensified with scale: automatic specialization grew from $75\%$ unique roles at $N=4$ to $91\%$ at $N=64$, hierarchy depth increased from 1.0 to 2.0, and adaptation speed improved from 0.7 to 3.0. At $N=256$, approximately $45\%$ of agents became idle through self-abstention, demonstrating an endogenous cost-optimization mechanism.

### IV-C Model Comparison: Quality Ceiling and Capability Threshold

In Series 3 Block 2, four models were compared under identical topology-based conditions ($N=32$, Exp2 + Exp3 coordination models, 300 tasks each). This setup evaluates raw model capability within structured coordination rather than free-form self-organization (Table [VII](https://arxiv.org/html/2603.28990v1#S4.T7 "Table VII ‣ IV-C Model Comparison: Quality Ceiling and Capability Threshold ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")).

TABLE VII: Model comparison in topology-based coordination (N=32, Series 3 Block 2, 300 tasks each). Note: these results reflect structured Exp2/Exp3 topologies; protocol-based results (Section [IV-D](https://arxiv.org/html/2603.28990v1#S4.SS4 "IV-D Closed-Source vs. Open-Source Models ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")) show higher quality for strong models under Sequential self-organization.

| Model | $Q$ | $T$ (min) | $C$ (tokens) | $J_{\text{judge}}$ |
| --- | --- | --- | --- | --- |
| DeepSeek v3.2 | 0.978 | 46.5 | 6,296 | 0.719 |
| GPT-4.1-mini | 0.971 | 17.5 | 5,059 | 0.723 |
| Claude Sonnet 4.6 | 0.689 | 36.4 | 5,839 | 0.573 |
| Gemini-3-flash | 0.357 | 45.4 | 4,092 | 0.312 |

The quality spread between the best (DeepSeek, $Q=0.978$) and worst (Gemini, $Q=0.357$) model is $174\%$. A striking observation is that model rankings shift between experimental setups: Claude Sonnet 4.6 achieves $Q=0.689$ in topology-based experiments (Block 2) but $Q=0.875$ under Sequential self-organization (Block 6, Section [IV-D](https://arxiv.org/html/2603.28990v1#S4.SS4 "IV-D Closed-Source vs. Open-Source Models ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")). This difference reflects distinct experimental conditions: Block 2 uses structured Exp2/Exp3 topologies with fixed role assignment ($N=32$), while Block 6 uses free-form self-organization with the Sequential protocol ($N=16$, L3 tasks only). The result is consistent with our central finding: strong reasoning models are disproportionately empowered when given the freedom to self-organize rather than being constrained to pre-designed structures. Among strong models, quality variation attributable to protocol choice ($44\%$) exceeds that of model choice ($\sim 14\%$)—but critically, both factors are necessary, as models below the capability threshold show the opposite pattern.

Capability threshold for self-organization. A critical finding is that self-organization is a privilege of strong models. When comparing free-form (self-organized) vs. fixed-role operation in Series 3 Block 6 ($N=8$, freeform protocol):

- •

  Claude Sonnet 4.6: free-form $Q=0.594$ $>$ fixed $Q=0.574$ ($+3.5\%$)—autonomy helps;
- •

  GLM-5: free-form $Q=0.519$ $<$ fixed $Q=0.574$ ($-9.6\%$)—autonomy hurts.

Models below the capability threshold show a reversal effect: rigid structure helps rather than hinders. The threshold requires three capabilities: (1) self-reflection—ability to assess one’s own competence (Claude: $8.6\%$ voluntary abstention, GLM-5: $0.8\%$), (2) deep reasoning—multi-step logical chains, and (3) instruction following—precise adherence to coordination protocols.

### IV-D Closed-Source vs. Open-Source Models

A dedicated experiment (N=16, 120 tasks per model, Sequential and Coordinator protocols) compared Claude Sonnet 4.6 (closed) with DeepSeek v3.2 and GLM-5 (open-source):

TABLE VIII: Closed vs. open-source comparison (N=16, Sequential protocol, judge: GPT-5.4). Token counts and efficiency are for L3 tasks; $Q_{\text{L4}}$ shown for reference.

| Model | $Q_{\text{L3}}$ | $Q_{\text{L4}}$ | Tokens | $Q/1\text{K tok}$ |
| --- | --- | --- | --- | --- |
| Claude Sonnet 4.6 | 0.875 | 0.594 | 37K | 0.0236 |
| DeepSeek v3.2 | 0.829 | 0.629 | 47K | 0.0177 |
| GLM-5 | 0.800 | 0.579 | 57K | 0.0140 |

DeepSeek v3.2 achieves $95\%$ of Claude’s L3 quality ($-5.5\%$, $p<0.001$) while being approximately $24\times$ cheaper in API costs. On L4 tasks, DeepSeek shows a trend toward superiority ($+6.0\%$, $p=0.082$). Mission Relevance reaches $4.00/4.00$ for both Claude and DeepSeek on Sequential L3 tasks.

Different models develop distinct self-organization strategies: Claude maximizes role diversity (1,272 unique roles, Gini = 0.055), while DeepSeek with Coordinator employs aggressive agent filtering ($22.4\%$ idle, only 8.5/16 agents active) to achieve maximum cost efficiency ($Q/1\text{K tokens}=0.026$).

### IV-E Task Complexity and Emergent Hierarchy

![Refer to caption](https://arxiv.org/html/2603.28990v1/figures/fig7_complexity.png)


Fig. 3: Quality degradation across task complexity levels L1–L4. Hierarchy depth increases with task complexity, indicating emergent structural adaptation.

Quality degrades sharply with task complexity, with L4 (adversarial) tasks representing a current frontier (Table [IX](https://arxiv.org/html/2603.28990v1#S4.T9 "Table IX ‣ IV-E Task Complexity and Emergent Hierarchy ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")). We report the self-organized Hierarchy Depth (HD), measured as the longest chain of agent dependencies in each run.

TABLE IX: Quality by task complexity (N=32/64, GPT-4.1-mini, 1,800 tasks).

| Level | $Q\pm\sigma$ | HD | Completeness | Actionability |
| --- | --- | --- | --- | --- |
| L1 | $0.986\pm 0.011$ | 1.220 | 3.93 | 3.90 |
| L2 | $0.992\pm 0.008$ | 1.063 | 3.99 | 3.96 |
| L3 | $0.948\pm 0.019$ | 1.298 | 3.55 | 3.66 |
| L4 | $0.614\pm 0.020$ | 1.558 | 1.66 | 2.14 |

The L1$\to$L4 quality drop of $37.7\%$ has Cohen’s $d=22.9$. Notably, the self-organized Hierarchy Depth (HD) increases from 1.22 (L1) to 1.56 (L4): the system spontaneously develops deeper organizational structures for more complex tasks, without any external instruction to do so.

### IV-F Emergent Properties

#### IV-F1 Dynamic Role Specialization

![Refer to caption](https://arxiv.org/html/2603.28990v1/figures/fig_role_heatmap.png)


Fig. 4: Role assignment heatmap (Sequential protocol, $N=16$, Claude Sonnet 4.6, 10 L3 tasks). Each cell color represents a unique role chosen by the agent for that task; $\times$ marks voluntary abstention. The mosaic pattern (115 unique roles in 10 tasks) demonstrates RSI $\to 0$: agents reinvent their specialization for each task rather than settling into fixed positions.

Across all configurations, RSI converges to zero (Fig. [4](https://arxiv.org/html/2603.28990v1#S4.F4 "Figure 4 ‣ IV-F1 Dynamic Role Specialization ‣ IV-F Emergent Properties ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")). With 8 agents, 5,006 unique role names were observed; with 64 agents, 5,010 ($+0.1\%$). Agents do not consolidate into fixed positions but reinvent their specialization for each task. At $N=4$, $75\%$ of roles are unique; at $N=64$, $91\%$, with $54\%$ of role names used exactly once.

#### IV-F2 Voluntary Self-Abstention

![Refer to caption](https://arxiv.org/html/2603.28990v1/figures/fig_abstention.png)


Fig. 5: Self-abstention as an emergent property. Left: agent participation rate vs. quality across tasks (Sequential = circles, Coordinator = squares). Right: mechanism of non-participation—38% voluntary (Sequential, endogenous) vs. 100% coordinator-directed (Coordinator, exogenous). Voluntary abstention correlates with higher quality ($Q=0.875$ vs. $0.767$).

In the Sequential protocol, agents voluntarily abstain from participation when they assess their potential contribution as insufficient (Fig. [5](https://arxiv.org/html/2603.28990v1#S4.F5 "Figure 5 ‣ IV-F2 Voluntary Self-Abstention ‣ IV-F Emergent Properties ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")). In a representative experiment, 38 out of 60 non-contributing agents withdrew by their own decision (endogenous), compared to the Coordinator protocol where all 60 non-contributing agents were excluded by the coordinator’s directive (exogenous).

Claude demonstrates the highest voluntary abstention rate ($8.6\%$), while models below the capability threshold show excessive abstention, leading to incomplete task coverage and quality degradation.

#### IV-F3 Shallow Self-Organized Hierarchy

The system consistently prefers flat structures. Hierarchy Depth grows from 1.0 (trivial) to only 2.0 when scaling from 4 to 64 agents, indicating that the system organizes into at most two management layers without external design.

### IV-G Spectral Characteristics of Self-Organization

![Refer to caption](https://arxiv.org/html/2603.28990v1/figures/fig4_spectral_selforg.png)


Fig. 6: Spectral characteristics of self-organization at growing $N$. Left: Role Stability Index (RSI) increases from 0.750 to 0.906 ($+21\%$), indicating stronger specialization in larger groups. Right: the spectral gap $\lambda_{2}\approx 1.93$ remains stable, indicating constant graph connectivity.

In the Spectral Hierarchy experiments (Exp3, Series 1–2), where agents possess evolving skill profiles and are assigned to subtasks based on competence, spectral analysis revealed three emergent effects (Fig. [6](https://arxiv.org/html/2603.28990v1#S4.F6 "Figure 6 ‣ IV-G Spectral Characteristics of Self-Organization ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")):

1. 1.

   Strengthening specialization: The RSI increased from 0.750 ($N=4$) to 0.906 ($N=64$), a $+21\%$ gain—larger groups develop stronger role differentiation when skill profiles accumulate.
2. 2.

   Flat coordination: Hierarchy depth remained at 1.0 across all $N$—agents spontaneously form horizontal structures without deepening the hierarchy.
3. 3.

   Constant connectivity: The spectral gap $\lambda_{2}\approx 1.93$ remained stable across all group sizes, indicating that the interaction graph preserves its connectivity properties during scaling.

This contrasts with the free-form self-organization experiments (Section [IV-F](https://arxiv.org/html/2603.28990v1#S4.SS6 "IV-F Emergent Properties ‣ IV Results ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")), where RSI $\to 0$ and agents reinvent their roles from scratch for each task. The difference reflects two regimes: in structured topologies, agents develop persistent specialization; in protocol-based self-organization, maximal role fluidity emerges naturally.

### IV-H Resilience to External Shocks

Self-organizing systems demonstrated rapid recovery from perturbations. Three shock types were tested on $N=32$ agents (Complete topology):

- •

  Random agent removal: quality recovers within 1 iteration;
- •

  Hub agent removal: quality recovers within 1 iteration;
- •

  Model substitution (25% of agents): quality recovers within 1 iteration.

The Spectral Hierarchy model achieved the highest Resilience Index ($\text{RI}=0.959$) with zero quality variance ($\sigma_{Q}=0.000$), followed by Sparse Graph ($\text{RI}=0.919$) and Mean-Field ($\text{RI}=0.844$).

Adaptation time ($T_{\text{adapt}}$) improves with system size: $0.7\to 1.5\to 3.0$ adaptation speed as $N$ increases, suggesting that larger self-organizing systems heal faster.

## V Discussion

### V-A Vertical vs. Horizontal Intelligence: Both Are Necessary

Our results reveal a fundamental interplay in AI system design. Advances in vertical intelligence—making individual agents smarter through self-improvement [[10](https://arxiv.org/html/2603.28990v1#bib.bib10)], scaling, and fine-tuning—and advances in horizontal intelligence—designing how groups of agents coordinate—are both essential. A strong model without the right protocol is like an orchestra without sheet music; the right protocol without a capable model is like sheet music without musicians. The two ingredients are multiplicative, not additive: among strong models, protocol choice explains $44\%$ of quality variation (Sequential vs. Shared on the same model) while model choice explains $\sim 14\%$ (Claude vs. GLM-5 on the same protocol). We see these directions as complementary: stronger models amplify the benefits of self-organizing protocols, and better protocols unlock more of each model’s potential.

### V-B The Endogeneity Paradox: Why Neither Control Nor Freedom Wins

The superiority of the Sequential protocol can be understood through the information each agent receives. Sequential provides factual, task-specific, accumulated information: each agent observes what predecessors actually did for this particular task. This is informationally superior to:

- •

  Intentions (Broadcast): may change between rounds;
- •

  Historical patterns (Shared): may not apply to the current task;
- •

  A single agent’s plan (Coordinator): limited by one agent’s judgment.

The analogy is to a sports draft: each team selects knowing all previous picks, naturally filling complementary positions without central planning. The paradox is that minimal structure enables maximal emergence—one simple constraint (fixed ordering) unlocks spontaneous role differentiation, voluntary abstention, and mission alignment that no amount of explicit design achieves.

### V-C Role as Emergent Function, Not Pre-Assigned Label

The near-zero RSI challenges the fundamental assumption underlying most multi-agent LLM architectures—that agents should have fixed roles. For LLM agents, a “role” is not a position in an organizational chart but a computational function activated by task context. Unlike human organizations, where role switching incurs retraining costs and cognitive overhead, an LLM agent transitions from architect to analyst at zero switching cost. Pre-assigning fixed roles to agents—whether framed as organizational positions or agent role descriptions—is an anti-pattern that replicates human limitations onto entities that lack them.

### V-D Constitutional Framework for AI Organizations

Self-organization requires boundaries: the Shared protocol (near-total autonomy) produced the worst results ($Q=0.503$), while Sequential (bounded autonomy) produced the best ($Q=0.724$ pilot; $Q=0.875$ at $N=16$). We propose a three-ring constitutional framework:

Ring 1 (Immutable Core—human only): Mission, values, the right to self-abstention. Errors cascade system-wide.

Ring 2 (Standards—human + system): Metrics, governance, audit. The system proposes; humans approve.

Ring 3 (Protocols—autonomous): Coordination parameters, batch sizes, thresholds. Full system autonomy with A/B testing.

The principle: the closer to “why,” the more human control; the closer to “how,” the more system autonomy.

### V-E Implications: Mission, Protocol, Model—Not Pre-Assigned Roles

Our findings yield a practical recipe for deploying autonomous multi-agent systems. Instead of assigning roles and writing instructions, practitioners should:

1. 1.

   Define mission and values, not role assignments. An LLM agent is not constrained by a physical body or fixed skill set—pre-assigning it a role replicates human limitations onto entities that lack them. The system achieves Mission Relevance $4.00/4.00$ when given a mission and freedom, not when given a role description.
2. 2.

   Choose the right protocol. Among capable models, protocol choice explains $44\%$ of quality variation (Sequential vs. Shared, same model, same tasks). The protocol is the amplifier of collective capability.
3. 3.

   Invest in model quality, not agent quantity. Scaling from 64 to 256 agents yields no quality improvement ($p=0.61$) at $4.6\times$ cost. The quality spread between models reaches $174\%$—the “musician” matters more than the number of seats.
4. 4.

   Combine models, don’t pick one. DeepSeek achieves $95\%$ of Claude’s quality at $24\times$ lower cost. Strong models for L3–L4, efficient models for L1–L2. No single model dominates all dimensions.

### V-F Limitations

1. 1.

   LLM-as-judge evaluation. All quality assessments rely on LLM judges (GPT-4o, GPT-5.4) rather than human evaluators. While the multi-criteria decomposition and strict model separation mitigate self-evaluation bias, LLM judges may introduce systematic biases (e.g., preference for verbose responses). A human evaluation study on a representative subset (50–100 tasks) is a priority for future validation.
2. 2.

   Judge model change. The judge model changed between series (GPT-4o $\to$ GPT-5.4). All within-series comparisons use the same judge, preserving internal validity, but absolute $Q$ values are not directly comparable across series. Cross-judge calibration on a shared subset is planned as follow-up.
3. 3.

   Synthetic tasks. All tasks are synthetically generated to enable controlled comparison. While designed to mirror real-world complexity across four levels (L1–L4), validation on established benchmarks or authentic business workflows would strengthen external validity.
4. 4.

   Sequential latency. The Sequential protocol has $O(N)$ latency, which may be prohibitive at very large scale. Batched Sequential variants (Section [VI](https://arxiv.org/html/2603.28990v1#S6 "VI Future Work ‣ Drop the Hierarchy and Roles:How Self-Organizing LLM Agents Outperform Designed Structures")) are a promising mitigation.
5. 5.

   API stability. API-based experiments depend on provider stability. Some models experienced rate-limiting that reduced task completion rates, introducing potential selection bias.
6. 6.

   Multiple comparisons. Multiple statistical tests were performed without formal correction. However, the primary findings (Sequential vs. Shared: $p<0.0001$; Sequential vs. Coordinator: $p<0.001$ across three models) have $p$-values sufficiently small that they remain significant under Bonferroni correction for the number of comparisons reported ($\alpha_{\text{corrected}}=0.05/20=0.0025$).

## VI Future Work

Several directions extend this research:

1. 1.

   Validation on real-world tasks. The current experiment uses synthetically generated tasks designed to mirror real-world complexity. A natural next step is deploying Sequential self-organization on authentic business workflows—regulatory analysis, strategic planning, incident response—to validate whether the endogeneity paradox holds in production environments.
2. 2.

   Batched Sequential for reduced latency. The Sequential protocol’s $O(N)$ latency becomes a bottleneck at large $N$. A batched variant—where groups of $K$ agents work in parallel, then the next group observes all previous outputs—could preserve the informational advantage of Sequential while achieving $O(N/K)$ latency. This represents a promising middle ground between Sequential’s quality and Broadcast’s speed.
3. 3.

   Bio-inspired coordination protocols. Four additional protocols inspired by biological coordination mechanisms (Morphogenetic, Clonal, Stigmergic, Ripple) have been tested in preliminary experiments and will be reported in a forthcoming companion paper. Early results suggest that Ripple (wave-based information propagation) achieves quality comparable to Sequential on adversarial tasks while permitting greater parallelism.
4. 4.

   Constitutional governance in practice. The three-ring constitutional framework proposed in this paper is currently a theoretical model. Testing it as a live governance mechanism—where Ring 3 protocols are autonomously optimized by the system via A/B testing while Ring 1 mission constraints remain human-controlled—would validate the framework’s practical viability.
5. 5.

   Combining vertical and horizontal advances. Our results and recent work on self-improving agents [[10](https://arxiv.org/html/2603.28990v1#bib.bib10)] suggest a multiplicative relationship between model capability and coordination protocol. A compelling next experiment would deploy self-improving agents within a Sequential coordination framework to test whether vertical and horizontal intelligence gains compound.

## VII Conclusion

This paper presents the largest systematic study of coordination in multi-agent LLM systems, spanning over 25,000 task runs across 8 models, 4–256 agents, 8 protocols, and 4 complexity levels. Our central contribution is the discovery of the endogeneity paradox: optimal coordination emerges not from maximal control or maximal autonomy, but from a hybrid that provides minimal structural scaffolding (fixed ordering) while enabling full role autonomy (endogenous specialization). In a controlled comparison, the Sequential protocol outperforms fully autonomous coordination by $44\%$ (Cohen’s $d=1.86$, $p<0.0001$); at scale ($N=16$, L3), it reaches $Q=0.875$, outperforming centralized coordination by $14\%$ ($p<0.001$).

We demonstrate that both protocol choice and model capability are critical design decisions: among strong models, protocol variation accounts for $44\%$ of quality differences while model variation accounts for $\sim 14\%$; but neither alone suffices, and scaling team size beyond 64 agents yields no improvement ($p=0.61$). The system exhibits emergent properties—dynamic role invention (RSI $\to 0$), voluntary self-abstention, spectral stability ($\lambda_{2}\approx 1.93$), and spontaneous hierarchy formation—that are reproduced across both closed-source and open-source models. Open-source models achieve $95\%$ of closed-source quality at $24\times$ lower cost, validating the viability of multi-model strategies.

The practical recipe is simple: give agents a mission, a protocol, and a capable model—not a pre-assigned role. Self-organization will do the rest.

## Acknowledgments

The author thanks S. Budyonny for scientific supervision, and E. Latypova and K. Ruppel for methodological and organizational support during the experimental phase.
This article includes text that was refined with the assistance of an AI language model (Claude, Anthropic). The AI tool was used for language editing, formatting, and structuring of the manuscript text. All scientific content, experimental design, data analysis, and intellectual contributions are solely the work of the author.

## Data Availability

The experimental data, code, analysis scripts, and all LLM prompts used in this study will be made publicly available in a dedicated repository upon acceptance. Run logs with timestamps, model identifiers, and raw judge evaluations are preserved for full reproducibility.

## References

- [1]

  Q. Chen et al., “ChatDev: Communicative agents for software development,” in Proc. ACL, 2024, pp. 15174–15186.
- [2]

  S. Hong et al., “MetaGPT: Meta programming for a multi-agent collaborative framework,” in Proc. ICLR, 2024.
- [3]

  Q. Wu et al., “AutoGen: Enabling next-gen LLM applications via multi-agent conversation,” arXiv:2308.08155, 2023.
- [4]

  Y. Li et al., “AgentVerse: Facilitating multi-agent collaboration and exploring emergent behaviors,” in Proc. ICLR, 2024.
- [5]

  X. Yuan et al., “EvoAgentX: Evolutionary multi-agent optimization via TextGrad,” in Proc. EMNLP Demo, 2025.
- [6]

  Z. Chen et al., “AgentNet: Directed acyclic graph retrieval for multi-agent routing,” in Proc. NeurIPS, 2025.
- [7]

  H. Li et al., “MAS-ZERO: Zero-shot multi-agent system design via meta-feedback,” in Proc. NeurIPS, 2025.
- [8]

  C. Qian et al., “ReSo: Reward-model-guided DAG optimization for multi-agent coordination,” in Proc. EMNLP, 2025.
- [9]

  Y. Wang et al., “HiVA: Hierarchical vision-augmented multi-agent evolution via STEV,” arXiv preprint, 2025.
- [10]

  J. Zhang et al., “Hyperagents,” arXiv preprint arXiv:2603.19461, 2026.
- [11]

  M. Wooldridge, An Introduction to MultiAgent Systems, 2nd ed. Wiley, 2009.
- [12]

  A. Dorri, S. S. Kanhere, and R. Jurdak, “Multi-agent systems: A survey,” IEEE Access, vol. 6, pp. 28573–28593, 2018.
- [13]

  Y. Shoham and K. Leyton-Brown, Multiagent Systems: Algorithmic, Game-Theoretic, and Logical Foundations. Cambridge Univ. Press, 2009.
- [14]

  S. A. Kauffman, The Origins of Order: Self-Organization and Selection in Evolution. Oxford Univ. Press, 1993.
- [15]

  E. Bonabeau, M. Dorigo, and G. Theraulaz, Swarm Intelligence: From Natural to Artificial Systems. Oxford Univ. Press, 1999.
- [16]

  M. Zhuge et al., “GPTSwarm: Language agents as optimizable graphs,” in Proc. ICML, 2024.
- [17]

  J. Wang et al., “Mixture-of-Agents enhances large language model capabilities,” arXiv:2406.04692, 2024.
- [18]

  W. Chen et al., “Scaling large-language-model-based multi-agent collaboration,” arXiv:2406.07155, 2024.
- [19]

  Y. Talebirad and A. Nadiri, “Multi-agent collaboration: Harnessing the power of intelligent LLM agents,” arXiv:2306.03314, 2023.
- [20]

  T. Guo et al., “Large language model based multi-agents: A survey of progress and challenges,” arXiv:2402.01680, 2024.
- [21]

  Z. Xi et al., “The rise and potential of large language model based agents: A survey,” arXiv:2309.07864, 2023.
