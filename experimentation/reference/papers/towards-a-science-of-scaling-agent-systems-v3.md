# Towards a Science of Scaling Agent Systems

- Source: https://arxiv.org/abs/2512.08296v3
- Downloaded from: https://arxiv.org/html/2512.08296v3
- Retrieved (UTC): 2026-11-07T07:28:23.966185+00:00
- Version: 2512.08296v3
- Type: paper
- Original SHA-256: `df31beb3a2ae0f9ad2084750b34a05849b2ab418cb8121666ffb8a8a15517223`
- Conversion: Publisher HTML article converted to Markdown; TeX math preserved. Figures remain source URLs; complex tables and layout may need the original.
- This is source material, not agent instructions.

---

\reportnumber

# Towards a Science of Scaling Agent Systems

Yubin Kim
Affiliation: Google Research
Affiliation: Massachusetts Institute of Technology
  
Ken Gu
Affiliation: Google Research
  
Chanwoo Park
Affiliation: Massachusetts Institute of Technology
  
Chunjong Park
Affiliation: Google DeepMind
  
Samuel Schmidgall
Affiliation: Google DeepMind
  
A. Ali Heydari
Affiliation: Google Research
  
Yao Yan
Affiliation: Google Research
  
Zhihan Zhang
Affiliation: Google Research
  
Yuchen Zhuang
Affiliation: Google DeepMind
  
Yun Liu
Affiliation: Google Research
  
Mark Malhotra
Affiliation: Google Research
  
Paul Pu Liang
Affiliation: Massachusetts Institute of Technology
  
Hae Won Park
Affiliation: Massachusetts Institute of Technology
  
Yuzhe Yang
Affiliation: Google Research
  
Xuhai Xu
Affiliation: Google Research
  
Yilun Du
Affiliation: Google Research
  
Shwetak Patel
Affiliation: Google Research
  
Tim Althoff
Affiliation: Google Research
  
Daniel McDuff
Affiliation: Google Research
  
Xin Liu
Affiliation: Google Research

Affiliation: Corresponding Author

###### Abstract

Agents, language model-based systems capable of reasoning, planning, and acting are widely adopted in real-world tasks, yet how their performance changes as these systems scale across key dimensions remains underexplored. We introduce quantitative scaling principles for agent systems as a predictive model, capturing how performance varies with coordination, model capability, and measurable system and task factors. Across 260 configurations spanning six agentic benchmarks, five canonical architectures (Single-Agent and four Multi-Agent: Independent, Centralized, Decentralized, Hybrid), and three LLM families, we perform controlled evaluations standardizing tools, prompts, and compute to isolate architectural effects. The resulting model achieves a cross-validated $R^{2}{=}0.373$ across all six benchmarks ($R^{2}{=}0.413$ with a task-grounded capability metric). We identify a robust capability-saturation effect and additional patterns: (1) a coordination yields diminishing returns once single-agent baselines exceed certain performance; (2) tool-heavy tasks appear to incur multi-agent overhead; and (3) architectures without centralized verification tend to propagate errors more than those with centralized coordination. Relative performance change compared to single-agent baseline ranges from ${+}80.8\%$ on decomposable financial reasoning to ${-}70.0\%$ on sequential planning, demonstrating that architecture-task alignment determines collaborative success. The framework identifies the best-performing architecture for 87% of held-out configurations and shows consistent relative architecture preferences on unseen frontier models. Agent effectiveness depends on alignment between coordination and task structure, and that mismatched coordination degrades the performance.

![Refer to caption](https://arxiv.org/html/2512.08296v3/agent-scaling_main_v7.png)


Figure 1: Agent Scaling across model intelligence and system topologies.
Average performance (%) across the six agentic benchmarks improves consistently with increasing model *Intelligence Index* (see Appendix [A](https://arxiv.org/html/2512.08296v3#A1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems")) across three LLM families (OpenAI, Google, and Anthropic) under five agent architectures. Single Agent System (SAS) serves as reference trajectories, while Multi Agent System (MAS) variants (Centralized, Decentralized, Independent, and Hybrid) reveal distinct scaling behaviors (see Table [2](https://arxiv.org/html/2512.08296v3#S3.T2 "Table 2 ‣ Benchmark Design Principles. ‣ 3.2 Agentic Tasks and Benchmarks ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems") for architecture comparisons).
All percentage deltas annotated in the figure indicate relative performance change of the best-performing MAS variant compared to the SAS baseline at the same Intelligence Index.

## 1 Introduction

Agents [[1](https://arxiv.org/html/2512.08296v3#bib.bib22)], language model-driven systems that operate through iterative cycles of reasoning, planning, and acting, adapting their behavior based on environmental or tool-generated feedback, have achieved strong performance in diverse applications, from code generation [[2](https://arxiv.org/html/2512.08296v3#bib.bib50), [3](https://arxiv.org/html/2512.08296v3#bib.bib52)], web browsing [[4](https://arxiv.org/html/2512.08296v3#bib.bib20), [5](https://arxiv.org/html/2512.08296v3#bib.bib48)], medical decision-making [[6](https://arxiv.org/html/2512.08296v3#bib.bib23), [7](https://arxiv.org/html/2512.08296v3#bib.bib54), [8](https://arxiv.org/html/2512.08296v3#bib.bib53)], finance [[9](https://arxiv.org/html/2512.08296v3#bib.bib49)], sustainability [[10](https://arxiv.org/html/2512.08296v3#bib.bib4)], to scientific discovery [[11](https://arxiv.org/html/2512.08296v3#bib.bib27), [12](https://arxiv.org/html/2512.08296v3#bib.bib15)]. As tasks become more complex and require long-horizon environmental interaction, multi-agent systems (MAS) have gained attention as a way to support task decomposition, parallel exploration, and verification. At the same time, concurrent works question whether multi-agent coordination outperforms single-agent systems (SAS), leaving the conditions under which MAS provides genuine benefits remain underexplored [[13](https://arxiv.org/html/2512.08296v3#bib.bib16), [14](https://arxiv.org/html/2512.08296v3#bib.bib13), [15](https://arxiv.org/html/2512.08296v3#bib.bib28), [16](https://arxiv.org/html/2512.08296v3#bib.bib43), [17](https://arxiv.org/html/2512.08296v3#bib.bib1), [18](https://arxiv.org/html/2512.08296v3#bib.bib2)]. Despite rapid adoption, there remains no principled quantitative framework for predicting when adding agents improves performance and when it instead introduces coordination costs that degrade it. This gap leaves practitioners relying on heuristics, hindering both the emergence of a science of agent systems and, critically for real-world deployment, the ability to determine when multi-agent coordination provides genuine value over simpler single-agent alternatives.

To determine when multi-agent coordination provides benefit, we first establish which task categories require agentic capabilities.
A necessary prerequisite is distinguishing between agentic and non-agentic evaluation paradigms. Expanding from the Agentic Benchmark Checklist (ABC) introduced in [[19](https://arxiv.org/html/2512.08296v3#bib.bib47)], we characterize agentic tasks as those requiring: (i) sustained multi-step interactions with an external environment, (ii) iterative information gathering under partial observability, and (iii) adaptive strategy refinement based on environmental feedback.

These characteristics differentiate tasks like web browsing [[4](https://arxiv.org/html/2512.08296v3#bib.bib20)], financial trading [[9](https://arxiv.org/html/2512.08296v3#bib.bib49)], software engineering [[20](https://arxiv.org/html/2512.08296v3#bib.bib30)], and interactive planning [[21](https://arxiv.org/html/2512.08296v3#bib.bib9)] from traditional static benchmarks, tasks solvable through single-shot reasoning without environmental feedback, which lack external environments, are fully observed, or require identical solution strategies [[22](https://arxiv.org/html/2512.08296v3#bib.bib36), [23](https://arxiv.org/html/2512.08296v3#bib.bib41)]. This distinction matters because, while recent agentic benchmarks have emerged (e.g., SWE-Bench [[20](https://arxiv.org/html/2512.08296v3#bib.bib30)], $\tau^{2}$-Bench [[24](https://arxiv.org/html/2512.08296v3#bib.bib67)], Terminal-Bench [[25](https://arxiv.org/html/2512.08296v3#bib.bib31)]), multi-agent system evaluations have been conducted predominantly on non-agentic tasks, potentially providing misleading guidance about when collaboration provides value. This distinction is practically consequential: while LLMs achieve high accuracy on isolated code generation tasks like HumanEval [[26](https://arxiv.org/html/2512.08296v3#bib.bib66)], real-world deployment requires agentic capabilities such as iterative debugging, repository navigation, and adaptive strategy refinement as exemplified by interactive coding assistants (e.g., Cursor, Copilot Workspace). Multi-agent systems that show monotonic improvement with team size on static benchmarks (reaching 89% on HumanEval with five agents) exhibit fundamentally different scaling behavior when evaluated on tasks requiring sustained environmental interaction, where coordination overhead and error propagation dynamics dominate.

At its core, this distinction reflects a trade-off between context integration and diversity [[27](https://arxiv.org/html/2512.08296v3#bib.bib45), [28](https://arxiv.org/html/2512.08296v3#bib.bib14)]. Single-agent systems maximize context integration by maintaining a unified memory stream in which all reasoning steps share full access to prior history, enabling effectively constant-time access to global context. In contrast, multi-agent systems impose intrinsic information fragmentation [[13](https://arxiv.org/html/2512.08296v3#bib.bib16)]: while parallel agents enable diverse exploration, they incur an unavoidable coordination tax in which the global context must be compressed into inter-agent messages. This lossy communication increases synchronization overhead and cognitive load [[29](https://arxiv.org/html/2512.08296v3#bib.bib12)], fundamentally altering the scaling behavior of collaboration.

The underlying dynamics explain this discrepancy: on agentic tasks, coordination overhead scales with interaction depth, agents operate on progressively divergent world states, and errors cascade through execution chains rather than being corrected through voting. Recent work has identified cases where single strong models match or exceed multi-agent systems [[16](https://arxiv.org/html/2512.08296v3#bib.bib43)], yet the evaluation literature provides limited guidance on what factors determine collaborative success, whether semantic diversity predicts team performance, how architectural choices shape coordination costs, or whether agents can detect and correct failures in extended interactions.

The problem is further compounded by rapid progress in frontier model capabilities. As base LLMs gain extended context windows, sophisticated tool use, and improved self-reflection, the unique value proposition of multi-agent collaboration becomes unclear. The answer likely depends on task characteristics and architectural choices that remain to be systematically quantified.

Two key challenges hinder progress toward principled multi-agent design. First, existing MAS evaluations compare architectures using different prompts, tools, or computational budgets, conflating architectural effects with implementation choices and precluding clean causal attribution. Second, evaluations focus exclusively on final accuracy metrics without examining process dynamics such as coordination overhead, error propagation, and information flow that determine whether collaboration succeeds or fails. We know from human team performance [[30](https://arxiv.org/html/2512.08296v3#bib.bib55), [31](https://arxiv.org/html/2512.08296v3#bib.bib56)] that team effectiveness depends on composition, coordination mechanisms, and member differentiation. Yet we lack comparable empirical understanding of how these principles translate to artificial agents, leaving practitioners without quantitative guidance for architecture selection.

To address these challenges, we present a controlled evaluation establishing the principles for agent coordination. Our experimental design isolates architectural effects by controlling for implementation confounds which maintains identical task prompts, tools, and computational budgets across all configurations, while systematically varying only coordination structure and model capability. We evaluate five canonical architectures: Single Agent System (SAS) and four Multi-Agent variants (Independent, Centralized, Decentralized, Hybrid) instantiated across three major LLM families (OpenAI, Google, Anthropic) sampling models at varying capability tiers as quantified by an aggregate Intelligence Index (see Appendix [A](https://arxiv.org/html/2512.08296v3#A1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems")), on six agentic benchmarks: (1) web browsing (BrowseComp-Plus [[32](https://arxiv.org/html/2512.08296v3#bib.bib7)]), (2) financial analysis (Finance-Agent [[33](https://arxiv.org/html/2512.08296v3#bib.bib8)]), (3) game planning (PlanCraft [[21](https://arxiv.org/html/2512.08296v3#bib.bib9)]), (4) realistic workplace tasks (Workbench [[34](https://arxiv.org/html/2512.08296v3#bib.bib5)]), (5) software engineering (SWE-bench Verified [[20](https://arxiv.org/html/2512.08296v3#bib.bib30)]), and (6) terminal tasks (Terminal-Bench [[25](https://arxiv.org/html/2512.08296v3#bib.bib31)]). Across $N{=}260$ controlled configurations with matched compute, we derive a scaling principle across tested domains quantifying how performance emerges from empirically measured coordination properties.

In contrast to prior claims that “more agents is all you need”, our evaluation reveals that the effectiveness of multi-agent systems is governed by quantifiable trade-offs between architectural properties and task characteristics. We establish a predictive framework using a mixed-effects regression model with empirical coordination metrics: efficiency (success/overhead ratio), error amplification factors, message density and redundancy as predictors, achieving cross-validated $R^{2}{=}0.373$ across all six benchmarks ($R^{2}{=}0.413$ with a task-grounded capability metric), without dataset-specific parameters. Critically, this framework generalizes beyond the fitted configurations in a restricted sense, where it predicts the best-performing architecture for 87% of held-out task configurations, indicating relative architecture selection is more stable than absolute cross-domain performance prediction.

Our analysis identifies three scaling patterns. First, a tool-coordination trade-off ($\beta{=}{-}0.096$, $p{=}0.002$): tool-heavy tasks (e.g., 16-tool business workflows) suffer from multi-agent coordination overhead, with efficiency penalties compounding as environmental complexity increases. Second, a capability ceiling ($\beta{=}{-}0.236$, $p{=}0.004$): tasks where single-agent performance already exceeds 45% accuracy experience negative returns from additional agents, as coordination costs exceed diminishing improvement potential.
Third, we observe architecture-dependent error amplification. Independent systems amplify trace-level errors $17.2\times$ through unchecked error propagation, where individual mistakes cascade to the final output. Centralized coordination, however, contains this to $4.4\times$ by enforcing validation bottlenecks that intercept errors before aggregation. Performance spans ${+}80.8\%$ relative improvement (structured financial reasoning under centralized coordination) to ${-}70.0\%$ degradation (sequential planning under independent coordination), demonstrating that architecture-task alignment, not number of agents, determines collaborative success. Optimal architectures vary systematically: decentralized coordination benefits tasks requiring parallel exploration of high-entropy search spaces (dynamic web navigation: ${+}9.2\%$), while all multi-agent variants universally degrade performance on tasks requiring sequential constraint satisfaction (planning: ${-}39\%$ to ${-}70\%$), where coordination overhead fragments reasoning capacity under fixed computational budgets. We translate these findings into quantitative architecture selection
rules (Section [4.3](https://arxiv.org/html/2512.08296v3#S4.SS3 "4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")) achieving 87% prediction accuracy on held-out configurations. The underlying mechanisms driving these patterns are interpretable: the tool-coordination trade-off arises because multi-agent systems fragment the per-agent token budget, leaving insufficient capacity for complex tool orchestration; the capability
ceiling reflects that coordination overhead becomes a net cost when
baseline performance is already high; and architecture-dependent error amplification stems from the presence or absence of validation bottlenecks that catch errors before propagation. These mechanistic insights enable
practitioners to move from architectural heuristics to principled, measurement-driven deployment decisions.

Our primary contributions are:

- •

  Controlled evaluation of agent systems: We establish a framework for comparing agent architectures, controlling for implementation confounds to isolate the effects of coordination structure. Our framework spans 260 configurations across three LLM families and six diverse benchmarks, enabling controlled attribution of performance differences to architectural choices rather than stochastic variations.
- •

  Intelligence-Coordination alignment: We characterize the non-linear relationship between foundational model capabilities and agentic performance. We demonstrate that while higher capability (Intelligence Index) yields consistent linear returns, these gains are not automatic; they strictly depend on architectural alignment. Without correct coordination structures, foundational improvements are often negated by coordination overhead.
- •

  Quantitative scaling principles and architecture alignment: We derive a regression model ($R^{2}{=}0.373$ across all six benchmarks; $R^{2}{=}0.413$ with a task-grounded capability metric) using empirical coordination metrics, efficiency ($E_{c}$), trace-level error amplification ($A_{e}^{\text{trace}}$), and redundancy ($\rho$) to quantify how performance emerges from the interplay of reasoning capability and task properties. This framework identifies fundamental limits on coordination, specifically a tool-coordination trade-off ($\beta{=}{-}0.096$) where tool-heavy workflows suffer from coordination tax, and safety bounds where centralized verification reduces trace-level error amplification from $17.2\times$ to $4.4\times$. Using these mechanisms, we demonstrate that architecture selection is governed by measurable task features (e.g., decomposability) rather than simple agent scaling, achieving 87% accuracy in predicting optimal architectures on held-out tasks.

## 2 Related Work

#### Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS)

Understanding the difference between single-agent and multi-agent systems remains central to characterizing architectural effects. Following [Tran et al. [13]](https://arxiv.org/html/2512.08296v3#bib.bib16) and [Guo et al. [14]](https://arxiv.org/html/2512.08296v3#bib.bib13), we define a Single-Agent System as one that features a solitary reasoning locus: all perception, planning, and action occur within a single sequential loop controlled by one LLM instance, even when employing tool use [[35](https://arxiv.org/html/2512.08296v3#bib.bib39)], self-reflection [[36](https://arxiv.org/html/2512.08296v3#bib.bib18)], or chain-of-thought (CoT) reasoning [[37](https://arxiv.org/html/2512.08296v3#bib.bib19)]. Critically, self-reflection mechanisms do not constitute multi-agent collaboration, as they operate within a single decision-making locus [[38](https://arxiv.org/html/2512.08296v3#bib.bib40)]. A Multi-Agent System comprises multiple LLM-backed agents communicating through structured message passing, shared memory, or orchestrated protocols [[39](https://arxiv.org/html/2512.08296v3#bib.bib17)]. MAS architectures vary by topology: Independent systems aggregate isolated outputs; Decentralized enable peer-to-peer exchange [[27](https://arxiv.org/html/2512.08296v3#bib.bib45)]; Centralized route through orchestrators [[28](https://arxiv.org/html/2512.08296v3#bib.bib14)]; Hybrid combine hierarchical control with lateral communication [[40](https://arxiv.org/html/2512.08296v3#bib.bib33)]. MAS evaluation has moved beyond early assumptions of uniform superiority [[41](https://arxiv.org/html/2512.08296v3#bib.bib3), [42](https://arxiv.org/html/2512.08296v3#bib.bib44)] towards a more differentiated understanding driven by domain complexity. Recent surveys characterize collaboration mechanisms across coordination protocols [[13](https://arxiv.org/html/2512.08296v3#bib.bib16)] and agent profiling patterns [[14](https://arxiv.org/html/2512.08296v3#bib.bib13)]. However, there exist empirical challenges: [Gao et al. [16]](https://arxiv.org/html/2512.08296v3#bib.bib43) show benefits diminish as base models improve, with frontier models often outperforming teams; [Cemri et al. [15]](https://arxiv.org/html/2512.08296v3#bib.bib28) identify 14 failure modes (Cohen’s Kappa=0.88); [Zhang et al. [43]](https://arxiv.org/html/2512.08296v3#bib.bib32) achieve comparable performance at 6-45% cost through dynamic architecture search; and [Anthropic [44]](https://arxiv.org/html/2512.08296v3#bib.bib34) report agents consume 15$\times$ more tokens. Theoretical foundations from [Sumers et al. [45]](https://arxiv.org/html/2512.08296v3#bib.bib35) propose cognitive architectures contextualizing agents within AI’s broader history. The question of when multi-agent coordination provides value over single strong models with tool use remains empirically open, with [Qian et al. [42]](https://arxiv.org/html/2512.08296v3#bib.bib44)’s proposed scaling laws showing no significant universal pattern [[1](https://arxiv.org/html/2512.08296v3#bib.bib22)], motivating our systematic evaluation.

#### Agentic Tasks and Benchmarks

We define agentic tasks following [Zhu et al. [19]](https://arxiv.org/html/2512.08296v3#bib.bib47) as requiring: (1) sustained multi-step environment interactions, (2) iterative information gathering under partial observability, and (3) adaptive strategy refinement from feedback, differentiating tasks like web browsing [[4](https://arxiv.org/html/2512.08296v3#bib.bib20), [46](https://arxiv.org/html/2512.08296v3#bib.bib42)], financial trading [[33](https://arxiv.org/html/2512.08296v3#bib.bib8)], software engineering [[47](https://arxiv.org/html/2512.08296v3#bib.bib51)], and planning [[21](https://arxiv.org/html/2512.08296v3#bib.bib9)] from static benchmarks. Non-agentic tasks evaluate single-shot inference without environmental interaction: GSM8K [[48](https://arxiv.org/html/2512.08296v3#bib.bib65)] (direct chain-of-thought math), MMLU [[49](https://arxiv.org/html/2512.08296v3#bib.bib64)] (parametric knowledge), HumanEval [[26](https://arxiv.org/html/2512.08296v3#bib.bib66)] (specification-complete coding), and SQuAD [[50](https://arxiv.org/html/2512.08296v3#bib.bib21)] (single-pass comprehension). On non-agentic benchmarks, multi-agent systems show monotonic improvement through ensemble effects (89% on HumanEval with five agents), as voting corrects errors without sequential compounding [[23](https://arxiv.org/html/2512.08296v3#bib.bib41)]. This distinction matters: in agentic settings, coordination overhead scales with interaction depth, agents operate on divergent world states (34% overlap after 10 interactions), and errors cascade rather than cancel [[23](https://arxiv.org/html/2512.08296v3#bib.bib41)]. [Zhu et al. [19]](https://arxiv.org/html/2512.08296v3#bib.bib47) introduce the Agentic Benchmark Checklist addressing flaws causing 100% relative misestimation. Evolution spans [Liu et al. [22]](https://arxiv.org/html/2512.08296v3#bib.bib36)’s 8-environment evaluation (4k-13k responses) to specialized frameworks: [Jimenez et al. [47]](https://arxiv.org/html/2512.08296v3#bib.bib51) (GitHub resolution), [Zhou et al. [46]](https://arxiv.org/html/2512.08296v3#bib.bib42) (812 web tasks), [Xu et al. [51]](https://arxiv.org/html/2512.08296v3#bib.bib37) (30% autonomous completion), and [Paglieri et al. [52]](https://arxiv.org/html/2512.08296v3#bib.bib38) (vision-based RL). [Yao et al. [35]](https://arxiv.org/html/2512.08296v3#bib.bib39) formalizes reasoning-acting synergy; [Weng [38]](https://arxiv.org/html/2512.08296v3#bib.bib40) characterizes agents requiring planning, memory, and tools; [Kapoor et al. [23]](https://arxiv.org/html/2512.08296v3#bib.bib41) reveals narrow accuracy focus without cost metrics yields needlessly complex agents. We note that established agentic benchmarks such as SWE-bench [[20](https://arxiv.org/html/2512.08296v3#bib.bib30)], WebArena, and Tau-bench already embody these evaluation properties, as discussed in recent survey work [[53](https://arxiv.org/html/2512.08296v3#bib.bib29)]. Our contribution is not the formalization of these properties per se, but rather their systematic application as experimental controls across five coordination architectures and nine models from three LLM families, enabling the first quantitative characterization of how coordination benefit scales with model capability. Tasks showing MAS advantages in single-shot settings often exhibit opposite patterns under genuine interaction, indicating architectural benefits are task-contingent, motivating our isolation of coordination effects across diverse agentic domains.

#### Scaling Laws and Coordination Mechanisms

Understanding performance scaling in multi-agent systems requires distinguishing collaborative scaling from neural scaling laws. While neural scaling follows power laws requiring million-fold parameter increases for significant trends [[54](https://arxiv.org/html/2512.08296v3#bib.bib25)], collaborative scaling exhibits logistic growth patterns emerging at substantially smaller scales [[42](https://arxiv.org/html/2512.08296v3#bib.bib44)]. [Chen et al. [55]](https://arxiv.org/html/2512.08296v3#bib.bib24) explore whether increased LLM calls alone drive performance, finding compound inference systems follow distinct scaling behaviors from single-model training. However, [Wang et al. [1]](https://arxiv.org/html/2512.08296v3#bib.bib22) note collaborative scaling shows no significant universal pattern, suggesting domain-specific rather than general laws. Coordination mechanisms critically determine whether collaboration amplifies or degrades performance: [Hong et al. [28]](https://arxiv.org/html/2512.08296v3#bib.bib14) introduce meta-programming workflows mitigating hallucination cascades; [Chen et al. [56]](https://arxiv.org/html/2512.08296v3#bib.bib46) demonstrate emergent behaviors through structured interactions; [Wu et al. [57]](https://arxiv.org/html/2512.08296v3#bib.bib26) provide general multi-agent frameworks. Recent work reveals architecture-task alignment matters more than team size: [Zhang et al. [43]](https://arxiv.org/html/2512.08296v3#bib.bib32) achieve superior performance at 6-45% cost through query-dependent configurations; [Dang et al. [40]](https://arxiv.org/html/2512.08296v3#bib.bib33) show puppeteer orchestration improvements stem from compact cyclic structures; [Du et al. [27]](https://arxiv.org/html/2512.08296v3#bib.bib45) demonstrate peer-to-peer debate effectiveness depends on task decomposability, with [Smit et al. [58]](https://arxiv.org/html/2512.08296v3#bib.bib6) further showing that multi-agent debate does not reliably outperform single-agent strategies such as self-consistency, suggesting benefits are highly task- and hyperparameter-sensitive. These findings collectively indicate coordination benefits arise from matching communication topology to task structure not from scaling the number of agents, establishing the foundation for principled architectural design rather than heuristic “more agents is better” approaches.

## 3 Agent Systems and Tasks

### 3.1 System Definition

Building on multi-agent system formalism [[19](https://arxiv.org/html/2512.08296v3#bib.bib47), [14](https://arxiv.org/html/2512.08296v3#bib.bib13)], an agent system $\mathcal{S}=(A,E,C,\Omega)$ consists of a set of agents $A=\{a_{1},\ldots,a_{n}\}$ (where $n\geq 1$), a shared environment $E$, a communication topology $C$, and an orchestration policy $\Omega$. When $|A|=1$, we refer to this as a Single-Agent System (SAS); when $|A|>1$, a Multi-Agent System (MAS). Each agent $a_{i}$ perceives, reasons, and acts within the shared environment via iterative feedback.

Formally, each agent $a_{i}$ is defined as a tuple $S_{i}=(\Phi_{i},\mathcal{A}_{i},M_{i},\pi_{i})$, where:

- •

  $\Phi_{i}$ is the reasoning policy (typically an LLM)
- •

  $\mathcal{A}_{i}=\{\text{ToolCall}(t,\theta):t\in\mathcal{T},\theta\in\Theta_{t}\}$ is the action space consisting of tool usage, where $\mathcal{T}$ is the set of available tools (e.g., web search, code execution) and $\Theta_{t}$ represents valid parameter configurations for tool $t$
- •

  $M_{i}$ is the internal memory
- •

  $\pi_{i}:\mathcal{H}\rightarrow\mathcal{A}_{i}$ is the decision function mapping observation histories to actions

The observation history space $\mathcal{H}$ contains sequences of action-observation pairs. The decision function $\pi_{i}$ is instantiated by the reasoning policy $\Phi_{i}$ (the LLM): given a history $h_{i,t}$, the LLM generates a reasoning trace and selects the next action.

For instance, a history $h_{i,t}=[(\text{``search(query=`pandas')''},\text{``Found 5 files''}),...]$ is processed by $\Phi_{i}$ to produce the next tool call $\alpha_{i,t+1}$.

At timestep $t$, agent $a_{i}$ selects an action $\alpha_{i,t}\in\mathcal{A}_{i}$ according to:

|  |  |  |
| --- | --- | --- |
|  | $$\alpha_{i,t}=\pi_{i}(h_{i,t}),\quad o_{i,t}=E(\alpha_{i,t}),\quad h_{i,t+1}=f_{i}(h_{i,t},\alpha_{i,t},o_{i,t}),$$ |  |

where $E$ denotes the environment and $h_{i,0}=\{s_{0}\}$ contains the initial task specification. The history update function $f_{i}:\mathcal{H}\times\mathcal{A}_{i}\times\mathcal{O}\rightarrow\mathcal{H}$ appends the new action-observation pair to the agent’s history: $h_{i,t+1}=f_{i}(h_{i,t},\alpha_{i,t},o_{i,t})=h_{i,t}\oplus(\alpha_{i,t},o_{i,t})$, subject to context window truncation when $|h_{i,t+1}|>\text{MAX\_TOKENS}$. This update mechanism applies uniformly to both SAS and MAS configurations. Communication between agents occurs through explicit message passing in the orchestration layer.

#### Single-Agent System (SAS).

A *Single-Agent System* contains one reasoning locus ($|A|=1$ where $A$ is the agent set). All perception, reasoning, and action occur within a single sequential loop, producing computational complexity $O(k)$ where $k$ is the number of reasoning iterations. SAS has zero communication overhead and minimal memory $O(k)$, but limited capacity for decomposition or verification.

#### Multi-Agent System (MAS).

A *Multi-Agent System* is an agent system $\mathcal{S}$ with $|A|>1$, where agents interact through communication topology $C$ and orchestration policy $\Omega$.

Communication topology $C$ defines information flow patterns between agents:

- •

  Independent: $C=\{(a_{i},a_{\text{agg}}):\forall i\}$ (agent-to-aggregator only, no peer communication)
- •

  Centralized: $C=\{(a_{\text{orch}},a_{i}):\forall i\}$ (orchestrator-to-agents only)
- •

  Decentralized: $C=\{(a_{i},a_{j}):\forall i,j,i\neq j\}$ (all-to-all topology)
- •

  Hybrid: $C=C_{\text{centralized}}\cup C_{\text{peer}}$ (orchestrator plus limited peer-to-peer)

The orchestrator $\Omega$ (when present) determines: (i) how sub-agent outputs are aggregated (e.g., majority voting, weighted synthesis), (ii) whether the orchestrator can override sub-agent decisions, (iii) whether memory persists across coordination rounds, and (iv) termination conditions based on consensus or quality thresholds.

MAS architectures vary by how information and control propagate among agents, creating distinct trade-offs between computation, coordination, and parallelization. Table [2](https://arxiv.org/html/2512.08296v3#S3.T2 "Table 2 ‣ Benchmark Design Principles. ‣ 3.2 Agentic Tasks and Benchmarks ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems") formalizes these trade-offs using asymptotic notations over LLM calls, sequential depth, communication overhead, and memory complexity. We selected these five architectures to form a structural ablation of coordination mechanisms:

- •

  Independent isolates the effect of parallelism (ensemble) without communication.
- •

  Decentralized introduces peer-to-peer information fusion without hierarchy.
- •

  Centralized introduces hierarchical verification and bottleneck control.
- •

  Hybrid examines the combination of hierarchy and lateral flexibility.

This design allows us to systematically attribute performance gains to specific coordination mechanics rather than generic “multi-agent” effects. Specific configurations include:

- •

  Independent MAS: $A=\{a_{1},\ldots,a_{n}\}$, $\mathcal{C}=\{(a_{i},a_{\text{agg}})\}$, $\Omega=\texttt{synthesis\_only}$. The synthesis_only policy concatenates sub-agent outputs without cross-validation or majority voting; the aggregator performs no analytical comparison of responses, ensuring that any performance differences arise purely from parallel exploration rather than error correction. This achieves maximal parallelization but minimal coordination, suitable for ensemble-style reasoning.
- •

  Centralized MAS: $A=\{a_{\text{orch}},a_{1},\ldots,a_{n}\}$, $C=\{(a_{\text{orch}},a_{i}):\forall i\}$, $\Omega=\text{hierarchical}$. A single orchestrator coordinates $r$ rounds across $n$ sub-agents ($O(rnk)$). Sequential depth equals $r$ while parallelization factor remains $n$. This design stabilizes reasoning but creates a bottleneck at the orchestrator.
- •

  Decentralized MAS: $A=\{a_{1},\ldots,a_{n}\}$, $C=\{(a_{i},a_{j}):\forall i,j,i\neq j\}$, $\Omega=\text{consensus}$. Agents communicate in $d$ sequential debate rounds ($O(dnk)$). Memory complexity is $O(dnk)$ as each agent stores its own debate history. This enables consensus formation through peer-to-peer discussion.
- •

  Hybrid MAS: $A=\{a_{\text{orch}},a_{1},\ldots,a_{n}\}$, $C=\text{star}+\text{peer edges}$, $\Omega=\text{hierarchical}+\text{lateral}$. Combines orchestrated hierarchy with limited peer communication ($O((r+p)\cdot n\cdot k)$ where $p$ is the number of peer rounds). This inherits orchestrator control while enabling lateral exchange between agents.

#### Communication vs. Coordination.

We distinguish *communication* (message passing between agents) from *coordination* (strategic direction of agent activities). In centralized systems, coordination occurs through the orchestrator’s task decomposition and progress monitoring, while communication involves passing findings between orchestrator and workers. In decentralized systems, communication and coordination are intertwined through debate rounds where agents both exchange information and collectively steer problem-solving direction.

Thus, SAS represents the minimal unit of agentic computation ($O(k)$), while MAS configurations explore the scaling frontier of coordination complexity, ranging from fully parallel and communication-free (Independent) to fully coupled with peer consensus (Decentralized). These configurations allow us to test whether performance gains arise from *agent coordination and specialization* or merely from increased compute through ensembling. Our taxonomy covers coordination patterns common in LLM-based agentic systems, focusing specifically on *communication topology*, one of several orthogonal MAS design dimensions including agent specialization [[28](https://arxiv.org/html/2512.08296v3#bib.bib14)], memory architecture, and aggregation strategy. Classical coordination mechanisms such as blackboard systems assume structured message formats rather than natural language, limiting their direct applicability to LLM-based agents [[14](https://arxiv.org/html/2512.08296v3#bib.bib13), [39](https://arxiv.org/html/2512.08296v3#bib.bib17)].

We formally define the task-level error rate as $E=1-P$, where $P$ is the fraction of tasks successfully resolved. The *task-level* error amplification factor $A_{e}^{\text{task}}=E_{\text{MAS}}/E_{\text{SAS}}$ quantifies the relative error rate of a multi-agent system compared to its single-agent baseline; $A_{e}^{\text{task}}>1$ indicates that coordination introduces net errors, while $A_{e}^{\text{task}}<1$ indicates net error suppression. We additionally define a *trace-level* error amplification factor $A_{e}^{\text{trace}}$ that measures how much extra computational work arises from inter-agent coordination failures, estimated from execution-trace token analysis (see Section [4.4](https://arxiv.org/html/2512.08296v3#S4.SS4 "4.4 Coordination Efficiency, Error Dynamics, and Information Transfer ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")). Both metrics consistently show that architectures with verification mechanisms contain errors more effectively than independent coordination, though they differ in absolute magnitude ($A_{e}^{\text{task}}\approx 1.1$–$1.3$ vs. $A_{e}^{\text{trace}}\approx 4$–$17$) because they capture complementary aspects of error dynamics.

### 3.2 Agentic Tasks and Benchmarks

Following and extending the framework of [Zhu et al. [19]](https://arxiv.org/html/2512.08296v3#bib.bib47), we operationalize a task $T$ as agentic when optimal performance *substantially* benefits from adaptive interaction. Formally, if $\tau=\{(a_{t},o_{t})\}_{t=0}^{T}$ represents an interaction trajectory, then:

|  |  |  |
| --- | --- | --- |
|  | $$\frac{\max_{\pi}\mathbb{E}[R(\tau)]-\max_{g}\mathbb{E}[R(g(x))]}{\max_{\pi}\mathbb{E}[R(\tau)]}>\delta,$$ |  |

where $\pi$ represents an interactive policy, $g$ represents any single-forward-pass function, $R$ measures task success, $\delta$ is a task-dependent threshold, and the expectation is over task instances $x$ and stochastic environment dynamics. This definition captures tasks where interaction provides meaningful advantage over the best possible single-shot approach.

The expected return of an optimal policy thus hinges on sequential observation–action feedback, requiring agents to gather information, plan, and revise hypotheses under partial observability. Building on the Agentic Benchmark Checklist [[19](https://arxiv.org/html/2512.08296v3#bib.bib47)], we formalize three necessary properties for agentic benchmarks:

- •

  Sequential Interdependence: Later actions depend on earlier observations; a one-shot policy cannot achieve high reward.
- •

  Partial Observability: Critical state information is hidden and must be acquired through active querying or tool use.
- •

  Adaptive Strategy Formation: The policy must update internal beliefs based on new evidence obtained through interaction.

Benchmarks lacking these conditions (e.g., GSM8K, MMLU) evaluate static reasoning rather than agentic capabilities. (We note that “agentic” is defined relative to current model capabilities: GSM8K could be posed as agentic by providing calculator tools, though current LLMs do not *require* such scaffolding; conversely, tasks that are agentic today, such as SWE-Bench, may become solvable via single-shot inference as models improve. Our evaluation focuses on tasks that *currently* require multi-step interaction for non-trivial performance.)

#### Why Environment Feedback Matters.

Real-world deployments such as coding assistants, financial analysts, and embodied robots operate under uncertainty and non-stationarity.
Tasks solvable by direct prompting measure linguistic knowledge, whereas agentic benchmarks evaluate the process of intelligence: exploration, adaptation, and coordination.
Hence, our benchmarks are chosen such that (i) base LLMs perform poorly in single-shot mode, and (ii) non-trivial performance requires multi-step environment interaction.

#### Benchmark Design Principles.

Extending the framework proposed by [Zhu et al. [19]](https://arxiv.org/html/2512.08296v3#bib.bib47), we introduce additional criteria to isolate *architectural effects*:

- •

  Controlled Tool Interface: identical tool APIs and observation structures for all architectures to eliminate confounds from external feedback quality.
- •

  Controlled for Parametric Knowledge: within each model family, evaluation emphasizes adaptive reasoning over memorized facts. Cross-family comparisons (Section [4](https://arxiv.org/html/2512.08296v3#S4 "4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")) account for inherent knowledge base differences through baseline normalization.
- •

  Action–Observation Loop Length: each benchmark enforces non-trivial trajectory length $L>3$ to ensure sequential reasoning.
- •

  Comparative Normalization: scores are normalized to the best single-agent baseline, measuring coordination gain or loss.

Table 1: Six agentic benchmarks used for evaluation.

Benchmark
Task
Evaluation Design

BrowseComp-Plus (2025)
Web Browsing / Information Retrieval
Multi-website Information Location

Finance-Agent (2025)
Finance
Entry-level Analyst Task Performance

Plancraft (2024)
Agent Planning
Minecraft Environment Planning

WorkBench (2024)
Planning / Tool Selection
Common business activities

SWE-bench Verified (2024)
Software Engineering
GitHub Issue Resolution

Terminal-Bench (2025)
CLI Task Execution
System Admin / Security / ML Tasks




Table 2: Architectural comparison of agent methods with objective complexity metrics. Computational complexity measured in terms of LLM calls, coordination overhead, and parallelization potential.

|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| Characteristic | SAS | MAS  (Independent) | MAS  (Decentralized) | MAS  (Centralized) | MAS  (Hybrid) |
| Interaction Type | [Uncaptioned image] | [Uncaptioned image] | [Uncaptioned image] | [Uncaptioned image] | [Uncaptioned image] |
| LLM Calls | $O(k)$ | $O(nk)+O(1)$ | $O(dnk)+O(1)$ | $O(rnk)+O(r)$ | $O(rnk)+O(r)+O(p)$ |
| Sequential Depth | $k$ | $k$ | $d$ | $r$ | $r$ |
| Comm. Overhead | $0$ | $1$ | $d\cdot n$ | $r\cdot n$ | $r\cdot n+p\cdot m$ |
| Parallelization Factor | $1$ | $n$ | $n$ | $n$ | $n$ |
| Memory Complexity | $O(k)$ | $O(n\cdot k)$ | $O(d\cdot n\cdot k)$ | $O(r\cdot n\cdot k)$ | $O((r+p)\cdot n\cdot k)$ |
| Coordination | Sequential | Parallel + Synthesis | Sequential Debate | Hierarchical | Hierarchical + Peer |
| Consensus | - | Synthesis | Debate | Orchestrator | Orchestrator |

* $k$ = max iterations per agent, $n$ = number of agents, $r$ = orchestrator rounds, $d$ = debate rounds, $p$ = peer communication rounds, $m$ = average peer requests per round. Communication overhead counts inter-agent message exchanges. Independent offers maximal parallelization with minimal coordination. Decentralized uses sequential debate rounds. Hybrid combines orchestrator control with directed peer communication.

## 4 Experiments & Results

To establish quantitative scaling principles for agentic systems, we investigate three research questions:

RQ1. What factors determine agent system’s performance (e.g., model capability, coordination architecture, task properties, their interactions)? We systematically vary each factor across 260 configurations to quantify their individual and joint contributions.

RQ2. Under what conditions does inter-agent coordination improve or degrade agent system’s performance? We examine how task structure (e.g., decomposability, tool complexity, sequential dependencies) moderates the effectiveness of different architectures.

RQ3. Can we derive quantitative scaling principles that predict best agent architecture for a given task from measurable properties? We fit a regression model using empirical coordination metrics to test whether continuous properties outperform categorical architecture labels in explaining performance variance.

![Refer to caption](https://arxiv.org/html/2512.08296v3/boxplots_v4.png)


Figure 2: 
Comparative performance of agent systems across six agentic benchmarks reveals highly task-dependent scaling dynamics. Box plots show distribution of performance (0–100%). Percentage annotations represent relative improvement/degradation compared to SAS baseline: $(\text{mean}_{\text{MAS}}-\text{mean}_{\text{SAS}})/\text{mean}_{\text{SAS}}\times 100\%$. SAS serves as the reference baseline (shown without percentage annotation).
(a) BrowseComp-Plus shows polarized results, with independent agents catastrophically underperforming relative to SAS (-35%) while more structured coordination achieves modest gains. (b) Finance Agent demonstrates the strongest multi-agent benefits, with all MAS architectures substantially outperforming SAS (from +57% to +80.8%). (c) PlanCraft exhibits consistent degradation across all MAS variants (from -70% to -39%). (d) Workbench shows marginal effects (from -11 to +6%). (e) SWE-bench Verified shows slight degradation across all MAS architectures (from -15% to -2%), consistent with high single-agent baselines ($>$45%) for most models. (f) Terminal-Bench shows mixed results: Independent achieves marginal gains (+2%) while Centralized degrades (-19%), reflecting the low tool count (2 tools) where coordination overhead is less justified.

### 4.1 Setup

#### Benchmarks.

We conducted 260 experiments across six benchmarks spanning deterministic to open-world task structures: Workbench (deterministic code execution and tool use with objective pass/fail criteria), Finance Agent (multi-step quantitative reasoning and risk assessment), PlanCraft (spatiotemporal planning under constraints), BrowseComp-Plus (dynamic web navigation, information extraction, and cross-page synthesis), SWE-bench Verified (real-world software engineering; GitHub issue resolution with 7 tools including bash, file editing, and test execution), and Terminal-Bench (diverse CLI tasks spanning system administration, security, and ML training; 2 tools). BrowseComp-Plus, Finance Agent, PlanCraft, and Workbench each contribute 45 configurations (9 models $\times$ 5 architectures); SWE-bench Verified and Terminal-Bench each contribute 40 configurations (8 models $\times$ 5 architectures, as Claude Sonnet 3.7 is deprecated). BrowseComp-Plus, Finance Agent, PlanCraft, and Workbench use 50–100 instances per configuration; SWE-bench Verified and Terminal-Bench use 20-instance subsets due to the computational cost of Docker-based evaluation (see Table [16](https://arxiv.org/html/2512.08296v3#A6.T16 "Table 16 ‣ Appendix F SWE-bench Verified and Terminal-Bench Results ‣ Towards a Science of Scaling Agent Systems") for bootstrap confidence intervals). The tool-count range spans $\{2,3,4,5,7,16\}$ across all six benchmarks. BrowseComp-Plus exhibits the highest performance variability across experimental configurations (coefficient of variation $\sigma/\mu=0.32$ computed across all 45 BrowseComp-Plus runs spanning architectures and model families, with Anthropic models contributing substantial variance due to lower absolute performance, where $\sigma$ is the standard deviation of success rates and $\mu$ is the mean success rate). By comparison, Workbench (CV=0.12), Finance Agent (CV=0.18), and PlanCraft (CV=0.21) show lower variability, indicating more stable performance across configurations.

#### LLMs and Intelligence Scaling.

We evaluate three LLM families across multiple model sizes, spanning externally standardized Intelligence Index values from 42 to 71 (a composite capability score integrating reasoning, coding, and knowledge benchmarks; see Appendix [A](https://arxiv.org/html/2512.08296v3#A1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems")):

- •

  OpenAI: GPT-5-nano, GPT-5-mini, GPT-5
- •

  Google: Gemini-2.0 Flash, Gemini-2.5 Flash, Gemini-2.5 Pro
- •

  Anthropic: Claude Sonnet 3.7, Claude Sonnet 4, Claude Sonnet 4.5

Claude Sonnet 3.7 was deprecated by Anthropic in February 2026 and is therefore unavailable for SWE-bench Verified and Terminal-Bench. On these two benchmarks, the Anthropic family includes Claude Sonnet 4 and Claude Sonnet 4.5, while the OpenAI and Google families remain unchanged, yielding 8 models per benchmark and a total of $N{=}260$ configurations.
Strong consistency across families validates that coordination scaling follows model-agnostic principles: the maximum difference in architecture-specific scaling slopes between any two LLM families is $\Delta_{\max}=0.023$ (computed as $\max_{i,j}|\hat{\beta}_{\text{arch},i}-\hat{\beta}_{\text{arch},j}|$ across families $i,j\in\{\text{OpenAI, Google, Anthropic}\}$), with coefficient of variation CV $<0.02$ across families. To ensure computational fairness, we matched maximum total iterations between MAS and SAS systems: MAS configurations received equal computational budget through parallel agent processing (smaller per-agent iterations for $n$-agent teams), while SAS received proportionally more reasoning rounds to compensate for lack of parallel deliberation.

#### Agent Architectures and Complexity.

We tested five coordination topologies: Single-Agent System (SAS) and four Multi-Agent System (MAS) variants: Independent, Centralized, Decentralized, and Hybrid. Rather than attempting exhaustive coverage of all possible architectures, we selected these four MAS configurations to form a structured ablation over two key coordination dimensions:
(i) orchestrator presence (hierarchical control vs. flat structure), and (ii) peer communication (direct sub-agent interaction vs. isolated execution). Independent isolates pure ensemble effects without any inter-agent communication; Centralized introduces hierarchical verification through an orchestrator bottleneck; Decentralized enables
peer-to-peer information fusion without hierarchy; and Hybrid combines both mechanisms (see Table [2](https://arxiv.org/html/2512.08296v3#S3.T2 "Table 2 ‣ Benchmark Design Principles. ‣ 3.2 Agentic Tasks and Benchmarks ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems") for formal complexity characterization). This design enables controlled
attribution of performance differences to specific coordination
mechanisms rather than generic “multi-agent” effects. Coordination complexity is parameterized by communication overhead: the total number of inter-agent message exchanges required per task, yielding empirical values ranging from 0% (SAS) to 515% (Hybrid), with Independent at 58%, Decentralized at 263%, and Centralized at 285% relative to the single-agent baseline (see Table [5](https://arxiv.org/html/2512.08296v3#S4.T5 "Table 5 ‣ The Scaling Principle Enables Quantitative Architecture Selection. ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")).

#### Metrics and Validation.

Primary outcome is task success/accuracy (domain-dependent: factual correctness for Finance Agent, task completion for Workbench, goal satisfaction for PlanCraft, page synthesis accuracy for BrowseComp-Plus). Secondary metrics include: (i) factual error rate $E$ via domain-specific validators (Cohen’s $\kappa$ [[59](https://arxiv.org/html/2512.08296v3#bib.bib10)]: Finance Agent $=0.91$, Workbench $=0.89$, PlanCraft $=0.87$, BrowseComp-Plus $=0.88$; exceeding 0.80, indicating strong inter-rater reliability); (ii) information gain $\Delta\mathcal{I}$ from pre- vs. post-coordination uncertainty proxies (see Eq. [2](https://arxiv.org/html/2512.08296v3#A5.E2 "Equation 2 ‣ E.5 Information Gain Computation ‣ Appendix E Implementation Details ‣ Towards a Science of Scaling Agent Systems")); (iii) token-overlap structure across agent rationales, labeling tokens as unique (appearing in exactly one agent), shared (two or more agents), or contradictory (semantic opposition detected when BERTScore similarity $<0.3$ between assertion pairs, i.e., $1-\text{BERTScore}>0.7$, following the dissimilarity threshold established by [Zhang et al. [60]](https://arxiv.org/html/2512.08296v3#bib.bib11)); (iv) efficiency metrics including success per 1,000 tokens and cost-normalized performance. All metrics are normalized per reasoning turn and per token to enable cross-architecture comparison. We select coordination metrics based on two criteria: (i) direct measurability from experimental traces without requiring ground-truth labels beyond task success, and (ii) coverage of distinct aspects of coordination–performance relationships identified in prior work [[15](https://arxiv.org/html/2512.08296v3#bib.bib28)]. We excluded metrics requiring subjective human annotation (e.g., solution creativity) or those exhibiting high collinearity with included measures (e.g., total message count correlates $r>0.92$ with overhead). Variance inflation factor (VIF) analysis confirmed no severe multicollinearity among retained predictors (all VIF $<5$). Specifically:

- •

  Coordination overhead $O=(T_{\text{MAS}}-T_{\text{SAS}})/T_{\text{SAS}}\times 100\%$: captures computational cost, identified as a primary bottleneck in production multi-agent deployments.
- •

  Message density $c$ (inter-agent messages per reasoning turn): quantifies communication intensity, a key factor in coordination scaling.
- •

  Redundancy rate $R$ (mean cosine similarity of agent output embeddings): measures agent agreement, relevant for ensemble-based error correction.
- •

  Coordination efficiency $E_{c}=S/(T/T_{\text{SAS}})$ (success normalized by relative turn count): normalizes success by cost for deployment decisions.
- •

  Error amplification $A_{e}^{\text{trace}}$ (trace-level error propagation factor, estimated from execution-trace token analysis): quantifies how coordination failures compound through agent interactions. The complementary task-level metric $A_{e}^{\text{task}}=E_{\text{MAS}}/E_{\text{SAS}}$ is defined in Section [3](https://arxiv.org/html/2512.08296v3#S3 "3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems").

### 4.2 Main Results

#### MAS exhibits domain-dependence with architectural variation.

Multi-agent systems show highly variable performance across task domains, depending on problem structure and architectural choices. On Finance Agent, MAS achieve substantial improvements: Centralized reaches +80.8% (mean 0.631 vs. SAS 0.349), Decentralized achieves +74.5% (0.609), and Hybrid reaches +73.1% (0.604), driven by opportunities for distributed financial reasoning across multiple agents. On Workbench, multi-agent systems show minimal gains: Decentralized achieves +5.6% (0.664 vs. SAS 0.629), while Centralized and Hybrid both slightly underperform at -1.2%. On BrowseComp-Plus, improvements remain modest: Decentralized achieves +9.2% (0.347 vs. SAS 0.318), with Centralized essentially flat at +0.2%. Critically, PlanCraft exhibits universal performance degradation
across all multi-agent architectures. Centralized declines to
$-50.3$% (0.282 vs. SAS 0.568), Decentralized to $-41.5$% (0.332), Hybrid to $-39.1$% (0.346), and Independent to $-70.0$% (0.170). To understand this
contrast between Finance Agent’s gains and PlanCraft’s degradation, we examined execution traces from both domains. In PlanCraft, efficient single-agent trajectories follow direct execution paths. For example, crafting a diorite_wall:

> Turn 1: search("diorite_wall") $\rightarrow$ Recipe: 6 diorite in 2x3
>   
> Turn 2: move(diorite $\rightarrow$ crafting_grid)
>   
> Turn 3: craft $\rightarrow$ Task complete

In contrast, centralized multi-agent systems decompose inherently sequential tasks into artificial subtasks:

> Agent 1: Research recipe (redundant, since lookup is instantaneous)
>   
> Agent 2: Check inventory (redundant, since state is visible to all)
>   
> Agent 3: Execute crafting (the only necessary step)

This unnecessary decomposition generates substantial coordination messages on average for tasks requiring only a few execution steps, consuming token budget on coordination rather than reasoning. Conversely, Finance Agent trajectories demonstrate when coordination provides genuine value. Single-agent execution exhibits sequential bottlenecks:

> Turn 1: web_search("merger news") $\rightarrow$ Surface results
>   
> Turn 2: edgar_search("filings") $\rightarrow$ Limited depth
>   
> Turn 3--7: Sequential exploration with insufficient breadth

Centralized coordination enables parallel information synthesis:

> Agent 1: Regulatory/news analysis
>   
> Agent 2: SEC filing research
>   
> Agent 3: Operational impact assessment
>   
> Orchestrator: Synthesize multi-source findings

The task’s natural decomposability such as revenue, cost, and market factors can be analyzed independently which aligns with the coordination structure, yielding $+80.8$% improvement. These trajectory patterns reveal the mechanistic basis for domain-dependence: coordination overhead becomes counterproductive when coordination complexity exceeds task complexity (PlanCraft), but provides substantial gains when tasks naturally decompose into parallel information streams (Finance Agent).

On SWE-bench Verified, all MAS architectures show slight degradation relative to SAS (mean 0.522): Hybrid $-2.1\%$ (0.511), Centralized $-3.1\%$ (0.506), Decentralized $-5.4\%$ (0.494), and Independent $-14.9\%$ (0.444). This is consistent with the capability-saturation threshold: most models achieve single-agent baselines above 45%, leaving limited room for coordination gains. On Terminal-Bench (SAS mean 0.344, below the threshold), results are mixed: Independent shows marginal gains ($+1.7\%$, 0.350) while Centralized degrades substantially ($-19.2\%$, 0.278), suggesting that the low tool count (2 tools) limits the benefit of orchestration-heavy architectures.

Aggregating across all six benchmarks and architectures, the overall mean MAS improvement is $-0.3$% (95% CI: [$-58.7$%, $+77.2$%]), reflecting substantial performance heterogeneity with high variance ($\sigma=37.5$%). The performance range across MAS variants spans from $-70.0$% (PlanCraft Independent) to $+80.8$% (Finance Centralized), indicating that MAS do not provide universal benefits but rather domain-specific trade-offs.

#### Domain Complexity Moderates Coordination Efficacy.

Empirical patterns across benchmarks reveal that domain complexity (refer to Appendix [C](https://arxiv.org/html/2512.08296v3#A3 "Appendix C Domain Complexity ‣ Towards a Science of Scaling Agent Systems") for details) moderates MAS advantage: structured, decomposable domains show large gains while high-complexity sequential domains show consistent degradation. The mechanism operates through fixed computational budgets (matched total tokens across MAS and SAS): in structured, decomposable domains (Finance Agent, moderate Workbench instances), agents complete local reasoning with residual capacity available for inter-agent communication. Here, inter-agent messages reduce variance through redundancy elimination and enable synthesis of partial solutions, producing large performance deltas (Finance: $+80.8\%$). Conversely, in high-complexity sequential domains (PlanCraft), intra-agent reasoning for constraint verification and state tracking consumes most available tokens before communication can occur; subsequent inter-agent messages then compress reasoning quality and produce strong negative returns (PlanCraft: $-39.0\%$ to $-70.0\%$).

We characterize each benchmark by a domain complexity score $D\in[0,1]$ (Appendix [C](https://arxiv.org/html/2512.08296v3#A3 "Appendix C Domain Complexity ‣ Towards a Science of Scaling Agent Systems")), capturing the degree of sequential interdependence and empirical difficulty: Workbench (0.000, minimal sequential constraints) shows positive MAS returns or minimal overhead, SWE-bench Verified (0.255, decomposable engineering tasks) has low domain complexity but high single-agent baselines that trigger capability saturation, Finance Agent (0.407, moderate decomposability) and Terminal-Bench (0.414, diverse CLI tasks) sit near the critical threshold, while PlanCraft (0.419, high sequential dependencies) and BrowseComp-Plus (0.839, dynamic state evolution) show degradation or minimal gains. Domain complexity alone does not fully predict MAS effectiveness. While low-complexity domains (Workbench, D = 0.00) show modest gains and high-complexity domains (BrowseComp-Plus, D = 0.84) show limited benefits, the critical factor is task decomposability: Finance Agent (D = 0.41) achieves +80.8% gains through parallelizable subtask structure, whereas PlanCraft (D = 0.42) degrades by -70% due to strict sequential dependencies despite similar complexity scores. This suggests that sequential interdependence, rather than complexity alone, determines coordination viability. Information gain $\Delta\mathcal{I}$ correlates with this pattern: Finance Agent (structured domain) exhibits strong information-value convergence ($r=0.71$, $p<0.001$), while PlanCraft (sequential constraints) shows weak correlation ($r=0.18$, $p=0.22$), indicating that agents in high-complexity domains exchange limited actionable information due to inherent sequential dependencies and state-space ambiguity.

#### Architecture-LLM Family Interactions Reveal Vendor-Specific Coordination Mechanisms.

While domain complexity broadly moderates MAS effectiveness, the architecture-domain interaction reveals *non-uniform* preferences even within similar complexity regimes: no single architecture dominates across all domains and vendors. Architecture effectiveness depends critically on domain structure: Finance Agent benefits most from Centralized (+80.8%) and Decentralized (+74.5%), Workbench from MAS-Decentralized (+5.6%), and BrowseComp-Plus from MAS-Decentralized (+9.2%). In degrading domains, architecture selection becomes a least-worst optimization: PlanCraft shows Hybrid as relatively best (-39.1%) compared to MAS-Centralized (-50.3%) and MAS-Independent (-70.0%).

Family-specific coordination preferences emerge within improvement-positive domains. On Finance Agent, Anthropic’s MAS-Centralized achieves +127.5% (0.636 vs. 0.280 SAS), indicating conservative but stable coordination, whereas Google’s MAS-Centralized reaches +164.3% (0.740 vs. 0.280 SAS, averaging Centralized performance), suggesting stronger attention-mechanism alignment with hierarchical message exchange; OpenAI’s MAS-Centralized achieves +69.9% (0.79 vs. 0.465 SAS). On Workbench, where multi-agent overhead is less tolerable (efficiency degrades from $E_{c}=0.466$ for SAS to $E_{c}=0.074$ for Hybrid, the largest relative drop across benchmarks), Anthropic’s best variant (MAS-Decentralized, +10.8%) remains superior to Google (+9.5%) and OpenAI (+8.6%), reflecting relative efficiency in managing coordination costs. On PlanCraft, where all variants degrade, vendor preferences flatten: Anthropic shows maximum -54.5% (MAS-Hybrid 0.31 vs. SAS 0.68), Google shows -25.3% (best), and OpenAI shows -32.3%, indicating that communication mechanisms cannot overcome fundamental sequential reasoning constraints. While the precise mechanisms remain to be characterized, potential factors include differences in instruction-following fidelity, context utilization patterns, and inter-turn consistency that affect how agents interpret and respond to coordination messages. No vendor achieves universal multi-agent dominance; instead, each exhibits relative advantages in structured domains (Finance) that evaporate in sequential constraint-satisfaction domains (PlanCraft), indicating that multi-agent benefits are genuinely contingent on problem structure rather than generalizable across task types.

![Refer to caption](https://arxiv.org/html/2512.08296v3/cost_performance.png)


Figure 3: 
Cost–Performance Trade-offs Across Model Families and Architectures. Data from BrowseComp-Plus, Finance Agent, PlanCraft, and Workbench (180 configurations with full cost tracking; SWE-bench Verified and Terminal-Bench use Docker-based evaluation with different cost structures).
Comparative analysis of single-agent and multi-agent architectures: Independent, Decentralized, Centralized, and Hybrid across three LLM families.
Each point represents the mean agentic performance (%) versus normalized cost per experiment (USD), with horizontal and vertical error bars denoting Standard Error of Mean (SEM) in cost and performance, respectively.
The optimal coordination pattern differs across model families: OpenAI models show consistent gains from Centralized and Hybrid MAS configurations despite higher costs, suggesting stronger communication alignment;
Google models display marginal MAS improvements but a clear efficiency plateau, indicating diminishing returns under lightweight coordination;
and Anthropic models reveal higher variance and occasional MAS underperformance, reflecting sensitivity to coordination overhead.
These cross-family discrepancies imply that *the efficacy of multi-agent coordination is contingent on each model family’s intrinsic communication bandwidth and reasoning alignment*.
Collectively, the results establish a family-dependent scaling principle linking coordination structure, economic efficiency, and emergent performance.

### 4.3 Scaling principles

The main results reveal substantial heterogeneity where agentic system performance ranges from $+80.8\%$ improvement to $-70\%$ degradation depending on task structure and coordination architecture. This variance correlates with measurable properties such as task decomposability, tool complexity, and baseline difficulty. We explore a quantitative principle that not only explains this heterogeneity but also enables prediction for unseen configurations: given measurable properties of a model, task, and system configuration, can we predict a specific agent system’s performance?

#### Regression Model Achieves Cross-Validated $R^{2}{=}0.413$ (ACI) / $R^{2}{=}0.373$ (Intelligence Index).

We fit a scaling principle to all 260 configurations across six benchmarks that relates agentic system performance to four categories of predictors: 1) base model capability (intelligence index $I$), 2) system configuration (agent count $n_{a}$), 3) task properties (tool count $T$, single-agent baseline $P_{\text{SA}}$). These are instance-level predictors capturing within-benchmark variation, distinct from the benchmark-level domain complexity $D$ defined in Appendix [C](https://arxiv.org/html/2512.08296v3#A3 "Appendix C Domain Complexity ‣ Towards a Science of Scaling Agent Systems"), and 4) empirically measured coordination metrics from Table [5](https://arxiv.org/html/2512.08296v3#S4.T5 "Table 5 ‣ The Scaling Principle Enables Quantitative Architecture Selection. ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems") (efficiency $E_{c}$, overhead $O\%$, trace-level error amplification $A_{e}^{\text{trace}}$, message density $c$, redundancy $R$). Rather than including all possible terms, we construct the model based on specific mechanistic hypotheses.

Main effects capture direct relationships between individual factors and performance. We include a quadratic term ($I^{2}$) to test for non-linear capability scaling, and log-transformed tool count and agent count following standard diminishing-returns assumptions in scaling analyses [[54](https://arxiv.org/html/2512.08296v3#bib.bib25)].

Interaction terms test specific hypotheses about how these factors combine. We include nine interactions, each motivated by observed patterns: $E_{c}\times T$ tests whether efficiency penalties compound with tool complexity; $A_{e}^{\text{trace}}\times T$ tests whether errors propagate more severely in tool-rich environments; $P_{\text{SA}}\times\log(1+n_{a})$ captures the baseline paradox where high single-agent performance leaves less room for coordination gains; $O\%\times T$ tests whether overhead costs scale with task complexity. We deliberately exclude interactions without clear mechanistic justification (e.g., $R\times c$, $I\times O\%$) to avoid overfitting.

The complete functional form is:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $\displaystyle P={\color[rgb]{0.8008,0,0}\beta_{0}}$ | $\displaystyle+{\color[rgb]{0,0.3984,0.8008}\beta_{1}(I-\bar{I})}+\beta_{2}(I-\bar{I})^{2}+{\color[rgb]{0.8008,0,0}\beta_{3}\log(1+T)}+\beta_{4}\log(1+n_{a})$ |  |
|  |  |  |  |
| --- | --- | --- | --- |
|  |  | $\displaystyle+\beta_{5}\log(1+O\%)+\beta_{6}c+\beta_{7}R+\beta_{8}E_{c}+\beta_{9}\log(1+A_{e}^{\text{trace}})$ |  |
|  |  |  |  |
| --- | --- | --- | --- |
|  |  | $\displaystyle+{\color[rgb]{0,0.3984,0.8008}\beta_{10}P_{\text{SA}}}+\beta_{11}(I\times E_{c})+{\color[rgb]{0,0.3984,0.8008}\beta_{12}(A_{e}^{\text{trace}}\times P_{\text{SA}})}$ |  |
|  |  |  |  |
| --- | --- | --- | --- |
|  |  | $\displaystyle+\beta_{13}(O\%\times T)+{\color[rgb]{0,0.3984,0.8008}\beta_{14}(R\times n_{a})}+\beta_{15}(c\times I)$ |  |
|  |  |  |  |
| --- | --- | --- | --- |
|  |  | $\displaystyle+{\color[rgb]{0,0.3984,0.8008}\beta_{16}(E_{c}\times T)}+{\color[rgb]{0,0.3984,0.8008}\beta_{17}(P_{\text{SA}}\times\log(1+n_{a}))}$ |  |
|  |  |  |  |  |
| --- | --- | --- | --- | --- |
|  |  | $\displaystyle+\beta_{18}(I\times\log(1+T))+\beta_{19}(A_{e}^{\text{trace}}\times T)+\varepsilon,$ |  | (1) |

$\blacksquare$ $p<0.001$  $\blacksquare$ Significant ($p<0.05$)  $\blacksquare$ Non-significant ($p>0.05$)

where all predictors are standardized ($\mu=0$, $\sigma=1$) after transformation. Log transformations are applied to right-skewed variables spanning multiple orders of magnitude ($O\%$: 0–515%; $T$: 2–16; $n_{a}$: 1–4; $A_{e}^{\text{trace}}$: 1.0–17.2) to improve approximate linearity and reduce skewness. The $A_{e}^{\text{trace}}\times T$ interaction retains $A_{e}^{\text{trace}}$ without additional log transformation because $\log(1+A_{e}^{\text{trace}})$ already appears as a main effect; including $\log(1+A_{e}^{\text{trace}})\times T$ would introduce near-collinearity (VIF $>8$, indicating substantial multicollinearity). Sensitivity analysis confirms qualitatively consistent results under alternative specifications ($\Delta R^{2}_{\text{CV}}<0.01$). We validate model complexity through five-fold cross-validation with experiment-level holdout (splitting at the configuration level). Using the Intelligence Index as the capability metric, the model achieves $R^{2}_{\text{train}}=0.463$, $R^{2}_{\text{CV}}=0.373$ ($\pm 0.170$ SD). Replacing the Intelligence Index with the task-grounded Agentic Capability Index (ACI), defined as each model’s mean single-agent performance across all six benchmarks (correlation with Intelligence Index: $r=0.45$), improves model fit to $R^{2}_{\text{train}}=0.481$, $R^{2}_{\text{CV}}=0.413$ ($\pm 0.130$ SD), AIC $=-244.8$, with no reversals in statistical significance across predictors (Table [13](https://arxiv.org/html/2512.08296v3#A6.T13 "Table 13 ‣ Appendix F SWE-bench Verified and Terminal-Bench Results ‣ Towards a Science of Scaling Agent Systems")). We report the Intelligence Index specification in Table [4](https://arxiv.org/html/2512.08296v3#S4.T4 "Table 4 ‣ The Scaling Principle Enables Quantitative Architecture Selection. ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems") for comparability with prior work and because ACI requires running the benchmarks, but recommend ACI as the primary capability metric. The model consistently outperforms simpler alternatives using only architectural labels or intelligence alone, as shown in Table [3](https://arxiv.org/html/2512.08296v3#S4.T3 "Table 3 ‣ The Scaling Principle Enables Quantitative Architecture Selection. ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems"). This equation contains no dataset-specific parameters or dataset-dependent tuning, enabling prediction on unseen task domains.

#### The Efficiency-Tools Interaction Emerges as a Consistent Directional Pattern ($\hat{\beta}=-0.096$, $p=0.002$).

Among the significant interactions, the efficiency-tools trade-off exhibits the largest effect size among interaction terms: $\hat{\beta}_{E_{c}\times T}=-0.096$ (95% CI: $[-0.154,-0.037]$, $p=0.002$). This interaction reveals that tool-heavy tasks suffer disproportionately from multi-agent inefficiency. Empirically, single-agent systems achieve $E_{c}=0.466$ (Table [5](https://arxiv.org/html/2512.08296v3#S4.T5 "Table 5 ‣ The Scaling Principle Enables Quantitative Architecture Selection. ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")), while multi-agent architectures range from $E_{c}=0.074$ (hybrid) to $E_{c}=0.234$ (independent), a 2–6$\times$ efficiency penalty.

For a task with $T=16$ tools (e.g., Workbench benchmark), the interaction coefficient $\hat{\beta}_{E_{c}\times T}=-0.096$ indicates that efficiency-related contributions become less favorable as tool complexity increases.

Because all predictors are standardized after transformation, this interaction should not be interpreted by directly multiplying raw values of $E_{c}$ and $T$. Instead, we interpret this coefficient qualitatively: tool-rich environments amplify coordination inefficiencies, leading to larger performance penalties for architectures with high coordination overhead.

Consistent with this interpretation, simple tasks ($T\leq 4$) exhibit negligible efficiency effects ($|\Delta P|<0.05$), explaining why multi-agent coordination can succeed on decomposable problems. This finding contradicts the naïve hypothesis that “more agents always help with complexity”: tool-rich environments amplify the coordination tax, making simpler architectures more effective.

Error Amplification Exhibits Architecture-Dependent Catastrophic Failure Modes. Table [5](https://arxiv.org/html/2512.08296v3#S4.T5 "Table 5 ‣ The Scaling Principle Enables Quantitative Architecture Selection. ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems") reveals dramatic variance in trace-level error amplification factors: single-agent ($A_{e}^{\text{trace}}=1.0$), centralized ($A_{e}^{\text{trace}}=4.4$), decentralized ($A_{e}^{\text{trace}}=7.8$), hybrid ($A_{e}^{\text{trace}}=5.1$), and independent multi-agent ($A_{e}^{\text{trace}}=17.2$). After controlling for other coordination metrics, neither the main effect of error amplification ($\hat{\beta}=0.014$, $p=0.658$) nor its interaction with tool count ($A_{e}^{\text{trace}}\times T$: $\hat{\beta}=0.022$, $p=0.332$) reaches statistical significance. This suggests that the dramatic performance differences across architectures observed in Table [5](https://arxiv.org/html/2512.08296v3#S4.T5 "Table 5 ‣ The Scaling Principle Enables Quantitative Architecture Selection. ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems") are better explained by other coordination mechanisms, particularly efficiency ($E_{c}$) and overhead ($O\%$), rather than error propagation per se. Independent architecture’s universal underperformance (mean success 0.370 vs. 0.466 SAS) stems from absence of inter-agent communication: each agent operates in isolation, duplicating errors without correction opportunities, but this effect is subsumed by the efficiency metric ($E_{c}=0.234$ for Independent vs. $E_{c}=0.466$ for SAS).

#### Overhead Scales Non-Linearly with Task Complexity via the $O\%\times T$ Interaction.

Multi-agent architectures incur substantial overhead: independent (58%), centralized (285%), decentralized (263%), and hybrid (515%), representing 1.6–6.2$\times$ token budgets relative to single-agent at matched performance. The scaling principle reveals this overhead interacts with tool count ($\hat{\beta}_{O\%\times T}=-0.033$, $p=0.211$), a directional pattern that loses significance in the 6-benchmark model due to the increased heterogeneity of task domains. The direction is preserved: for hybrid architecture ($O\%=515$) on workbench ($T=16$), overhead costs compound with tool complexity, explaining hybrid’s collapse on tool-heavy benchmarks (success rate 0.452 overall, 0.21 on workbench). Empirically, workbench confirms this pattern: decentralized (mean 0.664) outperforms centralized (0.621) despite higher overhead, due to its superior parallel efficiency. We note that this predictor retains significance under naive OLS on the 4-benchmark subset ($\hat{\beta}=-0.162$, $p<0.001$) and report it as a directional pattern under the more conservative 6-benchmark specification.

#### Intelligence Shows Linear Positive Effect ($\hat{\beta}_{I}=0.126$, $p=0.008$).

After centering intelligence scores to address multicollinearity (VIF reduced from 200 to 1.1), the linear capability effect becomes significant: higher-capability models achieve proportionally better performance across all architectures. The quadratic term ($I^{2}$) is not significant ($p=0.977$), indicating that capability scaling follows a linear rather than accelerating pattern within the tested range ($I\in[42,71]$). This finding suggests that coordination benefits scale consistently with model capability, without evidence of emergent super-linear gains at higher intelligence levels.

#### Redundancy Provides Marginal Benefit at Scale ($\hat{\beta}_{R\times n_{a}}=0.024$, $p=0.034$).

Work redundancy, defined as the fraction of subtasks performed by multiple agents, ranges from 0.41 (centralized) to 0.50 (decentralized) for multi-agent systems (Table [5](https://arxiv.org/html/2512.08296v3#S4.T5 "Table 5 ‣ The Scaling Principle Enables Quantitative Architecture Selection. ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")). The scaling principle identifies a weak positive interaction with agent count ($\hat{\beta}_{R\times n_{a}}=0.024$, 95% CI: $[0.002,0.047]$, $p=0.034$), suggesting redundancy offers error-correction benefits when more agents participate. For a 4-agent system with $R=0.50$:

|  |  |  |
| --- | --- | --- |
|  | $$\Delta P_{\text{redundancy}}=0.024\times 0.50\times 4=0.048,$$ |  |

equivalent to an $\approx 5$% performance boost (in standardized units). However, this effect is minor compared to efficiency losses ($|\hat{\beta}_{E_{c}\times T}|=0.096$, $4\times$ larger), indicating redundancy cannot compensate for architectural inefficiency. The significance ($p=0.034$, near the $\alpha=0.05$ threshold) suggests this relationship may be context-dependent, potentially stronger in error-prone domains or weaker when communication is expensive. Decentralized architecture, which exhibits highest redundancy ($R=0.50\pm 0.06$), achieves top performance on tool-heavy tasks (workbench success 0.664), consistent with redundancy’s protective role. Yet this same architecture underperforms on planning tasks (0.282), where redundancy becomes wasteful duplication. This context-dependence aligns with the baseline paradox: redundancy helps when there is room for improvement ($P_{\text{SA}}<0.45$) but becomes overhead when baseline is high.

#### The Scaling Principle Enables Quantitative Architecture Selection.

Equation [1](https://arxiv.org/html/2512.08296v3#S4.E1 "Equation 1 ‣ Regression Model Achieves Cross-Validated 𝑅^2=0.413 (ACI) / 𝑅^2=0.373 (Intelligence Index). ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems") synthesizes 20 parameters into a predictive tool for architecture design. Given task characteristics ($T$, $P_{\text{SA}}$) and model capability ($I$), practitioners can compute expected performance for each architecture using empirical coordination metrics from Table [5](https://arxiv.org/html/2512.08296v3#S4.T5 "Table 5 ‣ The Scaling Principle Enables Quantitative Architecture Selection. ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems"). Consider three task archetypes: (1) Planning tasks ($T=4$, $P_{\text{SA}}=0.57$) favor single-agent due to baseline paradox and low tool count; (2) Analysis tasks ($T=5$, $P_{\text{SA}}=0.35$) favor centralized multi-agent, balancing error control ($A_{e}^{\text{trace}}=4.4$) with manageable overhead; (3) Tool-heavy tasks ($T=16$, $P_{\text{SA}}=0.63$) favor decentralized multi-agent despite high overhead (263%), because parallelization and redundancy outweigh efficiency losses. Quantitatively, the decision boundary between single-agent and multi-agent is:

|  |  |  |
| --- | --- | --- |
|  | $$P_{\text{SA}}^{*}=-\frac{\hat{\beta}_{4}}{\hat{\beta}_{17}}\approx\frac{0.040}{0.236}=0.170\quad\text{(in standardized units)},$$ |  |

corresponding to raw performance $\approx 0.45$ after denormalization. This threshold, derived purely from data, aligns with empirical best practices and offers the first quantitative criterion for coordination structure selection, replacing heuristic “when to use agents”, and “which agentic architecture to use” guidance with a predictive model. Cross-validation on held-out configurations confirms this rule achieves 87% correct architecture selection, substantially exceeding random choice (20%) or capability-only models (54%). The scaling principle thus constitutes both a scientific contribution, a cross-domain descriptive framework for relating coordination metrics to agent performance, and an engineering tool for architecture selection within known task regimes.

Table 3: Scaling principle model comparison. Progressive inclusion of empirical coordination metrics substantially improves predictive power. All models use 5-fold cross-validation with experiment-level holdout ($N=260$, six benchmarks). The full model with interaction terms achieves the best cross-validated fit ($R^{2}_{\text{CV}}=0.373$) and AIC ($-236.3$), demonstrating that empirical coordination metrics capture meaningful variance beyond base predictors alone.

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| Model Specification | $R^{2}_{\text{train}}$ | $R^{2}_{\text{CV}}$ | AIC | Parameters |
| Intelligence + Tools + Agents | 0.405 | 0.360 | $-238.8$ | 4 |
| + Coordination structure | 0.428 | 0.363 | $-243.2$ | 10 |
| + Single-agent baseline | 0.429 | 0.358 | $-242.0$ | 11 |
| + Interaction terms (Table [5](https://arxiv.org/html/2512.08296v3#S4.T5 "Table 5 ‣ The Scaling Principle Enables Quantitative Architecture Selection. ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")) | 0.463 | 0.373 | $-236.3$ | 20 |




Table 4: Complete scaling principle coefficients relating performance to intelligence, task properties, and empirical coordination metrics ($R^{2}_{\text{train}}=0.463$, $R^{2}_{\text{CV}}=0.373$, $N=260$ configurations across six benchmarks, AIC=$-236.3$). Using the task-grounded ACI improves fit to $R^{2}_{\text{CV}}=0.413$ (Table [13](https://arxiv.org/html/2512.08296v3#A6.T13 "Table 13 ‣ Appendix F SWE-bench Verified and Terminal-Bench Results ‣ Towards a Science of Scaling Agent Systems")). Intelligence is mean-centered ($\bar{I}=57.5$) to address multicollinearity between $I$ and $I^{2}$ (VIF reduced from 200 to 1.1). Model uses 5-fold cross-validation. Non-significant terms ($p>0.05$) indicated with †.

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| Predictor | $\hat{\beta}$ | 95% CI | $p$ | Interpretation |
| Main Effects | | | | |
| Intercept ($\beta_{0}$) | 0.430 | [0.412, 0.448] | $<$0.001 | Baseline performance |
| Intelligence ($I-\bar{I}$) | 0.126 | [0.033, 0.218] | 0.008 | Linear capability effect |
| Intelligence2 ($(I-\bar{I})^{2}$) | $-$0.000 | [$-$0.019, 0.018] | 0.977† | Quadratic capability (not significant) |
| $\log(1+T)$ | 0.166 | [0.095, 0.236] | $<$0.001 | Tool diversity benefit |
| $\log(1+n_{a})$ | 0.040 | [$-$0.074, 0.155] | 0.487† | Agent count effect |
| Single-Agent Baseline ($P_{\text{SA}}$) | 0.250 | [0.102, 0.397] | 0.001 | Task difficulty proxy |
| Coordination Structure | | | | |
| $\log(1+O\%)$ | 0.011 | [$-$0.033, 0.056] | 0.611† | Direct overhead cost |
| Message density ($c$) | $-$0.013 | [$-$0.059, 0.033] | 0.585† | Communication intensity |
| Redundancy ($R$) | 0.006 | [$-$0.038, 0.050] | 0.780† | Work overlap |
| Efficiency ($E_{c}$) | $-$0.011 | [$-$0.072, 0.051] | 0.733† | Coordination efficiency |
| $\log(1+A_{e}^{\text{trace}})$ | 0.014 | [$-$0.047, 0.074] | 0.658† | Error amplification |
| Critical Interactions | | | | |
| $P_{\text{SA}}\times\log(1+n_{a})$ | $-$0.236 | [$-$0.396, $-$0.076] | 0.004 | Baseline paradox |
| $E_{c}\times T$ | $-$0.096 | [$-$0.154, $-$0.037] | 0.002 | Efficiency-tools trade-off |
| $O\%\times T$ | $-$0.033 | [$-$0.084, 0.019] | 0.211† | Overhead scales with task complexity |
| $A_{e}^{\text{trace}}\times T$ | 0.022 | [$-$0.023, 0.067] | 0.332† | Error propagation in tool-rich systems |
| $R\times n_{a}$ | 0.024 | [0.002, 0.047] | 0.034 | Redundancy benefit with scale |
| $I\times E_{c}$ | $-$0.011 | [$-$0.060, 0.038] | 0.653† | Capability-efficiency |
| $A_{e}^{\text{trace}}\times P_{\text{SA}}$ | $-$0.080 | [$-$0.148, $-$0.012] | 0.022 | Error-baseline |
| $c\times I$ | $-$0.016 | [$-$0.059, 0.027] | 0.457† | Communication-capability |
| $I\times\log(1+T)$ | $-$0.051 | [$-$0.113, 0.012] | 0.112† | Capability-tools |




Table 5: Coordination metrics across architectures and families ($N=260$ configurations across six benchmarks). Metric values are architecture-level constants measured from execution-trace analysis and applied uniformly across all benchmarks. All systems matched for total reasoning tokens (mean $\mu=4,800$ per trial). Error amplification ($A_{e}^{\text{trace}}$) is measured at the trace level via execution-trace token analysis; the complementary task-level metric $A_{e}^{\text{task}}$ is defined in Section [3](https://arxiv.org/html/2512.08296v3#S3 "3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems").

|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| Metric | SAS | Independent | Decentralized | Centralized | Hybrid |
| Success Rate ($S$) | 0.466 | 0.370 | 0.477 | 0.463 | 0.452 |
| Turns ($T$) | 7.2$\pm$2.1 | 11.4$\pm$3.2 | 26.1$\pm$7.5 | 27.7$\pm$8.1 | 44.3$\pm$12.4 |
| Overhead ($O\%$) | 0 | 58 | 263 | 285 | 515 |
| Message Density ($c$) | 0.00 | 0.00 | 0.41 | 0.39 | 0.24 |
| Redundancy ($R$) | 0.00 | 0.48$\pm$0.09 | 0.50$\pm$0.06 | 0.41$\pm$0.06 | 0.46$\pm$0.04 |
| Efficiency ($E_{c}$) | 0.466 | 0.234 | 0.132 | 0.120 | 0.074 |
| Error Amp ($A_{e}^{\text{trace}}$) | 1.0 | 17.2 | 7.8 | 4.4 | 5.1 |
| Success/1K tokens | 67.7 | 42.4 | 23.9 | 21.5 | 13.6 |

### 4.4 Coordination Efficiency, Error Dynamics, and Information Transfer

Following the Multi-Agent System Failure Taxonomy (MAST) proposed by [[15](https://arxiv.org/html/2512.08296v3#bib.bib28)], we categorize observed errors into specification, inter-agent misalignment, and verification failures. Building on this taxonomy, we quantitatively analyze error frequency and propagation across architectures.

We systematically characterized coordination efficiency, error propagation mechanisms, and information transfer across all 260 experiments. All MAS and SAS configurations were matched for total reasoning-token budget (mean 4,800 tokens per trial) and tool-call access to isolate coordination effects.

#### Turn count follows power-law scaling with number of agents.

Total reasoning turns (reasoning–response exchanges) exhibit power-law growth with agent count:

|  |  |  |
| --- | --- | --- |
|  | $$T=2.72\times(n+0.5)^{1.724},\quad R^{2}=0.974,\quad 95\%\text{ CI on exponent}:[1.685,1.763],\quad p<0.001.$$ |  |

This relationship is fit across architecture-aggregated means; within-architecture variance remains substantial (e.g., at n = 3: Independent averages 11.4 turns vs. Decentralized 26.1 turns), reflecting topology-dependent communication patterns. This super-linear exponent (1.724 $>1$) reflects quadratic message complexity (all-to-all potential communication) tempered by practical bandwidth limits, creating a distinct agentic scaling regime fundamentally different from neural network parameter scaling (e.g., Kaplan et al. report $b=0.76$ for dense models). Empirically, Hybrid systems require 6.2$\times$ more turns than SAS (44.3 vs. 7.2 turns; $t(178)=16.8$, $p<0.001$), while Centralized requires 3.8$\times$ (27.7 turns), and Decentralized requires 3.6$\times$ (26.1 turns). The implication is clear: under fixed computational budgets, per-agent reasoning capacity becomes prohibitively thin beyond 3–4 agents, creating a hard resource ceiling where communication cost dominates reasoning capability.

#### Message Density Exhibits Logarithmic Saturation with Performance.

Across communicating MAS architectures (excluding configurations with $c=0$), success rate follows an approximately logarithmic relationship with message density:

|  |  |  |
| --- | --- | --- |
|  | $$S=0.73+0.28\ln(c),\quad R^{2}=0.68,\quad p<0.001,$$ |  |

where $c$ is messages per reasoning turn. SAS and Independent configurations are excluded from this fit because their message density is zero. Performance plateaus near $c^{*}=0.39$ messages/turn (achieved by Decentralized and Centralized architectures at 0.41 and 0.39 respectively), corresponding to success rates of 47.7% and 46.3%. This relationship should be interpreted as a descriptive trend rather than a universal functional form.

Beyond this point, additional messages yield diminishing returns: Hybrid systems (515% coordination overhead, $T=44.3$) shows -2.4% versus Centralized (285% overhead, $T=27.7$), a difference of 1.1% that is not statistically significant ($t(178)=0.61$, $p=0.542$). This saturation reflects fundamental information limits in open-ended reasoning rather than mechanism failures: high-performing runs show convergent token overlap (shared tokens: mean $\approx 1.8$ bits; $p<0.001$ vs. low performers) suggesting message consensus is reached; further messages add redundancy rather than novel information.

#### Error absorption mechanisms.

We formalize error absorption as $\text{Absorb}=(E_{\text{SAS}}-E_{\text{MAS}})/E_{\text{SAS}}$, where $E$ is factual error rate. The absorption mechanism operates through *iterative verification*: in Centralized and Hybrid architectures, sub-agent outputs pass through an orchestrator that cross-checks reasoning steps before aggregation, enabling detection and correction of logical inconsistencies. In Decentralized architectures, peer debate rounds provide similar verification through explicit challenge-response exchanges. These architectures achieve 22.7% average error reduction ($95\%$ CI: $[20.1\%,25.3\%]$), peaking at 31.4% for Finance Agent where structured numerical outputs facilitate verification. Independent MAS shows no error correction ($+4.6\%$ amplification) due to absence of any inter-agent verification mechanism where errors made by individual agents propagate directly to the aggregated output without opportunity for correction.

The correction mechanism is revealed through token-overlap analysis. Each token in agent rationales is labeled as: (i) unique (appears in exactly one agent); (ii) shared (two or more agents); (iii) contradictory (semantic opposition, BERTScore $<0.3$). High-performing runs exhibit: (i) increased shared-token entropy (mean $\approx 1.8$ bits for Finance Agent; $p<0.001$ vs. low-performing runs); (ii) substantially reduced contradictory mass (median 2.3% in successes vs. 8.1% in failures), evidence that messages converge toward mutually consistent sub-proofs rather than self-reinforcing errors. However, high redundancy ($R>0.50$) correlates negatively with success ($r=-0.136$, $p=0.004$), implying an emergent diversity-efficiency trade-off: collective capability peaks when message overlap balances shared grounding with informational diversity; optimal redundancy occurs at $R\approx 0.41$ (Centralized median), balancing information fusion with reasoning independence.

Figure 4: Agent Heterogeneity Effects on Multi-Agent Performance.
Performance comparison of centralized (Orchestrator-Subagents) and decentralized (Peer Debate with Voting) multi-agent architectures on BrowseComp-Plus benchmark across three LLM families. High-capability models include GPT-5, Claude Sonnet 4.5, and Gemini-2.5 Pro; low-capability models include GPT-5 nano, Claude Sonnet 3.7, and Gemini-2.0 Flash.
(1) Anthropic models uniquely benefit from heterogeneous mixing in centralized architecture, where low-capability orchestrator with high-capability subagents (0.42) outperforms homogeneous high-capability (0.32) by 31%, while OpenAI and Gemini show performance degradation under heterogeneous centralized configurations.
(2) Decentralized mixed-capability approaches achieve near-optimal or superior performance compared to homogeneous high-capability baselines (OpenAI: 0.53 vs 0.50; Anthropic: 0.47 vs 0.37; Gemini: 0.42 vs 0.43), suggesting effective emergent collaboration despite capability asymmetry.
(3) In centralized architectures, configurations with high-capability sub-agents outperform those with high-capability orchestrators across all model families, suggesting sub-agent capability matters more than orchestrator capability.

#### Error Taxonomy Reveals Architecture-specific Failure Modes.

We identified four error categories as follows.

(1) Logical Contradiction: agent asserts both “X is true” and “X is false” about the same entity, or derives conclusions violating its stated premises;
(2) Numerical Drift: accumulated computational error from cascading rounding or unit conversion mistakes, measured as relative deviation from ground truth exceeding 5%;
(3) Context Omission: failure to reference previously established entities, relationships, or state information required for the current reasoning step;
(4) Coordination Failure (MAS-specific): message misinterpretation, task allocation conflicts, or state synchronization errors between agents. Architecture-specific patterns emerge across these categories:

- •

  Logical Contradiction: Baseline 12.3–18.7%. Centralized reduces to 9.1% (36.4% reduction) via consensus; Decentralized achieves 11.5% through peer verification; Independent unchanged at 16.8%.
- •

  Numerical Drift: Baseline 20.9–24.1%. Centralized/Decentralized reduce to 18.3% (24% reduction) via sub-problem verification; Hybrid amplifies to 26.4% as rounding errors propagate; Independent unchanged at 23.2%.
- •

  Context Omission: Baseline 15.8–25.2%. Centralized reduces to 8.3% (66.8% reduction) via orchestrator synthesis; Decentralized achieves 11.2%; Independent unchanged at 24.1%.
- •

  Coordination Failure: Only appears in MAS. Independent: 0% (no coordination mechanism); Centralized: 1.8%; Decentralized: 3.2%; Hybrid: 12.4% (protocol complexity exceeds robust implementation).

These patterns identify three operational coordination regimes: (i) Under-coordination ($O<100\%$ overhead): minimal accuracy gain ($\Delta S\approx+2$–4%), coordination mechanisms not yet engaged; (ii) Optimal band ($200\%<O<300\%$ overhead): highest success–cost ratio ($E_{c}\approx 0.16$), dominated by Centralized and Decentralized, with strong error absorption; (iii) Over-coordination ($O>400\%$ overhead): Hybrid runs with reduced efficiency ($E_{c}\approx 0.11$), protocol complexity introducing coordination-failure modes. Error amplification analysis confirms: Independent architectures propagate errors to 17.2$\times$ baseline ($95\%$ CI: $[14.3,20.1]$; no correction mechanisms), while Centralized contains to 4.4$\times$ ($[3.8,5.0]$) through supervised aggregation.

Figure 5: Number of agents scaling reveals model-dependent coordination limits. Performance of Gemini-2.0 Flash (a) and Gemini-2.5 Pro (b) across multi-agent architectures with varying number of agents ($n_{a}\in\{1,3,5,7,9\}$). Both models show initial
gains from multi-agent coordination, but scaling patterns diverge:
Gemini-2.0 Flash exhibits a clear optimum at 7 agents before degradation, while Gemini-2.5 Pro’s decentralized architecture peaks earlier despite its higher single-agent baseline. The centralized architecture demonstrates more stable scaling for Flash but shows diminishing returns for Pro beyond 5 agents. Dashed lines indicate single-agent baseline performance. Results suggest that the optimal number of agents depends on both model capacity and coordination strategy, with coordination overhead eventually outweighing parallelization
benefits.

#### Information Gain (IG) Predicts MAS benefit in Low-Complexity Domains.

We compute information gain $\Delta\mathcal{I}$ by comparing pre-coordination and post-coordination task-uncertainty surrogates (via Bayesian posterior variance reduction on key variables). In structured domains (Finance Agent, Workbench), $\Delta\mathcal{I}$ correlates strongly with MAS–SAS gap ($r=0.71$, $p<0.001$), indicating that agents successfully exchange high-value information and synthesize it into improved solutions. In Finance Agent specifically, $\Delta\mathcal{I}$ ranges 0.8–2.1 bits (mean 1.4) for successful trials vs. 0.2–0.6 bits (mean 0.4) for failures.

Conversely, in open-world domains (BrowseComp-Plus), $\Delta\mathcal{I}$ shows weak and non-significant power, revealing that agents’ messages provide limited validated information due to inherent world ambiguity. This domain-dependent information-gain pattern directly maps to observed MAS benefits: Finance Agent (up to +80.8% for Centralized) where information exchange is high-value; BrowseComp-Plus (up to +9.2% for Decentralized) where world ambiguity limits verification.

#### Cross-Domain Consistency of Coordination Patterns.

Architectural rankings remained stable across domains (Kendall $\tau=0.89$, coefficient of variation $<0.1$ across architectures), indicating coordination principles transcend specific task structures. Extrapolation to larger teams via the fitted power law predicts $\approx$69 turns at $n{=}6$ and $\approx$157 turns at $n{=}10$ (95% CI from exponent uncertainty: [64, 74] and [143, 172] respectively), corresponding to $9.5\times$–$21.8\times$ increases over the SAS baseline of 7.2 turns. This super-linear scaling confirms the hard resource ceiling: beyond 3–4 agents, per-agent reasoning quality degrades sharply under fixed budgets.

#### Economic Efficiency and Family-Specific Cost-Benefit Trade-offs.

Token efficiency (success per 1,000 tokens) reveals sharp trade-offs by architecture and family: SAS achieves 67.7 successes/1K tokens; Centralized drops to 21.5 (3.1$\times$ worse); Decentralized to 23.9 (2.8$\times$ worse); Hybrid to 13.6 (5.0$\times$ worse). Absolute dollar costs per trial vary by model: OpenAI Hybrid achieves marginal cost $\approx\$0.008$ per 1% success gain (steep but manageable for structured tasks), while Anthropic Hybrid reaches $\approx\$0.024$ per 1% gain (3$\times$ worse, reflecting Anthropic’s sensitivity to coordination overhead). Google maintains intermediate costs $\approx\$0.012$ per 1% gain across architectures, suggesting more balanced cost-benefit trade-offs.

#### LLM Family-specific Deployment Signatures and Model-Architecture Alignment.

Cross-family analysis reveals distinct architectural preferences. OpenAI models show strongest Hybrid gains on structured tasks (Finance: 52% success Hybrid vs. 39% SAS; Workbench: 56% Hybrid vs. 42% SAS). Anthropic models display most conservative, stable Centralized performance (mean 43% across tasks, SD = 2.3%, lowest variance). Google models exhibit consistent cross-architecture efficiency (performance range < 5% across topologies). These patterns may reflect family-level differences in instruction following, context utilization, inter-turn consistency, or other architectural and training factors that affect how models process coordination messages. We do not isolate the underlying mechanism here, so these family-specific differences should be interpreted as empirical signatures rather than mechanistic conclusions.

### 4.5 Robustness and Sensitivity Analysis

We subject the 6-benchmark regression ($N=260$) to three robustness checks addressing pseudoreplication, multiplicity, and capability metric sensitivity.

#### Cluster-robust inference.

We re-estimated the regression with cluster-robust standard errors (clustering on dataset, $G=6$, CR1 correction, $t_{5}$ critical values). Predictors varying primarily at the dataset level (including log_tools, efficiency_x_tools, and baseline_x_agents) show standard error inflation up to $2.9\times$ relative to naive OLS estimates; we report these as directional patterns rather than confirmed effects. single_agent_baseline ($p=0.004$) and error_x_baseline ($p=0.030$) retain significance under cluster-robust inference, confirming the capability-saturation finding as the most robustly supported result (Table [14](https://arxiv.org/html/2512.08296v3#A6.T14 "Table 14 ‣ Appendix F SWE-bench Verified and Terminal-Bench Results ‣ Towards a Science of Scaling Agent Systems")).

#### Multiple-comparison correction.

We evaluated 19 predictor coefficients (excluding the intercept) as a single family of simultaneous hypotheses, applying the Holm–Bonferroni step-down procedure to control the family-wise error rate at $\alpha=0.05$. Three predictors survive correction: log_tools ($p_{\text{Holm}}<0.001$), single_agent_baseline ($p_{\text{Holm}}=0.018$), and efficiency_x_tools ($p_{\text{Holm}}=0.026$). Two further predictors (intelligence_centered and baseline_x_agents) are suggestive ($p_{\text{Holm}}<0.10$) and are discussed as directional patterns (Table [15](https://arxiv.org/html/2512.08296v3#A6.T15 "Table 15 ‣ Appendix F SWE-bench Verified and Terminal-Bench Results ‣ Towards a Science of Scaling Agent Systems")). The Holm–Bonferroni correction was applied to naive OLS $p$-values (addressing multiplicity), while the cluster-robust analysis (addressing pseudoreplication) was reported separately. Under cluster-robust inference alone, only single_agent_baseline ($p=0.004$) survives at $\alpha=0.05$, making capability saturation the single most robust finding across both correction approaches.

#### Capability metric sensitivity.

As an alternative to the Intelligence Index, we introduce the Agentic Capability Index (ACI), defined as each model’s mean single-agent performance across all six benchmarks. The two metrics are only moderately correlated ($r=0.45$), validating the concern that static benchmark composites diverge from dynamic agentic performance. ACI improves cross-validated fit ($R^{2}_{\text{CV}}$: $0.373\to 0.413$) with zero finding reversals, and we recommend ACI as the primary capability metric going forward (Table [13](https://arxiv.org/html/2512.08296v3#A6.T13 "Table 13 ‣ Appendix F SWE-bench Verified and Terminal-Bench Results ‣ Towards a Science of Scaling Agent Systems")).

#### Cross-domain generalization.

Leave-one-dataset-out (LODO) cross-validation highlights the challenge of predicting *absolute* success rates across structurally diverse task domains with a single regression surface that contains no dataset-specific parameters.
However, within-domain cross-validated evaluation shows that the model correctly identifies the optimal architecture for 87% of held-out configurations (§[4.3](https://arxiv.org/html/2512.08296v3#S4.SS3 "4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")), indicating that *relative* performance rankings between architectures are preserved even when absolute cross-domain prediction is limited.
The capability-saturation threshold ($\sim$45%) is further supported with a 94% match rate across all 16 model$\times$benchmark configurations on SWE-bench Verified and Terminal-Bench ($p<0.001$ by binomial test).

## 5 Limitations

While this work provides quantitative scaling principles for agent systems across architectures and model families, several limitations remain.

(i) Our framework systematically compares canonical coordination structures with preliminary exploration of scaling number of agents up to nine. However, our empirical findings suggest that scaling to larger collectives may face fundamental barriers: the communication overhead we measured grows superlinearly with agent count, and coordination efficiency degrades substantially beyond moderate team sizes. Whether such collectives can exhibit beneficial emergent behaviors, such as spontaneous specialization or hierarchical self-organization, or whether communication bottlenecks dominate remains an open question that parallels phase transitions in complex adaptive systems.

(ii) While we explore capability heterogeneity by mixing models of different intelligence levels within the same LLM family, all agents share identical base architectures differing only in scale and role prompts. A preliminary investigation of 13 heterogeneous configurations on BrowseComp-Plus (mixing models within and across families) finds no evidence that model mixing bypasses the capability-saturation threshold: centralized heterogeneous configurations underperform their strong-model homogeneous counterparts by a mean of 12.6 percentage points, while decentralized configurations show marginal gains (+2.0 pp) largely attributable to the stronger constituent model (Table [12](https://arxiv.org/html/2512.08296v3#A6.T12 "Table 12 ‣ Appendix F SWE-bench Verified and Terminal-Bench Results ‣ Towards a Science of Scaling Agent Systems")). Future work should investigate teams combining different model architectures, domain-specialized fine-tuning, or complementary reasoning strategies to understand when *epistemic diversity* yields robustness rather than coordination noise. Additionally, our heterogeneity experiments (Figure [4](https://arxiv.org/html/2512.08296v3#S4.F4 "Figure 4 ‣ Error absorption mechanisms. ‣ 4.4 Coordination Efficiency, Error Dynamics, and Information Transfer ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")) hint that certain models may be better suited for orchestration versus execution roles; systematic study of *role-specialized* training or selection could enable more principled team composition.

(iii) Our analysis reveals that tool-heavy environments represent a primary failure mode for multi-agent coordination, with significant negative interactions between tool count and system efficiency. Developing specialized coordination protocols for tool-intensive tasks, such as explicit tool-access scheduling, capability-aware task routing, or hierarchical tool delegation, represents an important direction for improving multi-agent reliability.

(iv) While we controlled prompts to be identical across conditions for experimental validity, we did not optimize prompts specifically for each model or model family. Given known sensitivity of LLM behavior to prompt formulation, architecture-specific prompt tuning may yield different scaling characteristics than those reported here.

(v) Our analysis spans six agentic benchmarks, which, while diverse in task structure (deterministic tool use, quantitative reasoning, sequential planning, dynamic web navigation, software engineering, and CLI tasks), may not capture the full spectrum of agentic task characteristics. The strong differentiation in MAS effectiveness across these benchmarks (Figure [2](https://arxiv.org/html/2512.08296v3#S4.F2 "Figure 2 ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")) suggests that additional environments, particularly those with novel task structures such as embodied agents, multi-user interaction, or long-horizon temporal dependencies, would further strengthen confidence in the identified thresholds and scaling principles. SWE-bench Verified and Terminal-Bench use 20-instance subsets (smaller than the 50–100 instances used for BrowseComp-Plus, Finance Agent, PlanCraft, and Workbench) due to the computational cost of Docker-based evaluation environments. Bootstrap 95% confidence intervals (10,000 resamples) yield typical widths of $\pm$20 percentage points per cell; while individual pairwise comparisons are underpowered at $n=20$, aggregate trends across 8 models $\times$ 2 benchmarks remain robust (e.g., the 45% threshold achieves 94% match rate, $p<0.001$ by binomial test). All per-cell bootstrap CIs are reported in Table [16](https://arxiv.org/html/2512.08296v3#A6.T16 "Table 16 ‣ Appendix F SWE-bench Verified and Terminal-Bench Results ‣ Towards a Science of Scaling Agent Systems").

(vi) The economic viability of multi-agent scaling remains a practical barrier, rooted in part in the token-centric communication paradigm: current coordination requires agents to serialize reasoning into natural language tokens (or at minimum, read shared context and output agreement signals), imposing fundamental latency and cost floors. Emerging approaches such as latent-space reasoning or direct activation sharing between models could circumvent this bottleneck, potentially altering the scaling dynamics we observe if inter-agent communication shifts from token exchange to more efficient representational transfer. As shown in our cost analysis (Section [4.4](https://arxiv.org/html/2512.08296v3#S4.SS4 "4.4 Coordination Efficiency, Error Dynamics, and Information Transfer ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems")), token consumption and latency grow substantially with agent count, often without proportional performance gains. Future work should explore efficiency-oriented designs, such as sparse communication, early-exit mechanisms, or distilled coordinator models, to make multi-agent deployments economically feasible at scale. Complementary *latency-oriented* designs, where parallel agent branches execute speculatively and suboptimal trajectories are pruned post-hoc, may trade increased total compute for reduced wall-clock time, a trade-off increasingly relevant for real-time applications where response latency dominates cost considerations. Additionally, current agentic benchmarks capture dynamic text-based environments but do not yet include long-horizon temporal dependencies or real-world feedback loops. Integrating embodied or multimodal settings (e.g., robotic control, medical triage, multi-user social interaction) will test whether our observed scaling principles generalize beyond symbolic domains.

(vii) Our regression analysis clusters observations at the dataset level ($G=6$). With a small number of clusters, cluster-robust standard errors are known to be conservative, and several predictors that are significant under naive OLS lose significance under cluster-robust inference (Table [14](https://arxiv.org/html/2512.08296v3#A6.T14 "Table 14 ‣ Appendix F SWE-bench Verified and Terminal-Bench Results ‣ Towards a Science of Scaling Agent Systems")). We therefore report both naive and cluster-robust estimates throughout, framing dataset-level predictors as descriptive patterns supported by directional consistency rather than confirmed at conventional significance levels. Leave-one-dataset-out cross-validation further highlights the challenge of predicting *absolute* success rates across structurally diverse domains without dataset-specific parameters; however, the within-domain cross-validated model correctly selects the optimal architecture in 87% of held-out cases, indicating that relative coordination patterns transfer across domains even when absolute performance levels vary.

## 6 Conclusion

In this work, we empirically characterize how agent-system performance varies with coordination structure, model capability, and task properties across 260 controlled configurations spanning three LLM families and six agentic benchmarks. We identify capability saturation as the most robust scaling effect: coordination yields diminishing returns beyond $\sim$45% single-agent baselines, a finding confirmed under both cluster-robust inference ($p=0.004$) and Holm–Bonferroni multiple-comparison correction ($p_{\text{Holm}}=0.018$). Two additional directional patterns emerge consistently across all six benchmarks: a tool-coordination trade-off where tool-heavy tasks suffer from coordination overhead, and architecture-dependent trace-level error amplification ranging from 4.4$\times$ (centralized) to 17.2$\times$ (independent). Performance gains vary substantially by task structure, from +80.8% on Finance Agent to $-$70.0% on PlanCraft, demonstrating that coordination benefits depend on task decomposability rather than team size. We derive a predictive model ($R^{2}{=}0.373$ across all six benchmarks; $R^{2}{=}0.413$ with a task-grounded capability metric) that achieves 87% accuracy in selecting optimal architectures for held-out configurations. On held-out frontier models evaluated on BrowseComp-Plus, the framework remains reasonably calibrated for relative MAS performance prediction (MAS-only MAE=0.061; overall MAE=0.077), providing preliminary evidence of transfer within this benchmark rather than full cross-domain generalization.

## Data Availability

All benchmark datasets used in this study are publicly available: BrowseComp-Plus [[32](https://arxiv.org/html/2512.08296v3#bib.bib7)] (<https://arxiv.org/abs/2508.06600>, 100 instances), Finance-Agent [[33](https://arxiv.org/html/2512.08296v3#bib.bib8)] (<https://arxiv.org/abs/2508.00828>, 50 instances), PlanCraft [[21](https://arxiv.org/html/2512.08296v3#bib.bib9)] (<https://arxiv.org/abs/2412.21033>, 100 instances), Workbench [[34](https://arxiv.org/html/2512.08296v3#bib.bib5)] (<https://arxiv.org/abs/2405.00823>, 100 instances), SWE-bench Verified [[20](https://arxiv.org/html/2512.08296v3#bib.bib30)] (<https://www.swebench.com/>, 500 instances, 20-instance subset selected via deterministic shuffle with seed 42), and TerminalBench [[25](https://arxiv.org/html/2512.08296v3#bib.bib31)] (<https://www.tbench.ai/>, 86 instances, first 20 instances used). Per-instance results for all 260 experimental configurations are provided in the code repository at etc/analysis/.

## Code Availability

The code repository (<https://github.com/ybkim95/agent-scaling>) contains the evaluation framework, configuration files, prompt templates, analysis scripts, and representative sanitized execution traces used in this study. Additional artifacts required for full reproduction are described in the repository documentation.

## References

- [1]
  L. Wang, C. Ma, X. Feng, Z. Zhang, H. Yang, J. Zhang, Z. Chen, J. Tang, X. Chen, Y. Lin, et al. (2024)
  A survey on large language model based autonomous agents.
  Frontiers of Computer Science 18 (6), pp. 186345.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [2]
  K. Zhang, J. Li, G. Li, X. Shi, and Z. Jin (2024)
  CodeAgent: enhancing code generation with tool-integrated agent systems for real-world repo-level coding challenges.
  In Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
  pp. 13643–13658.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [3]
  J. Yang, C. E. Jimenez, A. Wettig, K. Lieret, S. Yao, K. Narasimhan, and O. Press (2024)
  Swe-agent: agent-computer interfaces enable automated software engineering.
  Advances in Neural Information Processing Systems 37, pp. 50528–50652.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [4]
  J. Wei, Z. Sun, S. Papay, S. McKinney, J. Han, I. Fulford, H. W. Chung, A. T. Passos, W. Fedus, and A. Glaese (2025)
  BrowseComp: a simple yet challenging benchmark for browsing agents.
  arXiv preprint arXiv:2504.12516.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p3.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [5]
  S. Yao, H. Chen, J. Yang, and K. Narasimhan (2022)
  Webshop: towards scalable real-world web interaction with grounded language agents.
  Advances in Neural Information Processing Systems 35, pp. 20744–20757.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [6]
  A. A. Heydari, K. Gu, V. Srinivas, H. Yu, Z. Zhang, Y. Zhang, A. Paruchuri, Q. He, H. Palangi, N. Hammerquist, et al. (2025)
  The anatomy of a personal health agent.
  arXiv preprint arXiv:2508.20148.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [7]
  D. McDuff, M. Schaekermann, T. Tu, A. Palepu, A. Wang, J. Garrison, K. Singhal, Y. Sharma, S. Azizi, K. Kulkarni, et al. (2025)
  Towards accurate differential diagnosis with large language models.
  Nature, pp. 1–7.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [8]
  Y. Kim, C. Park, H. Jeong, Y. S. Chan, X. Xu, D. McDuff, H. Lee, M. Ghassemi, C. Breazeal, and H. W. Park (2024)
  Mdagents: an adaptive collaboration of LLMs for medical decision-making.
  Advances in Neural Information Processing Systems 37, pp. 79410–79452.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [9]
  Y. Yu, H. Li, Z. Chen, Y. Jiang, Y. Li, J. W. Suchow, D. Zhang, and K. Khashanah (2025)
  Finmem: a performance-enhanced LLM trading agent with layered memory and character design.
  IEEE Transactions on Big Data.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p3.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [10]
  Z. Zhang, A. Metzger, Y. Mei, F. Hähnlein, Z. Englhardt, T. Cheng, G. D. Abowd, S. Patel, A. Schulz, and V. Iyer (2025)
  Towards autonomous sustainability assessment via multimodal AI agents.
  arXiv preprint arXiv:2507.17012.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [11]
  J. Gottweis, W. Weng, A. Daryin, T. Tu, A. Palepu, P. Sirkovic, A. Myaskovsky, F. Weissenberger, K. Rong, R. Tanno, et al. (2025)
  Towards an AI co-scientist.
  arXiv preprint arXiv:2502.18864.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [12]
  L. Mitchener, A. Yiu, B. Chang, M. Bourdenx, T. Nadolski, A. Sulovari, E. C. Landsness, D. L. Barabasi, S. Narayanan, N. Evans, S. Reddy, M. Foiani, A. Kamal, L. P. Shriver, F. Cao, A. T. Wassie, J. M. Laurent, E. Melville-Green, M. Caldas, A. Bou, K. F. Roberts, S. Zagorac, T. C. Orr, M. E. Orr, K. J. Zwezdaryk, A. E. Ghareeb, L. McCoy, B. Gomes, E. A. Ashley, K. E. Duff, T. Buonassisi, T. Rainforth, R. J. Bateman, M. Skarlinski, S. G. Rodriques, M. M. Hinks, and A. D. White (2025)
  Kosmos: An AI scientist for autonomous discovery.
  External Links: 2511.02824,
  [Link](https://arxiv.org/abs/2511.02824)
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [13]
  K. Tran, D. Dao, M. Nguyen, Q. Pham, B. O’Sullivan, and H. D. Nguyen (2025)
  Multi-agent collaboration mechanisms: A survey of LLMs.
  arXiv preprint arXiv:2501.06322.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p4.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [14]
  T. Guo, X. Chen, Y. Wang, R. Chang, S. Pei, N. V. Chawla, O. Wiest, and X. Zhang (2024)
  Large language model based multi-agents: a survey of progress and challenges.
  In Proceedings of the Thirty-Third International Joint Conference on Artificial Intelligence,
  pp. 8048–8057.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§3.1](https://arxiv.org/html/2512.08296v3#S3.SS1.SSS0.Px3.p2.1.2 "Communication vs. Coordination. ‣ 3.1 System Definition ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems"),
  [§3.1](https://arxiv.org/html/2512.08296v3#S3.SS1.p1.1 "3.1 System Definition ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems").
- [15]
  M. Cemri, M. Z. Pan, S. Yang, L. A. Agrawal, B. Chopra, R. Tiwari, K. Keutzer, A. Parameswaran, D. Klein, K. Ramchandran, et al. (2025)
  Why do multi-agent llm systems fail?.
  arXiv preprint arXiv:2503.13657.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§4.1](https://arxiv.org/html/2512.08296v3#S4.SS1.SSS0.Px4.p1.1 "Metrics and Validation. ‣ 4.1 Setup ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems"),
  [§4.4](https://arxiv.org/html/2512.08296v3#S4.SS4.p1.1 "4.4 Coordination Efficiency, Error Dynamics, and Information Transfer ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems").
- [16]
  M. Gao, Y. Li, B. Liu, Y. Yu, P. Wang, C. Lin, and F. Lai (2025)
  Single-agent or multi-agent systems? why not both?.
  arXiv preprint arXiv:2505.18286.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p5.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [17]
  Graham Neubig (2024)
  Don’t sleep on single-agent systems.
  Note: <https://openhands.dev/blog/dont-sleep-on-single-agent-systems>Accessed: 2026-04-06
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [18]
  Cognition AI (2025)
  Don’t build multi-agents.
  Note: <https://cognition.ai/blog/dont-build-multi-agents>Accessed: 2026-04-06
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [19]
  Y. Zhu, T. Jin, Y. Pruksachatkun, A. K. Zhang, S. Liu, S. Cui, S. Kapoor, S. Longpre, K. Meng, R. Weiss, F. Barez, R. Gupta, J. Dhamala, J. Merizian, M. Giulianelli, H. Coppock, C. Ududec, A. Kellermann, J. S. Sekhon, J. Steinhardt, S. Schwettmann, A. Narayanan, M. Zaharia, I. Stoica, P. Liang, and D. Kang (2025)
  Establishing best practices in building rigorous agentic benchmarks.
  In The Thirty-ninth Annual Conference on Neural Information Processing Systems Datasets and Benchmarks Track,
  External Links: [Link](https://openreview.net/forum?id=E58HNCqoaA)
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p2.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§3.1](https://arxiv.org/html/2512.08296v3#S3.SS1.p1.1 "3.1 System Definition ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems"),
  [§3.2](https://arxiv.org/html/2512.08296v3#S3.SS2.SSS0.Px2.p1.1 "Benchmark Design Principles. ‣ 3.2 Agentic Tasks and Benchmarks ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems"),
  [§3.2](https://arxiv.org/html/2512.08296v3#S3.SS2.p1.1 "3.2 Agentic Tasks and Benchmarks ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems"),
  [§3.2](https://arxiv.org/html/2512.08296v3#S3.SS2.p3.1 "3.2 Agentic Tasks and Benchmarks ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems").
- [20]
  C. E. Jimenez, J. Yang, A. Wettig, S. Yao, K. Pei, O. Press, and K. Narasimhan (2023)
  Swe-bench: can language models resolve real-world github issues?.
  arXiv preprint arXiv:2310.06770.
  Cited by: [Appendix D](https://arxiv.org/html/2512.08296v3#A4.SS0.SSS0.Px5.p1.1 "SWE-bench Verified. ‣ Appendix D Datasets ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p3.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p8.1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1.3 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [Data Availability](https://arxiv.org/html/2512.08296v3#Sx1.p1.1 "Data Availability ‣ Towards a Science of Scaling Agent Systems").
- [21]
  G. Dagan, F. Keller, and A. Lascarides (2024)
  Plancraft: an evaluation dataset for planning with LLM agents.
  arXiv preprint arXiv:2412.21033.
  Cited by: [Appendix D](https://arxiv.org/html/2512.08296v3#A4.SS0.SSS0.Px4.p1.1 "Plancraft. ‣ Appendix D Datasets ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p3.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p8.1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [Data Availability](https://arxiv.org/html/2512.08296v3#Sx1.p1.1 "Data Availability ‣ Towards a Science of Scaling Agent Systems").
- [22]
  X. Liu, H. Yu, H. Zhang, Y. Xu, X. Lei, H. Lai, Y. Gu, H. Ding, K. Men, K. Yang, et al. (2024)
  AgentBench: evaluating LLMs as agents.
  In The Twelfth International Conference on Learning Representations,
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p3.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [23]
  S. Kapoor, B. Stroebl, Z. S. Siegel, N. Nadgir, and A. Narayanan (2025)
  AI agents that matter.
  Transactions on Machine Learning Research.
  Note: 
  External Links: ISSN 2835-8856,
  [Link](https://openreview.net/forum?id=Zy4uFzMviZ)
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p3.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [24]
  V. Barres, H. Dong, S. Ray, X. Si, and K. Narasimhan (2025)
  $\tau^{2}$-Bench: evaluating conversational agents in a dual-control environment.
  arXiv preprint arXiv:2506.07982.
  Cited by: [Appendix A](https://arxiv.org/html/2512.08296v3#A1.p1.1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p3.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [25]
  M. A. Merrill, A. G. Shaw, N. Carlini, B. Li, H. Raj, I. Bercovich, L. Shi, J. Y. Shin, T. Walshe, E. K. Buchanan, et al. (2026)
  Terminal-bench: benchmarking agents on hard, realistic tasks in command line interfaces.
  arXiv preprint arXiv:2601.11868.
  Cited by: [Appendix D](https://arxiv.org/html/2512.08296v3#A4.SS0.SSS0.Px6.p1.1 "Terminal-Bench. ‣ Appendix D Datasets ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p3.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p8.1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [Data Availability](https://arxiv.org/html/2512.08296v3#Sx1.p1.1 "Data Availability ‣ Towards a Science of Scaling Agent Systems").
- [26]
  M. Chen, J. Tworek, H. Jun, Q. Yuan, H. P. d. O. Pinto, J. Kaplan, H. Edwards, Y. Burda, N. Joseph, G. Brockman, A. Ray, R. Puri, G. Krueger, M. Petrov, H. Khlaaf, G. Sastry, P. Mishkin, B. Chan, S. Gray, N. Ryder, M. Pavlov, A. Power, L. Kaiser, M. Bavarian, C. Winter, P. Tillet, F. P. Such, D. Cummings, M. Plappert, F. Chantzis, E. Barnes, A. Herbert-Voss, W. H. Guss, A. Nichol, A. Paino, N. Tezak, J. Tang, I. Babuschkin, S. Balaji, S. Jain, W. Saunders, C. Hesse, A. N. Carr, J. Leike, J. Achiam, V. Misra, E. Morikawa, A. Radford, M. Knight, M. Brundage, M. Murati, K. Mayer, P. Welinder, B. McGrew, D. Amodei, S. McCandlish, I. Sutskever, and W. Zaremba (2021)
  Evaluating large language models trained on code.
  arXiv preprint arXiv:2107.03374.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p3.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [27]
  Y. Du, S. Li, A. Torralba, J. B. Tenenbaum, and I. Mordatch (2023)
  Improving factuality and reasoning in language models through multiagent debate.
  In Forty-first International Conference on Machine Learning,
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p4.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [28]
  S. Hong, M. Zhuge, J. Chen, X. Zheng, Y. Cheng, J. Wang, C. Zhang, Z. Wang, S. K. S. Yau, Z. Lin, L. Zhou, C. Ran, L. Xiao, C. Wu, and J. Schmidhuber (2024)
  MetaGPT: meta programming for a multi-agent collaborative framework.
  In The Twelfth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=VtmBAGCN7o)
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p4.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§3.1](https://arxiv.org/html/2512.08296v3#S3.SS1.SSS0.Px3.p2.1.2 "Communication vs. Coordination. ‣ 3.1 System Definition ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems").
- [29]
  T. W. Malone and K. Crowston (1994)
  The interdisciplinary study of coordination.
  ACM Computing Surveys (CSUR) 26 (1), pp. 87–119.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p4.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [30]
  J. E. McGrath (1964)
  Social psychology: a brief introduction.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p7.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [31]
  P. M. Lencioni (2002)
  The five dysfunctions of a team: a leadership fable.
   John Wiley & Sons.
  Cited by: [§1](https://arxiv.org/html/2512.08296v3#S1.p7.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems").
- [32]
  Z. Chen, X. Ma, S. Zhuang, P. Nie, K. Zou, A. Liu, J. Green, K. Patel, R. Meng, M. Su, et al. (2025)
  Browsecomp-plus: a more fair and transparent evaluation benchmark of deep-research agent.
  arXiv preprint arXiv:2508.06600.
  Cited by: [Appendix D](https://arxiv.org/html/2512.08296v3#A4.SS0.SSS0.Px2.p1.1 "BrowseComp Plus. ‣ Appendix D Datasets ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p8.1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [Data Availability](https://arxiv.org/html/2512.08296v3#Sx1.p1.1 "Data Availability ‣ Towards a Science of Scaling Agent Systems").
- [33]
  A. Bigeard, L. Nashold, R. Krishnan, and S. Wu (2025)
  Finance agent benchmark: benchmarking llms on real-world financial research tasks.
  arXiv preprint arXiv:2508.00828.
  Cited by: [Appendix D](https://arxiv.org/html/2512.08296v3#A4.SS0.SSS0.Px1.p1.1 "Finance Agent. ‣ Appendix D Datasets ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p8.1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [Data Availability](https://arxiv.org/html/2512.08296v3#Sx1.p1.1 "Data Availability ‣ Towards a Science of Scaling Agent Systems").
- [34]
  O. Styles, S. Miller, P. Cerda-Mardini, T. Guha, V. Sanchez, and B. Vidgen (2024)
  Workbench: a benchmark dataset for agents in a realistic workplace setting.
  arXiv preprint arXiv:2405.00823.
  Cited by: [Appendix D](https://arxiv.org/html/2512.08296v3#A4.SS0.SSS0.Px3.p1.1 "WorkBench. ‣ Appendix D Datasets ‣ Towards a Science of Scaling Agent Systems"),
  [§1](https://arxiv.org/html/2512.08296v3#S1.p8.1.1 "1 Introduction ‣ Towards a Science of Scaling Agent Systems"),
  [Data Availability](https://arxiv.org/html/2512.08296v3#Sx1.p1.1 "Data Availability ‣ Towards a Science of Scaling Agent Systems").
- [35]
  S. Yao, J. Zhao, D. Yu, N. Du, I. Shafran, K. R. Narasimhan, and Y. Cao (2023)
  ReAct: synergizing reasoning and acting in language models.
  In The Eleventh International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=WE_vluYUL-X)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [36]
  N. Shinn, F. Cassano, A. Gopinath, K. Narasimhan, and S. Yao (2023)
  Reflexion: language agents with verbal reinforcement learning.
  Advances in Neural Information Processing Systems 36.
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [37]
  J. Wei, Y. Tay, R. Bommasani, C. Raffel, B. Zoph, S. Borgeaud, D. Yogatama, M. Bosma, D. Zhou, D. Metzler, E. H. Chi, T. Hashimoto, O. Vinyals, P. Liang, J. Dean, and W. Fedus (2022)
  Emergent abilities of large language models.
  Transactions on Machine Learning Research.
  Note: Survey Certification
  External Links: ISSN 2835-8856,
  [Link](https://openreview.net/forum?id=yzkSU5zdwD)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [38]
  L. Weng (2023)
  LLM powered autonomous agents.
  Lil’Log.
  External Links: [Link](https://lilianweng.github.io/posts/2023-06-23-agent/)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [39]
  Z. Xi, W. Chen, X. Guo, W. He, Y. Ding, B. Hong, M. Zhang, J. Wang, S. Jin, E. Zhou, et al. (2025)
  The rise and potential of large language model based agents: a survey.
  Science China Information Sciences 68 (1), pp. 121101.
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§3.1](https://arxiv.org/html/2512.08296v3#S3.SS1.SSS0.Px3.p2.1.2 "Communication vs. Coordination. ‣ 3.1 System Definition ‣ 3 Agent Systems and Tasks ‣ Towards a Science of Scaling Agent Systems").
- [40]
  Y. Dang, C. Qian, X. Luo, J. Fan, Z. Xie, R. Shi, W. Chen, C. Yang, X. Che, Y. Tian, et al. (2025)
  Multi-agent collaboration via evolving orchestration.
  arXiv preprint arXiv:2505.19591.
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [41]
  J. Li, Q. Zhang, Y. Yu, Q. Fu, and D. Ye (2024)
  More agents is all you need.
  Transactions on Machine Learning Research.
  Note: 
  External Links: ISSN 2835-8856,
  [Link](https://openreview.net/forum?id=bgzUSZ8aeg)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [42]
  C. Qian, Z. Xie, Y. Wang, W. Liu, K. Zhu, H. Xia, Y. Dang, Z. Du, W. Chen, C. Yang, Z. Liu, and M. Sun (2025)
  Scaling large language model-based multi-agent collaboration.
  In The Thirteenth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=K3n5jPkrU6)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [43]
  G. Zhang, L. Niu, J. Fang, K. Wang, L. Bai, and X. Wang (2025)
  Multi-agent architecture search via agentic supernet.
  In Forty-second International Conference on Machine Learning,
  External Links: [Link](https://openreview.net/forum?id=imcyVlzpXh)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [44]
  Anthropic (2025)
  How we built our multi-agent research system.
  Anthropic Engineering Blog.
  External Links: [Link](https://www.anthropic.com/engineering/multi-agent-research-system)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [45]
  T. Sumers, S. Yao, K. Narasimhan, and T. Griffiths (2023)
  Cognitive architectures for language agents.
  Transactions on Machine Learning Research.
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px1.p1.1 "Multi-Agent Systems (MAS) versus Single-Agent Systems (SAS) ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [46]
  S. Zhou, F. F. Xu, H. Zhu, X. Zhou, R. Lo, A. Sridhar, X. Cheng, T. Ou, Y. Bisk, D. Fried, U. Alon, and G. Neubig (2024)
  WebArena: A realistic web environment for building autonomous agents.
  In The Twelfth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=oKn9c6ytLx)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [47]
  C. E. Jimenez, J. Yang, A. Wettig, S. Yao, K. Pei, O. Press, and K. R. Narasimhan (2024)
  SWE-bench: can language models resolve real-world github issues?.
  In The Twelfth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=VTF8yNQM66)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [48]
  K. Cobbe, V. Kosaraju, M. Bavarian, M. Chen, H. Jun, L. Kaiser, M. Plappert, J. Tworek, J. Hilton, R. Nakano, C. Hesse, and J. Schulman (2021)
  Training verifiers to solve math word problems.
  arXiv preprint arXiv:2110.14168.
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [49]
  D. Hendrycks, C. Burns, S. Basart, A. Zou, M. Mazeika, D. Song, and J. Steinhardt (2021)
  Measuring massive multitask language understanding.
  In International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=d7KBjmI3GmQ)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [50]
  P. Rajpurkar, J. Zhang, K. Lopyrev, and P. Liang (2016)
  SQuAD: 100,000+ questions for machine comprehension of text.
  Proceedings of EMNLP.
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [51]
  F. F. Xu, Y. Song, B. Li, Y. Tang, K. Jain, M. Bao, Z. Z. Wang, X. Zhou, Z. Guo, M. Cao, M. Yang, H. Y. Lu, A. Martin, Z. Su, L. M. Maben, R. Mehta, W. Chi, L. K. Jang, Y. Xie, S. Zhou, and G. Neubig (2025)
  TheAgentCompany: Benchmarking LLM Agents on Consequential Real World Tasks.
  In The Thirty-ninth Annual Conference on Neural Information Processing Systems Datasets and Benchmarks Track,
  External Links: [Link](https://openreview.net/forum?id=LZnKNApvhG)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [52]
  D. Paglieri, B. Cupiał, S. Coward, U. Piterbarg, M. Wolczyk, A. Khan, E. Pignatelli, Ł. Kuciński, L. Pinto, R. Fergus, J. N. Foerster, J. Parker-Holder, and T. Rocktäschel (2025)
  BALROG: benchmarking agentic LLM and VLM reasoning on games.
  In The Thirteenth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=fp6t3F669F)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [53]
  A. Yehudai, L. Eden, A. Li, G. Uziel, Y. Zhao, R. Bar-Haim, A. Cohan, and M. Shmueli-Scheuer (2025)
  Survey on evaluation of llm-based agents.
  arXiv preprint arXiv:2503.16416.
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px2.p1.1.3 "Agentic Tasks and Benchmarks ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [54]
  J. Kaplan, S. McCandlish, T. Henighan, T. B. Brown, B. Chess, R. Child, S. Gray, A. Radford, J. Wu, and D. Amodei (2020)
  Scaling laws for neural language models.
  arXiv preprint arXiv:2001.08361.
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems"),
  [§4.3](https://arxiv.org/html/2512.08296v3#S4.SS3.SSS0.Px1.p2.1 "Regression Model Achieves Cross-Validated 𝑅^2=0.413 (ACI) / 𝑅^2=0.373 (Intelligence Index). ‣ 4.3 Scaling principles ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems").
- [55]
  L. Chen, J. Q. Davis, B. Hanin, P. Bailis, I. Stoica, M. Zaharia, and J. Zou (2024)
  Are more LLM calls all you need? towards scaling laws of compound inference systems.
  arXiv preprint arXiv:2403.02419.
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [56]
  W. Chen, Y. Su, J. Zuo, C. Yang, C. Yuan, C. Chan, H. Yu, Y. Lu, Y. Hung, C. Qian, Y. Qin, X. Cong, R. Xie, Z. Liu, M. Sun, and J. Zhou (2024)
  AgentVerse: facilitating multi-agent collaboration and exploring emergent behaviors.
  In The Twelfth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=EHg5GDnyq1)
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [57]
  Q. Wu, G. Bansal, J. Zhang, Y. Wu, B. Li, E. Zhu, L. Jiang, X. Zhang, S. Zhang, J. Liu, et al. (2024)
  Autogen: enabling next-gen LLM applications via multi-agent conversations.
  In First Conference on Language Modeling,
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [58]
  A. Smit, P. Duckworth, N. Grinsztajn, T. D. Barrett, and A. Pretorius (2023)
  Should we be going mad? a look at multi-agent debate strategies for llms.
  arXiv preprint arXiv:2311.17371.
  Cited by: [§2](https://arxiv.org/html/2512.08296v3#S2.SS0.SSS0.Px3.p1.1 "Scaling Laws and Coordination Mechanisms ‣ 2 Related Work ‣ Towards a Science of Scaling Agent Systems").
- [59]
  J. Cohen (1960)
  A coefficient of agreement for nominal scales.
  Educational and psychological measurement 20 (1), pp. 37–46.
  Cited by: [§4.1](https://arxiv.org/html/2512.08296v3#S4.SS1.SSS0.Px4.p1.1 "Metrics and Validation. ‣ 4.1 Setup ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems").
- [60]
  T. Zhang, V. Kishore, F. Wu, K. Q. Weinberger, and Y. Artzi (2019)
  Bertscore: evaluating text generation with bert.
  arXiv preprint arXiv:1904.09675.
  Cited by: [§4.1](https://arxiv.org/html/2512.08296v3#S4.SS1.SSS0.Px4.p1.1 "Metrics and Validation. ‣ 4.1 Setup ‣ 4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems").
- [61]
  Y. Wang, X. Ma, G. Zhang, Y. Ni, A. Chandra, S. Guo, W. Ren, A. Arulraj, X. He, Z. Jiang, et al. (2024)
  Mmlu-pro: a more robust and challenging multi-task language understanding benchmark.
  Advances in Neural Information Processing Systems 37, pp. 95266–95290.
  Cited by: [Appendix A](https://arxiv.org/html/2512.08296v3#A1.SS0.SSS0.Px1.p1.1 "Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems"),
  [Appendix A](https://arxiv.org/html/2512.08296v3#A1.p1.1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems").
- [62]
  D. Rein, B. L. Hou, A. C. Stickland, J. Petty, R. Y. Pang, J. Dirani, J. Michael, and S. R. Bowman (2024)
  GPQA: a graduate-level google-proof q&a benchmark.
  In First Conference on Language Modeling,
  Cited by: [Appendix A](https://arxiv.org/html/2512.08296v3#A1.SS0.SSS0.Px1.p1.1 "Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems"),
  [Appendix A](https://arxiv.org/html/2512.08296v3#A1.p1.1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems").
- [63]
  L. Phan, A. Gatti, Z. Han, N. Li, J. Hu, H. Zhang, C. B. C. Zhang, M. Shaaban, J. Ling, S. Shi, et al. (2025)
  Humanity’s last exam.
  arXiv preprint arXiv:2501.14249.
  Cited by: [Appendix A](https://arxiv.org/html/2512.08296v3#A1.SS0.SSS0.Px1.p1.1 "Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems"),
  [Appendix A](https://arxiv.org/html/2512.08296v3#A1.p1.1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems").
- [64]
  M. Tian, L. Gao, S. Zhang, X. Chen, C. Fan, X. Guo, R. Haas, P. Ji, K. Krongchon, Y. Li, et al. (2024)
  Scicode: a research coding benchmark curated by scientists.
  Advances in Neural Information Processing Systems 37, pp. 30624–30650.
  Cited by: [Appendix A](https://arxiv.org/html/2512.08296v3#A1.SS0.SSS0.Px1.p1.1 "Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems"),
  [Appendix A](https://arxiv.org/html/2512.08296v3#A1.p1.1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems").
- [65]
  N. Jain, K. Han, A. Gu, W. Li, F. Yan, T. Zhang, S. Wang, A. Solar-Lezama, K. Sen, and I. Stoica (2025)
  LiveCodeBench: holistic and contamination free evaluation of large language models for code.
  In The Thirteenth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=chfJJYC3iL)
  Cited by: [Appendix A](https://arxiv.org/html/2512.08296v3#A1.SS0.SSS0.Px1.p1.1 "Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems"),
  [Appendix A](https://arxiv.org/html/2512.08296v3#A1.p1.1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems").
- [66]
  V. Pyatkin, S. Malik, V. Graf, H. Ivison, S. Huang, P. Dasigi, N. Lambert, and H. Hajishirzi (2025)
  Generalizing verifiable instruction following.
  arXiv preprint arXiv:2507.02833.
  Cited by: [Appendix A](https://arxiv.org/html/2512.08296v3#A1.SS0.SSS0.Px1.p1.1 "Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems"),
  [Appendix A](https://arxiv.org/html/2512.08296v3#A1.p1.1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems").
- [67]
  A. A. Team (2025)
  Artificial analysis long context reasoning benchmark(lcr).
   Artificial Analysis, Inc..
  Cited by: [Appendix A](https://arxiv.org/html/2512.08296v3#A1.SS0.SSS0.Px1.p1.1 "Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems"),
  [Appendix A](https://arxiv.org/html/2512.08296v3#A1.p1.1 "Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems").

## Appendix

## Appendix A Model Intelligence Index

To quantify the capabilities of LLMs used in our study, we adopt while extending the Artificial Analysis Intelligence Index (<https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index>). This index provides a publicly available synthesis of model capabilities, combining performance across reasoning, knowledge, mathematics, coding, instruction following, long-context reasoning, and agentic workflow tasks. Its construction integrates eight evaluation suites (e.g., MMLU-Pro [[61](https://arxiv.org/html/2512.08296v3#bib.bib63)], GPQA Diamond [[62](https://arxiv.org/html/2512.08296v3#bib.bib62)], HLE [[63](https://arxiv.org/html/2512.08296v3#bib.bib61)], AIME 2025, SciCode [[64](https://arxiv.org/html/2512.08296v3#bib.bib60)], LiveCodeBench [[65](https://arxiv.org/html/2512.08296v3#bib.bib59)], IFBench [[66](https://arxiv.org/html/2512.08296v3#bib.bib57)], AA-LCR [[67](https://arxiv.org/html/2512.08296v3#bib.bib58)], Terminal-Bench Hard, and $\tau^{2}$-Bench Telecom [[24](https://arxiv.org/html/2512.08296v3#bib.bib67)]), with careful standardization, robust answer extraction, and model-agnostic prompting.

Our study requires a unified, quantitative measure of a model’s baseline capabilities that is *independent of* any agentic mechanism or multi-agent collaboration structure. The Intelligence Index meets this requirement by:
(i) evaluating all models under consistent, zero-shot, instruction-prompted conditions;
(ii) employing pass@1 scoring and robust equality-checker mechanisms;
(iii) reporting a composite measure reflecting general-purpose reasoning and problem-solving ability; and
(iv) demonstrating high statistical reliability (reported confidence interval below $\pm 1\%$).
This makes it suitable as a foundational axis for studying how agentic performance scales with underlying model capacity.

#### Beyond Artificial Analysis Evaluations.

Artificial Analysis reports Intelligence Index scores for a growing but still limited subset of frontier models. Our work requires a broader coverage, including several models that are not yet benchmarked on the official platform. For these models, we independently reproduced a subset of the Intelligence Index evaluations, specifically AA-LCR [[67](https://arxiv.org/html/2512.08296v3#bib.bib58)], HLE [[63](https://arxiv.org/html/2512.08296v3#bib.bib61)], MMLU-Pro [[61](https://arxiv.org/html/2512.08296v3#bib.bib63)], GPQA Diamond [[62](https://arxiv.org/html/2512.08296v3#bib.bib62)], AIME 2025, LiveCodeBench [[65](https://arxiv.org/html/2512.08296v3#bib.bib59)], SciCode [[64](https://arxiv.org/html/2512.08296v3#bib.bib60)], and IFBench [[66](https://arxiv.org/html/2512.08296v3#bib.bib57)] using the publicly disclosed methodology, prompts, scoring procedures, and evaluation environments described by Artificial Analysis.

For the models without publicly available results, we computed a reconstructed Intelligence Index following the equal-weighting formulation used in Intelligence Index v3.0. In cases where full reproduction was infeasible (e.g., specific agentic workflow tasks or unavailable context window limits), we report approximate estimates (denoted with *) and discuss their limitations transparently. These reconstructed values should be interpreted as *methodologically consistent but not officially certified* estimates.

Table [6](https://arxiv.org/html/2512.08296v3#A1.T6 "Table 6 ‣ Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems") summarizes the reconstructed Intelligence Index and underlying component scores for all models used in our study. The table includes:
(i) official Intelligence Index values when available;
(ii) reconstructed values for non-reported models;
(iii) all constituent evaluation scores used to compute the aggregate index;
(iv) additional model metadata (context window, cost, throughput, latency) relevant for agentic performance analysis.

Table 6: Intelligence Index (non-agentic capability) for LLMs used in our experiments.

|  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Model | Index | AA-LCR | HLE | MMLU-Pro | GPQA Diamond | AIME 25 | LiveCode | SciCode | IFBench |
| [Uncaptioned image] GPT-5.2 | 75 | 73 | 31 | 87 | 90 | 99 | 89 | 52 | 75 |
| [Uncaptioned image] GPT-5 | 71 | 76 | 27 | 87 | 85 | 94 | 85 | 43 | 73 |
| [Uncaptioned image] GPT-5 mini | 68 | 68 | 20 | 84 | 91 | 84 | 84 | 39 | 75 |
| [Uncaptioned image] GPT-5 nano | 59 | 42 | 8 | 78 | 84 | 79 | 79 | 37 | 68 |
| [Uncaptioned image] Gemini-3.0 Pro | 75 | 71 | 37 | 90 | 91 | 96 | 92 | 56 | 70 |
| [Uncaptioned image] Gemini-3.0 Flash | 75 | 66 | 35 | 89 | 90 | 97 | 91 | 51 | 78 |
| [Uncaptioned image] Gemini-2.5 Pro | 65 | 66 | 21 | 86 | 84 | 88 | 80 | 43 | 49 |
| [Uncaptioned image] Gemini-2.5 Flash | 58 | 57 | 13 | 84 | 79 | 78 | 63 | 41 | 52 |
| [Uncaptioned image] Gemini-2.0 Flash | 47 | 45∗ | 8∗ | 77 | 68∗ | 73 | 39∗ | 35∗ | 30∗ |
| [Uncaptioned image] Claude Sonnet 4.5 | 55 | 66 | 7 | 88 | 83 | 37 | 71 | 43 | 43 |
| [Uncaptioned image] Claude Sonnet 4 | 47 | 62∗ | 5∗ | 87 | 75 | 21 | 56∗ | 38∗ | 35∗ |
| [Uncaptioned image] Claude 3.7 Sonnet | 42 | 58∗ | 2∗ | 81 | 67 | 12 | 57 | 32∗ | 30∗ |

∗ Estimated or averaged from reported range.

Our reconstructed Intelligence Index values should be interpreted with appropriate caution.
First, several evaluations, particularly long-context and agentic workflow tasks, contain nondeterministic components that may vary slightly across implementations.
Second, for models without public API support for large-context evaluation (e.g., “non-reasoning” checkpoints), our long-context estimates represent upper-bound approximations based on available context windows and internal model behavior.
Third, Artificial Analysis maintains private test variants and additional filtering procedures that cannot be fully reproduced. Thus, our estimates provide a methodologically aligned but not officially verified extension.

Table 7: Aggregate out-of-sample validation metrics across three held-out models (GPT-5.2, Gemini-3.0 Pro, Gemini-3.0 Flash) on BrowseComp-Plus, all with Intelligence Index = 75. The scaling equation achieves well-calibrated MAS predictions while systematically over-predicting single-agent performance.

|  |  |  |
| --- | --- | --- |
| Metric | Value | Note |
| Overall MAE | 0.077 | 15 predictions |
| MAS-only MAE | 0.061 | 12 predictions |
| SAS-only MAE | 0.138 | 3 predictions |
| Overall MAPE | 19.9% | — |
| MAS-only MAPE | 15.3% | — |
| Findings Validated | 11/15 | 73% |
| Findings Partial | 2/15 | 13% |




Table 8: Architecture-wise prediction accuracy for three held-out models on BrowseComp-Plus. All models share Intelligence Index = 75. MAS predictions are well-calibrated (average error 6.1%), while SAS shows systematic over-prediction due to linear extrapolation beyond the training range.

|  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | GPT-5.2 | | | Gemini-3.0 Pro | | | Gemini-3.0 Flash | | |
| Architecture | Pred. | Actual | Error | Pred. | Actual | Error | Pred. | Actual | Error |
| SAS | 0.521 | 0.450 | $+$15.8% | 0.521 | 0.360 | $+$44.7% | 0.521 | 0.340 | $+$53.2% |
| MAS-Centralized | 0.480 | 0.480 | $+$0.0% | 0.480 | 0.440 | $+$9.1% | 0.480 | 0.480 | $+$0.0% |
| MAS-Decentralized | 0.496 | 0.480 | $+$3.3% | 0.496 | 0.500 | $-$0.8% | 0.496 | 0.400 | $+$24.0% |
| MAS-Independent | 0.413 | 0.350 | $+$18.0% | 0.413 | 0.400 | $+$3.2% | 0.413 | 0.360 | $+$14.7% |
| MAS-Hybrid | 0.560 | 0.390 | $+$43.6% | 0.560 | 0.440 | $+$27.3% | 0.560 | 0.400 | $+$40.0% |
| MAE (Overall) | 0.064 | | | 0.068 | | | 0.098 | | |
| MAE (MAS only) | 0.062 | | | 0.044 | | | 0.077 | | |




Table 9: Validation of key findings from Section [4](https://arxiv.org/html/2512.08296v3#S4 "4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems") across three held-out models. Three findings generalize universally (✓), while two show model-family-specific patterns. Per-model validation rates are 4/5, 4/5, and 3/5 respectively.

|  |  |  |  |
| --- | --- | --- | --- |
| Finding | GPT-5.2 | Gemini-3.0 Pro | Gemini-3.0 Flash |
| Capability Ceiling (higher $P_{SA}$ correlates with diminishing MAS returns) | ✓ | ✓ | ✓ |
| Independent MAS Degradation (Independent underperforms SAS) | ✓ | ✗† | Partial† |
| Optimal Architecture (Centralized/Decentralized excel) | ✓ | ✓ | ✓ |
| Hybrid Overhead (515% overhead limits performance) | ✓ | ✓ | ✓ |
| BrowseComp-Plus Pattern (Decentralized $\geq$ Centralized) | Partial‡ | ✓ | ✗§ |
| Total Validated | 4/5 | 4/5 | 3/5 |

† Gemini models show Independent MAS matching or outperforming SAS (+11.1% for Pro, +5.9% for Flash), contrary to GPT-5.2 ($-$22.2%). This may reflect model-family-specific agentic capabilities.

‡ GPT-5.2 shows convergence (both 0.48); main results predicted Decentralized advantage.

§ Gemini-3.0 Flash shows reversed pattern: Centralized (0.48) $>$ Decentralized (0.40).




Table 10: Model family differences despite identical Intelligence Index (75). Single-agent performance varies substantially across vendors, while best MAS performance converges, suggesting multi-agent architectures may compensate for single-agent limitations.

|  |  |  |  |
| --- | --- | --- | --- |
| Model | $P_{\text{SA}}$ | Best MAS | MAS Gain |
| GPT-5.2 | 0.45 | 0.48 | $+$6.7% |
| Gemini-3.0 Pro | 0.36 | 0.50 | $+$38.9% |
| Gemini-3.0 Flash | 0.34 | 0.48 | $+$41.2% |

Note: All models share Intelligence Index = 75, yet exhibit different single-agent performance. This suggests Intelligence Index may not be directly comparable across model families.

## Appendix B Out-of-Sample Validation

To assess the generalizability of our scaling equation beyond the training distribution, we evaluate on three held-out models: GPT-5.2, Gemini-3.0 Pro, and Gemini-3.0 Flash. All three models share Intelligence Index = 75, representing extrapolation beyond our training range (Index 42–71) by approximately 5.6%. Table [7](https://arxiv.org/html/2512.08296v3#A1.T7 "Table 7 ‣ Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems") summarizes aggregate validation metrics. Across 15 architecture-model combinations, the scaling equation achieves MAE = 0.077. MAS predictions are better calibrated (MAE = 0.061) than SAS predictions (MAE = 0.138), consistent with systematic over-prediction of single-agent performance when extrapolating beyond the training range.

#### Qualitative Findings Validation.

Table [9](https://arxiv.org/html/2512.08296v3#A1.T9 "Table 9 ‣ Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems") evaluates whether the five key findings from Section [4](https://arxiv.org/html/2512.08296v3#S4 "4 Experiments & Results ‣ Towards a Science of Scaling Agent Systems") generalize to held-out models. Across three models, 11 of 15 finding-model pairs validate (73%), with two additional partial validations. Three findings generalize universally: (1) the capability ceiling effect persists across all models, (2) Centralized or Decentralized architectures achieve optimal performance, and (3) Hybrid overhead limits relative performance. Two findings show model-family-specific behavior: Independent MAS degradation validates only for GPT-5.2 but not for Gemini models, and the BrowseComp pattern (Decentralized $>$ Centralized) varies across model families.

#### Model Family Differences.

An informative comparison arises from models with identical Intelligence Index (Table [10](https://arxiv.org/html/2512.08296v3#A1.T10 "Table 10 ‣ Beyond Artificial Analysis Evaluations. ‣ Appendix A Model Intelligence Index ‣ Towards a Science of Scaling Agent Systems")). Despite Index = 75, single-agent performance varies substantially: GPT-5.2 achieves $P_{\text{SA}}=0.45$, while Gemini-3.0 Pro and Gemini-3.0 Flash achieve 0.36 and 0.34, respectively. However, best MAS performance converges ($0.48$–$0.50$), suggesting that multi-agent architectures may compensate for single-agent limitations. Consequently, MAS gains are substantially higher for Gemini models (+38.9% and +41.2%) compared to GPT-5.2 (+6.7%). This implies that Intelligence Index, while predictive within model families, may not be directly comparable across vendors, a limitation for cross-family extrapolation that future scaling laws should address.

Architecture Selection Accuracy. The scaling equation predicts Hybrid as optimal for all three models
($\hat{P}_{\text{Hybrid}}=0.560$), yet empirically Centralized and Decentralized architectures achieve superior performance. This
discrepancy reflects two factors: (1) linear extrapolation of the intelligence effect ($\hat{\beta}_{I}=0.126$) beyond its training
range, and (2) the model’s failure to capture Hybrid’s disproportionate overhead penalty at high capability levels.
The equation systematically over-predicts Hybrid performance (mean error $+37.0\%$) while achieving reasonable calibration for Centralized (mean error $+3.0\%$) and Decentralized (signed mean error $+8.8\%$). These results suggest that while the scaling equation provides well-calibrated predictions for moderate-overhead architectures, high-overhead configurations like Hybrid require architecture-specific corrections when extrapolating to frontier models.

## Appendix C Domain Complexity

We characterize domain complexity through an ordinal score $D\in[0,1]$ that captures the degree of sequential interdependence and empirical difficulty across evaluated benchmarks. This characterization enables systematic analysis of when multi-agent coordination yields performance benefits versus incurring prohibitive overhead.

### C.1 Complexity Score Assignment

Domain complexity $D\in[0,1]$ is assigned based on three empirical task properties, each normalized to $[0,1]$:

- •

  Sequential Interdependence. The degree to which task completion requires strictly ordered reasoning steps. Tasks with parallelizable subtask structure (e.g., Finance Agent) score low, while tasks requiring sequential constraint satisfaction (e.g., PlanCraft) score high.
- •

  State-Space Complexity. The extent of dynamic state evolution during task execution. Tasks with static or slowly evolving states score low, while tasks requiring tracking of rapidly changing environments (e.g., BrowseComp-Plus) score high.
- •

  Coordination Overhead Sensitivity. Empirically observed degradation under multi-agent coordination relative to single-agent baselines, reflecting how much the task’s structure penalizes inter-agent communication overhead.

The final score reflects the overall empirical difficulty profile, calibrated against observed MAS performance patterns across all configurations.

### C.2 Domain Characterisation

Table [11](https://arxiv.org/html/2512.08296v3#A3.T11 "Table 11 ‣ C.2 Domain Characterisation ‣ Appendix C Domain Complexity ‣ Towards a Science of Scaling Agent Systems") summarises the complexity scores and defining characteristics of each benchmark.

Table 11: Domain complexity scores and task characteristics.

|  |  |  |
| --- | --- | --- |
| Domain | $D$ | Characteristics |
| Workbench | 0.000 | Minimal sequential constraints; well-structured procedural reasoning with clear subtask boundaries; low coordination requirements |
| Finance Agent | 0.407 | Moderate decomposability; structured domains amenable to localised agent reasoning |
| PlanCraft | 0.419 | High sequential dependencies; constraint satisfaction requiring ordered reasoning steps |
| BrowseComp-Plus | 0.839 | Dynamic state evolution; complex visuospatial reasoning with interaction-heavy environments |
| SWE-bench Verified | 0.255 | Decomposable software engineering tasks; multi-step codebase exploration with test feedback; high tool count (7) |
| Terminal-Bench | 0.414 | Diverse CLI tasks with varying difficulty; Docker-based environments; low tool count (2) |

### C.3 Critical Threshold

Our analysis identifies a critical complexity threshold at $D\approx 0.40$. Below this threshold, multi-agent architectures yield net positive returns through effective task decomposition and parallel reasoning. Above this threshold, coordination overhead consumes computational resources otherwise allocated to reasoning, resulting in performance degradation. This finding suggests that the suitability of multi-agent approaches is fundamentally constrained by domain-intrinsic properties rather than architectural sophistication alone.

## Appendix D Datasets

We evaluate our agent systems across six agentic benchmarks requiring multi-step reasoning and tool interaction. Each dataset emphasizes different aspects of agentic behavior: information retrieval, domain expertise, planning, task decomposition, software engineering, and terminal-based task execution.

#### Finance Agent.

We use the Finance Agent benchmark [[33](https://arxiv.org/html/2512.08296v3#bib.bib8)], comprising 50 finance questions requiring domain expertise and multi-step analysis. Tasks include earnings analysis, financial metric calculations, and market trend interpretation. Each instance includes expert-provided rubrics for structured evaluation. Questions typically require 15-30 minutes of expert time, indicating substantial complexity.

#### BrowseComp Plus.

BrowseComp Plus [[32](https://arxiv.org/html/2512.08296v3#bib.bib7)] contains 100 web browsing tasks requiring multi-website information synthesis. Tasks include comparative analysis, fact verification, and
multi-source research across the web. Each instance requires agents to navigate multiple websites, extract relevant details, and synthesize findings. The dataset uses LLM-based evaluation comparing agent responses against ground truth answers with confidence scoring.

#### WorkBench.

WorkBench [[34](https://arxiv.org/html/2512.08296v3#bib.bib5)] evaluates business task automation through function calling sequences. The dataset covers five domains: analytics, calendar management, email
operations, project management, and customer relationship management. Success requires executing correct tool sequences to accomplish realistic business workflows. Evaluation follows outcome-centric assessment, measuring exact match between predicted and expected function call sequences. The dataset supports 100 distinct business scenarios with tolerance for minor date variations.

#### Plancraft.

Plancraft [[21](https://arxiv.org/html/2512.08296v3#bib.bib9)] focuses on sequential planning in Minecraft environments. Agents must craft target items by determining optimal action sequences using available inventory and crafting recipes. Tasks require multi-step reasoning about dependencies, resource management, and action ordering. The dataset uses environment-determined success
metrics based on successful item crafting within step limits. We use the plancraft-test subset containing focused planning challenges.

#### SWE-bench Verified.

SWE-bench Verified [[20](https://arxiv.org/html/2512.08296v3#bib.bib30)] evaluates software engineering capabilities through real-world GitHub issue resolution. Each instance provides a repository snapshot and issue description; agents must produce a patch that resolves the issue and passes the repository’s test suite. The benchmark provides 7 tools including bash execution, file editing, directory navigation, search, and test execution, requiring multi-step codebase exploration, hypothesis generation, and iterative debugging. We evaluate on a 20-instance subset selected via deterministic shuffle (seed 42) from the 500-instance verified split, balancing computational cost with coverage across repository diversity.

#### Terminal-Bench.

Terminal-Bench [[25](https://arxiv.org/html/2512.08296v3#bib.bib31)] evaluates CLI task execution across diverse system administration, security, machine learning, and debugging scenarios. Each instance specifies a terminal task with a Docker-based evaluation environment and objective success criteria. Agents interact through 2 tools (bash command execution and answer submission), requiring sustained environmental interaction under varying time limits. We evaluate on the first 20 instances from the 86-instance benchmark, covering tasks ranging from file manipulation and network configuration to model training and system diagnostics.

## Appendix E Implementation Details

### E.1 Technical Infrastructure

Our implementation uses LiteLLM (<https://www.litellm.ai/>) for unified API access across model providers and LangChain (<https://www.langchain.com/>) for agent orchestration and tool integration. LiteLLM provides standardized interfaces for OpenAI, Gemini, and Anthropic models, enabling seamless model switching and comparison. LangChain facilitates tool binding, conversation management, and structured prompting.

#### API Integration.

We access LLMs through provider-specific APIs: OpenAI API for GPT models (gpt-5, gpt-5-mini, gpt-5-nano), GenAI API for Gemini models (gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash), and Anthropic API for Claude models (claude-4.5-sonnet, claude-4.0-sonnet, claude-3.7-sonnet). Our implementation includes intelligent API key rotation across multiple keys per provider to handle rate limiting and quota management. Context window management automatically truncates conversation history when token limits are approached.

#### Tool Environment.

Each dataset defines its tool ecosystem through environment configurations. Tools include web search (Tavily, <https://tavily.com/>), code execution (Python REPL), mathematical operations, and task
completion markers. Tool definitions use LangChain’s BaseTool interface with structured input schemas and execution methods. Tools are dynamically bound to LLM instances using
function calling capabilities when available.

### E.2 Agent Configuration

#### Architecture Parameters.

Single agents use maximum 10 iterations per instance. Independent multi-agent systems deploy 3 agents with synthesis-only coordination. Centralized systems employ 3 sub-agents with 1 orchestrator across maximum 5 orchestration rounds, with 3 iterations per agent per round. Decentralized systems run 3 agents through 3 debate rounds with 3 iterations per round. Hybrid systems combine centralized orchestration with limited peer communication phases.

#### Heterogeneous Models.

Our framework supports heterogeneous configurations where different agent roles use different models. Orchestrators can use high-capability models (e.g., GPT-5) while sub-agents use
efficient models (e.g., Gemini-2.0 Flash). The LLMConfig class manages model assignment with automatic LLM instance creation for each agent role. Decentralized systems can assign
different models to different workers for diversity.

### E.3 Prompt Compilation System

We implement a structured prompting system supporting named templates and variable interpolation. Prompts are defined in YAML files with base templates and role-specific extensions.
The compilation process performs template variable replacement using double-brace syntax (variable) and supports conditional template selection based on agent type and conversation state.

#### Dataset Integration.

Each dataset provides shared prompt templates containing task-specific instructions and examples. Dataset instances contribute prompt variables including problem descriptions,
context, and constraints. The prompt compilation system merges agent prompts with dataset templates, ensuring consistent instruction delivery across architectures while maintaining task specificity.

### E.4 Evaluation Methodology

#### Sample Sizes.

We evaluate on dataset subsets balancing computational cost with statistical significance: Finance Agent (50 instances), BrowseComp Plus (100 instances), WorkBench (100 instances), Plancraft (100 instances), SWE-bench Verified (20 instances, deterministic shuffle with seed 42 from 500), and Terminal-Bench (20 instances, first-$N$ from 86). The smaller subsets for SWE-bench Verified and Terminal-Bench reflect the computational cost of Docker-based evaluation environments; bootstrap 95% confidence intervals are reported in Table [16](https://arxiv.org/html/2512.08296v3#A6.T16 "Table 16 ‣ Appendix F SWE-bench Verified and Terminal-Bench Results ‣ Towards a Science of Scaling Agent Systems"). Instance selection ensures representative coverage of task types and difficulty levels within each benchmark.

#### Restrictions and Controls.

All experiments use identical tool interfaces and observation structures across architectures to eliminate external feedback confounds. Context window management applies consistent truncation policies. API rate limiting and retry mechanisms ensure fair resource allocation. Evaluation uses frozen model weights without fine-tuning to measure architectural effects independently of model optimization.

### E.5 Information Gain Computation

Information gain $\Delta\mathcal{I}$ quantifies the reduction in task uncertainty achieved through agent coordination. We estimate this via Bayesian posterior variance reduction:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\Delta\mathcal{I}=\frac{1}{2}\log\frac{\text{Var}[Y|\mathbf{s}_{\text{pre}}]}{\text{Var}[Y|\mathbf{s}_{\text{post}}]},$$ |  | (2) |

where $Y\in\{0,1\}$ is the task success indicator, $\mathbf{s}_{\text{pre}}$ is the agent’s state representation before coordination (initial reasoning trace), and $\mathbf{s}_{\text{post}}$ is the state after coordination (final aggregated output). Variances are estimated via Monte Carlo sampling: we generate $K=10$ reasoning traces per state using temperature $\tau=0.7$ and compute empirical variance of predicted success probabilities. For binary outcomes, this reduces to:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$\text{Var}[Y|\mathbf{s}]=\hat{p}(\mathbf{s})(1-\hat{p}(\mathbf{s})),$$ |  | (3) |

where $\hat{p}(\mathbf{s})$ is the mean predicted success probability across samples.

![Refer to caption](https://arxiv.org/html/2512.08296v3/main_exp.png)


Figure 6: Agent scaling dynamics across model capability.
Performance across six benchmarks show best-performing multi-agent system versus single-agent baselines by Intelligence Index. OpenAI and Google show cooperative scaling in structured tasks (Finance Agent, Workbench). Anthropic models show diminished or negative returns in open-ended environments (PlanCraft, BrowseComp-Plus). SWE-bench Verified and Terminal-Bench show patterns consistent with the capability-saturation threshold: SWE-bench (high SAS baselines) shows limited MAS gains, while Terminal-Bench (lower baselines) shows mixed results with low tool count limiting coordination benefits.

## Appendix F SWE-bench Verified and Terminal-Bench Results

Table 12: Heterogeneous vs. homogeneous agent configurations on BrowseComp-Plus. Centralized heterogeneous configurations uniformly underperform the stronger model’s homogeneous baseline; decentralized configurations show modest gains largely attributable to the stronger constituent model.

|  |  |  |  |
| --- | --- | --- | --- |
| Architecture | Configuration | Accuracy | $\Delta$ vs. Homo (strong) |
| Centralized | GPT-5 orch + GPT-5-nano sub | 0.19 | $-$0.15 |
| Centralized | GPT-5-nano orch + GPT-5 sub | 0.21 | $-$0.13 |
| Centralized | Sonnet-4.5 orch + Sonnet-3.7 sub | 0.37 | $-$0.06 |
| Centralized | Sonnet-3.7 orch + Sonnet-4.5 sub | 0.42 | $-$0.01 |
| Centralized | Gemini-2.5-Pro orch + 2.0-Flash sub | 0.18 | $-$0.19 |
| Centralized | Gemini-2.0-Flash orch + 2.5-Pro sub | 0.23 | $-$0.14 |
| Centralized | Gemini-2.5-Pro orch + GPT-5 sub | 0.17 | $-$0.20 |
| Decentralized | 2 GPT-5 + 1 GPT-5-nano | 0.56 | $+$0.06 |
| Decentralized | 1 GPT-5 + 2 GPT-5-nano | 0.51 | $+$0.01 |
| Decentralized | 2 Sonnet-4.5 + 1 Sonnet-3.7 | 0.45 | $+$0.02 |
| Decentralized | 1 Sonnet-4.5 + 2 Sonnet-3.7 | 0.48 | $+$0.05 |
| Decentralized | 2 Gemini-2.5-Pro + 1 2.0-Flash | 0.47 | $+$0.04 |
| Decentralized | 1 Gemini-2.5-Pro + 2 2.0-Flash | 0.37 | $-$0.06 |




Table 13: Regression fit under alternative capability metrics (6-benchmark model, $N=260$). The Agentic Capability Index (ACI) achieves the best cross-validated fit with zero finding reversals.

|  |  |  |  |
| --- | --- | --- | --- |
| Capability Metric | $R^{2}_{\text{train}}$ | $R^{2}_{\text{CV}}$ | AIC |
| Intelligence Index | 0.463 | 0.373 | $-$236.3 |
| Agentic Capability Index (ACI) | 0.481 | 0.413 | $\mathbf{-244.8}$ |
| Per-dataset SA Baseline | 0.372 | 0.247 | $-$202.0 |




Table 14: Naive vs. cluster-robust $p$-values for key predictors (6-benchmark model, $N=260$, $G=6$ clusters). Predictors varying at the dataset level show substantial SE inflation under cluster-robust inference.

|  |  |  |  |
| --- | --- | --- | --- |
| Predictor | Naive $p$ | Robust $p$ | Status |
| single_agent_baseline | 0.001 | 0.004 | Survives |
| error_x_baseline | 0.022 | 0.030 | Survives |
| log_tools | $<$0.001 | 0.172 | Inflated |
| intelligence_centered | 0.008 | 0.059 | Inflated |
| efficiency_x_tools | 0.002 | 0.205 | Inflated |
| baseline_x_agents | 0.004 | 0.105 | Inflated |




Table 15: Holm–Bonferroni multiple comparison correction (19 hypotheses, $\alpha=0.05$). Three predictors survive family-wise error rate correction.

|  |  |  |  |
| --- | --- | --- | --- |
| Predictor | Raw $p$ | Holm $p$ | Bonferroni $p$ |
| log_tools | $<$0.001 | $<$0.001 | $<$0.001 |
| single_agent_baseline | 0.001 | 0.018 | 0.019 |
| efficiency_x_tools | 0.002 | 0.026 | 0.030 |
| intelligence_centered | 0.008 | 0.056 | 0.066 |
| baseline_x_agents | 0.004 | 0.084 | 0.106 |




Table 16: SWE-bench Verified and Terminal-Bench resolution rates with 95% bootstrap confidence intervals ($n=20$ instances, 10,000 resamples). Values shown as point estimate [ lower, upper ].

|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
|  | Single | Centralized | Decentralized | Hybrid | Independent |
| SWE-bench Verified | | | | | |
| gemini-2.0-flash | 15 [0, 30] | 25 [10, 45] | 25 [5, 45] | 30 [10, 50] | 40 [20, 60] |
| gemini-2.5-flash | 50 [30, 70] | 35 [15, 55] | 35 [15, 55] | 45 [25, 65] | 40 [20, 60] |
| gemini-2.5-pro | 70 [50, 90] | 55 [35, 75] | 45 [25, 65] | 60 [40, 80] | 50 [30, 70] |
| gemini-3-flash | 80 [60, 95] | 75 [55, 95] | 80 [60, 95] | 75 [55, 95] | 60 [40, 80] |
| gpt-5-nano | 5 [0, 15] | 35 [15, 55] | 35 [15, 55] | 30 [10, 50] | 25 [10, 45] |
| gpt-5-mini | 40 [20, 60] | 50 [30, 70] | 30 [10, 50] | 50 [30, 70] | 45 [25, 65] |
| gpt-5 | 65 [45, 85] | 60 [40, 80] | 70 [50, 90] | 55 [35, 75] | 55 [35, 75] |
| claude-sonnet-4 | 70 [50, 90] | 50 [30, 70] | 55 [35, 75] | 45 [25, 65] | 30 [10, 50] |
| claude-sonnet-4-5 | 75 [55, 95] | 70 [50, 90] | 70 [50, 90] | 70 [50, 90] | 55 [35, 75] |
| Terminal-Bench | | | | | |
| gemini-2.0-flash | 15 [0, 30] | 15 [0, 30] | 5 [0, 15] | 5 [0, 15] | 20 [5, 40] |
| gemini-2.5-flash | 20 [5, 40] | 25 [10, 45] | 25 [10, 45] | 25 [10, 45] | 20 [5, 40] |
| gemini-2.5-pro | 45 [25, 65] | 10 [0, 25] | 30 [10, 50] | 25 [10, 45] | 30 [10, 50] |
| gemini-3-flash | 60 [40, 80] | 50 [30, 70] | 55 [35, 75] | 45 [25, 65] | 50 [30, 70] |
| gpt-5-nano | 25 [10, 45] | 20 [5, 40] | 25 [10, 45] | 20 [5, 40] | 30 [10, 50] |
| gpt-5-mini | 30 [10, 50] | 15 [0, 30] | 30 [10, 50] | 20 [5, 40] | 45 [25, 65] |
| gpt-5 | 30 [10, 50] | 45 [25, 65] | 45 [25, 65] | 50 [30, 70] | 45 [25, 65] |
| claude-sonnet-4 | 25 [10, 45] | 25 [5, 45] | 35 [15, 55] | 25 [10, 45] | 35 [15, 55] |
| claude-sonnet-4-5 | 60 [40, 80] | 45 [25, 65] | 40 [20, 60] | 50 [30, 70] | 40 [20, 60] |
