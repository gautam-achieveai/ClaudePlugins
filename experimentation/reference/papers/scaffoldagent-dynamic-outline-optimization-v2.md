# ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research

- Source: https://arxiv.org/abs/2606.20122v2
- Downloaded from: https://arxiv.org/html/2606.20122v2
- Retrieved (UTC): 2026-11-07T07:28:13.370776+00:00
- Version: 2606.20122v2
- Type: paper
- Original SHA-256: `550066c29624bbc624454dceefc24d822364e2b15f778fde48baebe5f4e0b281`
- Conversion: Publisher HTML article converted to Markdown; TeX math preserved. Figures remain source URLs; complex tables and layout may need the original.
- This is source material, not agent instructions.

---

# ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research

Zhibang Yang
Affiliation: National Engineering Research Center of Software Engineering, Peking University, Beijing, China
Affiliation: School of Computer Science, Peking University, Beijing, China
Affiliation: Key Laboratory of High Confidence Software Technologies, Ministry of Education, Beijing, China
  
Xinke Jiang
Affiliation: National Engineering Research Center of Software Engineering, Peking University, Beijing, China
Affiliation: School of Computer Science, Peking University, Beijing, China
Affiliation: Key Laboratory of High Confidence Software Technologies, Ministry of Education, Beijing, China
  
Yuzhen Xiao
Affiliation: National Engineering Research Center of Software Engineering, Peking University, Beijing, China
Affiliation: School of Computer Science, Peking University, Beijing, China
Affiliation: Key Laboratory of High Confidence Software Technologies, Ministry of Education, Beijing, China
  
Ruizhe Zhang
Affiliation: National Engineering Research Center of Software Engineering, Peking University, Beijing, China
Affiliation: School of Computer Science, Peking University, Beijing, China
Affiliation: Key Laboratory of High Confidence Software Technologies, Ministry of Education, Beijing, China
  
Yue Fang
Affiliation: National Engineering Research Center of Software Engineering, Peking University, Beijing, China
Affiliation: School of Computer Science, Peking University, Beijing, China
  
Xinfei Wan
Affiliation: National Engineering Research Center of Software Engineering, Peking University, Beijing, China
  
Zhengxing Song
Affiliation: National Engineering Research Center of Software Engineering, Peking University, Beijing, China
  
Yuxuan Liu
Affiliation: National Engineering Research Center of Software Engineering, Peking University, Beijing, China
  
Yuheng Huang
Affiliation: GRG Banking Equipment Co., Ltd., Guangzhou, China
  
Junfeng Zhao
Affiliation: School of Computer Science, Peking University, Beijing, China
Affiliation: Key Laboratory of High Confidence Software Technologies, Ministry of Education, Beijing, China
Affiliation: Corresponding authors{yangzb, xinkejiang}@stu.pku.edu.cn;
{zhaojf, wangyasha, chu_xu}@pku.edu.cn
  
Yasha Wang
Affiliation: National Engineering Research Center of Software Engineering, Peking University, Beijing, China
Affiliation: Peking University Information Technology Institute (Tianjin Binhai), Tianjin, China
Affiliation: Corresponding authors{yangzb, xinkejiang}@stu.pku.edu.cn;
{zhaojf, wangyasha, chu_xu}@pku.edu.cn
  
Xu Chu
Affiliation: School of Computer Science, Peking University, Beijing, China
Affiliation: Key Laboratory of High Confidence Software Technologies, Ministry of Education, Beijing, China
Affiliation: Center on Frontiers of Computing Studies, Peking University, Beijing, China*Equal contribution
Affiliation: Corresponding authors{yangzb, xinkejiang}@stu.pku.edu.cn;
{zhaojf, wangyasha, chu_xu}@pku.edu.cn

###### Abstract

Open-ended deep research (OEDR) requires systems to acquire knowledge through multi-round retrieval and generate coherent long-form reports. The outline plays a central role as a structural scaffold that coordinates retrieval, evidence organization, and generation. However, existing methods either fix the outline before writing or refine it with local heuristics, leading to scaffold drift under continuous information accumulation and delayed feedback for evaluating outline modifications. We propose ScaffoldAgent, a utility-guided dynamic outline optimization framework for OEDR. ScaffoldAgent models outline evolution as a structured decision process with three operations: *Expansion*, *Contraction*, and *Revision*, enabling controlled updates to the report scaffold. It further introduces a utility-guided feedback mechanism that estimates the downstream value of each outline operation from retrieval gain, structural coherence, and trial-generation quality. The resulting utility signal guides node selection, operation scheduling, and termination during inference. Experiments on DeepResearch Bench and DeepResearch Gym show that ScaffoldAgent consistently improves long-form report generation and factual grounding over existing deep research agents.

## 1 Introduction

![Refer to caption](https://arxiv.org/html/2606.20122v2/Intro_fig1.png)


Figure 1: Challenges in dynamic outline optimization.
C1: Scaffold Drift. As the outline is repeatedly updated with newly retrieved evidence and subtopics, redundant branches, uneven topic granularity, and misplaced sections gradually accumulate.
C2: Delayed Feedback. An outline modification yields no immediate feedback, as its impact only becomes observable through subsequent retrieval and trial generation.

Large Language Models (LLMs) have become a cornerstone for building increasingly capable language agents [Bubeck et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib7); [Chang et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib48). Recent advances in reasoning-oriented models, such as DeepSeek-R1 [Guo et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib51) and the OpenAI o-series [Jaech et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib6), have substantially improved LLM performance on structured tasks such as mathematical reasoning and complex question answering [Trinh et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib8); [Guo et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib47). Beyond single-turn generation, tool-augmented LLMs, i.e., agents [Li et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib19), can now interact with external environments and perform iterative planning, searching, and self-correction [Jiang et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib1); [Yao et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib4); [Zhang et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib9); [Shinn et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib5); [Schick et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib10); [Liu et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib49); [Feng et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib52).

This agentic paradigm has shown strong potential in software engineering [Jimenez et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib13) and open-world web navigation [Zhou et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib14); [Mialon et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib15). However, open-ended tasks that require agents to acquire knowledge through multi-round retrieval and synthesize the accumulated evidence into coherent long-form reports remain challenging. Such tasks, recently formalized as Open-ended Deep Research (OEDR) [Xiong et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib11); [Du et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib12), demand not only effective information seeking and content generation, but also persistent content organization over evolving evidence.

Unlike task-oriented agents that execute a fixed plan toward a well-defined goal [Jimenez et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib13); [Mialon et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib15), OEDR is organized around an open-ended objective whose scope evolves as new evidence is discovered. In each round, the system must retrieve new information, reconcile it with prior reasoning, and update the organization of the emerging report [Xiong et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib11); [Li et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib19); [Prabhakar et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib20). Within this loop, the outline is not merely a pre-writing plan but an active structural scaffold: it guides what to search for, indexes evidence under appropriate sections, and constrains final report generation [Shao et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib17); [Xiong et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib16); [Wang et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib18).

However, existing deep research systems still face substantial limitations.
As a report grows in length and topical breadth, a static or poorly maintained outline may gradually drift from the evolving evidence space, leading to redundant coverage, missing perspectives, or incoherent section organization.
One line of work follows a plan-then-write paradigm, where the outline is fixed before report generation begins [Shao et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib17); [Lee et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib21); [Han et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib23), causing the planned outline to gradually diverge from the evolving information space [Xiong et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib16). Another line of work introduces dynamic outline update mechanisms but relies predominantly on heuristic rules or local feedback [Wang et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib18); [Shi et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib22); [Chen et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib24); [Wan et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib25) and lacks a unified optimization objective that jointly accounts for retrieval quality, structural soundness, and generation quality [Wu et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib26); [Xiong et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib16): for instance, updating the outline based solely on newly retrieved documents [Xiong et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib11); [Wang et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib18), or on signals that do not propagate beyond the current step [Wan et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib25); [Chen et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib24).

This limitation gives rise to two core challenges, as illustrated in Figure [1](https://arxiv.org/html/2606.20122v2#S1.F1 "Figure 1 ‣ 1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"). First, without explicit control over structural evolution, iterative refinement may cause scaffold drift: newly retrieved evidence can trigger redundant branches, uneven topic granularity, or misplaced subtopics, progressively destabilizing the global hierarchy of the outline (C1). Second, the usefulness of an outline modification is difficult to assess at the moment it is made, since any section modification may reveal its value only after subsequent retrieval and trial generation, resulting in delayed feedback for evaluating downstream utility (C2).

To address these challenges, we propose ScaffoldAgent, a utility-guided framework for dynamic outline optimization in open-ended deep research. Rather than treating the outline as a fixed pre-writing plan, ScaffoldAgent maintains it as an evolving structural scaffold that coordinates retrieval, evidence organization, and report generation throughout the research process. To mitigate C1, ScaffoldAgent formulates outline evolution as a structured decision process with three explicit operations: *Expansion*, *Contraction*, and *Revision*. Inspired by classical belief revision theory [Alchourrón et al. (1985)](https://arxiv.org/html/2606.20122v2#bib.bib27), these operations enable the system to incorporate new information, merge redundant branches, and revise weakly supported sections while preserving hierarchical consistency. To address C2, ScaffoldAgent introduces a utility-guided feedback mechanism that estimates the usefulness of each outline modification from retrieval gain, structural coherence, and trial-generation quality. A Reporter Agent performs trial writing under the current outline, and its generation quality and citation grounding provide downstream feedback. The resulting utility estimate serves as an inference-time control signal for node selection, operation scheduling, and termination, enabling ScaffoldAgent to optimize outline evolution beyond local heuristic refinement.
Contributions are as follows:

- •

  We propose ScaffoldAgent, a utility-guided framework that treats the outline as an evolving structural scaffold and optimizes it through three explicit operations: *Expansion*, *Contraction*, and *Revision*.
- •

  We introduce a utility-guided feedback mechanism that evaluates outline operations along retrieval, structural, and generation dimensions, enabling inference-time control over node selection, operation scheduling, and termination.
- •

  Experiments on DeepResearch Bench and DeepResearch Gym show that ScaffoldAgent consistently outperforms existing deep research agents, validating the effectiveness of utility-guided outline optimization for improving long-form report generation and factual grounding.

## 2 Related Work

### 2.1 Open-Ended Deep Research

Open-Ended Deep Research (OEDR) extends bounded question answering to long-horizon evidence collection and grounded report synthesis, as formalized by recent benchmarks [Du et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib12); [Coelho et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib28). Built upon tool-augmented agents and search-augmented reasoning  [Yao et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib4); [Trivedi et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib2); [Jin et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib31); [Zhang et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib9), existing OEDR systems have explored several directions. STORM and TTD-DR follow plan- or refinement-oriented workflows for long-form research report generation [Shao et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib17); [Han et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib23). WebWeaver and AgentCPM-Report further introduce dynamic outlines to connect evidence acquisition with report writing, either through planner-writer collaboration or drafting-driven deepening [Xiong et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib11); [Li et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib19). EDR, RhinoInsight, and FS-Researcher enhance OEDR from the perspectives of multi-agent coordination, behavior/context control, and persistent external memory [Prabhakar et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib20); [Lei et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib32); [Zhu et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib33). While they improve retrieval, memory, agent coordination, or writing feedback, outline updates are still largely driven by fixed workflows, local heuristics, or single-stage feedback. They do not unify retrieval gain, structural coherence, and trial-generation quality into single utility signal for node selection, operation scheduling, and termination.

### 2.2 Report Generation

Grounded report generation builds on retrieval-augmented and attributed generation, where external evidence improves factuality and supports citation-aware writing [Lewis et al. (2020)](https://arxiv.org/html/2606.20122v2#bib.bib3); [Menick et al. (2022)](https://arxiv.org/html/2606.20122v2#bib.bib34); [Gao et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib35); [Liu et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib50); [Xu et al. (2025b)](https://arxiv.org/html/2606.20122v2#bib.bib42); [Yang et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib45); [Zhang et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib43). For long-form report generation, a common solution is the plan-then-write paradigm, which first constructs an outline or high-level report plan and then generates content section by section to maintain global organization [Yao et al. (2019)](https://arxiv.org/html/2606.20122v2#bib.bib36); [Yang et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib37); [Yang et al. (2022)](https://arxiv.org/html/2606.20122v2#bib.bib38); [Bai et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib39); [Wan et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib25). More adaptive methods further update outlines, memory, or task graphs during extended generation: DOME uses dynamic hierarchical outlines with memory enhancement, WriteHERE performs heterogeneous recursive planning, and survey-generation systems such as SurveyGen-I and SciSage use evolving plans, memory-guided writing, or reflection to improve cross-section coherence, coverage, and citation quality [Wang et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib18); [Xiong et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib16); [Chen et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib24); [Shi et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib22). These methods improve structure and revision of long reports, but mainly optimize generated text or local writing plan.

## 3 OEDR Task Formulation

Given a research question $q$ and access to a large-scale document collection $\mathcal{D}$, Open-ended Deep Research (OEDR) aims to generate a structurally coherent and well-cited long-form report.
Unlike one-shot retrieval-augmented generation, OEDR requires a system to iteratively search for evidence, organize the acquired information, and synthesize a coherent final report.

We formulate OEDR as a dynamic interaction among three components: *Search*, *Outline*, and *Report*.
Search retrieves external evidence from the document collection; Outline organizes the accumulated evidence into a hierarchical scaffold that defines the scope and structure of the report; and Report transforms the organized evidence into coherent long-form text.
These three components are mutually dependent: the outline determines what should be searched next, newly retrieved evidence may reshape the outline, and report generation can expose gaps in support or structure that call for further refinement.

## 4 Method

### 4.1 ScaffoldAgent Overview

ScaffoldAgent instantiates OEDR as a utility-guided outline optimization process.
Starting from a root outline node initialized from the input question, ScaffoldAgent iteratively grows and refines an outline tree until it becomes a stable scaffold for long-form report generation.
At iteration $t$, we denote the current outline tree as

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\mathcal{T}_{t}=(\mathcal{V}_{t},\mathcal{P}_{t},\Phi_{t}),$$ |  | (1) |

where $\mathcal{V}_{t}$ is the set of outline nodes, $\mathcal{P}_{t}$ denotes parent–child relations, and $\Phi_{t}$ stores node-level attributes.
Each node $v\in\mathcal{V}_{t}$ corresponds to a section or subsection and is associated with

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\Phi_{t}(v)=\big(h_{v},\mathcal{E}_{v},\theta_{v}\big),$$ |  | (2) |

where $h_{v}$ is the node’s intent, $\mathcal{E}_{v}$ is the supporting evidence and report segment attached to the node, and $\theta_{v}$ records accumulated utility statistics.
The initial tree contains only the root node derived from the input question
$\mathcal{T}_{0}=\mathrm{Init}(q).$

ScaffoldAgent comprises three specialized agents.
The Outline Agent serves as the central controller: it maintains the evolving outline tree, selects which node to visit, and decides how the selected node should be updated.
The Search Agent retrieves external evidence when an update requires new information.
The Reporter Agent performs trial writing during optimization and produces the final report once the outline converges.

The optimization process is node-centric.
At each iteration, the Outline Agent first selects a target node $v_{t}$ according to utility feedback, and then chooses one structural operation $o_{t}$ from:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$o_{t}\in\{\text{Expansion},\text{Contraction},\text{Revision}\}.$$ |  | (3) |

The selected operation updates the outline tree and yields utility feedback:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\mathcal{T}_{t+1},U_{t}=\mathrm{Update}\big(\mathcal{T}_{t},v_{t},o_{t};\pi_{\text{res}},\pi_{\text{rep}}\big),$$ |  | (4) |

where $\pi_{\text{res}}$ and $\pi_{\text{rep}}$ denote the Search Agent and the Reporter Agent, respectively.
Expansion and Revision invoke both the Search Agent and the Reporter Agent, as they require additional evidence and downstream writing feedback.
Contraction reorganizes existing evidence and therefore only invokes the Reporter Agent to evaluate whether the compressed local structure remains coherent and grounded.
The resulting utility feedback is used to update node statistics and guide subsequent iterations.
When further refinement yields diminishing utility gains, ScaffoldAgent terminates the optimization and generates the final report from the converged scaffold.

![Refer to caption](https://arxiv.org/html/2606.20122v2/frame.png)


Figure 2: 
Overview of ScaffoldAgent. Starting from a root outline tree, the Outline Agent iteratively selects target nodes according to utility feedback and updates them through *Expansion*, *Contraction*, or *Revision*. The Search Agent provides evidence when needed, and the Reporter Agent performs trial writing or final report generation. Utility feedback updates node statistics and guides optimization until the outline tree converges.

### 4.2 Evolving Outline Tree

The outline tree serves as the central state representation of ScaffoldAgent.
It starts from a root node derived from the input question and gradually evolves into a hierarchical report scaffold.
Each node represents a potential section or subsection, carrying an intent description that specifies what the section should cover, a set of supporting evidence, and utility statistics accumulated from previous visits.
By attaching evidence directly to outline nodes, ScaffoldAgent uses the outline not only as a writing plan but also as an evidence index that bridges retrieval and generation.

At each iteration, the Outline Agent must decide which node to visit next.
An effective selection strategy should revisit low-quality nodes that require correction while still exploring under-visited parts of the tree to avoid early local bias.
For each node $v$, it maintains utility statistics

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\theta_{v}=(n_{v},\bar{u}(v)),$$ |  | (5) |

where $n_{v}$ is the number of visits and $\bar{u}(v)$ is the running mean utility of actions previously applied to this node.
Let $\mathcal{V}_{t}$ denote the set of outline nodes at iteration $t$.
The next target node is selected via a UCB-style rule:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$v_{t}=\arg\max_{v\in\mathcal{V}_{t}}\left(-\bar{u}(v)+c\sqrt{\frac{\ln N_{t}}{n_{v}}}\right),$$ |  | (6) |

where $N_{t}=\sum_{v\in\mathcal{V}_{t}}n_{v}$ is the total visit count and $c$ is the exploration coefficient.
The first term prioritizes low-utility nodes that need improvement, while the second term encourages exploration of rarely visited nodes.

After an operation is applied to selected node, its statistics are updated with new utility $U_{t}$:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$n_{v_{t}}\leftarrow n_{v_{t}}+1,\bar{u}(v_{t})\leftarrow\bar{u}(v_{t})+\frac{U_{t}-\bar{u}(v_{t})}{n_{v_{t}}}.$$ |  | (7) |

This incremental update allows the system to track which parts of the outline remain weak and which have already stabilized.

After a target node is selected, the Outline Agent determines how to update it based on its utility profile.
A node with insufficient topical granularity typically triggers *Expansion*; redundant or overlapping sibling nodes tend to trigger *Contraction*; and a weakly supported or outdated node tends to prompt *Revision*.
Outline tree continues evolving until marginal utility gain falls below a threshold:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\frac{1}{k}\sum_{i=t-k+1}^{t}\Delta U_{i}<\epsilon,\Delta U_{i}=U_{i}-U_{i-1}.$$ |  | (8) |

This criterion indicates that further structural changes are unlikely to improve the final report.
At this point, the Reporter Agent generates the final report from the converged outline.

### 4.3 Outline Agent’s Actions

To mitigate scaffold drift (C1), ScaffoldAgent updates the outline through three explicit operations: *Expansion*, *Contraction*, and *Revision*.
These operations are inspired by belief revision theory [Alchourrón et al. (1985)](https://arxiv.org/html/2606.20122v2#bib.bib27), but serve here as practical structural actions rather than formal logical operators.
Each addresses a common outline deficiency: insufficient granularity, redundant branching, or weak evidential grounding.

- •

  Expansion.
  Expansion is applied when the selected node is too broad to support focused retrieval or detailed writing.
  The Outline Agent decomposes the node into several finer-grained child nodes, each with a more specific intent.
  Since newly created subtopics require supporting evidence, Expansion first invokes the Search Agent to retrieve relevant documents for each child node.
  The Reporter Agent then performs trial writing on the expanded subtree to assess whether the new structure improves downstream generation quality.
- •

  Contraction.
  Contraction is applied when sibling nodes are semantically overlapping, overly fragmented, or repeatedly supported by similar evidence.
  The Outline Agent merges redundant branches into representative nodes and regenerates their intents to cover the consolidated content.
  Since Contraction reorganizes existing evidence rather than introducing new subtopics, it does not invoke the Search Agent.
  The Reporter Agent then verifies whether the compressed local structure remains coherent, non-redundant, and sufficiently grounded.
- •

  Revision.
  Revision is applied when the selected node is weakly supported, outdated, or misaligned with its accumulated evidence.
  The Outline Agent preserves the node’s position in the tree but refreshes its intent and evidence grounding.
  Revision first invokes the Search Agent to retrieve additional evidence and then the Reporter Agent to assess whether the revised node better supports grounded writing.
  Unlike Expansion, Revision does not alter the size of the tree.

These three operations govern how the outline tree evolves throughout the research process.
Expansion increases topical granularity, Contraction controls redundancy, and Revision strengthens local evidence grounding.
Together, they allow ScaffoldAgent to maintain a scaffold that is stable enough for coherent writing while remaining adaptive to newly acquired evidence.

### 4.4 Utility-Guided Feedback

To address delayed feedback (C2), ScaffoldAgent uses utility as an inference-time control signal rather than a gradient-based training objective.
After each node-level operation, the system evaluates the updated local scaffold from three perspectives: whether the operation acquires useful evidence, whether it improves structural organization, and whether it supports grounded writing.
We denote the overall utility at iteration $t$ as:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$U_{t}=\lambda_{1}U_{\text{ret}}+\lambda_{2}U_{\text{str}}+\lambda_{3}U_{\text{gen}},$$ |  | (9) |

where $U_{\text{ret}}$, $U_{\text{str}}$, and $U_{\text{gen}}$ are retrieval, structure, and generation utility, respectively.
The coefficients $\lambda_{1}$, $\lambda_{2}$, and $\lambda_{3}$ control relative importance.

- •

  Retrieval Utility.
  $U_{\text{ret}}$ evaluates whether newly acquired evidence is both relevant to the target node and non-redundant with respect to existing evidence:

  |  |  |  |  |
  | --- | --- | --- | --- |
  |  | $$U_{\text{ret}}=w_{\text{rel}}\mathrm{Rel}+w_{\text{nov}}\mathrm{Nov}.$$ |  | (10) |

  Here, $\mathrm{Rel}$ measures semantic relevance between retrieved documents and the target node’s intent, while $\mathrm{Nov}$ measures novelty relative to evidence already attached to the outline tree.
- •

  Structure Utility.
  $U_{\text{str}}$ evaluates whether the outline scaffold remains coherent, balanced, and non-redundant:

  |  |  |  |  |
  | --- | --- | --- | --- |
  |  | $$U_{\text{str}}=w_{\text{coh}}\mathrm{Coh}+w_{\text{bal}}\mathrm{Bal}-w_{\text{red}}\mathrm{Red}.$$ |  | (11) |

  Here, $\mathrm{Coh}$ quantifies semantic consistency among related nodes, $\mathrm{Bal}$ measures structural balance, and $\mathrm{Red}$ penalizes redundant sibling branches.
- •

  Generation Utility.
  $U_{\text{gen}}$ evaluates whether the current scaffold can support grounded writing.
  The Reporter Agent performs trial writing on the affected node or subtree, and the resulting text is scored by:

  |  |  |  |  |
  | --- | --- | --- | --- |
  |  | $$U_{\text{gen}}=\alpha\rho_{\text{sup}}+\beta\rho_{\text{cov}}-\gamma\rho_{\text{red}},$$ |  | (12) |

  where $\rho_{\text{sup}}$ measures citation support, $\rho_{\text{cov}}$ measures alignment between node intent and generated content, and $\rho_{\text{red}}$ penalizes cross-section redundancy.

### 4.5 Multi-Turn Scaffold Refinement

To support follow-up instructions without regenerating the entire report, ScaffoldAgentextends the dynamic scaffold optimization process in two stages. ❶ Instruction-Aware Outline Update. Given a follow-up instruction, the Outline Agent receives it along with the scaffold retained from the previous turn. It first identifies the outline nodes affected by the new requirement and then updates the corresponding local subtrees. *Expansion* introduces new subtopics required by the instruction, *Revision* adjusts existing section intents, and *Contraction* removes branches that become redundant after the update.
❷ Localized Agent Collaboration.
The Outline Agent invokes the Search Agent when the modified nodes require additional evidence and engages the Reporter Agent to trial-write and evaluate the affected sections. Utility-guided optimization is confined to these local subtrees, while the structure, evidence, and content of unaffected sections are preserved. Once the local scaffold converges, the Reporter Agent regenerates the modified sections and integrates them with the retained content.

### 4.6 Lightweight Implementation

Repeated model-based utility estimation can increase inference overhead and introduce evaluator dependence. To reduce this cost, ScaffoldAgent Lite adopts two simplification strategies.
❶ Hierarchical Candidate Pruning. Before utility evaluation, the system reduces the candidate node–operation space at two levels. At the node level, it ranks outline nodes by their stored utility history and a UCB-style exploration bonus, retaining only the top-ranked target for evaluation in each iteration. At the operation level, inexpensive feasibility rules filter out currently inapplicable operations: *Expansion* is restricted to leaf nodes, *Revision* is prioritized for generic or insufficiently supported nodes, and *Contraction* is considered only when sibling redundancy is detected. Pruning applies only to the current iteration. After each scaffold update, the candidate set is reconstructed, and a previously skipped candidate may be reconsidered if it becomes applicable under the updated structure or evidence.
❷ Lightweight Utility Estimation. For the remaining candidates, the three utility dimensions are estimated from local signals. Retrieval utility considers evidence coverage and the amount of non-redundant information introduced relative to cached evidence. Structure utility considers tree depth, branching, and overlap among sibling titles. Generation utility relies on a limited local trial draft to estimate evidence support, intent coverage, and repetition. All three dimensions can be computed efficiently from local statistics and lightweight similarity measures.

## 5 Experiments

We evaluate ScaffoldAgent against the following research questions:

- •

  RQ1: Does ScaffoldAgent outperform existing methods in open-ended deep research?
- •

  RQ2: How much does each internal component of ScaffoldAgent—the three outline actions (*Expansion*, *Contraction*, *Revision*) and the three utility dimensions ($U_{\text{ret}}$, $U_{\text{str}}$, $U_{\text{gen}}$) that score them contribute to the final performance?
- •

  RQ3: Can ScaffoldAgent handle multi-turn follow-ups by incrementally updating a previously built outline tree?

### 5.1 Experimental Setup

❶ Evaluation Benchmarks.
We evaluate ScaffoldAgent on two open-ended deep-research benchmarks: DeepResearch Bench [Du et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib12) and DeepResearch Gym [Coelho et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib28). The former assesses report quality via RACE (Overall, Comprehensiveness, Insight, Instruction-following, Readability) and factual grounding via FACT (effective citation rate Eff.c. and citation accuracy C.acc.). The latter scores six report dimensions: Clarity, Depth, Balance, Breadth, Supportability, and Insightfulness. Further details are deferred to Appendix [B](https://arxiv.org/html/2606.20122v2#A2 "Appendix B Experiment Datasets ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").

❷Baselines.
We compare ScaffoldAgent against baselines from three paradigms: *Naive* (direct Prompt and RAG), *Single-Agent* (ReAct [Yao et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib4), IRCoT [Trivedi et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib2), WebShaper [Tao et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib29)), and *Multi-Agent* (STORM [Shao et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib17), WebWeaver [Xiong et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib11), EDR [Prabhakar et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib20), StackPlanner [Zhang et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib9)). Further details are deferred to Appendix [C](https://arxiv.org/html/2606.20122v2#A3 "Appendix C Baseline Implementation Details ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").

❸Implementation Details.
We use DeepSeek-V3.2 [Liu et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib41) and Qwen3-32B [Yang et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib40) as backbone LLMs, and adopt Bocha as the web-search API. Further implementation details are deferred to Appendix [D](https://arxiv.org/html/2606.20122v2#A4 "Appendix D Implementation Details ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").

### 5.2 Main Result Analysis (RQ1)

|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | | Qwen3-32B | | | | | | | DeepSeek-V3.2 | | | | | | |
|  |  | RACE | | | | | FACT | | RACE | | | | | FACT | |
| Paradigm | Approach | Over. | Comp | Ins. | Inst | Read | Eff.c. | C.acc. | Over. | Comp | Ins. | Inst | Read | Eff.c. | C.acc. |
| Naive | Prompt | 39.54 | 36.87 | 35.25 | 45.34 | 43.67 | – | – | 43.68 | 41.77 | 41.67 | 47.21 | 46.35 | – | – |
| RAG | 36.68 | 34.49 | 33.35 | 43.07 | 42.92 | 2.93 | 10.86 | 39.50 | 36.46 | 37.19 | 43.35 | 42.83 | 5.51 | 16.18 |
| Single-Agent | ReAct | 42.21 | 40.66 | 38.65 | 46.10 | 44.56 | 4.69 | 23.78 | 43.26 | 42.70 | 40.53 | 46.10 | 46.43 | 4.15 | 17.83 |
| IRCoT | 42.46 | 40.70 | 39.55 | 46.23 | 45.70 | 15.77 | 40.04 | 39.73 | 36.80 | 36.81 | 44.57 | 40.70 | 34.83 | 75.18 |
| WebShaper | 34.93 | 31.58 | 26.17 | 44.81 | 40.38 | – | – | 34.93 | 31.58 | 26.17 | 44.81 | 40.38 | – | – |
| Multi-Agent | STORM | 32.81 | 30.63 | 31.66 | 34.88 | 36.90 | 15.18 | 36.90 | 35.26 | 33.69 | 31.52 | 39.02 | 39.07 | 17.42 | 38.59 |
| WebWeaver | 41.28 | 39.88 | 39.68 | 44.65 | 39.69 | 8.42 | 32.72 | 43.52 | 41.27 | 42.37 | 47.18 | 44.91 | 39.00 | 88.35 |
| EDR | 40.99 | 39.49 | 34.61 | 45.22 | 39.65 | 18.78 | 23.70 | 43.13 | 41.95 | 40.27 | 46.24 | 44.50 | 24.28 | 34.79 |
| StackPlanner | 41.55 | 39.84 | 37.79 | 46.41 | 44.79 | 9.63 | 26.50 | 46.82 | 46.42 | 46.29 | 48.25 | 46.75 | 32.75 | 50.40 |
| ScaffoldAgent | 44.70 | 43.54 | 45.25 | 46.49 | 42.85 | 30.42 | 54.32 | 48.27 | 46.40 | 49.67 | 48.98 | 47.31 | 51.18 | 62.20 |

Table 1: Report-generation results on DeepResearch Bench using
Qwen3-32B and DeepSeek-V3.2. RACE measures report quality and FACT evaluates
factual grounding (effective citation rate, Eff.c.; citation accuracy,
C.acc.). Best results per backbone are in bold. “–” indicates
unavailable results.



|  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Paradigm | Approach | Cla | Depth | Bal | Brea | Sup | Ins | Avg. |
| Naive | Prompt | 70.40 | 69.10 | 81.10 | 76.70 | 0.00 | 53.20 | 58.42 |
| RAG | 64.60 | 67.20 | 74.60 | 71.00 | 4.30 | 52.40 | 55.68 |
| Single-Agent | ReAct | 60.50 | 83.40 | 60.30 | 74.90 | 61.90 | 65.40 | 67.73 |
| IRCoT | 62.30 | 73.10 | 74.60 | 77.30 | 83.80 | 56.60 | 71.28 |
| WebShaper | 49.40 | 59.00 | 54.20 | 75.20 | 26.80 | 59.70 | 54.05 |
| Multi-Agent | STORM | 31.00 | 54.00 | 67.00 | 65.50 | 81.50 | 46.00 | 57.50 |
| WebWeaver | 62.10 | 77.90 | 71.20 | 80.50 | 59.50 | 67.10 | 69.72 |
| EDR | 55.80 | 76.80 | 74.60 | 84.90 | 89.50 | 62.70 | 74.05 |
| StackPlanner | 62.10 | 69.40 | 66.10 | 77.80 | 31.80 | 59.20 | 61.07 |
| ScaffoldAgent | 63.30 | 82.40 | 75.50 | 85.20 | 79.80 | 68.80 | 75.83 |

Table 2: Multi-dimensional evaluation on DeepResearch Gym under the
Qwen3-32B backbone. Dimensions: Clarity, Depth, Balance, Breadth, Support,
Insight. Best in bold.

We evaluate ScaffoldAgent on DeepResearch Bench
(Table [1](https://arxiv.org/html/2606.20122v2#S5.T1 "Table 1 ‣ 5.2 Main Result Analysis (RQ1) ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"), both Qwen3-32B [Yang et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib40) and DeepSeek-V3.2 backbones)
and DeepResearch Gym (Table [2](https://arxiv.org/html/2606.20122v2#S5.T2 "Table 2 ‣ 5.2 Main Result Analysis (RQ1) ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"), Qwen3-32B).

#### Comparison with Baselines.

ScaffoldAgent achieves the strongest Qwen3-32B results on DeepResearch Bench,
reaching 44.70 RACE Overall and improving over the best baseline,
IRCoT, by $+2.24$ points. The gain is accompanied by stronger factual
grounding: ScaffoldAgent obtains the highest Eff.c. (30.42) and C.acc. (54.32),
whereas the strongest single-agent baselines remain substantially lower in citation accuracy (ReAct 23.78 and IRCoT 40.04). Multi-agent baselines do not close this gap: WebWeaver is competitive in RACE. Overall (41.28) but trails by 21.60 points in C.acc., while EDR and STORM score below 41 RACE Overall and below 37 C.acc. These results show that ScaffoldAgent improves report quality without sacrificing grounding.

#### Robustness across Backbones.

On DeepSeek-V3.2, ScaffoldAgent remains the best method in RACE Overall, reaching
48.27 and surpassing StackPlanner by $+1.45$ points. It also ranks first
on all five RACE sub-dimensions, indicating that the improvement is not
driven by a single aspect of report quality. Baseline behavior changes
substantially across backbones: IRCoT drops from 42.46 to 39.73 RACE
Overall, while StackPlanner rises from 41.55 to 46.82. In contrast, ScaffoldAgentimproves monotonically on every Bench metric (RACE 44.70$\to$48.27,
Eff.c. 30.42$\to$51.18, C.acc. 54.32$\to$62.20), suggesting that the
utility-guided framework scales with stronger backbone capability rather
than overfitting to a particular model.

#### Multi-Dimensional Evaluation on Gym.

On DeepResearch Gym, ScaffoldAgent achieves the highest average score, 75.83, outperforming the strongest baseline EDR by $+1.78$ points. It leads two of the six dimensions, Breadth (85.20), and Insight (68.80), which is consistent with its explicit outline expansion and refinement process. Although EDR obtains the highest Supportability score (89.50), ScaffoldAgent remains competitive on Supportability (79.80) and keeps the remaining dimensions close to the best baseline, showing that its gains in depth and insight do not come from degrading overall structural quality.

### 5.3 Component Analysis

❶ Outline-Action Behavior and Ablation.
For RQ2 (action side), Table [3](https://arxiv.org/html/2606.20122v2#S5.T3 "Table 3 ‣ 5.3 Component Analysis ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") ablates the three AGM-aligned outline actions.
Removing Contraction lets the tree widen unchecked, dropping RACE 48.27$\to$44.72 ($-3.55$) and C.acc. 62.20$\to$57.79. Removing Revision blocks evidence refresh and gives the lowest single-action RACE (43.09, $-5.18$); C.acc. slips only to 58.11 because the retrieved evidence still locally supports the (ill-posed) claims it was fetched for citations stay attributable, but the underlying arguments are weaker, which RACE penalizes and FACT does not.
Disabling both (Expansion-only) yields suboptimal results on all three metrics (RACE 41.73, Eff.c. 45.20, C.acc. 59.32),
and we further observe non-terminating runs in which the outline keeps inflating until the budget is exhausted, confirming that the two shrinking actions are load-bearing. Figure [3](https://arxiv.org/html/2606.20122v2#S5.F3 "Figure 3 ‣ 5.3 Component Analysis ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") corroborates this from the behavior side: Expansion dominates the early budget, then Contraction and Revision take over for merging and refresh, with all three active throughout.

| Variant | RACE | Eff.c. | C.acc. |
| --- | --- | --- | --- |
| ScaffoldAgent (Full) | 48.27 | 51.18 | 62.20 |
| w/o Contraction | 44.72 | 43.76 | 57.79 |
| w/o Revision | 43.09 | 50.00 | 58.11 |
| Expansion-only | 41.73 | 45.20 | 59.32 |

Table 3: Ablation on the outline-action space.




Figure 3: Action behavior analysis. Left: overall distribution of planning actions. Right: action frequency across outline
refinement iterations.




Figure 4: Outline tree statistics across methods. Left: average tree depth. Middle: average number of nodes. Right: average documents per node.(DeepResearch Gym)

❷Utility-Dimension Ablation.
For RQ2 (utility side), Table [4](https://arxiv.org/html/2606.20122v2#S5.T4 "Table 4 ‣ 5.3 Component Analysis ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") isolates the three utility terms used to score candidate actions. Removing $U_{\text{ret}}$ mainly weakens evidence supply, sharply reducing Eff.c. 51.18$\to$39.42 ($-11.76$) while C.acc. drops more mildly 62.20$\to$55.68, suggesting that retrieval utility primarily controls whether the tree acquires enough relevant, non-redundant evidence. Removing $U_{\text{str}}$ disrupts global outline organization, dropping RACE 48.27$\to$44.17 ($-4.10$) with only moderate FACT degradation (Eff.c. 47.86, C.acc. 58.41); local claims may remain attributable, but redundant or unbalanced branches weaken comprehensiveness, insight, and readability. Removing $U_{\text{gen}}$ is most damaging overall, yielding the lowest RACE (43.58, $-4.69$) and the largest C.acc. drop 62.20$\to$50.82 ($-11.38$), since trial writing directly scores citation support, intent coverage, and redundancy. Together, these results show that $U_{\text{ret}}$ supplies evidence, $U_{\text{str}}$ regularizes the scaffold, and $U_{\text{gen}}$ aligns outline optimization with downstream report generation.

| Variant | RACE | Eff.c. | C.acc. |
| --- | --- | --- | --- |
| ScaffoldAgent (Full) | 48.27 | 51.18 | 62.20 |
| w/o $U_{\text{ret}}$ | 45.42 | 39.42 | 55.68 |
| w/o $U_{\text{str}}$ | 44.17 | 47.86 | 58.41 |
| w/o $U_{\text{gen}}$ | 43.58 | 44.73 | 50.82 |

Table 4: Ablation on the utility dimensions.

❸Multi-turn Interaction.
For RQ3, Table [5](https://arxiv.org/html/2606.20122v2#S5.T5 "Table 5 ‣ 5.3 Component Analysis ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") compares three multi-turn refinement strategies. Dataset construction and evaluation details are provided in Appendix [B](https://arxiv.org/html/2606.20122v2#A2.SS0.SSS0.Px3 "❸Multi-Turn Refinement Extension. ‣ Appendix B Experiment Datasets ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"). *ReAct-FW* starts a new research process from the combined original and follow-up queries, whereas *ReAct-GR* globally rewrites the first-turn report according to the follow-up instruction. ScaffoldAgentinstead updates the retained scaffold through localized *Expansion*, *Revision*, and *Contraction* while preserving unaffected content. ScaffoldAgentobtains a total score of 72.60, outperforming ReAct-FW (56.75) and ReAct-GR (59.70) by 15.85 and 12.90 points, respectively. These results indicate that localized scaffold refinement more effectively incorporates follow-up instructions while retaining prior content than either fresh research or global rewriting.

| Setting | Ins.$\uparrow$ | Evi.$\uparrow$ | Log.$\uparrow$ | Com.$\uparrow$ | Exp.$\uparrow$ | Tot.$\uparrow$ |
| --- | --- | --- | --- | --- | --- | --- |
| ReAct-FW | 13.80 | 12.20 | 12.75 | 6.60 | 11.40 | 56.75 |
| ReAct-GR | 12.65 | 10.85 | 11.55 | 10.90 | 13.75 | 59.70 |
| ScaffoldAgent | 15.35 | 13.40 | 14.55 | 15.10 | 14.20 | 72.60 |

Table 5: Multi-turn refinement on 100 follow-up instances from DeepResearch Bench. Each dimension is scored 0–20; Tot. is their sum.

#### ❹Outline Tree Statistics.

Figure [4](https://arxiv.org/html/2606.20122v2#S5.F4 "Figure 4 ‣ 5.3 Component Analysis ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") compares the outline structures produced by different methods. ScaffoldAgent yields the deepest trees (3.09) while keeping the node count moderate (16.38), close to StackPlanner (16.67) and well below EDR (22.07), suggesting that Contraction controls tree growth. More importantly, ScaffoldAgent achieves the highest evidence density, with 5.85 documents per node versus 3.59 for EDR, 2.18 for StackPlanner, and 2.02 for WebWeaver. Thus, ScaffoldAgent does not simply expand the outline; it builds a compact scaffold with richer evidence support for each section.

## 6 Conclusion

ScaffoldAgent presents a utility-guided dynamic outline optimization framework for open-ended deep research. Instead of treating the outline as a static pre-writing plan, ScaffoldAgent maintains it as an evolving scaffold that coordinates evidence retrieval, content organization, and long-form report generation. By modeling outline evolution through three explicit operations, Expansion, Contraction, and Revision, the framework enables controllable structural updates that incorporate new information, reduce redundant branches, and refresh weakly supported sections. ScaffoldAgent further introduces a utility-guided feedback mechanism that jointly considers retrieval gain, structural quality, and trial-generation quality, providing inference-time signals for node selection, operation scheduling, and termination.
Experiments on DeepResearch Bench and DeepResearch Gym show that ScaffoldAgent achieves strong overall performance in report quality and factual grounding compared with existing deep research agents, demonstrating the effectiveness of dynamic outline optimization for open-ended research tasks.

## Acknowledgments

This work is supported by the Natural Science Foundation of China (Grant No.62506010)

## Limitations

Despite the consistent improvements achieved by ScaffoldAgent, several directions remain for future work. First, our multi-turn evaluation is still preliminary. Current open-ended deep research benchmarks are largely single-turn, whereas realistic use often involves longer dialogues in which users iteratively revise the scope, constraints, or subtopics. Future work could develop longer multi-turn trajectories and more comprehensive evaluation protocols for such interactive research scenarios.
Second, due to the substantial cost of large-scale deep research evaluation, our experiments are conducted primarily with widely used open-source foundation models and a fixed search interface, rather than the strongest available models and search systems. Future work may further investigate how the framework scales when combined with more capable backbone models, advanced search infrastructures, and larger retrieval budgets.
Finally, ScaffoldAgent currently relies on utility-based inference-time control without explicitly learning an outline-evolution policy. While this design is lightweight and effective, dynamic outline optimization naturally forms a sequential decision-making problem. A promising direction for future work is to learn such policies with reinforcement learning, potentially improving outline expansion, refinement, and information gathering throughout the report generation process.

## Ethical considerations

All experiments in this work were carried out on publicly available open-ended deep research benchmarks, including DeepResearch Bench and DeepResearch Gym, following their respective licenses and usage terms. The study does not involve human or animal subjects, and we did not collect, use, or disclose any personally identifiable information.

## References

- Alchourrón et al. (1985)
  C. E. Alchourrón, P. Gärdenfors, and D. Makinson
  On the logic of theory change: partial meet contraction and revision functions.
  The journal of symbolic logic 50 (2), pp. 510–530.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p6.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§4.3](https://arxiv.org/html/2606.20122v2#S4.SS3.p1.1 "4.3 Outline Agent’s Actions ‣ 4 Method ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Bai et al. (2025)
  Y. Bai, J. Zhang, X. Lv, L. Zheng, S. Zhu, L. Hou, Y. Dong, J. Tang, and J. Li
  Longwriter: unleashing 10,000+ word generation from long context llms.
  In International Conference on Learning Representations,
  Vol. 2025, pp. 36528–36546.
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Bubeck et al. (2023)
  S. Bubeck, V. Chandrasekaran, R. Eldan, J. Gehrke, E. Horvitz, E. Kamar, P. Lee, Y. T. Lee, Y. Li, S. M. Lundberg, H. Nori, H. Palangi, M. T. Ribeiro, and Y. Zhang
  Sparks of artificial general intelligence: early experiments with GPT-4.
  CoRR abs/2303.12712.
  External Links: [Link](https://doi.org/10.48550/arXiv.2303.12712),
  [Document](https://dx.doi.org/10.48550/ARXIV.2303.12712),
  2303.12712
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Carbonell and Goldstein (1998)
  J. Carbonell and J. Goldstein
  The use of mmr, diversity-based reranking for reordering documents and producing summaries.
  In Proceedings of the 21st annual international ACM SIGIR conference on Research and development in information retrieval,
  pp. 335–336.
  Cited by: [Appendix A](https://arxiv.org/html/2606.20122v2#A1.SS0.SSS0.Px2.p2.1 "Utility Signals and Computation. ‣ Appendix A More Method ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Chang et al. (2024)
  Y. Chang, X. Wang, J. Wang, Y. Wu, L. Yang, K. Zhu, H. Chen, X. Yi, C. Wang, Y. Wang, et al.
  A survey on evaluation of large language models.
  ACM transactions on intelligent systems and technology 15 (3), pp. 1–45.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Chen et al. (2025)
  J. Chen, Z. Yang, Y. Shen, J. Liu, A. Belloum, P. Grosso, and C. Papagianni
  SurveyGen-i: consistent scientific survey generation with evolving plans and memory-guided writing.
  In Proceedings of the 14th International Joint Conference on Natural Language Processing and the 4th Conference of the Asia-Pacific Chapter of the Association for Computational Linguistics,
  pp. 3687–3714.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p4.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Coelho et al. (2025)
  J. Coelho, J. Ning, J. He, K. Mao, A. Paladugu, P. Setlur, J. Jin, J. Callan, J. Magalhães, B. Martins, et al.
  Deepresearchgym: a free, transparent, and reproducible evaluation sandbox for deep research.
  arXiv preprint arXiv:2505.19253.
  Cited by: [Appendix B](https://arxiv.org/html/2606.20122v2#A2.SS0.SSS0.Px2 "❷DeepResearch Gym ( ) . ‣ Appendix B Experiment Datasets ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p1.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Du et al. (2025)
  M. Du, B. Xu, C. Zhu, X. Wang, and Z. Mao
  Deepresearch bench: a comprehensive benchmark for deep research agents.
  arXiv preprint arXiv:2506.11763.
  Cited by: [Appendix B](https://arxiv.org/html/2606.20122v2#A2.SS0.SSS0.Px1 "❶DeepResearch Bench ( ) . ‣ Appendix B Experiment Datasets ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p2.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p1.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Fang et al. (2026)
  Y. Fang, W. Liao, Y. Guo, J. Gao, H. Ding, J. Zhang, X. Jiang, Z. Yang, J. Zhao, Y. Wang, et al.
  Graphwalker: graph-guided in-context learning for clinical reasoning on electronic health records.
  arXiv e-prints, pp. arXiv–2604.
  Cited by: [Appendix E](https://arxiv.org/html/2606.20122v2#A5.SS0.SSS0.Px1.p1.1 "❶Clinical Report Case Study ‣ Appendix E Additional Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Feng et al. (2026)
  T. Feng, X. Jiang, X. Hu, Y. Zhang, Z. Tao, W. Zhang, B. Liu, W. Jiang, and C. Wu
  Trust within? seek beyond? knowledge boundary aware policy optimization for agentic search.
  In ACL 2026,
  pp. 27664–27682.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Gao et al. (2023)
  T. Gao, H. Yen, J. Yu, and D. Chen
  Enabling large language models to generate text with citations.
  In Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing,
  pp. 6465–6488.
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Guo et al. (2025)
  D. Guo, D. Yang, H. Zhang, J. Song, R. Zhang, R. Xu, Q. Zhu, S. Ma, P. Wang, X. Bi, et al.
  Deepseek-r1: incentivizing reasoning capability in llms via reinforcement learning.
  arXiv preprint arXiv:2501.12948.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Guo et al. (2026)
  Y. Guo, S. Ye, S. Chen, Z. Wen, T. Zhang, B. Qirui, D. Jin, Y. Hou, H. He, X. Tan, et al.
  Rethinking table pruning in tableqa: from sequential revisions to gold trajectory-supervised parallel search.
  In Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
  pp. 12960–12976.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Han et al. (2025)
  R. Han, Y. Chen, Z. CuiZhu, L. Miculicich, G. Sun, Y. Bi, W. Wen, H. Wan, C. Wen, S. Maître, G. Lee, V. Tirumalashetty, E. Xue, Z. Zhang, S. Haykal, B. Gokturk, T. Pfister, and C. Lee
  Deep researcher with test-time diffusion.
  CoRR abs/2507.16075.
  External Links: [Link](https://doi.org/10.48550/arXiv.2507.16075),
  [Document](https://dx.doi.org/10.48550/ARXIV.2507.16075),
  2507.16075
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p4.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Jaech et al. (2024)
  A. Jaech, A. Kalai, A. Lerer, A. Richardson, A. El-Kishky, A. Low, A. Helyar, A. Madry, A. Beutel, A. Carney, et al.
  Openai o1 system card.
  arXiv preprint arXiv:2412.16720.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Jiang et al. (2025)
  X. Jiang, Y. Fang, R. Qiu, H. Zhang, Y. Xu, H. Chen, W. Zhang, R. Zhang, Y. Fang, X. Ma, X. Chu, J. Zhao, and Y. Wang
  TC-RAG: turing-complete rag’s case study on medical LLM systems.
  In Proceedings of the 63rd Annual Meeting of the Association for Computational
  Linguistics (Volume 1: Long Papers), ACL 2025, Vienna, Austria,
  July 27 - August 1, 2025, W. Che, J. Nabende, E. Shutova, and M. T. Pilehvar (Eds.),
  pp. 11400–11426.
  External Links: [Link](https://doi.org/10.18653/v1/2025.acl-long.558),
  [Document](https://dx.doi.org/10.18653/V1/2025.ACL-LONG.558)
  Cited by: [Appendix E](https://arxiv.org/html/2606.20122v2#A5.SS0.SSS0.Px1.p1.1 "❶Clinical Report Case Study ‣ Appendix E Additional Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Jimenez et al. (2024)
  C. E. Jimenez, J. Yang, A. Wettig, S. Yao, K. Pei, O. Press, and K. Narasimhan
  Swe-bench: can language models resolve real-world github issues?.
  In International Conference on Learning Representations,
  Vol. 2024, pp. 54107–54157.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p2.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p3.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Jin et al. (2025)
  B. Jin, H. Zeng, Z. Yue, J. Yoon, S. Arik, D. Wang, H. Zamani, and J. Han
  Search-r1: training llms to reason and leverage search engines with reinforcement learning.
  arXiv preprint arXiv:2503.09516.
  Cited by: [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Lee et al. (2025)
  Y. Lee, S. Ka, B. Son, P. Kang, and J. Kang
  Navigating the path of writing: outline-guided text generation with large language models.
  In Proceedings of the 2025 Conference of the Nations of the Americas Chapter of the Association for Computational Linguistics: Human Language Technologies (Volume 3: Industry Track),
  pp. 233–250.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p4.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Lei et al. (2025)
  Y. Lei, S. Si, W. Wang, Y. Wu, G. Chen, F. Qi, and M. Sun
  RhinoInsight: improving deep research through control mechanisms for model behavior and context.
  arXiv preprint arXiv:2511.18743.
  Cited by: [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Lewis et al. (2020)
  P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. Küttler, M. Lewis, W. Yih, T. Rocktäschel, S. Riedel, and D. Kiela
  Retrieval-augmented generation for knowledge-intensive NLP tasks.
  In Advances in Neural Information Processing Systems 33: Annual Conference
  on Neural Information Processing Systems 2020, NeurIPS 2020, December
  6-12, 2020, virtual, H. Larochelle, M. Ranzato, R. Hadsell, M. Balcan, and H. Lin (Eds.),
  External Links: [Link](https://proceedings.neurips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html)
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Li et al. (2026)
  Y. Li, W. Chen, Y. Yan, M. Li, S. Mei, X. Wang, K. Liu, X. Cong, S. Wang, Z. Zhang, Y. Lu, Z. Liu, Y. Lin, Z. Liu, and M. Sun
  AgentCPM-report: interleaving drafting and deepening for open-ended deep research.
  CoRR abs/2602.06540.
  External Links: [Link](https://doi.org/10.48550/arXiv.2602.06540),
  [Document](https://dx.doi.org/10.48550/ARXIV.2602.06540),
  2602.06540
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p3.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Liu et al. (2024)
  A. Liu, B. Feng, B. Xue, B. Wang, B. Wu, C. Lu, C. Zhao, C. Deng, C. Zhang, C. Ruan, et al.
  Deepseek-v3 technical report.
  arXiv preprint arXiv:2412.19437.
  Cited by: [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p3.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Liu et al. (2026)
  J. Liu, J. Chen, Z. Song, S. Zhou, C. Lv, H. Wu, K. Jiang, J. Wu, B. Yu, and C. Zhou
  From proprietary to open-source: bridging the distribution gap via multi-agent protocol distillation in agentic search.
  arXiv preprint arXiv:2607.24280.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Liu et al. (2025)
  Y. Liu, Z. Zhong, Y. Liao, Z. Sun, J. Zheng, J. Wei, Q. Gong, F. Tong, Y. Chen, Y. Zhang, et al.
  On the generalization and adaptation ability of machine-generated text detectors in academic writing.
  In Proceedings of the 31st ACM SIGKDD Conference on Knowledge Discovery and Data Mining V. 2,
  pp. 5674–5685.
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Menick et al. (2022)
  J. Menick, M. Trebacz, V. Mikulik, J. Aslanides, F. Song, M. Chadwick, M. Glaese, S. Young, L. Campbell-Gillingham, G. Irving, et al.
  Teaching language models to support answers with verified quotes.
  arXiv preprint arXiv:2203.11147.
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Mialon et al. (2024)
  G. Mialon, C. Fourrier, T. Wolf, Y. LeCun, and T. Scialom
  Gaia: a benchmark for general ai assistants.
  In International Conference on Learning Representations,
  Vol. 2024, pp. 9025–9049.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p2.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p3.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Prabhakar et al. (2025)
  A. Prabhakar, R. Ram, Z. Chen, S. Savarese, F. Wang, C. Xiong, H. Wang, and W. Yao
  Enterprise deep research: steerable multi-agent deep research for enterprise analytics.
  arXiv preprint arXiv:2510.17797.
  Cited by: [3rd item](https://arxiv.org/html/2606.20122v2#A3.I3.i3.p1.1.1 "In ❸Multi-Agent. ‣ Appendix C Baseline Implementation Details ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p3.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p2.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Schick et al. (2023)
  T. Schick, J. Dwivedi-Yu, R. Dessì, R. Raileanu, M. Lomeli, E. Hambro, L. Zettlemoyer, N. Cancedda, and T. Scialom
  Toolformer: language models can teach themselves to use tools.
  Advances in neural information processing systems 36, pp. 68539–68551.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Shao et al. (2024)
  Y. Shao, Y. Jiang, T. Kanell, P. Xu, O. Khattab, and M. Lam
  Assisting in writing wikipedia-like articles from scratch with large language models.
  In Proceedings of the 2024 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies (Volume 1: Long Papers),
  pp. 6252–6278.
  Cited by: [1st item](https://arxiv.org/html/2606.20122v2#A3.I3.i1.p1.1.1 "In ❸Multi-Agent. ‣ Appendix C Baseline Implementation Details ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p3.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p4.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p2.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Shi et al. (2025)
  X. Shi, Q. Kou, Y. Li, N. Tang, J. Xie, L. Yu, S. Wang, and H. Zhou
  Scisage: a multi-agent framework for high-quality scientific survey generation.
  arXiv preprint arXiv:2506.12689.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p4.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Shinn et al. (2023)
  N. Shinn, F. Cassano, A. Gopinath, K. Narasimhan, and S. Yao
  Reflexion: language agents with verbal reinforcement learning.
  In Advances in Neural Information Processing Systems 36: Annual Conference
  on Neural Information Processing Systems 2023, NeurIPS 2023, New Orleans,
  LA, USA, December 10 - 16, 2023, A. Oh, T. Naumann, A. Globerson, K. Saenko, M. Hardt, and S. Levine (Eds.),
  External Links: [Link](http://papers.nips.cc/paper\_files/paper/2023/hash/1b44b878bb782e6954cd888628510e90-Abstract-Conference.html)
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Tao et al. (2025)
  Z. Tao, J. Wu, W. Yin, J. Zhang, B. Li, H. Shen, K. Li, L. Zhang, X. Wang, Y. Jiang, P. Xie, F. Huang, and J. Zhou
  WebShaper: agentically data synthesizing via information-seeking formalization.
  External Links: 2507.15061,
  [Link](https://arxiv.org/abs/2507.15061)
  Cited by: [3rd item](https://arxiv.org/html/2606.20122v2#A3.I2.i3.p1.1.1 "In ❷Single-Agent. ‣ Appendix C Baseline Implementation Details ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p2.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Trinh et al. (2024)
  T. H. Trinh, Y. Wu, Q. V. Le, H. He, and T. Luong
  Solving olympiad geometry without human demonstrations.
  Nature 625 (7995), pp. 476–482.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Trivedi et al. (2023)
  H. Trivedi, N. Balasubramanian, T. Khot, and A. Sabharwal
  Interleaving retrieval with chain-of-thought reasoning for knowledge-intensive multi-step questions.
  In Proceedings of the 61st Annual Meeting of the Association for Computational
  Linguistics (Volume 1: Long Papers), ACL 2023, Toronto, Canada,
  July 9-14, 2023, A. Rogers, J. L. Boyd-Graber, and N. Okazaki (Eds.),
  pp. 10014–10037.
  External Links: [Link](https://doi.org/10.18653/v1/2023.acl-long.557),
  [Document](https://dx.doi.org/10.18653/V1/2023.ACL-LONG.557)
  Cited by: [2nd item](https://arxiv.org/html/2606.20122v2#A3.I2.i2.p1.1.1 "In ❷Single-Agent. ‣ Appendix C Baseline Implementation Details ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p2.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Wan et al. (2025)
  K. Wan, H. Mu, R. Hao, H. Luo, T. Gu, and X. Chen
  A cognitive writing perspective for constrained long-form text generation.
  In Findings of the Association for Computational Linguistics: ACL 2025,
  pp. 9832–9844.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p4.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Wang et al. (2025)
  Q. Wang, J. Hu, Z. Li, Y. Wang, D. Li, Y. Hu, and M. Tan
  Generating long-form story using dynamic hierarchical outlining with memory-enhancement.
  In Proceedings of the 2025 Conference of the Nations of the Americas Chapter of the Association for Computational Linguistics: Human Language Technologies (Volume 1: Long Papers),
  pp. 1352–1391.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p3.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p4.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Wu et al. (2025)
  Y. Wu, Y. Bai, Z. Hu, J. Li, and R. K. Lee
  SuperWriter: reflection-driven long-form generation with large language models.
  arXiv preprint arXiv:2506.04180.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p4.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Xiong et al. (2025)
  R. Xiong, Y. Chen, D. Khizbullin, M. Zhuge, and J. Schmidhuber
  Beyond outlining: heterogeneous recursive planning for adaptive long-form writing with language models.
  In Proceedings of the 2025 Conference on Empirical Methods in Natural
  Language Processing, EMNLP 2025, Suzhou, China, November 4-9, 2025, C. Christodoulopoulos, T. Chakraborty, C. Rose, and V. Peng (Eds.),
  pp. 24678–24714.
  External Links: [Link](https://doi.org/10.18653/v1/2025.emnlp-main.1254),
  [Document](https://dx.doi.org/10.18653/V1/2025.EMNLP-MAIN.1254)
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p3.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p4.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Xiong et al. (2026)
  Z. Xiong, G. Wu, L. Yao, M. Pan, X. Du, and H. Wang
  WebWeaver: breaking topology confidentiality in LLM multi-agent systems with stealthy context-based inference.
  CoRR abs/2603.11132.
  External Links: [Link](https://doi.org/10.48550/arXiv.2603.11132),
  [Document](https://dx.doi.org/10.48550/ARXIV.2603.11132),
  2603.11132
  Cited by: [2nd item](https://arxiv.org/html/2606.20122v2#A3.I3.i2.p1.1.1 "In ❸Multi-Agent. ‣ Appendix C Baseline Implementation Details ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p2.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p3.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p4.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p2.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Xu et al. (2025a)
  Y. Xu, X. Jiang, X. Chu, R. Qiu, Y. Feng, H. Ding, J. Zhao, Y. Wang, and B. Xie
  Dearllm: enhancing personalized healthcare via large language models-deduced feature correlations.
  In Proceedings of the AAAI Conference on Artificial Intelligence,
  Vol. 39, pp. 941–949.
  Cited by: [Appendix E](https://arxiv.org/html/2606.20122v2#A5.SS0.SSS0.Px1.p1.1 "❶Clinical Report Case Study ‣ Appendix E Additional Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Xu et al. (2025b)
  Y. Xu, R. Zhang, X. Jiang, Y. Feng, Y. Xiao, X. Ma, R. Zhu, X. Chu, J. Zhao, and Y. Wang
  Parenting: optimizing knowledge selection of retrieval-augmented language models with parameter decoupling and tailored tuning.
  In Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
  pp. 11643–11662.
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Yang et al. (2025)
  A. Yang, A. Li, B. Yang, B. Zhang, B. Hui, B. Zheng, B. Yu, C. Gao, C. Huang, C. Lv, et al.
  Qwen3 technical report.
  arXiv preprint arXiv:2505.09388.
  Cited by: [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p3.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§5.2](https://arxiv.org/html/2606.20122v2#S5.SS2.p1.1 "5.2 Main Result Analysis (RQ1) ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Yang et al. (2023)
  K. Yang, D. Klein, N. Peng, and Y. Tian
  Doc: improving long story coherence with detailed outline control.
  In Proceedings of the 61st Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
  pp. 3378–3465.
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Yang et al. (2022)
  K. Yang, Y. Tian, N. Peng, and D. Klein
  Re3: generating longer stories with recursive reprompting and revision.
  In Proceedings of the 2022 Conference on Empirical Methods in Natural Language Processing,
  pp. 4393–4479.
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Yang et al. (2026)
  Z. Yang, X. Jiang, R. Qiu, R. Li, Y. Zhang, Y. Fang, Y. Xu, H. Ding, X. Chu, J. Zhao, et al.
  Dfams: dynamic-flow guided federated alignment based multi-prototype search.
  In Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
  pp. 24728–24752.
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Yao et al. (2019)
  L. Yao, N. Peng, R. Weischedel, K. Knight, D. Zhao, and R. Yan
  Plan-and-write: towards better automatic storytelling.
  In Proceedings of the AAAI Conference on Artificial Intelligence,
  Vol. 33, pp. 7378–7385.
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Yao et al. (2023)
  S. Yao, J. Zhao, D. Yu, N. Du, I. Shafran, K. R. Narasimhan, and Y. Cao
  ReAct: synergizing reasoning and acting in language models.
  In The Eleventh International Conference on Learning Representations,
  ICLR 2023, Kigali, Rwanda, May 1-5, 2023,
  External Links: [Link](https://openreview.net/forum?id=WE\_vluYUL-X)
  Cited by: [1st item](https://arxiv.org/html/2606.20122v2#A3.I2.i1.p1.1.1 "In ❷Single-Agent. ‣ Appendix C Baseline Implementation Details ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p2.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Zhang et al. (2026)
  R. Zhang, X. Jiang, Z. Yang, Z. Zhang, J. Gao, Y. Xiao, H. Lai, X. Chu, J. Zhao, and Y. Wang
  StackPlanner: a centralized hierarchical multi-agent system with task-experience memory management.
  arXiv preprint arXiv:2601.05890.
  Cited by: [4th item](https://arxiv.org/html/2606.20122v2#A3.I3.i4.p1.1.1 "In ❸Multi-Agent. ‣ Appendix C Baseline Implementation Details ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§1](https://arxiv.org/html/2606.20122v2#S1.p1.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research"),
  [§5.1](https://arxiv.org/html/2606.20122v2#S5.SS1.p2.1 "5.1 Experimental Setup ‣ 5 Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Zhang et al. (2025)
  R. Zhang, Y. Xu, Y. Xiao, R. Zhu, X. Jiang, X. Chu, J. Zhao, and Y. Wang
  Knowpo: knowledge-aware preference optimization for controllable knowledge selection in retrieval-augmented language models.
  In Proceedings of the AAAI Conference on Artificial Intelligence,
  Vol. 39, pp. 25895–25903.
  Cited by: [§2.2](https://arxiv.org/html/2606.20122v2#S2.SS2.p1.1 "2.2 Report Generation ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Zhou et al. (2024)
  S. Zhou, F. F. Xu, H. Zhu, X. Zhou, R. Lo, A. Sridhar, X. Cheng, T. Ou, Y. Bisk, D. Fried, et al.
  Webarena: a realistic web environment for building autonomous agents.
  In International Conference on Learning Representations,
  Vol. 2024, pp. 15585–15606.
  Cited by: [§1](https://arxiv.org/html/2606.20122v2#S1.p2.1 "1 Introduction ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").
- Zhu et al. (2026)
  C. Zhu, B. Xu, M. Du, S. Wang, X. Wang, Z. Mao, and Y. Zhang
  FS-researcher: test-time scaling for long-horizon research tasks with file-system-based agents.
  arXiv preprint arXiv:2602.01566.
  Cited by: [§2.1](https://arxiv.org/html/2606.20122v2#S2.SS1.p1.1 "2.1 Open-Ended Deep Research ‣ 2 Related Work ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").

## Appendix A More Method

#### Optimization Algorithm.

Algorithm [1](https://arxiv.org/html/2606.20122v2#alg1 "Algorithm 1 ‣ Optimization Algorithm. ‣ Appendix A More Method ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") summarizes the inference-time outline optimization (Opt.) process of ScaffoldAgent.

Algorithm 1  Outline Opt. in ScaffoldAgent

1:
Query $q$, search interface $\mathcal{S}$, max steps $T$, threshold $\epsilon$

2:
Final report $y$

3:
Initialize outline tree $\mathcal{T}_{0}$ from $q$

4:
Initialize node statistics $\theta_{v}=(n_{v},\bar{u}_{v})$

5:
for $t=0$ to $T-1$ do

6:
  Select $v_{t}$ using historical utility feedback

7:
  Choose $o_{t}\in\{\textbf{Expansion},\textbf{Contraction},\textbf{Revision}\}$

8:
  if $o_{t}\neq\textsc{Contraction}$ then

9:
   Retrieve evidence $\Delta\mathcal{E}_{v_{t}}$ via $\mathcal{S}$

10:
  end if

11:
  Update outline: $\mathcal{T}_{t+1}\leftarrow o_{t}(\mathcal{T}_{t},v_{t})$

12:
  Trial-write the affected subtree

13:
  Score updated subtree by $U_{\text{ret}},U_{\text{str}},U_{\text{gen}}$

14:
  Compute $U_{t}=\lambda_{1}U_{\text{ret}}+\lambda_{2}U_{\text{str}}+\lambda_{3}U_{\text{gen}}$

15:
  Update $\theta_{v_{t}}$ with $U_{t}$

16:
  if recent utility gain $<\epsilon$ then

17:
   break

18:
  end if

19:
end for

20:
Generate $y$ along the final outline

21:
return $y$

#### Utility Signals and Computation.

We provide further details on how the utility components in Section [4.4](https://arxiv.org/html/2606.20122v2#S4.SS4 "4.4 Utility-Guided Feedback ‣ 4 Method ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") are computed. The overall utility is computed as

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$U_{t}=\lambda_{1}U_{\text{ret}}+\lambda_{2}U_{\text{str}}+\lambda_{3}U_{\text{gen}},$$ |  | (13) |

where retrieval utility, structure utility, and generation utility capture complementary aspects of the updated local scaffold.

Retrieval utility.
After an action retrieves a set of new documents
$\Delta\mathcal{E}_{v}=\{d_{1},\ldots,d_{k}\}$ for the target node $v$,
we compute a retrieval reward following the intuition of maximal marginal relevance (MMR) [Carbonell and Goldstein (1998)](https://arxiv.org/html/2606.20122v2#bib.bib30):
useful evidence should be relevant to the current information need while adding non-redundant information.
Formally, we define

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$U_{\text{ret}}=w_{\text{rel}}\mathrm{Rel}+w_{\text{nov}}\mathrm{Nov},$$ |  | (14) |

where $w_{\text{rel}}$ and $w_{\text{nov}}$ control the trade-off between relevance and novelty.

$\mathrm{Rel}$ measures semantic alignment between the retrieved documents and the target node intent.
Let $q_{v}$ denote the retrieval query derived from node $v$, including its title and local outline context.
Given the embedding of $q_{v}$ and each retrieved document $d_{j}$, relevance is computed as

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\mathrm{Rel}=\frac{1}{k}\sum_{j=1}^{k}\mathrm{sim}(q_{v},d_{j}),$$ |  | (15) |

where $\mathrm{sim}(\cdot,\cdot)$ denotes cosine similarity in the embedding space.

$\mathrm{Nov}$ measures the marginal information gain of the retrieved documents with respect to cached evidence in the current outline.
For each new document $d_{j}$, we compare it with the existing evidence set $\mathcal{E}_{\mathrm{cache}}$ attached to the target node and related outline nodes:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\mathrm{Nov}=\frac{1}{k}\sum_{j=1}^{k}\left(1-\max_{d^{\prime}\in\mathcal{E}_{\mathrm{cache}}}\mathrm{sim}(d_{j},d^{\prime})\right).$$ |  | (16) |

This term assigns higher scores to documents that introduce information not already covered by the current scaffold, thereby encouraging broader evidence acquisition rather than repeated retrieval of similar passages.

Structure utility.
Structure utility evaluates whether the updated outline remains coherent, balanced, and non-redundant:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$U_{\text{str}}=w_{\text{coh}}\mathrm{Coh}+w_{\text{bal}}\mathrm{Bal}-w_{\text{red}}\mathrm{Red}.$$ |  | (17) |

$\mathrm{Coh}$ is estimated by an LLM judge that assesses whether the child intents are semantically consistent with the parent intent and whether the subtree forms a coherent decomposition of the target topic.

$\mathrm{Bal}$ measures whether the updated local subtree has an appropriate depth and branching structure.
Let $\mathcal{T}_{v}$ denote the subtree rooted at node $v$, and let $b_{i}$ be the number of children of node $i$ in this subtree.
We define

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\mathrm{Bal}=\exp(-\Delta_{d}-\Delta_{b}),$$ |  | (18) |

where
$\Delta_{d}=|\mathrm{depth}(\mathcal{T}_{v})-d^{\star}|/d^{\star}$ measures the deviation from the desired local depth $d^{\star}$, and
$\Delta_{b}=\mathrm{Var}(\{b_{i}\}_{i\in\mathcal{T}_{v}})/(b^{\star})^{2}$ measures the imbalance of the branching distribution with respect to the desired branching factor $b^{\star}$.
This score is high when the subtree has a reasonable depth and a stable branching pattern, and decreases when the subtree becomes overly shallow, overly deep, or structurally imbalanced.

$\mathrm{Red}$ measures redundancy among sibling nodes.
We estimate it using pairwise semantic similarity between sibling intents and their attached evidence, with an LLM redundancy judgment for near-duplicate subtopics when similarity alone is ambiguous.

Generation utility.
Generation utility evaluates whether the updated local scaffold can support grounded writing:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$U_{\text{gen}}=\alpha\rho_{\text{sup}}+\beta\rho_{\text{cov}}-\gamma\rho_{\text{red}}.$$ |  | (19) |

The Reporter Agent first performs local trial writing on the affected node or subtree. We then score the generated draft from three aspects. $\rho_{\text{sup}}$ measures factual support. We split the trial draft into claim units and use an NLI model to estimate whether each claim is entailed by the evidence attached to the target node:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\rho_{\text{sup}}=\frac{1}{|\mathcal{C}|}\sum_{c\in\mathcal{C}}\max_{e\in\mathcal{E}_{v}}p_{\text{NLI}}(\mathrm{entail}\mid e,c),$$ |  | (20) |

where $\mathcal{C}$ is the set of claims extracted from the trial draft. $\rho_{\text{cov}}$ measures intent coverage. We ask an LLM judge to compare the node intent with the generated local draft and return a normalized score indicating whether the draft covers the required aspects. $\rho_{\text{red}}$ penalizes repeated content in the trial draft and semantic overlap with neighboring sections, estimated by semantic similarity and an LLM redundancy check.

| Component | Signal | Estimator |
| --- | --- | --- |
| $\mathrm{Rel}$ | Evidence–intent relevance | Semantic similarity / LLM judge |
| $\mathrm{Nov}$ | Evidence novelty | Max similarity to cached evidence |
| $\mathrm{Coh}$ | Subtree coherence | LLM judge |
| $\mathrm{Bal}$ | Tree balance | Depth and branching statistics |
| $\mathrm{Red}$ | Sibling redundancy | Similarity / LLM judge |
| $\rho_{\text{sup}}$ | Claim support | NLI entailment model |
| $\rho_{\text{cov}}$ | Intent coverage | LLM judge |
| $\rho_{\text{red}}$ | Draft redundancy | Similarity / LLM judge |

Table 6: Utility components and their estimators.

## Appendix B Experiment Datasets

We evaluate our approach on two widely used benchmarks targeting end-to-end deep research agent evaluation. Key statistics are summarized in Table [7](https://arxiv.org/html/2606.20122v2#A2.T7 "Table 7 ‣ ❷DeepResearch Gym ( ) . ‣ Appendix B Experiment Datasets ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").

#### ❶DeepResearch Bench [Du et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib12).

A benchmark of 100 PhD level tasks (50 EN and 50 ZH) across 22 expert curated domains, with the topical distribution calibrated against 96,147 real world user queries. Evaluation combines RACE, an LLM judge protocol that scores reports against a reference along adaptively weighted dimensions (comprehensiveness, insight, instruction following, readability), and FACT, which verifies citation and claim pairs to report citation accuracy (C. Acc.) and effective citations per task (E. Cit.).

#### ❷DeepResearch Gym [Coelho et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib28).

An open-source sandbox built on top of the Researchy Questions dataset. Following the released pipeline, we run our system on a 100-query subset sampled by document-click frequency, where higher-clicked queries naturally elicit multi-source exploration and long-form synthesis. Each report is then scored under an LLM-as-a-judge protocol along six complementary dimensions: Clarity, Depth, Balance, Breadth, Support and Insightfulness.

| Dataset | #Samples | Lang. |
| --- | --- | --- |
| DeepResearch Bench | 100 | EN / ZH |
| DeepResearch Gym | 100 | EN |

Table 7: Overview of deep research benchmarks.

#### ❸Multi-Turn Refinement Extension.

To evaluate follow-up interaction, we construct a multi-turn extension based on DeepResearch Bench. For each sampled first-turn query $q$ and its corresponding report $y$, we generate follow-up instructions $q^{\prime}$ that cover common ways users refine a deep research report: asking for deeper explanation of a local point, requesting additional evidence or citations, adding a new comparison target or constraint, adjusting the presentation, or correcting an erroneous definition or premise. This yields triples $(q,y,q^{\prime})$ that test whether an agent can revise an existing report without unnecessarily changing unaffected content. We evaluate the updated reports with an LLM judge on five 0–20 dimensions: Ins. for follow-up instruction satisfaction, Evi. for evidence support of new or modified claims, Log. for consistency with the surviving report, Com. for preserving important first-turn content while completing the follow-up, and Exp. for clarity and rigor of expression. Tot. is the sum of the five scores.

## Appendix C Baseline Implementation Details

We compare our method against baselines drawn from three paradigms
(*Naive*, *Single-Agent*, and *Multi-Agent*),
covering distinct strategies for reasoning, retrieval, and agent coordination.
Implementation details for each paradigm are described below.

#### ❶Naive.

Naive baselines do not involve explicit agentic reasoning or coordination mechanisms. They either rely solely on the LLM’s parametric knowledge or incorporate retrieval in a fixed, heuristic manner.

- •

  Prompt.
  A non-retrieval baseline where the LLM directly generates the final report from the input query using only its parametric knowledge, without any external evidence.
- •

  RAG.
  A retrieval-augmented baseline that issues the input query to the search API once, concatenates the top-ranked passages with the query, and prompts the LLM to produce the report in a single pass.

#### ❷Single-Agent.

Single-Agent baselines rely on a single LLM that alternates between reasoning and tool use through prompting, without explicit coordination among multiple agents.

- •

  ReAct [Yao et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib4).
  ReAct interleaves reasoning and tool invocation in a single loop, enabling the model to iteratively retrieve information and update its reasoning before producing the final answer.
- •

  IRCoT [Trivedi et al. (2023)](https://arxiv.org/html/2606.20122v2#bib.bib2).
  IRCoT alternates retrieval and chain-of-thought reasoning, using intermediate reasoning steps to formulate new retrieval queries and progressively accumulate evidence.
- •

  WebShaper [Tao et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib29).
  WebShaper formulates information seeking as an iterative query expansion and refinement process, gradually constructing a structured evidence set for answer synthesis. We directly report the WebShaper results published on the WebWeaver benchmark for comparison.

#### ❸Multi-Agent.

Multi-Agent baselines decompose the task into multiple interacting agents,
leveraging either centralized coordination or automated agent orchestration strategies.

- •

  STORM [Shao et al. (2024)](https://arxiv.org/html/2606.20122v2#bib.bib17).
  STORM generates long-form, Wikipedia-style reports through a multi-perspective pipeline that first asks specialized agents to brainstorm an outline from different viewpoints, then conducts grounded conversations to gather evidence, and finally writes the article section by section. Based on their open-source implementation, we conducted experiments adapting the ’bocha’ search engine as the retrieval module.
- •

  WebWeaver [Xiong et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib11).
  WebWeaver employs a planner agent and a writer agent that collaborate over a dynamically evolving outline and an evidence memory bank: the planner interleaves search and outline updates, while the writer composes each section by retrieving only the locally relevant evidence to mitigate long-context drift. Building upon their open-source implementation, we integrated the Bocha search engine and conducted experiments.
- •

  EDR [Prabhakar et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib20).
  EDR (Enterprise Deep Research) is a steerable, multi-agent system that coordinates specialized domain agents (e.g., Master Planner, Academic/GitHub/LinkedIn Searchers) and enterprise tools (e.g., NL2SQL). It produces comprehensive research reports through iterative refinement, explicit citation tracking, and a reflection mechanism to address knowledge gaps. In our experiments, we built upon the open-source EDR framework and integrated the Bocha search engine to ensure a fair comparison.
- •

  StackPlanner [Zhang et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib9).
  StackPlanner adopts a stack-based planning controller that pushes and pops sub-goals during exploration, allowing the agent to recursively decompose the research task, dispatch sub-queries to retrieval tools, and assemble the final report from the resolved sub-goals.

## Appendix D Implementation Details

We implement ScaffoldAgent without any additional fine-tuning. All LLM interactions are performed through API calls, using Qwen3-32B or DeepSeek for both outline planning and report generation. We adopt BoCha as the default web search backend, retrieving five documents during initialization and eight documents for each subsequent expansion or update query. The outline optimization process is terminated after 20 iterations.

All retrieved documents are encoded using text-embedding-3-small. The resulting 1,536-dimensional embeddings are used to compute all similarity-based metrics, including relevance, novelty, memory retrieval, and sibling-cohesion scores via cosine similarity. We do not use a local encoder for embedding-based retrieval. Instead, local models are reserved for citation verification. Specifically, the system first employs a sentence-transformers CrossEncoder based on nli-deberta-v3-small; when unavailable, DeepSeek is used as a fallback natural language inference (NLI) verifier.

For all experiments, we set $\lambda_{1}=\lambda_{2}=\lambda_{3}=1/3$. Within the utility formulation, we use $w_{\mathrm{rel}}=0.6$ and $w_{\mathrm{nov}}=0.4$ for retrieval, $w_{\mathrm{coh}}=0.4$, $w_{\mathrm{bal}}=0.2$, and $w_{\mathrm{red}}=0.4$ for structural optimization, and $\alpha=0.4$, $\beta=0.4$, and $\gamma=0.2$ for generation.
Following the official DeepResearch Bench protocol, we use GPT-5.5 for RACE and GPT-5.4-mini for FACT. For DeepResearch Gym, we use GPT-5.4-mini as the LLM judge for all methods.

|  |  |  |  |
| --- | --- | --- | --- |
| Utility | Signal | Estimator | Weight |
| $U_{\mathrm{ret}}$ | $\mathrm{Rel}$ | Cosine similarity with text-embedding-3-small | $0.6$ |
| $\mathrm{Nov}$ | $1-\max$ cosine similarity to cached evidence | $0.4$ |
| $U_{\mathrm{str}}$ | $\mathrm{Coh}$ | LLM judge / sibling semantic consistency | $0.4$ |
| $\mathrm{Bal}$ | Local depth and branching statistics | $0.2$ |
| $\mathrm{Red}$ | Sibling similarity and LLM redundancy check | $0.4$ |
| $U_{\mathrm{gen}}$ | $\rho_{\mathrm{sup}}$ | CrossEncoder NLI, with DeepSeek fallback | $0.4$ |
| $\rho_{\mathrm{cov}}$ | LLM judge for intent coverage | $0.4$ |
| $\rho_{\mathrm{red}}$ | Semantic similarity and LLM redundancy check | $0.2$ |

Table 8: Implementation details of utility signals in ScaffoldAgent. All component scores are normalized to $[0,1]$. Larger values indicate stronger presence of the corresponding signal; redundancy signals are used as penalty terms in the utility function.

## Appendix E Additional Experiments

#### ❶Clinical Report Case Study

LLMs have also demonstrated strong potential in healthcare applications [Xu et al. (2025a)](https://arxiv.org/html/2606.20122v2#bib.bib44); [Jiang et al. (2025)](https://arxiv.org/html/2606.20122v2#bib.bib1); [Fang et al. (2026)](https://arxiv.org/html/2606.20122v2#bib.bib46). To examine the domain generality of ScaffoldAgent, we apply it to a clinical reporting task that requires synthesizing evidence from multiple medical sources as shown in Figure [5](https://arxiv.org/html/2606.20122v2#A5.F5 "Figure 5 ‣ ❶Clinical Report Case Study ‣ Appendix E Additional Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research").

![Refer to caption](https://arxiv.org/html/2606.20122v2/case.png)


Figure 5: Example clinical report generated by ScaffoldAgent(in Chinese).

#### ❷Inference-Cost Comparison.

Beyond quality, we also report inference cost as a standalone efficiency check. Table [9](https://arxiv.org/html/2606.20122v2#A5.T9 "Table 9 ‣ ❷Inference-Cost Comparison. ‣ Appendix E Additional Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") shows the average
per-query inference cost. ScaffoldAgent consumes 26.3k tokens, issues 8.2 search calls, and finishes in 116.7 s, using 29% fewer tokens and 49% fewer search calls than WebWeaver (37.2k / 15.9), and running faster than EDR (135.5 s) at comparable token cost. The utility-guided action selection concentrates retrieval on high-utility nodes, so the RACE and FACT gains in Sections ❶ and ❷ do not come at the price of runaway inference cost.

| Method | Input | Output | Total | #Search | Latency |
| --- | --- | --- | --- | --- | --- |
| Ours | 19.2k | 7.1k | 26.3k | 8.2 | 116.7 s |
| WebWeaver | 27.9k | 9.3k | 37.2k | 15.9 | 148.5 s |
| EDR† | 26.0k | 3.7k | 29.8k | 9.1 | 135.5 s |

Table 9: Inference cost comparison on DeepResearch Bench.

#### ❸Report Length Distribution

Figure [6](https://arxiv.org/html/2606.20122v2#A5.F6 "Figure 6 ‣ ❸Report Length Distribution ‣ Appendix E Additional Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") compares the distribution of generated report lengths across methods. Naive and single-agent methods mostly produce short reports below 4K characters, whereas multi-agent methods show substantially longer outputs. Among them, ScaffoldAgent has the highest median length, around 22K characters, and a relatively compact interquartile range compared with STORM, whose outputs vary widely from short reports to over 30K characters. EDR is more concentrated around 6–9K characters, and WebWeaver remains close to the short-report regime. These patterns suggest that ScaffoldAgent’s optimized outline scaffold supports more extensive and stable synthesis, while the main quality metrics confirm that the longer outputs are accompanied by stronger depth, breadth, and grounding.

Figure 6: Distribution of output report lengths across methods.

#### ❹Backbone and Search-Backend Generalization.

Table [10](https://arxiv.org/html/2606.20122v2#A5.T10 "Table 10 ‣ ❹Backbone and Search-Backend Generalization. ‣ Appendix E Additional Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") evaluates whether ScaffoldAgenttransfers to stronger proprietary backbones and alternative retrieval systems. DeepSeek-V4-Pro and GPT-5.4-mini use the full evaluation setting, whereas
GPT-5.4 is evaluated as a shared 20-query pilot because of its higher API cost. For retrieval generalization, we hold the Qwen3-32B backbone
and all non-retrieval configurations fixed and replace the original web API with Bing Search or a Wikipedia backend constructed from the November 2023 dump.

| Factor | Setting | Method | RACE | Eff.c. | C.acc. |
| --- | --- | --- | --- | --- | --- |
| Backbone | DeepSeek-V4-Pro | StackPlanner | 49.83 | 38.58 | 59.82 |
| ScaffoldAgent | 51.61 | 54.32 | 69.21 |
| GPT-5.4-mini | StackPlanner | 50.66 | 42.84 | 64.58 |
| ScaffoldAgent | 51.35 | 57.60 | 72.43 |
| GPT-5.4 (20-query pilot) | StackPlanner | 52.18 | 61.63 | 76.90 |
| ScaffoldAgent | 53.82 | 84.27 | 82.35 |
| Retrieval | Original Web API | StackPlanner | 41.55 | 9.63 | 26.50 |
| ScaffoldAgent | 44.70 | 30.42 | 54.32 |
| Bing Search API | StackPlanner | 43.84 | 17.62 | 32.14 |
| ScaffoldAgent | 46.12 | 40.85 | 63.37 |
| Wikipedia Retrieval | StackPlanner | 40.35 | 16.70 | 29.85 |
| ScaffoldAgent | 42.61 | 36.86 | 58.21 |

Table 10: Generalization across stronger backbone models and search
backends. DeepSeek-V4-Pro and GPT-5.4-mini use the full evaluation set;
GPT-5.4 uses a shared 20-query pilot subset. Retrieval-backend results
use Qwen3-32B with all non-retrieval configurations fixed.

ScaffoldAgentconsistently outperforms StackPlanner under every tested backbone and retrieval backend. Bing Search produces the strongest results among the retrieval systems, while Wikipedia’s narrower coverage lowers RACE but still preserves substantial gains in effective citation coverage and citation accuracy. The consistent method-level advantage indicates that ScaffoldAgentis not tied to a particular generator or search API.

#### ❺Utility-Weight Sensitivity.

Tables [11](https://arxiv.org/html/2606.20122v2#A5.T11 "Table 11 ‣ ❺Utility-Weight Sensitivity. ‣ Appendix E Additional Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") and [12](https://arxiv.org/html/2606.20122v2#A5.T12 "Table 12 ‣ ❺Utility-Weight Sensitivity. ‣ Appendix E Additional Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") vary the top-level utility weights and the sub-weights of $U_{\mathrm{gen}}$ on Qwen3-32B, with all other settings fixed. Top-level perturbations change RACE by at most $1.10$ points; emphasizing retrieval improves citation metrics, whereas emphasizing generation gives the best RACE. Within $U_{\mathrm{gen}}$, increasing support raises C.acc. from 54.32 to 62.92 but reduces RACE and Eff.c., exposing a precision–coverage
trade-off. The default is therefore a balanced operating point rather
than a narrowly tuned optimum.

| Bias | Weights | RACE | Eff.c. | C.acc. |
| --- | --- | --- | --- | --- |
| Balanced | $(1/3,1/3,1/3)$ | 44.70 | 30.42 | 54.32 |
| Retrieval | $(.50,.25,.25)$ | 43.81 | 32.54 | 58.07 |
| Structure | $(.25,.50,.25)$ | 44.03 | 27.86 | 52.41 |
| Generation | $(.25,.25,.50)$ | 44.91 | 30.68 | 56.36 |

Table 11: Sensitivity to top-level utility weights
$(\lambda_{\mathrm{ret}},\lambda_{\mathrm{str}},\lambda_{\mathrm{gen}})$
on Qwen3-32B. Bold marks the best score in each column.



| $U_{\mathrm{gen}}$ Weights | RACE | Eff.c. | C.acc. |
| --- | --- | --- | --- |
| $(0.40,0.40,0.20)$ | 44.70 | 30.42 | 54.32 |
| $(0.50,0.25,0.25)$ | 44.66 | 30.18 | 55.28 |
| $(0.70,0.15,0.15)$ | 43.62 | 27.85 | 60.74 |
| $(0.90,0.05,0.05)$ | 41.31 | 23.46 | 62.92 |

Table 12: Sensitivity to $U_{\mathrm{gen}}$ weights (support, coverage,
and redundancy) on Qwen3-32B. Bold marks the best score in each column.

#### ❻Repeated-Evaluation Stability.

To assess robustness to stochasticity in LLM-based evaluation, we apply the same RACE evaluator three times to the same fixed Qwen3-32B-generated reports, without changing the evaluator configuration. Table [13](https://arxiv.org/html/2606.20122v2#A5.T13 "Table 13 ‣ ❻Repeated-Evaluation Stability. ‣ Appendix E Additional Experiments ‣ ScaffoldAgent: Utility-Guided Dynamic Outline Optimization for Open-Ended Deep Research") reports the mean and within-report
standard deviation across runs. Across three repeated evaluations, ScaffoldAgentretains higher mean scores in Overall, Comprehensiveness, Insight, and Instruction Following, indicating that the main performance trend is stable under repeated judging.

| Method | Overall | Comp. | Insight | Inst. | Read. |
| --- | --- | --- | --- | --- | --- |
| StackPlanner | $41.15{\pm}1.74$ | $39.85{\pm}2.43$ | $39.23{\pm}2.48$ | $44.11{\pm}2.56$ | $44.29{\pm}1.51$ |
| ScaffoldAgent | $44.79{\pm}1.16$ | $43.55{\pm}1.40$ | $45.35{\pm}1.49$ | $46.53{\pm}1.34$ | $42.83{\pm}1.50$ |

Table 13: Stability across three repeated RACE evaluations of the same
fixed Qwen3-32B-generated reports.

## Appendix F Computational Resources and Software Environment

Experiments were conducted using API-based inference. The Qwen-series backbone was deployed on a single-machine multi-GPU server equipped with 2 NVIDIA A800 GPUs with 80GB memory each, dual Intel Xeon Platinum 8358 CPUs with 64 physical cores and 128 threads in total, and 1024GB of DDR4 memory. The server ran Ubuntu 22.04.5 LTS with Docker, and the inference service was built with vLLM 0.13.0 under FP16 precision. The software environment used Python 3.13.12 and HuggingFace Transformers 4.57.3. On the client side, our agent framework was implemented with Python 3.11, LiteLLM 1.63.11, OpenAI 2.8.1, MCP 1.6.0, LangChain 0.3.25, and LangGraph 0.4.10 for API calls, tool interaction, and agent orchestration.

## Appendix G The Use of Large Language Models

In this work, Large Language Models (LLMs) were used for language polishing, figure design assistance, and coding support. Specifically, LLMs were used to refine the clarity, grammar, and readability of the manuscript, improve stylistic quality, and suggest alternative phrasings to reduce redundant or repetitive expressions. LLMs were also used to provide inspiration for figure design, visualization layouts, and graphical presentation, with final figures created and curated by the authors. In addition, LLMs assisted with code development by suggesting code snippets and troubleshooting strategies. All content generated by LLMs was carefully reviewed, verified, and revised by the authors before inclusion. The research design, methodology, critical analyses, and all final decisions were independently conducted by the authors. LLMs were not involved in generating the core research ideas, scientific contributions, or conclusions of this work.

## Appendix H Prompt

In this section, we provide a detailed introduction to the prompts used in
the ScaffoldAgentframework.

Initial Outline Generation Prompt

You are a research assistant. Your task is to generate an initial research outline scaffold for iterative refinement, rather than a complete final outline.
User Query:
{query}
Initial Evidence:
{initial_documents}
User Constraints:
{user_constraints}
Before generating the outline, internally identify the required analysis dimensions, target entities, comparison requirements, and expected output type in the user query. The outline must cover all explicit requirements in the query and avoid irrelevant background sections.
Generate a minimal usable outline scaffold. Prefer 3–5 top-level sections. Add second-level sections only when necessary. Do not over-expand the outline at initialization time.
Response Format:
Return only a JSON object in the same language as the user query:
{"title": "root title",
"children": [{"title": "section title", "children": []}]
}

Outline Operation Decision Prompt

You are the Outline Agent in ScaffoldAgent. At each optimization step, your task is to decide how the evolving outline tree should be updated by selecting the appropriate structural operation for the chosen outline node.
User Query:
{user_query}
User Constraints:
{user_constraints}
Current Outline Tree:
{outline_tree}
Selected Target Node:
{selected_target_node}
Node Utility Statistics:
{node_utility_statistics}
If selected_target_node is provided, keep it as the target node and choose only the operation. If it is not provided, select a target node by considering historical utility feedback, visit counts, evidence support, user constraints, and whether the node remains under-developed or unstable. Then choose exactly one operation from:
Expansion, Contraction, Revision.
Use Expansion when the selected node is too broad or lacks sufficient topical granularity for focused retrieval and writing. Use Contraction when sibling nodes are redundant, semantically overlapping, or overly fragmented. Use Revision when the selected node is weakly supported, outdated, or misaligned with its accumulated evidence, while the tree structure should remain unchanged.
Response Format:
Return only one JSON object:
{"target_node": "selected or newly chosen node id/title",
"operation": "Expansion | Contraction | Revision",
"reasoning": "brief reason grounded in utility statistics and diagnostics",
}

Expansion Prompt

You are the Expansion operator in ScaffoldAgent. New evidence has been retrieved for a selected outline node. Your task is to locally expand this target node into a small set of evidence-supported child nodes.
Original User Query:
{query}
User Constraints:
{user_constraints}
Current Outline Tree:
{current_outline}
Target Node:
{target_node}
Retrieved Evidence:
{retrieved_documents}
Perform an independent local optimization for the target node. Expand only the target node into a small set of parallel child nodes, typically 2–4. Each new child node should represent a distinct subtopic, be specific enough for focused retrieval and writing, and be directly supported by the retrieved evidence. Do not modify unrelated nodes, parent nodes, or sibling nodes. The refined subtree must remain aligned with the original user query and user constraints.
Response Format:
Return only the JSON subtree for the target node, in the same language as the user query:
{"title": "target node title",
"children": [
{"title": "expanded child title", "children": []}
]
}

Contraction Prompt

You are the Contraction operator in ScaffoldAgent. Your task is to locally consolidate sibling nodes under a selected parent node when they are semantically overlapping, overly fragmented, redundant, or supported by similar evidence.
Original User Query:
{query}
User Constraints:
{user_constraints}
Current Outline Tree:
{current_outline}
Target Parent Node:
{parent_node}
Sibling Nodes to Compress:
{child_nodes}
Existing Evidence Summaries:
{evidence_summaries}
Perform an independent local contraction under the target parent. Preserve the parent node title, the parent node’s responsibility, and the global outline direction. Only modify the children of the target parent; do not change unrelated nodes, ancestors, or sibling groups outside this parent. Merge overlapping, redundant, or overly fragmented children into representative child nodes. The contracted children must jointly preserve the key information of the original children, remain grounded in the existing evidence, and stay aligned with the original user query and user constraints.
The number of children after contraction should be smaller than the original number whenever consolidation is justified, while avoiding over-compression. As an implementation guideline, 3 children are typically contracted into 2; 4 children into 2 or 3; and 5 or more children into approximately half of the original number. Keep at least two children whenever possible.
Response Format:
Return only the JSON subtree for the target parent, in the same language as the user query:
{"title": "parent node title",
"children": [
{"title": "contracted child title", "children": []}
]
}

Revision Prompt

You are the Revision operator in ScaffoldAgent. Your task is to locally revise the intent or titles of a selected node’s local child nodes so that they are better aligned with the available evidence, diagnostics, and user constraints. This task is not Expansion or Contraction. The outline structure must remain unchanged.
Original User Query:
{query}
User Constraints:
{user_constraints}
Current Outline Tree:
{current_outline}
Selected Node:
{selected_node}
Local Child Nodes:
{child_nodes}
Evidence and Diagnostics:
{evidence_and_diagnostics}
Revise the selected node’s local child titles to make them more specific, informative, and better grounded in the available evidence. Do not add child nodes. Do not remove child nodes. Do not change the hierarchy. Do not change the selected node title. Revise at least one local child title when evidence misalignment, weak support, or outdated wording is identified. The revised child titles must preserve the original responsibility of the selected node and remain aligned with the original user query and user constraints.
Response Format:
Return only the JSON subtree for the selected node, in the same language as the user query:
{"title": "selected node title",
"children": [
{"title": "updated child title", "children": []}
]
}
