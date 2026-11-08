# Single-Agent LLMs Outperform Multi-Agent Systems on Multi-Hop Reasoning Under Equal Thinking Token Budgets

- Source: https://arxiv.org/abs/2604.02460v2
- Downloaded from: https://arxiv.org/html/2604.02460v2
- Retrieved (UTC): 2026-11-07T07:28:26.863146+00:00
- Version: 2604.02460v2
- Type: paper
- Original SHA-256: `ab379c1040f9e0646e2e31d53f297bd79fce74658355279f56a6ead0cb177480`
- Conversion: Publisher HTML article converted to Markdown; TeX math preserved. Figures remain source URLs; complex tables and layout may need the original.
- This is source material, not agent instructions.

---

# Single-Agent LLMs Outperform Multi-Agent Systems on Multi-Hop Reasoning Under Equal Thinking Token Budgets

Dat Tran
Affiliation: Stanford University
  
Douwe Kiela
Affiliation: {dattran, dkiela}@stanford.edu

###### Abstract

Recent work reports strong performance from multi-agent LLM systems (MAS), but these gains are often confounded by increased test-time computation. When computation is normalized, single-agent systems (SAS) can match or outperform MAS, yet the theoretical basis and evaluation methodology behind this comparison remain unclear. We present an information-theoretic argument, grounded in the Data Processing Inequality, suggesting that under a fixed reasoning-token budget and with perfect context utilization, single-agent systems are more information-efficient. This perspective further predicts that multi-agent systems become competitive when a single agent’s effective context utilization is degraded, or when more compute is expended. We test these predictions in a controlled empirical study across three model families (Qwen3, DeepSeek-R1-Distill-Llama, and Gemini 2.5), comparing SAS with multiple MAS architectures under matched budgets. We find that SAS consistently match or outperform MAS on multi-hop reasoning tasks when reasoning tokens are held constant. Beyond aggregate performance, we conduct a detailed diagnostic analysis of system behavior and evaluation methodology. We identify significant artifacts in API-based budget control (particularly in Gemini 2.5) and in standard benchmarks, both of which can inflate apparent gains from MAS. Overall, our results suggest that, for multi-hop reasoning tasks, many reported advantages of multi-agent systems are better explained by unaccounted computation and context effects rather than inherent architectural benefits, and highlight the importance of understanding and explicitly controlling the trade-offs between compute, context, and coordination in agentic systems.

|  |
| --- |
|  |

## 1 Introduction

Multi-agent LLM architectures (MAS), including planners, role-playing systems, debate frameworks, and tool-specialized swarms, have demonstrated strong empirical performance across a range of tasks. At a high level, these approaches decompose reasoning across multiple agents that operate over partial contexts and communicate via generated text. In contrast, single-agent systems (SAS) perform reasoning within a single, unified context, relying on internal token-level computation rather than explicit inter-agent communication.

However, comparisons between MAS and SAS are often confounded by differences in test-time computation. MAS typically consume more tokens through longer reasoning traces or multiple agent interactions, making it unclear whether their gains arise from architectural advantages or simply from increased compute. Recent budget-aware studies suggest that, when computation is normalized, many such strategies underperform strong single-agent baselines ([Wang et al., 2024](https://arxiv.org/html/2604.02460v2#bib.bib1); [Han et al., 2025](https://arxiv.org/html/2604.02460v2#bib.bib2)).

In this work, we revisit this question under an explicit focus on *thinking token budgets*, which we define as the total number of tokens used for intermediate reasoning, excluding prompts and final answers. We focus on multi-hop reasoning tasks and ask three central questions: *why* might SAS outperform MAS under fixed budgets, *when* do MAS become competitive, and *how* should such comparisons be conducted reliably?

We first provide an information-theoretic perspective, based on the Data Processing Inequality, suggesting that under fixed token budgets, multi-agent decompositions introduce additional communication bottlenecks that can lead to information loss. This perspective also clarifies when MAS can be advantageous: specifically, when a single agent’s effective context utilization is degraded (e.g., due to long or noisy contexts), or when MAS benefit from additional unaccounted computation through extended interactions.

We then test these predictions in a controlled empirical study across three model families (Qwen3, DeepSeek-R1-Distill-Llama, and Gemini 2.5), comparing SAS and multiple MAS architectures under matched reasoning-token budgets. We find that SAS consistently match or outperform MAS on multi-hop reasoning tasks under these constraints.

Beyond aggregate performance, we perform a detailed diagnostic analysis of evaluation methodology and model behavior. We identify (i) artifacts in API-based budget control that distort effective computation, (ii) benchmark vulnerabilities exposed through paraphrasing, and (iii) systematic differences in failure modes across architectures.

We summarize our contributions as follows:

- •

  An information-theoretic perspective on SAS vs. MAS under fixed budgets, explaining how multi-agent decompositions introduce additional communication bottlenecks (§[3](https://arxiv.org/html/2604.02460v2#S3 "3 Theoretical justification ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")).
- •

  A controlled empirical comparison across multiple model families, showing that SAS consistently match or outperform MAS under matched reasoning-token budgets on multi-hop reasoning tasks (§[5](https://arxiv.org/html/2604.02460v2#S5 "5 Results ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")).
- •

  A diagnostic analysis of evaluation methodology, uncovering artifacts in API-based budgeting, benchmark vulnerabilities, and failure modes (§[G](https://arxiv.org/html/2604.02460v2#A7 "Appendix G Diagnostic: On Gemini Thought Token Accounting ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"), §[A](https://arxiv.org/html/2604.02460v2#A1 "Appendix A Paraphrasing Ablation Study ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"), §[B](https://arxiv.org/html/2604.02460v2#A2 "Appendix B Error Analysis ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")).

## 2 Related Work

##### Budget-Controlled Evaluation:

Recent work has emphasized that comparisons between reasoning strategies are often confounded by unequal test-time computation. Reasoning in Token Economies and follow-up work show that many elaborate prompting or search strategies fail to outperform simpler baselines once token or compute budgets are matched ([Wang et al., 2024](https://arxiv.org/html/2604.02460v2#bib.bib1); [Han et al., 2025](https://arxiv.org/html/2604.02460v2#bib.bib2); [Li et al., 2025b](https://arxiv.org/html/2604.02460v2#bib.bib3); [Wen et al., 2025](https://arxiv.org/html/2604.02460v2#bib.bib4)). Our work is aligned with this line, but differs in two ways: we treat only *thinking tokens* as the controlled resource, and we study the comparison between single-agent and multi-agent architectures rather than budget allocation within one architecture.

##### When and why MAS helps:

Concurrent works sharpen the picture that MAS gains are dependent on regime and implementation. [Anthropic (2025)](https://arxiv.org/html/2604.02460v2#bib.bib23) argues that much of the apparent advantage of MAS comes from increased compute. On the other hand, [Kim et al. (2025)](https://arxiv.org/html/2604.02460v2#bib.bib18) shows that once computation is normalized, agentic benefits tend to concentrate in weaker model or harder-regime settings and diminish (or even reverse) as base model capability increases, highlighting coordination overhead as a first-order constraint. Additionally, [Cemri et al. (2025)](https://arxiv.org/html/2604.02460v2#bib.bib19) introduce multi-agent tracing and a failure taxonomy that explains how orchestration can induce drift, information loss, or misleading improvements from evaluation artifacts. These failure modes align with our observed over-exploration, aggregation/extraction errors, and opaque API accounting. Finally, [Ke et al. (2026)](https://arxiv.org/html/2604.02460v2#bib.bib20) study learned orchestration via holistic configuration selection and propose controlled benchmarking axes for MAS, emphasizing that improvements depend on task structure and verification protocols rather than MAS being universally superior. Taken together, these results motivate the core design of our study: (i) strictly control the primary confound (thinking token budget), (ii) diagnose how coordination and communication affect accuracy, and (iii) characterize concrete regimes (e.g., degraded context) where MAS or hybrid designs can become competitive.

##### SAS vs. MAS:

Empirical evidence increasingly suggests that as frontier models improve, the benefits of orchestration diminish and SAS can match or surpass MAS ([Gao et al., 2025](https://arxiv.org/html/2604.02460v2#bib.bib5)). In education analytics, SAS with few-shot prompting outperformed MAS for reflection assessment ([Li et al., 2025a](https://arxiv.org/html/2604.02460v2#bib.bib6)). Benchmarks for collaborative agents (e.g., MedAgentBoard) further reveal that MAS advantages are task-specific and not universal ([Zhu et al., 2025](https://arxiv.org/html/2604.02460v2#bib.bib7)). Our findings complement these studies under stricter compute controls.

##### Multi-agent collaboration mechanisms:

Prior work has proposed many ways to structure collaboration between LLMs, including debate, role specialization, ensemble/self-consistency, and reflection ([Du et al., 2024](https://arxiv.org/html/2604.02460v2#bib.bib15); [Zhang et al., 2023](https://arxiv.org/html/2604.02460v2#bib.bib16); [Li et al., 2024](https://arxiv.org/html/2604.02460v2#bib.bib14); [Shinn et al., 2023](https://arxiv.org/html/2604.02460v2#bib.bib17)). Rather than treating MAS as a single design, we evaluate several representative mechanisms under a common matched-budget framework. This allows us to separate gains due to architectural structure from gains due to simply spending more computation.

##### Context length, degradation, and long-context utilization:

Independent of architecture, modern LLMs do not use long context perfectly: attention dilution, noise sensitivity, context confusion, and positional bias can all degrade reasoning even when relevant information is present. Recent work has formalized these effects from several angles, including context degradation and long-context stress testing ([Du et al., 2025](https://arxiv.org/html/2604.02460v2#bib.bib11); [Li et al., 2025c](https://arxiv.org/html/2604.02460v2#bib.bib12); [Lu et al., 2024](https://arxiv.org/html/2604.02460v2#bib.bib13)), failures that are sensitive to their position such as the lost in the middle effect ([Liu et al., 2024](https://arxiv.org/html/2604.02460v2#bib.bib21)), and broader reliability decay as input length grows ([Hong et al., 2025](https://arxiv.org/html/2604.02460v2#bib.bib22)). We connect this literature to the SAS-versus-MAS question by explicitly modeling degraded effective context and by testing when structured multi-agent pipelines become competitive as single-agent context use deteriorates.

## 3 Theoretical justification

This section aims to formalize the comparison between single-agent and multi-agent systems under a thinking-token budget, and explain both *why* single agents often perform at least as well and *when* multi-agent designs can help.

Let $Y$ denote the correct answer, $C$ the full context available to a single-agent LLM (including prior reasoning and intermediate states), and $M=g(C)$ the messages or summaries passed between agents in a multi-agent system.

Since $M$ is a (possibly stochastic) function of $C$, we have the Markov chain

|  |  |  |
| --- | --- | --- |
|  | $$Y\longleftrightarrow C\longleftrightarrow M.$$ |  |

By the Data Processing Inequality (DPI) ([Cover and Thomas, 2006](https://arxiv.org/html/2604.02460v2#bib.bib10)),

|  |  |  |
| --- | --- | --- |
|  | $$I(Y;C)\geq I(Y;M),$$ |  |

and equivalently,

|  |  |  |
| --- | --- | --- |
|  | $$H(Y\mid M)\geq H(Y\mid C).$$ |  |

Thus, conditioning on $M$ leaves more residual uncertainty about $Y$ than conditioning on $C$; the multi-agent architecture cannot increase mutual information with the true answer.

Now we compare architectures through their *minimum achievable prediction error*. For any observable representation $X$, let $\mathcal{D}_{X}$ denote the set of all possibly randomized estimators $\delta(\hat{y}\mid x)$, and define

|  |  |  |
| --- | --- | --- |
|  | $$P_{e}(X)\;=\;\inf_{\delta\in\mathcal{D}_{X}}\Pr[\hat{Y}\neq Y],\qquad\hat{Y}\sim\delta(\cdot\mid X).$$ |  |

Thus, $P_{e}(X)$ is the smallest achievable error probability for a predictor that only observes $X$.

Since $M$ is generated from $C$ through a fixed channel $q(m\mid c)$, taking any estimator $\delta_{M}\in\mathcal{D}_{M}$ that predicts from $M$ would induce an estimator based on $C$ via

|  |  |  |
| --- | --- | --- |
|  | $$\delta_{C}^{\delta_{M}}(\hat{y}\mid c)=\sum_{m}q(m\mid c)\,\delta_{M}(\hat{y}\mid m).$$ |  |

This induced estimator first samples the same message $M$ that the multi-agent pipeline would generate from $C$, and then applies the same downstream decision rule $\delta_{M}$. Therefore it reproduces the same joint distribution over $(Y,\hat{Y})$ as the original predictor based on $M$:

|  |  |  |
| --- | --- | --- |
|  | $$\Pr[\hat{Y}_{\delta_{C}^{\delta_{M}}}\neq Y]=\Pr[\hat{Y}_{\delta_{M}}\neq Y].$$ |  |

Since every such induced estimator belongs to $\mathcal{D}_{C}$,

|  |  |  |  |
| --- | --- | --- | --- |
|  | $\displaystyle P_{e}(C)$ | $\displaystyle=\inf_{\delta\in\mathcal{D}_{C}}\Pr[\hat{Y}_{\delta}\neq Y]$ |  |
|  |  |  |  |
| --- | --- | --- | --- |
|  |  | $\displaystyle\leq\inf_{\delta_{M}\in\mathcal{D}_{M}}\Pr[\hat{Y}_{\delta_{C}^{\delta_{M}}}\neq Y]$ |  |
|  |  |  |  |
| --- | --- | --- | --- |
|  |  | $\displaystyle=\inf_{\delta_{M}\in\mathcal{D}_{M}}\Pr[\hat{Y}_{\delta_{M}}\neq Y]$ |  |
|  |  |  |  |
| --- | --- | --- | --- |
|  |  | $\displaystyle=P_{e}(M).$ |  |

Hence, the single-agent system (with full access to $C$) is information-theoretically guaranteed to perform at least as well as the multi-agent system operating on $M=g(C)$.

### 3.1 Context degradation

In practice, however, modern LLMs may not utilize all of $C$ equally well. To model this, let $\tilde{C}_{\alpha}=T_{\alpha}(C)$ denote the *effective context* available to the single-agent predictor under degradation level $\alpha\geq 0$, where $T_{\alpha}$ may represent deletion, masking, substitution noise, distractor injection, or more generally any transformation that makes relevant information harder to recover. We assume $T_{0}$ is the identity map and that degradation is monotone in the sense that for $0\leq\alpha_{1}\leq\alpha_{2}$, there exists a stochastic map $S_{\alpha_{1}\to\alpha_{2}}$ such that

|  |  |  |
| --- | --- | --- |
|  | $$\tilde{C}_{\alpha_{2}}=S_{\alpha_{1}\to\alpha_{2}}(\tilde{C}_{\alpha_{1}}).$$ |  |

Then we obtain the Markov chain

|  |  |  |
| --- | --- | --- |
|  | $$Y\longleftrightarrow C\longleftrightarrow\tilde{C}_{\alpha_{1}}\longleftrightarrow\tilde{C}_{\alpha_{2}},$$ |  |

and therefore, by the Data Processing Inequality,

|  |  |  |
| --- | --- | --- |
|  | $$I(Y;\tilde{C}_{\alpha_{1}})\geq I(Y;\tilde{C}_{\alpha_{2}}).$$ |  |

Equivalently, residual uncertainty is non-decreasing with degradation:

|  |  |  |
| --- | --- | --- |
|  | $$H(Y\mid\tilde{C}_{\alpha_{1}})\leq H(Y\mid\tilde{C}_{\alpha_{2}}).$$ |  |

The same argument as above implies that heavier degradation cannot improve the best achievable prediction error. Hence

|  |  |  |
| --- | --- | --- |
|  | $$P_{e}(\tilde{C}_{\alpha_{1}})\leq P_{e}(\tilde{C}_{\alpha_{2}}).$$ |  |

Suppose a multi-agent architecture constructs a collection of intermediate messages

|  |  |  |
| --- | --- | --- |
|  | $$M_{\alpha}=g_{\alpha}(C),$$ |  |

where $g_{\alpha}$ may correspond to a structured transformation of the original context. The original DPI comparison only guarantees $I(Y;C)\geq I(Y;M_{\alpha})$, not $I(Y;\tilde{C}_{\alpha})\geq I(Y;M_{\alpha})$. In other words, once effective single-agent context utilization deteriorates sufficiently, a well-designed MAS may recover task-relevant information more reliably than a degraded single pass, even though it still cannot exceed the ideal information available in $C$.

This yields a concrete prediction for our experiments. Under low degradation, SAS should dominate because it retains access to the richest available representation of the task. As degradation increases, the SAS advantage may shrink, since the practical single-agent predictor now operates on an increasingly lossy effective context. In sufficiently degraded regimes, MAS and SAS may become comparable, and carefully structured MAS pipelines may occasionally surpass SAS by imposing useful factorization, filtering, or verification structure on the reasoning process.

## 4 Approach

### 4.1 Tasks and Datasets

We evaluate on FRAMES ([Krishna et al., 2025](https://arxiv.org/html/2604.02460v2#bib.bib8)) and MuSiQue ([Trivedi et al., 2022](https://arxiv.org/html/2604.02460v2#bib.bib9)), both are multi-hop world knowledge questions with concise ground truth answers. For MuSiQue we filter to only 4-hop questions, which are complex enough to challenge both SAS and MAS. We report accuracy via an LLM-as-judge rubric checking whether the ground truth appears or is semantically present in the model answer (see §[4.4](https://arxiv.org/html/2604.02460v2#S4.SS4 "4.4 Evaluation Metric ‣ 4 Approach ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")).

### 4.2 Single-agent architecture

Our SAS pipeline is a single, direct pass. For a given question, the model receives a system prompt instructing it to “think step by step, then answer”. It is allocated the *entire* global thinking budget $B$ for a single call. The final answer is then extracted by taking the text that follows the </think> tag or Gemini API call.

##### SAS with Longer Thinking Variant (SAS-L).

In §[G](https://arxiv.org/html/2604.02460v2#A7 "Appendix G Diagnostic: On Gemini Thought Token Accounting ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") we show that, for Gemini-2.5 (Flash/Pro), the *visible* thought text produced by SAS tends to plateau well below the requested budget, while MAS surfaces more visible thought content under the same requested budget $B$, due to multiple calls. To make SAS produce more thinking output, we introduce a SAS variant that gently encourages more internal reasoning before answering, without changing budget $B$ or any other compute knobs.

The variant keeps the same single-call SAS pipeline and the same requested thinking budget $B$ but augments the user message with a short, structured pre-answer analysis scaffold. Concretely, we add an extra instruction that asks the model to (i) identify ambiguities, (ii) propose interpretations, (iii) evaluate and select one, and only then (iv) answer.

### 4.3 Multi-agent Architectures

Our study includes one primary multi-agent baseline, Sequential, together with four additional multi-agent variants: Subtask-parallel, Parallel-roles, Debate, and Ensemble. All architectures operate under the same global thinking-token budget $B$, with planner and aggregator components kept near budget-neutral whenever possible.

Our full multi-agent family is as follows:

1. 1.

   Sequential: A planner decomposes the question into ordered steps, the budget is split across sequential workers, and an aggregator synthesizes the intermediate outputs.
2. 2.

   Subtask-parallel: A planner proposes a small set of approximately independent subtasks, workers solve them in parallel under equal budget splits, and an aggregator combines their outputs.
3. 3.

   Parallel-roles: The full question is sent to role-specialized workers, Solver, Fact Extractor, Skeptic, and Second Solver. The Solver and Second Solver independently attempt to answer the question directly; the Fact Extractor identifies the key entities, constraints, and intermediate facts; and the Skeptic highlights possible pitfalls or alternative interpretations. The total budget $B$ is divided evenly across these roles. At the end, an aggregator synthesizes their outputs.
4. 4.

   Debate: Two debaters first answer independently, then critique one another. The total budget $B$ is divided evenly across these roles. Finally, an aggregator returns the final answer from the candidate answers and critiques.
5. 5.

   Ensemble: Multiple workers answer independently under equal budget splits with higher sampling temperature, and a judge selects the best candidate answer.

Single-agent (SAS)
  

Question + full context
$\Downarrow$
one internal reasoning trajectory
with budget $B$
$\Downarrow$
final answer

Sequential MAS
  

Question + full context
$\Downarrow$
planner
$\Downarrow$
step 1 $\rightarrow$ step 2 $\rightarrow\cdots\rightarrow$ step $k$
each uses budget $B/k$, passing messages forward
$\Downarrow$
aggregator
$\Downarrow$
final answer

Figure 1: Sequential is the closest MAS comparator to SAS. Both are serial reasoning pipelines over the same question and the same global budget. The essential difference is that Sequential MAS externalizes intermediate reasoning into explicit messages between steps, whereas SAS keeps those intermediates latent within one continuous reasoning trajectory.

We obtain results for all of these multi-agent architectures and use Sequential as the main comparison against SAS for deeper analysis, as it is the cleanest multi-agent analogue of single-agent reasoning. Both SAS and Sequential attempt to solve the entire question through a serial reasoning process over one evolving trajectory. The key difference is that SAS keeps intermediate reasoning latent within a single chain, while Sequential externalizes intermediate states as explicit messages passed between steps. This makes Sequential the most appropriate architecture for the paper’s core SAS-versus-MAS comparison: it isolates the cost and benefit of message-passing without simultaneously adding large amounts of diversity, specialization, or adversarial interaction. See Figure [1](https://arxiv.org/html/2604.02460v2#S4.F1 "Figure 1 ‣ 4.3 Multi-agent Architectures ‣ 4 Approach ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").

### 4.4 Evaluation Metric

We follow the standard *LLM-as-a-judge* paradigm, in which a separate evaluation model scores candidate answers according to a fixed natural-language rubric. Concretely, for each example we provide the judge with the question, the model’s prediction, and the ground-truth answer, together with a short decision rubric that specifies what counts as a correct answer (semantic equivalence, allowance for paraphrases, handling of minor formatting differences, etc.). The judge’s rubric and prompt are used for all datasets and for both SAS and MAS configurations, so any differences in accuracy arise from the systems being evaluated, not from the judge.11
1
Our design is inspired by the rubric-based evaluation setup in [Krishna et al. (2025)](https://arxiv.org/html/2604.02460v2#bib.bib8), adapted to our open-ended answers.

Table 1: Single-agent (SAS) vs. multi-agent architectures under matched *thinking-token* budgets on FRAMES and MuSiQue. SAS-L is the “longer thinking” single-agent variant. “Seq” denotes our primary Sequential multi-agent baseline. “Sub”, “Roles”, “Deb”, and “Ens” denote subtask-parallel, parallel roles, debate, and ensemble architectures, respectively. Bold indicates the highest-accuracy systems and every other system whose 95% bootstrap confidence interval overlaps with that highest system’s confidence interval (see Appendix [F](https://arxiv.org/html/2604.02460v2#A6 "Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") for bootstrap confidence interval values).

|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  | 100 thinking tokens | | | | | | | 500 thinking tokens | | | | | | |
| Data | Model | SAS | SAS-L | Seq | Sub | Roles | Deb | Ens | SAS | SAS-L | Seq | Sub | Roles | Deb | Ens |
| FRAMES | Qwen3-30B | 0.191 | 0.195 | 0.198 | 0.155 | 0.207 | 0.204 | 0.146 | 0.240 | 0.220 | 0.223 | 0.187 | 0.223 | 0.206 | 0.193 |
| MuSiQue | Qwen3-30B | 0.200 | 0.210 | 0.220 | 0.174 | 0.202 | 0.225 | 0.149 | 0.250 | 0.213 | 0.226 | 0.187 | 0.204 | 0.229 | 0.183 |
| FRAMES | DeepSeek-R1-70B | 0.365 | 0.374 | 0.387 | 0.385 | 0.427 | 0.400 | 0.365 | 0.427 | 0.432 | 0.396 | 0.402 | 0.407 | 0.392 | 0.400 |
| MuSiQue | DeepSeek-R1-70B | 0.294 | 0.316 | 0.328 | 0.309 | 0.316 | 0.308 | 0.316 | 0.383 | 0.375 | 0.332 | 0.303 | 0.329 | 0.320 | 0.319 |
| FRAMES | G2.5-F | 0.333 | 0.427 | 0.462 | 0.365 | 0.441 | 0.445 | 0.284 | 0.487 | 0.459 | 0.494 | 0.442 | 0.451 | 0.470 | 0.384 |
| MuSiQue | G2.5-F | 0.263 | 0.352 | 0.272 | 0.264 | 0.300 | 0.318 | 0.243 | 0.340 | 0.352 | 0.287 | 0.291 | 0.311 | 0.329 | 0.274 |
| FRAMES | G2.5-P | 0.368 | 0.451 | 0.654 | 0.530 | 0.609 | 0.649 | 0.407 | 0.600 | 0.450 | 0.660 | 0.562 | 0.598 | 0.660 | 0.400 |
| MuSiQue | G2.5-P | 0.308 | 0.373 | 0.393 | 0.364 | 0.400 | 0.412 | 0.302 | 0.391 | 0.423 | 0.391 | 0.363 | 0.397 | 0.435 | 0.330 |
| Average | – | 0.290 | 0.337 | 0.364 | 0.322 | 0.363 | 0.370 | 0.280 | 0.390 | 0.366 | 0.376 | 0.342 | 0.365 | 0.380 | 0.310 |
|  |  | 1000 thinking tokens | | | | | | | 2000 thinking tokens | | | | | | |
| Data | Model | SAS | SAS-L | Seq | Sub | Roles | Deb | Ens | SAS | SAS-L | Seq | Sub | Roles | Deb | Ens |
| FRAMES | Qwen3-30B | 0.252 | 0.235 | 0.225 | 0.220 | 0.240 | 0.228 | 0.210 | 0.250 | 0.246 | 0.252 | 0.232 | 0.256 | 0.232 | 0.230 |
| MuSiQue | Qwen3-30B | 0.260 | 0.231 | 0.229 | 0.207 | 0.220 | 0.224 | 0.197 | 0.271 | 0.239 | 0.229 | 0.234 | 0.226 | 0.234 | 0.224 |
| FRAMES | DeepSeek-R1-70B | 0.448 | 0.448 | 0.391 | 0.420 | 0.425 | 0.397 | 0.419 | 0.454 | 0.451 | 0.393 | 0.434 | 0.433 | 0.425 | 0.431 |
| MuSiQue | DeepSeek-R1-70B | 0.407 | 0.402 | 0.320 | 0.317 | 0.334 | 0.315 | 0.323 | 0.418 | 0.411 | 0.327 | 0.317 | 0.335 | 0.352 | 0.346 |
| FRAMES | G2.5-F | 0.551 | 0.484 | 0.507 | 0.482 | 0.495 | 0.527 | 0.458 | 0.532 | 0.517 | 0.526 | 0.509 | 0.536 | 0.527 | 0.498 |
| MuSiQue | G2.5-F | 0.331 | 0.354 | 0.287 | 0.313 | 0.306 | 0.328 | 0.299 | 0.334 | 0.369 | 0.283 | 0.323 | 0.330 | 0.349 | 0.320 |
| FRAMES | G2.5-P | 0.680 | 0.610 | 0.670 | 0.596 | 0.600 | 0.638 | 0.430 | 0.700 | 0.680 | 0.690 | 0.637 | 0.658 | 0.660 | 0.558 |
| MuSiQue | G2.5-P | 0.413 | 0.414 | 0.400 | 0.397 | 0.430 | 0.444 | 0.325 | 0.412 | 0.449 | 0.414 | 0.381 | 0.409 | 0.448 | 0.372 |
| Average | – | 0.418 | 0.397 | 0.379 | 0.369 | 0.381 | 0.388 | 0.333 | 0.421 | 0.420 | 0.389 | 0.383 | 0.398 | 0.403 | 0.372 |
|  |  | 5000 thinking tokens | | | | | | | 10000 thinking tokens | | | | | | |
| Data | Model | SAS | SAS-L | Seq | Sub | Roles | Deb | Ens | SAS | SAS-L | Seq | Sub | Roles | Deb | Ens |
| FRAMES | Qwen3-30B | 0.260 | 0.246 | 0.252 | 0.237 | 0.265 | 0.238 | 0.254 | 0.263 | 0.246 | 0.258 | 0.244 | 0.271 | 0.240 | 0.263 |
| MuSiQue | Qwen3-30B | 0.271 | 0.248 | 0.231 | 0.249 | 0.246 | 0.249 | 0.226 | 0.271 | 0.248 | 0.231 | 0.254 | 0.242 | 0.244 | 0.245 |
| FRAMES | DeepSeek-R1-70B | 0.455 | 0.444 | 0.394 | 0.436 | 0.448 | 0.439 | 0.450 | 0.456 | 0.445 | 0.397 | 0.434 | 0.450 | 0.444 | 0.458 |
| MuSiQue | DeepSeek-R1-70B | 0.419 | 0.412 | 0.323 | 0.317 | 0.345 | 0.357 | 0.334 | 0.417 | 0.412 | 0.327 | 0.319 | 0.354 | 0.360 | 0.330 |
| FRAMES | G2.5-F | 0.545 | 0.542 | 0.524 | 0.532 | 0.545 | 0.552 | 0.539 | 0.547 | 0.546 | 0.516 | 0.541 | 0.556 | 0.564 | 0.559 |
| MuSiQue | G2.5-F | 0.344 | 0.364 | 0.289 | 0.332 | 0.340 | 0.355 | 0.338 | 0.338 | 0.369 | 0.285 | 0.335 | 0.349 | 0.354 | 0.343 |
| FRAMES | G2.5-P | 0.700 | 0.690 | 0.680 | 0.652 | 0.700 | 0.700 | 0.710 | 0.692 | 0.692 | 0.691 | 0.655 | 0.718 | 0.697 | 0.719 |
| MuSiQue | G2.5-P | 0.419 | 0.455 | 0.392 | 0.417 | 0.447 | 0.470 | 0.434 | 0.428 | 0.436 | 0.392 | 0.410 | 0.447 | 0.458 | 0.445 |
| Average | – | 0.427 | 0.425 | 0.386 | 0.396 | 0.417 | 0.420 | 0.411 | 0.426 | 0.424 | 0.387 | 0.399 | 0.423 | 0.420 | 0.420 |

## 5 Results

Table [1](https://arxiv.org/html/2604.02460v2#S4.T1 "Table 1 ‣ 4.4 Evaluation Metric ‣ 4 Approach ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") summarizes our core comparison between SAS and multiple multi-agent architectures under matched thinking-token budgets across all models and datasets.
We report FRAMES and MuSiQue 4-hop for Qwen3-30B-A3B and DeepSeek-R1-Distill-Llama-70B, Gemini-2.5-Flash and Gemini-2.5-Pro.

### 5.1 SAS vs. Multi-Agent Results Across Models and Datasets

Our main finding is that, under matched thinking token budgets (except for very small budgets, which essentially do not produce any reasoning), SAS is the strongest default architecture for multi-hop reasoning.
Across model families and datasets, SAS is the best-performing system or statistically indistinguishable from the best for all budgets except the lowest one (100 tokens), in which case the model does not produce a useful reasoning trace at all (for either approach). SAS also consumes much less thinking token than any MAS variants while achieving the same or better results (refer to Appendix [F](https://arxiv.org/html/2604.02460v2#A6 "Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") for full results with thinking token spent).

##### SAS-L improves accuracy mostly for Gemini models.

On Gemini-2.5-Flash, SAS-L is the strongest single-agent configuration in every MuSiQue panel, and its block averages remain above standard SAS throughout.
On Gemini-2.5-Pro MuSiQue, SAS-L is also generally stronger than standard SAS, especially in higher thinking token budgets.
By contrast, SAS-L is not a universal gain in the open-source setting.
For Qwen3-30B-A3B, SAS-L is sometimes competitive in the low-budget panel, but standard SAS is usually stronger in the middle and high-budget ranges.
In conclusion, SAS-L is mainly a Gemini effect: it helps when the Gemini models’ thinking channel appears underutilized, but it does not produce the same consistent benefit for the open-source runs.

Debate is the most consistently strong MAS variant.
It repeatedly appears in the highest-confidence range, and on Gemini-2.5-Pro MuSiQue it is often the strongest overall MAS architecture.
Parallel-roles is frequently the next strongest and is especially competitive on FRAMES and on Gemini-Pro settings. Ensemble is more dependent on thinking token budgets.
It is usually weaker than Debate and often weaker than Parallel-roles on MuSiQue, especially at low and medium budgets.
However, on Gemini-2.5-Pro FRAMES at high budgets, Ensemble becomes strong and even attains the best accuracies in the 5000 and 10000 thinking token budgets.

Performance improves as the thinking token budget increases and then flattens out.
For many models/architectures, the 1000/2000 thinking token average is already close to the 5000/10000 thinking token average, even when the accuracies continue to fluctuate slightly. Although the trend is not perfectly monotonic, the results suggest diminishing returns from simply increasing the thinking budget beyond a certain point.
At higher thinking token budgets, the models begin to saturate, and in some cases may over-explore or overthink rather than convert extra budget into better final answers.

Other observations include that Gemini-2.5-Pro is the strongest overall and MuSiQue is clearly the harder benchmark. DeepSeek-R1-Distill-Llama-70B is the stronger of the two open-source families. For MuSiQue, the confidence intervals also tend to be wider or more overlapping than FRAMES, reflecting greater instability and a harder reasoning problem.

![Refer to caption](https://arxiv.org/html/2604.02460v2/graph/gemini_model_versions_accuracy.png)


Figure 2: MuSiQue 4-hop accuracy across Gemini model versions with unlimited thinking
tokens.

### 5.2 Comparing Gemini model versions

To test whether the main result depends on a particular API release, we sweep several Gemini model versions on MuSiQue using unlimited thinking tokens. Figure [2](https://arxiv.org/html/2604.02460v2#S5.F2 "Figure 2 ‣ SAS-L improves accuracy mostly for Gemini models. ‣ 5.1 SAS vs. Multi-Agent Results Across Models and Datasets ‣ 5 Results ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") shows two stable patterns. First, starting from Gemini-2.5-Flash, performance increases monotonically with model capability for both SAS and Sequential MAS. This also indicates that the evaluation is aligned with model quality as opposed to e.g. noise. Second, SAS remains competitive with, and usually slightly stronger than, Sequential throughout the sweep.

Thus, even when we remove the explicit token cap and move across multiple Gemini generations, the same qualitative pattern persists: stronger models improve both architectures, but they do not create a regime in which Sequential becomes systematically superior.
These results strengthen the interpretation of Table [1](https://arxiv.org/html/2604.02460v2#S4.T1 "Table 1 ‣ 4.4 Evaluation Metric ‣ 4 Approach ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"). The SAS $\geq$ Sequential pattern is not an artifact of one specific Gemini checkpoint or release window. Instead, it appears to be a stable property of the comparison itself, with both architectures benefiting from stronger base models but SAS remaining at least as competitive as the best multi-agent analogue.

![Refer to caption](https://arxiv.org/html/2604.02460v2/graph/context_degradation_deletion.png)

![Refer to caption](https://arxiv.org/html/2604.02460v2/graph/context_degradation_masking.png)

![Refer to caption](https://arxiv.org/html/2604.02460v2/graph/context_degradation_substitution.png)

![Refer to caption](https://arxiv.org/html/2604.02460v2/graph/context_degradation_distractors.png)

Figure 3: Context degradation results on MuSiQue 4-hop with Qwen3-30B-A3B under a fixed 1000-token thinking budget. The x-axis is the degradation level ($\alpha$ for deletion, masking, and substitution; $k$ for distractors), and the y-axis is answer accuracy.

### 5.3 Context degradation experiments

Our theoretical analysis in Section [3](https://arxiv.org/html/2604.02460v2#S3 "3 Theoretical justification ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") predicts that multi-agent designs can become more competitive when the single agent’s effective access to the full context is degraded.
To probe this mechanism empirically, we explicitly control for *context degradation* for Qwen3-30B-A3B on MuSiQue with a fixed 1000-token budget.
For each degradation level we evaluate SAS and Sequential MAS, holding all other settings fixed.
Figure [3](https://arxiv.org/html/2604.02460v2#S5.F3 "Figure 3 ‣ 5.2 Comparing Gemini model versions ‣ 5 Results ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") visualizes the full pattern across all four degradation families.

We experiment with four alternative degradation approaches: randomly delete a fraction $\alpha$ of tokens from the context before inference (deletion); randomly replace a fraction $\alpha$ of tokens with a mask symbol (masking); randomly replace a fraction $\alpha$ of tokens with random vocabulary tokens (substitution); and append $k$ random distractor sentences that are topically similar but irrelevant to the question (distractor).

The strongest evidence comes from degradations that corrupt information rather than merely remove it. Under masking, SAS leads at mild degradation ($\alpha=0.3$) and the systems are roughly tied at moderate degradation, but Sequential becomes better at heavy degradation ($\alpha=0.7$). Under substitution, which both removes signal and injects misleading content, the crossover is even clearer: SAS is ahead at $\alpha=0.3$, the two systems move closer at $\alpha=0.5$, and Sequential is clearly better at $\alpha=0.7$. These are precisely the settings in which a structured multi-step pipeline is more robust to degradation through filtering, decomposing, or stabilizing reasoning that would otherwise be derailed by corrupted context.

Deletion produces a weaker version of the same trend. SAS remains stronger at mild degradation, the systems overlap at moderate degradation, and SAS regains a small edge at the heaviest deletion level. Adding distractor sentences is milder still: both systems degrade, but SAS remains ahead throughout, albeit by a smaller margin than in the clean setting. Taken together, these results suggest that MAS is most helpful not simply when context is longer, but when it becomes harder for a single reasoning trajectory to distinguish relevant from misleading information.

This degradation study complements the main results in an important way. Our claim is not that SAS always dominates in every regime. Rather, it is that under matched budgets and proper context utilization, SAS is usually the strongest default. The degradation experiments identify the boundary of that claim: when effective single-agent context utilization deteriorates enough, structured multi-agent reasoning becomes competitive and can occasionally be better.

### 5.4 Additional experiments

See Appendix [B](https://arxiv.org/html/2604.02460v2#A2 "Appendix B Error Analysis ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") for a detailed error analysis. The appendix also includes a detailed study of Gemini context utilization and a paraphrasing ablation study that tests the robustness of our findings to rewording and potential benchmark memorization, see Appendices [G](https://arxiv.org/html/2604.02460v2#A7 "Appendix G Diagnostic: On Gemini Thought Token Accounting ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") and [A](https://arxiv.org/html/2604.02460v2#A1 "Appendix A Paraphrasing Ablation Study ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") respectively.

## 6 Conclusion

We presented a budget-controlled comparison of single-agent (SAS) and multi-agent (MAS) LLM systems, focusing on fixed *thinking token* budgets. Our results across two datasets (FRAMES, MuSiQue), three model families (Qwen3, DeepSeek, Gemini), and five different MAS architectures (Sequential, Debate, Ensemble, Parallel-roles, Subtask-parallel) consistently show that SAS matches or outperforms MAS when computation is normalized, unless context utilization is degraded to a certain point.

Overall, our results suggest that many reported MAS gains are better explained by compute and context effects than by inherent architectural superiority, and that future work should focus on the specific regimes where multi-agent structure provides real benefit.

## 7 Acknowledgement

We thank Dilip Arumugam for pointing out a small mistake in an earlier version of this work.

## References

- Anthropic (2025)
  Anthropic
  How we built our multi-agent research system.
  Note: <https://www.anthropic.com/engineering/multi-agent-research-system>
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px2.p1.1 "When and why MAS helps: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Cemri et al. (2025)
  M. Cemri, M. Z. Pan, S. Yang, L. A. Agrawal, B. Chopra, R. Tiwari, K. Keutzer, A. Parameswaran, D. Klein, K. Ramchandran, et al.
  Why do multi-agent llm systems fail?.
  arXiv preprint arXiv:2503.13657.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px2.p1.1 "When and why MAS helps: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Cover and Thomas (2006)
  T. M. Cover and J. A. Thomas
  Elements of information theory.
  2nd edition, Wiley-Interscience.
  Cited by: [§3](https://arxiv.org/html/2604.02460v2#S3.p3.2 "3 Theoretical justification ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Du et al. (2024)
  Y. Du, S. Li, A. Torralba, J. B. Tenenbaum, and I. Mordatch
  Improving factuality and reasoning in language models through multiagent debate.
  In Forty-first international conference on machine learning,
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px4.p1.1 "Multi-agent collaboration mechanisms: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Du et al. (2025)
  Y. Du, M. Tian, S. Ronanki, S. Rongali, S. Bodapati, A. Galstyan, A. Wells, R. Schwartz, E. A. Huerta, and H. Peng
  Context length alone hurts llm performance despite perfect retrieval.
  arXiv preprint arXiv:2510.05381.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px5.p1.1 "Context length, degradation, and long-context utilization: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Gao et al. (2025)
  M. Gao, Y. Li, B. Liu, Y. Yu, P. Wang, C. Lin, and F. Lai
  Single-agent or multi-agent systems? why not both?.
  arXiv preprint arXiv:2505.18286.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px3.p1.1 "SAS vs. MAS: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Han et al. (2025)
  T. Han, Z. Wang, C. Fang, S. Zhao, S. Ma, and Z. Chen
  Token-budget-aware llm reasoning.
  In Findings of the Association for Computational Linguistics: ACL 2025,
  pp. 24842–24855.
  Cited by: [§1](https://arxiv.org/html/2604.02460v2#S1.p2.1 "1 Introduction ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"),
  [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px1.p1.1 "Budget-Controlled Evaluation: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Hong et al. (2025)
  K. Hong, A. Troynikov, and J. Huber
  Context rot: how increasing input tokens impacts llm performance.
  Technical report
   Chroma.
  External Links: [Link](https://www.trychroma.com/research/context-rot)
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px5.p1.1 "Context length, degradation, and long-context utilization: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Ke et al. (2026)
  Z. Ke, Y. Ming, A. Xu, R. Chin, X. Nguyen, P. Jwalapuram, J. Wang, S. Yavuz, C. Xiong, and S. Joty
  Mas-orchestra: understanding and improving multi-agent reasoning through holistic orchestration and controlled benchmarks.
  arXiv preprint arXiv:2601.14652.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px2.p1.1 "When and why MAS helps: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Kim et al. (2025)
  Y. Kim, K. Gu, C. Park, C. Park, S. Schmidgall, A. A. Heydari, Y. Yan, Z. Zhang, Y. Zhuang, M. Malhotra, et al.
  Towards a science of scaling agent systems.
  arXiv preprint arXiv:2512.08296.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px2.p1.1 "When and why MAS helps: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Krishna et al. (2025)
  S. Krishna, K. Krishna, A. Mohananey, S. Schwarcz, A. Stambler, S. Upadhyay, and M. Faruqui
  Fact, fetch, and reason: a unified evaluation of retrieval-augmented generation.
  In Proceedings of the 2025 Conference of the Nations of the Americas Chapter of the Association for Computational Linguistics: Human Language Technologies (Volume 1: Long Papers),
  pp. 4745–4759.
  Cited by: [§4.1](https://arxiv.org/html/2604.02460v2#S4.SS1.p1.1 "4.1 Tasks and Datasets ‣ 4 Approach ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"),
  [footnote 1](https://arxiv.org/html/2604.02460v2#footnote1 "In 4.4 Evaluation Metric ‣ 4 Approach ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Li et al. (2025a)
  G. Li, L. Chen, C. Tang, V. Švábenskỳ, D. Deguchi, T. Yamashita, and A. Shimada
  Single-agent vs. multi-agent llm strategies for automated student reflection assessment.
  In Pacific-Asia Conference on Knowledge Discovery and Data Mining,
  pp. 300–311.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px3.p1.1 "SAS vs. MAS: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Li et al. (2024)
  J. Li, Q. Zhang, Y. Yu, Q. Fu, and D. Ye
  More agents is all you need.
  arXiv preprint arXiv:2402.05120.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px4.p1.1 "Multi-agent collaboration mechanisms: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Li et al. (2025b)
  Z. Li, Q. Dong, J. Ma, D. Zhang, K. Jia, and Z. Sui
  Selfbudgeter: adaptive token allocation for efficient llm reasoning.
  arXiv preprint arXiv:2505.11274.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px1.p1.1 "Budget-Controlled Evaluation: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Li et al. (2025c)
  Z. Li, Y. Zhang, T. Pan, Y. Sun, Z. Duan, J. Fang, R. Han, Z. Wang, and J. Wang
  FocusLLM: precise understanding of long context by dynamic condensing.
  In Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
  pp. 31087–31101.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px5.p1.1 "Context length, degradation, and long-context utilization: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Liu et al. (2024)
  N. F. Liu, K. Lin, J. Hewitt, A. Paranjape, M. Bevilacqua, F. Petroni, and P. Liang
  Lost in the middle: how language models use long contexts.
  Transactions of the association for computational linguistics 12, pp. 157–173.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px5.p1.1 "Context length, degradation, and long-context utilization: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Lu et al. (2024)
  Y. Lu, J. N. Yan, S. Yang, J. T. Chiu, S. Ren, F. Yuan, W. Zhao, Z. Wu, and A. M. Rush
  A controlled study on long context extension and generalization in llms.
  arXiv preprint arXiv:2409.12181.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px5.p1.1 "Context length, degradation, and long-context utilization: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Shinn et al. (2023)
  N. Shinn, F. Cassano, A. Gopinath, K. Narasimhan, and S. Yao
  Reflexion: language agents with verbal reinforcement learning.
  Advances in neural information processing systems 36, pp. 8634–8652.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px4.p1.1 "Multi-agent collaboration mechanisms: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Trivedi et al. (2022)
  H. Trivedi, N. Balasubramanian, T. Khot, and A. Sabharwal
  MuSiQue: multihop questions via single-hop question composition.
  Transactions of the Association for Computational Linguistics 10, pp. 539–554.
  Cited by: [§4.1](https://arxiv.org/html/2604.02460v2#S4.SS1.p1.1 "4.1 Tasks and Datasets ‣ 4 Approach ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Wang et al. (2024)
  J. Wang, S. Jain, D. Zhang, B. Ray, V. Kumar, and B. Athiwaratkun
  Reasoning in token economies: budget-aware evaluation of llm reasoning strategies.
  In Proceedings of the 2024 Conference on Empirical Methods in Natural Language Processing,
  pp. 19916–19939.
  Cited by: [§1](https://arxiv.org/html/2604.02460v2#S1.p2.1 "1 Introduction ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"),
  [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px1.p1.1 "Budget-Controlled Evaluation: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Wen et al. (2025)
  H. Wen, X. Wu, Y. Sun, F. Zhang, L. Chen, J. Wang, Y. Liu, Y. Liu, Y. Zhang, and Y. Li
  Budgetthinker: empowering budget-aware llm reasoning with control tokens.
  arXiv preprint arXiv:2508.17196.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px1.p1.1 "Budget-Controlled Evaluation: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Zhang et al. (2023)
  J. Zhang, X. Xu, N. Zhang, R. Liu, B. Hooi, and S. Deng
  Exploring collaboration mechanisms for llm agents: a social psychology view.
  arXiv preprint arXiv:2310.02124.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px4.p1.1 "Multi-agent collaboration mechanisms: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").
- Zhu et al. (2025)
  Y. Zhu, Z. He, H. Hu, X. Zheng, X. Zhang, Z. Wang, J. Gao, L. Ma, and L. Yu
  Medagentboard: benchmarking multi-agent collaboration with conventional methods for diverse medical tasks.
  arXiv preprint arXiv:2505.12371.
  Cited by: [§2](https://arxiv.org/html/2604.02460v2#S2.SS0.SSS0.Px3.p1.1 "SAS vs. MAS: ‣ 2 Related Work ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets").

## Appendix A Paraphrasing Ablation Study

To investigate the impact of potential dataset contamination or question phrasing artifacts, we ran an ablation on the MuSiQue 4-hop dataset using two paraphrasing methods on the questions.

##### Paraphrasing Methods:

We implemented two distinct methods:

- •

  Light Paraphrase: A rule-based approach that uses regular expressions to swap common question phrases (e.g., ”When was” $\to$ ”At what time was”, ”founded” $\to$ ”established”) without altering the core structure.
- •

  Deep Paraphrase: An LLM-based approach using Gemini-2.5-Flash. The model was given a system prompt with hard rules to completely rephrase the question while preserving the exact meaning, answer, and multi-hop structure, aiming for low lexical overlap with the original.

We evaluated SAS and Sequential MAS configurations on these two new datasets at 1k and 2k thinking token budgets. Table [11](https://arxiv.org/html/2604.02460v2#A6.T11 "Table 11 ‣ F.3 Paraphrase results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") summarizes all the representative values.

##### Discussion of Paraphrase Results:

The results show two interesting trends across both models. First, the Light Paraphrase consistently *decreased* performance for SAS (For Gemini: .331$\to$.326; For Qwen3: .260$\to$.249). This was particularly notable for Sequential MAS in Qwen3, which saw a significant drop (.229$\to$.204). This suggests that the simple regex-based changes may have obfuscated the questions or removed helpful phrasing cues that the models were relying on.

Second, the Deep Paraphrase *improved* performance, especially for the stronger Gemini model. For Gemini-2.5-Flash, SAS performance jumped from .331 to .358 at 1k tokens. Qwen3 also saw slight performance gains in both SAS and Sequential MAS, even though it is not significant. This divergence, where simple paraphrasing hurts and deep paraphrasing helps, strongly suggests that the original questions may suffer from memorization or overfitting from pretraining. The deep, semantically-equivalent rephrasing forces the model to perform more robust reasoning, supporting the use of this technique for creating more reliable agent benchmarks.

Table 2: Error analysis on MuSiQue 4-hop at 1k thinking tokens, comparing Gemini-2.5-Flash and Qwen3-30B-A3B. The MAS being used in here is Sequential MAS. Buckets are: MAS right & SAS wrong (MR/SW), SAS right & MAS wrong (SR/MW), both right (BR), and both wrong (BW). “Avg Tokens” gives the average thinking-token count; “Entity Spans” is the average number of entities traversed in the internal reasoning; “% gold in thoughts” is the percentage of examples in which the gold answer appears anywhere in the internal reasoning.

|  | Gemini-2.5-Flash | | | | | | Qwen3-30B-A3B | | | | | |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bucket | $N$ | Avg Tokens | | Entity Spans | | % gold in thoughts | $N$ | Avg Tokens | | Entity Spans | | % gold in thoughts |
|  |  | SAS | Seq | SAS | Seq | SAS / Seq / Both |  | SAS | Seq | SAS | Seq | SAS / Seq / Both |
| MR/SW | 72 | 260 | 516 | 4.8 | 9.5 | 12.5 / 41.7 / — | 60 | 788 | 769 | 9.3 | 9.9 | 18.3 / 56.7 / — |
| SR/MW | 124 | 286 | 565 | 5.9 | 10.3 | 42.7 / 18.6 / — | 96 | 733 | 791 | 8.1 | 9.2 | 63.5 / 28.1 / — |
| BR | 265 | 217 | 483 | 5.0 | 10.0 | 61.9 / 64.5 / 50.9 | 209 | 666 | 761 | 7.8 | 9.4 | 73.7 / 78.5 / 69.9 |
| BW | 714 | 274 | 542 | 5.2 | 10.1 | 3.36 / 2.66 / — | 810 | 787 | 809 | 7.8 | 8.9 | 3.33 / 3.58 / — |

## Appendix B Error Analysis

In order to understand our results better, we performed a fine-grained analysis of *unfiltered thinking* for Gemini-2.5-Flash and Qwen3-30B-A3B at 1k thinking tokens on MuSiQue 4-hop questions, partitioning examples into four mutually exclusive buckets: (MR/SW) Sequential MAS right & SAS wrong, (SR/MW) SAS right & Sequential MAS wrong, (BR) Both right, and (BW) Both wrong. We summarize corpus-level properties of the internal chains and identify error patterns that consistently predict success or failure in Table [2](https://arxiv.org/html/2604.02460v2#A1.T2 "Table 2 ‣ Discussion of Paraphrase Results: ‣ Appendix A Paraphrasing Ablation Study ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"). We refer to the ground truth answer here as ”gold”.

##### MR/SW (Sequential MAS right, SAS wrong).

Sequential MAS writes longer thoughts and canvasses 2 times more entities than SAS does; the correct gold appears in Sequential MAS’s thoughts far more often, compared with SAS (41.7% vs. 12.5% for Gemini, and 56.7% vs. 18.3% for Qwen3). We also observe extraction failures on the SAS side: the gold appears in SAS’s thoughts but is dropped in the final answer in 9 out of 72 cases in Gemini case.
Interpretation: SAS *under-explores* and sometimes fails to copy the correct span from its own chain; Sequential MAS’s breadth plus occasional backtracking rescues the final.

##### SR/MW (SAS right, Sequential MAS wrong).

SAS’s chains maintain a much higher lexical overlap with the question; the gold string appears in SAS’s thoughts in 42.7% vs. 18.6% for MAS for Gemini, and 63.5% vs. 28.1% for Qwen 3. Sequential MAS *over-explores* and *drifts*, including 23 cases of extraction failure for Gemini (gold surfaced in thoughts but not in the final).
Interpretation: Tighter *constraint anchoring* in SAS is decisive. Sequential MAS’s breadth, absent pruning, degrades precision and sometimes loses a correct span at finalization.

##### BR (Both right).

Both systems frequently contain the gold in thoughts (SAS 61.9%, Sequential MAS 64.5%, both 50.9% for Gemini; SAS 73.7%, Sequential MAS 78.5%, both 69.9% for Qwen3). Backtracking markers occur on both sides, suggesting explicit course correction before convergence.
Interpretation: Success typically follows a two-stage path: (i) surface a plausible span, (ii) perform a late constraint re-check that avoids switching away from the correct span.

##### BW (Both wrong).

The gold string almost never appears (single 3.36%, multi 2.66% for Gemini; single 3.33%, multi 3.58% for Qwen3). Both systems pursue *disjoint* candidates and fail to reconcile. Both produce long, but misguided thoughts.
Interpretation: The dominant failure mode is mutual drift with insufficient late binding to the question’s constraints; neither path surfaces an extractable gold span.

##### Model-specific notes.

Gemini-2.5-Flash generally allocates substantially more thinking text to Sequential MAS than SAS across buckets, magnifying the breadth vs. precision pattern.
Qwen3-30B-A3B shows a similar picture, with Sequential MAS exploring more entities than SAS across buckets; the relative token lengths are closer in some buckets, but the *gold-in-thoughts percentage* remains the main predictor of whether one can answer the question correctly or not.

##### Takeaway.

With this analysis, we can see that SAS succeeds by *staying close to the question* and reliably carrying the surfaced span into the final, while Sequential MAS succeeds when its extra breadth is paired with late constraint checking. Failures for both are dominated by: (i) never writing the correct surface form, and (ii) losing a previously correct span at finalization.

## Appendix C Limitations

(i) We focus on text-only multi-hop reasoning; MAS advantages with tools/vision or safety constraints are out of scope. (ii) Gemini thinking accounting is approximate; we report both API and content-based proxies and emphasize accuracy under matched *requested* budgets. (iii) We only study the effect on performance across model families and datasets while increasing the thinking token cap. We do not enforce the models to actually use up all of those budgets. As a result, we restrict only upper thinking budget cap, not lower thinking budget cap.

## Appendix D Architecture Prompts

This section lists all the prompts used in the paper. Each subsection corresponds to one architecture and groups its prompts by function. Except for temperature, all other hyperparameters are kept default. Temperature value used for Ensemble is 0.7, otherwise 0 for the rest.

### D.1 Single-Agent System

This subsection contains the prompts used for the standard single-agent system and the longer-thinking single-agent variant.

#### D.1.1 SAS system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIGhlbHBmdWwgYXNzaXN0YW50LiBUaGluayBzdGVwIGJ5IHN0ZXAsIHRoZW4gYW5zd2VyLgpCZSBhcyBzdWNjaW5jdCBhcyBwb3NzaWJsZS4gRG8gTk9UIHJlcGVhdCB0aGUgcXVlc3Rpb24uClJldHVybiBPTkxZIHRoZSBmaW5hbCBhbnN3ZXIgcmVxdWVzdGVkLg==)

You are a helpful assistant. Think step by step, then answer.

Be as succinct as possible. Do NOT repeat the question.

Return ONLY the final answer requested.

#### D.1.2 SAS-L added user prefix

[⬇](data:text/plain;base64,SSB3YW50IHlvdSB0byBhbmFseXplIHRoZSBmb2xsb3dpbmcgcXVlc3Rpb24gZnJvbSBtdWx0aXBsZSBwZXJzcGVjdGl2ZXMgYmVmb3JlIGFuc3dlcmluZy4KCjEuIElkZW50aWZ5IGFtYmlndWl0aWVzLgoyLiBGb3JtdWxhdGUgYXQgbGVhc3QgdHdvIHBsYXVzaWJsZSBpbnRlcnByZXRhdGlvbnMuCjMuIEV2YWx1YXRlIHRoZSBpbnRlcnByZXRhdGlvbnMgYW5kIGNob29zZSB0aGUgbW9zdCBsaWtlbHkgb25lLgo0LiBBbnN3ZXIgYmFzZWQgb24gdGhlIG1vc3QgbGlrZWx5IGludGVycHJldGF0aW9uLgoKVGhlIHF1ZXN0aW9uIGlzOg==)

I want you to analyze the following question from multiple perspectives before answering.

1. Identify ambiguities.

2. Formulate at least two plausible interpretations.

3. Evaluate the interpretations and choose the most likely one.

4. Answer based on the most likely interpretation.

The question is:

### D.2 Sequential Multi-Agent System

This subsection contains the prompts used for the Sequential planner, step agents, and aggregator.

#### D.2.1 Planner system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIGNhcmVmdWwgcGxhbm5lci4gQnJlYWsgdGhlIHVzZXIgdGFzayBpbnRvIHRoZSBmZXdlc3QgbmVjZXNzYXJ5IHNlcXVlbnRpYWwgc3RlcHMgc28gZWFjaCBzdGVwIG91dHB1dCBmZWVkcyB0aGUgbmV4dC4KCk91dHB1dCBzdHJpY3QgSlNPTiBvbmx5IHdpdGggdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6CnN0ZXBzOgogIC0gaWQ6IDEKICAgIG5hbWU6IFN0ZXAgMQogICAgaW5zdHJ1Y3Rpb246IFdoYXQgdG8gZG8KICAtIGlkOiAyCiAgICBuYW1lOiBTdGVwIDIKICAgIGluc3RydWN0aW9uOiBXaGF0IHRvIGRvCgpSdWxlczoKLSBTdGVwcyBtdXN0IGJlIHNlcXVlbnRpYWwgYW5kIG1pbmltYWwuCi0gRG8gbm90IGFuc3dlciB0aGUgcXVlc3Rpb24geW91cnNlbGYuCi0gSW5zdHJ1Y3Rpb25zIG11c3QgYmUgY29uY3JldGUgYW5kIHVuYW1iaWd1b3VzLgotIERvIG5vdCBpbmNsdWRlIGNvbW1lbnRhcnkgb3V0c2lkZSB0aGUgSlNPTiBvYmplY3Qu)

You are a careful planner. Break the user task into the fewest necessary sequential steps so each step output feeds the next.

Output strict JSON only with the following structure:

steps:

- id: 1

name: Step 1

instruction: What to do

- id: 2

name: Step 2

instruction: What to do

Rules:

- Steps must be sequential and minimal.

- Do not answer the question yourself.

- Instructions must be concrete and unambiguous.

- Do not include commentary outside the JSON object.

#### D.2.2 Per-step agent system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIGhlbHBmdWwgYXNzaXN0YW50LiBUaGluayBvbmx5IGZvciB5b3VyIHN0ZXAu)

You are a helpful assistant. Think only for your step.

#### D.2.3 Per-step agent user template

[⬇](data:text/plain;base64,T3JpZ2luYWwgUXVlc3Rpb246IHtxfQoKRnVsbCBQbGFuOgp7cGxhbl9hc190ZXh0fQoKWW91IGFyZSByZXNwb25zaWJsZSBmb3IgU3RlcCB7aX06IHtzdGVwX25hbWV9Ckluc3RydWN0aW9uOiB7c3RlcF9pbnN0cnVjdGlvbn0KClByZXZpb3VzIHN0ZXAgb3V0cHV0czoKe3ByaW9yX3N0ZXBfb3V0cHV0c30KClBlcmZvcm0gT05MWSB5b3VyIGFzc2lnbmVkIHN0ZXAuIFByb3ZpZGUgeW91ciBzdGVwIG91dHB1dCBzdWNjaW5jdGx5Lg==)

Original Question: {q}

Full Plan:

{plan_as_text}

You are responsible for Step {i}: {step_name}

Instruction: {step_instruction}

Previous step outputs:

{prior_step_outputs}

Perform ONLY your assigned step. Provide your step output succinctly.

#### D.2.4 Aggregator system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhbiBhZ2dyZWdhdG9yLiBSZWFkIHN0ZXAgb3V0cHV0cyBhbmQgcmV0dXJuIHRoZSBmaW5hbCBhbnN3ZXIgb25seS4KRG8gTk9UIGF0dGVtcHQgdG8gc29sdmUgdGhlIHF1ZXN0aW9uIHlvdXJzZWxmLg==)

You are an aggregator. Read step outputs and return the final answer only.

Do NOT attempt to solve the question yourself.

#### D.2.5 Aggregator user template

[⬇](data:text/plain;base64,UXVlc3Rpb246IHtxfQoKU3RlcCBvdXRwdXRzOgp7c3RlcF9vdXRwdXRzfQoKUmV0dXJuIHRoZSBmaW5hbCBhbnN3ZXIgb25seS4=)

Question: {q}

Step outputs:

{step_outputs}

Return the final answer only.

### D.3 Subtask-Parallel Multi-Agent System

This subsection contains the prompts used for subtask decomposition, parallel workers, and aggregator.

#### D.3.1 Planner system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIHBsYW5uZXIuIERlY29tcG9zZSB0aGUgcXVlc3Rpb24gaW50byBhIHNtYWxsIHNldCBvZiBpbmRlcGVuZGVudCBzdWJ0YXNrcyB0aGF0IGNhbiBiZSBzb2x2ZWQgaW4gcGFyYWxsZWwuCgpPdXRwdXQgc3RyaWN0IEpTT04gb25seSB3aXRoIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOgp0YXNrczoKICAtIGlkOiAxCiAgICBuYW1lOiBUYXNrIDEKICAgIGluc3RydWN0aW9uOiBXaGF0IHRvIGRvCiAgICBkZWxpdmVyYWJsZTogV2hhdCB0byByZXR1cm4KClJ1bGVzOgotIFRhc2tzIG11c3QgYmUgaW5kZXBlbmRlbnQuCi0gS2VlcCB0YXNrcyBtaW5pbWFsIGFuZCBkaXJlY3RseSB1c2VmdWwuCi0gRG8gbm90IGFuc3dlciB0aGUgcXVlc3Rpb24geW91cnNlbGYuCi0gRG8gbm90IGluY2x1ZGUgY29tbWVudGFyeSBvdXRzaWRlIHRoZSBKU09OIG9iamVjdC4=)

You are a planner. Decompose the question into a small set of independent subtasks that can be solved in parallel.

Output strict JSON only with the following structure:

tasks:

- id: 1

name: Task 1

instruction: What to do

deliverable: What to return

Rules:

- Tasks must be independent.

- Keep tasks minimal and directly useful.

- Do not answer the question yourself.

- Do not include commentary outside the JSON object.

#### D.3.2 Worker system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIGhlbHBmdWwgYXNzaXN0YW50Lg==)

You are a helpful assistant.

#### D.3.3 Worker user template

[⬇](data:text/plain;base64,UXVlc3Rpb246IHtxfQoKVGFzayB7dGFza19pZH06Ckluc3RydWN0aW9uOiB7dGFza19pbnN0cnVjdGlvbn0KRGVsaXZlcmFibGU6IHt0YXNrX2RlbGl2ZXJhYmxlfQoKUmV0dXJuIG9ubHkgd2hhdCB0aGUgZGVsaXZlcmFibGUgYXNrcyBmb3Iu)

Question: {q}

Task {task_id}:

Instruction: {task_instruction}

Deliverable: {task_deliverable}

Return only what the deliverable asks for.

#### D.3.4 Aggregator system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIHJlZHVjZXIuIFlvdSB3aWxsIGJlIGdpdmVuIG91dHB1dHMgZnJvbSBtdWx0aXBsZSBzdWJ0YXNrcy4KU3ludGhlc2l6ZSB0aGVtIGludG8gdGhlIGJlc3QgcG9zc2libGUgZmluYWwgYW5zd2VyLgpSZXR1cm4gb25seSB0aGUgZmluYWwgYW5zd2VyLg==)

You are a reducer. You will be given outputs from multiple subtasks.

Synthesize them into the best possible final answer.

Return only the final answer.

#### D.3.5 Aggregator user template

[⬇](data:text/plain;base64,UXVlc3Rpb246IHtxfQoKVGFzayBvdXRwdXRzOgp7dGFza19vdXRwdXRzfQoKUmV0dXJuIHRoZSBmaW5hbCBhbnN3ZXIgb25seS4=)

Question: {q}

Task outputs:

{task_outputs}

Return the final answer only.

### D.4 Parallel-Roles Multi-Agent System

This subsection contains the prompts used for role-specialized workers and aggregator.

#### D.4.1 Worker system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIHJvbGUtc3BlY2lhbGl6ZWQgYXNzaXN0YW50LgpGb2xsb3cgdGhlIGFzc2lnbmVkIHJvbGUgaW5zdHJ1Y3Rpb25zIGNhcmVmdWxseSBhbmQgcHJvZHVjZSB0aGUgYmVzdCBwYXJ0aWFsIGFuc3dlciBmb3IgdGhhdCByb2xlLg==)

You are a role-specialized assistant.

Follow the assigned role instructions carefully and produce the best partial answer for that role.

#### D.4.2 Worker user template

[⬇](data:text/plain;base64,UXVlc3Rpb246IHtxfQoKUm9sZToge3JvbGVfbmFtZX0KClJvbGUgaW5zdHJ1Y3Rpb25zOgp7aW5zdHJ1Y3Rpb25zfQoKUHJvZHVjZSB5b3VyIGFuYWx5c2lzIGFuZCB0aGUgYmVzdCBwYXJ0aWFsIGFuc3dlciBmb3IgdGhpcyByb2xlLg==)

Question: {q}

Role: {role_name}

Role instructions:

{instructions}

Produce your analysis and the best partial answer for this role.

#### D.4.3 Aggregator system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhbiBhZ2dyZWdhdG9yLiBSZWFkIHRoZSB3b3JrZXIgb3V0cHV0cyBhbmQgcmV0dXJuIHRoZSBmaW5hbCBhbnN3ZXIgb25seS4KRG8gbm90IGFkZCBjb21tZW50YXJ5Lg==)

You are an aggregator. Read the worker outputs and return the final answer only.

Do not add commentary.

#### D.4.4 Aggregator user template

[⬇](data:text/plain;base64,UXVlc3Rpb246IHtxfQoKUm9sZSBvdXRwdXRzOgp7cm9sZV9vdXRwdXRzfQoKUmV0dXJuIG9ubHkgdGhlIGZpbmFsIGFuc3dlci4=)

Question: {q}

Role outputs:

{role_outputs}

Return only the final answer.

### D.5 Debate Multi-Agent System

This subsection contains the prompts used for the debaters, critics, and aggregator.

#### D.5.1 Debater system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIGRlYmF0ZXIuIFByb3ZpZGUgdGhlIGJlc3QgcG9zc2libGUgYW5zd2VyIHRvIHRoZSBxdWVzdGlvbi4KVGhpbmsgc3RlcCBieSBzdGVwIGluIHByaXZhdGUsIHRoZW4gb3V0cHV0IG9ubHkgdGhlIGZpbmFsIGFuc3dlci4=)

You are a debater. Provide the best possible answer to the question.

Think step by step in private, then output only the final answer.

#### D.5.2 Critic system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIGNyaXRpYy4gWW91IHdpbGwgYmUgZ2l2ZW4gYW4gb3Bwb25lbnQgYW5zd2VyLgpQb2ludCBvdXQgZmxhd3MsIG1pc3NpbmcgY29uc3RyYWludHMsIG9yIGFsdGVybmF0aXZlIHJlYXNvbmluZy4KVGhlbiBwcm92aWRlIGEgY29ycmVjdGVkIGltcHJvdmVkIGFuc3dlci4KT3V0cHV0IG9ubHkgdGhlIGZpbmFsIGltcHJvdmVkIGFuc3dlci4=)

You are a critic. You will be given an opponent answer.

Point out flaws, missing constraints, or alternative reasoning.

Then provide a corrected improved answer.

Output only the final improved answer.

#### D.5.3 Critique user template

[⬇](data:text/plain;base64,T3Bwb25lbnQgYW5zd2VyOgp7b3Bwb25lbnRfYW5zd2VyfQoKWW91ciBjcml0aXF1ZSBhbmQgaW1wcm92ZWQgZmluYWwgYW5zd2VyOg==)

Opponent answer:

{opponent_answer}

Your critique and improved final answer:

#### D.5.4 Aggregator system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIGp1ZGdlLiBZb3Ugd2lsbCBiZSBnaXZlbiB0d28gY2FuZGlkYXRlIGFuc3dlcnMuClNlbGVjdCB0aGUgYmV0dGVyIG9uZS4gSWYgYm90aCBhcmUgd3JvbmcsIHBpY2sgdGhlIG9uZSB0aGF0IGlzIGNsb3Nlci4KT3V0cHV0IG9ubHkgdGhlIGZpbmFsIGFuc3dlci4=)

You are a judge. You will be given two candidate answers.

Select the better one. If both are wrong, pick the one that is closer.

Output only the final answer.

#### D.5.5 Aggregator user template

[⬇](data:text/plain;base64,UXVlc3Rpb246IHtxfQoKQW5zd2VyIEE6CnthbnN3ZXJfYX0KCkFuc3dlciBCOgp7YW5zd2VyX2J9CgpQaWNrIHRoZSBiZXR0ZXIgYW5zd2VyIGFuZCBvdXRwdXQgb25seSB0aGUgZmluYWwgYW5zd2VyLg==)

Question: {q}

Answer A:

{answer_a}

Answer B:

{answer_b}

Pick the better answer and output only the final answer.

### D.6 Ensemble Multi-Agent System

This subsection contains the prompts used for independent candidates and aggregator.

#### D.6.1 Candidate worker system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIGhlbHBmdWwgYXNzaXN0YW50LiBTb2x2ZSB0aGUgcXVlc3Rpb24gaW5kZXBlbmRlbnRseSBhbmQgcmV0dXJuIG9ubHkgdGhlIGZpbmFsIGFuc3dlci4=)

You are a helpful assistant. Solve the question independently and return only the final answer.

#### D.6.2 Aggregator system prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIGp1ZGdlLiBZb3Ugd2lsbCBiZSBnaXZlbiBhIHF1ZXN0aW9uIGFuZCBtdWx0aXBsZSBjYW5kaWRhdGUgYW5zd2Vycy4KUGljayB0aGUgc2luZ2xlIGJlc3QgYW5zd2VyLiBJZiBhbGwgYXJlIHdyb25nLCBwaWNrIHRoZSBjbG9zZXN0LgpPdXRwdXQgb25seSB0aGUgZmluYWwgYW5zd2VyLg==)

You are a judge. You will be given a question and multiple candidate answers.

Pick the single best answer. If all are wrong, pick the closest.

Output only the final answer.

#### D.6.3 Aggregator user template

[⬇](data:text/plain;base64,UXVlc3Rpb246IHtxfQoKQ2FuZGlkYXRlczoKe2NhbmRpZGF0ZV9hbnN3ZXJzfQoKT3V0cHV0IG9ubHkgdGhlIGZpbmFsIGFuc3dlci4=)

Question: {q}

Candidates:

{candidate_answers}

Output only the final answer.

### D.7 Evaluation

This subsection contains the prompts used for evaluation. The evaluation step is ran right after the predicted output is produced, using the same model.

#### D.7.1 Evaluation System prompt

[⬇](data:text/plain;base64,WW91IGFyZSBhIGhlbHBmdWwgYXNzaXN0YW50Lg==)

You are a helpful assistant.

#### D.7.2 Evaluation User prompt

[⬇](data:text/plain;base64,PT09VGFzaz09PQoKSSBuZWVkIHlvdXIgaGVscCBpbiBldmFsdWF0aW5nIGFuIGFuc3dlciBwcm92aWRlZCBieSBhbiBMTE0gYWdhaW5zdCBhIGdyb3VuZCB0cnV0aCBhbnN3ZXIuCllvdXIgdGFzayBpcyB0byBkZXRlcm1pbmUgaWYgdGhlIGdyb3VuZCB0cnV0aCBhbnN3ZXIgaXMgcHJlc2VudCBpbiB0aGUgTExNJ3MgcmVzcG9uc2UuClBsZWFzZSBhbmFseXplIHRoZSBwcm92aWRlZCBkYXRhIGFuZCBtYWtlIGEgZGVjaXNpb24uCgo9PT1JbnN0cnVjdGlvbnM9PT0KMS4gQ2FyZWZ1bGx5IGNvbXBhcmUgdGhlIFByZWRpY3RlZCBBbnN3ZXIgd2l0aCB0aGUgR3JvdW5kIFRydXRoIEFuc3dlci4KMi4gVGhlIEdyb3VuZCBUcnV0aCBBbnN3ZXIgaXMgYWx3YXlzIGFic29sdXRlbHkgY29ycmVjdC4gRG8gTk9UIGFzc3VtZSBvdGhlcndpc2UuCjMuIENvbnNpZGVyIHRoZSBzdWJzdGFuY2Ugb2YgdGhlIGFuc3dlcnMgLSBsb29rIGZvciBlcXVpdmFsZW50IGluZm9ybWF0aW9uIG9yIGNvcnJlY3QgYW5zd2Vycy4KICAgRG8gbm90IGZvY3VzIG9uIGV4YWN0IHdvcmRpbmcgdW5sZXNzIHRoZSBleGFjdCB3b3JkaW5nIGlzIGNydWNpYWwgdG8gdGhlIG1lYW5pbmcuCjQuIFlvdXIgZmluYWwgZGVjaXNpb24gc2hvdWxkIGJlIGJhc2VkIG9uIHdoZXRoZXIgdGhlIG1lYW5pbmcgYW5kIHRoZSB2aXRhbCBmYWN0cyBvZiB0aGUKICAgR3JvdW5kIFRydXRoIEFuc3dlciBhcmUgcHJlc2VudCBpbiB0aGUgUHJlZGljdGVkIEFuc3dlcjoKCj09PUlucHV0IERhdGE9PT0KLSBRdWVzdGlvbjogPHF1ZXN0aW9uPgotIFByZWRpY3RlZCBBbnN3ZXI6IDxMTE1fcmVzcG9uc2U+Ci0gR3JvdW5kIFRydXRoIEFuc3dlcjogPGdyb3VuZF90cnV0aF9hbnN3ZXI+Cgo9PT1PdXRwdXQgRm9ybWF0PT09ClByb3ZpZGUgeW91ciBmaW5hbCBldmFsdWF0aW9uIGluIHRoZSBmb2xsb3dpbmcgZGljdGlvbmFyeSBmb3JtYXQ6CntFeHBsYW5hdGlvbjogPEhvdyB5b3UgbWFkZSB0aGUgZGVjaXNpb24/PiwgRGVjaXNpb246IDxUUlVFIG9yIEZBTFNFPn0=)

===Task===

I need your help in evaluating an answer provided by an LLM against a ground truth answer.

Your task is to determine if the ground truth answer is present in the LLM’s response.

Please analyze the provided data and make a decision.

===Instructions===

1. Carefully compare the Predicted Answer with the Ground Truth Answer.

2. The Ground Truth Answer is always absolutely correct. Do NOT assume otherwise.

3. Consider the substance of the answers - look for equivalent information or correct answers.

Do not focus on exact wording unless the exact wording is crucial to the meaning.

4. Your final decision should be based on whether the meaning and the vital facts of the

Ground Truth Answer are present in the Predicted Answer:

===Input Data===

- Question: <question>

- Predicted Answer: <LLM_response>

- Ground Truth Answer: <ground_truth_answer>

===Output Format===

Provide your final evaluation in the following dictionary format:

{Explanation: <How you made the decision?>, Decision: <TRUE or FALSE>}

## Appendix E Context Degradation Logic

This section documents the context degradation experiments. All four methods use the same generation workflow and differ only in how the generated thought text is corrupted before answer generation.

### E.1 Common Workflow

This subsection describes the common generation logic shared by deletion, masking, substitution, and distractor insertion.

[⬇](data:text/plain;base64,SW5wdXQ6Ci0gbWVzc2FnZXMKLSB0aGlua2luZyBidWRnZXQgQgotIGNvcnJ1cHRpb24gbWV0aG9kIFQKClN0ZXAgMToKQnVpbGQgdGhlIGNoYXQgcHJlbHVkZSBhbmQgYXBwZW5kIHRoZSBvcGVuaW5nIHRoaW5rIHRhZy4KClN0ZXAgMjoKR2VuZXJhdGUgdGhpbmsgdGV4dCB3aXRoIGEgaGFyZCBjYXAgb2YgQiB0aGlua2luZyB0b2tlbnMuCgpTdGVwIDM6CkFwcGx5IGNvcnJ1cHRpb24gb3BlcmF0b3IgVCBvbmx5IHRvIHRoZSBnZW5lcmF0ZWQgdGhpbmsgdGV4dC4KClN0ZXAgNDoKUmVjb25zdHJ1Y3QgdGhlIHByb21wdCBhczoKICBwcmVsdWRlCiAgY29ycnVwdGVkIHRoaW5rIHRleHQKICBjbG9zaW5nIHRoaW5rIHRhZwoKU3RlcCA1OgpHZW5lcmF0ZSB0aGUgZmluYWwgYW5zd2VyIGZyb20gdGhlIGNvcnJ1cHRlZCByZWFzb25pbmcgY29udGV4dC4KCk91dHB1dDoKLSBjb3JydXB0ZWQgZnVsbCB0cmFjZQotIHVzZWQgdGhpbmtpbmcgdG9rZW5zCi0gY29ycnVwdGlvbiBtZXRhZGF0YQ==)

Input:

- messages

- thinking budget B

- corruption method T

Step 1:

Build the chat prelude and append the opening think tag.

Step 2:

Generate think text with a hard cap of B thinking tokens.

Step 3:

Apply corruption operator T only to the generated think text.

Step 4:

Reconstruct the prompt as:

prelude

corrupted think text

closing think tag

Step 5:

Generate the final answer from the corrupted reasoning context.

Output:

- corrupted full trace

- used thinking tokens

- corruption metadata

### E.2 Deletion

This subsection describes the deletion corruption logic used in the deletion experiments.

[⬇](data:text/plain;base64,UGFyYW1ldGVyczoKLSBkZWxldGVfcGN0Ci0gZXZlcnlfbgotIHNlZWQKCklucHV0OgotIGNsZWFuIHRoaW5rIHRleHQKCklmIGNvcnJ1cHRpb24gaXMgZGlzYWJsZWQ6CiAgcmV0dXJuIGNsZWFuIHRoaW5rIHRleHQKCkVsc2U6CiAgaW5pdGlhbGl6ZSBSTkcgd2l0aCBiYXNlIHNlZWQgcGx1cyBjYWxsIGluZGV4CgogIElmIGV2ZXJ5X24gaXMgc2V0OgogICAgZGVsZXRlIGV2ZXJ5IG4tdGggd29yZCBkZXRlcm1pbmlzdGljYWxseQogIEVsc2U6CiAgICBkZWxldGUgYXBwcm94aW1hdGVseSBkZWxldGVfcGN0IG9mIHdvcmRzIGF0IHJhbmRvbQoKUmV0dXJuOgotIGNvcnJ1cHRlZCB0aGluayB0ZXh0Ci0gbWV0YWRhdGEgY29udGFpbmluZyBtZXRob2QsIHNlZWQsIGFuZCBwYXJhbWV0ZXJz)

Parameters:

- delete_pct

- every_n

- seed

Input:

- clean think text

If corruption is disabled:

return clean think text

Else:

initialize RNG with base seed plus call index

If every_n is set:

delete every n-th word deterministically

Else:

delete approximately delete_pct of words at random

Return:

- corrupted think text

- metadata containing method, seed, and parameters

### E.3 Masking

This subsection describes the masking corruption logic used in the masking experiments.

[⬇](data:text/plain;base64,UGFyYW1ldGVyczoKLSBtYXNrX3BjdAotIG1hc2tfdG9rZW4KLSBldmVyeV9uCi0gc2VlZAoKSW5wdXQ6Ci0gY2xlYW4gdGhpbmsgdGV4dAoKSWYgY29ycnVwdGlvbiBpcyBkaXNhYmxlZDoKICByZXR1cm4gY2xlYW4gdGhpbmsgdGV4dAoKRWxzZToKICBpbml0aWFsaXplIFJORyB3aXRoIGJhc2Ugc2VlZCBwbHVzIGNhbGwgaW5kZXgKCiAgSWYgZXZlcnlfbiBpcyBzZXQ6CiAgICByZXBsYWNlIGV2ZXJ5IG4tdGggd29yZCB3aXRoIHRoZSBtYXNrIHRva2VuCiAgRWxzZToKICAgIHJlcGxhY2UgYXBwcm94aW1hdGVseSBtYXNrX3BjdCBvZiB3b3JkcyB3aXRoIHRoZSBtYXNrIHRva2VuCgpSZXR1cm46Ci0gY29ycnVwdGVkIHRoaW5rIHRleHQKLSBtZXRhZGF0YSBjb250YWluaW5nIG1ldGhvZCwgc2VlZCwgYW5kIHBhcmFtZXRlcnM=)

Parameters:

- mask_pct

- mask_token

- every_n

- seed

Input:

- clean think text

If corruption is disabled:

return clean think text

Else:

initialize RNG with base seed plus call index

If every_n is set:

replace every n-th word with the mask token

Else:

replace approximately mask_pct of words with the mask token

Return:

- corrupted think text

- metadata containing method, seed, and parameters

### E.4 Substitution

This subsection describes the substitution corruption logic used in the substitution experiments.

[⬇](data:text/plain;base64,UGFyYW1ldGVyczoKLSByZXBsYWNlX3BjdAotIHZvY2FiX3NhbXBsZV9zaXplCi0gYXZvaWRfc3BlY2lhbAotIHNlZWQKCklucHV0OgotIGNsZWFuIHRoaW5rIHRleHQKLSB0b2tlbml6ZXIKCklmIGNvcnJ1cHRpb24gaXMgZGlzYWJsZWQ6CiAgcmV0dXJuIGNsZWFuIHRoaW5rIHRleHQKCkVsc2U6CiAgaW5pdGlhbGl6ZSBSTkcgd2l0aCBiYXNlIHNlZWQgcGx1cyBjYWxsIGluZGV4CiAgc2FtcGxlIHJlcGxhY2VtZW50IHRva2VucyBmcm9tIHRoZSB0b2tlbml6ZXIgdm9jYWJ1bGFyeQogIG9wdGlvbmFsbHkgZXhjbHVkZSBzcGVjaWFsIHRva2VucwogIHJlcGxhY2UgYXBwcm94aW1hdGVseSByZXBsYWNlX3BjdCBvZiB0b2tlbnMgaW4gdGhlIHRoaW5rIHRleHQKClJldHVybjoKLSBjb3JydXB0ZWQgdGhpbmsgdGV4dAotIG1ldGFkYXRhIGNvbnRhaW5pbmcgbWV0aG9kLCBzZWVkLCBhbmQgcGFyYW1ldGVycw==)

Parameters:

- replace_pct

- vocab_sample_size

- avoid_special

- seed

Input:

- clean think text

- tokenizer

If corruption is disabled:

return clean think text

Else:

initialize RNG with base seed plus call index

sample replacement tokens from the tokenizer vocabulary

optionally exclude special tokens

replace approximately replace_pct of tokens in the think text

Return:

- corrupted think text

- metadata containing method, seed, and parameters

### E.5 Distractor Insertion

This subsection describes the distractor insertion logic used in the distractor experiments.

[⬇](data:text/plain;base64,UGFyYW1ldGVyczoKLSBudW1fZGlzdHJhY3RvcnMKLSBkaXN0cmFjdG9yIHBvb2wKLSBzZWVkCgpJbnB1dDoKLSBjbGVhbiB0aGluayB0ZXh0CgpJZiBjb3JydXB0aW9uIGlzIGRpc2FibGVkOgogIHJldHVybiBjbGVhbiB0aGluayB0ZXh0CgpFbHNlOgogIGluaXRpYWxpemUgUk5HIHdpdGggYmFzZSBzZWVkIHBsdXMgY2FsbCBpbmRleAogIHNhbXBsZSBudW1fZGlzdHJhY3RvcnMgZGlzdHJhY3RvciBzZW50ZW5jZXMKICBpbnNlcnQgZGlzdHJhY3RvcnMgaW50byB0aGUgdGhpbmsgdGV4dAoKUmV0dXJuOgotIGNvcnJ1cHRlZCB0aGluayB0ZXh0Ci0gbWV0YWRhdGEgY29udGFpbmluZyBtZXRob2QsIHNlZWQsIGFuZCBwYXJhbWV0ZXJz)

Parameters:

- num_distractors

- distractor pool

- seed

Input:

- clean think text

If corruption is disabled:

return clean think text

Else:

initialize RNG with base seed plus call index

sample num_distractors distractor sentences

insert distractors into the think text

Return:

- corrupted think text

- metadata containing method, seed, and parameters

## Appendix F Full results with bootstrap confidence intervals

This section reports the full numerical results corresponding to the experiments summarized in the main paper. We include all reported accuracies together with their 95% bootstrap confidence intervals.

### F.1 Open-source models

This subsection reports the open-source models’ main results together with average thinking token usage and 95% bootstrap confidence intervals (Table [3](https://arxiv.org/html/2604.02460v2#A6.T3 "Table 3 ‣ F.1 Open-source models ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"), Table [4](https://arxiv.org/html/2604.02460v2#A6.T4 "Table 4 ‣ F.1 Open-source models ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"), Table [5](https://arxiv.org/html/2604.02460v2#A6.T5 "Table 5 ‣ F.1 Open-source models ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"), and Table [6](https://arxiv.org/html/2604.02460v2#A6.T6 "Table 6 ‣ F.1 Open-source models ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")).

Table 3: FRAMES full results for Qwen3-30B-A3B.

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| System | 100 | 500 | 1k | 2k | 5k | 10k |
| SAS | 0.191 | 0.240 | 0.252 | 0.250 | 0.260 | 0.263 |
| 95% CI | (0.158, 0.201) | (0.238, 0.268) | (0.251, 0.282) | (0.248, 0.275) | (0.247, 0.295) | (0.252, 0.299) |
| Avg. thinking tokens | 100 | 474 | 800 | 1103 | 1260 | 1307 |
| Seq | 0.198 | 0.223 | 0.225 | 0.252 | 0.252 | 0.258 |
| 95% CI | (0.174, 0.206) | (0.214, 0.224) | (0.205, 0.232) | (0.227, 0.255) | (0.229, 0.253) | (0.247, 0.281) |
| Avg. thinking tokens | 99.5 | 494 | 889 | 1321 | 1693 | 1808 |
| SAS-L | 0.195 | 0.220 | 0.235 | 0.246 | 0.246 | 0.246 |
| 95% CI | (0.172, 0.210) | (0.204, 0.250) | (0.223, 0.253) | (0.233, 0.261) | (0.237, 0.261) | (0.237, 0.261) |
| Avg. thinking tokens | 100 | 500 | 935 | 1232 | 1309 | 1327 |
| Debate | 0.204 | 0.206 | 0.228 | 0.232 | 0.238 | 0.240 |
| 95% CI | (0.178, 0.209) | (0.173, 0.217) | (0.202, 0.236) | (0.202, 0.241) | (0.210, 0.253) | (0.217, 0.242) |
| Avg. thinking tokens | 100 | 500 | 1000 | 1944 | 3414 | 4061 |
| Ensemble | 0.146 | 0.193 | 0.210 | 0.230 | 0.254 | 0.263 |
| 95% CI | (0.117, 0.149) | (0.177, 0.195) | (0.184, 0.211) | (0.206, 0.253) | (0.215, 0.262) | (0.221, 0.277) |
| Avg. thinking tokens | 100 | 500 | 1000 | 1964 | 4009 | 5571 |
| Subtask-parallel | 0.155 | 0.187 | 0.220 | 0.232 | 0.237 | 0.244 |
| 95% CI | (0.136, 0.161) | (0.172, 0.197) | (0.205, 0.237) | (0.214, 0.233) | (0.225, 0.239) | (0.217, 0.251) |
| Avg. thinking tokens | 100 | 499 | 969 | 1670 | 2592 | 3001 |
| Parallel-roles | 0.207 | 0.223 | 0.240 | 0.256 | 0.265 | 0.271 |
| 95% CI | (0.168, 0.215) | (0.181, 0.229) | (0.213, 0.240) | (0.233, 0.261) | (0.245, 0.274) | (0.250, 0.284) |
| Avg. thinking tokens | 100 | 500 | 999 | 1934 | 3854 | 4850 |




Table 4: MuSiQue 4-hop full results for Qwen3-30B-A3B.

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| System | 100 | 500 | 1k | 2k | 5k | 10k |
| SAS | 0.200 | 0.250 | 0.260 | 0.271 | 0.271 | 0.271 |
| 95% CI | (0.196, 0.214) | (0.248, 0.255) | (0.260, 0.271) | (0.269, 0.276) | (0.268, 0.276) | (0.268, 0.276) |
| Avg. thinking tokens | 100 | 495 | 916 | 1345 | 1453 | 1462 |
| Seq | 0.220 | 0.226 | 0.229 | 0.229 | 0.231 | 0.231 |
| 95% CI | (0.212, 0.238) | (0.229, 0.235) | (0.223, 0.248) | (0.223, 0.240) | (0.226, 0.243) | (0.225, 0.244) |
| Avg. thinking tokens | 99.6 | 495 | 907 | 1383 | 1766 | 1811 |
| SAS-L | 0.210 | 0.213 | 0.231 | 0.239 | 0.248 | 0.248 |
| 95% CI | (0.200, 0.214) | (0.211, 0.224) | (0.227, 0.238) | (0.238, 0.255) | (0.248, 0.271) | (0.248, 0.271) |
| Avg. thinking tokens | 100 | 500 | 976 | 1340 | 1379 | 1379 |
| Debate | 0.225 | 0.229 | 0.224 | 0.234 | 0.249 | 0.244 |
| 95% CI | (0.211, 0.244) | (0.216, 0.234) | (0.218, 0.228) | (0.225, 0.240) | (0.233, 0.255) | (0.237, 0.250) |
| Avg. thinking tokens | 100 | 500 | 1000 | 1968 | 3702 | 4465 |
| Ensemble | 0.149 | 0.183 | 0.197 | 0.224 | 0.226 | 0.245 |
| 95% CI | (0.137, 0.157) | (0.175, 0.204) | (0.194, 0.208) | (0.212, 0.229) | (0.209, 0.232) | (0.237, 0.254) |
| Avg. thinking tokens | 100 | 500 | 1000 | 1992 | 4523 | 6230 |
| Subtask-parallel | 0.174 | 0.187 | 0.207 | 0.234 | 0.249 | 0.254 |
| 95% CI | (0.156, 0.175) | (0.170, 0.196) | (0.197, 0.214) | (0.220, 0.237) | (0.243, 0.259) | (0.251, 0.261) |
| Avg. thinking tokens | 100 | 499 | 986 | 1882 | 3092 | 3510 |
| Parallel-roles | 0.202 | 0.204 | 0.220 | 0.226 | 0.246 | 0.242 |
| 95% CI | (0.193, 0.209) | (0.192, 0.217) | (0.214, 0.231) | (0.206, 0.241) | (0.233, 0.249) | (0.233, 0.251) |
| Avg. thinking tokens | 100 | 500 | 1000 | 1986 | 4420 | 5785 |




Table 5: FRAMES full results for DeepSeek-R1-Distill-Llama-70B.

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| System | 100 | 500 | 1k | 2k | 5k | 10k |
| SAS | 0.365 | 0.427 | 0.448 | 0.454 | 0.455 | 0.456 |
| 95% CI | (0.359, 0.378) | (0.407, 0.432) | (0.421, 0.459) | (0.431, 0.463) | (0.434, 0.464) | (0.434, 0.465) |
| Avg. thinking tokens | 100 | 466 | 550 | 574 | 635 | 960 |
| Seq | 0.387 | 0.396 | 0.391 | 0.393 | 0.394 | 0.397 |
| 95% CI | (0.365, 0.395) | (0.373, 0.397) | (0.360, 0.400) | (0.369, 0.405) | (0.372, 0.399) | (0.374, 0.400) |
| Avg. thinking tokens | 99.6 | 493 | 749 | 959 | 1080 | 1337 |
| SAS-L | 0.374 | 0.432 | 0.448 | 0.451 | 0.444 | 0.445 |
| 95% CI | (0.370, 0.385) | (0.423, 0.441) | (0.429, 0.452) | (0.439, 0.457) | (0.428, 0.450) | (0.414, 0.450) |
| Avg. thinking tokens | 100 | 459 | 567 | 698 | 755 | 860 |
| Debate | 0.400 | 0.392 | 0.397 | 0.425 | 0.439 | 0.444 |
| 95% CI | (0.359, 0.419) | (0.363, 0.406) | (0.374, 0.409) | (0.387, 0.432) | (0.414, 0.442) | (0.417, 0.448) |
| Avg. thinking tokens | 100 | 500 | 1000 | 1805 | 2376 | 2496 |
| Ensemble | 0.365 | 0.400 | 0.419 | 0.431 | 0.450 | 0.458 |
| 95% CI | (0.339, 0.395) | (0.384, 0.405) | (0.376, 0.426) | (0.402, 0.438) | (0.423, 0.457) | (0.442, 0.455) |
| Avg. thinking tokens | 100 | 500 | 999 | 1868 | 2879 | 3163 |
| Subtask-parallel | 0.385 | 0.402 | 0.420 | 0.434 | 0.436 | 0.434 |
| 95% CI | (0.369, 0.397) | (0.371, 0.419) | (0.393, 0.430) | (0.402, 0.443) | (0.400, 0.443) | (0.400, 0.441) |
| Avg. thinking tokens | 100 | 492 | 884 | 1261 | 1484 | 1559 |
| Parallel-roles | 0.427 | 0.407 | 0.425 | 0.433 | 0.448 | 0.450 |
| 95% CI | (0.411, 0.441) | (0.380, 0.409) | (0.397, 0.433) | (0.408, 0.434) | (0.433, 0.461) | (0.436, 0.465) |
| Avg. thinking tokens | 100 | 500 | 996 | 1814 | 2647 | 2627 |




Table 6: MuSiQue 4-hop full results for DeepSeek-R1-Distill-Llama-70B.

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| System | 100 | 500 | 1k | 2k | 5k | 10k |
| SAS | 0.294 | 0.383 | 0.407 | 0.418 | 0.419 | 0.417 |
| 95% CI | (0.282, 0.305) | (0.372, 0.397) | (0.400, 0.413) | (0.412, 0.429) | (0.413, 0.429) | (0.402, 0.429) |
| Avg. thinking tokens | 100 | 412 | 519 | 574 | 635 | 724 |
| Seq | 0.328 | 0.332 | 0.320 | 0.327 | 0.323 | 0.327 |
| 95% CI | (0.324, 0.347) | (0.317, 0.361) | (0.313, 0.336) | (0.312, 0.357) | (0.318, 0.344) | (0.320, 0.351) |
| Avg. thinking tokens | 99.6 | 479 | 788 | 1017 | 1105 | 1124 |
| SAS-L | 0.316 | 0.375 | 0.402 | 0.411 | 0.412 | 0.412 |
| 95% CI | (0.315, 0.335) | (0.362, 0.398) | (0.393, 0.428) | (0.400, 0.429) | (0.398, 0.434) | (0.398, 0.434) |
| Avg. thinking tokens | 100 | 459 | 623 | 704 | 755 | 827 |
| Debate | 0.308 | 0.320 | 0.315 | 0.352 | 0.357 | 0.360 |
| 95% CI | (0.304, 0.321) | (0.311, 0.342) | (0.299, 0.342) | (0.332, 0.364) | (0.354, 0.379) | (0.341, 0.368) |
| Avg. thinking tokens | 100 | 500 | 998 | 1805 | 2376 | 2506 |
| Ensemble | 0.316 | 0.319 | 0.323 | 0.346 | 0.334 | 0.330 |
| 95% CI | (0.311, 0.330) | (0.303, 0.324) | (0.317, 0.345) | (0.330, 0.371) | (0.325, 0.362) | (0.327, 0.337) |
| Avg. thinking tokens | 100 | 500 | 999 | 1868 | 2879 | 3267 |
| Subtask-parallel | 0.309 | 0.303 | 0.317 | 0.317 | 0.317 | 0.319 |
| 95% CI | (0.297, 0.327) | (0.297, 0.322) | (0.312, 0.337) | (0.315, 0.339) | (0.308, 0.338) | (0.309, 0.340) |
| Avg. thinking tokens | 100 | 492 | 884 | 1261 | 1484 | 1556 |
| Parallel-roles | 0.316 | 0.329 | 0.334 | 0.335 | 0.345 | 0.354 |
| 95% CI | (0.305, 0.326) | (0.323, 0.334) | (0.325, 0.349) | (0.317, 0.350) | (0.326, 0.362) | (0.341, 0.367) |
| Avg. thinking tokens | 100 | 500 | 996 | 1814 | 2647 | 2799 |

### F.2 Gemini 2.5 main results

This subsection reports the Gemini results together with self-counted thought tokens, visible thought words, assumed visible thought tokens, and 95% bootstrap confidence intervals (Table [7](https://arxiv.org/html/2604.02460v2#A6.T7 "Table 7 ‣ F.2 Gemini 2.5 main results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"), Table [8](https://arxiv.org/html/2604.02460v2#A6.T8 "Table 8 ‣ F.2 Gemini 2.5 main results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"), Table [9](https://arxiv.org/html/2604.02460v2#A6.T9 "Table 9 ‣ F.2 Gemini 2.5 main results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets"), and Table [10](https://arxiv.org/html/2604.02460v2#A6.T10 "Table 10 ‣ F.2 Gemini 2.5 main results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")).

Table 7: MuSiQue 4-hop full results for Gemini-2.5-Flash.

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| System | 100 | 500 | 1k | 2k | 5k | 10k |
| SAS acc. | 0.263 | 0.340 | 0.331 | 0.334 | 0.344 | 0.338 |
| 95% CI | (0.249, 0.266) | (0.319, 0.358) | (0.324, 0.346) | (0.322, 0.353) | (0.323, 0.370) | (0.321, 0.361) |
| Self-count tok. | 90 | 399 | 637 | 884 | 1407 | 1687 |
| Visible words | 124 | 212 | 248 | 254 | 250 | 251 |
| Assumed visible tok. | 177 | 303 | 354 | 363 | 357 | 359 |
| Sequential acc. | 0.272 | 0.287 | 0.287 | 0.283 | 0.289 | 0.285 |
| 95% CI | (0.258, 0.291) | (0.283, 0.309) | (0.270, 0.308) | (0.271, 0.296) | (0.273, 0.315) | (0.271, 0.291) |
| Self-count tok. | 84 | 366 | 599 | 885 | 1312 | 1681 |
| Visible words | 469 | 426 | 505 | 605 | 679 | 684 |
| Assumed visible tok. | 670 | 609 | 721 | 864 | 970 | 977 |
| SAS-L acc. | 0.352 | 0.352 | 0.354 | 0.369 | 0.364 | 0.369 |
| 95% CI | (0.345, 0.355) | (0.334, 0.370) | (0.340, 0.358) | (0.356, 0.378) | (0.358, 0.375) | (0.358, 0.373) |
| Self-count tok. | 96 | 462 | 810 | 1443 | 2549 | 3000 |
| Visible words | 180 | 251 | 308 | 375 | 326 | 335 |
| Assumed visible tok. | 257 | 359 | 440 | 536 | 466 | 479 |
| Subtask-parallel acc. | 0.264 | 0.291 | 0.313 | 0.323 | 0.332 | 0.335 |
| 95% CI | (0.257, 0.272) | (0.282, 0.310) | (0.308, 0.329) | (0.312, 0.345) | (0.317, 0.336) | (0.331, 0.357) |
| Self-count tok. | 74 | 373 | 723 | 1311 | 2387 | 3323 |
| Visible words | 437 | 440 | 582 | 751 | 929 | 963 |
| Assumed visible tok. | 624 | 629 | 831 | 1073 | 1327 | 1376 |
| Parallel-roles acc. | 0.300 | 0.311 | 0.306 | 0.330 | 0.340 | 0.349 |
| 95% CI | (0.282, 0.322) | (0.297, 0.336) | (0.286, 0.326) | (0.300, 0.335) | (0.328, 0.352) | (0.331, 0.361) |
| Self-count tok. | 79 | 389 | 826 | 1689 | 3453 | 5147 |
| Visible words | 582 | 643 | 821 | 1114 | 1506 | 1603 |
| Assumed visible tok. | 831 | 919 | 1173 | 1591 | 2151 | 2290 |
| Debate acc. | 0.318 | 0.329 | 0.328 | 0.349 | 0.355 | 0.354 |
| 95% CI | (0.297, 0.333) | (0.312, 0.346) | (0.312, 0.341) | (0.335, 0.361) | (0.346, 0.363) | (0.342, 0.364) |
| Self-count tok. | 73 | 392 | 833 | 1732 | 3294 | 4390 |
| Visible words | 512 | 491 | 654 | 912 | 1136 | 1180 |
| Assumed visible tok. | 731 | 701 | 934 | 1303 | 1623 | 1686 |
| Ensemble acc. | 0.243 | 0.274 | 0.299 | 0.320 | 0.338 | 0.343 |
| 95% CI | (0.231, 0.251) | (0.268, 0.280) | (0.277, 0.315) | (0.310, 0.322) | (0.338, 0.344) | (0.340, 0.376) |
| Self-count tok. | 74 | 442 | 897 | 1742 | 3131 | 4363 |
| Visible words | 752 | 615 | 786 | 1014 | 1246 | 1295 |
| Assumed visible tok. | 1074 | 879 | 1123 | 1449 | 1780 | 1850 |




Table 8: MuSiQue 4-hop full results for Gemini-2.5-Pro.

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| System | 100 | 500 | 1k | 2k | 5k | 10k |
| SAS acc. | 0.308 | 0.391 | 0.413 | 0.412 | 0.419 | 0.428 |
| 95% CI | (0.288, 0.320) | (0.369, 0.405) | (0.397, 0.420) | (0.408, 0.418) | (0.410, 0.425) | (0.413, 0.435) |
| Self-count tok. | 84 | 442 | 816 | 884 | 1526 | 1522 |
| Visible words | 124 | 226 | 273 | 254 | 276 | 275 |
| Assumed visible tok. | 177 | 323 | 390 | 363 | 394 | 393 |
| Sequential acc. | 0.393 | 0.391 | 0.400 | 0.414 | 0.392 | 0.392 |
| 95% CI | (0.371, 0.404) | (0.379, 0.405) | (0.384, 0.414) | (0.396, 0.426) | (0.380, 0.410) | (0.380, 0.410) |
| Self-count tok. | 320 | 357 | 644 | 1388 | 2351 | 2351 |
| Visible words | 391 | 402 | 485 | 743 | 941 | 941 |
| Assumed visible tok. | 559 | 574 | 693 | 1061 | 1344 | 1344 |
| SAS-L acc. | 0.373 | 0.423 | 0.414 | 0.449 | 0.455 | 0.436 |
| 95% CI | (0.345, 0.384) | (0.367, 0.438) | (0.383, 0.421) | (0.449, 0.461) | (0.438, 0.475) | (0.423, 0.449) |
| Self-count tok. | 77 | 403 | 907 | 1986 | 2260 | 2199 |
| Visible words | 146 | 269 | 378 | 355 | 348 | 351 |
| Assumed visible tok. | 209 | 384 | 540 | 507 | 497 | 501 |
| Subtask-parallel acc. | 0.364 | 0.363 | 0.397 | 0.381 | 0.417 | 0.410 |
| 95% CI | (0.340, 0.391) | (0.355, 0.368) | (0.390, 0.417) | (0.368, 0.392) | (0.390, 0.428) | (0.405, 0.427) |
| Self-count tok. | 294 | 356 | 666 | 1573 | 3251 | 4003 |
| Visible words | 477 | 510 | 523 | 908 | 1004 | 1025 |
| Assumed visible tok. | 681 | 729 | 747 | 1297 | 1434 | 1464 |
| Parallel-roles acc. | 0.400 | 0.397 | 0.430 | 0.409 | 0.447 | 0.447 |
| 95% CI | (0.380, 0.400) | (0.381, 0.400) | (0.416, 0.440) | (0.396, 0.412) | (0.441, 0.464) | (0.445, 0.461) |
| Self-count tok. | 349 | 349 | 627 | 1734 | 4301 | 6458 |
| Visible words | 626 | 653 | 658 | 1128 | 1326 | 1361 |
| Assumed visible tok. | 894 | 933 | 940 | 1611 | 1894 | 1944 |
| Debate acc. | 0.412 | 0.435 | 0.444 | 0.448 | 0.470 | 0.458 |
| 95% CI | (0.392, 0.418) | (0.432, 0.462) | (0.430, 0.456) | (0.430, 0.476) | (0.453, 0.482) | (0.461, 0.477) |
| Self-count tok. | 310 | 310 | 661 | 1777 | 4644 | 6615 |
| Visible words | 464 | 384 | 532 | 888 | 1219 | 1223 |
| Assumed visible tok. | 663 | 549 | 760 | 1269 | 1741 | 1747 |
| Ensemble acc. | 0.302 | 0.330 | 0.325 | 0.372 | 0.434 | 0.445 |
| 95% CI | (0.282, 0.309) | (0.319, 0.338) | (0.319, 0.331) | (0.357, 0.381) | (0.421, 0.435) | (0.436, 0.456) |
| Self-count tok. | 403 | 402 | 564 | 1362 | 3835 | 5764 |
| Visible words | 719 | 625 | 681 | 938 | 1361 | 1409 |
| Assumed visible tok. | 1027 | 893 | 973 | 1340 | 1944 | 2013 |




Table 9: FRAMES full results for Gemini-2.5-Flash.

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| System | 100 | 500 | 1k | 2k | 5k | 10k |
| SAS acc. | 0.333 | 0.487 | 0.551 | 0.532 | 0.545 | 0.547 |
| 95% CI | (0.315, 0.341) | (0.473, 0.496) | (0.537, 0.570) | (0.510, 0.537) | (0.541, 0.564) | (0.524, 0.551) |
| Self-count tok. | 89 | 374 | 535 | 714 | 1057 | 1267 |
| Visible words | 138 | 221 | 254 | 278 | 272 | 275 |
| Assumed visible tok. | 197 | 316 | 363 | 397 | 389 | 393 |
| Sequential acc. | 0.462 | 0.494 | 0.507 | 0.526 | 0.524 | 0.516 |
| 95% CI | (0.446, 0.477) | (0.471, 0.515) | (0.482, 0.530) | (0.489, 0.544) | (0.503, 0.550) | (0.509, 0.550) |
| Self-count tok. | 73 | 334 | 517 | 715 | 984 | 1223 |
| Visible words | 527 | 395 | 458 | 521 | 567 | 569 |
| Assumed visible tok. | 753 | 564 | 654 | 744 | 810 | 813 |
| SAS-L acc. | 0.427 | 0.459 | 0.484 | 0.517 | 0.542 | 0.546 |
| 95% CI | (0.421, 0.446) | (0.438, 0.472) | (0.466, 0.497) | (0.500, 0.542) | (0.516, 0.548) | (0.520, 0.560) |
| Self-count tok. | 94 | 452 | 810 | 1299 | 1970 | 2158 |
| Visible words | 237 | 301 | 383 | 411 | 400 | 389 |
| Assumed visible tok. | 339 | 430 | 547 | 587 | 571 | 556 |
| Debate acc. | 0.445 | 0.470 | 0.527 | 0.527 | 0.552 | 0.564 |
| 95% CI | (0.428, 0.489) | (0.458, 0.471) | (0.503, 0.549) | (0.505, 0.544) | (0.542, 0.557) | (0.545, 0.574) |
| Self-count tok. | 79 | 404 | 847 | 1580 | 2679 | 3193 |
| Visible words | 598 | 570 | 716 | 941 | 1137 | 1135 |
| Assumed visible tok. | 854 | 814 | 1023 | 1344 | 1624 | 1621 |
| Ensemble acc. | 0.284 | 0.384 | 0.458 | 0.498 | 0.539 | 0.559 |
| 95% CI | (0.276, 0.301) | (0.383, 0.400) | (0.444, 0.470) | (0.492, 0.513) | (0.527, 0.551) | (0.538, 0.560) |
| Self-count tok. | 76 | 450 | 889 | 1556 | 2465 | 3191 |
| Visible words | 874 | 668 | 770 | 954 | 1116 | 1157 |
| Assumed visible tok. | 1249 | 954 | 1100 | 1363 | 1594 | 1653 |
| Subtask-parallel acc. | 0.365 | 0.442 | 0.482 | 0.509 | 0.532 | 0.541 |
| 95% CI | (0.333, 0.382) | (0.429, 0.466) | (0.472, 0.491) | (0.491, 0.527) | (0.518, 0.542) | (0.530, 0.553) |
| Self-count tok. | 68 | 354 | 644 | 1048 | 1775 | 2320 |
| Visible words | 420 | 405 | 511 | 622 | 732 | 746 |
| Assumed visible tok. | 600 | 579 | 730 | 889 | 1046 | 1066 |
| Parallel-roles acc. | 0.441 | 0.451 | 0.495 | 0.536 | 0.545 | 0.556 |
| 95% CI | (0.405, 0.448) | (0.424, 0.453) | (0.481, 0.509) | (0.514, 0.545) | (0.534, 0.555) | (0.537, 0.559) |
| Self-count tok. | 81 | 395 | 816 | 1505 | 2803 | 3755 |
| Visible words | 673 | 718 | 819 | 1021 | 1282 | 1347 |
| Assumed visible tok. | 961 | 1026 | 1170 | 1459 | 1831 | 1924 |




Table 10: FRAMES full results for Gemini-2.5-Pro.

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| System | 100 | 500 | 1k | 2k | 5k | 10k |
| SAS acc. | 0.368 | 0.600 | 0.680 | 0.700 | 0.700 | 0.692 |
| 95% CI | (0.358, 0.376) | (0.578, 0.608) | (0.640, 0.704) | (0.673, 0.705) | (0.691, 0.705) | (0.661, 0.718) |
| Self-count tok. | 84 | 494 | 807 | 1119 | 1158 | 1210 |
| Visible words | 138 | 261 | 322 | 337 | 337 | 330 |
| Assumed visible tok. | 197 | 373 | 460 | 481 | 481 | 471 |
| Sequential acc. | 0.654 | 0.660 | 0.670 | 0.690 | 0.680 | 0.691 |
| 95% CI | (0.639, 0.687) | (0.640, 0.706) | (0.652, 0.705) | (0.651, 0.730) | (0.671, 0.693) | (0.660, 0.708) |
| Self-count tok. | 281 | 354 | 683 | 1312 | 2014 | 2152 |
| Visible words | 419 | 434 | 533 | 766 | 919 | 923 |
| Assumed visible tok. | 599 | 620 | 761 | 1094 | 1313 | 1319 |
| SAS-L acc. | 0.451 | 0.450 | 0.610 | 0.680 | 0.690 | 0.692 |
| 95% CI | (0.435, 0.473) | (0.444, 0.463) | (0.589, 0.619) | (0.665, 0.697) | (0.670, 0.700) | (0.664, 0.704) |
| Self-count tok. | 80 | 390 | 902 | 1541 | 1626 | 1591 |
| Visible words | 148 | 315 | 428 | 418 | 348 | 414 |
| Assumed visible tok. | 211 | 450 | 611 | 597 | 497 | 591 |
| Debate acc. | 0.649 | 0.660 | 0.638 | 0.660 | 0.700 | 0.697 |
| 95% CI | (0.632, 0.658) | (0.632, 0.676) | (0.615, 0.663) | (0.624, 0.669) | (0.687, 0.720) | (0.670, 0.712) |
| Self-count tok. | 317 | 315 | 673 | 1854 | 4371 | 5431 |
| Visible words | 482 | 481 | 625 | 1032 | 1392 | 1430 |
| Assumed visible tok. | 689 | 687 | 893 | 1474 | 1989 | 2043 |
| Ensemble acc. | 0.407 | 0.400 | 0.430 | 0.558 | 0.710 | 0.719 |
| 95% CI | (0.400, 0.420) | (0.395, 0.436) | (0.411, 0.447) | (0.546, 0.564) | (0.694, 0.712) | (0.704, 0.750) |
| Self-count tok. | 406 | 408 | 587 | 1426 | 3552 | 4543 |
| Visible words | 670 | 673 | 737 | 1011 | 1411 | 1452 |
| Assumed visible tok. | 957 | 961 | 1053 | 1444 | 2016 | 2074 |
| Subtask-parallel acc. | 0.530 | 0.562 | 0.596 | 0.637 | 0.652 | 0.655 |
| 95% CI | (0.499, 0.555) | (0.547, 0.591) | (0.583, 0.638) | (0.625, 0.660) | (0.634, 0.676) | (0.637, 0.677) |
| Self-count tok. | 219 | 350 | 772 | 1481 | 2414 | 2667 |
| Visible words | 355 | 409 | 558 | 772 | 926 | 915 |
| Assumed visible tok. | 507 | 584 | 797 | 1103 | 1323 | 1307 |
| Parallel-roles acc. | 0.609 | 0.598 | 0.600 | 0.658 | 0.700 | 0.718 |
| 95% CI | (0.597, 0.633) | (0.583, 0.633) | (0.593, 0.625) | (0.648, 0.676) | (0.696, 0.723) | (0.711, 0.736) |
| Self-count tok. | 343 | 344 | 640 | 1789 | 3871 | 5085 |
| Visible words | 619 | 630 | 739 | 1099 | 1514 | 1558 |
| Assumed visible tok. | 884 | 900 | 1056 | 1570 | 2163 | 2226 |

### F.3 Paraphrase results

This subsection reports the paraphrase results with confidence intervals for the original, light paraphrased, and deep paraphrased settings (Table [11](https://arxiv.org/html/2604.02460v2#A6.T11 "Table 11 ‣ F.3 Paraphrase results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")).

Table 11: Paraphrase results with 95% bootstrap confidence intervals.

|  |  | Original | | Light paraphrase | | Deep paraphrase | |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Model | Budget | SAS | Seq | SAS | Seq | SAS | Seq |
| Qwen3-30B-A3B | 1k | 0.260 (0.260, 0.271) | 0.229 (0.223, 0.248) | 0.249 (0.236, 0.260) | 0.224 (0.175, 0.234) | 0.268 (0.264, 0.286) | 0.225 (0.214, 0.234) |
| Qwen3-30B-A3B | 2k | 0.271 (0.269, 0.276) | 0.229 (0.223, 0.240) | 0.264 (0.254, 0.274) | 0.204 (0.200, 0.220) | 0.272 (0.263, 0.286) | 0.236 (0.231, 0.248) |
| Gemini-2.5-Flash | 1k | 0.331 (0.324, 0.346) | 0.287 (0.270, 0.308) | 0.326 (0.320, 0.331) | 0.278 (0.266, 0.298) | 0.358 (0.346, 0.373) | 0.308 (0.283, 0.325) |
| Gemini-2.5-Flash | 2k | 0.334 (0.322, 0.353) | 0.283 (0.271, 0.296) | 0.329 (0.323, 0.340) | 0.289 (0.271, 0.304) | 0.348 (0.332, 0.356) | 0.304 (0.277, 0.309) |

### F.4 Multiple Gemini model version results

This subsection reports the unlimited thinking results for multiple different Gemini model versions with confidence intervals (Table [12](https://arxiv.org/html/2604.02460v2#A6.T12 "Table 12 ‣ F.4 Multiple Gemini model version results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")).

Table 12: MuSiQue 4-hop accuracy across Gemini model versions with unlimited thinking, with 95% bootstrap confidence intervals.

| Model | SAS | Sequential |
| --- | --- | --- |
| Gemini-2-Flash-Lite | 0.258 (0.245, 0.282) | 0.255 (0.226, 0.266) |
| Gemini-2-Flash | 0.347 (0.333, 0.366) | 0.308 (0.296, 0.321) |
| Gemini-2.5-Flash | 0.296 (0.276, 0.319) | 0.294 (0.279, 0.316) |
| Gemini-2.5-Pro | 0.399 (0.381, 0.400) | 0.396 (0.372, 0.403) |
| Gemini-3-Pro-Preview | 0.491 (0.472, 0.500) | 0.489 (0.461, 0.513) |

### F.5 Context degradation results

This subsection reports the full context degradation results for all four perturbation families together with their 95% bootstrap confidence intervals (Table [13](https://arxiv.org/html/2604.02460v2#A6.T13 "Table 13 ‣ F.5 Context degradation results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")).

Table 13: Context-degradation results on MuSiQue 4-hop with Qwen3-30B-A3B and a fixed 1000-token thinking budget.

| Method | Level | SAS | Sequential |
| --- | --- | --- | --- |
| Deletion | $\alpha=0.3$ | 0.245 (0.234, 0.248) | 0.221 (0.218, 0.229) |
| Deletion | $\alpha=0.5$ | 0.216 (0.210, 0.226) | 0.219 (0.217, 0.235) |
| Deletion | $\alpha=0.7$ | 0.229 (0.221, 0.242) | 0.215 (0.213, 0.225) |
| Masking | $\alpha=0.3$ | 0.234 (0.223, 0.255) | 0.221 (0.211, 0.229) |
| Masking | $\alpha=0.5$ | 0.223 (0.205, 0.238) | 0.223 (0.206, 0.231) |
| Masking | $\alpha=0.7$ | 0.220 (0.215, 0.224) | 0.231 (0.224, 0.248) |
| Substitution | $\alpha=0.3$ | 0.243 (0.232, 0.253) | 0.217 (0.206, 0.226) |
| Substitution | $\alpha=0.5$ | 0.231 (0.215, 0.241) | 0.223 (0.216, 0.235) |
| Substitution | $\alpha=0.7$ | 0.200 (0.185, 0.211) | 0.225 (0.220, 0.240) |
| Distractors | $k=10$ | 0.257 (0.256, 0.269) | 0.228 (0.219, 0.248) |
| Distractors | $k=20$ | 0.254 (0.250, 0.262) | 0.232 (0.230, 0.239) |
| Distractors | $k=30$ | 0.256 (0.243, 0.257) | 0.233 (0.219, 0.241) |

## Appendix G Diagnostic: On Gemini Thought Token Accounting

As introduced in the paper, we use the official thinkingBudget parameter for Gemini models. However, official documentation 22
2
https://ai.google.dev/gemini-api/docs/thinking defines this as a *guide* rather than a hard cap and discloses model-specific min/max ranges and possible over/underflow. This aligns with community reports of mismatches between requested budget and observed output 33
3
This is mentioned in https://github.com/googleapis/python-genai/issues/782.

Our own experiments confirm a significant and complex discrepancy between the API-reported thoughts_token_count and the actual token count of the visible thought content. We tracked three values for all Gemini experiments: (i) the API-reported token count, (ii) a content-based word count, and (iii) a proxy token count derived by multiplying the word count by $10/7$ 44
4
This number is obtained from averaging the word-to-token ratio mentioned in https://ai.google.dev/gemini-api/docs/tokens.

Our analysis reveals three key findings:

- •

  API-Reported counts are highly inflated at higher thinking budget. The thoughts_token_count returned by the API is often substantially larger than the token count of the visible text at higher thinking budget. For example, using Gemini-2.5-Flash with a *requested* 10k budget, the SAS pipeline reported an average of 1,687 thinking tokens. However, the visible thought content only contained an average of 251 words, a proxy for 359 tokens (see Table [7](https://arxiv.org/html/2604.02460v2#A6.T7 "Table 7 ‣ F.2 Gemini 2.5 main results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")). This represents a 4.7x inflation factor, suggesting the API may be counting internal reasoning steps that are never externalized in the text.
- •

  Visible thought content plateaus. We observe that for the standard SAS prompt and Sequential MAS, the *actual length* of the visible thought text (our proxy) hits a ceiling and stops growing, even as the requested budget increases. For Gemini-2.5-Flash SAS, the visible thought proxy plateaus at $\approx$350 tokens. It is 354 tokens at a 1k budget and 359 tokens at a 10k budget (see Table [7](https://arxiv.org/html/2604.02460v2#A6.T7 "Table 7 ‣ F.2 Gemini 2.5 main results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")). This suggests that simply increasing the thinkingBudget parameter does not guarantee more extensive reasoning, even when the API reports so. Our SAS with longer thinking variant successfully produced more visible text (e.g., 479 tokens at 10k), confirming that prompt-level incentives are also critical.
- •

  Sequential MAS produces more visible thought text than SAS. At a matched *requested* budget, the Sequential MAS pipeline consistently produced more total visible thought text than the SAS pipeline. At a 1k budget on Pro, MAS produced 693 proxy tokens vs. SAS’s 390 (see Table [8](https://arxiv.org/html/2604.02460v2#A6.T8 "Table 8 ‣ F.2 Gemini 2.5 main results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets")). This is likely because the Sequential MAS pipeline executes $k$ separate agent calls, and the final thought text is a concatenation of $k$ distinct (and potentially truncated) thought blocks, leading to more total text output.

These accounting artifacts make a direct “apples-to-apples” compute comparison based on *observed* tokens (either API-reported or content-based) intractable. The API-reported count is unreliable, and the proxy visible token is non-linear with the requested budget.

Therefore, our primary analysis intentionally and necessarily compares configurations based on their matched *requested* budget $B$. This is the only variable that can be directly controlled by the researcher. We argue this remains the most fair and reproducible method for evaluation, even if the underlying models utilize that budget in different and opaque ways. We strongly recommend researchers to acknowledge this discrepancy and call on API providers to clarify how thoughts_token_count is calculated.

## Appendix H Gemini Results across different version:

Table [12](https://arxiv.org/html/2604.02460v2#A6.T12 "Table 12 ‣ F.4 Multiple Gemini model version results ‣ Appendix F Full results with bootstrap confidence intervals ‣ Single-Agent LLMs Outperform Multi-Agent Systems onMulti-Hop Reasoning Under Equal Thinking Token Budgets") shows details results of Gemini model across different version
