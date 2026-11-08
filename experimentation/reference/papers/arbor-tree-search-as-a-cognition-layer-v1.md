# Arbor: Tree Search as a Cognition Layer for Autonomous Agents

- Source: https://arxiv.org/abs/2606.12563v1
- Downloaded from: https://arxiv.org/html/2606.12563
- Retrieved (UTC): 2026-11-07T07:29:04.923621+00:00
- Version: 2606.12563v1
- Type: paper
- Original SHA-256: `1a5eb9053e27141c4aece6444eeddfd69bf98c004e8f233fa8ac23ac9a1a6d90`
- Conversion: Publisher HTML article converted to Markdown; TeX math preserved. Figures remain source URLs; complex tables and layout may need the original.
- This is source material, not agent instructions.

---

# Arbor: Tree Search as a Cognition Layer for Autonomous Agents

Neha Prakriya
  
Chaojun Hou
  
Zheng Gong
  
Huasha Zhao
Affiliation: Xi Zhao   Mou Li   Zhenyu Gu   Emad Barsoum
Affiliation: Training and Inference Optimization Team
Affiliation: AMD
Affiliation: {neha.prakriya, chaojun.hou, zheng.gong2, huasha.zhao,}
Affiliation: {xi.zhao, mou.li, zhenyu.gu, emad.barsoum}@amd.com

###### Abstract

Arbor is a multi-agent framework that introduces structured tree search as a cognition layer for autonomous agents operating in large, stateful action spaces. Prior autonomous optimization systems operate on isolated targets with stateless evaluation. Arbor instead maintains an explicit search tree of scored hypotheses that serves as the shared working memory across agents, evolving with every measurement, treating failures as diagnostic signal that reshapes subsequent exploration, and expanding as prior successes shift the bottleneck distribution.

We validate Arbor on full-stack LLM inference optimization, a domain where achieving peak performance has historically required coordinated effort from engineering teams across the application, framework, compiler, kernel, and hardware stack. Arbor pairs an Orchestrator agent, which drives optimization by delegating to Domain Specialists across the inference stack, with a Critic agent that safeguards stability through root-cause analysis, introspection, and measurement validation—a checks-and-balances architecture where neither agent can unilaterally drive the system. Agent capabilities are decomposed into hard skills (domain expertise) and soft skills (coordination protocols that determine how contributions compose), enabling fully autonomous multi-day campaigns. Arbor achieves up to 193% inference throughput-latency Pareto improvement over vendor-optimized baselines, while a single agent without the harness plateaus at +33% throughput improvement and crashes irrecoverably within hours. Arbor generalizes to multiple generations of hardware platform, and run-to-run variance is within 2 percentage points demonstrating that the method is hardware-agnostic and reproducible.

## 1 Introduction

Recent advances in LLM-based code optimization have demonstrated that autonomous agents can discover high-quality solutions for isolated computational targets. AlphaEvolve [Novikov et al. (2025)](https://arxiv.org/html/2606.12563#bib.bib2) employs LLM-guided evolutionary search to synthesize algorithms that improve data center scheduling heuristics and matrix multiplication procedures. AVO [Chen et al. (2026)](https://arxiv.org/html/2606.12563#bib.bib3) extends this paradigm by replacing prescribed mutation operators with a self-directed coding agent, yielding attention kernels that exceed the throughput of cuDNN and FlashAttention-4 on NVIDIA Blackwell GPUs. Multi-agent variants such as KernelSkill [Sun et al. (2026)](https://arxiv.org/html/2606.12563#bib.bib11), Astra [Wei et al. (2025)](https://arxiv.org/html/2606.12563#bib.bib12), and AccelOpt [Zhang et al. (2026)](https://arxiv.org/html/2606.12563#bib.bib13) introduce role specialization and optimization memory for GPU kernel synthesis, but remain scoped to individual operators.

The performance of production software systems, however, arises from the interaction of many layers. For example, correcting a dispatch path in the attention module may expose that the underlying kernel lacks shape-specific tuning for the model’s head dimension, which in turn triggers a resource-pressure condition that manifests as a serving-layer regression under load. This single optimization attempt traverses three distinct layers of the stack, each invisible until the preceding one is resolved, each demanding different expertise for intervention, and each capable of invalidating progress made at another. Existing approaches do not address this compositional structure. Compiler autotuners [Chen et al. (2018)](https://arxiv.org/html/2606.12563#bib.bib4); [Zheng et al. (2020)](https://arxiv.org/html/2606.12563#bib.bib5) search over operator schedules within a single layer. Multi-agent coding frameworks [Dong et al. (2026)](https://arxiv.org/html/2606.12563#bib.bib14); [Hong et al. (2024)](https://arxiv.org/html/2606.12563#bib.bib9) distribute subtasks across agents but still operate on a single target. Closest to our setting, [Yu and Ren (2026)](https://arxiv.org/html/2606.12563#bib.bib10) assign specialized LLM agents to non-overlapping subsystems of a million-line EDA codebase, but do not compose interventions across subsystem boundaries or diagnose failures across layers. None of these systems tolerate the cascading failures that cross-layer exploration produces or extract reusable signal from those failures.

As agents are applied to increasingly complex systems, the core challenge shifts from candidate generation to candidate selection: navigating large, stateful action spaces where each intervention reshapes the landscape. When an optimization causes a system failure, the failure must be diagnosed and that diagnosis must propagate back as a constraint on subsequent search. When a successful intervention shifts the bottleneck to a different layer, the search must detect this shift through re-profiling and expand into a previously nonexistent region of the action space. Isolated-target optimization systems are not designed for these requirements.

We present Arbor, a framework that formulates cross-layer performance optimization as heuristic-scored tree search over a dynamically expanding action space. Arbor maintains optimization state as an explicit search tree: the agent profiles to identify bottlenecks across all stack layers, constructs a scored tree of candidate interventions, and explores depth-first, reshaping the tree after every measurement as new bottlenecks are exposed. Regressions trigger introspection that distinguishes implementation errors from fundamentally unproductive directions, spawning refined sub-actions when the idea warrants further pursuit. Crashes trigger root-cause analysis that diagnoses the failure mechanism and converts it into constraints under which the optimization can be retried.

For sustained campaigns running hours to days, Arbor structures its agents the way effective engineering organizations structure their teams. An Orchestrator—analogous to a tech lead—drives optimization by delegating to Domain Specialists across the stack (kernel optimization, framework tuning, communication topology, compiler configuration, operator dispatch). A Critic—analogous to a quality assurance function—safeguards stability and measurement integrity through root-cause analysis, introspection, and regression monitoring. These two agents operate with checks and balances: the Orchestrator pursues aggressive performance gains while the Critic enforces the constraints that keep multi-day sessions viable. Their collaboration produces outcomes neither achieves alone. Agent capabilities are decomposed into *hard skills* (what each agent specializes in) and *soft skills* (how they coordinate: resource arbitration, delegation at expertise boundaries, and incorporating each other’s findings). A persistent knowledge base accumulates strategies and failure modes across sessions, enabling warm-start transfer to new models.
Arbor has the potential to reduce operating cost and carbon intensity of existing LLM deployment. It can also lower the barrier to bringing up new hardware or models in production.

We evaluate Arbor on LLM inference serving across six production models on AMD Instinct GPUs (MI355X and MI300X). Our contributions are:

- •

  We formulate cross-layer performance optimization as *stateful tree search* over a dynamically expanding action space, where the tree serves as the agents’ shared working memory, failures propagate as constraints on child nodes, and prior successes trigger re-profiling that expands the search frontier.
- •

  We introduce a multi-agent architecture with explicit *checks and balances*: an Orchestrator that drives optimization through Domain Specialists and a Critic that safeguards stability and measurement integrity, ensuring neither aggressive exploration nor conservative constraint enforcement dominates.
- •

  We decompose agent capabilities into *hard skills* (domain expertise) and *soft skills* (coordination protocols), backed by a persistent knowledge base that enables warm-start transfer across sessions.
- •

  Across six production models on MI355X, Arbor achieves +40% to +193% throughput improvement over optimized baselines in days of fully autonomous operation. Cross-generation validation on MI300X (+62–99%) and independent replications converging within 2 percentage points confirm reproducibility.

## 2 Related Work

#### LLM-guided code optimization.

FunSearch [Romera-Paredes et al. (2024)](https://arxiv.org/html/2606.12563#bib.bib1) introduced LLM-guided
evolutionary search over short functions. AlphaEvolve [Novikov et al. (2025)](https://arxiv.org/html/2606.12563#bib.bib2)
extends this to full codebases, and AVO [Chen et al. (2026)](https://arxiv.org/html/2606.12563#bib.bib3) replaces
the fixed evolutionary pipeline with an autonomous agent loop,
producing attention kernels that surpass cuDNN and FlashAttention-4
on Blackwell GPUs. These systems optimize isolated targets with
self-contained evaluation. Arbor addresses a setting in which
interventions span the full software stack and actions at one layer
can invalidate work at another.

#### Multi-agent kernel optimization.

KernelSkill [Sun et al. (2026)](https://arxiv.org/html/2606.12563#bib.bib11),
Astra [Wei et al. (2025)](https://arxiv.org/html/2606.12563#bib.bib12),
AccelOpt [Zhang et al. (2026)](https://arxiv.org/html/2606.12563#bib.bib13), and
STARK [Dong et al. (2026)](https://arxiv.org/html/2606.12563#bib.bib14) introduce role
specialization and persistent optimization memory for GPU kernel
synthesis. These systems demonstrate that multi-agent coordination
improves single-kernel outcomes, but all operate within a single
layer: a kernel that passes local micro-benchmarks may still cause
server-level regressions due to layout conflicts or dispatch
interactions that only manifest under end-to-end load
(Section [4.4](https://arxiv.org/html/2606.12563#S4.SS4.SSS0.Px2 "End-to-end validation gates. ‣ 4.4 Analysis ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")).

#### Multi-agent software systems.

ChatDev [Qian et al. (2024)](https://arxiv.org/html/2606.12563#bib.bib8) and MetaGPT [Hong et al. (2024)](https://arxiv.org/html/2606.12563#bib.bib9)
organize agents into complementary roles for software development. [Yu and Ren (2026)](https://arxiv.org/html/2606.12563#bib.bib10) assign
specialized agents to non-overlapping subsystems of a million-line
EDA codebase. Arbor differs in that optimization is depth-first tree
search with dynamic expansion—each outcome generates scored
sub-actions and re-profiling discovers new bottlenecks—and agents
are organized by cognitive function (driving optimization, executing
domain interventions, safeguarding stability) rather than by code
territory, enabling cross-layer diagnosis within one loop iteration.

## 3 Methodology

We formalize full-stack optimization as heuristic tree search over a dynamically expanding action space (§[3.1](https://arxiv.org/html/2606.12563#S3.SS1 "3.1 Problem Formulation ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")), describe the search procedure and the invariants it enforces (§[3.2](https://arxiv.org/html/2606.12563#S3.SS2 "3.2 Heuristic Tree Search ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")), present a multi-agent architecture in which domain specialists are
constructed dynamically at runtime rather than maintained as fixed agents
(§[3.3](https://arxiv.org/html/2606.12563#S3.SS3 "3.3 Multi-Agent Architecture ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")), and introduce a persistent knowledge base that enables cross-session transfer (§[3.4](https://arxiv.org/html/2606.12563#S3.SS4 "3.4 Knowledge Base ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")).

### 3.1 Problem Formulation

We model optimization as search over a tree $\mathcal{T}=(V,E)$ rooted at a profiled baseline. Each node represents an action and its outcome: kept, reverted, or crashed. The path from root to any node defines the cumulative sequence of interventions that produced the current configuration. The search state $\mathcal{S}_{t}$ at time $t$ consists of the tree, a scored queue of candidate actions yet to be tried, the history of completed actions with their outcomes and diagnostic annotations, and the current assignment of work across agents. The tree expands dynamically: profiling after a successful action reveals previously invisible bottlenecks, generating new branches that did not exist at initialization.

### 3.2 Heuristic Tree Search

#### Search loop.

The Orchestrator executes a depth-first loop over the scored action tree. Each iteration proceeds as follows: (1) profile the current system state to identify bottlenecks and their GPU time shares; (2) score all candidate actions using the heuristic $h(a)$ and select the highest-scored action; (3) dispatch the action to the appropriate Domain Specialist for implementation; (4) gate the returned result through accuracy verification and end-to-end benchmarking; (5) update the tree based on the outcome—kept actions become the new baseline for subsequent profiling, reverted actions record diagnostic annotations, and crashed actions trigger Critic root-cause analysis; (6) re-score the remaining candidates, since the bottleneck distribution may have shifted. The loop continues until action scores fall below a threshold or a wall-clock budget is exhausted. Backtracking to the last verified state occurs automatically after any revert or crash, ensuring the system is always in a known-good configuration before the next action is attempted.

#### Scoring.

Each candidate action $a$ is scored by a heuristic balancing expected gain against cost and risk, with an exploration bonus:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$h(a)=\frac{g(a)}{c(a)}\cdot(1-r_{\text{acc}})\cdot(1-r_{\text{crash}})\cdot m_{\text{gap}}+C\sqrt{\frac{\ln N}{1+n_{\text{cat}}}}$$ |  | (1) |

where $g(a)$ is expected gain, estimated as the product of the target kernel’s profiled GPU time share and a category-specific speedup prior. When the knowledge base (§[3.4](https://arxiv.org/html/2606.12563#S3.SS4 "3.4 Knowledge Base ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")) contains relevant history, priors are drawn from recorded outcomes of similar actions on comparable models and hardware; otherwise, the Orchestrator estimates them from the profiling context and its own accumulated experience within the campaign. $c(a)$ is estimated wall-clock cost, accounting for the actual time required to implement the change, restart the inference server, and run end-to-end benchmarks on the target model. $r_{\text{acc}}$ and $r_{\text{crash}}$ are empirical failure rates for the action’s category, initialized from knowledge base priors when available and refined with each observed outcome as the campaign progresses. $m_{\text{gap}}$ is an urgency multiplier that scales with the remaining gap to a throughput target (ranging from $1.0$ when the target is met to $2.0$ when the gap is large). The UCB-style second term encourages exploration of under-sampled action categories: $N$ is the total number of actions evaluated, $n_{\text{cat}}$ is the number of attempts in the same category, and $C$ is a constant. All terms update after every action: re-profiling revises $g(a)$ as bottlenecks shift, outcomes update $r_{\text{acc}}$ and $r_{\text{crash}}$, and the tree is re-scored periodically. Because the scoring penalizes high-cost, high-risk actions, the search naturally exhausts upper-stack interventions before committing to deeper changes requiring specialist refinement—a transition detected empirically through re-profiling rather than specified *a priori*.

This scoring mechanism defines *what* to try next; the multi-agent architecture described below determines *how* each action is executed and verified.

### 3.3 Multi-Agent Architecture

Figure 1: Arbor system architecture. The Orchestrator (left) drives the search loop: profiling the workload, constructing a scored action stack through deep analysis, and iterating through a depth-first cycle of implementation, accuracy gating, and end-to-end benchmark verification before re-scoring the tree. Domain Specialist agents (middle) are constructed dynamically at runtime by the Orchestrator. They receive optimization targets from the Orchestrator and operate asynchronously across kernel, framework, communication, compiler, and dispatch layers, each performing iterative refinement with local validation before returning merge-ready patches. The Critic (right) operates as a check on the Orchestrator, monitoring the full optimization trajectory and providing strategic guidance through four sub-capabilities: *Guardrails* (measurement integrity), *Root-cause Analysis* (crash and failure diagnosis), *Introspection* (regression evaluation and constrained retry guidance), and *Stability Monitoring* (long-horizon health tracking). The Knowledge Base (bottom) persists lessons across sessions to inform scoring priors and enable warm-start transfer.

Sustained full-stack campaigns run for days, exceeding the capacity of any single agent: the search loop requires decisions in minutes, domain-specific optimization demands iterative refinement over hours, and failure analysis must observe patterns across an event history that grows beyond any single context window. Arbor addresses this through a system of checks and balances (Figure [1](https://arxiv.org/html/2606.12563#S3.F1 "Figure 1 ‣ 3.3 Multi-Agent Architecture ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")): an Orchestrator that aggressively drives optimization by delegating to Domain Specialists across the stack, and a Critic that safeguards stability, diagnoses failures, and constrains exploration when it threatens session viability. Neither agent dominates unilaterally—the Orchestrator cannot retain changes the Critic identifies as unstable, and the Critic cannot block exploration without diagnostic evidence. In practice, this means the system can deliberately sacrifice short-term throughput for session stability—a trade-off no single agent would make, but one that unlocks gains only reachable through sustained exploration (demonstrated in Section [4.4](https://arxiv.org/html/2606.12563#S4.SS4.SSS0.Px1 "Stability–throughput trade-offs over long horizons. ‣ 4.4 Analysis ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")).

The key design question is not just *what* each agent does, but *how they influence each other’s behavior*. We decompose agent capabilities into *hard skills* (domain expertise: what each agent specializes in) and *soft skills* (collaboration protocols: when to delegate work, how to incorporate another agent’s findings, and when to escalate problems beyond its own competence). Table [1](https://arxiv.org/html/2606.12563#S3.T1 "Table 1 ‣ 3.3 Multi-Agent Architecture ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents") summarizes both for each agent.

Table 1: Agent hard skills (domain expertise) and soft skills (collaboration behaviors).

| Agent | Hard Skills | Soft Skills |
| --- | --- | --- |
| Orchestrator | Profiling, scoring, eval gating | Delegates to specialists; integrates Critic findings |
| Domain Spec. | Dynamically-constructed per-task; domain skills composed from KB, context, prior outcomes | Validated patches; honor Critic constraints |
| Critic | RCA, introspection, guardrails, stability monitoring | Publishes constraints; enforces measurement integrity |

All agents read and write the shared search state $\mathcal{S}_{t}$, enabling each agent’s output to reshape the others’ subsequent decisions.

The Orchestrator maintains the search tree and drives the optimization loop: it profiles the system to identify bottlenecks, proposes candidate interventions, scores them, and dynamically constructs a Domain Specialist for each, composing the agent’s prompt from the target, hardware context, and relevant knowledge base entries. The Orchestrator does not implement optimizations itself—its role is to decide *what* to try, *who* should implement it, and *whether* the result passes end-to-end verification. Every outcome returned by a specialist is gated through accuracy and benchmark verification before updating the tree, since optimizations that improve local metrics can regress the full system (Section [4.4](https://arxiv.org/html/2606.12563#S4.SS4.SSS0.Px2 "End-to-end validation gates. ‣ 4.4 Analysis ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")). Diagnostic findings from the Critic update scoring priors or prune entire branches from further exploration.

Domain Specialists are not pre-defined agents but are *constructed dynamically at runtime* by the Orchestrator for each optimization target. When dispatching an action, the Orchestrator assembles a full agent prompt by composing the task mandate with hardware context (GPU type, memory bandwidth, tensor parallelism degree), relevant entries retrieved from the Knowledge Base (§[3.4](https://arxiv.org/html/2606.12563#S3.SS4 "3.4 Knowledge Base ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")), the history of prior attempts on similar targets (what worked, what failed, and known pitfalls), and a structured communication protocol for reporting results incrementally. The resulting specialist is an autonomous agent scoped to a specific layer of the stack—kernel, framework, communication, compiler, or dispatch—but its skills are shaped entirely by the composed prompt rather than by static code. This construction enables the system to adapt specialist behavior to the current campaign context: the same “kernel” specialist receives different domain knowledge, different failure histories, and different hardware constraints depending on the model and platform under optimization. Multiple specialists are dispatched in parallel, with GPU-aware scheduling that defers GPU-requiring tasks when the pool is exhausted and launches CPU-only research tasks immediately. Each specialist follows a common protocol: iterate locally with domain-appropriate validation, incorporate constraints published by the Critic, and return a validated patch for end-to-end evaluation. For example, Kernel Specialists dispatch each target to multiple LLM backends in parallel, validating results through a four-step local test gate (compilation, correctness, micro-benchmark, adversarial inputs) before returning merge-ready patches.

The Critic operates over the full optimization trajectory rather than individual actions, providing the counterweight that keeps aggressive optimization from destabilizing the system. It exercises four complementary functions: *guardrails* that enforce measurement integrity and detect benchmark anomalies (e.g., mismatched parameters that invalidate comparisons); *root-cause analysis* that diagnoses crashes and regressions by correlating evidence across stack layers, enabling constrained retries rather than blind repetition; *introspection* that evaluates whether a reverted action’s underlying idea retains merit under a different implementation or prerequisite, spawning refined sub-actions when warranted; and *stability monitoring* that tracks system health across the session horizon, detecting degradation patterns invisible at the single-action level and publishing constraints that prevent all agents from revisiting unproductive regions.

Figure 2: Search tree for gpt-oss-120b (MoE 120B, MXFP4, AMD MI355X). The system explores from a profiled baseline of 4405 tok/s/GPU. Green nodes are kept; red nodes are reverted with diagnostic insight; crash nodes trigger root-cause analysis. Diagnostic boxes show Critic findings and introspection outcomes that reshape subsequent scoring. Re-profiling periodically reveals new bottlenecks, expanding the tree into branches that did not exist at initialization. Of 30 total actions, 9 are kept, 16 reverted with diagnostic insight, and 3 crash with recovery, reaching 6,515 tok/s/GPU.

Figure [2](https://arxiv.org/html/2606.12563#S3.F2 "Figure 2 ‣ 3.3 Multi-Agent Architecture ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents") illustrates this dynamic on
gpt-oss-120b (MoE 120B, MXFP4, MI355X), where 9 of 30 actions are
kept and periodic re-profiling keeps the search productive as
bottlenecks shift.

#### Coordination in practice.

In one representative episode of multi-agent coordination traced in Appendix [A](https://arxiv.org/html/2606.12563#A1 "Appendix A Walkthrough: Cross-Agent Diagnosis ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"), three consecutive server crashes appeared to be ZMQ deadlocks. The Critic requested device-level telemetry from a Domain Specialist, correlated fault patterns across all three incidents, and identified ksplit=4 as the true root cause—recovering +0.84% from work originally classified as unrecoverable.

### 3.4 Knowledge Base

A persistent knowledge base (KB) makes Arbor’s search cumulative across campaigns. Every action outcome is recorded during a campaign; the Orchestrator retrieves relevant entries by similarity to update the scoring priors $r_{\text{acc}}$, $r_{\text{crash}}$, and $g(a)$. At session close, raw traces are distilled into structured entries—validated techniques, failure modes, and parameter-level findings—organized for retrieval by model family or optimization category. Inherited failure modes prune branches before the first measurement, and parameter-level priors condition scoring on specific settings rather than broad categories, so each new campaign starts from a strictly stronger prior than the last. Beyond informing the scoring function, KB entries are directly composed into specialist agent prompts at construction time (§[3.3](https://arxiv.org/html/2606.12563#S3.SS3 "3.3 Multi-Agent Architecture ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")), so domain knowledge accumulated across campaigns shapes not only *what* the system tries next but *how* each specialist reasons about its assigned target.

## 4 Experiments

### 4.1 Setup

Arbor’s agents are powered by frontier-tier reasoning LLMs at the capability level of Claude Opus 4.6 / 4.7; the specific model assignment per agent role is dynamic and configurable. We evaluate on six production models served on AMD Instinct MI355X GPUs: gpt-oss-120b (MXFP4), DeepSeek-R1-0528 (FP8), MiniMax-M2.5 (FP8), GLM-5-FP8 (FP8), Qwen3.5-397B-A17B (FP8), and Kimi-K2.5 (MXFP4), using vLLM [Kwon et al. (2023)](https://arxiv.org/html/2606.12563#bib.bib6) or SGLang [Zheng et al. (2024)](https://arxiv.org/html/2606.12563#bib.bib7) with tensor parallelism from TP=1 to TP=8. Baselines are the InferenceX [SemiAnalysis (2026)](https://arxiv.org/html/2606.12563#bib.bib15) configurations, which reflect extensive manual optimization by engineering teams across the serving stack. Arbor starts from the same software versions and configurations as the baseline. We also present the generalization of Arbor across device generations through optimization runs on AMD Instinct MI300X in Appendix [B](https://arxiv.org/html/2606.12563#A2 "Appendix B Device Generalization of Arbor ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").

Arbor optimizes the throughput–interactivity Pareto frontier across concurrency levels 4 to 512 at varying sequence lengths. The primary metric is *output throughput* (tokens/s/GPU); each candidate is additionally gated on TTFT, TPOT, request completion rate, and accuracy ($<$1% degradation). After each kept change, a full concurrency sweep verifies that gains hold across operating points.

### 4.2 Main Results

Figure [3](https://arxiv.org/html/2606.12563#S4.F3 "Figure 3 ‣ 4.2 Main Results ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents") plots the throughput–interactivity Pareto frontier for each model before and after Arbor optimization. Following InferenceX [SemiAnalysis (2026)](https://arxiv.org/html/2606.12563#bib.bib15), we define *interactivity* as $1/\text{TPOT}$ (tokens per second per user), capturing the responsiveness experienced by each concurrent user. Plotting throughput against interactivity reveals the frontier operators navigate: rightward improves user experience, upward improves utilization, and the ideal optimization shifts the entire curve toward the upper right.

At the standard operating point (concurrency 64), Arbor improves output throughput over the vendor baseline by +48% on gpt-oss-120b, +90% on DeepSeek-R1-0528, +50% on MiniMax-M2.5, +193% on GLM-5-FP8, +40% on Qwen3.5-397B, and +60% on Kimi-K2.5. Across all six models, the Arbor-optimized curve dominates the baseline Pareto frontier: throughput increases at every interactivity level, not only at a single operating point.

The largest gains occur on models where Arbor identifies cross-layer interactions: on GLM-5-FP8, reducing tensor parallelism from TP=8 to TP=4 while co-optimizing the NSA attention kernel and MoE dispatch yields a 2.9$\times$ throughput improvement that no single-layer optimization could achieve. On DeepSeek-R1-0528, the +90% gain reflects the compound effect of MTP speculative decoding, CK GEMM kernel rewrites, fused allreduce, and configuration tuning discovered across the optimization journey.

Figure 3: Throughput vs. interactivity on AMD MI355X for six production models. Interactivity is $1/\mathrm{TPOT}$; higher is better on both axes. Percentages indicate output throughput gain at concurrency 64 relative to the InferenceX vendor baseline. All benchmarks use ISL = OSL = 1024.

Independent replications of the full campaign converge within 2 percentage points across runs and hardware generations (Appendix [C](https://arxiv.org/html/2606.12563#A3 "Appendix C Run-to-run variance ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")).

### 4.3 Ablation

Figure 4: Ablation on gpt-oss-120b (MXFP4, MI355X). Each curve
removes one component; all start from the same unoptimized baseline.
Full Arbor (+65%) sustains progress over 24 hours. A single-agent
baseline with the same tools and a propose-implement-test loop
(no tree search) crashes irrecoverably at hour 4. Without Domain
Specialists, progress exhausts at hour 6. Two independent runs
without the Critic both produce different violations: Run 1 skips
accuracy gating and accepts code changes that reduce accuracy to
0%; Run 2 reports inflated throughput by modifying the concurrency.

We ablate each architectural component on gpt-oss-120b under identical conditions (Figure [4](https://arxiv.org/html/2606.12563#S4.F4 "Figure 4 ‣ 4.3 Ablation ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")).

#### Without DFS search, Single-Agent Optimization (+33%).

A single unstructured agent makes fast initial progress but cannot recover from crashes. On gpt-oss-120b, it reached +33% within 3 hours but then crashed the server with a kernel dispatch change. Without a revert path to the last verified state, the session terminated irrecoverably at hour 4. This configuration represents the natural baseline: a single
frontier-tier LLM agent with the same tools, models, and hardware access, following a standard propose-implement-test loop.

#### Without Domain Specialists (+30%).

The Orchestrator operates as a single agent, both proposing and implementing changes directly. It makes fast initial progress on upper-stack modifications (configuration, parallelism, dispatch) but cannot sustain the iterative multi-round refinement needed for deep kernel optimization or complex framework modifications. The action space exhausts by hour 6. The gap between +30% and +65% quantifies the value of specialized depth within a full-stack campaign.

#### Without the Critic (+12.9% / +16.5% valid).

Across two independent runs, removing the Critic yields only +12.9% and +16.5% *valid* improvement. Both runs exhibit violations the Critic would have prevented: Run 1 accepted an optimization that skips accuracy gating and reduced GSM8K accuracy to 0%—a catastrophic correctness failure detected only in post-hoc evaluation. Run 2 reported 22.7k tok/s by silently shifting to a mismatched concurrency range, inflating apparent gains. The Critic’s contribution is not throughput but *measurement integrity*: without it, the system optimizes confidently toward invalid configurations.

### 4.4 Analysis

The ablation quantifies each component’s contribution; the following case studies illustrate the coordination patterns that produce the gains in Figure [3](https://arxiv.org/html/2606.12563#S4.F3 "Figure 3 ‣ 4.2 Main Results ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").

#### Stability–throughput trade-offs over long horizons.

The DeepSeek-R1-0528 optimization session exposes the checks-and-balances architecture operating under sustained pressure. An optimized dense GEMM backend showed significant micro-benchmark advantages on a single GPU, but produced repeated crashes during multi-GPU warmup. The Critic traced the failures to a workspace allocation pattern incompatible with multi-GPU graph replay and recommended disabling the unstable code path—a trade-off that sacrificed ~5–10% GEMM throughput for crash-free serving. The Orchestrator accepted the constraint and continued on the stable dispatcher. Over 24 hours, this dynamic—the Critic constraining exploration when stability is threatened, the Orchestrator accepting short-term cost for long-term viability—enabled the session to reach +90.0% throughput-latency improvement over the baseline.

#### End-to-end validation gates.

Across all campaigns, 39% of kernel-level improvements regress end-to-end throughput when deployed into the serving pipeline—due to layout changes, disabled fusion passes, or shifted bottlenecks invisible at the operator level. On MiniMax-M2.5, an alternative attention kernel implementation achieved its expected micro-benchmark speedup, but deployment required a different KV cache layout that forced sub-optimal memory access patterns and disabled a fused compiler pass (+62 kernel launches per step), regressing throughput by 1.2%. Kernel optimization in isolation is insufficient: every candidate must be integrated into the full serving stack and measured end-to-end to distinguish real gains from cross-layer regressions.

#### Additional coordination case studies.

Two additional coordination case studies—covering epistemic correction, and vendor-library rewrites—appear in Appendix [D](https://arxiv.org/html/2606.12563#A4 "Appendix D Additional coordination case studies ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").

## 5 Limitations

While Arbor demonstrates that stateful tree search with multi-agent coordination can sustain full-stack optimization campaigns, we acknowledge the following limitations.

#### Agent LLM backend.

Agent quality depends on the underlying LLM backends. We use a fixed capability tier across all experiments; systematic comparison across model families is left to future work.

#### Hardware and task scope.

All experiments target LLM inference serving on AMD Instinct GPUs. Our primary evaluation uses MI355X; cross-generation validation on MI300X (Appendix [B](https://arxiv.org/html/2606.12563#A2 "Appendix B Device Generalization of Arbor ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")) confirms that the same search procedure, agent architecture, and scoring heuristic transfer to a different microarchitecture without modification—only the knowledge-base priors change. The formulation itself is hardware agnostic: the tree search operates over profiling-derived bottlenecks, not hardware specific features, so porting to another vendor’s stack requires only replacing the profiling and kernel toolchains, not the search or coordination logic. We have not yet
evaluated on NVIDIA GPUs and are working on adjacent tasks such as model training,
and defer these extensions to future work. We note that Arbor addresses a different problem from contemporaneous systems such as AVO [Chen et al. (2026)](https://arxiv.org/html/2606.12563#bib.bib3), KernelSkill [Sun et al. (2026)](https://arxiv.org/html/2606.12563#bib.bib11), and Astra [Wei et al. (2025)](https://arxiv.org/html/2606.12563#bib.bib12), which optimize individual kernels in isolation. Arbor operates across the full serving stack, where cross-layer interactions dominate (Section [4.4](https://arxiv.org/html/2606.12563#S4.SS4.SSS0.Px2 "End-to-end validation gates. ‣ 4.4 Analysis ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")). The underlying search formulation is domain-agnostic and could in principle be applied to single-operator optimization or other domains, though we do not demonstrate this here.

#### Empirical scoring constants.

The constants in our scoring heuristic (§[3.2](https://arxiv.org/html/2606.12563#S3.SS2 "3.2 Heuristic Tree Search ‣ 3 Methodology ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"))—the validated/failed-prior multipliers, the urgency multiplier $m_{\text{gap}}$, and the exploration coefficient $C$—were chosen from early development experience rather than systematic tuning. We expect the qualitative behavior of the search to be robust to these choices, but defer a formal sensitivity analysis to future work.

## 6 Discussion and Future Work

#### Relationship to MCTS, UCT, and reinforcement learning.

The search procedure deliberately resembles classical Monte Carlo Tree Search [Kocsis and Szepesvári (2006)](https://arxiv.org/html/2606.12563#bib.bib16); [Browne et al. (2012)](https://arxiv.org/html/2606.12563#bib.bib17): each node carries a value estimate, the UCB-style term in our heuristic recovers UCT exactly when costs and risks are uniform, and re-scoring after every measurement plays the role of value backup. The differences are pragmatic rather than fundamental: minutes-long evaluations preclude rollouts, priors are drawn from the persistent KB rather than from a learned value network, and the LLM-generated action set rules out a fixed offline policy. We view a learned value model trained on accumulated KB outcomes as the natural reinforcement-learning extension once the KB matures across more campaigns. We are also exploring tighter integration with the underlying
compiler and profiling toolchain as a natural next step.

## 7 Conclusion

We presented Arbor, a framework that formulates full-stack performance optimization as stateful tree search with a checks-and-balances multi-agent architecture. The key insight is that sustained autonomous optimization requires not just search structure (the tree) or agent specialization (Domain Specialists) but an explicit tension between optimization and stability (Orchestrator vs. Critic), with hard and soft skills governing what each agent contributes and how those contributions compose. Across six production models on AMD MI355X, Arbor achieves +40% to +193% throughput over baselines in days of autonomous operation.

## References

- Browne et al. (2012)
  C. B. Browne, E. Powley, D. Whitehouse, S. M. Lucas, P. I. Cowling, P. Rohlfshagen, S. Tavener, D. Perez, S. Samothrakis, and S. Colton
  A survey of monte carlo tree search methods.
  IEEE Transactions on Computational Intelligence and AI in Games 4 (1), pp. 1–43.
  External Links: [Document](https://dx.doi.org/10.1109/TCIAIG.2012.2186810)
  Cited by: [§6](https://arxiv.org/html/2606.12563#S6.SS0.SSS0.Px1.p1.1 "Relationship to MCTS, UCT, and reinforcement learning. ‣ 6 Discussion and Future Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Chen et al. (2026)
  T. Chen, Z. Ye, B. Xu, Z. Ye, T. Liu, A. Hassani, T. Chen, A. Kerr, H. Wu, Y. Xu, Y. Chen, H. Chen, A. Kane, R. Krashinsky, M. Liu, V. Grover, L. Ceze, R. Bringmann, J. Tran, W. Liu, F. Xie, M. Lightstone, and H. Shi
  AVO: agentic variation operators for autonomous evolutionary search.
  External Links: 2603.24517,
  [Link](https://arxiv.org/abs/2603.24517)
  Cited by: [§1](https://arxiv.org/html/2606.12563#S1.p1.1 "1 Introduction ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§2](https://arxiv.org/html/2606.12563#S2.SS0.SSS0.Px1.p1.1 "LLM-guided code optimization. ‣ 2 Related Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§5](https://arxiv.org/html/2606.12563#S5.SS0.SSS0.Px2.p1.1 "Hardware and task scope. ‣ 5 Limitations ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Chen et al. (2018)
  T. Chen, T. Moreau, Z. Jiang, L. Zheng, E. Yan, M. Cowan, H. Shen, L. Wang, Y. Hu, L. Ceze, C. Guestrin, and A. Krishnamurthy
  TVM: an automated end-to-end optimizing compiler for deep learning.
  In Proceedings of the 13th USENIX Conference on Operating Systems Design and Implementation,
  OSDI’18, USA, pp. 579–594.
  External Links: ISBN 9781931971478
  Cited by: [§1](https://arxiv.org/html/2606.12563#S1.p2.1 "1 Introduction ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Dong et al. (2026)
  J. Dong, Y. Yang, T. Liu, Y. Wang, F. Qi, V. Tarokh, K. Rangadurai, and S. Yang
  STARK: strategic team of agents for refining kernels.
  In The Fourteenth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=nWaZTH1JMx)
  Cited by: [§1](https://arxiv.org/html/2606.12563#S1.p2.1 "1 Introduction ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§2](https://arxiv.org/html/2606.12563#S2.SS0.SSS0.Px2.p1.1 "Multi-agent kernel optimization. ‣ 2 Related Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Hong et al. (2024)
  S. Hong, M. Zhuge, J. Chen, X. Zheng, Y. Cheng, J. Wang, C. Zhang, Z. Wang, S. K. S. Yau, Z. Lin, L. Zhou, C. Ran, L. Xiao, C. Wu, and J. Schmidhuber
  MetaGPT: meta programming for a multi-agent collaborative framework.
  In The Twelfth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=VtmBAGCN7o)
  Cited by: [§1](https://arxiv.org/html/2606.12563#S1.p2.1 "1 Introduction ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§2](https://arxiv.org/html/2606.12563#S2.SS0.SSS0.Px3.p1.1 "Multi-agent software systems. ‣ 2 Related Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Kocsis and Szepesvári (2006)
  L. Kocsis and C. Szepesvári
  Bandit based monte-carlo planning.
  In Machine Learning: ECML 2006, J. Fürnkranz, T. Scheffer, and M. Spiliopoulou (Eds.),
  Berlin, Heidelberg, pp. 282–293.
  External Links: ISBN 978-3-540-46056-5
  Cited by: [§6](https://arxiv.org/html/2606.12563#S6.SS0.SSS0.Px1.p1.1 "Relationship to MCTS, UCT, and reinforcement learning. ‣ 6 Discussion and Future Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Kwon et al. (2023)
  W. Kwon, Z. Li, S. Zhuang, Y. Sheng, L. Zheng, C. H. Yu, J. Gonzalez, H. Zhang, and I. Stoica
  Efficient memory management for large language model serving with pagedattention.
  In Proceedings of the 29th Symposium on Operating Systems Principles,
  SOSP ’23, New York, NY, USA, pp. 611–626.
  External Links: ISBN 9798400702297,
  [Link](https://doi.org/10.1145/3600006.3613165),
  [Document](https://dx.doi.org/10.1145/3600006.3613165)
  Cited by: [§4.1](https://arxiv.org/html/2606.12563#S4.SS1.p1.1 "4.1 Setup ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Novikov et al. (2025)
  A. Novikov, N. Vũ, M. Eisenberger, E. Dupont, P. Huang, A. Z. Wagner, S. Shirobokov, B. Kozlovskii, F. J. R. Ruiz, A. Mehrabian, M. P. Kumar, A. See, S. Chaudhuri, G. Holland, A. Davies, S. Nowozin, P. Kohli, and M. Balog
  AlphaEvolve: a coding agent for scientific and algorithmic discovery.
  External Links: 2506.13131,
  [Link](https://arxiv.org/abs/2506.13131)
  Cited by: [§1](https://arxiv.org/html/2606.12563#S1.p1.1 "1 Introduction ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§2](https://arxiv.org/html/2606.12563#S2.SS0.SSS0.Px1.p1.1 "LLM-guided code optimization. ‣ 2 Related Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Qian et al. (2024)
  C. Qian, W. Liu, H. Liu, N. Chen, Y. Dang, J. Li, C. Yang, W. Chen, Y. Su, X. Cong, J. Xu, D. Li, Z. Liu, and M. Sun
  ChatDev: communicative agents for software development.
  External Links: 2307.07924,
  [Link](https://arxiv.org/abs/2307.07924)
  Cited by: [§2](https://arxiv.org/html/2606.12563#S2.SS0.SSS0.Px3.p1.1 "Multi-agent software systems. ‣ 2 Related Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Romera-Paredes et al. (2024)
  B. Romera-Paredes, M. Barekatain, A. Novikov, M. Balog, M. P. Kumar, E. Dupont, F. J. R. Ruiz, J. S. Ellenberg, P. Wang, O. Fawzi, P. Kohli, and A. Fawzi
  Mathematical discoveries from program search with large language models.
  Nature 625 (7995), pp. 468–475.
  External Links: ISSN 1476-4687,
  [Document](https://dx.doi.org/10.1038/s41586-023-06924-6),
  [Link](https://doi.org/10.1038/s41586-023-06924-6)
  Cited by: [§2](https://arxiv.org/html/2606.12563#S2.SS0.SSS0.Px1.p1.1 "LLM-guided code optimization. ‣ 2 Related Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- SemiAnalysis (2026)
  SemiAnalysis
  InferenceX: open source continuous inference benchmark.
  Note: <https://inferencex.semianalysis.com/>Accessed: 2026-04-26
  Cited by: [§4.1](https://arxiv.org/html/2606.12563#S4.SS1.p1.1 "4.1 Setup ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§4.2](https://arxiv.org/html/2606.12563#S4.SS2.p1.1 "4.2 Main Results ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Sun et al. (2026)
  Q. Sun, J. Han, T. Li, Z. Tang, S. Chen, F. Yang, A. Liu, X. Liu, and Y. Liu
  KernelSkill: a multi-agent framework for gpu kernel optimization.
  External Links: 2603.10085,
  [Link](https://arxiv.org/abs/2603.10085)
  Cited by: [§1](https://arxiv.org/html/2606.12563#S1.p1.1 "1 Introduction ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§2](https://arxiv.org/html/2606.12563#S2.SS0.SSS0.Px2.p1.1 "Multi-agent kernel optimization. ‣ 2 Related Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§5](https://arxiv.org/html/2606.12563#S5.SS0.SSS0.Px2.p1.1 "Hardware and task scope. ‣ 5 Limitations ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Wei et al. (2025)
  A. Wei, T. Sun, Y. Seenichamy, H. Song, A. Ouyang, A. Mirhoseini, K. Wang, and A. Aiken
  Astra: a multi-agent system for gpu kernel performance optimization.
  External Links: 2509.07506,
  [Link](https://arxiv.org/abs/2509.07506)
  Cited by: [§1](https://arxiv.org/html/2606.12563#S1.p1.1 "1 Introduction ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§2](https://arxiv.org/html/2606.12563#S2.SS0.SSS0.Px2.p1.1 "Multi-agent kernel optimization. ‣ 2 Related Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§5](https://arxiv.org/html/2606.12563#S5.SS0.SSS0.Px2.p1.1 "Hardware and task scope. ‣ 5 Limitations ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Yu and Ren (2026)
  C. Yu and H. Ren
  Autonomous evolution of eda tools: multi-agent self-evolved abc.
  External Links: 2604.15082,
  [Link](https://arxiv.org/abs/2604.15082)
  Cited by: [§1](https://arxiv.org/html/2606.12563#S1.p2.1 "1 Introduction ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§2](https://arxiv.org/html/2606.12563#S2.SS0.SSS0.Px3.p1.1 "Multi-agent software systems. ‣ 2 Related Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Zhang et al. (2026)
  G. Zhang, S. Zhu, A. Wei, Z. Song, A. Nie, Z. Jia, N. Vijaykumar, Y. Wang, and K. Olukotun
  AccelOpt: a self-improving llm agentic system for ai accelerator kernel optimization.
  External Links: 2511.15915,
  [Link](https://arxiv.org/abs/2511.15915)
  Cited by: [§1](https://arxiv.org/html/2606.12563#S1.p1.1 "1 Introduction ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents"),
  [§2](https://arxiv.org/html/2606.12563#S2.SS0.SSS0.Px2.p1.1 "Multi-agent kernel optimization. ‣ 2 Related Work ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Zheng et al. (2020)
  L. Zheng, C. Jia, M. Sun, Z. Wu, C. H. Yu, A. Haj-Ali, Y. Wang, J. Yang, D. Zhuo, K. Sen, J. E. Gonzalez, and I. Stoica
  Ansor: generating high-performance tensor programs for deep learning.
  In Proceedings of the 14th USENIX Conference on Operating Systems Design and Implementation,
  OSDI’20, USA.
  External Links: ISBN 978-1-939133-19-9
  Cited by: [§1](https://arxiv.org/html/2606.12563#S1.p2.1 "1 Introduction ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").
- Zheng et al. (2024)
  L. Zheng, L. Yin, Z. Xie, C. Sun, J. Huang, C. H. Yu, S. Cao, C. Kozyrakis, I. Stoica, J. E. Gonzalez, C. Barrett, and Y. Sheng
  SGLang: efficient execution of structured language model programs.
  In Proceedings of the 38th International Conference on Neural Information Processing Systems,
  NIPS ’24, Red Hook, NY, USA.
  External Links: ISBN 9798331314385
  Cited by: [§4.1](https://arxiv.org/html/2606.12563#S4.SS1.p1.1 "4.1 Setup ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").

## Appendix A Walkthrough: Cross-Agent Diagnosis

#### Illustrative example: Hard and soft skills in practice.

To see how the different agents interact, we trace a sequence from an optimization campaign on MI355X (Figure [5](https://arxiv.org/html/2606.12563#A1.F5 "Figure 5 ‣ Illustrative example: Hard and soft skills in practice. ‣ Appendix A Walkthrough: Cross-Agent Diagnosis ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents")). A Domain Specialist requests exclusive GPU access for on-device micro-benchmarking; the Orchestrator yields and continues searching for optimization opportunities (*soft*: resource arbitration). After multi-round validation (*hard*: kernel engineering), the Domain Specialist marks the patch ready. The Orchestrator picks it up, deploys it end-to-end, and the server hangs. Rather than diagnosing the failure itself (*soft*: recognizing the boundary of its own expertise), the Orchestrator logs the crash and continues its search loop to try other pending ideas. The Critic classifies the hang as a ZMQ deadlock and recommends the Orchestrator retry. When three subsequent actions crash identically, the Critic asks the Domain Specialist for device-level telemetry showing GPU faults occurring *before* the deadlocks (*hard*: hardware diagnostics invisible to the other agents). The Critic incorporates this evidence, inverts the causal ordering, and correlates fault patterns across all crashing actions to identify ksplit=4 as the root cause. It supplies this finding to the Orchestrator which patches the dispatch, validates with zero faults, and retries the original optimization: +0.84%, recovering work previously classified as a crash. Hard skills (device telemetry, cross-action correlation, tree management) determined what each agent contributed; soft skills (GPU arbitration, delegation at expertise boundaries, incorporating another agent’s findings) determined how those contributions composed into a solution no single agent could reach. Section [4.4](https://arxiv.org/html/2606.12563#S4.SS4.SSS0.Px1 "Stability–throughput trade-offs over long horizons. ‣ 4.4 Analysis ‣ 4 Experiments ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents") traces situations where the agents deliberately sacrificed throughput for stability.

Figure 5: Multi-agent communication during iterative diagnosis on one of the model optimizations on MI355X. Rows correspond to the three agents; time flows left to right. Arrows indicate communication through file-based IPC. The Orchestrator notices a pending GPU request from a Domain Specialist and relinquishes the device while it continues searching for optimization opportunities. The Domain Specialist validates a patch and returns GPU control to the Orchestrator, which deploys it and observes a hang. The Critic classifies the failure as a ZMQ deadlock and recommends a retry, but after three more crashes on different ideas, correlates GPU fault logs from the Domain Specialist to invert the causal ordering and identify ksplit=4 as the root cause. The Orchestrator patches the dispatch and retries the original optimization (dashed arc), recovering +0.84% from a previously discarded crash. Then it proceeds to retry the other two crashed optimizations as well.

## Appendix B Device Generalization of Arbor

To evaluate whether Arbor generalizes beyond a single hardware target, we run independent campaigns on AMD Instinct MI300X GPUs for three of the six models using the same agent architecture, scoring heuristic, and skill decomposition without any hardware-specific modification.

Figure 6: Throughput vs. interactivity on AMD MI300X for 3 production models. Interactivity is $1/\mathrm{TPOT}$; higher is better on both axes. Percentages indicate output throughput gain at concurrency 64 relative to the InferenceX vendor baseline. All benchmarks use ISL = OSL = 1024.

Arbor achieves +62% throughput on gpt-oss-120b, +79% on MiniMax-M2.5, and +99% on DeepSeek-R1-0528. The Arbor-optimized curve dominates the baseline Pareto frontier on all three models, consistent with the MI355X results. Notably, the bottleneck distribution shifts substantially across hardware generations—MI300X has different memory bandwidth characteristics and fewer compute units per GPU than MI355X—yet Arbor’s profiling-driven search adapts without manual intervention: re-profiling after each kept action detects hardware-specific bottlenecks and expands the tree accordingly. The gpt-oss-120b campaigns on MI300X also serve as the basis for the run-to-run variance analysis in Appendix [C](https://arxiv.org/html/2606.12563#A3 "Appendix C Run-to-run variance ‣ Arbor: Tree Search as a Cognition Layer for Autonomous Agents").

## Appendix C Run-to-run variance

To assess the reproducibility of Arbor’s optimization campaigns, we run two independent campaigns each on Kimi-K2.5 (MI355X) and gpt-oss-120b (MI300X), using identical agent configurations and starting from the same unoptimized baseline. We ensure that there is no cross-contamination through the knowledge base for each of these runs.

Figure 7: Run-to-run variance across independent optimization campaigns. Left: Two runs on Kimi-K2.5 (MI355X) reach +64.0% and +63.4% throughput improvement, differing by 0.6 percentage points. Right: Two runs on gpt-oss-120b (MI300X) reach +67.3% and +65.7%, differing by 1.6 percentage points. Both pairs follow similar optimization trajectories despite exploring different action sequences, suggesting that the search formulation converges reliably to comparable outcomes.

Despite exploring different action sequences and encountering different failure modes, both pairs converge to within 2 percentage points of each other. On gpt-oss-120b, the top four optimizations—accounting for 34% of the total gain—are identical across both runs, indicating that the scoring heuristic reliably surfaces high-value interventions; the residual variance arises from lower-ranked actions in the tail of the search.

## Appendix D Additional coordination case studies

### D.1 Epistemic correction and session survival

The Critic enables two capabilities absent from single-agent systems. First, epistemic correction: a benchmark parameter mismatch (OSL=256 vs. baseline OSL=1024) caused the Orchestrator to revert a +2.1% optimization at an apparent $-$22%; the Critic identified the mismatch through log comparison and issued a re-test. Domain Specialists reason *from* measurements; the Critic reasons *about* them. Second, infrastructure awareness: during a gpt-oss-120b run, the shared NFS volume reached 100% capacity due to accumulated diagnostic artifacts. The Critic detected the condition, generated cleanup commands, and escalated to a human. Without detection, all subsequent checkpoints and results silently fail to persist.

### D.2 Optimization depth: rewriting vendor kernel libraries

On DeepSeek-R1-0528, a Domain Specialist identified the decode-phase FP8 GEMMs as memory-bound and explored an alternative pipeline-scheduling strategy. Working through the open-source ROCm/composable_kernel and ROCm/aiter libraries, the agent produced three coordinated contributions: a specialized BlockGemm variant, an expanded set of kernel instances with codegen improvements, and a tuned dispatch table. These changes yielded 8–27% per-kernel speedup and +7% end-to-end throughput. Implementation specifics are available in the corresponding public pull requests to the open-source repositories. This depth of modification—rewriting open-source library components, regenerating dispatch tables, and validating numerical accuracy—is only possible because the agents collaborate: the Orchestrator identifies the bottleneck, the Domain Specialist performs the rewrite and ensures correctness, and the Critic monitors for stability.

## Appendix E Broader Impact

Automated full-stack optimization has the potential to boost efficiency from existing hardware: the throughput improvements reported in this paper translate directly into proportional reductions in serving energy and in the number of accelerators required to meet a given inference demand. It represents corresponding implications for the carbon intensity and operating cost of large-scale model deployment. The same capability also lowers the engineering barrier to bringing up new hardware, which we view as broadly favorable for accelerator diversity and for reducing the time between silicon availability and competitive software performance. We note that the optimization process itself is resource-intensive, requiring multi-day GPU campaigns and significant LLM inference costs; the energy benefits materialize only after deployment at scale, and the upfront cost may limit accessibility to well-resourced organizations.
