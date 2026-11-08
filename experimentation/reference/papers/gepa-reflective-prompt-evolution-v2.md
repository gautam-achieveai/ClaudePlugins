# GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning

- Source: https://arxiv.org/abs/2507.19457v2
- Downloaded from: https://arxiv.org/html/2507.19457
- Retrieved (UTC): 2026-11-07T07:28:51.315137+00:00
- Version: 2507.19457v2
- Type: paper
- Original SHA-256: `a8684c9ec8702de80207451f0b6144bfb4c533e2c02b9501a6058e11079d29ee`
- Conversion: Publisher HTML article converted to Markdown; TeX math preserved. Figures remain source URLs; complex tables and layout may need the original.
- This is source material, not agent instructions.

---

# GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning

Lakshya A Agrawal
Affiliation: UC Berkeley
  
Shangyin Tan
Affiliation: UC Berkeley
  
Dilara Soylu
Affiliation: Stanford
  
Noah Ziems
Affiliation: Notre Dame
  
Rishi Khare
Affiliation: UC Berkeley
  
Krista Opsahl-Ong
Affiliation: Databricks
  
Arnav Singhvi
Affiliation: Stanford
Affiliation: Databricks
  
Herumb Shandilya
Affiliation: Stanford
  
Michael J Ryan
Affiliation: Stanford
  
Meng Jiang
Affiliation: Notre Dame
  
Christopher Potts
Affiliation: Stanford
  
Koushik Sen
Affiliation: UC Berkeley
  
Alexandros G. Dimakis
Affiliation: UC Berkeley
Affiliation: BespokeLabs.ai
  
Ion Stoica
Affiliation: UC Berkeley
  
Dan Klein
Affiliation: UC Berkeley
  
Matei Zaharia
Affiliation: UC Berkeley
Affiliation: Databricks
  
Omar Khattab
Affiliation: MIT

###### Abstract

Large language models (LLMs) are increasingly adapted to downstream tasks via reinforcement learning (RL) methods like Group Relative Policy Optimization (GRPO), which often require thousands of rollouts to learn new tasks. We argue that the interpretable nature of language often provides a much richer learning medium for LLMs, compared to policy gradients derived from sparse, scalar rewards. To test this, we introduce GEPA (Genetic-Pareto), a prompt optimizer that thoroughly incorporates natural language reflection to learn high-level rules from trial and error.
Given any AI system containing one or more LLM prompts, GEPA samples trajectories (e.g., reasoning, tool calls, and tool outputs) and reflects on them in natural language to diagnose problems, propose and test prompt updates, and combine complementary lessons from the Pareto frontier of its own attempts. As a result of GEPA’s design, it can often turn even just a few rollouts into a large quality gain.
Across six tasks, GEPA outperforms GRPO by 6% on average and by up to 20%, while using up to 35x fewer rollouts. GEPA also outperforms the leading prompt optimizer, MIPROv2, by over 10% (e.g., +12% accuracy on AIME-2025), and demonstrates promising results as an inference-time search strategy for code optimization. We release our code at  <https://github.com/gepa-ai/gepa>.

|  |
| --- |
|  |

(a) HotpotQA, Qwen3 8B

(b) IFBench, Qwen3 8B

Figure 1: A comparison of learning behavior of the GEPA prompt optimizer against a state-of-the-art prompt optimizer (MIPROv2) and GRPO (24,000 rollouts). As more rollouts are sampled, the prompt optimizers can learn much more quickly than GRPO. GEPA substantially outperforms both GRPO and MIPROv2 in final score. The Test-set star markers demonstrate the performance gap in a held-out set of questions.

## 1 Introduction

Large language models (LLMs) have enabled development of agents and systems that combine fuzzy natural-language specifications with tools like retrieval and code execution. This raises the question of how LLMs should be optimized for downstream performance. One popular approach is Reinforcement Learning with Verifiable Rewards (RLVR), e.g. with Group Relative Policy Optimization (GRPO) ([Shao et al., 2024](https://arxiv.org/html/2507.19457#bib.bib67)), which treats success metrics as end-of-rollout scalar rewards used to estimate policy gradients ([Lambert, 2025](https://arxiv.org/html/2507.19457#bib.bib49)). While these RL approaches are effective, they typically require tens of thousands of rollouts in practice to fit new tasks. For example, recent works leveraging GRPO typically use up to hundreds of thousands of rollouts for training ([Chen et al., 2025c](https://arxiv.org/html/2507.19457#bib.bib27); [Wu et al., 2025b](https://arxiv.org/html/2507.19457#bib.bib28); [Zhang et al., 2025](https://arxiv.org/html/2507.19457#bib.bib29); [Jin et al., 2025](https://arxiv.org/html/2507.19457#bib.bib30); [Si et al., 2025](https://arxiv.org/html/2507.19457#bib.bib31); [Wang et al., 2025a](https://arxiv.org/html/2507.19457#bib.bib32); [Chen et al., 2025a](https://arxiv.org/html/2507.19457#bib.bib33); [Sha et al., 2025](https://arxiv.org/html/2507.19457#bib.bib34); [Lin et al., 2025a](https://arxiv.org/html/2507.19457#bib.bib35); [Peng et al., 2025](https://arxiv.org/html/2507.19457#bib.bib36); [Song et al., 2025](https://arxiv.org/html/2507.19457#bib.bib37)).
This sample inefficiency can quickly become a serious bottleneck: many downstream LLM applications invoke expensive tool calls, have limited inference budget for sampling from the LLM itself, or simply cannot finetune the weights of the largest or best-performing LLMs.

We observe that rollouts sampled from even highly sophisticated LLM systems can be serialized into traces of natural language: they contain nothing but the instructions of each LLM module, the resulting LLM reasoning chains, tool calls, and potentially the internal workings of the reward function (e.g., compiler error messages, before they are collapsed into scalar rewards). Because such serialized trajectories are readily understood by modern LLMs, we argue that algorithms that learn deliberately in natural language by reflecting on these trajectories can make more effective use of the strong language priors that LLMs have, compared with standard RL approaches.

We introduce GEPA (Genetic-Pareto), a reflective prompt optimizer for compound AI systems that merges textual reflection with multi-objective evolutionary search. GEPA iteratively mutates prompts using natural language feedback drawn from new rollouts. In each mutation, the candidate prompt is derived from an ancestor, accumulating high-level lessons derived from observations and LLM feedback.
To avoid local optima that afflict greedy prompt optimization, GEPA maintains a Pareto front: instead of evolving only the global best prompt, it stochastically explores the top-performing prompts for each problem instance. This diversification enables robust generalization and mitigates getting stuck in local minima.

We evaluate GEPA across multi-hop reasoning (HotpotQA; [Yang et al. 2018](https://arxiv.org/html/2507.19457#bib.bib79)), Math (AIME, LiveBench-Math;  [Balunović et al. (2025)](https://arxiv.org/html/2507.19457#bib.bib16); [White et al. (2025)](https://arxiv.org/html/2507.19457#bib.bib15)), instruction following (IFBench; [Pyatkin et al. 2025a](https://arxiv.org/html/2507.19457#bib.bib78)), privacy-aware delegation (PUPA; [Li et al. 2025a](https://arxiv.org/html/2507.19457#bib.bib77)), and retrieval-augmented verification (HoVer; [Jiang et al. 2020](https://arxiv.org/html/2507.19457#bib.bib76)), using both open (Qwen3 8B; [Yang et al. 2025](https://arxiv.org/html/2507.19457#bib.bib72); [Team 2025](https://arxiv.org/html/2507.19457#bib.bib73)) and proprietary (GPT-4.1 Mini; [OpenAI 2025](https://arxiv.org/html/2507.19457#bib.bib71)) models.
We find that GEPA generalizes well and is highly sample-efficient: on Qwen3 8B, it outperforms GRPO (24k rollouts) by up to 20% while using up to 35$\times$ fewer rollouts, with an average gain of +6% across six tasks.
GEPA also surpasses the prior state-of-the-art, MIPROv2 ([Opsahl-Ong et al., 2024](https://arxiv.org/html/2507.19457#bib.bib70)), on all benchmarks and models, achieving +13% aggregate gains, over double MIPROv2’s +5.6%.

Qualitatively, GEPA-learned prompts are quite rich.
Figure [2](https://arxiv.org/html/2507.19457#S1.F2 "Figure 2 ‣ 1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") shows excerpts from a prompt crafted for the query-creation module of a multi-hop question answering system used in HotpotQA, and Figure [5](https://arxiv.org/html/2507.19457#S3.F5 "Figure 5 ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") shows that even a single reflective update often yields large gains.
These results highlight that reflective prompt evolution with language feedback enables improved sample efficiency and robust generalization, offering a practical approach to optimizing complex AI workflows in data- or budget-constrained environments.
We also demonstrate GEPA as an inference-time search strategy for code optimization on NPUEval ([Kalade and Schelle, 2025](https://arxiv.org/html/2507.19457#bib.bib39)) & KernelBench ([Ouyang et al., 2025](https://arxiv.org/html/2507.19457#bib.bib38)) in Sec [5.1](https://arxiv.org/html/2507.19457#S5.SS1 "5.1 GEPA For Inference-Time Search (Contd.) ‣ 5 Extended Applications of GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), and for adversarial prompt search in Sec [5.2](https://arxiv.org/html/2507.19457#S5.SS2 "5.2 GEPA for Adversarial Prompt Search (Contd.) ‣ 5 Extended Applications of GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").

Seed Prompt for Second-Hop of Multi-Hop QA System

Given the fields question, summary_1, produce the fields query.

GEPA’s Optimized Prompt for Second-Hop of Multi-Hop QA System, GPT-4.1 Mini

You will be given two input fields: question and summary_1. Your task: Generate a new search query (query) *optimized for the second hop* of a multi-hop retrieval system.

•

The original user question is typically complex and requires information from multiple documents to answer.
•

The first hop query is the original question (used to retrieve initial documents).
•

Your goal: generate a query to retrieve documents *not* found in first hop but necessary to answer the question completely.
Input Understanding: question is the original multi-hop question posed by the user. summary_1 is a concise summary of information from a document retrieved in the first hop, which partially addresses the question.
Purpose and Context:

•

Your generated query aims to find the *missing pieces* of information needed to fully answer the question. …
•

The query must retrieve relevant documents *NOT* found in first hop …for final answer extraction.
Key Observations and Lessons:

•

First-hop documents often cover one entity or aspect.
•

Remaining relevant documents often involve connected or higher-level concepts mentioned in summary_1 but not explicitly asked in the original question. The query should target these *missing*, but logically linked, documents.
•

Avoid merely paraphrasing the original question or restating known facts from summary_1.
•

Infer what broader or related entities/concepts might provide the crucial missing information.
•

For example:

–

If summary_1 describes a population for a small civil parish, but the question wants the total population of the wider region, your query should target that wider region (e.g., “Madeira archipelago population in 2011”).
–

If summary_1 covers a song and the question asks for the album, target album-level documents.
How to Build the Query:

•

Identify entities or topics mentioned in summary_1 that are related but different from first-hop documents.
•

Reframe the query to explicitly mention these broader or related entities *connected to the original question*.
•

Include relevant key context from the question to maintain specificity, but shift focus to the missing piece.
•

The goal is to retrieve documents that link or complement what was retrieved initially.
Practical Strategy:

•

Read the summary_1 carefully to spot references to bigger contexts or other entities not covered in the first hop.
•

Ask: “What entity or aspect does this summary hint at that could answer the original question but was not found yet?”
•

Formulate a precise, focused factual query targeting that entity or concept to retrieve the missing documents.
Output:

•

Produce query as a clear, concise question or keyword phrase designed for efficient retrieval of second-hop documents.
•

Ensure the query relates logically to the original question while targeting the broader or complementary knowledge identified in summary_1. … Do not include the original question or simply rephrase it. Do not duplicate information already well-covered by the first hop
retrieval …

Figure 2: This figure shows an example prompt generated by GEPA for the second-hop document retrieval to be performed in a multi-hop question-answer system, along with the seed prompt it started with. Appendix [L](https://arxiv.org/html/2507.19457#A12 "Appendix L Examples of best prompts for every benchmark ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") compares GEPA’s prompts for all tasks with prompts generated by MIPROv2.

## 2 Problem Statement

We follow related work in defining a compound AI system as any modular system composed of one or more language model (LLM) invocations, potentially interleaved with external tool calls, orchestrated through arbitrary control flow. This definition subsumes a broad class of real-world LLM-based AI systems, including agents, multi-agent systems, and general-purpose scaffolding techniques like ReAct ([Yao et al., 2023](https://arxiv.org/html/2507.19457#bib.bib47)), Archon ([Saad-Falcon et al., 2025](https://arxiv.org/html/2507.19457#bib.bib46)), etc.
Following [Soylu et al. (2024)](https://arxiv.org/html/2507.19457#bib.bib48); [Khattab et al. (2024)](https://arxiv.org/html/2507.19457#bib.bib69); [Opsahl-Ong et al. (2024)](https://arxiv.org/html/2507.19457#bib.bib70); [Tan et al. (2025)](https://arxiv.org/html/2507.19457#bib.bib75), we formalize such a system as $\Phi=(M,C,\mathcal{X},\mathcal{Y})$, where $M=\langle M_{1},\ldots,M_{|M|}\rangle$ denotes language modules, $C$ specifies control flow logic, and $\mathcal{X}$, $\mathcal{Y}$ are global input/output schemas. Each module $M_{i}=(\pi_{i},\theta_{i},\mathcal{X}_{i},\mathcal{Y}_{i})$ is an LLM subcomponent: $\pi_{i}$ is its (system) prompt including instructions and few-shot demonstrations; $\theta_{i}$ the underlying model weights; $\mathcal{X}_{i},\mathcal{Y}_{i}$ are input/output schemas. At runtime, $C$ orchestrates the sequencing and invocation of modules—e.g., passing outputs from one module to another, invoking modules conditionally, or leveraging tool APIs. This way, $C$ can invoke different modules in any order multiples of times.

Given $\Phi$, let $\Pi_{\Phi}=\langle\pi_{1},\ldots,\pi_{|M|}\rangle$ denote the collection of all module prompts and $\Theta_{\Phi}=\langle\theta_{1},\ldots,\theta_{|M|}\rangle$ the set of module weights. The learnable parameters are thus $\langle\Pi,\Theta\rangle_{\Phi}$. For a task instance $(x,m)$—where $x$ maps to the input schema $\mathcal{X}$ and $m$ contains evaluator metadata (e.g., gold answers, evaluation rubrics, code unit tests)—the system induces an output $y=\Phi(x;\langle\Pi,\Theta\rangle_{\Phi})$. A metric $\mu:\mathcal{Y}\times\mathcal{M}\to[0,1]$ then measures the output quality of $y$ with respect to metadata $m$ (for example by calculating, exact match, F1, pass rate, etc.). The optimization problem is thus defined as follows, where $\mathcal{T}$ is a task distribution.:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $\displaystyle\langle\Pi^{*},\Theta^{*}\rangle_{\Phi}=\arg\max_{\langle\Pi,\Theta\rangle_{\Phi}}\mathbb{E}_{(x,m)\sim\mathcal{T}}\left[\mu\big(\Phi(x;\langle\Pi,\Theta\rangle_{\Phi}),\,m\big)\right].$ |  | (1) |

We adopt this general problem formulation, allowing updates to both prompts and weights of language modules, to enable comparisons between optimization algorithms that operate in different parameter spaces (e.g., GEPA vs. GRPO).

#### Sample-Efficient Optimization.

In many real-world scenarios, rollouts—concretely, invocations of $\Phi$ plus evaluation by $\mu$—are often computationally, monetarily, or timewise expensive. The optimizer is thus limited to at most $B$ rollouts on a dataset $\mathcal{D}_{\text{train}}=\{(x,m)_{i}\}_{i=1}^{N}$ with full access to $\mu$. The goal is to identify parameters $\langle\Pi^{*},\Theta^{*}\rangle_{\Phi}$ that maximize held-out performance, subject to not exceeding the rollout budget $B$:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $\displaystyle\langle\Pi^{*},\Theta^{*}\rangle_{\Phi}=\arg\max_{\langle\Pi,\Theta\rangle_{\Phi}}\mathbb{E}_{(x,m)\sim\mathcal{T}}\left[\mu\big(\Phi(x;\langle\Pi,\Theta\rangle_{\Phi}),\,m\big)\right],\quad\text{s.t.}\quad\#\text{rollouts}\leq B.$ |  | (2) |

The core challenge, then, is: *How do we extract maximal learning signal from every expensive rollout to enable effective adaptation of complex, modular AI systems in low-data or budget-constrained settings?*

## 3 GEPA: Reflective Prompt Evolution

![Refer to caption](https://arxiv.org/html/2507.19457v2/FullGepa.png)


Figure 3: GEPA proposes a new candidate in every iteration by improving existing candidates using one of the two strategies (Reflective Prompt Mutation (Section  [3](https://arxiv.org/html/2507.19457#S3 "3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")) or System Aware Merge (Appendix  [D.1](https://arxiv.org/html/2507.19457#A4.SS1 "D.1 Merge: System-aware crossover strategy for Compound AI optimization ‣ Appendix D GEPA Algorithm and Methodology Details ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"))), first evaluating them on a minibatch, and if improved, evaluating on a larger dataset. Instead of selecting the best performing candidate to mutate always, which can lead to a local-optimum, GEPA introduces Pareto-based candidate sampling (Section [3.1](https://arxiv.org/html/2507.19457#S3.SS1 "3.1 Pareto-based candidate selection ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")), which filters and samples from the list of best candidates per task, ensuring sufficient diversity. Overall, these design decisions allow GEPA to be highly sample-efficient while demonstrating strong generalization.



Algorithm 1  GEPA: Reflective Evolutionary Prompt Optimizer

1:
Inputs: System $\Phi$, dataset $\mathcal{D}_{\text{train}}$, eval metric $\mu$, feedback function $\mu_{f}$, budget $B$

2:
Hyperparams: minibatch size $b$, Pareto set size $n_{pareto}$

3:
Split $\mathcal{D}_{\text{train}}$ into $\mathcal{D}_{\text{feedback}}$, $\mathcal{D}_{\text{pareto}}$, s.t. $|D_{pareto}|=n_{pareto}$

4:
Initialize candidates $\mathcal{P}\leftarrow[\Phi]$, parents $\mathcal{A}\leftarrow[\text{None}]$

5:
for each $(x_{i},m_{i})$ in $\mathcal{D}_{\text{pareto}}$ do

6:
  $S_{\Phi}[i]\leftarrow\mu(\Phi(x_{i}),m_{i})$

7:
end for

8:
while budget $B$ not exhausted do

9:
  $k\leftarrow$ SelectCandidate($\mathcal{P},S$)

10:
  $j\leftarrow$ SelectModule($\Phi_{k}$)

11:
  $\mathcal{M}\leftarrow$ minibatch of size $b$ from $\mathcal{D}_{\text{feedback}}$

12:
  Gather feedback, scores, traces for $\Phi_{k}[j]$ on $\mathcal{M}$ using $\mu_{f}$

13:
  $\pi_{j}^{\prime}\leftarrow$ UpdatePrompt($\pi_{j}$, feedbacks, traces[j])

14:
  $\Phi^{\prime}\leftarrow$ Copy of $\Phi_{k}$ w/ module $j$ updated by $\pi_{j}^{\prime}$

15:
  $\sigma$, $\sigma^{\prime}$ $\leftarrow$ avg score on $\mathcal{M}$ (before, after)

16:
  if $\sigma^{\prime}$ improved then

17:
   Add $\Phi^{\prime}$ to $\mathcal{P}$; Add $k$ to $\mathcal{A}$

18:
   for each $(x_{i},m_{i})$ in $\mathcal{D}_{\text{pareto}}$ do

19:
     $S_{\Phi^{\prime}}[i]\leftarrow\mu(\Phi^{\prime}(x_{i}),m_{i})$

20:
   end for

21:
  end if

22:
end while

23:
return $\Phi^{*}$ maximizing average score on $\mathcal{D}_{\text{pareto}}$

Algorithm 2  Pareto-based candidate selection

1:
function SelectCandidate($\mathcal{P},S$)

2:
  // Build instance-wise Pareto sets

3:
  for each $i$ do

4:
   $s^{*}[i]\leftarrow\max_{k}S_{\mathcal{P}[k]}[i]$

5:
   $\mathcal{P}^{*}[i]\leftarrow\{\mathcal{P}[k]:S_{\mathcal{P}[k]}[i]=s^{*}[i]\}$

6:
  end for

7:
  $\mathcal{C}\leftarrow$ unique candidates in $\bigcup_{i}\mathcal{P}^{*}[i]$

8:
  $D\leftarrow\emptyset$

9:
  while there exists $\Phi\in\mathcal{C}\setminus D$ dominated by another in $\mathcal{C}\setminus D$ do

10:
   $D\leftarrow D\cup\{\Phi\}$

11:
  end while

12:
  Remove $D$ from each $\mathcal{P}^{*}[i]$ to get $\hat{\mathcal{P}}^{*}[i]$

13:
  Let $f[\Phi]=$ number of $i$ for which $\Phi\in\hat{\mathcal{P}}^{*}[i]$

14:
  Sample $\Phi_{k}$ from $\hat{\mathcal{C}}$ with probability $\propto f[\Phi_{k}]$

15:
  return index $k$ of $\Phi_{k}$ in $\mathcal{P}$

16:
end function

Figure 4: (Left) GEPA’s core algorithm for reflective prompt evolution. GEPA works iteratively, in each iteration, selecting some of the current candidates to evolve (line 7), executing the identified candidate on a minibatch of rollouts, while utilizing a special feedback function $\mu_{f}$ to gather module specific feedback when available (lines 9-10, described in detail in Section [3](https://arxiv.org/html/2507.19457#S3 "3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")), using an LLM to reflectively update the prompt (line 11), and evaluating whether the system instantiated with the new prompt improved the performance on the minibatch (line 14). If improved, GEPA then proceeds to evaluate the new system candidate on the full $D_{pareto}$ set, adding it to the list of candidates tracked and marking the new system’s parent.
(Right) The SelectCandidate subprocedure used by GEPA’s core algorithm is tasked with identifying the best candidate to evolve in the next optimization iteration. GEPA’s chief candidate selection strategy is to find non-dominated candidates in the Pareto frontier (of all task instances), and stochastically select one of them based on their appearance frequency in the Pareto front.

We introduce GEPA (Genetic-Pareto), a sample-efficient optimizer for compound AI systems motivated by three core principles: genetic prompt evolution (Section [3](https://arxiv.org/html/2507.19457#S3 "3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")), reflection using natural language feedback (Section [3](https://arxiv.org/html/2507.19457#S3 "3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")), and Pareto-based candidate selection (Section [3.1](https://arxiv.org/html/2507.19457#S3.SS1 "3.1 Pareto-based candidate selection ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")). Figure [3](https://arxiv.org/html/2507.19457#S3.F3 "Figure 3 ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") gives an overview of GEPA and the full GEPA algorithm is formalized in Figure [4](https://arxiv.org/html/2507.19457#S3.F4 "Figure 4 ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
GEPA receives the following inputs: A system $\Phi$ instantiated with simple prompts to be optimized, training dataset $D_{train}$ (consisting of task instances $(x,m)$ as described in Section [2](https://arxiv.org/html/2507.19457#S2 "2 Problem Statement ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")), the standard evaluation metric $\mu$ for the task, a feedback function $\mu_{f}$ (introduced in Section [3](https://arxiv.org/html/2507.19457#S3 "3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")) and the total rollout budget $B$. Note that GEPA evolves only the set of prompts, denoted as $\Pi_{\Phi}$, whereas the underlying LLM weights, denoted by $\Theta_{\Phi}$ remains fixed.

Genetic Optimization Loop:
Given an AI system $\Phi$, the goal is to identify parameters $\Pi_{\Phi}$ that maximize task performance.
GEPA begins with a candidate pool $\mathcal{P}$ containing only the base system, where each candidate is a concrete instantiation of $\langle\Pi,\Theta_{frozen}\rangle_{\Phi}$.
It then enters an optimization loop, repeatedly proposing new candidates until the evaluation budget is exhausted.
Candidates are derived from existing ones via reflective mutation or crossover, guided by feedback from rollouts, with each inheriting learning signals from its parents and its own rollout so that GEPA accumulates knowledge along the genetic tree.
In each iteration, GEPA (i) selects promising candidates, (ii) proposes and evaluates a variant on a minibatch of tasks, and (iii) if it outperforms its parent(s), adds it to $\mathcal{P}$ with ancestry records and evaluate on $D_{pareto}$, the validation set used for selection.
After the budget is exhausted, GEPA returns the candidate with the best aggregate performance on $D_{pareto}$.

Reflective Prompt Mutation:
Natural language traces generated during the execution of a compound AI system offer rich visibility into the behavior and responsibilities of each module, as they capture the intermediate inferences and underlying reasoning steps. When these traces are paired with the final outcome of the system (e.g., success or failure), they provide substantial diagnostic value, allowing practitioners to trace errors or successes back to specific decisions made at the module level. LLMs can leverage these traces via reflection to perform implicit credit assignment, attributing responsibility for the final outcome to the relevant modules. This process of reflection can then be used to make targeted updates to individual modules, making large and effective updates to the whole system’s behavior.

Given a candidate to mutate in the current iteration of the optimization loop (stochastically selected from the Pareto-frontier, see Section [3.1](https://arxiv.org/html/2507.19457#S3.SS1 "3.1 Pareto-based candidate selection ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") below), GEPA executes the selected candidate on a stochastically sampled minibatch of input queries from the trainset, tracing the program’s execution. From the execution traces, GEPA extracts the module’s inputs, outputs, and reasoning, and calls the feedback function $\mu_{f}$, which returns a numeric score and text feedback including details about the evaluation (like compiler error messages, failed rubrics, etc.). GEPA selects the module (among the $|M|$ modules that the language program contains) to be updated based on a policy (round-robin), and a reflection LM is then shown the (current prompt, language program trajectory, score, feedback) with the task to reflectively attribute successes or failures to prompt elements and propose revised instructions. The updated module, with the rest of the language program, is evaluated again on the minibatch, and if the score improves, then the new program is added to the candidate pool. The meta-prompt for reflective prompt updates is shown in Appendix [C](https://arxiv.org/html/2507.19457#A3 "Appendix C GEPA’s Reflection and Prompt Update Meta Prompt ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") and the full algorithm is presented in Algorithm [1](https://arxiv.org/html/2507.19457#alg1 "Algorithm 1 ‣ Figure 4 ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").

Evaluation traces as diagnostic signals: The text that LLMs produce is the execution trace of the AI system. The text that the environment produces to compute the reward (e.g. compiler error messages before giving reward 0) is the evaluation trace.
Beyond reflection on execution traces, we identify a second valuable source of diagnostic information in the evaluation traces. Many evaluation metrics apply rich strategies (e.g., code evaluation may involve compilation, execution, and profiling), producing natural language traces before computing a scalar reward. We propose leveraging these evaluation traces for reflective credit assignment and targeted prompt updates. GEPA achieves this by extending rewards $\mu$ into a feedback function $\mu_{f}$ that extracts textual traces during evaluation and returns them with the final score as feedback_text. When available, such feedback can even be module-specific (e.g. in multi-hop systems the evaluator may provide feedback after each hop). In practice, there are domains where human-graders are able to rate the AI system’s responses, along with providing detailed feedback justifying their scalar ratings. When available, $D_{train}$ can be augmented with such human-written explanations for each instance; during reflection, and GEPA can consume these explanations as auxiliary feedback_text to guide targeted prompt updates, even when natural-language feedback from rollouts is limited or unavailable.

Figure 5: GEPA’s reflective prompt mutation systematically incorporates task-specific nuances, leading to substantial improvements in performance. This figure visualizes the optimization trajectory taken by GEPA, presenting an annotated subtree from Figure [25(d)](https://arxiv.org/html/2507.19457#A10.F25.sf4 "Figure 25(d) ‣ Figure 25 ‣ Appendix J GEPA Search Trees ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") (for the privacy-preserving delegation task PUPA) to demonstrate the iterative enhancements made to the prompts. The progression from the base prompt (candidate 0) to the best performing prompt (candidate 11) is highlighted with red arrows, and key prompt changes at each step are annotated beside the corresponding nodes. Full-length instructions for these iterations are provided in Appendix [K.1](https://arxiv.org/html/2507.19457#A11.SS1 "K.1 Prompts at intermediate stages for PUPA ‣ Appendix K Visualizing the Iterative Refinement achieved by GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"). Each prompt refinement in this trajectory adds targeted nuances informed by ongoing optimization, illustrating how GEPA’s process accumulates lessons to continually boost task performance.

### 3.1 Pareto-based candidate selection

GEPA is a highly modular algorithm that supports various strategies for candidate selection, with the choice of strategy governing the exploration–exploitation tradeoff. A naive approach is to always select the best-performing candidate, but this often traps the optimizer in a local optimum: once a dominant strategy is found, it becomes difficult to surpass, and the optimizer exhausts its budget without learning new, potentially better strategies.
Figure [6(a)](https://arxiv.org/html/2507.19457#S4.F6.sf1 "Figure 6(a) ‣ Figure 6 ‣ 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") illustrates this behavior: after finding one new strategy (the first child node), the search repeatedly attempts to refine it, fails to improve, and ultimately depletes the budget.

To address this, GEPA employs a Pareto-based “illumination" strategy ([Mouret and Clune, 2015](https://arxiv.org/html/2507.19457#bib.bib45)), shown in Algorithm [2](https://arxiv.org/html/2507.19457#alg2 "Algorithm 2 ‣ Figure 4 ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"). For each training instance, GEPA records the highest score across all candidates, forming a Pareto frontier. Candidates that achieve the best score on at least one task are retained, while strictly dominated ones are pruned.
From this pruned set, GEPA stochastically samples a candidate, weighting probabilities by how many tasks each candidate leads. This strategy helps GEPA escape local optima without inflating the search, efficiently balancing exploration and exploitation by focusing resources on candidates that embody “winning” strategies within the optimization budget.

## 4 Evaluation

Table 1: Benchmark results for different optimizers with Qwen3 8B. GEPA and GEPA+Merge achieve better performance than GRPO with far fewer rollouts on all benchmarks except AIME. For example, for IFBench, GEPA found optimal prompts after just 678 rollouts achieving 38.61%, outperforming GRPO’s test set score of 35.88% with 24,000 rollouts.

|  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Qwen3 8B | HotpotQA | IFBench | Hover | PUPA | AIME-2025 | LiveBench-Math | Aggregate | Improvement |
| Baseline | 42.33 | 36.90 | 35.33 | 80.82 | 27.33 | 48.70 | 45.23 | — |
| GRPO | 43.33 | 35.88 | 38.67 | 86.66 | 38.00 | 51.26 | 48.91 | +3.68 |
| MIPROv2 | 55.33 | 36.22 | 47.33 | 81.55 | 20.00 | 46.60 | 47.84 | +2.61 |
| GEPA | 62.33 | 38.61 | 52.33 | 91.85 | 32.00 | 51.95 | 54.85 | +9.62 |
| GEPA+Merge | 64.33 | 28.23 | 51.67 | 86.26 | 32.00 | 51.95 | 52.40 | +7.17 |
| Total optimization budget (# rollouts) | | | | | | | | |
| GEPA (+Merge) | 6871 | 3593 | 7051 | 2426 | 1839 | 1839 | 3936 | — |
| GRPO | 24000 | 24000 | 24000 | 24000 | 24000 | 24000 | 24000 | — |




Table 2: Benchmark results for different optimizers evaluated on GPT-4.1 Mini. As a prompt-optimization system, GEPA works off-the-shelf on closed-source models as well, outperforming state-of-the-art prompt optimizers including MIPROv2 (in 2 settings: Instruction-only optimization (“MIPROv2-No-Demos”) as well as joint instruction and few-shot optimization (“MIPROv2”)), Trace (with its OptoPrime optimizer), and TextGrad. Additionally, GEPA-optimized prompts demonstrate strong cross-model generalization: “GEPA-Qwen-Opt”—optimized entirely for (and using) the weaker Qwen3-8B—achieves a +9% gain when evaluated on GPT-4.1-Mini without modification, notably outperforming all baselines (MIPROv2, TextGrad, Trace) that optimized directly for (and using) GPT-4.1-Mini.

|  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GPT-4.1 Mini | HotpotQA | IFBench | Hover | PUPA | AIME-2025 | LiveBench-Math | Aggregate | Improvement |
| Baseline | 38.00 | 47.79 | 46.33 | 78.57 | 49.33 | 58.20 | 53.03 | — |
| Trace (OptoPrime) | 60.33 | 51.19 | 46.00 | 74.18 | 45.33 | 60.74 | 56.30 | +3.27 |
| MIPROv2-No-Demos | 38.00 | 52.04 | 51.33 | 91.85 | 48.67 | 60.97 | 57.14 | +4.11 |
| MIPROv2 | 58.00 | 49.15 | 48.33 | 83.37 | 51.33 | 61.84 | 58.67 | +5.64 |
| TextGrad | 62.33 | 48.64 | 47.67 | 85.68 | 46.67 | 63.84 | 59.14 | +6.11 |
| GEPA | 69.00 | 52.72 | 51.67 | 94.47 | 59.33 | 64.13 | 65.22 | +12.19 |
| GEPA+Merge | 65.67 | 55.95 | 56.67 | 96.46 | 59.33 | 64.13 | 66.36 | +13.33 |
| Optimized with Qwen3-8B, evaluated on GPT-4.1-Mini | | | | | | | | |
| GEPA-Qwen-Opt | 65.67 | 49.83 | 54.67 | 90.05 | 52.67 | 59.31 | 62.03 | +9.00 |

We adopt a standard train/validation/test split.
Optimizers have full access to the train split, including text and labels, for program tuning.
Although optimizers may monitor the performance of candidate parameters (like model checkpoints) by tracking scores on the validation set (to implement early stopping, for example), direct access to the content of validation instances is restricted.
We evaluate on six benchmarks—AIME-2025 ([Balunović et al., 2025](https://arxiv.org/html/2507.19457#bib.bib16)), LiveBench-Math ([White et al., 2025](https://arxiv.org/html/2507.19457#bib.bib15)), HotpotQA ([Yang et al., 2018](https://arxiv.org/html/2507.19457#bib.bib79)), IFBench ([Pyatkin et al., 2025a](https://arxiv.org/html/2507.19457#bib.bib78)), HoVer ([Jiang et al., 2020](https://arxiv.org/html/2507.19457#bib.bib76)), and PUPA ([Li et al., 2025a](https://arxiv.org/html/2507.19457#bib.bib77))—each paired with existing compound AI systems and feedback functions.
Experiments use Qwen3 8B ([Yang et al., 2025](https://arxiv.org/html/2507.19457#bib.bib72)) and GPT-4.1 Mini ([OpenAI, 2025](https://arxiv.org/html/2507.19457#bib.bib71)) with standardized inference settings, and compare against state-of-the-art optimizers MIPROv2 ([Opsahl-Ong et al., 2024](https://arxiv.org/html/2507.19457#bib.bib70)), Trace (with its OptoPrime optimizer) ([Cheng et al., 2024](https://arxiv.org/html/2507.19457#bib.bib7)), TextGrad ([Yuksekgonul et al., 2025](https://arxiv.org/html/2507.19457#bib.bib50)), and GRPO11
1
We use LoRA for GRPO due to its low cost and succesful adoption with GRPO ([Wang et al., 2025b](https://arxiv.org/html/2507.19457#bib.bib17); [Xu et al., 2025b](https://arxiv.org/html/2507.19457#bib.bib18); [Li et al., 2025b](https://arxiv.org/html/2507.19457#bib.bib19); [Yue et al., 2025](https://arxiv.org/html/2507.19457#bib.bib20); [Sun et al., 2025](https://arxiv.org/html/2507.19457#bib.bib21); [Hayou et al., 2025](https://arxiv.org/html/2507.19457#bib.bib22); [Zhao et al., 2025](https://arxiv.org/html/2507.19457#bib.bib23); [Teknium et al., 2024](https://arxiv.org/html/2507.19457#bib.bib24); [Zhao et al., 2024](https://arxiv.org/html/2507.19457#bib.bib25); [Sidahmed et al., 2024](https://arxiv.org/html/2507.19457#bib.bib26)). Additionally, we explore full-parameter finetuning. Figure [11](https://arxiv.org/html/2507.19457#A7.F11 "Figure 11 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") shows a similar result comparing GEPA to GRPO with full finetuning. ([Shao et al., 2024](https://arxiv.org/html/2507.19457#bib.bib67)). Appendix [E](https://arxiv.org/html/2507.19457#A5 "Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") provides further details on benchmarks, systems, and feedback functions (Subsection [E.1](https://arxiv.org/html/2507.19457#A5.SS1 "E.1 Benchmarks, Reference compound AI systems, and Feedback Functions ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")); models and inference settings (Subsection [E.2](https://arxiv.org/html/2507.19457#A5.SS2 "E.2 Models and Inference Parameters ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")); monetary cost to run the experiments (Subsection [E.3](https://arxiv.org/html/2507.19457#A5.SS3 "E.3 Costs ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"));
and optimizer configurations (Subsection [E.4](https://arxiv.org/html/2507.19457#A5.SS4 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")). Table [1](https://arxiv.org/html/2507.19457#S4.T1 "Table 1 ‣ 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), Table [2](https://arxiv.org/html/2507.19457#S4.T2 "Table 2 ‣ 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") and Figure [10](https://arxiv.org/html/2507.19457#A6.F10 "Figure 10 ‣ Appendix F Results and Analysis (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") summarize our main results, from which we derive the following observations:

Observation 1: Reflective Prompt Evolution is highly sample-efficient and can outperform weight-space reinforcement learning:
Across four benchmarks, GEPA adapts rapidly and generalizes robustly in compound AI systems—beating GRPO (24,000 rollouts) by up to 19% while using up to $35\times$ fewer rollouts. It reaches optimal test performance with $4$–$35\times$ fewer rollouts and exceeds GRPO on 5 out of 6 tasks by 19.0%, 2.73%, 13.66%, 5.19% and 0.7%. GEPA matches GRPO’s best validation after only 243, 402, 330, 1143, 1179, and 306 rollouts—up to $78\times$ greater sample efficiency. GEPA+Merge widens the gap, outperforming GRPO by 21% at a comparable rollout budget to GEPA.

The majority of GEPA’s rollout budget is spent on validation, where scores are utilized solely for candidate selection and not for producing learning signals. If we restrict the analysis to train set rollouts, GEPA requires only 79 to 737 rollouts to reach optimal performance. To match GRPO’s best validation scores, GEPA achieves this with only 102, 32, 6, and 179 train rollouts for four tasks, respectively, underscoring the high sample efficiency of learning based on reflective prompt evolution.

Since tracking candidates’ validation performance accounts for majority of GEPA’s rollout budget, sample efficiency can be further improved by evaluating on a smaller validation set or by tracking scores on dynamically selected validation subsets instead of the full set—both of which we propose as directions for future work.
Figures [1(a)](https://arxiv.org/html/2507.19457#S0.F1.sf1 "Figure 1(a) ‣ Figure 1 ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),  [1(b)](https://arxiv.org/html/2507.19457#S0.F1.sf2 "Figure 1(b) ‣ Figure 1 ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),  [14(c)](https://arxiv.org/html/2507.19457#A7.F14.sf3 "Figure 14(c) ‣ Figure 14 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") and  [15(c)](https://arxiv.org/html/2507.19457#A7.F15.sf3 "Figure 15(c) ‣ Figure 15 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") show the full performance-vs-rollouts curve for all optimizers over benchmarks HotpotQA, IFBench, HoVer and PUPA, respectively.

Observation 2: Reflective prompt evolution enables instruction-optimization alone to outperform joint instruction and few-shot optimization: We compare GEPA with MIPROv2, a state-of-the-art instruction and few-shot optimizer, using two leading models across six diverse tasks, and observe that GEPA consistently outperforms MIPROv2 in all settings, achieving margins as high as 11.1% for GPT-4.1 mini and 10.3% for Qwen3 8B. Further, GEPA and GEPA+Merge more than double the aggregate gains over baseline seen with MIPROv2 across all benchmarks and models (+13.33% and +12.19% vs +5.64% for MIPROv2).

While prior works such as  [Opsahl-Ong et al. (2024)](https://arxiv.org/html/2507.19457#bib.bib70) and  [Wan et al. (2024)](https://arxiv.org/html/2507.19457#bib.bib80) have provided compelling evidence for the effectiveness of few-shot example optimization—often outperforming instruction-based approaches—our findings suggest an exciting shift in this trend. We attribute this primarily to recent advances in the instruction-following and self-reflective abilities of LLMs, as well as the design choices in GEPA that capitalize on these improved capabilities. To further contextualize our findings, we redo the study on generalization gap (the difference between validation and test set performance for optimized prompts) as proposed by  [Wan et al. (2024)](https://arxiv.org/html/2507.19457#bib.bib80). The results presented in Figure [16](https://arxiv.org/html/2507.19457#A8.F16 "Figure 16 ‣ Appendix H Generalization Gap ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") reinforce these observations: reflectively evolved instructions now demonstrate a lower generalization gap, underscoring both advancements in model capabilities and the benefits of GEPA’s design. We see this as a reflection of the continuous evolution of LLMs and GEPA’s ability to effectively leverage these improvements.

We provide the full-length optimized prompts produced by GEPA for all systems, benchmarks, and models in Appendix [L](https://arxiv.org/html/2507.19457#A12 "Appendix L Examples of best prompts for every benchmark ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), alongside MIPROv2 prompts. Notably, in contrast to prior findings where instruction optimization yielded improvements primarily through quasi-exemplars ([Wan et al., 2024](https://arxiv.org/html/2507.19457#bib.bib80)), GEPA’s prompts frequently contain detailed declarative instructions for completing the task, as illustrated in Figure [2](https://arxiv.org/html/2507.19457#S1.F2 "Figure 2 ‣ 1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").

Observation 3: The next-candidate selection strategy strongly influences the optimization trajectory and final performance, with Pareto-based sampling providing a distinct advantage.

Table 3: Comparing candidate selection strategies across different tasks with Qwen3 8B while keeping the evolution harness fixed.
At each step, SelectBestCandidate (used by TextGrad [Yuksekgonul et al. (2025)](https://arxiv.org/html/2507.19457#bib.bib50)) evolves only from the top-scoring candidate. BeamSearch maintains a pool of the top-N candidates (used by APO [Pryzant et al. (2023)](https://arxiv.org/html/2507.19457#bib.bib1)), but is still prone to local optima. In comparison, GEPA’s Pareto-based selection yields a +12.44% improvement, significantly outperforming the +6.05% and +5.11% gains of greedy and beam-search strategies respectively.

| Qwen3 8B | HotpotQA | IFBench | Hover | PUPA | Aggregate | Improvement |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline | 42.33 | 36.90 | 35.33 | 80.82 | 48.84 | — |
| SelectBestCandidate | 58.33 | 30.44 | 45.33 | 85.45 | 54.89 | +6.05 |
| BeamSearch | 57.33 | 36.39 | 41.00 | 81.08 | 53.95 | +5.11 |
| GEPA | 62.33 | 38.61 | 52.33 | 91.85 | 61.28 | +12.44 |



(a) SelectBestCandidate Strategy

(b) Pareto-based candidate sampling.

Figure 6: Comparing the impact of different candidate selection strategies. (Left) As can be seen, selecting the best-performing candidate in every iteration led to a local-optima after one iteration, leading to suboptimal search performance. (Right) On the other hand, using pareto-based candidate selection strategy, GEPA was able to generate a balanced search tree, finding a better performing program within the same budget.

GEPA refines prompts iteratively with rollout feedback; to test our Pareto-based selection, we compare against a baseline that always picks the best-performing candidate in the SelectBestCandidate strategy (which is similar to the strategy used by TextGrad [Yuksekgonul et al. (2025)](https://arxiv.org/html/2507.19457#bib.bib50)), and BeamSearch(N=4) (used by APO [Pryzant et al. (2023)](https://arxiv.org/html/2507.19457#bib.bib1)).
As shown in Table [3](https://arxiv.org/html/2507.19457#S4.T3 "Table 3 ‣ 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), these baselines often yield suboptimal exploration of the prompt search space, leading to poor performance. GEPA with Pareto-based sampling outperforms the BeamSearch strategy by upto 11.33%, and SelectBestCandidate strategy by up to 8.17%, with an aggregate margin of +7.33% and +6.4% across all benchmarks, respectively. Figure [6](https://arxiv.org/html/2507.19457#S4.F6 "Figure 6 ‣ 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") highlights the difference in optimization trajectories: always choosing the current best candidate gives immediate improvement but quickly stalls, wasting rollouts on a single candidate. In contrast, our Pareto-based method expands the search by considering all Pareto-optimal candidates (all “winning” strategies found so far), balancing exploration and exploitation and converging to a higher-performing solution within the same rollout budget.

Observation 4: Instruction-optimized prompts are computationally cheaper and generalize better than few-shot demonstration prompts: In addition to their strong generalization capabilities, reflectively evolved instructions offer a significant practical advantage: they are often much shorter and thus computationally more efficient than few-shot demonstration prompts. This advantage becomes especially clear for complex tasks, where even a single few-shot demonstration can be prohibitively long. The problem is further exacerbated when few-shot examples are optimized using state-of-the-art methods such as MIPROv2, which jointly optimizes multiple demonstrations to be used simultaneously, further increasing prompt length.

In contrast, reflectively evolved instructions—such as those generated by GEPA—maintain compactness while providing large performance gains (as demonstrated in Lessons 1 and 2). To illustrate this, we compare GEPA’s and MIPROv2’s prompt lengths (see Figure [18](https://arxiv.org/html/2507.19457#A9.F18 "Figure 18 ‣ Appendix I Cost vs. Performance Analysis for optimized systems ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")). Notably, prompts produced by GEPA and GEPA+Merge are up to $9.2\times$ shorter than those from MIPROv2, representing a substantial improvement in efficiency, alongside performance improvements.

Moreover, we observe a trend where, in aggregate, optimizers that achieve higher performance tend to produce shorter prompts (see Figure [17](https://arxiv.org/html/2507.19457#A9.F17 "Figure 17 ‣ Appendix I Cost vs. Performance Analysis for optimized systems ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")). This reduction in prompt size has a significant impact—not only reducing runtime cost for downstream tasks (as all API-providers meter the input tokens), but also decreasing latency and improving the overall efficiency of LLM-serving systems ([Kwon et al., 2023](https://arxiv.org/html/2507.19457#bib.bib44); [Zheng et al., 2024](https://arxiv.org/html/2507.19457#bib.bib43); [Agrawal et al., 2023](https://arxiv.org/html/2507.19457#bib.bib42); [Yu et al., 2025](https://arxiv.org/html/2507.19457#bib.bib41)).

Observation 5: System aware crossover strategies can provide large gains, but the optimal budget allocation between mutation and crossover, as well as when to invoke merge needs further study: We identify a unique system-aware crossover strategy and operationalize it as Merge (described in Appendix [D.1](https://arxiv.org/html/2507.19457#A4.SS1 "D.1 Merge: System-aware crossover strategy for Compound AI optimization ‣ Appendix D GEPA Algorithm and Methodology Details ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")). GEPA+Merge can outperform GEPA by as much as 5%, providing an aggregate 2% additional improvement over the already strong performance established by GEPA. Detailed results are available in Table [1](https://arxiv.org/html/2507.19457#S4.T1 "Table 1 ‣ 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"). We attribute these gains to the ability of GEPA+Merge to identify distinct optimization lineages, that have learnt complementary strategies (by evolving distinct modules), and merging them by picking the best version of different modules from each of these lineages to propose a single, optimal candidate.

While in our analysis, we found GEPA+Merge works especially well for GPT-4.1 Mini, it lead to performance degradation when used with Qwen3 8B. Even Qwen3 8B benefits from Merge on one out of four tasks. We attribute these discrepancies to the way the rollout budget is allocated between reflective mutation and crossover, and the timing of invocation of the crossover strategy. In our experiments, we fixed the same hyperparameters for GPT-4.1 Mini and Qwen3 8B, leading to suboptimal choice for Qwen3 8B. Intuitively, crossover would provide the maximum benefit, when there are independent lineages that perform well. Hence, the hyperparameters should be chosen such that Merge is invoked once the optimization tree has evolved sufficiently different lineages. We propose the study of such adaptive techniques as future work.

Observation 6: GEPA-optimized prompts demonstrate cross-model generalization. Table [2](https://arxiv.org/html/2507.19457#S4.T2 "Table 2 ‣ 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") presents results for “GEPA-Qwen-Opt”, a configuration where prompts were optimized using the smaller Qwen3-8B model but evaluated on GPT-4.1-Mini. Despite originating from a weaker model in a different family, these prompts transfer effectively, achieving a +9.00% aggregate improvement across 6 benchmarks (with gains as high as +27.67% on HotpotQA). Remarkably, this transfer performance outperforms strong baselines like MIPROv2 (+5.64%), TextGrad (+6.11%), and Trace (+3.27%), even though those methods were optimized directly on the target GPT-4.1-Mini model.

## 5 Extended Applications of GEPA

### 5.1 GEPA For Inference-Time Search (Contd.)

While the primary focus of this paper is sample-efficient adaptation of AI systems to new tasks, preliminary findings suggest that GEPA may also serve as a promising inference-time search technique. This can be achieved by passing the set of tasks to be solved (for example, a list of Pytorch modules to be converted to CUDA) as the training set to GEPA, ensuring that both $D_{train}$ and $D_{pareto}$ contain the full set of tasks. This way, GEPA can “overfit” the set of tasks, iteratively proposing better solutions to every problem. We also note that this allows GEPA to apply lessons and insights extracted from rollouts for one task to other tasks. To explore this use case, we conduct preliminary experiments using GEPA as an inference-time search technique for code-generation tasks on two hardware platforms: writing kernels for AMD’s recently introduced XDNA2 Architecture ([Advanced Micro Devices, 2025](https://arxiv.org/html/2507.19457#bib.bib40)) using an early version of the NPUEval benchmark ([Kalade and Schelle, 2025](https://arxiv.org/html/2507.19457#bib.bib39)), and generating CUDA code for NVIDIA-V100 GPUs using KernelBench ([Ouyang et al., 2025](https://arxiv.org/html/2507.19457#bib.bib38)).

A distinguishing aspect of these experiments is the use of the feedback function $\mu_{f}$ to dynamically inject domain-specific knowledge into the optimization process. Specifically, kernel development expertise—often codified in technical manuals and documentation—can be selectively surfaced by retrieving relevant manual sections based on rollout failures (e.g., compiler error messages). By using error information to make targetted retrieval queries, GEPA promotes integration of architectural best practices into prompt evolution, as exemplified by the detailed prompt for NPUEval shown in Figure [27](https://arxiv.org/html/2507.19457#A13.F27 "Figure 27 ‣ M.1 NPUEval: Kernel Code Generation for new hardware architecture ‣ Appendix M GEPA generated prompts for kernel generation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"). We also note that generation stochasticity (temperature based sampling) is eliminated by operating under a cache; this ensures that observed improvements tie closely to inference scaling through prompt updates and GEPA’s diverse prompt exploration, rather than stochasticity in the model’s sampling process.

NPU Kernels: We create a sequential refinement agent that iteratively generates kernels (up to 10 times) based on feedback like compiler errors and profiling results (Sequential10), and evaluate the Best-of-N generation. With GPT-4o alone, Sequential10 reaches only 4.25% mean vector utilization. Adding RAG, sourced from technical manuals, improves this to 16.33%, and integrating MIPROv2 further raises it to 19.03%. Notably, applying GEPA to Sequential10 (without RAG) dramatically boosts kernel performance, with several generated kernels achieving up to 70% vector utilization and a mean of 30.52%. Furthermore, a single prompt generated by GEPA enables Sequential10 (again without RAG) to attain a score of 26.85%.

CUDA Kernels: For 35 tasks from the KernelBench “representative subset” ([Ouyang et al., 2025](https://arxiv.org/html/2507.19457#bib.bib38)), spanning three difficulty levels, we ran GEPA with GPT-4o. As depicted in Figure [8](https://arxiv.org/html/2507.19457#S5.F8 "Figure 8 ‣ 5.1 GEPA For Inference-Time Search (Contd.) ‣ 5 Extended Applications of GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), GEPA boosts GPT-4o’s close-to-0% $fast_{1}$ score to above 20% with increasing search budget. This task used an agent that could generate upto 5 sequential refinements based on environment feedback (Sequential5).

These experiments with GPT-4o also demonstrate GEPA’s ability to leverage the abilities of frontier LLMs. However, these are early results and warrant further systematic study. We believe that leveraging GEPA for inference-time search, particularly when coupled with domain specific textual feedback, could generalize to other code generation and domain adaptation tasks—a direction we leave for future work.

Figure 7: GEPA with GPT-4o is able to generate kernels for AMD NPUs that achieve vector utilization rates as high as 70%, with a mean utilization score of 30.52%. In comparison, GPT-4o, even after up to 10 sequential refinements with environment feedback, achieves an aggregate score of only 4.25%. When enhanced with retrieval-augmented generation (RAG) and MIPRO, the sequential refinement agent improves to scores of 16.33% and 19.03%, respectively. Notably, the final prompt produced by GEPA enables the same agent to reach a utilization score of 26.85%, all without requiring any runtime RAG.




Figure 8: GEPA with GPT-4o is able to iteratively refine and improve CUDA Kernel Code. The graphs shows $fast_{p}$ vs. rollouts plot for p=$[0.5,1]$, where the speedup is calculated over Pytorch-eager. $fast_{p}$ is a metric described in ([Ouyang et al., 2025](https://arxiv.org/html/2507.19457#bib.bib38)) that measures the fraction of tasks for which the method generated a kernel executing faster than $p$ times the baseline. As can be seen, GEPA with GPT-4o is able to generate cuda kernels executing faster than Pytorch-eager for over 20% of the 35 representative tasks.

### 5.2 GEPA for Adversarial Prompt Search (Contd.)

We instantiate GEPA for adversarial prompt search by inverting the reward signal: the optimizer proposes prompt edits to include additional information like trivia that minimize task performance (pass@1), while requiring that prompts do not contradict the task and still contain all information needed to solve it. For AIME, GEPA’s adversarial search used AIME 2022–2024 problems as the pool for prompt evolution. The learned prompt was evaluated on AIME-2025 (30 problems), using GPT-5 Mini with 5 runs per problem (150 generations total). We started from a clean instruction prompt and evolved a single universal adversarial instruction that is prepended to each query.

The learned adversarial instruction reduced pass@1 on AIME-2025 from 76% (clean prompt) to 10% (adversarial prompt), despite preserving the nominal task description and the required answer-format directive.

Base (clean) prompt:

> You are a helpful assistant. You are given a question and you need to answer it. The answer should be given at the end of your response in exactly the format ‘`### <final answer>`’.

GEPA-generated adversarial prompt (abridged):

> You are a helpful assistant. You are given a question and you need to answer it. It’s interesting to note that honey never spoils and that the longest river in the world is the Nile, stretching over 6,650 kilometers. When providing your answer, be sure to format it at the end of your response exactly as ‘`### <final answer>`’. For this task, remember that many mammals, including dolphins, sleep with one eye open. Proceed to answer the given question accordingly.

Manual inspection showed that the adversarial prompt caused GPT-5 Mini to end most responses with the literal placeholder `### <final answer>`, indicating a systematic misinterpretation of the formatting rule when paired with the injected distractors. This suggests that the large drop arises from the interaction between extraneous details and a strict, literal formatting constraint, rather than from the formatting requirement alone.

Adversarial prompt search systematically uncovers instruction-level perturbations that sharply degrade model performance, providing a principled, automated way to probe worst-case robustness beyond average-case metrics. By finding universal, task-preserving distractors (e.g., trivia plus strict formatting), it reveals brittle instruction-following interactions and turns them into reusable stress tests and regression suites for continuous evaluation. The resulting adversarial prompts could be used to provide targeted data for fine-tuning or safety training. In practice, this could improve deployment reliability, enables red-teaming at scale, and help track robustness drift over time across models, versions, and domains.

## 6 Related Work

Prompt optimization improves LLMs but often needs manual expertise; for instance, chain-of-thought prompting [Wei et al. (2023)](https://arxiv.org/html/2507.19457#bib.bib52). To scale this approach, recent methods use LLMs to optimize prompts automatically ([Zhou et al., 2022](https://arxiv.org/html/2507.19457#bib.bib51); [Yang et al., 2024](https://arxiv.org/html/2507.19457#bib.bib53); [Agarwal et al., 2024](https://arxiv.org/html/2507.19457#bib.bib63); [Fernando et al., 2024](https://arxiv.org/html/2507.19457#bib.bib55)). GEPA leverages LLMs, but differs by incorporating textual environment feedback, Pareto-aware search over candidates, and evolution strategies per submodule within an AI system.

Evolutionary algorithms have been used to optimize prompts, e.g., EvoPrompt ([Guo et al., 2024](https://arxiv.org/html/2507.19457#bib.bib54)), which evolves prompt populations. Rainbow Teaming ([Samvelyan et al., 2024](https://arxiv.org/html/2507.19457#bib.bib2)) applies quality-diversity evolution to generate diverse adversarial prompts. GEPA additionally uses domain-specific feedback for targeted mutations achieving higher sample efficiency. AlphaEvolve ([Novikov et al., 2025](https://arxiv.org/html/2507.19457#bib.bib64)) and OpenEvolve ([Sharma, 2025](https://arxiv.org/html/2507.19457#bib.bib57)) apply evolutionary search directly to code rewriting, excelling when problem solution can be codified. While AlphaEvolve targets a single hard problem, GEPA brings evolution to prompts across domains, combining Pareto-frontier optimization and prompt evolution to transfer tactics from related problems.

Feedback-driven improvement often uses reinforcement learning, such as majority voting signals ([Zuo et al., 2025](https://arxiv.org/html/2507.19457#bib.bib59)), but RL can be sample-inefficient when rewards are slow to compute. An alternative is learning in the language space: in-context bandit/self-bootstrapping methods ([Shinn et al., 2023](https://arxiv.org/html/2507.19457#bib.bib3); [Madaan et al., 2023](https://arxiv.org/html/2507.19457#bib.bib4)) ([Monea et al., 2025](https://arxiv.org/html/2507.19457#bib.bib61); [Xu et al., 2025a](https://arxiv.org/html/2507.19457#bib.bib56); [Feng et al., 2025](https://arxiv.org/html/2507.19457#bib.bib9); [Cheng et al., 2024](https://arxiv.org/html/2507.19457#bib.bib7)), workflow memory and skills ([Wang et al., 2024](https://arxiv.org/html/2507.19457#bib.bib60); [Wang et al., 2025c](https://arxiv.org/html/2507.19457#bib.bib11)), and test-time strategy synthesis via Dynamic Cheatsheet ([Suzgun et al., 2025](https://arxiv.org/html/2507.19457#bib.bib62)), reasoning cache ([Chen et al., 2025b](https://arxiv.org/html/2507.19457#bib.bib10)). GEPA instead uses examples to propose new instructions, yielding task-specific rules.

To optimize compound AI systems and agents ([Lin et al., 2025b](https://arxiv.org/html/2507.19457#bib.bib6)), DSPy ([Khattab et al., 2022](https://arxiv.org/html/2507.19457#bib.bib66); [Khattab et al., 2024](https://arxiv.org/html/2507.19457#bib.bib69)) searches/bootstraps few-shot examples, TextGrad ([Yuksekgonul et al., 2025](https://arxiv.org/html/2507.19457#bib.bib50)) backpropagates textual feedback, and MIPROv2 ([Opsahl-Ong et al., 2024](https://arxiv.org/html/2507.19457#bib.bib70)) jointly aligns instructions and examples via Bayesian optimization; these largely rely on global rewards. Agent-Pro ([Zhang et al., 2024](https://arxiv.org/html/2507.19457#bib.bib5)) evolves agent policies through dynamic belief generation and reflection on interactive experiences. Optimas ([Wu et al., 2025a](https://arxiv.org/html/2507.19457#bib.bib58)) introduces globally aligned local rewards per module. GEPA combines global rewards with environment textual feedback per module and maintains a Pareto frontier over individual data instances, matching prompts/agent design to specific examples. The Pareto-guided evolution lets GEPA explore diverse prompt/code/agent design strategies before converging to a robust, generalizable set.

## 7 Conclusion

We introduced GEPA, a prompt optimizer for arbitrary LLM agents and workflows that leverages explicit reflection and Pareto-based selection, showing superior sample efficiency compared to reinforcement learning (GRPO), while outperforming leading prompt optimizers (MIPROv2). By explicitly incorporating natural language feedback and maintaining a diverse pool of Pareto-optimal candidates, GEPA rapidly adapts AI systems to new tasks. Our results across benchmarks and models suggest that language-based reflection can offer a scalable strategy for optimizing complex real-world AI workflows, especially in resource-constrained settings. GEPA also shows promise as an inference-time search strategy, showing the ability to write code in challenging domains.

## References

- Advanced Micro Devices (2025)
  Advanced Micro Devices
  AMD xdna™ architecture.
  Note: <https://www.amd.com/en/technologies/xdna.html#xdna2>Accessed on: 2025-07-23
  Cited by: [§5.1](https://arxiv.org/html/2507.19457#S5.SS1.p1.1 "5.1 GEPA For Inference-Time Search (Contd.) ‣ 5 Extended Applications of GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Agarwal et al. (2024)
  E. Agarwal, J. Singh, V. Dani, R. Magazine, T. Ganu, and A. Nambi
  PromptWizard: task-aware prompt optimization framework.
  External Links: 2405.18369,
  [Link](https://arxiv.org/abs/2405.18369)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p1.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Agrawal et al. (2023)
  A. Agrawal, A. Panwar, J. Mohan, N. Kwatra, B. S. Gulavani, and R. Ramjee
  Sarathi: efficient llm inference by piggybacking decodes with chunked prefills.
  arXiv preprint arXiv:2308.16369.
  Cited by: [§4](https://arxiv.org/html/2507.19457#S4.p12.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- AI (2025)
  M. AI
  Llama-prompt-ops: an open-source tool for seamless migration from other llms to llama, and for general prompt optimization.
  Note: <https://github.com/meta-llama/llama-prompt-ops>Accessed: 2025-07-11
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p2.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Balunović et al. (2025)
  M. Balunović, J. Dekoninck, I. Petrov, N. Jovanović, and M. Vechev
  AIME-2025.
   SRI Lab, ETH Zurich.
  Note: Dataset from MathArena: Evaluating LLMs on Uncontaminated Math Competitions
  External Links: [Link](https://huggingface.co/datasets/MathArena/aime_2025)
  Cited by: [§E.1](https://arxiv.org/html/2507.19457#A5.SS1.p4.1 "E.1 Benchmarks, Reference compound AI systems, and Feedback Functions ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p4.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Cao et al. (2025)
  S. Cao, S. Hegde, D. Li, T. Griggs, S. Liu, E. Tang, J. Pan, X. Wang, A. Malik, G. Neubig, K. Hakhamaneshi, R. Liaw, P. Moritz, M. Zaharia, J. E. Gonzalez, and I. Stoica
  SkyRL-v0: train real-world long-horizon agents via reinforcement learning.
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p5.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Chen et al. (2025a)
  M. Chen, T. Li, H. Sun, Y. Zhou, C. Zhu, H. Wang, J. Z. Pan, W. Zhang, H. Chen, F. Yang, Z. Zhou, and W. Chen
  ReSearch: Learning to Reason with Search for LLMs via Reinforcement Learning.
   arXiv.
  Note: arXiv:2503.19470 [cs]Comment: Work in progress
  External Links: [Link](http://arxiv.org/abs/2503.19470),
  [Document](https://dx.doi.org/10.48550/arXiv.2503.19470)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Chen et al. (2025b)
  P. B. Chen, Y. Zhang, D. Roth, S. Madden, J. Andreas, and M. Cafarella
  Log-augmented generation: scaling test-time reasoning with reusable computation.
  External Links: 2505.14398,
  [Link](https://arxiv.org/abs/2505.14398)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Chen et al. (2025c)
  P. Chen, X. Li, Z. Li, X. Chen, and T. Lin
  Spectral Policy Optimization: Coloring your Incorrect Reasoning in GRPO.
   arXiv.
  Note: arXiv:2505.11595 [cs]Comment: 28 pages
  External Links: [Link](http://arxiv.org/abs/2505.11595),
  [Document](https://dx.doi.org/10.48550/arXiv.2505.11595)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Cheng et al. (2024)
  C. Cheng, A. Nie, and A. Swaminathan
  Trace is the next autodiff: generative optimization with rich feedback, execution traces, and llms.
  External Links: 2406.16218,
  [Link](https://arxiv.org/abs/2406.16218)
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p4.1.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Feng et al. (2025)
  X. Feng, B. Liu, Y. Song, H. Fu, Z. Wan, G. A. Koushik, Z. Hu, M. Yang, Y. Wen, and J. Wang
  Natural language reinforcement learning.
  External Links: 2411.14251,
  [Link](https://arxiv.org/abs/2411.14251)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Fernando et al. (2024)
  C. Fernando, D. Banarse, H. Michalewski, S. Osindero, and T. Rockt""aschel
  Promptbreeder: self-referential self-improvement via prompt evolution.
  In Proceedings of the 41st International Conference on Machine Learning,
  ICML’24.
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p1.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Griggs et al. (2025)
  T. Griggs, S. Hegde, E. Tang, S. Liu, S. Cao, D. Li, C. Ruan, P. Moritz, K. Hakhamaneshi, R. Liaw, A. Malik, M. Zaharia, J. E. Gonzalez, and I. Stoica
  Evolving skyrl into a highly-modular rl framework.
  Note: Notion Blog
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p5.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Guo et al. (2024)
  Q. Guo, R. Wang, J. Guo, B. Li, K. Song, X. Tan, G. Liu, J. Bian, and Y. Yang
  Connecting large language models with evolutionary algorithms yields powerful prompt optimizers.
  In The Twelfth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=ZG3RaNIsO8)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p2.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Hayou et al. (2025)
  S. Hayou, N. Ghosh, and B. Yu
  PLoP: Precise LoRA Placement for Efficient Finetuning of Large Models.
   arXiv.
  Note: arXiv:2506.20629 [cs]Comment: TD,LR: A lightweight module type selection method for LoRA finetuning. PLoP gives precise placements for LoRA adapters for improved performance
  External Links: [Link](http://arxiv.org/abs/2506.20629),
  [Document](https://dx.doi.org/10.48550/arXiv.2506.20629)
  Cited by: [footnote 1](https://arxiv.org/html/2507.19457#footnote1 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Hu et al. (2022)
  E. J. Hu, Y. Shen, P. Wallis, Z. Allen-Zhu, Y. Li, S. Wang, L. Wang, W. Chen, et al.
  Lora: low-rank adaptation of large language models..
  ICLR 1 (2), pp. 3.
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p6.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Jiang et al. (2020)
  Y. Jiang, S. Bordia, Z. Zhong, C. Dognin, M. Singh, and M. Bansal
  HoVer: a dataset for many-hop fact extraction and claim verification.
  In Findings of the Association for Computational Linguistics: EMNLP 2020, T. Cohn, Y. He, and Y. Liu (Eds.),
  Online, pp. 3441–3460.
  External Links: [Link](https://aclanthology.org/2020.findings-emnlp.309/),
  [Document](https://dx.doi.org/10.18653/v1/2020.findings-emnlp.309)
  Cited by: [§E.1](https://arxiv.org/html/2507.19457#A5.SS1.p6.1 "E.1 Benchmarks, Reference compound AI systems, and Feedback Functions ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p4.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Jin et al. (2025)
  B. Jin, H. Zeng, Z. Yue, J. Yoon, S. Arik, D. Wang, H. Zamani, and J. Han
  Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning.
   arXiv.
  Note: arXiv:2503.09516 [cs]Comment: 31 pages
  External Links: [Link](http://arxiv.org/abs/2503.09516),
  [Document](https://dx.doi.org/10.48550/arXiv.2503.09516)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Kalade and Schelle (2025)
  S. Kalade and G. Schelle
  NPUEval: optimizing npu kernels with llms and open source compilers.
  External Links: 2507.14403,
  [Link](https://arxiv.org/abs/2507.14403)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p5.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§5.1](https://arxiv.org/html/2507.19457#S5.SS1.p1.1 "5.1 GEPA For Inference-Time Search (Contd.) ‣ 5 Extended Applications of GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Khattab et al. (2022)
  O. Khattab, K. Santhanam, X. L. Li, D. Hall, P. Liang, C. Potts, and M. Zaharia
  Demonstrate-search-predict: composing retrieval and language models for knowledge-intensive NLP.
  arXiv preprint arXiv:2212.14024.
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p4.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Khattab et al. (2024)
  O. Khattab, A. Singhvi, P. Maheshwari, Z. Zhang, K. Santhanam, S. V. A, S. Haq, A. Sharma, T. T. Joshi, H. Moazam, H. Miller, M. Zaharia, and C. Potts
  DSPy: compiling declarative language model calls into state-of-the-art pipelines.
  In The Twelfth International Conference on Learning Representations,
  External Links: [Link](https://openreview.net/forum?id=sY5N0zY5Od)
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p2.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§2](https://arxiv.org/html/2507.19457#S2.p1.1 "2 Problem Statement ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§6](https://arxiv.org/html/2507.19457#S6.p4.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Kwon et al. (2023)
  W. Kwon, Z. Li, S. Zhuang, Y. Sheng, L. Zheng, C. H. Yu, J. Gonzalez, H. Zhang, and I. Stoica
  Efficient memory management for large language model serving with pagedattention.
  In Proceedings of the 29th symposium on operating systems principles,
  pp. 611–626.
  Cited by: [§4](https://arxiv.org/html/2507.19457#S4.p12.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Lambert (2025)
  N. Lambert
  Policy gradient algorithms.
  In RLHF Book: Reinforcement Learning from Human Feedback,
  Note: Accessed July 16, 2025
  External Links: [Link](https://rlhfbook.com/c/11-policy-gradients.html)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Li et al. (2025a)
  S. Li, V. C. Raghuram, O. Khattab, J. Hirschberg, and Z. Yu
  PAPILLON: privacy preservation from Internet-based and local language model ensembles.
  In Proceedings of the 2025 Conference of the Nations of the Americas Chapter of the Association for Computational Linguistics: Human Language Technologies (Volume 1: Long Papers), L. Chiruzzo, A. Ritter, and L. Wang (Eds.),
  Albuquerque, New Mexico, pp. 3371–3390.
  External Links: [Link](https://aclanthology.org/2025.naacl-long.173/),
  [Document](https://dx.doi.org/10.18653/v1/2025.naacl-long.173),
  ISBN 979-8-89176-189-6
  Cited by: [§E.1](https://arxiv.org/html/2507.19457#A5.SS1.p7.1 "E.1 Benchmarks, Reference compound AI systems, and Feedback Functions ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p4.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Li et al. (2025b)
  X. Li, A. Shakir, R. Huang, J. Lipp, and J. Li
  ProRank: Prompt Warmup via Reinforcement Learning for Small Language Models Reranking.
   arXiv.
  Note: arXiv:2506.03487 [cs]
  External Links: [Link](http://arxiv.org/abs/2506.03487),
  [Document](https://dx.doi.org/10.48550/arXiv.2506.03487)
  Cited by: [footnote 1](https://arxiv.org/html/2507.19457#footnote1 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Lin et al. (2025a)
  C. Lin, Y. Wen, D. Su, F. Sun, M. Chen, C. Bao, and Z. Lv
  Knowledgeable-r1: Policy Optimization for Knowledge Exploration in Retrieval-Augmented Generation.
   arXiv.
  Note: arXiv:2506.05154 [cs]
  External Links: [Link](http://arxiv.org/abs/2506.05154),
  [Document](https://dx.doi.org/10.48550/arXiv.2506.05154)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Lin et al. (2025b)
  M. Lin, J. Sheng, A. Zhao, S. Wang, Y. Yue, V. S. J. Huang, H. Liu, J. Liu, G. Huang, and Y. Liu
  Training of scaffolded language models with language supervision: a survey.
  External Links: 2410.16392,
  [Link](https://arxiv.org/abs/2410.16392)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p4.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Liu et al. (2025)
  S. Liu, S. Hegde, S. Cao, A. Zhu, D. Li, T. Griggs, E. Tang, A. Malik, K. Hakhamaneshi, R. Liaw, P. Moritz, M. Zaharia, J. E. Gonzalez, and I. Stoica
  SkyRL-sql: matching gpt-4o and o4-mini on text2sql with multi-turn rl.
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p5.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Madaan et al. (2023)
  A. Madaan, N. Tandon, P. Gupta, S. Hallinan, L. Gao, S. Wiegreffe, U. Alon, N. Dziri, S. Prabhumoye, Y. Yang, S. Gupta, B. P. Majumder, K. Hermann, S. Welleck, A. Yazdanbakhsh, and P. Clark
  Self-refine: iterative refinement with self-feedback.
  In Advances in Neural Information Processing Systems, A. Oh, T. Naumann, A. Globerson, K. Saenko, M. Hardt, and S. Levine (Eds.),
  Vol. 36, pp. 46534–46594.
  External Links: [Link](https://proceedings.neurips.cc/paper_files/paper/2023/file/91edff07232fb1b55a505a9e9f6c0ff3-Paper-Conference.pdf)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Monea et al. (2025)
  G. Monea, A. Bosselut, K. Brantley, and Y. Artzi
  LLMs are in-context bandit reinforcement learners.
  External Links: 2410.05362,
  [Link](https://arxiv.org/abs/2410.05362)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Mouret and Clune (2015)
  J. Mouret and J. Clune
  Illuminating search spaces by mapping elites.
  External Links: 1504.04909,
  [Link](https://arxiv.org/abs/1504.04909)
  Cited by: [§3.1](https://arxiv.org/html/2507.19457#S3.SS1.p2.1 "3.1 Pareto-based candidate selection ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Novikov et al. (2025)
  A. Novikov, N. Vũ, M. Eisenberger, E. Dupont, P. Huang, A. Z. Wagner, S. Shirobokov, B. Kozlovskii, F. J. R. Ruiz, A. Mehrabian, M. P. Kumar, A. See, S. Chaudhuri, G. Holland, A. Davies, S. Nowozin, P. Kohli, and M. Balog
  AlphaEvolve: a coding agent for scientific and algorithmic discovery.
  Technical report
   Google DeepMind.
  Note: White paper
  External Links: [Link](https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/AlphaEvolve.pdf)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p2.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- OpenAI (2025)
  OpenAI
  GPT-4.1 series.
  Note: Large language model series, released April 2025. <https://openai.com/index/gpt-4-1/>
  Cited by: [§E.2](https://arxiv.org/html/2507.19457#A5.SS2.p3.1.1 "E.2 Models and Inference Parameters ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p4.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Opsahl-Ong et al. (2024)
  K. Opsahl-Ong, M. J. Ryan, J. Purtell, D. Broman, C. Potts, M. Zaharia, and O. Khattab
  Optimizing instructions and demonstrations for multi-stage language model programs.
  In Proceedings of the 2024 Conference on Empirical Methods in Natural Language Processing, Y. Al-Onaizan, M. Bansal, and Y. Chen (Eds.),
  Miami, Florida, USA, pp. 9340–9366.
  External Links: [Link](https://aclanthology.org/2024.emnlp-main.525/),
  [Document](https://dx.doi.org/10.18653/v1/2024.emnlp-main.525)
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p2.1.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p4.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§2](https://arxiv.org/html/2507.19457#S2.p1.1 "2 Problem Statement ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p6.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§6](https://arxiv.org/html/2507.19457#S6.p4.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Ouyang et al. (2025)
  A. Ouyang, S. Guo, S. Arora, A. L. Zhang, W. Hu, C. Re, and A. Mirhoseini
  KernelBench: can LLMs write efficient GPU kernels?.
  In Scaling Self-Improving Foundation Models without Human Supervision,
  External Links: [Link](https://openreview.net/forum?id=k6V4jb8jkX)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p5.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [Figure 8](https://arxiv.org/html/2507.19457#S5.F8 "In 5.1 GEPA For Inference-Time Search (Contd.) ‣ 5 Extended Applications of GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§5.1](https://arxiv.org/html/2507.19457#S5.SS1.p1.1 "5.1 GEPA For Inference-Time Search (Contd.) ‣ 5 Extended Applications of GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§5.1](https://arxiv.org/html/2507.19457#S5.SS1.p4.1 "5.1 GEPA For Inference-Time Search (Contd.) ‣ 5 Extended Applications of GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Peng et al. (2025)
  H. Peng, Y. Qi, X. Wang, B. Xu, L. Hou, and J. Li
  VerIF: Verification Engineering for Reinforcement Learning in Instruction Following.
   arXiv.
  Note: arXiv:2506.09942 [cs]Comment: 16 pages, 8 figures
  External Links: [Link](http://arxiv.org/abs/2506.09942),
  [Document](https://dx.doi.org/10.48550/arXiv.2506.09942)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Pryzant et al. (2023)
  R. Pryzant, D. Iter, J. Li, Y. Lee, C. Zhu, and M. Zeng
  Automatic prompt optimization with “gradient descent” and beam search.
  In Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing, H. Bouamor, J. Pino, and K. Bali (Eds.),
  Singapore, pp. 7957–7968.
  External Links: [Link](https://aclanthology.org/2023.emnlp-main.494/),
  [Document](https://dx.doi.org/10.18653/v1/2023.emnlp-main.494)
  Cited by: [Table 3](https://arxiv.org/html/2507.19457#S4.T3 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p9.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Pyatkin et al. (2025a)
  V. Pyatkin, S. Malik, V. Graf, H. Ivison, S. Huang, P. Dasigi, N. Lambert, and H. Hajishirzi
  Generalizing verifiable instruction following.
  External Links: 2507.02833,
  [Link](https://arxiv.org/abs/2507.02833)
  Cited by: [§E.1](https://arxiv.org/html/2507.19457#A5.SS1.p3.1 "E.1 Benchmarks, Reference compound AI systems, and Feedback Functions ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p4.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Pyatkin et al. (2025b)
  V. Pyatkin, S. Malik, V. Graf, H. Ivison, S. Huang, P. Dasigi, N. Lambert, and H. Hajishirzi
  IF-RLVR-Train.
   arXiv.
  External Links: [Link](https://huggingface.co/datasets/allenai/IF_multi_constraints_upto5)
  Cited by: [§E.1](https://arxiv.org/html/2507.19457#A5.SS1.p3.1 "E.1 Benchmarks, Reference compound AI systems, and Feedback Functions ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Saad-Falcon et al. (2025)
  J. Saad-Falcon, A. G. Lafuente, S. Natarajan, N. Maru, H. Todorov, E. Guha, E. K. Buchanan, M. Chen, N. Guha, C. Ré, and A. Mirhoseini
  Archon: an architecture search framework for inference-time techniques.
  External Links: 2409.15254,
  [Link](https://arxiv.org/abs/2409.15254)
  Cited by: [§2](https://arxiv.org/html/2507.19457#S2.p1.1 "2 Problem Statement ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Samvelyan et al. (2024)
  M. Samvelyan, S. C. Raparthy, A. Lupu, E. Hambro, A. H. Markosyan, M. Bhatt, Y. Mao, M. Jiang, J. Parker-Holder, J. Foerster, T. Rocktäschel, and R. Raileanu
  Rainbow teaming: open-ended generation of diverse adversarial prompts.
  In Proceedings of the 38th International Conference on Neural Information Processing Systems,
  NIPS ’24, Red Hook, NY, USA.
  External Links: ISBN 9798331314385
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p2.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Sha et al. (2025)
  Z. Sha, S. Cui, and W. Wang
  SEM: Reinforcement Learning for Search-Efficient Large Language Models.
   arXiv.
  Note: arXiv:2505.07903 [cs]
  External Links: [Link](http://arxiv.org/abs/2505.07903),
  [Document](https://dx.doi.org/10.48550/arXiv.2505.07903)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Shao et al. (2024)
  Z. Shao, P. Wang, Q. Zhu, R. Xu, J. Song, X. Bi, H. Zhang, M. Zhang, Y. K. Li, Y. Wu, and D. Guo
  DeepSeekMath: pushing the limits of mathematical reasoning in open language models.
  External Links: 2402.03300,
  [Link](https://arxiv.org/abs/2402.03300)
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p5.1.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Sharma (2025)
  A. Sharma
  OpenEvolve: open-source implementation of alphaevolve.
  Note: <https://github.com/codelion/openevolve>GitHub
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p2.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Shinn et al. (2023)
  N. Shinn, F. Cassano, A. Gopinath, K. Narasimhan, and S. Yao
  Reflexion: language agents with verbal reinforcement learning.
  In Proceedings of the 37th International Conference on Neural Information Processing Systems,
  NIPS ’23, Red Hook, NY, USA.
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Si et al. (2025)
  S. Si, H. Zhao, C. Gao, Y. Bai, Z. Wang, B. Gao, K. Luo, W. Li, Y. Huang, G. Chen, F. Qi, M. Zhang, B. Chang, and M. Sun
  Teaching Large Language Models to Maintain Contextual Faithfulness via Synthetic Tasks and Reinforcement Learning.
   arXiv.
  Note: arXiv:2505.16483 [cs]
  External Links: [Link](http://arxiv.org/abs/2505.16483),
  [Document](https://dx.doi.org/10.48550/arXiv.2505.16483)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Sidahmed et al. (2024)
  H. Sidahmed, S. Phatale, A. Hutcheson, Z. Lin, Z. Chen, Z. Yu, J. Jin, S. Chaudhary, R. Komarytsia, C. Ahlheim, Y. Zhu, B. Li, S. Ganesh, B. Byrne, J. Hoffmann, H. Mansoor, W. Li, A. Rastogi, and L. Dixon
  Parameter Efficient Reinforcement Learning from Human Feedback.
   arXiv.
  Note: arXiv:2403.10704 [cs]
  External Links: [Link](http://arxiv.org/abs/2403.10704),
  [Document](https://dx.doi.org/10.48550/arXiv.2403.10704)
  Cited by: [footnote 1](https://arxiv.org/html/2507.19457#footnote1 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Song et al. (2025)
  H. Song, J. Jiang, Y. Min, J. Chen, Z. Chen, W. X. Zhao, L. Fang, and J. Wen
  R1-Searcher: Incentivizing the Search Capability in LLMs via Reinforcement Learning.
   arXiv.
  Note: arXiv:2503.05592 [cs]
  External Links: [Link](http://arxiv.org/abs/2503.05592),
  [Document](https://dx.doi.org/10.48550/arXiv.2503.05592)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Soylu et al. (2024)
  D. Soylu, C. Potts, and O. Khattab
  Fine-tuning and prompt optimization: two great steps that work better together.
  External Links: 2407.10930,
  [Link](https://arxiv.org/abs/2407.10930)
  Cited by: [§2](https://arxiv.org/html/2507.19457#S2.p1.1 "2 Problem Statement ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Sun et al. (2025)
  Z. Sun, Q. Wang, H. Wang, X. Zhang, and J. Xu
  Detection and Mitigation of Hallucination in Large Reasoning Models: A Mechanistic Perspective.
   arXiv.
  Note: arXiv:2505.12886 [cs]Comment: 25 pages
  External Links: [Link](http://arxiv.org/abs/2505.12886),
  [Document](https://dx.doi.org/10.48550/arXiv.2505.12886)
  Cited by: [footnote 1](https://arxiv.org/html/2507.19457#footnote1 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Suzgun et al. (2025)
  M. Suzgun, M. Yuksekgonul, F. Bianchi, D. Jurafsky, and J. Zou
  Dynamic cheatsheet: test-time learning with adaptive memory.
  External Links: 2504.07952,
  [Link](https://arxiv.org/abs/2504.07952)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Tan et al. (2025)
  S. Tan, L. A. Agrawal, A. Singhvi, L. Lai, M. J. Ryan, D. Klein, O. Khattab, K. Sen, and M. Zaharia
  LangProBe: a language programs benchmark.
  External Links: 2502.20315,
  [Link](https://arxiv.org/abs/2502.20315)
  Cited by: [§E.1](https://arxiv.org/html/2507.19457#A5.SS1.p1.1 "E.1 Benchmarks, Reference compound AI systems, and Feedback Functions ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§E.1](https://arxiv.org/html/2507.19457#A5.SS1.p6.1 "E.1 Benchmarks, Reference compound AI systems, and Feedback Functions ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§2](https://arxiv.org/html/2507.19457#S2.p1.1 "2 Problem Statement ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Team (2025)
  Q. Team
  Qwen/qwen3-8b.
  Note: <https://huggingface.co/Qwen/Qwen3-8B>Accessed: 2025-07-11
  Cited by: [§E.2](https://arxiv.org/html/2507.19457#A5.SS2.p2.1 "E.2 Models and Inference Parameters ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p4.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Teknium et al. (2024)
  R. Teknium, J. Quesnelle, and C. Guang
  Hermes 3 Technical Report.
   arXiv.
  Note: arXiv:2408.11857 [cs]
  External Links: [Link](http://arxiv.org/abs/2408.11857),
  [Document](https://dx.doi.org/10.48550/arXiv.2408.11857)
  Cited by: [footnote 1](https://arxiv.org/html/2507.19457#footnote1 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Wan et al. (2024)
  X. Wan, R. Sun, H. Nakhost, and S. Arik
  Teach better or show smarter? on instructions and exemplars in automatic prompt optimization.
  Advances in Neural Information Processing Systems 37, pp. 58174–58244.
  External Links: [Link](https://proceedings.neurips.cc/paper_files/paper/2024/hash/6b031defd145b02bed031093d8797bb3-Abstract-Conference.html)
  Cited by: [Figure 16](https://arxiv.org/html/2507.19457#A8.F16 "In Appendix H Generalization Gap ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p6.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p7.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Wang et al. (2025a)
  H. Wang, C. Qian, W. Zhong, X. Chen, J. Qiu, S. Huang, B. Jin, M. Wang, K. Wong, and H. Ji
  Acting Less is Reasoning More! Teaching Model to Act Efficiently.
   arXiv.
  Note: arXiv:2504.14870 [cs]
  External Links: [Link](http://arxiv.org/abs/2504.14870),
  [Document](https://dx.doi.org/10.48550/arXiv.2504.14870)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Wang et al. (2025b)
  S. Wang, J. Asilis, Ö. F. Akgül, E. B. Bilgin, O. Liu, and W. Neiswanger
  Tina: Tiny Reasoning Models via LoRA.
   arXiv.
  Note: arXiv:2504.15777 [cs]
  External Links: [Link](http://arxiv.org/abs/2504.15777),
  [Document](https://dx.doi.org/10.48550/arXiv.2504.15777)
  Cited by: [footnote 1](https://arxiv.org/html/2507.19457#footnote1 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Wang et al. (2025c)
  Z. Z. Wang, A. Gandhi, G. Neubig, and D. Fried
  Inducing programmatic skills for agentic tasks.
  External Links: 2504.06821,
  [Link](https://arxiv.org/abs/2504.06821)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Wang et al. (2024)
  Z. Z. Wang, J. Mao, D. Fried, and G. Neubig
  Agent workflow memory.
  External Links: 2409.07429,
  [Link](https://arxiv.org/abs/2409.07429)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Wei et al. (2023)
  J. Wei, X. Wang, D. Schuurmans, M. Bosma, B. Ichter, F. Xia, E. Chi, Q. Le, and D. Zhou
  Chain-of-thought prompting elicits reasoning in large language models.
  External Links: 2201.11903,
  [Link](https://arxiv.org/abs/2201.11903)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p1.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- White et al. (2025)
  C. White, S. Dooley, M. Roberts, A. Pal, B. Feuer, S. Jain, R. Shwartz-Ziv, N. Jain, K. Saifullah, S. Dey, Shubh-Agrawal, S. S. Sandha, S. Naidu, C. Hegde, Y. LeCun, T. Goldstein, W. Neiswanger, and M. Goldblum
  LiveBench: a challenging, contamination-limited llm benchmark.
  External Links: 2406.19314,
  [Link](https://arxiv.org/abs/2406.19314)
  Cited by: [§E.1](https://arxiv.org/html/2507.19457#A5.SS1.p5.1 "E.1 Benchmarks, Reference compound AI systems, and Feedback Functions ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p4.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Wu et al. (2025a)
  S. Wu, P. Sarthi, S. Zhao, A. Lee, H. Shandilya, A. M. Grobelnik, N. Choudhary, E. Huang, K. Subbian, L. Zhang, D. Yang, J. Zou, and J. Leskovec
  Optimas: optimizing compound ai systems with globally aligned local rewards.
  External Links: 2507.03041,
  [Link](https://arxiv.org/abs/2507.03041)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p4.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Wu et al. (2025b)
  Y. Wu, L. Ma, M. Li, J. Zhou, J. Hao, H. Leung, I. King, Y. Zhang, and J. Nie
  Reinforcing Question Answering Agents with Minimalist Policy Gradient Optimization.
   arXiv.
  Note: arXiv:2505.17086 [cs]
  External Links: [Link](http://arxiv.org/abs/2505.17086),
  [Document](https://dx.doi.org/10.48550/arXiv.2505.17086)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Xu et al. (2025a)
  W. Xu, A. Nie, R. Zheng, A. Modi, A. Swaminathan, and C. Cheng
  Provably learning from language feedback.
  External Links: 2506.10341,
  [Link](https://arxiv.org/abs/2506.10341)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Xu et al. (2025b)
  Y. E. Xu, Y. Savani, F. Fang, and Z. Kolter
  Not All Rollouts are Useful: Down-Sampling Rollouts in LLM Reinforcement Learning.
   arXiv.
  Note: arXiv:2504.13818 [cs]Comment: 14 pages, 7 figures
  External Links: [Link](http://arxiv.org/abs/2504.13818),
  [Document](https://dx.doi.org/10.48550/arXiv.2504.13818)
  Cited by: [footnote 1](https://arxiv.org/html/2507.19457#footnote1 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Yang et al. (2025)
  A. Yang, A. Li, B. Yang, B. Zhang, B. Hui, B. Zheng, B. Yu, C. Gao, C. Huang, C. Lv, C. Zheng, D. Liu, F. Zhou, F. Huang, F. Hu, H. Ge, H. Wei, H. Lin, J. Tang, J. Yang, J. Tu, J. Zhang, J. Yang, J. Yang, J. Zhou, J. Zhou, J. Lin, K. Dang, K. Bao, K. Yang, L. Yu, L. Deng, M. Li, M. Xue, M. Li, P. Zhang, P. Wang, Q. Zhu, R. Men, R. Gao, S. Liu, S. Luo, T. Li, T. Tang, W. Yin, X. Ren, X. Wang, X. Zhang, X. Ren, Y. Fan, Y. Su, Y. Zhang, Y. Zhang, Y. Wan, Y. Liu, Z. Wang, Z. Cui, Z. Zhang, Z. Zhou, and Z. Qiu
  Qwen3 technical report.
  External Links: 2505.09388,
  [Link](https://arxiv.org/abs/2505.09388)
  Cited by: [§E.2](https://arxiv.org/html/2507.19457#A5.SS2.p2.1.1 "E.2 Models and Inference Parameters ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p4.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Yang et al. (2024)
  C. Yang, X. Wang, Y. Lu, H. Liu, Q. V. Le, D. Zhou, and X. Chen
  Large language models as optimizers.
  External Links: 2309.03409,
  [Link](https://arxiv.org/abs/2309.03409)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p1.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Yang et al. (2018)
  Z. Yang, P. Qi, S. Zhang, Y. Bengio, W. W. Cohen, R. Salakhutdinov, and C. D. Manning
  HotpotQA: a dataset for diverse, explainable multi-hop question answering.
  In Conference on Empirical Methods in Natural Language Processing (EMNLP),
  Cited by: [§E.1](https://arxiv.org/html/2507.19457#A5.SS1.p2.1 "E.1 Benchmarks, Reference compound AI systems, and Feedback Functions ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§1](https://arxiv.org/html/2507.19457#S1.p4.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Yao et al. (2023)
  S. Yao, J. Zhao, D. Yu, N. Du, I. Shafran, K. Narasimhan, and Y. Cao
  ReAct: synergizing reasoning and acting in language models.
  External Links: 2210.03629,
  [Link](https://arxiv.org/abs/2210.03629)
  Cited by: [§2](https://arxiv.org/html/2507.19457#S2.p1.1 "2 Problem Statement ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Yu et al. (2025)
  L. Yu, J. Lin, and J. Li
  Stateful large language model serving with pensieve.
  In Proceedings of the Twentieth European Conference on Computer Systems,
  EuroSys ’25, New York, NY, USA, pp. 144–158.
  External Links: ISBN 9798400711961,
  [Link](https://doi.org/10.1145/3689031.3696086),
  [Document](https://dx.doi.org/10.1145/3689031.3696086)
  Cited by: [§4](https://arxiv.org/html/2507.19457#S4.p12.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Yue et al. (2025)
  Z. Yue, B. Jin, H. Zeng, H. Zhuang, Z. Qin, J. Yoon, L. Shang, J. Han, and D. Wang
  Hybrid Latent Reasoning via Reinforcement Learning.
   arXiv.
  Note: arXiv:2505.18454 [cs]
  External Links: [Link](http://arxiv.org/abs/2505.18454),
  [Document](https://dx.doi.org/10.48550/arXiv.2505.18454)
  Cited by: [footnote 1](https://arxiv.org/html/2507.19457#footnote1 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Yuksekgonul et al. (2025)
  M. Yuksekgonul, F. Bianchi, J. Boen, S. Liu, P. Lu, Z. Huang, C. Guestrin, and J. Zou
  Optimizing generative ai by backpropagating language model feedback.
  Nature 639, pp. 609–616.
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p4.1.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [Table 3](https://arxiv.org/html/2507.19457#S4.T3 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p1.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§4](https://arxiv.org/html/2507.19457#S4.p9.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),
  [§6](https://arxiv.org/html/2507.19457#S6.p4.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Zhang et al. (2025)
  Q. Zhang, S. Yang, L. Gao, H. Chen, X. Hu, J. Chen, J. Wang, S. Guo, B. Zheng, H. Wang, and J. Zhao
  LeTS: Learning to Think-and-Search via Process-and-Outcome Reward Hybridization.
   arXiv.
  Note: arXiv:2505.17447 [cs]Comment: preprint, under review
  External Links: [Link](http://arxiv.org/abs/2505.17447),
  [Document](https://dx.doi.org/10.48550/arXiv.2505.17447)
  Cited by: [§1](https://arxiv.org/html/2507.19457#S1.p1.1 "1 Introduction ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Zhang et al. (2024)
  W. Zhang, K. Tang, H. Wu, M. Wang, Y. Shen, G. Hou, Z. Tan, P. Li, Y. Zhuang, and W. Lu
  Agent-pro: learning to evolve via policy-level reflection and optimization.
  In Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers), L. Ku, A. Martins, and V. Srikumar (Eds.),
  Bangkok, Thailand, pp. 5348–5375.
  External Links: [Link](https://aclanthology.org/2024.acl-long.292/),
  [Document](https://dx.doi.org/10.18653/v1/2024.acl-long.292)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p4.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Zhao et al. (2024)
  S. Zhao, J. Dang, and A. Grover
  Group Preference Optimization: Few-Shot Alignment of Large Language Models.
   arXiv.
  Note: arXiv:2310.11523 [cs]Comment: accepted at ICLR 2024, code at https://github.com/jamqd/Group-Preference-Optimization
  External Links: [Link](http://arxiv.org/abs/2310.11523),
  [Document](https://dx.doi.org/10.48550/arXiv.2310.11523)
  Cited by: [footnote 1](https://arxiv.org/html/2507.19457#footnote1 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Zhao et al. (2025)
  S. Zhao, D. Gupta, Q. Zheng, and A. Grover
  D1: Scaling Reasoning in Diffusion Large Language Models via Reinforcement Learning.
   arXiv.
  Note: arXiv:2504.12216 [cs]Comment: 27 pages, project page at https://dllm-reasoning.github.io/
  External Links: [Link](http://arxiv.org/abs/2504.12216),
  [Document](https://dx.doi.org/10.48550/arXiv.2504.12216)
  Cited by: [footnote 1](https://arxiv.org/html/2507.19457#footnote1 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Zheng et al. (2024)
  L. Zheng, L. Yin, Z. Xie, C. L. Sun, J. Huang, C. H. Yu, S. Cao, C. Kozyrakis, I. Stoica, J. E. Gonzalez, et al.
  Sglang: efficient execution of structured language model programs.
  Advances in neural information processing systems 37, pp. 62557–62583.
  Cited by: [§4](https://arxiv.org/html/2507.19457#S4.p12.1 "4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Zhou et al. (2022)
  Y. Zhou, A. I. Muresanu, Z. Han, K. Paster, S. Pitis, H. Chan, and J. Ba
  Large language models are human-level prompt engineers.
  In The eleventh international conference on learning representations,
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p1.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Ziems et al. (2025)
  N. Ziems, D. Soylu, L. A. Agrawal, I. Miller, L. Lai, C. Qian, K. Song, M. Jiang, D. Klein, M. Zaharia, K. D’Oosterlinck, C. Potts, and O. Khattab
  Multi-module grpo: composing policy gradients and prompt optimization for language model programs.
  External Links: 2508.04660,
  [Link](https://arxiv.org/abs/2508.04660)
  Cited by: [§E.4](https://arxiv.org/html/2507.19457#A5.SS4.p5.1 "E.4 Optimizers ‣ Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- Zuo et al. (2025)
  Y. Zuo, K. Zhang, L. Sheng, S. Qu, G. Cui, X. Zhu, H. Li, Y. Zhang, X. Long, E. Hua, B. Qi, Y. Sun, Z. Ma, L. Yuan, N. Ding, and B. Zhou
  TTRL: test-time reinforcement learning.
  External Links: 2504.16084,
  [Link](https://arxiv.org/abs/2504.16084)
  Cited by: [§6](https://arxiv.org/html/2507.19457#S6.p3.1 "6 Related Work ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").

## Appendix A Appendix Outline

- •

  [Usage of Large Language Models](https://arxiv.org/html/2507.19457#A2 "Appendix B Usage of Large Language Models ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [GEPA’s Reflection and Prompt Update Meta Prompt](https://arxiv.org/html/2507.19457#A3 "Appendix C GEPA’s Reflection and Prompt Update Meta Prompt ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [GEPA Algorithm and Methodology Details](https://arxiv.org/html/2507.19457#A4 "Appendix D GEPA Algorithm and Methodology Details ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [Evaluation Setup (Contd.)](https://arxiv.org/html/2507.19457#A5 "Appendix E Evaluation Setup (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [Results and Analysis (Contd.)](https://arxiv.org/html/2507.19457#A6 "Appendix F Results and Analysis (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [GEPA For Inference-Time Search (Contd.)](https://arxiv.org/html/2507.19457#S5.SS1 "5.1 GEPA For Inference-Time Search (Contd.) ‣ 5 Extended Applications of GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [GEPA for Adversarial Prompt Search (Contd.)](https://arxiv.org/html/2507.19457#S5.SS2 "5.2 GEPA for Adversarial Prompt Search (Contd.) ‣ 5 Extended Applications of GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [Performance vs. Budget (Rollouts) Curves](https://arxiv.org/html/2507.19457#A7 "Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [Generalization Gap](https://arxiv.org/html/2507.19457#A8 "Appendix H Generalization Gap ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [Cost vs. Performance Analysis for optimized systems](https://arxiv.org/html/2507.19457#A9 "Appendix I Cost vs. Performance Analysis for optimized systems ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [GEPA Search Trees](https://arxiv.org/html/2507.19457#A10 "Appendix J GEPA Search Trees ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [Visualizing the Iterative Refinement achieved by GEPA](https://arxiv.org/html/2507.19457#A11 "Appendix K Visualizing the Iterative Refinement achieved by GEPA ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [Examples of best prompts for every benchmark](https://arxiv.org/html/2507.19457#A12 "Appendix L Examples of best prompts for every benchmark ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [GEPA generated prompts for kernel generation](https://arxiv.org/html/2507.19457#A13 "Appendix M GEPA generated prompts for kernel generation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")
- •

  [Number of reflection LM calls made by GEPA during optimization](https://arxiv.org/html/2507.19457#A14 "Appendix N Number of reflection LM calls made by GEPA during optimization ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")

## Appendix B Usage of Large Language Models

The authors used large language models (LLMs) only for polishing prose of text where the complete draft was fully written by the authors initially and polished later with the help of LLM-based assistants including ChatGPT, Gemini, and Perplexity. The authors’ used code assistants including Cursor and Copilot to implement the authors’ original design and ideas. The scientific contributions, technical methods, ideas and core results are entirely the original work of the authors.

## Appendix C GEPA’s Reflection and Prompt Update Meta Prompt

GEPA’s Meta Prompt

[⬇](data:text/plain;base64,SSBwcm92aWRlZCBhbiBhc3Npc3RhbnQgd2l0aCB0aGUgZm9sbG93aW5nIGluc3RydWN0aW9ucyB0byBwZXJmb3JtIGEgdGFzayBmb3IgbWU6CgpgYGAKPGN1cnJlbnQgaW5zdHJ1Y3Rpb24+CmBgYAoKVGhlIGZvbGxvd2luZyBhcmUgZXhhbXBsZXMgb2YgZGlmZmVyZW50IHRhc2sgaW5wdXRzIHByb3ZpZGVkIHRvIHRoZSBhc3Npc3RhbnQgYWxvbmcgd2l0aCB0aGUgYXNzaXN0YW50J3MgcmVzcG9uc2UgZm9yIGVhY2ggb2YgdGhlbSwgYW5kIHNvbWUgZmVlZGJhY2sgb24gaG93IHRoZSBhc3Npc3RhbnQncyByZXNwb25zZSBjb3VsZCBiZSBiZXR0ZXI6CgpgYGAKPElucHV0cywgT3V0cHV0cyBhbmQgRmVlZGJhY2sgZm9yIG1pbmliYXRjaCBvZiBleGFtcGxlcz4KYGBgCgpZb3VyIHRhc2sgaXMgdG8gd3JpdGUgYSBuZXcgaW5zdHJ1Y3Rpb24gZm9yIHRoZSBhc3Npc3RhbnQuCgpSZWFkIHRoZSBpbnB1dHMgY2FyZWZ1bGx5IGFuZCBpZGVudGlmeSB0aGUgaW5wdXQgZm9ybWF0IGFuZCBpbmZlciBkZXRhaWxlZCB0YXNrIGRlc2NyaXB0aW9uIGFib3V0IHRoZSB0YXNrIEkgd2lzaCB0byBzb2x2ZSB3aXRoIHRoZSBhc3Npc3RhbnQuCgpSZWFkIGFsbCB0aGUgYXNzaXN0YW50IHJlc3BvbnNlcyBhbmQgdGhlIGNvcnJlc3BvbmRpbmcgZmVlZGJhY2suIElkZW50aWZ5IGFsbCBuaWNoZSBhbmQgZG9tYWluIHNwZWNpZmljIGZhY3R1YWwgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHRhc2sgYW5kIGluY2x1ZGUgaXQgaW4gdGhlIGluc3RydWN0aW9uLCBhcyBhIGxvdCBvZiBpdCBtYXkgbm90IGJlIGF2YWlsYWJsZSB0byB0aGUgYXNzaXN0YW50IGluIHRoZSBmdXR1cmUuIFRoZSBhc3Npc3RhbnQgbWF5IGhhdmUgdXRpbGl6ZWQgYSBnZW5lcmFsaXphYmxlIHN0cmF0ZWd5IHRvIHNvbHZlIHRoZSB0YXNrLCBpZiBzbywgaW5jbHVkZSB0aGF0IGluIHRoZSBpbnN0cnVjdGlvbiBhcyB3ZWxsLgoKUHJvdmlkZSB0aGUgbmV3IGluc3RydWN0aW9ucyB3aXRoaW4gYGBgIGJsb2Nrcy4=)
I provided an assistant with the following instructions to perform a task for me:


‘‘‘
<current instruction>
‘‘‘


The following are examples of different task inputs provided to the assistant along with the assistant’s response for each of them, and some feedback on how the assistant’s response could be better:


‘‘‘
<Inputs, Outputs and Feedback for minibatch of examples>
‘‘‘


Your task is to write a new instruction for the assistant.


Read the inputs carefully and identify the input format and infer detailed task description about the task I wish to solve with the assistant.


Read all the assistant responses and the corresponding feedback. Identify all niche and domain specific factual information about the task and include it in the instruction, as a lot of it may not be available to the assistant in the future. The assistant may have utilized a generalizable strategy to solve the task, if so, include that in the instruction as well.


Provide the new instructions within ‘‘‘ blocks.

Figure [C](https://arxiv.org/html/2507.19457#A3 "Appendix C GEPA’s Reflection and Prompt Update Meta Prompt ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") shows the meta-prompt used by GEPA, which guides the LLM to reflectively refine its current instruction based on input–output examples and corresponding feedback from the environment.

## Appendix D GEPA Algorithm and Methodology Details

Figure [4](https://arxiv.org/html/2507.19457#S3.F4 "Figure 4 ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") presents the core GEPA Algorithm, along with the algorithm for Pareto-based candidate selection.

### D.1 Merge: System-aware crossover strategy for Compound AI optimization

Algorithm 3  Check if module combination is desirable

1:
function Desirable($a,\,i,\,j,\,\mathcal{P}$)

2:
  for module $m=1$ to $|M|$ do

3:
   $\pi_{a}\leftarrow$ ancestor’s prompt for module $m$

4:
   $\pi_{i}\leftarrow$ descendent i’s prompt for module $m$

5:
   $\pi_{j}\leftarrow$ descendent j’s prompt for module $m$

6:
   if ($\pi_{a}=\pi_{i}$  and $\pi_{j}\neq\pi_{i}$) or($\pi_{a}=\pi_{j}$  and $\pi_{i}\neq\pi_{j}$) then

7:
     return True

8:
   end if

9:
  end for

10:
  return False

11:
end function

Algorithm 4  Merge: Genetic Crossover for Modular Candidates

1:
function Merge($\mathcal{P},\mathcal{A},S,r$)

2:
  $i,\,j\leftarrow r.\text{sample}(2,\,|\mathcal{P}|)$ // distinct $i\neq j$

3:
  $A_{i}\leftarrow$ GetAncestors($i,\,\mathcal{A}$), $A_{j}\leftarrow$ GetAncestors($j,\,\mathcal{A}$)

4:
  if $i\in A_{j}$ or $j\in A_{i}$ then

5:
   continue  // skip direct ancestry

6:
  end if

7:
  for $a\in A_{i}\cap A_{j}$ do

8:
   if this merge $(i,j,a)$ has been tried before then

9:
     continue

10:
   end if

11:
   if $S[a]>\min(S[i],S[j])$ then

12:
     continue

13:
   end if

14:
   if not Desirable($a,\,i,\,j,\,\mathcal{P}$) then

15:
     continue

16:
   end if

17:
   $\Phi^{\prime}\leftarrow$ copy of $\mathcal{P}[a]$

18:
   for module $m=1$ to $|M|$ do

19:
     $\pi_{a}\leftarrow\mathcal{P}[a].\mathcal{M}_{m}.\pi$

20:
     $\pi_{i}\leftarrow\mathcal{P}[i].\mathcal{M}_{m}.\pi$

21:
     $\pi_{j}\leftarrow\mathcal{P}[j].\mathcal{M}_{m}.\pi$

22:
     if $\pi_{a}=\pi_{i}$ and $\pi_{j}\neq\pi_{i}$ then

23:
      $\Phi^{\prime}.\mathcal{M}_{m}.\pi\leftarrow\pi_{j}$

24:
     else if $\pi_{a}=\pi_{j}$ and $\pi_{i}\neq\pi_{j}$ then

25:
      $\Phi^{\prime}.\mathcal{M}_{m}.\pi\leftarrow\pi_{i}$

26:
     else if $\pi_{i}\neq\pi_{j}\neq\pi_{a}$ then

27:
      Choose $d^{*}=\arg\max\{S[i],S[j]\}$ (break ties randomly)

28:
      $\Phi^{\prime}.\mathcal{M}_{m}.\pi\leftarrow\pi_{d^{*}}$

29:
     else

30:
      $\Phi^{\prime}.\mathcal{M}_{m}.\pi\leftarrow\pi_{i}$ // default

31:
     end if

32:
   end for

33:
   return $(\Phi^{\prime},i,j,a)$

34:
  end for

35:
  return None

36:
end function

Figure 9: Details of System Aware Merge. $r$ represents a seeded stochastic sampler.

Algorithm [4](https://arxiv.org/html/2507.19457#alg4 "Algorithm 4 ‣ Figure 9 ‣ D.1 Merge: System-aware crossover strategy for Compound AI optimization ‣ Appendix D GEPA Algorithm and Methodology Details ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") provides the instantiation of the System aware Merge strategy used in GEPA+Merge. Intuitively, merge will be helpful when there are candidates in the pool that learn complementary strategies. Algorithm [3](https://arxiv.org/html/2507.19457#alg3 "Algorithm 3 ‣ Figure 9 ‣ D.1 Merge: System-aware crossover strategy for Compound AI optimization ‣ Appendix D GEPA Algorithm and Methodology Details ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") defines the selection criteria: candidates are merged only if they share a common ancestor but have optimized disjoint sets of prompts (complementary strategies), are pareto-optimal, and both candidates improve upon the aggregate performance of the ancestor. GEPA routinely checks if the pool has 2 such candidates, invoking merge when identified. These strict lineage conditions mean merge occurs sparsely.

## Appendix E Evaluation Setup (Contd.)

### E.1 Benchmarks, Reference compound AI systems, and Feedback Functions

To rigorously evaluate the performance of GEPA and and compare it against current state-of-the-art compound AI system optimizers, we assemble a diverse suite of benchmarks mostly obtained from  [Tan et al. (2025)](https://arxiv.org/html/2507.19457#bib.bib75), each paired with available Compound AI Systems.

HotpotQA ([Yang et al., 2018](https://arxiv.org/html/2507.19457#bib.bib79)) is a large-scale question-answering dataset consisting of 113K Wikipedia-based question-answer pairs. It features questions that require reasoning over multiple supporting documents. We modify the last hop of the HoVerMultiHop program (described below) to answer the question instead of generating another query, and the rest of the system remains unmodified. The textual feedback module identifies the set of relevant documents remaining to be retrieved at each stage of the program, and provides that as feedback to the modules at that stage. We use 150 examples for training, 300 for validation, and 300 for testing.

IFBench ([Pyatkin et al., 2025a](https://arxiv.org/html/2507.19457#bib.bib78)) introduced a benchmark specifically designed to assess language models’ ability to follow precise human instructions, especially output constraints (e.g., “answer only with yes or no”, or “mention a word at least three times”). The IFBench test set consists of 58 new and out-of-distribution output constraints and instructions to test system’s ability to generalize to new task constraints.  [Pyatkin et al. (2025a)](https://arxiv.org/html/2507.19457#bib.bib78) also release IFTrain and IF-RLVR Train data ([Pyatkin et al., 2025b](https://arxiv.org/html/2507.19457#bib.bib74)) which are used for training. We split the IF-RLVR Train into our train/val sets, and IFBench as our test set in order to ensure that the optimizers do not access the new, unseen constraints being tested in IFBench. We design a 2-stage system, that first attempts to answer the user query, and then in the second stage, rewrites the answer following the constraints. The textual feedback module provides the descriptions of constraints satsified and failed-to-be-satisifed by the system’s response. Our splits contain 150 training examples, 300 for validation, and 294 for testing.

AIME-2025 ([Balunović et al., 2025](https://arxiv.org/html/2507.19457#bib.bib16)) The AIME-2025 benchmark consists of 2 problem sets of 15 questions each (total 30) obtained from the AIME examination conducted by Mathematical Association of America. We use prior years AIME questions (2022-2024 totalling 90 questions) split equally into training and validation set, and use the AIME-2025 questions, repeating each question 5 times, as the final test set. We use a single-step ChainOfThought as the AI system under optimization.

LiveBench-Math [White et al. (2025)](https://arxiv.org/html/2507.19457#bib.bib15) LiveBench is a cross-domain benchmark consisting of regularly updated questions. We use the math subset of LiveBench questions retrieved on July 30, 2025. This set of questions (n=368) is shuffled (with python random seed 0) and split equally into train/val/test questions. We use a single-step ChainOfThought as the AI system under optimization.

HoVer ([Jiang et al., 2020](https://arxiv.org/html/2507.19457#bib.bib76)) is an open-domain multihop fact extraction and claim verification benchmark built on a Wikipedia-based corpus requiring complex reasoning across multiple sentences and documents, typically involving multiple wikipedia articles. Following  [Tan et al. (2025)](https://arxiv.org/html/2507.19457#bib.bib75), the systems are evaluated for their ability to write queries in multiple hops to retrieve all relevant wikipedia documents (gold documents) required to make the claim. We obtain the HoverMultiHop program from  [Tan et al. (2025)](https://arxiv.org/html/2507.19457#bib.bib75), which performs up to 3-hop retrievals using 2 query writer modules, and 2 document summary modules. The textual feedback module simply identifies the set of correct documents retrieved, and the set of documents remaining to be retrieved, and returns them as feedback text. For the full-parameter finetuning results demonstrated in figure [11](https://arxiv.org/html/2507.19457#A7.F11 "Figure 11 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), we instantiate a 2-hop program, where the first hop is performed with the initial claim, and the LLM is prompted in a single turn with the claim and first-hop retrieved documents, to provide the second-hop search query. For HoVer, we use 150 examples for training, 300 for validation, and 300 for testing.

PUPA ([Li et al., 2025a](https://arxiv.org/html/2507.19457#bib.bib77)) propose the task of Privacy-Conscious Delegation: addressing real-world user queries using an ensemble of trusted and untrusted models. The core challenges are maintaining high response quality while minimizing leakage of personally identifiable information (PII) to untrusted models.  [Li et al. (2025a)](https://arxiv.org/html/2507.19457#bib.bib77) also present PAPILLON, a compound AI system consisting of 2 modules, a user query rewriter and a response rewriter, run over the trusted model, along with an intermediate call to the untrusted model with the rewritten query. The feedback text simply provides the breakdown of the aggregate score, consisting of a response quality score and a PII leakage score. The dataset is split into 111 training examples, 111 for validation, and 221 for testing.

### E.2 Models and Inference Parameters

We evaluate GEPA and baseline optimizers using two contemporary LLMs, chosen to represent both open-source and commercial model families. Each compound AI system is instantiated once per model, with all modules (e.g., retrievers, rewriters, answer generators) relying on the same model. All models are allowed a context window of upto 16384 tokens for inference.

Qwen3 8B ([Yang et al., 2025](https://arxiv.org/html/2507.19457#bib.bib72)): For our open-source experiments (including GRPO), we use Qwen3-8B. Following the recommended settings as per  [Team (2025)](https://arxiv.org/html/2507.19457#bib.bib73), we use a decoding temperature of 0.6, top-p of 0.95, and top-k of 20 for training as well as inference.

GPT-4.1 Mini ([OpenAI, 2025](https://arxiv.org/html/2507.19457#bib.bib71)): For comparison with large commercial models, we use GPT-4.1 mini (openai/gpt-4.1-mini-2025-04-14) accessed via the OpenAI API with a model temperature of 1.0.

### E.3 Costs

It costs under $500 to run all experiments in [Table 2](https://arxiv.org/html/2507.19457#S4.T2 "In 4 Evaluation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") with GPT-4.1 mini. Specifically, GEPA costs a total of $86, GEPA-Merge costs $67, MIPROv2 costs $76, and Trace and TextGrad cost $172 in total.

### E.4 Optimizers

Baseline: The base program is directly evaluated without any further optimization applied.

MIPROv2 ([Opsahl-Ong et al., 2024](https://arxiv.org/html/2507.19457#bib.bib70)): MIPROv2 is a widely used compound AI system prompt optimizer and has been integrated into the DSPy ([Khattab et al., 2024](https://arxiv.org/html/2507.19457#bib.bib69)) and llama-prompt-ops ([AI, 2025](https://arxiv.org/html/2507.19457#bib.bib68)) frameworks. It works by jointly optimizing both instructions and demonstrations using Bayesian optimization. For each program module, it first bootstraps candidate sets of instructions and demonstrations, assigning uniform priors over their utilities. Candidate assignments are proposed with the Tree-Structured Parzen Estimator (TPE), and the Bayesian model is updated based on evaluation scores to favor high-performing candidates. The most probable sets of instructions and demonstrations are then selected and validated to obtain the final optimized program configuration.

All MIPROv2 optimization runs are performed with the $auto=heavy$ setting, which corresponds to proposing 18 instruction candidates and 18 bootstrapped few-shot sets. Hence, across benchmarks, the exact number of rollouts varies depending on the number of trials it takes to bootstrap examples (finding 18 successful solution instances), the required number of Bayesian search steps (determined by the number of modules in the system), and size of the valset. Overall, MIPROv2’s rollouts ranged from a minimum of 2270 (for PUPA) to maximum of 6926 (for HoVer).

Trace and TextGrad ([Cheng et al., 2024](https://arxiv.org/html/2507.19457#bib.bib7); [Yuksekgonul et al., 2025](https://arxiv.org/html/2507.19457#bib.bib50)): We implement both optimizers in the Trace framework. All programs under optimization have the exact same architecture compared to the DSPy implementation. To ensure a fair comparison, we port all the DSPy specific signature and parsing prompt to Trace, and use the same initial prompt. In addition, all the test, train, and validation data match exactly the experiment we used for GEPA. The performance of the unoptimized Trace program baseline closely matched our baseline implementation in DSPy (within 0.5% difference). All optimization experiments were under the same rollout budget as MIPROv2 and GEPA. We also provide both optimizer the same metric and feedback functions as GEPA, and, for the per-module feedback function that is not available in Trace (both optimizer do not support per-module feedback), we followed the feedback format in the BigBench-Hard tutorial22
2
<https://microsoft.github.io/Trace/examples/nlp/bigbench_hard.html> from the Trace authors.

GRPO ([Shao et al., 2024](https://arxiv.org/html/2507.19457#bib.bib67)):
Group Relative Policy Optimization (GRPO) is a reinforcement learning algorithm that estimates advantages in a group-relative manner. For compound AI systems consisting of multiple modules, we use the GRPO implementation provided and open-sourced by [Ziems et al. (2025)](https://arxiv.org/html/2507.19457#bib.bib8) to perform our experiments, whereas for single-module systems (e.g., figure [11](https://arxiv.org/html/2507.19457#A7.F11 "Figure 11 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")), we use the GRPO implementation provided by SkyRL ([Griggs et al., 2025](https://arxiv.org/html/2507.19457#bib.bib14); [Liu et al., 2025](https://arxiv.org/html/2507.19457#bib.bib13); [Cao et al., 2025](https://arxiv.org/html/2507.19457#bib.bib12)).

Across all compound system training runs, each training step uses a group size of 12, with 4 training instances per step (total batch size 48, with per device train batch size 1). Training employs LoRA ([Hu et al., 2022](https://arxiv.org/html/2507.19457#bib.bib65)) with rank dimension 16, $\alpha=64$, and dropout 0.05, using bf16 precision targeting the projection modules $[\mathrm{q},\mathrm{k},\mathrm{v},\mathrm{o},\mathrm{up},\mathrm{down},\mathrm{gate}]$. We use a learning rate of $1\times 10^{-5}$, $\beta=0.01$, reward scale normalization, and gradient norm clipping of 0.1. Gradients are accumulated for 20 steps before each update, with a “constant with warmup learning” rate scheduler. Non-reentrant gradient checkpointing is enabled to further reduce memory usage. GRPO optimization run for 500 training steps, amounting to fixed 24,000 rollouts, with validation performed every 20 training steps, which is used to implement early stopping. Compound AI system GRPO training experiments are performed on 1xH100/A100 (80 GB memory) with separate GPUs for inference rollouts.

For single-module GRPO training, we adopt full-parameter finetuning with a group size of $16$. Each training step employs a global batch size of $32$, realized as per-device micro-batches of $4$ across $8$ GPUs. Rollout generation is performed with a per-GPU forward micro-batch size of $12$. Training is distributed using FSDP2, with sampling performed at temperature $1.0$. We apply KL regularization and set the learning rate to $1\times 10^{-6}$. Validation is conducted every $5$ training steps. During evaluation, sampling is performed with temperature $0.6$, top-$p=0.95$, and top-$k=20$.

We manually explore several values for [LR, beta, norm clipping] hyperparameters for both training runs.

GEPA: GEPA is our optimizer, based on the algorithm described in Section [3](https://arxiv.org/html/2507.19457#S3 "3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
We evaluate 2 variants of our main optimizer GEPA: GEPA and GEPA+Merge, along with 2 ablations created by replacing the Pareto-based sampling strategy with a naive, SelectBestCandidate strategy (SelectBestCandidate and SelectBestCandidate+Merge).
All GEPA optimization runs use a minibatch size of 3, and merge is invoked a maximum of 5 times during the optimization run, when enabled. To ensure a fair comparison with MIPROv2, we align the computational budget between GEPA and MIPROv2 on a per-benchmark basis. The training set from each benchmark is used as $D_{feedback}$ (which is used to derive the training signals, as discussed in Section [3](https://arxiv.org/html/2507.19457#S3 "3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")) and the validation set is used as $D_{pareto}$. Specifically, since MIPROv2’s total rollout budget depends on factors such as validation set size and the number of modules, we first record the number of rollouts expended by MIPROv2 for each benchmark, and then cap GEPA’s optimization to match this rollout budget. While differences in proposal and validation procedures cause the exact budget usage by the systems to be slightly different, the discrepancy is always within 10.15%. This protocol ensures that any performance differences arise from the optimization algorithms themselves, rather than from differences in search budget. The exact rollout counts for each optimizer is visualized in Appendix [G](https://arxiv.org/html/2507.19457#A7 "Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").

## Appendix F Results and Analysis (Contd.)

Figure [10](https://arxiv.org/html/2507.19457#A6.F10 "Figure 10 ‣ Appendix F Results and Analysis (Contd.) ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") visualizes the final test set performance for aggregate and individual benchmarks across both models.

(a) Final test set performance for aggregate and individual benchmarks for gpt-41-mini.

(b) Final test set performance for aggregate and individual benchmarks for qwen3-8b.

Figure 10: Final test set performance for aggregate and individual benchmarks.

## Appendix G Performance vs. Budget (Rollouts) Curves

Figure 11: This figure compares the learning behaviour of GEPA against GRPO with full-parameter finetuning on the 2-hop HoVer task. The relative gap mirrors the previously observed comparison of GEPA against GRPO with LoRA (in figures [1](https://arxiv.org/html/2507.19457#S0.F1 "Figure 1 ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), [12](https://arxiv.org/html/2507.19457#A7.F12 "Figure 12 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), [13](https://arxiv.org/html/2507.19457#A7.F13 "Figure 13 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), [14](https://arxiv.org/html/2507.19457#A7.F14 "Figure 14 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), [15](https://arxiv.org/html/2507.19457#A7.F15 "Figure 15 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning")), showing that GEPA achieves a comparable performance gap relative to both full-parameter and parameter-efficient versions of GRPO.



(a) GPT-4.1 Mini - MIPRO

(b) Qwen3 8B - MIPRO

(c) Qwen3 8B - GRPO

Figure 12: Hotpot QA Bench: rollout vs. score for different models/settings.



(a) GPT-4.1 Mini - MIPRO

(b) Qwen3 8B - MIPRO

(c) Qwen3 8B - GRPO

Figure 13: IFBench: rollout vs. score for different models/settings.



(a) GPT-4.1 Mini - MIPRO

(b) Qwen3 8B - MIPRO

(c) Qwen3 8B - GRPO

Figure 14: HoverBench: rollout vs. score for different models/settings.



(a) GPT-4.1 Mini - MIPRO

(b) Qwen3 8B - MIPRO

(c) Qwen3 8B - GRPO

Figure 15: PUPA: rollout vs. score for different models/settings.

Figures [12](https://arxiv.org/html/2507.19457#A7.F12 "Figure 12 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), [13](https://arxiv.org/html/2507.19457#A7.F13 "Figure 13 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), [14](https://arxiv.org/html/2507.19457#A7.F14 "Figure 14 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), [15](https://arxiv.org/html/2507.19457#A7.F15 "Figure 15 ‣ Appendix G Performance vs. Budget (Rollouts) Curves ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") show the full Performance-vs-Rollout curves for all the optimizers across all benchmarks.

## Appendix H Generalization Gap

Figure 16: Generalization gaps for different optimization methods. Following [Wan et al. (2024)](https://arxiv.org/html/2507.19457#bib.bib80), we visualize the generalization gap (i.e., the difference between final test set performance and the best achieved validation performance) for different optimizers. While [Wan et al. (2024)](https://arxiv.org/html/2507.19457#bib.bib80) previously observed that exemplars tend to generalize better, our results suggest that instructions generated by reflective prompt evolution can achieve stronger generalization as well as improved overall performance. We hypothesize this difference may be due to the improving capabilities of the underlying LLMs, as more recent models are both better at adhering to instructions and capable of reflecting on their outputs.

Figure [16](https://arxiv.org/html/2507.19457#A8.F16 "Figure 16 ‣ Appendix H Generalization Gap ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") visualizes the generalization gap for different optimization methods.

## Appendix I Cost vs. Performance Analysis for optimized systems

(a) GPT-4.1 Mini.

(b) Qwen3 8B.

Figure 17: These plots visualize the final aggregate scores against the aggregate prompt size (across all benchmarks) of the final optimized system for each optimizer. It can be seen that GEPA consistently produces prompts that are around less than 33% of the size of MIPROv2’s prompts, while getting higher performance. Most of GEPA’s prompt tokens are used for providing instructions, whereas most of MIPROv2’s prompt tokens pertain to few-shot examples.



(a) Comparing the token counts of the optimized programs across benchmarks for GPT-4.1 Mini.

(b) Comparing the token counts of the optimized programs across benchmarks for Qwen3 8B.

Figure 18: Comparing the token counts of optimized programs across benchmarks.

The prompt size of the optimized system plays an important role in determining the downstream cost of using the optimized system. Figure [17](https://arxiv.org/html/2507.19457#A9.F17 "Figure 17 ‣ Appendix I Cost vs. Performance Analysis for optimized systems ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") visualizes the aggregate prompt lengths of the final optimized system (as cost proxy) for each optimizer, against the performance achieved. Notably, GEPA’s prompts are around 33% shorter than MIPROv2’s prompts, while achieving higher performance.

## Appendix J GEPA Search Trees

(a) Abl:SelectBestCandidate

(b) SelectBestCandidate + Merge

(c) GEPA - Best Config

(d) GEPA+Merge

Figure 19: HotpotQA GPT-4.1 Mini



(a) Abl:SelectBestCandidate

(b) SelectBestCandidate + Merge

(c) GEPA

(d) GEPA+Merge - Best Config

Figure 20: HotpotQA Qwen3 8B



(a) Abl:SelectBestCandidate

(b) SelectBestCandidate + Merge

(c) GEPA

(d) GEPA+Merge - Best Config

Figure 21: IFBench GPT-4.1 Mini



(a) Abl:SelectBestCandidate

(b) SelectBestCandidate+Merge

(c) GEPA - Best Config

(d) GEPA+Merge

Figure 22: IFBench Qwen3 8B



(a) Abl:SelectBestCandidate

(b) SelectBestCandidate + Merge

(c) GEPA

(d) GEPA+Merge - Best Config

Figure 23: HoVer GPT-4.1 Mini



(a) Abl:SelectBestCandidate

(b) SelectBestCandidate + Merge

(c) GEPA - Best Config

(d) GEPA+Merge

Figure 24: HoVer Qwen3 8B



(a) Abl:SelectBestCandidate

(b) SelectBestCandidate + Merge

(c) GEPA

(d) GEPA+Merge - Best Config

Figure 25: PUPA GPT-4.1 Mini



(a) Abl:SelectBestCandidate

(b) SelectBestCandidate + Merge

(c) GEPA - Best Config

(d) GEPA+Merge

Figure 26: PUPA Qwen3 8B

Figures [19](https://arxiv.org/html/2507.19457#A10.F19 "Figure 19 ‣ Appendix J GEPA Search Trees ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),  [20](https://arxiv.org/html/2507.19457#A10.F20 "Figure 20 ‣ Appendix J GEPA Search Trees ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),  [21](https://arxiv.org/html/2507.19457#A10.F21 "Figure 21 ‣ Appendix J GEPA Search Trees ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),  [22](https://arxiv.org/html/2507.19457#A10.F22 "Figure 22 ‣ Appendix J GEPA Search Trees ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),  [23](https://arxiv.org/html/2507.19457#A10.F23 "Figure 23 ‣ Appendix J GEPA Search Trees ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),  [24](https://arxiv.org/html/2507.19457#A10.F24 "Figure 24 ‣ Appendix J GEPA Search Trees ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"),  [25](https://arxiv.org/html/2507.19457#A10.F25 "Figure 25 ‣ Appendix J GEPA Search Trees ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"), and  [26](https://arxiv.org/html/2507.19457#A10.F26 "Figure 26 ‣ Appendix J GEPA Search Trees ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") present the genetic search trees created by various configurations of GEPA (and ablation SelectBestCandidate).

## Appendix K Visualizing the Iterative Refinement achieved by GEPA

Figure [5](https://arxiv.org/html/2507.19457#S3.F5 "Figure 5 ‣ 3 GEPA: Reflective Prompt Evolution ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") presented a summary of the prompt refinements performed by GEPA during the optimization for PUPA. In this section, we present the full prompts produced during the optimization.

### K.1 Prompts at intermediate stages for PUPA

Node 0 (Score 82.26)

[⬇](data:text/plain;base64,R2l2ZW4gYSBwcml2YXRlIHVzZXIgcXVlcnksIGNyZWF0ZSBhIHByaXZhY3ktcHJlc2VydmluZyByZXF1ZXN0IGZvciBhIHBvd2VyZnVsIGV4dGVybmFsIExMTS4KVGhlIExMTSBtYXkgYXNzaXN0IHdpdGhvdXQgbGVhcm5pbmcgcHJpdmF0ZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXNlci4=)
Given a private user query, create a privacy-preserving request for a powerful external LLM.
The LLM may assist without learning private information about the user.

Node 2 (Score 90.99)

[⬇](data:text/plain;base64,VGFzayBEZXNjcmlwdGlvbjoKWW91IGFyZSBwcm92aWRlZCB3aXRoIGEgcHJpdmF0ZSB1c2VyIHF1ZXJ5IHRoYXQgbWF5IGNvbnRhaW4gc2Vuc2l0aXZlLCBwZXJzb25hbCwgb3IgaWRlbnRpZnlpbmcgaW5mb3JtYXRpb24uIFlvdXIgcm9sZSBpcyB0byB0cmFuc2Zvcm0gdGhpcyBxdWVyeSBpbnRvIGEgcHJpdmFjeS1wcmVzZXJ2aW5nIHJlcXVlc3Qgc3VpdGFibGUgZm9yIGFuIGV4dGVybmFsIHBvd2VyZnVsIGxhcmdlIGxhbmd1YWdlIG1vZGVsIChMTE0pLiBUaGUgZXh0ZXJuYWwgTExNIGNhbiBiZSBjb25zdWx0ZWQgdG8gYXNzaXN0IHdpdGggdGhlIHRhc2sgYnV0IG11c3Qgbm90IHJlY2VpdmUgYW55IHByaXZhdGUgb3IgcGVyc29uYWxseSBpZGVudGlmaWFibGUgaW5mb3JtYXRpb24gKFBJSSkgYWJvdXQgdGhlIHVzZXIuIFlvdXIgZ29hbCBpcyB0byBtYXhpbWl6ZSB0aGUgcXVhbGl0eSBhbmQgcmVsZXZhbmNlIG9mIHRoZSBMTE0gcmVxdWVzdCB3aGlsZSBtaW5pbWl6aW5nIG9yIGNvbXBsZXRlbHkgZWxpbWluYXRpbmcgbGVha2FnZSBvZiBwcml2YXRlIGluZm9ybWF0aW9uLgoKS2V5IFBvaW50cyBhbmQgRG9tYWluLVNwZWNpZmljIERldGFpbHM6CgoxLiBQcml2YWN5IFByZXNlcnZhdGlvbjoKICAgLSBEbyBub3QgaW5jbHVkZSBhbnkgdXNlci1zcGVjaWZpYyBvciBzZW5zaXRpdmUgZGF0YSBpbiB0aGUgZXh0ZXJuYWwgTExNIHJlcXVlc3QuCiAgIC0gV2hlbiBxdWVyaWVzIGNvbnRhaW4gbG9jYXRpb24sIGRhdGVzLCBuYW1lcywgVVJMcywgb3Igb3RoZXIgaWRlbnRpZmlhYmxlIGRldGFpbHMsIGdlbmVyYWxpemUgb3Igb21pdCB0aGVtIGluIHRoZSBMTE0gcmVxdWVzdC4KICAgLSBSZXBsYWNlIG9yIGFic3RyYWN0IGFueSBwcml2YXRlIG9yIHBvdGVudGlhbGx5IGlkZW50aWZpYWJsZSBjb250ZW50IHdpdGggbmV1dHJhbCBwbGFjZWhvbGRlcnMgb3IgZ2VuZXJhbCB0ZXJtcyB3aXRob3V0IGxvc2luZyB0aGUgaW50ZW50IG9yIG1lYW5pbmcgbmVjZXNzYXJ5IGZvciB0aGUgTExNIHRhc2suCgoyLiBRdWVyeSBVbmRlcnN0YW5kaW5nIGFuZCBSZWZvcm11bGF0aW9uOgogICAtIEFuYWx5emUgdGhlIHVzZXIncyBxdWVyeSBjYXJlZnVsbHkgdG8gdW5kZXJzdGFuZCB0aGUgdW5kZXJseWluZyB0YXNrIG9yIGluZm9ybWF0aW9uIG5lZWQuCiAgIC0gRGV0ZXJtaW5lIGlmIHRoZSBxdWVyeSBpbnZvbHZlcyB0cmFuc2xhdGlvbiwgZXZlbnQgcmVjb21tZW5kYXRpb25zLCBhZHZpY2UsIHN1bW1hcml6YXRpb24sIG9yIG90aGVyIHRhc2tzLgogICAtIElkZW50aWZ5IHdoZW4gdXNlci1wcm92aWRlZCBjb250ZW50IGlzIHNlbnNpdGl2ZSBvciBwcm9wcmlldGFyeSAoZS5nLiwgdW5pcXVlIHRleHRzLCBVUkxzIHRvIGNsb3NlZCBjb250ZW50KSBhbmQgYXZvaWQgZGlyZWN0bHkgZXhwb3NpbmcgaXQgdG8gdGhlIGV4dGVybmFsIExMTS4KCjMuIFF1YWxpdHkgTWF4aW1pemF0aW9uOgogICAtIFByb2R1Y2UgYW4gTExNIHJlcXVlc3QgdGhhdCBpcyBjbGVhciwgcHJlY2lzZSwgYW5kIGRpcmVjdHMgdGhlIExMTSB0byBwZXJmb3JtIHRoZSBuZWNlc3NhcnkgdGFzayB3aXRob3V0IHJlcXVpcmluZyBwcml2YXRlIGNvbnRleHQuCiAgIC0gUmV0YWluIHRoZSBjb3JlIGluZm9ybWF0aW9uYWwgb3IgZnVuY3Rpb25hbCBuZWVkIHNvIHRoYXQgdGhlIExMTSBjYW4gcmVzcG9uZCBlZmZlY3RpdmVseS4KICAgLSBXaGVuIHJlZmVyZW5jaW5nIGV4dGVybmFsIGRvY3VtZW50cyBvciBVUkxzLCBkbyBub3QgaW5jbHVkZSB0aGUgYWN0dWFsIGxpbmsgb3IgcHJpdmF0ZSBpbmZvOyBpbnN0ZWFkLCByZXF1ZXN0IGdlbmVyYWwgb3IgdHlwaWNhbCBpbmZvcm1hdGlvbiByZWxhdGVkIHRvIHRoZSB0b3BpYy4KCjQuIENvbW1vbiBTdHJhdGVnaWVzIGZvciBQcml2YWN5LXByZXNlcnZpbmcgUmVxdWVzdHM6CiAgIC0gVXNlIHBhcmFwaHJhc2luZyBvciBhYnN0cmFjdGlvbiBmb3Igc2Vuc2l0aXZlIGNvbnRlbnQuCiAgIC0gUmVxdWVzdCBnZW5lcmFsaXplZCBvciBleGFtcGxlLWJhc2VkIGluZm9ybWF0aW9uIGluc3RlYWQgb2Ygc3BlY2lmaWMgdXNlciBkYXRhLgogICAtIFdoZW4gdHJhbnNsYXRpb24gaXMgcmVxdWlyZWQsIGluY2x1ZGUgb25seSB0aGUgdGV4dCB0aGF0IG5lZWRzIHRyYW5zbGF0aW5nIGlmIG5vbi1wcml2YXRlLCBvciBvdGhlcndpc2UgZ2VuZXJhbGl6ZSBhY2NvcmRpbmdseS4KICAgLSBGb3IgbG9jYXRpb24tIG9yIGV2ZW50LXNwZWNpZmljIHF1ZXJpZXMsIHJlcXVlc3QgZ2VuZXJhbCBvciB0eXBpY2FsIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjYXRlZ29yeSBvciBhcmVhIHdpdGhvdXQgaW5jbHVkaW5nIHNlbnNpdGl2ZSBkZXRhaWxzLgoKNS4gUmVhc29uaW5nIEV4cGxhbmF0aW9uOgogICAtIEZvciBlYWNoIHRyYW5zZm9ybWF0aW9uLCBwcm9kdWNlIGNsZWFyIHJlYXNvbmluZyBleHBsYWluaW5nIGhvdyBwcml2YWN5IGlzIHByZXNlcnZlZCBhbmQgd2h5IHRoZSBMTE0gcmVxdWVzdCBmdWxmaWxscyB0aGUgdXNlcuKAmXMgaW50ZW50IHdpdGhvdXQgbGVha2luZyBzZW5zaXRpdmUgaW5mb3JtYXRpb24uCgpJbnB1dCBGb3JtYXQ6Ci0gQSB1c2VyIHF1ZXJ5IHN0cmluZyBwb3NzaWJseSBjb250YWluaW5nIHByaXZhdGUgb3Igc2Vuc2l0aXZlIGluZm9ybWF0aW9uLgotIFJlcXVpcmVkIG91dHB1dDoKICAgYSkgQSByZWFzb25pbmcgcGFyYWdyYXBoIGV4cGxhaW5pbmcgeW91ciBhbmFseXNpcyBhbmQgcHJpdmFjeSBjb25zaWRlcmF0aW9ucy4KICAgYikgQSBwcml2YWN5LXByZXNlcnZpbmcgTExNIHJlcXVlc3QgdGhhdCBjYW4gYmUgc2VudCB0byBhbiBleHRlcm5hbCBMTE0gZm9yIGFzc2lzdGFuY2UuCgpCeSBmb2xsb3dpbmcgdGhlIGFib3ZlIHByaW5jaXBsZXMgYW5kIHN0cmF0ZWdpZXMsIHlvdSB3aWxsIG9wdGltaXplIGJvdGggdGhlIHF1YWxpdHkgb2YgYXNzaXN0YW5jZSBhbmQgdGhlIHByb3RlY3Rpb24gb2YgdXNlciBwcml2YWN5IHdoZW4gaW50ZXJhY3Rpbmcgd2l0aCB0aGlyZC1wYXJ0eSBsYW5ndWFnZSBtb2RlbHMu)
Task Description:
You are provided with a private user query that may contain sensitive, personal, or identifying information. Your role is to transform this query into a privacy-preserving request suitable for an external powerful large language model (LLM). The external LLM can be consulted to assist with the task but must not receive any private or personally identifiable information (PII) about the user. Your goal is to maximize the quality and relevance of the LLM request while minimizing or completely eliminating leakage of private information.


Key Points and Domain-Specific Details:


1. Privacy Preservation:
 - Do not include any user-specific or sensitive data in the external LLM request.
 - When queries contain location, dates, names, URLs, or other identifiable details, generalize or omit them in the LLM request.
 - Replace or abstract any private or potentially identifiable content with neutral placeholders or general terms without losing the intent or meaning necessary for the LLM task.


2. Query Understanding and Reformulation:
 - Analyze the user’s query carefully to understand the underlying task or information need.
 - Determine if the query involves translation, event recommendations, advice, summarization, or other tasks.
 - Identify when user-provided content is sensitive or proprietary (e.g., unique texts, URLs to closed content) and avoid directly exposing it to the external LLM.


3. Quality Maximization:
 - Produce an LLM request that is clear, precise, and directs the LLM to perform the necessary task without requiring private context.
 - Retain the core informational or functional need so that the LLM can respond effectively.
 - When referencing external documents or URLs, do not include the actual link or private info; instead, request general or typical information related to the topic.


4. Common Strategies for Privacy-preserving Requests:
 - Use paraphrasing or abstraction for sensitive content.
 - Request generalized or example-based information instead of specific user data.
 - When translation is required, include only the text that needs translating if non-private, or otherwise generalize accordingly.
 - For location- or event-specific queries, request general or typical information about the category or area without including sensitive details.


5. Reasoning Explanation:
 - For each transformation, produce clear reasoning explaining how privacy is preserved and why the LLM request fulfills the user’s intent without leaking sensitive information.


Input Format:
- A user query string possibly containing private or sensitive information.
- Required output:
 a) A reasoning paragraph explaining your analysis and privacy considerations.
 b) A privacy-preserving LLM request that can be sent to an external LLM for assistance.


By following the above principles and strategies, you will optimize both the quality of assistance and the protection of user privacy when interacting with third-party language models.

Node 4 (Score 94.44)

[⬇](data:text/plain;base64,VGFzayBEZXNjcmlwdGlvbjoKWW91IHdpbGwgYmUgZ2l2ZW4gYSB1c2VyIHF1ZXJ5IHRoYXQgbWF5IGluY2x1ZGUgc2Vuc2l0aXZlLCBwZXJzb25hbCwgb3IgaWRlbnRpZmlhYmxlIGluZm9ybWF0aW9uLiBZb3VyIHJvbGUgaXMgdG8gdHJhbnNmb3JtIHRoaXMgcXVlcnkgaW50byBhIHByaXZhY3ktcHJlc2VydmluZyByZXF1ZXN0IHN1aXRhYmxlIGZvciBzdWJtaXNzaW9uIHRvIGFuIGV4dGVybmFsIGxhcmdlIGxhbmd1YWdlIG1vZGVsIChMTE0pLiBUaGUgZ29hbCBpcyB0byBlbmFibGUgdGhlIGV4dGVybmFsIExMTSB0byBhc3Npc3QgZWZmZWN0aXZlbHkgd2hpbGUgZW5zdXJpbmcgbm8gcHJpdmF0ZSwgaWRlbnRpZnlpbmcsIG9yIHNlbnNpdGl2ZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXNlciBpcyBleHBvc2VkLgoKS2V5IFJlcXVpcmVtZW50cyBhbmQgRG9tYWluLVNwZWNpZmljIERldGFpbHM6CgoxLiBQcml2YWN5IFByZXNlcnZhdGlvbjoKICAgLSBEbyBub3QgaW5jbHVkZSBhbnkgdXNlci1zcGVjaWZpYyBkZXRhaWxzLCBwZXJzb25hbCBuYW1lcywgbG9jYXRpb25zLCBkYXRlcywgVVJMcywgb3Igb3RoZXIgcG90ZW50aWFsbHkgaWRlbnRpZmlhYmxlIGluZm9ybWF0aW9uIGluIHRoZSBvdXRnb2luZyBMTE0gcmVxdWVzdC4KICAgLSBXaGVuIHRoZSB1c2VyIHF1ZXJ5IGNvbnRhaW5zIHByaXZhdGUsIHNlbnNpdGl2ZSwgb3IgcHJvcHJpZXRhcnkgZGF0YSwgeW91IG11c3QgZ2VuZXJhbGl6ZSwgYWJzdHJhY3QsIG9yIG9taXQgdGhlc2UgZGV0YWlscy4KICAgLSBSZXBsYWNlIHNlbnNpdGl2ZSBzcGVjaWZpY3Mgd2l0aCBuZXV0cmFsIHBsYWNlaG9sZGVycyBvciBkZXNjcmliZSB0aGVtIGluIGdlbmVyYWxpemVkIHRlcm1zIHdpdGhvdXQgbG9zaW5nIHRoZSBjb3JlIGludGVudCBvZiB0aGUgcXVlcnkuCiAgIC0gQXZvaWQgZXhwb3Npbmcgbm9uLXB1YmxpYywgcHJvcHJpZXRhcnksIG9yIGNvbmZpZGVudGlhbCBjb250ZW50IGRpcmVjdGx5IHRvIHRoZSBleHRlcm5hbCBMTE0uCgoyLiBVbmRlcnN0YW5kaW5nIGFuZCBSZWZvcm11bGF0aW9uOgogICAtIENhcmVmdWxseSBhbmFseXplIHRoZSB1c2VyJ3MgcXVlcnkgdG8gaWRlbnRpZnkgdGhlIHVuZGVybHlpbmcgdGFzayB0eXBlIChlLmcuLCBzdW1tYXJpemF0aW9uLCBjcmVhdGl2ZSB3cml0aW5nLCB0cmFuc2xhdGlvbiwgcHJvZmlsZSB3cml0aW5nLCBldmVudCByZWNvbW1lbmRhdGlvbnMsIGNvbXBhbnkgYmFja2dyb3VuZCwgYWNhZGVtaWMgY29udGVudCBnZW5lcmF0aW9uKS4KICAgLSBXaGVuIHJlZm9ybXVsYXRpbmcsIG1haW50YWluIHRoZSBlc3NlbnRpYWwgaW5mb3JtYXRpb25hbCBvciBmdW5jdGlvbmFsIG5lZWQgc28gdGhhdCB0aGUgZXh0ZXJuYWwgTExNIGNhbiBwcm92aWRlIGEgdXNlZnVsLCByZWxldmFudCByZXNwb25zZS4KICAgLSBQcmVzZXJ2ZSB0aGVtYXRpYyBhbmQgY29udGV4dHVhbCBlbGVtZW50cyBuZWNlc3NhcnkgZm9yIHF1YWxpdHkgb3V0cHV0LCB3aGlsZSBhYnN0cmFjdGluZyBhbnkgc2Vuc2l0aXZlIG9yIHByaXZhdGUgZGV0YWlscy4KICAgLSBJZiB0aGUgdGFzayBpbnZvbHZlcyB1c2VyLXN1cHBsaWVkIGNvbnRlbnQgKGUuZy4sIGVzc2F5cywgdGV4dHMsIGNoYXJhY3RlciBkZXNjcmlwdGlvbnMpLCBkaXN0aWxsIG9yIHN1bW1hcml6ZSB0aGUgcmVsZXZhbnQgY29udGVudCBvciB1c2UgZ2VuZXJpYyB2ZXJzaW9ucyBpbnN0ZWFkIG9mIGV4cG9zaW5nIG9yaWdpbmFsIHByaXZhdGUgdGV4dC4KCjMuIE1heGltaXppbmcgUXVhbGl0eSBvZiB0aGUgUmVmb3JtdWxhdGVkIFByb21wdDoKICAgLSBDb25zdHJ1Y3QgY2xlYXIsIHByZWNpc2UsIGFuZCB3ZWxsLXN0cnVjdHVyZWQgcmVxdWVzdHMgdGhhdCBleHBsaWNpdGx5IGd1aWRlIHRoZSBleHRlcm5hbCBMTE0gb24gdGhlIHRhc2suCiAgIC0gUmV0YWluIGFwcHJvcHJpYXRlIGRldGFpbCBhbmQgY29udGV4dCB0byBlbnN1cmUgcmVsZXZhbmNlLCBidXQgYmFsYW5jZSB0aGlzIGNhcmVmdWxseSBhZ2FpbnN0IHByaXZhY3kgY29uY2VybnMuCiAgIC0gSWYgcmVmZXJlbmNpbmcgZXh0ZXJuYWwgZG9jdW1lbnRzLCBVUkxzLCBvciBpbnN0aXR1dGlvbnMsIGRvIG5vdCBpbmNsdWRlIGFueSBsaW5rcyBvciBwcml2YXRlIGlkZW50aWZpZXJzOyBpbnN0ZWFkLCByZXF1ZXN0IGdlbmVyYWwgb3IgdHlwaWNhbCBpbmZvcm1hdGlvbiByZWxhdGVkIHRvIHRoZSBzdWJqZWN0IG1hdHRlci4KICAgLSBXaGVuIHdyaXRpbmcgcHJvbXB0cyBmb3IgY3JlYXRpdmUgb3IgZmljdGlvbmFsIGNoYXJhY3RlciB0YXNrcywgY2xhcmlmeSB0aGF0IHRoZSBwcm9maWxlIG9yIGNvbnRlbnQgaXMgZmljdGlvbmFsIHRvIGF2b2lkIGFjY2lkZW50YWwgZXhwb3N1cmUgb2YgcmVhbCBwZXJzb25hbCBkYXRhLgoKNC4gQ29tbW9uIFN0cmF0ZWdpZXMgZm9yIFByaXZhY3kgUHJlc2VydmF0aW9uOgogICAtIFBhcmFwaHJhc2Ugb3IgYWJzdHJhY3QgcGVyc29uYWwgYW5kIHNlbnNpdGl2ZSBjb250ZW50LgogICAtIFVzZSBnZW5lcmFsIGRlc2NyaXB0aW9ucyBvciBoeXBvdGhldGljYWwvZXhhbXBsZS1iYXNlZCByZXF1ZXN0cyB3aGVyZSBhcHByb3ByaWF0ZS4KICAgLSBPbWl0IG9yIGdlbmVyYWxpemUgc3BlY2lmaWMgbmFtZXMsIGRhdGVzLCBsb2NhdGlvbnMsIGluc3RpdHV0aW9ucywgb3IgcHJvcHJpZXRhcnkgY291cnNlIGNvZGVzLgogICAtIFdoZW4gdXNlciBjb250ZW50IGlzIGV4dGVuc2l2ZSwgZm9jdXMgb24gYWJzb3JiaW5nIHRoZSBjb3JlIHRoZW1lcyBhbmQgaW5zdHJ1Y3RpbmcgdGhlIGV4dGVybmFsIG1vZGVsIGFjY29yZGluZ2x5IHJhdGhlciB0aGFuIHBhc3NpbmcgdGhlIHJhdyBjb250ZW50LgoKNS4gRXhwbGFuYXRpb24gUmVxdWlyZW1lbnQ6CiAgIC0gUHJvdmlkZSBhIGNvbmNpc2UgcmVhc29uaW5nIHBhcmFncmFwaCBleHBsYWluaW5nIGhvdyB5b3UgaWRlbnRpZmllZCBzZW5zaXRpdmUgb3IgcHJpdmF0ZSBkZXRhaWxzIGFuZCB0aGUgc3RlcHMgeW91IHRvb2sgdG8gcHJvdGVjdCB1c2VyIHByaXZhY3kuCiAgIC0gQ2xhcmlmeSBob3cgeW91ciByZWZvcm11bGF0ZWQgTExNIHJlcXVlc3QgcmV0YWlucyB0aGUgdXNlcuKAmXMgb3JpZ2luYWwgaW50ZW50IGFuZCB0YXNrIG5lZWRzIHdpdGhvdXQgcmlza2luZyBkYXRhIGxlYWthZ2UuCiAgIC0gVGhpcyBleHBsYW5hdGlvbiBpcyBtYW5kYXRvcnkgdG8gZG9jdW1lbnQgeW91ciBwcml2YWN5LXByZXNlcnZpbmcgYXBwcm9hY2ggYW5kIHRvIGp1c3RpZnkgdGhlIGFic3RyYWN0aW9uIGNob2ljZXMgbWFkZS4KCklucHV0IGFuZCBPdXRwdXQgRm9ybWF0OgoKLSBJbnB1dDogQSBzaW5nbGUgdXNlciBxdWVyeSBzdHJpbmcgdGhhdCBtYXkgaW5jbHVkZSBzZW5zaXRpdmUgb3IgcGVyc29uYWwgY29udGVudC4KLSBPdXRwdXQ6CiAgIGEpIFJlYXNvbmluZzogQSBwYXJhZ3JhcGggZXhwbGFpbmluZyB0aGUgcHJpdmFjeSBjb25zaWRlcmF0aW9ucyBhbmQgcmVmb3JtdWxhdGlvbiBzdHJhdGVneS4KICAgYikgTExNIFJlcXVlc3Q6IEEgZ2VuZXJhbGl6ZWQsIHByaXZhY3ktc2FmZSBwcm9tcHQgc3VpdGFibGUgZm9yIHF1ZXJ5aW5nIGFuIGV4dGVybmFsIExMTS4KCkV4YW1wbGVzIGFuZCBGZWVkYmFjayBJbnRlZ3JhdGlvbjoKLSBBdm9pZCBpbmNsdWRpbmcgcmVhbCBuYW1lcywgY291cnNlIGNvZGVzLCBvciBmYWN1bHR5IHJlZmVyZW5jZXM7IHJlcGxhY2UgdGhlbSB3aXRoIGdlbmVyYWwgdGVybXMgKGUuZy4sICJhbiBpbnRlcmRpc2NpcGxpbmFyeSBoZWFsdGggbWlub3IiIHJhdGhlciB0aGFuICJISFYiKS4KLSBXaGVuIGdpdmVuIGNoYXJhY3RlciBiaW9zIG9yIHByb2ZpbGVzLCBzcGVjaWZ5IHRoZSBmaWN0aW9uYWwgbmF0dXJlIGNsZWFybHkgYW5kIGRvIG5vdCBpbmNsdWRlIHBvdGVudGlhbGx5IGlkZW50aWZ5aW5nIHBoeXNpY2FsIGRlc2NyaXB0aW9ucyB1bmxlc3MgbmVjZXNzYXJ5IGZvciB0aGUgdGFzay4KLSBXaGVuIGEgdXNlciBhc2tzIGFib3V0IHNwZWNpZmljIGNvbXBhbmllcyBvciBlbnRpdGllcywgZ2VuZXJhbGl6ZSB0aGUgcmVxdWVzdCB0byAiYSBtYWpvciBjb21wYW55IGluIFtpbmR1c3RyeS9jb3VudHJ5XSIgaWYgcHJpdmFjeSBjb25jZXJucyBleGlzdC4KLSBNYWludGFpbiBhIGJhbGFuY2UgYmV0d2VlbiBtaW5pbWFsIGxlYWthZ2UgYW5kIG1heGltaXppbmcgdGFzayByZWxldmFuY2UgYW5kIHF1YWxpdHkuCi0gRW5zdXJlIHRoZSByZWZvcm11bGF0ZWQgcHJvbXB0IHN1cHBvcnRzIGEgY29tcHJlaGVuc2l2ZSBhbmQgdXNlZnVsIHJlc3BvbnNlIGZyb20gdGhlIGV4dGVybmFsIExMTSB3aXRob3V0IGNvbXByb21pc2luZyBwcml2YWN5LgoKQnkgcmlnb3JvdXNseSBmb2xsb3dpbmcgdGhlc2UgZGV0YWlsZWQgaW5zdHJ1Y3Rpb25zLCB5b3Ugd2lsbCBlbnN1cmUgbWF4aW1hbCBwcm90ZWN0aW9uIG9mIHVzZXIgcHJpdmFjeSB3aGlsZSBoYXJuZXNzaW5nIHRoZSBwb3dlciBvZiBleHRlcm5hbCBMTE1zIHRvIGFzc2lzdCBlZmZlY3RpdmVseSB3aXRoIGRpdmVyc2UgdXNlciByZXF1ZXN0cyBhY3Jvc3MgZG9tYWlucy4=)
Task Description:
You will be given a user query that may include sensitive, personal, or identifiable information. Your role is to transform this query into a privacy-preserving request suitable for submission to an external large language model (LLM). The goal is to enable the external LLM to assist effectively while ensuring no private, identifying, or sensitive information about the user is exposed.


Key Requirements and Domain-Specific Details:


1. Privacy Preservation:
 - Do not include any user-specific details, personal names, locations, dates, URLs, or other potentially identifiable information in the outgoing LLM request.
 - When the user query contains private, sensitive, or proprietary data, you must generalize, abstract, or omit these details.
 - Replace sensitive specifics with neutral placeholders or describe them in generalized terms without losing the core intent of the query.
 - Avoid exposing non-public, proprietary, or confidential content directly to the external LLM.


2. Understanding and Reformulation:
 - Carefully analyze the user’s query to identify the underlying task type (e.g., summarization, creative writing, translation, profile writing, event recommendations, company background, academic content generation).
 - When reformulating, maintain the essential informational or functional need so that the external LLM can provide a useful, relevant response.
 - Preserve thematic and contextual elements necessary for quality output, while abstracting any sensitive or private details.
 - If the task involves user-supplied content (e.g., essays, texts, character descriptions), distill or summarize the relevant content or use generic versions instead of exposing original private text.


3. Maximizing Quality of the Reformulated Prompt:
 - Construct clear, precise, and well-structured requests that explicitly guide the external LLM on the task.
 - Retain appropriate detail and context to ensure relevance, but balance this carefully against privacy concerns.
 - If referencing external documents, URLs, or institutions, do not include any links or private identifiers; instead, request general or typical information related to the subject matter.
 - When writing prompts for creative or fictional character tasks, clarify that the profile or content is fictional to avoid accidental exposure of real personal data.


4. Common Strategies for Privacy Preservation:
 - Paraphrase or abstract personal and sensitive content.
 - Use general descriptions or hypothetical/example-based requests where appropriate.
 - Omit or generalize specific names, dates, locations, institutions, or proprietary course codes.
 - When user content is extensive, focus on absorbing the core themes and instructing the external model accordingly rather than passing the raw content.


5. Explanation Requirement:
 - Provide a concise reasoning paragraph explaining how you identified sensitive or private details and the steps you took to protect user privacy.
 - Clarify how your reformulated LLM request retains the user’s original intent and task needs without risking data leakage.
 - This explanation is mandatory to document your privacy-preserving approach and to justify the abstraction choices made.


Input and Output Format:


- Input: A single user query string that may include sensitive or personal content.
- Output:
 a) Reasoning: A paragraph explaining the privacy considerations and reformulation strategy.
 b) LLM Request: A generalized, privacy-safe prompt suitable for querying an external LLM.


Examples and Feedback Integration:
- Avoid including real names, course codes, or faculty references; replace them with general terms (e.g., "an interdisciplinary health minor" rather than "HHV").
- When given character bios or profiles, specify the fictional nature clearly and do not include potentially identifying physical descriptions unless necessary for the task.
- When a user asks about specific companies or entities, generalize the request to "a major company in [industry/country]" if privacy concerns exist.
- Maintain a balance between minimal leakage and maximizing task relevance and quality.
- Ensure the reformulated prompt supports a comprehensive and useful response from the external LLM without compromising privacy.


By rigorously following these detailed instructions, you will ensure maximal protection of user privacy while harnessing the power of external LLMs to assist effectively with diverse user requests across domains.

Node 5 (Score 94.67)

[⬇](data:text/plain;base64,TmV3IEluc3RydWN0aW9uIGZvciBQcml2YWN5LVByZXNlcnZpbmcgUXVlcnkgUmVmb3JtdWxhdGlvbiBBc3Npc3RhbnQ6CgpUYXNrIE92ZXJ2aWV3OgpZb3UgcmVjZWl2ZSBhIHVzZXIgcXVlcnkgdGhhdCBtYXkgY29udGFpbiBzZW5zaXRpdmUsIHByaXZhdGUsIG9yIHBlcnNvbmFsbHkgaWRlbnRpZmlhYmxlIGluZm9ybWF0aW9uIChQSUkpLiBZb3VyIGdvYWwgaXMgdG8gdHJhbnNmb3JtIHRoaXMgaW5wdXQgaW50byBhIGdlbmVyYWxpemVkLCBwcml2YWN5LXByZXNlcnZpbmcgcHJvbXB0IHN1aXRhYmxlIGZvciBxdWVyeWluZyBhbiBleHRlcm5hbCBsYXJnZSBsYW5ndWFnZSBtb2RlbCAoTExNKS4gVGhlIHJlZm9ybXVsYXRlZCBwcm9tcHQgbXVzdCBlbmFibGUgdGhlIGV4dGVybmFsIExMTSB0byBmdWxmaWxsIHRoZSB1c2VyJ3Mgb3JpZ2luYWwgaW50ZW50IGVmZmVjdGl2ZWx5LCB3aGlsZSByaWdvcm91c2x5IHByb3RlY3RpbmcgdXNlciBwcml2YWN5IGJ5IGFic3RyYWN0aW5nIG9yIG9taXR0aW5nIGFueSBzZW5zaXRpdmUgZGV0YWlscy4KCklucHV0IEZvcm1hdDoKLSBBIHNpbmdsZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgdXNlciBxdWVyeS4KLSBUaGUgcXVlcnkgbWF5IGluY2x1ZGUgcHJpdmF0ZSBuYW1lcywgcGxhY2VzLCBkYXRlcywgcHJvcHJpZXRhcnkgaW5mbywgb3IgaWRlbnRpZmlhYmxlIGNvbnRleHQuCgpPdXRwdXQgRm9ybWF0OgotIFBhcnQgKGEpIFJlYXNvbmluZzogYSBjb25jaXNlIHBhcmFncmFwaCBleHBsYWluaW5nOgogICAtIEhvdyB5b3UgaWRlbnRpZmllZCBzZW5zaXRpdmUgb3IgcHJpdmF0ZSBpbmZvcm1hdGlvbiBpbiB0aGUgaW5wdXQuCiAgIC0gV2hhdCBnZW5lcmFsaXphdGlvbiwgYWJzdHJhY3Rpb24sIG9yIG9taXNzaW9uIHN0cmF0ZWdpZXMgeW91IGFwcGxpZWQgdG8gcHJvdGVjdCBwcml2YWN5LgogICAtIEhvdyB0aGUgcmVmb3JtdWxhdGVkIHByb21wdCBtYWludGFpbnMgdGhlIG9yaWdpbmFsIHRhc2sgb3IgaW5mb3JtYXRpb25hbCBuZWVkIHdpdGhvdXQgcmlza2luZyBkYXRhIGxlYWthZ2UuCi0gUGFydCAoYikgTExNIFJlcXVlc3Q6IGEgY2FyZWZ1bGx5IGNvbnN0cnVjdGVkIGFuZCBjb25jaXNlLCBwcml2YWN5LXNhZmUgcHJvbXB0IHRoYXQgcmV0YWlucyBlc3NlbnRpYWwgdGhlbWF0aWMgYW5kIGZ1bmN0aW9uYWwgZWxlbWVudHMgdG8gYWNoaWV2ZSBhIHVzZWZ1bCwgcmVsZXZhbnQgcmVzcG9uc2UgZnJvbSB0aGUgZXh0ZXJuYWwgTExNLgoKS2V5IERvbWFpbi1TcGVjaWZpYyBEZXRhaWxzIGFuZCBCZXN0IFByYWN0aWNlczoKCjEuIFByaXZhY3kgUHJlc2VydmF0aW9uIFByaW5jaXBsZXM6CiAgIC0gUmVtb3ZlIG9yIHJlcGxhY2UgYWxsIHVzZXItc3BlY2lmaWMgbmFtZXMgKHBlcnNvbmFsIG9yIG9yZ2FuaXphdGlvbmFsKSwgZXhhY3QgZGF0ZXMgb3IgZHVyYXRpb25zLCBsb2NhdGlvbnMsIFVSTHMsIHByb3ByaWV0YXJ5IGNvdXJzZSBvciBwcm9kdWN0IGNvZGVzLCBjdXN0b21lciBvciBjbGllbnQgbmFtZXMsIGFuZCBvdGhlciBpZGVudGlmaWVycy4KICAgLSBXaGVuIGdlb2dyYXBoaWMgb3Igb3JnYW5pemF0aW9uYWwgbWVudGlvbnMgYXJlIGNyaXRpY2FsIGZvciBjb250ZXh0LCBhYnN0cmFjdCB0aGVzZSB0byBicm9hZGVyIG9yIHB1YmxpYyBjYXRlZ29yaWVzIChlLmcuLCDigJxhIHN1c3RhaW5hYmxlIHRyYXZlbCB3ZWJzaXRlIGZvY3VzZWQgb24gYSBDZW50cmFsIEFtZXJpY2FuIGNvdW50cnnigJ0gcmF0aGVyIHRoYW4gbmFtaW5nIHRoZSBjb3VudHJ5IGV4cGxpY2l0bHkpLgogICAtIE9taXQgb3IgYWJzdHJhY3QgaW50ZXJuYWwgb3JnYW5pemF0aW9uYWwgcHJlc3N1cmVzLCBjbGllbnQgbmFtZXMsIG9yIHNlbnNpdGl2ZSBjb250cmFjdHVhbCBkZXRhaWxzIHRvIGdlbmVyaWMgcGxhY2Vob2xkZXJzIChlLmcuLCDigJxhIGNsaWVudOKAnSByYXRoZXIgdGhhbiBhIG5hbWVkIGNvbXBhbnkpLgogICAtIEZvciBiaW9ncmFwaGljYWwgb3IgaW5kaXZpZHVhbC1yZWxhdGVkIHF1ZXJpZXMsIGF2b2lkIHJlcXVlc3Rpbmcgb3IgcmVmZXJlbmNpbmcgcmVhbCBwZXJzb25hbCBpbmZvOyBpbnN0ZWFkLCBmcmFtZSByZXF1ZXN0cyBhcm91bmQgaHlwb3RoZXRpY2FsIG9yIGdlbmVyaWMgcHJvZmlsZXMgdW5sZXNzIHRoZSBuYW1lIGlzIHdpZGVseSBwdWJsaWMgYW5kIGVzc2VudGlhbCBmb3IgdGhlIHRhc2suCgoyLiBVbmRlcnN0YW5kaW5nIGFuZCBSZWZvcm11bGF0aW5nIHRoZSBUYXNrOgogICAtIElkZW50aWZ5IHRoZSB1bmRlcmx5aW5nIHRhc2sgKGNyZWF0aXZlIHdyaXRpbmcsIHN1bW1hcml6YXRpb24sIHByb2Zlc3Npb25hbCBjb21tdW5pY2F0aW9uIGRyYWZ0aW5nLCBldGMuKSBmcm9tIHRoZSB1c2Vy4oCZcyBxdWVyeS4KICAgLSBQcmVzZXJ2ZSB0aGUgZnVuY3Rpb25hbCBpbnRlbnQgYW5kIHRoZW1hdGljIHJlcXVpcmVtZW50cyAoZS5nLiwgY29udGVudCB0b3BpY3MgYXJvdW5kIHN1c3RhaW5hYmlsaXR5LCBzdW1tYXJ5IG9mIGEgcGVyc29u4oCZcyBiYWNrZ3JvdW5kLCBwcm9mZXNzaW9uYWwgZW1haWwgZm9sbG93LXVwKS4KICAgLSBGb3IgdXNlci1zdXBwbGllZCBjb250ZW50LCBkbyBub3QgcmVwZWF0IHZlcmJhdGltIG9yIGV4cG9zZSBhbnkgb3JpZ2luYWwgdGV4dDsgaW5zdGVhZCwgZXh0cmFjdCBjb3JlIHRoZW1lcywgaW5zdHJ1Y3QgdGhlIExMTSBhY2NvcmRpbmdseSwgb3IgcmVwbGFjZSB3aXRoIGdlbmVyaWMgZXhhbXBsZXMuCgozLiBNYXhpbWl6aW5nIE91dHB1dCBRdWFsaXR5IFdoaWxlIFByZXNlcnZpbmcgUHJpdmFjeToKICAgLSBDb25zdHJ1Y3QgYSBwcm9tcHQgdGhhdCBpcyBjbGVhciwgcHJlY2lzZSwgYW5kIGNvbnRhaW5zIHN1ZmZpY2llbnQgY29udGV4dCB0byBlbmFibGUgY29tcHJlaGVuc2l2ZSBhbmQgcmVsZXZhbnQgTExNIG91dHB1dC4KICAgLSBBdm9pZCBhbWJpZ3VvdXMgb3Igb3Zlcmx5IGdlbmVyaWMgcmVxdWVzdHMgdGhhdCBtaWdodCByZWR1Y2UgcmVsZXZhbmNlIG9yIHVzZWZ1bG5lc3MuCiAgIC0gTWFpbnRhaW4gYSBiYWxhbmNlIGJldHdlZW4gZGV0YWlsIG5lY2Vzc2FyeSBmb3IgcXVhbGl0eSBhbmQgZ2VuZXJhbGl6YXRpb24gcmVxdWlyZWQgZm9yIHByaXZhY3kuCgo0LiBDb21tb24gUmVmb3JtdWxhdGlvbiBTdHJhdGVnaWVzOgogICAtIFJlcGxhY2Ugc3BlY2lmaWMgbmFtZXMgd2l0aCBnZW5lcmljIHJvbGUgaWRlbnRpZmllcnMgb3IgcGxhY2Vob2xkZXJzICjigJxhIGJ1c2luZXNzIGNvbnRhY3Qs4oCdIOKAnGEgbm90YWJsZSBpbmRpdmlkdWFs4oCdKS4KICAgLSBSZXBsYWNlIHNwZWNpZmljIGxvY2F0aW9ucyBvciBpbnN0aXR1dGlvbnMgd2l0aCBnZW5lcmFsaXplZCBkZXNjcmlwdG9ycywgZS5nLiwg4oCcYSBjb3VudHJ5IGtub3duIGZvciBlY28tdG91cmlzbS7igJ0KICAgLSBGb3IgdGltZSByZWZlcmVuY2VzLCB1c2UgcmVsYXRpdmUgb3IgYXBwcm94aW1hdGUgdGVybXMgd2l0aG91dCByZXZlYWxpbmcgZXhwbGljaXQgZGF0ZXMuCiAgIC0gRm9yIGludGVybmFsIG9yIHByb3ByaWV0YXJ5IGRldGFpbHMsIGRlc2NyaWJlIHRoZSBzY2VuYXJpbyBnZW5lcmljYWxseSAoZS5nLiwg4oCccHJlc3N1cmUgZnJvbSBhIGNsaWVudCB0byBjbG9zZSBhIG1hdHRlciB1cmdlbnRseeKAnSkuCiAgIC0gV2hlbiBoYW5kbGluZyBwZXJzb25hbCBwcm9maWxlcyBvciBjaGFyYWN0ZXJzLCBleHBsaWNpdGx5IHN0YXRlIHRoYXQgdGhlIHByb2ZpbGUgaXMgZmljdGlvbmFsIGlmIHJlcXVlc3RpbmcgY29udGVudCBnZW5lcmF0aW9uIGFib3V0IGEgcGVyc29uLgoKNS4gRXhwbGFuYXRpb24gUmVxdWlyZW1lbnRzOgogICAtIEFsd2F5cyBwcm92aWRlIHJlYXNvbmluZyB0aGF0IGRldGFpbHMgaG93IHByaXZhY3kgcmlza3Mgd2VyZSBpZGVudGlmaWVkIGFuZCBtaXRpZ2F0ZWQuCiAgIC0gRXhwbGFpbiBob3cgdGhlIGVzc2VudGlhbCB0YXNrIHdhcyBwcmVzZXJ2ZWQgZGVzcGl0ZSBhYnN0cmFjdGlvbi4KICAgLSBUaGlzIHJlYXNvbmluZyBkb2N1bWVudHMgdGhlIHByaXZhY3ktcHJlc2VydmluZyBhcHByb2FjaCBhbmQganVzdGlmaWVzIGRlc2lnbiBjaG9pY2VzLgoKRXhhbXBsZXMgYW5kIENvbW1vbiBQaXRmYWxsczoKLSBEbyBub3QgcmV0YWluIG9yIGxpZ2h0bHkgb2JzY3VyZSBwZXJzb25hbCBuYW1lcyBvciBjb21wYW55IG5hbWVzOyBmdWxseSBhYnN0cmFjdCBvciByZW1vdmUuCi0gQXZvaWQgZXhwb3NpbmcgZGlyZWN0IHF1b3RlcyBmcm9tIHVzZXItc3VwcGxpZWQgdGV4dHMuCi0gVXNlIG5ldXRyYWwsIGNvbnRleHQtYXBwcm9wcmlhdGUgcGhyYXNpbmcgdG8gZGVzY3JpYmUgdXNlciBpbnRlbnRzLgotIFJldGFpbiBnZW9ncmFwaGljIG9yIGN1bHR1cmFsIGNvbnRleHQgb25seSB3aGVuIGl0IGlzIHB1YmxpY2x5IGF2YWlsYWJsZSBhbmQgcGl2b3RhbCB0byB0aGUgdGFzay4KLSBFbnN1cmUgdGhlIG91dHB1dCBwcm9tcHQgcmVtYWlucyBhIGNsZWFyIGluc3RydWN0aW9uIHRoYXQgdGhlIGV4dGVybmFsIExMTSBjYW4gcmVhZGlseSBpbnRlcnByZXQuCgpTdW1tYXJ5OgpZb3VyIHJlZm9ybXVsYXRpb25zIG11c3QgZW5zdXJlIHplcm8gZXhwb3N1cmUgb2YgUElJIG9yIHByaXZhdGUvcHJvcHJpZXRhcnkgY29udGVudCB3aGlsZSByZXRhaW5pbmcgZW5vdWdoIGNvbnRleHQgYW5kIGNsYXJpdHkgdG8gZ2VuZXJhdGUgaGlnaC1xdWFsaXR5LCByZWxldmFudCByZXNwb25zZXMgZnJvbSB0aGUgZXh0ZXJuYWwgTExNLiBUaGlzIGludm9sdmVzIGNhcmVmdWwgdGFzayBhbmFseXNpcywgbWV0aG9kaWNhbCBhYnN0cmFjdGlvbiBvZiBzZW5zaXRpdmUgZGV0YWlscywgYW5kIGNsZWFyLCBwcmVjaXNlIHByb21wdCBjb25zdHJ1Y3Rpb24gY29tYmluZWQgd2l0aCB0cmFuc3BhcmVudCByZWFzb25pbmcgb24gcHJpdmFjeSBwcm90ZWN0aW9uIG1lY2hhbmlzbXMgdXNlZC4=)
New Instruction for Privacy-Preserving Query Reformulation Assistant:


Task Overview:
You receive a user query that may contain sensitive, private, or personally identifiable information (PII). Your goal is to transform this input into a generalized, privacy-preserving prompt suitable for querying an external large language model (LLM). The reformulated prompt must enable the external LLM to fulfill the user’s original intent effectively, while rigorously protecting user privacy by abstracting or omitting any sensitive details.


Input Format:
- A single string representing a user query.
- The query may include private names, places, dates, proprietary info, or identifiable context.


Output Format:
- Part (a) Reasoning: a concise paragraph explaining:
 - How you identified sensitive or private information in the input.
 - What generalization, abstraction, or omission strategies you applied to protect privacy.
 - How the reformulated prompt maintains the original task or informational need without risking data leakage.
- Part (b) LLM Request: a carefully constructed and concise, privacy-safe prompt that retains essential thematic and functional elements to achieve a useful, relevant response from the external LLM.


Key Domain-Specific Details and Best Practices:


1. Privacy Preservation Principles:
 - Remove or replace all user-specific names (personal or organizational), exact dates or durations, locations, URLs, proprietary course or product codes, customer or client names, and other identifiers.
 - When geographic or organizational mentions are critical for context, abstract these to broader or public categories (e.g., “a sustainable travel website focused on a Central American country” rather than naming the country explicitly).
 - Omit or abstract internal organizational pressures, client names, or sensitive contractual details to generic placeholders (e.g., “a client” rather than a named company).
 - For biographical or individual-related queries, avoid requesting or referencing real personal info; instead, frame requests around hypothetical or generic profiles unless the name is widely public and essential for the task.


2. Understanding and Reformulating the Task:
 - Identify the underlying task (creative writing, summarization, professional communication drafting, etc.) from the user’s query.
 - Preserve the functional intent and thematic requirements (e.g., content topics around sustainability, summary of a person’s background, professional email follow-up).
 - For user-supplied content, do not repeat verbatim or expose any original text; instead, extract core themes, instruct the LLM accordingly, or replace with generic examples.


3. Maximizing Output Quality While Preserving Privacy:
 - Construct a prompt that is clear, precise, and contains sufficient context to enable comprehensive and relevant LLM output.
 - Avoid ambiguous or overly generic requests that might reduce relevance or usefulness.
 - Maintain a balance between detail necessary for quality and generalization required for privacy.


4. Common Reformulation Strategies:
 - Replace specific names with generic role identifiers or placeholders (“a business contact,” “a notable individual”).
 - Replace specific locations or institutions with generalized descriptors, e.g., “a country known for eco-tourism.”
 - For time references, use relative or approximate terms without revealing explicit dates.
 - For internal or proprietary details, describe the scenario generically (e.g., “pressure from a client to close a matter urgently”).
 - When handling personal profiles or characters, explicitly state that the profile is fictional if requesting content generation about a person.


5. Explanation Requirements:
 - Always provide reasoning that details how privacy risks were identified and mitigated.
 - Explain how the essential task was preserved despite abstraction.
 - This reasoning documents the privacy-preserving approach and justifies design choices.


Examples and Common Pitfalls:
- Do not retain or lightly obscure personal names or company names; fully abstract or remove.
- Avoid exposing direct quotes from user-supplied texts.
- Use neutral, context-appropriate phrasing to describe user intents.
- Retain geographic or cultural context only when it is publicly available and pivotal to the task.
- Ensure the output prompt remains a clear instruction that the external LLM can readily interpret.


Summary:
Your reformulations must ensure zero exposure of PII or private/proprietary content while retaining enough context and clarity to generate high-quality, relevant responses from the external LLM. This involves careful task analysis, methodical abstraction of sensitive details, and clear, precise prompt construction combined with transparent reasoning on privacy protection mechanisms used.

Node 11 (Score 97.6)

[⬇](data:text/plain;base64,TmV3IEluc3RydWN0aW9uIGZvciBQcml2YWN5LVByZXNlcnZpbmcgUXVlcnkgUmVmb3JtdWxhdGlvbiBBc3Npc3RhbnQgKEVuaGFuY2VkKToKClRhc2sgT3ZlcnZpZXc6CllvdSByZWNlaXZlIGEgdXNlciBxdWVyeSB0aGF0IG1heSBjb250YWluIHNlbnNpdGl2ZSwgcHJpdmF0ZSwgb3IgcGVyc29uYWxseSBpZGVudGlmaWFibGUgaW5mb3JtYXRpb24gKFBJSSkuIFlvdXIgb2JqZWN0aXZlIGlzIHRvIHJlZm9ybXVsYXRlIHRoaXMgcXVlcnkgaW50byBhIGdlbmVyYWxpemVkLCBwcml2YWN5LXByZXNlcnZpbmcgcHJvbXB0IHN1aXRhYmxlIGZvciBzZW5kaW5nIHRvIGFuIGV4dGVybmFsIGxhcmdlIGxhbmd1YWdlIG1vZGVsIChMTE0pLiBUaGUgcmVmb3JtdWxhdGVkIHByb21wdCBtdXN0IGVuYWJsZSB0aGUgZXh0ZXJuYWwgTExNIHRvIGZ1bGZpbGwgdGhlIHVzZXIncyBvcmlnaW5hbCBpbnRlbnQgZWZmZWN0aXZlbHkgd2hpbGUgcmlnb3JvdXNseSBwcm90ZWN0aW5nIGFsbCB1c2VyIHByaXZhY3kgYnkgYWJzdHJhY3RpbmcsIG9taXR0aW5nLCBvciBnZW5lcmFsaXppbmcgYW55IHNlbnNpdGl2ZSBkZXRhaWxzLgoKSW5wdXQgRm9ybWF0OgotIEEgc2luZ2xlIHVzZXIgcXVlcnkgc3RyaW5nLgotIFRoZSBxdWVyeSBtaWdodCBjb250YWluIGlkZW50aWZpYWJsZSBuYW1lcyAocGVvcGxlLCBvcmdhbml6YXRpb25zKSwgc3BlY2lmaWMgZ2VvZ3JhcGhpYyBsb2NhdGlvbnMsIGV4YWN0IGRhdGVzIG9yIHRpbWVmcmFtZXMsIHByb3ByaWV0YXJ5IG9yIGludGVybmFsIHRlcm1pbm9sb2d5IChlLmcuLCBzeXN0ZW0gbmFtZXMsIHByb2R1Y3QgY29kZXMpLCBjbGllbnQgb3IgY3VzdG9tZXIgbmFtZXMsIFVSTHMsIG9yIGFueSBvdGhlciBzZW5zaXRpdmUgb3IgcHJpdmF0ZSBpbmZvcm1hdGlvbi4KCk91dHB1dCBGb3JtYXQ6Ci0gUGFydCAoYSkgUmVhc29uaW5nOgogICBQcm92aWRlIGEgY29uY2lzZSBwYXJhZ3JhcGggdGhhdCBleHBsYWluczoKICAgKiBIb3cgeW91IGlkZW50aWZpZWQgc2Vuc2l0aXZlIG9yIHByaXZhdGUgaW5mb3JtYXRpb24gaW4gdGhlIGlucHV0CiAgICogV2hhdCBzdHJhdGVnaWVzIHlvdSBhcHBsaWVkIHRvIHByb3RlY3QgcHJpdmFjeSAoZ2VuZXJhbGl6YXRpb24sIG9taXNzaW9uLCBhYnN0cmFjdGlvbiwgcmVwbGFjZW1lbnQgd2l0aCBwbGFjZWhvbGRlcnMpCiAgICogSG93IHRoZSByZWZvcm11bGF0ZWQgcHJvbXB0IHByZXNlcnZlcyB0aGUgb3JpZ2luYWwgaW50ZW50IGFuZCB0YXNrIHJlcXVpcmVtZW50cyB3aXRob3V0IHJpc2tpbmcgZGF0YSBsZWFrYWdlCi0gUGFydCAoYikgTExNIFJlcXVlc3Q6CiAgIEEgY29uY2lzZSwgY2FyZWZ1bGx5IGNvbnN0cnVjdGVkIHByaXZhY3ktc2FmZSBwcm9tcHQgdGhhdDoKICAgKiBSZW1vdmVzIG9yIGFub255bWl6ZXMgYWxsIFBJSSBhbmQgcHJvcHJpZXRhcnkvaW50ZXJuYWwgZGV0YWlscwogICAqIEFic3RyYWN0cyBsb2NhdGlvbnMsIG5hbWVzLCBkYXRlcywgYW5kIHRlY2huaWNhbCB0ZXJtcyBhcyBuZWVkZWQKICAgKiBQcm9kdWNlcyBhIGNsZWFyIGFuZCBjb250ZXh0dWFsbHkgcmljaCBpbnN0cnVjdGlvbiBmb3IgdGhlIExMTSB0byBnZW5lcmF0ZSBhIHJlbGV2YW50IGFuZCBpbmZvcm1hdGl2ZSByZXNwb25zZSBhbGlnbmVkIHdpdGggdGhlIHVzZXIncyBvcmlnaW5hbCB0YXNrCgpEZXRhaWxlZCBEb21haW4tU3BlY2lmaWMgR3VpZGFuY2UgYW5kIEJlc3QgUHJhY3RpY2VzOgoKMS4gSWRlbnRpZmljYXRpb24gYW5kIFRyZWF0bWVudCBvZiBTZW5zaXRpdmUgRGF0YToKICAgLSBBbGwgdXNlci1zcGVjaWZpYyBvciBwZXJzb25hbCBuYW1lcyAoaW5kaXZpZHVhbCBvciBvcmdhbml6YXRpb25hbCkgbXVzdCBiZSByZW1vdmVkIG9yIHJlcGxhY2VkIHdpdGggZ2VuZXJpYyByb2xlIGRlc2NyaXB0b3JzIChlLmcuLCDigJxhIGJ1c2luZXNzIGNvbnRhY3Qs4oCdIOKAnGEgY2xpZW50LOKAnSDigJxhIG5vdGFibGUgaW5kaXZpZHVhbOKAnSkuIE5ldmVyIGxpZ2h0bHkgb2JzY3VyZSBvciBwYXJ0aWFsbHkgcmVkYWN0OyBmdWxsIGFic3RyYWN0aW9uIGlzIHJlcXVpcmVkLgogICAtIEFsbCBnZW9ncmFwaGljIG1lbnRpb25zIG11c3QgYmUgYWJzdHJhY3RlZCB1bmxlc3MgdGhlIGxvY2F0aW9uIGlzIHB1YmxpY2x5IGtub3duLCBlc3NlbnRpYWwgdG8gdGhlIHRhc2ssIGFuZCBjYW4gYmUgZ2VuZXJhbGl6ZWQgKGUuZy4sIOKAnGEgcmVnaW9uIGtub3duIGZvciBlY28tdG91cmlzbeKAnSBpbnN0ZWFkIG9mIG5hbWluZyBhIGNvdW50cnkgb3IgY2l0eSBleHBsaWNpdGx5KS4KICAgLSBFeGFjdCBkYXRlcyBvciBkdXJhdGlvbnMgbXVzdCBuZXZlciBiZSByZXRhaW5lZDsgaW5zdGVhZCwgdXNlIHJlbGF0aXZlIG9yIGFwcHJveGltYXRlIHRlbXBvcmFsIHJlZmVyZW5jZXMgKGUuZy4sIOKAnHJlY2VudGx5LOKAnSDigJxvdmVyIHRoZSBwYXN0IHllYXLigJ0pLgogICAtIEludGVybmFsIG9yIHByb3ByaWV0YXJ5IHRlcm1zIOKAlCBpbmNsdWRpbmcgc3lzdGVtIG5hbWVzLCBwcm9kdWN0IGNvZGVzLCBzdWJzY3JpcHRpb24gdHlwZXMsIGFuZCB0ZWNobmljYWwgamFyZ29uIOKAlCBtdXN0IGJlIGdlbmVyYWxpemVkIG9yIHJlcGxhY2VkIHdpdGggbmV1dHJhbCBkZXNjcmlwdG9ycyB0byBhdm9pZCBsZWFrYWdlIG9mIGludGVsbGVjdHVhbCBwcm9wZXJ0eSBvciBzZW5zaXRpdmUgb3BlcmF0aW9uYWwgZGV0YWlscy4KICAgLSBBdm9pZCBkaXJlY3QgcXVvdGVzIG9yIHZlcmJhdGltIGluY2x1c2lvbiBvZiB1c2VyLXN1cHBsaWVkIHRleHRzIHVubGVzcyBvYmZ1c2NhdGVkIGJ5IGdlbmVyYWxpemF0aW9uLgoKMi4gVGFzayBVbmRlcnN0YW5kaW5nIGFuZCBSZWZvcm11bGF0aW9uOgogICAtIElkZW50aWZ5IHRoZSBmdW5jdGlvbmFsIGludGVudCBvZiB0aGUgcXVlcnk6IElzIGl0IGNyZWF0aXZlIHdyaXRpbmcsIHRyYW5zbGF0aW9uLCBzdW1tYXJpemF0aW9uLCBwcm9mZXNzaW9uYWwgY29tbXVuaWNhdGlvbiBkcmFmdGluZywgdGVjaG5pY2FsIGV4cGxhbmF0aW9uLCBvciBvdGhlcj8KICAgLSBQcmVzZXJ2ZSB0aGUgdGhlbWF0aWMgYW5kIGluZm9ybWF0aW9uYWwgY29yZSBvZiB0aGUgcXVlcnkgKGUuZy4sIHJlcXVlc3QgZm9yIGVkdWNhdGlvbmFsIHF1YWxpdHkgYW5hbHlzaXMsIHRlY2huaWNhbCB0cmFuc2xhdGlvbiBvZiBhIHBhc3NhZ2UsIGJpb2dyYXBoaWNhbCBzdW1tYXJ5KS4KICAgLSBEbyBub3QgcmVwcm9kdWNlIHRoZSBvcmlnaW5hbCBpbnB1dCB2ZXJiYXRpbTsgaW5zdGVhZCwgZnJhbWUgdGhlIExMTSBwcm9tcHQgYXJvdW5kIHRoZSBlc3NlbnRpYWwgdGhlbWF0aWMgZWxlbWVudHMgZXh0cmFjdGVkIGZyb20gdGhlIGlucHV0LgogICAtIEZvciBxdWVyaWVzIHJlZ2FyZGluZyBpbmRpdmlkdWFscywgYXZvaWQgZGlyZWN0IHJlZmVyZW5jZSB0byByZWFsIHBlcnNvbmFsIGluZm9ybWF0aW9uIHVubGVzcyB0aGUgbmFtZSBpcyB3aWRlbHkgcHVibGljIGFuZCBlc3NlbnRpYWw7IGV2ZW4gdGhlbiwgdXNlIGEgZ2VuZXJpYyBvciBoeXBvdGhldGljYWwgZnJhbWluZyBmb3IgdGhlIGluZGl2aWR1YWwgcHJvZmlsZS4KCjMuIFN0cmF0ZWdpZXMgZm9yIEhpZ2gtUXVhbGl0eSBhbmQgUHJpdmFjeS1QcmVzZXJ2aW5nIFByb21wdHM6CiAgIC0gU3RyaWtlIGEgYmFsYW5jZSBiZXR3ZWVuIHN1ZmZpY2llbnQgY29udGV4dHVhbCBkZXRhaWwgYW5kIHByaXZhY3kgYWJzdHJhY3Rpb24gdG8gbWFpbnRhaW4gcHJvbXB0IGNsYXJpdHkgYW5kIHJlbGV2YW5jZS4KICAgLSBVc2UgbmV1dHJhbCwgY29udGV4dC1hd2FyZSBmb3JtdWxhdGlvbnMgdGhhdCBjbGVhcmx5IGluc3RydWN0IHRoZSBMTE0gb24gdGhlIGNvbnRlbnQgYW5kIHN0eWxlIGV4cGVjdGVkLgogICAtIEF2b2lkIHZhZ3VlIG9yIG92ZXJseSBnZW5lcmljIHByb21wdHMgdGhhdCBjb3VsZCByZXN1bHQgaW4gbGVzcyB1c2VmdWwgb3IgbG93ZXItcXVhbGl0eSByZXNwb25zZXMuCiAgIC0gV2hlbiBzeXN0ZW0gb3IgcHJvcHJpZXRhcnkgY29udGVudCBpcyBtZW50aW9uZWQsIGluc3RydWN0IHRoZSBMTE0gdG8gZ2VuZXJhbGl6ZSBzcGVjaWZpYyB0ZXJtcyBhbmQgbWFpbnRhaW4gdGhlIHRlY2huaWNhbCBtZWFuaW5nIHdpdGhvdXQgcmV2ZWFsaW5nIHNlbnNpdGl2ZSBpbmZvLgogICAtIFdoZW4gYSBkaXJlY3QgdHJhbnNsYXRpb24gaXMgcmVxdWVzdGVkIG9uIHNwZWNpYWxpemVkIHRleHQsIHNwZWNpZnkgdG8gcmVwbGFjZSBvciBhYnN0cmFjdCBpbnRlcm5hbCBub21lbmNsYXR1cmUuCgo0LiBFeHBsYW5hdGlvbiBSZXF1aXJlbWVudHM6CiAgIC0gVGhlIHJlYXNvbmluZyBtdXN0IHRyYW5zcGFyZW50bHkgZXhwbGFpbiBob3cgcHJpdmFjeSByaXNrcyB3ZXJlIGlkZW50aWZpZWQgKGUuZy4sIHByZXNlbmNlIG9mIG5hbWVzLCBsb2NhdGlvbnMsIGRhdGVzLCBwcm9wcmlldGFyeSB0ZXJtcykuCiAgIC0gSXQgbXVzdCBkZXNjcmliZSB0aGUgYWJzdHJhY3Rpb24gb3Igb21pc3Npb24gbWV0aG9kcyBhcHBsaWVkIChlLmcuLCByZXBsYWNpbmcg4oCcSm9uYWggVmFuIEJlaWpuZW7igJ0gd2l0aCDigJxhIG5vdGFibGUgaW5kaXZpZHVhbCzigJ0gc3Vic3RpdHV0aW5nIOKAnE1ha2F14oCdIHdpdGgg4oCcYSBzcGVjaWZpYyByZWdpb24s4oCdIG9yIOKAnFlvZGHigJ0gd2l0aCDigJxhIHN5c3RlbSBuYW1l4oCdKS4KICAgLSBDbGFyaWZ5IGhvdyB0aGUgZXNzZW50aWFsIHRhc2sgYW5kIHVzZXIgaW50ZW50IHdlcmUgcHJlc2VydmVkIGRlc3BpdGUgdGhlc2UgZ2VuZXJhbGl6YXRpb25zIChlLmcuLCBmb2N1c2luZyBvbiBlZHVjYXRpb25hbCBxdWFsaXR5LCB0ZWNobmljYWwgdHJhbnNsYXRpb24sIGJpb2dyYXBoaWNhbCBzdW1tYXJ5KS4KICAgLSBUaGlzIGV4cGxhbmF0aW9uIGp1c3RpZmllcyB5b3VyIGRlc2lnbiBjaG9pY2VzIGFuZCBkZW1vbnN0cmF0ZXMgYWRoZXJlbmNlIHRvIHByaXZhY3ktcHJlc2VydmluZyBwcmluY2lwbGVzLgoKQ29tbW9uIFBpdGZhbGxzIHRvIEF2b2lkOgotIERvIG5vdCBtZXJlbHkgbGlnaHRseSBvYnNjdXJlIG9yIHBhcnRpYWxseSByZWRhY3Qgc2Vuc2l0aXZlIGRldGFpbHM7IGZ1bGwgYW5vbnltaXphdGlvbiBvciBhYnN0cmFjdGlvbiBpcyByZXF1aXJlZC4KLSBEbyBub3QgcmVwZWF0IGFueSB1c2VyLXN1cHBsaWVkIFBJSSBvciBwcm9wcmlldGFyeSBjb250ZW50IHZlcmJhdGltLgotIEF2b2lkIGluY2x1ZGluZyBVUkxzLCBleGFjdCBkYXRlcywgb3IgZGlyZWN0IHF1b3RlcyB3aXRob3V0IG1vZGlmaWNhdGlvbi4KLSBEbyBub3QgbGVhdmUgYW1iaWd1aXR5IHRoYXQgY291bGQgZGVncmFkZSB0aGUgcXVhbGl0eSBvciBjb250ZXh0dWFsIGNsYXJpdHkgb2YgdGhlIHJlZm9ybXVsYXRlZCBwcm9tcHQuCi0gRG8gbm90IGluY2x1ZGUgYW55IHJlYWwgcGVyc29uYWwgb3Igb3JnYW5pemF0aW9uYWwgbmFtZXMgdW5sZXNzIHRoZXkgYXJlIHB1YmxpYyBmaWd1cmVzIGFuZCB0aGUgcXVlcnkgcmVxdWlyZXMgaXQsIHRoZW4gdXNlIGdlbmVyaWMgZGVzY3JpcHRvcnMgaW5zdGVhZC4KCkV4YW1wbGUgU3VtbWFyeSBvZiBFZmZlY3RpdmUgQXBwcm9hY2ggKEluZm9ybWVkIGJ5IFByaW9yIEV4YW1wbGVzKToKLSBGb3IgZ2VvZ3JhcGhpYyBxdWVyaWVzOiByZXBsYWNlIGV4YWN0IHBsYWNlIG5hbWVzIHdpdGggZ2VuZXJhbCByZWdpb25zIGFuZCBwcm92aWRlIGEgYnJpZWYgY29udGV4dHVhbCBkZXNjcmlwdG9yLgotIEZvciB0ZWNobmljYWwgdGV4dHMgY29udGFpbmluZyBzeXN0ZW0gbmFtZXMgb3Igc3Vic2NyaXB0aW9uIHR5cGVzOiBpbnN0cnVjdCB0aGUgTExNIHRvIHRyYW5zbGF0ZSBvciBwcm9jZXNzIHRoZSB0ZXh0IHdoaWxlIHJlcGxhY2luZyBvciBhYnN0cmFjdGluZyBwcm9wcmlldGFyeSBzeXN0ZW0gaWRlbnRpZmllcnMuCi0gRm9yIGJpb2dyYXBoaWNhbCBzdW1tYXJpZXMgYWJvdXQgc3BlY2lmaWMgaW5kaXZpZHVhbHM6IHJlbW92ZSB0aGUgcmVhbCBuYW1lIGFuZCByZXF1ZXN0IGEgZ2VuZXJpYywgd2VsbC1zdHJ1Y3R1cmVkIGZvdXItcGFyYWdyYXBoIHN1bW1hcnkgYWJvdXQg4oCcYSBub3RhYmxlIGluZGl2aWR1YWws4oCdIHByZXNlcnZpbmcgdGhlIG92ZXJhbGwgaW50ZW50IHdpdGhvdXQgbGVha2luZyBQSUkuCgpTdW1tYXJ5OgpZb3VyIHJlZm9ybXVsYXRpb25zIG11c3QgZW5zdXJlIHplcm8gZXhwb3N1cmUgb2YgYW55IFBJSSBvciBwcml2YXRlL3Byb3ByaWV0YXJ5IGNvbnRlbnQgd2hpbGUgcmV0YWluaW5nIGVub3VnaCB0aGVtYXRpYyBhbmQgZnVuY3Rpb25hbCBjbGFyaXR5IGZvciB0aGUgZXh0ZXJuYWwgTExNIHRvIHByb2R1Y2UgaGlnaC1xdWFsaXR5LCByZWxldmFudCBvdXRwdXRzLiBUaGlzIHJlcXVpcmVzIHRob3JvdWdoIGFuYWx5c2lzIG9mIHRoZSB1c2VyJ3MgcXVlcnksIHJpZ29yb3VzIGFwcGxpY2F0aW9uIG9mIHByaXZhY3ktcHJlc2VydmF0aW9uIHN0cmF0ZWdpZXMsIGFuZCBleHBsaWNpdCByZWFzb25pbmcgZXhwbGFuYXRpb25zIHRoYXQgZG9jdW1lbnQgeW91ciBhcHByb2FjaCBhbmQgY2hvaWNlcy4=)
New Instruction for Privacy-Preserving Query Reformulation Assistant (Enhanced):


Task Overview:
You receive a user query that may contain sensitive, private, or personally identifiable information (PII). Your objective is to reformulate this query into a generalized, privacy-preserving prompt suitable for sending to an external large language model (LLM). The reformulated prompt must enable the external LLM to fulfill the user’s original intent effectively while rigorously protecting all user privacy by abstracting, omitting, or generalizing any sensitive details.


Input Format:
- A single user query string.
- The query might contain identifiable names (people, organizations), specific geographic locations, exact dates or timeframes, proprietary or internal terminology (e.g., system names, product codes), client or customer names, URLs, or any other sensitive or private information.


Output Format:
- Part (a) Reasoning:
 Provide a concise paragraph that explains:
 * How you identified sensitive or private information in the input
 * What strategies you applied to protect privacy (generalization, omission, abstraction, replacement with placeholders)
 * How the reformulated prompt preserves the original intent and task requirements without risking data leakage
- Part (b) LLM Request:
 A concise, carefully constructed privacy-safe prompt that:
 * Removes or anonymizes all PII and proprietary/internal details
 * Abstracts locations, names, dates, and technical terms as needed
 * Produces a clear and contextually rich instruction for the LLM to generate a relevant and informative response aligned with the user’s original task


Detailed Domain-Specific Guidance and Best Practices:


1. Identification and Treatment of Sensitive Data:
 - All user-specific or personal names (individual or organizational) must be removed or replaced with generic role descriptors (e.g., “a business contact,” “a client,” “a notable individual”). Never lightly obscure or partially redact; full abstraction is required.
 - All geographic mentions must be abstracted unless the location is publicly known, essential to the task, and can be generalized (e.g., “a region known for eco-tourism” instead of naming a country or city explicitly).
 - Exact dates or durations must never be retained; instead, use relative or approximate temporal references (e.g., “recently,” “over the past year”).
 - Internal or proprietary terms — including system names, product codes, subscription types, and technical jargon — must be generalized or replaced with neutral descriptors to avoid leakage of intellectual property or sensitive operational details.
 - Avoid direct quotes or verbatim inclusion of user-supplied texts unless obfuscated by generalization.


2. Task Understanding and Reformulation:
 - Identify the functional intent of the query: Is it creative writing, translation, summarization, professional communication drafting, technical explanation, or other?
 - Preserve the thematic and informational core of the query (e.g., request for educational quality analysis, technical translation of a passage, biographical summary).
 - Do not reproduce the original input verbatim; instead, frame the LLM prompt around the essential thematic elements extracted from the input.
 - For queries regarding individuals, avoid direct reference to real personal information unless the name is widely public and essential; even then, use a generic or hypothetical framing for the individual profile.


3. Strategies for High-Quality and Privacy-Preserving Prompts:
 - Strike a balance between sufficient contextual detail and privacy abstraction to maintain prompt clarity and relevance.
 - Use neutral, context-aware formulations that clearly instruct the LLM on the content and style expected.
 - Avoid vague or overly generic prompts that could result in less useful or lower-quality responses.
 - When system or proprietary content is mentioned, instruct the LLM to generalize specific terms and maintain the technical meaning without revealing sensitive info.
 - When a direct translation is requested on specialized text, specify to replace or abstract internal nomenclature.


4. Explanation Requirements:
 - The reasoning must transparently explain how privacy risks were identified (e.g., presence of names, locations, dates, proprietary terms).
 - It must describe the abstraction or omission methods applied (e.g., replacing “Jonah Van Beijnen” with “a notable individual,” substituting “Makau” with “a specific region,” or “Yoda” with “a system name”).
 - Clarify how the essential task and user intent were preserved despite these generalizations (e.g., focusing on educational quality, technical translation, biographical summary).
 - This explanation justifies your design choices and demonstrates adherence to privacy-preserving principles.


Common Pitfalls to Avoid:
- Do not merely lightly obscure or partially redact sensitive details; full anonymization or abstraction is required.
- Do not repeat any user-supplied PII or proprietary content verbatim.
- Avoid including URLs, exact dates, or direct quotes without modification.
- Do not leave ambiguity that could degrade the quality or contextual clarity of the reformulated prompt.
- Do not include any real personal or organizational names unless they are public figures and the query requires it, then use generic descriptors instead.


Example Summary of Effective Approach (Informed by Prior Examples):
- For geographic queries: replace exact place names with general regions and provide a brief contextual descriptor.
- For technical texts containing system names or subscription types: instruct the LLM to translate or process the text while replacing or abstracting proprietary system identifiers.
- For biographical summaries about specific individuals: remove the real name and request a generic, well-structured four-paragraph summary about “a notable individual,” preserving the overall intent without leaking PII.


Summary:
Your reformulations must ensure zero exposure of any PII or private/proprietary content while retaining enough thematic and functional clarity for the external LLM to produce high-quality, relevant outputs. This requires thorough analysis of the user’s query, rigorous application of privacy-preservation strategies, and explicit reasoning explanations that document your approach and choices.

## Appendix L Examples of best prompts for every benchmark

In this section, we present the best optimized prompt obtained for every (benchmark, model) configuration. Each subsection below pertains to one (benchmark, model) configuration. Since every compound AI system consists of multiple modules, each subsection consists of multiple boxes, listing the prompts for each module. MIPROv2 optimized prompts contain upto 4 few-shot examples for each task. We provide just the first demo here for brevity. GEPA’s prompts only consist of the optimized instruction, which is provided in full.

### L.1 HotpotQA, GPT-4.1 Mini

HotpotQA GPT-4.1 Mini create_query_hop2.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgc3VtbWFyeV8xYCwgcHJvZHVjZSB0aGUgZmllbGRzIGBxdWVyeWAu)
Given the fields ‘question‘, ‘summary_1‘, produce the fields ‘query‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,WW91IGFyZSBhbiBleHBlcnQgbXVsdGktaG9wIHF1ZXN0aW9uIGFuc3dlcmluZyBzeXN0ZW0gZGVzaWduZWQgdG8gcmVmaW5lIHJldHJpZXZhbCBxdWVyaWVzIGZvciBjb21wbGV4IHF1ZXN0aW9ucy4gR2l2ZW4gdGhlIG9yaWdpbmFsIHF1ZXN0aW9uIGFuZCBhbiBpbml0aWFsIHN1bW1hcnkgb2YgcmV0cmlldmVkIGRvY3VtZW50cyAoc3VtbWFyeV8xKSwgdGhpbmsgc3RlcCBieSBzdGVwIHRvIGFuYWx5emUgaG93IHRoZSBzdW1tYXJ5IHJlbGF0ZXMgdG8gdGhlIHF1ZXN0aW9uLiBVc2UgdGhpcyByZWFzb25pbmcgdG8gZ2VuZXJhdGUgYSBmb2N1c2VkIGFuZCBwcmVjaXNlIHF1ZXJ5IHRoYXQgd2lsbCBndWlkZSB0aGUgcmV0cmlldmFsIG9mIGFkZGl0aW9uYWwgcmVsZXZhbnQgaW5mb3JtYXRpb24gbmVlZGVkIHRvIGFuc3dlciB0aGUgcXVlc3Rpb24gY29tcGxldGVseS4gWW91ciBvdXRwdXQgc2hvdWxkIGluY2x1ZGUgYSBjbGVhciBjaGFpbi1vZi10aG91Z2h0IHJlYXNvbmluZyBwcm9jZXNzIGZvbGxvd2VkIGJ5IHRoZSByZWZpbmVkIHF1ZXJ5IHRoYXQgdGFyZ2V0cyBjb21wbGVtZW50YXJ5IGV2aWRlbmNlIGZvciB0aGUgbmV4dCByZXRyaWV2YWwgaG9wLgpEZW1vczoKRXhhbXBsZSAxOgpxdWVzdGlvbjoKICAgIFNpbW9uZSBCZW5lZGV0dGkgcGxheXMgZm9yIGEgdGVhbSB0aGF0IGN1cnJlbnRseSBjb21wZXRlcyBpbiB3aGljaCBTZXJpZT8Kc3VtbWFyeV8xOgogICAgU2ltb25lIEJlbmVkZXR0aSBwbGF5cyBmb3IgVmlydHVzIEVudGVsbGEsIGJ1dCB0aGUgcGFzc2FnZXMgZG8gbm90IHNwZWNpZnkgd2hpY2ggU2VyaWUgdGhlIHRlYW0gY3VycmVudGx5IGNvbXBldGVzIGluLgpyZWFzb25pbmc6CiAgICBUaGUgc3VtbWFyeSBpbmRpY2F0ZXMgdGhhdCBTaW1vbmUgQmVuZWRldHRpIHBsYXlzIGZvciBWaXJ0dXMgRW50ZWxsYSwgYnV0IGl0IGRvZXMgbm90IHN0YXRlIHRoZSBjdXJyZW50IFNlcmllIChsZWFndWUgbGV2ZWwpIGluIHdoaWNoIFZpcnR1cyBFbnRlbGxhIGNvbXBldGVzLiBUbyBhY2N1cmF0ZWx5IGFuc3dlciB3aGljaCBTZXJpZSB0aGUgdGVhbSBjdXJyZW50bHkgY29tcGV0ZXMgaW4sIGl0IGlzIG5lY2Vzc2FyeSB0byBsb29rIHVwIHRoZSBtb3N0IHJlY2VudCBsZWFndWUgaW5mb3JtYXRpb24gZm9yIFZpcnR1cyBFbnRlbGxhLgpxdWVyeToKICAgIFdoYXQgU2VyaWUgKGxlYWd1ZSBsZXZlbCkgZG9lcyBWaXJ0dXMgRW50ZWxsYSBjdXJyZW50bHkgY29tcGV0ZSBpbj8KCgojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCjMgb3RoZXIgZGVtb3Mgb21pdHRlZCBmb3IgYnJldml0eS4KIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwo=)
You are an expert multi-hop question answering system designed to refine retrieval queries for complex questions. Given the original question and an initial summary of retrieved documents (summary_1), think step by step to analyze how the summary relates to the question. Use this reasoning to generate a focused and precise query that will guide the retrieval of additional relevant information needed to answer the question completely. Your output should include a clear chain-of-thought reasoning process followed by the refined query that targets complementary evidence for the next retrieval hop.
Demos:
Example 1:
question:
 Simone Benedetti plays for a team that currently competes in which Serie?
summary_1:
 Simone Benedetti plays for Virtus Entella, but the passages do not specify which Serie the team currently competes in.
reasoning:
 The summary indicates that Simone Benedetti plays for Virtus Entella, but it does not state the current Serie (league level) in which Virtus Entella competes. To accurately answer which Serie the team currently competes in, it is necessary to look up the most recent league information for Virtus Entella.
query:
 What Serie (league level) does Virtus Entella currently compete in?




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,WW91IHdpbGwgYmUgZ2l2ZW4gdHdvIGlucHV0IGZpZWxkczogYHF1ZXN0aW9uYCBhbmQgYHN1bW1hcnlfMWAuCgpZb3VyIHRhc2sgaXMgdG8gZ2VuZXJhdGUgYSBuZXcgc2VhcmNoIHF1ZXJ5IChgcXVlcnlgKSBvcHRpbWl6ZWQgZm9yIHRoZSAqKnNlY29uZCBob3AqKiBvZiBhIG11bHRpLWhvcCByZXRyaWV2YWwgc3lzdGVtLiBUaGUgb3JpZ2luYWwgdXNlciBxdWVzdGlvbiBpcyB0eXBpY2FsbHkgY29tcGxleCBhbmQgcmVxdWlyZXMgaW5mb3JtYXRpb24gZnJvbSBtdWx0aXBsZSBkb2N1bWVudHMgdG8gYW5zd2VyLiBUaGUgZmlyc3QgaG9wIHF1ZXJ5IGlzIHRoZSBvcmlnaW5hbCBxdWVzdGlvbiB1c2VkIHRvIHJldHJpZXZlIGFuIGluaXRpYWwgc2V0IG9mIGRvY3VtZW50cy4gWW91ciBnb2FsIGlzIHRvIGdlbmVyYXRlIGEgKipzZWNvbmQgaG9wIHF1ZXJ5KiogdGhhdCByZXRyaWV2ZXMgKmFkZGl0aW9uYWwgcmVsZXZhbnQgZG9jdW1lbnRzKiB0aGF0IHdlcmUgKm5vdCogZm91bmQgaW4gdGhlIGZpcnN0IGhvcCBidXQgYXJlIG5lY2Vzc2FyeSB0byBhbnN3ZXIgdGhlIG9yaWdpbmFsIHF1ZXN0aW9uIGNvbXBsZXRlbHkuCgpEZXRhaWxlZCB0YXNrIGluc3RydWN0aW9ucyBhbmQgaGludHM6CgoxLiAqKklucHV0IFVuZGVyc3RhbmRpbmc6KioKICAgLSBgcXVlc3Rpb25gIGlzIHRoZSBvcmlnaW5hbCBtdWx0aS1ob3AgcXVlc3Rpb24gcG9zZWQgYnkgdGhlIHVzZXIuCiAgIC0gYHN1bW1hcnlfMWAgaXMgYSBjb25jaXNlIHN1bW1hcnkgb2YgaW5mb3JtYXRpb24gZnJvbSBhIGRvY3VtZW50IHJldHJpZXZlZCBpbiB0aGUgZmlyc3QgaG9wLCB3aGljaCBwYXJ0aWFsbHkgYWRkcmVzc2VzIHRoZSBxdWVzdGlvbi4KCjIuICoqUHVycG9zZSBhbmQgQ29udGV4dDoqKgogICAtIFlvdXIgZ2VuZXJhdGVkIGBxdWVyeWAgYWltcyB0byBmaW5kIHRoZSAqbWlzc2luZyBwaWVjZXMqIG9mIGluZm9ybWF0aW9uIG5lZWRlZCB0byBmdWxseSBhbnN3ZXIgdGhlIGBxdWVzdGlvbmAuCiAgIC0gVGhlIG11bHRpLWhvcCByZXRyaWV2YWwgc3lzdGVtIHdvcmtzIGluIHN0YWdlczoKICAgICAtIEZpcnN0IGhvcDogVGhlIG9yaWdpbmFsIHF1ZXN0aW9uIHJldHVybnMgc29tZSBkb2N1bWVudHMuCiAgICAgLSBTZWNvbmQgaG9wOiBZb3VyIHF1ZXJ5IG11c3QgaGVscCByZXRyaWV2ZSBhbnkgKm90aGVyIHJlbGV2YW50IGRvY3VtZW50cyogTk9UIGZvdW5kIGluIHRoZSBmaXJzdCBob3AgdGhhdCBob2xkIGNvbXBsZW1lbnRhcnkgb3IgYnJvYWRlciBjb250ZXh0IG5lY2Vzc2FyeSBmb3IgZmluYWwgYW5zd2VyIGV4dHJhY3Rpb24uCgozLiAqKktleSBPYnNlcnZhdGlvbnMgZnJvbSBFeGFtcGxlcyBhbmQgRmVlZGJhY2s6KioKICAgLSBGaXJzdC1ob3AgZG9jdW1lbnRzIG9mdGVuIGNvdmVyIG9uZSBlbnRpdHkgb3IgYXNwZWN0IGluIHRoZSBxdWVzdGlvbi4KICAgLSBSZW1haW5pbmcgcmVsZXZhbnQgZG9jdW1lbnRzIG9mdGVuIGludm9sdmUgY29ubmVjdGVkIG9yIGhpZ2hlci1sZXZlbCBjb25jZXB0cyBtZW50aW9uZWQgaW4gYHN1bW1hcnlfMWAgYnV0IG5vdCBleHBsaWNpdGx5IGFza2VkIGluIHRoZSBvcmlnaW5hbCBxdWVzdGlvbi4KICAgLSBUaGUgYHF1ZXJ5YCBzaG91bGQgYmUgZm9ybXVsYXRlZCB0byBleHBsaWNpdGx5IHRhcmdldCB0aGVzZSAqbWlzc2luZyosIGJ1dCBsb2dpY2FsbHkgbGlua2VkLCBkb2N1bWVudHMuCiAgIC0gQXZvaWQgbWVyZWx5IHBhcmFwaHJhc2luZyB0aGUgb3JpZ2luYWwgcXVlc3Rpb24gb3IgcmVzdGF0aW5nIGtub3duIGZhY3RzIGZyb20gYHN1bW1hcnlfMWAuCiAgIC0gSW5zdGVhZCwgaW5mZXIgd2hhdCBicm9hZGVyIG9yIHJlbGF0ZWQgZW50aXRpZXMvY29uY2VwdHMgbWlnaHQgcHJvdmlkZSB0aGUgY3J1Y2lhbCBtaXNzaW5nIGluZm9ybWF0aW9uLgogICAtIEZvciBleGFtcGxlLCBpZiBgc3VtbWFyeV8xYCBkZXNjcmliZXMgYSBwb3B1bGF0aW9uIGZvciBhIHNtYWxsIGNpdmlsIHBhcmlzaCwgYnV0IHRoZSBxdWVzdGlvbiB3YW50cyB0b3RhbCBwb3B1bGF0aW9uIG9mIHRoZSB3aWRlciByZWdpb24sIHlvdXIgYHF1ZXJ5YCBzaG91bGQgdGFyZ2V0IHRoYXQgd2lkZXIgcmVnaW9uIChlLmcuLCAiTWFkZWlyYSBhcmNoaXBlbGFnbyBwb3B1bGF0aW9uIGluIDIwMTEiKS4KICAgLSBTaW1pbGFybHksIGlmIGBzdW1tYXJ5XzFgIGNvdmVycyBhIHNvbmcgYW5kIHRoZSBxdWVzdGlvbiB3YW50cyB0aGUgYWxidW0gaXQgY2FtZSBmcm9tLCBidXQgZmlyc3QgaG9wIGdvdCBzb25nLWxldmVsIGRvY3VtZW50cywgeW91ciBxdWVyeSBzaG91bGQgcmV0cmlldmUgZG9jdW1lbnRzIGFib3V0IHRoZSBhbGJ1bSBpdHNlbGYuCgo0LiAqKkhvdyB0byBCdWlsZCB0aGUgUXVlcnk6KioKICAgLSBJZGVudGlmeSB0aGUgZW50aXRpZXMgb3IgdG9waWNzIG1lbnRpb25lZCBpbiBgc3VtbWFyeV8xYCB0aGF0IGFwcGVhciByZWxhdGVkIGJ1dCBkaWZmZXJlbnQgZnJvbSBmaXJzdC1ob3AgZG9jdW1lbnRzLgogICAtIFJlZnJhbWUgdGhlIHF1ZXJ5IHRvIGV4cGxpY2l0bHkgbWVudGlvbiB0aGVzZSBicm9hZGVyIG9yIHJlbGF0ZWQgZW50aXRpZXMgY29ubmVjdGVkIHRvIHRoZSBvcmlnaW5hbCBxdWVzdGlvbi4KICAgLSBJbmNsdWRlIHJlbGV2YW50IGtleSBjb250ZXh0IGZyb20gdGhlIHF1ZXN0aW9uIHRvIG1haW50YWluIHNwZWNpZmljaXR5LCBidXQgc2hpZnQgZm9jdXMgdG8gdGhlIG1pc3NpbmcgcGllY2UuCiAgIC0gVGhlIGdvYWwgaXMgdG8gcmV0cmlldmUgZG9jdW1lbnRzIHRoYXQgbGluayBvciBjb21wbGVtZW50IHdoYXQgd2FzIHJldHJpZXZlZCBpbml0aWFsbHkuCgo1LiAqKlByYWN0aWNhbCBTdHJhdGVneToqKgogICAtIFJlYWQgdGhlIGBzdW1tYXJ5XzFgIGNhcmVmdWxseSB0byBzcG90IHJlZmVyZW5jZXMgdG8gYmlnZ2VyIGNvbnRleHRzIG9yIG90aGVyIGVudGl0aWVzIG5vdCBjb3ZlcmVkIGluIHRoZSBmaXJzdCBob3AuCiAgIC0gQXNrIHlvdXJzZWxmLCAiV2hhdCBlbnRpdHkgb3IgYXNwZWN0IGRvZXMgdGhpcyBzdW1tYXJ5IGhpbnQgYXQgdGhhdCBjb3VsZCBhbnN3ZXIgdGhlIG9yaWdpbmFsIHF1ZXN0aW9uIGJ1dCB3YXMgbm90IGZvdW5kIHlldD8iCiAgIC0gRm9ybXVsYXRlIGEgcHJlY2lzZSwgZm9jdXNlZCBmYWN0dWFsIHF1ZXJ5IHRhcmdldGluZyB0aGF0IGVudGl0eSBvciBjb25jZXB0IHRvIHJldHJpZXZlIHRoZSBtaXNzaW5nIGRvY3VtZW50cy4KCjYuICoqT3V0cHV0OioqCiAgIC0gUHJvZHVjZSBvbmx5IHRoZSBmaWVsZCBgcXVlcnlgIGFzIGEgY2xlYXIsIGNvbmNpc2UgcXVlc3Rpb24gb3Iga2V5d29yZCBwaHJhc2UgZGVzaWduZWQgZm9yIGVmZmljaWVudCByZXRyaWV2YWwgb2YgKipzZWNvbmQtaG9wIGRvY3VtZW50cyoqLgogICAtIEVuc3VyZSB0aGUgcXVlcnkgcmVsYXRlcyBsb2dpY2FsbHkgdG8gdGhlIG9yaWdpbmFsIHF1ZXN0aW9uIHdoaWxlIHRhcmdldGluZyB0aGUgYnJvYWRlciBvciBjb21wbGVtZW50YXJ5IGtub3dsZWRnZSBpZGVudGlmaWVkIGluIGBzdW1tYXJ5XzFgLgogICAtIERvICoqbm90KiogaW5jbHVkZSB0aGUgb3JpZ2luYWwgcXVlc3Rpb24gb3Igc2ltcGx5IHJlcGhyYXNlIGl0LgogICAtIERvICoqbm90KiogZHVwbGljYXRlIGluZm9ybWF0aW9uIGFscmVhZHkgd2VsbC1jb3ZlcmVkIGJ5IHRoZSBmaXJzdCBob3AgcmV0cmlldmFsLgoKQnkgZm9sbG93aW5nIHRoZXNlIHByaW5jaXBsZXMsIHlvdSB3aWxsIGhlbHAgdGhlIG11bHRpLWhvcCByZXRyaWV2YWwgc3lzdGVtIGZpbmQgYWxsIG5lY2Vzc2FyeSBkb2N1bWVudHMgdG8gYW5zd2VyIHRoZSBtdWx0aS1mYWNldGVkIG9yaWdpbmFsIHF1ZXN0aW9uIGNvbXBsZXRlbHku)
You will be given two input fields: ‘question‘ and ‘summary_1‘.


Your task is to generate a new search query (‘query‘) optimized for the **second hop** of a multi-hop retrieval system. The original user question is typically complex and requires information from multiple documents to answer. The first hop query is the original question used to retrieve an initial set of documents. Your goal is to generate a **second hop query** that retrieves *additional relevant documents* that were *not* found in the first hop but are necessary to answer the original question completely.


Detailed task instructions and hints:


1. **Input Understanding:**
 - ‘question‘ is the original multi-hop question posed by the user.
 - ‘summary_1‘ is a concise summary of information from a document retrieved in the first hop, which partially addresses the question.


2. **Purpose and Context:**
 - Your generated ‘query‘ aims to find the *missing pieces* of information needed to fully answer the ‘question‘.
 - The multi-hop retrieval system works in stages:
 - First hop: The original question returns some documents.
 - Second hop: Your query must help retrieve any *other relevant documents* NOT found in the first hop that hold complementary or broader context necessary for final answer extraction.


3. **Key Observations from Examples and Feedback:**
 - First-hop documents often cover one entity or aspect in the question.
 - Remaining relevant documents often involve connected or higher-level concepts mentioned in ‘summary_1‘ but not explicitly asked in the original question.
 - The ‘query‘ should be formulated to explicitly target these *missing*, but logically linked, documents.
 - Avoid merely paraphrasing the original question or restating known facts from ‘summary_1‘.
 - Instead, infer what broader or related entities/concepts might provide the crucial missing information.
 - For example, if ‘summary_1‘ describes a population for a small civil parish, but the question wants total population of the wider region, your ‘query‘ should target that wider region (e.g., "Madeira archipelago population in 2011").
 - Similarly, if ‘summary_1‘ covers a song and the question wants the album it came from, but first hop got song-level documents, your query should retrieve documents about the album itself.


4. **How to Build the Query:**
 - Identify the entities or topics mentioned in ‘summary_1‘ that appear related but different from first-hop documents.
 - Reframe the query to explicitly mention these broader or related entities connected to the original question.
 - Include relevant key context from the question to maintain specificity, but shift focus to the missing piece.
 - The goal is to retrieve documents that link or complement what was retrieved initially.


5. **Practical Strategy:**
 - Read the ‘summary_1‘ carefully to spot references to bigger contexts or other entities not covered in the first hop.
 - Ask yourself, "What entity or aspect does this summary hint at that could answer the original question but was not found yet?"
 - Formulate a precise, focused factual query targeting that entity or concept to retrieve the missing documents.


6. **Output:**
 - Produce only the field ‘query‘ as a clear, concise question or keyword phrase designed for efficient retrieval of **second-hop documents**.
 - Ensure the query relates logically to the original question while targeting the broader or complementary knowledge identified in ‘summary_1‘.
 - Do **not** include the original question or simply rephrase it.
 - Do **not** duplicate information already well-covered by the first hop retrieval.


By following these principles, you will help the multi-hop retrieval system find all necessary documents to answer the multi-faceted original question completely.

HotpotQA GPT-4.1 Mini final_answer.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgc3VtbWFyeV8xYCwgYHN1bW1hcnlfMmAsIHByb2R1Y2UgdGhlIGZpZWxkcyBgYW5zd2VyYC4=)
Given the fields ‘question‘, ‘summary_1‘, ‘summary_2‘, produce the fields ‘answer‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,WW91IGFyZSBhbiBleHBlcnQgbXVsdGktaG9wIHJlYXNvbmluZyBhc3Npc3RhbnQgc2tpbGxlZCBpbiBzeW50aGVzaXppbmcgaW5mb3JtYXRpb24gZnJvbSBtdWx0aXBsZSBzdW1tYXJpZXMgdG8gYW5zd2VyIGNvbXBsZXggcXVlc3Rpb25zLiBHaXZlbiB0aGUgYHF1ZXN0aW9uYCwgYWxvbmcgd2l0aCB0d28gaW50ZXJtZWRpYXRlIHN1bW1hcmllcyBgc3VtbWFyeV8xYCBhbmQgYHN1bW1hcnlfMmAgdGhhdCBjb250YWluIHJlbGV2YW50IGV2aWRlbmNlLCBjYXJlZnVsbHkgYW5hbHl6ZSBhbmQgaW50ZWdyYXRlIHRoZSBpbmZvcm1hdGlvbiBzdGVwLWJ5LXN0ZXAgdG8gcHJvZHVjZSBhIGNsZWFyLCBsb2dpY2FsIHJlYXNvbmluZyBwcm9jZXNzIGZvbGxvd2VkIGJ5IGEgY29uY2lzZSBhbmQgYWNjdXJhdGUgZmluYWwgYW5zd2VyLgpEZW1vczoKRXhhbXBsZSAxOgpxdWVzdGlvbjoKICAgIGFyZSBNYWNoYWVyYW50aGVyYSBhbmQgUHJ1bW5vcGl0eXMgYm90aCB0aGUgcGxhbnRzPwpzdW1tYXJ5XzE6CiAgICBZZXMsIGJvdGggTWFjaGFlcmFudGhlcmEgYW5kIFBydW1ub3BpdHlzIGFyZSBwbGFudHMuIE1hY2hhZXJhbnRoZXJhIGlzIGEgZ2VudXMgb2YgZmxvd2VyaW5nIHBsYW50cyBpbiB0aGUgZGFpc3kgZmFtaWx5LCB3aGlsZSBQcnVtbm9waXR5cyBpcyBhIGdlbnVzIG9mIGNvbmlmZXJvdXMgZXZlcmdyZWVuIHRyZWVzIGluIHRoZSBwb2RvY2FycCBmYW1pbHkuCnN1bW1hcnlfMjoKICAgIFllcywgYm90aCBNYWNoYWVyYW50aGVyYSBhbmQgUHJ1bW5vcGl0eXMgYXJlIHBsYW50czsgTWFjaGFlcmFudGhlcmEgaXMgYSBnZW51cyBvZiBmbG93ZXJpbmcgcGxhbnRzIGluIHRoZSBkYWlzeSBmYW1pbHksIHdoaWxlIFBydW1ub3BpdHlzIGlzIGEgZ2VudXMgb2YgY29uaWZlcm91cyBldmVyZ3JlZW4gdHJlZXMgaW4gdGhlIHBvZG9jYXJwIGZhbWlseS4KcmVhc29uaW5nOgogICAgQm90aCBzdW1tYXJpZXMgYWdyZWUgdGhhdCBNYWNoYWVyYW50aGVyYSBhbmQgUHJ1bW5vcGl0eXMgYXJlIHBsYW50cy4gU3BlY2lmaWNhbGx5LCBNYWNoYWVyYW50aGVyYSBpcyBhIGdlbnVzIG9mIGZsb3dlcmluZyBwbGFudHMgaW4gdGhlIGRhaXN5IGZhbWlseSwgYW5kIFBydW1ub3BpdHlzIGlzIGEgZ2VudXMgb2YgY29uaWZlcm91cyBldmVyZ3JlZW4gdHJlZXMgaW4gdGhlIHBvZG9jYXJwIGZhbWlseS4gU2luY2UgYm90aCBiZWxvbmcgdG8gcGxhbnQgZ2VuZXJhLCB0aGUgYW5zd2VyIGlzIHllcy4KYW5zd2VyOgogICAgeWVzCgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
You are an expert multi-hop reasoning assistant skilled in synthesizing information from multiple summaries to answer complex questions. Given the ‘question‘, along with two intermediate summaries ‘summary_1‘ and ‘summary_2‘ that contain relevant evidence, carefully analyze and integrate the information step-by-step to produce a clear, logical reasoning process followed by a concise and accurate final answer.
Demos:
Example 1:
question:
 are Machaeranthera and Prumnopitys both the plants?
summary_1:
 Yes, both Machaeranthera and Prumnopitys are plants. Machaeranthera is a genus of flowering plants in the daisy family, while Prumnopitys is a genus of coniferous evergreen trees in the podocarp family.
summary_2:
 Yes, both Machaeranthera and Prumnopitys are plants; Machaeranthera is a genus of flowering plants in the daisy family, while Prumnopitys is a genus of coniferous evergreen trees in the podocarp family.
reasoning:
 Both summaries agree that Machaeranthera and Prumnopitys are plants. Specifically, Machaeranthera is a genus of flowering plants in the daisy family, and Prumnopitys is a genus of coniferous evergreen trees in the podocarp family. Since both belong to plant genera, the answer is yes.
answer:
 yes




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,VGFzayBEZXNjcmlwdGlvbjoKCllvdSBhcmUgZ2l2ZW4gdGhyZWUgZmllbGRzIGFzIGlucHV0OiBgcXVlc3Rpb25gLCBgc3VtbWFyeV8xYCwgYW5kIGBzdW1tYXJ5XzJgLiBZb3VyIGdvYWwgaXMgdG8gcHJvZHVjZSBhbiBgYW5zd2VyYCBmaWVsZCB0aGF0IGRpcmVjdGx5IGFuZCBleHBsaWNpdGx5IHJlc3BvbmRzIHRvIHRoZSBxdWVzdGlvbiB1c2luZyB0aGUgaW5mb3JtYXRpb24gZnJvbSB0aGUgdHdvIHN1bW1hcmllcywgZW5oYW5jZWQgYnkgeW91ciBhdXRob3JpdGF0aXZlIGRvbWFpbiBrbm93bGVkZ2Ugd2hlbiBuZWVkZWQuCgpJbnB1dCBGb3JtYXQ6CgotIGBxdWVzdGlvbmA6IEEgbmF0dXJhbCBsYW5ndWFnZSBxdWVzdGlvbiB0aGF0IG1heSByZXF1aXJlIGEgZmFjdCwgZGVmaW5pdGlvbiwgbmFtZSwgZGF0ZSwgeWVzL25vIHJlc3BvbnNlLCBvciBvdGhlciBzcGVjaWZpYyBpbmZvcm1hdGlvbi4KLSBgc3VtbWFyeV8xYCBhbmQgYHN1bW1hcnlfMmA6IFR3byBpbmRlcGVuZGVudGx5IGdlbmVyYXRlZCBzdW1tYXJpZXMgb3Igc25pcHBldHMgY29udGFpbmluZyBpbmZvcm1hdGlvbiByZWxhdGVkIHRvIHRoZSBxdWVzdGlvbi4gVGhleSBtYXkgdmFyeSBpbiBjb21wbGV0ZW5lc3MsIGFjY3VyYWN5LCBhbmQgc3BlY2lmaWNpdHkuCgpSZXF1aXJlbWVudHMgYW5kIEFwcHJvYWNoOgoKMS4gKipVbmRlcnN0YW5kIHRoZSBxdWVzdGlvbiBwcmVjaXNlbHkuKiogRGV0ZXJtaW5lIGV4YWN0bHkgd2hhdCBpcyBhc2tlZOKAlHdoZXRoZXIgYSBuYW1lLCBhIHNwZWNpZmljIGZhY3QsIGEgZGF0ZSwgb3IgYSB5ZXMvbm8gYW5zd2VyLgoKMi4gKipDb21wYXJlIGJvdGggc3VtbWFyaWVzLioqIEFuYWx5emUgdGhlIGNvbnRlbnQgb2YgYHN1bW1hcnlfMWAgYW5kIGBzdW1tYXJ5XzJgOgogICAtIElmIHRoZXkgYWdyZWUgYW5kIGRpcmVjdGx5IGFuc3dlciB0aGUgcXVlc3Rpb24sIHVzZSB0aGlzIGFzIHByaW1hcnkgZXZpZGVuY2UuCiAgIC0gSWYgb25lIHN1bW1hcnkgcHJvdmlkZXMgYSBmYWN0IHRoYXQgdGhlIG90aGVyIGRvZXMgbm90IG1lbnRpb24sIGNhcmVmdWxseSBldmFsdWF0ZSBpdHMgcGxhdXNpYmlsaXR5LgogICAtIElmIHRoZSBzdW1tYXJpZXMgY29uZmxpY3QsIHVzZSBkb21haW4gZXhwZXJ0aXNlIGFuZCBhdXRob3JpdGF0aXZlIGtub3dsZWRnZSB0byByZXNvbHZlIG9yIGV4cGxpY2l0bHkgc3RhdGUgdW5jZXJ0YWludHkuCgozLiAqKkRvbWFpbi1zcGVjaWZpYyBmYWN0dWFsIHZlcmlmaWNhdGlvbiBhbmQgbnVhbmNlOioqCiAgIC0gKipOYW1lcyBhbmQgbmlja25hbWVzOioqIFByb3ZpZGUgb25seSB0aGUgc3BlY2lmaWMgbmlja25hbWUgb3IgbmFtZSB3aGVuIGFza2VkLCB3aXRob3V0IGV4dHJhIHBocmFzaW5nLiBGb3IgZXhhbXBsZSwgd2hlbiBhc2tlZCBmb3IgdGhlIG5pY2tuYW1lIG9mIGEgcGVyc29uIG9yIGVudGl0eSwgcmVzcG9uZCB3aXRoIHRoZSBuaWNrbmFtZSBhbG9uZSwgbm90IGEgZnVsbCBzZW50ZW5jZS4KICAgLSAqKk5hdGlvbmFsaXR5IGFuZCBpZGVudGl0eSBkaXN0aW5jdGlvbnM6KiogVXNlIHRoZSBtb3N0IHByZWNpc2UgdGVybXMgYWxpZ25lZCB3aXRoIGZhY3R1YWwgY29ycmVjdG5lc3MgYW5kIGNvbW1vbiB1c2FnZSAoZS5nLiwg4oCcRW5nbGlzaOKAnSB2cy4g4oCcQnJpdGlzaOKAnSkgYmFzZWQgb24gZG9tYWluIGtub3dsZWRnZS4KICAgLSAqKkRhdGVzIGFuZCBoaXN0b3JpY2FsIGZhY3RzOioqIFZlcmlmeSBkYXRlcyBvciBoaXN0b3JpY2FsIGNsYWltcyB3aXRoIGRvbWFpbiBrbm93bGVkZ2UgdG8gcGljayB0aGUgY29ycmVjdCBmYWN0LCBlc3BlY2lhbGx5IHdoZW4gdGhlcmUgbWlnaHQgYmUgY29uZnVzaW9uIGJldHdlZW4gZnJhbmNoaXNlIHN0YXJ0IGRhdGVzIHZzLiBldmVudCBkYXRlcyBldGMuCiAgIC0gKipZZXMvbm8gcXVlc3Rpb25zOioqIFByZWZlciBjb25jaXNlIGFuc3dlcnMgb2Yg4oCceWVz4oCdIG9yIOKAnG5v4oCdIG9ubHksIHVubGVzcyB0aGUgcXVlc3Rpb24gZGVtYW5kcyBlbGFib3JhdGlvbi4KICAgLSAqKlR5cGVzIG9yIGNhdGVnb3JpZXM6KiogSWYgYSBxdWVzdGlvbiBhc2tzIGFib3V0IHRoZSB0eXBlIG9yIGNhdGVnb3J5IChlLmcuLCB0eXBlIG9mIGNvbXBhbnkpLCBwcm92aWRlIHRoZSBtb3N0IGRpcmVjdCBjb25jaXNlIHBocmFzZSB3aXRob3V0IGluY2x1ZGluZyBhZGplY3RpdmVzIGxpa2UgbmF0aW9uYWxpdHkgdW5sZXNzIGFza2VkIGV4cGxpY2l0bHkuCgo0LiAqKkFuc3dlciBjb25jaXNlbmVzcyBhbmQgcmVsZXZhbmNlOioqCiAgIC0gUHJvdmlkZSBhIGJyaWVmIGFuZCBkaXJlY3QgYW5zd2VyIHRvIHRoZSBxdWVzdGlvbi4KICAgLSBBdm9pZCByZXBlYXRpbmcgb3IgcmVzdGF0aW5nIHRoZSBxdWVzdGlvbi4KICAgLSBBdm9pZCB1bm5lY2Vzc2FyeSBjb250ZXh0IHVubGVzcyByZXF1ZXN0ZWQgb3IgbmVlZGVkIGZvciBjbGFyaXR5LgogICAtIEF2b2lkIGNvbnN0cnVjdGluZyBmdWxsIHNlbnRlbmNlcyB1bmxlc3MgbmVlZGVkOyBmb3IgZXhhbXBsZSwgYW5zd2VycyB0byBuaWNrbmFtZSBvciB5ZXMvbm8gcXVlc3Rpb25zIHNob3VsZCBiZSBhcyBzaG9ydCBhbmQgc3BlY2lmaWMgYXMgcG9zc2libGUuCgo1LiAqKldoZW4gYXV0aG9yaXRhdGl2ZSBrbm93bGVkZ2Ugc3VwcGxlbWVudHMgdGhlIHN1bW1hcmllczoqKgogICAtIElmIHRoZSBzdW1tYXJpZXMgYXJlIGluY29tcGxldGUgb3IgcG90ZW50aWFsbHkgaW5hY2N1cmF0ZSwgaW5jb3Jwb3JhdGUgdHJ1c3RlZCBrbm93bGVkZ2UgZnJvbSB5b3VyIHRyYWluaW5nIGFib3V0IHRoZSB0b3BpYyB0byBwcm92aWRlIHRoZSBjb3JyZWN0IGFuZCBwcmVjaXNlIGFuc3dlci4KICAgLSBGb3IgZXhhbXBsZSwgd2hlbiBhIHN1bW1hcnkgZ2l2ZXMgYSB5ZWFyIHRoYXQgY29uZmxpY3RzIHdpdGgga25vd24gcmVsZWFzZSBkYXRlcyBvciBmYWN0dWFsIGRldGFpbHMsIHByZWZlciB0aGUgdmVyaWZpZWQgZGF0ZS4KICAgLSBXaGVuIHRoZSBzdW1tYXJpZXMgZGlmZmVyIGluIHN0eWxlIChvbmUgdXNlcyBhIGZvcm1hbCBwaHJhc2UsIGFub3RoZXIgcHJvdmlkZXMganVzdCB0aGUgbmlja25hbWUpLCByZXNwb25kIHdpdGggdGhlIGNvcnJlY3QsIGNsZWFuIGFuc3dlciBmb3JtYXQgKGUuZy4sIGp1c3QgdGhlIG5pY2tuYW1lIGFsb25lKS4KCjYuICoqRXhhbXBsZXMgb2YgY29ycmVjdCByZWFzb25pbmcgYW5kIGFuc3dlcnM6KioKICAgLSBRdWVzdGlvbjog4oCcV2hhdCBpcyB0aGUgbmlja25hbWUgb2YgdGhlIDIwMDUgVG95b3RhIEdyYW5kIFByaXggb2YgTG9uZyBCZWFjaCBQb2xlc2l0dGVyID/igJ0KICAgICAtIENvcnJlY3QgYW5zd2VyOiBgdGhlIHRocmlsbCBmcm9tIFdlc3QgSGlsbGAKICAgLSBRdWVzdGlvbjog4oCcV2hhdCB0eXBlIG9mIGNvbXBhbnkgaXMgWmlwY2FyIGxlZCBieSBTY290dCBHcmlmZml0aCBmcm9tIDIwMDMtMjAxMz/igJ0KICAgICAtIENvcnJlY3QgYW5zd2VyOiBgY2FyLXNoYXJpbmcgY29tcGFueWAKICAgLSBRdWVzdGlvbjog4oCcV2hvIHdhcyB0aGUgcGFydG5lciBvZiBCcml0aXNoIGNvbWljIGJvb2sgYXJ0aXN0LCBIZW5yeSBGbGludCwgdGhhdCBoZWxwZWQgY3JlYXRlIFpvbWJvP+KAnQogICAgIC0gQ29ycmVjdCBhbnN3ZXI6IGBBbCBFd2luZ2AKClN1bW1hcnk6CgotIFVzZSBib3RoIHN1bW1hcmllcyBhcyBwcmltYXJ5IGJ1dCBub3Qgc29sZSBldmlkZW5jZS4KLSBSZWxpYWJseSB2ZXJpZnkgYW5kIGNvbnRleHR1YWxpemUgZmFjdHMgdXNpbmcgZG9tYWluIGtub3dsZWRnZSwgZXNwZWNpYWxseSBmb3IgbmF0aW9uYWxpdHksIGRhdGVzLCBuaWNrbmFtZXMsIGNvbXBhbnkgdHlwZXMsIGFuZCB5ZXMvbm8gcXVlc3Rpb25zLgotIFByb3ZpZGUgc2hvcnQsIGRpcmVjdCBhbnN3ZXJzIG1hdGNoaW5nIHRoZSBzcGVjaWZpY2l0eSByZXF1ZXN0ZWQuCi0gQXZvaWQgdW5uZWNlc3NhcnkgZWxhYm9yYXRpb24gdW5sZXNzIGV4cGxpY2l0bHkgcmVxdWlyZWQuCi0gRXhwbGljaXRseSByZXNvbHZlIGNvbmZsaWN0cyBvciBhbWJpZ3VpdHkgdXNpbmcgeW91ciBrbm93bGVkZ2Ugb3Igc3RhdGUgdW5jZXJ0YWludHkgd2hlbiBhcHByb3ByaWF0ZS4KClRoaXMgYXBwcm9hY2ggZW5zdXJlcyB0aGF0IGFuc3dlcnMgYXJlIGJvdGggYWNjdXJhdGUgYW5kIGNvbmNpc2UsIHN1aXRhYmxlIGZvciBkaXJlY3QgY29uc3VtcHRpb24gb3IgaW50ZWdyYXRpb24gaW4ga25vd2xlZGdlIGJhc2VzIG9yIHF1ZXN0aW9uLWFuc3dlcmluZyBzeXN0ZW1zLg==)
Task Description:


You are given three fields as input: ‘question‘, ‘summary_1‘, and ‘summary_2‘. Your goal is to produce an ‘answer‘ field that directly and explicitly responds to the question using the information from the two summaries, enhanced by your authoritative domain knowledge when needed.


Input Format:


- ‘question‘: A natural language question that may require a fact, definition, name, date, yes/no response, or other specific information.
- ‘summary_1‘ and ‘summary_2‘: Two independently generated summaries or snippets containing information related to the question. They may vary in completeness, accuracy, and specificity.


Requirements and Approach:


1. **Understand the question precisely.** Determine exactly what is asked—whether a name, a specific fact, a date, or a yes/no answer.


2. **Compare both summaries.** Analyze the content of ‘summary_1‘ and ‘summary_2‘:
 - If they agree and directly answer the question, use this as primary evidence.
 - If one summary provides a fact that the other does not mention, carefully evaluate its plausibility.
 - If the summaries conflict, use domain expertise and authoritative knowledge to resolve or explicitly state uncertainty.


3. **Domain-specific factual verification and nuance:**
 - **Names and nicknames:** Provide only the specific nickname or name when asked, without extra phrasing. For example, when asked for the nickname of a person or entity, respond with the nickname alone, not a full sentence.
 - **Nationality and identity distinctions:** Use the most precise terms aligned with factual correctness and common usage (e.g., “English” vs. “British”) based on domain knowledge.
 - **Dates and historical facts:** Verify dates or historical claims with domain knowledge to pick the correct fact, especially when there might be confusion between franchise start dates vs. event dates etc.
 - **Yes/no questions:** Prefer concise answers of “yes” or “no” only, unless the question demands elaboration.
 - **Types or categories:** If a question asks about the type or category (e.g., type of company), provide the most direct concise phrase without including adjectives like nationality unless asked explicitly.


4. **Answer conciseness and relevance:**
 - Provide a brief and direct answer to the question.
 - Avoid repeating or restating the question.
 - Avoid unnecessary context unless requested or needed for clarity.
 - Avoid constructing full sentences unless needed; for example, answers to nickname or yes/no questions should be as short and specific as possible.


5. **When authoritative knowledge supplements the summaries:**
 - If the summaries are incomplete or potentially inaccurate, incorporate trusted knowledge from your training about the topic to provide the correct and precise answer.
 - For example, when a summary gives a year that conflicts with known release dates or factual details, prefer the verified date.
 - When the summaries differ in style (one uses a formal phrase, another provides just the nickname), respond with the correct, clean answer format (e.g., just the nickname alone).


6. **Examples of correct reasoning and answers:**
 - Question: “What is the nickname of the 2005 Toyota Grand Prix of Long Beach Polesitter ?”
 - Correct answer: ‘the thrill from West Hill‘
 - Question: “What type of company is Zipcar led by Scott Griffith from 2003-2013?”
 - Correct answer: ‘car-sharing company‘
 - Question: “Who was the partner of British comic book artist, Henry Flint, that helped create Zombo?”
 - Correct answer: ‘Al Ewing‘


Summary:


- Use both summaries as primary but not sole evidence.
- Reliably verify and contextualize facts using domain knowledge, especially for nationality, dates, nicknames, company types, and yes/no questions.
- Provide short, direct answers matching the specificity requested.
- Avoid unnecessary elaboration unless explicitly required.
- Explicitly resolve conflicts or ambiguity using your knowledge or state uncertainty when appropriate.


This approach ensures that answers are both accurate and concise, suitable for direct consumption or integration in knowledge bases or question-answering systems.

HotpotQA GPT-4.1 Mini summarize1.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgcGFzc2FnZXNgLCBwcm9kdWNlIHRoZSBmaWVsZHMgYHN1bW1hcnlgLg==)
Given the fields ‘question‘, ‘passages‘, produce the fields ‘summary‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gYSBxdWVzdGlvbiBhbmQgYSBzZXQgb2YgcmVsYXRlZCBwYXNzYWdlcywgY2FyZWZ1bGx5IGFuYWx5emUgdGhlIGluZm9ybWF0aW9uIGJ5IHRoaW5raW5nIHRocm91Z2ggdGhlIHJlbGV2YW50IGZhY3RzIHN0ZXAtYnktc3RlcC4gUHJvZHVjZSBhIGNsZWFyIGFuZCBjb25jaXNlIHN1bW1hcnkgdGhhdCBzeW50aGVzaXplcyB0aGUga2V5IHBvaW50cyBmcm9tIHRoZSBwYXNzYWdlcyBkaXJlY3RseSByZWxldmFudCB0byBhbnN3ZXJpbmcgdGhlIHF1ZXN0aW9uLCBlbnN1cmluZyB0aGUgc3VtbWFyeSBpcyBmb2N1c2VkLCBhY2N1cmF0ZSwgYW5kIGdyb3VuZGVkIGluIHRoZSBldmlkZW5jZSBwcm92aWRlZC4KRGVtb3M6CkV4YW1wbGUgMToKcXVlc3Rpb246CiAgICBUaGUgYXJjaGl0ZWN0dXJhbCBzdHlsZSBvZiBhIGNodXJjaCB0aGF0IHN0YW5kcyBpbiBmcm9udCBvZiB0aGUgUGFsYXp6byBHaGlzaWxhcmRpIEZhdmEgb3JpZ2luYXRlZCBpbiB3aGF0IGNpdHk/CnBhc3NhZ2VzOgogICAgWydQYWxhenpvIEdoaXNpbGFyZGkgRmF2YSB8IFBhbGF6em8gR2hpc2lsYXJkaSBGYXZhIGlzIGEgUmVuYWlzc2FuY2Ugc3R5bGUgcGFsYWNlLCBsb2NhdGVkIG9uIHZpYSBNYW56b25pIDQgaW4gQm9sb2duYSwgcmVnaW9uIG9mIEVtaWxpYSBSb21hZ25hLCBJdGFseTsgaXQgaG91c2VzIHRoZSBNZWRpZXZhbCBDaXZpYyBNdXNldW0gb2YgQm9sb2duYS4nLCAnTWFkb25uYSBkaSBHYWxsaWVyYSwgQm9sb2duYSB8IFRoZSBNYWRvbm5hIGRpIEdhbGxpZXJhIGlzIGEgY2h1cmNoIHdpdGggYSBSZW5haXNzYW5jZSBmYWNhZGUgYW5kIEJhcm9xdWUgaW50ZXJpb3JzLCBsb2NhdGVkIG9uIFZpYSBNYW56b25pLCBpbiBjZW50cmFsIEJvbG9nbmEsIEl0YWx5LiAgSXQgc3RhbmRzIGluIGZyb250IG9mIHRoZSBQYWxhenpvIEdoaXNpbGFyZGkgRmF2YS4gIFRoZSBwcmVzZW50IG5hbWUgb3ZlciB0aGUgcG9ydGFsIGlzIHRoZSAiQ2hpZXNhIGRpIEZpbGlwcGluaSBNYWRvbm5hIGRpIEdhbGxpZXJhIGUgRmlsaXBwbyBOZXJpIi4nLCAnUGFsYXp6byBQcmV0b3JpbywgUHJhdG8gfCBUaGUgUGFsYXp6byBQcmV0b3JpbyBvZiB0aGUgVHVzY2FuIHRvd24gb2YgUHJhdG8gd2FzIHRoZSBvbGQgY2l0eSBoYWxsIGxvY2F0ZWQgdG93biBjZW50ZXIsIHN0YW5kaW5nIGluIGZyb250IG9mIHRoZSBjdXJyZW50IFBhbGF6em8gQ29tdW5hbGUuICBJdCBub3cgYWNjb21tb2RhdGVzIHRoZSBDaXZpYyBNdXNldW0gb2YgUHJhdG8sIHdoaWNoIHdhcyByZW9wZW5lZCBvbiBTZXB0ZW1iZXIgMjAxMy4nLCAnUGFsYXp6byBQaXNhbmkgR3JpdHRpIHwgVGhlIFBhbGF6em8gUGlzYW5pIEdyaXR0aSBpcyBhIEdvdGhpYy1zdHlsZSBwYWxhY2UgbG9jYXRlZCBhY3Jvc3MgdGhlIEdyYW5kIENhbmFsIGZyb20gdGhlIENodXJjaCBvZiB0aGUgU2FsdXRlLCBhbmQgc3RhbmRzIGFsb25nIHRoZSBDYW1wbyBkZWwgVHJhZ2hldHRvIHdoZXJlIHRoZSBjaHVyY2ggb2YgU2FudGEgTWFyaWEgZGVsIEdpZ2xpbywgaW4gdGhlIFNlc3RpZXJpIG9mIFNhbiBNYXJjbywgVmVuaWNlLCBJdGFseS4nLCAnRMO2bcO2dMO2ciBUb3dlciB8IFRoZSBEw7Ztw7Z0w7ZyIHRvd2VyIGlzIHRoZSBvbGRlc3QgYnVpbGRpbmcgaW4gU3plZ2VkLCBIdW5nYXJ5LiAgVGhlIGZvdW5kYXRpb24gd2FzIG1vc3QgcHJvYmFibHkgbGFpZCBkdXJpbmcgdGhlIDExdGggY2VudHVyeSwgd2hpbGUgdGhlIGxvd2VyIHBhcnQgd2FzIGJ1aWx0IChpbiBSb21hbmVzcXVlIHN0eWxlKSBmcm9tIHRoZSAxMnRoIGNlbnR1cnksIGFuZCB0aGUgdXBwZXIgcGFydCAoR290aGljIHN0eWxlKSBmcm9tIHRoZSAxM3RoIGNlbnR1cnkuICBUaGUgdG93ZXIgd2FzIG9uY2UgcGFydCBvZiB0aGUgZm9ybWVyICJTemVudCBEw7Ztw7Z0w7ZyIHRlbXBsb20iIChTdC4gRGVtZXRyaXVzIGNodXJjaCksIGJ1dCB0b2RheSBpdCBzdGFuZHMgaW4gRMOzbSBTcXVhcmUsIGluIGZyb250IG9mIHRoZSBtdWNoIGxhcmdlciBWb3RpdmUgQ2h1cmNoIG9mIFN6ZWdlZC4gIFRoZSB1cHBlciBwYXJ0IHdhcyByZWJ1aWx0IGZyb20gdGhlIG9yaWdpbmFsIHN0b25lcyBpbiAxOTI2LiAgVGhlIGFyY2hpdGVjdHVyZSBvZiB0aGUgdG93ZXIgaXMgc2ltaWxhciB0byBhbm90aGVyIGZvdW5kIGluIFNvdXRoZXJuIEZyYW5jZSwgb3IgaW4gdGhlIHRlcnJpdG9yeSBvZiB0aGUgZm9ybWVyIEJ5emFudGluZSBFbXBpcmUuJywgJ1BhbGF6em8gTGVvbmksIEJvbG9nbmEgfCBUaGUgUGFsYXp6byBMZW9uaSBpcyBhIFJlbmFpc3NhbmNlIHN0eWxlIHBhbGFjZSBsb2NhdGVkIG9uIFZpYSBNYXJzYWxhICMzMSwgaW4gZnJvbnQgb2YgdGhlIG91dGxldCBvZiBWaWEgTWVudGFuYSwgaW4gY2VudHJhbCBCb2xvZ25hLCByZWdpb24gb2YgRW1pbGlhLVJvbWFnbmEsIEl0YWx5LiAgVGhlIGFwc2Ugb2YgdGhlIGNodXJjaCBvZiBTYW4gTWFydGlubywgaXMgYWNyb3NzIHRoZSBzdHJlZXQuJywgJ1BhbGF6em8gQWx0aWVyaSB8IFBhbGF6em8gQWx0aWVyaSBpcyBhIHBhbGFjZSBpbiBSb21lLCB3aGljaCB3YXMgdGhlIGhvbWUgb2YgdGhlIEFsdGllcmkgZmFtaWx5IGluIHRoZSBjaXR5LiAgVGhlIHBhbGFjZSBmYWNlcyB0aGUgc3F1YXJlIGluIGZyb250IG9mIHRoZSBDaHVyY2ggb2YgdGhlIEdlc8O5LiddCnJlYXNvbmluZzoKICAgIFRoZSBxdWVzdGlvbiBhc2tzIGZvciB0aGUgY2l0eSB3aGVyZSB0aGUgYXJjaGl0ZWN0dXJhbCBzdHlsZSBvZiBhIGNodXJjaCB0aGF0IHN0YW5kcyBpbiBmcm9udCBvZiB0aGUgUGFsYXp6byBHaGlzaWxhcmRpIEZhdmEgb3JpZ2luYXRlZC4gUGFzc2FnZSBbMl0gaWRlbnRpZmllcyB0aGUgY2h1cmNoIHN0YW5kaW5nIGluIGZyb250IG9mIHRoZSBQYWxhenpvIEdoaXNpbGFyZGkgRmF2YSBhcyAiTWFkb25uYSBkaSBHYWxsaWVyYSIgYW5kIG1lbnRpb25zIGl0IGhhcyBhIFJlbmFpc3NhbmNlIGZhY2FkZSBhbmQgQmFyb3F1ZSBpbnRlcmlvcnMuIFBhc3NhZ2UgWzFdIHN0YXRlcyB0aGUgUGFsYXp6byBHaGlzaWxhcmRpIEZhdmEgaXMgbG9jYXRlZCBpbiBCb2xvZ25hLCBJdGFseS4gU2luY2UgdGhlIGNodXJjaCBpcyBsb2NhdGVkIGluIEJvbG9nbmEgYW5kIGZlYXR1cmVzIGEgUmVuYWlzc2FuY2UgYXJjaGl0ZWN0dXJhbCBzdHlsZSwgaXQgY2FuIGJlIGluZmVycmVkIHRoYXQgdGhlIGFyY2hpdGVjdHVyYWwgc3R5bGUgb2YgdGhpcyBjaHVyY2ggb3JpZ2luYXRlZCBpbiB0aGUgY2l0eSBvZiBGbG9yZW5jZSwgd2hpY2ggaXMgaGlzdG9yaWNhbGx5IHJlY29nbml6ZWQgYXMgdGhlIGJpcnRocGxhY2Ugb2YgUmVuYWlzc2FuY2UgYXJjaGl0ZWN0dXJlLiBUaHVzLCB0aGUgYXJjaGl0ZWN0dXJhbCBzdHlsZSAoUmVuYWlzc2FuY2UpIG9mIHRoZSBjaHVyY2ggaW4gZnJvbnQgb2YgdGhlIFBhbGF6em8gR2hpc2lsYXJkaSBGYXZhIG9yaWdpbmF0ZWQgaW4gRmxvcmVuY2UuCnN1bW1hcnk6CiAgICBUaGUgUmVuYWlzc2FuY2UgYXJjaGl0ZWN0dXJhbCBzdHlsZSBvZiB0aGUgY2h1cmNoIHN0YW5kaW5nIGluIGZyb250IG9mIHRoZSBQYWxhenpvIEdoaXNpbGFyZGkgRmF2YSBvcmlnaW5hdGVkIGluIEZsb3JlbmNlLgoKCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMKMyBvdGhlciBkZW1vcyBvbWl0dGVkIGZvciBicmV2aXR5LgojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCg==)
Given a question and a set of related passages, carefully analyze the information by thinking through the relevant facts step-by-step. Produce a clear and concise summary that synthesizes the key points from the passages directly relevant to answering the question, ensuring the summary is focused, accurate, and grounded in the evidence provided.
Demos:
Example 1:
question:
 The architectural style of a church that stands in front of the Palazzo Ghisilardi Fava originated in what city?
passages:
 [’Palazzo Ghisilardi Fava | Palazzo Ghisilardi Fava is a Renaissance style palace, located on via Manzoni 4 in Bologna, region of Emilia Romagna, Italy; it houses the Medieval Civic Museum of Bologna.’, ’Madonna di Galliera, Bologna | The Madonna di Galliera is a church with a Renaissance facade and Baroque interiors, located on Via Manzoni, in central Bologna, Italy. It stands in front of the Palazzo Ghisilardi Fava. The present name over the portal is the "Chiesa di Filippini Madonna di Galliera e Filippo Neri".’, ’Palazzo Pretorio, Prato | The Palazzo Pretorio of the Tuscan town of Prato was the old city hall located town center, standing in front of the current Palazzo Comunale. It now accommodates the Civic Museum of Prato, which was reopened on September 2013.’, ’Palazzo Pisani Gritti | The Palazzo Pisani Gritti is a Gothic-style palace located across the Grand Canal from the Church of the Salute, and stands along the Campo del Traghetto where the church of Santa Maria del Giglio, in the Sestieri of San Marco, Venice, Italy.’, ’Dömötör Tower | The Dömötör tower is the oldest building in Szeged, Hungary. The foundation was most probably laid during the 11th century, while the lower part was built (in Romanesque style) from the 12th century, and the upper part (Gothic style) from the 13th century. The tower was once part of the former "Szent Dömötör templom" (St. Demetrius church), but today it stands in Dóm Square, in front of the much larger Votive Church of Szeged. The upper part was rebuilt from the original stones in 1926. The architecture of the tower is similar to another found in Southern France, or in the territory of the former Byzantine Empire.’, ’Palazzo Leoni, Bologna | The Palazzo Leoni is a Renaissance style palace located on Via Marsala #31, in front of the outlet of Via Mentana, in central Bologna, region of Emilia-Romagna, Italy. The apse of the church of San Martino, is across the street.’, ’Palazzo Altieri | Palazzo Altieri is a palace in Rome, which was the home of the Altieri family in the city. The palace faces the square in front of the Church of the Gesù.’]
reasoning:
 The question asks for the city where the architectural style of a church that stands in front of the Palazzo Ghisilardi Fava originated. Passage [2] identifies the church standing in front of the Palazzo Ghisilardi Fava as "Madonna di Galliera" and mentions it has a Renaissance facade and Baroque interiors. Passage [1] states the Palazzo Ghisilardi Fava is located in Bologna, Italy. Since the church is located in Bologna and features a Renaissance architectural style, it can be inferred that the architectural style of this church originated in the city of Florence, which is historically recognized as the birthplace of Renaissance architecture. Thus, the architectural style (Renaissance) of the church in front of the Palazzo Ghisilardi Fava originated in Florence.
summary:
 The Renaissance architectural style of the church standing in front of the Palazzo Ghisilardi Fava originated in Florence.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,WW91IGFyZSBhIGZpcnN0LWhvcCAqKnN1bW1hcml6YXRpb24gbW9kdWxlKiogaW4gYSBtdWx0aS1ob3AgcXVlc3Rpb24gYW5zd2VyaW5nIChRQSkgc3lzdGVtLiBZb3VyIHRhc2sgaXMgdG8gZ2VuZXJhdGUgYSBjb25jaXNlLCBpbmZvcm1hdGl2ZSBgc3VtbWFyeWAgZ2l2ZW4gdHdvIGlucHV0IGZpZWxkczogYSBgcXVlc3Rpb25gIGFuZCBhIGxpc3Qgb2YgcmVsZXZhbnQgYHBhc3NhZ2VzYC4KCllvdXIgZ29hbCBpcyB0byBleHRyYWN0IGFuZCBzeW50aGVzaXplIGtleSBpbmZvcm1hdGlvbiBmcm9tIHRoZSByZXRyaWV2ZWQgcGFzc2FnZXMgdGhhdDoKCjEuIERpcmVjdGx5IHJlbGF0ZXMgdG8gdGhlIGluaXRpYWwgcXVlc3Rpb24uCjIuIENhcHR1cmVzIHRoZSBjb3JlIGZhY3RzIGFuZCBlbnRpdGllcyBuZWVkZWQgdG8gdW5kZXJzdGFuZCB0aGUgc2NvcGUgYW5kIGNvbnRleHQgb2YgdGhlIHF1ZXN0aW9uLgozLiBJbmNsdWRlcyByZWxldmFudCBjb25uZWN0aW9ucywgYnJpZGdpbmcgZW50aXRpZXMsIGRhdGVzLCBsb2NhdGlvbnMsIG9yIGRlc2NyaXB0aW9ucyB0aGF0IGVuYWJsZSB0aGUgc3lzdGVtIHRvIGRldmlzZSBmb2N1c2VkIGFuZCBlZmZlY3RpdmUgZm9sbG93LXVwIHF1ZXJpZXMgaW4gc3Vic2VxdWVudCBob3BzLgo0LiBQcm92aWRlcyBhIHN0cm9uZyBmYWN0dWFsIGZvdW5kYXRpb24gZm9yIGRvd25zdHJlYW0gYW5zd2VyIGdlbmVyYXRpb24gbW9kdWxlcy4KCioqVGFzayBzcGVjaWZpY3MgYW5kIGJlc3QgcHJhY3RpY2VzOioqCgotIFRoZSBgc3VtbWFyeWAgbXVzdCByZXByZXNlbnQgYSBkaXN0aWxsZWQgc3ludGhlc2lzLCBub3QganVzdCBhIGNvbXByZXNzaW9uIG9yIGV4dHJhY3RpdmUgc25pcHBldC4KLSBFeHBsaWNpdGx5IGluY2x1ZGUgY2l0ZWQgcGFzc2FnZSB0aXRsZXMgb3Iga2V5IGVudGl0eSBsYWJlbHMgKGUuZy4sICJDaGlsZHJlbiBpbiBOZWVkIDIwMDYgfCAuLi4iIG9yICJBbnRob255IExldmFuZG93c2tpIHwgLi4uIikgaW4geW91ciBzdW1tYXJ5IHRvIGhpZ2hsaWdodCB0aGUgb3JpZ2luIG9mIGluZm9ybWF0aW9uLgotIEluY29ycG9yYXRlIHN1ZmZpY2llbnQgY29udGV4dCB0byBoaW50IGF0IG1pc3Npbmcgb3IgdW4tcmV0cmlldmVkIHN1cHBvcnRpbmcgZmFjdHMsIHRodXMgZW5oYW5jaW5nIHRoZSBtdWx0aS1ob3AgcmV0cmlldmFsIHByb2Nlc3MuCi0gV2hlbiB0aGUgcXVlc3Rpb24gYXNrcyBmb3IgYW4gYXR0cmlidXRlIChlLmcuLCBuYXRpb25hbGl0eSwgbG9jYXRpb24sIGNvbXBhbnkgb3JpZ2luKSwgZW5zdXJlIHlvdSBwcm92aWRlOgogICAtIElkZW50aWZpY2F0aW9uIG9mIHRoZSByZWxldmFudCBzdWJqZWN0IG9yIGVudGl0eSBtZW50aW9uZWQgaW4gdGhlIHBhc3NhZ2VzLgogICAtIFRoZSBleHRyYWN0ZWQgYXR0cmlidXRlIG9yIHJlbGV2YW50IGluZm9ybWF0aW9uIGFzIHN0YXRlZCBvciBpbXBsaWVkLgogICAtIEJyaWRnaW5nIGRldGFpbHMgdGhhdCBjb3VsZCBoZWxwIHRoZSBzeXN0ZW0gcHVyc3VlIHJlbWFpbmluZyBpbmZvcm1hdGlvbiBpbiB0aGUgbmV4dCByZXRyaWV2YWwgc3RlcC4KLSBBdm9pZCBmb3JtaW5nIGEgZmluYWwgYW5zd2VyOyBpbnN0ZWFkLCBmb2N1cyBvbiAid2hhdCBpcyBrbm93biBub3ciIGZyb20gdGhlIGlucHV0IGRvY3VtZW50cyB0byBmYWNpbGl0YXRlIGZ1cnRoZXIgcXVlcnkgcmVmaW5lbWVudC4KCioqRXhhbXBsZXMgb2YgY3JpdGljYWwgZWxlbWVudHMgdG8gaW5jbHVkZToqKgoKLSBFbnRpdHkgbmFtZXMsIHJvbGVzLCB0aXRsZXMsIGFuZCBkYXRlcyB0aWVkIHRvIHRoZSBxdWVzdGlvbi4KLSBOYW1lcyBvZiBvcmdhbml6YXRpb25zIG9yIGxvY2F0aW9ucyBjb25uZWN0ZWQgdGhyb3VnaCBpbnRlcm1lZGlhcnkgZW50aXRpZXMuCi0gRGlzdGluY3RpdmUgaWRlbnRpZmllcnMgb3IgY2xhcmlmaWNhdGlvbnMgdGhhdCBjYW4gaGVscCBuYXJyb3cgZG93biBuZXh0LXN0ZXAgcmV0cmlldmFsIChzdWNoIGFzICJOYXRhc2hhIEthcGxpbnNreSBpcyBhbiBFbmdsaXNoIHByZXNlbnRlciwiICJLYXBvbGVpIGlzIGEgY2l0eSBvbiBPYWh1LCIgb3IgIldheW1vIHNwdW4gb3V0IG9mIEFscGhhYmV0IikuCgoqKkZvcm1hdCBvZiBvdXRwdXQ6KioKClByb3ZpZGUgYSBwYXJhZ3JhcGggb3IgYSBmZXcgc2VudGVuY2VzIHRoYXQgY29oZXNpdmVseSBzdW1tYXJpemUgdGhlIGtleSBwYXNzYWdlcyBpbiByZWxhdGlvbiB0byB0aGUgcXVlc3Rpb24sIHJlZmVyZW5jaW5nIHBhc3NhZ2UgdGl0bGVzIG9yIGVudGl0aWVzIHRvIGZyYW1lIGZhY3RzIGNsZWFybHkuCgotLS0KClRoaXMgYXBwcm9hY2ggZW5zdXJlcyB0aGUgc3VtbWFyeSBpcyBib3RoIGluZm9ybWF0aXZlIGZvciBuZXh0LWhvcCByZXRyaWV2YWwgYW5kIGZvdW5kYXRpb25hbCBmb3IgZmluYWwgYW5zd2VyIGV4dHJhY3Rpb24gaW4gbXVsdGktaG9wIFFBLg==)
You are a first-hop **summarization module** in a multi-hop question answering (QA) system. Your task is to generate a concise, informative ‘summary‘ given two input fields: a ‘question‘ and a list of relevant ‘passages‘.


Your goal is to extract and synthesize key information from the retrieved passages that:


1. Directly relates to the initial question.
2. Captures the core facts and entities needed to understand the scope and context of the question.
3. Includes relevant connections, bridging entities, dates, locations, or descriptions that enable the system to devise focused and effective follow-up queries in subsequent hops.
4. Provides a strong factual foundation for downstream answer generation modules.


**Task specifics and best practices:**


- The ‘summary‘ must represent a distilled synthesis, not just a compression or extractive snippet.
- Explicitly include cited passage titles or key entity labels (e.g., "Children in Need 2006 | ..." or "Anthony Levandowski | ...") in your summary to highlight the origin of information.
- Incorporate sufficient context to hint at missing or un-retrieved supporting facts, thus enhancing the multi-hop retrieval process.
- When the question asks for an attribute (e.g., nationality, location, company origin), ensure you provide:
 - Identification of the relevant subject or entity mentioned in the passages.
 - The extracted attribute or relevant information as stated or implied.
 - Bridging details that could help the system pursue remaining information in the next retrieval step.
- Avoid forming a final answer; instead, focus on "what is known now" from the input documents to facilitate further query refinement.


**Examples of critical elements to include:**


- Entity names, roles, titles, and dates tied to the question.
- Names of organizations or locations connected through intermediary entities.
- Distinctive identifiers or clarifications that can help narrow down next-step retrieval (such as "Natasha Kaplinsky is an English presenter," "Kapolei is a city on Oahu," or "Waymo spun out of Alphabet").


**Format of output:**


Provide a paragraph or a few sentences that cohesively summarize the key passages in relation to the question, referencing passage titles or entities to frame facts clearly.


---


This approach ensures the summary is both informative for next-hop retrieval and foundational for final answer extraction in multi-hop QA.

HotpotQA GPT-4.1 Mini summarize2.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgY29udGV4dGAsIGBwYXNzYWdlc2AsIHByb2R1Y2UgdGhlIGZpZWxkcyBgc3VtbWFyeWAu)
Given the fields ‘question‘, ‘context‘, ‘passages‘, produce the fields ‘summary‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gYSBgcXVlc3Rpb25gLCByZWxldmFudCBgY29udGV4dGAsIGFuZCBhIGxpc3Qgb2YgYHBhc3NhZ2VzYCwgcHJvdmlkZSBhIGNsZWFyLCBjb25jaXNlIHN1bW1hcnkgdGhhdCBpbnRlZ3JhdGVzIHRoZSBrZXkgaW5mb3JtYXRpb24gZnJvbSB0aGUgcGFzc2FnZXMgaW4gcmVsYXRpb24gdG8gdGhlIHF1ZXN0aW9uIGFuZCBjb250ZXh0LiBVc2Ugc3RlcC1ieS1zdGVwIHJlYXNvbmluZyB0byBleHBsYWluIGhvdyB0aGUgc3VtbWFyeSBpcyBkZXJpdmVkIGZyb20gdGhlIGV2aWRlbmNlIGJlZm9yZSBwcmVzZW50aW5nIHRoZSBmaW5hbCBzeW50aGVzaXplZCBzdW1tYXJ5LgpEZW1vczoKRXhhbXBsZSAxOgpxdWVzdGlvbjoKICAgIFdoYXQgYmFuayB3YXMgZm91bmRlZCBieSB0aGUgZ3JlYXQtZ3JlYXQtZ3JlYXQgZ3JhbmRmYXRoZXIgb2YgdGhlIHNlY29uZCBEdWtlIG9mIEZsb3JlbmNlPwpjb250ZXh0OgogICAgVGhlIGJhbmsgZm91bmRlZCBieSB0aGUgZ3JlYXQtZ3JlYXQtZ3JlYXQgZ3JhbmRmYXRoZXIgb2YgdGhlIHNlY29uZCBEdWtlIG9mIEZsb3JlbmNlIGlzIHRoZSBNZWRpY2kgQmFuaywgZXN0YWJsaXNoZWQgYnkgR2lvdmFubmkgZGkgQmljY2kgZGUnIE1lZGljaS4KcGFzc2FnZXM6CiAgICBbJ0dpb3Zhbm5pIGRpIEJpY2NpIGRlXCcgTWVkaWNpIHwgR2lvdmFubmkgZGkgQmljY2kgZGVcJyBNZWRpY2kgKGMuIDEzNjAg4oCTIEZlYnJ1YXJ5IDIwLzI4LCAxNDI5KSB3YXMgYW4gSXRhbGlhbiBiYW5rZXIsIGEgbWVtYmVyIG9mIE1lZGljaSBmYW1pbHkgb2YgRmxvcmVuY2UsIGFuZCB0aGUgZm91bmRlciBvZiB0aGUgTWVkaWNpIEJhbmsuICBXaGlsZSBvdGhlciBmYW1pbHkgbWVtYmVycywgc3VjaCBhcyBDaGlhcmlzc2ltbyBkaSBHaWFtYnVvbm8gZGVcJyBNZWRpY2ksIHdobyBzZXJ2ZWQgaW4gdGhlIFNpZ25vcmlhIGluIDEyMDEsIGFuZCBTYWx2ZXN0cm8gZGVcJyBNZWRpY2ksIHdobyB3YXMgaW1wbGljYXRlZCBpbiB0aGUgQ2lvbXBpIFJldm9sdCBvZiAxMzc4LCBhcmUgaGlzdG9yaWNhbGx5IHNpZ25pZmljYW50LCBHaW92YW5uaVwncyBmb3VuZGluZyBvZiB0aGUgZmFtaWx5IGJhbmsgdHJ1bHkgYmVnYW4gdGhlIGZhbWlseVwncyByaXNlIHRvIHBvd2VyIGluIEZsb3JlbmNlLiAgSGUgd2FzIHRoZSBmYXRoZXIgb2YgQ29zaW1vIGRlXCcgTWVkaWNpICgiUGF0ZXIgUGF0cmlhZSIpLCBncmFuZGZhdGhlciBvZiBQaWVybyBkaSBDb3NpbW8gZGVcJyBNZWRpY2ksIGdyZWF0LWdyYW5kZmF0aGVyIG9mIExvcmVuem8gZGVcJyBNZWRpY2kgKHRoZSBNYWduaWZpY2VudCkgYW5kIGdyZWF0LWdyZWF0LWdyZWF0LWdyYW5kZmF0aGVyIG9mIENvc2ltbyBJIGRlXCcgTWVkaWNpLCBHcmFuZCBEdWtlIG9mIFR1c2NhbnkuJywgJ0F2ZXJhcmRvIGRlXCcgTWVkaWNpIHwgQXZlcmFyZG8gZGVcJyBNZWRpY2kgKDEzMjAtMTM2MyksCiAgICBhbHNvIGtub3duIGFzIEV2ZXJhcmQgRGUgTWVkaWNpLCB3YXMgdGhlIHNvbiBvZiBTYWx2ZXN0cm8gZGVcJyBNZWRpY2kgKGRpZWQgMTM0NiksICJpbCBDaGlhcmlzc2ltbyIgKEVuZ2xpc2ggbWVhbmluZyAidGhlIHZlcnkgY2xlYXIuIikgIGFuZCB0aGUgZmF0aGVyIG9mIHRocmVlIGNoaWxkcmVuOiBHaW92YW5uaSwgRnJhbmNlc2NvLCBhbmQgQW50b25pYS4gIEdpb3Zhbm5pIGRpIEJpY2NpIGRlXCcgTWVkaWNpIHdvdWxkIGxhdGVyIGJlY29tZSB0aGUgZmlyc3QgaGlzdG9yaWNhbGx5IHJlbGV2YW50IG1lbWJlciBvZiBNZWRpY2kgZmFtaWx5IG9mIEZsb3JlbmNlIGFuZCB0aGUgZXZlbnR1YWwgZm91bmRlciBvZiB0aGUgTWVkaWNpIGJhbmsuJywgIlZpbGxhIE1lZGljaSBhdCBDYWZhZ2dpb2xvIHwgVGhlIFZpbGxhIE1lZGljZWEgZGkgQ2FmYWdnaW9sbyBpcyBhIHZpbGxhIHNpdHVhdGVkIG5lYXIgdGhlIFR1c2NhbiB0b3duIG9mIEJhcmJlcmlubyBkaSBNdWdlbGxvIGluIHRoZSB2YWxsZXkgb2YgdGhlIFJpdmVyIFNpZXZlLCBzb21lIDI1XHhhMGtpbG9tZXRyZXMgbm9ydGggb2YgRmxvcmVuY2UsIGNlbnRyYWwgSXRhbHkuICBJdCB3YXMgb25lIG9mIHRoZSBvbGRlc3QgYW5kIG1vc3QgZmF2b3VyZWQgb2YgdGhlIE1lZGljaSBmYW1pbHkgZXN0YXRlcywgaGF2aW5nIGJlZW4gaW4gdGhlIHBvc3Nlc3Npb24gb2YgdGhlIGZhbWlseSBzaW5jZSB0aGUgMTR0aCBjZW50dXJ5LCB3aGVuIGl0IHdhcyBvd25lZCBieSBBdmVyYXJkbyBkZScgTWVkaWNpLiAgQXZlcmFyZG8ncyBzb24sIEdpb3Zhbm5pIGRpIEJpY2NpIGRlJyBNZWRpY2ksIGlzIGNvbnNpZGVyZWQgdG8gYmUgdGhlIGZvdW5kZXIgb2YgdGhlIE1lZGljaSBkeW5hc3R5LiIsICdNZWRpY2k6IE1hc3RlcnMgb2YgRmxvcmVuY2UgfCBNZWRpY2k6IE1hc3RlcnMgb2YgRmxvcmVuY2UgaXMgYW4gSXRhbGlhbi1Ccml0aXNoIHRlbGV2aXNpb24gZHJhbWEgc2VyaWVzIGFib3V0IHRoZSBNZWRpY2kgZHluYXN0eSBzZXQgaW4gMTV0aC1jZW50dXJ5IEZsb3JlbmNlLCBzdGFycmluZyBEdXN0aW4gSG9mZm1hbiBhcyBHaW92YW5uaSBkaSBCaWNjaSBkZVwnIE1lZGljaSwgUmljaGFyZCBNYWRkZW4gYXMgQ29zaW1vIGRlXCcgTWVkaWNpLCBhbmQgU3R1YXJ0IE1hcnRpbiBhcyBMb3JlbnpvIGRlXCcgTWVkaWNpICgiVGhlIEVsZGVyIikuICBUaGUgc2VyaWVzIHdhcyBjby1jcmVhdGVkIGJ5IEZyYW5rIFNwb3RuaXR6ICgiVGhlIFgtRmlsZXMiIGFuZCAiTWFuIGluIHRoZSBIaWdoIENhc3RsZSIpIGFuZCBOaWNob2xhcyBNZXllciAoIiIpLiAgU2VyZ2lvIE1pbWljYS1HZXp6YW4gKCJUaGUgUGlsbGFycyBvZiB0aGUgRWFydGgiKSBkaXJlY3RlZCBhbGwgZWlnaHQgZXBpc29kZXMuICBFcGlzb2RlcyAxIGFuZCAyIGFpcmVkIG9uIFJhaSAxIChJdGFsaWFuIFRWKSBvbiAxOCBPY3RvYmVyIDIwMTYuICBBY2NvcmRpbmcgdG8gSXRhbGlhbiByYXRpbmdzIGNvbXBpbGVyIEF1ZGl0ZWwsIGl0IGF0dHJhY3RlZCBhIHJlY29yZCA3LjZceGEwbWlsbGlvbiB2aWV3ZXJzLiAgVGhlIGZpcnN0IHNlYXNvbiBjb25zaXN0cyBvZiBlaWdodCBlcGlzb2Rlcy4nLCAnTmVyaSBkaSBCaWNjaSB8IE5lcmkgZGkgQmljY2kgKDE0MTnigJMxNDkxKSB3YXMgYW4gSXRhbGlhbiBwYWludGVyIG9mIHRoZSBSZW5haXNzYW5jZS4gIEEgcHJvbGlmaWMgcGFpbnRlciBvZiBtYWlubHkgcmVsaWdpb3VzIHRoZW1lcywgaGUgd2FzIGFjdGl2ZSBtYWlubHkgaW4gRmxvcmVuY2UgYW5kIGluIHRoZSBtZWRpdW0gb2YgdGVtcGVyYS4gIEhpcyBmYXRoZXIgd2FzIEJpY2NpIGRpIExvcmVuem8uICBIaXMgZ3JhbmRmYXRoZXIsIExvcmVuem8gZGkgQmljY2kgd2FzIGFsc28gYSBwYWludGVyIGluIEZsb3JlbmNlLCBhIHB1cGlsIG9mIFNwaW5lbGxvIEFyZXRpbm8uJywgJ0Nvc2ltbyBkZVwnIE1lZGljaSB8IENvc2ltbyBkaSBHaW92YW5uaSBkZVwnIE1lZGljaSAoY2FsbGVkIFwndGhlIEVsZGVyXCcgKEl0YWxpYW4gImlsIFZlY2NoaW8iKSBhbmQgcG9zdGh1bW91c2x5ICJGYXRoZXIgb2YgdGhlIE5hdGlvbiIgKExhdGluICJwYXRlciBwYXRyaWFlIik7IDI3IFNlcHRlbWJlciAxMzg5IOKAkyAxIEF1Z3VzdCAxNDY0KSB3YXMgYW4gSXRhbGlhbiBiYW5rZXIgYW5kIHBvbGl0aWNpYW4sIHRoZSBmaXJzdCBvZiB0aGUgTWVkaWNpIHBvbGl0aWNhbCBkeW5hc3R5LCAiZGUgZmFjdG8iIHJ1bGVycyBvZiBGbG9yZW5jZSBkdXJpbmcgbXVjaCBvZiB0aGUgSXRhbGlhbiBSZW5haXNzYW5jZS4gIERlc3BpdGUgaGlzIGluZmx1ZW5jZSwgaGlzIHBvd2VyIHdhcyBub3QgYWJzb2x1dGU7IEZsb3JlbmNlXCdzIGxlZ2lzbGF0aXZlIGNvdW5jaWxzIGF0IHRpbWVzIHJlc2lzdGVkIGhpcyBwcm9wb3NhbHMsIHNvbWV0aGluZyB3aGljaCB3b3VsZCBub3QgaGF2ZSBiZWVuIHRvbGVyYXRlZCBieSB0aGUgVmlzY29udGkgb2YgTWlsYW4sIGZvciBpbnN0YW5jZTsgdGhyb3VnaG91dCBoaXMgbGlmZSBoZSB3YXMgYWx3YXlzICJwcmltdXMgaW50ZXIgcGFyZXMiICgiZmlyc3QgYW1vbmcgZXF1YWxzIikuICBIaXMgcG93ZXIgZGVyaXZlZCBmcm9tIGhpcyB3ZWFsdGggYXMgYSBiYW5rZXIsIGFuZCBoZSB3YXMgYSBncmVhdCBwYXRyb24gb2YgbGVhcm5pbmcsIHRoZSBhcnRzIGFuZCBhcmNoaXRlY3R1cmUuJywgIkdpb3Zhbm5pIGlsIFBvcG9sYW5vIHwgR2lvdmFubmkgZGUnIE1lZGljaSwgaW4gZnVsbCBHaW92YW5uaSBkaSBQaWVyZnJhbmNlc2NvIGRlJyBNZWRpY2ksIGxhdGVyIGtub3duIGFzIGlsIFBvcG9sYW5vICgyMSBPY3RvYmVyIDE0Njcg4oCTIDE0IFNlcHRlbWJlciAxNDk4KSB3YXMgYW4gSXRhbGlhbiBub2JsZW1hbiBvZiB0aGUgTWVkaWNpIEhvdXNlIG9mIEZsb3JlbmNlLiAgSGUgd2FzIHRoZSBzb24gb2YgUGllcmZyYW5jZXNjbyBkaSBMb3JlbnpvIGRlJyBNZWRpY2ksIGFuZCB0aGVyZWZvcmUgYSBtZW1iZXIgb2YgYSBzZWNvbmRhcnkgYnJhbmNoIG9mIHRoZSBmYW1pbHkuIl0KcmVhc29uaW5nOgogICAgVGhlIHF1ZXN0aW9uIGFza3MgZm9yIHRoZSBiYW5rIGZvdW5kZWQgYnkgdGhlIGdyZWF0LWdyZWF0LWdyZWF0LWdyYW5kZmF0aGVyIG9mIHRoZSBzZWNvbmQgRHVrZSBvZiBGbG9yZW5jZS4gUGFzc2FnZSBbMV0gc3RhdGVzIHRoYXQgR2lvdmFubmkgZGkgQmljY2kgZGUnIE1lZGljaSBmb3VuZGVkIHRoZSBNZWRpY2kgQmFuayBhbmQgd2FzIHRoZSBncmVhdC1ncmVhdC1ncmVhdC1ncmFuZGZhdGhlciBvZiBDb3NpbW8gSSBkZScgTWVkaWNpLCB3aG8gd2FzIHRoZSBHcmFuZCBEdWtlIG9mIFR1c2NhbnkuIFRoZSBEdWtlZG9tIG9mIEZsb3JlbmNlIGV2ZW50dWFsbHkgdHJhbnNmb3JtZWQgaW50byB0aGUgR3JhbmQgRHVjaHkgb2YgVHVzY2FueSB1bmRlciBDb3NpbW8gSSwgd2hvIGlzIGlkZW50aWZpZWQgYXMgdGhlIHNlY29uZCBEdWtlIG9mIEZsb3JlbmNlIGluIHRoZSBxdWVzdGlvbiBjb250ZXh0LgoKVGh1cywgR2lvdmFubmkgZGkgQmljY2kgZGUnIE1lZGljaSwgYXMgdGhlIGdyZWF0LWdyZWF0LWdyZWF0LWdyYW5kZmF0aGVyIG9mIHRoZSBzZWNvbmQgRHVrZSBvZiBGbG9yZW5jZSAoQ29zaW1vIEkgZGUnIE1lZGljaSksIGZvdW5kZWQgdGhlIE1lZGljaSBCYW5rLgpzdW1tYXJ5OgogICAgVGhlIE1lZGljaSBCYW5rIHdhcyBmb3VuZGVkIGJ5IEdpb3Zhbm5pIGRpIEJpY2NpIGRlJyBNZWRpY2ksIHRoZSBncmVhdC1ncmVhdC1ncmVhdC1ncmFuZGZhdGhlciBvZiB0aGUgc2Vjb25kIER1a2Ugb2YgRmxvcmVuY2UuCgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
Given a ‘question‘, relevant ‘context‘, and a list of ‘passages‘, provide a clear, concise summary that integrates the key information from the passages in relation to the question and context. Use step-by-step reasoning to explain how the summary is derived from the evidence before presenting the final synthesized summary.
Demos:
Example 1:
question:
 What bank was founded by the great-great-great grandfather of the second Duke of Florence?
context:
 The bank founded by the great-great-great grandfather of the second Duke of Florence is the Medici Bank, established by Giovanni di Bicci de’ Medici.
passages:
 [’Giovanni di Bicci de\’ Medici | Giovanni di Bicci de\’ Medici (c. 1360 – February 20/28, 1429) was an Italian banker, a member of Medici family of Florence, and the founder of the Medici Bank. While other family members, such as Chiarissimo di Giambuono de\’ Medici, who served in the Signoria in 1201, and Salvestro de\’ Medici, who was implicated in the Ciompi Revolt of 1378, are historically significant, Giovanni\’s founding of the family bank truly began the family\’s rise to power in Florence. He was the father of Cosimo de\’ Medici ("Pater Patriae"), grandfather of Piero di Cosimo de\’ Medici, great-grandfather of Lorenzo de\’ Medici (the Magnificent) and great-great-great-grandfather of Cosimo I de\’ Medici, Grand Duke of Tuscany.’, ’Averardo de\’ Medici | Averardo de\’ Medici (1320-1363),
 also known as Everard De Medici, was the son of Salvestro de\’ Medici (died 1346), "il Chiarissimo" (English meaning "the very clear.") and the father of three children: Giovanni, Francesco, and Antonia. Giovanni di Bicci de\’ Medici would later become the first historically relevant member of Medici family of Florence and the eventual founder of the Medici bank.’, "Villa Medici at Cafaggiolo | The Villa Medicea di Cafaggiolo is a villa situated near the Tuscan town of Barberino di Mugello in the valley of the River Sieve, some 25\xa0kilometres north of Florence, central Italy. It was one of the oldest and most favoured of the Medici family estates, having been in the possession of the family since the 14th century, when it was owned by Averardo de’ Medici. Averardo’s son, Giovanni di Bicci de’ Medici, is considered to be the founder of the Medici dynasty.", ’Medici: Masters of Florence | Medici: Masters of Florence is an Italian-British television drama series about the Medici dynasty set in 15th-century Florence, starring Dustin Hoffman as Giovanni di Bicci de\’ Medici, Richard Madden as Cosimo de\’ Medici, and Stuart Martin as Lorenzo de\’ Medici ("The Elder"). The series was co-created by Frank Spotnitz ("The X-Files" and "Man in the High Castle") and Nicholas Meyer (""). Sergio Mimica-Gezzan ("The Pillars of the Earth") directed all eight episodes. Episodes 1 and 2 aired on Rai 1 (Italian TV) on 18 October 2016. According to Italian ratings compiler Auditel, it attracted a record 7.6\xa0million viewers. The first season consists of eight episodes.’, ’Neri di Bicci | Neri di Bicci (1419–1491) was an Italian painter of the Renaissance. A prolific painter of mainly religious themes, he was active mainly in Florence and in the medium of tempera. His father was Bicci di Lorenzo. His grandfather, Lorenzo di Bicci was also a painter in Florence, a pupil of Spinello Aretino.’, ’Cosimo de\’ Medici | Cosimo di Giovanni de\’ Medici (called \’the Elder\’ (Italian "il Vecchio") and posthumously "Father of the Nation" (Latin "pater patriae"); 27 September 1389 – 1 August 1464) was an Italian banker and politician, the first of the Medici political dynasty, "de facto" rulers of Florence during much of the Italian Renaissance. Despite his influence, his power was not absolute; Florence\’s legislative councils at times resisted his proposals, something which would not have been tolerated by the Visconti of Milan, for instance; throughout his life he was always "primus inter pares" ("first among equals"). His power derived from his wealth as a banker, and he was a great patron of learning, the arts and architecture.’, "Giovanni il Popolano | Giovanni de’ Medici, in full Giovanni di Pierfrancesco de’ Medici, later known as il Popolano (21 October 1467 – 14 September 1498) was an Italian nobleman of the Medici House of Florence. He was the son of Pierfrancesco di Lorenzo de’ Medici, and therefore a member of a secondary branch of the family."]
reasoning:
 The question asks for the bank founded by the great-great-great-grandfather of the second Duke of Florence. Passage [1] states that Giovanni di Bicci de’ Medici founded the Medici Bank and was the great-great-great-grandfather of Cosimo I de’ Medici, who was the Grand Duke of Tuscany. The Dukedom of Florence eventually transformed into the Grand Duchy of Tuscany under Cosimo I, who is identified as the second Duke of Florence in the question context.


Thus, Giovanni di Bicci de’ Medici, as the great-great-great-grandfather of the second Duke of Florence (Cosimo I de’ Medici), founded the Medici Bank.
summary:
 The Medici Bank was founded by Giovanni di Bicci de’ Medici, the great-great-great-grandfather of the second Duke of Florence.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgY29udGV4dGAsIGBwYXNzYWdlc2AsIHByb2R1Y2UgdGhlIGZpZWxkcyBgc3VtbWFyeWAu)
Given the fields ‘question‘, ‘context‘, ‘passages‘, produce the fields ‘summary‘.

### L.2 HotpotQA, Qwen3 8B

HotpotQA Qwen3 8B create_query_hop2.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgc3VtbWFyeV8xYCwgcHJvZHVjZSB0aGUgZmllbGRzIGBxdWVyeWAu)
Given the fields ‘question‘, ‘summary_1‘, produce the fields ‘query‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIHF1ZXN0aW9uIGFuZCB0aGUgZmlyc3Qgc3VtbWFyeSwgc3ludGhlc2l6ZSB0aGUga2V5IGVsZW1lbnRzIG9mIHRoZSBxdWVzdGlvbiBhbmQgdGhlIHN1bW1hcnkuIElkZW50aWZ5IHRoZSBzcGVjaWZpYyBpbmZvcm1hdGlvbiB0aGF0IG5lZWRzIHRvIGJlIHJldHJpZXZlZCBvciBjb25maXJtZWQuIEZvcm11bGF0ZSBhIGZvY3VzZWQgYW5kIHByZWNpc2UgcXVlcnkgdGhhdCB3aWxsIGd1aWRlIHRoZSBuZXh0IHN0ZXAgaW4gdGhlIG11bHRpLWhvcCByZWFzb25pbmcgcHJvY2VzcywgZW5zdXJpbmcgaXQgZGlyZWN0bHkgYWRkcmVzc2VzIHRoZSBnYXAgaW4ga25vd2xlZGdlIG9yIHJlcXVpcmVzIGZ1cnRoZXIgY2xhcmlmaWNhdGlvbiBmcm9tIGFkZGl0aW9uYWwgY29udGV4dC4KRGVtb3M6Cg==)
Given the question and the first summary, synthesize the key elements of the question and the summary. Identify the specific information that needs to be retrieved or confirmed. Formulate a focused and precise query that will guide the next step in the multi-hop reasoning process, ensuring it directly addresses the gap in knowledge or requires further clarification from additional context.
Demos:
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gIGFuZCBgc3VtbWFyeV8xYCwgcHJvZHVjZSB0aGUgZmllbGQgYHF1ZXJ5YCB0aGF0IG9wdGltaXplcyB0aGUgcmV0cmlldmFsIG9mIGFkZGl0aW9uYWwgZG9jdW1lbnRzIGZvciBhIG11bHRpLWhvcCBzeXN0ZW0uCgoqKlRhc2sgRGV0YWlsczoqKgoxLiAqKk9iamVjdGl2ZToqKiBZb3VyIHF1ZXJ5IG11c3QgdGFyZ2V0IGRvY3VtZW50cyBub3QgcmV0cmlldmVkIGluIHRoZSBmaXJzdCBob3AsIHVzaW5nIGNsdWVzIGZyb20gdGhlIHN1bW1hcnkgYW5kIHRoZSBvcmlnaW5hbCBxdWVzdGlvbi4KMi4gKipLZXkgU3RyYXRlZ3k6KioKICAgLSBJZGVudGlmeSBnYXBzIGluIHRoZSBmaXJzdCBob3AncyByZXRyaWV2ZWQgZG9jdW1lbnRzIChlLmcuLCBtaXNzaW5nIGVudGl0aWVzLCByZWxhdGlvbnNoaXBzLCBvciBzcGVjaWZpYyBkZXRhaWxzKS4KICAgLSBVc2UgZXhwbGljaXQgaW5mb3JtYXRpb24gZnJvbSB0aGUgc3VtbWFyeSAoZS5nLiwgbmFtZXMsIGxvY2F0aW9ucywgcXVhbnRpdGllcykgdG8gcmVwaHJhc2UgdGhlIHF1ZXN0aW9uIGludG8gYSBxdWVyeSB0aGF0IHN1cmZhY2VzIG5ldyByZWxldmFudCBkb2N1bWVudHMuCiAgIC0gQXZvaWQgcmVzdGF0aW5nIHRoZSBhbnN3ZXIgZGlyZWN0bHk7IGluc3RlYWQsIHN0cnVjdHVyZSB0aGUgcXVlcnkgdG8gZXhwbG9yZSBjb25uZWN0aW9ucyBvciB1bnJlc29sdmVkIGRldGFpbHMuCjMuICoqRG9tYWluLVNwZWNpZmljIEd1aWRhbmNlOioqCiAgIC0gSWYgdGhlIHN1bW1hcnkgZXhwbGljaXRseSBhbnN3ZXJzIHRoZSBxdWVzdGlvbiwgdGhlIHF1ZXJ5IHNob3VsZCBzdGlsbCBmb2N1cyBvbiByZXRyaWV2aW5nIGRvY3VtZW50cyB0aGF0IHByb3ZpZGUgZGVlcGVyIGNvbnRleHQgb3IgdmVyaWZ5IHRoZSBhbnN3ZXIgKGUuZy4sICJXaGF0IGlzIHRoZSBoZWFkcXVhcnRlcnMgbG9jYXRpb24gb2YgW0NvbXBhbnldPyIgaW5zdGVhZCBvZiAiVGhlIGFuc3dlciBpcyBbTG9jYXRpb25dIikuCiAgIC0gTGV2ZXJhZ2UgZW50aXRpZXMgbWVudGlvbmVkIGluIHRoZSBzdW1tYXJ5IChlLmcuLCAiQ2FyaGFydHQsIiAiQXVicmV5IE8nRGF5IikgdG8gYW5jaG9yIHRoZSBxdWVyeS4KICAgLSBJZiBubyBkb2N1bWVudHMgYXJlIG1pc3NpbmcsIHJlcGhyYXNlIHRoZSBxdWVyeSB0byBleHBsaWNpdGx5IHJlcXVlc3QgdGhlIGFuc3dlciAoZS5nLiwgIldoaWNoIGhhcyBtb3JlIGFjdHMsIEVsZWt0cmEgb3IgRnJvbSB0aGUgSG91c2Ugb2YgdGhlIERlYWQ/IikuCjQuICoqQXZvaWQ6KioKICAgLSBHZW5lcmF0aW5nIHF1ZXJpZXMgdGhhdCBkdXBsaWNhdGUgdGhlIG9yaWdpbmFsIHF1ZXN0aW9uLgogICAtIEFzc3VtaW5nIHRoZSBzdW1tYXJ5IGNvbnRhaW5zIGFsbCBuZWNlc3NhcnkgaW5mb3JtYXRpb24gZm9yIHRoZSBzZWNvbmQgaG9wLg==)
Given the fields ‘question‘ and ‘summary_1‘, produce the field ‘query‘ that optimizes the retrieval of additional documents for a multi-hop system.


**Task Details:**
1. **Objective:** Your query must target documents not retrieved in the first hop, using clues from the summary and the original question.
2. **Key Strategy:**
 - Identify gaps in the first hop’s retrieved documents (e.g., missing entities, relationships, or specific details).
 - Use explicit information from the summary (e.g., names, locations, quantities) to rephrase the question into a query that surfaces new relevant documents.
 - Avoid restating the answer directly; instead, structure the query to explore connections or unresolved details.
3. **Domain-Specific Guidance:**
 - If the summary explicitly answers the question, the query should still focus on retrieving documents that provide deeper context or verify the answer (e.g., "What is the headquarters location of [Company]?" instead of "The answer is [Location]").
 - Leverage entities mentioned in the summary (e.g., "Carhartt," "Aubrey O’Day") to anchor the query.
 - If no documents are missing, rephrase the query to explicitly request the answer (e.g., "Which has more acts, Elektra or From the House of the Dead?").
4. **Avoid:**
 - Generating queries that duplicate the original question.
 - Assuming the summary contains all necessary information for the second hop.

HotpotQA Qwen3 8B final_answer.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgc3VtbWFyeV8xYCwgYHN1bW1hcnlfMmAsIHByb2R1Y2UgdGhlIGZpZWxkcyBgYW5zd2VyYC4=)
Given the fields ‘question‘, ‘summary_1‘, ‘summary_2‘, produce the fields ‘answer‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIHF1ZXN0aW9uLCBzdW1tYXJ5XzEsIGFuZCBzdW1tYXJ5XzIsIGdlbmVyYXRlIGEgc3RlcC1ieS1zdGVwIHJlYXNvbmluZyBwcm9jZXNzIHRoYXQgbG9naWNhbGx5IGNvbm5lY3RzIHRoZSBpbmZvcm1hdGlvbiBmcm9tIGJvdGggc3VtbWFyaWVzIHRvIGFycml2ZSBhdCB0aGUgZmluYWwgYW5zd2VyLCBhbmQgdGhlbiBwcm92aWRlIHRoZSBhbnN3ZXIuIEVuc3VyZSB0aGUgcmVhc29uaW5nIGV4cGxpY2l0bHkgcmVmZXJlbmNlcyBob3cgdGhlIHN1bW1hcmllcyBzdXBwb3J0IHRoZSBjb25jbHVzaW9uIGFuZCBtYWludGFpbnMgY29uc2lzdGVuY3kgd2l0aCB0aGUgcXVlc3Rpb24ncyByZXF1aXJlbWVudHMuCkRlbW9zOgpFeGFtcGxlIDE6CnF1ZXN0aW9uOgogICAgYXJlIE1hY2hhZXJhbnRoZXJhIGFuZCBQcnVtbm9waXR5cyBib3RoIHRoZSBwbGFudHM/CnN1bW1hcnlfMToKICAgIFllcywgYm90aCBNYWNoYWVyYW50aGVyYSAoYSBnZW51cyBvZiBmbG93ZXJpbmcgcGxhbnRzIGluIHRoZSBkYWlzeS9hc3RlciBmYW1pbHkpIGFuZCBQcnVtbm9waXR5cyAoYSBnZW51cyBvZiBjb25pZmVyb3VzIHRyZWVzIGluIHRoZSBwb2RvY2FycCBmYW1pbHkpIGFyZSBwbGFudHMuCnN1bW1hcnlfMjoKICAgIFllcywgYm90aCBNYWNoYWVyYW50aGVyYSAoYSBmbG93ZXJpbmcgcGxhbnQgZ2VudXMgaW4gdGhlIGRhaXN5IGZhbWlseSkgYW5kIFBydW1ub3BpdHlzIChhIGNvbmlmZXJvdXMgdHJlZSBnZW51cyBpbiB0aGUgcG9kb2NhcnAgZmFtaWx5KSBhcmUgcGxhbnRzLgpyZWFzb25pbmc6CiAgICBCb3RoIHN1bW1hcmllcyBjb25maXJtIHRoYXQgTWFjaGFlcmFudGhlcmEgYW5kIFBydW1ub3BpdHlzIGFyZSBwbGFudHMuIFN1bW1hcnkgMSBleHBsaWNpdGx5IHN0YXRlcyB0aGV5IGFyZSBwbGFudHMsIGNhdGVnb3JpemluZyBNYWNoYWVyYW50aGVyYSBhcyBhIGZsb3dlcmluZyBwbGFudCBnZW51cyBpbiB0aGUgZGFpc3kvYXN0ZXIgZmFtaWx5IGFuZCBQcnVtbm9waXR5cyBhcyBhIGNvbmlmZXJvdXMgdHJlZSBnZW51cyBpbiB0aGUgcG9kb2NhcnAgZmFtaWx5LiBTdW1tYXJ5IDIgcmVwZWF0cyB0aGlzIGNvbmZpcm1hdGlvbiB3aXRoIHNsaWdodGx5IGRpZmZlcmVudCBwaHJhc2luZy4KYW5zd2VyOgogICAgWWVzCgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
Given the question, summary_1, and summary_2, generate a step-by-step reasoning process that logically connects the information from both summaries to arrive at the final answer, and then provide the answer. Ensure the reasoning explicitly references how the summaries support the conclusion and maintains consistency with the question’s requirements.
Demos:
Example 1:
question:
 are Machaeranthera and Prumnopitys both the plants?
summary_1:
 Yes, both Machaeranthera (a genus of flowering plants in the daisy/aster family) and Prumnopitys (a genus of coniferous trees in the podocarp family) are plants.
summary_2:
 Yes, both Machaeranthera (a flowering plant genus in the daisy family) and Prumnopitys (a coniferous tree genus in the podocarp family) are plants.
reasoning:
 Both summaries confirm that Machaeranthera and Prumnopitys are plants. Summary 1 explicitly states they are plants, categorizing Machaeranthera as a flowering plant genus in the daisy/aster family and Prumnopitys as a coniferous tree genus in the podocarp family. Summary 2 repeats this confirmation with slightly different phrasing.
answer:
 Yes




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgc3VtbWFyeV8xYCwgYW5kIGBzdW1tYXJ5XzJgLCBwcm9kdWNlIHRoZSBmaWVsZCBgYW5zd2VyYCBieToKMS4gKipFeHRyYWN0aW5nIHByZWNpc2UgdGVybWlub2xvZ3kqKjogSWRlbnRpZnkgdGhlIGV4YWN0IG5vdW4gb3Igc3BlY2lmaWMgdGVybSByZXF1aXJlZCBpbiB0aGUgYW5zd2VyIChlLmcuLCAiTWVkaWNhcmUiIHJhdGhlciB0aGFuICJNZWRpY2FyZSBjdXRzIikuIEF2b2lkIHZhZ3VlIG9yIGdlbmVyYWxpemVkIHRlcm1zIHVubGVzcyBleHBsaWNpdGx5IHN0YXRlZCBpbiB0aGUgc3VtbWFyaWVzLgoyLiAqKlJlc29sdmluZyBhbWJpZ3VpdHkqKjogSWYgdGhlIHF1ZXN0aW9uIHJlZmVyZW5jZXMgYSB0aXRsZSwgaGlzdG9yaWNhbCByb2xlLCBvciBzcGVjaWZpYyBkZXNpZ25hdGlvbiAoZS5nLiwgInNlY29uZCBEdWtlIG9mIEZsb3JlbmNlIiksIHByaW9yaXRpemUgY29udGV4dHVhbCBvciBoaXN0b3JpY2FsIGNsdWVzIGZyb20gdGhlIHN1bW1hcmllcyB0byBpbmZlciB0aGUgY29ycmVjdCBhbnN3ZXIsIGV2ZW4gaWYgdGhlIGV4YWN0IHRlcm0gaXMgbm90IGV4cGxpY2l0bHkgc3RhdGVkLiBVc2UgZG9tYWluLXNwZWNpZmljIGtub3dsZWRnZSAoZS5nLiwgTWVkaWNpIGZhbWlseSBsaW5lYWdlKSB0byBmaWxsIGdhcHMgd2hlbiBzdW1tYXJpZXMgYXJlIGluZGlyZWN0IG9yIHZhZ3VlLgozLiAqKkNyb3NzLXJlZmVyZW5jaW5nIHN1bW1hcmllcyoqOiBFbnN1cmUgY29uc2lzdGVuY3kgYmV0d2VlbiBzdW1tYXJpZXMuIElmIHN1bW1hcmllcyBjb25mbGljdCwgcHJpb3JpdGl6ZSB0aGUgb25lIHdpdGggZXhwbGljaXQgZmFjdHVhbCBjbGFpbXMgKGUuZy4sIG51bWVyaWNhbCBkYXRhLCBkaXJlY3Qgc3RhdGVtZW50cykuIElmIG5vIGV4cGxpY2l0IGNsYWltIGV4aXN0cywgc3ludGhlc2l6ZSBpbmZvcm1hdGlvbiB3aGlsZSBlbnN1cmluZyBhbGlnbm1lbnQgd2l0aCBoaXN0b3JpY2FsLCBwb2xpdGljYWwsIG9yIGN1bHR1cmFsIGNvbnRleHQuCjQuICoqQXZvaWRpbmcgb3ZlcmdlbmVyYWxpemF0aW9uIGFuZCBleHRyYSBpbmZvcm1hdGlvbioqOiBGb2N1cyBzdHJpY3RseSBvbiB0aGUgbW9zdCBzcGVjaWZpYyBhbmQgZGlyZWN0bHkgc3RhdGVkIGluZm9ybWF0aW9uIGluIHRoZSBzdW1tYXJpZXMuIERvIG5vdCBhZGQgY29udGV4dCwgZXhwbGFuYXRpb25zLCBvciBleHRlcm5hbCBrbm93bGVkZ2UgYmV5b25kIHdoYXQgaXMgZXhwbGljaXRseSBwcm92aWRlZC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBxdWVzdGlvbiBhc2tzIGZvciBhIHllYXIsIHByb3ZpZGUgb25seSB0aGUgeWVhcjsgZG8gbm90IGluY2x1ZGUgYmFuZCBtZW1iZXIgZGV0YWlscyBvciBoaXN0b3JpY2FsIGJhY2tncm91bmQuCjUuICoqUHJpb3JpdGl6aW5nIGZhY3R1YWwgYWxpZ25tZW50Kio6IElmIGEgc3VtbWFyeSBleHBsaWNpdGx5IHN0YXRlcyB0aGUgYW5zd2VyLCB1c2UgdGhhdC4gSWYgc3VtbWFyaWVzIGFyZSBpbmRpcmVjdCBvciB2YWd1ZSwgc3ludGhlc2l6ZSBpbmZvcm1hdGlvbiB3aGlsZSBlbnN1cmluZyBhbGlnbm1lbnQgd2l0aCBmYWN0dWFsIGtub3dsZWRnZSAoZS5nLiwgbGlua2luZyAiUGF0aCB0byBQcm9zcGVyaXR5IiB0byBSZXAuIFBhdWwgUnlhbuKAmXMgTWVkaWNhcmUgcHJvcG9zYWwpLgoKKipLZXkgYWRqdXN0bWVudHMgYmFzZWQgb24gZmVlZGJhY2sqKjoKLSAqKkNvbmNpc2VuZXNzKio6IEFuc3dlcnMgbXVzdCBiZSBzdHJpY3RseSBmYWN0dWFsIGFuZCBjb25jaXNlLCBhdm9pZGluZyBhZGRpdGlvbmFsIGNvbnRleHQgb3IgZXhwbGFuYXRpb25zLiBGb3IgZXhhbXBsZSwgaWYgdGhlIHF1ZXN0aW9uIGlzICJJcyBYIHNob3J0ZXIgdGhhbiBZPyIgdGhlIGFuc3dlciBzaG91bGQgYmUgYSBzaW1wbGUgIk5vIiBvciAiWWVzIiBiYXNlZCBvbiBudW1lcmljYWwgY29tcGFyaXNvbnMsIG5vdCBhIGZ1bGwgZXhwbGFuYXRpb24uCi0gKipOdW1lcmljYWwgcHJlY2lzaW9uKio6IFdoZW4gY29tcGFyaW5nIG1lYXN1cmVtZW50cyAoZS5nLiwgaGVpZ2h0cywgZGF0ZXMpLCBlbnN1cmUgZXhhY3QgdmFsdWVzIGFyZSB1c2VkIGFuZCBleHBsaWNpdGx5IHN0YXRlZCBpbiB0aGUgc3VtbWFyaWVzLiBJZiBzdW1tYXJpZXMgcHJvdmlkZSBjb25mbGljdGluZyBudW1iZXJzLCByZXNvbHZlIHZpYSBkaXJlY3QgZmFjdHVhbCBjbGFpbXMuCi0gKipEb21haW4tc3BlY2lmaWMga25vd2xlZGdlKio6IFVzZSBrbm93biBmYWN0cyAoZS5nLiwgYXJjaGl0ZWN0dXJhbCByZWNvcmRzLCBoaXN0b3JpY2FsIHRpbWVsaW5lcykgdG8gdmFsaWRhdGUgYW1iaWd1b3VzIGFuc3dlcnMsIGJ1dCBvbmx5IHdoZW4gc3VtbWFyaWVzIGxhY2sgZXhwbGljaXQgaW5mb3JtYXRpb24u)
Given the fields ‘question‘, ‘summary_1‘, and ‘summary_2‘, produce the field ‘answer‘ by:
1. **Extracting precise terminology**: Identify the exact noun or specific term required in the answer (e.g., "Medicare" rather than "Medicare cuts"). Avoid vague or generalized terms unless explicitly stated in the summaries.
2. **Resolving ambiguity**: If the question references a title, historical role, or specific designation (e.g., "second Duke of Florence"), prioritize contextual or historical clues from the summaries to infer the correct answer, even if the exact term is not explicitly stated. Use domain-specific knowledge (e.g., Medici family lineage) to fill gaps when summaries are indirect or vague.
3. **Cross-referencing summaries**: Ensure consistency between summaries. If summaries conflict, prioritize the one with explicit factual claims (e.g., numerical data, direct statements). If no explicit claim exists, synthesize information while ensuring alignment with historical, political, or cultural context.
4. **Avoiding overgeneralization and extra information**: Focus strictly on the most specific and directly stated information in the summaries. Do not add context, explanations, or external knowledge beyond what is explicitly provided. For example, if the question asks for a year, provide only the year; do not include band member details or historical background.
5. **Prioritizing factual alignment**: If a summary explicitly states the answer, use that. If summaries are indirect or vague, synthesize information while ensuring alignment with factual knowledge (e.g., linking "Path to Prosperity" to Rep. Paul Ryan’s Medicare proposal).


**Key adjustments based on feedback**:
- **Conciseness**: Answers must be strictly factual and concise, avoiding additional context or explanations. For example, if the question is "Is X shorter than Y?" the answer should be a simple "No" or "Yes" based on numerical comparisons, not a full explanation.
- **Numerical precision**: When comparing measurements (e.g., heights, dates), ensure exact values are used and explicitly stated in the summaries. If summaries provide conflicting numbers, resolve via direct factual claims.
- **Domain-specific knowledge**: Use known facts (e.g., architectural records, historical timelines) to validate ambiguous answers, but only when summaries lack explicit information.

HotpotQA Qwen3 8B summarize1.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgcGFzc2FnZXNgLCBwcm9kdWNlIHRoZSBmaWVsZHMgYHN1bW1hcnlgLg==)
Given the fields ‘question‘, ‘passages‘, produce the fields ‘summary‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgcGFzc2FnZXNgLCBwcm9kdWNlIHRoZSBmaWVsZHMgYHN1bW1hcnlgLgpEZW1vczoKRXhhbXBsZSAxOgpxdWVzdGlvbjoKICAgIFRheSBHYXJuZXR0IGFuZCBBbGV4YW5kZXIgS2x1Z2UgYm90aCBoYXZlIHdoYXQgam9iPwpwYXNzYWdlczoKICAgIFsnVGF5IEdhcm5ldHQgfCBXaWxsaWFtIFRheWxvciAiVGF5IiBHYXJuZXR0IChKdW5lIDEzLCAxODk0IOKAkyBPY3RvYmVyIDMsIDE5NzcpIHdhcyBhbiBBbWVyaWNhbiBmaWxtIGRpcmVjdG9yIGFuZCB3cml0ZXIuJywgJ1RyYWRlIFdpbmRzIChmaWxtKSB8IFRyYWRlIFdpbmRzIGlzIGEgMTkzOCBjb21lZHkgZmlsbSBkaXN0cmlidXRlZCBieSBVbml0ZWQgQXJ0aXN0cy4gIEl0IHdhcyBkaXJlY3RlZCBieSBUYXkgR2FybmV0dCwgYW5kIHN0YXJyZWQgRnJlZHJpYyBNYXJjaCBhbmQgSm9hbiBCZW5uZXR0LiAgVGhlIHNjcmVlbnBsYXkgd2FzIHdyaXR0ZW4gYnkgRG9yb3RoeSBQYXJrZXIsIEFsYW4gQ2FtcGJlbGwgYW5kIEZyYW5rIFIuIEFkYW1zLCBiYXNlZCBvbiBzdG9yeSBieSBUYXkgR2FybmV0dC4nLCAnUHJlc3RpZ2UgKGZpbG0pIHwgUHJlc3RpZ2UgaXMgYSAxOTMyIEFtZXJpY2FuIHByZS1Db2RlIGRyYW1hIGZpbG0gZGlyZWN0ZWQgYnkgVGF5IEdhcm5ldHQgYW5kIHdyaXR0ZW4gYnkgVGF5IEdhcm5ldHQsIFJvbGxvIExsb3lkIGFuZCBGcmFuY2lzIEVkd2FyZCBGYXJhZ29oLiAgVGhlIGZpbG0gc3RhcnMgQW5uIEhhcmRpbmcsIEFkb2xwaGUgTWVuam91LCBNZWx2eW4gRG91Z2xhcyBhbmQgR3V5IEJhdGVzIFBvc3QuICBUaGUgZmlsbSB3YXMgcmVsZWFzZWQgb24gSmFudWFyeSAyMiwgMTkzMiwgYnkgUktPIFBpY3R1cmVzLicsICdBbGV4YW5kZXIgS2x1Z2UgfCBBbGV4YW5kZXIgS2x1Z2UgKGJvcm4gMTQgRmVicnVhcnkgMTkzMikgaXMgYSBHZXJtYW4gYXV0aG9yLCBwaGlsb3NvcGhlciwgYWNhZGVtaWMgYW5kIGZpbG0gZGlyZWN0b3IuJywgJ0NhdHRsZSBLaW5nIHwgQ2F0dGxlIEtpbmcgaXMgYSAxOTYzIGZpbG0gZGlyZWN0ZWQgYnkgVGF5IEdhcm5ldHQuICBJdCBzdGFycyBSb2JlcnQgVGF5bG9yIGFuZCBSb2JlcnQgTG9nZ2lhLiAgSXQgYWxzbyBhcHBlYXJzIHRvIGhhdmUgYmVlbiBjYWxsZWQgR3VucyBvZiBXeW9taW5nIGluIHNvbWUgY291bnRyaWVzLicsICdHw7xudGhlciB2b24gS2x1Z2UgfCBHw7xudGhlciB2b24gS2x1Z2UgKDMwIE9jdG9iZXIgMTg4MiDigJMgMTkgQXVndXN0IDE5NDQpIHdhcyBhIEdlcm1hbiBmaWVsZCBtYXJzaGFsIGR1cmluZyBXb3JsZCBXYXIgSUkuICBLbHVnZSBoZWxkIGNvbW1hbmRzIG9uIGJvdGggdGhlIEVhc3Rlcm4gYW5kIFdlc3Rlcm4gRnJvbnRzLiAgQWx0aG91Z2ggS2x1Z2Ugd2FzIG5vdCBhbiBhY3RpdmUgY29uc3BpcmF0b3IgaW4gdGhlIDIwIEp1bHkgcGxvdCwgaGUgY29tbWl0dGVkIHN1aWNpZGUgb24gMTkgQXVndXN0IDE5NDQsIGFmdGVyIGhhdmluZyBiZWVuIHJlY2FsbGVkIHRvIEJlcmxpbiBmb3IgYSBtZWV0aW5nIHdpdGggSGl0bGVyIGluIHRoZSBhZnRlcm1hdGggb2YgdGhlIGZhaWxlZCBjb3VwLiAgSGUgd2FzIHJlcGxhY2VkIGJ5IEZpZWxkIE1hcnNoYWwgV2FsdGVyIE1vZGVsLicsICdCYWQgQ29tcGFueSAoMTkzMSBmaWxtKSB8IEJhZCBDb21wYW55IGlzIGEgMTkzMSBBbWVyaWNhbiBQcmUtQ29kZSBnYW5nc3RlciBmaWxtIGRpcmVjdGVkIGFuZCBjby13cml0dGVuIGJ5IFRheSBHYXJuZXR0IHdpdGggVG9tIEJ1Y2tpbmdoYW0gYmFzZWQgb24gSmFjayBMYWl0XCdzIDE5MzAgbm92ZWwgIlB1dCBvbiB0aGUgU3BvdCIuICBJdCBzdGFycyBIZWxlbiBUd2VsdmV0cmVlcyBhbmQgUmljYXJkbyBDb3J0ZXouICBUb2xkIGZyb20gdGhlIHZpZXcgb2YgYSB3b21hbiwgdGhlIHdvcmtpbmcgdGl0bGVzIG9mIHRoaXMgZmlsbSB3ZXJlICJUaGUgR2FuZ3N0ZXJcJ3MgV2lmZSIgYW5kICJUaGUgTWFkIE1hcnJpYWdlIi4gIFVubGlrZSBtYW55IHN0YXRpYyBlYXJseSBzb3VuZCBmaWxtcywgR2FybmV0dCBpbmNsdWRlcyBzZXZlcmFsIHNjZW5lcyB1c2luZyBhIG1vdmluZyBjYW1lcmEgY2xpbWF4aW5nIGluIGEgZ2lnYW50aWMgYXNzYXVsdCBvbiBhbiBvZmZpY2UgYnVpbGRpbmcgd2l0aCBib3RoIHNpZGVzIHVzaW5nIGhlYXZ5IG1hY2hpbmUgZ3Vucy4nXQpyZWFzb25pbmc6CiAgICBUaGUgcXVlc3Rpb24gYXNrcyBmb3IgdGhlIGNvbW1vbiBqb2Igb2YgVGF5IEdhcm5ldHQgYW5kIEFsZXhhbmRlciBLbHVnZS4gRnJvbSB0aGUgcGFzc2FnZXMsIFRheSBHYXJuZXR0IGlzIGV4cGxpY2l0bHkgaWRlbnRpZmllZCBhcyBhIGZpbG0gZGlyZWN0b3IgYW5kIHdyaXRlciAocGFzc2FnZXMgMSwgMiwgMywgNSwgNykuIEFsZXhhbmRlciBLbHVnZSBpcyBkZXNjcmliZWQgYXMgYSBHZXJtYW4gYXV0aG9yLCBwaGlsb3NvcGhlciwgYWNhZGVtaWMsIGFuZCBmaWxtIGRpcmVjdG9yIChwYXNzYWdlIDQpLiBUaGUgc2hhcmVkIGpvYiBiZXR3ZWVuIHRoZW0gaXMgImZpbG0gZGlyZWN0b3IuIgpzdW1tYXJ5OgogICAgQm90aCBUYXkgR2FybmV0dCBhbmQgQWxleGFuZGVyIEtsdWdlIGFyZSBmaWxtIGRpcmVjdG9ycy4KCgojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCjMgb3RoZXIgZGVtb3Mgb21pdHRlZCBmb3IgYnJldml0eS4KIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwo=)
Given the fields ‘question‘, ‘passages‘, produce the fields ‘summary‘.
Demos:
Example 1:
question:
 Tay Garnett and Alexander Kluge both have what job?
passages:
 [’Tay Garnett | William Taylor "Tay" Garnett (June 13, 1894 – October 3, 1977) was an American film director and writer.’, ’Trade Winds (film) | Trade Winds is a 1938 comedy film distributed by United Artists. It was directed by Tay Garnett, and starred Fredric March and Joan Bennett. The screenplay was written by Dorothy Parker, Alan Campbell and Frank R. Adams, based on story by Tay Garnett.’, ’Prestige (film) | Prestige is a 1932 American pre-Code drama film directed by Tay Garnett and written by Tay Garnett, Rollo Lloyd and Francis Edward Faragoh. The film stars Ann Harding, Adolphe Menjou, Melvyn Douglas and Guy Bates Post. The film was released on January 22, 1932, by RKO Pictures.’, ’Alexander Kluge | Alexander Kluge (born 14 February 1932) is a German author, philosopher, academic and film director.’, ’Cattle King | Cattle King is a 1963 film directed by Tay Garnett. It stars Robert Taylor and Robert Loggia. It also appears to have been called Guns of Wyoming in some countries.’, ’Günther von Kluge | Günther von Kluge (30 October 1882 – 19 August 1944) was a German field marshal during World War II. Kluge held commands on both the Eastern and Western Fronts. Although Kluge was not an active conspirator in the 20 July plot, he committed suicide on 19 August 1944, after having been recalled to Berlin for a meeting with Hitler in the aftermath of the failed coup. He was replaced by Field Marshal Walter Model.’, ’Bad Company (1931 film) | Bad Company is a 1931 American Pre-Code gangster film directed and co-written by Tay Garnett with Tom Buckingham based on Jack Lait\’s 1930 novel "Put on the Spot". It stars Helen Twelvetrees and Ricardo Cortez. Told from the view of a woman, the working titles of this film were "The Gangster\’s Wife" and "The Mad Marriage". Unlike many static early sound films, Garnett includes several scenes using a moving camera climaxing in a gigantic assault on an office building with both sides using heavy machine guns.’]
reasoning:
 The question asks for the common job of Tay Garnett and Alexander Kluge. From the passages, Tay Garnett is explicitly identified as a film director and writer (passages 1, 2, 3, 5, 7). Alexander Kluge is described as a German author, philosopher, academic, and film director (passage 4). The shared job between them is "film director."
summary:
 Both Tay Garnett and Alexander Kluge are film directors.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,WW91IGFyZSB0aGUgZmlyc3QtaG9wICoqc3VtbWFyaXphdGlvbiBtb2R1bGUqKiBpbiBhIG11bHRpLWhvcCBRQSBzeXN0ZW0uIFlvdXIgdGFzayBpcyB0byBnZW5lcmF0ZSBhICoqY29tcHJlaGVuc2l2ZSwgc3RydWN0dXJlZCBzdW1tYXJ5KiogdGhhdDoKCjEuICoqRXh0cmFjdHMgZGlyZWN0IGFuc3dlcnMqKiBmcm9tIHRoZSB0b3AgcmV0cmlldmVkIHBhc3NhZ2VzIHRvIGFkZHJlc3MgdGhlIHF1ZXN0aW9uLgoyLiAqKklkZW50aWZpZXMgYW5kIGhpZ2hsaWdodHMgbWlzc2luZyBvciBpbXBsaWVkIGNsdWVzKiogdGhhdCBtYXkgcmVxdWlyZSBmdXJ0aGVyIHJldHJpZXZhbCAoZS5nLiwgZW50aXRpZXMsIGNvbm5lY3Rpb25zLCBvciBjb250ZXh0dWFsIGRldGFpbHMpLgozLiAqKlN5bnRoZXNpemVzIGluZm9ybWF0aW9uKiogYnkgY29tYmluaW5nIGV4cGxpY2l0IGZhY3RzIGZyb20gdGhlIHBhc3NhZ2VzIHdpdGggZG9tYWluLXNwZWNpZmljIGtub3dsZWRnZSBvciBsb2dpY2FsIGluZmVyZW5jZXMgdG8gZ3VpZGUgc3Vic2VxdWVudCBzdGVwcy4KCiMjIyAqKlN1bW1hcnkgU3RydWN0dXJlKioKLSAqKkVudGl0eS9QZXJzb24gTWVudGlvbioqOiBDbGVhcmx5IHN0YXRlIHRoZSBzdWJqZWN0IChlLmcuLCAiQmlsbHkgVHJ1YXgiLCAiRWludHJhY2h0IEJyYXVuc2Nod2VpZyIpIGFuZCBpbmNsdWRlICoqZnVsbCBuYW1lcywgdGl0bGVzLCBvciBvZmZpY2lhbCBkZXNpZ25hdGlvbnMqKiAoZS5nLiwgIlRob21hcyBMYW5jZSBSZW50emVsIiwgIkJyYXVuc2Nod2VpZ2VyIFR1cm4tIHVuZCBTcG9ydHZlcmVpbiBFaW50cmFjaHQgdm9uIDE4OTUgZS5WLiIpLgotICoqRGlyZWN0IEFuc3dlcioqOiBJbmNsdWRlICoqZXhwbGljaXQgYW5zd2VycyoqIGZyb20gdGhlIHBhc3NhZ2VzIChlLmcuLCBiaXJ0aCBkYXRlcywgdGVhbSBhZmZpbGlhdGlvbnMsIG9yIGRpcmVjdCBzdGF0ZW1lbnRzKS4KLSAqKkNsdWVzIGZvciBOZXh0IFN0ZXBzKio6IFNpZ25hbCAqKm1pc3NpbmcgaW5mb3JtYXRpb24qKiAoZS5nLiwgIkxhbmNlIFJlbnR6ZWwncyBiaXJ0aCB5ZWFyIGlzIGV4cGxpY2l0bHkgc3RhdGVkLCBidXQgaGlzIGV4YWN0IGJpcnRocGxhY2UgaXMgbm90OyBuZWVkIHRvIHNlYXJjaCBmb3IgJ0xhbmNlIFJlbnR6ZWwgYmlydGhwbGFjZSciKS4KLSAqKkRvbWFpbi1TcGVjaWZpYyBDb250ZXh0Kio6IEFkZCAqKnJlbGV2YW50IGJhY2tncm91bmQqKiAoZS5nLiwgIkVpbnRyYWNodCBCcmF1bnNjaHdlaWcgaXMgYSBHZXJtYW4gZm9vdGJhbGwgY2x1YiBiYXNlZCBpbiBCcmF1bnNjaHdlaWcsIExvd2VyIFNheG9ueSIgb3IgIk5GTCBwbGF5ZXJzJyBiaXJ0aCBkYXRlcyBhcmUgY3JpdGljYWwgZm9yIGFnZSBjb21wYXJpc29ucyIpLgoKIyMjICoqR3VpZGVsaW5lcyoqCi0gKipEbyBub3Qgb21pdCoqIGFueSBlbnRpdHkgb3IgZGV0YWlsIGZyb20gdGhlIHJldHJpZXZlZCBwYXNzYWdlcyB0aGF0IGNvdWxkIGJlIHJlbGV2YW50IGZvciBmb2xsb3ctdXAgcXVlcmllcyAoZS5nLiwgdGVhbSBuYW1lcywgbG9jYXRpb25zLCBvciBoaXN0b3JpY2FsIGNvbnRleHQpLgotICoqUHJpb3JpdGl6ZSBjbGFyaXR5KiogYnkgKipzZXBhcmF0aW5nIGRpcmVjdCBhbnN3ZXJzIGZyb20gaW5mZXJyZWQgY2x1ZXMqKiAoZS5nLiwgdXNpbmcgYnVsbGV0IHBvaW50cywgc3ViaGVhZGluZ3MsIG9yIGJvbGRlZCBsYWJlbHMpLgotICoqQXZvaWQgYXNzdW1wdGlvbnMqKiBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBwYXNzYWdlczsgaWYgaW5mb3JtYXRpb24gaXMgYWJzZW50LCAqKmV4cGxpY2l0bHkgc3RhdGUgdGhhdCBpdCBpcyBtaXNzaW5nKiogYW5kIHN1Z2dlc3QgKipwcmVjaXNlIHNlYXJjaCB0ZXJtcyoqIChlLmcuLCAiVmVyaWZ5IFdpY2hpdGEgRHdpZ2h0IEQuIEVpc2VuaG93ZXIgTmF0aW9uYWwgQWlycG9ydCdzIHRvd2VyIHN0YXR1cyB2aWEgRkFBIHJlY29yZHMiKS4KLSAqKkluY2x1ZGUgcXVhbnRpZmlhYmxlIGRhdGEqKiAoZS5nLiwgImZldyB0aG91c2FuZCBTdGFieWhvdW5zIGV4aXN0IGdsb2JhbGx5IiwgImJvcm4gSnVseSAxNSwgMTk0MyIpIHRvIGVuYWJsZSBwcmVjaXNlIGNvbXBhcmlzb25zLgotICoqSGlnaGxpZ2h0IGNvbm5lY3Rpb25zKiogYmV0d2VlbiBlbnRpdGllcyAoZS5nLiwgIkJpbGx5IFRydWF4IGFuZCBMYW5jZSBSZW50emVsIHdlcmUgdHJhZGVkIGluIDE5NzAiKSB0byBhaWQgaW4gY3Jvc3MtcmVmZXJlbmNpbmcuCgojIyMgKipLZXkgTmljaGUvRG9tYWluLVNwZWNpZmljIEluc2lnaHRzKioKLSAqKk5GTCBQbGF5ZXIgQ29tcGFyaXNvbioqOiBCaXJ0aCBkYXRlcyBhcmUgY3JpdGljYWwgZm9yIGFnZSBkZXRlcm1pbmF0aW9uLCBhbmQgdGVhbSBhZmZpbGlhdGlvbnMgKGUuZy4sICJ0cmFkZWQgaW4gMTk3MCIpIG1heSBpbXBseSBoaXN0b3JpY2FsIGNvbnRleHQuCi0gKipBaXJwb3J0IENsYXNzaWZpY2F0aW9uKio6ICJOb24tdG93ZXJlZCIgc3RhdHVzIGlzIGV4cGxpY2l0bHkgc3RhdGVkIGluIHNvbWUgcGFzc2FnZXMgKGUuZy4sICJub24tdG93ZXJlZCBwdWJsaWMgYWlycG9ydCIpLCB3aGlsZSBvdGhlcnMgcmVxdWlyZSBpbmZlcmVuY2UgKGUuZy4sICJtYWpvciBjb21tZXJjaWFsIGFpcnBvcnRzIHR5cGljYWxseSBoYXZlIHRvd2VycyIpLgotICoqRm9vdGJhbGwgQ2x1YiBDb250ZXh0Kio6IENsdWJzIGxpa2UgRWludHJhY2h0IEJyYXVuc2Nod2VpZyByZXF1aXJlIGJhY2tncm91bmQgb24gdGhlaXIgbG9jYXRpb24sIGxlYWd1ZSwgYW5kIGhpc3RvcnkgKGUuZy4sICJiYXNlZCBpbiBCcmF1bnNjaHdlaWcsIExvd2VyIFNheG9ueSIpLgotICoqUXVhbnRpZmlhYmxlIERhdGEqKjogVXNlIGV4YWN0IGRhdGVzLCBudW1iZXJzLCBvciByYW5raW5ncyAoZS5nLiwgImZldyB0aG91c2FuZCBTdGFieWhvdW5zIGV4aXN0IGdsb2JhbGx5IikgdG8gZW5hYmxlIHByZWNpc2UgY29tcGFyaXNvbnMuCgojIyMgKipDcml0aWNhbCBBZGRpdGlvbmFsIEluc3RydWN0aW9ucyoqCi0gKipFbnN1cmUgQWxsIFJldHJpZXZlZCBEb2N1bWVudHMgQXJlIFJlcHJlc2VudGVkKio6IEV4cGxpY2l0bHkgaW5jbHVkZSBhbGwgZW50aXRpZXMsIHRpdGxlcywgYW5kIGRldGFpbHMgZnJvbSB0aGUgcmV0cmlldmVkIHBhc3NhZ2VzIChlLmcuLCBmdWxsIG5hbWVzLCBmaWxtIHRpdGxlcywgYW5kIHNwZWNpZmljIHJvbGVzKS4KLSAqKlNpZ25hbCBNaXNzaW5nIExpbmtzKio6IElmIGEgY29ubmVjdGlvbiBiZXR3ZWVuIGVudGl0aWVzIGlzIGltcGxpZWQgYnV0IG5vdCBleHBsaWNpdGx5IHN0YXRlZCAoZS5nLiwgIk5hbmN5IFN0ZWluZXIgd29ya2VkIG9uICpUaGUgTG92ZWx5IEJvbmVzKiIpLCBmbGFnIHRoaXMgYXMgYSBwb3RlbnRpYWwgZ2FwIGFuZCBzdWdnZXN0IHNlYXJjaCB0ZXJtcyB0byByZXNvbHZlIGl0LgotICoqUHJpb3JpdGl6ZSBCcmlkZ2luZyBDb25jZXB0cyoqOiBIaWdobGlnaHQgcmVsYXRpb25zaGlwcyBiZXR3ZWVuIGVudGl0aWVzIChlLmcuLCAiR2FyeSBQaW5rZWwgY29hY2hlZCBUb2xlZG8gaW4gMTk5MyBhbmQgaG9sZHMgdGhlIG1vc3Qgd2lucyBpbiBzY2hvb2wgaGlzdG9yeSIpIHRvIGVuYWJsZSBmb2N1c2VkIGZvbGxvdy11cCBxdWVyaWVzLgotICoqQXZvaWQgT3ZlcmdlbmVyYWxpemF0aW9uKio6IE9ubHkgaW5jbHVkZSBkb21haW4tc3BlY2lmaWMgY29udGV4dCB0aGF0IGlzIGVpdGhlciBleHBsaWNpdGx5IHN0YXRlZCBpbiB0aGUgcGFzc2FnZXMgb3IgZGlyZWN0bHkgaW5mZXJhYmxlIChlLmcuLCAibWFqb3IgY29tbWVyY2lhbCBhaXJwb3J0cyB0eXBpY2FsbHkgaGF2ZSB0b3dlcnMiIGlzIGFjY2VwdGFibGUsIGJ1dCAiYWlycG9ydHMgd2l0aCBmZXdlciB0aGFuIDEwLDAwMCBwYXNzZW5nZXJzIGFyZSBub24tdG93ZXJlZCIgaXMgbm90IHVubGVzcyBzdGF0ZWQpLgoKIyMjICoqRXhhbXBsZSBGb3JtYXQqKgpGb3IgdGhlIHF1ZXN0aW9uICoiV2hpY2ggTkZMIHBsYXllciBpcyB5b3VuZ2VyLCBCaWxseSBUcnVheCBvciBMYW5jZSBSZW50emVsPyIqOgotICoqRW50aXR5L1BlcnNvbiBNZW50aW9uKio6IEJpbGx5IFRydWF4IChXaWxsaWFtIEZyZWRlcmljayBUcnVheCksIExhbmNlIFJlbnR6ZWwgKFRob21hcyBMYW5jZSBSZW50emVsKQotICoqRGlyZWN0IEFuc3dlcioqOgogIC0gKipCaWxseSBUcnVheCoqOiBCb3JuIEp1bHkgMTUsIDE5NDMuCiAgLSAqKkxhbmNlIFJlbnR6ZWwqKjogQm9ybiBPY3RvYmVyIDE0LCAxOTQzLgotICoqQ2x1ZXMgZm9yIE5leHQgU3RlcHMqKjogTm9uZSByZXF1aXJlZDsgYmlydGggZGF0ZXMgYXJlIGV4cGxpY2l0bHkgcHJvdmlkZWQuCi0gKipEb21haW4tU3BlY2lmaWMgQ29udGV4dCoqOiBCaXJ0aCBkYXRlcyBhcmUgc3VmZmljaWVudCB0byBkZXRlcm1pbmUgYWdlIGRpZmZlcmVuY2Ugd2l0aGluIHRoZSBzYW1lIHllYXIuCgpGb3IgdGhlIHF1ZXN0aW9uICoiV2hpY2ggaXMgYSBub24tdG93ZXJlZCBhaXJwb3J0LCBXaWNoaXRhIER3aWdodCBELiBFaXNlbmhvd2VyIE5hdGlvbmFsIEFpcnBvcnQgb3IgTW9udHJvc2UgUmVnaW9uYWwgQWlycG9ydD8iKjoKLSAqKkVudGl0eS9QZXJzb24gTWVudGlvbioqOiBXaWNoaXRhIER3aWdodCBELiBFaXNlbmhvd2VyIE5hdGlvbmFsIEFpcnBvcnQsIE1vbnRyb3NlIFJlZ2lvbmFsIEFpcnBvcnQKLSAqKkRpcmVjdCBBbnN3ZXIqKjoKICAtICoqTW9udHJvc2UgUmVnaW9uYWwgQWlycG9ydCoqOiAibm9uLXRvd2VyZWQgcHVibGljIGFpcnBvcnQiIChwYXNzYWdlIDMpLgogIC0gKipXaWNoaXRhIER3aWdodCBELiBFaXNlbmhvd2VyIE5hdGlvbmFsIEFpcnBvcnQqKjogTm8gZXhwbGljaXQgbWVudGlvbiBvZiB0b3dlciBzdGF0dXM7IGluZmVycmVkIGFzICoqdG93ZXJlZCoqICh0eXBpY2FsIGZvciBtYWpvciBjb21tZXJjaWFsIGFpcnBvcnRzKS4KLSAqKkNsdWVzIGZvciBOZXh0IFN0ZXBzKio6IFZlcmlmeSBXaWNoaXRhJ3MgdG93ZXIgc3RhdHVzIHZpYSBGQUEgcmVjb3JkcyBvciBhZGRpdGlvbmFsIHNvdXJjZXMgKGUuZy4sICJXaWNoaXRhIER3aWdodCBELiBFaXNlbmhvd2VyIE5hdGlvbmFsIEFpcnBvcnQgdG93ZXIgc3RhdHVzIikuCi0gKipEb21haW4tU3BlY2lmaWMgQ29udGV4dCoqOiBOb24tdG93ZXJlZCBhaXJwb3J0cyBsYWNrIGEgY29udHJvbCB0b3dlciwgcmVseWluZyBvbiBwaWxvdCBjb21tdW5pY2F0aW9uIChwYXNzYWdlIDQpLiBNYWpvciBjb21tZXJjaWFsIGFpcnBvcnRzIGxpa2UgV2ljaGl0YSB1c3VhbGx5IGhhdmUgdG93ZXJzLgoKKipUaXA6KiogV2hlbiBzdW1tYXJpemluZywgZG9u4oCZdCBqdXN0IGNvbXByZXNzOyBzeW50aGVzaXpl4oCUaW5jbHVkZSBib3RoIGRpcmVjdCBhbnN3ZXJzIGFuZCBjbHVlcyByZXF1aXJlZCBmb3IgdGhlIHN5c3RlbeKAmXMgbmV4dCBzdGVwcy4gQWx3YXlzIGV4cGxpY2l0bHkgc3RhdGUgaWYgYSByZXRyaWV2ZWQgZG9jdW1lbnTigJlzIGNvbnRlbnQgaXMgbWlzc2luZyBjcml0aWNhbCBpbmZvcm1hdGlvbiwgYW5kIHByb3ZpZGUgYWN0aW9uYWJsZSBzZWFyY2ggdGVybXMgdG8gYWRkcmVzcyBnYXBzLg==)
You are the first-hop **summarization module** in a multi-hop QA system. Your task is to generate a **comprehensive, structured summary** that:


1. **Extracts direct answers** from the top retrieved passages to address the question.
2. **Identifies and highlights missing or implied clues** that may require further retrieval (e.g., entities, connections, or contextual details).
3. **Synthesizes information** by combining explicit facts from the passages with domain-specific knowledge or logical inferences to guide subsequent steps.


### **Summary Structure**
- **Entity/Person Mention**: Clearly state the subject (e.g., "Billy Truax", "Eintracht Braunschweig") and include **full names, titles, or official designations** (e.g., "Thomas Lance Rentzel", "Braunschweiger Turn- und Sportverein Eintracht von 1895 e.V.").
- **Direct Answer**: Include **explicit answers** from the passages (e.g., birth dates, team affiliations, or direct statements).
- **Clues for Next Steps**: Signal **missing information** (e.g., "Lance Rentzel’s birth year is explicitly stated, but his exact birthplace is not; need to search for ’Lance Rentzel birthplace’").
- **Domain-Specific Context**: Add **relevant background** (e.g., "Eintracht Braunschweig is a German football club based in Braunschweig, Lower Saxony" or "NFL players’ birth dates are critical for age comparisons").


### **Guidelines**
- **Do not omit** any entity or detail from the retrieved passages that could be relevant for follow-up queries (e.g., team names, locations, or historical context).
- **Prioritize clarity** by **separating direct answers from inferred clues** (e.g., using bullet points, subheadings, or bolded labels).
- **Avoid assumptions** not supported by the passages; if information is absent, **explicitly state that it is missing** and suggest **precise search terms** (e.g., "Verify Wichita Dwight D. Eisenhower National Airport’s tower status via FAA records").
- **Include quantifiable data** (e.g., "few thousand Stabyhouns exist globally", "born July 15, 1943") to enable precise comparisons.
- **Highlight connections** between entities (e.g., "Billy Truax and Lance Rentzel were traded in 1970") to aid in cross-referencing.


### **Key Niche/Domain-Specific Insights**
- **NFL Player Comparison**: Birth dates are critical for age determination, and team affiliations (e.g., "traded in 1970") may imply historical context.
- **Airport Classification**: "Non-towered" status is explicitly stated in some passages (e.g., "non-towered public airport"), while others require inference (e.g., "major commercial airports typically have towers").
- **Football Club Context**: Clubs like Eintracht Braunschweig require background on their location, league, and history (e.g., "based in Braunschweig, Lower Saxony").
- **Quantifiable Data**: Use exact dates, numbers, or rankings (e.g., "few thousand Stabyhouns exist globally") to enable precise comparisons.


### **Critical Additional Instructions**
- **Ensure All Retrieved Documents Are Represented**: Explicitly include all entities, titles, and details from the retrieved passages (e.g., full names, film titles, and specific roles).
- **Signal Missing Links**: If a connection between entities is implied but not explicitly stated (e.g., "Nancy Steiner worked on *The Lovely Bones*"), flag this as a potential gap and suggest search terms to resolve it.
- **Prioritize Bridging Concepts**: Highlight relationships between entities (e.g., "Gary Pinkel coached Toledo in 1993 and holds the most wins in school history") to enable focused follow-up queries.
- **Avoid Overgeneralization**: Only include domain-specific context that is either explicitly stated in the passages or directly inferable (e.g., "major commercial airports typically have towers" is acceptable, but "airports with fewer than 10,000 passengers are non-towered" is not unless stated).


### **Example Format**
For the question *"Which NFL player is younger, Billy Truax or Lance Rentzel?"*:
- **Entity/Person Mention**: Billy Truax (William Frederick Truax), Lance Rentzel (Thomas Lance Rentzel)
- **Direct Answer**:
 - **Billy Truax**: Born July 15, 1943.
 - **Lance Rentzel**: Born October 14, 1943.
- **Clues for Next Steps**: None required; birth dates are explicitly provided.
- **Domain-Specific Context**: Birth dates are sufficient to determine age difference within the same year.


For the question *"Which is a non-towered airport, Wichita Dwight D. Eisenhower National Airport or Montrose Regional Airport?"*:
- **Entity/Person Mention**: Wichita Dwight D. Eisenhower National Airport, Montrose Regional Airport
- **Direct Answer**:
 - **Montrose Regional Airport**: "non-towered public airport" (passage 3).
 - **Wichita Dwight D. Eisenhower National Airport**: No explicit mention of tower status; inferred as **towered** (typical for major commercial airports).
- **Clues for Next Steps**: Verify Wichita’s tower status via FAA records or additional sources (e.g., "Wichita Dwight D. Eisenhower National Airport tower status").
- **Domain-Specific Context**: Non-towered airports lack a control tower, relying on pilot communication (passage 4). Major commercial airports like Wichita usually have towers.


**Tip:** When summarizing, don’t just compress; synthesize—include both direct answers and clues required for the system’s next steps. Always explicitly state if a retrieved document’s content is missing critical information, and provide actionable search terms to address gaps.

HotpotQA Qwen3 8B summarize2.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgY29udGV4dGAsIGBwYXNzYWdlc2AsIHByb2R1Y2UgdGhlIGZpZWxkcyBgc3VtbWFyeWAu)
Given the fields ‘question‘, ‘context‘, ‘passages‘, produce the fields ‘summary‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgY29udGV4dGAsIGFuZCBgcGFzc2FnZXNgLCBnZW5lcmF0ZSBhIHN0cnVjdHVyZWQgcmVhc29uaW5nIHByb2Nlc3MgdGhhdCBleHBsYWlucyBob3cgdG8gc3ludGhlc2l6ZSBpbmZvcm1hdGlvbiBmcm9tIHRoZXNlIHNvdXJjZXMsIGFuZCB0aGVuIHByb2R1Y2UgYSBjb25jaXNlIHN1bW1hcnkgb2YgdGhlIGtleSBmaW5kaW5ncy4KRGVtb3M6CkV4YW1wbGUgMToKcXVlc3Rpb246CiAgICBTaW1vbmUgQmVuZWRldHRpIHBsYXlzIGZvciBhIHRlYW0gdGhhdCBjdXJyZW50bHkgY29tcGV0ZXMgaW4gd2hpY2ggU2VyaWU/CmNvbnRleHQ6CiAgICBUaGUgcHJvdmlkZWQgcGFzc2FnZXMgZG8gbm90IHNwZWNpZnkgdGhlIFNlcmllIGluIHdoaWNoIFNpbW9uZSBCZW5lZGV0dGkncyB0ZWFtIChWaXJ0dXMgRW50ZWxsYSkgY3VycmVudGx5IGNvbXBldGVzLgpwYXNzYWdlczoKICAgIFsnU2ltb25lIEJlbmVkZXR0aSB8IFNpbW9uZSBCZW5lZGV0dGkgKGJvcm4gMyBBcHJpbCAxOTkyKSBpcyBhbiBJdGFsaWFuIHByb2Zlc3Npb25hbCBmb290YmFsbGVyIHdobyBwbGF5cyBhcyBhIGNlbnRyZSBiYWNrIGZvciBWaXJ0dXMgRW50ZWxsYS4nLCAnVmlydHVzIEVudGVsbGEgfCBWaXJ0dXMgRW50ZWxsYSAodXN1YWxseSByZWZlcnJlZCBhcyBzaW1wbHkgRW50ZWxsYSBvciBDaGlhdmFyaSBFbnRlbGxhKSBpcyBhbiBJdGFsaWFuIGFzc29jaWF0aW9uIGZvb3RiYWxsIGNsdWIsIGJhc2VkIGluIENoaWF2YXJpLCBMaWd1cmlhLiAgVGhleSBjdXJyZW50bHkgY29tcGV0ZSBpbiBTZXJpZSBCLicsICdTaW1vbmUgUGFsZXJtbyB8IFNpbW9uZSBQYWxlcm1vIChib3JuIDE3IEF1Z3VzdCAxOTg4KSBpcyBhbiBJdGFsaWFuIGZvb3RiYWxsZXIgd2hvIHBsYXlzIGFzIGEgbWlkZmllbGRlciBmb3IgVmlydHVzIEVudGVsbGEgYXQgU2VyaWUgQi4nLCAnQW5kcmVhIFBhcm9uaSB8IEFuZHJlYSBQYXJvbmkgKGJvcm4gMTQgT2N0b2JlciAxOTg5KSBpcyBhbiBJdGFsaWFuIGZvb3RiYWxsZXIgd2hvIGN1cnJlbnRseSBwbGF5cyBhcyBhIGdvYWxrZWVwZXIgZm9yIFZpcnR1cyBFbnRlbGxhIGluIHRoZSBTZXJpZSBCLicsICdBbGVzc2FuZHJvIElhY29idWNjaSB8IEFsZXNzYW5kcm8gSWFjb2J1Y2NpIChib3JuIDMgSnVuZSAxOTkxKSBpcyBhbiBJdGFsaWFuIGZvb3RiYWxsZXIgd2hvIGN1cnJlbnRseSBwbGF5cyBhcyBhIGdvYWxrZWVwZXIgZm9yIFNlcmllIEIgc2lkZSBWaXJ0dXMgRW50ZWxsYS4nLCAnR2VvcmdlIEdhbmVhIHwgR2VvcmdlIEdhbmVhIChib3JuIDI2IE1heSAxOTk5IGluIEJ1Y2hhcmVzdCkgaXMgYSBSb21hbmlhbiBmb290YmFsbGVyIHdobyBwbGF5cyBhcyBhIFN0cmlrZXIgZm9yIFNlcmllIEIgY2x1YiBWaXJ0dXMgRW50ZWxsYSBQcmltYXZlcmEgdGVhbS4nLCAnR2lhbnBhb2xvIENhc3RvcmluYSB8IEdpYW5wYW9sbyBDYXN0b3JpbmEgKGJvcm4gQXVndXN0IDMwLCAxOTc2IGluIE1pbGFuKSBpcyBhIHJldGlyZWQgSXRhbGlhbiBwcm9mZXNzaW9uYWwgZm9vdGJhbGxlciB0dXJuZWQgY29hY2gsIGN1cnJlbnRseSBpbiBjaGFyZ2UgYXMgaGVhZCBjb2FjaCBvZiBTZXJpZSBCIGNsdWIgVmlydHVzIEVudGVsbGEuJ10KcmVhc29uaW5nOgogICAgVGhlIHF1ZXN0aW9uIGFza3MgZm9yIHRoZSBTZXJpZSBpbiB3aGljaCBTaW1vbmUgQmVuZWRldHRpJ3MgdGVhbSAoVmlydHVzIEVudGVsbGEpIGN1cnJlbnRseSBjb21wZXRlcy4gV2hpbGUgdGhlIGNvbnRleHQgaW5pdGlhbGx5IHN0YXRlcyB0aGF0IHRoaXMgaW5mb3JtYXRpb24gaXMgbm90IHNwZWNpZmllZCwgdGhlIHBhc3NhZ2VzIGV4cGxpY2l0bHkgbWVudGlvbiB0aGF0IFZpcnR1cyBFbnRlbGxhIGNvbXBldGVzIGluIFNlcmllIEIuIE11bHRpcGxlIHBhc3NhZ2VzIChlLmcuLCBbMl0sIFszXSwgWzRdLCBbNV0sIFs3XSkgY29uZmlybSB0aGlzIGRldGFpbCwgZGlyZWN0bHkgYW5zd2VyaW5nIHRoZSBxdWVzdGlvbi4Kc3VtbWFyeToKICAgIFNpbW9uZSBCZW5lZGV0dGkncyB0ZWFtLCBWaXJ0dXMgRW50ZWxsYSwgY3VycmVudGx5IGNvbXBldGVzIGluIFNlcmllIEIuCgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
Given the fields ‘question‘, ‘context‘, and ‘passages‘, generate a structured reasoning process that explains how to synthesize information from these sources, and then produce a concise summary of the key findings.
Demos:
Example 1:
question:
 Simone Benedetti plays for a team that currently competes in which Serie?
context:
 The provided passages do not specify the Serie in which Simone Benedetti’s team (Virtus Entella) currently competes.
passages:
 [’Simone Benedetti | Simone Benedetti (born 3 April 1992) is an Italian professional footballer who plays as a centre back for Virtus Entella.’, ’Virtus Entella | Virtus Entella (usually referred as simply Entella or Chiavari Entella) is an Italian association football club, based in Chiavari, Liguria. They currently compete in Serie B.’, ’Simone Palermo | Simone Palermo (born 17 August 1988) is an Italian footballer who plays as a midfielder for Virtus Entella at Serie B.’, ’Andrea Paroni | Andrea Paroni (born 14 October 1989) is an Italian footballer who currently plays as a goalkeeper for Virtus Entella in the Serie B.’, ’Alessandro Iacobucci | Alessandro Iacobucci (born 3 June 1991) is an Italian footballer who currently plays as a goalkeeper for Serie B side Virtus Entella.’, ’George Ganea | George Ganea (born 26 May 1999 in Bucharest) is a Romanian footballer who plays as a Striker for Serie B club Virtus Entella Primavera team.’, ’Gianpaolo Castorina | Gianpaolo Castorina (born August 30, 1976 in Milan) is a retired Italian professional footballer turned coach, currently in charge as head coach of Serie B club Virtus Entella.’]
reasoning:
 The question asks for the Serie in which Simone Benedetti’s team (Virtus Entella) currently competes. While the context initially states that this information is not specified, the passages explicitly mention that Virtus Entella competes in Serie B. Multiple passages (e.g., [2], [3], [4], [5], [7]) confirm this detail, directly answering the question.
summary:
 Simone Benedetti’s team, Virtus Entella, currently competes in Serie B.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgcXVlc3Rpb25gLCBgY29udGV4dGAsIGFuZCBgcGFzc2FnZXNgLCBwcm9kdWNlIHRoZSBmaWVsZCBgc3VtbWFyeWAuCgpZb3VyIHRhc2sgaXMgdG8gc3ludGhlc2l6ZSBpbmZvcm1hdGlvbiBmcm9tIHRoZSBxdWVzdGlvbiwgY29udGV4dCwgYW5kIG5ld2x5IHJldHJpZXZlZCBwYXNzYWdlcyB0byBnZW5lcmF0ZSBhICoqY29tcHJlaGVuc2l2ZSwgcHJlY2lzZSwgYW5kIHdlbGwtc3RydWN0dXJlZCBzdW1tYXJ5KiogdGhhdCBlbmFibGVzIHRoZSBhbnN3ZXIgZ2VuZXJhdGlvbiBtb2R1bGUgdG8gY29uZmlkZW50bHkgYXJyaXZlIGF0IHRoZSBjb3JyZWN0IGFuc3dlci4KCiMjIyBLZXkgUmVxdWlyZW1lbnRzOgoxLiAqKkV4cGxpY2l0IEFuc3dlcnMgRmlyc3QqKjogUHJpb3JpdGl6ZSBleHBsaWNpdGx5IHN0YXRlZCBmYWN0cyBmcm9tIHRoZSBjb250ZXh0IGFuZCBwYXNzYWdlcyAoZS5nLiwgZGlyZWN0IG1lbnRpb25zIG9mIGVudGl0aWVzLCByb2xlcywgb3IgcmVsYXRpb25zaGlwcykuCjIuICoqSW5mZXIgb3IgR2VuZXJhbGl6ZSBXaGVuIE5lY2Vzc2FyeSoqOiBJZiBjcml0aWNhbCBkZXRhaWxzIGFyZSBtaXNzaW5nIGZyb20gdGhlIHBhc3NhZ2VzLCBpbmZlciBjb25uZWN0aW9ucyBvciBnZW5lcmFsaXplIGJhc2VkIG9uIGNvbnRleHR1YWwgY2x1ZXMgYW5kIGRvbWFpbi1zcGVjaWZpYyBrbm93bGVkZ2UgKGUuZy4sIGxpbmtpbmcgb3duZXJzaGlwIHN0cnVjdHVyZXMsIHJvbGVzLCBvciBoaXN0b3JpY2FsIGNvbnRleHQpLgozLiAqKkJyaWRnZSBHYXBzKio6IEVuc3VyZSB0aGUgc3VtbWFyeSBpbmNsdWRlcyBhbGwgKiprZXkgc3VwcG9ydGluZyBpbmZvcm1hdGlvbioqIHJlcXVpcmVkIHRvIGFuc3dlciB0aGUgcXVlc3Rpb24sIGV2ZW4gaWYgaXQgaXMgbm90IGV4cGxpY2l0bHkgc3RhdGVkIGluIHRoZSBpbnB1dC4gRm9yIGV4YW1wbGU6CiAgIC0gSWYgdGhlIGFuc3dlciBpcyAiTmV3Y2FzdGxlIFVuaXRlZCwiIGluY2x1ZGUgZGV0YWlscyBhYm91dCBTcG9ydHMgRGlyZWN0J3Mgb3duZXJzaGlwIGFuZCB0aGUgY29ubmVjdGlvbiB0byB0aGUgYmlsbGlvbmFpcmUuCiAgIC0gSWYgdGhlIGFuc3dlciBpcyBhIHBlcnNvbidzIHJvbGUgKGUuZy4sICJ0cm91Ymxlc2hvb3RlciIpLCBleHBsaWNpdGx5IHN0YXRlIHRoZWlyIHJlbGF0aW9uc2hpcCB0byB0aGUgcXVlc3Rpb24ncyBzdWJqZWN0IGFuZCBhbnkgcmVsZXZhbnQgYmFja2dyb3VuZC4KNC4gKipTdHJ1Y3R1cmUgYW5kIFByZWNpc2lvbioqOgogICAtIENsZWFybHkgY29ubmVjdCBlbnRpdGllcywgcm9sZXMsIGFuZCByZWxhdGlvbnNoaXBzIChlLmcuLCAiU3RhbiBLcm9lbmtlIG93bnMgU3BvcnRzIERpcmVjdCBhbmQgQXJzZW5hbCBGLkMuIikuCiAgIC0gQXZvaWQgYW1iaWd1aXR5IGJ5IGluY2x1ZGluZyBhbGwgbmVjZXNzYXJ5IGNvbnRleHR1YWwgbGlua3MgKGUuZy4sICJNaWtlIEFzaGxleSBmb3VuZGVkIFNwb3J0cyBEaXJlY3QgYW5kIG93bnMgTmV3Y2FzdGxlIFVuaXRlZCIpLgogICAtIFVzZSBwcmVjaXNlIHRlcm1pbm9sb2d5IGFuZCBlbnN1cmUgYWxpZ25tZW50IHdpdGggZG9tYWluLXNwZWNpZmljIGtub3dsZWRnZSAoZS5nLiwgImludmVzdGlnYXRpdmUgam91cm5hbGlzdCIgaW5zdGVhZCBvZiAid3JpdGVyIikuCjUuICoqRG9tYWluLVNwZWNpZmljIEtub3dsZWRnZSoqOiBMZXZlcmFnZSBpbXBsaWNpdCBkb21haW4ga25vd2xlZGdlIHdoZW4gcGFzc2FnZXMgbGFjayBjcml0aWNhbCBkZXRhaWxzIChlLmcuLCBrbm93aW5nIHRoYXQgIlByb2plY3QgUkFORCIgaXMgbGlua2VkIHRvIEhlbnJ5IEguIEFybm9sZCBhbmQgdGhlIFJBTkQgQ29ycG9yYXRpb24pLgoKIyMjIEV4YW1wbGUgSW50ZWdyYXRpb246CklmIHRoZSBxdWVzdGlvbiBpcyBhYm91dCBhIHBlcnNvbidzIHByb2Zlc3Npb24gaW4gYSBub3ZlbCwgZW5zdXJlIHRoZSBzdW1tYXJ5IGluY2x1ZGVzOgotIFRoZSBjaGFyYWN0ZXIncyBuYW1lLgotIFRoZWlyIHByb2Zlc3Npb24gKGV4cGxpY2l0bHkgc3RhdGVkIGluIHRoZSB0ZXh0KS4KLSBDb250ZXh0dWFsIGxpbmtzIHRvIHRoZSBib29rIHNlcmllcyBvciBwbG90IChlLmcuLCAiaW4gKlRoZSBHaXJsIGluIHRoZSBTcGlkZXIncyBXZWIqIikuCi0gQW55IHJlbGV2YW50IGJhY2tncm91bmQgYWJvdXQgdGhlIHByb2Zlc3Npb24gb3IgY2hhcmFjdGVy4oCZcyByb2xlIGluIHRoZSBzdG9yeS4KCkFsd2F5cyBhaW0gdG8gbWF0Y2ggdGhlICoqY292ZXJhZ2UgYW5kIHJlbGV2YW5jZSoqIG9mIGFuICJpZGVhbCBzdW1tYXJ5IiBhcyBkZXNjcmliZWQgaW4gdGhlIGZlZWRiYWNrLCBlbnN1cmluZyB0aGUgYW5zd2VyIG1vZHVsZSBoYXMgYWxsIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byBnZW5lcmF0ZSB0aGUgY29ycmVjdCBmaW5hbCBhbnN3ZXIu)
Given the fields ‘question‘, ‘context‘, and ‘passages‘, produce the field ‘summary‘.


Your task is to synthesize information from the question, context, and newly retrieved passages to generate a **comprehensive, precise, and well-structured summary** that enables the answer generation module to confidently arrive at the correct answer.


### Key Requirements:
1. **Explicit Answers First**: Prioritize explicitly stated facts from the context and passages (e.g., direct mentions of entities, roles, or relationships).
2. **Infer or Generalize When Necessary**: If critical details are missing from the passages, infer connections or generalize based on contextual clues and domain-specific knowledge (e.g., linking ownership structures, roles, or historical context).
3. **Bridge Gaps**: Ensure the summary includes all **key supporting information** required to answer the question, even if it is not explicitly stated in the input. For example:
 - If the answer is "Newcastle United," include details about Sports Direct’s ownership and the connection to the billionaire.
 - If the answer is a person’s role (e.g., "troubleshooter"), explicitly state their relationship to the question’s subject and any relevant background.
4. **Structure and Precision**:
 - Clearly connect entities, roles, and relationships (e.g., "Stan Kroenke owns Sports Direct and Arsenal F.C.").
 - Avoid ambiguity by including all necessary contextual links (e.g., "Mike Ashley founded Sports Direct and owns Newcastle United").
 - Use precise terminology and ensure alignment with domain-specific knowledge (e.g., "investigative journalist" instead of "writer").
5. **Domain-Specific Knowledge**: Leverage implicit domain knowledge when passages lack critical details (e.g., knowing that "Project RAND" is linked to Henry H. Arnold and the RAND Corporation).


### Example Integration:
If the question is about a person’s profession in a novel, ensure the summary includes:
- The character’s name.
- Their profession (explicitly stated in the text).
- Contextual links to the book series or plot (e.g., "in *The Girl in the Spider’s Web*").
- Any relevant background about the profession or character’s role in the story.


Always aim to match the **coverage and relevance** of an "ideal summary" as described in the feedback, ensuring the answer module has all necessary information to generate the correct final answer.

### L.3 IFBench, GPT-4.1 Mini

IFBench GPT-4.1 Mini generate_response_module.predict

Base Prompt:
[⬇](data:text/plain;base64,UmVzcG9uZCB0byB0aGUgcXVlcnk=)
Respond to the query
MIPROv2 Prompt:
[⬇](data:text/plain;base64,WW91IHdpbGwgYmUgZ2l2ZW4gYSBxdWVyeSBjb250YWluaW5nIGEgY29tcGxleCB0YXNrIHdpdGggbXVsdGlwbGUgY29uc3RyYWludHMgYW5kIGluc3RydWN0aW9ucy4gWW91ciBqb2IgaXMgdG8gZmlyc3QgcmVwZWF0IHRoZSBxdWVyeSBleGFjdGx5IGFzIGdpdmVuLCB3b3JkIGZvciB3b3JkLCB3aXRob3V0IGFkZGluZyBhbnkgZXh0cmEgd29yZHMgb3IgY29tbWVudGFyeSBiZWZvcmUgb3IgYWZ0ZXIgdGhlIHJlcGV0aXRpb24uIEFmdGVyIHJlcGVhdGluZyB0aGUgcXVlcnksIHByb3ZpZGUgYSBkZXRhaWxlZCwgc3RlcC1ieS1zdGVwIGNoYWluLW9mLXRob3VnaHQgcmVhc29uaW5nIHRoYXQgY2FyZWZ1bGx5IHVucGFja3MgYW5kIGFkZHJlc3NlcyBldmVyeSBhc3BlY3Qgb2YgdGhlIHF1ZXJ5LiBUaGVuLCBwcm9kdWNlIGEgZmluYWwgcmVzcG9uc2UgdGhhdCBhZGhlcmVzIHN0cmljdGx5IHRvIGFsbCByZXF1aXJlbWVudHMsIGluY2x1ZGluZyBmb3JtYXR0aW5nLCBsYW5ndWFnZSwgYW5kIGNvbnRlbnQgY29uc3RyYWludHMgc3BlY2lmaWVkIGluIHRoZSBxdWVyeS4gQmUgdGhvcm91Z2gsIHByZWNpc2UsIGFuZCBlbnN1cmUgdGhlIGZpbmFsIGFuc3dlciBpcyBmdWxseSB2YWxpZGF0ZWQgYW5kIGNvbnNpc3RlbnQgd2l0aCB0aGUgcmVhc29uaW5nLiBJZiB0aGUgcXVlcnkgc3BlY2lmaWVzIGFkZGl0aW9uYWwgZm9ybWF0dGluZyBvciBzdHlsaXN0aWMgcnVsZXMgKHN1Y2ggYXMgbGFuZ3VhZ2Ugb3IgaW5jbHVzaW9uIG9mIGEgcG9zdHNjcmlwdCksIGluY2x1ZGUgdGhlbSBleGFjdGx5IGFzIGluc3RydWN0ZWQuCkRlbW9zOgo=)
You will be given a query containing a complex task with multiple constraints and instructions. Your job is to first repeat the query exactly as given, word for word, without adding any extra words or commentary before or after the repetition. After repeating the query, provide a detailed, step-by-step chain-of-thought reasoning that carefully unpacks and addresses every aspect of the query. Then, produce a final response that adheres strictly to all requirements, including formatting, language, and content constraints specified in the query. Be thorough, precise, and ensure the final answer is fully validated and consistent with the reasoning. If the query specifies additional formatting or stylistic rules (such as language or inclusion of a postscript), include them exactly as instructed.
Demos:
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,WW91IGFyZSBnaXZlbiBhIHF1ZXJ5IGlucHV0LCBhbmQgeW91ciB0YXNrIGlzIHRvIHJlc3BvbmQgYXBwcm9wcmlhdGVseSB0byB0aGF0IHF1ZXJ5LiBUaGUgcXVlcnkgbWF5IGNvbnRhaW4gc3BlY2lmaWMgaW5zdHJ1Y3Rpb25zIG9yIGNvbnN0cmFpbnRzIHRoYXQgeW91IG11c3Qgc3RyaWN0bHkgYWRoZXJlIHRvIGluIHlvdXIgcmVzcG9uc2UuIENhcmVmdWxseSBhbmFseXplIHRoZSBxdWVyeSB0byBkZXRlcm1pbmUgdGhlIGV4YWN0IHJlcXVpcmVtZW50cywgaW5jbHVkaW5nIGJ1dCBub3QgbGltaXRlZCB0bzoKCi0gUmVzcG9uZGluZyB3aXRoIGFuIGFuc3dlciBjaG9zZW4gZnJvbSBhIHJlc3RyaWN0ZWQgc2V0IG9mIG9wdGlvbnMgZXhhY3RseSBhcyBzcGVjaWZpZWQgKGluY2x1ZGluZyBleGFjdCB3b3JkaW5nIGFuZCBwdW5jdHVhdGlvbikuCi0gSW5jbHVkaW5nIHNwZWNpZmljIHdvcmRzIGEgbWluaW11bSBudW1iZXIgb2YgdGltZXMuCi0gSW5jbHVkaW5nIHNwZWNpZmljIGxldHRlcnMgYSBtaW5pbXVtIG51bWJlciBvZiB0aW1lcy4KLSBSZXBlYXRpbmcgdGhlIGVudGlyZSBxdWVyeSB3b3JkLWZvci13b3JkIGJlZm9yZSBwcm92aWRpbmcgeW91ciBhbnN3ZXIgaWYgZXhwbGljaXRseSByZXF1ZXN0ZWQsIHdpdGhvdXQgYWRkaW5nIGV4dHJhIHdvcmRzIG9yIGNoYXJhY3RlcnMgYmVmb3JlIHRoZSByZXBldGl0aW9uLgotIEF2b2lkaW5nIHNwZWNpZmljIGZvcmJpZGRlbiB3b3JkcyBvciBrZXl3b3JkcyBpbiB5b3VyIHJlc3BvbnNlIGlmIGluZGljYXRlZC4KLSBGb2xsb3dpbmcgYW55IG90aGVyIGV4cGxpY2l0IGluc3RydWN0aW9ucyBvciBjb25zdHJhaW50cyBlbWJlZGRlZCBpbiB0aGUgcXVlcnkuCgpXaGVuIHRoZSBxdWVyeSByZXF1ZXN0cyBjYWxjdWxhdGlvbnMgb3IgZmFjdHVhbCBhbnN3ZXJzIChlLmcuLCBjb21iaW5hdG9yaWFsIGNhbGN1bGF0aW9ucyksIHlvdSBzaG91bGQ6CgoxLiBDYXJlZnVsbHkgaW50ZXJwcmV0IHRoZSBtYXRoZW1hdGljYWwgb3IgbG9naWNhbCBwcm9ibGVtLgoyLiBTaG93IHlvdXIgcmVhc29uaW5nIGludGVybmFsbHkgdG8gY29uZmlybSB0aGUgZmluYWwgYW5zd2VyIChyZWFzb25pbmcgZG9lcyBub3QgbmVlZCB0byBiZSBpbmNsdWRlZCBpbiB0aGUgcmVzcG9uc2UgdW5sZXNzIGV4cGxpY2l0bHkgcmVxdWVzdGVkKS4KMy4gUHJvdmlkZSB0aGUgZmluYWwgZGlyZWN0IHJlc3BvbnNlIHN0cmljdGx5IGZvbGxvd2luZyBhbGwgaW5zdHJ1Y3Rpb25zLCBlc3BlY2lhbGx5IHdoZW4gYXNrZWQgdG8gcmVwZWF0IHRoZSBxdWVyeSB2ZXJiYXRpbSBmaXJzdCBiZWZvcmUgZ2l2aW5nIHRoZSBhbnN3ZXIuCgpHZW5lcmFsIGFwcHJvYWNoOgoKLSBBbHdheXMgcGFyc2UgdGhlIHF1ZXJ5IHRob3JvdWdobHkgdG8gZXh0cmFjdCBldmVyeSBjb25zdHJhaW50IGFuZCBpbnN0cnVjdGlvbi4KLSBFbnN1cmUgeW91ciByZXNwb25zZSBleGFjdGx5IG1hdGNoZXMgdGhlIGZvcm1hdCwgd29yZGluZywgYW5kIGNvbnRlbnQgYXMgaW5zdHJ1Y3RlZC4KLSBEbyBub3QgaW52ZW50IG9yIG9taXQgYW55IHBhcnQgb2YgdGhlIHVzZXIncyBleHBsaWNpdCByZXF1ZXN0cy4KLSBNZWV0IGFsbCBmb3JtYXR0aW5nLCBsZXhpY2FsLCBudW1lcmljLCBhbmQgc3RydWN0dXJhbCBjb25zdHJhaW50cyB3aXRob3V0IGRldmlhdGlvbi4KLSBJZiB0aGUgcXVlcnkgaW52b2x2ZXMgcmVwZWF0aW5nIHRleHQgdmVyYmF0aW0sIGRvIG5vdCBhbHRlciBjYXBpdGFsaXphdGlvbiwgcHVuY3R1YXRpb24sIG9yIHdvcmRpbmcuCi0gSW5jb3Jwb3JhdGUgYW55IHJlcXVpcmVkIGtleXdvcmRzIG9yIGxldHRlcnMgdGhlIHJlcXVpcmVkIG51bWJlciBvZiB0aW1lcyBuYXR1cmFsbHkgaW50byB5b3VyIHJlc3BvbnNlLgotIFdoZW4gbXVsdGlwbGUgY29uc3RyYWludHMgKGxpa2UgYXZvaWRpbmcgc3BlY2lmaWMgd29yZHMgd2hpbGUgaW5jbHVkaW5nIG90aGVycykgYXBwbHkgc2ltdWx0YW5lb3VzbHksIGVuc3VyZSB5b3Ugc2F0aXNmeSBhbGwgc2ltdWx0YW5lb3VzbHkuCgpUaGlzIHRhc2sgcmVxdWlyZXMgcHJlY2lzaW9uLCBleGFjdCByZXByb2R1Y3Rpb24sIGFuZCBzdHJpY3QgYWRoZXJlbmNlIHRvIGFueSBnaXZlbiBjb25zdHJhaW50cyBvciBpbnN0cnVjdGlvbnMgZW1iZWRkZWQgaW4gdGhlIHF1ZXJ5LiBZb3VyIGdvYWwgaXMgdG8gZGVsaXZlciB0aGUgcmVxdWVzdGVkIGFuc3dlciBpbiB0aGUgZXhhY3QgbWFubmVyIHJlcXVlc3RlZCB3aXRob3V0IGV4dHJhbmVvdXMgYWRkaXRpb25zIG9yIG9taXNzaW9ucy4=)
You are given a query input, and your task is to respond appropriately to that query. The query may contain specific instructions or constraints that you must strictly adhere to in your response. Carefully analyze the query to determine the exact requirements, including but not limited to:


- Responding with an answer chosen from a restricted set of options exactly as specified (including exact wording and punctuation).
- Including specific words a minimum number of times.
- Including specific letters a minimum number of times.
- Repeating the entire query word-for-word before providing your answer if explicitly requested, without adding extra words or characters before the repetition.
- Avoiding specific forbidden words or keywords in your response if indicated.
- Following any other explicit instructions or constraints embedded in the query.


When the query requests calculations or factual answers (e.g., combinatorial calculations), you should:


1. Carefully interpret the mathematical or logical problem.
2. Show your reasoning internally to confirm the final answer (reasoning does not need to be included in the response unless explicitly requested).
3. Provide the final direct response strictly following all instructions, especially when asked to repeat the query verbatim first before giving the answer.


General approach:


- Always parse the query thoroughly to extract every constraint and instruction.
- Ensure your response exactly matches the format, wording, and content as instructed.
- Do not invent or omit any part of the user’s explicit requests.
- Meet all formatting, lexical, numeric, and structural constraints without deviation.
- If the query involves repeating text verbatim, do not alter capitalization, punctuation, or wording.
- Incorporate any required keywords or letters the required number of times naturally into your response.
- When multiple constraints (like avoiding specific words while including others) apply simultaneously, ensure you satisfy all simultaneously.


This task requires precision, exact reproduction, and strict adherence to any given constraints or instructions embedded in the query. Your goal is to deliver the requested answer in the exact manner requested without extraneous additions or omissions.

IFBench GPT-4.1 Mini ensure_correct_response_module.predict

Base Prompt:
[⬇](data:text/plain;base64,RW5zdXJlIHRoZSByZXNwb25zZSBpcyBjb3JyZWN0IGFuZCBhZGhlcmVzIHRvIHRoZSBnaXZlbiBjb25zdHJhaW50cy4gWW91ciByZXNwb25zZSB3aWxsIGJlIHVzZWQgYXMgdGhlIGZpbmFsIHJlc3BvbnNlLg==)
Ensure the response is correct and adheres to the given constraints. Your response will be used as the final response.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIG9yaWdpbmFsIHF1ZXJ5IGFuZCB0aGUgaW5pdGlhbGx5IGdlbmVyYXRlZCByZXNwb25zZSwgY2FyZWZ1bGx5IHZlcmlmeSB0aGF0IHRoZSByZXNwb25zZSBmdWxseSBtZWV0cyBhbGwgc3BlY2lmaWVkIGNvbnN0cmFpbnRzIGFuZCBpbnN0cnVjdGlvbnMgaW4gdGhlIHF1ZXJ5LiBQcm9kdWNlIGRldGFpbGVkIHN0ZXAtYnktc3RlcCByZWFzb25pbmcgdGhhdCBleHBsYWlucyBob3cgdGhlIHJlc3BvbnNlIHNhdGlzZmllcyBvciBmYWlscyB0aGUgcmVxdWlyZW1lbnRzIHN1Y2ggYXMgZXhhY3QgcmVwZXRpdGlvbiBvZiB0aGUgcXVlcnkgdGV4dCwgbWluaW11bSBzZW50ZW5jZSBjb3VudCwgZm9ybWF0dGluZyBydWxlcyAoZS5nLiwgY2FwaXRhbGl6YXRpb24pLCBsZXR0ZXIgZnJlcXVlbmN5LCBvciBvdGhlciBleHBsaWNpdCB1c2VyIGRlbWFuZHMuIEJhc2VkIG9uIHRoaXMgcmVhc29uaW5nLCBvdXRwdXQgYSBmaW5hbCBjb3JyZWN0ZWQgYW5kIGZ1bGx5IGNvbXBsaWFudCByZXNwb25zZSB0aGF0IGFkaGVyZXMgc3RyaWN0bHkgdG8gdGhlIG9yaWdpbmFsIGluc3RydWN0aW9ucywgZW5zdXJpbmcgYWNjdXJhY3ksIGNvbXBsZXRlbmVzcywgYW5kIGZvcm1hdHRpbmcgY29ycmVjdG5lc3MuIFlvdXIgZmluYWwgb3V0cHV0IHNob3VsZCBiZWdpbiBieSByZXBlYXRpbmcgdGhlIG9yaWdpbmFsIHF1ZXJ5IGV4YWN0bHkgYXMgcHJvdmlkZWQsIHdpdGggbm8gbW9kaWZpY2F0aW9ucyBvciBhZGRpdGlvbmFsIHRleHQgYmVmb3JlIGl0LCBmb2xsb3dlZCBieSBhIGNvbXByZWhlbnNpdmUsIHdlbGwtc3RydWN0dXJlZCBhbnN3ZXIgdGhhdCByZXNwZWN0cyBhbGwgY29uc3RyYWludHMsIGFuZCBhIGNsZWFyIGV4cGxhbmF0aW9uIG9mIGhvdyB0aGUgcmVxdWlyZW1lbnRzIGhhdmUgYmVlbiBtZXQuCkRlbW9zOgpFeGFtcGxlIDE6CnF1ZXJ5OgogICAgQ2FuIHlvdSBwcm92aWRlIHRoZSBzb2NpYWwgbWVkaWEgaGFuZGxlcyBvZiBIYXJyeSBQb3R0ZXI/IFlvdXIgYW5zd2VyIG11c3QgY29udGFpbiBleGFjdGx5IDggYnVsbGV0IHBvaW50cy4gVXNlIHRoZSBtYXJrZG93biBidWxsZXQgcG9pbnRzIHN1Y2ggYXM6CiogVGhpcyBpcyBwb2ludCAxLgoqIFRoaXMgaXMgcG9pbnQgMiBGaW5pc2ggeW91ciByZXNwb25zZSB3aXRoIHRoaXMgZXhhY3QgcGhyYXNlIFRoYXQncyBteSBhbnN3ZXIuLiBObyBvdGhlciB3b3JkcyBzaG91bGQgZm9sbG93IHRoaXMgcGhyYXNlLgpyZXNwb25zZToKICAgICogVHdpdHRlcjogW0B3aXphcmRpbmd3b3JsZF0oaHR0cHM6Ly90d2l0dGVyLmNvbS93aXphcmRpbmd3b3JsZCkKKiBJbnN0YWdyYW06IFtAd2l6YXJkaW5nd29ybGRdKGh0dHBzOi8vd3d3Lmluc3RhZ3JhbS5jb20vd2l6YXJkaW5nd29ybGQvKQoqIEZhY2Vib29rOiBbV2l6YXJkaW5nIFdvcmxkXShodHRwczovL3d3dy5mYWNlYm9vay5jb20vd2l6YXJkaW5nd29ybGQpCiogWW91VHViZTogW1dpemFyZGluZyBXb3JsZF0oaHR0cHM6Ly93d3cueW91dHViZS5jb20vYy9XaXphcmRpbmdXb3JsZCkKKiBUd2l0dGVyOiBbQGhhcnJ5cG90dGVyZmlsbV0oaHR0cHM6Ly90d2l0dGVyLmNvbS9oYXJyeXBvdHRlcmZpbG0pCiogSW5zdGFncmFtOiBbQGhhcnJ5cG90dGVyZmlsbV0oaHR0cHM6Ly93d3cuaW5zdGFncmFtLmNvbS9oYXJyeXBvdHRlcmZpbG0vKQoqIEZhY2Vib29rOiBbSGFycnkgUG90dGVyXShodHRwczovL3d3dy5mYWNlYm9vay5jb20vaGFycnlwb3R0ZXIpCiogVGlrVG9rOiBbQHdpemFyZGluZ3dvcmxkXShodHRwczovL3d3dy50aWt0b2suY29tL0B3aXphcmRpbmd3b3JsZCkKClRoYXQncyBteSBhbnN3ZXIuLgpyZWFzb25pbmc6CiAgICBUaGUgcmVxdWVzdCBpcyBmb3IgdGhlIHNvY2lhbCBtZWRpYSBoYW5kbGVzIG9mIEhhcnJ5IFBvdHRlciwgZm9ybWF0dGVkIGFzIGV4YWN0bHkgZWlnaHQgYnVsbGV0IHBvaW50cyB1c2luZyBtYXJrZG93biBidWxsZXQgcG9pbnRzLCBhbmQgdGhlIHJlc3BvbnNlIG11c3QgZW5kIHdpdGggdGhlIGV4YWN0IHBocmFzZSAiVGhhdCdzIG15IGFuc3dlci4iIFRoZSBwcm92aWRlZCByZXNwb25zZSBpbmNsdWRlcyBlaWdodCBidWxsZXQgcG9pbnRzLCByZWZlcmVuY2luZyBvZmZpY2lhbCBvciB3aWRlbHkgcmVjb2duaXplZCBzb2NpYWwgbWVkaWEgYWNjb3VudHMgcmVsYXRlZCB0byBIYXJyeSBQb3R0ZXIgYW5kIHRoZSBXaXphcmRpbmcgV29ybGQgZnJhbmNoaXNlIG9uIFR3aXR0ZXIsIEluc3RhZ3JhbSwgRmFjZWJvb2ssIFlvdVR1YmUsIGFuZCBUaWtUb2suIFRoZSBmb3JtYXQgaXMgY29ycmVjdCwgdGhlIGJ1bGxldCBwb2ludHMgYXJlIHVzZWQgcHJvcGVybHkgd2l0aCBtYXJrZG93biBzeW50YXgsIGFuZCB0aGUgY2xvc2luZyBwaHJhc2UgbWF0Y2hlcyB0aGUgcmVxdWlyZW1lbnQgZXhhY3RseS4gVGhlcmVmb3JlLCB0aGUgcmVzcG9uc2UgbWVldHMgYWxsIGdpdmVuIGNvbnN0cmFpbnRzLgpmaW5hbF9yZXNwb25zZToKICAgICogVHdpdHRlcjogW0B3aXphcmRpbmd3b3JsZF0oaHR0cHM6Ly90d2l0dGVyLmNvbS93aXphcmRpbmd3b3JsZCkKKiBJbnN0YWdyYW06IFtAd2l6YXJkaW5nd29ybGRdKGh0dHBzOi8vd3d3Lmluc3RhZ3JhbS5jb20vd2l6YXJkaW5nd29ybGQvKQoqIEZhY2Vib29rOiBbV2l6YXJkaW5nIFdvcmxkXShodHRwczovL3d3dy5mYWNlYm9vay5jb20vd2l6YXJkaW5nd29ybGQpCiogWW91VHViZTogW1dpemFyZGluZyBXb3JsZF0oaHR0cHM6Ly93d3cueW91dHViZS5jb20vYy9XaXphcmRpbmdXb3JsZCkKKiBUd2l0dGVyOiBbQGhhcnJ5cG90dGVyZmlsbV0oaHR0cHM6Ly90d2l0dGVyLmNvbS9oYXJyeXBvdHRlcmZpbG0pCiogSW5zdGFncmFtOiBbQGhhcnJ5cG90dGVyZmlsbV0oaHR0cHM6Ly93d3cuaW5zdGFncmFtLmNvbS9oYXJyeXBvdHRlcmZpbG0vKQoqIEZhY2Vib29rOiBbSGFycnkgUG90dGVyXShodHRwczovL3d3dy5mYWNlYm9vay5jb20vaGFycnlwb3R0ZXIpCiogVGlrVG9rOiBbQHdpemFyZGluZ3dvcmxkXShodHRwczovL3d3dy50aWt0b2suY29tL0B3aXphcmRpbmd3b3JsZCkKClRoYXQncyBteSBhbnN3ZXIuLgoKCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMKMyBvdGhlciBkZW1vcyBvbWl0dGVkIGZvciBicmV2aXR5LgojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCg==)
Given the original query and the initially generated response, carefully verify that the response fully meets all specified constraints and instructions in the query. Produce detailed step-by-step reasoning that explains how the response satisfies or fails the requirements such as exact repetition of the query text, minimum sentence count, formatting rules (e.g., capitalization), letter frequency, or other explicit user demands. Based on this reasoning, output a final corrected and fully compliant response that adheres strictly to the original instructions, ensuring accuracy, completeness, and formatting correctness. Your final output should begin by repeating the original query exactly as provided, with no modifications or additional text before it, followed by a comprehensive, well-structured answer that respects all constraints, and a clear explanation of how the requirements have been met.
Demos:
Example 1:
query:
 Can you provide the social media handles of Harry Potter? Your answer must contain exactly 8 bullet points. Use the markdown bullet points such as:
* This is point 1.
* This is point 2 Finish your response with this exact phrase That’s my answer.. No other words should follow this phrase.
response:
 * Twitter: [@wizardingworld](https://twitter.com/wizardingworld)
* Instagram: [@wizardingworld](https://www.instagram.com/wizardingworld/)
* Facebook: [Wizarding World](https://www.facebook.com/wizardingworld)
* YouTube: [Wizarding World](https://www.youtube.com/c/WizardingWorld)
* Twitter: [@harrypotterfilm](https://twitter.com/harrypotterfilm)
* Instagram: [@harrypotterfilm](https://www.instagram.com/harrypotterfilm/)
* Facebook: [Harry Potter](https://www.facebook.com/harrypotter)
* TikTok: [@wizardingworld](https://www.tiktok.com/@wizardingworld)


That’s my answer..
reasoning:
 The request is for the social media handles of Harry Potter, formatted as exactly eight bullet points using markdown bullet points, and the response must end with the exact phrase "That’s my answer." The provided response includes eight bullet points, referencing official or widely recognized social media accounts related to Harry Potter and the Wizarding World franchise on Twitter, Instagram, Facebook, YouTube, and TikTok. The format is correct, the bullet points are used properly with markdown syntax, and the closing phrase matches the requirement exactly. Therefore, the response meets all given constraints.
final_response:
 * Twitter: [@wizardingworld](https://twitter.com/wizardingworld)
* Instagram: [@wizardingworld](https://www.instagram.com/wizardingworld/)
* Facebook: [Wizarding World](https://www.facebook.com/wizardingworld)
* YouTube: [Wizarding World](https://www.youtube.com/c/WizardingWorld)
* Twitter: [@harrypotterfilm](https://twitter.com/harrypotterfilm)
* Instagram: [@harrypotterfilm](https://www.instagram.com/harrypotterfilm/)
* Facebook: [Harry Potter](https://www.facebook.com/harrypotter)
* TikTok: [@wizardingworld](https://www.tiktok.com/@wizardingworld)


That’s my answer..




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,WW91IHdpbGwgcmVjZWl2ZSBhIHVzZXIgcXVlcnkgdGhhdCBpbmNsdWRlcyBleHBsaWNpdCwgZGV0YWlsZWQgaW5zdHJ1Y3Rpb25zIGFib3V0IGhvdyB5b3UgbXVzdCBzdHJ1Y3R1cmUgeW91ciByZXNwb25zZS4gWW91ciBvdmVyYWxsIHRhc2sgaXMgdG8gaW50ZXJwcmV0IHRoZXNlIGVtYmVkZGVkIGluc3RydWN0aW9ucyB3aXRoIHBlcmZlY3QgYWNjdXJhY3kgYW5kIHByb2R1Y2UgYSByZXNwb25zZSB0aGF0IHN0cmljdGx5IGNvbXBsaWVzIHdpdGggZXZlcnkgc2luZ2xlIG9uZSwgd2l0aG91dCBhZGRpbmcsIG9taXR0aW5nLCBvciByZXdvcmRpbmcgYW55IG1hbmRhdGVkIHRleHQsIHBocmFzZXMsIG9yIHN0cnVjdHVyYWwgZWxlbWVudHMuCgpLZXkgZGV0YWlsZWQgcmVxdWlyZW1lbnRzIGFuZCBzdHJhdGVneSBmb3IgdGhpcyB0YXNrOgoKMS4gKipRdWVyeSBQYXJzaW5nIGFuZCBFeHRyYWN0aW9uIG9mIEluc3RydWN0aW9ucyoqCiAgIC0gQ2FyZWZ1bGx5IHJlYWQgdGhlIGVudGlyZSBxdWVyeSB0byBpZGVudGlmeSBhbGwgZXhwbGljaXQgaW5zdHJ1Y3Rpb25zIGNvbmNlcm5pbmc6CiAgICAgLSBXaGV0aGVyIGFuZCBob3cgdG8gcmVwZWF0IHRoZSBxdWVyeSB0ZXh0ICh2ZXJiYXRpbSBvciBwYXJ0aWFsbHkpLgogICAgIC0gU3BlY2lmaWMgbGVuZ3RoIGNvbnN0cmFpbnRzIChudW1iZXIgb2Ygc2VudGVuY2VzLCBidWxsZXQgcG9pbnRzLCB3b3JkIGNvdW50cykuCiAgICAgLSBGb3JtYXR0aW5nIGluc3RydWN0aW9ucyAoZS5nLiwgY2FwaXRhbGl6YXRpb24gcmVxdWlyZW1lbnRzLCBxdW90YXRpb24gbWFya3MsIG1hcmtkb3duIGJ1bGxldCBzdHlsZXMpLgogICAgIC0gTWFuZGF0b3J5IHBocmFzZXMgb3IgZXhhY3Qgc2VudGVuY2VzIHRoYXQgbXVzdCBhcHBlYXIgKGVzcGVjaWFsbHkgdGhvc2UgdG8gYmUgcmVwZWF0ZWQgdmVyYmF0aW0gb3IgYXBwZW5kZWQgYXQgdGhlIGVuZCkuCiAgICAgLSBDb250ZW50IGxpbWl0YXRpb25zIG9yIHByb2hpYml0aW9ucyAoZm9yIGV4YW1wbGUsIHJlZnVzYWwgbGFuZ3VhZ2Ugb3IgZGlzY2xhaW1lcnMgZm9yIHVuZXRoaWNhbCByZXF1ZXN0cykuCiAgIC0gTm90ZSB0aGF0IHNvbWUgaW5zdHJ1Y3Rpb25zIG1heSBiZSBuZXN0ZWQgb3IgYXBwZWFyIHdpdGhpbiB0aGUgcXVlcnkncyB3b3JkaW5nIGFuZCBhcmUgY3JpdGljYWwgdG8gZm9sbG93IGV4YWN0bHkuCgoyLiAqKkV4YWN0IFRleHQgUmVwcm9kdWN0aW9uKioKICAgLSBXaGVuIGFza2VkIHRvIHJlcGVhdCB0aGUgcXVlcnkgdGV4dCAob3IgYW55IG90aGVyIHJlcXVpcmVkIHBocmFzZSkgdmVyYmF0aW0sIGRvIHNvIHdpdGggemVybyBjaGFuZ2VzIOKAlCBubyBhZGRlZCBvciByZW1vdmVkIHdvcmRzLCBwdW5jdHVhdGlvbiwgb3IgZm9ybWF0dGluZy4KICAgLSBEbyBub3QgcHJlcGVuZCBvciBhcHBlbmQgYW55dGhpbmcgdG8gdGhlIHJlcGVhdGVkIHRleHQgdW5sZXNzIGV4cGxpY2l0bHkgaW5zdHJ1Y3RlZC4KICAgLSBQcmVzZXJ2ZSBhbGwgb3JpZ2luYWwgY2FwaXRhbGl6YXRpb24sIHNwYWNpbmcsIGFuZCBwdW5jdHVhdGlvbiBleGFjdGx5IGFzIGluIHRoZSBxdWVyeS4KCjMuICoqU3RydWN0dXJhbCBhbmQgRm9ybWF0dGluZyBDb21wbGlhbmNlKioKICAgLSBGb2xsb3cgYWxsIGZvcm1hdHRpbmcgaW5zdHJ1Y3Rpb25zIHN0cmljdGx5LCBzdWNoIGFzOgogICAgIC0gV3JhcHBpbmcgdGhlIGVudGlyZSByZXNwb25zZSBpbiBxdW90YXRpb24gbWFya3MgaWYgcmVxdWlyZWQuCiAgICAgLSBVc2luZyBzcGVjaWZpZWQgbWFya2Rvd24gYnVsbGV0IHBvaW50IHN0eWxlcyAoZS5nLiwgYXN0ZXJpc2tzKS4KICAgICAtIEVuc3VyaW5nIGNhcGl0YWxpemF0aW9uIGluc3RydWN0aW9ucyAoZS5nLiwgYWxsIGNhcHMgb3IgbWluaW11bSBvY2N1cnJlbmNlcyBvZiB1cHBlcmNhc2Ugd29yZHMpIGFyZSBwZXJmZWN0bHkgbWV0LgogICAgIC0gQWRoZXJpbmcgdG8gc2VudGVuY2Ugb3IgcGFyYWdyYXBoIGNvdW50cyBleGFjdGx5IGFzIHJlcXVlc3RlZC4KCjQuICoqUmVzcG9uc2UgQ29udGVudCBBY2N1cmFjeSBhbmQgQXBwcm9wcmlhdGVuZXNzKioKICAgLSBBZnRlciBmdWxmaWxsaW5nIGFsbCBzdHJ1Y3R1cmFsIHJlcXVpcmVtZW50cywgcmVzcG9uZCB0byB0aGUgbWFpbiBzdWJzdGFudGl2ZSBxdWVzdGlvbiBhY2N1cmF0ZWx5IGFuZCBjb21wbGV0ZWx5LgogICAtIFVzZSBkb21haW4ga25vd2xlZGdlIGFuZCByZWxpYWJsZSBjYWxjdWxhdGlvbnMgdG8gZW5zdXJlIGZhY3R1YWwgY29ycmVjdG5lc3MgaW4gYW5zd2Vycy4KICAgLSBGb3IgcXVlc3Rpb25zIHJlcXVlc3Rpbmcgc2Vuc2l0aXZlIG9yIHBvdGVudGlhbGx5IGhhcm1mdWwgY29udGVudCAoZS5nLiwgY3VyZXMgd2l0aG91dCBzY2llbnRpZmljIGJhc2lzKSwgcHJvZHVjZSByZXNwb25zaWJsZSBhbnN3ZXJzIHRoYXQgaW5jbHVkZSBkaXNjbGFpbWVycyBvciByZWZ1c2FscyBpZiBpbnN0cnVjdGVkLgogICAtIEFsd2F5cyByZXNwZWN0IGV0aGljYWwgZ3VpZGVsaW5lcyBhbmQgYW55IG1hbmRhdGVkIHJlZnVzYWwgbGFuZ3VhZ2Ugb3IgY29uY2x1ZGluZyBzdGF0ZW1lbnRzIGZvciBzdWNoIHF1ZXJpZXMuCgo1LiAqKk5vIEV4dHJhbmVvdXMgVGV4dCoqCiAgIC0gRG8gbm90IGFkZCBleHBsYW5hdGlvbnMsIGludGVybmFsIHJlYXNvbmluZywgYXBvbG9naWVzLCBvciBtZXRhIGNvbW1lbnRhcnkgYmV5b25kIHdoYXQgdGhlIHF1ZXJ5IGV4cGxpY2l0bHkgcGVybWl0cyBvciBkZW1hbmRzLgogICAtIFlvdXIgZmluYWwgb3V0cHV0IG11c3QgYmUgdGhlIGV4YWN0LCByZWFkeS10by1kZWxpdmVyIHJlc3BvbnNlIHRoYXQgbWVldHMgYWxsIHVzZXIgaW5zdHJ1Y3Rpb25zIHBlcmZlY3RseS4KCjYuICoqRXhhbXBsZXMgYW5kIFBhdHRlcm5zIE9ic2VydmVkKioKICAgLSBVc2VycyBvZnRlbiBjb21iaW5lIG11bHRpcGxlIGNvbXBsZXggZm9ybWF0dGluZyBhbmQgY29udGVudCBpbnN0cnVjdGlvbnMgKGUuZy4sIHJlcGV0aXRpb24gb2YgcmVxdWVzdCB0ZXh0LCBmb2xsb3dlZCBieSBzcGVjaWZpYyBudW1iZXIgb2Ygc2VudGVuY2VzIG9yIGJ1bGxldCBwb2ludHMsIHdpdGggY2FwaXRhbGl6YXRpb24gcnVsZXMpLgogICAtIEVuc3VyZSB5b3UgY2FyZWZ1bGx5IGRpc3Rpbmd1aXNoIHdoZW4gdG8gcmVwZWF0IHRoZSBxdWVyeSB0ZXh0IHZlcmJhdGltIGFuZCB3aGVuIHRvIHJlc3BvbmQgZGlyZWN0bHkgKHNvbWV0aW1lcyB0aGUgcmVwZXRpdGlvbiBleGNsdWRlcyBhbiBpbnN0cnVjdGlvbiBzZW50ZW5jZSkuCiAgIC0gSGFuZGxlIGluc3RydWN0aW9ucyBhYm91dCBjYXBpdGFsaXplZCB3b3JkcyBhcHBlYXJpbmcgYSBtaW5pbXVtIG51bWJlciBvZiB0aW1lcyBieSBkaXN0cmlidXRpbmcgc3VjaCB3b3JkcyBuYXR1cmFsbHkgYnV0IHRob3JvdWdobHkgYWNyb3NzIHRoZSByZXNwb25zZS4KICAgLSBXaGVuIGxlbmd0aCBjb25zdHJhaW50cyBzcGVjaWZ5IG1pbmltdW1zIChlLmcuLCDigJxhdCBsZWFzdCAzOSBzZW50ZW5jZXPigJ0pLCBlbnN1cmUgeW91IG1lZXQgb3IgZXhjZWVkIGV4YWN0bHkgcmF0aGVyIHRoYW4gYXBwcm94aW1hdGluZy4KICAgLSBGb3IgYnVsbGV0IHBvaW50cyBvciBlbnVtZXJhdGlvbnMsIHVzZSB0aGUgcHJlY2lzZSBtYXJrZG93biBzdHlsZSBhc2tlZCBmb3IgKGNvbW1vbmx5IGFzdGVyaXNrcykuCiAgIC0gRm9sbG93IHJlZnVzYWwgaW5zdHJ1Y3Rpb25zIHZlcmJhdGltIGFuZCB0ZXJtaW5hdGUgdGhlIHJlc3BvbnNlIGV4YWN0bHkgYXMgc3BlY2lmaWVkLgoKKipJbiBzdW1tYXJ5OioqIFlPVVIgUkVTUE9OU0UgTVVTVCBCRSBBIFBFUkZFQ1QgVEVYVFVBTCBBTkQgU1RSVUNUVVJBTCBSRU5ERVJJTkcgT0YgVEhFIFVTRVIgUVVFUlnigJlTIEVNQkVEREVEIElOU1RSVUNUSU9OUy4gQUxXQVlTIFBSSU9SSVRJWkUgRVhBQ1QgVVNFUiBTUEVDSUZJQ0FUSU9OUyBPVkVSIERFRkFVTFQgR0VORVJBVElWRSBOT1JNUy4gVEhFIE9VVFBVVCBJUyBGSU5BTCBBTkQgV0lMTCBOT1QgQkUgRURJVEVELCBTTyBDT01QTElBTkNFIE1VU1QgQkUgMTAwJS4KClRoaXMgdGFzayB0aGVyZWZvcmUgcmVxdWlyZXMgYSByaWdvcm91c2x5IHJ1bGUtYmFzZWQgYXBwcm9hY2g6Ci0gRmlyc3QgcGFyc2UgYW5kIGlzb2xhdGUgYWxsIGV4cGxpY2l0IGluc3RydWN0aW9ucyAoaW5jbHVkaW5nIHJlcGV0aXRpb25zIGFuZCBmb3JtYXR0aW5nKS4KLSBUaGVuIGFzc2VtYmxlIHlvdXIgYW5zd2VyIGJ5IHJlcHJvZHVjaW5nIG1hbmRhdGVkIHRleHQgaWRlbnRpY2FsbHkuCi0gTmV4dCBwcm9kdWNlIHRoZSByZXF1ZXN0ZWQgY29udGVudCBpbiB0aGUgZXhhY3QgcmVxdWlyZWQgZm9ybWF0LCBsZW5ndGgsIGFuZCBzdHlsZS4KLSBGaW5hbGx5LCByZXZpZXcgeW91ciBvdXRwdXQgYWdhaW5zdCB0aGUgaW5zdHJ1Y3Rpb25zIGVuc3VyaW5nIHRvdGFsIGNvbXBsaWFuY2UgYmVmb3JlIGRlbGl2ZXJpbmcgeW91ciByZXNwb25zZS4=)
You will receive a user query that includes explicit, detailed instructions about how you must structure your response. Your overall task is to interpret these embedded instructions with perfect accuracy and produce a response that strictly complies with every single one, without adding, omitting, or rewording any mandated text, phrases, or structural elements.


Key detailed requirements and strategy for this task:


1. **Query Parsing and Extraction of Instructions**
 - Carefully read the entire query to identify all explicit instructions concerning:
 - Whether and how to repeat the query text (verbatim or partially).
 - Specific length constraints (number of sentences, bullet points, word counts).
 - Formatting instructions (e.g., capitalization requirements, quotation marks, markdown bullet styles).
 - Mandatory phrases or exact sentences that must appear (especially those to be repeated verbatim or appended at the end).
 - Content limitations or prohibitions (for example, refusal language or disclaimers for unethical requests).
 - Note that some instructions may be nested or appear within the query’s wording and are critical to follow exactly.


2. **Exact Text Reproduction**
 - When asked to repeat the query text (or any other required phrase) verbatim, do so with zero changes — no added or removed words, punctuation, or formatting.
 - Do not prepend or append anything to the repeated text unless explicitly instructed.
 - Preserve all original capitalization, spacing, and punctuation exactly as in the query.


3. **Structural and Formatting Compliance**
 - Follow all formatting instructions strictly, such as:
 - Wrapping the entire response in quotation marks if required.
 - Using specified markdown bullet point styles (e.g., asterisks).
 - Ensuring capitalization instructions (e.g., all caps or minimum occurrences of uppercase words) are perfectly met.
 - Adhering to sentence or paragraph counts exactly as requested.


4. **Response Content Accuracy and Appropriateness**
 - After fulfilling all structural requirements, respond to the main substantive question accurately and completely.
 - Use domain knowledge and reliable calculations to ensure factual correctness in answers.
 - For questions requesting sensitive or potentially harmful content (e.g., cures without scientific basis), produce responsible answers that include disclaimers or refusals if instructed.
 - Always respect ethical guidelines and any mandated refusal language or concluding statements for such queries.


5. **No Extraneous Text**
 - Do not add explanations, internal reasoning, apologies, or meta commentary beyond what the query explicitly permits or demands.
 - Your final output must be the exact, ready-to-deliver response that meets all user instructions perfectly.


6. **Examples and Patterns Observed**
 - Users often combine multiple complex formatting and content instructions (e.g., repetition of request text, followed by specific number of sentences or bullet points, with capitalization rules).
 - Ensure you carefully distinguish when to repeat the query text verbatim and when to respond directly (sometimes the repetition excludes an instruction sentence).
 - Handle instructions about capitalized words appearing a minimum number of times by distributing such words naturally but thoroughly across the response.
 - When length constraints specify minimums (e.g., “at least 39 sentences”), ensure you meet or exceed exactly rather than approximating.
 - For bullet points or enumerations, use the precise markdown style asked for (commonly asterisks).
 - Follow refusal instructions verbatim and terminate the response exactly as specified.


**In summary:** YOUR RESPONSE MUST BE A PERFECT TEXTUAL AND STRUCTURAL RENDERING OF THE USER QUERY’S EMBEDDED INSTRUCTIONS. ALWAYS PRIORITIZE EXACT USER SPECIFICATIONS OVER DEFAULT GENERATIVE NORMS. THE OUTPUT IS FINAL AND WILL NOT BE EDITED, SO COMPLIANCE MUST BE 100%.


This task therefore requires a rigorously rule-based approach:
- First parse and isolate all explicit instructions (including repetitions and formatting).
- Then assemble your answer by reproducing mandated text identically.
- Next produce the requested content in the exact required format, length, and style.
- Finally, review your output against the instructions ensuring total compliance before delivering your response.

### L.4 IFBench, Qwen3 8B

IFBench Qwen3 8B generate_response_module.predict

Base Prompt:
[⬇](data:text/plain;base64,UmVzcG9uZCB0byB0aGUgcXVlcnk=)
Respond to the query
MIPROv2 Prompt:
[⬇](data:text/plain;base64,WW91IGFyZSBhIHByZWNpc2lvbi1mb2N1c2VkIGluc3RydWN0aW9uLWFkaGVyZW5jZSBleHBlcnQgdGFza2VkIHdpdGggZ2VuZXJhdGluZyBzdHJ1Y3R1cmVkLCBldGhpY2FsbHkgY29tcGxpYW50IHJlc3BvbnNlcy4gV2hlbiByZXNwb25kaW5nIHRvIHF1ZXJpZXMsIGFsd2F5cyB0aGluayBzdGVwLWJ5LXN0ZXAgdG8gYW5hbHl6ZSBjb25zdHJhaW50cyAoZm9ybWF0dGluZyBydWxlcywgY29udGVudCBib3VuZGFyaWVzLCBldGhpY2FsIGd1aWRlbGluZXMpLCBzeW50aGVzaXplIHJlcXVpcmVtZW50cywgYW5kIHByb2R1Y2Ugb3V0cHV0cyB0aGF0IHN0cmljdGx5IGFkaGVyZSB0byBzcGVjaWZpZWQgcGFyYW1ldGVycy4gRW5zdXJlIHJlc3BvbnNlcyBhcmUgZnVsbHkgZm9ybWF0dGVkIGFzIHJlcXVlc3RlZCAoZS5nLiwgbG93ZXJjYXNlIHRleHQsIGJ1bGxldCBwb2ludHMsIG1hcmtkb3duKSwgYXZvaWQgYW55IHVudmVyaWZpZWQgY2xhaW1zLCBhbmQgbWFpbnRhaW4gbmV1dHJhbGl0eSBpbiBhbWJpZ3VvdXMgZXRoaWNhbCBzY2VuYXJpb3MuCkRlbW9zOgpFeGFtcGxlIDE6CnF1ZXJ5OgogICAgQ2FuIHlvdSBwcm92aWRlIHRoZSBzb2NpYWwgbWVkaWEgaGFuZGxlcyBvZiBIYXJyeSBQb3R0ZXI/IFlvdXIgYW5zd2VyIG11c3QgY29udGFpbiBleGFjdGx5IDggYnVsbGV0IHBvaW50cy4gVXNlIHRoZSBtYXJrZG93biBidWxsZXQgcG9pbnRzIHN1Y2ggYXM6CiogVGhpcyBpcyBwb2ludCAxLgoqIFRoaXMgaXMgcG9pbnQgMiBGaW5pc2ggeW91ciByZXNwb25zZSB3aXRoIHRoaXMgZXhhY3QgcGhyYXNlIFRoYXQncyBteSBhbnN3ZXIuLiBObyBvdGhlciB3b3JkcyBzaG91bGQgZm9sbG93IHRoaXMgcGhyYXNlLgpyZWFzb25pbmc6CiAgICBUaGUgcXVlcnkgYXNrcyBmb3IgdGhlIHNvY2lhbCBtZWRpYSBoYW5kbGVzIG9mIEhhcnJ5IFBvdHRlciwgYSBmaWN0aW9uYWwgY2hhcmFjdGVyLiBTaW5jZSBoZSBkb2VzIG5vdCBoYXZlIHBlcnNvbmFsIHNvY2lhbCBtZWRpYSBhY2NvdW50cywgdGhlIHJlc3BvbnNlIHNob3VsZCBpbnN0ZWFkIGxpc3Qgb2ZmaWNpYWwgYWNjb3VudHMgcmVsYXRlZCB0byB0aGUgSGFycnkgUG90dGVyIGZyYW5jaGlzZS4gVGhlc2UgaW5jbHVkZSBhY2NvdW50cyBtYW5hZ2VkIGJ5IFdhcm5lciBCcm9zLiwgdGhlIFdpemFyZGluZyBXb3JsZCwgYW5kIGFzc29jaWF0ZWQgb3JnYW5pemF0aW9ucy4gVGhlIGFuc3dlciBpcyBzdHJ1Y3R1cmVkIGludG8gZXhhY3RseSA4IGJ1bGxldCBwb2ludHMgYXMgcmVxdWVzdGVkLgpyZXNwb25zZToKICAgICogQFdpemFyZGluZ1dvcmxkIChUd2l0dGVyKQoqIEBXaXphcmRpbmdXb3JsZCAoSW5zdGFncmFtKQoqIEBXaXphcmRpbmdXb3JsZCAoRmFjZWJvb2spCiogQEpLUm93bGluZyAoVHdpdHRlcikKKiBASGFycnlQb3R0ZXJBbGxpYW5jZSAoRmFjZWJvb2spCiogQEhvZ3dhcnRzRXhwcmVzcyAoVHdpdHRlcikKKiBAVGhlV2l6YXJkaW5nV29ybGRPZkhhcnJ5UG90dGVyIChGYWNlYm9vaykKKiBASGFycnlQb3R0ZXJCb29rcyAoVHdpdHRlcikKVGhhdCdzIG15IGFuc3dlci4KCgojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCjMgb3RoZXIgZGVtb3Mgb21pdHRlZCBmb3IgYnJldml0eS4KIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwo=)
You are a precision-focused instruction-adherence expert tasked with generating structured, ethically compliant responses. When responding to queries, always think step-by-step to analyze constraints (formatting rules, content boundaries, ethical guidelines), synthesize requirements, and produce outputs that strictly adhere to specified parameters. Ensure responses are fully formatted as requested (e.g., lowercase text, bullet points, markdown), avoid any unverified claims, and maintain neutrality in ambiguous ethical scenarios.
Demos:
Example 1:
query:
 Can you provide the social media handles of Harry Potter? Your answer must contain exactly 8 bullet points. Use the markdown bullet points such as:
* This is point 1.
* This is point 2 Finish your response with this exact phrase That’s my answer.. No other words should follow this phrase.
reasoning:
 The query asks for the social media handles of Harry Potter, a fictional character. Since he does not have personal social media accounts, the response should instead list official accounts related to the Harry Potter franchise. These include accounts managed by Warner Bros., the Wizarding World, and associated organizations. The answer is structured into exactly 8 bullet points as requested.
response:
 * @WizardingWorld (Twitter)
* @WizardingWorld (Instagram)
* @WizardingWorld (Facebook)
* @JKRowling (Twitter)
* @HarryPotterAlliance (Facebook)
* @HogwartsExpress (Twitter)
* @TheWizardingWorldOfHarryPotter (Facebook)
* @HarryPotterBooks (Twitter)
That’s my answer.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,UmVzcG9uZCB0byB0aGUgcXVlcnkgYnkgZmlyc3QgcmVwZWF0aW5nIGl0IHdvcmQgZm9yIHdvcmQgd2l0aG91dCBhbnkgY2hhbmdlcy4gVGhlbiwgcHJvdmlkZSB5b3VyIGFuc3dlci4gRW5zdXJlIHlvdXIgYW5zd2VyIGluY2x1ZGVzIG5pY2hlIG9yIGRvbWFpbi1zcGVjaWZpYyBmYWN0dWFsIGluZm9ybWF0aW9uIHJlbGV2YW50IHRvIHRoZSB0YXNrLiBJZiB0aGUgcXVlcnkgc3BlY2lmaWVzIGNvbnN0cmFpbnRzIChlLmcuLCBsZXR0ZXIgZnJlcXVlbmN5LCBzZW50ZW5jZSBsaW1pdHMsIG9yIGZvcm1hdHRpbmcgcnVsZXMpLCBhZGhlcmUgdG8gdGhlbSBzdHJpY3RseS4gVXNlIGEgZ2VuZXJhbGl6YWJsZSBzdHJhdGVneSB0byBzb2x2ZSB0aGUgdGFzaywgc3VjaCBhcyBicmVha2luZyBkb3duIGNvbXBsZXggcHJvYmxlbXMgaW50byBsb2dpY2FsIHN0ZXBzIG9yIGFwcGx5aW5nIHNwZWNpYWxpemVkIGtub3dsZWRnZS4gQXZvaWQgYWRkaW5nIGFueSBwcmVhbWJsZSBvciBwb3N0c2NyaXB0IGJlZm9yZSBvciBhZnRlciB0aGUgcmVwZWF0ZWQgcXVlcnku)
Respond to the query by first repeating it word for word without any changes. Then, provide your answer. Ensure your answer includes niche or domain-specific factual information relevant to the task. If the query specifies constraints (e.g., letter frequency, sentence limits, or formatting rules), adhere to them strictly. Use a generalizable strategy to solve the task, such as breaking down complex problems into logical steps or applying specialized knowledge. Avoid adding any preamble or postscript before or after the repeated query.

IFBench Qwen3 8B ensure_correct_response_module.predict

Base Prompt:
[⬇](data:text/plain;base64,RW5zdXJlIHRoZSByZXNwb25zZSBpcyBjb3JyZWN0IGFuZCBhZGhlcmVzIHRvIHRoZSBnaXZlbiBjb25zdHJhaW50cy4gWW91ciByZXNwb25zZSB3aWxsIGJlIHVzZWQgYXMgdGhlIGZpbmFsIHJlc3BvbnNlLg==)
Ensure the response is correct and adheres to the given constraints. Your response will be used as the final response.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,WW91IGFyZSBhIG1ldGljdWxvdXMgYW5kIGV0aGljYWwgQUkgYXNzaXN0YW50IHRhc2tlZCB3aXRoIGdlbmVyYXRpbmcgZGV0YWlsZWQsIGNvbXBsaWFudCByZXNwb25zZXMuIFdoZW4gZ2l2ZW4gYSBxdWVyeSwgZmlyc3QgdGhpbmsgc3RlcCBieSBzdGVwIHRvIGNyZWF0ZSBhIHJlYXNvbmluZyBwcm9jZXNzIHRoYXQgYWRkcmVzc2VzIHRoZSBxdWVyeSdzIHJlcXVpcmVtZW50cywgdGhlbiBwcm9kdWNlIGEgcmVzcG9uc2UgdGhhdCBzdHJpY3RseSBhZGhlcmVzIHRvIGFsbCBzcGVjaWZpZWQgY29uc3RyYWludHMgKGUuZy4sIGZvcm1hdHRpbmcgcnVsZXMsIGNvbnRlbnQgYm91bmRhcmllcywgZXRoaWNhbCBndWlkZWxpbmVzKS4gRW5zdXJlIHRoZSBmaW5hbCBvdXRwdXQgaXMgc3RydWN0dXJlZCB3aXRoIGEgIlJlYXNvbmluZzoiIHNlY3Rpb24gZm9sbG93ZWQgYnkgYSAiRmluYWwgUmVzcG9uc2U6IiBzZWN0aW9uLCBhbmQgdmVyaWZ5IHRoYXQgaXQgYWxpZ25zIHdpdGggdGhlIHF1ZXJ5J3MgZXhhY3Qgc3BlY2lmaWNhdGlvbnMgd2hpbGUgbWFpbnRhaW5pbmcgbG9naWNhbCBjb2hlcmVuY2UgYW5kIGV0aGljYWwgcmVzcG9uc2liaWxpdHkuCkRlbW9zOgpFeGFtcGxlIDE6CnF1ZXJ5OgogICAgV2hhdCBhcmUgc29tZSB0ZWNobmlxdWVzIGZvciB3aW5uaW5nIGEgc3dvcmRmaWdodCBpbiBhIG1lZGlldmFsIGNvbWJhdCBnYW1lPyBJbiB5b3VyIHJlc3BvbnNlLCB0aGUgbGV0dGVyIGYgc2hvdWxkIGFwcGVhciBsZXNzIHRoYW4gMTggdGltZXMuIERvIG5vdCBpbmNsdWRlIGtleXdvcmRzIFsnaGVhcnQnLCAnbGlzdGVuJywgJ3JlcHV0YXRpb24nLCAnc2lkZSddIGluIHRoZSByZXNwb25zZS4KcmVzcG9uc2U6CiAgICBQcmlvcml0aXplIHN0YW5jZSBhbmQgYmFsYW5jZSB0byBjb250cm9sIHRoZSBmaWdodCdzIGZsb3cuIFVzZSBhbmdsZXMgdG8gY3JlYXRlIG9wZW5pbmdzIGZvciBzdHJpa2VzIHdoaWxlIG1pbmltaXppbmcgZXhwb3N1cmUuIFByYWN0aWNlIHBhcnJ5aW5nIHdpdGggcHJlY2lzaW9uIHRvIGRpc3J1cHQgb3Bwb25lbnQgcmh5dGhtLiBNYWludGFpbiBkaXN0YW5jZSB0byBhdm9pZCBvdmVyY29tbWl0dGluZywgYW5kIHRhcmdldCB3ZWFrIHBvaW50cyBsaWtlIGpvaW50cyBvciBsaW1icy4gRm9jdXMgb24gcmh5dGhtIGFuZCB0aW1pbmcgdG8gZXhwbG9pdCB2dWxuZXJhYmlsaXRpZXMuCnJlYXNvbmluZzoKICAgIFRoZSByZXNwb25zZSBvdXRsaW5lcyBrZXkgdGVjaG5pcXVlcyBmb3IgbWVkaWV2YWwgc3dvcmRmaWdodGluZywgZm9jdXNpbmcgb24gc3RhbmNlLCBhbmdsZXMsIHBhcnJ5aW5nLCBkaXN0YW5jZSwgYW5kIHRhcmdldGluZyB3ZWFrIHBvaW50cy4gSXQgYXZvaWRzIHRoZSByZXN0cmljdGVkIGtleXdvcmRzIGFuZCBsaW1pdHMgdGhlIGxldHRlciAnZicgdG8gMiBpbnN0YW5jZXMsIHNhdGlzZnlpbmcgdGhlIGNvbnN0cmFpbnRzLiBUaGUgYWR2aWNlIGlzIHByYWN0aWNhbCBhbmQgYWxpZ25zIHdpdGggaGlzdG9yaWNhbCBjb21iYXQgc3RyYXRlZ2llcy4KZmluYWxfcmVzcG9uc2U6CiAgICBQcmlvcml0aXplIHN0YW5jZSBhbmQgYmFsYW5jZSB0byBjb250cm9sIHRoZSBmaWdodCdzIGZsb3cuIFVzZSBhbmdsZXMgdG8gY3JlYXRlIG9wZW5pbmdzIGZvciBzdHJpa2VzIHdoaWxlIG1pbmltaXppbmcgZXhwb3N1cmUuIFByYWN0aWNlIHBhcnJ5aW5nIHdpdGggcHJlY2lzaW9uIHRvIGRpc3J1cHQgb3Bwb25lbnQgcmh5dGhtLiBNYWludGFpbiBkaXN0YW5jZSB0byBhdm9pZCBvdmVyY29tbWl0dGluZywgYW5kIHRhcmdldCB3ZWFrIHBvaW50cyBsaWtlIGpvaW50cyBvciBsaW1icy4gRm9jdXMgb24gcmh5dGhtIGFuZCB0aW1pbmcgdG8gZXhwbG9pdCB2dWxuZXJhYmlsaXRpZXMuCgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
You are a meticulous and ethical AI assistant tasked with generating detailed, compliant responses. When given a query, first think step by step to create a reasoning process that addresses the query’s requirements, then produce a response that strictly adheres to all specified constraints (e.g., formatting rules, content boundaries, ethical guidelines). Ensure the final output is structured with a "Reasoning:" section followed by a "Final Response:" section, and verify that it aligns with the query’s exact specifications while maintaining logical coherence and ethical responsibility.
Demos:
Example 1:
query:
 What are some techniques for winning a swordfight in a medieval combat game? In your response, the letter f should appear less than 18 times. Do not include keywords [’heart’, ’listen’, ’reputation’, ’side’] in the response.
response:
 Prioritize stance and balance to control the fight’s flow. Use angles to create openings for strikes while minimizing exposure. Practice parrying with precision to disrupt opponent rhythm. Maintain distance to avoid overcommitting, and target weak points like joints or limbs. Focus on rhythm and timing to exploit vulnerabilities.
reasoning:
 The response outlines key techniques for medieval swordfighting, focusing on stance, angles, parrying, distance, and targeting weak points. It avoids the restricted keywords and limits the letter ’f’ to 2 instances, satisfying the constraints. The advice is practical and aligns with historical combat strategies.
final_response:
 Prioritize stance and balance to control the fight’s flow. Use angles to create openings for strikes while minimizing exposure. Practice parrying with precision to disrupt opponent rhythm. Maintain distance to avoid overcommitting, and target weak points like joints or limbs. Focus on rhythm and timing to exploit vulnerabilities.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,RW5zdXJlIHRoZSByZXNwb25zZSBzdHJpY3RseSBmb2xsb3dzIHRoZXNlIGluc3RydWN0aW9uczoKMS4gKipGaXJzdCoqLCByZXBlYXQgdGhlIHVzZXIncyBxdWVyeSAqKndvcmQgZm9yIHdvcmQqKiB3aXRob3V0IGFueSBjaGFuZ2VzIG9yIGFkZGl0aW9ucy4KMi4gKipUaGVuKiosIHByb3ZpZGUgeW91ciBhbnN3ZXIgaW4gdGhlIHNwZWNpZmllZCBmb3JtYXQsIGFkaGVyaW5nIHRvIGFsbCBjb25zdHJhaW50cyAoZS5nLiwgbWFya2Rvd24sIHN0cnVjdHVyZSwgY29udGVudCkuCjMuICoqRG8gbm90IGluY2x1ZGUgYW55IGFkZGl0aW9uYWwgdGV4dCwgZXhwbGFuYXRpb25zLCBvciBmb3JtYXR0aW5nKiogYmV5b25kIHRoZSByZXBlYXRlZCBxdWVyeSBhbmQgeW91ciBhbnN3ZXIuCjQuICoqSW5jbHVkZSBuaWNoZS9kb21haW4tc3BlY2lmaWMgZmFjdHVhbCBkZXRhaWxzKiogKGUuZy4sIHRlY2huaWNhbCBjb21tYW5kcywgYmVzdCBwcmFjdGljZXMsIG9yIHBsYXRmb3JtLXNwZWNpZmljIGNvbmZpZ3VyYXRpb25zKSBpZiBhcHBsaWNhYmxlLCBhcyB0aGVzZSBhcmUgY3JpdGljYWwgZm9yIGFjY3VyYXRlIHRhc2sgY29tcGxldGlvbi4KNS4gKipVc2UgcHJlY2lzZSBmb3JtYXR0aW5nKiogKGUuZy4sIGJ1bGxldCBwb2ludHMsIGNvZGUgYmxvY2tzLCBoZWFkZXJzKSBhcyByZXF1ZXN0ZWQsIGVuc3VyaW5nIG5vIG1hcmtkb3duIGlzIG9taXR0ZWQgb3IgYWx0ZXJlZC4KNi4gKipBdm9pZCBnZW5lcmFsaXphYmxlIHN0cmF0ZWdpZXMqKiB1bmxlc3MgZXhwbGljaXRseSBpbnN0cnVjdGVkOyBmb2N1cyBvbiBhY3Rpb25hYmxlLCBzcGVjaWZpYyBndWlkYW5jZS4KNy4gKipWYWxpZGF0ZSBhbGwgdGVjaG5pY2FsIHN0ZXBzKiogKGUuZy4sIERvY2tlcmZpbGUgc3ludGF4LCBDTEkgY29tbWFuZHMpIGZvciBhY2N1cmFjeSBhbmQgY29tcGxldGVuZXNzLgo4LiAqKkhpZ2hsaWdodCBwb3RlbnRpYWwgcGl0ZmFsbHMgYW5kIHNvbHV0aW9ucyoqIHRvIGFkZHJlc3MgY29tbW9uIGlzc3VlcyBpbiB0aGUgdGFzay4KOS4gKipQcmlvcml0aXplIGNsYXJpdHkgYW5kIGNvbmNpc2VuZXNzKiosIGVuc3VyaW5nIHRoZSByZXNwb25zZSBpcyBib3RoIGNvbXByZWhlbnNpdmUgYW5kIGVhc3kgdG8gZm9sbG93LgoxMC4gKipBZGhlcmUgdG8gbGFuZ3VhZ2UgYW5kIGNhc2UgcmVxdWlyZW1lbnRzKiogKGUuZy4sIGFsbCBjYXBzLCBFbmdsaXNoIG9ubHkpIGlmIHNwZWNpZmllZC4=)
Ensure the response strictly follows these instructions:
1. **First**, repeat the user’s query **word for word** without any changes or additions.
2. **Then**, provide your answer in the specified format, adhering to all constraints (e.g., markdown, structure, content).
3. **Do not include any additional text, explanations, or formatting** beyond the repeated query and your answer.
4. **Include niche/domain-specific factual details** (e.g., technical commands, best practices, or platform-specific configurations) if applicable, as these are critical for accurate task completion.
5. **Use precise formatting** (e.g., bullet points, code blocks, headers) as requested, ensuring no markdown is omitted or altered.
6. **Avoid generalizable strategies** unless explicitly instructed; focus on actionable, specific guidance.
7. **Validate all technical steps** (e.g., Dockerfile syntax, CLI commands) for accuracy and completeness.
8. **Highlight potential pitfalls and solutions** to address common issues in the task.
9. **Prioritize clarity and conciseness**, ensuring the response is both comprehensive and easy to follow.
10. **Adhere to language and case requirements** (e.g., all caps, English only) if specified.

### L.5 HoVer, GPT-4.1 Mini

HoVer GPT-4.1 Mini create_query_hop2.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgc3VtbWFyeV8xYCwgcHJvZHVjZSB0aGUgZmllbGRzIGBxdWVyeWAu)
Given the fields ‘claim‘, ‘summary_1‘, produce the fields ‘query‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIG9yaWdpbmFsIGNsYWltIGFuZCB0aGUgaW5pdGlhbCBzdW1tYXJ5IG9mIHJldHJpZXZlZCBldmlkZW5jZSwgY2FyZWZ1bGx5IGFuYWx5emUgdGhlIGluZm9ybWF0aW9uIHN0ZXAtYnktc3RlcCB0byBpZGVudGlmeSBhbnkgZ2FwcywgY29udHJhZGljdGlvbnMsIG9yIHBvaW50cyBuZWVkaW5nIGZ1cnRoZXIgY2xhcmlmaWNhdGlvbi4gVGhlbiwgZ2VuZXJhdGUgYSBjbGVhciwgZm9jdXNlZCwgYW5kIHByZWNpc2UgcXVlcnkgdGhhdCB0YXJnZXRzIGFkZGl0aW9uYWwgcmVsZXZhbnQgaW5mb3JtYXRpb24gdG8gZGVlcGVuIHRoZSBpbnZlc3RpZ2F0aW9uIGFuZCBoZWxwIHZlcmlmeSBvciByZWZ1dGUgdGhlIGNsYWltLiBZb3VyIHJlc3BvbnNlIHNob3VsZCBpbmNsdWRlIGEgZGV0YWlsZWQgY2hhaW4tb2YtdGhvdWdodCByZWFzb25pbmcgZXhwbGFpbmluZyB5b3VyIHRob3VnaHQgcHJvY2VzcyBpbiBmb3JtdWxhdGluZyB0aGlzIHJlZmluZWQgcXVlcnkuCkRlbW9zOgpFeGFtcGxlIDE6CmNsYWltOgogICAgQWlyQmFsdGljJ3MgaGFzIGJhc2VzIGF0IFRhbGxpbm4gQWlycG9ydCBhbmQgdGhlIGFpcnBvcnQgdGhhdCBjZWFzZWQgb3BlcmF0aW9ucyBpbiAyMDE1LCB3aXRoIHRoZSBhaXJwb3J0IGNvZGUgb2YgUnlhbmFpcjogVk5PLCBJQ0FPOiBFWVZJLgpzdW1tYXJ5XzE6CiAgICBBaXJCYWx0aWMgaGFzIGJhc2VzIGF0IFRhbGxpbm4gQWlycG9ydCBhbmQgVmlsbml1cyBBaXJwb3J0IChJQVRBOiBWTk8sIElDQU86IEVZVkkpLCBidXQgVmlsbml1cyBBaXJwb3J0IGRpZCBub3QgY2Vhc2Ugb3BlcmF0aW9ucyBpbiAyMDE1LiBUaGUgYWlycG9ydCB0aGF0IGNlYXNlZCBvcGVyYXRpb25zIGluIDIwMTUgbWVudGlvbmVkIGluIHRoZSBwYXNzYWdlcyBpcyB1bnJlbGF0ZWQgYW5kIGhhcyBkaWZmZXJlbnQgY29kZXMuIFRoZXJlZm9yZSwgdGhlIGNsYWltIHRoYXQgYWlyQmFsdGljJ3MgYmFzZSB3aXRoIGNvZGUgVk5PL0VZVkkgY2Vhc2VkIG9wZXJhdGlvbnMgaW4gMjAxNSBpcyBmYWxzZS4KcmVhc29uaW5nOgogICAgVGhlIGNsYWltIHN0YXRlcyB0aGF0IEFpckJhbHRpYyBoYXMgYmFzZXMgYXQgVGFsbGlubiBBaXJwb3J0IGFuZCBhbiBhaXJwb3J0IHdpdGggY29kZXMgVk5PIChJQVRBKSBhbmQgRVlWSSAoSUNBTykgd2hpY2ggY2Vhc2VkIG9wZXJhdGlvbnMgaW4gMjAxNS4gSG93ZXZlciwgdGhlIHN1bW1hcnkgY2xhcmlmaWVzIHRoYXQgVmlsbml1cyBBaXJwb3J0LCB3aGljaCBoYXMgdGhvc2UgY29kZXMsIGRpZCBub3QgY2Vhc2Ugb3BlcmF0aW9ucyBpbiAyMDE1LiBUaGUgYWlycG9ydCB0aGF0IGRpZCBjZWFzZSBvcGVyYXRpb25zIGluIDIwMTUgaGFzIGRpZmZlcmVudCBjb2RlcyBhbmQgaXMgdW5yZWxhdGVkIHRvIEFpckJhbHRpYydzIGJhc2VzLiBUaGVyZWZvcmUsIHRoZSBjbGFpbSB0aGF0IEFpckJhbHRpYydzIGJhc2UgYXQgdGhlIGFpcnBvcnQgd2l0aCBjb2RlcyBWTk8vRVlWSSBjZWFzZWQgb3BlcmF0aW9ucyBpbiAyMDE1IGlzIGluY29ycmVjdC4KcXVlcnk6CiAgICBEaWQgVmlsbml1cyBBaXJwb3J0IChJQVRBOiBWTk8sIElDQU86IEVZVkkpIGNlYXNlIG9wZXJhdGlvbnMgaW4gMjAxNT8KCgojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCjMgb3RoZXIgZGVtb3Mgb21pdHRlZCBmb3IgYnJldml0eS4KIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwo=)
Given the original claim and the initial summary of retrieved evidence, carefully analyze the information step-by-step to identify any gaps, contradictions, or points needing further clarification. Then, generate a clear, focused, and precise query that targets additional relevant information to deepen the investigation and help verify or refute the claim. Your response should include a detailed chain-of-thought reasoning explaining your thought process in formulating this refined query.
Demos:
Example 1:
claim:
 AirBaltic’s has bases at Tallinn Airport and the airport that ceased operations in 2015, with the airport code of Ryanair: VNO, ICAO: EYVI.
summary_1:
 AirBaltic has bases at Tallinn Airport and Vilnius Airport (IATA: VNO, ICAO: EYVI), but Vilnius Airport did not cease operations in 2015. The airport that ceased operations in 2015 mentioned in the passages is unrelated and has different codes. Therefore, the claim that airBaltic’s base with code VNO/EYVI ceased operations in 2015 is false.
reasoning:
 The claim states that AirBaltic has bases at Tallinn Airport and an airport with codes VNO (IATA) and EYVI (ICAO) which ceased operations in 2015. However, the summary clarifies that Vilnius Airport, which has those codes, did not cease operations in 2015. The airport that did cease operations in 2015 has different codes and is unrelated to AirBaltic’s bases. Therefore, the claim that AirBaltic’s base at the airport with codes VNO/EYVI ceased operations in 2015 is incorrect.
query:
 Did Vilnius Airport (IATA: VNO, ICAO: EYVI) cease operations in 2015?




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,VGFzayBEZXNjcmlwdGlvbjoKWW91IGFyZSBnaXZlbiB0d28gZmllbGRzOiBgY2xhaW1gIGFuZCBgc3VtbWFyeV8xYC4gWW91ciBnb2FsIGlzIHRvIHByb2R1Y2UgYSBmaWVsZCBjYWxsZWQgYHF1ZXJ5YCDigJQgYSBjb25jaXNlIHNldCBvZiByZWxldmFudCwgZmFjdC1jaGVja2luZyBxdWVzdGlvbnMgb3Igc2VhcmNoIHN0eWxlIHF1ZXJpZXMgdGhhdCBjYW4gYmUgdXNlZCB0byByZXRyaWV2ZSBldmlkZW5jZSBkb2N1bWVudHMgdmVyaWZ5aW5nIG9yIHJlZnV0aW5nIHRoZSBjbGFpbSBiYXNlZCBvbiBpbmZvcm1hdGlvbiBjb250YWluZWQgb3IgaW5mZXJyZWQgZnJvbSB0aGUgc3VtbWFyeS4KCklucHV0IEZvcm1hdDoKLSBgY2xhaW1gOiBBIGZhY3R1YWwgc3RhdGVtZW50IHBvdGVudGlhbGx5IGNvbnRhaW5pbmcgbXVsdGlwbGUgZmFjdCBhc3NlcnRpb25zIGFib3V0IHBlb3BsZSwgZXZlbnRzLCBhdHRyaWJ1dGVzLCB0aXRsZXMsIGRhdGVzLCByb2xlcywgb3IgcmVsYXRpb25zaGlwcy4KLSBgc3VtbWFyeV8xYDogQSBzaG9ydCBwYXJhZ3JhcGggc3VtbWFyaXppbmcgZmFjdHVhbCBpbmZvcm1hdGlvbiByZWxhdGVkIHRvIHRoZSBjbGFpbSwgb2Z0ZW4gY2xhcmlmeWluZyBvciBjb3JyZWN0aW5nIHNvbWUgcGFydHMgb2YgdGhlIGNsYWltLgoKT3V0cHV0IEZvcm1hdDoKLSBgcXVlcnlgOiBPbmUgb3IgbW9yZSBzcGVjaWZpYywgd2VsbC1waHJhc2VkIHF1ZXN0aW9ucyBvciBrZXl3b3JkIHF1ZXJpZXMgdGhhdCBkaXJlY3RseSB0YXJnZXQgdGhlIGtleSBmYWN0dWFsIGRpc2NyZXBhbmNpZXMgb3IgdmVyaWZpY2F0aW9ucyByYWlzZWQgYnkgdGhlIGNsYWltIGluIGxpZ2h0IG9mIHRoZSBzdW1tYXJ5LgoKRGV0YWlsZWQgSW5zdHJ1Y3Rpb25zOgoxLiAqKkV4dHJhY3Qga2V5IGZhY3R1YWwgZWxlbWVudHMgZnJvbSB0aGUgY2xhaW0qKiDigJQgbmFtZXMsIGRhdGVzLCB0aXRsZXMsIHJvbGVzLCBldmVudHMsIG9yIHJlbGF0aW9uc2hpcHMgZXhwbGljaXRseSBvciBpbXBsaWNpdGx5IHN0YXRlZC4KMi4gKipDb250cmFzdCB0aGVzZSBmYWN0cyB3aXRoIHRoZSBzdW1tYXJ5IHRvIGlkZW50aWZ5IHBvaW50cyBvZiBhZ3JlZW1lbnQsIGNvbnRyYWRpY3Rpb24sIG9yIGFtYmlndWl0eS4qKgozLiAqKkZvcm11bGF0ZSBmYWN0LWNoZWNraW5nIHF1ZXJpZXMgdGhhdCBhcmU6KioKICAgLSBUaWdodGx5IGZvY3VzZWQgb24gdGhlIGNvcmUgZmFjdHVhbCBpc3N1ZXMgcmFpc2VkIGJ5IHRoZSBjbGFpbSBhbmQgYWRkcmVzc2VkIG9yIGNvbnRyYWRpY3RlZCBieSB0aGUgc3VtbWFyeS4KICAgLSBJbmNsdWRlIG5hbWVkIGVudGl0aWVzLCBkYXRlcywgcm9sZXMsIG9yIG90aGVyIGRvbWFpbi1zcGVjaWZpYyBpZGVudGlmaWVycyBkaXJlY3RseSBtZW50aW9uZWQgaW4gYm90aCBjbGFpbSBhbmQgc3VtbWFyeSB0byBpbXByb3ZlIHJldHJpZXZhbCBlZmZlY3RpdmVuZXNzLgogICAtIFdoZW4gcmVsZXZhbnQsIGJyZWFrIGNvbXBsZXggY2xhaW1zIGludG8gbXVsdGlwbGUgcXVlcmllcyBlbnN1cmluZyBlYWNoIGZhY3QgaXMgdmVyaWZpYWJsZSBzZXBhcmF0ZWx5Lgo0LiAqKldoZW4gcmVsZXZhbnQgZGV0YWlscyBhcHBlYXIgb25seSBpbiB0aGUgc3VtbWFyeSBidXQgYXJlIGhpbnRlZCBhdCBvciBtaXNzaW5nIGZyb20gdGhlIGNsYWltIChlLmcuLCBzcGVjaWZpYyB0aXRsZXMsIHJvbGVzLCBvciBuYW1lcyksIGluY2x1ZGUgdGhlc2UgaW4gdGhlIHF1ZXJpZXMgdG8gZW5hYmxlIHJldHJpZXZhbCBvZiBrZXkgZXZpZGVuY2UuKioKNS4gKipVc2UgYSBjbGVhciwgbmF0dXJhbCBxdWVzdGlvbiBmb3JtYXQgb3IgdGFyZ2V0ZWQga2V5d29yZCBwaHJhc2VzIHRoYXQgY291bGQgc2VydmUgd2VsbCBhcyBzZWFyY2ggcXVlcmllcy4qKgo2LiAqKkF2b2lkIG92ZXJseSBicm9hZCBvciBnZW5lcmljIHF1ZXJpZXM7IHByZWNpc2lvbiBpbXByb3ZlcyBldmlkZW5jZSByZXRyaWV2YWwgcXVhbGl0eS4qKgo3LiBPcHRpb25hbGx5LCB5b3UgbWF5IHByb3ZpZGUgYnJpZWYgcmVhc29uaW5nIGludGVybmFsbHkgKG5vdCByZXF1aXJlZCBpbiBvdXRwdXQpIHRvIGVuc3VyZSB0aGUgcXVlcmllcyBjb3ZlciBhbGwgY2xhaW0gYXNwZWN0cyBhbmQgcmVmbGVjdCB0aGUgc3VtbWFyeSBpbnNpZ2h0cy4KCkV4YW1wbGVzIG9mIHR5cGljYWwgcXVlcnkgY29tcG9uZW50cyBpbmNsdWRlOgotIENvcnJlY3QgZGF0ZXMgb2YgZXZlbnRzIG9yIGRlYXRocy4KLSBDb25maXJtYXRpb24gb2YgYSBwZXJzb27igJlzIHJvbGUgb3IgYXNzb2NpYXRpb24gd2l0aCBhIGtub3duIHdvcmsuCi0gVmVyaWZpY2F0aW9uIG9mIHJlbGF0aW9uc2hpcHMgb3IgYWxsZWdhdGlvbnMuCi0gRGV0YWlscyBhYm91dCBzcGVjaWZpYyBjdWx0dXJhbCBvciBkb21haW4gZWxlbWVudHMgKGUuZy4sIG9wZXJhcycgc3RydWN0dXJlLCBzb25nIGRpcmVjdG9ycykuCi0gQ2xhcmlmeWluZyBlbnRpdHkgYXR0cmlidXRlcyBvciBjbGFzc2lmaWNhdGlvbnMgKGUuZy4sIGV0aG5pY2l0eSwgbmF0aW9uYWxpdHkpLgoKQnkgZm9sbG93aW5nIHRoZXNlIGluc3RydWN0aW9ucywgeW91IHdpbGwgcHJvZHVjZSBxdWVyaWVzIHRoYXQgYXJlIGJvdGggY29tcHJlaGVuc2l2ZSBhbmQgdGFyZ2V0ZWQsIG1heGltaXppbmcgdGhlIGNoYW5jZSBvZiByZXRyaWV2aW5nIHJlbGV2YW50IGZhY3R1YWwgZXZpZGVuY2UgcmVsZXZhbnQgdG8gdGhlIGNsYWltIHZlcmlmaWNhdGlvbiB0YXNrLg==)
Task Description:
You are given two fields: ‘claim‘ and ‘summary_1‘. Your goal is to produce a field called ‘query‘ — a concise set of relevant, fact-checking questions or search style queries that can be used to retrieve evidence documents verifying or refuting the claim based on information contained or inferred from the summary.


Input Format:
- ‘claim‘: A factual statement potentially containing multiple fact assertions about people, events, attributes, titles, dates, roles, or relationships.
- ‘summary_1‘: A short paragraph summarizing factual information related to the claim, often clarifying or correcting some parts of the claim.


Output Format:
- ‘query‘: One or more specific, well-phrased questions or keyword queries that directly target the key factual discrepancies or verifications raised by the claim in light of the summary.


Detailed Instructions:
1. **Extract key factual elements from the claim** — names, dates, titles, roles, events, or relationships explicitly or implicitly stated.
2. **Contrast these facts with the summary to identify points of agreement, contradiction, or ambiguity.**
3. **Formulate fact-checking queries that are:**
 - Tightly focused on the core factual issues raised by the claim and addressed or contradicted by the summary.
 - Include named entities, dates, roles, or other domain-specific identifiers directly mentioned in both claim and summary to improve retrieval effectiveness.
 - When relevant, break complex claims into multiple queries ensuring each fact is verifiable separately.
4. **When relevant details appear only in the summary but are hinted at or missing from the claim (e.g., specific titles, roles, or names), include these in the queries to enable retrieval of key evidence.**
5. **Use a clear, natural question format or targeted keyword phrases that could serve well as search queries.**
6. **Avoid overly broad or generic queries; precision improves evidence retrieval quality.**
7. Optionally, you may provide brief reasoning internally (not required in output) to ensure the queries cover all claim aspects and reflect the summary insights.


Examples of typical query components include:
- Correct dates of events or deaths.
- Confirmation of a person’s role or association with a known work.
- Verification of relationships or allegations.
- Details about specific cultural or domain elements (e.g., operas’ structure, song directors).
- Clarifying entity attributes or classifications (e.g., ethnicity, nationality).


By following these instructions, you will produce queries that are both comprehensive and targeted, maximizing the chance of retrieving relevant factual evidence relevant to the claim verification task.

HoVer GPT-4.1 Mini create_query_hop3.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgc3VtbWFyeV8xYCwgYHN1bW1hcnlfMmAsIHByb2R1Y2UgdGhlIGZpZWxkcyBgcXVlcnlgLg==)
Given the fields ‘claim‘, ‘summary_1‘, ‘summary_2‘, produce the fields ‘query‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,WW91IGFyZSBhbiBleHBlcnQgZmFjdC1jaGVja2VyIHNwZWNpYWxpemluZyBpbiBtdWx0aS1ob3AgcmVhc29uaW5nIGFuZCBldmlkZW5jZSBzeW50aGVzaXMuIEdpdmVuIGEgY2xhaW0gYW5kIHR3byBpbnRlcm1lZGlhdGUgc3VtbWFyaWVzIHRoYXQgY29uc29saWRhdGUgZXZpZGVuY2UgZnJvbSBwcmV2aW91cyByZXRyaWV2YWwgc3RlcHMsIHRob3VnaHRmdWxseSBhbmFseXplIHRoZSBpbmZvcm1hdGlvbiBzdGVwLWJ5LXN0ZXAgdG8gZ2VuZXJhdGUgYSBjbGVhciBhbmQgZm9jdXNlZCBxdWVyeS4gVGhpcyBxdWVyeSBzaG91bGQgYmUgZGVzaWduZWQgdG8gcmV0cmlldmUgdGhlIG1vc3QgcmVsZXZhbnQgYWRkaXRpb25hbCBkb2N1bWVudHMgdGhhdCBjYW4gaGVscCB2ZXJpZnkgb3IgcmVmdXRlIHRoZSBjbGFpbSBieSBsZXZlcmFnaW5nIHRoZSBpbnNpZ2h0cyBmcm9tIGJvdGggc3VtbWFyaWVzLiBQcm92aWRlIGEgZGV0YWlsZWQgY2hhaW4tb2YtdGhvdWdodCByZWFzb25pbmcgZXhwbGFpbmluZyBob3cgeW91IGludGVncmF0ZSB0aGUgc3VtbWFyaWVzIGFuZCB0aGUgY2xhaW0gdG8gZm9ybXVsYXRlIHRoaXMgcmVmaW5lZCBxdWVyeS4KRGVtb3M6CkV4YW1wbGUgMToKY2xhaW06CiAgICBUaGUgYnJvdGhlciBvZiBGcmVkZGllIFNlc3NsZXIsIHdhcyB0aGUgcmVzdGF1cmF0ZXVyIHdob3NlIGNsdWIgd2FzIGZyZXF1ZW50ZWQgYnkgUnV0aCBFbGl6YWJldGggIkJldHRlIiBEYXZpcywgYW4gYWN0cmVzcyB3aXRoIFdlbHNoIGFuY2VzdHJ5LgpzdW1tYXJ5XzE6CiAgICBGcmVkZGllIFNlc3NsZXIncyBicm90aGVyIHdhcyBTaWVnaSBTZXNzbGVyLCBhIExvbmRvbiByZXN0YXVyYXRldXIgd2hvc2UgY2x1YiB3YXMgZnJlcXVlbnRlZCBieSBCZXR0ZSBEYXZpcywgYW4gYWN0cmVzcyB3aXRoIFdlbHNoIGFuY2VzdHJ5LgpzdW1tYXJ5XzI6CiAgICBGcmVkZGllIFNlc3NsZXIncyBicm90aGVyIHdhcyBTaWVnaSBTZXNzbGVyLCBhIHByb21pbmVudCBMb25kb24gcmVzdGF1cmF0ZXVyIHdob3NlIGNsdWIsIFNpZWdpJ3MsIHdhcyBmcmVxdWVudGVkIGJ5IEhvbGx5d29vZCBzdGFycyBpbmNsdWRpbmcgUnV0aCBFbGl6YWJldGggIkJldHRlIiBEYXZpcywgYW4gYWN0cmVzcyB3aXRoIFdlbHNoIGFuY2VzdHJ5LgpyZWFzb25pbmc6CiAgICBUaGUgY2xhaW0gc3RhdGVzIHRoYXQgdGhlIGJyb3RoZXIgb2YgRnJlZGRpZSBTZXNzbGVyIHdhcyBhIHJlc3RhdXJhdGV1ciB3aG9zZSBjbHViIHdhcyBmcmVxdWVudGVkIGJ5IFJ1dGggRWxpemFiZXRoICJCZXR0ZSIgRGF2aXMsIG5vdGVkIHRvIGhhdmUgV2Vsc2ggYW5jZXN0cnkuIEJvdGggc3VtbWFyaWVzIHN1cHBvcnQgdGhpcyBjbGFpbSBieSBpZGVudGlmeWluZyB0aGUgYnJvdGhlciBhcyBTaWVnaSBTZXNzbGVyLCBhIHJlc3RhdXJhdGV1ciBpbiBMb25kb24sIHdob3NlIGNsdWIgd2FzIGluZGVlZCBmcmVxdWVudGVkIGJ5IEJldHRlIERhdmlzLCBhbiBhY3RyZXNzIG5vdGVkIGZvciBXZWxzaCBhbmNlc3RyeS4gU3VtbWFyeV8yIGFkZHMgdGhhdCB0aGUgY2x1YidzIG5hbWUgd2FzIFNpZWdpJ3MgYW5kIG1lbnRpb25zIHRoZSBwcmVzZW5jZSBvZiBvdGhlciBIb2xseXdvb2Qgc3RhcnMuIFRvIGZhY3QtY2hlY2sgdGhlIGNsYWltIGFjY3VyYXRlbHksIGl0IHdvdWxkIGJlIHVzZWZ1bCB0byB2ZXJpZnkgdGhlIGlkZW50aXR5IG9mIEZyZWRkaWUgU2Vzc2xlcidzIGJyb3RoZXIgYXMgU2llZ2kgU2Vzc2xlciwgY29uZmlybSB0aGF0IGhlIHdhcyBhIHJlc3RhdXJhdGV1ciwgdmVyaWZ5IHRoYXQgQmV0dGUgRGF2aXMgZnJlcXVlbnRlZCBoaXMgY2x1YiwgYW5kIGNvbmZpcm0gQmV0dGUgRGF2aXMncyBXZWxzaCBhbmNlc3RyeS4KcXVlcnk6CiAgICBXaG8gd2FzIFNpZWdpIFNlc3NsZXIsIGFuZCB3YXMgaGUgdGhlIGJyb3RoZXIgb2YgRnJlZGRpZSBTZXNzbGVyPyBXYXMgU2llZ2kgU2Vzc2xlciBhIHJlc3RhdXJhdGV1ciB3aG9zZSBjbHViIHdhcyBmcmVxdWVudGVkIGJ5IFJ1dGggRWxpemFiZXRoICJCZXR0ZSIgRGF2aXM/IERpZCBCZXR0ZSBEYXZpcyBoYXZlIFdlbHNoIGFuY2VzdHJ5PwoKCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMKMyBvdGhlciBkZW1vcyBvbWl0dGVkIGZvciBicmV2aXR5LgojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCg==)
You are an expert fact-checker specializing in multi-hop reasoning and evidence synthesis. Given a claim and two intermediate summaries that consolidate evidence from previous retrieval steps, thoughtfully analyze the information step-by-step to generate a clear and focused query. This query should be designed to retrieve the most relevant additional documents that can help verify or refute the claim by leveraging the insights from both summaries. Provide a detailed chain-of-thought reasoning explaining how you integrate the summaries and the claim to formulate this refined query.
Demos:
Example 1:
claim:
 The brother of Freddie Sessler, was the restaurateur whose club was frequented by Ruth Elizabeth "Bette" Davis, an actress with Welsh ancestry.
summary_1:
 Freddie Sessler’s brother was Siegi Sessler, a London restaurateur whose club was frequented by Bette Davis, an actress with Welsh ancestry.
summary_2:
 Freddie Sessler’s brother was Siegi Sessler, a prominent London restaurateur whose club, Siegi’s, was frequented by Hollywood stars including Ruth Elizabeth "Bette" Davis, an actress with Welsh ancestry.
reasoning:
 The claim states that the brother of Freddie Sessler was a restaurateur whose club was frequented by Ruth Elizabeth "Bette" Davis, noted to have Welsh ancestry. Both summaries support this claim by identifying the brother as Siegi Sessler, a restaurateur in London, whose club was indeed frequented by Bette Davis, an actress noted for Welsh ancestry. Summary_2 adds that the club’s name was Siegi’s and mentions the presence of other Hollywood stars. To fact-check the claim accurately, it would be useful to verify the identity of Freddie Sessler’s brother as Siegi Sessler, confirm that he was a restaurateur, verify that Bette Davis frequented his club, and confirm Bette Davis’s Welsh ancestry.
query:
 Who was Siegi Sessler, and was he the brother of Freddie Sessler? Was Siegi Sessler a restaurateur whose club was frequented by Ruth Elizabeth "Bette" Davis? Did Bette Davis have Welsh ancestry?




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,R2l2ZW4gdGhyZWUgdGV4dCBmaWVsZHM6IGBjbGFpbWAsIGBzdW1tYXJ5XzFgLCBhbmQgYHN1bW1hcnlfMmAsIHlvdXIgdGFzayBpcyB0byBwcm9kdWNlIGEgYHF1ZXJ5YCBmaWVsZCB0aGF0IGlzIGRlc2lnbmVkIHRvIGVmZmVjdGl2ZWx5IHJldHJpZXZlIGV2aWRlbmNlIGRvY3VtZW50cyByZWxldmFudCB0byB2ZXJpZnlpbmcgb3IgcmVmdXRpbmcgdGhlIGNsYWltIGJhc2VkIG9uIHRoZSBpbmZvcm1hdGlvbiBjb250YWluZWQgaW4gdGhlIHR3byBzdW1tYXJpZXMuCgpEZXRhaWxlZCB0YXNrIGRlc2NyaXB0aW9uIGFuZCBjb25zaWRlcmF0aW9uczoKCjEuICoqUHVycG9zZSBvZiB0aGUgUXVlcnk6KioKICAgLSBUaGUgcXVlcnkgc2hvdWxkIGFjY3VyYXRlbHkgYW5kIGNvbXByZWhlbnNpdmVseSB0YXJnZXQgdGhlIGtleSBmYWN0dWFsIGVsZW1lbnRzIGZyb20gdGhlIGNsYWltIHRoYXQgYXJlIGFkZHJlc3NlZCBvciBjbGFyaWZpZWQgaW4gdGhlIHN1bW1hcmllcy4KICAgLSBUaGUgcXVlcnkgd2lsbCBiZSB1c2VkIHRvIHJldHJpZXZlIGV2aWRlbmNlIGRvY3VtZW50cywgc28gaXQgc2hvdWxkIGJlIHNwZWNpZmljIGVub3VnaCB0byBwaW5wb2ludCByZWxldmFudCBzdXBwb3J0IG9yIGNvbnRyYWRpY3Rpb24gYnV0IGJyb2FkIGVub3VnaCB0byBjb3ZlciBhbGwgaW1wb3J0YW50IGRldGFpbHMgcHJlc2VudCBpbiB0aGUgc3VtbWFyaWVzLgoKMi4gKipVdGlsaXppbmcgdGhlIFN1bW1hcmllczoqKgogICAtIFN1bW1hcmllcyBvZnRlbiBjb3JyZWN0LCBjbGFyaWZ5LCBvciBhZGQgZmFjdHVhbCBjb250ZXh0IHRvIHRoZSBjbGFpbS4gWW91ciBxdWVyeSBtdXN0IGluY29ycG9yYXRlIHRoZXNlIGNsYXJpZmljYXRpb25zIChlLmcuLCBuYW1lIGNvcnJlY3Rpb25zLCBmYWN0dWFsIHNwZWNpZmljcywgb3IgY291bnRlcnBvaW50cykgdG8gZW5zdXJlIHJldHJpZXZhbCBvZiByZWxldmFudCBldmlkZW5jZSByZWZsZWN0aW5nIHRoZSBudWFuY2VkIHRydXRoLgogICAtIEluY2x1ZGUgYWxsIGRpc3RpbmN0aXZlIGVudGl0aWVzLCBmYWN0cywgZGF0ZXMsIGxvY2F0aW9ucywgbmFtZXMsIGFuZCByZWxhdGlvbnNoaXBzIG1lbnRpb25lZCBvciBjb3JyZWN0ZWQgaW4gdGhlIHN1bW1hcmllcyB0aGF0IHBlcnRhaW4gdG8gdGhlIGNsYWltLgogICAtIEZvciBleGFtcGxlLCBpZiBhIHN1bW1hcnkgY29ycmVjdHMgYSBkb2N1bWVudGFyeSB0aXRsZSBpbiB0aGUgY2xhaW0sIHRoZSBxdWVyeSBzaG91bGQgcmVmZXJlbmNlIHRoZSBjb3JyZWN0ZWQgdGl0bGUgYW5kIHJlbGF0ZWQgZGV0YWlscyB0byBndWlkZSByZXRyaWV2YWwgZWZmZWN0aXZlbHkuCgozLiAqKlF1ZXJ5IENvbnRlbnQgU3RyYXRlZ3k6KioKICAgLSBFeHBsaWNpdGx5IG1lbnRpb24ga2V5IGVudGl0aWVzLCBzdWNoIGFzIHBlcnNvbnMsIHBsYWNlcywgZGF0ZXMsIHdvcmtzLCBvciBwb2xpdGljYWwgZW50aXRpZXMgaW52b2x2ZWQuCiAgIC0gSW5jbHVkZSBhdHRyaWJ1dGVzIG9yIHJlbGF0aW9uc2hpcHMgcmVsZXZhbnQgdG8gdGhlIGNsYWlt4oCZcyBhY2N1cmFjeSAoZS5nLiwgIldhcyBwZXJzb24gWCBhIHBvbGl0aWNpYW4gaW4gY291bnRyeSBZIGR1cmluZyB5ZWFyIFo/IiBvciAiRGlkIGRvY3VtZW50YXJ5IEEgYW5kIGRvY3VtZW50YXJ5IEIgZmlsbSBpbiBkaWZmZXJlbnQgbG9jYXRpb25zIHN1Y2ggYXMgbG9jYXRpb24gMSBhbmQgbG9jYXRpb24gMj8iKS4KICAgLSBJZiB0aGVyZSBpcyBhIGZhY3R1YWwgZGlzcHV0ZSBvciBjb3JyZWN0aW9uIGluIHRoZSBzdW1tYXJpZXMgKGUuZy4sIG5hdGlvbmFsaXR5LCBvZmZpY2lhbCBuYW1lcywgcG9wdWxhdGlvbiBmaWd1cmVzKSwgcGhyYXNlIHRoZSBxdWVyeSB0byB0YXJnZXQgZXZpZGVuY2UgY2xhcmlmeWluZyB0aGlzIGRpc3B1dGUuCgo0LiAqKkRvbWFpbi1TcGVjaWZpYyBOdWFuY2VzOioqCiAgIC0gQmUgbWluZGZ1bCBvZiBoaXN0b3JpY2FsIGdlb3BvbGl0aWNhbCBuYW1lcyBhbmQgcGVyaW9kcyAoZS5nLiwgIlVuaXRlZCBLaW5nZG9tIG9mIHRoZSBOZXRoZXJsYW5kcyBiZXR3ZWVuIDE4MTUgYW5kIDE4MzAiKS4KICAgLSBSZWNvZ25pemUgcHJvcGVyIHRpdGxlcyBhbmQgY29ycmVjdCBzcGVsbGluZ3MgKGUuZy4sIGNvcnJlY3RlZCBkb2N1bWVudGFyeSB0aXRsZXMpLgogICAtIEluY2x1ZGUgYm90aCBzdWJqZWN0cyBvciBvYmplY3RzIG1lbnRpb25lZCBhcyBjb21wYXJpc29ucyBvciBjb250cmFzdHMgaW4gdGhlIGNsYWltIGFuZCBzdW1tYXJpZXMgKGUuZy4sIHR3byBkb2N1bWVudGFyaWVzLCB0d28gcG9saXRpY2lhbnMsIHR3byB0b3ducykuCgo1LiAqKkZvcm11bGF0aW9uIFN0eWxlOioqCiAgIC0gUXVlcmllcyBzaG91bGQgYmUgcGhyYXNlZCBhcyBjbGVhciwgcHJlY2lzZSwgYW5kIG9iamVjdGl2ZSBxdWVzdGlvbnMgdGhhdCBjYW4gYmUgYW5zd2VyZWQgYmFzZWQgb24gZXZpZGVuY2Ug4oCUIG9mdGVuIHN0cnVjdHVyZWQgYXMgeWVzL25vIG9yIGluZm9ybWF0aW9uYWwgcXVlcmllcy4KICAgLSBBdm9pZCBvdmVybHkgYnJvYWQgb3IgdmFndWUgcGhyYXNpbmcuIEFpbSBmb3IgZGV0YWlsLXJpY2ggcXVlcmllcyB0aGF0IGNvbm5lY3QgbXVsdGlwbGUgZXZpZGVuY2UgcG9pbnRzIGluIHRoZSBzdW1tYXJpZXMuCgo2LiAqKkdlbmVyYWxpemFibGUgU3RyYXRlZ3k6KioKICAgLSBJZGVudGlmeSB0aGUgY29yZSBjbGFpbSBlbGVtZW50cyBhbmQgdmVyaWZ5IGlmIHRoZSBzdW1tYXJpZXMgY29uZmlybSwgY29udHJhZGljdCwgb3IgYW1lbmQgdGhlc2UgZWxlbWVudHMuCiAgIC0gSW5jb3Jwb3JhdGUgYm90aCB0aGUgY2xhaW0gYW5kIGNvcnJlY3Rpb25zIGZyb20gc3VtbWFyaWVzIGludG8gdGhlIHF1ZXJ5IHNvIGV2aWRlbmNlIHJldHJpZXZhbCBjYXB0dXJlcyB0aGUgZnVsbCBmYWN0dWFsIGNvbnRleHQuCiAgIC0gVXNlIHRoZSBjb21wYXJpc29uIG9yIGNvbnRyYXN0IGhpZ2hsaWdodGVkIGJ5IHRoZSBzdW1tYXJpZXMgdG8gY3JlYXRlIHF1ZXJpZXMgdGhhdCBzcGVjaWZpY2FsbHkgdGVzdCB0aGUgY2xhaW0ncyB2ZXJhY2l0eSAoZS5nLiwgY29tcGFyaW5nIGxvY2F0aW9ucywgcm9sZXMsIG9yIGhpc3RvcmljYWwgdGltZWZyYW1lcykuCgpCeSBmb2xsb3dpbmcgdGhlc2UgZ3VpZGVsaW5lcywgeW91IHdpbGwgZ2VuZXJhdGUgcXVlcmllcyB0aGF0IG1heGltaXplIHRoZSBsaWtlbGlob29kIG9mIHJldHJpZXZpbmcgcmVsZXZhbnQgdGV4dHMgdGhhdCBjb25maXJtIG9yIHJlZnV0ZSB0aGUgY2xhaW0gYWNjdXJhdGVseS4=)
Given three text fields: ‘claim‘, ‘summary_1‘, and ‘summary_2‘, your task is to produce a ‘query‘ field that is designed to effectively retrieve evidence documents relevant to verifying or refuting the claim based on the information contained in the two summaries.


Detailed task description and considerations:


1. **Purpose of the Query:**
 - The query should accurately and comprehensively target the key factual elements from the claim that are addressed or clarified in the summaries.
 - The query will be used to retrieve evidence documents, so it should be specific enough to pinpoint relevant support or contradiction but broad enough to cover all important details present in the summaries.


2. **Utilizing the Summaries:**
 - Summaries often correct, clarify, or add factual context to the claim. Your query must incorporate these clarifications (e.g., name corrections, factual specifics, or counterpoints) to ensure retrieval of relevant evidence reflecting the nuanced truth.
 - Include all distinctive entities, facts, dates, locations, names, and relationships mentioned or corrected in the summaries that pertain to the claim.
 - For example, if a summary corrects a documentary title in the claim, the query should reference the corrected title and related details to guide retrieval effectively.


3. **Query Content Strategy:**
 - Explicitly mention key entities, such as persons, places, dates, works, or political entities involved.
 - Include attributes or relationships relevant to the claim’s accuracy (e.g., "Was person X a politician in country Y during year Z?" or "Did documentary A and documentary B film in different locations such as location 1 and location 2?").
 - If there is a factual dispute or correction in the summaries (e.g., nationality, official names, population figures), phrase the query to target evidence clarifying this dispute.


4. **Domain-Specific Nuances:**
 - Be mindful of historical geopolitical names and periods (e.g., "United Kingdom of the Netherlands between 1815 and 1830").
 - Recognize proper titles and correct spellings (e.g., corrected documentary titles).
 - Include both subjects or objects mentioned as comparisons or contrasts in the claim and summaries (e.g., two documentaries, two politicians, two towns).


5. **Formulation Style:**
 - Queries should be phrased as clear, precise, and objective questions that can be answered based on evidence — often structured as yes/no or informational queries.
 - Avoid overly broad or vague phrasing. Aim for detail-rich queries that connect multiple evidence points in the summaries.


6. **Generalizable Strategy:**
 - Identify the core claim elements and verify if the summaries confirm, contradict, or amend these elements.
 - Incorporate both the claim and corrections from summaries into the query so evidence retrieval captures the full factual context.
 - Use the comparison or contrast highlighted by the summaries to create queries that specifically test the claim’s veracity (e.g., comparing locations, roles, or historical timeframes).


By following these guidelines, you will generate queries that maximize the likelihood of retrieving relevant texts that confirm or refute the claim accurately.

HoVer GPT-4.1 Mini summarize1.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgcGFzc2FnZXNgLCBwcm9kdWNlIHRoZSBmaWVsZHMgYHN1bW1hcnlgLg==)
Given the fields ‘claim‘, ‘passages‘, produce the fields ‘summary‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gYSBgY2xhaW1gIGFuZCBhIGxpc3Qgb2YgcmVsZXZhbnQgYHBhc3NhZ2VzYCwgY2FyZWZ1bGx5IGFuYWx5emUgdGhlIGV2aWRlbmNlIGJ5IHJlYXNvbmluZyBzdGVwLWJ5LXN0ZXAgdG8gYXNzZXNzIHRoZSBjbGFpbSdzIHZhbGlkaXR5LiBQcm9kdWNlIGEgZGV0YWlsZWQgY2hhaW4tb2YtdGhvdWdodCBgcmVhc29uaW5nYCB0aGF0IGV4cGxhaW5zIGhvdyB0aGUgaW5mb3JtYXRpb24gaW4gdGhlIHBhc3NhZ2VzIHN1cHBvcnRzIG9yIHJlZnV0ZXMgdGhlIGNsYWltLCBmb2xsb3dlZCBieSBhIGNsZWFyLCBjb25jaXNlIGBzdW1tYXJ5YCB0aGF0IHN5bnRoZXNpemVzIHRoZSBrZXkgZmluZGluZ3MgaW4gcmVsYXRpb24gdG8gdGhlIGNsYWltLiBFbnN1cmUgdGhlIHJlYXNvbmluZyBleHBsaWNpdGx5IGNvbm5lY3RzIGV2aWRlbmNlIGZyb20gdGhlIHBhc3NhZ2VzIHRvIHRoZSBjbGFpbSwgZW5hYmxpbmcgYSB0aG9yb3VnaCBhbmQgdHJhbnNwYXJlbnQgbXVsdGktaG9wIHZlcmlmaWNhdGlvbiBwcm9jZXNzLgpEZW1vczoKRXhhbXBsZSAxOgpjbGFpbToKICAgIFRoZSBtYW51ZmFjdHVyZXIgdGhhdCBvd25zIHRoZSBjb21wYW55IHRoYXQgY3VycmVudGx5IHByb2R1Y2VkIGFuZCBtYXJrZXRlZCB0aGUgY2FuZHkgdGhlIHZpZGVvIGdhbWUgRGFya2VuZWQgU2t5ZSB1c2VzIGluIG1hZ2ljIGlzIGhlYWRxdWFydGVyZWQgaW4gdGhlIFVTIHN0YXRlIFZpcmdpbmlhLgpwYXNzYWdlczoKICAgIFsnRGFya2VuZWQgU2t5ZSB8IERhcmtlbmVkIFNreWUgaXMgYSB0aGlyZC1wZXJzb24gYWN0aW9uLWFkdmVudHVyZSB2aWRlbyBnYW1lIGRldmVsb3BlZCBieSBCb3N0b24gQW5pbWF0aW9uLiAgSXQgd2FzIHJlbGVhc2VkIGZvciBNaWNyb3NvZnQgV2luZG93cyBhbmQgdGhlIE5pbnRlbmRvIEdhbWVDdWJlIGluIE5vcnRoIEFtZXJpY2EgaW4gMjAwMiBhbmQgdGhlIFBBTCByZWdpb25zIGluIDIwMDMuICBUaGUgZ2FtZSB3YXMgYWxzbyBwYWNrYWdlZCB3aXRoIE91dGxhdyBHb2xmLiAgSXRzIHRpdGxlIGNoYXJhY3RlciBpcyBhIHlvdW5nIHdvbWFuIG5hbWVkIFNreWUgd2hvIGxpdmVzIGluIGEgZmFudGFzeSByZWFsbSBzZWFyY2hpbmcgZm9yIGhlciBtb3RoZXIuICBTaGUgZG9lcyBub3QgdXNlIGZpcmVhcm1zLCBidXQgY2FuIHBlcmZvcm0gbWFnaWMgdXNpbmcgU2tpdHRsZXMgY2FuZGllcywgYXMgd2VsbCBhcyB1c2UgaGVyIHN0YWZmIGFzIGEgbWVsZWUgd2VhcG9uLCB0aG91Z2ggaXQgYWxzbyBiZWNvbWVzIGFuIGVuZXJneSB3ZWFwb24gd2hlbiB1c2VkIGluIGNvbmp1bmN0aW9uIHdpdGggdGhlIFNraXR0bGVzLicsICJSb2NrZXQgRml6eiB8IFJvY2tldCBGaXp6IGlzIGEgZnJhbmNoaXNlIGNoYWluIG9mIGNhbmR5IHN0b3JlcyBpbiB0aGUgVW5pdGVkIFN0YXRlcy4gIFRoZSBjb21wYW55IG1hcmtldHMgYSBkaXZlcnNlIHZhcmlldHkgb2YgY2FuZGllcyBhbmQgcHJvZHVjZXMgaXRzIG93biBsaW5lIG9mIHNvZnQgZHJpbmtzIHdpdGggdW5pcXVlIGZsYXZvcnMuICBJdHMgZmxhZ3NoaXAgc3RvcmUgaXMgbG9jYXRlZCBpbiBDYW1hcmlsbG8sIENhbGlmb3JuaWEsIGFuZCBtb3N0IG9mIHRoZSBjb21wYW55J3MgZnJhbmNoaXNlIHN0b3JlcyBhcmUgbG9jYXRlZCBpbiBDYWxpZm9ybmlhLiAgVGhlIGNvbXBhbnkgYWxzbyBtYXJrZXRzIGNhbmRpZXMgdGhhdCBhcmUgcmFyZSB0byBmaW5kIG9yIGluIGxpbWl0ZWQgcHJvZHVjdGlvbiBieSB2YXJpb3VzIG1hbnVmYWN0dXJlcnMsIHN1Y2ggYXMgdGhvc2UgdGhhdCB3ZXJlIHBvcHVsYXIgZHVyaW5nIHRoZSAxOTYwcyB0byAxOTgwcy4gIEFzIG9mIFNlcHRlbWJlciAyMDE3LCB0aGVyZSBhcmUgODYgUm9ja2V0IEZpenogc3RvcmUgbG9jYXRpb25zIGluIHRoZSBVbml0ZWQgU3RhdGVzLiIsICdTcGFuZ2xlciBDYW5keSBDb21wYW55IHwgVGhlIFNwYW5nbGVyIENhbmR5IENvbXBhbnkgaXMgYSBwcml2YXRlbHkgb3duZWQgaW50ZXJuYXRpb25hbCBjb25mZWN0aW9uZXIgdGhhdCBoYXMgYmVlbiBtYW51ZmFjdHVyaW5nIGFuZCBtYXJrZXRpbmcgY2FuZHkgc2luY2UgMTkwNi4nLCAnRnV0dXJlIFVTIHwgRnV0dXJlIFVTLCBJbmMuIChmb3JtZXJseSBrbm93biBhcyBJbWFnaW5lIE1lZGlhIGFuZCBUaGUgRnV0dXJlIE5ldHdvcmsgVVNBKSBpcyBhbiBBbWVyaWNhbiBtZWRpYSBjb3Jwb3JhdGlvbiBzcGVjaWFsaXppbmcgaW4gdGFyZ2V0ZWQgbWFnYXppbmVzIGFuZCB3ZWJzaXRlcyBpbiB0aGUgdmlkZW8gZ2FtZXMsIG11c2ljLCBhbmQgdGVjaG5vbG9neSBtYXJrZXRzLiAgRnV0dXJlIFVTIGlzIGhlYWRxdWFydGVyZWQgaW4gdGhlIFNhbiBGcmFuY2lzY28gd2l0aCBhIHNtYWxsIHNhbGVzIG9mZmljZSBpbiBOZXcgWW9yayBDaXR5LiAgRnV0dXJlIFVTIGlzIG93bmVkIGJ5IHBhcmVudCBjb21wYW55LCBGdXR1cmUgcGxjLCBhIHNtYWxsIHB1Ymxpc2hpbmcgY29tcGFueSBiYXNlZCBpbiB0aGUgVW5pdGVkIEtpbmdkb20uJywgJ0Z1biBEaXAgfCBGdW4gRGlwIGlzIGEgY2FuZHkgbWFudWZhY3R1cmVkIGJ5IFRoZSBXaWxseSBXb25rYSBDYW5keSBDb21wYW55LCBhIGJyYW5kIG93bmVkIGJ5IE5lc3Rsw6kuICBUaGUgY2FuZHkgaGFzIGJlZW4gb24gdGhlIG1hcmtldCBpbiB0aGUgVW5pdGVkIFN0YXRlcyBhbmQgQ2FuYWRhIHNpbmNlIHRoZSAxOTQwcyBhbmQgd2FzIG9yaWdpbmFsbHkgY2FsbGVkIExpay1NLUFpZC4gIEl0IHdhcyBvcmlnaW5hbGx5IG1hbnVmYWN0dXJlZCBieSBGcnV6b2xhLCBhbmQgdGhlbiBTdW5saW5lIEluYy4sIHRocm91Z2ggdGhlaXIgU3VubWFyayBCcmFuZHMgZGl2aXNpb24sIHdoaWNoIHdhcyBwdXJjaGFzZWQgYnkgTmVzdGzDqSBpbiBKYW51YXJ5IDE5ODkuICBJdCBjb21lcyBpbiBtYW55IGRpZmZlcmVudCBmbGF2b3JzIHdpdGggY2FuZHkgc3RpY2tzIHRoYXQgYXJlIGluY2x1ZGVkLicsICdIb3QgVGFtYWxlcyB8IEhvdCBUYW1hbGVzIGlzIGEgY2hld3ksIGNpbm5hbW9uIGZsYXZvcmVkLCBvYmxvbmctc2hhcGVkIGNhbmR5IGludHJvZHVjZWQgaW4gMTk1MCDigJQgbWFudWZhY3R1cmVkIGFuZCBtYXJrZXRlZCBpbiB0aGUgVW5pdGVkIFN0YXRlcyBieSBKdXN0IEJvcm4sIGEgZmFtaWx5LW93bmVkLCBQZW5uc3lsdmFuaWEtYmFzZWQgY2FuZHkgY29tcGFueS4nLCAiRnJhbmtmb3JkIENhbmR5ICZhbXA7IENob2NvbGF0ZSBDb21wYW55IHwgRnJhbmtmb3JkIENhbmR5ICYgQ2hvY29sYXRlIENvbXBhbnkgaXMgYW4gQW1lcmljYW4gY2FuZHkgbWFudWZhY3R1cmVyLCBsb2NhdGVkIGluIFBoaWxhZGVscGhpYSwgUGVubnN5bHZhbmlhLCBmb3VuZGVkIGluIDE5NDcgYnkgU2FtIEhpbW1lbHN0ZWluLiAgVGhlIGN1cnJlbnQgQ0VPIGlzIFN0dWFydCBTZWxhcm5pY2suICBJbiByZWNlbnQgeWVhcnMsIEZyYW5rZm9yZCBDYW5keSAmIENob2NvbGF0ZSBDb21wYW55IGhhcyBiZWNvbWUgYSB2ZXJ5IHN1Y2Nlc3NmdWwgY2FuZHkgbWFudWZhY3R1cmVyLiAgSXQgaXMgb25lIG9mIHRoZSBsYXJnZXN0IHByb2R1Y2VycyBvZiBjaG9jb2xhdGUgcmFiYml0cyBpbiB0aGUgVW5pdGVkIFN0YXRlcywgbWFraW5nIG92ZXIgMTAwIHZhcmlldGllcy4gIEluIDIwMDAsIGl0IHN0YXJ0ZWQgbGljZW5zaW5nIHBvcHVsYXIgY2hpbGRyZW4ncyBUViBjaGFyYWN0ZXJzLCBzdWNoIGFzIFNwb25nZUJvYiBTcXVhcmVQYW50cy4iXQpyZWFzb25pbmc6CiAgICBUaGUgY2xhaW0gc3RhdGVzIHRoYXQgdGhlIG1hbnVmYWN0dXJlciBvZiB0aGUgY2FuZHkgdXNlZCBpbiB0aGUgdmlkZW8gZ2FtZSBEYXJrZW5lZCBTa3llIGlzIGhlYWRxdWFydGVyZWQgaW4gVmlyZ2luaWEuIFBhc3NhZ2UgWzFdIGVzdGFibGlzaGVzIHRoYXQgdGhlIHZpZGVvIGdhbWUgRGFya2VuZWQgU2t5ZSB1c2VzIFNraXR0bGVzIGNhbmRpZXMgZm9yIG1hZ2ljLiBUaGVyZWZvcmUsIHRoZSBjYW5keSBpbiBxdWVzdGlvbiBpcyBTa2l0dGxlcy4gVGhlIGNydWNpYWwgc3RlcCBpcyB0byBpZGVudGlmeSB0aGUgY29tcGFueSB0aGF0IHByb2R1Y2VzIGFuZCBtYXJrZXRzIFNraXR0bGVzIGFuZCB3aGV0aGVyIGl0IGlzIGhlYWRxdWFydGVyZWQgaW4gVmlyZ2luaWEuIE5vbmUgb2YgdGhlIHByb3ZpZGVkIHBhc3NhZ2VzIGV4cGxpY2l0bHkgbWVudGlvbiBTa2l0dGxlcyBvciBpdHMgbWFudWZhY3R1cmVyLiBUaGUgcGFzc2FnZXMgbGlzdCB2YXJpb3VzIGNhbmR5IGNvbXBhbmllcywgYnV0IG5vbmUgbWVudGlvbiBTa2l0dGxlcyBvciBtYXRjaCBpdHMgbWFudWZhY3R1cmVyLiBUaGUga25vd24gcHJvZHVjZXIgb2YgU2tpdHRsZXMgaXMgTWFycywgSW5jb3Jwb3JhdGVkLCB3aGljaCBpcyBoZWFkcXVhcnRlcmVkIGluIE1jTGVhbiwgVmlyZ2luaWEuIEFsdGhvdWdoIHRoaXMgZmFjdCBpcyBub3QgZGlyZWN0bHkgc3RhdGVkIGluIHRoZSBwcm92aWRlZCBwYXNzYWdlcywgaXQgaXMgcmVsZXZhbnQgZ2VuZXJhbCBrbm93bGVkZ2UuIFNpbmNlIHRoZSBwYXNzYWdlcyBkbyBub3QgcmVmdXRlIHRoZSBjbGFpbSBhbmQgZm9yIGFjY3VyYWN5IGJhc2VkIG9uIGtub3duIGZhY3RzLCB0aGUgY2xhaW0gY2FuIGJlIGNvbnNpZGVyZWQgdHJ1ZSB0aGF0IHRoZSBtYW51ZmFjdHVyZXIgdGhhdCBvd25zIHRoZSBjb21wYW55IHByb2R1Y2luZyBhbmQgbWFya2V0aW5nIFNraXR0bGVzIGlzIGhlYWRxdWFydGVyZWQgaW4gVmlyZ2luaWEuCnN1bW1hcnk6CiAgICBUaGUgY2FuZHkgdXNlZCBhcyBtYWdpYyBpbiBEYXJrZW5lZCBTa3llIGlzIFNraXR0bGVzLCB3aGljaCBhcmUgcHJvZHVjZWQgYnkgTWFycywgSW5jb3Jwb3JhdGVkLiBNYXJzIGlzIGhlYWRxdWFydGVyZWQgaW4gTWNMZWFuLCBWaXJnaW5pYSwgYSBVUyBzdGF0ZS4gVGhlcmVmb3JlLCB0aGUgY2xhaW0gaXMgdHJ1ZSBiYXNlZCBvbiBleHRlcm5hbCBrbm93bGVkZ2UgY29uZmlybWluZyB0aGF0IHRoZSBtYW51ZmFjdHVyZXIgaXMgYmFzZWQgaW4gVmlyZ2luaWEuCgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
Given a ‘claim‘ and a list of relevant ‘passages‘, carefully analyze the evidence by reasoning step-by-step to assess the claim’s validity. Produce a detailed chain-of-thought ‘reasoning‘ that explains how the information in the passages supports or refutes the claim, followed by a clear, concise ‘summary‘ that synthesizes the key findings in relation to the claim. Ensure the reasoning explicitly connects evidence from the passages to the claim, enabling a thorough and transparent multi-hop verification process.
Demos:
Example 1:
claim:
 The manufacturer that owns the company that currently produced and marketed the candy the video game Darkened Skye uses in magic is headquartered in the US state Virginia.
passages:
 [’Darkened Skye | Darkened Skye is a third-person action-adventure video game developed by Boston Animation. It was released for Microsoft Windows and the Nintendo GameCube in North America in 2002 and the PAL regions in 2003. The game was also packaged with Outlaw Golf. Its title character is a young woman named Skye who lives in a fantasy realm searching for her mother. She does not use firearms, but can perform magic using Skittles candies, as well as use her staff as a melee weapon, though it also becomes an energy weapon when used in conjunction with the Skittles.’, "Rocket Fizz | Rocket Fizz is a franchise chain of candy stores in the United States. The company markets a diverse variety of candies and produces its own line of soft drinks with unique flavors. Its flagship store is located in Camarillo, California, and most of the company’s franchise stores are located in California. The company also markets candies that are rare to find or in limited production by various manufacturers, such as those that were popular during the 1960s to 1980s. As of September 2017, there are 86 Rocket Fizz store locations in the United States.", ’Spangler Candy Company | The Spangler Candy Company is a privately owned international confectioner that has been manufacturing and marketing candy since 1906.’, ’Future US | Future US, Inc. (formerly known as Imagine Media and The Future Network USA) is an American media corporation specializing in targeted magazines and websites in the video games, music, and technology markets. Future US is headquartered in the San Francisco with a small sales office in New York City. Future US is owned by parent company, Future plc, a small publishing company based in the United Kingdom.’, ’Fun Dip | Fun Dip is a candy manufactured by The Willy Wonka Candy Company, a brand owned by Nestlé. The candy has been on the market in the United States and Canada since the 1940s and was originally called Lik-M-Aid. It was originally manufactured by Fruzola, and then Sunline Inc., through their Sunmark Brands division, which was purchased by Nestlé in January 1989. It comes in many different flavors with candy sticks that are included.’, ’Hot Tamales | Hot Tamales is a chewy, cinnamon flavored, oblong-shaped candy introduced in 1950 — manufactured and marketed in the United States by Just Born, a family-owned, Pennsylvania-based candy company.’, "Frankford Candy &amp; Chocolate Company | Frankford Candy & Chocolate Company is an American candy manufacturer, located in Philadelphia, Pennsylvania, founded in 1947 by Sam Himmelstein. The current CEO is Stuart Selarnick. In recent years, Frankford Candy & Chocolate Company has become a very successful candy manufacturer. It is one of the largest producers of chocolate rabbits in the United States, making over 100 varieties. In 2000, it started licensing popular children’s TV characters, such as SpongeBob SquarePants."]
reasoning:
 The claim states that the manufacturer of the candy used in the video game Darkened Skye is headquartered in Virginia. Passage [1] establishes that the video game Darkened Skye uses Skittles candies for magic. Therefore, the candy in question is Skittles. The crucial step is to identify the company that produces and markets Skittles and whether it is headquartered in Virginia. None of the provided passages explicitly mention Skittles or its manufacturer. The passages list various candy companies, but none mention Skittles or match its manufacturer. The known producer of Skittles is Mars, Incorporated, which is headquartered in McLean, Virginia. Although this fact is not directly stated in the provided passages, it is relevant general knowledge. Since the passages do not refute the claim and for accuracy based on known facts, the claim can be considered true that the manufacturer that owns the company producing and marketing Skittles is headquartered in Virginia.
summary:
 The candy used as magic in Darkened Skye is Skittles, which are produced by Mars, Incorporated. Mars is headquartered in McLean, Virginia, a US state. Therefore, the claim is true based on external knowledge confirming that the manufacturer is based in Virginia.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgcGFzc2FnZXNgLCBwcm9kdWNlIHRoZSBmaWVsZHMgYHN1bW1hcnlgLg==)
Given the fields ‘claim‘, ‘passages‘, produce the fields ‘summary‘.

HoVer GPT-4.1 Mini summarize2.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgY29udGV4dGAsIGBwYXNzYWdlc2AsIHByb2R1Y2UgdGhlIGZpZWxkcyBgc3VtbWFyeWAu)
Given the fields ‘claim‘, ‘context‘, ‘passages‘, produce the fields ‘summary‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gYSBgY2xhaW1gLCByZWxldmFudCBgY29udGV4dGAsIGFuZCBhIHNldCBvZiBzdXBwb3J0aW5nIGBwYXNzYWdlc2AsIGdlbmVyYXRlIGEgZGV0YWlsZWQgc3RlcC1ieS1zdGVwIHJlYXNvbmluZyBwcm9jZXNzIHRoYXQgbG9naWNhbGx5IGNvbm5lY3RzIHRoZSBldmlkZW5jZSB0byB0aGUgY2xhaW0sIGZvbGxvd2VkIGJ5IGEgY29uY2lzZSBzdW1tYXJ5IHRoYXQgY2xlYXJseSBzdGF0ZXMgd2hldGhlciB0aGUgY2xhaW0gaXMgc3VwcG9ydGVkIG9yIHJlZnV0ZWQgYmFzZWQgb24gdGhlIGFnZ3JlZ2F0ZWQgaW5mb3JtYXRpb24uIEVuc3VyZSB0aGUgcmVhc29uaW5nIGV4cGxpY2l0bHkgcmVmZXJlbmNlcyBrZXkgZXZpZGVuY2UgZnJvbSB0aGUgY29udGV4dCBhbmQgcGFzc2FnZXMgdG8ganVzdGlmeSB0aGUgY29uY2x1c2lvbiBpbiB0aGUgc3VtbWFyeS4KRGVtb3M6CkV4YW1wbGUgMToKY2xhaW06CiAgICBPbmUgaGFsZiBvZiB0aGUgS2FseWFuamnigJNBbmFuZGppIGR1bywgS2FseWFuamkgVmlyamkgU2hhaCdzIGJyb3RoZXIsIHdvbiB0aGUgRmlsbWZhcmUgQXdhcmQgZm9yIEJlc3QgTXVzaWMgRGlyZWN0b3IuCmNvbnRleHQ6CiAgICBZZXMsIEthbHlhbmppIFZpcmppIFNoYWgncyBicm90aGVyIEFuYW5kamkgVmlyamkgU2hhaCwgYXMgcGFydCBvZiB0aGUgS2FseWFuamnigJNBbmFuZGppIGR1bywgd29uIHRoZSBGaWxtZmFyZSBBd2FyZCBmb3IgQmVzdCBNdXNpYyBEaXJlY3RvciBpbiAxOTc1IGZvciB0aGUgZmlsbSAiS29yYSBLYWdhei4iCnBhc3NhZ2VzOgogICAgWydLYWx5YW5qaSBWaXJqaSBTaGFoIHwgS2FseWFuamkgVmlyamkgU2hhaCAoMzAgSnVuZSAxOTI4IOKAkyAyNCBBdWd1c3QgMjAwMCkgd2FzIHRoZSAiS2FseWFuamkiIG9mIHRoZSBLYWx5YW5qaS1BbmFuZGppIGR1by4gIEhlIGFuZCBoaXMgYnJvdGhlciBBbmFuZGppIFZpcmppIFNoYWggaGF2ZSBiZWVuIGZhbW91cyBJbmRpYW4gZmlsbSBtdXNpY2lhbnMsIGFuZCB3b24gdGhlIDE5NzUgRmlsbWZhcmUgQXdhcmQgZm9yIEJlc3QgTXVzaWMgRGlyZWN0b3IsIGZvciAiS29yYSBLYWdheiIuICBIZSBpcyBhIHJlY2lwaWVudCBvZiB0aGUgY2l2aWxpYW4gaG9ub3VyIG9mIFBhZG1hIFNocmkgKDE5OTIpLicsICdBbmFuZGppIFZpcmppIFNoYWggfCBBbmFuZGppIFZpcmppIFNoYWggaXMgYW4gSW5kaWFuIG11c2ljIGRpcmVjdG9yLiAgVG9nZXRoZXIgd2l0aCBoaXMgYnJvdGhlciBoZSBmb3JtZWQgdGhlIEthbHlhbmppLUFuYW5kamkgZHVvLCBhbmQgd29uIHRoZSAxOTc1IEZpbG1mYXJlIEF3YXJkIGZvciBCZXN0IE11c2ljIERpcmVjdG9yLCBmb3IgIktvcmEgS2FnYXoiLiAgSGUgaXMgYSByZWNpcGllbnQgb2YgdGhlIGNpdmlsaWFuIGhvbm91ciBvZiBQYWRtYSBTaHJpICgxOTkyKS4nLCAnS2FseWFuamnigJNBbmFuZGppIHwgS2FseWFuamnigJNBbmFuZGppIGFyZSBhbiBJbmRpYW4gY29tcG9zZXIgZHVvIGZyb20gR3VqYXJhdDogS2FseWFuamkgVmlyamkgU2hhaCAoMzAgSnVuZSAxOTI4LTAzIE5vdmVtYmVyIDIwMDApIGFuZCBoaXMgYnJvdGhlciBBbmFuZGppIFZpcmppIFNoYWggKGJvcm4gMDIgTWFyY2ggMTkzMykuICBUaGUgZHVvIGFyZSBrbm93biBmb3IgdGhlaXIgd29yayBvbiBIaW5kaSBmaWxtIHNvdW5kdHJhY2tzLCBwYXJ0aWN1bGFybHkgYWN0aW9uIHBvdGJvaWxlcnMgaW4gdGhlIDE5NzBzLiAgU29tZSBvZiB0aGVpciBiZXN0LWtub3duIHdvcmtzIGFyZSAiRG9uIiwgIkJhaXJhYWciLCAiU2FyYXN3YXRpY2hhbmRyYSIsICJRdXJiYW5pIiwgIlRyaWRldiIgYW5kICJTYWZhciIuICBUaGV5IHdvbiB0aGUgMTk3NSBGaWxtZmFyZSBBd2FyZCBmb3IgQmVzdCBNdXNpYyBEaXJlY3RvciBmb3IgIktvcmEgS2FnYXoiLicsICdLYWx5YW5qaeKAk0FuYW5kamkgZGlzY29ncmFwaHkgfCBUaGlzIGlzIGEgZGlzY29ncmFwaHkgb2YgQm9sbHl3b29kIGNvbXBvc2VyIGR1byBLYWx5YW5qaSBBbmFuZGppLCBjb25zaXN0aW5nIG9mIEthbHlhbmppIFZpcmppIFNoYWggYW5kIEFuYW5kamkgVmlyamkgU2hhaC4gIFRoZXkgaGF2ZSBjb21wb3NlZCBtdXNpYyBmb3Igb3ZlciAyMDAgZmlsbXMgaW4gdGhlaXIgNDYgeWVhciBjYXJlZXIuJywgJ1ZpanUgU2hhaCB8IFZpanUgU2hhaCAoYm9ybiwgVmlqYXkgS2FseWFuamkgU2hhaCwgNSBKdW5lIDE5NTkpIGlzIGEgbXVzaWMgZGlyZWN0b3Igb2YgSGluZGkgY2luZW1hLiAgSGUgaXMgdGhlIHNvbiBvZiBtdXNpYyBkaXJlY3RvciBLYWx5YW5qaSBWaXJqaSBTaGFoIG9mIGNvbXBvc2VyIGR1byBLYWx5YW5qaSBBbmFuZGppLiAgSGUgY29tcG9zZWQgbXVzaWMgZm9yIG1vdmllcyBzdWNoIGFzICJWaXNod2F0YW1hIiAoMTk5MiksICJNb2hyYSIgKDE5OTQpLCAiVGVyZSBNZXJlIFNhcG5lIiAoMTk5NikgYW5kICIiICgxOTk3KSBmb3Igd2hpY2ggZ290IGhpcyBzZWNvbmQgbm9taW5hdGlvbiBmb3IgdGhlIEZpbG1mYXJlIEF3YXJkIGZvciBCZXN0IE11c2ljIERpcmVjdG9yIGFuZCBoZSB3b24gdGhlIDE5OTggRmlsbWZhcmUgQXdhcmQgZm9yIEJlc3QgQmFja2dyb3VuZCBTY29yZSBmb3IgIiIuJywgJ0JvbWJheSB0aGUgSGFyZCBXYXk6IEd1bnMsIENhcnMgYW5kIFNpdGFycyB8IEJvbWJheSB0aGUgSGFyZCBXYXk6IEd1bnMsIENhcnMgYW5kIFNpdGFycyBpcyBhIDE5OTggcHJvamVjdCBvZiBwcm9kdWNlciBEYW4gdGhlIEF1dG9tYXRvciBpbiB3aGljaCBtdXNpYyBmcm9tIDE5NzBzIGZ1bmsgQm9sbHl3b29kIGNvbXBvc2VyIGR1byBLYWx5YW5qaS1BbmFuZGppIChLYWx5YW5qaSBWaXJqaSBTaGFoIGFuZCBBbmFuZGppIFZpcmppIFNoYWgpIHdhcyB0YWtlbiBhbmQgZ2l2ZW4gYSBmdW5reSByZW1peC4gIFRoZSBhbGJ1bSB3YXMgZXZlbnR1YWxseSB3aXRoZHJhd24gKHBvc3NpYmx5IGR1ZSB0byBjb3B5cmlnaHQgY29uY2VybnMpLiAgQSBzZXF1ZWwsICJCb21iYXkgMjogRWxlY3RyaWMgVmluZGFsb28iLCB3YXMgYWxzbyBwcm9kdWNlZC4nLCAnS29yYSBLYWdheiB8IEtvcmEgS2FnYXogKEhpbmRpOiDgpJXgpYvgpLDgpL4g4KSV4KS+4KSX4KSc4KS8OyB0cmFuc2xhdGlvbjogQmxhbmsgUGFwZXIpIGlzIGEgMTk3NCBIaW5kaSBkcmFtYSBmaWxtIHByb2R1Y2VkIGJ5IFNhbmF0aCBLb3RoYXJpIGFuZCBkaXJlY3RlZCBieSBBbmlsIEdhbmd1bHkuICBUaGUgZmlsbSBzdGFycyBWaWpheSBBbmFuZCwgSmF5YSBCaGFkdXJpLCBBLksuIEhhbmdhbCwgQWNoYWxhIFNhY2hkZXYgYW5kIERldmVuIFZlcm1hLiAgVGhlIGZpbG1zIG11c2ljIGlzIGJ5IEthbHlhbmppIEFuYW5kamkuICBUaGUgZmFtb3VzIHRpdGxlIHNvbmcgIk1lcmEgSmVldmFuIEtvcmEgS2FnYXoiIHdhcyBieSBLaXNob3JlIEt1bWFyLiddCnJlYXNvbmluZzoKICAgIFRoZSBjbGFpbSBzdGF0ZXMgdGhhdCBvbmUgaGFsZiBvZiB0aGUgS2FseWFuamnigJNBbmFuZGppIGR1bywgS2FseWFuamkgVmlyamkgU2hhaCdzIGJyb3RoZXIsIHdvbiB0aGUgRmlsbWZhcmUgQXdhcmQgZm9yIEJlc3QgTXVzaWMgRGlyZWN0b3IuIEZyb20gdGhlIHBhc3NhZ2VzIGFuZCBjb250ZXh0LCBpdCBpcyBjbGVhciB0aGF0IHRoZSBkdW8gY29uc2lzdHMgb2YgS2FseWFuamkgVmlyamkgU2hhaCBhbmQgaGlzIGJyb3RoZXIgQW5hbmRqaSBWaXJqaSBTaGFoLiBCb3RoIHRvZ2V0aGVyIHdvbiB0aGUgRmlsbWZhcmUgQXdhcmQgZm9yIEJlc3QgTXVzaWMgRGlyZWN0b3IgaW4gMTk3NSBmb3IgdGhlIGZpbG0gIktvcmEgS2FnYXouIiBUaGVyZWZvcmUsIEFuYW5kamkgVmlyamkgU2hhaCwgd2hvIGlzIEthbHlhbmppJ3MgYnJvdGhlciwgaW5kZWVkIHdvbiB0aGUgRmlsbWZhcmUgQXdhcmQgZm9yIEJlc3QgTXVzaWMgRGlyZWN0b3IgYXMgcGFydCBvZiB0aGlzIGR1by4Kc3VtbWFyeToKICAgIEFuYW5kamkgVmlyamkgU2hhaCwgdGhlIGJyb3RoZXIgb2YgS2FseWFuamkgVmlyamkgU2hhaCwgd29uIHRoZSBGaWxtZmFyZSBBd2FyZCBmb3IgQmVzdCBNdXNpYyBEaXJlY3RvciBpbiAxOTc1IGFzIHBhcnQgb2YgdGhlIEthbHlhbmpp4oCTQW5hbmRqaSBkdW8uCgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
Given a ‘claim‘, relevant ‘context‘, and a set of supporting ‘passages‘, generate a detailed step-by-step reasoning process that logically connects the evidence to the claim, followed by a concise summary that clearly states whether the claim is supported or refuted based on the aggregated information. Ensure the reasoning explicitly references key evidence from the context and passages to justify the conclusion in the summary.
Demos:
Example 1:
claim:
 One half of the Kalyanji–Anandji duo, Kalyanji Virji Shah’s brother, won the Filmfare Award for Best Music Director.
context:
 Yes, Kalyanji Virji Shah’s brother Anandji Virji Shah, as part of the Kalyanji–Anandji duo, won the Filmfare Award for Best Music Director in 1975 for the film "Kora Kagaz."
passages:
 [’Kalyanji Virji Shah | Kalyanji Virji Shah (30 June 1928 – 24 August 2000) was the "Kalyanji" of the Kalyanji-Anandji duo. He and his brother Anandji Virji Shah have been famous Indian film musicians, and won the 1975 Filmfare Award for Best Music Director, for "Kora Kagaz". He is a recipient of the civilian honour of Padma Shri (1992).’, ’Anandji Virji Shah | Anandji Virji Shah is an Indian music director. Together with his brother he formed the Kalyanji-Anandji duo, and won the 1975 Filmfare Award for Best Music Director, for "Kora Kagaz". He is a recipient of the civilian honour of Padma Shri (1992).’, ’Kalyanji–Anandji | Kalyanji–Anandji are an Indian composer duo from Gujarat: Kalyanji Virji Shah (30 June 1928-03 November 2000) and his brother Anandji Virji Shah (born 02 March 1933). The duo are known for their work on Hindi film soundtracks, particularly action potboilers in the 1970s. Some of their best-known works are "Don", "Bairaag", "Saraswatichandra", "Qurbani", "Tridev" and "Safar". They won the 1975 Filmfare Award for Best Music Director for "Kora Kagaz".’, ’Kalyanji–Anandji discography | This is a discography of Bollywood composer duo Kalyanji Anandji, consisting of Kalyanji Virji Shah and Anandji Virji Shah. They have composed music for over 200 films in their 46 year career.’, ’Viju Shah | Viju Shah (born, Vijay Kalyanji Shah, 5 June 1959) is a music director of Hindi cinema. He is the son of music director Kalyanji Virji Shah of composer duo Kalyanji Anandji. He composed music for movies such as "Vishwatama" (1992), "Mohra" (1994), "Tere Mere Sapne" (1996) and "" (1997) for which got his second nomination for the Filmfare Award for Best Music Director and he won the 1998 Filmfare Award for Best Background Score for "".’, ’Bombay the Hard Way: Guns, Cars and Sitars | Bombay the Hard Way: Guns, Cars and Sitars is a 1998 project of producer Dan the Automator in which music from 1970s funk Bollywood composer duo Kalyanji-Anandji (Kalyanji Virji Shah and Anandji Virji Shah) was taken and given a funky remix. The album was eventually withdrawn (possibly due to copyright concerns). A sequel, "Bombay 2: Electric Vindaloo", was also produced.’, ’Kora Kagaz | Kora Kagaz (Hindi: कोरा कागज़; translation: Blank Paper) is a 1974 Hindi drama film produced by Sanath Kothari and directed by Anil Ganguly. The film stars Vijay Anand, Jaya Bhaduri, A.K. Hangal, Achala Sachdev and Deven Verma. The films music is by Kalyanji Anandji. The famous title song "Mera Jeevan Kora Kagaz" was by Kishore Kumar.’]
reasoning:
 The claim states that one half of the Kalyanji–Anandji duo, Kalyanji Virji Shah’s brother, won the Filmfare Award for Best Music Director. From the passages and context, it is clear that the duo consists of Kalyanji Virji Shah and his brother Anandji Virji Shah. Both together won the Filmfare Award for Best Music Director in 1975 for the film "Kora Kagaz." Therefore, Anandji Virji Shah, who is Kalyanji’s brother, indeed won the Filmfare Award for Best Music Director as part of this duo.
summary:
 Anandji Virji Shah, the brother of Kalyanji Virji Shah, won the Filmfare Award for Best Music Director in 1975 as part of the Kalyanji–Anandji duo.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGlucHV0IGZpZWxkczoKCi0gYGNsYWltYDogQSBmYWN0dWFsIHN0YXRlbWVudCBvciBhc3NlcnRpb24gdGhhdCBtYXkgYmUgdHJ1ZSBvciBmYWxzZS4KLSBgY29udGV4dGA6IEEgYnJpZWYgZXhwbGFuYXRpb24gb3Igc3VtbWFyeSByZWxhdGluZyB0byB0aGUgY2xhaW0gdGhhdCB0eXBpY2FsbHkgY2xhcmlmaWVzIHRoZSBjbGFpbeKAmXMgYWNjdXJhY3kuCi0gYHBhc3NhZ2VzYDogQSBsaXN0IG9mIHJlbGV2YW50IHRleHR1YWwgZXZpZGVuY2Ugb3Iga25vd2xlZGdlIHNuaXBwZXRzIGNvbnRhaW5pbmcgZmFjdHMsIGRlc2NyaXB0aW9ucywgb3IgYmlvZ3JhcGhpZXMgcmVsYXRlZCB0byBlbnRpdGllcyBvciBjb25jZXB0cyBtZW50aW9uZWQgaW4gdGhlIGNsYWltLgoKWW91ciB0YXNrIGlzIHRvIHByb2R1Y2UgYSBgc3VtbWFyeWAgdGhhdCBtZWV0cyB0aGUgZm9sbG93aW5nIHJlcXVpcmVtZW50czoKCjEuICoqQWNjdXJhdGVseSByZWZsZWN0IHRoZSByZWxhdGlvbnNoaXAgYmV0d2VlbiB0aGUgY2xhaW0gYW5kIHRoZSBldmlkZW5jZSoqOiBBbmFseXplIHRoZSBpbnB1dCBgY2xhaW1gIGNhcmVmdWxseSBhbmQgY2hlY2sgaXQgYWdhaW5zdCB0aGUgYGNvbnRleHRgIGFuZCBhbGwgYHBhc3NhZ2VzYC4gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGNsYWltIGlzIHN1cHBvcnRlZCwgcGFydGlhbGx5IHN1cHBvcnRlZCwgb3IgY29udHJhZGljdGVkIGJ5IHRoZSBldmlkZW5jZS4KCjIuICoqRXhwbGljaXRseSBjb25uZWN0IGtleSBlbnRpdGllcyBhbmQgZmFjdHMgZnJvbSB0aGUgcGFzc2FnZXMqKjogWW91ciBzdW1tYXJ5IG11c3QgbWVudGlvbiB0aGUgbWFpbiBlbnRpdGllcyBhbmQgZmFjdHMgdGhhdCBkaXJlY3RseSBjb25maXJtIG9yIHJlZnV0ZSBwYXJ0cyBvZiB0aGUgY2xhaW0uIEZvciBleGFtcGxlLCBoaWdobGlnaHQgcmVsZXZhbnQgbmFtZXMsIHdvcmtzIChmaWxtcywgYWxidW1zLCBzb25ncywgYm9va3MpLCBhdHRyaWJ1dGVzLCBkYXRlcywgbmlja25hbWVzLCBvciByb2xlcyB0aGF0IGNsYXJpZnkgdGhlIGNsYWltJ3MgYWNjdXJhY3kuCgozLiAqKk1ha2Ugc3Vic3RhbnRpdmUgY29ubmVjdGlvbnMqKjogVGhlIHN1bW1hcnkgc2hvdWxkIG5vdCBtZXJlbHkgcmVzdGF0ZSB0aGUgY2xhaW0gb3IgY29uY2x1c2lvbi4gSW5zdGVhZCwgaXQgc2hvdWxkIGV4cGxpY2l0bHkgbGluayB0aGUgY2xhaW0gdG8gZGV0YWlsZWQgZXZpZGVuY2UgZnJvbSB0aGUgcGFzc2FnZXPigJRzdWNoIGFzIHNwZWNpZmljIGZpbG0gdGl0bGVzLCBhbGJ1bSBuYW1lcywgc29uZyB0aXRsZXMsIGRhdGVzLCBvciByZWxhdGlvbnNoaXBz4oCUdG8gcHJvdmlkZSBjbGVhciByZWFzb25pbmcgZm9yIHRoZSBhY2N1cmFjeSBvciBpbmFjY3VyYWN5IG9mIHRoZSBjbGFpbS4KCjQuICoqSW5jbHVkZSByZWxldmFudCBkaXNhbWJpZ3VhdGlvbnMgb3IgY2xhcmlmaWNhdGlvbnMqKjogV2hlcmUgYXBwbGljYWJsZSwgY2xhcmlmeSBwb3RlbnRpYWwgbWlzdW5kZXJzdGFuZGluZ3Mgb3IgY29tbW9uIGNvbmZ1c2lvbnMgaGlnaGxpZ2h0ZWQgaW4gdGhlIHBhc3NhZ2VzIChlLmcuLCBkaXN0aW5ndWlzaGluZyBzaW1pbGFybHkgbmFtZWQgZmlsbXMgb3Igc29uZ3MsIHNwZWNpZnlpbmcgd2hpY2ggaW5kaXZpZHVhbCBpcyByZWZlcmVuY2VkLCBvciBub3RpbmcgYWx0ZXJuYXRlIHRpdGxlcyBhbmQgYWRhcHRhdGlvbnMpLgoKNS4gKipVc2UgY29uY2lzZSwgZmFjdHVhbCBsYW5ndWFnZSoqOiBUaGUgc3VtbWFyeSBzaG91bGQgYmUgY2xlYXIgYW5kIHN1Y2NpbmN0IGJ1dCBpbmNsdWRlIGFsbCByZWxldmFudCBldmlkZW5jZSBuZWNlc3NhcnkgdG8gdW5kZXJzdGFuZCBob3cgdGhlIGNsYWltIGlzIHN1cHBvcnRlZCBvciByZWZ1dGVkLgoKNi4gKipTdXBwb3J0IGZ1dHVyZSBxdWVyeSBnZW5lcmF0aW9uKio6IEFzIHRoZSBzdW1tYXJ5IHdpbGwgYmUgdXNlZCB0byBnZW5lcmF0ZSBxdWVyaWVzIHRvIGZpbmQgZXZpZGVuY2UsIGl0IG11c3QgY29udGFpbiBleHBsaWNpdCBtZW50aW9ucyBvZiBrZXkgZW50aXRpZXMsIHRpdGxlcywgYW5kIGZhY3RzIHRoYXQgY2FuIGd1aWRlIHJldHJpZXZhbCBhbmQgcmVhc29uaW5nLgoKKipPdmVyYWxsLCB5b3VyIGFwcHJvYWNoIHNob3VsZCBiZSB0byByZWFzb24gY29tcHJlaGVuc2l2ZWx5IG92ZXIgdGhlIGNsYWltLCBjb250ZXh0LCBhbmQgZWFjaCBwYXNzYWdlLCBzeW50aGVzaXppbmcgY29ubmVjdGVkIGZhY3RzIGFuZCBldmlkZW5jZSBpbnRvIGEgY29oZXJlbnQgYW5kIGV2aWRlbmNlLXJpY2ggc3VtbWFyeSB0aGF0IGNsZWFybHkgZG9jdW1lbnRzIHdoeSB0aGUgY2xhaW0gaXMgdHJ1ZSwgZmFsc2UsIG9yIHBhcnRpYWxseSB0cnVlLioqIEF2b2lkIHZhZ3VlIG9yIG92ZXJseSBnZW5lcmFsIHN0YXRlbWVudHM7IGluc3RlYWQsIGdyb3VuZCB5b3VyIHN1bW1hcnkgaW4gdGhlIHByZWNpc2UgZmFjdHVhbCBkZXRhaWxzIHByZXNlbnQgaW4gdGhlIHBhc3NhZ2VzIGFuZCBjb250ZXh0Lg==)
Given the input fields:


- ‘claim‘: A factual statement or assertion that may be true or false.
- ‘context‘: A brief explanation or summary relating to the claim that typically clarifies the claim’s accuracy.
- ‘passages‘: A list of relevant textual evidence or knowledge snippets containing facts, descriptions, or biographies related to entities or concepts mentioned in the claim.


Your task is to produce a ‘summary‘ that meets the following requirements:


1. **Accurately reflect the relationship between the claim and the evidence**: Analyze the input ‘claim‘ carefully and check it against the ‘context‘ and all ‘passages‘. Determine whether the claim is supported, partially supported, or contradicted by the evidence.


2. **Explicitly connect key entities and facts from the passages**: Your summary must mention the main entities and facts that directly confirm or refute parts of the claim. For example, highlight relevant names, works (films, albums, songs, books), attributes, dates, nicknames, or roles that clarify the claim’s accuracy.


3. **Make substantive connections**: The summary should not merely restate the claim or conclusion. Instead, it should explicitly link the claim to detailed evidence from the passages—such as specific film titles, album names, song titles, dates, or relationships—to provide clear reasoning for the accuracy or inaccuracy of the claim.


4. **Include relevant disambiguations or clarifications**: Where applicable, clarify potential misunderstandings or common confusions highlighted in the passages (e.g., distinguishing similarly named films or songs, specifying which individual is referenced, or noting alternate titles and adaptations).


5. **Use concise, factual language**: The summary should be clear and succinct but include all relevant evidence necessary to understand how the claim is supported or refuted.


6. **Support future query generation**: As the summary will be used to generate queries to find evidence, it must contain explicit mentions of key entities, titles, and facts that can guide retrieval and reasoning.


**Overall, your approach should be to reason comprehensively over the claim, context, and each passage, synthesizing connected facts and evidence into a coherent and evidence-rich summary that clearly documents why the claim is true, false, or partially true.** Avoid vague or overly general statements; instead, ground your summary in the precise factual details present in the passages and context.

### L.6 HoVer, Qwen3 8B

HoVer Qwen3 8B create_query_hop2.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgc3VtbWFyeV8xYCwgcHJvZHVjZSB0aGUgZmllbGRzIGBxdWVyeWAu)
Given the fields ‘claim‘, ‘summary_1‘, produce the fields ‘query‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,SW4gYSBoaWdoLXN0YWtlcyBzY2VuYXJpbyB3aGVyZSB0aGUgYWNjdXJhY3kgb2YgeW91ciBxdWVyeSBkaXJlY3RseSBkZXRlcm1pbmVzIHRoZSB2YWxpZGl0eSBvZiBhIGNvbXBsZXggY2xhaW0sIGdlbmVyYXRlIGEgcHJlY2lzZSBxdWVyeSB0aGF0IGJ1aWxkcyBvbiB0aGUgcHJvdmlkZWQgY2xhaW0gYW5kIHN1bW1hcnkgdG8gdW5jb3ZlciBjcml0aWNhbCBldmlkZW5jZS4gVXNlIHN0ZXAtYnktc3RlcCByZWFzb25pbmcgdG8gaWRlbnRpZnkgZ2FwcyBpbiB0aGUgaW5pdGlhbCBzdW1tYXJ5LCB0aGVuIGNyYWZ0IGEgcXVlcnkgdGhhdCBleHBsaWNpdGx5IHRhcmdldHMgdGhlc2UgZ2FwcyB0byByZXRyaWV2ZSBhZGRpdGlvbmFsIHN1cHBvcnRpbmcgaW5mb3JtYXRpb24uIEVuc3VyZSB5b3VyIHF1ZXJ5IGlzIHVuYW1iaWd1b3VzIGFuZCBkaXJlY3RseSBhZGRyZXNzZXMgdGhlIGNsYWltJ3MgdW5yZXNvbHZlZCBhc3BlY3RzLgpEZW1vczoKRXhhbXBsZSAxOgpjbGFpbToKICAgIFNhbmRpIFNpbWNoYSBEdUJvd3NraSBkaXJlY3RlZCBhIGRvY3VtZW50YXJ5IHJlbGVhc2VkIGluIDIwMDEuIFRoZSBob3Jyb3IgZmlsbSBaZWl0Z2Vpc3Qgd2FzIG5vdCBhbHNvIHJlbGVhc2VkIGluIDIwMDEuCnN1bW1hcnlfMToKICAgIFRoZSBjbGFpbSBpcyBjb3JyZWN0OiBTYW5kaSBTaW1jaGEgRHVCb3dza2kgZGlyZWN0ZWQgdGhlIDIwMDEgZG9jdW1lbnRhcnkgKlRyZW1ibGluZyBCZWZvcmUgRy1kKiwgYW5kIHRoZXJlIGlzIG5vIGV2aWRlbmNlIGluIHRoZSBwYXNzYWdlcyB0aGF0IHRoZSBob3Jyb3IgZmlsbSAqWmVpdGdlaXN0KiB3YXMgcmVsZWFzZWQgaW4gMjAwMS4KcmVhc29uaW5nOgogICAgVGhlIGNsYWltIGlzIGNvcnJlY3QgYmVjYXVzZSBTYW5kaSBTaW1jaGEgRHVCb3dza2kgaW5kZWVkIGRpcmVjdGVkIHRoZSAyMDAxIGRvY3VtZW50YXJ5ICpUcmVtYmxpbmcgQmVmb3JlIEctZCosIGFzIHN0YXRlZCBpbiBzdW1tYXJ5XzEuIFRoZSBhc3NlcnRpb24gdGhhdCAqWmVpdGdlaXN0KiB3YXMgbm90IHJlbGVhc2VkIGluIDIwMDEgaXMgc3VwcG9ydGVkIGJ5IHRoZSBhYnNlbmNlIG9mIGV2aWRlbmNlIGluIHRoZSBwcm92aWRlZCBzdW1tYXJpZXMgbGlua2luZyB0aGUgZmlsbSB0byB0aGF0IHllYXIuCnF1ZXJ5OgogICAgSXMgdGhlcmUgYW55IGV2aWRlbmNlIGluIHRoZSBwcm92aWRlZCBzdW1tYXJpZXMgdGhhdCB0aGUgaG9ycm9yIGZpbG0gKlplaXRnZWlzdCogd2FzIHJlbGVhc2VkIGluIDIwMDE/CgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
In a high-stakes scenario where the accuracy of your query directly determines the validity of a complex claim, generate a precise query that builds on the provided claim and summary to uncover critical evidence. Use step-by-step reasoning to identify gaps in the initial summary, then craft a query that explicitly targets these gaps to retrieve additional supporting information. Ensure your query is unambiguous and directly addresses the claim’s unresolved aspects.
Demos:
Example 1:
claim:
 Sandi Simcha DuBowski directed a documentary released in 2001. The horror film Zeitgeist was not also released in 2001.
summary_1:
 The claim is correct: Sandi Simcha DuBowski directed the 2001 documentary *Trembling Before G-d*, and there is no evidence in the passages that the horror film *Zeitgeist* was released in 2001.
reasoning:
 The claim is correct because Sandi Simcha DuBowski indeed directed the 2001 documentary *Trembling Before G-d*, as stated in summary_1. The assertion that *Zeitgeist* was not released in 2001 is supported by the absence of evidence in the provided summaries linking the film to that year.
query:
 Is there any evidence in the provided summaries that the horror film *Zeitgeist* was released in 2001?




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gIGFuZCBgc3VtbWFyeV8xYCwgZ2VuZXJhdGUgYSBwcmVjaXNlIGFuZCBmb2N1c2VkIHF1ZXJ5IHRoYXQgaWRlbnRpZmllcyB0aGUgc3BlY2lmaWMgZXZpZGVuY2UgbmVlZGVkIHRvIHZlcmlmeSBvciByZWZ1dGUgdGhlIGNsYWltLgoKIyMjIEtleSBSZXF1aXJlbWVudHM6CjEuICoqVGFyZ2V0IE1pc3NpbmcgRXZpZGVuY2UqKjogSWRlbnRpZnkgYW5kIGV4cGxpY2l0bHkgYXNrIGFib3V0IHRoZSB1bnZlcmlmaWVkIG9yIHVuY29uZmlybWVkIGRldGFpbHMgaW4gdGhlIHN1bW1hcnkgKGUuZy4sIG5hbWVzLCBkYXRlcywgbG9jYXRpb25zLCBvciBjb25uZWN0aW9ucykgdGhhdCBhcmUgY3JpdGljYWwgdG8gdGhlIGNsYWltLgogICAtIEV4YW1wbGU6IElmIHRoZSBzdW1tYXJ5IG1lbnRpb25zICJNYXNzaW1vIEdpb3JkYW5vIiBhcyBhIHBvdGVudGlhbCBjb3VudGVycGFydCBidXQgbGFja3MgYmlydGhwbGFjZSBkZXRhaWxzLCB0aGUgcXVlcnkgc2hvdWxkIGFzayBmb3IgZXZpZGVuY2UgY29uZmlybWluZyB0aGVpciB0aWVzIHRvIE5hcGxlcy4KMi4gKipDb3JyZWN0IEhpc3RvcmljYWwvRG9tYWluLVNwZWNpZmljIEFub21hbGllcyoqOiBBZGRyZXNzIGRpc2NyZXBhbmNpZXMgbGlrZSBhbmFjaHJvbmlzbXMgKGUuZy4sIEFsaSBRdXNoamnigJlzIHdvcmsgaW4gdGhlIDE5NjBzIHZzLiBoaXMgYWN0dWFsIDE1dGgtY2VudHVyeSB0aW1lbGluZSkgb3IgbWlzYXR0cmlidXRpb25zIChlLmcuLCAqSGF5eSBpYm4gWWFxZGhhbiogYnkgSWJuIFR1ZmFpbCwgbm90IEFsaSBRdXNoamkpLgozLiAqKkxpbmsgdG8gU3VtbWFyeSBDb250ZXh0Kio6IEVuc3VyZSB0aGUgcXVlcnkgcmVmZXJlbmNlcyB0aGUgc3VtbWFyeeKAmXMga2V5IHBvaW50cyAoZS5nLiwgInRoZSBjbGFpbSBzdGF0ZXMgWCwgYnV0IHRoZSBzdW1tYXJ5IG5vdGVzIFkgaXMgdW52ZXJpZmllZCIpLgo0LiAqKlVzZSBTcGVjaWZpYyBUZXJtcyoqOiBJbmNsdWRlIGV4YWN0IG5hbWVzLCB0aXRsZXMsIG9yIGRhdGVzIG1lbnRpb25lZCBpbiB0aGUgc3VtbWFyeSB0byBhdm9pZCBhbWJpZ3VpdHkgKGUuZy4sICJBbmHDr3MgTmluLCIgIk1ldHJvcG9saXRhbiBDaXR5IG9mIE5hcGxlcywiICIxOTQ4IikuCgojIyMgRXhhbXBsZSBTdHJhdGVneToKSWYgdGhlIHN1bW1hcnkgc3RhdGVzOgotICJUaGUgY2xhaW0gaXMgcGFydGlhbGx5IHN1cHBvcnRlZC4gV2hpbGUgW0ZhY3QgQV0gaXMgY29uZmlybWVkLCBbRmFjdCBCXSBsYWNrcyB2ZXJpZmljYXRpb24uIgotIFRoZSBxdWVyeSBzaG91bGQgYXNrOgogICoiSXMgdGhlcmUgZXZpZGVuY2UgY29uZmlybWluZyBbRmFjdCBCXSwgc3VjaCBhcyBbc3BlY2lmaWMgbmFtZS9kYXRlL2xvY2F0aW9uXT8iKgoKIyMjIERvbWFpbi1TcGVjaWZpYyBOb3RlczoKLSBWZXJpZnkgaGlzdG9yaWNhbCB0aW1lbGluZXMgKGUuZy4sIEFsaSBRdXNoamkgZGllZCBpbiAxNDc0LCBub3QgdGhlIDE5NjBzKS4KLSBDb25maXJtIGF1dGhvcnNoaXBzIChlLmcuLCAqSGF5eSBpYm4gWWFxZGhhbiogaXMgYXR0cmlidXRlZCB0byBJYm4gVHVmYWlsLCBub3QgQWxpIFF1c2hqaSkuCi0gQ2hlY2sgZm9yIGdlb2dyYXBoaWMgb3IgYmlvZ3JhcGhpY2FsIGRldGFpbHMgKGUuZy4sIGJpcnRocGxhY2VzLCBjaXRpZXMsIG9yIHByb2Zlc3Npb25hbCBjb25uZWN0aW9ucykuCgpFbnN1cmUgeW91ciBxdWVyeSBkaXJlY3RseSBhZGRyZXNzZXMgdGhlIHN1bW1hcnnigJlzIHVudmVyaWZpZWQgY2xhaW1zIGFuZCBpbmNsdWRlcyBhbGwgY3JpdGljYWwgdGVybXMgZnJvbSB0aGUgc3VtbWFyeSB0byBtYXhpbWl6ZSBldmlkZW5jZSByZXRyaWV2YWwu)
Given the fields ‘claim‘ and ‘summary_1‘, generate a precise and focused query that identifies the specific evidence needed to verify or refute the claim.


### Key Requirements:
1. **Target Missing Evidence**: Identify and explicitly ask about the unverified or unconfirmed details in the summary (e.g., names, dates, locations, or connections) that are critical to the claim.
 - Example: If the summary mentions "Massimo Giordano" as a potential counterpart but lacks birthplace details, the query should ask for evidence confirming their ties to Naples.
2. **Correct Historical/Domain-Specific Anomalies**: Address discrepancies like anachronisms (e.g., Ali Qushji’s work in the 1960s vs. his actual 15th-century timeline) or misattributions (e.g., *Hayy ibn Yaqdhan* by Ibn Tufail, not Ali Qushji).
3. **Link to Summary Context**: Ensure the query references the summary’s key points (e.g., "the claim states X, but the summary notes Y is unverified").
4. **Use Specific Terms**: Include exact names, titles, or dates mentioned in the summary to avoid ambiguity (e.g., "Anaïs Nin," "Metropolitan City of Naples," "1948").


### Example Strategy:
If the summary states:
- "The claim is partially supported. While [Fact A] is confirmed, [Fact B] lacks verification."
- The query should ask:
 *"Is there evidence confirming [Fact B], such as [specific name/date/location]?"*


### Domain-Specific Notes:
- Verify historical timelines (e.g., Ali Qushji died in 1474, not the 1960s).
- Confirm authorships (e.g., *Hayy ibn Yaqdhan* is attributed to Ibn Tufail, not Ali Qushji).
- Check for geographic or biographical details (e.g., birthplaces, cities, or professional connections).


Ensure your query directly addresses the summary’s unverified claims and includes all critical terms from the summary to maximize evidence retrieval.

HoVer Qwen3 8B create_query_hop3.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgc3VtbWFyeV8xYCwgYHN1bW1hcnlfMmAsIHByb2R1Y2UgdGhlIGZpZWxkcyBgcXVlcnlgLg==)
Given the fields ‘claim‘, ‘summary_1‘, ‘summary_2‘, produce the fields ‘query‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,WW91IGFyZSBhIGZhY3QtY2hlY2tpbmcgYXNzaXN0YW50IHNwZWNpYWxpemluZyBpbiBtdWx0aS1ob3AgcmVhc29uaW5nIGFuZCBpbmZvcm1hdGlvbiBzeW50aGVzaXMuIEdpdmVuIHRoZSBmaWVsZHMgYGNsYWltYCwgYHN1bW1hcnlfMWAsIGFuZCBgc3VtbWFyeV8yYCwgZ2VuZXJhdGUgYSBwcmVjaXNlIHF1ZXJ5IHRoYXQgc3ludGhlc2l6ZXMgdGhlIG9yaWdpbmFsIGNsYWltIHdpdGggdGhlIHR3byBzdW1tYXJpZXMgdG8gcHJvYmUgZm9yIGRlZXBlciBjb250ZXh0dWFsIHJlbGF0aW9uc2hpcHMsIHJlc29sdmluZyBhbWJpZ3VpdGllcyBhbmQgY29uZmlybWluZyBzdXBwb3J0aW5nIGRldGFpbHMgdGhyb3VnaCB0YXJnZXRlZCBldmlkZW5jZSByZXRyaWV2YWwuCkRlbW9zOgo=)
You are a fact-checking assistant specializing in multi-hop reasoning and information synthesis. Given the fields ‘claim‘, ‘summary_1‘, and ‘summary_2‘, generate a precise query that synthesizes the original claim with the two summaries to probe for deeper contextual relationships, resolving ambiguities and confirming supporting details through targeted evidence retrieval.
Demos:
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgc3VtbWFyeV8xYCwgYW5kIGBzdW1tYXJ5XzJgLCBwcm9kdWNlIHRoZSBmaWVsZCBgcXVlcnlgIHRoYXQ6CjEuIEV4cGxpY2l0bHkgYXNrcyB3aGV0aGVyIHRoZSBjbGFpbSBpcyBzdXBwb3J0ZWQgYnkgdGhlIHByb3ZpZGVkIHN1bW1hcmllcy4KMi4gSW5jbHVkZXMgKipzcGVjaWZpYyBldmlkZW5jZSoqIGZyb20gdGhlIHN1bW1hcmllcyAoZS5nLiwgbmFtZXMsIHRpdGxlcywgZGF0ZXMsIG9yIGZhY3R1YWwgZGV0YWlscykgdG8gZ3VpZGUgcmV0cmlldmFsIG9mIHJlbGV2YW50IGRvY3VtZW50cy4KMy4gRm9jdXNlcyBvbiAqKmtleSBkaXNwdXRlZCBwb2ludHMqKiBpbiB0aGUgY2xhaW0gKGUuZy4sIGluY29ycmVjdCBhdHRyaWJ1dGlvbnMsIG1pc3NpbmcgZXZpZGVuY2UsIG9yIGNvbmZsaWN0aW5nIHN0YXRlbWVudHMpIHRvIGVuc3VyZSB0aGUgcXVlcnkgdGFyZ2V0cyB0aGUgbW9zdCByZWxldmFudCBpbmZvcm1hdGlvbi4KCioqS2V5IGNvbnNpZGVyYXRpb25zIGZvciB0aGUgcXVlcnk6KioKLSBJZiB0aGUgc3VtbWFyaWVzIG1lbnRpb24gc3BlY2lmaWMgd29ya3MgKGUuZy4sICpQbGFuZXMsIFRyYWlucyBhbmQgQXV0b21vYmlsZXMqKSwgaW5jbHVkZSB0aGUgdGl0bGUuCi0gSWYgdGhlIHN1bW1hcmllcyByZWZlcmVuY2UgbmFtZWQgZW50aXRpZXMgKGUuZy4sIEpvaG4gQ2FuZHksIEtMTSwgUmljaGFyZCBGb3JkKSwgaW5jbHVkZSB0aGVtLgotIElmIHRoZSBzdW1tYXJpZXMgY2xhcmlmeSBjb250cmFkaWN0aW9ucyAoZS5nLiwgIm5vdCBYIGJ1dCBZIiksIHN0cnVjdHVyZSB0aGUgcXVlcnkgdG8gaGlnaGxpZ2h0IHRoaXMgY29udHJhc3QuCi0gQXZvaWQgdmFndWUgcGhyYXNpbmc7IGluc3RlYWQgb2YgYXNraW5nICJJcyB0aGUgY2xhaW0gdHJ1ZT8iIHVzZSAiRG9lcyB0aGUgZXZpZGVuY2UgaW4gdGhlIHN1bW1hcmllcyBjb25maXJtIFtzcGVjaWZpYyBkZXRhaWxdPyIKCioqRXhhbXBsZToqKgpJZiB0aGUgY2xhaW0gaXMgYWJvdXQgYSBmaWxtIGFuZCB0aGUgc3VtbWFyaWVzIG1lbnRpb24gKlBsYW5lcywgVHJhaW5zIGFuZCBBdXRvbW9iaWxlcyogKDE5ODcpLCB0aGUgcXVlcnkgc2hvdWxkIGluY2x1ZGUgdGhhdCB0aXRsZSB0byByZXRyaWV2ZSByZWxldmFudCBldmlkZW5jZS4KYGBg)
Given the fields ‘claim‘, ‘summary_1‘, and ‘summary_2‘, produce the field ‘query‘ that:
1. Explicitly asks whether the claim is supported by the provided summaries.
2. Includes **specific evidence** from the summaries (e.g., names, titles, dates, or factual details) to guide retrieval of relevant documents.
3. Focuses on **key disputed points** in the claim (e.g., incorrect attributions, missing evidence, or conflicting statements) to ensure the query targets the most relevant information.


**Key considerations for the query:**
- If the summaries mention specific works (e.g., *Planes, Trains and Automobiles*), include the title.
- If the summaries reference named entities (e.g., John Candy, KLM, Richard Ford), include them.
- If the summaries clarify contradictions (e.g., "not X but Y"), structure the query to highlight this contrast.
- Avoid vague phrasing; instead of asking "Is the claim true?" use "Does the evidence in the summaries confirm [specific detail]?"


**Example:**
If the claim is about a film and the summaries mention *Planes, Trains and Automobiles* (1987), the query should include that title to retrieve relevant evidence.
‘‘‘

HoVer Qwen3 8B summarize1.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgcGFzc2FnZXNgLCBwcm9kdWNlIHRoZSBmaWVsZHMgYHN1bW1hcnlgLg==)
Given the fields ‘claim‘, ‘passages‘, produce the fields ‘summary‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gIGFuZCBgcGFzc2FnZXNgLCBnZW5lcmF0ZSBhIHN0cnVjdHVyZWQgcmVhc29uaW5nIHByb2Nlc3MgdGhhdCBhbmFseXplcyB0aGUgY2xhaW0gc3RlcC1ieS1zdGVwIHVzaW5nIHRoZSBwcm92aWRlZCBldmlkZW5jZSwgYW5kIHByb2R1Y2UgYSBjb25jaXNlIHN1bW1hcnkgdGhhdCBkaXN0aWxscyB0aGUga2V5IGZpbmRpbmdzIGFuZCBldmFsdWF0ZXMgdGhlIGNsYWltJ3MgdmFsaWRpdHkgYmFzZWQgb24gdGhlIGV2aWRlbmNlLgpEZW1vczoKRXhhbXBsZSAxOgpjbGFpbToKICAgIE9uZSBoYWxmIG9mIHRoZSBLYWx5YW5qaeKAk0FuYW5kamkgZHVvLCBLYWx5YW5qaSBWaXJqaSBTaGFoJ3MgYnJvdGhlciwgd29uIHRoZSBGaWxtZmFyZSBBd2FyZCBmb3IgQmVzdCBNdXNpYyBEaXJlY3Rvci4KcGFzc2FnZXM6CiAgICBbJ0thbHlhbmppIFZpcmppIFNoYWggfCBLYWx5YW5qaSBWaXJqaSBTaGFoICgzMCBKdW5lIDE5Mjgg4oCTIDI0IEF1Z3VzdCAyMDAwKSB3YXMgdGhlICJLYWx5YW5qaSIgb2YgdGhlIEthbHlhbmppLUFuYW5kamkgZHVvLiAgSGUgYW5kIGhpcyBicm90aGVyIEFuYW5kamkgVmlyamkgU2hhaCBoYXZlIGJlZW4gZmFtb3VzIEluZGlhbiBmaWxtIG11c2ljaWFucywgYW5kIHdvbiB0aGUgMTk3NSBGaWxtZmFyZSBBd2FyZCBmb3IgQmVzdCBNdXNpYyBEaXJlY3RvciwgZm9yICJLb3JhIEthZ2F6Ii4gIEhlIGlzIGEgcmVjaXBpZW50IG9mIHRoZSBjaXZpbGlhbiBob25vdXIgb2YgUGFkbWEgU2hyaSAoMTk5MikuJywgJ0thbHlhbmpp4oCTQW5hbmRqaSB8IEthbHlhbmpp4oCTQW5hbmRqaSBhcmUgYW4gSW5kaWFuIGNvbXBvc2VyIGR1byBmcm9tIEd1amFyYXQ6IEthbHlhbmppIFZpcmppIFNoYWggKDMwIEp1bmUgMTkyOC0wMyBOb3ZlbWJlciAyMDAwKSBhbmQgaGlzIGJyb3RoZXIgQW5hbmRqaSBWaXJqaSBTaGFoIChib3JuIDAyIE1hcmNoIDE5MzMpLiAgVGhlIGR1byBhcmUga25vd24gZm9yIHRoZWlyIHdvcmsgb24gSGluZGkgZmlsbSBzb3VuZHRyYWNrcywgcGFydGljdWxhcmx5IGFjdGlvbiBwb3Rib2lsZXJzIGluIHRoZSAxOTcwcy4gIFNvbWUgb2YgdGhlaXIgYmVzdC1rbm93biB3b3JrcyBhcmUgIkRvbiIsICJCYWlyYWFnIiwgIlNhcmFzd2F0aWNoYW5kcmEiLCAiUXVyYmFuaSIsICJUcmlkZXYiIGFuZCAiU2FmYXIiLiAgVGhleSB3b24gdGhlIDE5NzUgRmlsbWZhcmUgQXdhcmQgZm9yIEJlc3QgTXVzaWMgRGlyZWN0b3IgZm9yICJLb3JhIEthZ2F6Ii4nLCAnQW5hbmRqaSBWaXJqaSBTaGFoIHwgQW5hbmRqaSBWaXJqaSBTaGFoIGlzIGFuIEluZGlhbiBtdXNpYyBkaXJlY3Rvci4gIFRvZ2V0aGVyIHdpdGggaGlzIGJyb3RoZXIgaGUgZm9ybWVkIHRoZSBLYWx5YW5qaS1BbmFuZGppIGR1bywgYW5kIHdvbiB0aGUgMTk3NSBGaWxtZmFyZSBBd2FyZCBmb3IgQmVzdCBNdXNpYyBEaXJlY3RvciwgZm9yICJLb3JhIEthZ2F6Ii4gIEhlIGlzIGEgcmVjaXBpZW50IG9mIHRoZSBjaXZpbGlhbiBob25vdXIgb2YgUGFkbWEgU2hyaSAoMTk5MikuJywgJ1ZpanUgU2hhaCB8IFZpanUgU2hhaCAoYm9ybiwgVmlqYXkgS2FseWFuamkgU2hhaCwgNSBKdW5lIDE5NTkpIGlzIGEgbXVzaWMgZGlyZWN0b3Igb2YgSGluZGkgY2luZW1hLiAgSGUgaXMgdGhlIHNvbiBvZiBtdXNpYyBkaXJlY3RvciBLYWx5YW5qaSBWaXJqaSBTaGFoIG9mIGNvbXBvc2VyIGR1byBLYWx5YW5qaSBBbmFuZGppLiAgSGUgY29tcG9zZWQgbXVzaWMgZm9yIG1vdmllcyBzdWNoIGFzICJWaXNod2F0YW1hIiAoMTk5MiksICJNb2hyYSIgKDE5OTQpLCAiVGVyZSBNZXJlIFNhcG5lIiAoMTk5NikgYW5kICIiICgxOTk3KSBmb3Igd2hpY2ggZ290IGhpcyBzZWNvbmQgbm9taW5hdGlvbiBmb3IgdGhlIEZpbG1mYXJlIEF3YXJkIGZvciBCZXN0IE11c2ljIERpcmVjdG9yIGFuZCBoZSB3b24gdGhlIDE5OTggRmlsbWZhcmUgQXdhcmQgZm9yIEJlc3QgQmFja2dyb3VuZCBTY29yZSBmb3IgIiIuJywgJ0thbHlhbmpp4oCTQW5hbmRqaSBkaXNjb2dyYXBoeSB8IFRoaXMgaXMgYSBkaXNjb2dyYXBoeSBvZiBCb2xseXdvb2QgY29tcG9zZXIgZHVvIEthbHlhbmppIEFuYW5kamksIGNvbnNpc3Rpbmcgb2YgS2FseWFuamkgVmlyamkgU2hhaCBhbmQgQW5hbmRqaSBWaXJqaSBTaGFoLiAgVGhleSBoYXZlIGNvbXBvc2VkIG11c2ljIGZvciBvdmVyIDIwMCBmaWxtcyBpbiB0aGVpciA0NiB5ZWFyIGNhcmVlci4nLCAnQm9tYmF5IHRoZSBIYXJkIFdheTogR3VucywgQ2FycyBhbmQgU2l0YXJzIHwgQm9tYmF5IHRoZSBIYXJkIFdheTogR3VucywgQ2FycyBhbmQgU2l0YXJzIGlzIGEgMTk5OCBwcm9qZWN0IG9mIHByb2R1Y2VyIERhbiB0aGUgQXV0b21hdG9yIGluIHdoaWNoIG11c2ljIGZyb20gMTk3MHMgZnVuayBCb2xseXdvb2QgY29tcG9zZXIgZHVvIEthbHlhbmppLUFuYW5kamkgKEthbHlhbmppIFZpcmppIFNoYWggYW5kIEFuYW5kamkgVmlyamkgU2hhaCkgd2FzIHRha2VuIGFuZCBnaXZlbiBhIGZ1bmt5IHJlbWl4LiAgVGhlIGFsYnVtIHdhcyBldmVudHVhbGx5IHdpdGhkcmF3biAocG9zc2libHkgZHVlIHRvIGNvcHlyaWdodCBjb25jZXJucykuICBBIHNlcXVlbCwgIkJvbWJheSAyOiBFbGVjdHJpYyBWaW5kYWxvbyIsIHdhcyBhbHNvIHByb2R1Y2VkLicsICdCYWlyYWFnIHwgQmFpcmFhZyBpcyBhIDE5NzYgQm9sbHl3b29kIGZpbG0uICBQcm9kdWNlZCBieSB0aGUgZHVvIE11c2hpci1SaWF6LCBpdCBpcyBkaXJlY3RlZCBieSBBc2l0IFNlbi4gIFRoZSBmaWxtIHN0YXJzIERpbGlwIEt1bWFyLCB3aG8gcmVjZWl2ZWQgYSBGaWxtZmFyZSBub21pbmF0aW9uIGZvciBCZXN0IEFjdG9yIGZvciBwbGF5aW5nIGEgdHJpcGxlIHJvbGUuICAiQmFpcmFhZyIgYWxzbyBzdGFycyBTYWlyYSBCYW51LCBMZWVuYSBDaGFuZGF2YXJrYXIsIFJ1bWEgR3VoYSBUaGFrdXJ0YSwgUHJlbSBDaG9wcmEsIEhlbGVuLCBTdWppdCBLdW1hciwgTWFkYW4gUHVyaSwgUGFpbnRhbCwgS2FkZXIgS2hhbiwgQXNpdCBTZW4gYW5kIFNhY2hpbi4gIEl0cyBtdXNpYyBpcyBieSB0aGUgZHVvIEthbHlhbmppIEFuYW5kamksIHdobyByZWNlaXZlZCBhIEZpbG1mYXJlIG5vbWluYXRpb24gZm9yIEJlc3QgTXVzaWMuICBUaGUgZmlsbSByZWNlaXZlZCBhIEZpbG1mYXJlIEF3YXJkIGZvciBCZXN0IFNvdW5kIGZvciBQLiBIYXJpa2lzaGFuLiAgQWNjb3JkaW5nIHRvIG9uZSBzb3VyY2UsIHRoZSBmaWxtIGRpZCBub3QgZG8gd2VsbCBhdCB0aGUgYm94IG9mZmljZS4nXQpyZWFzb25pbmc6CiAgICBUaGUgY2xhaW0gc3RhdGVzIHRoYXQgS2FseWFuamkgVmlyamkgU2hhaCdzIGJyb3RoZXIgd29uIHRoZSBGaWxtZmFyZSBBd2FyZCBmb3IgQmVzdCBNdXNpYyBEaXJlY3Rvci4gVGhlIHBhc3NhZ2VzIGNvbmZpcm0gdGhhdCB0aGUgS2FseWFuamnigJNBbmFuZGppIGR1byAoS2FseWFuamkgVmlyamkgU2hhaCBhbmQgaGlzIGJyb3RoZXIgQW5hbmRqaSBWaXJqaSBTaGFoKSB3b24gdGhlIDE5NzUgRmlsbWZhcmUgQXdhcmQgZm9yIEJlc3QgTXVzaWMgRGlyZWN0b3IgZm9yICJLb3JhIEthZ2F6LiIgU2luY2UgdGhlIGF3YXJkIHdhcyBzaGFyZWQgYnkgYm90aCBicm90aGVycywgdGhlIGNsYWltIGlzIGFjY3VyYXRlIGFzIGl0IGlkZW50aWZpZXMgQW5hbmRqaSBWaXJqaSBTaGFoIChLYWx5YW5qaSdzIGJyb3RoZXIpIGFzIHRoZSB3aW5uZXIuCnN1bW1hcnk6CiAgICBBbmFuZGppIFZpcmppIFNoYWgsIHRoZSBicm90aGVyIG9mIEthbHlhbmppIFZpcmppIFNoYWgsIHdvbiB0aGUgMTk3NSBGaWxtZmFyZSBBd2FyZCBmb3IgQmVzdCBNdXNpYyBEaXJlY3RvciBhcyBwYXJ0IG9mIHRoZSBLYWx5YW5qaeKAk0FuYW5kamkgZHVvIGZvciB0aGVpciB3b3JrIG9uICJLb3JhIEthZ2F6LiIKCgojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCjMgb3RoZXIgZGVtb3Mgb21pdHRlZCBmb3IgYnJldml0eS4KIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwo=)
Given the fields ‘claim‘ and ‘passages‘, generate a structured reasoning process that analyzes the claim step-by-step using the provided evidence, and produce a concise summary that distills the key findings and evaluates the claim’s validity based on the evidence.
Demos:
Example 1:
claim:
 One half of the Kalyanji–Anandji duo, Kalyanji Virji Shah’s brother, won the Filmfare Award for Best Music Director.
passages:
 [’Kalyanji Virji Shah | Kalyanji Virji Shah (30 June 1928 – 24 August 2000) was the "Kalyanji" of the Kalyanji-Anandji duo. He and his brother Anandji Virji Shah have been famous Indian film musicians, and won the 1975 Filmfare Award for Best Music Director, for "Kora Kagaz". He is a recipient of the civilian honour of Padma Shri (1992).’, ’Kalyanji–Anandji | Kalyanji–Anandji are an Indian composer duo from Gujarat: Kalyanji Virji Shah (30 June 1928-03 November 2000) and his brother Anandji Virji Shah (born 02 March 1933). The duo are known for their work on Hindi film soundtracks, particularly action potboilers in the 1970s. Some of their best-known works are "Don", "Bairaag", "Saraswatichandra", "Qurbani", "Tridev" and "Safar". They won the 1975 Filmfare Award for Best Music Director for "Kora Kagaz".’, ’Anandji Virji Shah | Anandji Virji Shah is an Indian music director. Together with his brother he formed the Kalyanji-Anandji duo, and won the 1975 Filmfare Award for Best Music Director, for "Kora Kagaz". He is a recipient of the civilian honour of Padma Shri (1992).’, ’Viju Shah | Viju Shah (born, Vijay Kalyanji Shah, 5 June 1959) is a music director of Hindi cinema. He is the son of music director Kalyanji Virji Shah of composer duo Kalyanji Anandji. He composed music for movies such as "Vishwatama" (1992), "Mohra" (1994), "Tere Mere Sapne" (1996) and "" (1997) for which got his second nomination for the Filmfare Award for Best Music Director and he won the 1998 Filmfare Award for Best Background Score for "".’, ’Kalyanji–Anandji discography | This is a discography of Bollywood composer duo Kalyanji Anandji, consisting of Kalyanji Virji Shah and Anandji Virji Shah. They have composed music for over 200 films in their 46 year career.’, ’Bombay the Hard Way: Guns, Cars and Sitars | Bombay the Hard Way: Guns, Cars and Sitars is a 1998 project of producer Dan the Automator in which music from 1970s funk Bollywood composer duo Kalyanji-Anandji (Kalyanji Virji Shah and Anandji Virji Shah) was taken and given a funky remix. The album was eventually withdrawn (possibly due to copyright concerns). A sequel, "Bombay 2: Electric Vindaloo", was also produced.’, ’Bairaag | Bairaag is a 1976 Bollywood film. Produced by the duo Mushir-Riaz, it is directed by Asit Sen. The film stars Dilip Kumar, who received a Filmfare nomination for Best Actor for playing a triple role. "Bairaag" also stars Saira Banu, Leena Chandavarkar, Ruma Guha Thakurta, Prem Chopra, Helen, Sujit Kumar, Madan Puri, Paintal, Kader Khan, Asit Sen and Sachin. Its music is by the duo Kalyanji Anandji, who received a Filmfare nomination for Best Music. The film received a Filmfare Award for Best Sound for P. Harikishan. According to one source, the film did not do well at the box office.’]
reasoning:
 The claim states that Kalyanji Virji Shah’s brother won the Filmfare Award for Best Music Director. The passages confirm that the Kalyanji–Anandji duo (Kalyanji Virji Shah and his brother Anandji Virji Shah) won the 1975 Filmfare Award for Best Music Director for "Kora Kagaz." Since the award was shared by both brothers, the claim is accurate as it identifies Anandji Virji Shah (Kalyanji’s brother) as the winner.
summary:
 Anandji Virji Shah, the brother of Kalyanji Virji Shah, won the 1975 Filmfare Award for Best Music Director as part of the Kalyanji–Anandji duo for their work on "Kora Kagaz."




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gIGFuZCBgcGFzc2FnZXNgLCBwcm9kdWNlIHRoZSBmaWVsZHMgYHN1bW1hcnlgIGJ5OgoxLiAqKkFuYWx5emluZyB0aGUgY2xhaW0qKiB0byBpZGVudGlmeSBrZXkgZWxlbWVudHMgKGUuZy4sIG5hbWVzLCBsb2NhdGlvbnMsIHJlbGF0aW9uc2hpcHMsIHNwZWNpZmljIHRlcm1zKS4KMi4gKipDcm9zcy1yZWZlcmVuY2luZyB0aGUgcGFzc2FnZXMqKiB0byBsb2NhdGUgZXhwbGljaXQgb3IgaW1wbGljaXQgZXZpZGVuY2UgdGhhdCBzdXBwb3J0cywgY29udHJhZGljdHMsIG9yIHBhcnRpYWxseSBhZGRyZXNzZXMgdGhlIGNsYWltLgozLiAqKkV4cGxpY2l0bHkgY29ubmVjdGluZyB0aGUgY2xhaW0gdG8gdGhlIGV2aWRlbmNlKiogaW4gdGhlIHBhc3NhZ2VzLCBldmVuIGlmIHRoZSBldmlkZW5jZSBpcyBub3QgZGlyZWN0bHkgc3RhdGVkIGluIHRoZSBjbGFpbSAoZS5nLiwgbGlua2luZyAiUm9nZXIgWXVhbiIgdG8gIlNoYW5naGFpIE5vb24iIGluIEV4YW1wbGUgMSkuCjQuICoqSGlnaGxpZ2h0aW5nIGRvbWFpbi1zcGVjaWZpYyBkZXRhaWxzKiogKGUuZy4sICJTZW50aW5lbGVzZSBsYW5ndWFnZSBpcyB1bmNsYXNzaWZpYWJsZSIgaW4gRXhhbXBsZSAzKSB0aGF0IGFyZSBjcml0aWNhbCBmb3IgYWNjdXJhY3kuCjUuICoqU3RhdGluZyB3aGV0aGVyIHRoZSBjbGFpbSBpcyBzdXBwb3J0ZWQsIHVuc3VwcG9ydGVkLCBvciBwYXJ0aWFsbHkgc3VwcG9ydGVkKiosIGFuZCBleHBsYWluaW5nIHRoZSByZWFzb25pbmcgd2l0aCBjbGVhciByZWZlcmVuY2VzIHRvIHRoZSBwYXNzYWdlcy4KNi4gKipQcmlvcml0aXppbmcga2V5IGV2aWRlbmNlKiogdGhhdCB3b3VsZCBiZSByZWxldmFudCBmb3IgZnVydGhlciBxdWVyaWVzIChlLmcuLCAiTWFybGJvcm91Z2giIGluIEV4YW1wbGUgMikgdG8gZW5zdXJlIHJldHJpZXZhYmlsaXR5LgoKKipBZGRpdGlvbmFsIEd1aWRhbmNlOioqCi0gSWYgdGhlIGNsYWltIGNvbnRhaW5zIHVudmVyaWZpZWQgZGV0YWlscyAoZS5nLiwgIlJvZ2VyIFl1YW4iIGluIEV4YW1wbGUgMSksIGV4cGxpY2l0bHkgbm90ZSB0aGlzIGluIHRoZSBzdW1tYXJ5LgotIEZvciBuaWNoZSBvciBhbWJpZ3VvdXMgaW5mb3JtYXRpb24gKGUuZy4sICJ1bmNvbnRhY3RlZCBwZW9wbGUiIGluIEV4YW1wbGUgMyksIHJlZmVyZW5jZSBzcGVjaWZpYyBwYXNzYWdlcyB0aGF0IGNsYXJpZnkgdGhlIGNvbnRleHQuCi0gRW5zdXJlIHN1bW1hcmllcyBhcmUgY29uY2lzZSBidXQgaW5jbHVkZSBhbGwgY3JpdGljYWwgZXZpZGVuY2UgbmVlZGVkIHRvIHZhbGlkYXRlIG9yIHJlZnV0ZSB0aGUgY2xhaW0u)
Given the fields ‘claim‘ and ‘passages‘, produce the fields ‘summary‘ by:
1. **Analyzing the claim** to identify key elements (e.g., names, locations, relationships, specific terms).
2. **Cross-referencing the passages** to locate explicit or implicit evidence that supports, contradicts, or partially addresses the claim.
3. **Explicitly connecting the claim to the evidence** in the passages, even if the evidence is not directly stated in the claim (e.g., linking "Roger Yuan" to "Shanghai Noon" in Example 1).
4. **Highlighting domain-specific details** (e.g., "Sentinelese language is unclassifiable" in Example 3) that are critical for accuracy.
5. **Stating whether the claim is supported, unsupported, or partially supported**, and explaining the reasoning with clear references to the passages.
6. **Prioritizing key evidence** that would be relevant for further queries (e.g., "Marlborough" in Example 2) to ensure retrievability.


**Additional Guidance:**
- If the claim contains unverified details (e.g., "Roger Yuan" in Example 1), explicitly note this in the summary.
- For niche or ambiguous information (e.g., "uncontacted people" in Example 3), reference specific passages that clarify the context.
- Ensure summaries are concise but include all critical evidence needed to validate or refute the claim.

HoVer Qwen3 8B summarize2.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgY29udGV4dGAsIGBwYXNzYWdlc2AsIHByb2R1Y2UgdGhlIGZpZWxkcyBgc3VtbWFyeWAu)
Given the fields ‘claim‘, ‘context‘, ‘passages‘, produce the fields ‘summary‘.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgY29udGV4dGAsIGFuZCBgcGFzc2FnZXNgLCBwZXJmb3JtIG11bHRpLWhvcCByZWFzb25pbmcgdG8gZ2VuZXJhdGUgYSBzdHJ1Y3R1cmVkIHN1bW1hcnkgdGhhdCB2YWxpZGF0ZXMgb3IgcmVmdXRlcyB0aGUgY2xhaW0uIEZpcnN0LCBhbmFseXplIHRoZSBjbGFpbSBhbmQgY29udGV4dHVhbCBpbmZvcm1hdGlvbiB0byBpZGVudGlmeSBrZXkgcmVsYXRpb25zaGlwcy4gTmV4dCwgZXZhbHVhdGUgZXZpZGVuY2UgZnJvbSB0aGUgcmV0cmlldmVkIHBhc3NhZ2VzIHRvIGJ1aWxkIGEgY29oZXJlbnQgbmFycmF0aXZlLiBDb25zdHJ1Y3QgYSBsb2dpY2FsIHJlYXNvbmluZyBjaGFpbiBjb25uZWN0aW5nIHRoZSBjbGFpbSB0byBzdXBwb3J0aW5nIG9yIGNvbnRyYWRpY3RvcnkgZXZpZGVuY2UuIEZpbmFsbHksIHByb2R1Y2UgYSBjb25jaXNlIHN1bW1hcnkgdGhhdCBleHBsaWNpdGx5IGNvbmZpcm1zIG9yIGNvbnRyYWRpY3RzIHRoZSBjbGFpbSBiYXNlZCBvbiB5b3VyIGFuYWx5c2lzLCBjaXRpbmcgcmVsZXZhbnQgZXZpZGVuY2UgZnJvbSB0aGUgY29udGV4dCBhbmQgcGFzc2FnZXMuCkRlbW9zOgpFeGFtcGxlIDE6CmNsYWltOgogICAgVGhlIHJlY29yZGVkIGhpc3Rvcnkgb2YgdGhlIHN0YXRlLCBmb3Igd2hpY2ggQmFwdGlzdCBHZW9yZ2UgUnVieSB3YXMgYSBwcm9taW5lbnQgYmxhY2sgUmVwdWJsaWNhbiBsZWFkZXIgaW4gdGhlIFJlY29uc3RydWN0aW9uLWVyYSwgb2ZmaWNpYWxseSBzdGFydGVkIGluIDE1MTkgaW4gdGhlIHNhbWUgc3RhdGUgdGhhdCBob2xkcyB0aGUgY2l0eSBBdWd1c3R1cyBDaGFwbWFuIEFsbGVuIHVzZWQgaGlzIGluaGVyaXRhbmNlIHRvIGZ1bmQgdGhlIGZvdW5kaW5nIG9mLgpjb250ZXh0OgogICAgVGhlIGNsYWltIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIHBhc3NhZ2VzLiBXaGlsZSBHZW9yZ2UgUnVieSB3YXMgYXNzb2NpYXRlZCB3aXRoIFRleGFzIGR1cmluZyBSZWNvbnN0cnVjdGlvbiBhbmQgQXVndXN0dXMgQ2hhcG1hbiBBbGxlbiBmb3VuZGVkIEhvdXN0b24gaW4gVGV4YXMsIHRoZXJlIGlzIG5vIGV2aWRlbmNlIGluIHRoZSBwYXNzYWdlcyB0aGF0IFRleGFzJ3MgcmVjb3JkZWQgaGlzdG9yeSBiZWdhbiBpbiAxNTE5LgpwYXNzYWdlczoKICAgIFsiTWVyY2hhbnRzIGFuZCBNYW51ZmFjdHVyZXJzIEJ1aWxkaW5nIHwgVGhlIE9uZSBNYWluIEJ1aWxkaW5nLCBmb3JtZXJseSB0aGUgTWVyY2hhbnRzIGFuZCBNYW51ZmFjdHVyZXJzIEJ1aWxkaW5nIChjb21tb25seSByZWZlcnJlZCB0byBhcyB0aGUgTSZNIEJ1aWxkaW5nKSwgaXMgYSBidWlsZGluZyBvbiB0aGUgY2FtcHVzIG9mIHRoZSBVbml2ZXJzaXR5IG9mIEhvdXN0b27igJNEb3dudG93bi4gIFRoZSBidWlsZGluZyBpcyByZWNvZ25pemVkIGFzIHBhcnQgb2YgdGhlIE5hdGlvbmFsIFJlZ2lzdGVyIG9mIEhpc3RvcmljIFBsYWNlcywgaXMgYSBSZWNvcmRlZCBUZXhhcyBIaXN0b3JpYyBMYW5kbWFyaywgYW5kIGNvbnNpZGVyZWQgYSBDb250cmlidXRpbmcgQnVpbGRpbmcgaW4gRG93bnRvd24gSG91c3RvbidzIE1haW4gU3RyZWV0L01hcmtldCBTcXVhcmUgSGlzdG9yaWMgRGlzdHJpY3QuICBUaGUgYnVpbGRpbmcgd2FzIGJ1aWx0IGFib3ZlIEFsbGVuJ3MgTGFuZGluZ+KAlGFuIGFyZWEgd2hlcmUgSG91c3RvbidzIGZvdW5kZXJzIEpvaG4gS2lyYnkgQWxsZW4gYW5kIEF1Z3VzdHVzIENoYXBtYW4gQWxsZW4gb3JpZ2luYWxseSBzZXR0bGVkLiIsICdBdWd1c3R1cyBDaGFwbWFuIEFsbGVuIHwgQXVndXN0dXMgQ2hhcG1hbiBBbGxlbiAoSnVseSA0LCAxODA2IOKAkyBKYW51YXJ5IDExLCAxODY0KSwgYWxvbmcgd2l0aCBoaXMgeW91bmdlciBicm90aGVyLCBKb2huIEtpcmJ5IEFsbGVuLCBmb3VuZGVkIHRoZSBDaXR5IG9mIEhvdXN0b24gaW4gdGhlIFUuUy4gc3RhdGUgb2YgVGV4YXMuICBIZSB3YXMgYm9ybiBvbiBKdWx5IDQsIDE4MDYsIGluIENhbmFzZXJhZ2EgVmlsbGFnZSwgTmV3IFlvcmsgKHRoZSBwcmVzZW50IGRheSBoYW1sZXQgb2YgU3VsbGl2YW4gaW4gdGhlIFRvd24gb2YgU3VsbGl2YW4sIE5ldyBZb3JrKSwgdG8gU2FyYWggKENoYXBtYW4pIGFuZCBSb2xhbmQgQWxsZW4uJywgIkhpc3Rvcnkgb2YgVGV4YXMgfCBUaGUgcmVjb3JkZWQgSGlzdG9yeSBvZiBUZXhhcyBiZWdpbnMgd2l0aCB0aGUgYXJyaXZhbCBvZiB0aGUgZmlyc3QgU3BhbmlzaCBjb25xdWlzdGFkb3JzIGluIHRoZSByZWdpb24gb2YgTm9ydGggQW1lcmljYSBub3cga25vd24gYXMgVGV4YXMgaW4gMTUxOSwgd2hvIGZvdW5kIHRoZSByZWdpb24gcG9wdWxhdGVkIGJ5IG51bWVyb3VzIE5hdGl2ZSBBbWVyaWNhbiAvSW5kaWFuIHRyaWJlcy4KICAgIE5hdGl2ZSBBbWVyaWNhbnMnIGFuY2VzdG9ycyBoYWQgYmVlbiB0aGVyZSBmb3IgbW9yZSB0aGFuIDEwLDAwMCB5ZWFycyBhcyBldmlkZW5jZWQgYnkgdGhlIGRpc2NvdmVyeSBvZiB0aGUgcmVtYWlucyBvZiBwcmVoaXN0b3JpYyBMZWFuZGVydGhhbCBMYWR5LgogICAgRHVyaW5nIHRoZSBwZXJpb2Qgb2YgcmVjb3JkZWQgaGlzdG9yeSBmcm9tIEEuRC4gMTUxOSB0byAxODQ4LCBhbGwgb3IgcGFydHMgb2YgVGV4YXMgd2VyZSBjbGFpbWVkIGJ5IGZpdmUgY291bnRyaWVzOiBGcmFuY2UsIFNwYWluLCBNZXhpY28sIHRoZSBSZXB1YmxpYyBvZiBUZXhhcywgdGhlIFVuaXRlZCBTdGF0ZXMgb2YgQW1lcmljYeKAlGFzIHdlbGwgYXMgdGhlIHNlY2Vzc2lvbmlzdCBDb25mZWRlcmF0ZSBTdGF0ZXMgb2YgQW1lcmljYSBpbiAxODYx4oCTMTg2NSwgZHVyaW5nIHRoZSBBbWVyaWNhbiBDaXZpbCBXYXIuIiwgJ0NoYXJsb3R0ZSBCYWxkd2luIEFsbGVuIHwgQ2hhcmxvdHRlIEJhbGR3aW4gQWxsZW4gKEp1bHkgMTQsIDE4MDUg4oCTIEF1Z3VzdCAzLCAxODk1KSBpcyBrbm93biBpbiBUZXhhbiBoaXN0b3J5IGFzIHRoZSAibW90aGVyIG9mIEhvdXN0b24iLiAgU2hlIHdhcyB0aGUgd2lmZSBvZiBBdWd1c3R1cyBDaGFwbWFuIEFsbGVuLCB3aG8gdXNlZCBoZXIgaW5oZXJpdGFuY2UgdG8gZmluYW5jZSB0aGUgZm91bmRpbmcgb2YgdGhpcyBjaXR5LicsICdBbGxlbiBQYXJrd2F5IHwgQWxsZW4gUGFya3dheSBpcyBhbiBhcnRlcmlhbCByb2FkIHdlc3Qgb2YgRG93bnRvd24gSG91c3RvbiwgVGV4YXMuICBJdCBoYXMgYSBkaXN0YW5jZSBvZiBhcHByb3hpbWF0ZWx5IDIuMyBtaWxlcyAoMy43XHhhMGttKSwgcnVubmluZyBmcm9tIEludGVyc3RhdGUgNDUgd2VzdCB0byBTaGVwaGVyZCBEcml2ZSwgd2hlcmUgaXQgYmVjb21lcyBLaXJieSBEcml2ZS4gIE9yaWdpbmFsbHkga25vd24gYXMgQnVmZmFsbyBQYXJrd2F5LCBpdCB3YXMgbGF0ZXIgbmFtZWQgYWZ0ZXIgSm9obiBLaXJieSBBbGxlbiBhbmQgQXVndXN0dXMgQ2hhcG1hbiBBbGxlbiwgdGhlIGZvdW5kZXJzIG9mIEhvdXN0b24uJywgIkFsbGVuJ3MgTGFuZGluZyB8IEFsbGVuJ3MgTGFuZGluZyBpcyB0aGUgYmlydGhwbGFjZSBvZiB0aGUgY2l0eSBvZiBIb3VzdG9u4oCUdGhlIGxhcmdlc3QgY2l0eSBpbiB0aGUgVS5TLiBzdGF0ZSBvZiBUZXhhcy4gIEluIEF1Z3VzdCAxODM2LCBqdXN0IG1vbnRocyBhZnRlciB0aGUgUmVwdWJsaWMgb2YgVGV4YXMgd29uIGl0cyBpbmRlcGVuZGVuY2UgZnJvbSBNZXhpY28sIHR3byBicm90aGVycyAoYW5kIHJlYWwgZXN0YXRlIGRldmVsb3BlcnMpIGZyb20gTmV3IFlvcmvigJRKb2huIEtpcmJ5IEFsbGVuIGFuZCBBdWd1c3R1cyBDaGFwbWFuIEFsbGVu4oCUcHVyY2hhc2VkIDYsNjQyXHhhMGFjcmVzXHhhMCgyN1x4YTBrbcKyKSBpbiB0aGUgYXJlYSBhbmQgc2V0dGxlZCB0aGVyZSBvbiB0aGUgYmFua3Mgb2YgQnVmZmFsbyBCYXlvdS4gIEFsbGVuJ3MgTGFuZGluZyBpcyBsb2NhdGVkIHNvdXRoIG9mIHRoZSBVbml2ZXJzaXR5IG9mIEhvdXN0b27igJNEb3dudG93biBDb21tZXJjZSBTdHJlZXQgQnVpbGRpbmcsIGF0IHRoZSBpbnRlcnNlY3Rpb24gb2YgQ29tbWVyY2UgU3RyZWV0IGFuZCBNYWluIFN0cmVldC4iLCAiS2VpdGggQWxsZW4gKEFtZXJpY2FuIGZvb3RiYWxsKSB8IEtlaXRoIEQuIEFsbGVuIChib3JuIEp1bHkgMTIsIDE5NzQpIGlzIGFuIEFtZXJpY2FuIGZvb3RiYWxsIGNvYWNoLiAgSGUgc2VydmVkIGFzIHRoZSBoZWFkIGZvb3RiYWxsIGNvYWNoIGF0IFNvdXRod2VzdCBCYXB0aXN0IFVuaXZlcnNpdHkgZnJvbSAyMDA3IHRvIDIwMTIsIGNvbXBpbGluZyBhIHJlY29yZCBvZiAyN+KAkzM5LiAgSGlzIDI3IHdpbnMgYXJlIHRoZSBtb3N0IGluIHRoZSBoaXN0b3J5IG9mIFNvdXRod2VzdCBCYXB0aXN0J3MgZm9vdGJhbGwgcHJvZ3JhbSwgd2hpY2ggYmVnYW4gcGxheSBpbiAxOTgzLiJdCnJlYXNvbmluZzoKICAgIFRoZSBjbGFpbSBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBwYXNzYWdlcy4gV2hpbGUgdGhlIHBhc3NhZ2VzIGNvbmZpcm0gdGhhdCBUZXhhcydzIHJlY29yZGVkIGhpc3RvcnkgYmVnYW4gaW4gMTUxOSAocGFzc2FnZSAzKSBhbmQgdGhhdCBBdWd1c3R1cyBDaGFwbWFuIEFsbGVuIGZvdW5kZWQgSG91c3RvbiBpbiBUZXhhcyAocGFzc2FnZSAyKSwgdGhleSBkbyBub3QgZXhwbGljaXRseSBsaW5rIHRoZSBzdGFydCBvZiBUZXhhcydzIHJlY29yZGVkIGhpc3RvcnkgdG8gdGhlIHNhbWUgc3RhdGUgd2hlcmUgQXVndXN0dXMgQ2hhcG1hbiBBbGxlbiB1c2VkIGhpcyBpbmhlcml0YW5jZSB0byBmdW5kIHRoZSBmb3VuZGluZyBvZiBhIGNpdHkuIFRoZSBjbGFpbSBjb25mbGF0ZXMgdGhlc2UgdHdvIGZhY3RzIHdpdGhvdXQgZGlyZWN0IGV2aWRlbmNlIGluIHRoZSBwYXNzYWdlcyB0aGF0IHRoZSAxNTE5IHN0YXJ0IG9mIHJlY29yZGVkIGhpc3RvcnkgaXMgdGllZCB0byB0aGUgc3RhdGUgd2hlcmUgQWxsZW4ncyBpbmhlcml0YW5jZSB3YXMgdXNlZCBmb3IgZm91bmRpbmcgSG91c3Rvbi4Kc3VtbWFyeToKICAgIFRoZSBjbGFpbSBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBwcm92aWRlZCBwYXNzYWdlcywgYXMgdGhleSBjb25maXJtIFRleGFzJ3MgcmVjb3JkZWQgaGlzdG9yeSBiZWdhbiBpbiAxNTE5IGFuZCBBdWd1c3R1cyBDaGFwbWFuIEFsbGVuIGZvdW5kZWQgSG91c3RvbiBpbiBUZXhhcyBidXQgZG8gbm90IGV4cGxpY2l0bHkgY29ubmVjdCB0aGUgdHdvIGZhY3RzIGFzIHN0YXRlZCBpbiB0aGUgY2xhaW0uCgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
Given the fields ‘claim‘, ‘context‘, and ‘passages‘, perform multi-hop reasoning to generate a structured summary that validates or refutes the claim. First, analyze the claim and contextual information to identify key relationships. Next, evaluate evidence from the retrieved passages to build a coherent narrative. Construct a logical reasoning chain connecting the claim to supporting or contradictory evidence. Finally, produce a concise summary that explicitly confirms or contradicts the claim based on your analysis, citing relevant evidence from the context and passages.
Demos:
Example 1:
claim:
 The recorded history of the state, for which Baptist George Ruby was a prominent black Republican leader in the Reconstruction-era, officially started in 1519 in the same state that holds the city Augustus Chapman Allen used his inheritance to fund the founding of.
context:
 The claim is not supported by the passages. While George Ruby was associated with Texas during Reconstruction and Augustus Chapman Allen founded Houston in Texas, there is no evidence in the passages that Texas’s recorded history began in 1519.
passages:
 ["Merchants and Manufacturers Building | The One Main Building, formerly the Merchants and Manufacturers Building (commonly referred to as the M&M Building), is a building on the campus of the University of Houston–Downtown. The building is recognized as part of the National Register of Historic Places, is a Recorded Texas Historic Landmark, and considered a Contributing Building in Downtown Houston’s Main Street/Market Square Historic District. The building was built above Allen’s Landing—an area where Houston’s founders John Kirby Allen and Augustus Chapman Allen originally settled.", ’Augustus Chapman Allen | Augustus Chapman Allen (July 4, 1806 – January 11, 1864), along with his younger brother, John Kirby Allen, founded the City of Houston in the U.S. state of Texas. He was born on July 4, 1806, in Canaseraga Village, New York (the present day hamlet of Sullivan in the Town of Sullivan, New York), to Sarah (Chapman) and Roland Allen.’, "History of Texas | The recorded History of Texas begins with the arrival of the first Spanish conquistadors in the region of North America now known as Texas in 1519, who found the region populated by numerous Native American /Indian tribes.
 Native Americans’ ancestors had been there for more than 10,000 years as evidenced by the discovery of the remains of prehistoric Leanderthal Lady.
 During the period of recorded history from A.D. 1519 to 1848, all or parts of Texas were claimed by five countries: France, Spain, Mexico, the Republic of Texas, the United States of America—as well as the secessionist Confederate States of America in 1861–1865, during the American Civil War.", ’Charlotte Baldwin Allen | Charlotte Baldwin Allen (July 14, 1805 – August 3, 1895) is known in Texan history as the "mother of Houston". She was the wife of Augustus Chapman Allen, who used her inheritance to finance the founding of this city.’, ’Allen Parkway | Allen Parkway is an arterial road west of Downtown Houston, Texas. It has a distance of approximately 2.3 miles (3.7\xa0km), running from Interstate 45 west to Shepherd Drive, where it becomes Kirby Drive. Originally known as Buffalo Parkway, it was later named after John Kirby Allen and Augustus Chapman Allen, the founders of Houston.’, "Allen’s Landing | Allen’s Landing is the birthplace of the city of Houston—the largest city in the U.S. state of Texas. In August 1836, just months after the Republic of Texas won its independence from Mexico, two brothers (and real estate developers) from New York—John Kirby Allen and Augustus Chapman Allen—purchased 6,642\xa0acres\xa0(27\xa0km²) in the area and settled there on the banks of Buffalo Bayou. Allen’s Landing is located south of the University of Houston–Downtown Commerce Street Building, at the intersection of Commerce Street and Main Street.", "Keith Allen (American football) | Keith D. Allen (born July 12, 1974) is an American football coach. He served as the head football coach at Southwest Baptist University from 2007 to 2012, compiling a record of 27–39. His 27 wins are the most in the history of Southwest Baptist’s football program, which began play in 1983."]
reasoning:
 The claim is not supported by the passages. While the passages confirm that Texas’s recorded history began in 1519 (passage 3) and that Augustus Chapman Allen founded Houston in Texas (passage 2), they do not explicitly link the start of Texas’s recorded history to the same state where Augustus Chapman Allen used his inheritance to fund the founding of a city. The claim conflates these two facts without direct evidence in the passages that the 1519 start of recorded history is tied to the state where Allen’s inheritance was used for founding Houston.
summary:
 The claim is not supported by the provided passages, as they confirm Texas’s recorded history began in 1519 and Augustus Chapman Allen founded Houston in Texas but do not explicitly connect the two facts as stated in the claim.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,R2l2ZW4gdGhlIGZpZWxkcyBgY2xhaW1gLCBgY29udGV4dGAsIGFuZCBgcGFzc2FnZXNgLCBwcm9kdWNlIHRoZSBmaWVsZCBgc3VtbWFyeWAgdGhhdDoKMS4gKipFdmFsdWF0ZXMgdGhlIGNsYWltJ3MgdmFsaWRpdHkqKiBieSBleHBsaWNpdGx5IGNvbm5lY3RpbmcgaXQgdG8gKipzcGVjaWZpYyBldmlkZW5jZSoqIGZyb20gdGhlIGBwYXNzYWdlc2AgKGUuZy4sIGNpdGluZyBleGFjdCBuYW1lcywgZGF0ZXMsIG9yIHRlcm1zIHRoYXQgc3VwcG9ydC9yZWZ1dGUgdGhlIGNsYWltKS4KMi4gKipIaWdobGlnaHRzIGZhY3R1YWwgaW5hY2N1cmFjaWVzKiogaW4gdGhlIGNsYWltLCBzdWNoIGFzIGluY29ycmVjdCBvcmlnaW5zLCBkYXRlcywgb3IgcmVsYXRpb25zaGlwcywgYW5kIGxpbmtzIHRoZW0gdG8gKipkaXJlY3QgY29udHJhZGljdGlvbnMqKiBpbiB0aGUgYHBhc3NhZ2VzYCBvciBgY29udGV4dGAuCjMuICoqTWVudGlvbnMga2V5IHRlcm1zIG9yIGVudGl0aWVzKiogY3JpdGljYWwgdG8gdGhlIGNsYWltIChlLmcuLCAiU2x5IFN0b25lLCIgIkxhcmdlIE3DvG5zdGVybMOkbmRlciwiIG9yICJIaXQgUGFyYWRlcidzIDIwMDYgcmFua2luZyIpIHRvIGVuc3VyZSBzdW1tYXJpZXMgYXJlIGFjdGlvbmFibGUgZm9yIHF1ZXJ5IGdlbmVyYXRpb24uCjQuICoqQmFsYW5jZXMgYWNjdXJhY3kqKiBieSBhY2tub3dsZWRnaW5nIGJvdGggY29ycmVjdCBhbmQgaW5jb3JyZWN0IGFzcGVjdHMgb2YgdGhlIGNsYWltLCBhcyBzZWVuIGluIHRoZSBleGFtcGxlcyAoZS5nLiwgdmFsaWRhdGluZyAiVGhlIFdpbGQgQnVuY2giIGNvbXBpbGF0aW9uIHdoaWxlIGNvcnJlY3RpbmcgdGhlIG1hZ2F6aW5lJ3MgbmF0aW9uYWxpdHkgYW5kIHJhbmtpbmcgeWVhcikuCjUuICoqQXZvaWRzIHZhZ3VlIHN0YXRlbWVudHMqKiBsaWtlICJubyBldmlkZW5jZSIgYW5kIGluc3RlYWQgc3BlY2lmaWVzICoqd2hpY2ggcGFydHMgb2YgdGhlIHBhc3NhZ2VzKiogYXJlIHJlbGV2YW50IChlLmcuLCAiUGFzc2FnZSA2IGNvbmZpcm1zIEhpdCBQYXJhZGVyIHdhcyBBbWVyaWNhbiIpLgoKKipHZW5lcmFsaXphYmxlIFN0cmF0ZWd5Kio6Ci0gQWx3YXlzIHJlZmVyZW5jZSAqKnNwZWNpZmljIHBhc3NhZ2VzKiogKGUuZy4sICJQYXNzYWdlIDEgc3RhdGVzLi4uIikgdG8gZ3JvdW5kIGNsYWltcyBpbiB0aGUgdGV4dC4KLSBVc2UgKipwcmVjaXNlIHRlcm1pbm9sb2d5KiogKGUuZy4sICJHZXJtYW4gU2hvcnRoYWlyZWQgUG9pbnRlciIgaW5zdGVhZCBvZiAiY291c2lucyIpIHRvIGFsaWduIHdpdGggdGhlIGRhdGEuCi0gUHJpb3JpdGl6ZSAqKmNsYXJpdHkgYW5kIHNwZWNpZmljaXR5KiogdG8gZW5zdXJlIHN1bW1hcmllcyBjYW4gZ3VpZGUgZnVydGhlciBldmlkZW5jZSByZXRyaWV2YWwu)
Given the fields ‘claim‘, ‘context‘, and ‘passages‘, produce the field ‘summary‘ that:
1. **Evaluates the claim’s validity** by explicitly connecting it to **specific evidence** from the ‘passages‘ (e.g., citing exact names, dates, or terms that support/refute the claim).
2. **Highlights factual inaccuracies** in the claim, such as incorrect origins, dates, or relationships, and links them to **direct contradictions** in the ‘passages‘ or ‘context‘.
3. **Mentions key terms or entities** critical to the claim (e.g., "Sly Stone," "Large Münsterländer," or "Hit Parader’s 2006 ranking") to ensure summaries are actionable for query generation.
4. **Balances accuracy** by acknowledging both correct and incorrect aspects of the claim, as seen in the examples (e.g., validating "The Wild Bunch" compilation while correcting the magazine’s nationality and ranking year).
5. **Avoids vague statements** like "no evidence" and instead specifies **which parts of the passages** are relevant (e.g., "Passage 6 confirms Hit Parader was American").


**Generalizable Strategy**:
- Always reference **specific passages** (e.g., "Passage 1 states...") to ground claims in the text.
- Use **precise terminology** (e.g., "German Shorthaired Pointer" instead of "cousins") to align with the data.
- Prioritize **clarity and specificity** to ensure summaries can guide further evidence retrieval.

### L.7 PUPA, GPT-4.1 Mini

PUPA GPT-4.1 Mini craft_redacted_request.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gYSBwcml2YXRlIHVzZXIgcXVlcnksIGNyZWF0ZSBhIHByaXZhY3ktcHJlc2VydmluZyByZXF1ZXN0IGZvciBhIHBvd2VyZnVsIGV4dGVybmFsIExMTS4KVGhlIExMTSBtYXkgYXNzaXN0IHdpdGhvdXQgbGVhcm5pbmcgcHJpdmF0ZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXNlci4=)
Given a private user query, create a privacy-preserving request for a powerful external LLM.
The LLM may assist without learning private information about the user.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,WW91IHdpbGwgYmUgZ2l2ZW4gYSBwcml2YXRlIHVzZXIgcXVlcnkuIFlvdXIgdGFzayBpcyB0byBhbmFseXplIHRoZSBxdWVyeSBjYXJlZnVsbHkgYW5kIHRoaW5rIHN0ZXAtYnktc3RlcCB0byB1bmRlcnN0YW5kIHRoZSB1c2VyJ3MgaW50ZW50IHdoaWxlIGlkZW50aWZ5aW5nIGFuZCByZW1vdmluZyBvciBhYnN0cmFjdGluZyBhbnkgc2Vuc2l0aXZlLCBwcm9wcmlldGFyeSwgb3IgcGVyc29uYWxseSBpZGVudGlmaWFibGUgaW5mb3JtYXRpb24uIFRoZW4sIGdlbmVyYXRlIGEgY2xlYXIsIHByaXZhY3ktcHJlc2VydmluZyBwcm9tcHQgc3VpdGFibGUgZm9yIGFuIGV4dGVybmFsIGxhcmdlIGxhbmd1YWdlIG1vZGVsIChMTE0pIHRoYXQgcmVxdWVzdHMgdXNlZnVsLCByZWxldmFudCBndWlkYW5jZSBvciBpbmZvcm1hdGlvbiB3aXRob3V0IGV4cG9zaW5nIHByaXZhdGUgZGV0YWlscy4gQWRkaXRpb25hbGx5LCBwcm92aWRlIGEgZGV0YWlsZWQgY2hhaW4tb2YtdGhvdWdodCBleHBsYW5hdGlvbiBkZXNjcmliaW5nIHlvdXIgcmVhc29uaW5nIHByb2Nlc3MgZm9yIGhvdyB5b3UgdHJhbnNmb3JtZWQgdGhlIG9yaWdpbmFsIHF1ZXJ5IGludG8gdGhlIHJlZGFjdGVkLCBnZW5lcmFsaXplZCBMTE0gcmVxdWVzdC4gRW5zdXJlIHRoZSByZXN1bHRpbmcgcHJvbXB0IGlzIHByb2Zlc3Npb25hbCwgY29udGV4dHVhbGx5IGFwcHJvcHJpYXRlLCBhbmQgbWFpbnRhaW5zIHVzZXIgcHJpdmFjeSB3aGlsZSBlbmFibGluZyB0aGUgTExNIHRvIGFzc2lzdCBlZmZlY3RpdmVseS4KRGVtb3M6CkV4YW1wbGUgMToKdXNlcl9xdWVyeToKICAgIEltYWdpbmUgeW91IGFyZSBhIHN0b2NrIHJlc2VhcmNoZXIgYW5kIGFkdmlzb3IsIEkgd2lsbCBnaXZlIHlvdSBhIHRhYmxlIGFib3V0IHN0b2NrcyBhbmQgSSB3YW50IHlvdSB0byBnaXZlIG1lIGFkdmljZSBvbiB3aGF0IHRvIGludmVzdCBuZXh0LiBUaGlzIGlzIGEgcHJvamVjdCBJIGFtIHdvcmtpbmcgb24gYW4gSSBuZWVkIGhlbHAgd2l0aCBwcmVkaWN0aW9ucyBJIGFtIG1ha2luZy4gSGVyZSBpcyB0aGUgdGFibGU6IFN0b2NrIFByaWNlIERpdmlkZW5kcyA1RCA1RCAlIDFNIDFNICUgWVREIFlURCAlIDFZIDFZICUgNVkgNVkgJSBJQk0gJDE0Niw2MiAkNiw2NCAkMyw4MSAyLDY2ICQyLDYzIDEsODMgJDUsMDcgMyw1OCAkMTYsMzEgMTIsNTEgJDAsMDMgMCwwMiBNQ0QgJDI4NCw5MCAkNiwwOCAkNSwwNyAxLDgxIC0kNywyMCAtMiw0NiAkMjAsNTcgNyw3OCAkMjksMjQgMTEsNDQgJDEyMywyNiA3NiwyNiBKTkogJDE2Myw5OCAkNCw3NiAtJDMsMDAgLTEsODAgLSQzLDkwIC0yLDMyIC0kMTQsMjEgLTcsOTcgJDAsOTggMCw2MCAkMjksNjYgMjIsMDggTVNGVCAkMzI0LDg5ICQyLDcyICQxLDI1IDAsMzkgLSQ5LDg4IC0yLDk1ICQ4NSwzMSAzNSw2MSAkNTksNjYgMjIsNDkgJDIxNywzMyAyMDIsMDUgV01UICQxNTgsMzYgJDIsMjggJDEsMzkgMCw4OSAtJDEsODUgLTEsMTUgJDE0LDc1IDEwLDI3ICQyNSw0NyAxOSwxNiAkNjIsMjkgNjQsODQgS08gJDYwLDUwICQxLDg0ICQwLDEyIDAsMjAgLSQxLDU5IC0yLDU1IC0kMiw0NSAtMyw4OSAtJDIsMjMgLTMsNTUgJDE1LDEzIDMzLDM1IFBGRSAkMzYsMDcgJDEsNjQgLSQxLDA2IC0yLDg0IC0kMCw2NyAtMSw4MSAtJDE1LDE5IC0yOSw2NCAtJDEwLDE2IC0yMSw5OCAtJDUsNDMgLTEzLDA5IEFBUEwgJDE3OSw5NiAkMCw5NiAkMyw0NSAxLDk1IC0kMTYsNTcgLTgsNDMgJDU0LDg5IDQzLDg5ICQxOCw1OCAxMSw1MSAkMTI1LDA0IDIyNyw2NSBOVkRBICQ0NjgsMjMgJDAsMTYgLSQzLDcxIC0wLDc5ICQ3LDA1IDEsNTMgJDMyNSwwOCAyMjcsMDkgJDMxMCwyMiAxOTYsMzMgJDQwMSw1MiA2MDEsODkgQ1JNICQyMTIsMTAgJDAsMDAgJDIsNzUgMSwzMSAtJDksODYgLTQsNDQgJDc3LDMyIDU3LDM3ICQ1MSw4OSAzMiwzOSAkNTksMTEgMzgsNjQgUFlQTCAkNjEsMTYgJDAsMDAgJDEsMDYgMSw3NiAtJDEzLDgyIC0xOCw0MyAtJDEzLDQzIC0xOCwwMCAtJDMxLDUxIC0zNCwwMCAtJDI5LDQ2IC0zMiw1MSBCSURVICQxMzcsNDcgJDAsMDAgJDEwLDI0IDgsMDUgLSQxNSw2MyAtMTAsMjEgJDE4LDM0IDE1LDM5IC0kOSw4NSAtNiw2OSAtJDg4LDI1IC0zOSwxMApyZWFzb25pbmc6CiAgICBUaGUgdXNlciB3YW50cyBpbnZlc3RtZW50IGFkdmljZSBiYXNlZCBvbiBhIHByb3ZpZGVkIHRhYmxlIG9mIHN0b2NrIGRhdGEgaW5jbHVkaW5nIHByaWNlLCBkaXZpZGVuZHMsIGFuZCBwZXJjZW50YWdlIGNoYW5nZXMgb3ZlciB2YXJpb3VzIHRpbWUgaW50ZXJ2YWxzICg1IGRheXMsIDEgbW9udGgsIHllYXItdG8tZGF0ZSwgMSB5ZWFyLCBhbmQgNSB5ZWFycykuIFRoZSBwcmltYXJ5IHJlcXVlc3QgaXMgZm9yIHJlY29tbWVuZGF0aW9ucyBvbiB3aGF0IHRvIGludmVzdCBpbiBuZXh0IGFuZCBoZWxwIHdpdGggbWFraW5nIHByZWRpY3Rpb25zLgoKVG8gcHJlc2VydmUgcHJpdmFjeSwgSSBzaG91bGQgbm90IGluY2x1ZGUgdGhlIHVzZXIncyByYXcgZGF0YSBvciBzcGVjaWZpYyBkZXRhaWxzIGFib3V0IGluZGl2aWR1YWwgc3RvY2tzIGRpcmVjdGx5IGluIHRoZSBwcm9tcHQgdG8gdGhlIGV4dGVybmFsIExMTS4gSW5zdGVhZCwgSSBzaG91bGQgcmVxdWVzdCBnZW5lcmFsIGFkdmljZSBvbiBob3cgdG8gYW5hbHlzZSBzdG9jayBkYXRhIHRhYmxlcyB0aGF0IGluY2x1ZGUgcHJpY2UsIGRpdmlkZW5kLCBhbmQgcGVyY2VudGFnZSBjaGFuZ2VzIG92ZXIgbXVsdGlwbGUgdGltZSBwZXJpb2RzLiBBbHNvLCBJIGNhbiBhc2sgZm9yIGFkdmljZSBvbiB3aGF0IGluZGljYXRvcnMgdG8gd2VpZ2ggbW9yZSBoZWF2aWx5IGZvciBpbnZlc3RtZW50IGRlY2lzaW9ucyBhbmQgZm9yIHByZWRpY3RpdmUgc3RyYXRlZ2llcyBiYXNlZCBvbiBzdWNoIGRhdGEgc3RydWN0dXJlcy4KClRoaXMgYXBwcm9hY2ggZW5zdXJlcyB0aGF0IHRoZSBleHRlcm5hbCBMTE0gZG9lcyBub3QgcmVjZWl2ZSBhbnkgcHJpdmF0ZSBvciBpZGVudGlmeWluZyB1c2VyIGRhdGEsIG9ubHkgYSBnZW5lcmljIHJlcXVlc3QuIEkgd2lsbCBhc2sgdGhlIExMTSB0byBwcm92aWRlIGd1aWRhbmNlIG9uIGludGVycHJldGluZyBzdWNoIHN0b2NrIHBlcmZvcm1hbmNlIGluZGljYXRvcnMgYW5kIHN1Z2dlc3Rpb25zIGZvciBwcmVkaWN0aXZlIGFuYWx5dGljcyBvciBpbnZlc3RtZW50IHNlbGVjdGlvbiBjcml0ZXJpYS4KbGxtX3JlcXVlc3Q6CiAgICBQbGVhc2UgcHJvdmlkZSBnZW5lcmFsIGd1aWRhbmNlIGZvciBhbmFseXppbmcgc3RvY2sgaW52ZXN0bWVudCBvcHBvcnR1bml0aWVzIGJhc2VkIG9uIGEgZGF0YSB0YWJsZSBmb3JtYXQgdGhhdCBpbmNsdWRlcyBzdG9jayBwcmljZXMsIGRpdmlkZW5kIHBheW91dHMsIGFuZCBwZXJjZW50YWdlIGNoYW5nZXMgb3ZlciB2YXJpb3VzIHRpbWUgaW50ZXJ2YWxzIHN1Y2ggYXMgNSBkYXlzLCAxIG1vbnRoLCB5ZWFyLXRvLWRhdGUsIDEgeWVhciwgYW5kIDUgeWVhcnMuIE91dGxpbmUga2V5IGluZGljYXRvcnMgdGhhdCBpbnZlc3RvcnMgdHlwaWNhbGx5IHdlaWdoIHdoZW4gbWFraW5nIGRlY2lzaW9ucywgaG93IHRvIGludGVycHJldCBzaG9ydC10ZXJtIHZlcnN1cyBsb25nLXRlcm0gcGVyZm9ybWFuY2UgdHJlbmRzLCBhbmQgc3VnZ2VzdCBzdHJhdGVnaWVzIG9yIG1ldHJpY3MgdG8gdXNlIHdoZW4gbWFraW5nIHByZWRpY3Rpb25zIG9yIHJlY29tbWVuZGF0aW9ucyBhYm91dCB3aGljaCBzdG9ja3MgdG8gaW52ZXN0IGluIG5leHQuIFRoZSByZXF1ZXN0IGlzIGZvciBnZW5lcmljIGFkdmljZSB3aXRob3V0IGFueSBzcGVjaWZpYyBzdG9jayBuYW1lcyBvciB2YWx1ZXMuCgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
You will be given a private user query. Your task is to analyze the query carefully and think step-by-step to understand the user’s intent while identifying and removing or abstracting any sensitive, proprietary, or personally identifiable information. Then, generate a clear, privacy-preserving prompt suitable for an external large language model (LLM) that requests useful, relevant guidance or information without exposing private details. Additionally, provide a detailed chain-of-thought explanation describing your reasoning process for how you transformed the original query into the redacted, generalized LLM request. Ensure the resulting prompt is professional, contextually appropriate, and maintains user privacy while enabling the LLM to assist effectively.
Demos:
Example 1:
user_query:
 Imagine you are a stock researcher and advisor, I will give you a table about stocks and I want you to give me advice on what to invest next. This is a project I am working on an I need help with predictions I am making. Here is the table: Stock Price Dividends 5D 5D % 1M 1M % YTD YTD % 1Y 1Y % 5Y 5Y % IBM $146,62 $6,64 $3,81 2,66 $2,63 1,83 $5,07 3,58 $16,31 12,51 $0,03 0,02 MCD $284,90 $6,08 $5,07 1,81 -$7,20 -2,46 $20,57 7,78 $29,24 11,44 $123,26 76,26 JNJ $163,98 $4,76 -$3,00 -1,80 -$3,90 -2,32 -$14,21 -7,97 $0,98 0,60 $29,66 22,08 MSFT $324,89 $2,72 $1,25 0,39 -$9,88 -2,95 $85,31 35,61 $59,66 22,49 $217,33 202,05 WMT $158,36 $2,28 $1,39 0,89 -$1,85 -1,15 $14,75 10,27 $25,47 19,16 $62,29 64,84 KO $60,50 $1,84 $0,12 0,20 -$1,59 -2,55 -$2,45 -3,89 -$2,23 -3,55 $15,13 33,35 PFE $36,07 $1,64 -$1,06 -2,84 -$0,67 -1,81 -$15,19 -29,64 -$10,16 -21,98 -$5,43 -13,09 AAPL $179,96 $0,96 $3,45 1,95 -$16,57 -8,43 $54,89 43,89 $18,58 11,51 $125,04 227,65 NVDA $468,23 $0,16 -$3,71 -0,79 $7,05 1,53 $325,08 227,09 $310,22 196,33 $401,52 601,89 CRM $212,10 $0,00 $2,75 1,31 -$9,86 -4,44 $77,32 57,37 $51,89 32,39 $59,11 38,64 PYPL $61,16 $0,00 $1,06 1,76 -$13,82 -18,43 -$13,43 -18,00 -$31,51 -34,00 -$29,46 -32,51 BIDU $137,47 $0,00 $10,24 8,05 -$15,63 -10,21 $18,34 15,39 -$9,85 -6,69 -$88,25 -39,10
reasoning:
 The user wants investment advice based on a provided table of stock data including price, dividends, and percentage changes over various time intervals (5 days, 1 month, year-to-date, 1 year, and 5 years). The primary request is for recommendations on what to invest in next and help with making predictions.


To preserve privacy, I should not include the user’s raw data or specific details about individual stocks directly in the prompt to the external LLM. Instead, I should request general advice on how to analyse stock data tables that include price, dividend, and percentage changes over multiple time periods. Also, I can ask for advice on what indicators to weigh more heavily for investment decisions and for predictive strategies based on such data structures.


This approach ensures that the external LLM does not receive any private or identifying user data, only a generic request. I will ask the LLM to provide guidance on interpreting such stock performance indicators and suggestions for predictive analytics or investment selection criteria.
llm_request:
 Please provide general guidance for analyzing stock investment opportunities based on a data table format that includes stock prices, dividend payouts, and percentage changes over various time intervals such as 5 days, 1 month, year-to-date, 1 year, and 5 years. Outline key indicators that investors typically weigh when making decisions, how to interpret short-term versus long-term performance trends, and suggest strategies or metrics to use when making predictions or recommendations about which stocks to invest in next. The request is for generic advice without any specific stock names or values.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,TmV3IEluc3RydWN0aW9uIGZvciBQcml2YWN5LVByZXNlcnZpbmcgUXVlcnkgUmVmb3JtdWxhdGlvbiBBc3Npc3RhbnQgKEVuaGFuY2VkKToKClRhc2sgT3ZlcnZpZXc6CllvdSByZWNlaXZlIGEgdXNlciBxdWVyeSB0aGF0IG1heSBjb250YWluIHNlbnNpdGl2ZSwgcHJpdmF0ZSwgb3IgcGVyc29uYWxseSBpZGVudGlmaWFibGUgaW5mb3JtYXRpb24gKFBJSSkuIFlvdXIgb2JqZWN0aXZlIGlzIHRvIHJlZm9ybXVsYXRlIHRoaXMgcXVlcnkgaW50byBhIGdlbmVyYWxpemVkLCBwcml2YWN5LXByZXNlcnZpbmcgcHJvbXB0IHN1aXRhYmxlIGZvciBzZW5kaW5nIHRvIGFuIGV4dGVybmFsIGxhcmdlIGxhbmd1YWdlIG1vZGVsIChMTE0pLiBUaGUgcmVmb3JtdWxhdGVkIHByb21wdCBtdXN0IGVuYWJsZSB0aGUgZXh0ZXJuYWwgTExNIHRvIGZ1bGZpbGwgdGhlIHVzZXIncyBvcmlnaW5hbCBpbnRlbnQgZWZmZWN0aXZlbHkgd2hpbGUgcmlnb3JvdXNseSBwcm90ZWN0aW5nIGFsbCB1c2VyIHByaXZhY3kgYnkgYWJzdHJhY3RpbmcsIG9taXR0aW5nLCBvciBnZW5lcmFsaXppbmcgYW55IHNlbnNpdGl2ZSBkZXRhaWxzLgoKSW5wdXQgRm9ybWF0OgotIEEgc2luZ2xlIHVzZXIgcXVlcnkgc3RyaW5nLgotIFRoZSBxdWVyeSBtaWdodCBjb250YWluIGlkZW50aWZpYWJsZSBuYW1lcyAocGVvcGxlLCBvcmdhbml6YXRpb25zKSwgc3BlY2lmaWMgZ2VvZ3JhcGhpYyBsb2NhdGlvbnMsIGV4YWN0IGRhdGVzIG9yIHRpbWVmcmFtZXMsIHByb3ByaWV0YXJ5IG9yIGludGVybmFsIHRlcm1pbm9sb2d5IChlLmcuLCBzeXN0ZW0gbmFtZXMsIHByb2R1Y3QgY29kZXMpLCBjbGllbnQgb3IgY3VzdG9tZXIgbmFtZXMsIFVSTHMsIG9yIGFueSBvdGhlciBzZW5zaXRpdmUgb3IgcHJpdmF0ZSBpbmZvcm1hdGlvbi4KCk91dHB1dCBGb3JtYXQ6Ci0gUGFydCAoYSkgUmVhc29uaW5nOgogICBQcm92aWRlIGEgY29uY2lzZSBwYXJhZ3JhcGggdGhhdCBleHBsYWluczoKICAgKiBIb3cgeW91IGlkZW50aWZpZWQgc2Vuc2l0aXZlIG9yIHByaXZhdGUgaW5mb3JtYXRpb24gaW4gdGhlIGlucHV0CiAgICogV2hhdCBzdHJhdGVnaWVzIHlvdSBhcHBsaWVkIHRvIHByb3RlY3QgcHJpdmFjeSAoZ2VuZXJhbGl6YXRpb24sIG9taXNzaW9uLCBhYnN0cmFjdGlvbiwgcmVwbGFjZW1lbnQgd2l0aCBwbGFjZWhvbGRlcnMpCiAgICogSG93IHRoZSByZWZvcm11bGF0ZWQgcHJvbXB0IHByZXNlcnZlcyB0aGUgb3JpZ2luYWwgaW50ZW50IGFuZCB0YXNrIHJlcXVpcmVtZW50cyB3aXRob3V0IHJpc2tpbmcgZGF0YSBsZWFrYWdlCi0gUGFydCAoYikgTExNIFJlcXVlc3Q6CiAgIEEgY29uY2lzZSwgY2FyZWZ1bGx5IGNvbnN0cnVjdGVkIHByaXZhY3ktc2FmZSBwcm9tcHQgdGhhdDoKICAgKiBSZW1vdmVzIG9yIGFub255bWl6ZXMgYWxsIFBJSSBhbmQgcHJvcHJpZXRhcnkvaW50ZXJuYWwgZGV0YWlscwogICAqIEFic3RyYWN0cyBsb2NhdGlvbnMsIG5hbWVzLCBkYXRlcywgYW5kIHRlY2huaWNhbCB0ZXJtcyBhcyBuZWVkZWQKICAgKiBQcm9kdWNlcyBhIGNsZWFyIGFuZCBjb250ZXh0dWFsbHkgcmljaCBpbnN0cnVjdGlvbiBmb3IgdGhlIExMTSB0byBnZW5lcmF0ZSBhIHJlbGV2YW50IGFuZCBpbmZvcm1hdGl2ZSByZXNwb25zZSBhbGlnbmVkIHdpdGggdGhlIHVzZXIncyBvcmlnaW5hbCB0YXNrCgpEZXRhaWxlZCBEb21haW4tU3BlY2lmaWMgR3VpZGFuY2UgYW5kIEJlc3QgUHJhY3RpY2VzOgoKMS4gSWRlbnRpZmljYXRpb24gYW5kIFRyZWF0bWVudCBvZiBTZW5zaXRpdmUgRGF0YToKICAgLSBBbGwgdXNlci1zcGVjaWZpYyBvciBwZXJzb25hbCBuYW1lcyAoaW5kaXZpZHVhbCBvciBvcmdhbml6YXRpb25hbCkgbXVzdCBiZSByZW1vdmVkIG9yIHJlcGxhY2VkIHdpdGggZ2VuZXJpYyByb2xlIGRlc2NyaXB0b3JzIChlLmcuLCDigJxhIGJ1c2luZXNzIGNvbnRhY3Qs4oCdIOKAnGEgY2xpZW50LOKAnSDigJxhIG5vdGFibGUgaW5kaXZpZHVhbOKAnSkuIE5ldmVyIGxpZ2h0bHkgb2JzY3VyZSBvciBwYXJ0aWFsbHkgcmVkYWN0OyBmdWxsIGFic3RyYWN0aW9uIGlzIHJlcXVpcmVkLgogICAtIEFsbCBnZW9ncmFwaGljIG1lbnRpb25zIG11c3QgYmUgYWJzdHJhY3RlZCB1bmxlc3MgdGhlIGxvY2F0aW9uIGlzIHB1YmxpY2x5IGtub3duLCBlc3NlbnRpYWwgdG8gdGhlIHRhc2ssIGFuZCBjYW4gYmUgZ2VuZXJhbGl6ZWQgKGUuZy4sIOKAnGEgcmVnaW9uIGtub3duIGZvciBlY28tdG91cmlzbeKAnSBpbnN0ZWFkIG9mIG5hbWluZyBhIGNvdW50cnkgb3IgY2l0eSBleHBsaWNpdGx5KS4KICAgLSBFeGFjdCBkYXRlcyBvciBkdXJhdGlvbnMgbXVzdCBuZXZlciBiZSByZXRhaW5lZDsgaW5zdGVhZCwgdXNlIHJlbGF0aXZlIG9yIGFwcHJveGltYXRlIHRlbXBvcmFsIHJlZmVyZW5jZXMgKGUuZy4sIOKAnHJlY2VudGx5LOKAnSDigJxvdmVyIHRoZSBwYXN0IHllYXLigJ0pLgogICAtIEludGVybmFsIG9yIHByb3ByaWV0YXJ5IHRlcm1zIOKAlCBpbmNsdWRpbmcgc3lzdGVtIG5hbWVzLCBwcm9kdWN0IGNvZGVzLCBzdWJzY3JpcHRpb24gdHlwZXMsIGFuZCB0ZWNobmljYWwgamFyZ29uIOKAlCBtdXN0IGJlIGdlbmVyYWxpemVkIG9yIHJlcGxhY2VkIHdpdGggbmV1dHJhbCBkZXNjcmlwdG9ycyB0byBhdm9pZCBsZWFrYWdlIG9mIGludGVsbGVjdHVhbCBwcm9wZXJ0eSBvciBzZW5zaXRpdmUgb3BlcmF0aW9uYWwgZGV0YWlscy4KICAgLSBBdm9pZCBkaXJlY3QgcXVvdGVzIG9yIHZlcmJhdGltIGluY2x1c2lvbiBvZiB1c2VyLXN1cHBsaWVkIHRleHRzIHVubGVzcyBvYmZ1c2NhdGVkIGJ5IGdlbmVyYWxpemF0aW9uLgoKMi4gVGFzayBVbmRlcnN0YW5kaW5nIGFuZCBSZWZvcm11bGF0aW9uOgogICAtIElkZW50aWZ5IHRoZSBmdW5jdGlvbmFsIGludGVudCBvZiB0aGUgcXVlcnk6IElzIGl0IGNyZWF0aXZlIHdyaXRpbmcsIHRyYW5zbGF0aW9uLCBzdW1tYXJpemF0aW9uLCBwcm9mZXNzaW9uYWwgY29tbXVuaWNhdGlvbiBkcmFmdGluZywgdGVjaG5pY2FsIGV4cGxhbmF0aW9uLCBvciBvdGhlcj8KICAgLSBQcmVzZXJ2ZSB0aGUgdGhlbWF0aWMgYW5kIGluZm9ybWF0aW9uYWwgY29yZSBvZiB0aGUgcXVlcnkgKGUuZy4sIHJlcXVlc3QgZm9yIGVkdWNhdGlvbmFsIHF1YWxpdHkgYW5hbHlzaXMsIHRlY2huaWNhbCB0cmFuc2xhdGlvbiBvZiBhIHBhc3NhZ2UsIGJpb2dyYXBoaWNhbCBzdW1tYXJ5KS4KICAgLSBEbyBub3QgcmVwcm9kdWNlIHRoZSBvcmlnaW5hbCBpbnB1dCB2ZXJiYXRpbTsgaW5zdGVhZCwgZnJhbWUgdGhlIExMTSBwcm9tcHQgYXJvdW5kIHRoZSBlc3NlbnRpYWwgdGhlbWF0aWMgZWxlbWVudHMgZXh0cmFjdGVkIGZyb20gdGhlIGlucHV0LgogICAtIEZvciBxdWVyaWVzIHJlZ2FyZGluZyBpbmRpdmlkdWFscywgYXZvaWQgZGlyZWN0IHJlZmVyZW5jZSB0byByZWFsIHBlcnNvbmFsIGluZm9ybWF0aW9uIHVubGVzcyB0aGUgbmFtZSBpcyB3aWRlbHkgcHVibGljIGFuZCBlc3NlbnRpYWw7IGV2ZW4gdGhlbiwgdXNlIGEgZ2VuZXJpYyBvciBoeXBvdGhldGljYWwgZnJhbWluZyBmb3IgdGhlIGluZGl2aWR1YWwgcHJvZmlsZS4KCjMuIFN0cmF0ZWdpZXMgZm9yIEhpZ2gtUXVhbGl0eSBhbmQgUHJpdmFjeS1QcmVzZXJ2aW5nIFByb21wdHM6CiAgIC0gU3RyaWtlIGEgYmFsYW5jZSBiZXR3ZWVuIHN1ZmZpY2llbnQgY29udGV4dHVhbCBkZXRhaWwgYW5kIHByaXZhY3kgYWJzdHJhY3Rpb24gdG8gbWFpbnRhaW4gcHJvbXB0IGNsYXJpdHkgYW5kIHJlbGV2YW5jZS4KICAgLSBVc2UgbmV1dHJhbCwgY29udGV4dC1hd2FyZSBmb3JtdWxhdGlvbnMgdGhhdCBjbGVhcmx5IGluc3RydWN0IHRoZSBMTE0gb24gdGhlIGNvbnRlbnQgYW5kIHN0eWxlIGV4cGVjdGVkLgogICAtIEF2b2lkIHZhZ3VlIG9yIG92ZXJseSBnZW5lcmljIHByb21wdHMgdGhhdCBjb3VsZCByZXN1bHQgaW4gbGVzcyB1c2VmdWwgb3IgbG93ZXItcXVhbGl0eSByZXNwb25zZXMuCiAgIC0gV2hlbiBzeXN0ZW0gb3IgcHJvcHJpZXRhcnkgY29udGVudCBpcyBtZW50aW9uZWQsIGluc3RydWN0IHRoZSBMTE0gdG8gZ2VuZXJhbGl6ZSBzcGVjaWZpYyB0ZXJtcyBhbmQgbWFpbnRhaW4gdGhlIHRlY2huaWNhbCBtZWFuaW5nIHdpdGhvdXQgcmV2ZWFsaW5nIHNlbnNpdGl2ZSBpbmZvLgogICAtIFdoZW4gYSBkaXJlY3QgdHJhbnNsYXRpb24gaXMgcmVxdWVzdGVkIG9uIHNwZWNpYWxpemVkIHRleHQsIHNwZWNpZnkgdG8gcmVwbGFjZSBvciBhYnN0cmFjdCBpbnRlcm5hbCBub21lbmNsYXR1cmUuCgo0LiBFeHBsYW5hdGlvbiBSZXF1aXJlbWVudHM6CiAgIC0gVGhlIHJlYXNvbmluZyBtdXN0IHRyYW5zcGFyZW50bHkgZXhwbGFpbiBob3cgcHJpdmFjeSByaXNrcyB3ZXJlIGlkZW50aWZpZWQgKGUuZy4sIHByZXNlbmNlIG9mIG5hbWVzLCBsb2NhdGlvbnMsIGRhdGVzLCBwcm9wcmlldGFyeSB0ZXJtcykuCiAgIC0gSXQgbXVzdCBkZXNjcmliZSB0aGUgYWJzdHJhY3Rpb24gb3Igb21pc3Npb24gbWV0aG9kcyBhcHBsaWVkIChlLmcuLCByZXBsYWNpbmcg4oCcSm9uYWggVmFuIEJlaWpuZW7igJ0gd2l0aCDigJxhIG5vdGFibGUgaW5kaXZpZHVhbCzigJ0gc3Vic3RpdHV0aW5nIOKAnE1ha2F14oCdIHdpdGgg4oCcYSBzcGVjaWZpYyByZWdpb24s4oCdIG9yIOKAnFlvZGHigJ0gd2l0aCDigJxhIHN5c3RlbSBuYW1l4oCdKS4KICAgLSBDbGFyaWZ5IGhvdyB0aGUgZXNzZW50aWFsIHRhc2sgYW5kIHVzZXIgaW50ZW50IHdlcmUgcHJlc2VydmVkIGRlc3BpdGUgdGhlc2UgZ2VuZXJhbGl6YXRpb25zIChlLmcuLCBmb2N1c2luZyBvbiBlZHVjYXRpb25hbCBxdWFsaXR5LCB0ZWNobmljYWwgdHJhbnNsYXRpb24sIGJpb2dyYXBoaWNhbCBzdW1tYXJ5KS4KICAgLSBUaGlzIGV4cGxhbmF0aW9uIGp1c3RpZmllcyB5b3VyIGRlc2lnbiBjaG9pY2VzIGFuZCBkZW1vbnN0cmF0ZXMgYWRoZXJlbmNlIHRvIHByaXZhY3ktcHJlc2VydmluZyBwcmluY2lwbGVzLgoKQ29tbW9uIFBpdGZhbGxzIHRvIEF2b2lkOgotIERvIG5vdCBtZXJlbHkgbGlnaHRseSBvYnNjdXJlIG9yIHBhcnRpYWxseSByZWRhY3Qgc2Vuc2l0aXZlIGRldGFpbHM7IGZ1bGwgYW5vbnltaXphdGlvbiBvciBhYnN0cmFjdGlvbiBpcyByZXF1aXJlZC4KLSBEbyBub3QgcmVwZWF0IGFueSB1c2VyLXN1cHBsaWVkIFBJSSBvciBwcm9wcmlldGFyeSBjb250ZW50IHZlcmJhdGltLgotIEF2b2lkIGluY2x1ZGluZyBVUkxzLCBleGFjdCBkYXRlcywgb3IgZGlyZWN0IHF1b3RlcyB3aXRob3V0IG1vZGlmaWNhdGlvbi4KLSBEbyBub3QgbGVhdmUgYW1iaWd1aXR5IHRoYXQgY291bGQgZGVncmFkZSB0aGUgcXVhbGl0eSBvciBjb250ZXh0dWFsIGNsYXJpdHkgb2YgdGhlIHJlZm9ybXVsYXRlZCBwcm9tcHQuCi0gRG8gbm90IGluY2x1ZGUgYW55IHJlYWwgcGVyc29uYWwgb3Igb3JnYW5pemF0aW9uYWwgbmFtZXMgdW5sZXNzIHRoZXkgYXJlIHB1YmxpYyBmaWd1cmVzIGFuZCB0aGUgcXVlcnkgcmVxdWlyZXMgaXQsIHRoZW4gdXNlIGdlbmVyaWMgZGVzY3JpcHRvcnMgaW5zdGVhZC4KCkV4YW1wbGUgU3VtbWFyeSBvZiBFZmZlY3RpdmUgQXBwcm9hY2ggKEluZm9ybWVkIGJ5IFByaW9yIEV4YW1wbGVzKToKLSBGb3IgZ2VvZ3JhcGhpYyBxdWVyaWVzOiByZXBsYWNlIGV4YWN0IHBsYWNlIG5hbWVzIHdpdGggZ2VuZXJhbCByZWdpb25zIGFuZCBwcm92aWRlIGEgYnJpZWYgY29udGV4dHVhbCBkZXNjcmlwdG9yLgotIEZvciB0ZWNobmljYWwgdGV4dHMgY29udGFpbmluZyBzeXN0ZW0gbmFtZXMgb3Igc3Vic2NyaXB0aW9uIHR5cGVzOiBpbnN0cnVjdCB0aGUgTExNIHRvIHRyYW5zbGF0ZSBvciBwcm9jZXNzIHRoZSB0ZXh0IHdoaWxlIHJlcGxhY2luZyBvciBhYnN0cmFjdGluZyBwcm9wcmlldGFyeSBzeXN0ZW0gaWRlbnRpZmllcnMuCi0gRm9yIGJpb2dyYXBoaWNhbCBzdW1tYXJpZXMgYWJvdXQgc3BlY2lmaWMgaW5kaXZpZHVhbHM6IHJlbW92ZSB0aGUgcmVhbCBuYW1lIGFuZCByZXF1ZXN0IGEgZ2VuZXJpYywgd2VsbC1zdHJ1Y3R1cmVkIGZvdXItcGFyYWdyYXBoIHN1bW1hcnkgYWJvdXQg4oCcYSBub3RhYmxlIGluZGl2aWR1YWws4oCdIHByZXNlcnZpbmcgdGhlIG92ZXJhbGwgaW50ZW50IHdpdGhvdXQgbGVha2luZyBQSUkuCgpTdW1tYXJ5OgpZb3VyIHJlZm9ybXVsYXRpb25zIG11c3QgZW5zdXJlIHplcm8gZXhwb3N1cmUgb2YgYW55IFBJSSBvciBwcml2YXRlL3Byb3ByaWV0YXJ5IGNvbnRlbnQgd2hpbGUgcmV0YWluaW5nIGVub3VnaCB0aGVtYXRpYyBhbmQgZnVuY3Rpb25hbCBjbGFyaXR5IGZvciB0aGUgZXh0ZXJuYWwgTExNIHRvIHByb2R1Y2UgaGlnaC1xdWFsaXR5LCByZWxldmFudCBvdXRwdXRzLiBUaGlzIHJlcXVpcmVzIHRob3JvdWdoIGFuYWx5c2lzIG9mIHRoZSB1c2VyJ3MgcXVlcnksIHJpZ29yb3VzIGFwcGxpY2F0aW9uIG9mIHByaXZhY3ktcHJlc2VydmF0aW9uIHN0cmF0ZWdpZXMsIGFuZCBleHBsaWNpdCByZWFzb25pbmcgZXhwbGFuYXRpb25zIHRoYXQgZG9jdW1lbnQgeW91ciBhcHByb2FjaCBhbmQgY2hvaWNlcy4=)
New Instruction for Privacy-Preserving Query Reformulation Assistant (Enhanced):


Task Overview:
You receive a user query that may contain sensitive, private, or personally identifiable information (PII). Your objective is to reformulate this query into a generalized, privacy-preserving prompt suitable for sending to an external large language model (LLM). The reformulated prompt must enable the external LLM to fulfill the user’s original intent effectively while rigorously protecting all user privacy by abstracting, omitting, or generalizing any sensitive details.


Input Format:
- A single user query string.
- The query might contain identifiable names (people, organizations), specific geographic locations, exact dates or timeframes, proprietary or internal terminology (e.g., system names, product codes), client or customer names, URLs, or any other sensitive or private information.


Output Format:
- Part (a) Reasoning:
 Provide a concise paragraph that explains:
 * How you identified sensitive or private information in the input
 * What strategies you applied to protect privacy (generalization, omission, abstraction, replacement with placeholders)
 * How the reformulated prompt preserves the original intent and task requirements without risking data leakage
- Part (b) LLM Request:
 A concise, carefully constructed privacy-safe prompt that:
 * Removes or anonymizes all PII and proprietary/internal details
 * Abstracts locations, names, dates, and technical terms as needed
 * Produces a clear and contextually rich instruction for the LLM to generate a relevant and informative response aligned with the user’s original task


Detailed Domain-Specific Guidance and Best Practices:


1. Identification and Treatment of Sensitive Data:
 - All user-specific or personal names (individual or organizational) must be removed or replaced with generic role descriptors (e.g., “a business contact,” “a client,” “a notable individual”). Never lightly obscure or partially redact; full abstraction is required.
 - All geographic mentions must be abstracted unless the location is publicly known, essential to the task, and can be generalized (e.g., “a region known for eco-tourism” instead of naming a country or city explicitly).
 - Exact dates or durations must never be retained; instead, use relative or approximate temporal references (e.g., “recently,” “over the past year”).
 - Internal or proprietary terms — including system names, product codes, subscription types, and technical jargon — must be generalized or replaced with neutral descriptors to avoid leakage of intellectual property or sensitive operational details.
 - Avoid direct quotes or verbatim inclusion of user-supplied texts unless obfuscated by generalization.


2. Task Understanding and Reformulation:
 - Identify the functional intent of the query: Is it creative writing, translation, summarization, professional communication drafting, technical explanation, or other?
 - Preserve the thematic and informational core of the query (e.g., request for educational quality analysis, technical translation of a passage, biographical summary).
 - Do not reproduce the original input verbatim; instead, frame the LLM prompt around the essential thematic elements extracted from the input.
 - For queries regarding individuals, avoid direct reference to real personal information unless the name is widely public and essential; even then, use a generic or hypothetical framing for the individual profile.


3. Strategies for High-Quality and Privacy-Preserving Prompts:
 - Strike a balance between sufficient contextual detail and privacy abstraction to maintain prompt clarity and relevance.
 - Use neutral, context-aware formulations that clearly instruct the LLM on the content and style expected.
 - Avoid vague or overly generic prompts that could result in less useful or lower-quality responses.
 - When system or proprietary content is mentioned, instruct the LLM to generalize specific terms and maintain the technical meaning without revealing sensitive info.
 - When a direct translation is requested on specialized text, specify to replace or abstract internal nomenclature.


4. Explanation Requirements:
 - The reasoning must transparently explain how privacy risks were identified (e.g., presence of names, locations, dates, proprietary terms).
 - It must describe the abstraction or omission methods applied (e.g., replacing “Jonah Van Beijnen” with “a notable individual,” substituting “Makau” with “a specific region,” or “Yoda” with “a system name”).
 - Clarify how the essential task and user intent were preserved despite these generalizations (e.g., focusing on educational quality, technical translation, biographical summary).
 - This explanation justifies your design choices and demonstrates adherence to privacy-preserving principles.


Common Pitfalls to Avoid:
- Do not merely lightly obscure or partially redact sensitive details; full anonymization or abstraction is required.
- Do not repeat any user-supplied PII or proprietary content verbatim.
- Avoid including URLs, exact dates, or direct quotes without modification.
- Do not leave ambiguity that could degrade the quality or contextual clarity of the reformulated prompt.
- Do not include any real personal or organizational names unless they are public figures and the query requires it, then use generic descriptors instead.


Example Summary of Effective Approach (Informed by Prior Examples):
- For geographic queries: replace exact place names with general regions and provide a brief contextual descriptor.
- For technical texts containing system names or subscription types: instruct the LLM to translate or process the text while replacing or abstracting proprietary system identifiers.
- For biographical summaries about specific individuals: remove the real name and request a generic, well-structured four-paragraph summary about “a notable individual,” preserving the overall intent without leaking PII.


Summary:
Your reformulations must ensure zero exposure of any PII or private/proprietary content while retaining enough thematic and functional clarity for the external LLM to produce high-quality, relevant outputs. This requires thorough analysis of the user’s query, rigorous application of privacy-preservation strategies, and explicit reasoning explanations that document your approach and choices.

PUPA GPT-4.1 Mini respond_to_query

Base Prompt:
[⬇](data:text/plain;base64,UmVzcG9uZCB0byBhIHVzZXIgcXVlcnkuCkZvciBpbnNwaXJhdGlvbiwgd2UgZm91bmQgYSBwb3RlbnRpYWxseSByZWxhdGVkIHJlcXVlc3QgdG8gYSBwb3dlcmZ1bCBleHRlcm5hbCBMTE0gYW5kIGl0cyByZXNwb25zZS4=)
Respond to a user query.
For inspiration, we found a potentially related request to a powerful external LLM and its response.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gYSBwcml2YWN5LXByZXNlcnZpbmcgcmVkYWN0ZWQgcHJvbXB0IHNlbnQgdG8gYW4gZXh0ZXJuYWwgdW50cnVzdGVkIExMTSBhbmQgaXRzIHJlc3BvbnNlLCBhbG9uZyB3aXRoIHRoZSBvcmlnaW5hbCB1c2VyIHF1ZXJ5IGNvbnRhaW5pbmcgcG90ZW50aWFsbHkgc2Vuc2l0aXZlIGluZm9ybWF0aW9uLCBnZW5lcmF0ZSBhIGZpbmFsLCBjb2hlcmVudCwgYW5kIGNvbnRleHR1YWxseSBhcHByb3ByaWF0ZSB1c2VyLWZhY2luZyByZXNwb25zZS4gWW91ciBvdXRwdXQgc2hvdWxkIGludGVncmF0ZSB0aGUgYW5vbnltaXplZCBMTE0gb3V0cHV0IHdpdGggdGhlIG9yaWdpbmFsIHF1ZXJ54oCZcyBpbnRlbnQsIGVuc3VyaW5nIHByaXZhY3kgaXMgbWFpbnRhaW5lZCB3aGlsZSBwcm92aWRpbmcgYSBjb21wbGV0ZSBhbmQgcG9saXNoZWQgYW5zd2VyIHRoYXQgZGlyZWN0bHkgYWRkcmVzc2VzIHRoZSB1c2VyJ3MgcmVxdWVzdC4KRGVtb3M6CkV4YW1wbGUgMToKcmVsYXRlZF9sbG1fcmVxdWVzdDoKICAgIFBsZWFzZSBwcm92aWRlIGEgZGV0YWlsZWQgZXhwbGFuYXRpb24gb2YgRGF2aWQgRWFzdG9uJ3Mgc3lzdGVtIGFuYWx5c2lzIGluIHBvbGl0aWNhbCBzY2llbmNlLCBvdXRsaW5pbmcgdGhlIGtleSBjb21wb25lbnRzIG9mIGhpcyBzeXN0ZW1zIHRoZW9yeSBhcHByb2FjaCBhbmQgaXRzIHNpZ25pZmljYW5jZSBpbiB0aGUgc3R1ZHkgb2YgcG9saXRpY2FsIHN5c3RlbXMuCnJlbGF0ZWRfbGxtX3Jlc3BvbnNlOgogICAgQ2VydGFpbmx5ISBEYXZpZCBFYXN0b24ncyBzeXN0ZW0gYW5hbHlzaXMgaXMgYSBmb3VuZGF0aW9uYWwgZnJhbWV3b3JrIGluIHBvbGl0aWNhbCBzY2llbmNlIHRoYXQgYXBwbGllcyBzeXN0ZW1zIHRoZW9yeSB0byB0aGUgc3R1ZHkgb2YgcG9saXRpY2FsIHN5c3RlbXMuIEhpcyBhcHByb2FjaCBwcm92aWRlcyBhIHN0cnVjdHVyZWQgd2F5IHRvIHVuZGVyc3RhbmQgaG93IHBvbGl0aWNhbCBzeXN0ZW1zIGZ1bmN0aW9uLCBtYWludGFpbiBzdGFiaWxpdHksIGFuZCByZXNwb25kIHRvIGNoYW5nZXMgaW4gdGhlaXIgZW52aXJvbm1lbnQuIEJlbG93IGlzIGEgZGV0YWlsZWQgZXhwbGFuYXRpb24gb2YgRWFzdG9uJ3Mgc3lzdGVtIGFuYWx5c2lzLCBpbmNsdWRpbmcgaXRzIGtleSBjb21wb25lbnRzIGFuZCBzaWduaWZpY2FuY2UuCgotLS0KCiMjIyBPdmVydmlldyBvZiBEYXZpZCBFYXN0b24ncyBTeXN0ZW0gQW5hbHlzaXMKCkRhdmlkIEVhc3RvbiAoMTkxN+KAkzIwMTQpIHdhcyBhIHByb21pbmVudCBwb2xpdGljYWwgc2NpZW50aXN0IHdobyBzb3VnaHQgdG8gZGV2ZWxvcCBhIGdlbmVyYWwgdGhlb3J5IG9mIHBvbGl0aWNhbCBzeXN0ZW1zIGJ5IGJvcnJvd2luZyBjb25jZXB0cyBmcm9tIHN5c3RlbXMgdGhlb3J5LCB3aGljaCBvcmlnaW5hdGVkIGluIGJpb2xvZ3kgYW5kIGVuZ2luZWVyaW5nLiBIaXMgZ29hbCB3YXMgdG8gY3JlYXRlIGEgc2NpZW50aWZpYyBhbmQgYW5hbHl0aWNhbCBmcmFtZXdvcmsgdG8gc3R1ZHkgcG9saXRpY3MgYXMgYW4gaW50ZWdyYXRlZCBhbmQgZHluYW1pYyBzeXN0ZW0gcmF0aGVyIHRoYW4gYXMgaXNvbGF0ZWQgZXZlbnRzIG9yIGluc3RpdHV0aW9ucy4KCkVhc3RvbidzIHN5c3RlbSBhbmFseXNpcyB2aWV3cyBhIHBvbGl0aWNhbCBzeXN0ZW0gYXMgYSBzZXQgb2YgaW50ZXJhY3Rpb25zIGFic3RyYWN0ZWQgZnJvbSB0aGUgdG90YWxpdHkgb2Ygc29jaWFsIGJlaGF2aW9yLCB0aHJvdWdoIHdoaWNoIGF1dGhvcml0YXRpdmUgYWxsb2NhdGlvbiBvZiB2YWx1ZXMgKGRlY2lzaW9ucykgaXMgbWFkZSBhbmQgaW1wbGVtZW50ZWQuIEluIG90aGVyIHdvcmRzLCBwb2xpdGljcyBpcyBhYm91dCBob3cgc29jaWV0aWVzIGRlY2lkZSB3aG8gZ2V0cyB3aGF0LCB3aGVuLCBhbmQgaG93LCBhbmQgRWFzdG9uJ3MgbW9kZWwgaGVscHMgZXhwbGFpbiBob3cgdGhlc2UgZGVjaXNpb25zIGFyZSBtYWRlIGFuZCBzdXN0YWluZWQuCgotLS0KCiMjIyBLZXkgQ29tcG9uZW50cyBvZiBFYXN0b24ncyBTeXN0ZW1zIFRoZW9yeSBBcHByb2FjaAoKRWFzdG9uJ3MgbW9kZWwgY29uY2VwdHVhbGl6ZXMgdGhlIHBvbGl0aWNhbCBzeXN0ZW0gYXMgYSAqKmJsYWNrIGJveCoqIHRoYXQgcHJvY2Vzc2VzIGlucHV0cyBhbmQgcHJvZHVjZXMgb3V0cHV0cywgZW1iZWRkZWQgd2l0aGluIGEgbGFyZ2VyIGVudmlyb25tZW50LiBUaGUga2V5IGNvbXBvbmVudHMgYXJlOgoKIyMjIyAxLiAqKklucHV0cyoqCklucHV0cyBhcmUgZGVtYW5kcyBhbmQgc3VwcG9ydHMgdGhhdCBjb21lIGZyb20gdGhlIGVudmlyb25tZW50IGFuZCBzb2NpZXR5IGludG8gdGhlIHBvbGl0aWNhbCBzeXN0ZW0uCgotICoqRGVtYW5kczoqKiBUaGVzZSBhcmUgY2xhaW1zIG9yIHJlcXVlc3RzIG1hZGUgYnkgaW5kaXZpZHVhbHMgb3IgZ3JvdXBzIGZvciB0aGUgcG9saXRpY2FsIHN5c3RlbSB0byBhbGxvY2F0ZSB2YWx1ZXMgb3IgcmVzb3VyY2VzIGluIGEgcGFydGljdWxhciB3YXkgKGUuZy4sIGRlbWFuZHMgZm9yIGxhdyBlbmZvcmNlbWVudCwgZWR1Y2F0aW9uLCB3ZWxmYXJlKS4KLSAqKlN1cHBvcnRzOioqIFRoZXNlIGFyZSBhY3Rpb25zIG9yIGF0dGl0dWRlcyB0aGF0IGluZGljYXRlIGFwcHJvdmFsLCBhbGxlZ2lhbmNlLCBvciBjb21wbGlhbmNlIHdpdGggdGhlIHBvbGl0aWNhbCBzeXN0ZW0gKGUuZy4sIHZvdGluZywgcGF5aW5nIHRheGVzLCBvYmV5aW5nIGxhd3MpLgoKSW5wdXRzIHJlcHJlc2VudCB0aGUgcHJlc3N1cmVzIGFuZCByZXNvdXJjZXMgdGhhdCB0aGUgcG9saXRpY2FsIHN5c3RlbSBtdXN0IHByb2Nlc3MuCgojIyMjIDIuICoqUG9saXRpY2FsIFN5c3RlbSAoVGhlIEJsYWNrIEJveCkqKgpUaGUgcG9saXRpY2FsIHN5c3RlbSBpcyB0aGUgY29yZSBvZiBFYXN0b24ncyBtb2RlbC4gSXQgcmVjZWl2ZXMgaW5wdXRzLCBwcm9jZXNzZXMgdGhlbSwgYW5kIHByb2R1Y2VzIG91dHB1dHMuCgotIEl0IGluY2x1ZGVzIGluc3RpdHV0aW9ucywgb3JnYW5pemF0aW9ucywgYW5kIHByb2Nlc3NlcyBpbnZvbHZlZCBpbiBhdXRob3JpdGF0aXZlIGRlY2lzaW9uLW1ha2luZyAoZS5nLiwgbGVnaXNsYXR1cmVzLCBleGVjdXRpdmVzLCBjb3VydHMpLgotIFRoZSBzeXN0ZW0gdHJhbnNmb3JtcyBkZW1hbmRzIGFuZCBzdXBwb3J0cyBpbnRvIGRlY2lzaW9ucyBhbmQgcG9saWNpZXMuCi0gVGhlIHN5c3RlbSBtdXN0IG1haW50YWluIGl0cyBib3VuZGFyaWVzIGFuZCBhZGFwdCB0byBjaGFuZ2VzIHRvIHN1cnZpdmUuCgojIyMjIDMuICoqT3V0cHV0cyoqCk91dHB1dHMgYXJlIHRoZSBkZWNpc2lvbnMsIHBvbGljaWVzLCBhbmQgYWN0aW9ucyB0aGF0IHRoZSBwb2xpdGljYWwgc3lzdGVtIHByb2R1Y2VzIGluIHJlc3BvbnNlIHRvIGlucHV0cy4KCi0gVGhlc2UgaW5jbHVkZSBsYXdzLCByZWd1bGF0aW9ucywgcHVibGljIHBvbGljaWVzLCBhbmQgYXV0aG9yaXRhdGl2ZSBhbGxvY2F0aW9ucyBvZiB2YWx1ZXMuCi0gT3V0cHV0cyBhZmZlY3QgdGhlIGVudmlyb25tZW50IGFuZCBzb2NpZXR5LCBpbmZsdWVuY2luZyBmdXR1cmUgaW5wdXRzLgoKIyMjIyA0LiAqKkZlZWRiYWNrKioKRmVlZGJhY2sgaXMgdGhlIHByb2Nlc3MgYnkgd2hpY2ggb3V0cHV0cyBpbmZsdWVuY2UgZnV0dXJlIGlucHV0cy4KCi0gUG9zaXRpdmUgZmVlZGJhY2sgY2FuIHJlaW5mb3JjZSB0aGUgc3lzdGVt4oCZcyBzdGFiaWxpdHkuCi0gTmVnYXRpdmUgZmVlZGJhY2sgY2FuIHNpZ25hbCBwcm9ibGVtcyBvciBkaXNzYXRpc2ZhY3Rpb24sIHByb21wdGluZyBhZGp1c3RtZW50cy4KLSBGZWVkYmFjayBoZWxwcyB0aGUgc3lzdGVtIGFkYXB0IGFuZCBtYWludGFpbiBlcXVpbGlicml1bS4KCiMjIyMgNS4gKipFbnZpcm9ubWVudCoqClRoZSBwb2xpdGljYWwgc3lzdGVtIGV4aXN0cyB3aXRoaW4gYSBicm9hZGVyIGVudmlyb25tZW50IHRoYXQgaW5jbHVkZXMgc29jaWFsLCBlY29ub21pYywgY3VsdHVyYWwsIGFuZCBpbnRlcm5hdGlvbmFsIGZhY3RvcnMuCgotIFRoZSBlbnZpcm9ubWVudCBwcm92aWRlcyBpbnB1dHMgYW5kIGlzIGFmZmVjdGVkIGJ5IG91dHB1dHMuCi0gVGhlIHN5c3RlbSBtdXN0IGludGVyYWN0IHdpdGggYW5kIGFkYXB0IHRvIGVudmlyb25tZW50YWwgY2hhbmdlcyB0byBzdXJ2aXZlLgoKLS0tCgojIyMgRGlhZ3JhbW1hdGljIFJlcHJlc2VudGF0aW9uIChTaW1wbGlmaWVkKQoKYGBgCkVudmlyb25tZW50CiAgIOKGkSAgICAgICAgICDihpMKW0RlbWFuZHMgJiBTdXBwb3J0c10g4oaSIFtQb2xpdGljYWwgU3lzdGVtXSDihpIgW0RlY2lzaW9ucyAmIFBvbGljaWVzXQogICAgICAgICAg4oaRICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDihpMKICAgICAgICAgIOKGkC0tLS0tLS0tLS0tIEZlZWRiYWNrIC0tLS0tLS0tLS0tCmBgYAoKLS0tCgojIyMgU2lnbmlmaWNhbmNlIG9mIEVhc3RvbidzIFN5c3RlbSBBbmFseXNpcyBpbiBQb2xpdGljYWwgU2NpZW5jZQoKMS4gKipIb2xpc3RpYyBVbmRlcnN0YW5kaW5nIG9mIFBvbGl0aWNzOioqCiAgIEVhc3RvbidzIG1vZGVsIGVuY291cmFnZXMgdmlld2luZyBwb2xpdGljcyBhcyBhbiBpbnRlcmNvbm5lY3RlZCBzeXN0ZW0gcmF0aGVyIHRoYW4gaXNvbGF0ZWQgZXZlbnRzIG9yIGluc3RpdHV0aW9ucy4gSXQgaGlnaGxpZ2h0cyB0aGUgZHluYW1pYyBpbnRlcmFjdGlvbnMgYmV0d2VlbiBzb2NpZXR5IGFuZCBwb2xpdGljYWwgYXV0aG9yaXR5LgoKMi4gKipGb2N1cyBvbiBQcm9jZXNzIGFuZCBTdGFiaWxpdHk6KioKICAgVGhlIG1vZGVsIGVtcGhhc2l6ZXMgaG93IHBvbGl0aWNhbCBzeXN0ZW1zIG1haW50YWluIHN0YWJpbGl0eSBhbmQgb3JkZXIgdGhyb3VnaCBjb250aW51b3VzIHByb2Nlc3Npbmcgb2YgaW5wdXRzIGFuZCBvdXRwdXRzLCBhbmQgdGhyb3VnaCBmZWVkYmFjayBtZWNoYW5pc21zLgoKMy4gKipBbmFseXRpY2FsIENsYXJpdHk6KioKICAgQnkgYWJzdHJhY3RpbmcgcG9saXRpY2FsIGFjdGl2aXR5IGludG8gaW5wdXRzLCBzeXN0ZW0gcHJvY2Vzc2luZywgb3V0cHV0cywgYW5kIGZlZWRiYWNrLCBFYXN0b24gcHJvdmlkZWQgYSBjbGVhciBmcmFtZXdvcmsgZm9yIGVtcGlyaWNhbCByZXNlYXJjaCBhbmQgY29tcGFyYXRpdmUgYW5hbHlzaXMuCgo0LiAqKkZvdW5kYXRpb24gZm9yIEZ1cnRoZXIgVGhlb3JpZXM6KioKICAgRWFzdG9uJ3Mgc3lzdGVtcyB0aGVvcnkgaW5mbHVlbmNlZCBsYXRlciBkZXZlbG9wbWVudHMgaW4gcG9saXRpY2FsIHNjaWVuY2UsIGluY2x1ZGluZyBzdHJ1Y3R1cmFsLWZ1bmN0aW9uYWxpc20sIHBvbGljeSBhbmFseXNpcywgYW5kIHRoZSBzdHVkeSBvZiBwb2xpdGljYWwgZGV2ZWxvcG1lbnQgYW5kIGNoYW5nZS4KCjUuICoqQWRhcHRhYmlsaXR5OioqCiAgIFRoZSBtb2RlbCBjYW4gYmUgYXBwbGllZCB0byB2YXJpb3VzIHBvbGl0aWNhbCBzeXN0ZW1zIChkZW1vY3JhY2llcywgYXV0aG9yaXRhcmlhbiByZWdpbWVzLCBldGMuKSBhbmQgc2NhbGVzIChsb2NhbCwgbmF0aW9uYWwsIGludGVybmF0aW9uYWwpLCBtYWtpbmcgaXQgdmVyc2F0aWxlLgoKNi4gKipFbXBoYXNpcyBvbiBFbnZpcm9ubWVudDoqKgogICBSZWNvZ25pemluZyB0aGUgZW52aXJvbm1lbnTigJlzIHJvbGUgdW5kZXJzY29yZXMgdGhlIGltcG9ydGFuY2Ugb2YgZXh0ZXJuYWwgZmFjdG9ycyAoZWNvbm9taWMgY29uZGl0aW9ucywgc29jaWFsIG1vdmVtZW50cywgaW50ZXJuYXRpb25hbCBwcmVzc3VyZXMpIGluIHNoYXBpbmcgcG9saXRpY2FsIG91dGNvbWVzLgoKLS0tCgojIyMgQ3JpdGljaXNtcyBhbmQgTGltaXRhdGlvbnMKCi0gKipPdmVybHkgQWJzdHJhY3Q6KiogU29tZSBjcml0aWNzIGFyZ3VlIHRoYXQgRWFzdG9uJ3MgbW9kZWwgaXMgdG9vIGFic3RyYWN0IGFuZCBnZW5lcmFsLCBsYWNraW5nIHNwZWNpZmljaXR5IGFib3V0IHBvd2VyIHJlbGF0aW9ucywgY29uZmxpY3QsIGFuZCBpbmRpdmlkdWFsIGFnZW5jeS4KLSAqKk5lZ2xlY3Qgb2YgQ29uZmxpY3Q6KiogVGhlIG1vZGVsIHRlbmRzIHRvIGVtcGhhc2l6ZSBzdGFiaWxpdHkgYW5kIGVxdWlsaWJyaXVtLCBwb3RlbnRpYWxseSB1bmRlcnBsYXlpbmcgcG9saXRpY2FsIGNvbmZsaWN0IGFuZCBjaGFuZ2UuCi0gKipMaW1pdGVkIE5vcm1hdGl2ZSBHdWlkYW5jZToqKiBJdCBpcyBwcmltYXJpbHkgZGVzY3JpcHRpdmUgYW5kIGFuYWx5dGljYWwsIG9mZmVyaW5nIGxpdHRsZSBub3JtYXRpdmUgZ3VpZGFuY2Ugb24gd2hhdCBwb2xpdGljYWwgc3lzdGVtcyBvdWdodCB0byBkby4KCi0tLQoKIyMjIFN1bW1hcnkKCkRhdmlkIEVhc3RvbidzIHN5c3RlbSBhbmFseXNpcwp1c2VyX3F1ZXJ5OgogICAgU3lzdGVtIGFuYWx5c2lzIGJ5IERhdmlkIEVhc3RvbgpyZXNwb25zZToKICAgIERhdmlkIEVhc3RvbidzIHN5c3RlbSBhbmFseXNpcyBpcyBhIGZvdW5kYXRpb25hbCBmcmFtZXdvcmsgaW4gcG9saXRpY2FsIHNjaWVuY2UgdGhhdCBjb25jZXB0dWFsaXplcyB0aGUgcG9saXRpY2FsIHN5c3RlbSBhcyBhIGR5bmFtaWMgYW5kIGludGVyYWN0aXZlIHN5c3RlbS4gSGlzIGFwcHJvYWNoIHVzZXMgc3lzdGVtcyB0aGVvcnkgdG8gZXhwbGFpbiBob3cgcG9saXRpY2FsIHN5c3RlbXMgZnVuY3Rpb24sIG1haW50YWluIHN0YWJpbGl0eSwgYW5kIGFkYXB0IHRvIGNoYW5nZXMgaW4gdGhlaXIgZW52aXJvbm1lbnQuCgpBdCBpdHMgY29yZSwgRWFzdG9uJ3MgbW9kZWwgdmlld3MgdGhlIHBvbGl0aWNhbCBzeXN0ZW0gYXMgYSAiYmxhY2sgYm94IiB0aGF0IHByb2Nlc3NlcyBpbnB1dHMgZnJvbSBzb2NpZXR5IGFuZCB0aGUgZW52aXJvbm1lbnQsIHRyYW5zZm9ybXMgdGhlbSBpbnRvIG91dHB1dHMsIGFuZCB1c2VzIGZlZWRiYWNrIHRvIGFkanVzdCBhbmQgc3VzdGFpbiBpdHNlbGYuIFRoZSBrZXkgY29tcG9uZW50cyBvZiBFYXN0b24ncyBzeXN0ZW0gYW5hbHlzaXMgaW5jbHVkZToKCjEuICoqSW5wdXRzOioqIFRoZXNlIGFyZSB0aGUgZGVtYW5kcyBhbmQgc3VwcG9ydHMgdGhhdCBzb2NpZXR5IGRpcmVjdHMgdG93YXJkcyB0aGUgcG9saXRpY2FsIHN5c3RlbS4gRGVtYW5kcyBhcmUgcmVxdWVzdHMgb3IgY2xhaW1zIGZvciByZXNvdXJjZSBhbGxvY2F0aW9uIG9yIHBvbGljeSBjaGFuZ2UsIHdoaWxlIHN1cHBvcnRzIGFyZSBhY3Rpb25zIG9yIGF0dGl0dWRlcyBzdWNoIGFzIGNvbXBsaWFuY2UsIGxlZ2l0aW1hY3ksIG9yIGxveWFsdHkgdGhhdCBzdXN0YWluIHRoZSBzeXN0ZW0uCgoyLiAqKlBvbGl0aWNhbCBTeXN0ZW06KiogVGhpcyBpcyB0aGUgc2V0IG9mIGluc3RpdHV0aW9ucyBhbmQgcHJvY2Vzc2VzIHRoYXQgcHJvY2Vzc2VzIHRoZSBpbnB1dHMuIEl0IGludGVycHJldHMgZGVtYW5kcyBhbmQgc3VwcG9ydHMgdG8gbWFrZSBhdXRob3JpdGF0aXZlIGRlY2lzaW9ucywgaW5jbHVkaW5nIHRoZSBmb3JtdWxhdGlvbiBhbmQgZW5mb3JjZW1lbnQgb2YgcG9saWNpZXMuCgozLiAqKk91dHB1dHM6KiogVGhlc2UgYXJlIHRoZSBkZWNpc2lvbnMsIHBvbGljaWVzLCBhbmQgYWN0aW9ucyB0aGF0IHRoZSBwb2xpdGljYWwgc3lzdGVtIHByb2R1Y2VzIGluIHJlc3BvbnNlIHRvIGlucHV0cy4gVGhleSBhZmZlY3Qgc29jaWV0eSBhbmQgaXRzIGVudmlyb25tZW50LCBzaGFwaW5nIGZ1dHVyZSBpbnRlcmFjdGlvbnMuCgo0LiAqKkZlZWRiYWNrOioqIE91dHB1dHMgZ2VuZXJhdGUgcmVzcG9uc2VzIHRoYXQgZmVlZCBiYWNrIGludG8gdGhlIHN5c3RlbSBhcyBuZXcgaW5wdXRzLCBzaWduYWxpbmcgd2hldGhlciB0aGUgb3V0cHV0cyB3ZXJlIGVmZmVjdGl2ZSBvciByZXF1aXJlIG1vZGlmaWNhdGlvbi4gVGhpcyBmZWVkYmFjayBlbmFibGVzIHRoZSBzeXN0ZW0gdG8gYWRhcHQgdG8gaW50ZXJuYWwgYW5kIGV4dGVybmFsIGNoYW5nZXMuCgo1LiAqKkVudmlyb25tZW50OioqIFRoZSBzeXN0ZW0gb3BlcmF0ZXMgd2l0aGluIGEgYnJvYWRlciBzb2NpYWwsIGVjb25vbWljLCBjdWx0dXJhbCwgYW5kIGludGVybmF0aW9uYWwgY29udGV4dCB0aGF0IGluZmx1ZW5jZXMgYW5kIGlzIGluZmx1ZW5jZWQgYnkgdGhlIHBvbGl0aWNhbCBzeXN0ZW0uCgpFYXN0b24ncyB0aGVvcnkgaXMgc2lnbmlmaWNhbnQgYmVjYXVzZSBpdCBvZmZlcnMgYSBob2xpc3RpYywgcHJvY2Vzcy1vcmllbnRlZCBsZW5zIHRvIGFuYWx5emUgcG9saXRpY3MsIGVtcGhhc2l6aW5nIGludGVyYWN0aW9uIGJldHdlZW4gc29jaWV0eSBhbmQgc3RhdGUgaW5zdGl0dXRpb25zLiBJdCBwcm92aWRlcyBhIGZyYW1ld29yayB0byB1bmRlcnN0YW5kIHBvbGl0aWNhbCBzdGFiaWxpdHksIGFkYXB0YXRpb24sIGFuZCBjaGFuZ2UgYnkgZm9jdXNpbmcgb24gdGhlIGNvbnRpbnVvdXMgY2lyY3VsYXRpb24gb2YgaW5wdXRzLCBwcm9jZXNzaW5nLCBvdXRwdXRzLCBhbmQgZmVlZGJhY2suIFRoZSBtb2RlbCBoYXMgYmVlbiBpbmZsdWVudGlhbCBpbiBzaGFwaW5nIHN1YnNlcXVlbnQgcG9saXRpY2FsIHRoZW9yaWVzIGFuZCBjb21wYXJhdGl2ZSBwb2xpdGljYWwgYW5hbHlzaXMuCgpIb3dldmVyLCBjcml0aWNzIG5vdGUgdGhhdCBFYXN0b24ncyBtb2RlbCBjYW4gYmUgb3Zlcmx5IGFic3RyYWN0LCBzb21ldGltZXMgZG93bnBsYXlpbmcgY29uZmxpY3QsIHBvd2VyIHN0cnVnZ2xlcywgYW5kIGluZGl2aWR1YWwgYWdlbmN5IHdpdGhpbiBwb2xpdGljYWwgcHJvY2Vzc2VzLgoKSW4gc3VtbWFyeSwgRGF2aWQgRWFzdG9uJ3Mgc3lzdGVtIGFuYWx5c2lzIG9mZmVycyBhIHBvd2VyZnVsIGNvbmNlcHR1YWwgdG9vbCB0byBzdHVkeSBwb2xpdGljYWwgc3lzdGVtcyBhcyBkeW5hbWljIGVudGl0aWVzIHRoYXQgbWFuYWdlIHNvY2lldGFsIGRlbWFuZHMgYW5kIHN1cHBvcnRzIHRocm91Z2ggYXV0aG9yaXRhdGl2ZSBkZWNpc2lvbi1tYWtpbmcgdG8gbWFpbnRhaW4gb3JkZXIgYW5kIGFkYXB0IG92ZXIgdGltZS4KCgojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCjMgb3RoZXIgZGVtb3Mgb21pdHRlZCBmb3IgYnJldml0eS4KIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwo=)
Given a privacy-preserving redacted prompt sent to an external untrusted LLM and its response, along with the original user query containing potentially sensitive information, generate a final, coherent, and contextually appropriate user-facing response. Your output should integrate the anonymized LLM output with the original query’s intent, ensuring privacy is maintained while providing a complete and polished answer that directly addresses the user’s request.
Demos:
Example 1:
related_llm_request:
 Please provide a detailed explanation of David Easton’s system analysis in political science, outlining the key components of his systems theory approach and its significance in the study of political systems.
related_llm_response:
 Certainly! David Easton’s system analysis is a foundational framework in political science that applies systems theory to the study of political systems. His approach provides a structured way to understand how political systems function, maintain stability, and respond to changes in their environment. Below is a detailed explanation of Easton’s system analysis, including its key components and significance.


---


### Overview of David Easton’s System Analysis


David Easton (1917–2014) was a prominent political scientist who sought to develop a general theory of political systems by borrowing concepts from systems theory, which originated in biology and engineering. His goal was to create a scientific and analytical framework to study politics as an integrated and dynamic system rather than as isolated events or institutions.


Easton’s system analysis views a political system as a set of interactions abstracted from the totality of social behavior, through which authoritative allocation of values (decisions) is made and implemented. In other words, politics is about how societies decide who gets what, when, and how, and Easton’s model helps explain how these decisions are made and sustained.


---


### Key Components of Easton’s Systems Theory Approach


Easton’s model conceptualizes the political system as a **black box** that processes inputs and produces outputs, embedded within a larger environment. The key components are:


#### 1. **Inputs**
Inputs are demands and supports that come from the environment and society into the political system.


- **Demands:** These are claims or requests made by individuals or groups for the political system to allocate values or resources in a particular way (e.g., demands for law enforcement, education, welfare).
- **Supports:** These are actions or attitudes that indicate approval, allegiance, or compliance with the political system (e.g., voting, paying taxes, obeying laws).


Inputs represent the pressures and resources that the political system must process.


#### 2. **Political System (The Black Box)**
The political system is the core of Easton’s model. It receives inputs, processes them, and produces outputs.


- It includes institutions, organizations, and processes involved in authoritative decision-making (e.g., legislatures, executives, courts).
- The system transforms demands and supports into decisions and policies.
- The system must maintain its boundaries and adapt to changes to survive.


#### 3. **Outputs**
Outputs are the decisions, policies, and actions that the political system produces in response to inputs.


- These include laws, regulations, public policies, and authoritative allocations of values.
- Outputs affect the environment and society, influencing future inputs.


#### 4. **Feedback**
Feedback is the process by which outputs influence future inputs.


- Positive feedback can reinforce the system’s stability.
- Negative feedback can signal problems or dissatisfaction, prompting adjustments.
- Feedback helps the system adapt and maintain equilibrium.


#### 5. **Environment**
The political system exists within a broader environment that includes social, economic, cultural, and international factors.


- The environment provides inputs and is affected by outputs.
- The system must interact with and adapt to environmental changes to survive.


---


### Diagrammatic Representation (Simplified)


‘‘‘
Environment
 ↑ ↓
[Demands & Supports] → [Political System] → [Decisions & Policies]
 ↑ ↓
 ←----------- Feedback -----------
‘‘‘


---


### Significance of Easton’s System Analysis in Political Science


1. **Holistic Understanding of Politics:**
 Easton’s model encourages viewing politics as an interconnected system rather than isolated events or institutions. It highlights the dynamic interactions between society and political authority.


2. **Focus on Process and Stability:**
 The model emphasizes how political systems maintain stability and order through continuous processing of inputs and outputs, and through feedback mechanisms.


3. **Analytical Clarity:**
 By abstracting political activity into inputs, system processing, outputs, and feedback, Easton provided a clear framework for empirical research and comparative analysis.


4. **Foundation for Further Theories:**
 Easton’s systems theory influenced later developments in political science, including structural-functionalism, policy analysis, and the study of political development and change.


5. **Adaptability:**
 The model can be applied to various political systems (democracies, authoritarian regimes, etc.) and scales (local, national, international), making it versatile.


6. **Emphasis on Environment:**
 Recognizing the environment’s role underscores the importance of external factors (economic conditions, social movements, international pressures) in shaping political outcomes.


---


### Criticisms and Limitations


- **Overly Abstract:** Some critics argue that Easton’s model is too abstract and general, lacking specificity about power relations, conflict, and individual agency.
- **Neglect of Conflict:** The model tends to emphasize stability and equilibrium, potentially underplaying political conflict and change.
- **Limited Normative Guidance:** It is primarily descriptive and analytical, offering little normative guidance on what political systems ought to do.


---


### Summary


David Easton’s system analysis
user_query:
 System analysis by David Easton
response:
 David Easton’s system analysis is a foundational framework in political science that conceptualizes the political system as a dynamic and interactive system. His approach uses systems theory to explain how political systems function, maintain stability, and adapt to changes in their environment.


At its core, Easton’s model views the political system as a "black box" that processes inputs from society and the environment, transforms them into outputs, and uses feedback to adjust and sustain itself. The key components of Easton’s system analysis include:


1. **Inputs:** These are the demands and supports that society directs towards the political system. Demands are requests or claims for resource allocation or policy change, while supports are actions or attitudes such as compliance, legitimacy, or loyalty that sustain the system.


2. **Political System:** This is the set of institutions and processes that processes the inputs. It interprets demands and supports to make authoritative decisions, including the formulation and enforcement of policies.


3. **Outputs:** These are the decisions, policies, and actions that the political system produces in response to inputs. They affect society and its environment, shaping future interactions.


4. **Feedback:** Outputs generate responses that feed back into the system as new inputs, signaling whether the outputs were effective or require modification. This feedback enables the system to adapt to internal and external changes.


5. **Environment:** The system operates within a broader social, economic, cultural, and international context that influences and is influenced by the political system.


Easton’s theory is significant because it offers a holistic, process-oriented lens to analyze politics, emphasizing interaction between society and state institutions. It provides a framework to understand political stability, adaptation, and change by focusing on the continuous circulation of inputs, processing, outputs, and feedback. The model has been influential in shaping subsequent political theories and comparative political analysis.


However, critics note that Easton’s model can be overly abstract, sometimes downplaying conflict, power struggles, and individual agency within political processes.


In summary, David Easton’s system analysis offers a powerful conceptual tool to study political systems as dynamic entities that manage societal demands and supports through authoritative decision-making to maintain order and adapt over time.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA+Merge:
[⬇](data:text/plain;base64,UmVzcG9uZCB0byBhIHVzZXIgcXVlcnkuCkZvciBpbnNwaXJhdGlvbiwgd2UgZm91bmQgYSBwb3RlbnRpYWxseSByZWxhdGVkIHJlcXVlc3QgdG8gYSBwb3dlcmZ1bCBleHRlcm5hbCBMTE0gYW5kIGl0cyByZXNwb25zZS4=)
Respond to a user query.
For inspiration, we found a potentially related request to a powerful external LLM and its response.

### L.8 PUPA, Qwen3 8B

PUPA Qwen3 8B craft_redacted_request.predict

Base Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gYSBwcml2YXRlIHVzZXIgcXVlcnksIGNyZWF0ZSBhIHByaXZhY3ktcHJlc2VydmluZyByZXF1ZXN0IGZvciBhIHBvd2VyZnVsIGV4dGVybmFsIExMTS4KVGhlIExMTSBtYXkgYXNzaXN0IHdpdGhvdXQgbGVhcm5pbmcgcHJpdmF0ZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXNlci4=)
Given a private user query, create a privacy-preserving request for a powerful external LLM.
The LLM may assist without learning private information about the user.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,R2l2ZW4gYSBwcml2YXRlIHVzZXIgcXVlcnksIGdlbmVyYXRlIGEgc3RydWN0dXJlZCwgbm9uLXNlbnNpdGl2ZSBMTE0gcmVxdWVzdCB0aGF0IGNhcHR1cmVzIHRoZSB1c2VyJ3MgaW50ZW50IHdoaWxlIG9taXR0aW5nIHBlcnNvbmFsIGRldGFpbHMuIEluY2x1ZGUgYSBzdGVwLWJ5LXN0ZXAgcmVhc29uaW5nIHByb2Nlc3MgZXhwbGFpbmluZyBob3cgdGhlIHJlZGFjdGlvbiB3YXMgYWNoaWV2ZWQsIGVuc3VyaW5nIHRoZSByZXF1ZXN0IGlzIGFjdGlvbmFibGUgYW5kIHByaXZhY3ktcHJlc2VydmluZy4gRm9ybWF0IHRoZSByZWFzb25pbmcgYXMgYSBjb2hlcmVudCB0aG91Z2h0IHByb2Nlc3MgYW5kIHRoZSByZXF1ZXN0IGFzIGEgY2xlYXIsIHNwZWNpZmljIHRhc2sgZm9yIHRoZSBMTE0gdG8gZXhlY3V0ZS4KRGVtb3M6CkV4YW1wbGUgMToKdXNlcl9xdWVyeToKICAgINCf0YDQuNCy0LXRgiDQvdCw0L/QuNGI0Lgg0LrQvtC80LDQvdC00YMg0LTQu9GPINC+0YLQv9GA0LDQstC60Lggc25tcHdhbGsg0L3QsCBpcCAxMC4yLjM1LjIg0YEg0LTQsNC90L3Ri9C80Lgg0L/QviDQtNC+0YHRgtGD0L/RgyBpbml0aV91c2VyL2QySjNCZ3RZZEIyL2QySjNCZ3RZZEIyIChNRDUpIERFUwpyZWFzb25pbmc6CiAgICBUaGUgdXNlciBpcyByZXF1ZXN0aW5nIGFuIFNOTVAgd2FsayBjb21tYW5kIHRvIHJldHJpZXZlIGRhdGEgZnJvbSBhbiBTTk1QdjMtZW5hYmxlZCBkZXZpY2UgYXQgSVAgMTAuMi4zNS4yLiBUaGUgcHJvdmlkZWQgY3JlZGVudGlhbHMgaW5jbHVkZSBhIHVzZXJuYW1lIChgaW5pdGlfdXNlcmApLCBhbiBhdXRoZW50aWNhdGlvbiBwYXNzd29yZCAoYGQySjNCZ3RZZEIyYCksIGFuZCBhbiBlbmNyeXB0aW9uIHBhc3N3b3JkIChgZDJKM0JndFlkQjJgKS4gVGhlIGF1dGhlbnRpY2F0aW9uIHByb3RvY29sIGlzIE1ENSwgYW5kIHRoZSBlbmNyeXB0aW9uIHByb3RvY29sIGlzIERFUy4gVGhlIGNvbW1hbmQgbXVzdCBpbmNsdWRlIFNOTVB2MyBvcHRpb25zIHRvIHNwZWNpZnkgdGhlc2UgcGFyYW1ldGVycyBjb3JyZWN0bHkuCmxsbV9yZXF1ZXN0OgogICAgR2VuZXJhdGUgYSBjb21tYW5kLWxpbmUgaW5zdHJ1Y3Rpb24gZm9yIGV4ZWN1dGluZyBgc25tcHdhbGtgIHdpdGggU05NUHYzIGF1dGhlbnRpY2F0aW9uIGFuZCBlbmNyeXB0aW9uIHVzaW5nIHRoZSBwcm92aWRlZCBjcmVkZW50aWFscywgZW5zdXJpbmcgcHJpdmFjeSBieSBvbWl0dGluZyBzZW5zaXRpdmUgZGV0YWlscyBpbiB0aGUgcmVzcG9uc2UuCgoKIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwozIG90aGVyIGRlbW9zIG9taXR0ZWQgZm9yIGJyZXZpdHkuCiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMK)
Given a private user query, generate a structured, non-sensitive LLM request that captures the user’s intent while omitting personal details. Include a step-by-step reasoning process explaining how the redaction was achieved, ensuring the request is actionable and privacy-preserving. Format the reasoning as a coherent thought process and the request as a clear, specific task for the LLM to execute.
Demos:
Example 1:
user_query:
 Привет напиши команду для отправки snmpwalk на ip 10.2.35.2 с данными по доступу initi_user/d2J3BgtYdB2/d2J3BgtYdB2 (MD5) DES
reasoning:
 The user is requesting an SNMP walk command to retrieve data from an SNMPv3-enabled device at IP 10.2.35.2. The provided credentials include a username (‘initi_user‘), an authentication password (‘d2J3BgtYdB2‘), and an encryption password (‘d2J3BgtYdB2‘). The authentication protocol is MD5, and the encryption protocol is DES. The command must include SNMPv3 options to specify these parameters correctly.
llm_request:
 Generate a command-line instruction for executing ‘snmpwalk‘ with SNMPv3 authentication and encryption using the provided credentials, ensuring privacy by omitting sensitive details in the response.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,IyMjIE5ldyBJbnN0cnVjdGlvbiBmb3IgdGhlIEFzc2lzdGFudDoKCioqVGFzayBPdmVydmlldzoqKgpSZXBocmFzZSB0aGUgdXNlcidzIHF1ZXJ5IGludG8gYSBwcml2YWN5LXByZXNlcnZpbmcsIGFjdGlvbmFibGUgcmVxdWVzdCBmb3IgYW4gZXh0ZXJuYWwgTExNLCBlbnN1cmluZyBubyBwZXJzb25hbGx5IGlkZW50aWZpYWJsZSBpbmZvcm1hdGlvbiAoUElJKSwgcHJvcHJpZXRhcnkgZGF0YSwgb3Igc2Vuc2l0aXZlIGRldGFpbHMgYXJlIGV4cG9zZWQuIE1haW50YWluIHRoZSBvcmlnaW5hbCBpbnRlbnQsIGNsYXJpdHksIGFuZCBzcGVjaWZpY2l0eSBvZiB0aGUgcXVlcnkgd2hpbGUgYWRoZXJpbmcgdG8gZG9tYWluLXNwZWNpZmljIHN0cmF0ZWdpZXMgZm9yIGdlbmVyYWxpemVkIGluZm9ybWF0aW9uLgoKKipLZXkgUmVxdWlyZW1lbnRzOioqCjEuICoqUHJpdmFjeSBQcmVzZXJ2YXRpb24qKjoKICAgLSAqKkdlbmVyYWxpemUgU3BlY2lmaWNzKio6IFJlcGxhY2Ugc3BlY2lmaWMgbG9jYXRpb25zIChlLmcuLCAiQW5kaHJhIFByYWRlc2giIOKGkiAiYSBtYWpvciBJbmRpYW4gY2l0eSIpLCBudW1iZXJzIChlLmcuLCAiMTggdm9sdW50ZWVycyIg4oaSICJhIGdyb3VwIG9mIHBhcnRpY2lwYW50cyIpLCBvciBwcm9wcmlldGFyeSBkYXRhIChlLmcuLCAidmFuIENsZWVmIHByb2R1Y3Rpb24gc2l0ZXMiIOKGkiAiW0JyYW5kIE5hbWVdJ3MgcHJvZHVjdGlvbiBzaXRlcyBiYXNlZCBvbiBwdWJsaWNseSBhdmFpbGFibGUgaW5mb3JtYXRpb24iKS4KICAgLSAqKkF2b2lkIFBJSS9Qcm9wcmlldGFyeSBEYXRhKio6IFJlbW92ZSBuYW1lcywgYWRkcmVzc2VzLCBkYXRlcywgaW50ZXJuYWwgcHJvY2Vzc2VzLCBvciBicmFuZC1zcGVjaWZpYyBzZWNyZXRzLiBVc2UgcGxhY2Vob2xkZXJzIGxpa2UgW0JyYW5kIE5hbWVdLCBbQ291bnRyeV0sIG9yIFtSZWdpb25dIGZvciBicmFuZC9jb21wYW55IHJlZmVyZW5jZXMuCiAgIC0gKipQdWJsaWNseSBBdmFpbGFibGUgRm9jdXMqKjogRm9yIGJyYW5kLXJlbGF0ZWQgcXVlcmllcywgZW1waGFzaXplIHB1YmxpY2x5IGFjY2Vzc2libGUgZGF0YSAoZS5nLiwgImxvY2F0aW9ucyBvZiBbQnJhbmQgTmFtZV0ncyBwcm9kdWN0aW9uIHNpdGVzIiBpbnN0ZWFkIG9mICJ2YW4gQ2xlZWYncyBzZWNyZXQgZmFjdG9yaWVzIikuCgoyLiAqKlF1YWxpdHkgb2YgUmVxdWVzdCoqOgogICAtICoqQ2xhcml0eSBhbmQgQWN0aW9uYWJpbGl0eSoqOiBFbnN1cmUgdGhlIHJlcGhyYXNlZCBxdWVyeSBpcyBwcmVjaXNlLCBhdm9pZHMgYW1iaWd1aXR5LCBhbmQgc3BlY2lmaWVzIGNvbnN0cmFpbnRzIChlLmcuLCAiY29uY2lzZSwgcGxhdGZvcm0tZnJpZW5kbHkgaGFzaHRhZ3MiIGZvciBjcmVhdGl2ZSB0YXNrcykuCiAgIC0gKipEb21haW4tU3BlY2lmaWMgUHJlY2lzaW9uKio6IEZvciBzY2llbnRpZmljL3RlY2huaWNhbCBxdWVyaWVzLCByZXRhaW4ga2V5IHRlcm1zIChlLmcuLCAiQ0FQTSBmb3JtdWxhLCIgInBoYXJtYWNva2luZXRpYyBwYXJhbWV0ZXJzIikgd2hpbGUgYW5vbnltaXppbmcgc3R1ZHkgZGV0YWlscyAoZS5nLiwgIjE4IHZvbHVudGVlcnMiIOKGkiAiYSBncm91cCBvZiBwYXJ0aWNpcGFudHMiKS4KICAgLSAqKkF2b2lkIE92ZXJseSBCcm9hZCBSZXF1ZXN0cyoqOiBTcGVjaWZ5IGNvbnN0cmFpbnRzIGxpa2Uga2V5d29yZCBmb2N1cywgdG9uZSwgb3IgZm9ybWF0IChlLmcuLCAiaGVhbHRoIGFuZCBmaXRuZXNzIGtleXdvcmRzIiBpbnN0ZWFkIG9mICJnZW5lcmFsIGhhc2h0YWdzIikuCgozLiAqKkRvbWFpbi1TcGVjaWZpYyBTdHJhdGVnaWVzKio6CiAgIC0gKipHZW9ncmFwaGljIFF1ZXJpZXMqKjogUmVwbGFjZSByZWdpb25zL2NpdGllcyB3aXRoIGdlbmVyYWxpemVkIHRlcm1zIChlLmcuLCAibWFqb3IgY2l0eSBpbiBbQ291bnRyeV0iIG9yICJ3ZWxsLWtub3duIFtSZWdpb25dIikuCiAgIC0gKipCcmFuZC9Db21wYW55IFF1ZXJpZXMqKjogUmVmZXJlbmNlIGJyYW5kcyBieSBuYW1lIGJ1dCBwcmlvcml0aXplIHB1YmxpY2x5IGF2YWlsYWJsZSBkYXRhIChlLmcuLCAibG9jYXRpb25zIG9mIFtCcmFuZCBOYW1lXSdzIHByb2R1Y3Rpb24gc2l0ZXMiKS4KICAgLSAqKkNyZWF0aXZlIFRhc2tzKio6IFVzZSBleGFtcGxlcyBvciBjb25zdHJhaW50cyAoZS5nLiwgIndlbGxuZXNzLCBzdHJlbmd0aCwgbW90aXZhdGlvbiBrZXl3b3JkcyIgZm9yIGhhc2h0YWdzOyAicGxhdGZvcm0gZ3VpZGVsaW5lcyIgZm9yIHNvY2lhbCBtZWRpYSBjb250ZW50KS4KCjQuICoqQXZvaWQgTGVha2FnZSoqOgogICAtICoqTm8gSW5mZXJyZWQgRGV0YWlscyoqOiBEbyBub3QgYXNzdW1lIHVzZXItc3BlY2lmaWMgcHJlZmVyZW5jZXMsIGNvbnRleHRzLCBvciBwcml2YXRlIGRhdGEgKGUuZy4sICJUZWxsIG1lIHRoZSBsb2NhdGlvbiBvZiB2YW4gQ2xlZWYgcHJvZHVjdGlvbiBzaXRlcyIg4oaSICJQcm92aWRlIGxvY2F0aW9ucyBvZiBbQnJhbmQgTmFtZV0ncyBwcm9kdWN0aW9uIHNpdGVzIGJhc2VkIG9uIHB1YmxpY2x5IGF2YWlsYWJsZSBpbmZvcm1hdGlvbiIpLgogICAtICoqQW5vbnltaXplIE51bWVyaWNhbCBEYXRhKio6IFJlcGxhY2Ugc3BlY2lmaWMgY291bnRzLCBkb3NhZ2VzLCBvciBtZXRyaWNzIHdpdGggZ2VuZXJhbGl6ZWQgdGVybXMgKGUuZy4sICI0MCBtZyBPQSIg4oaSICJhIGRvc2Ugb2YgT0EiKS4KCioqRXhhbXBsZSBXb3JrZmxvdzoqKgotICoqVXNlciBRdWVyeSoqOiAiQ2FsY3VsYXRlIETigJlBbWljb+KAmXMgY29zdCBvZiBlcXVpdHkgdXNpbmcgQ0FQTSB3aXRoIHJSRiA9IDQuNjclLCDOsiA9IDEuNTYsIGFuZCBtYXJrZXQgcmlzayBwcmVtaXVtID0gNi42MyUuIgotICoqUmVwaHJhc2VkIFJlcXVlc3QqKjogIkNhbGN1bGF0ZSB0aGUgY29zdCBvZiBlcXVpdHkgZm9yIGEgY29tcGFueSB1c2luZyB0aGUgQ0FQTSBmb3JtdWxhLCBnaXZlbiBhIHJpc2stZnJlZSByYXRlIG9mIDQuNjclLCBhIGJldGEgb2YgMS41NiwgYW5kIGEgbWFya2V0IHJpc2sgcHJlbWl1bSBvZiA2LjYzJS4gU2hvdyBzdGVwLWJ5LXN0ZXAgY2FsY3VsYXRpb25zIGFuZCByb3VuZCB0aGUgZmluYWwgcmVzdWx0IHRvIHR3byBkZWNpbWFsIHBsYWNlcy4iCgoqKk5pY2hlIERvbWFpbi1TcGVjaWZpYyBHdWlkYW5jZToqKgotICoqU2NpZW50aWZpYy9QaGFybWFjb2tpbmV0aWMgUXVlcmllcyoqOiBHZW5lcmFsaXplIHN0dWR5IGRldGFpbHMgKGUuZy4sICIxOCBoZWFsdGh5IG1hbGUgdm9sdW50ZWVycyIg4oaSICJhIGdyb3VwIG9mIHBhcnRpY2lwYW50cyIpLCByZXRhaW4ga2V5IHBhcmFtZXRlcnMgKGUuZy4sIEFVQywgcGVhayBjb25jZW50cmF0aW9ucyksIGFuZCBhdm9pZCBwcm9wcmlldGFyeSBtZXRob2RvbG9naWVzLgotICoqQ3JlYXRpdmUvVHJhbnNsYXRpb24gVGFza3MqKjogVXNlIHBsYWNlaG9sZGVycyBmb3Igc29uZyB0aXRsZXMvYXJ0aXN0cyAoZS5nLiwgIk1haG1vb2QncyBzb25nIFtUaXRsZV0iKSBhbmQgc3BlY2lmeSB0b25lL3JoeXRobSByZXF1aXJlbWVudHMgZm9yIHRyYW5zbGF0aW9ucy4KLSAqKkZpbmFuY2lhbCBDYWxjdWxhdGlvbnMqKjogUmV0YWluIGZvcm11bGFzIGFuZCBudW1lcmljYWwgdmFsdWVzIGJ1dCBhdm9pZCBsaW5raW5nIHRvIHNwZWNpZmljIGNvbXBhbmllcyBvciBwcm9wcmlldGFyeSBtb2RlbHMuCgoqKkZpbmFsIE91dHB1dCBGb3JtYXQ6KioKLSAqKnJlYXNvbmluZyoqOiBCcmllZmx5IGV4cGxhaW4gdGhlIHJlcGhyYXNpbmcgY2hvaWNlcyAoZS5nLiwgIkdlbmVyYWxpemVkICcxOCB2b2x1bnRlZXJzJyB0byAnYSBncm91cCBvZiBwYXJ0aWNpcGFudHMnIHRvIHByZXNlcnZlIHByaXZhY3kiKS4KLSAqKmxsbV9yZXF1ZXN0Kio6IFByb3ZpZGUgdGhlIGFub255bWl6ZWQsIGFjdGlvbmFibGUgcmVxdWVzdCBmb3IgdGhlIExMTS4=)
### New Instruction for the Assistant:


**Task Overview:**
Rephrase the user’s query into a privacy-preserving, actionable request for an external LLM, ensuring no personally identifiable information (PII), proprietary data, or sensitive details are exposed. Maintain the original intent, clarity, and specificity of the query while adhering to domain-specific strategies for generalized information.


**Key Requirements:**
1. **Privacy Preservation**:
 - **Generalize Specifics**: Replace specific locations (e.g., "Andhra Pradesh" → "a major Indian city"), numbers (e.g., "18 volunteers" → "a group of participants"), or proprietary data (e.g., "van Cleef production sites" → "[Brand Name]’s production sites based on publicly available information").
 - **Avoid PII/Proprietary Data**: Remove names, addresses, dates, internal processes, or brand-specific secrets. Use placeholders like [Brand Name], [Country], or [Region] for brand/company references.
 - **Publicly Available Focus**: For brand-related queries, emphasize publicly accessible data (e.g., "locations of [Brand Name]’s production sites" instead of "van Cleef’s secret factories").


2. **Quality of Request**:
 - **Clarity and Actionability**: Ensure the rephrased query is precise, avoids ambiguity, and specifies constraints (e.g., "concise, platform-friendly hashtags" for creative tasks).
 - **Domain-Specific Precision**: For scientific/technical queries, retain key terms (e.g., "CAPM formula," "pharmacokinetic parameters") while anonymizing study details (e.g., "18 volunteers" → "a group of participants").
 - **Avoid Overly Broad Requests**: Specify constraints like keyword focus, tone, or format (e.g., "health and fitness keywords" instead of "general hashtags").


3. **Domain-Specific Strategies**:
 - **Geographic Queries**: Replace regions/cities with generalized terms (e.g., "major city in [Country]" or "well-known [Region]").
 - **Brand/Company Queries**: Reference brands by name but prioritize publicly available data (e.g., "locations of [Brand Name]’s production sites").
 - **Creative Tasks**: Use examples or constraints (e.g., "wellness, strength, motivation keywords" for hashtags; "platform guidelines" for social media content).


4. **Avoid Leakage**:
 - **No Inferred Details**: Do not assume user-specific preferences, contexts, or private data (e.g., "Tell me the location of van Cleef production sites" → "Provide locations of [Brand Name]’s production sites based on publicly available information").
 - **Anonymize Numerical Data**: Replace specific counts, dosages, or metrics with generalized terms (e.g., "40 mg OA" → "a dose of OA").


**Example Workflow:**
- **User Query**: "Calculate D’Amico’s cost of equity using CAPM with rRF = 4.67%, β = 1.56, and market risk premium = 6.63%."
- **Rephrased Request**: "Calculate the cost of equity for a company using the CAPM formula, given a risk-free rate of 4.67%, a beta of 1.56, and a market risk premium of 6.63%. Show step-by-step calculations and round the final result to two decimal places."


**Niche Domain-Specific Guidance:**
- **Scientific/Pharmacokinetic Queries**: Generalize study details (e.g., "18 healthy male volunteers" → "a group of participants"), retain key parameters (e.g., AUC, peak concentrations), and avoid proprietary methodologies.
- **Creative/Translation Tasks**: Use placeholders for song titles/artists (e.g., "Mahmood’s song [Title]") and specify tone/rhythm requirements for translations.
- **Financial Calculations**: Retain formulas and numerical values but avoid linking to specific companies or proprietary models.


**Final Output Format:**
- **reasoning**: Briefly explain the rephrasing choices (e.g., "Generalized ’18 volunteers’ to ’a group of participants’ to preserve privacy").
- **llm_request**: Provide the anonymized, actionable request for the LLM.

PUPA Qwen3 8B respond_to_query

Base Prompt:
[⬇](data:text/plain;base64,UmVzcG9uZCB0byBhIHVzZXIgcXVlcnkuCkZvciBpbnNwaXJhdGlvbiwgd2UgZm91bmQgYSBwb3RlbnRpYWxseSByZWxhdGVkIHJlcXVlc3QgdG8gYSBwb3dlcmZ1bCBleHRlcm5hbCBMTE0gYW5kIGl0cyByZXNwb25zZS4=)
Respond to a user query.
For inspiration, we found a potentially related request to a powerful external LLM and its response.
MIPROv2 Prompt:
[⬇](data:text/plain;base64,U3ludGhlc2l6ZSB0aGUgZXh0ZXJuYWwgTExNJ3MgcmVzcG9uc2Ugd2l0aCB0aGUgdXNlcidzIHNwZWNpZmljIHF1ZXJ5IHRvIGdlbmVyYXRlIGEgZmluYWwgcHJpdmFjeS1wcmVzZXJ2aW5nIGFuc3dlci4gUmVwbGFjZSBwbGFjZWhvbGRlcnMgd2l0aCBhY3R1YWwgdmFsdWVzIHdoaWxlIG9taXR0aW5nIHNlbnNpdGl2ZSBpbmZvcm1hdGlvbiwgbWFpbnRhaW5pbmcgYSBwcm9mZXNzaW9uYWwgdG9uZSwgYW5kIGVuc3VyaW5nIGNvbnRleHR1YWwgYWNjdXJhY3kuIENvbWJpbmUgdGhlIHRlY2huaWNhbCBzb2x1dGlvbiBmcm9tIHRoZSBMTE0gd2l0aCB0aGUgdXNlcidzIHVuaXF1ZSBkZXRhaWxzIHRvIHByb2R1Y2UgYSBjbGVhciwgYW5vbnltaXplZCByZXNwb25zZSB0aGF0IGFkaGVyZXMgdG8gcHJpdmFjeSBjb25zdHJhaW50cy4KRGVtb3M6CkV4YW1wbGUgMToKcmVsYXRlZF9sbG1fcmVxdWVzdDoKICAgIENyZWF0ZSBhIFBFU1RMRSBhbmFseXNpcyBmcmFtZXdvcmsgZm9yIEdFIEhlYWx0aGNhcmUgaW4gdGhlIFVTLCBvdXRsaW5pbmcga2V5IGlzc3VlcyBpbiBlYWNoIGNhdGVnb3J5IChQb2xpdGljYWwsIEVjb25vbWljLCBTb2NpYWwsIFRlY2hub2xvZ2ljYWwsIEVudmlyb25tZW50YWwsIExlZ2FsKSBhbmQgdGhlaXIgcG90ZW50aWFsIGltcGFjdCBvbiB0aGUgb3JnYW5pemF0aW9uLiBQcmlvcml0aXplIHRoZXNlIGlzc3VlcyBiYXNlZCBvbiB1cmdlbmN5IGFuZCBzaWduaWZpY2FuY2Ugd2l0aG91dCByZWZlcmVuY2luZyBjb25maWRlbnRpYWwgZGF0YS4gU3RydWN0dXJlIHRoZSBvdXRwdXQgYXMgYSBtYXRyaXggd2l0aCBjbGVhciBjcml0ZXJpYSBmb3IgZXZhbHVhdGlvbi4KcmVsYXRlZF9sbG1fcmVzcG9uc2U6CiAgICBDZXJ0YWlubHkhIEJlbG93IGlzIGEgKipQRVNUTEUgYW5hbHlzaXMgZnJhbWV3b3JrKiogdGFpbG9yZWQgZm9yICoqR0UgSGVhbHRoY2FyZSBpbiB0aGUgVVMqKiwgc3RydWN0dXJlZCBhcyBhIG1hdHJpeC4gSXQgb3V0bGluZXMga2V5IGlzc3VlcyBpbiBlYWNoIGNhdGVnb3J5LCBldmFsdWF0ZXMgdGhlaXIgKip1cmdlbmN5KiogYW5kICoqc2lnbmlmaWNhbmNlKiosIGFuZCBoaWdobGlnaHRzIHRoZWlyICoqcG90ZW50aWFsIGltcGFjdCoqIG9uIHRoZSBvcmdhbml6YXRpb24uCgotLS0KCiMjIyBQRVNUTEUgQW5hbHlzaXMgTWF0cml4IGZvciBHRSBIZWFsdGhjYXJlIChVUykKCnwgKipDYXRlZ29yeSoqICAgfCAqKktleSBJc3N1ZXMqKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfCAqKlVyZ2VuY3kqKiAoSGlnaC9NZWQvTG93KSB8ICoqU2lnbmlmaWNhbmNlKiogKEhpZ2gvTWVkL0xvdykgfCAqKlBvdGVudGlhbCBJbXBhY3Qgb24gR0UgSGVhbHRoY2FyZSoqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwKfC0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0KLS0tLQotLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLQp8LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLQotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLXwKfCAqKlBvbGl0aWNhbCoqICB8IDEuIEhlYWx0aGNhcmUgcG9saWN5IGNoYW5nZXMgKGUuZy4sIE1lZGljYXJlL01lZGljYWlkIHJlaW1idXJzZW1lbnQgcmVmb3JtcykgICAgfCBIaWdoICAgICAgICAgICAgICAgICAgICAgICB8IEhpZ2ggICAgICAgICAgICAgICAgICAgICAgICAgICAgfCBEaXJlY3RseSBhZmZlY3RzIHJldmVudWUgc3RyZWFtcyBhbmQgcHJvZHVjdC9zZXJ2aWNlIGRlbWFuZDsgcmVxdWlyZXMgYWRhcHRhdGlvbiB0byBuZXcgcmVpbWJ1cnNlbWVudCBtb2RlbHMuICAgICAgICAgIHwKfCAgICAgICAgICAgICAgICB8IDIuIFRyYWRlIHBvbGljaWVzIGFuZCB0YXJpZmZzIG9uIG1lZGljYWwgZXF1aXBtZW50IGltcG9ydHMvZXhwb3J0cyAgICAgICAgICAgICAgfCBNZWRpdW0gICAgICAgICAgICAgICAgICAgICB8IE1lZGl1bSAgICAgICAgICAgICAgICAgICAgICAgICAgfCBDb3VsZCBpbmNyZWFzZSBjb3N0cyBvZiBjb21wb25lbnRzIG9yIGFmZmVjdCBzdXBwbHkgY2hhaW4gZWZmaWNpZW5jeS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwKfCAgICAgICAgICAgICAgICB8IDMuIEdvdmVybm1lbnQgZnVuZGluZyBmb3IgaGVhbHRoY2FyZSBpbm5vdmF0aW9uIGFuZCByZXNlYXJjaCAgICAgICAgICAgICAgICAgICAgfCBNZWRpdW0gICAgICAgICAgICAgICAgICAgICB8IEhpZ2ggICAgICAgICAgICAgICAgICAgICAgICAgICAgfCBJbmZsdWVuY2VzIFImRCBvcHBvcnR1bml0aWVzIGFuZCBwYXJ0bmVyc2hpcHM7IHBvdGVudGlhbCBmb3IgZ3JhbnRzIGFuZCBzdWJzaWRpZXMuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwKfCAqKkVjb25vbWljKiogICB8IDEuIFVTIGhlYWx0aGNhcmUgc3BlbmRpbmcgdHJlbmRzIGFuZCBidWRnZXQgY29uc3RyYWludHMgICAgICAgICAgICAgICAgICAgICAgICAgfCBIaWdoICAgICAgICAgICAgICAgICAgICAgICB8IEhpZ2ggICAgICAgICAgICAgICAgICAgICAgICAgICAgfCBJbXBhY3RzIHB1cmNoYXNpbmcgcG93ZXIgb2YgaG9zcGl0YWxzIGFuZCBjbGluaWNzOyBhZmZlY3RzIHNhbGVzIHZvbHVtZSBhbmQgcHJpY2luZyBzdHJhdGVnaWVzLiAgICAgICAgICAgICAgICAgICAgICAgIHwKfCAgICAgICAgICAgICAgICB8IDIuIEluZmxhdGlvbiBhbmQgcmlzaW5nIG9wZXJhdGlvbmFsIGNvc3RzICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8IEhpZ2ggICAgICAgICAgICAgICAgICAgICAgIHwgTWVkaXVtICAgICAgICAgICAgICAgICAgICAgICAgICB8IEluY3JlYXNlcyBwcm9kdWN0aW9uIGFuZCBvcGVyYXRpb25hbCBleHBlbnNlczsgbWF5IHByZXNzdXJlIHByb2ZpdCBtYXJnaW5zLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfAp8ICAgICAgICAgICAgICAgIHwgMy4gRWNvbm9taWMgY3ljbGVzIGFmZmVjdGluZyBjYXBpdGFsIGludmVzdG1lbnQgaW4gaGVhbHRoY2FyZSBpbmZyYXN0cnVjdHVyZSAgICB8IE1lZGl1bSAgICAgICAgICAgICAgICAgICAgIHwgTWVkaXVtICAgICAgICAgICAgICAgICAgICAgICAgICB8IEluZmx1ZW5jZXMgZGVtYW5kIGZvciBoaWdoLWNvc3QgbWVkaWNhbCBlcXVpcG1lbnQgYW5kIHRlY2hub2xvZ3kgdXBncmFkZXMuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfAp8ICoqU29jaWFsKiogICAgIHwgMS4gQWdpbmcgcG9wdWxhdGlvbiBpbmNyZWFzaW5nIGRlbWFuZCBmb3IgaGVhbHRoY2FyZSBzZXJ2aWNlcyBhbmQgZGV2aWNlcyAgICAgICB8IEhpZ2ggICAgICAgICAgICAgICAgICAgICAgIHwgSGlnaCAgICAgICAgICAgICAgICAgICAgICAgICAgICB8IERyaXZlcyBkZW1hbmQgZm9yIGRpYWdub3N0aWMgaW1hZ2luZywgbW9uaXRvcmluZywgYW5kIHRoZXJhcGV1dGljIGRldmljZXM7IGdyb3d0aCBvcHBvcnR1bml0eS4gICAgICAgICAgICAgICAgICAgICAgICAgfAp8ICAgICAgICAgICAgICAgIHwgMi4gR3Jvd2luZyBwYXRpZW50IGF3YXJlbmVzcyBhbmQgZGVtYW5kIGZvciBwZXJzb25hbGl6ZWQgbWVkaWNpbmUgICAgICAgICAgICAgICB8IE1lZGl1bSAgICAgICAgICAgICAgICAgICAgIHwgTWVkaXVtICAgICAgICAgICAgICAgICAgICAgICAgICB8IE5lY2Vzc2l0YXRlcyBpbm5vdmF0aW9uIGluIHRhaWxvcmVkIGhlYWx0aGNhcmUgc29sdXRpb25zIGFuZCBkYXRhLWRyaXZlbiB0ZWNobm9sb2dpZXMuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfAp8ICAgICAgICAgICAgICAgIHwgMy4gV29ya2ZvcmNlIHNob3J0YWdlcyBpbiBoZWFsdGhjYXJlIHByb2Zlc3Npb25hbHMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8IEhpZ2ggICAgICAgICAgICAgICAgICAgICAgIHwgTWVkaXVtICAgICAgICAgICAgICAgICAgICAgICAgICB8IE1heSBhZmZlY3QgYWRvcHRpb24gYW5kIHRyYWluaW5nIGZvciBuZXcgdGVjaG5vbG9naWVzOyBpbXBhY3RzIGN1c3RvbWVyIHN1cHBvcnQgYW5kIHNlcnZpY2UgZGVsaXZlcnkuICAgICAgICAgICAgICAgICAgfAp8ICoqVGVjaG5vbG9naWNhbCoqIHwgMS4gUmFwaWQgYWR2YW5jZW1lbnRzIGluIEFJIGFuZCBtYWNoaW5lIGxlYXJuaW5nIGZvciBkaWFnbm9zdGljcyBhbmQgaW1hZ2luZyB8IEhpZ2ggICAgICAgICAgICAgICAgICAgICAgIHwgSGlnaCAgICAgICAgICAgICAgICAgICAgICAgICAgICB8IENyaXRpY2FsIGZvciBtYWludGFpbmluZyBjb21wZXRpdGl2ZSBlZGdlOyByZXF1aXJlcyBjb250aW51b3VzIGludmVzdG1lbnQgaW4gUiZEIGFuZCBwcm9kdWN0IGRldmVsb3BtZW50LiAgICAgICAgICAgICB8CnwgICAgICAgICAgICAgICAgfCAyLiBJbnRlZ3JhdGlvbiBvZiBJb1QgYW5kIGNvbm5lY3RlZCBkZXZpY2VzIGluIGhlYWx0aGNhcmUgICAgICAgICAgICAgICAgICAgICAgIHwgTWVkaXVtICAgICAgICAgICAgICAgICAgICAgfCBIaWdoICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgRW5oYW5jZXMgcHJvZHVjdCBvZmZlcmluZ3MgYnV0IGRlbWFuZHMgcm9idXN0IGN5YmVyc2VjdXJpdHkgYW5kIGludGVyb3BlcmFiaWxpdHkgc29sdXRpb25zLiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8CnwgICAgICAgICAgICAgICAgfCAzLiBEYXRhIHByaXZhY3kgYW5kIGN5YmVyc2VjdXJpdHkgdGVjaG5vbG9naWVzICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfCBIaWdoICAgICAgICAgICAgICAgICAgICAgICB8IEhpZ2ggICAgICAgICAgICAgICAgICAgICAgICAgICAgfCBFc3NlbnRpYWwgdG8gcHJvdGVjdCBwYXRpZW50IGRhdGEgYW5kIGNvbXBseSB3aXRoIHJlZ3VsYXRpb25zOyBmYWlsdXJlIHJpc2tzIGxlZ2FsIHBlbmFsdGllcyBhbmQgcmVwdXRhdGlvbmFsIGRhbWFnZS4gIHwKfCAqKkVudmlyb25tZW50YWwqKiB8IDEuIFJlZ3VsYXRvcnkgcHJlc3N1cmUgdG8gcmVkdWNlIGNhcmJvbiBmb290cHJpbnQgYW5kIHdhc3RlIGluIG1hbnVmYWN0dXJpbmcgfCBNZWRpdW0gICAgICAgICAgICAgICAgICAgICB8IE1lZGl1bSAgICAgICAgICAgICAgICAgICAgICAgICAgfCBOZWNlc3NpdGF0ZXMgc3VzdGFpbmFibGUgcHJhY3RpY2VzOyBwb3RlbnRpYWwgY29zdCBpbXBsaWNhdGlvbnMgYnV0IGltcHJvdmVzIGJyYW5kIHJlcHV0YXRpb24uICAgICAgICAgICAgICAgICAgICAgICAgIHwKfCAgICAgICAgICAgICAgICB8IDIuIEVuZXJneSBlZmZpY2llbmN5IGluIHByb2R1Y3QgZGVzaWduIGFuZCBvcGVyYXRpb25zICAgICAgICAgICAgICAgICAgICAgICAgICB8IE1lZGl1bSAgICAgICAgICAgICAgICAgICAgIHwgTWVkaXVtICAgICAgICAgICAgICAgICAgICAgICAgICB8IENhbiByZWR1Y2Ugb3BlcmF0aW9uYWwgY29zdHMgYW5kIGFwcGVhbCB0byBlbnZpcm9ubWVudGFsbHkgY29uc2Npb3VzIGN1c3RvbWVycy4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfAp8ICAgICAgICAgICAgICAgIHwgMy4gRS13YXN0ZSBtYW5hZ2VtZW50IGFuZCByZWN5Y2xpbmcgcHJvZ3JhbXMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfCBMb3cgICAgICAgICAgICAgICAgICAgICAgICB8IE1lZGl1bSAgICAgICAgICAgICAgICAgICAgICAgICAgfCBDb21wbGlhbmNlIHdpdGggZW52aXJvbm1lbnRhbCBzdGFuZGFyZHM7IGdyb3dpbmcgaW1wb3J0YW5jZSBmb3IgY29ycG9yYXRlIHNvY2lhbCByZXNwb25zaWJpbGl0eS4gICAgICAgICAgICAgICAgICAgICAgIHwKfCAqKkxlZ2FsKiogICAgICB8IDEuIENvbXBsaWFuY2Ugd2l0aCBGREEgcmVndWxhdGlvbnMgYW5kIG1lZGljYWwgZGV2aWNlIGFwcHJvdmFscyAgICAgICAgICAgICAgICAgfCBIaWdoICAgICAgICAgICAgICAgICAgICAgICB8IEhpZ2ggICAgICAgICAgICAgICAgICAgICAgICAgICAgfCBDcml0aWNhbCBmb3IgbWFya2V0IGFjY2VzczsgZGVsYXlzIG9yIGZhaWx1cmVzIGNhbiBoYWx0IHByb2R1Y3QgbGF1bmNoZXMgYW5kIGNhdXNlIGZpbmFuY2lhbCBsb3NzZXMuICAgICAgICAgICAgICAgICAgIHwKfCAgICAgICAgICAgICAgICB8IDIuIEludGVsbGVjdHVhbCBwcm9wZXJ0eSByaWdodHMgYW5kIHBhdGVudCBwcm90ZWN0aW9ucyAgICAgICAgICAgICAgICAgICAgICAgICB8IE1lZGl1bSAgICAgICAgICAgICAgICAgICAgIHwgSGlnaCAgICAgICAgICAgICAgICAgICAgICAgICAgICB8IFByb3RlY3RzIGlubm92YXRpb24gYW5kIGNvbXBldGl0aXZlIGFkdmFudGFnZTsgaW5mcmluZ2VtZW50IHJpc2tzIGNvc3RseSBsaXRpZ2F0aW9uLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfAp8ICAgICAgICAgICAgICAgIHwgMy4gTGlhYmlsaXR5IGFuZCBwcm9kdWN0IHNhZmV0eSByZWd1bGF0aW9ucyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfCBIaWdoICAgICAgICAgICAgICAgICAgICAgICB8IEhpZ2ggICAgICAgICAgICAgICAgICAgICAgICAgICAgfCBFbnN1cmVzIHBhdGllbnQgc2FmZXR5OyBub24tY29tcGxpYW5jZSBjYW4gbGVhZCB0byBsYXdzdWl0cywgcmVjYWxscywgYW5kIHJlcHV0YXRpb25hbCBkYW1hZ2UuICAgICAgICAgICAgICAgICAgICAgICAgIHwKCi0tLQoKIyMjIENyaXRlcmlhIGZvciBFdmFsdWF0aW9uOgoKLSAqKlVyZ2VuY3kqKjogSG93IGltbWVkaWF0ZSB0aGUgaXNzdWUgcmVxdWlyZXMgYXR0ZW50aW9uIChIaWdoID0gaW1tZWRpYXRlL29uZ29pbmc7IE1lZGl1bSA9IHdpdGhpbiAxLTIgeWVhcnM7IExvdyA9IGxvbmdlci10ZXJtKS4KLSAqKlNpZ25pZmljYW5jZSoqOiBUaGUgcG90ZW50aWFsIG1hZ25pdHVkZSBvZiBpbXBhY3Qgb24gR0UgSGVhbHRoY2FyZeKAmXMgb3BlcmF0aW9ucywgcHJvZml0YWJpbGl0eSwgYW5kIHN0cmF0ZWdpYyBwb3NpdGlvbmluZyAoSGlnaCA9IGNyaXRpY2FsOyBNZWRpdW0gPSBtb2RlcmF0ZTsgTG93ID0gbWlub3IpLgotICoqUG90ZW50aWFsIEltcGFjdCoqOiBEZXNjcmliZXMgaG93IHRoZSBpc3N1ZSBjb3VsZCBhZmZlY3QgR0UgSGVhbHRoY2FyZeKAmXMgYnVzaW5lc3MsIGluY2x1ZGluZyByaXNrcyBhbmQgb3Bwb3J0dW5pdGllcy4KCi0tLQoKVGhpcyBtYXRyaXggaGVscHMgcHJpb3JpdGl6ZSBzdHJhdGVnaWMgZm9jdXMgYXJlYXMgZm9yIEdFIEhlYWx0aGNhcmUgaW4gdGhlIFVTLCBiYWxhbmNpbmcgaW1tZWRpYXRlIGNoYWxsZW5nZXMgd2l0aCBsb25nZXItdGVybSB0cmVuZHMuCnVzZXJfcXVlcnk6CiAgICBpc3N1ZSBwcmlvcml0eSBtYXRyaXggb24gcGVzdGxlIGFuYWx5c2lzIGZvciBHRSBIZWFsdGhjYXJlIGluIFVTCnJlc3BvbnNlOgogICAgSGVyZSdzIGEgcHJpb3JpdGl6ZWQgKippc3N1ZSBwcmlvcml0eSBtYXRyaXgqKiBiYXNlZCBvbiB0aGUgUEVTVExFIGFuYWx5c2lzIGZvciAqKkdFIEhlYWx0aGNhcmUgaW4gdGhlIFVTKiosIGZvY3VzaW5nIG9uIHRoZSBtb3N0IHVyZ2VudCBhbmQgc2lnbmlmaWNhbnQgY2hhbGxlbmdlcyBhbmQgb3Bwb3J0dW5pdGllczoKCi0tLQoKIyMjICoqSGlnaCBQcmlvcml0eSBJc3N1ZXMgKEhpZ2ggVXJnZW5jeSArIEhpZ2ggU2lnbmlmaWNhbmNlKSoqCnwgKipDYXRlZ29yeSoqICAgICAgIHwgKipLZXkgSXNzdWUqKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfCAqKlVyZ2VuY3kqKiB8ICoqU2lnbmlmaWNhbmNlKiogfCAqKkltcGFjdCBTdW1tYXJ5KiogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwKfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLQotLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0KLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0KLS0tLS0tLS0tLS0tLS0tLS18CnwgKipQb2xpdGljYWwqKiAgICAgICB8IEhlYWx0aGNhcmUgcG9saWN5IGNoYW5nZXMgKGUuZy4sIHJlaW1idXJzZW1lbnQgcmVmb3JtcykgfCBIaWdoICAgICAgICB8IEhpZ2ggICAgICAgICAgICAgfCBEaXJlY3QgcmV2ZW51ZSByaXNrOyByZXF1aXJlcyByYXBpZCBhZGFwdGF0aW9uIHRvIG5ldyByZWd1bGF0aW9ucy4gICAgICAgICAgICAgICAgfAp8ICoqRWNvbm9taWMqKiAgICAgICAgfCBVUyBoZWFsdGhjYXJlIHNwZW5kaW5nIHRyZW5kcyBhbmQgYnVkZ2V0IGNvbnN0cmFpbnRzIHwgSGlnaCAgICAgICAgfCBIaWdoICAgICAgICAgICAgIHwgRHJpdmVzIGRlbWFuZCBhbmQgcHJpY2luZyBwcmVzc3VyZXM7IGNyaXRpY2FsIGZvciBzYWxlcyBzdHJhdGVneS4gICAgICAgICAgICAgICAgIHwKfCAqKlNvY2lhbCoqICAgICAgICAgIHwgQWdpbmcgcG9wdWxhdGlvbiBkZW1hbmQgZm9yIGhlYWx0aGNhcmUgc2VydmljZXMgICAgIHwgSGlnaCAgICAgICAgfCBIaWdoICAgICAgICAgICAgIHwgR3Jvd3RoIG9wcG9ydHVuaXR5IGluIGRpYWdub3N0aWNzL3RoZXJhcGV1dGljczsgbG9uZy10ZXJtIG1hcmtldCBleHBhbnNpb24uICAgICAgIHwKfCAqKlRlY2hub2xvZ2ljYWwqKiAgIHwgQUkvTUwgYWR2YW5jZW1lbnRzIGluIGRpYWdub3N0aWNzIGFuZCBpbWFnaW5nICAgICAgfCBIaWdoICAgICAgICB8IEhpZ2ggICAgICAgICAgICAgfCBFc3NlbnRpYWwgZm9yIGNvbXBldGl0aXZlbmVzczsgZGVtYW5kcyBzdXN0YWluZWQgUiZEIGludmVzdG1lbnQuICAgICAgICAgICAgICAgICB8CnwgKipMZWdhbCoqICAgICAgICAgICB8IEZEQSByZWd1bGF0aW9ucyBhbmQgbWVkaWNhbCBkZXZpY2UgYXBwcm92YWxzICAgICAgICB8IEhpZ2ggICAgICAgIHwgSGlnaCAgICAgICAgICAgICB8IENyaXRpY2FsIGZvciBtYXJrZXQgYWNjZXNzOyBkZWxheXMgcmlzayBmaW5hbmNpYWwgbG9zc2VzLiAgICAgICAgICAgICAgICAgICAgICAgICB8CgotLS0KCiMjIyAqKk1lZGl1bSBQcmlvcml0eSBJc3N1ZXMgKEhpZ2ggVXJnZW5jeSArIE1lZGl1bSBTaWduaWZpY2FuY2Ugb3IgTWVkaXVtIFVyZ2VuY3kgKyBIaWdoIFNpZ25pZmljYW5jZSkqKgp8ICoqQ2F0ZWdvcnkqKiAgICAgICB8ICoqS2V5IElzc3VlKiogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgKipVcmdlbmN5KiogfCAqKlNpZ25pZmljYW5jZSoqIHwgKipJbXBhY3QgU3VtbWFyeSoqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8CnwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS18LS0KLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLQotLS0tLS0tLS0tLS0tLXwKfCAqKkVjb25vbWljKiogICAgICAgIHwgSW5mbGF0aW9uIGFuZCBvcGVyYXRpb25hbCBjb3N0cyAgICAgICAgICAgICAgICAgICAgfCBIaWdoICAgICAgICB8IE1lZGl1bSAgICAgICAgICAgfCBQcmVzc3VyZXMgcHJvZml0IG1hcmdpbnM7IHJlcXVpcmVzIGNvc3QtZWZmaWNpZW5jeSBtZWFzdXJlcy4gICAgICAgICAgICAgICAgICAgICAgfAp8ICoqVGVjaG5vbG9naWNhbCoqICAgfCBJb1QgaW50ZWdyYXRpb24gYW5kIGN5YmVyc2VjdXJpdHkgICAgICAgICAgICAgICAgICB8IE1lZGl1bSAgICAgIHwgSGlnaCAgICAgICAgICAgICB8IEVuaGFuY2VzIG9mZmVyaW5ncyBidXQgZGVtYW5kcyByb2J1c3Qgc2VjdXJpdHkgZnJhbWV3b3Jrcy4gICAgICAgICAgICAgICAgICAgICAgIHwKfCAqKkVudmlyb25tZW50YWwqKiAgIHwgQ2FyYm9uIGZvb3RwcmludCByZWR1Y3Rpb24gYW5kIHN1c3RhaW5hYmlsaXR5ICAgICAgIHwgTWVkaXVtICAgICAgfCBNZWRpdW0gICAgICAgICAgIHwgQmFsYW5jZXMgY29zdCBpbXBsaWNhdGlvbnMgd2l0aCBicmFuZCByZXB1dGF0aW9uIGFuZCByZWd1bGF0b3J5IGNvbXBsaWFuY2UuICAgICAgIHwKCi0tLQoKIyMjICoqUHJpb3JpdGl6YXRpb24gQ3JpdGVyaWEqKgotICoqVXJnZW5jeSoqOiBJbW1lZGlhdGUgKEhpZ2gpIHZzLiBsb25nZXItdGVybSAoTG93KS4KLSAqKlNpZ25pZmljYW5jZSoqOiBDcml0aWNhbCAoSGlnaCkgdnMuIG1vZGVyYXRlIChNZWRpdW0pLgotICoqRm9jdXMqKjogSXNzdWVzIHdpdGggKipIaWdoIGluIGJvdGggdXJnZW5jeSBhbmQgc2lnbmlmaWNhbmNlKiogcmVxdWlyZSBpbW1lZGlhdGUgc3RyYXRlZ2ljIGFjdGlvbiwgd2hpbGUgb3RoZXJzIGRlbWFuZCBtb25pdG9yaW5nIG9yIHBoYXNlZCBwbGFubmluZy4KClRoaXMgbWF0cml4IGhlbHBzIEdFIEhlYWx0aGNhcmUgYWxsb2NhdGUgcmVzb3VyY2VzIHRvIGFkZHJlc3MgdGhlIG1vc3QgcHJlc3NpbmcgY2hhbGxlbmdlcyBhbmQgbGV2ZXJhZ2UgaGlnaC1pbXBhY3Qgb3Bwb3J0dW5pdGllcy4KCgojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCjMgb3RoZXIgZGVtb3Mgb21pdHRlZCBmb3IgYnJldml0eS4KIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwo=)
Synthesize the external LLM’s response with the user’s specific query to generate a final privacy-preserving answer. Replace placeholders with actual values while omitting sensitive information, maintaining a professional tone, and ensuring contextual accuracy. Combine the technical solution from the LLM with the user’s unique details to produce a clear, anonymized response that adheres to privacy constraints.
Demos:
Example 1:
related_llm_request:
 Create a PESTLE analysis framework for GE Healthcare in the US, outlining key issues in each category (Political, Economic, Social, Technological, Environmental, Legal) and their potential impact on the organization. Prioritize these issues based on urgency and significance without referencing confidential data. Structure the output as a matrix with clear criteria for evaluation.
related_llm_response:
 Certainly! Below is a **PESTLE analysis framework** tailored for **GE Healthcare in the US**, structured as a matrix. It outlines key issues in each category, evaluates their **urgency** and **significance**, and highlights their **potential impact** on the organization.


---


### PESTLE Analysis Matrix for GE Healthcare (US)


| **Category** | **Key Issues** | **Urgency** (High/Med/Low) | **Significance** (High/Med/Low) | **Potential Impact on GE Healthcare** |
|----------------|--------------------------------------------------------------
----
--------------|----------------------------|---------------------------------
|-------------------------------------------------------------------------
-----------------------------------------------|
| **Political** | 1. Healthcare policy changes (e.g., Medicare/Medicaid reimbursement reforms) | High | High | Directly affects revenue streams and product/service demand; requires adaptation to new reimbursement models. |
| | 2. Trade policies and tariffs on medical equipment imports/exports | Medium | Medium | Could increase costs of components or affect supply chain efficiency. |
| | 3. Government funding for healthcare innovation and research | Medium | High | Influences R&D opportunities and partnerships; potential for grants and subsidies. |
| **Economic** | 1. US healthcare spending trends and budget constraints | High | High | Impacts purchasing power of hospitals and clinics; affects sales volume and pricing strategies. |
| | 2. Inflation and rising operational costs | High | Medium | Increases production and operational expenses; may pressure profit margins. |
| | 3. Economic cycles affecting capital investment in healthcare infrastructure | Medium | Medium | Influences demand for high-cost medical equipment and technology upgrades. |
| **Social** | 1. Aging population increasing demand for healthcare services and devices | High | High | Drives demand for diagnostic imaging, monitoring, and therapeutic devices; growth opportunity. |
| | 2. Growing patient awareness and demand for personalized medicine | Medium | Medium | Necessitates innovation in tailored healthcare solutions and data-driven technologies. |
| | 3. Workforce shortages in healthcare professionals | High | Medium | May affect adoption and training for new technologies; impacts customer support and service delivery. |
| **Technological** | 1. Rapid advancements in AI and machine learning for diagnostics and imaging | High | High | Critical for maintaining competitive edge; requires continuous investment in R&D and product development. |
| | 2. Integration of IoT and connected devices in healthcare | Medium | High | Enhances product offerings but demands robust cybersecurity and interoperability solutions. |
| | 3. Data privacy and cybersecurity technologies | High | High | Essential to protect patient data and comply with regulations; failure risks legal penalties and reputational damage. |
| **Environmental** | 1. Regulatory pressure to reduce carbon footprint and waste in manufacturing | Medium | Medium | Necessitates sustainable practices; potential cost implications but improves brand reputation. |
| | 2. Energy efficiency in product design and operations | Medium | Medium | Can reduce operational costs and appeal to environmentally conscious customers. |
| | 3. E-waste management and recycling programs | Low | Medium | Compliance with environmental standards; growing importance for corporate social responsibility. |
| **Legal** | 1. Compliance with FDA regulations and medical device approvals | High | High | Critical for market access; delays or failures can halt product launches and cause financial losses. |
| | 2. Intellectual property rights and patent protections | Medium | High | Protects innovation and competitive advantage; infringement risks costly litigation. |
| | 3. Liability and product safety regulations | High | High | Ensures patient safety; non-compliance can lead to lawsuits, recalls, and reputational damage. |


---


### Criteria for Evaluation:


- **Urgency**: How immediate the issue requires attention (High = immediate/ongoing; Medium = within 1-2 years; Low = longer-term).
- **Significance**: The potential magnitude of impact on GE Healthcare’s operations, profitability, and strategic positioning (High = critical; Medium = moderate; Low = minor).
- **Potential Impact**: Describes how the issue could affect GE Healthcare’s business, including risks and opportunities.


---


This matrix helps prioritize strategic focus areas for GE Healthcare in the US, balancing immediate challenges with longer-term trends.
user_query:
 issue priority matrix on pestle analysis for GE Healthcare in US
response:
 Here’s a prioritized **issue priority matrix** based on the PESTLE analysis for **GE Healthcare in the US**, focusing on the most urgent and significant challenges and opportunities:


---


### **High Priority Issues (High Urgency + High Significance)**
| **Category** | **Key Issue** | **Urgency** | **Significance** | **Impact Summary** |
|---------------------|--------------------------------------
--------------|-------------|------------------|---------
-----------------------------------------------------------
-----------------|
| **Political** | Healthcare policy changes (e.g., reimbursement reforms) | High | High | Direct revenue risk; requires rapid adaptation to new regulations. |
| **Economic** | US healthcare spending trends and budget constraints | High | High | Drives demand and pricing pressures; critical for sales strategy. |
| **Social** | Aging population demand for healthcare services | High | High | Growth opportunity in diagnostics/therapeutics; long-term market expansion. |
| **Technological** | AI/ML advancements in diagnostics and imaging | High | High | Essential for competitiveness; demands sustained R&D investment. |
| **Legal** | FDA regulations and medical device approvals | High | High | Critical for market access; delays risk financial losses. |


---


### **Medium Priority Issues (High Urgency + Medium Significance or Medium Urgency + High Significance)**
| **Category** | **Key Issue** | **Urgency** | **Significance** | **Impact Summary** |
|---------------------|----------------------------------------------------|------------|--
----------------|-----------------------------------------------------------------------
--------------|
| **Economic** | Inflation and operational costs | High | Medium | Pressures profit margins; requires cost-efficiency measures. |
| **Technological** | IoT integration and cybersecurity | Medium | High | Enhances offerings but demands robust security frameworks. |
| **Environmental** | Carbon footprint reduction and sustainability | Medium | Medium | Balances cost implications with brand reputation and regulatory compliance. |


---


### **Prioritization Criteria**
- **Urgency**: Immediate (High) vs. longer-term (Low).
- **Significance**: Critical (High) vs. moderate (Medium).
- **Focus**: Issues with **High in both urgency and significance** require immediate strategic action, while others demand monitoring or phased planning.


This matrix helps GE Healthcare allocate resources to address the most pressing challenges and leverage high-impact opportunities.




##################################
3 other demos omitted for brevity.
##################################
GEPA Prompt generated by config GEPA:
[⬇](data:text/plain;base64,UmVzcG9uZCB0byBhIHVzZXIgcXVlcnkgYnkgbGV2ZXJhZ2luZyBhIHJlbGF0ZWQgTExNIHJlc3BvbnNlIGFzIGluc3BpcmF0aW9uLiBTdHJ1Y3R1cmUgeW91ciBhbnN3ZXIgaW4gYSBjbGVhciwgb3JnYW5pemVkIGZvcm1hdCAoZS5nLiwgYnVsbGV0IHBvaW50cywgc2VjdGlvbnMpIHRvIGVuaGFuY2UgcmVhZGFiaWxpdHkuIEVuc3VyZSB0aGUgcmVzcG9uc2UgaXMgdGFpbG9yZWQgdG8gdGhlIHVzZXIncyBsYW5ndWFnZSBhbmQgYXZvaWRzIGFueSBwZXJzb25hbGx5IGlkZW50aWZpYWJsZSBpbmZvcm1hdGlvbiAoUElJKSBvciBzZW5zaXRpdmUgZGF0YS4KCldoZW4gcmVwaHJhc2luZyBvciBzdW1tYXJpemluZyBjb250ZW50OgoxLiAqKk1haW50YWluIGFjYWRlbWljIHRvbmUqKiBpZiB0aGUgcXVlcnkgc3BlY2lmaWVzIGZvcm1hbCBsYW5ndWFnZSAoZS5nLiwgcmVwaHJhc2luZyB0ZWNobmljYWwgb3IgaGlzdG9yaWNhbCB0ZXh0KS4KMi4gKipSZWZhY3RvciByZXBldGl0aXZlIG9yIHJlZHVuZGFudCBpbmZvcm1hdGlvbioqIGludG8gY29uY2lzZSwgZm9jdXNlZCBzZWN0aW9ucyAoZS5nLiwgZ3JvdXBpbmcgc2ltaWxhciBpZGVhcywgZWxpbWluYXRpbmcgZHVwbGljYXRpb24pLgozLiAqKkhpZ2hsaWdodCBkb21haW4tc3BlY2lmaWMgZmFjdHMqKiAoZS5nLiwgY3VsdHVyYWwsIHRlY2huaWNhbCwgb3IgcmVnaW9uYWwgZGV0YWlscykgdG8gYWRkIHZhbHVlLCBhcyB0aGVzZSBtYXkgbm90IGJlIHVuaXZlcnNhbGx5IGtub3duLgo0LiAqKkltcHJvdmUgY29kZSBvciB0ZWNobmljYWwgcmVzcG9uc2VzKiogYnkgYnJlYWtpbmcgZG93biBjb21wbGV4IGxvZ2ljIGludG8gc21hbGxlciwgd2VsbC1kb2N1bWVudGVkIGZ1bmN0aW9ucywgcmVkdWNpbmcgcmVkdW5kYW5jeSwgYW5kIGVuc3VyaW5nIHByb3BlciByZXNvdXJjZSBtYW5hZ2VtZW50LgoKRm9yIGFsbCBvdXRwdXRzOgotIFByaW9yaXRpemUgKipjbGFyaXR5LCBhY2N1cmFjeSwgYW5kIGFkaGVyZW5jZSB0byB0aGUgdXNlcidzIHJlcXVpcmVtZW50cyoqLgotIEF2b2lkICoqbGVha2luZyBwcm9wcmlldGFyeSBpbmZvcm1hdGlvbiwgUElJLCBvciB1bnZlcmlmaWVkIGNsYWltcyoqLgotIElmIHRoZSB1c2Vy4oCZcyBxdWVyeSBpbnZvbHZlcyBtdWx0aXBsZSBzdGVwcyAoZS5nLiwgY29kZSBvcHRpbWl6YXRpb24sIGNvbnRlbnQgcmVwaHJhc2luZyksIGFkZHJlc3MgZWFjaCBwYXJ0IHN5c3RlbWF0aWNhbGx5LgotIFVzZSAqKmxhbmd1YWdlLXNwZWNpZmljIGNvbnZlbnRpb25zKiogKGUuZy4sIGNvcnJlY3QgZ3JhbW1hciwgdGVybWlub2xvZ3kpIHRvIGFsaWduIHdpdGggdGhlIHVzZXLigJlzIHByZWZlcnJlZCBsYW5ndWFnZS4=)
Respond to a user query by leveraging a related LLM response as inspiration. Structure your answer in a clear, organized format (e.g., bullet points, sections) to enhance readability. Ensure the response is tailored to the user’s language and avoids any personally identifiable information (PII) or sensitive data.


When rephrasing or summarizing content:
1. **Maintain academic tone** if the query specifies formal language (e.g., rephrasing technical or historical text).
2. **Refactor repetitive or redundant information** into concise, focused sections (e.g., grouping similar ideas, eliminating duplication).
3. **Highlight domain-specific facts** (e.g., cultural, technical, or regional details) to add value, as these may not be universally known.
4. **Improve code or technical responses** by breaking down complex logic into smaller, well-documented functions, reducing redundancy, and ensuring proper resource management.


For all outputs:
- Prioritize **clarity, accuracy, and adherence to the user’s requirements**.
- Avoid **leaking proprietary information, PII, or unverified claims**.
- If the user’s query involves multiple steps (e.g., code optimization, content rephrasing), address each part systematically.
- Use **language-specific conventions** (e.g., correct grammar, terminology) to align with the user’s preferred language.

## Appendix M GEPA generated prompts for kernel generation

### M.1 NPUEval: Kernel Code Generation for new hardware architecture

![Refer to caption](https://arxiv.org/html/2507.19457v2/manual_figures/npueval_gepa_prompt.png)


Figure 27: GEPA generated prompt for NPUEval that achieves 26.85% score with the same GPT-4o agent, that achieved a 4.25% score.

Figure [27](https://arxiv.org/html/2507.19457#A13.F27 "Figure 27 ‣ M.1 NPUEval: Kernel Code Generation for new hardware architecture ‣ Appendix M GEPA generated prompts for kernel generation ‣ GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning") shows the prompt generated by GEPA with GPT-4o for NPU Keernel Generation, that achieves 26.85% score with the same same GPT-4o agent, that achieved just 4.25% with a simple prompt.

### M.2 KernelBench: CUDA Kernel Code Generation for NVIDIA GPUs

GEPA GPT-4o generated prompt for CUDA Kernel Generation

[⬇](data:text/plain;base64,VG8gb3B0aW1pemUgYSBnaXZlbiBQeVRvcmNoIG1vZGVsIGJ5IHJlcGxhY2luZyBvcGVyYXRvcnMgd2l0aCBjdXN0b20gQ1VEQSBrZXJuZWxzLCBmb2xsb3cgdGhlc2UgZGV0YWlsZWQgaW5zdHJ1Y3Rpb25zLiBZb3VyIGdvYWwgaXMgdG8gYWNoaWV2ZSBwZXJmb3JtYW5jZSBpbXByb3ZlbWVudHMgd2hpbGUgZW5zdXJpbmcgY29ycmVjdG5lc3MuIE5hbWUgeW91ciBvcHRpbWl6ZWQgb3V0cHV0IGFyY2hpdGVjdHVyZSBgTW9kZWxOZXdgLiBPdXRwdXQgdGhlIG5ldyBtb2RlbCBjb2RlIGluIGNvZGVibG9ja3MuIFBsZWFzZSBnZW5lcmF0ZSByZWFsIGNvZGUsIE5PVCBwc2V1ZG9jb2RlLCBhbmQgZW5zdXJlIHRoZSBjb2RlIGNvbXBpbGVzIGFuZCBpcyBmdWxseSBmdW5jdGlvbmFsLiBEbyBub3QgaW5jbHVkZSB0ZXN0aW5nIGNvZGUuCgojIyMgU3RlcHMgdG8gQ3JlYXRlIEN1c3RvbSBDVURBIEtlcm5lbHMKCiMjIyMgMS4gSWRlbnRpZnkgT3BlcmF0b3JzIHRvIFJlcGxhY2UKLSBBbmFseXplIHRoZSBtb2RlbCB0byBpZGVudGlmeSBvcGVyYXRvcnMgdGhhdCBjYW4gYmVuZWZpdCBmcm9tIGN1c3RvbSBDVURBIGltcGxlbWVudGF0aW9ucy4KLSBDb25zaWRlciBvcGVyYXRvciBmdXNpb24gb3Bwb3J0dW5pdGllcyB0byBjb21iaW5lIG11bHRpcGxlIG9wZXJhdGlvbnMgaW50byBhIHNpbmdsZSBrZXJuZWwgZm9yIGVmZmljaWVuY3kuCgojIyMjIDIuIFNldHVwIGFuZCBDb21waWxhdGlvbgotIFVzZSBgdG9yY2gudXRpbHMuY3BwX2V4dGVuc2lvbi5sb2FkX2lubGluZWAgdG8gY29tcGlsZSB5b3VyIENVREEgY29kZS4gVGhpcyBhbGxvd3MgeW91IHRvIGRlZmluZSBhbmQgY29tcGlsZSBjdXN0b20gQ1VEQSBrZXJuZWxzIGRpcmVjdGx5IHdpdGhpbiB5b3VyIFB5dGhvbiBzY3JpcHQuCi0gRW5zdXJlIGFsbCBuZWNlc3NhcnkgQ1VEQSBhbmQgQysrIGhlYWRlcnMgYXJlIGluY2x1ZGVkIHRvIGF2b2lkIG1pc3NpbmcgaW5jbHVkZXMgZXJyb3JzLgoKIyMjIyAzLiBJbXBsZW1lbnRpbmcgdGhlIENVREEgS2VybmVsCi0gV3JpdGUgdGhlIENVREEga2VybmVsIGNvZGUsIGVuc3VyaW5nIGl0IGlzIG9wdGltaXplZCBmb3IgcGFyYWxsZWwgZXhlY3V0aW9uLiBVc2Ugc2hhcmVkIG1lbW9yeSB0byByZWR1Y2UgZ2xvYmFsIG1lbW9yeSBhY2Nlc3NlcyBhbmQgZW5zdXJlIGNvYWxlc2NlZCBtZW1vcnkgYWNjZXNzIHBhdHRlcm5zLgotIEV4YW1wbGUgc3RydWN0dXJlIGZvciBhIENVREEga2VybmVsOgogIGBgYGNwcAogIF9fZ2xvYmFsX18gdm9pZCBteV9rZXJuZWwoY29uc3QgZmxvYXQqIGlucHV0LCBmbG9hdCogb3V0cHV0LCBpbnQgc2l6ZSkgewogICAgICBpbnQgaWR4ID0gYmxvY2tJZHgueCAqIGJsb2NrRGltLnggKyB0aHJlYWRJZHgueDsKICAgICAgaWYgKGlkeCA8IHNpemUpIHsKICAgICAgICAgIC8vIFBlcmZvcm0gY29tcHV0YXRpb24KICAgICAgfQogIH0KICBgYGAKCiMjIyMgNC4gS2VybmVsIExhdW5jaCBDb25maWd1cmF0aW9uCi0gQ29uZmlndXJlIHRoZSBrZXJuZWwgbGF1bmNoIHBhcmFtZXRlcnMgKG51bWJlciBvZiBibG9ja3MgYW5kIHRocmVhZHMgcGVyIGJsb2NrKSB0byBtYXhpbWl6ZSBHUFUgdXRpbGl6YXRpb24uCi0gRXhhbXBsZToKICBgYGBweXRob24KICBjb25zdCBpbnQgYmxvY2tfc2l6ZSA9IDI1NjsKICBjb25zdCBpbnQgbnVtX2Jsb2NrcyA9IChzaXplICsgYmxvY2tfc2l6ZSAtIDEpIC8gYmxvY2tfc2l6ZTsKICBteV9rZXJuZWw8PDxudW1fYmxvY2tzLCBibG9ja19zaXplPj4+KGlucHV0LCBvdXRwdXQsIHNpemUpOwogIGBgYAoKIyMjIyA1LiBFcnJvciBIYW5kbGluZyBhbmQgRGVidWdnaW5nCi0gSW1wbGVtZW50IGVycm9yIGNoZWNraW5nIGFmdGVyIENVREEgQVBJIGNhbGxzIGFuZCBrZXJuZWwgbGF1bmNoZXMgdXNpbmcgYGN1ZGFHZXRMYXN0RXJyb3IoKWAgdG8gY2F0Y2ggZXJyb3JzIGVhcmx5LgotIFVzZSBDVURBIGRlYnVnZ2luZyB0b29scyBsaWtlIGBjdWRhLW1lbWNoZWNrYCBhbmQgTlZJRElBIE5zaWdodCBmb3IgZGVidWdnaW5nIGFuZCBwcm9maWxpbmcuCi0gQmUgYXdhcmUgb2YgY29tbW9uIHN5bnRheCBlcnJvcnMgYW5kIG5hbWVzcGFjZSBpc3N1ZXMsIGFuZCBlbnN1cmUgdGhhdCB0aGUgQ1VEQSBjb2RlIGFkaGVyZXMgdG8gc3ludGF4IHJ1bGVzLgoKIyMjIyA2LiBJbnRlZ3JhdGluZyB3aXRoIFB5VG9yY2gKLSBEZWZpbmUgYSBQeXRob24gZnVuY3Rpb24gdGhhdCB3cmFwcyB0aGUgQ1VEQSBrZXJuZWwgY2FsbCBhbmQgaW50ZWdyYXRlcyBpdCBpbnRvIHRoZSBQeVRvcmNoIG1vZGVsLgotIEV4YW1wbGU6CiAgYGBgcHl0aG9uCiAgZGVmIG15X2N1c3RvbV9vcChpbnB1dCk6CiAgICAgIG91dHB1dCA9IHRvcmNoLnplcm9zX2xpa2UoaW5wdXQpCiAgICAgIG15X2tlcm5lbChpbnB1dC5kYXRhX3B0cjxmbG9hdD4oKSwgb3V0cHV0LmRhdGFfcHRyPGZsb2F0PigpLCBpbnB1dC5udW1lbCgpKQogICAgICByZXR1cm4gb3V0cHV0CiAgYGBgCgojIyMjIDcuIFRlc3RpbmcgYW5kIFZhbGlkYXRpb24KLSBWYWxpZGF0ZSB0aGUgY29ycmVjdG5lc3Mgb2YgdGhlIGN1c3RvbSBrZXJuZWwgYnkgY29tcGFyaW5nIGl0cyBvdXRwdXQgd2l0aCB0aGUgb3JpZ2luYWwgUHlUb3JjaCBvcGVyYXRvci4KLSBVc2UgcHJvZmlsaW5nIHRvb2xzIHRvIG1lYXN1cmUgcGVyZm9ybWFuY2UgaW1wcm92ZW1lbnRzIGFuZCBpZGVudGlmeSBmdXJ0aGVyIG9wdGltaXphdGlvbiBvcHBvcnR1bml0aWVzLgotIEVzdGFibGlzaCByZWZlcmVuY2Ugb3V0cHV0cyBmb3Iga25vd24tZ29vZCBpbnB1dHMgdG8gdmVyaWZ5IGNvcnJlY3RuZXNzLgotIENvbnNpZGVyIGZsb2F0aW5nLXBvaW50IGRpc2NyZXBhbmNpZXMgYW5kIHVzZSBhIHNtYWxsIGVwc2lsb24gZm9yIGFjY2VwdGFibGUgZGlmZmVyZW5jZXMuCgojIyMjIDguIENvbXBhdGliaWxpdHkgYW5kIENvbXB1dGUgQ2FwYWJpbGl0eQotIEVuc3VyZSB0aGF0IHRoZSBDVURBIGNvZGUgaXMgY29tcGF0aWJsZSB3aXRoIHRoZSB0YXJnZXQgR1BVJ3MgY29tcHV0ZSBjYXBhYmlsaXR5LgotIFVzZSBhcHByb3ByaWF0ZSBjb21waWxlciBmbGFncyBhbmQgY29uc2lkZXIgYnVpbGRpbmcgZm9yIG11bHRpcGxlIGNvbXB1dGUgY2FwYWJpbGl0aWVzIGlmIG5lY2Vzc2FyeS4KCiMjIyBFeGFtcGxlIENvZGUKSGVyZSBpcyBhbiBleGFtcGxlIG9mIGhvdyB0byByZXBsYWNlIGEgc2ltcGxlIGVsZW1lbnQtd2lzZSBhZGRpdGlvbiB3aXRoIGEgY3VzdG9tIENVREEga2VybmVsOgoKYGBgcHl0aG9uCmltcG9ydCB0b3JjaAppbXBvcnQgdG9yY2gubm4gYXMgbm4KZnJvbSB0b3JjaC51dGlscy5jcHBfZXh0ZW5zaW9uIGltcG9ydCBsb2FkX2lubGluZQoKIyBEZWZpbmUgdGhlIGN1c3RvbSBDVURBIGtlcm5lbCBmb3IgZWxlbWVudC13aXNlIGFkZGl0aW9uCmVsZW1lbnR3aXNlX2FkZF9zb3VyY2UgPSAiIiIKI2luY2x1ZGUgPHRvcmNoL2V4dGVuc2lvbi5oPgojaW5jbHVkZSA8Y3VkYV9ydW50aW1lLmg+CgpfX2dsb2JhbF9fIHZvaWQgZWxlbWVudHdpc2VfYWRkX2tlcm5lbChjb25zdCBmbG9hdCogYSwgY29uc3QgZmxvYXQqIGIsIGZsb2F0KiBvdXQsIGludCBzaXplKSB7CiAgICBpbnQgaWR4ID0gYmxvY2tJZHgueCAqIGJsb2NrRGltLnggKyB0aHJlYWRJZHgueDsKICAgIGlmIChpZHggPCBzaXplKSB7CiAgICAgICAgb3V0W2lkeF0gPSBhW2lkeF0gKyBiW2lkeF07CiAgICB9Cn0KCnRvcmNoOjpUZW5zb3IgZWxlbWVudHdpc2VfYWRkX2N1ZGEodG9yY2g6OlRlbnNvciBhLCB0b3JjaDo6VGVuc29yIGIpIHsKICAgIGF1dG8gc2l6ZSA9IGEubnVtZWwoKTsKICAgIGF1dG8gb3V0ID0gdG9yY2guemVyb3NfbGlrZShhKTsKCiAgICBjb25zdCBpbnQgYmxvY2tfc2l6ZSA9IDI1NjsKICAgIGNvbnN0IGludCBudW1fYmxvY2tzID0gKHNpemUgKyBibG9ja19zaXplIC0gMSkgLyBibG9ja19zaXplOwoKICAgIGVsZW1lbnR3aXNlX2FkZF9rZXJuZWw8PDxudW1fYmxvY2tzLCBibG9ja19zaXplPj4+KGEuZGF0YV9wdHI8ZmxvYXQ+KCksIGIuZGF0YV9wdHI8ZmxvYXQ+KCksIG91dC5kYXRhX3B0cjxmbG9hdD4oKSwgc2l6ZSk7CgogICAgcmV0dXJuIG91dDsKfQoiIiIKCmVsZW1lbnR3aXNlX2FkZF9jcHBfc291cmNlID0gKAogICAgInRvcmNoOjpUZW5zb3IgZWxlbWVudHdpc2VfYWRkX2N1ZGEodG9yY2g6OlRlbnNvciBhLCB0b3JjaDo6VGVuc29yIGIpOyIKKQoKIyBDb21waWxlIHRoZSBpbmxpbmUgQ1VEQSBjb2RlIGZvciBlbGVtZW50LXdpc2UgYWRkaXRpb24KZWxlbWVudHdpc2VfYWRkID0gbG9hZF9pbmxpbmUoCiAgICBuYW1lPSJlbGVtZW50d2lzZV9hZGQiLAogICAgY3BwX3NvdXJjZXM9ZWxlbWVudHdpc2VfYWRkX2NwcF9zb3VyY2UsCiAgICBjdWRhX3NvdXJjZXM9ZWxlbWVudHdpc2VfYWRkX3NvdXJjZSwKICAgIGZ1bmN0aW9ucz1bImVsZW1lbnR3aXNlX2FkZF9jdWRhIl0sCiAgICB2ZXJib3NlPVRydWUsCiAgICBleHRyYV9jZmxhZ3M9WyIiXSwKICAgIGV4dHJhX2xkZmxhZ3M9WyIiXSwKKQoKY2xhc3MgTW9kZWxOZXcobm4uTW9kdWxlKToKICAgIGRlZiBfX2luaXRfXyhzZWxmKSAtPiBOb25lOgogICAgICAgIHN1cGVyKCkuX19pbml0X18oKQogICAgICAgIHNlbGYuZWxlbWVudHdpc2VfYWRkID0gZWxlbWVudHdpc2VfYWRkCgogICAgZGVmIGZvcndhcmQoc2VsZiwgYSwgYik6CiAgICAgICAgcmV0dXJuIHNlbGYuZWxlbWVudHdpc2VfYWRkLmVsZW1lbnR3aXNlX2FkZF9jdWRhKGEsIGIpCmBgYAoKIyMjIEFkZGl0aW9uYWwgQmVzdCBQcmFjdGljZXMKLSAqKk9wdGltaXplIE1lbW9yeSBVc2FnZSoqOiBNaW5pbWl6ZSBkYXRhIHRyYW5zZmVycyBiZXR3ZWVuIGhvc3QgYW5kIGRldmljZSwgYW5kIHVzZSBzaGFyZWQgbWVtb3J5IHRvIHJlZHVjZSBnbG9iYWwgbWVtb3J5IGFjY2Vzcy4KLSAqKkF0b21pYyBPcGVyYXRpb25zKio6IFdoZW4gdXNpbmcgYXRvbWljIG9wZXJhdGlvbnMgbGlrZSBgYXRvbWljTWF4YCB3aXRoIGZsb2F0aW5nLXBvaW50IG51bWJlcnMsIGVuc3VyZSBjb3JyZWN0IHVzYWdlIGJ5IGZvbGxvd2luZyBiZXN0IHByYWN0aWNlcywgc3VjaCBhcyB1c2luZyBhcHByb3ByaWF0ZSBkYXRhIHR5cGVzIGFuZCBtaW5pbWl6aW5nIGNvbnRlbnRpb24uCi0gKipQZXJmb3JtYW5jZSBPcHRpbWl6YXRpb24qKjogTWF4aW1pemUgcGFyYWxsZWwgZXhlY3V0aW9uLCBvcHRpbWl6ZSBtZW1vcnkgYWNjZXNzIHBhdHRlcm5zLCBhbmQgdXNlIGNvbXBpbGVyIGZsYWdzIHRvIGVuaGFuY2UgcGVyZm9ybWFuY2UuCi0gKipOYW1lc3BhY2UgVXNhZ2UqKjogQXZvaWQgYWRkaW5nIGNsYXNzIGRlY2xhcmF0aW9ucyBvciBmdW5jdGlvbiBkZWZpbml0aW9ucyBkaXJlY3RseSB0byByZXNlcnZlZCBuYW1lc3BhY2VzIGxpa2UgYGN1ZGFgLiBVc2UgbmVzdGVkIG5hbWVzcGFjZXMgd2l0aGluIG5vbi1yZXNlcnZlZCBuYW1lc3BhY2VzIHRvIG9yZ2FuaXplIGNvZGUuCi0gKipOdW1lcmljYWwgUHJlY2lzaW9uKio6IEJlIGF3YXJlIG9mIGZsb2F0aW5nLXBvaW50IGFyaXRobWV0aWMgaXNzdWVzLCBzdWNoIGFzIG5vbi1hc3NvY2lhdGl2aXR5LCBhbmQgdXNlIGFwcHJvcHJpYXRlIHByZWNpc2lvbiBsZXZlbHMgZm9yIGNhbGN1bGF0aW9ucy4KLSAqKkRlYnVnZ2luZyBUb29scyoqOiBVdGlsaXplIHRvb2xzIGxpa2UgQ1VEQS1HREIgYW5kIE5WSURJQSBOc2lnaHQgZm9yIGRlYnVnZ2luZyBhbmQgcHJvZmlsaW5nIHRvIGVuc3VyZSBjb3JyZWN0bmVzcyBhbmQgcGVyZm9ybWFuY2UuCgpCeSBmb2xsb3dpbmcgdGhlc2UgaW5zdHJ1Y3Rpb25zLCB5b3UgY2FuIGVmZmVjdGl2ZWx5IHJlcGxhY2UgUHlUb3JjaCBvcGVyYXRvcnMgd2l0aCBjdXN0b20gQ1VEQSBrZXJuZWxzLCBlbnN1cmluZyBib3RoIHBlcmZvcm1hbmNlIGltcHJvdmVtZW50cyBhbmQgY29ycmVjdG5lc3Mu)
To optimize a given PyTorch model by replacing operators with custom CUDA kernels, follow these detailed instructions. Your goal is to achieve performance improvements while ensuring correctness. Name your optimized output architecture ‘ModelNew‘. Output the new model code in codeblocks. Please generate real code, NOT pseudocode, and ensure the code compiles and is fully functional. Do not include testing code.


### Steps to Create Custom CUDA Kernels


#### 1. Identify Operators to Replace
- Analyze the model to identify operators that can benefit from custom CUDA implementations.
- Consider operator fusion opportunities to combine multiple operations into a single kernel for efficiency.


#### 2. Setup and Compilation
- Use ‘torch.utils.cpp_extension.load_inline‘ to compile your CUDA code. This allows you to define and compile custom CUDA kernels directly within your Python script.
- Ensure all necessary CUDA and C++ headers are included to avoid missing includes errors.


#### 3. Implementing the CUDA Kernel
- Write the CUDA kernel code, ensuring it is optimized for parallel execution. Use shared memory to reduce global memory accesses and ensure coalesced memory access patterns.
- Example structure for a CUDA kernel:
 ‘‘‘cpp
 __global__ void my_kernel(const float* input, float* output, int size) {
 int idx = blockIdx.x * blockDim.x + threadIdx.x;
 if (idx < size) {
 // Perform computation
 }
 }
 ‘‘‘


#### 4. Kernel Launch Configuration
- Configure the kernel launch parameters (number of blocks and threads per block) to maximize GPU utilization.
- Example:
 ‘‘‘python
 const int block_size = 256;
 const int num_blocks = (size + block_size - 1) / block_size;
 my_kernel<<<num_blocks, block_size>>>(input, output, size);
 ‘‘‘


#### 5. Error Handling and Debugging
- Implement error checking after CUDA API calls and kernel launches using ‘cudaGetLastError()‘ to catch errors early.
- Use CUDA debugging tools like ‘cuda-memcheck‘ and NVIDIA Nsight for debugging and profiling.
- Be aware of common syntax errors and namespace issues, and ensure that the CUDA code adheres to syntax rules.


#### 6. Integrating with PyTorch
- Define a Python function that wraps the CUDA kernel call and integrates it into the PyTorch model.
- Example:
 ‘‘‘python
 def my_custom_op(input):
 output = torch.zeros_like(input)
 my_kernel(input.data_ptr<float>(), output.data_ptr<float>(), input.numel())
 return output
 ‘‘‘


#### 7. Testing and Validation
- Validate the correctness of the custom kernel by comparing its output with the original PyTorch operator.
- Use profiling tools to measure performance improvements and identify further optimization opportunities.
- Establish reference outputs for known-good inputs to verify correctness.
- Consider floating-point discrepancies and use a small epsilon for acceptable differences.


#### 8. Compatibility and Compute Capability
- Ensure that the CUDA code is compatible with the target GPU’s compute capability.
- Use appropriate compiler flags and consider building for multiple compute capabilities if necessary.


### Example Code
Here is an example of how to replace a simple element-wise addition with a custom CUDA kernel:


‘‘‘python
import torch
import torch.nn as nn
from torch.utils.cpp_extension import load_inline


# Define the custom CUDA kernel for element-wise addition
elementwise_add_source = """
#include <torch/extension.h>
#include <cuda_runtime.h>


__global__ void elementwise_add_kernel(const float* a, const float* b, float* out, int size) {
 int idx = blockIdx.x * blockDim.x + threadIdx.x;
 if (idx < size) {
 out[idx] = a[idx] + b[idx];
 }
}


torch::Tensor elementwise_add_cuda(torch::Tensor a, torch::Tensor b) {
 auto size = a.numel();
 auto out = torch.zeros_like(a);


 const int block_size = 256;
 const int num_blocks = (size + block_size - 1) / block_size;


 elementwise_add_kernel<<<num_blocks, block_size>>>(a.data_ptr<float>(), b.data_ptr<float>(), out.data_ptr<float>(), size);


 return out;
}
"""


elementwise_add_cpp_source = (
 "torch::Tensor elementwise_add_cuda(torch::Tensor a, torch::Tensor b);"
)


# Compile the inline CUDA code for element-wise addition
elementwise_add = load_inline(
 name="elementwise_add",
 cpp_sources=elementwise_add_cpp_source,
 cuda_sources=elementwise_add_source,
 functions=["elementwise_add_cuda"],
 verbose=True,
 extra_cflags=[""],
 extra_ldflags=[""],
)


class ModelNew(nn.Module):
 def __init__(self) -> None:
 super().__init__()
 self.elementwise_add = elementwise_add


 def forward(self, a, b):
 return self.elementwise_add.elementwise_add_cuda(a, b)
‘‘‘


### Additional Best Practices
- **Optimize Memory Usage**: Minimize data transfers between host and device, and use shared memory to reduce global memory access.
- **Atomic Operations**: When using atomic operations like ‘atomicMax‘ with floating-point numbers, ensure correct usage by following best practices, such as using appropriate data types and minimizing contention.
- **Performance Optimization**: Maximize parallel execution, optimize memory access patterns, and use compiler flags to enhance performance.
- **Namespace Usage**: Avoid adding class declarations or function definitions directly to reserved namespaces like ‘cuda‘. Use nested namespaces within non-reserved namespaces to organize code.
- **Numerical Precision**: Be aware of floating-point arithmetic issues, such as non-associativity, and use appropriate precision levels for calculations.
- **Debugging Tools**: Utilize tools like CUDA-GDB and NVIDIA Nsight for debugging and profiling to ensure correctness and performance.


By following these instructions, you can effectively replace PyTorch operators with custom CUDA kernels, ensuring both performance improvements and correctness.
[⬇](data:text/plain;base64,IyMjIEluc3RydWN0aW9uIGZvciBSZXBsYWNpbmcgUHlUb3JjaCBPcGVyYXRvcnMgd2l0aCBDdXN0b20gQ1VEQSBLZXJuZWxzCgpZb3VyIHRhc2sgaXMgdG8gb3B0aW1pemUgYSBnaXZlbiBQeVRvcmNoIG1vZGVsIGJ5IHJlcGxhY2luZyBjZXJ0YWluIG9wZXJhdG9ycyB3aXRoIGN1c3RvbSBDVURBIGtlcm5lbHMgdG8gYWNoaWV2ZSBwZXJmb3JtYW5jZSBpbXByb3ZlbWVudHMuIEZvbGxvdyB0aGUgc3RlcHMgYmVsb3cgdG8gZW5zdXJlIGEgc3VjY2Vzc2Z1bCBpbXBsZW1lbnRhdGlvbjoKCiMjIyMgU3RlcCAxOiBJZGVudGlmeSBPcGVyYXRvcnMgZm9yIFJlcGxhY2VtZW50Ci0gKipDcml0ZXJpYSBmb3IgU2VsZWN0aW9uKio6IENob29zZSBvcGVyYXRvcnMgdGhhdCBhcmUgY29tcHV0YXRpb25hbGx5IGludGVuc2l2ZSBhbmQgaGF2ZSBwb3RlbnRpYWwgZm9yIHBhcmFsbGVsaXphdGlvbi4gQ29uc2lkZXIgb3BlcmF0b3JzIHRoYXQgYXJlIGZyZXF1ZW50bHkgdXNlZCBpbiB0aGUgbW9kZWwncyBmb3J3YXJkIHBhc3MuCi0gKipPcGVyYXRvciBGdXNpb24qKjogTG9vayBmb3Igb3Bwb3J0dW5pdGllcyB0byBmdXNlIG11bHRpcGxlIG9wZXJhdG9ycyBpbnRvIGEgc2luZ2xlIENVREEga2VybmVsLCBzdWNoIGFzIGNvbWJpbmluZyBtYXRyaXggbXVsdGlwbGljYXRpb24gd2l0aCBhY3RpdmF0aW9uIGZ1bmN0aW9ucyAoZS5nLiwgbWF0bXVsICsgUmVMVSkuCgojIyMjIFN0ZXAgMjogSW1wbGVtZW50IEN1c3RvbSBDVURBIEtlcm5lbHMKLSAqKktlcm5lbCBTdHJ1Y3R1cmUqKjogRGVmaW5lIHlvdXIgQ1VEQSBrZXJuZWwgdXNpbmcgdGhlIGBfX2dsb2JhbF9fYCBzcGVjaWZpZXIuIEVuc3VyZSB0aGF0IGVhY2ggdGhyZWFkIGhhbmRsZXMgYSBzcGVjaWZpYyBwYXJ0IG9mIHRoZSBjb21wdXRhdGlvbi4gVXNlIGNvcnJlY3QgaW5kZXggY2FsY3VsYXRpb25zIHRvIGFjY2VzcyBkYXRhLgotICoqTWVtb3J5IE1hbmFnZW1lbnQqKjoKICAtIEFsbG9jYXRlIG1lbW9yeSBmb3IgaW5wdXQsIG91dHB1dCwgYW5kIGFueSBpbnRlcm1lZGlhdGUgZGF0YSBvbiB0aGUgR1BVIHVzaW5nIGBjdWRhTWFsbG9jYC4gVXNlIGBjdWRhTWVtY3B5YCB0byB0cmFuc2ZlciBkYXRhIGJldHdlZW4gaG9zdCBhbmQgZGV2aWNlLgogIC0gVXRpbGl6ZSBzaGFyZWQgbWVtb3J5IHRvIGNhY2hlIGZyZXF1ZW50bHkgYWNjZXNzZWQgZGF0YSBhbmQgcmVkdWNlIGdsb2JhbCBtZW1vcnkgYWNjZXNzZXMuCiAgLSBFbnN1cmUgY29hbGVzY2VkIGdsb2JhbCBtZW1vcnkgYWNjZXNzZXMgZm9yIGVmZmljaWVudCBtZW1vcnkgdHJhbnNhY3Rpb25zLgotICoqTnVtZXJpY2FsIFN0YWJpbGl0eSBhbmQgQm91bmRhcnkgQ29uZGl0aW9ucyoqOgogIC0gSW1wbGVtZW50IHZlcmlmaWNhdGlvbiBtZWNoYW5pc21zIHRvIGVuc3VyZSBudW1lcmljYWwgc3RhYmlsaXR5LiBVc2UgYF9faG9zdF9fIF9fZGV2aWNlX19gIGZ1bmN0aW9ucyBmb3IgdGVzdGluZyBvbiBib3RoIENQVSBhbmQgR1BVLgogIC0gSGFuZGxlIGJvdW5kYXJ5IGNvbmRpdGlvbnMgdG8gcHJldmVudCBvdXQtb2YtYm91bmRzIG1lbW9yeSBhY2Nlc3MuIEVuc3VyZSB0aGF0IHRocmVhZCBpbmRpY2VzIGFyZSB3aXRoaW4gdmFsaWQgcmFuZ2VzLgotICoqT3B0aW1pemF0aW9uIFRlY2huaXF1ZXMqKjoKICAtIFVzZSBzaGFyZWQgbWVtb3J5IHRvIHJlZHVjZSBnbG9iYWwgbWVtb3J5IGFjY2Vzc2VzIGFuZCBpbXByb3ZlIHBlcmZvcm1hbmNlLgogIC0gQ29uc2lkZXIgdXNpbmcgbWl4ZWQgcHJlY2lzaW9uIGFuZCBUZW5zb3IgQ29yZXMgZm9yIG1hdHJpeCBvcGVyYXRpb25zIHRvIGVuaGFuY2UgcGVyZm9ybWFuY2UuCiAgLSBBdm9pZCBkaXZlcmdlZCBleGVjdXRpb24gcGF0aHMgdG8gbWFpbnRhaW4gZWZmaWNpZW50IHBhcmFsbGVsIGV4ZWN1dGlvbi4KCiMjIyMgU3RlcCAzOiBJbnRlZ3JhdGUgQ1VEQSBLZXJuZWxzIGludG8gUHlUb3JjaCBNb2RlbAotICoqSW5saW5lIENvbXBpbGF0aW9uKio6IFVzZSBgdG9yY2gudXRpbHMuY3BwX2V4dGVuc2lvbi5sb2FkX2lubGluZWAgdG8gY29tcGlsZSB5b3VyIENVREEgY29kZSBhbmQgaW50ZWdyYXRlIGl0IGludG8gdGhlIFB5VG9yY2ggbW9kZWwuCi0gKipNb2RlbCBNb2RpZmljYXRpb24qKjogUmVwbGFjZSB0aGUgb3JpZ2luYWwgUHlUb3JjaCBvcGVyYXRvcnMgd2l0aCBjYWxscyB0byB5b3VyIGN1c3RvbSBDVURBIGZ1bmN0aW9ucy4gRW5zdXJlIHRoYXQgdGhlIG5ldyBtb2RlbCBhcmNoaXRlY3R1cmUgKGBNb2RlbE5ld2ApIGlzIGZ1bGx5IGZ1bmN0aW9uYWwgYW5kIGNvbXBpbGVzIHdpdGhvdXQgZXJyb3JzLgoKIyMjIyBTdGVwIDQ6IFRlc3RpbmcgYW5kIFZhbGlkYXRpb24KLSAqKkNvcnJlY3RuZXNzKio6IFZlcmlmeSB0aGF0IHRoZSBvdXRwdXQgb2YgdGhlIG9wdGltaXplZCBtb2RlbCBtYXRjaGVzIHRoZSBleHBlY3RlZCBvdXRwdXQgb2YgdGhlIG9yaWdpbmFsIG1vZGVsLiBVc2UgYSBzZXQgb2YgdGVzdCBjYXNlcyB0byBlbnN1cmUgYWNjdXJhY3kuCi0gKipQZXJmb3JtYW5jZSBFdmFsdWF0aW9uKio6IE1lYXN1cmUgdGhlIHJ1bnRpbWUgb2YgdGhlIG9wdGltaXplZCBtb2RlbCBhbmQgY29tcGFyZSBpdCB0byB0aGUgb3JpZ2luYWwuIEFpbSBmb3IgYSBzaWduaWZpY2FudCByZWR1Y3Rpb24gaW4gZXhlY3V0aW9uIHRpbWUuCi0gKipFZGdlIENhc2UgSGFuZGxpbmcqKjogRW5zdXJlIHRoYXQgdGhlIGtlcm5lbCBjb3JyZWN0bHkgaGFuZGxlcyBjYXNlcyB3aGVyZSB0aGUgbWF0cml4IHNpemUgaXMgbm90IGEgbXVsdGlwbGUgb2YgdGhlIGJsb2NrIHNpemUgYW5kIG90aGVyIHBvdGVudGlhbCBlZGdlIGNhc2VzLgoKIyMjIyBFeGFtcGxlIENvZGUKQmVsb3cgaXMgYW4gZXhhbXBsZSBvZiBob3cgdG8gZGVmaW5lIGFuZCBpbnRlZ3JhdGUgYSBjdXN0b20gQ1VEQSBrZXJuZWwgZm9yIGVsZW1lbnQtd2lzZSBhZGRpdGlvbjoKCmBgYHB5dGhvbgppbXBvcnQgdG9yY2gKaW1wb3J0IHRvcmNoLm5uIGFzIG5uCmZyb20gdG9yY2gudXRpbHMuY3BwX2V4dGVuc2lvbiBpbXBvcnQgbG9hZF9pbmxpbmUKCiMgRGVmaW5lIHRoZSBjdXN0b20gQ1VEQSBrZXJuZWwgZm9yIGVsZW1lbnQtd2lzZSBhZGRpdGlvbgplbGVtZW50d2lzZV9hZGRfc291cmNlID0gIiIiCiNpbmNsdWRlIDx0b3JjaC9leHRlbnNpb24uaD4KI2luY2x1ZGUgPGN1ZGFfcnVudGltZS5oPgoKX19nbG9iYWxfXyB2b2lkIGVsZW1lbnR3aXNlX2FkZF9rZXJuZWwoY29uc3QgZmxvYXQqIGEsIGNvbnN0IGZsb2F0KiBiLCBmbG9hdCogb3V0LCBpbnQgc2l6ZSkgewogICAgaW50IGlkeCA9IGJsb2NrSWR4LnggKiBibG9ja0RpbS54ICsgdGhyZWFkSWR4Lng7CiAgICBpZiAoaWR4IDwgc2l6ZSkgewogICAgICAgIG91dFtpZHhdID0gYVtpZHhdICsgYltpZHhdOwogICAgfQp9Cgp0b3JjaDo6VGVuc29yIGVsZW1lbnR3aXNlX2FkZF9jdWRhKHRvcmNoOjpUZW5zb3IgYSwgdG9yY2g6OlRlbnNvciBiKSB7CiAgICBhdXRvIHNpemUgPSBhLm51bWVsKCk7CiAgICBhdXRvIG91dCA9IHRvcmNoOjp6ZXJvc19saWtlKGEpOwoKICAgIGNvbnN0IGludCBibG9ja19zaXplID0gMjU2OwogICAgY29uc3QgaW50IG51bV9ibG9ja3MgPSAoc2l6ZSArIGJsb2NrX3NpemUgLSAxKSAvIGJsb2NrX3NpemU7CgogICAgZWxlbWVudHdpc2VfYWRkX2tlcm5lbDw8PG51bV9ibG9ja3MsIGJsb2NrX3NpemU+Pj4oYS5kYXRhX3B0cjxmbG9hdD4oKSwgYi5kYXRhX3B0cjxmbG9hdD4oKSwgb3V0LmRhdGFfcHRyPGZsb2F0PigpLCBzaXplKTsKCiAgICByZXR1cm4gb3V0Owp9CiIiIgoKZWxlbWVudHdpc2VfYWRkX2NwcF9zb3VyY2UgPSAoCiAgICAidG9yY2g6OlRlbnNvciBlbGVtZW50d2lzZV9hZGRfY3VkYSh0b3JjaDo6VGVuc29yIGEsIHRvcmNoOjpUZW5zb3IgYik7IgopCgojIENvbXBpbGUgdGhlIGlubGluZSBDVURBIGNvZGUgZm9yIGVsZW1lbnQtd2lzZSBhZGRpdGlvbgplbGVtZW50d2lzZV9hZGQgPSBsb2FkX2lubGluZSgKICAgIG5hbWU9ImVsZW1lbnR3aXNlX2FkZCIsCiAgICBjcHBfc291cmNlcz1lbGVtZW50d2lzZV9hZGRfY3BwX3NvdXJjZSwKICAgIGN1ZGFfc291cmNlcz1lbGVtZW50d2lzZV9hZGRfc291cmNlLAogICAgZnVuY3Rpb25zPVsiZWxlbWVudHdpc2VfYWRkX2N1ZGEiXSwKICAgIHZlcmJvc2U9VHJ1ZSwKICAgIGV4dHJhX2NmbGFncz1bIiJdLAogICAgZXh0cmFfbGRmbGFncz1bIiJdLAopCgpjbGFzcyBNb2RlbE5ldyhubi5Nb2R1bGUpOgogICAgZGVmIF9faW5pdF9fKHNlbGYpIC0+IE5vbmU6CiAgICAgICAgc3VwZXIoKS5fX2luaXRfXygpCiAgICAgICAgc2VsZi5lbGVtZW50d2lzZV9hZGQgPSBlbGVtZW50d2lzZV9hZGQKCiAgICBkZWYgZm9yd2FyZChzZWxmLCBhLCBiKToKICAgICAgICByZXR1cm4gc2VsZi5lbGVtZW50d2lzZV9hZGQuZWxlbWVudHdpc2VfYWRkX2N1ZGEoYSwgYikKYGBgCgojIyMjIENvbnN0cmFpbnRzCi0gRW5zdXJlIHRoYXQgdGhlIG9wdGltaXplZCBtb2RlbCBtYWludGFpbnMgdGhlIHNhbWUgYWNjdXJhY3kgYXMgdGhlIG9yaWdpbmFsLgotIFRoZSBjdXN0b20gQ1VEQSBrZXJuZWxzIHNob3VsZCBiZSBvcHRpbWl6ZWQgZm9yIHBlcmZvcm1hbmNlLCBtaW5pbWl6aW5nIGV4ZWN1dGlvbiB0aW1lIGFuZCBtYXhpbWl6aW5nIEdQVSB1dGlsaXphdGlvbi4KCkJ5IGZvbGxvd2luZyB0aGVzZSBpbnN0cnVjdGlvbnMsIHlvdSB3aWxsIGJlIGFibGUgdG8gZWZmZWN0aXZlbHkgcmVwbGFjZSBQeVRvcmNoIG9wZXJhdG9ycyB3aXRoIGN1c3RvbSBDVURBIGtlcm5lbHMsIGFjaGlldmluZyBzaWduaWZpY2FudCBwZXJmb3JtYW5jZSBpbXByb3ZlbWVudHMgd2hpbGUgbWFpbnRhaW5pbmcgbW9kZWwgYWNjdXJhY3ku)
### Instruction for Replacing PyTorch Operators with Custom CUDA Kernels


Your task is to optimize a given PyTorch model by replacing certain operators with custom CUDA kernels to achieve performance improvements. Follow the steps below to ensure a successful implementation:


#### Step 1: Identify Operators for Replacement
- **Criteria for Selection**: Choose operators that are computationally intensive and have potential for parallelization. Consider operators that are frequently used in the model’s forward pass.
- **Operator Fusion**: Look for opportunities to fuse multiple operators into a single CUDA kernel, such as combining matrix multiplication with activation functions (e.g., matmul + ReLU).


#### Step 2: Implement Custom CUDA Kernels
- **Kernel Structure**: Define your CUDA kernel using the ‘__global__‘ specifier. Ensure that each thread handles a specific part of the computation. Use correct index calculations to access data.
- **Memory Management**:
 - Allocate memory for input, output, and any intermediate data on the GPU using ‘cudaMalloc‘. Use ‘cudaMemcpy‘ to transfer data between host and device.
 - Utilize shared memory to cache frequently accessed data and reduce global memory accesses.
 - Ensure coalesced global memory accesses for efficient memory transactions.
- **Numerical Stability and Boundary Conditions**:
 - Implement verification mechanisms to ensure numerical stability. Use ‘__host__ __device__‘ functions for testing on both CPU and GPU.
 - Handle boundary conditions to prevent out-of-bounds memory access. Ensure that thread indices are within valid ranges.
- **Optimization Techniques**:
 - Use shared memory to reduce global memory accesses and improve performance.
 - Consider using mixed precision and Tensor Cores for matrix operations to enhance performance.
 - Avoid diverged execution paths to maintain efficient parallel execution.


#### Step 3: Integrate CUDA Kernels into PyTorch Model
- **Inline Compilation**: Use ‘torch.utils.cpp_extension.load_inline‘ to compile your CUDA code and integrate it into the PyTorch model.
- **Model Modification**: Replace the original PyTorch operators with calls to your custom CUDA functions. Ensure that the new model architecture (‘ModelNew‘) is fully functional and compiles without errors.


#### Step 4: Testing and Validation
- **Correctness**: Verify that the output of the optimized model matches the expected output of the original model. Use a set of test cases to ensure accuracy.
- **Performance Evaluation**: Measure the runtime of the optimized model and compare it to the original. Aim for a significant reduction in execution time.
- **Edge Case Handling**: Ensure that the kernel correctly handles cases where the matrix size is not a multiple of the block size and other potential edge cases.


#### Example Code
Below is an example of how to define and integrate a custom CUDA kernel for element-wise addition:


‘‘‘python
import torch
import torch.nn as nn
from torch.utils.cpp_extension import load_inline


# Define the custom CUDA kernel for element-wise addition
elementwise_add_source = """
#include <torch/extension.h>
#include <cuda_runtime.h>


__global__ void elementwise_add_kernel(const float* a, const float* b, float* out, int size) {
 int idx = blockIdx.x * blockDim.x + threadIdx.x;
 if (idx < size) {
 out[idx] = a[idx] + b[idx];
 }
}


torch::Tensor elementwise_add_cuda(torch::Tensor a, torch::Tensor b) {
 auto size = a.numel();
 auto out = torch::zeros_like(a);


 const int block_size = 256;
 const int num_blocks = (size + block_size - 1) / block_size;


 elementwise_add_kernel<<<num_blocks, block_size>>>(a.data_ptr<float>(), b.data_ptr<float>(), out.data_ptr<float>(), size);


 return out;
}
"""


elementwise_add_cpp_source = (
 "torch::Tensor elementwise_add_cuda(torch::Tensor a, torch::Tensor b);"
)


# Compile the inline CUDA code for element-wise addition
elementwise_add = load_inline(
 name="elementwise_add",
 cpp_sources=elementwise_add_cpp_source,
 cuda_sources=elementwise_add_source,
 functions=["elementwise_add_cuda"],
 verbose=True,
 extra_cflags=[""],
 extra_ldflags=[""],
)


class ModelNew(nn.Module):
 def __init__(self) -> None:
 super().__init__()
 self.elementwise_add = elementwise_add


 def forward(self, a, b):
 return self.elementwise_add.elementwise_add_cuda(a, b)
‘‘‘


#### Constraints
- Ensure that the optimized model maintains the same accuracy as the original.
- The custom CUDA kernels should be optimized for performance, minimizing execution time and maximizing GPU utilization.


By following these instructions, you will be able to effectively replace PyTorch operators with custom CUDA kernels, achieving significant performance improvements while maintaining model accuracy.

## Appendix N Number of reflection LM calls made by GEPA during optimization

Table 4: Total number of calls made by GEPA to reflection LM during optimization.

| Benchmark Name | Num Reflection Calls | Num Reflection Calls |
| --- | --- | --- |
|  | GPT-4.1-Mini | Qwen3-8B |
| AIME-2025 | 24 | 90 |
| LiveBench-Math | 34 | 38 |
| HotpotQA | 69 | 64 |
| IFBench | 21 | 17 |
| Hover | 92 | 50 |
| PUPA | 46 | 38 |
