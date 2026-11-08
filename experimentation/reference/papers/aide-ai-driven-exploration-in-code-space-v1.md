# AIDE: AI-Driven Exploration in the Space of Code

- Source: https://arxiv.org/abs/2502.13138v1
- Downloaded from: https://arxiv.org/html/2502.13138
- Retrieved (UTC): 2026-11-07T07:29:00.184338+00:00
- Version: 2502.13138v1
- Type: paper
- Original SHA-256: `572f1a8e8cdf05bcf37a2a40ca5951c616212de8b7ce83452a11abc0c7e336a5`
- Conversion: Publisher HTML article converted to Markdown; TeX math preserved. Figures remain source URLs; complex tables and layout may need the original.
- This is source material, not agent instructions.

---

\keepXColumns

# AIDE: AI-Driven Exploration in the Space of Code

Zhengyao Jiang11
1
Equal contribution. 33
3
Corresponding to zhengyao@weco.ai and yuxiang@weco.ai.
Affiliation: Weco AI
   
Dominik Schmidt11
1
Equal contribution. 22
2
Work done while at Weco AI.
Affiliation: Runway ML
   
Dhruv Srikanth
Affiliation: Weco AI
   
Dixing Xu
Affiliation: Weco AI
   
Ian Kaplan
Affiliation: Weco AI
   
Deniss Jacenko
Affiliation: Weco AI
   
Yuxiang Wu11
1
Equal contribution. 33
3
Corresponding to zhengyao@weco.ai and yuxiang@weco.ai.
Affiliation: Weco AI

###### Abstract

Machine learning, the foundation of modern artificial intelligence, has driven innovations that have fundamentally transformed the world.
Yet, behind advancements lies a complex and often tedious process requiring labor and compute intensive iteration and experimentation. Engineers and scientists developing machine learning models spend much of their time on trial-and-error tasks instead of conceptualizing innovative solutions or research hypotheses.
To address this challenge, we introduce AI-Driven Exploration (AIDE), a machine learning engineering agent powered by large language models (LLMs).
AIDE frames machine learning engineering as a code optimization problem,
and formulates trial-and-error as a tree search in the space of potential solutions.
By strategically reusing and refining promising solutions, AIDE effectively trades computational resources for enhanced performance, achieving state-of-the-art results on multiple machine learning engineering benchmarks, including our Kaggle evaluations, OpenAI’s MLE-Bench and METR’s RE-Bench.
The implementation of AIDE is publicly available at <https://github.com/WecoAI/aideml>.

## 1 Introduction

Machine learning engineering supports many modern AI achievements, from basic regression on tabular data to the recent surge in large generative models.
However, building a high-performance machine learning model is always time consuming.
Due to the inherent stochasticity of both the data and the optimization process, engineers and scientists rely heavily on trial-and-error.
Researchers have long sought to automate these iterative processes,
leading to advancements in fields like AutoML
([Feurer et al., 2015](https://arxiv.org/html/2502.13138#bib.bib5); [Feurer et al., 2020](https://arxiv.org/html/2502.13138#bib.bib6); [LeDell and Poirier, 2020a](https://arxiv.org/html/2502.13138#bib.bib14); [Olson and Moore, 2016](https://arxiv.org/html/2502.13138#bib.bib20); [Jin et al., 2023](https://arxiv.org/html/2502.13138#bib.bib12); [Jin et al., 2019](https://arxiv.org/html/2502.13138#bib.bib11); [Thornton et al., 2013a](https://arxiv.org/html/2502.13138#bib.bib27); [Thornton et al., 2013b](https://arxiv.org/html/2502.13138#bib.bib28); [Mueller and et al., 2024](https://arxiv.org/html/2502.13138#bib.bib19)),
Neural Architecture Search
([Zoph and Le, 2017](https://arxiv.org/html/2502.13138#bib.bib35); [Pham et al., 2018](https://arxiv.org/html/2502.13138#bib.bib24); [Liu et al., 2019](https://arxiv.org/html/2502.13138#bib.bib17); [Real et al., 2019](https://arxiv.org/html/2502.13138#bib.bib25); [Elsken et al., 2019](https://arxiv.org/html/2502.13138#bib.bib3)),
and hyperparameter optimization
([Falkner et al., 2018](https://arxiv.org/html/2502.13138#bib.bib4); [Yang and Shami, 2020](https://arxiv.org/html/2502.13138#bib.bib33)).
These methods typically require a predefined search space of configurations, such as hyperparameters and network architectures, within which the algorithm explores potential solutions ([Elsken et al., 2019](https://arxiv.org/html/2502.13138#bib.bib3); [Yang and Shami, 2020](https://arxiv.org/html/2502.13138#bib.bib33); [White et al., 2023](https://arxiv.org/html/2502.13138#bib.bib32)).
Defining this space often requires significant domain expertise.
Furthermore, search algorithms for hyperparameter tuning are often somewhat brute force compared to human experts, resulting in lower compute efficiency and a risk of overfitting to the validation set.

The emergence of advanced coding capabilities in large language models (LLMs) ([OpenAI, 2023](https://arxiv.org/html/2502.13138#bib.bib21); [Jimenez et al., 2024](https://arxiv.org/html/2502.13138#bib.bib10); [Anthropic, 2024](https://arxiv.org/html/2502.13138#bib.bib1); [Google, 2024](https://arxiv.org/html/2502.13138#bib.bib7); [Jain et al., 2025](https://arxiv.org/html/2502.13138#bib.bib9); [OpenAI, 2025a](https://arxiv.org/html/2502.13138#bib.bib22); [OpenAI, 2025b](https://arxiv.org/html/2502.13138#bib.bib23)) has introduced an exciting new possibility: searching directly within the space of code rather than the space of predefined configurations.
Code-space optimization offers greater flexibility and leverages the extensive domain-specific knowledge inherent in LLMs, effectively narrowing the search to more promising solutions and thus boosting sample efficiency.
This gives it the potential to address compute-bound tasks like deep learning or, presumably, even optimizing LLMs themselves.

Here, we introduce AI-Driven Exploration (AIDE), a LLM-powered agent**
*
In this paper, “Agent” may refer either to the algorithm built on top of LLMs or to the entire system with LLMs included, depending on the context. that automates the trial-and-error process of machine learning engineering. Unlike the ReACT ([Yao et al., 2023](https://arxiv.org/html/2502.13138#bib.bib34)) style agent, which appends historical observations to the LLM’s context and relies on the model’s capabilities to solve a monolithic optimization problem, AIDE organizes all historical solutions in a tree structure. It then asks the LLM to propose improvements based on individual tree nodes. A hard-coded tree-search algorithm accumulates these incremental improvements, guided by automated evaluations.

We benchmarked AIDE on a set of Kaggle tasks focusing on tabular machine learning and released these initial results together in April 2024 ([Weco AI, 2024](https://arxiv.org/html/2502.13138#bib.bib31)).
Subsequently, OpenAI released MLE-Bench ([Chan et al., 2024](https://arxiv.org/html/2502.13138#bib.bib2)), further showing that AIDE can be applied to even more challenging deep learning tasks from Kaggle while achieving state-of-the-art performance.
Most notably, AIDE achieves twice the number of medals compared to a follow-up agent ([Wang et al., 2024](https://arxiv.org/html/2502.13138#bib.bib30)) when both use GPT-4o; with o1-preview, the gap widens even further.
In parallel, METR assessed AIDE on AI research tasks against human experts under time constraints, showing that AIDE can outperform expert-crafted solutions in limited time windows ([METR, 2024](https://arxiv.org/html/2502.13138#bib.bib18)).
Moreover, for tasks with a robust evaluation signal like Triton Kernel optimization, AIDE’s final solution surpasses that of human experts, even when the latter had extended development time.

The first half of this paper provides a formal specification of AIDE for the research community. In the second half, we present and analyze empirical evaluations of AIDE, drawing on both our own experiments and independent benchmark results.

## 2 Preliminaries

Many general-purpose LLM agents, including ReACT ([Yao et al., 2023](https://arxiv.org/html/2502.13138#bib.bib34)), frame their tasks as Partially Observable Markov Decision Processes (POMDPs) ([Kaelbling et al., 1998](https://arxiv.org/html/2502.13138#bib.bib13)), a widely used framework in reinforcement learning.
In a POMDP, the agent tries to maximize a cumulative reward by choosing actions based on all past observations, essentially treating the entire interaction history as the state.
While this approach is flexible and unifies a range of tasks, it lacks a principled way to break down the problem when there is a clear structure available.
Moreover, for LLM-based agents, continually appending all historical data can lead to oversized prompts and limit scalability, because the model’s context window eventually fills up.

In this work, we adopt an alternative framework for LLM-driven iterative problem solving by modeling the task as an optimization problem:
Let $\mathcal{S}$ be a space of possible solutions (e.g., Python scripts), and let $h:\mathcal{S}\rightarrow\mathbb{R}$ be a *stateless* objective function (for example, validation accuracy or loss). The goal is to find an optimal solution:

|  |  |  |  |
| --- | --- | --- | --- |
|  | $$s^{*}=\arg\max_{s\in\mathcal{S}}h(s).$$ |  | (1) |

Each candidate solution $s$ can be evaluated independently via an objective function $h(s)$. This perspective simplifies the problem considerably: rather than unrolling a single, long-horizon decision process , we can directly evaluate and compare solutions. It also aligns naturally with existing optimization methods, like tree search, which depend on standalone evaluations of candidate solutions.

## 3 Methodology

In this section, we introduce our approach to automating machine learning engineering with AIDE.
By employing the tree search method, AIDE systematically explores solutions that optimize validation metrics, breaking down the monolithic optimization task into atomic improvement steps.
We begin by outlining the high-level optimization algorithm.
And then delve into key implementation details, such as the search policy and specialized prompts that drive the iterative generation and refinement of machine learning code.

### 3.1 AI-Driven Exploration in the Space of Solutions

In AIDE, a solution $s$ is the code to be optimized, with $s_{0}$ denoting the empty root solution.
An evaluator, $h:\mathcal{S}\to\mathbb{R}$, evaluates the code and provides a scalar score.
All discovered solutions are stored in a solution tree, $T$, whose nodes correspond to scripts and edges represent an improvement attempt (e.g., $s\to s^{\prime}$ is an improvement of
$s$).
A search policy, $\pi(T)$, selects which solution
$s\in T$ will serve as the base solution to be improved.
To keep language model prompts concise while being aware of the historical attempts,
a summarization operator, $\Sigma(T)$, extracts relevant information
from the tree, such as the high level idea of each improvement attempt and its corresponding performance metrics.
Finally, a coding
operator, $f\bigl(s,\Sigma(T)\bigr)$, proposes new scripts by drafting an
initial version from $s_{0}$, fixing bugs, or refining a promising solution based
on the summarized context.

With these components in place, AIDE
can systematically explore the code solution space, as shown in Algorithm [1](https://arxiv.org/html/2502.13138#alg1 "Algorithm 1 ‣ 3.1 AI-Driven Exploration in the Space of Solutions ‣ 3 Methodology ‣ AIDE: AI-Driven Exploration in the Space of Code").

Algorithm 1  AI-Driven Exploration (AIDE)

1:
Initialize: solution tree $T_{0}\leftarrow\varnothing$

2:
Initialize: base solution $s\leftarrow s_{0}$

3:
for $n=1,2,...,N$ do

4:
  $s_{n}\leftarrow f\bigl(s,\,\Sigma(T_{n-1})\bigr)$
$\triangleright$ Propose a new solution

5:
  $v_{n}\leftarrow h(s_{n})$
$\triangleright$ Evaluate the solution

6:
  $T_{n}\leftarrow T_{n-1}\cup\{\text{node }(s_{n},v_{n}),\text{edge }(s\to s_{n})\}$
$\triangleright$ Record node and its score

7:
  $s\leftarrow\pi(T_{n})$
$\triangleright$ Select the next base node

8:
end for

9:
return  $\operatorname{argmax}_{s^{\prime}\in\{s_{0},...,s_{N}\}}h(s^{\prime})$ $\triangleright$ Best solution found

### 3.2 AIDE for Machine Learning

Here we present more implementation details of AIDE for machine learning engineering, providing a concrete instantiation of the core components from Section [3.1](https://arxiv.org/html/2502.13138#S3.SS1 "3.1 AI-Driven Exploration in the Space of Solutions ‣ 3 Methodology ‣ AIDE: AI-Driven Exploration in the Space of Code"). In particular, we build upon the following design elements:

#### Search Policy ($\pi$).

In AIDE, the search policy $\pi$ ( [algorithm 1](https://arxiv.org/html/2502.13138#alg1 "In 3.1 AI-Driven Exploration in the Space of Solutions ‣ 3 Methodology ‣ AIDE: AI-Driven Exploration in the Space of Code"), line 7) follows a simple hard-coded rule, determining whether to draft, debug, or improve based on an existing solution. Specifically, it selects:

- •

  Drafting if we have not yet reached the desired number of initial solutions.
- •

  Debugging if a buggy node remains within a certain debug depth.
- •

  Improving otherwise, typically targeting the best (non-buggy) solution.

This policy imposes practical heuristics, such as 1) first exploring a set of diverse initial solutions and continuously improving the best one, and 2) constraining the number of debug attempts for a broken solution.

#### Coding Operator ($f$).

The coding operator has three main entry points, each with its own specialized prompts:

- •

  *Drafting*, which is invoked when we need a completely new solution from scratch. It prompts an LLM to outline a brief plan for a model (e.g., specifying a particular network architecture or feature-engineering idea), then emits a single-file Python program implementing that plan.
- •

  *Debugging*, which focuses on repairing buggy solutions. By inspecting error logs and execution traces, it attempts to rectify issues in the code like broken imports, incorrect tensor dimensions, or other coding errors while preserving the overall approach.
- •

  *Improving*, which is called when a valid, non-buggy solution already exists but could benefit from data preprocessing, architectural or optimization modifications. Here, the LLM proposes exactly one “atomic” change, such as switching optimizers or adding a regularization technique, so that its effect on performance is directly measurable.

Combining these three operations keeps the solution tree structured and ensures that each new node arises from a well-defined modification of a parent node.

#### Summarization Operator ($\Sigma(T)$).

Despite the flexibility to generate arbitrarily large numbers of solutions, we avoid saturating the LLM’s prompt by applying a context summarization operator, $\Sigma(T)$. Instead of appending all historical logs, $\Sigma(T)$ selectively extracts:

- •

  Performance metrics (e.g., accuracy, AUC-ROC, test set loss).
- •

  Hyperparameter settings if a solution involves a hyperparameter sweep.
- •

  Relevant hints for debugging (e.g., misaligned array shapes in tracebacks).

A concise summary is crucial to maintaining a stateless perspective: each code revision stands on its own, but $\Sigma(T)$ uses prior information to guide subsequent proposals. This design offers much of the benefit of incremental reasoning without exploding the prompt size.

#### Data Preview in Coding Prompts.

In addition to dynamic updates from $\Sigma(T)$, AIDE for machine learning includes a small static “data preview” in each prompt, giving the LLM basic knowledge of dataset size or feature layouts. In practice, we store relevant metadata (e.g., number of rows, column names, or data splits) in the workspace and insert it into the coding operator’s prompt. Although not a complete EDA pipeline, this lightweight approach helps AIDE guide key code decisions. These decisions include selecting a validation split or scaling hyperparameters, without repeatedly including extensive dataset context.

#### Putting It All Together.

Figure [1](https://arxiv.org/html/2502.13138#S3.F1 "Figure 1 ‣ Putting It All Together. ‣ 3.2 AIDE for Machine Learning ‣ 3 Methodology ‣ AIDE: AI-Driven Exploration in the Space of Code") illustrates how AIDE’s instantiation for machine learning uses (i) a search policy $\pi$ to select which solution to refine next, (ii) a coding operator $f$ for generating code by drafting, debugging, or improving solutions, and (iii) a summarization operator $\Sigma(T)$ to keep the LLM prompts concise and targeted. By combining these components under a stateless optimization framework, AIDE can systematically search within the space of possible code solutions for machine learning tasks, avoiding an ever-increasing prompt history while retaining the relevant knowledge needed to achieve high performance.

$s_{0}$$s_{1}$$s_{2}$$s_{3}$$s_{4}$$s_{5}$$s_{6}$$s_{7}$$f\colon\text{draft}$$f\colon\text{draft}$$f\colon\text{draft}$$f\colon\text{fix}$$f\colon\text{fix}$$f\colon\text{improve}$$f\colon\text{fix}$Empty SolutionBug DetectedValid SolutionOptimal Solution


Figure 1: A sample solution tree $T$ for AIDE, where each node is a Python script.
Arrows represent transitions proposed by the coding operator $f$.
Some branches terminate in a bug, while others lead to improved or optimal solutions.

## 4 Evaluation

In this section we report empirical evaluations of AIDE.
We did our own evaluation on Kaggle competitions with a focus on tabular machine learning tasks ([Weco AI, 2024](https://arxiv.org/html/2502.13138#bib.bib31)).
On the other hand, after the open sourcing of the AIDE in April 2024, the community has done larger scale independent evaluations showing promising results on deep learning ([Chan et al., 2024](https://arxiv.org/html/2502.13138#bib.bib2)) and AI R&D ([METR, 2024](https://arxiv.org/html/2502.13138#bib.bib18)) tasks.
We therefore also aggregate relevant results here to provide a better understanding of the AIDE’s performance.
Readers interested in the extended evaluations are encouraged to read and cite the papers from OpenAI ([Chan et al., 2024](https://arxiv.org/html/2502.13138#bib.bib2)) and  [METR (2024)](https://arxiv.org/html/2502.13138#bib.bib18) respectively.

### 4.1 Weco Kaggle Benchmark

We curated a diverse set of Kaggle competitions to build Weco’s internal Kaggle benchmark, called Weco-Kaggle, for evaluating AIDE’s performance in machine learning.
This set consists of 63 competitions of varied complexity and data size, spanning domains such as tabular machine learning, image classification, and time-series prediction.
Some of these competitions require a GPU to solve.
Full details of the competitions in Weco-Kaggle are provided in Appendix [C](https://arxiv.org/html/2502.13138#A3 "Appendix C Weco Kaggle Benchmark ‣ AIDE: AI-Driven Exploration in the Space of Code").
From Weco-Kaggle, we selected a subset of 16 tabular machine learning tasks with relatively lower complexity and primarily CPU-based runtime requirements.
This subset, referred to as *Weco-Kaggle Lite*, is shown in Table [2](https://arxiv.org/html/2502.13138#S4.T2 "Table 2 ‣ Baselines. ‣ 4.1 Weco Kaggle Benchmark ‣ 4 Evaluation ‣ AIDE: AI-Driven Exploration in the Space of Code").

#### Evaluation Protocol.

We evaluate the performance of AIDE by comparing its results to that of human competitors in each Kaggle competition, and averaging across competitions.
We follow the evaluation protocol below to evaluate AIDE’s and other frameworks’ performance:

1. 1.

   Before running the agent on a competition, we split the competition’s training data into an agent train set and a holdout test set. This split is defined manually for each competition following similar parameters as Kaggle’s official private test set (e.g. similar train-test percentages), but is not necessarily the same, since Kaggle’s test set is not released publicly for most competitions. Note that our holdout test set is also distinct from the train-validation split that AIDE itself generates as part of its internal node evaluation protocol.
2. 2.

   During code generation, AIDE is given access to the holdout test inputs (but not labels) and prompted to evaluate its model on this data. In particular, we prompt AIDE to generate a submission.csv file, analogously to how human competitors submit their competition results.
3. 3.

   We define an *Exceeds % of Human* metric as $100(1-q)$, where $q$ is the quantile of AIDE’s score on the official Kaggle leaderboard. This metric represents the percentage of human competitors whose performance AIDE surpasses. Whenever possible, we use Kaggle’s private leaderboard because it is less prone to overfitting by competitors; if a private leaderboard is unavailable, we default to the public leaderboard. In addition, we report the *Above Median* metric, originally proposed by [Chan et al. (2024)](https://arxiv.org/html/2502.13138#bib.bib2), which indicates how frequently AIDE outperforms the median Kaggler performance across competitions.
4. 4.

   This metric is then averaged across all competitions.

We chose our evaluation protocol based on leaderboard-quantiles since, unlike each competition’s included metric, these scores are similarly distributed between competitions, making it possible to simply average across competitions to obtain aggregated scores. Leaderboard quantiles are also more fine-grained, allowing us to evaluate, for example, the performance of a single run on a single task, unlike medal-counts ([Chan et al., 2024](https://arxiv.org/html/2502.13138#bib.bib2)) which collapse to a binary metric in this case. Finally, our scores are interpretable and useful in assessing AIDE’s performance relative to humans.

| Agent | Model | Exceeds % of humans $\uparrow$ | Above Median (%) $\uparrow$ |
| --- | --- | --- | --- |
| AIDE | GPT-4 Turbo | 51.38 | 50.00 |
| AutoML (H2O) | N/A | 35.34 | 18.75 |
| [AutoGPT (Langchain)](https://js.langchain.com/v0.1/docs/use_cases/autonomous_agents/auto_gpt/) | GPT-4 Turbo | 32.34 | 0.00 |
| Human with ChatGPT | GPT-4 Turbo | 41.17 | 18.75 |

Table 1: Comparing AIDE to other agent frameworks on 16 tabular machine learning tasks from Kaggle. *Exceeds % of humans* indicates the percentage of human Kaggle participants being outperformed by the agents, averaged across the competitions. *Above Median (%)* is the fraction of competitions where the score was strictly above the median of human Kaggle participants.

#### Baselines.

To evaluate AIDE’s effectiveness, we compare it against three baselines that illustrate different approaches to automated or assisted machine learning:

1. 1.

   Conventional H2O AutoML.
   We select H2O, one of the leading AutoML platforms, to exemplify traditional AutoML tools. In each competition, the data is split into an 80%/20% train/validation set, and model selection is performed within a 600-second search window.
2. 2.

   AutoGPT.
   A workflow automation framework that surged in popularity in early 2024. It generates a plan and automatically executes the necessary steps to complete a task. We adapt its task descriptor to produce solutions for our competitions.
3. 3.

   Human Assisted with ChatGPT.
   An increasingly common scenario involves human engineers leveraging ChatGPT to assist with coding tasks. We adopt this baseline to understand how AIDE performs relative to a human engineer directing ChatGPT to develop solutions.

These baselines collectively provide a robust comparative foundation for evaluating AIDE against both traditional AutoML workflows and modern LLM-assisted strategies. Further details about the baselines’ configuration can be found in Appendix [A](https://arxiv.org/html/2502.13138#A1 "Appendix A Baseline Specifications ‣ AIDE: AI-Driven Exploration in the Space of Code").

| Competition | Total Teams | AIDE Rank | Exceeds % of Human | Above Median |
| --- | --- | --- | --- | --- |
| [playground-series-s3e14](http://kaggle.com/c/playground-series-s3e14) | 1877 | 897 | 52.21% | False |
| [playground-series-s3e16](http://kaggle.com/c/playground-series-s3e16) | 1431 | 693 | 51.57% | False |
| [playground-series-s3e19](http://kaggle.com/c/playground-series-s3e19) | 1174 | 742 | 36.80% | True |
| [playground-series-s3e22](http://kaggle.com/c/playground-series-s3e22) | 1543 | 1142 | 25.99% | True |
| [playground-series-s3e24](http://kaggle.com/c/playground-series-s3e24) | 1910 | 655 | 65.71% | False |
| [playground-series-s3e25](http://kaggle.com/c/playground-series-s3e25) | 1633 | 948 | 41.95% | True |
| [tabular-playground-series-aug-2022](http://kaggle.com/c/tabular-playground-series-aug-2022) | 1889 | 392 | 79.25% | False |
| [tabular-playground-series-feb-2021](http://kaggle.com/c/tabular-playground-series-feb-2021) | 1434 | 559 | 61.02% | False |
| [tabular-playground-series-feb-2022](http://kaggle.com/c/tabular-playground-series-feb-2022) | 1257 | 708 | 43.68% | True |
| [tabular-playground-series-jan-2022](http://kaggle.com/c/tabular-playground-series-jan-2022) | 1592 | 886 | 44.35% | True |
| [tabular-playground-series-jul-2021](http://kaggle.com/c/tabular-playground-series-jul-2021) | 1294 | 1126 | 12.98% | True |
| [tmdb-box-office-prediction](http://kaggle.com/c/tmdb-box-office-prediction) | 1395 | 692 | 50.39% | False |
| [bike-sharing-demand](http://kaggle.com/c/bike-sharing-demand) | 3243 | 262 | 91.92% | False |
| [cat-in-the-dat](http://kaggle.com/c/cat-in-the-dat) | 1341 | 714 | 46.76% | True |
| [house-prices-advanced-regression-techniques](http://kaggle.com/c/house-prices-advanced-regression-techniques) | 4978 | 1357 | 72.74% | False |
| [new-york-city-taxi-fare-prediction](http://kaggle.com/c/new-york-city-taxi-fare-prediction) | 1485 | 819 | 44.85% | True |
| Average |  |  | 51.38% | 50.00% |

Table 2: AIDE vs. human performance comparison on Weco-Kaggle Lite. The submissions were made manually in February 2024. All rankings are actual rankings on the private/public Kaggle leaderboard, assessed in February 2024.

#### AIDE’s Results on Weco-Kaggle Lite.

Table [1](https://arxiv.org/html/2502.13138#S4.T1 "Table 1 ‣ Evaluation Protocol. ‣ 4.1 Weco Kaggle Benchmark ‣ 4 Evaluation ‣ AIDE: AI-Driven Exploration in the Space of Code") compares AIDE against multiple baselines, including H2O AutoML, AutoGPT, and a human competitor utilizing ChatGPT, averaged over the 16 tabular Kaggle tasks of Weco-Kaggle Lite. AIDE achieves an *Exceeds % of humans* score of 51.38%, outperforming half of the Kaggle participants on average, and surpasses the human median in 50% of these tasks. By contrast, H2O AutoML and LangChain AutoGPT attain lower *Exceeds % of humans* scores (35.34% and 32.34%, respectively). Table [2](https://arxiv.org/html/2502.13138#S4.T2 "Table 2 ‣ Baselines. ‣ 4.1 Weco Kaggle Benchmark ‣ 4 Evaluation ‣ AIDE: AI-Driven Exploration in the Space of Code") offers a detailed breakdown for each competition, indicating that AIDE’s performance ranges from surpassing roughly 13% of human participants (for more challenging tasks) to nearly 92% (for tasks it handles more effectively). Across half of the competitions, AIDE ranks above the human median, underscoring its robustness in consistently delivering competitive results against a diverse set of real-world machine learning challenges.

#### AIDE’s Results on Full Weco-Kaggle.

Figure [2](https://arxiv.org/html/2502.13138#S4.F2 "Figure 2 ‣ AIDE’s Results on Full Weco-Kaggle. ‣ 4.1 Weco Kaggle Benchmark ‣ 4 Evaluation ‣ AIDE: AI-Driven Exploration in the Space of Code") illustrates AIDE’s performance distribution across our extended set of Kaggle competitions, sorted by its *Exceeds % of Humans* value. Notably, AIDE achieves near-top-tier performance on several tasks, surpassing the vast majority of human participants, while on other tasks it exceeds only a small fraction. Overall, the average *Exceeds % of Humans* rate is 48.23%, and AIDE outperforms the human median in 49.21% of the competitions. These results underscore that AIDE can be highly competitive in certain domains, yet there remains variability in its performance depending on the dataset and task requirements.

Figure 2: AIDE’s performance distribution on full Weco-Kaggle benchmark. Exceeds % of Humans values are estimated from the leaderboard distribution.

#### Potential Limitations.

Despite the advantages discussed above, our protocol has some limitations. First, because our test set may differ from Kaggle’s private test set, scores may not always be directly comparable, which can result in variance in percentiles.
Second, there is a risk of contamination since some of the language models used in this work may have been trained on competition-related data.
Although we found no significant correlation between agent performance and competition recency, the only way to fully ensure no data contamination would be to submit the agent’s solutions to live competitions.

### 4.2 AIDE in MLE-Bench

MLE-Bench ([Chan et al., 2024](https://arxiv.org/html/2502.13138#bib.bib2)) is an offline evaluation framework comprising 75 real Kaggle competitions.
Here, we present the results related to AIDE reported by [Chan et al. (2024)](https://arxiv.org/html/2502.13138#bib.bib2) and encourage readers to check and cite the original paper if they are interested in the results presented here.
In these evaluations, AIDE emerged as the top-performing agent framework when paired with state-of-the-art large language models.
Other agent frameworks such as ResearchAgent from MLAB ([Huang et al., 2024](https://arxiv.org/html/2502.13138#bib.bib8)) and OpenHands ([Wang et al., 2024](https://arxiv.org/html/2502.13138#bib.bib30)) tended to terminate early or struggle with iterative refinement.
AIDE’s optimization-centric approach led to better scalability in terms of trial-and-error interactions, therefore higher valid-submission rates and ultimately more competition medals.

Table [3](https://arxiv.org/html/2502.13138#S4.T3 "Table 3 ‣ 4.2 AIDE in MLE-Bench ‣ 4 Evaluation ‣ AIDE: AI-Driven Exploration in the Space of Code") highlights key results of AIDE compared to other agents.
The reported *Any Medal (%)* column shows the fraction of competitions on which the agent and model combination achieved a medal (bronze, silver, or gold) in a single pass (i.e. pass@1).
AIDE with o1-preview earned medals in 16.9% of competitions, nearly four times that of the follow-up agent OpenHands.

|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| Agent | Model | Valid Subm. (%) | Above Median (%) | Gold (%) | Any Medal (%) |
| AIDE | o1-preview | 82.8 ± 1.1 | 29.4 ± 1.3 | 9.4 ± 0.8 | 16.9 ± 1.1 |
| AIDE | GPT-4o | 54.9 ± 1.0 | 14.4 ± 0.7 | 5.0 ± 0.4 | 8.7 ± 0.5 |
| AIDE | Llama 3.1 | 27.3 ± 2.6 | 6.7 ± 1.4 | 1.7 ± 0.7 | 3.0 ± 1.0 |
| AIDE | Claude 3.5 | 51.1 ± 3.3 | 12.9 ± 2.2 | 4.4 ± 1.4 | 7.6 ± 1.8 |
| MLAB | GPT-4o | 44.3 ± 2.6 | 1.9 ± 0.7 | 0.8 ± 0.5 | 0.8 ± 0.5 |
| OpenHands | GPT-4o | 52.0 ± 3.3 | 7.1 ± 1.7 | 2.7 ± 1.1 | 4.4 ± 1.4 |

Table 3: Full MLE-Bench results (pass@1) reported by ([Chan et al., 2024](https://arxiv.org/html/2502.13138#bib.bib2)) comparing AIDE to other agent frameworks. *Valid Subm. (%)* is the fraction of all competitions (not just those with a submission) where the submission passed validity checks. *Above Median (%)* is the fraction of competitions where the score was strictly above the median of human Kaggle participants. *Any Medal (%)* is the fraction awarded a bronze, silver, or gold medal (the primary success metric). Each experiment is repeated with 3 seeds, except for AIDE+o1-preview and AIDE+GPT-4o, which use 16 and 36 seeds respectively. Scores represent the mean ± one standard error of the mean.




Figure 3: Performance of o1-preview with and without AIDE on MLE-bench Lite (complexity=low) set.

#### AIDE’s Key Advantages.

By explicitly implementing a *solution tree search* strategy, AIDE keeps node-level code concise and focuses each language model call on a localized problem (e.g. debugging only the most promising script).
This design helps avoid oversized prompts, preserves a clear performance record for each node, and repeatedly refines partial solutions over the entire 24-hour timeframe.
Consequently, AIDE systematically addresses coding bugs and suboptimal hyperparameters rather than abandoning failed solutions.
As shown in Table [3](https://arxiv.org/html/2502.13138#S4.T3 "Table 3 ‣ 4.2 AIDE in MLE-Bench ‣ 4 Evaluation ‣ AIDE: AI-Driven Exploration in the Space of Code"), these iterative improvements translate into higher medal acquisition rates in comparison to generic agents.

Moreover, when given additional attempts per competition (increasing $k$ in pass@k), AIDE significantly increases its success rate;
for instance, GPT-4o and o1-preview nearly double their medals from pass@1 to pass@6 ([Chan et al., 2024](https://arxiv.org/html/2502.13138#bib.bib2)).
These observations underscore the *specialized* nature of AIDE,
which often outperforms other agents through persistent, Kaggle-style iteration,
highlighting the efficacy of a competition-targeted design in real-world ML tasks.

The impact of AIDE becomes particularly evident when comparing performance on the MLE-bench Lite subset, as shown in Figure [3](https://arxiv.org/html/2502.13138#S4.F3 "Figure 3 ‣ 4.2 AIDE in MLE-Bench ‣ 4 Evaluation ‣ AIDE: AI-Driven Exploration in the Space of Code"). Using o1-preview with AIDE significantly improved performance across all metrics compared to using o1-preview alone. The valid submission rate increased from 63.6% $\pm$ 4.5% to 92.4% $\pm$ 2.6%, demonstrating AIDE’s effectiveness in guiding the model through the submission process. More importantly, the fraction of solutions scoring above the median human performance increased dramatically from 13.6% to 59.1% $\pm$ 4.5%, and both medal-related metrics showed substantial improvements: the gold medal achievement rate more than tripled from 6.1% $\pm$ 2.6% to 21.2% $\pm$ 6.9%, while the overall medal achievement rate increased nearly fivefold from 7.6% $\pm$ 2.6% to 36.4% $\pm$ 7.9%. These improvements are statistically significant ($p<0.01$ for all metrics, two-tailed t-test). The dramatic performance gains across all metrics demonstrate that AIDE’s iterative optimization approach substantially enhances the model’s problem-solving capabilities, enabling more reliable and higher-quality solutions through systematic refinement.

### 4.3 AIDE in RE-Bench

While AIDE is designed for building machine learning pipelines, METR applied it to much more challenging AI R&D tasks by formulating these tasks into optimization tasks.
The tasks range from optimizing a Triton Kernel to finetuning GPT-2 for QA.
Surprisingly, AIDE performs quite well on these tasks, and is even comparable with the top human AI scientists from Google DeepMind, Google, Anthropic,
OpenAI, FAR Labs, Redwood Research, University of California Berkeley, Carnegie Mellon University, Stanford University, or Massachusetts Institute of Technology ([METR, 2024](https://arxiv.org/html/2502.13138#bib.bib18)).

![Refer to caption](https://arxiv.org/html/2502.13138v1/RE-Bench.png)


Figure 4: Average score achieved by AIDE+o1-preview and top human scientists on 7 AI R&D tasks, as report by [METR (2024)](https://arxiv.org/html/2502.13138#bib.bib18). AIDE managed to surpass human scientists within six hours by enabling faster experiment iterations. However, human scientists eventually caught up, as AIDE adopts a simple greedy policy that may lead to local optima on challenging R&D tasks.

Figure [4](https://arxiv.org/html/2502.13138#S4.F4 "Figure 4 ‣ 4.3 AIDE in RE-Bench ‣ 4 Evaluation ‣ AIDE: AI-Driven Exploration in the Space of Code") illustrates AIDE’s average performance over time across the seven RE-Bench environments.
Since LLMs can implement solutions much faster, allowing for more iteration cycles, AIDE managed to outperform humans within the six-hour time limit.
Notably, the agent exceeded human performance in *Optimize a Kernel*, discovering a custom Triton-based solution faster than any of the nine human experts did within 64 hours.
However, AIDE fell short in environments that required handling larger codebases or where a single improvement involved multiple steps of interaction. For example, in *Agent for Rust CodeContests*, AIDE was prone to repeating local patches instead of discovering new strategies.

## 5 Related Work

### 5.1 LLM Agents

Recent advances in large language models have spurred the development of agents that combine natural language reasoning with task execution. *General-purpose* agents such as ReAct ([Yao et al., 2023](https://arxiv.org/html/2502.13138#bib.bib34)) and HuggingGPT ([Shen et al., 2023](https://arxiv.org/html/2502.13138#bib.bib26)) interleave planning with action selection to perform tasks ranging from information retrieval to multi-modal processing. In contrast, *specialized* agents like Voyager ([Wang et al., 2023](https://arxiv.org/html/2502.13138#bib.bib29)) and AlphaCode ([Li and et al., 2022](https://arxiv.org/html/2502.13138#bib.bib16)) are tailored to specific domains such as embodied reasoning and competitive code generation. These systems integrate execution feedback into the LLM’s reasoning process, enabling iterative refinement of candidate solutions.

### 5.2 Automated Machine Learning

Automated Machine Learning (AutoML) aims to eliminate manual intervention in model selection, hyperparameter tuning, and pipeline configuration. Early frameworks such as Auto-WEKA ([Thornton et al., 2013b](https://arxiv.org/html/2502.13138#bib.bib28)) and TPOT ([Olson and Moore, 2016](https://arxiv.org/html/2502.13138#bib.bib20)) employed Bayesian optimization and genetic programming, respectively, to search over predefined model spaces. Later systems like Auto-Sklearn ([Feurer et al., 2020](https://arxiv.org/html/2502.13138#bib.bib6)) and AutoGluon ([Mueller and et al., 2024](https://arxiv.org/html/2502.13138#bib.bib19)) have leveraged meta-learning and ensemble techniques to further improve performance. Despite their success, many conventional AutoML methods rely on static search spaces and lack the dynamic adaptability required for more complex problem settings.

### 5.3 Neural Architecture Search

Neural Architecture Search (NAS) focuses on automatically designing neural network topologies. Initial methods based on reinforcement learning ([Zoph and Le, 2017](https://arxiv.org/html/2502.13138#bib.bib35)) and evolutionary strategies ([Real et al., 2019](https://arxiv.org/html/2502.13138#bib.bib25)) demonstrated that automated search could yield competitive architectures. Differentiable approaches such as DARTS ([Liu et al., 2019](https://arxiv.org/html/2502.13138#bib.bib17)) have reduced the computational cost by enabling gradient-based optimization over a relaxed search space. However, NAS still faces challenges in computational expense and search space design.
AIDE, on the other hand, avoids such problems above with code space search and efficient design exploration powered by LLMs.

## 6 Conclusion

In conclusion, we have presented AI-Driven Exploration (AIDE), an LLM Agent for machine learning engineering. By systematically drafting, debugging, and refining solutions, AIDE achieves superior performance on Kaggle tasks as well as on more research-oriented benchmarks. While developed for tabular machine learning tasks, third-party experiments show that this approach can generalize to challenges such as neural architecture search, Triton Kernel optimization, and other AI R&D tasks. We believe AIDE represents a promising step toward the future of automated ML engineering, offering a principled way to combine iterative LLM prompting with a tree-based exploration of code solutions.

## References

- Anthropic (2024)

  Anthropic.
  Claude 3.5 sonnet model card addendum.
  Technical report, Anthropic, 2024.
  URL
  <https://www-cdn.anthropic.com/fed9cc193a14b84131812372d8d5857f8f304c52/Model_Card_Claude_3_Addendum.pdf>.
- Chan et al. (2024)

  J. S. Chan, N. Chowdhury, O. Jaffe, J. Aung, D. Sherburn, E. Mays, G. Starace,
  K. Liu, L. Maksin, T. Patwardhan, L. Weng, and A. Mądry.
  MLE-bench: Evaluating Machine Learning Agents on Machine Learning
  Engineering.
  arXiv preprint arXiv:2410.07095, 2024.
- Elsken et al. (2019)

  T. Elsken, J. H. Metzen, and F. Hutter.
  Neural architecture search: A survey.
  *Journal of Machine Learning Research*, 20(55):1–21, 2019.
- Falkner et al. (2018)

  S. Falkner, A. Klein, and F. Hutter.
  BOHB: Robust and Efficient Hyperparameter Optimization at Scale.
  In *Proc. of ICML*, volume 35, 2018.
- Feurer et al. (2015)

  M. Feurer, A. Klein, K. Eggensperger, J. T. Springenberg, M. Blum, and
  F. Hutter.
  Efficient and Robust Automated Machine Learning.
  In *Proc. of NeurIPS*, volume 28, 2015.
- Feurer et al. (2020)

  M. Feurer, K. Eggensperger, E. Bergman, F. Pfisterer, B. Bischl, and F. Hutter.
  Auto-Sklearn 2.0: Hands-free AutoML via Meta-Learning.
  arXiv preprint arXiv:2007.04074, 2020.
- Google (2024)

  Google.
  Gemini 1.5: Unlocking multimodal understanding across millions of
  tokens of context.
  *arXiv preprint arXiv:2403.05530*, 2024.
- Huang et al. (2024)

  Qian Huang, Jian Vora, Percy Liang, and Jure Leskovec.
  Mlagentbench: Evaluating language agents on machine learning
  experimentation.
  In *Forty-first International Conference on Machine Learning*,
  2024.
- Jain et al. (2025)

  Naman Jain, King Han, Alex Gu, Wen-Ding Li, Fanjia Yan, Tianjun Zhang, Sida
  Wang, Armando Solar-Lezama, Koushik Sen, and Ion Stoica.
  Livecodebench: Holistic and contamination free evaluation of large
  language models for code.
  In *The Thirteenth International Conference on Learning
  Representations*, 2025.
  URL <https://openreview.net/forum?id=chfJJYC3iL>.
- Jimenez et al. (2024)

  Carlos E Jimenez, John Yang, Alexander Wettig, Shunyu Yao, Kexin Pei, Ofir
  Press, and Karthik R Narasimhan.
  SWE-bench: Can language models resolve real-world github issues?
  In *The Twelfth International Conference on Learning
  Representations*, 2024.
  URL <https://openreview.net/forum?id=VTF8yNQM66>.
- Jin et al. (2019)

  H. Jin, Q. Song, and X. Hu.
  Auto-Keras: An Efficient Neural Architecture Search System.
  In *Proc. of ACM SIGKDD (KDD)*, 2019.
- Jin et al. (2023)

  H. Jin, F. Chollet, Q. Song, and X. Hu.
  AutoKeras: An AutoML Library for Deep Learning.
  *Journal of Machine Learning Research*, 24(6):1–7, 2023.
- Kaelbling et al. (1998)

  Leslie Pack Kaelbling, Michael L Littman, and Anthony R Cassandra.
  Planning and acting in partially observable stochastic domains.
  *Artificial Intelligence*, 101(1-2):99–134,
  1998.
- LeDell and Poirier (2020a)

  E. LeDell and S. Poirier.
  H2O AutoML: Scalable Automatic Machine Learning.
  In *Proc. of the AutoML Conference*, pages 1–8,
  2020a.
- LeDell and Poirier (2020b)

  Erin LeDell and Sebastien Poirier.
  H2O AutoML: Scalable automatic machine learning.
  *7th ICML Workshop on Automated Machine Learning (AutoML)*, July
  2020b.
  URL
  <https://www.automl.org/wp-content/uploads/2020/07/AutoML_2020_paper_61.pdf>.
- Li and et al. (2022)

  Y. Li and et al.
  Competition-level Code Generation with AlphaCode.
  *Science*, 378:1092–1097, 2022.
  doi: 10.1126/science.abq1158.
- Liu et al. (2019)

  H. Liu, K. Simonyan, and Y. Yang.
  DARTS: Differentiable Architecture Search.
  In *Proc. of ICLR*, 2019.
- METR (2024)

  METR.
  Evaluating frontier AI R&D capabilities of language model agents
  against human experts.
  <https://metr.org/blog/2024-11-22-evaluating-r-d-capabilities-of-llms/>,
  2024.
  Blog post (November 2024).
- Mueller and et al. (2024)

  J. Mueller and et al.
  AutoGluon: AutoML for Text, Image, and Tabular Data.
  *Scientific Reports*, 14(1):72889, 2024.
- Olson and Moore (2016)

  R. S. Olson and J. H. Moore.
  TPOT: A Tree-based Pipeline Optimization Tool for Automating Machine
  Learning.
  In *ICML AutoML Workshop*, 2016.
- OpenAI (2023)

  OpenAI.
  Gpt-4 technical report.
  Technical report, OpenAI, 2023.
- OpenAI (2025a)

  OpenAI.
  Openai o1 system card.
  Technical report, OpenAI, 2025a.
  URL <https://cdn.openai.com/o1-system-card-20241205.pdf>.
- OpenAI (2025b)

  OpenAI.
  Openai o3-mini system card.
  Technical report, OpenAI, 2025b.
  URL <https://cdn.openai.com/o3-mini-system-card.pdf>.
- Pham et al. (2018)

  H. Pham, M. Y. Guan, B. Zoph, Q. V. Le, and J. Dean.
  Efficient Neural Architecture Search via Parameter Sharing.
  In *Proc. of ICML*, volume 35, 2018.
- Real et al. (2019)

  E. Real, A. Aggarwal, Y. Huang, and Q. V. Le.
  Regularized Evolution for Image Classifier Architecture Search.
  In *Proc. of AAAI*, 2019.
- Shen et al. (2023)

  Y. Shen, K. Song, X. Tan, D. Li, W. Lu, and Y. Zhuang.
  HuggingGPT: Solving AI Tasks with ChatGPT and its Friends in Hugging
  Face.
  In *Proc. of NeurIPS*, 2023.
- Thornton et al. (2013a)

  C. Thornton, F. Hutter, H. H. Hoos, and K. Leyton-Brown.
  Auto-WEKA 2.0: Automatic Model Selection and Hyperparameter
  Optimization in WEKA.
  *Journal of Machine Learning Research*, 14(1):267–281, 2013a.
- Thornton et al. (2013b)

  C. Thornton, F. Hutter, H. H. Hoos, and K. Leyton-Brown.
  Auto-WEKA: Combined Selection and Hyperparameter Optimization of
  Classification Algorithms.
  In *Proc. of ACM SIGKDD (KDD)*, 2013b.
- Wang et al. (2023)

  G. Wang, Y. Xie, Y. Jiang, A. Mandlekar, C. Xiao, Y. Zhu, L. Fan, and
  A. Anandkumar.
  Voyager: An Open-Ended Embodied Agent with Large Language Models.
  arXiv preprint arXiv:2305.16291, 2023.
- Wang et al. (2024)

  X. Wang, B. Li, Y. Song, F. F. Xu, X. Tang, M. Zhuge, J. Pan, Y. Song, B. Li,
  J. Singh, et al.
  Openhands: An open platform for AI software developers as generalist
  agents.
  *arXiv preprint arXiv:2407.16741*, 2024.
- Weco AI (2024)

  Weco AI.
  AIDE: Data Science Automation Technical Report.
  <https://www.weco.ai/blog/technical-report>, 2024.
  [Online; accessed February 3, 2025].
- White et al. (2023)

  Colin White, Mahmoud Safari, Rhea Sukthanker, Binxin Ru, Thomas Elsken, Arber
  Zela, Debadeepta Dey, and Frank Hutter.
  Neural architecture search: Insights from 1000 papers.
  *arXiv preprint arXiv:2301.08727*, 2023.
- Yang and Shami (2020)

  L. Yang and A. Shami.
  On hyperparameter optimization of machine learning algorithms:
  Theory and practice.
  *Neurocomputing*, 415:295–316, 2020.
- Yao et al. (2023)

  S. Yao, J. Zhao, D. Yu, N. Du, I. Shafran, K. Narasimhan, and Y. Cao.
  ReAct: Synergizing Reasoning and Acting in Language Models.
  In *Proc. of ICLR*, 2023.
- Zoph and Le (2017)

  B. Zoph and Q. V. Le.
  Neural Architecture Search with Reinforcement Learning.
  In *Proc. of ICLR*, 2017.

## Appendix A Baseline Specifications

Table 4: Baseline hyperparameters.

| AutoGPT | |
| --- | --- |
| Parameter | Value |
| agent | LangChain AutoGPT |
| model | gpt-4-0125-preview |
| seed | 1 |
| max_runtime | 600 |
| Human with ChatGPT | |
| Parameter | Value |
| model | gpt-4-0125-preview |

### A.1 H2O AutoML Baseline

The machine learning algorithm selection process of H2O AutoML [LeDell and Poirier (2020b)](https://arxiv.org/html/2502.13138#bib.bib15) proceeds as follows. First, it searches over a set of six algorithms:

1. 1.

   Distributed Random Forest (DRF) and Extremely Randomized Trees (XRT)
2. 2.

   Generalized Linear Model (GLM) with regularization
3. 3.

   XGBoost
4. 4.

   H2O Gradient Boosting Machines
5. 5.

   Fully connected multi-layer artificial neural network (DeepLearning)
6. 6.

   Stacked Ensembles (including an ensemble of all base models and ensembles using subsets of the base models)

It then performs a random search over a predefined grid of hyperparameter combinations, avoiding the computational expense of an exhaustive grid search. After training individual models, H2O AutoML creates stacked ensembles by combining the predictions of the best-performing models from each algorithm. This ensemble method leverages the strengths of multiple models to improve overall performance. All trained models, including individual models and ensembles, are evaluated using cross-validation and ranked based on performance metrics such as accuracy, AUC, or RMSE, depending on the problem type. The configurations are shown in Table [4](https://arxiv.org/html/2502.13138#A1.T4 "Table 4 ‣ Appendix A Baseline Specifications ‣ AIDE: AI-Driven Exploration in the Space of Code").

### A.2 AutoGPT Baseline

We use the LangChain implementation of [AutoGPT](https://github.com/Significant-Gravitas/Auto-GPT), which includes LangChain primitives such as PromptTemplates, VectorStores, and Embeddings. Inspired by [Huang et al. (2024)](https://arxiv.org/html/2502.13138#bib.bib8), we introduce a task descriptor for AutoGPT in each competition to provide a basic task planner and minimize human intervention. The task descriptor includes information retrieved from the Kaggle page, such as the dataset description, file details (train.csv, test.csv, sample_submission.csv), evaluation metrics, submission file format, and a sample training script. An example task descriptor is shown in Figure [5](https://arxiv.org/html/2502.13138#A1.F5 "Figure 5 ‣ A.2 AutoGPT Baseline ‣ Appendix A Baseline Specifications ‣ AIDE: AI-Driven Exploration in the Space of Code").

We also provide the agent with tools to read and write files, list directories, and run Python REPL evaluations. The agent reads the task descriptor with predefined goals, as shown below:

Goal Prompt

[⬇](data:text/plain;base64,R28gdGhyb3VnaCB0YXNrX2Rlc2NyaXB0b3IudHh0IHRvIHVuZGVyc3RhbmQgdGhlIHRhc2sgYW5kIGV2YWx1YXRpb24gbWV0aG9kLiBJdGVyYXRlIG92ZXIgZGlmZmVyZW50IG1vZGVscyBvciBmZWF0dXJlIHNlbGVjdGlvbnMgdG8gZ2V0IGEgYmV0dGVyIHBlcmZvcm1hbmNlIGJhc2VkIG9uIGV2YWx1YXRpb24gbWV0aG9kLgpZb3UgY2FuIHVzZSBmb2xsb3dpbmcgc3RlcHMgYXMgcmVmZXJlbmNlOgoxLiBTZWxlY3QgYSBtb2RlbCBhbmQgZmlsbCBpbiB0aGUgcHJvdmlkZWQgcHl0aG9uIHNuaXBwZXQuCjIuIFRyYWluIHRoZSBtb2RlbCBhbmQgTWFrZSBwcmVkaWN0aW9ucyBvbiBkYXRhIGZyb20gdGVzdC5jc3YgYW5kIFByZXBhcmUgc3VibWlzc2lvbi5jc3YgYnkgZXhlY3V0aW5nIHRoZSBzY3JpcHQgd2lpdGggcHl0aG9uIHJlcGwgdG9vbC4KMy4gU2F2ZSB0aGUgc2NyaXB0IGludG8gbG9jYWwgZGlzayBzdWNoIGFzIG1vZGVsX3ttb2RlbF9uYW1lfS5weQoKSGVyZSBhcmUgc29tZSBydWxlcyB0byBmb2xsb3c6CjEuIE5ldmVyIHRyeSB0byBjaGFuZ2UgdGhlIHRyYWluLmNzdiBhbmQgdGVzdC5jc3YuCjIuIE5ldmVyIG91dHB1dCBncmFwaHMgb3IgZmlndXJlcy4KMy4gRG8gTm90IGNoYW5nZSB0aGUgY2FwaXRhbGl6YXRpb24gb2YgdGhlIGNvbHVtbiBuYW1lCjQuIERvIE5vdCByZWFkIHRyYWluLmNzdiBhbmQgdGVzdC5jc3YgZGlyZWN0bHku)
Go through task_descriptor.txt to understand the task and evaluation method. Iterate over different models or feature selections to get a better performance based on evaluation method.
You can use following steps as reference:
1. Select a model and fill in the provided python snippet.
2. Train the model and Make predictions on data from test.csv and Prepare submission.csv by executing the script wiith python repl tool.
3. Save the script into local disk such as model_{model_name}.py


Here are some rules to follow:
1. Never try to change the train.csv and test.csv.
2. Never output graphs or figures.
3. Do Not change the capitalization of the column name
4. Do Not read train.csv and test.csv directly.

Figure 5: The task descriptor for bike-sharing-demand

Task Descriptor Prompt

[⬇](data:text/plain;base64,RGF0YXNldCBEZXNjcmlwdGlvbgpTZWUsIGZvcmssIGFuZCBydW4gYSByYW5kb20gZm9yZXN0IGJlbmNobWFyayBtb2RlbCB0aHJvdWdoIEthZ2dsZSBTY3JpcHRzCgpZb3UgYXJlIHByb3ZpZGVkIGhvdXJseSByZW50YWwgZGF0YSBzcGFubmluZyB0d28geWVhcnMuIEZvciB0aGlzIGNvbXBldGl0aW9uLCB0aGUgdHJhaW5pbmcgc2V0IGlzIGNvbXByaXNlZCBvZiB0aGUgZmlyc3QgMTkgZGF5cyBvZiBlYWNoIG1vbnRoLCB3aGlsZSB0aGUgdGVzdCBzZXQgaXMgdGhlIDIwdGggdG8gdGhlIGVuZCBvZiB0aGUgbW9udGguIFlvdSBtdXN0IHByZWRpY3QgdGhlIHRvdGFsIGNvdW50IG9mIGJpa2VzIHJlbnRlZCBkdXJpbmcgZWFjaCBob3VyIGNvdmVyZWQgYnkgdGhlIHRlc3Qgc2V0LCB1c2luZyBvbmx5IGluZm9ybWF0aW9uIGF2YWlsYWJsZSBwcmlvciB0byB0aGUgcmVudGFsIHBlcmlvZC4KCkRhdGEgRmllbGRzCmRhdGV0aW1lIC0gaG91cmx5IGRhdGUgKyB0aW1lc3RhbXAKc2Vhc29uIC0gIDEgPSBzcHJpbmcsIDIgPSBzdW1tZXIsIDMgPSBmYWxsLCA0ID0gd2ludGVyCmhvbGlkYXkgLSB3aGV0aGVyIHRoZSBkYXkgaXMgY29uc2lkZXJlZCBhIGhvbGlkYXkKd29ya2luZ2RheSAtIHdoZXRoZXIgdGhlIGRheSBpcyBuZWl0aGVyIGEgd2Vla2VuZCBub3IgaG9saWRheQp3ZWF0aGVyIC0gMTogQ2xlYXIsIEZldyBjbG91ZHMsIFBhcnRseSBjbG91ZHksIFBhcnRseSBjbG91ZHkKMjogTWlzdCArIENsb3VkeSwgTWlzdCArIEJyb2tlbiBjbG91ZHMsIE1pc3QgKyBGZXcgY2xvdWRzLCBNaXN0CjM6IExpZ2h0IFNub3csIExpZ2h0IFJhaW4gKyBUaHVuZGVyc3Rvcm0gKyBTY2F0dGVyZWQgY2xvdWRzLCBMaWdodCBSYWluICsgU2NhdHRlcmVkIGNsb3Vkcwo0OiBIZWF2eSBSYWluICsgSWNlIFBhbGxldHMgKyBUaHVuZGVyc3Rvcm0gKyBNaXN0LCBTbm93ICsgRm9nCnRlbXAgLSB0ZW1wZXJhdHVyZSBpbiBDZWxzaXVzCmF0ZW1wIC0gImZlZWxzIGxpa2UiIHRlbXBlcmF0dXJlIGluIENlbHNpdXMKaHVtaWRpdHkgLSByZWxhdGl2ZSBodW1pZGl0eQp3aW5kc3BlZWQgLSB3aW5kIHNwZWVkCmNhc3VhbCAtIG51bWJlciBvZiBub24tcmVnaXN0ZXJlZCB1c2VyIHJlbnRhbHMgaW5pdGlhdGVkCnJlZ2lzdGVyZWQgLSBudW1iZXIgb2YgcmVnaXN0ZXJlZCB1c2VyIHJlbnRhbHMgaW5pdGlhdGVkCmNvdW50IC0gbnVtYmVyIG9mIHRvdGFsIHJlbnRhbHMKCkZpbGVzCnRyYWluLmNzdiAtIHRoZSB0cmFpbmluZyBkYXQKQ29sdW1uczogZGF0ZXRpbWUsc2Vhc29uLGhvbGlkYXksd29ya2luZ2RheSx3ZWF0aGVyLHRlbXAsYXRlbXAsaHVtaWRpdHksd2luZHNwZWVkLGNhc3VhbCxyZWdpc3RlcmVkLGNvdW50CnRlc3QuY3N2IC0gdGhlIHNhbWUgZm9ybWF0IGFzIHRyYWluLmNzdiwgYnV0IHdpdGhvdXQgdGhlIHRhcmdldCB2YWx1ZTsgeW91ciB0YXNrIGlzIHRvIHByZWRpY3QgdGhlIHZhbHVlIGZvciBlYWNoIG9mIHRoZXNlIHRhcmdldHMuCkNvbHVtbnM6IGRhdGV0aW1lLHNlYXNvbixob2xpZGF5LHdvcmtpbmdkYXksd2VhdGhlcix0ZW1wLGF0ZW1wLGh1bWlkaXR5LHdpbmRzcGVlZApzYW1wbGVfc3VibWlzc2lvbi5jc3YgLSBhIHNhbXBsZSBzdWJtaXNzaW9uIGZpbGUgaW4gdGhlIGNvcnJlY3QgZm9ybWF0LgpDb2x1bW5zOiBkYXRldGltZSxjb3VudAoKRXZhbHVhdGlvbgpTdWJtaXNzaW9ucyBhcmUgZXZhbHVhdGVkIG9uZSB0aGUgUm9vdCBNZWFuIFNxdWFyZWQgTG9nYXJpdGhtaWMgRXJyb3IgKFJNU0xFKS4KClN1Ym1pc3Npb24gRm9ybWF0CllvdXIgc3VibWlzc2lvbiBmaWxlIG11c3QgaGF2ZSBhIGhlYWRlciBhbmQgc2hvdWxkIGJlIHN0cnVjdHVyZWQgaW4gdGhlIGZvbGxvd2luZyBmb3JtYXQ6CmRhdGV0aW1lLGNvdW50CjIwMTEtMDEtMjAgMDA6MDA6MDAsMAoyMDExLTAxLTIwIDAxOjAwOjAwLDAKMjAxMS0wMS0yMCAwMjowMDowMCwwCi4uLgouLi4KCiMgTG9hZCBhbmQgcHJlcGFyZSB0aGUgZGF0YQp0cmFpbl9kYXRhID0gcGQucmVhZF9jc3YoJ3RyYWluLmNzdicpCnRlc3RfZGF0YSA9IHBkLnJlYWRfY3N2KCd0ZXN0LmNzdicpCgojIHBsZWFzZSBjb250aW51ZSB3aXRoIHRoZSBweXRob24gc2NyaXB0IGZvciB0cmFpbmluZwoKIyBQcmVwYXJlIHN1Ym1pc3Npb24gZmlsZQpzdWJtaXNzaW9uID0gcGQuRGF0YUZyYW1lKHsnZGF0ZXRpbWUnOiB0ZXN0X2RhdGFbJ2RhdGV0aW1lJ10sICdjb3VudCc6IHRlc3RfcHJlZGljdGlvbnN9KQpzdWJtaXNzaW9uLnRvX2Nzdignc3VibWlzc2lvbi5jc3YnLCBpbmRleD1GYWxzZSkK)
Dataset Description
See, fork, and run a random forest benchmark model through Kaggle Scripts


You are provided hourly rental data spanning two years. For this competition, the training set is comprised of the first 19 days of each month, while the test set is the 20th to the end of the month. You must predict the total count of bikes rented during each hour covered by the test set, using only information available prior to the rental period.


Data Fields
datetime - hourly date + timestamp
season - 1 = spring, 2 = summer, 3 = fall, 4 = winter
holiday - whether the day is considered a holiday
workingday - whether the day is neither a weekend nor holiday
weather - 1: Clear, Few clouds, Partly cloudy, Partly cloudy
2: Mist + Cloudy, Mist + Broken clouds, Mist + Few clouds, Mist
3: Light Snow, Light Rain + Thunderstorm + Scattered clouds, Light Rain + Scattered clouds
4: Heavy Rain + Ice Pallets + Thunderstorm + Mist, Snow + Fog
temp - temperature in Celsius
atemp - "feels like" temperature in Celsius
humidity - relative humidity
windspeed - wind speed
casual - number of non-registered user rentals initiated
registered - number of registered user rentals initiated
count - number of total rentals


Files
train.csv - the training dat
Columns: datetime,season,holiday,workingday,weather,temp,atemp,humidity,windspeed,casual,registered,count
test.csv - the same format as train.csv, but without the target value; your task is to predict the value for each of these targets.
Columns: datetime,season,holiday,workingday,weather,temp,atemp,humidity,windspeed
sample_submission.csv - a sample submission file in the correct format.
Columns: datetime,count


Evaluation
Submissions are evaluated one the Root Mean Squared Logarithmic Error (RMSLE).


Submission Format
Your submission file must have a header and should be structured in the following format:
datetime,count
2011-01-20 00:00:00,0
2011-01-20 01:00:00,0
2011-01-20 02:00:00,0
...
...


# Load and prepare the data
train_data = pd.read_csv(’train.csv’)
test_data = pd.read_csv(’test.csv’)


# please continue with the python script for training


# Prepare submission file
submission = pd.DataFrame({’datetime’: test_data[’datetime’], ’count’: test_predictions})
submission.to_csv(’submission.csv’, index=False)

### A.3 ChatGPT with Human Assistance

A human operator is tasked with solving a Kaggle competition using only the information provided in the overview and data tabs, which include the available dataset. The operator is permitted to utilize the ChatGPT web interface. The LLM is set to gpt-4-0125-preview in comparison with AutoGPT. Due to limitations in ChatGPT’s capabilities, such as the potential for generating hallucinated results and occasionally using outdated packages, iterative interactions are required. The human operator will continue to issue instructions until a valid submission is produced. Upon completion, the operator submits the results to Kaggle, where the submission is ranked against the competition leaderboard.

## Appendix B Analysis of AIDE

### B.1 Code Complexity Growth

Figure 6: Aggregated code complexity (LOC, LLOC, Volume, N1, MI) of the code generated by AIDE (GPT-4 Turbo) with respect to number of steps.

In Figure [6](https://arxiv.org/html/2502.13138#A2.F6 "Figure 6 ‣ B.1 Code Complexity Growth ‣ Appendix B Analysis of AIDE ‣ AIDE: AI-Driven Exploration in the Space of Code"), we observe that the aggregated code complexity (combining LOC, LLOC, Volume, N1, and MI) exhibits an overall increasing trend as the number of iterative steps grows. Initially, there is a slight dip in complexity, but after the first step, the metrics begin a generally steady rise. This suggests that as AIDE (GPT-4 Turbo) produces successive iterations of code, the solutions tend to become more elaborate, with additional lines of code and logical structures contributing to higher values for traditional software complexity measures. The progressive increase implies that, over multiple generation steps, the model accumulates more intricate functionality—potentially reflecting deeper problem-solving processes or additional features—leading to an increasingly complex codebase by the final iteration.

### B.2 Cost Analysis

Figure 7: LLM cost of running AIDE per task on the Weco-Kaggle benchmark. We used GPT-4 Turbo (gpt-4-0125-preview) with pricing data from January to February 2024.

Figure [7](https://arxiv.org/html/2502.13138#A2.F7 "Figure 7 ‣ B.2 Cost Analysis ‣ Appendix B Analysis of AIDE ‣ AIDE: AI-Driven Exploration in the Space of Code") illustrates the per-task LLM inference cost for AIDE across the Weco-Kaggle benchmark, using GPT-4 Turbo (gpt-4-0125-preview) with pricing data from early 2024. Although certain tasks incur higher costs due to more extensive prompting (up to approximately $2.50 per task), the majority remain under $1.50, reflecting moderate token usage and minimal manual intervention. Overall, these expenditures are much lower than the investment required for human experts or conventional AutoML services, especially when considering the significant performance gains achieved by AIDE’s fully automated design. Moreover, as language model costs continue to decline, AIDE’s approach becomes increasingly competitive in terms of both performance and budget.

## Appendix C Weco Kaggle Benchmark

|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| Competition | Local Eval | Kaggle Submittable | GPU | Data Size |  |
| \endfirsthead      Competition | has local eval | kaggle submittable | needs gpu | compressed data size |  |
| \endhead[bike-sharing-demand](https://www.kaggle.com/c/bike-sharing-demand) | ✓ | ✓ |  | 193.8 kB |  |
| [cat-in-the-dat](https://www.kaggle.com/c/cat-in-the-dat) | ✓ | ✓ |  | 22.3 MB |  |
| [godaddy-microbusiness-density-forecasting](https://www.kaggle.com/c/godaddy-microbusiness-density-forecasting) | ✓ |  |  | 1.9 MB |  |
| [house-prices-advanced-regression-techniques](https://www.kaggle.com/c/house-prices-advanced-regression-techniques) | ✓ | ✓ |  | 203.8 kB |  |
| [icr-identify-age-related-conditions](https://www.kaggle.com/c/icr-identify-age-related-conditions) | ✓ | ~ |  | 154.1 kB |  |
| [new-york-city-taxi-fare-prediction](https://www.kaggle.com/c/new-york-city-taxi-fare-prediction) | ✓ | ✓ |  | 1.7 GB |  |
| [optiver-trading-at-the-close](https://www.kaggle.com/c/optiver-trading-at-the-close) | ✓ |  |  | 210.3 MB |  |
| [playground-series-s3e14](https://www.kaggle.com/c/playground-series-s3e14) | ✓ | ✓ |  | 649.5 kB |  |
| [playground-series-s3e16](https://www.kaggle.com/c/playground-series-s3e16) | ✓ | ✓ |  | 2.8 MB |  |
| [playground-series-s3e17](https://www.kaggle.com/c/playground-series-s3e17) | ✓ |  |  | 3.7 MB |  |
| [playground-series-s3e18](https://www.kaggle.com/c/playground-series-s3e18) | ✓ |  |  | 2.5 MB |  |
| [playground-series-s3e19](https://www.kaggle.com/c/playground-series-s3e19) | ✓ | ✓ |  | 1.2 MB |  |
| [playground-series-s3e20](https://www.kaggle.com/c/playground-series-s3e20) | ✓ |  |  | 51.3 MB |  |
| [playground-series-s3e22](https://www.kaggle.com/c/playground-series-s3e22) | ✓ | ✓ |  | 61.2 kB |  |
| [playground-series-s3e23](https://www.kaggle.com/c/playground-series-s3e23) | ✓ |  |  | 6.0 MB |  |
| [playground-series-s3e24](https://www.kaggle.com/c/playground-series-s3e24) | ✓ | ✓ |  | 7.1 MB |  |
| [playground-series-s3e25](https://www.kaggle.com/c/playground-series-s3e25) | ✓ | ✓ |  | 575.1 kB |  |
| [tabular-playground-series-aug-2022](https://www.kaggle.com/c/tabular-playground-series-aug-2022) | ✓ | ✓ |  | 2.4 MB |  |
| [tabular-playground-series-feb-2021](https://www.kaggle.com/c/tabular-playground-series-feb-2021) | ✓ | ✓ |  | 68.9 MB |  |
| [tabular-playground-series-feb-2022](https://www.kaggle.com/c/tabular-playground-series-feb-2022) | ✓ | ✓ |  | 279.7 MB |  |
| [tabular-playground-series-jan-2022](https://www.kaggle.com/c/tabular-playground-series-jan-2022) | ✓ | ✓ |  | 236.0 kB |  |
| [tabular-playground-series-jul-2021](https://www.kaggle.com/c/tabular-playground-series-jul-2021) | ✓ | ✓ |  | 270.4 kB |  |
| [tmdb-box-office-prediction](https://www.kaggle.com/c/tmdb-box-office-prediction) | ✓ | ✓ |  | 18.3 MB |  |
| [career-con-2019](https://www.kaggle.com/c/career-con-2019) |  | ✓ |  | 36.5 MB |  |
| [carvana-image-masking-challenge](https://www.kaggle.com/c/carvana-image-masking-challenge) |  | ✓ | ✓ | 26.2 GB |  |
| [cat-in-the-dat-ii](https://www.kaggle.com/c/cat-in-the-dat-ii) |  | ✓ |  | 43.3 MB |  |
| [cifar-10](https://www.kaggle.com/c/cifar-10) |  | ✓ | ✓ | 750.1 MB |  |
| [ciphertext-challenge-ii](https://www.kaggle.com/c/ciphertext-challenge-ii) |  | ✓ | ✓ | 95.6 MB |  |
| [ciphertext-challenge-iii](https://www.kaggle.com/c/ciphertext-challenge-iii) |  | ✓ | ✓ | 34.4 MB |  |
| [competitive-data-science-predict-future-sales](https://www.kaggle.com/c/competitive-data-science-predict-future-sales) |  | ✓ |  | 15.8 MB |  |
| [digit-recognizer](https://www.kaggle.com/c/digit-recognizer) |  | ✓ |  | 16.1 MB |  |
| [dog-breed-identification](https://www.kaggle.com/c/dog-breed-identification) |  | ✓ | ✓ | 724.5 MB |  |
| [dont-overfit-ii](https://www.kaggle.com/c/dont-overfit-ii) |  | ✓ | ✓ | 13.3 MB |  |
| [facial-keypoints-detection](https://www.kaggle.com/c/facial-keypoints-detection) |  | ✓ | ✓ | 80.0 MB |  |
| [forest-cover-type-prediction](https://www.kaggle.com/c/forest-cover-type-prediction) |  | ✓ | ✓ | 26.6 MB |  |
| [histopathologic-cancer-detection](https://www.kaggle.com/c/histopathologic-cancer-detection) |  | ✓ | ✓ | 6.8 GB |  |
| [home-data-for-ml-course](https://www.kaggle.com/c/home-data-for-ml-course) |  | ✓ |  | 395.3 kB |  |
| [iwildcam-2019-fgvc6](https://www.kaggle.com/c/iwildcam-2019-fgvc6) |  | ✓ | ✓ | 46.6 GB |  |
| [jigsaw-toxic-comment-classification-challenge](https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge) |  | ✓ | ✓ | 55.2 MB |  |
| [kuzushiji-recognition](https://www.kaggle.com/c/kuzushiji-recognition) |  | ✓ | ✓ | 4.5 GB |  |
| [nlp-getting-started](https://www.kaggle.com/c/nlp-getting-started) |  | ✓ |  | 607.3 kB |  |
| [noaa-right-whale-recognition](https://www.kaggle.com/c/noaa-right-whale-recognition) |  | ✓ | ✓ | 9.8 GB |  |
| [planttraits2024](https://www.kaggle.com/c/planttraits2024) |  | ✓ | ✓ | 3.8 GB |  |
| [playground-series-s3e1](https://www.kaggle.com/c/playground-series-s3e1) |  | ✓ |  | 2.4 MB |  |
| [playground-series-s3e11](https://www.kaggle.com/c/playground-series-s3e11) |  | ✓ |  | 9.4 MB |  |
| [playground-series-s3e13](https://www.kaggle.com/c/playground-series-s3e13) |  | ✓ |  | 21.0 kB |  |
| [playground-series-s3e15](https://www.kaggle.com/c/playground-series-s3e15) |  | ✓ |  | 414.8 kB |  |
| [playground-series-s3e26](https://www.kaggle.com/c/playground-series-s3e26) |  | ✓ |  | 358.8 kB |  |
| [playground-series-s3e3](https://www.kaggle.com/c/playground-series-s3e3) |  | ✓ |  | 97.4 kB |  |
| [playground-series-s3e5](https://www.kaggle.com/c/playground-series-s3e5) |  | ✓ |  | 69.6 kB |  |
| [playground-series-s3e7](https://www.kaggle.com/c/playground-series-s3e7) |  | ✓ |  | 929.8 kB |  |
| [playground-series-s3e9](https://www.kaggle.com/c/playground-series-s3e9) |  | ✓ |  | 110.9 kB |  |
| [playground-series-s4e1](https://www.kaggle.com/c/playground-series-s4e1) |  | ✓ |  | 7.1 MB |  |
| [playground-series-s4e2](https://www.kaggle.com/c/playground-series-s4e2) |  | ✓ |  | 939.5 kB |  |
| [predict-volcanic-eruptions-ingv-oe](https://www.kaggle.com/c/predict-volcanic-eruptions-ingv-oe) |  | ✓ | ✓ | 10.2 GB |  |
| [recognizing-faces-in-the-wild](https://www.kaggle.com/c/recognizing-faces-in-the-wild) |  | ✓ | ✓ | 399.8 MB |  |
| [rsna-pneumonia-detection-challenge](https://www.kaggle.com/c/rsna-pneumonia-detection-challenge) |  | ✓ | ✓ | 3.9 GB |  |
| [santa-2019-revenge-of-the-accountants](https://www.kaggle.com/c/santa-2019-revenge-of-the-accountants) |  | ✓ |  | 95.7 kB |  |
| [scrabble-player-rating](https://www.kaggle.com/c/scrabble-player-rating) |  | ✓ |  | 39.2 MB |  |
| [sentiment-analysis-on-movie-reviews](https://www.kaggle.com/c/sentiment-analysis-on-movie-reviews) |  | ✓ |  | 2.0 MB |  |
| [spaceship-titanic](https://www.kaggle.com/c/spaceship-titanic) |  | ✓ |  | 306.4 kB |  |
| [tabular-playground-series-apr-2021](https://www.kaggle.com/c/tabular-playground-series-apr-2021) |  | ✓ |  | 4.6 MB |  |
| [tabular-playground-series-apr-2022](https://www.kaggle.com/c/tabular-playground-series-apr-2022) |  | ✓ |  | 179.6 MB |  |
| [tabular-playground-series-aug-2021](https://www.kaggle.com/c/tabular-playground-series-aug-2021) |  | ✓ |  | 156.7 MB |  |
| [tabular-playground-series-dec-2021](https://www.kaggle.com/c/tabular-playground-series-dec-2021) |  | ✓ |  | 131.8 MB |  |
| [tabular-playground-series-jan-2021](https://www.kaggle.com/c/tabular-playground-series-jan-2021) |  | ✓ |  | 65.8 MB |  |
| [tabular-playground-series-jul-2022](https://www.kaggle.com/c/tabular-playground-series-jul-2022) |  | ✓ |  | 20.6 MB |  |
| [tabular-playground-series-jun-2021](https://www.kaggle.com/c/tabular-playground-series-jun-2021) |  | ✓ |  | 10.4 MB |  |
| [tabular-playground-series-jun-2022](https://www.kaggle.com/c/tabular-playground-series-jun-2022) |  | ✓ |  | 245.9 MB |  |
| [tabular-playground-series-mar-2021](https://www.kaggle.com/c/tabular-playground-series-mar-2021) |  | ✓ |  | 57.6 MB |  |
| [tabular-playground-series-mar-2022](https://www.kaggle.com/c/tabular-playground-series-mar-2022) |  | ✓ |  | 4.9 MB |  |
| [tabular-playground-series-may-2021](https://www.kaggle.com/c/tabular-playground-series-may-2021) |  | ✓ |  | 2.8 MB |  |
| [tabular-playground-series-may-2022](https://www.kaggle.com/c/tabular-playground-series-may-2022) |  | ✓ |  | 269.9 MB |  |
| [tabular-playground-series-nov-2021](https://www.kaggle.com/c/tabular-playground-series-nov-2021) |  | ✓ |  | 449.0 MB |  |
| [tabular-playground-series-nov-2022](https://www.kaggle.com/c/tabular-playground-series-nov-2022) |  | ✓ |  | 1.1 GB |  |
| [tabular-playground-series-oct-2021](https://www.kaggle.com/c/tabular-playground-series-oct-2021) |  | ✓ |  | 1.4 GB |  |
| [tabular-playground-series-oct-2022](https://www.kaggle.com/c/tabular-playground-series-oct-2022) |  | ✓ |  | 3.7 GB |  |
| [tabular-playground-series-sep-2021](https://www.kaggle.com/c/tabular-playground-series-sep-2021) |  | ✓ |  | 626.2 MB |  |
| [tabular-playground-series-sep-2022](https://www.kaggle.com/c/tabular-playground-series-sep-2022) |  | ✓ |  | 630.1 kB |  |
| [tgs-salt-identification-challenge](https://www.kaggle.com/c/tgs-salt-identification-challenge) |  | ✓ | ✓ | 466.1 MB |  |
