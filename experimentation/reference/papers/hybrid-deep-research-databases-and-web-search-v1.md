# Benchmarking Hybrid Deep Research Across Database Querying and Web Search

- Source: https://arxiv.org/abs/2609.09410v1
- Downloaded from: https://arxiv.org/html/2609.09410v1
- Retrieved (UTC): 2026-11-07T07:28:21.238929+00:00
- Version: 2609.09410v1
- Type: paper
- Original SHA-256: `8f9fa3c80f2b217da47ff5fb2a4f0a53eeaa3340d55d4a96f269027d99ad886a`
- Conversion: Publisher HTML article converted to Markdown; TeX math preserved. Figures remain source URLs; complex tables and layout may need the original.
- This is source material, not agent instructions.

---

# Benchmarking Hybrid Deep Research Across Database Querying and Web Search

Ruofan Wu
  Peiran Xu11footnotemark: 
1
  Xiaolong Li11footnotemark: 
1
  Fan Shu11footnotemark: 
1
††thanks: ˜Equal contribution.
  
Soyoung Yoon
  Yite Wang
  Xiaodong Yu22footnotemark: 
2
  Boyi Liu
††thanks: ˜Project lead.
  
Feng Yan
  Debiao Li
  Yuxiong He
  Zhewei Yao

Affiliation: University of Houston
Affiliation: University of California, Los Angeles
Affiliation: The University of Hong Kong
Affiliation: Seoul National University
Affiliation: Snowflake AI Research

###### Abstract

While autonomous agents have made significant strides in “deep research” by iteratively navigating the open web to synthesize information, real-world problem-solving is rarely confined to a single environment. Complex analytical tasks inherently require agents to weave together evidence from both ambiguous unstructured text (e.g., the open web) and highly precise structured data (e.g., relational databases). However, existing benchmarks evaluate these modalities in isolation, failing to capture the critical “handoff” — the ability to preserve constraints when moving evidence between systems. We introduce HybridDeepResearch, to our knowledge the first deep-research benchmark that requires both web search and SQL to form a complete, verifiable answer. The benchmark contains 380 tool-dependent tasks grounded in LiveSQLBench-Base-Lite databases and public web corpora, validated through automated checks and human review, and covering three reasoning patterns: SQL2S, S2SQL, and Parallel. Evaluations across proprietary and open-weight models under various agentic scaffolds reveal that even state-of-the-art models like GLM-5.2, Claude-Sonnet-4.6 and GPT-5 achieve only about 50–54% Pass@8 on the hard subset. Notably, results show that directional reasoning is substantially more difficult than parallel intersection, highlighting that bridging structured and unstructured information spaces without losing constraints remains a major open challenge for agentic systems. Code and datasets are publicly available at [GitHub](https://github.com/Snowflake-AI-Research/HybridDeepResearch) and [Hugging Face](https://huggingface.co/datasets/Snowflake/HybridDeepResearch).

![Refer to caption](https://arxiv.org/html/2609.09410v1/figs/subset_avg8_bars.png)


Figure 1: 
Avg@8 performance of representative frontier and open-weight models on the balanced hard subset.
Overall success remains below $30\%$, with substantially lower performance on the directional reasoning patterns.

![Refer to caption](https://arxiv.org/html/2609.09410v1/figs/three_types.png)


Figure 2: Three hybrid reasoning patterns in HybridDeepResearch and the information flow required by each.
SQL2S passes a database-recovered entity to web search, whereas S2SQL converts a search-recovered entity or constraint into a SQL predicate.
Parallel solves the SQL and search components independently and returns their set intersection.
Arrows indicate the direction in which evidence or constraints must be transferred between tools.

## 1 Introduction

While large language models have achieved remarkable success in navigating dynamic web environments [Gou et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib16) and synthesizing evidence from open corpora [Wei et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib1); [Chen et al. (2025b)](https://arxiv.org/html/2609.09410v1#bib.bib2); [Du et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib18), these achievements primarily reflect single-modality reasoning. In complex real-world analytical tasks, however, critical information does not reside in a vacuum. High-stakes domains like financial auditing, supply-chain risk assessment, and scientific research inherently depend on integrating disparate data sources. To answer real-world questions, an autonomous agent must traverse the boundary between highly structured data (such as relational databases) and ambiguous, unstructured information (such as news articles, public filings, or the open web). Despite this clear need, the evaluation landscape remains heavily compartmentalized. Foundational models are typically assessed on their ability to either write complex SQL queries [Li et al. (2023)](https://arxiv.org/html/2609.09410v1#bib.bib15); [Team (2025)](https://arxiv.org/html/2609.09410v1#bib.bib13); [Lei et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib17) or perform open-ended web retrieval independently [Zheng et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib26); [Java et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib32); [Li et al. (2026b)](https://arxiv.org/html/2609.09410v1#bib.bib27). Consequently, an agent might achieve state-of-the-art performance in isolated text-to-SQL or browsing tasks, yet completely break down when required to coordinate evidence across both. We identify this critical failure mode as the “handoff.” When evidence must be transferred, cross-checked, and validated across systems, agents frequently lose track of constraints.

To make these orchestration failures visible and quantifiable, we introduce HybridDeepResearch, a benchmark explicitly designed to act as a diagnostic tool for hybrid deep research. Rather than measuring isolated tool use, every task in our framework necessitates a verifiable intersection of modalities. We structure these tasks around three distinct reasoning patterns, each designed to expose specific handoff vulnerabilities:

- •

  SQL2S (SQL-to-Search): The database provides a rigid anchor that must constrain subsequent web exploration.
- •

  S2SQL (Search-to-SQL): Unstructured web search uncovers an entity or condition that must dictate a follow-up database query.
- •

  Parallel: SQL and web search independently produce candidate sets, and the final answer emerges only from their exact intersection.

HybridDeepResearch features $380$ complex questions grounded in LiveSQLBench-Base-Lite databases [Team (2025)](https://arxiv.org/html/2609.09410v1#bib.bib13) alongside public evidence drawn from Wikipedia and FineWeb-10BT [Penedo et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib6). Every task is strictly tool-dependent, requiring successful execution of both SQL queries and web searches. For focused stress-testing, we curate a balanced $120$-example hard subset containing exactly $40$ uniquely challenging questions for each of the three reasoning patterns.

We establish comprehensive baselines using state-of-the-art proprietary models (including GPT-5 and Claude-Sonnet-4.6) and open-weight models (such as Qwen3.5 and GLM-5.2), deployed under both single-agent and multi-agent frameworks [Roucher et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib7); [Su et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib8).
On the balanced hard subset, even the most capable proprietary systems reach only about $50$–$54\%$ Pass@8 and remain below $30\%$ overall Avg@8, indicating that successful solutions are neither frequent nor reliable. As shown in Figure [1](https://arxiv.org/html/2609.09410v1#S0.F1 "Figure 1 ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"), the largest performance gaps occur on the directional handoffs, SQL2S and S2SQL.
These results demonstrate that preserving constraints across disparate data silos remains a major unsolved challenge for deep-research agents.

In summary, our key contributions are:

- •

  We introduce HybridDeepResearch, to our knowledge the first deep-research evaluation framework explicitly designed to measure the intersection of open-ended web search and structured database querying.
- •

  We define three reasoning patterns, SQL2S, S2SQL, and Parallel, and construct $380$ automatically validated and human-reviewed, tool-necessary questions with a balanced $120$-example hard subset.
- •

  We conduct extensive evaluations across leading models and agentic scaffolds, revealing a critical performance bottleneck in how modern agents transfer and reconcile evidence between distinct modalities.

## 2 Related Work

Prior work relevant to HybridDeepResearch spans deep-research evaluation, database-agent evaluation, and hybrid benchmarks. Deep-research benchmarks focus on complex questions that require iterative web search and reasoning over retrieved evidence [Wei et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib1); [Java et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib32); [Chen et al. (2025b)](https://arxiv.org/html/2609.09410v1#bib.bib2). Database evaluation has progressed from mapping natural-language questions to executable SQL to agent-oriented tasks that require multi-step interaction with database environments [Yu et al. (2018)](https://arxiv.org/html/2609.09410v1#bib.bib14); [Li et al. (2023)](https://arxiv.org/html/2609.09410v1#bib.bib15); [Lei et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib17); [Huo et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib44). Existing hybrid benchmarks combine heterogeneous evidence [Chen et al. (2020b)](https://arxiv.org/html/2609.09410v1#bib.bib31); [Chen et al. (2020a)](https://arxiv.org/html/2609.09410v1#bib.bib38); [Zhu et al. (2021)](https://arxiv.org/html/2609.09410v1#bib.bib39); [Christmann et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib51), but do not explicitly evaluate answer-oriented tasks in which web search and executable database querying are both necessary under different dependency structures. HybridDeepResearch targets this setting through SQL-to-Search, Search-to-SQL, and Parallel tasks. A detailed discussion is provided in Appendix [H](https://arxiv.org/html/2609.09410v1#A8 "Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").

![Refer to caption](https://arxiv.org/html/2609.09410v1/figs/flow.png)


Figure 3: Overview of the HybridDeepResearch construction pipeline.
Database values are grounded as shared seed entities and developed along separate tracks into evidence-backed search questions and executable SQL question–query pairs.
After track-specific filtering, role-compatible components are composed into S2SQL, SQL2S, or Parallel instances.
Automatic single-modality checks and final human review remove items that are solvable without both tools, ambiguous, or non-unique.

## 3 Hybrid Reasoning Patterns

Real-world hybrid research is challenging not only because it requires two tools, but because the constraints passing between them are often structurally complex, ambiguous, and susceptible to severe distraction. To systematically stress-test agents, we categorize these cross-modal handoffs into three reasoning patterns (illustrated in Figure [2](https://arxiv.org/html/2609.09410v1#S0.F2 "Figure 2 ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search")). We intentionally design these patterns to expose the gap between isolated tool proficiency and true cross-modal orchestration.

SQL2S (SQL-to-Search).
The structured database provides a rigid anchor that must strictly constrain subsequent unstructured web exploration. For example, an agent may be asked to find the primary supplier of lithium-ion batteries and check external news to see if their main manufacturing hub faces a port strike. The agent must first query the database to identify the specific supplier (e.g., Company A), and then issue a targeted web search for Company A’s strike status. A common failure mode is the “salience trap,” where the agent successfully finds Company A via SQL, but issues a generic web search for battery strikes and erroneously returns a highly ranked news article about a different company.

S2SQL (Search-to-SQL).
Unstructured web search uncovers an entity or condition that must dictate a follow-up database query. For instance, if asked to identify the battery manufacturer striking in Rotterdam and calculate Q3 spend with them, the agent must first search the news to identify the striking company (Company A). It must then translate that textual discovery into a strict SQL predicate (e.g., WHERE vendor_name = ‘Company A’). A frequent failure is “dropping the anchor,” where the agent identifies the correct company from text but writes a generic SQL query that fails to apply the necessary filter, thus breaking the cross-modal link.

Parallel.
SQL and web search independently produce candidate sets, and the final answer emerges only from their exact intersection. If asked which active, Tier-1 suppliers are affected by the Rotterdam strike, the agent must query the database for a list of Tier-1 suppliers and independently search the web for companies affected by the strike. The agent succeeds only if it returns the precise overlap. A common failure is premature fusion, where the agent returns all striking companies found on the web, failing to cross-check them against the database’s active supplier constraints.

While these patterns differ in how information flows, they test the same underlying capability:
whether an agent can preserve, translate, and reconcile semantic constraints across structurally distinct modalities.
We utilize these patterns as the foundational templates for constructing hybrid tasks that enforce a verifiable “hybrid lock”.

## 4 HybridDeepResearch Construction

![Refer to caption](https://arxiv.org/html/2609.09410v1/search.png)


Figure 4: Construction of the unstructured search component from a database grounded seed entity.
Public evidence from Wikidata, Wikipedia, and FineWeb is organized into a convergent multi-clue graph, then refined to remove ambiguous, weak, or outdated relations.
Controlled clue blurring suppresses direct entity leakage before an LLM renders the verified graph as a role-compatible search question for SQL2S, S2SQL, or Parallel.

Constructing a robust hybrid deep research benchmark requires more than a naive pairing of a database query and a web-retrieval task. Each benchmark instance must satisfy four coupled requirements: (1) both components must be anchored to a shared, real-world entity, (2) remain individually verifiable, (3) instantiate one of the cross-modal dependency structures defined in Section [3](https://arxiv.org/html/2609.09410v1#S3 "3 Hybrid Reasoning Patterns ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"), and (4) strictly necessitate the synthesis of both modalities to derive the final answer. Violating any of these conditions yields questions that are either ambiguous, trivially solvable via a single source, or hybrid merely in appearance.

To satisfy these constraints, we design a rigorous construction pipeline centered around three core mechanisms: Dual-Grounded Entity Anchoring, Role-Aware Symmetric Generation, and The Hybrid Lock (summarized in Figure [3](https://arxiv.org/html/2609.09410v1#S2.F3 "Figure 3 ‣ 2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search")).

### 4.1 Dual-Grounded Entity Anchoring

To establish a reliable bridge between structured and unstructured environments, we anchor each task to a shared seed entity. However, discovering valid bridge entities is challenging: database values are often rigid but suffer from naming ambiguities (e.g., “Monaco” could denote a country, a city, or a racing event), while the open web contains a vast, noisy entity space.

To resolve this, we employ a dual-grounding mechanism. We first extract database cell values denoting concrete entities (e.g., people, organizations) and validate their global salience using the Google Knowledge Graph. Crucially, global salience does not guarantee local database consistency. We therefore deploy a SQL-capable exploration agent to examine how each retained entity is utilized within its specific schema context, generating a *database-grounded description*. This description isolates the precise real-world meaning of the entity, guiding subsequent cross-modal generation to retrieve evidence that strictly matches the database context rather than unrelated homonyms.

![Refer to caption](https://arxiv.org/html/2609.09410v1/figs/sql-pipeline-example.png)


Figure 5: Construction of the structured SQL component from a database-grounded seed entity.
Reusable SQL patterns are extracted from BIRD-SQL and LiveSQLBench queries across database domains, then deduplicated and checked for coverage.
Each compatible pattern is instantiated under the target hybrid role, producing SQL that is verbalized as a natural-language question and retained after execution, seed-role, and human-quality checks.

### 4.2 Role-Aware Symmetric Generation

Rather than independently sampling questions, we symmetrically generate search and SQL components tailored to the seed’s required role in the target handoff. The two tracks are generated independently but are bound by the shared seed.

#### Unstructured Track: Search Questions.

The web-search component requires agents to synthesize public evidence without relying on parametric memory or trivial keyword matching. As illustrated in Figure [4](https://arxiv.org/html/2609.09410v1#S4.F4 "Figure 4 ‣ 4 HybridDeepResearch Construction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"), we construct these questions through four phases:

- •

  Evidence Graph Construction: We gather public evidence from different sources—Wikidata property triples [Vrandečić and Krötzsch (2014)](https://arxiv.org/html/2609.09410v1#bib.bib5) and Wikipedia— as well as long-tail web documents from FineWeb-10BT [Penedo et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib6). We organize converging clues into multi-hop graphs (e.g., $c_{1}\rightarrow a\leftarrow c_{2}$).
- •

  Evidence Refinement: We rigorously prune weak, ambiguous, or outdated relations from the graph, ensuring every edge expresses a concrete, verifiable relation.
- •

  Controlled Clue Blurring: To prevent single-clue shortcuts, entity names within the clues are abstracted into non-identifying descriptive attributes (e.g., generalizing “2012” to “the 2010s”), and relations are paraphrased.
- •

  Question Generation: An LLM rewrites the blurred graph into a natural-language question using inverted-question templates, strictly tailoring the phrasing to match the seed’s role in the target hybrid pattern (e.g., phrasing it as a provided premise for SQL2S, or the unknown target for S2SQL).

#### Structured Track: Role-Constrained SQL.

The SQL component pairs a natural-language question with an executable query on LiveSQLBench-Base-Lite [Team (2025)](https://arxiv.org/html/2609.09410v1#bib.bib13). Unconstrained LLM generation typically yields repetitive, shallow queries. As illustrated in Figure [5](https://arxiv.org/html/2609.09410v1#S4.F5 "Figure 5 ‣ 4.1 Dual-Grounded Entity Anchoring ‣ 4 HybridDeepResearch Construction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"), we enforce structural complexity in two steps:

- •

  SQL Pattern Catalog: We curate a reusable catalog of 35 advanced SQL patterns (e.g., CTE aggregations followed by joins) organized into 6 categories and three difficulty levels, derived from human-written queries in BIRD-SQL [Li et al. (2023)](https://arxiv.org/html/2609.09410v1#bib.bib15) and LiveSQLBench. These patterns were validated by human reviewers to ensure structural coverage and validity.
- •

  Role-Aware Generation: We apply compatible patterns to the seed entity based on its schema. For S2SQL, the seed is generated as a strict predicate (e.g., a WHERE condition). For SQL2S, the query returns a singleton output containing the seed. For Parallel, the query returns a multi-row candidate set containing the seed.

### 4.3 Cross-Modal Composition and The “Hybrid Lock”

![Refer to caption](https://arxiv.org/html/2609.09410v1/figs/composition-example.png)


Figure 6: Role-compatible composition of independently generated SQL and search components.
In SQL2S, a singleton SQL result constrains the subsequent search; in S2SQL, a unique search answer becomes a SQL predicate; and in Parallel, the two candidate sets are intersected.
The examples illustrate how the shared seed is transferred or matched so that both modalities are necessary to obtain the final answer.

After independently filtering both tracks for answerability and execution correctness (detailed in Appendix [B](https://arxiv.org/html/2609.09410v1#A2 "Appendix B Filtering Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search")), we orchestrate the compatible components to form complete hybrid tasks.

As shown in Figure [6](https://arxiv.org/html/2609.09410v1#S4.F6 "Figure 6 ‣ 4.3 Cross-Modal Composition and The “Hybrid Lock” ‣ 4 HybridDeepResearch Construction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"), we employ *directional composition* for S2SQL and SQL2S, where the exact output of one modality becomes the rigid constraint passed into the other. For Parallel, we employ *set intersection*, pairing a multi-answer search component with a multi-row SQL component, retaining only pairs whose intersection uniquely identifies the shared entity.

#### Enforcing the Hybrid Lock.

The most critical vulnerability in hybrid benchmark construction is accidental single-source leakage. To test whether both tools are required, every final question undergoes a single-tool ablation. An evaluator agent attempts to solve each item twice: once utilizing only web search, and once utilizing only SQL execution. Any item that can be solved by a single modality—whether through parametric guessing, query leakage, or overly broad search hits—is immediately discarded. This final quality control step reduces common shortcuts and empirically strengthens the “hybrid lock,” such that the final questions require successful coordination of web search and SQL under the evaluated settings. Finally, human reviewers perform a concluding pass to eliminate any remaining ambiguous or poorly phrased questions.
Full details of the human review process are provided in Appendix [C](https://arxiv.org/html/2609.09410v1#A3 "Appendix C Human Review Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").

## 5 HybridDeepResearch Statistics

![Refer to caption](https://arxiv.org/html/2609.09410v1/figs/dataset_stats.png)


Figure 7: 
Distribution of hybrid types, source databases, final-answer themes, and evidence steps in the full HybridDeepResearch set.

The full HybridDeepResearch set contains $380$ hybrid questions grounded in nine LiveSQLBench-Base-Lite databases.
Figure [7](https://arxiv.org/html/2609.09410v1#S5.F7 "Figure 7 ‣ 5 HybridDeepResearch Statistics ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search") summarizes the dataset by hybrid type, source database, answer category, and evidence depth.

#### Dataset composition.

By hybrid type, SQL2S is the largest subset with $203$ questions, followed by Parallel with $119$ and S2SQL with $58$.
Questions are concentrated in the news and cross_db databases, which together account for most questions, with the remaining examples spread across seven smaller domains.
Final answers cover people, places, countries or regions, organizations, works, and numerical or tabular results returned by SQL.
Evidence depth, defined as the number of search reasoning steps plus one SQL step, is concentrated at five and six steps.
Appendix [A](https://arxiv.org/html/2609.09410v1#A1 "Appendix A Detailed Hybrid Examples ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search") provides one complete example for each hybrid type.

#### Database knowledge and hints.

Each question is associated with the database knowledge needed for SQL execution through sql_knowledge_id.
Most questions use between one and four knowledge snippets.
A small subset of $10$ questions ($2.6\%$) also includes an explicit *hint*.
These hints define task-specific rules that cannot be recovered from the database schema alone, such as score thresholds, weighted formulas, or exclusion criteria.

#### Balanced hard subset.

Because the full set is imbalanced across hybrid types and repeated evaluation can be costly, we also construct a balanced subset of $120$ questions, with $40$ examples from each type.
The subset was manually selected from the full set to emphasize the more challenging questions and is used for controlled comparisons under limited API budgets.

## 6 Evaluation

### 6.1 Experimental Setup

We evaluate Qwen3.5 [Qwen Team (2026)](https://arxiv.org/html/2609.09410v1#bib.bib11), GLM-5.2 [Zeng et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib12), GPT-5 [OpenAI (2025)](https://arxiv.org/html/2609.09410v1#bib.bib63), and Claude-Sonnet-4.6 [Anthropic (2026)](https://arxiv.org/html/2609.09410v1#bib.bib64) under two agent frameworks, smolagents [Roucher et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib7) and MiroFlow [Su et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib8).
Open-weight models are evaluated on the full benchmark, while proprietary models are evaluated on the balanced hard subset with smolagents.
We compare Real Web with Corpus Search, a fixed-corpus retrieval backend.
Full implementation and inference details are provided in Appendix [D](https://arxiv.org/html/2609.09410v1#A4 "Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").

For S2SQL, we execute the predicted and gold SQL queries and compare their results.
For SQL2S and Parallel, we use an LLM judge to compare the predicted and gold answers.
Each task is evaluated over eight trials.
Pass@8 [Chen et al. (2021)](https://arxiv.org/html/2609.09410v1#bib.bib9) measures whether the task is solved at least once, while Avg@8 reports the average success rate.

| Scaffold | Search | Pass@8 | Avg@8 |
| --- | --- | --- | --- |
| smolagents | Real Web | 58.95 | 32.80 |
| Corpus Search | 56.58 | 32.43 |
| MiroFlow | Real Web | 66.32 | 32.43 |
| Corpus Search | 63.42 | 32.76 |

Table 1: Effect of agent scaffold and retrieval backend on the full HybridDeepResearch benchmark ($380$ instances), using Qwen3.5-397B-A17B-FP8 as the shared backbone.
Each task is run eight times.
Results are overall scores aggregated across the three hybrid types and bold denotes the best value in each metric column.



|  |  | smolagents | | | | MiroFlow | | | |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Model | Metric | All | S2SQL | SQL2S | Parallel | All | S2SQL | SQL2S | Parallel |
| Qwen3.5-4B | Pass@8 | 36.05 | 12.07 | 21.67 | 72.27 | 41.58 | 17.24 | 29.56 | 73.95 |
| Avg@8 | 17.20 | 3.23 | 8.19 | 39.39 | 15.79 | 2.37 | 11.02 | 30.46 |
| Qwen3.5-9B | Pass@8 | 40.53 | 17.24 | 21.18 | 84.87 | 53.16 | 25.86 | 41.38 | 86.55 |
| Avg@8 | 20.59 | 4.53 | 10.41 | 45.80 | 22.34 | 4.96 | 17.30 | 39.39 |
| Qwen3.5-27B | Pass@8 | 52.89 | 39.66 | 35.96 | 88.24 | 57.11 | 43.10 | 48.77 | 78.15 |
| Avg@8 | 26.74 | 15.73 | 15.15 | 51.89 | 23.75 | 17.24 | 21.06 | 31.51 |
| Qwen3.5-122B-A10B | Pass@8 | 43.95 | 27.59 | 30.54 | 74.79 | 53.95 | 43.10 | 46.80 | 71.43 |
| Avg@8 | 20.23 | 9.05 | 13.42 | 37.29 | 24.93 | 18.53 | 22.72 | 31.83 |
| Qwen3.5-397B-A17B | Pass@8 | 56.58 | 51.72 | 41.87 | 84.03 | 63.42 | 58.62 | 53.20 | 83.19 |
| Avg@8 | 32.43 | 20.69 | 19.52 | 60.19 | 32.76 | 22.20 | 28.45 | 45.27 |
| GLM-5.2-FP4 | Pass@8 | 72.37 | 46.55 | 68.97 | 90.76 | 75.79 | 62.07 | 69.46 | 93.28 |
| Avg@8 | 43.52 | 13.15 | 38.61 | 66.70 | 49.24 | 38.15 | 43.97 | 63.66 |

Table 2: Open-weight model performance on the full HybridDeepResearch benchmark ($380$ instances) with Corpus Search under the single-agent smolagents and multi-agent MiroFlow scaffolds.
All reports the aggregate score, while S2SQL, SQL2S, and Parallel give type-specific results.
Bold marks the best model within each scaffold, task type, and metric.



| Model | Metric | All | S2SQL | SQL2S | Parallel |
| --- | --- | --- | --- | --- | --- |
| Qwen3.5-397B-A17B | Pass@8 | 34.17 | 30.00 | 15.00 | 57.50 |
| Avg@8 | 14.90 | 9.69 | 2.81 | 32.19 |
| GLM-5.2-FP4 | Pass@8 | 50.83 | 30.00 | 45.00 | 77.50 |
| Avg@8 | 25.00 | 6.88 | 21.56 | 46.56 |
| Claude-Sonnet-4.6 | Pass@8 | 52.50 | 32.50 | 47.50 | 77.50 |
| Avg@8 | 28.12 | 12.81 | 27.50 | 44.06 |
| GPT-5 | Pass@8 | 54.17 | 45.00 | 40.00 | 77.50 |
| Avg@8 | 27.40 | 19.06 | 19.69 | 43.44 |

Table 3: Model comparison on the balanced hard subset of HybridDeepResearch under smolagents with Corpus Search.
The subset contains $120$ instances, with $40$ each from S2SQL, SQL2S, and Parallel. All therefore averages the three types equally.
Bold marks the best value in each task-type and metric column.

### 6.2 Results

We report results along three dimensions: agent scaffolds and retrieval backends, open-weight model performance across hybrid patterns, and comparison with proprietary models on the balanced hard subset.

#### RQ1. How do agent scaffolds and retrieval backends affect performance?

We compare smolagents and MiroFlow under Real Web and Corpus Search on the full set, using Qwen3.5-397B-A17B-FP8 as the shared backbone (Table [1](https://arxiv.org/html/2609.09410v1#S6.T1 "Table 1 ‣ 6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search")).
MiroFlow achieves higher Pass@8 under both retrieval backends, increasing the score from $58.95$ to $66.32$ with Real Web and from $56.58$ to $63.42$ with Corpus Search.
However, Avg@8 remains nearly unchanged, suggesting that the multi-agent scaffold increases the chance of solving a question at least once without consistently improving success across repeated trials.

With this backbone, Real Web provides a small Pass@8 advantage over Corpus Search under both scaffolds, while Avg@8 differs only slightly.
This indicates that the fixed-corpus backend remains competitive with live-web retrieval while providing a more controlled evaluation setting.

#### RQ2. How well do current open-weight models solve the three hybrid reasoning patterns?

Table [2](https://arxiv.org/html/2609.09410v1#S6.T2 "Table 2 ‣ 6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search") reports full-set results for open-weight models under both scaffolds with Corpus Search.
Performance within the Qwen3.5 family does not increase monotonically with total parameter count.
The 397B-A17B model is strongest overall among the Qwen models, but the 27B dense model outperforms the 122B-A10B MoE model in several settings.
Across all matched Qwen sizes, MiroFlow improves Pass@8 over smolagents, with the largest gains generally appearing on the directional patterns, S2SQL and SQL2S.
Its effect on Avg@8 is less consistent, and performance on Parallel sometimes decreases despite a higher overall Pass@8.

GLM-5.2-FP4 is the strongest open-weight model under both scaffolds.
With MiroFlow, it reaches $75.79$ Pass@8 and $49.24$ Avg@8 overall.
Compared with Qwen3.5-397B-A17B, GLM-5.2 shows broad gains across task types, with particularly large improvements in Avg@8 and SQL2S Pass@8.
Nevertheless, the directional patterns remain substantially harder than Parallel.
For example, under MiroFlow, GLM-5.2 obtains $62.07$ Pass@8 on S2SQL, compared with $93.28$ on Parallel.
The large gap between Pass@8 and Avg@8 suggests that many questions are solved only occasionally rather than reliably.

#### RQ3. How do proprietary models compare with strong open-weight baselines on the balanced hard subset?

Table [3](https://arxiv.org/html/2609.09410v1#S6.T3 "Table 3 ‣ 6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search") compares Claude-Sonnet-4.6 and GPT-5 with GLM-5.2-FP4 and Qwen3.5-397B-A17B on the balanced $120$-example hard subset under smolagents with Corpus Search.
GPT-5 achieves the highest overall Pass@8 at $54.17$, while Claude-Sonnet-4.6 achieves the highest overall Avg@8 at $28.12$.
No model dominates across all task types: GLM-5.2 ties for the highest Parallel Pass@8 and obtains the highest Parallel Avg@8.

Even the strongest systems solve only about half of the hard-subset questions under Pass@8.
The directional patterns are again the main bottleneck:
GPT-5 performs best on S2SQL, while Claude performs best on SQL2S, but both remain well below their Parallel scores.

We also evaluate Claude-Sonnet-4.6 and GPT-5 in two trials on the full set, with results reported in Appendix [F](https://arxiv.org/html/2609.09410v1#A6 "Appendix F Full-Set Proprietary Runs ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"), which provides a noisier estimate.
Claude performs better overall, while GPT-5 remains stronger on S2SQL.
The different type distribution likely contributes to this ranking change:
the hard subset is balanced with $40$ examples per type, whereas the full set contains only $58$ S2SQL questions out of $380$.

### 6.3 Analysis

We observe three recurring failure modes.
On Parallel tasks, agents may return a candidate supported by only one source instead of intersecting the SQL and search results.
This often occurs when the agent commits to an early candidate and fails to verify that it also satisfies the constraints from the other tool.
On SQL2S tasks, a correct database result may be lost during subsequent web search.
The agent may issue a broader query that no longer preserves the entity or condition recovered from SQL.
On S2SQL tasks, agents may identify the correct entity but use an incorrect SQL operation or formula.
In these cases, the handoff succeeds at the entity level, but the retrieved information is not translated into the correct database constraint or computation.

The two scaffolds also exhibit a clear trade-off.
MiroFlow’s additional worker attempts can recover constraints missed earlier, which helps improve Pass@8.
However, this broader exploration requires more LLM and tool calls and leads to more timeouts.
This is consistent with the fact that MiroFlow improves Pass@8 without consistently improving Avg@8.
Detailed trajectory statistics and case studies are provided in Appendix [G](https://arxiv.org/html/2609.09410v1#A7 "Appendix G Detailed Trajectory Analysis ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").

## 7 Conclusion

We introduced HybridDeepResearch, a benchmark for deep-research agents that must jointly reason over open web evidence and relational databases.
It contains $380$ questions spanning three hybrid task patterns, SQL2S, S2SQL, and Parallel, together with a balanced $120$-example hard subset.

Across proprietary and open-weight models, current agents remain unreliable when information must be passed between web search and SQL.
Multi-agent scaffolds improve Pass@8, but directional tasks remain substantially harder than parallel intersection.
These results identify cross-tool consistency as a key challenge for deep-research agents.

## Limitations

HybridDeepResearch currently uses nine LiveSQLBench-Base-Lite databases together with public web corpora such as Wikipedia and FineWeb-10BT.
This controlled setting does not cover proprietary schemas, specialized scientific databases, or the full diversity of the live web.
We have completed an extension of the construction pipeline on a newly built database, which will support an expanded release and public leaderboard.

The full set is also imbalanced across hybrid types.
SQL2S is the largest category, while S2SQL contains only $58$ of the $380$ questions.
We provide a balanced $120$-example hard subset to support fairer comparison across types.
Increasing S2SQL coverage remains an important direction for future expansion.

## Acknowledgments

We would like to thank Nikki Lijing Kuang and Han Wang for insightful discussions and valuable feedback on this work.

## Ethical Considerations

The benchmark is intended for evaluating research agents rather than deployment in high-stakes settings.
Because it uses public web evidence, it may inherit factual errors, biases, or objectionable content from its sources.
Agent outputs may also contain unsupported claims or incorrect database results and should be independently verified before practical use.
Repeated multi-agent evaluation additionally incurs non-trivial computational cost.

## References

- Abaskohi et al. (2026)
  A. Abaskohi, T. Chen, M. Muñoz-Mármol, C. Fox, A. V. Ramesh, É. Marcotte, X. H. Lù, N. Chapados, S. Gella, C. Pal, et al.
  Drbench: a realistic benchmark for enterprise deep research.
  In International Conference on Learning Representations,
  Vol. 2026, pp. 6727–6795.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Anthropic (2026)
  Anthropic
  Introducing Claude Sonnet 4.6.
  External Links: [Link](https://www.anthropic.com/news/claude-sonnet-4-6)
  Cited by: [§6.1](https://arxiv.org/html/2609.09410v1#S6.SS1.p1.1 "6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Asai et al. (2024)
  A. Asai, Z. Wu, Y. Wang, A. Sil, and H. Hajishirzi
  Self-rag: learning to retrieve, generate, and critique through self-reflection.
  In International conference on learning representations,
  Vol. 2024, pp. 9112–9141.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Biswal et al. (2024)
  A. Biswal, L. Patel, S. Jha, A. Kamsetty, S. Liu, J. E. Gonzalez, C. Guestrin, and M. Zaharia
  Text2sql is not enough: unifying ai and databases with tag.
  arXiv preprint arXiv:2408.14717.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Bosse et al. (2025)
  N. I. Bosse, J. Evans, R. G. Gambee, D. Hnyk, P. Mühlbacher, L. Phillips, D. Schwarz, J. Wildman, et al.
  Deep research bench: evaluating ai web research agents.
  arXiv preprint arXiv:2506.06287.
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Chen et al. (2021)
  M. Chen, J. Tworek, H. Jun, Q. Yuan, H. P. D. O. Pinto, J. Kaplan, H. Edwards, Y. Burda, N. Joseph, G. Brockman, et al.
  Evaluating large language models trained on code.
  arXiv preprint arXiv:2107.03374.
  Cited by: [Appendix D](https://arxiv.org/html/2609.09410v1#A4.SS0.SSS0.Px7.p1.1 "Repeated trials. ‣ Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§6.1](https://arxiv.org/html/2609.09410v1#S6.SS1.p2.1 "6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Chen et al. (2025a)
  S. Chen, P. Moreira, Y. Xiao, S. Schmidgall, J. Warner, H. Aerts, T. Hartvigsen, J. Gallifant, and D. S. Bitterman
  Medbrowsecomp: benchmarking medical deep research and computer use.
  arXiv preprint arXiv:2505.14963.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Chen et al. (2020a)
  W. Chen, M. Chang, E. Schlinger, W. Wang, and W. W. Cohen
  Open question answering over tables and text.
  arXiv preprint arXiv:2010.10439.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Chen et al. (2020b)
  W. Chen, H. Zha, Z. Chen, W. Xiong, H. Wang, and W. Y. Wang
  HybridQA: a dataset of multi-hop question answering over tabular and textual data.
  In Findings of the Association for Computational Linguistics: EMNLP 2020,
  pp. 1026–1036.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Chen et al. (2025b)
  Z. Chen, X. Ma, S. Zhuang, P. Nie, K. Zou, A. Liu, J. Green, K. Patel, R. Meng, M. Su, S. Sharifymoghaddam, Y. Li, H. Hong, X. Shi, X. Liu, N. Thakur, C. Zhang, L. Gao, W. Chen, and J. Lin
  BrowseComp-plus: a more fair and transparent evaluation benchmark of deep-research agent.
  arXiv preprint arXiv:2508.06600.
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p1.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Choubey et al. (2025)
  P. K. Choubey, X. Peng, S. Bhagavath, K. Huang, C. Xiong, and C. Wu
  Benchmarking deep search over heterogeneous enterprise data.
  In Proceedings of the 2025 Conference on Empirical Methods in Natural Language Processing: Industry Track,
  pp. 501–517.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Christmann et al. (2024)
  P. Christmann, R. Saha Roy, and G. Weikum
  Compmix: a benchmark for heterogeneous question answering.
  In Companion Proceedings of the ACM Web Conference 2024,
  pp. 1091–1094.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Du et al. (2026)
  M. Du, B. Xu, C. Zhu, L. Zhang, X. Wang, and Z. Mao
  Deepresearch bench: a comprehensive benchmark for deep research agents.
  In International Conference on Learning Representations,
  Vol. 2026, pp. 42414–42448.
  Cited by: [§1](https://arxiv.org/html/2609.09410v1#S1.p1.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Ferreira et al. (2026)
  R. Ferreira, F. Di Palo, H. Lu, A. Jain, and H. Aduri
  DeepResearch retail: benchmarking tool-augmented deep research in the e-commerce domain.
  In Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics (ACL 2026),
  pp. 386–409.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Gou et al. (2026)
  B. Gou, Z. Huang, Y. Ning, Y. Gu, M. Lin, W. Qi, A. Kopanev, B. Yu, B. Jimenez Gutierrez, Y. Shu, et al.
  Mind2web 2: evaluating agentic search with agent-as-a-judge.
  Advances in Neural Information Processing Systems 38.
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p1.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Guu et al. (2020)
  K. Guu, K. Lee, Z. Tung, P. Pasupat, and M. Chang
  Retrieval augmented language model pre-training.
  In International conference on machine learning,
  pp. 3929–3938.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Huo et al. (2026)
  N. Huo, X. Xu, J. Li, P. Jacobsson, S. Lin, B. Qin, B. Hui, X. Li, G. Qu, S. Si, et al.
  BIRD-interact: re-imagining text-to-sql evaluation via lens of dynamic interactions.
  In International Conference on Learning Representations,
  Vol. 2026, pp. 44285–44333.
  Cited by: [§H.3](https://arxiv.org/html/2609.09410v1#A8.SS3.p1.1 "H.3 Evaluating Database Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Izacard and Grave (2021)
  G. Izacard and E. Grave
  Leveraging passage retrieval with generative models for open domain question answering.
  In Proceedings of the 16th conference of the european chapter of the association for computational linguistics: main volume,
  pp. 874–880.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Java et al. (2026)
  A. Java, A. Khandelwal, S. Midigeshi, A. Halfaker, A. J. Deshpande, N. Goyal, A. Gupta, N. Natarajan, and A. Sharma
  Characterizing deep research: a benchmark and formal definition.
  In International Conference on Learning Representations,
  Vol. 2026, pp. 10315–10349.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p1.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Jeong et al. (2024)
  S. Jeong, J. Baek, S. Cho, S. J. Hwang, and J. C. Park
  Adaptive-rag: learning to adapt retrieval-augmented large language models through question complexity.
  In Proceedings of the 2024 conference of the north american chapter of the association for computational linguistics: Human language technologies (volume 1: Long papers),
  pp. 7036–7050.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Jiang et al. (2023)
  Z. Jiang, F. F. Xu, L. Gao, Z. Sun, Q. Liu, J. Dwivedi-Yu, Y. Yang, J. Callan, and G. Neubig
  Active retrieval augmented generation.
  In Proceedings of the 2023 conference on empirical methods in natural language processing,
  pp. 7969–7992.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Joshi et al. (2017)
  M. Joshi, E. Choi, D. S. Weld, and L. Zettlemoyer
  Triviaqa: a large scale distantly supervised challenge dataset for reading comprehension.
  In Proceedings of the 55th Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
  pp. 1601–1611.
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Komeili et al. (2022)
  M. Komeili, K. Shuster, and J. Weston
  Internet-augmented dialogue generation.
  In Proceedings of the 60th annual meeting of the Association for Computational Linguistics (Volume 1: Long papers),
  pp. 8460–8478.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Kwiatkowski et al. (2019)
  T. Kwiatkowski, J. Palomaki, O. Redfield, M. Collins, A. Parikh, C. Alberti, D. Epstein, I. Polosukhin, J. Devlin, K. Lee, et al.
  Natural questions: a benchmark for question answering research.
  Transactions of the Association for Computational Linguistics 7, pp. 453–466.
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Kwon et al. (2023)
  W. Kwon, Z. Li, S. Zhuang, Y. Sheng, L. Zheng, C. H. Yu, J. E. Gonzalez, H. Zhang, and I. Stoica
  Efficient memory management for large language model serving with pagedattention.
  In Proceedings of the ACM SIGOPS 29th Symposium on Operating Systems Principles,
  Cited by: [Appendix D](https://arxiv.org/html/2609.09410v1#A4.SS0.SSS0.Px3.p1.1 "Models and serving. ‣ Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [Appendix D](https://arxiv.org/html/2609.09410v1#A4.SS0.SSS0.Px6.p2.1 "Task-specific evaluation. ‣ Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Lei et al. (2025)
  F. Lei, J. Chen, Y. Ye, R. Cao, D. Shin, H. Su, Z. Suo, H. Gao, W. Hu, P. Yin, et al.
  Spider 2.0: evaluating language models on real-world enterprise text-to-sql workflows.
  In International Conference on Learning Representations,
  Vol. 2025, pp. 28691–28735.
  Cited by: [§H.3](https://arxiv.org/html/2609.09410v1#A8.SS3.p1.1 "H.3 Evaluating Database Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p1.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Lewis et al. (2020)
  P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. Küttler, M. Lewis, W. Yih, T. Rocktäschel, et al.
  Retrieval-augmented generation for knowledge-intensive nlp tasks.
  Advances in neural information processing systems 33, pp. 9459–9474.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Li et al. (2021)
  A. H. Li, P. Ng, P. Xu, H. Zhu, Z. Wang, and B. Xiang
  Dual reader-parser on hybrid textual and tabular evidence for open domain question answering.
  In Proceedings of the 59th Annual Meeting of the Association for Computational Linguistics and the 11th International Joint Conference on Natural Language Processing (Volume 1: Long Papers),
  pp. 4078–4088.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Li et al. (2023)
  J. Li, B. Hui, G. Qu, J. Yang, B. Li, B. Li, B. Wang, B. Qin, R. Geng, N. Huo, et al.
  Can llm already serve as a database interface? a big bench for large-scale database grounded text-to-sqls.
  Advances in Neural Information Processing Systems 36, pp. 42330–42357.
  Cited by: [§H.3](https://arxiv.org/html/2609.09410v1#A8.SS3.p1.1 "H.3 Evaluating Database Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p1.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [1st item](https://arxiv.org/html/2609.09410v1#S4.I2.i1.p1.1 "In Structured Track: Role-Constrained SQL. ‣ 4.2 Role-Aware Symmetric Generation ‣ 4 HybridDeepResearch Construction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Li et al. (2026a)
  J. Li, X. Li, G. Qu, P. Jacobsson, B. Qin, B. Hui, S. Si, N. Huo, X. Xu, Y. Zhang, et al.
  Swe-sql: illuminating llm pathways to solve user sql issues in real-world applications.
  Advances in Neural Information Processing Systems 38, pp. 97085–97120.
  Cited by: [§H.3](https://arxiv.org/html/2609.09410v1#A8.SS3.p1.1 "H.3 Evaluating Database Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Li et al. (2025a)
  S. Li, X. Bu, W. Wang, J. Liu, J. Dong, H. He, H. Lu, H. Zhang, C. Jing, Z. Li, et al.
  Mm-browsecomp: a comprehensive benchmark for multimodal browsing agents.
  arXiv preprint arXiv:2508.13186.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Li et al. (2025b)
  X. Li, G. Dong, J. Jin, Y. Zhang, Y. Zhou, Y. Zhu, P. Zhang, and Z. Dou
  Search-o1: agentic search-enhanced large reasoning models.
  In Proceedings of the 2025 Conference on Empirical Methods in Natural Language Processing,
  pp. 5420–5438.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Li et al. (2026b)
  X. Li, J. Jin, G. Dong, H. Qian, Y. Wu, J. Wen, Y. Zhu, and Z. Dou
  Webthinker: empowering large reasoning models with deep research capability.
  Advances in Neural Information Processing Systems 38, pp. 120091–120131.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p1.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Liu et al. (2026)
  S. Liu, Y. Jiang, S. Farook, C. N. Sanchez, D. F. C. Pena, and M. S. Lam
  DataSTORM: deep research on large-scale databases using exploratory data analysis and data storytelling.
  arXiv preprint arXiv:2604.06474.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Liu et al. (2023)
  X. Liu, H. Lai, H. Yu, Y. Xu, A. Zeng, Z. Du, P. Zhang, Y. Dong, and J. Tang
  WebGLM: towards an efficient web-enhanced question answering system with human preferences.
  In Proceedings of the 29th ACM SIGKDD conference on knowledge discovery and data mining,
  pp. 4549–4560.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Mialon et al. (2024)
  G. Mialon, C. Fourrier, T. Wolf, Y. LeCun, and T. Scialom
  Gaia: a benchmark for general ai assistants.
  In International Conference on Learning Representations,
  Vol. 2024, pp. 9025–9049.
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Nakano et al. (2022)
  R. Nakano, J. Hilton, S. Balaji, J. Wu, L. Ouyang, C. Kim, C. Hesse, S. Jain, V. Kosaraju, W. Saunders, et al.
  Webgpt: browser-assisted question-answering with human feedback, 2022.
  URL https://arxiv. org/abs/2112.09332 35.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Ning et al. (2026)
  X. Ning, D. Fu, T. Wei, M. Ai, J. Zou, T. Li, H. Tong, Y. Zhu, H. Hamann, and J. He
  MC-search: evaluating and enhancing multimodal agentic search with structured long reasoning chains.
  arXiv preprint arXiv:2603.00873.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- OpenAI (2025)
  OpenAI
  GPT-5 System Card.
  External Links: [Link](https://openai.com/index/gpt-5-system-card/)
  Cited by: [§6.1](https://arxiv.org/html/2609.09410v1#S6.SS1.p1.1 "6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Paul et al. (2026)
  D. Paul, D. Murphy, M. Gritta, R. Cardenas Acosta, V. Prokhorov, L. S. Bolliger, A. Toker, R. Miles, A. Oncescu, J. Sivakumar, et al.
  A benchmark for deep information synthesis.
  In International Conference on Learning Representations,
  Vol. 2026, pp. 65663–65684.
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Penedo et al. (2024)
  G. Penedo, H. Kydlíček, L. Ben Allal, A. Lozhkov, M. Mitchell, C. Raffel, L. Von Werra, and T. Wolf
  The fineweb datasets: decanting the web for the finest text data at scale.
  arXiv preprint arXiv:2406.17557.
  Cited by: [Appendix D](https://arxiv.org/html/2609.09410v1#A4.SS0.SSS0.Px2.p1.1 "Retrieval backends. ‣ Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§E.3](https://arxiv.org/html/2609.09410v1#A5.SS3.p1.1 "E.3 Corpus Search Backend ‣ Appendix E Evaluation Tool Interface ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p2.2 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [1st item](https://arxiv.org/html/2609.09410v1#S4.I1.i1.p1.1 "In Unstructured Track: Search Questions. ‣ 4.2 Role-Aware Symmetric Generation ‣ 4 HybridDeepResearch Construction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Qin et al. (2023)
  Y. Qin, Z. Cai, D. Jin, L. Yan, S. Liang, K. Zhu, Y. Lin, X. Han, N. Ding, H. Wang, et al.
  Webcpm: interactive web search for chinese long-form question answering.
  In Proceedings of the 61st Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
  pp. 8968–8988.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Qwen Team (2026)
  Qwen Team
  Qwen3.5: towards native multimodal agents.
  External Links: [Link](https://qwen.ai/blog?id=qwen3.5)
  Cited by: [Appendix D](https://arxiv.org/html/2609.09410v1#A4.SS0.SSS0.Px3.p1.1 "Models and serving. ‣ Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§6.1](https://arxiv.org/html/2609.09410v1#S6.SS1.p1.1 "6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Roucher et al. (2025)
  A. Roucher, A. V. del Moral, T. Wolf, L. von Werra, and E. Kaunismäki
  Smolagents: a smol library to build great agentic systems..
  Note: <https://github.com/huggingface/smolagents>
  Cited by: [Appendix D](https://arxiv.org/html/2609.09410v1#A4.SS0.SSS0.Px1.p1.1 "Agent frameworks. ‣ Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p3.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§6.1](https://arxiv.org/html/2609.09410v1#S6.SS1.p1.1 "6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Shao et al. (2024)
  Y. Shao, Y. Jiang, T. Kanell, P. Xu, O. Khattab, and M. Lam
  Assisting in writing wikipedia-like articles from scratch with large language models.
  In Proceedings of the 2024 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies (Volume 1: Long Papers),
  pp. 6252–6278.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Song et al. (2026)
  M. Song, L. Renhang, X. Wang, Y. Jiang, P. Xie, F. Huang, S. Poria, and J. Zhou
  Demystifying deep search: a holistic evaluation with hint-free multi-hop questions and factorised metrics.
  In International Conference on Learning Representations,
  Vol. 2026, pp. 95487–95512.
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Su et al. (2026)
  S. Su, S. Xing, X. Dong, M. Zhong, B. Wang, X. Zhu, Y. Chen, W. Wang, Y. Deng, P. Zhu, et al.
  Miroflow: towards high-performance and robust open-source agent framework for general deep research tasks.
  arXiv preprint arXiv:2602.22808.
  Cited by: [Appendix D](https://arxiv.org/html/2609.09410v1#A4.SS0.SSS0.Px1.p1.1 "Agent frameworks. ‣ Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p3.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§6.1](https://arxiv.org/html/2609.09410v1#S6.SS1.p1.1 "6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Team (2025)
  B. Team
  LiveSQLBench: a dynamic and contamination-free benchmark for evaluating llms on real-world text-to-sql tasks.
  Note: https://github.com/bird-bench/livesqlbenchAccessed: 2025-05-22
  Cited by: [Appendix D](https://arxiv.org/html/2609.09410v1#A4.SS0.SSS0.Px6.p1.1 "Task-specific evaluation. ‣ Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§E.1](https://arxiv.org/html/2609.09410v1#A5.SS1.SSS0.Px1.p1.1 "run_sql. ‣ E.1 Structured Tools ‣ Appendix E Evaluation Tool Interface ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§H.3](https://arxiv.org/html/2609.09410v1#A8.SS3.p1.1 "H.3 Evaluating Database Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p1.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p2.2 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§4.2](https://arxiv.org/html/2609.09410v1#S4.SS2.SSS0.Px2.p1.1 "Structured Track: Role-Constrained SQL. ‣ 4.2 Role-Aware Symmetric Generation ‣ 4 HybridDeepResearch Construction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Trivedi et al. (2022)
  H. Trivedi, N. Balasubramanian, T. Khot, and A. Sabharwal
  MuSiQue: multihop questions via single-hop question composition.
  Transactions of the Association for Computational Linguistics 10, pp. 539–554.
  External Links: [Document](https://dx.doi.org/10.1162/tacl%5Fa%5F00475)
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Trivedi et al. (2023)
  H. Trivedi, N. Balasubramanian, T. Khot, and A. Sabharwal
  Interleaving retrieval with chain-of-thought reasoning for knowledge-intensive multi-step questions.
  In Proceedings of the 61st annual meeting of the association for computational linguistics (volume 1: long papers),
  pp. 10014–10037.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Vrandečić and Krötzsch (2014)
  D. Vrandečić and M. Krötzsch
  Wikidata: a free collaborative knowledgebase.
  Communications of the ACM 57 (10), pp. 78–85.
  External Links: [Document](https://dx.doi.org/10.1145/2629489)
  Cited by: [1st item](https://arxiv.org/html/2609.09410v1#S4.I1.i1.p1.1 "In Unstructured Track: Search Questions. ‣ 4.2 Role-Aware Symmetric Generation ‣ 4 HybridDeepResearch Construction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Wei et al. (2025)
  J. Wei, Z. Sun, S. Papay, S. McKinney, J. Han, I. Fulford, H. W. Chung, A. T. Passos, W. Fedus, and A. Glaese
  BrowseComp: a simple yet challenging benchmark for browsing agents.
  arXiv preprint arXiv:2504.12516.
  Cited by: [Appendix D](https://arxiv.org/html/2609.09410v1#A4.SS0.SSS0.Px6.p2.1 "Task-specific evaluation. ‣ Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p1.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Wu et al. (2025)
  J. Wu, W. Yin, Y. Jiang, Z. Wang, Z. Xi, R. Fang, L. Zhang, Y. He, D. Zhou, P. Xie, et al.
  Webwalker: benchmarking llms in web traversal.
  In Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
  pp. 10290–10305.
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Yang et al. (2018)
  Z. Yang, P. Qi, S. Zhang, Y. Bengio, W. W. Cohen, R. Salakhutdinov, and C. D. Manning
  HotpotQA: a dataset for diverse, explainable multi-hop question answering.
  In Proceedings of the 2018 Conference on Empirical Methods in Natural Language Processing,
  pp. 2369–2380.
  External Links: [Document](https://dx.doi.org/10.18653/v1/D18-1259)
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Yoran et al. (2024)
  O. Yoran, S. J. Amouyal, C. Malaviya, B. Bogin, O. Press, and J. Berant
  Assistantbench: can web agents solve realistic and time-consuming tasks?.
  In Proceedings of the 2024 Conference on Empirical Methods in Natural Language Processing,
  pp. 8938–8968.
  Cited by: [§H.2](https://arxiv.org/html/2609.09410v1#A8.SS2.p1.1 "H.2 Evaluating Deep Research Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Yu et al. (2019a)
  T. Yu, R. Zhang, H. Er, S. Li, E. Xue, B. Pang, X. V. Lin, Y. C. Tan, T. Shi, Z. Li, et al.
  Cosql: a conversational text-to-sql challenge towards cross-domain natural language interfaces to databases.
  In Proceedings of the 2019 conference on empirical methods in natural language processing and the 9th international joint conference on natural language processing (EMNLP-IJCNLP),
  pp. 1962–1979.
  Cited by: [§H.3](https://arxiv.org/html/2609.09410v1#A8.SS3.p1.1 "H.3 Evaluating Database Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Yu et al. (2018)
  T. Yu, R. Zhang, K. Yang, M. Yasunaga, D. Wang, Z. Li, J. Ma, I. Li, Q. Yao, S. Roman, et al.
  Spider: a large-scale human-labeled dataset for complex and cross-domain semantic parsing and text-to-sql task.
  In Proceedings of the 2018 conference on empirical methods in natural language processing,
  pp. 3911–3921.
  Cited by: [§H.3](https://arxiv.org/html/2609.09410v1#A8.SS3.p1.1 "H.3 Evaluating Database Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Yu et al. (2019b)
  T. Yu, R. Zhang, M. Yasunaga, Y. C. Tan, X. V. Lin, S. Li, H. Er, I. Li, B. Pang, T. Chen, et al.
  Sparc: cross-domain semantic parsing in context.
  In Proceedings of the 57th annual meeting of the association for computational linguistics,
  pp. 4511–4523.
  Cited by: [§H.3](https://arxiv.org/html/2609.09410v1#A8.SS3.p1.1 "H.3 Evaluating Database Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Zeng et al. (2026)
  A. Zeng, X. Lv, Z. Hou, Z. Du, Q. Zheng, B. Chen, D. Yin, C. Ge, C. Huang, C. Xie, et al.
  Glm-5: from vibe coding to agentic engineering.
  arXiv preprint arXiv:2602.15763.
  Cited by: [Appendix D](https://arxiv.org/html/2609.09410v1#A4.SS0.SSS0.Px3.p1.1 "Models and serving. ‣ Appendix D Experimental Details ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§6.1](https://arxiv.org/html/2609.09410v1#S6.SS1.p1.1 "6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Zhao et al. (2024)
  F. Zhao, D. Agrawal, and A. E. Abbadi
  Hybrid querying over relational databases and large language models.
  arXiv preprint arXiv:2408.00884.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Zheng et al. (2025)
  Y. Zheng, D. Fu, X. Hu, X. Cai, L. Ye, P. Lu, and P. Liu
  Deepresearcher: scaling deep research via reinforcement learning in real-world environments.
  In Proceedings of the 2025 Conference on Empirical Methods in Natural Language Processing,
  pp. 414–431.
  Cited by: [§H.1](https://arxiv.org/html/2609.09410v1#A8.SS1.p1.1 "H.1 From Retrieval-Augmented Generation to Agentic Deep Research ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§1](https://arxiv.org/html/2609.09410v1#S1.p1.1 "1 Introduction ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Zhong et al. (2017)
  V. Zhong, C. Xiong, and R. Socher
  Seq2sql: generating structured queries from natural language using reinforcement learning.
  arXiv preprint arXiv:1709.00103.
  Cited by: [§H.3](https://arxiv.org/html/2609.09410v1#A8.SS3.p1.1 "H.3 Evaluating Database Agents ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Zhou et al. (2025)
  P. Zhou, B. Leon, X. Ying, C. Zhang, Y. Shao, Q. Ye, D. Chong, Z. Jin, C. Xie, M. Cao, et al.
  Browsecomp-zh: benchmarking web browsing ability of large language models in chinese.
  arXiv preprint arXiv:2504.19314.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
- Zhu et al. (2021)
  F. Zhu, W. Lei, Y. Huang, C. Wang, S. Zhang, J. Lv, F. Feng, and T. Chua
  TAT-qa: a question answering benchmark on a hybrid of tabular and textual content in finance.
  In Proceedings of the 59th annual meeting of the Association for Computational Linguistics and the 11th international joint conference on natural language processing (volume 1: long papers),
  pp. 3277–3287.
  Cited by: [§H.4](https://arxiv.org/html/2609.09410v1#A8.SS4.p1.1 "H.4 About Hybrid Benchmarks ‣ Appendix H Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search"),
  [§2](https://arxiv.org/html/2609.09410v1#S2.p1.1 "2 Related Work ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").

## Appendix A Detailed Hybrid Examples

We include one complete example for each hybrid type.
For each example we show the combined question, the search and SQL subcomponents with gold outputs, and the final answer.

### A.1 S2SQL: s2sql_000

The agent must first resolve multi-clue web evidence to the pivot *Monaco*, then run SQL that ranks Monaco-related data flows by reliability.

#### Combined question.

> Could you identify the top 5 data flows by reliability score, and show how each compares to the average reliability score within its channel protocol, for flows involving a place that:
>   
> - is where a French singer-actor born in Saint-Cyr-l’École died
>   
> - was the setting for a discussion involving a London-born racing driver and presenter at the 2012 Historic Grand Prix there
>   
> - comes up in travel comparisons with a French commune in Bouches-du-Rhône, which is described as having lower average daily costs
>   
> - shares its name with the surname of a Philadelphia-born television actor and model
>   
> - is also echoed by the name of a Devon village and civil parish mentioned alongside that actor and model
>   
>  
>   
> For each of the top 5 flows, return the flow tag, the channel protocol, the flow’s reliability score, and the average reliability score across all flows in that same channel protocol. Use the in cross_db database records to answer this.

#### Search subquestion.

> Could you provide me with the name of the place that:
>   
> - is where a French singer-actor born in Saint-Cyr-l’École died
>   
> - was the setting for a discussion involving a London-born racing driver and presenter at the 2012 Historic Grand Prix there
>   
> - comes up in travel comparisons with a French commune in Bouches-du-Rhône, which is described as having lower average daily costs
>   
> - shares its name with the surname of a Philadelphia-born television actor and model
>   
> - is also echoed by the name of a Devon village and civil parish mentioned alongside that actor and model

Gold search answer: *Monaco*.

#### SQL subquestion.

> For data flows involving Monaco, what are the top 5 flows by their reliability score, and how does each compare to the average reliability score within its channel protocol?

[⬇](data:text/plain;base64,U0VMRUNUIGZsb3d0YWcsIGNoYW5wcm90bywKICBST1VORCgoc3VjY2Vzc3BjdCAvIChlcnJ0YWxseSArIDEuMCkpCiAgICAqICgxLjAgLSBydHJ5dGFsbHkgLyAoZXJydGFsbHkgKyAxLjApKSwgNCkKICAgIEFTIGRmcnMsCiAgUk9VTkQoQVZHKChzdWNjZXNzcGN0IC8gKGVycnRhbGx5ICsgMS4wKSkKICAgICogKDEuMCAtIHJ0cnl0YWxseSAvIChlcnJ0YWxseSArIDEuMCkpKQogICAgT1ZFUiAoUEFSVElUSU9OIEJZIGNoYW5wcm90byksIDQpCiAgICBBUyBwcm90b19hdmdfZGZycwpGUk9NIGRhdGFmbG93CldIRVJFIGRlc3RuYXRpb24gPSAnTW9uYWNvJwogICBPUiBvcmlnbmF0aW9uID0gJ01vbmFjbycKT1JERVIgQlkgZGZycyBERVNDCkxJTUlUIDU=)

SELECT flowtag, chanproto,

ROUND((successpct / (errtally + 1.0))

* (1.0 - rtrytally / (errtally + 1.0)), 4)

AS dfrs,

ROUND(AVG((successpct / (errtally + 1.0))

* (1.0 - rtrytally / (errtally + 1.0)))

OVER (PARTITION BY chanproto), 4)

AS proto_avg_dfrs

FROM dataflow

WHERE destnation = ’Monaco’

OR orignation = ’Monaco’

ORDER BY dfrs DESC

LIMIT 5

Gold SQL / final answer:

| flowtag | chanproto | dfrs | proto_avg_dfrs |
| --- | --- | --- | --- |
| DF7316 | Private Network | 2.0498 | -10.0122 |
| DF3144 | Private Network | 0.9787 | -10.0122 |
| DF1931 | Blockchain | 0.7845 | 0.7845 |
| DF4213 | HTTPS | 0.7491 | 0.7491 |
| DF5144 | Private Network | 0.5418 | -10.0122 |

### A.2 SQL2S: sql2s_105

SQL first identifies the pivot country *Bhutan* under session constraints.
Search then recovers the ethnic group *Lhop people* under Bhutan-specific clues.

#### Combined question.

> In the news database, consider countries that have exactly 4 sessions, all of which fall into the average performance segment, and whose mean engagement score sits moderately between 0.4 and 0.5. Among these, the country that leads in average session duration is the focus of this question. Please find the name of the ethnic group which lives in that country, also in a human settlement there and near a border city in a district of that same country. It is referred to in a modern language used in that country and in India, and its dress resembles that of a South Asian community spanning that country, Nepal, and India. What is the name of this group?

#### SQL subquestion.

> Among countries with exactly 4 sessions that all fall into the average performance segment and have a moderate mean engagement score between 0.4 and 0.5, which country leads in average session duration?

[⬇](data:text/plain;base64,V0lUSCBhZGp1c3RlZCBBUyAoCiAgU0VMRUNUIHNlc2hrZXksIGdlb2N0cnksIGJuY3JhdGUsIGN0cnZhbCwKICAgIGVuZ3Njb3JlLCBzZXNoZHVyLAogICAgYm5jcmF0ZSAqICgxLjAgLSBjdHJ2YWwgLyAxMDAuMCkKICAgICAgQVMgYWRqdXN0ZWRfYm91bmNlX3JhdGUKICBGUk9NIHNlc3Npb25zCiksCnJhbmtlZCBBUyAoCiAgU0VMRUNUIHNlc2hrZXksIGdlb2N0cnksCiAgICBhZGp1c3RlZF9ib3VuY2VfcmF0ZSwgY3RydmFsLAogICAgZW5nc2NvcmUsIHNlc2hkdXIsCiAgICBQRVJDRU5UX1JBTksoKSBPVkVSICgKICAgICAgT1JERVIgQlkgYWRqdXN0ZWRfYm91bmNlX3JhdGUpCiAgICAgIEFTIGJvdW5jZV9wZXJjZW50aWxlLAogICAgUEVSQ0VOVF9SQU5LKCkgT1ZFUiAoCiAgICAgIE9SREVSIEJZIGN0cnZhbCBERVNDKQogICAgICBBUyBjdHJfcGVyY2VudGlsZQogIEZST00gYWRqdXN0ZWQKKSwKc2VnbWVudGVkIEFTICgKICBTRUxFQ1Qgc2VzaGtleSwgZ2VvY3RyeSwKICAgIGVuZ3Njb3JlLCBzZXNoZHVyLAogICAgQ0FTRQogICAgICBXSEVOIGJvdW5jZV9wZXJjZW50aWxlIDwgMC4yNQogICAgICAgIEFORCBjdHJfcGVyY2VudGlsZSA8IDAuMjUKICAgICAgICBUSEVOICdIaWdoIEJvdW5jZSwgTG93IENUUicKICAgICAgV0hFTiBib3VuY2VfcGVyY2VudGlsZSA8IDAuMjUKICAgICAgICBBTkQgY3RyX3BlcmNlbnRpbGUgPj0gMC43NQogICAgICAgIFRIRU4gJ0hpZ2ggQm91bmNlLCBIaWdoIENUUicKICAgICAgV0hFTiBib3VuY2VfcGVyY2VudGlsZSA+PSAwLjc1CiAgICAgICAgQU5EIGN0cl9wZXJjZW50aWxlIDwgMC4yNQogICAgICAgIFRIRU4gJ0xvdyBCb3VuY2UsIExvdyBDVFInCiAgICAgIFdIRU4gYm91bmNlX3BlcmNlbnRpbGUgPj0gMC43NQogICAgICAgIEFORCBjdHJfcGVyY2VudGlsZSA+PSAwLjc1CiAgICAgICAgVEhFTiAnTG93IEJvdW5jZSwgSGlnaCBDVFInCiAgICAgIEVMU0UgJ0F2ZXJhZ2UgUGVyZm9ybWFuY2UnCiAgICBFTkQgQVMgcGVyZl9zZWdtZW50CiAgRlJPTSByYW5rZWQKKSwKY291bnRyeV9hZ2cgQVMgKAogIFNFTEVDVCBnZW9jdHJ5LAogICAgQ09VTlQoKikgQVMgdG90YWxfc2Vzc2lvbnMsCiAgICBTVU0oQ0FTRSBwZXJmX3NlZ21lbnQKICAgICAgV0hFTiAnQXZlcmFnZSBQZXJmb3JtYW5jZScKICAgICAgVEhFTiAxIEVMU0UgMCBFTkQpCiAgICAgIEFTIGF2Z19wZXJmX2NvdW50LAogICAgUk9VTkQoQVZHKHNlc2hkdXIpLCAyKQogICAgICBBUyBhdmdfc2Vzc2lvbl9kdXJhdGlvbiwKICAgIFJPVU5EKEFWRyhlbmdzY29yZSksIDQpCiAgICAgIEFTIGF2Z19lbmdhZ2VtZW50CiAgRlJPTSBzZWdtZW50ZWQKICBHUk9VUCBCWSBnZW9jdHJ5CiAgSEFWSU5HIHRvdGFsX3Nlc3Npb25zID0gNAogICAgIEFORCBhdmdfcGVyZl9jb3VudCA9IDQKICAgICBBTkQgYXZnX2VuZ2FnZW1lbnQKICAgICAgICAgQkVUV0VFTiAwLjQgQU5EIDAuNQopClNFTEVDVCBnZW9jdHJ5CkZST00gY291bnRyeV9hZ2cKT1JERVIgQlkgYXZnX3Nlc3Npb25fZHVyYXRpb24gREVTQwpMSU1JVCAx)

WITH adjusted AS (

SELECT seshkey, geoctry, bncrate, ctrval,

engscore, seshdur,

bncrate * (1.0 - ctrval / 100.0)

AS adjusted_bounce_rate

FROM sessions

),

ranked AS (

SELECT seshkey, geoctry,

adjusted_bounce_rate, ctrval,

engscore, seshdur,

PERCENT_RANK() OVER (

ORDER BY adjusted_bounce_rate)

AS bounce_percentile,

PERCENT_RANK() OVER (

ORDER BY ctrval DESC)

AS ctr_percentile

FROM adjusted

),

segmented AS (

SELECT seshkey, geoctry,

engscore, seshdur,

CASE

WHEN bounce_percentile < 0.25

AND ctr_percentile < 0.25

THEN ’High Bounce, Low CTR’

WHEN bounce_percentile < 0.25

AND ctr_percentile >= 0.75

THEN ’High Bounce, High CTR’

WHEN bounce_percentile >= 0.75

AND ctr_percentile < 0.25

THEN ’Low Bounce, Low CTR’

WHEN bounce_percentile >= 0.75

AND ctr_percentile >= 0.75

THEN ’Low Bounce, High CTR’

ELSE ’Average Performance’

END AS perf_segment

FROM ranked

),

country_agg AS (

SELECT geoctry,

COUNT(*) AS total_sessions,

SUM(CASE perf_segment

WHEN ’Average Performance’

THEN 1 ELSE 0 END)

AS avg_perf_count,

ROUND(AVG(seshdur), 2)

AS avg_session_duration,

ROUND(AVG(engscore), 4)

AS avg_engagement

FROM segmented

GROUP BY geoctry

HAVING total_sessions = 4

AND avg_perf_count = 4

AND avg_engagement

BETWEEN 0.4 AND 0.5

)

SELECT geoctry

FROM country_agg

ORDER BY avg_session_duration DESC

LIMIT 1

Gold SQL answer: *Bhutan*.

#### Search subquestion.

> Please find the name of the ethnic group which lives in Bhutan, also in a Bhutanese human settlement and near a Bhutanese border city in a district. It is referred to in a modern language used in Bhutan and India, and its dress resembles that of a South Asian community spanning Bhutan, Nepal, and India. What is the name of this group?

Gold search / final answer: *Lhop people*.

### A.3 Parallel: parallel_048

Search and SQL independently produce candidate country sets.
The final answer is their intersection, which isolates *Finland*.

#### Combined question.

> Could you provide me with the name of the country who:
>   
> - contains both a neighborhood rapid-transit stop in a capital city and an Olympic football venue in a capital district, with those two places being in the same capital
>   
> - is the place people move to when a state organ headquartered in an office centre handles residence registration and startup permit applications
>   
> - has as its official investment promotion body a nonprofit government agency
>   
> - is the citizenship of a person in ski jumping and Nordic combined
>   
> - ranks among the top 10 countries by their share of high-CTR performance segment sessions in news database, considering only countries with at least 5 sessions total and at least 2 sessions in both the high-CTR segments and the average performance segment

#### Search subquestion.

> Could you provide me with the name of the country who:
>   
> - contains both a neighborhood rapid-transit stop in a capital city and an Olympic football venue in a capital district, with those two places being in the same capital
>   
> - is the place people move to when a state organ headquartered in an office centre handles residence registration and startup permit applications
>   
> - has as its official investment promotion body a nonprofit government agency
>   
> - is the citizenship of a person in ski jumping and Nordic combined

Gold search set: $\{$Finland, Estonia$\}$.

#### SQL subquestion.

> Which are the top 10 countries by their share of high-CTR performance segment sessions, considering only countries with at least 5 sessions and at least 2 sessions in both the high-CTR segments and the average performance segment?

[⬇](data:text/plain;base64,V0lUSCBhZGp1c3RlZCBBUyAoCiAgU0VMRUNUIHNlc2hrZXksIGdlb2N0cnksCiAgICBibmNyYXRlICogKDEgLSBjdHJ2YWwvMTAwLjApCiAgICAgIEFTIGFkanVzdGVkX2JvdW5jZV9yYXRlLAogICAgY3RydmFsLAogICAgUEVSQ0VOVF9SQU5LKCkgT1ZFUiAoCiAgICAgIE9SREVSIEJZIGJuY3JhdGUgKiAoMSAtIGN0cnZhbC8xMDAuMCkpCiAgICAgIEFTIGJvdW5jZV9wZXJjZW50aWxlLAogICAgUEVSQ0VOVF9SQU5LKCkgT1ZFUiAoCiAgICAgIE9SREVSIEJZIGN0cnZhbCBERVNDKQogICAgICBBUyBjdHJfcGVyY2VudGlsZQogIEZST00gc2Vzc2lvbnMKKSwKc2VnbWVudGVkIEFTICgKICBTRUxFQ1Qgc2VzaGtleSwgZ2VvY3RyeSwKICAgIENBU0UKICAgICAgV0hFTiBib3VuY2VfcGVyY2VudGlsZSA8IDAuMjUKICAgICAgICBBTkQgY3RyX3BlcmNlbnRpbGUgPCAwLjI1CiAgICAgICAgVEhFTiAnSGlnaCBCb3VuY2UsIExvdyBDVFInCiAgICAgIFdIRU4gYm91bmNlX3BlcmNlbnRpbGUgPCAwLjI1CiAgICAgICAgQU5EIGN0cl9wZXJjZW50aWxlID49IDAuNzUKICAgICAgICBUSEVOICdIaWdoIEJvdW5jZSwgSGlnaCBDVFInCiAgICAgIFdIRU4gYm91bmNlX3BlcmNlbnRpbGUgPj0gMC43NQogICAgICAgIEFORCBjdHJfcGVyY2VudGlsZSA8IDAuMjUKICAgICAgICBUSEVOICdMb3cgQm91bmNlLCBMb3cgQ1RSJwogICAgICBXSEVOIGJvdW5jZV9wZXJjZW50aWxlID49IDAuNzUKICAgICAgICBBTkQgY3RyX3BlcmNlbnRpbGUgPj0gMC43NQogICAgICAgIFRIRU4gJ0xvdyBCb3VuY2UsIEhpZ2ggQ1RSJwogICAgICBFTFNFICdBdmVyYWdlIFBlcmZvcm1hbmNlJwogICAgRU5EIEFTIHBlcmZfc2VnbWVudAogIEZST00gYWRqdXN0ZWQKKSwKY291bnRyeV9zdGF0cyBBUyAoCiAgU0VMRUNUIGdlb2N0cnksCiAgICBDT1VOVCgqKSBBUyB0b3RhbF9zZXNzaW9ucywKICAgIFNVTShDQVNFIFdIRU4gcGVyZl9zZWdtZW50IElOICgKICAgICAgJ0hpZ2ggQm91bmNlLCBIaWdoIENUUicsCiAgICAgICdMb3cgQm91bmNlLCBIaWdoIENUUicpCiAgICAgIFRIRU4gMSBFTFNFIDAgRU5EKQogICAgICBBUyBoaWdoX2N0cl9zZXNzaW9ucywKICAgIFNVTShDQVNFIFdIRU4gcGVyZl9zZWdtZW50ID0KICAgICAgJ0F2ZXJhZ2UgUGVyZm9ybWFuY2UnCiAgICAgIFRIRU4gMSBFTFNFIDAgRU5EKQogICAgICBBUyBhdmdfc2Vzc2lvbnMKICBGUk9NIHNlZ21lbnRlZAogIEdST1VQIEJZIGdlb2N0cnkKICBIQVZJTkcgQ09VTlQoKikgPj0gNQopClNFTEVDVCBnZW9jdHJ5CkZST00gY291bnRyeV9zdGF0cwpXSEVSRSBoaWdoX2N0cl9zZXNzaW9ucyA+PSAyCiAgQU5EIGF2Z19zZXNzaW9ucyA+PSAyCk9SREVSIEJZIENBU1QoaGlnaF9jdHJfc2Vzc2lvbnMgQVMgUkVBTCkKICAvIHRvdGFsX3Nlc3Npb25zIERFU0MKTElNSVQgMTA=)

WITH adjusted AS (

SELECT seshkey, geoctry,

bncrate * (1 - ctrval/100.0)

AS adjusted_bounce_rate,

ctrval,

PERCENT_RANK() OVER (

ORDER BY bncrate * (1 - ctrval/100.0))

AS bounce_percentile,

PERCENT_RANK() OVER (

ORDER BY ctrval DESC)

AS ctr_percentile

FROM sessions

),

segmented AS (

SELECT seshkey, geoctry,

CASE

WHEN bounce_percentile < 0.25

AND ctr_percentile < 0.25

THEN ’High Bounce, Low CTR’

WHEN bounce_percentile < 0.25

AND ctr_percentile >= 0.75

THEN ’High Bounce, High CTR’

WHEN bounce_percentile >= 0.75

AND ctr_percentile < 0.25

THEN ’Low Bounce, Low CTR’

WHEN bounce_percentile >= 0.75

AND ctr_percentile >= 0.75

THEN ’Low Bounce, High CTR’

ELSE ’Average Performance’

END AS perf_segment

FROM adjusted

),

country_stats AS (

SELECT geoctry,

COUNT(*) AS total_sessions,

SUM(CASE WHEN perf_segment IN (

’High Bounce, High CTR’,

’Low Bounce, High CTR’)

THEN 1 ELSE 0 END)

AS high_ctr_sessions,

SUM(CASE WHEN perf_segment =

’Average Performance’

THEN 1 ELSE 0 END)

AS avg_sessions

FROM segmented

GROUP BY geoctry

HAVING COUNT(*) >= 5

)

SELECT geoctry

FROM country_stats

WHERE high_ctr_sessions >= 2

AND avg_sessions >= 2

ORDER BY CAST(high_ctr_sessions AS REAL)

/ total_sessions DESC

LIMIT 10

Gold SQL set (top countries): $\{$Northern Mariana Islands,
Finland, Cambodia, Faroe Islands, Jordan, Somalia,
Switzerland, Italy, New Caledonia, Puerto Rico$\}$.

Final answer: *Finland*, the intersection of the two sets.

## Appendix B Filtering Details

Before cross-modal composition, we filter the search and SQL components independently.

### B.1 Search Component Filtering

Each search question passes five stages.

#### Closed-book prefilter.

We remove questions that can already be answered by a closed-book solver, reducing reliance on parametric memory.

#### Search quality.

The question must resist naive whole-question web search and BM25 retrieval.
At the same time, every reasoning step must remain recoverable through a targeted query that excludes the gold answer and its aliases.
Evidence presence is determined through substring matching or an LLM-based snippet judge.

#### Clue integrity.

We verify that rewritten clues neither reveal nor contradict the source entities.
The answer must also be recoverable from the evidence subgraph alone.

#### Candidate inference.

We collect candidate answers from multiple base models and decoding temperatures.

#### Answer cardinality.

We deduplicate the candidate answers and verify each candidate against all question constraints without exposing the gold answer.

The retained questions are then assigned to hybrid patterns.
Questions that contain the seed in the question support SQL2S.
When the seed appears in the answer set, a single verified answer supports S2SQL, while multiple verified answers support Parallel.
Questions that fail any stage or produce candidates inconsistent with the evidence constraints are discarded.

### B.2 SQL Component Filtering

Each SQL question-query pair must execute successfully and return a non-empty result.
We then verify that the seed plays the role required by the target hybrid pattern.

For S2SQL, the seed must appear in the question as a constraint.
For SQL2S, the query must return a single row containing the seed.
For Parallel, the query must return multiple rows, including one that contains the seed.

Pairs that fail execution or role checks are removed.
Human reviewers then retain the higher-quality and more challenging SQL components and discard ambiguous, shallow, or low-value candidates.

## Appendix C Human Review Details

Human review was conducted by four doctoral researchers who are also authors of this paper.
The review covered SQL pattern validation, final question quality control, and balanced hard-subset selection.

#### SQL pattern validation.

The reviewers examined the catalog for structural validity, diversity, and compatibility with the source databases.
Redundant, invalid, or overly narrow patterns were removed or revised.

#### Final question quality control.

The reviewers examined the retained questions after automatic filtering and cross-modal composition.
They checked whether each question was clear, whether the gold answer was correct and unique, whether the search and SQL components were mutually consistent, and whether the shared entity played the intended role in the target reasoning pattern.
They also checked for unintended answer leakage and removed or revised questions that failed these criteria.

#### Hard-subset selection.

The reviewers used intrinsic task complexity and pilot agent evaluation results as complementary signals.
They considered the complexity of the search and SQL components, the number and specificity of constraints transferred between tools, and recurring failure patterns observed during pilot evaluation.
Pilot results were used to help identify challenging questions rather than as the sole selection criterion.
The selected questions were then manually verified, resulting in a balanced subset of $40$ questions from each reasoning pattern.

#### Review process.

Review decisions were discussed among the four reviewers, and disagreements were resolved through consensus.

## Appendix D Experimental Details

#### Agent frameworks.

In smolagents [Roucher et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib7), a single tool-calling agent solves each task within a shared context.
In MiroFlow [Su et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib8), a main agent delegates subtasks to specialized workers through a hierarchical agent graph.
Both frameworks receive the same task requirements, adapted to their respective prompting formats, and access to the same read-only SQL and knowledge-catalog tools.
Detailed tool specifications are provided in Appendix [E](https://arxiv.org/html/2609.09410v1#A5 "Appendix E Evaluation Tool Interface ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").

#### Retrieval backends.

Real Web searches the live web.
Corpus Search retrieves from a fixed index of Wikipedia and FineWeb-10BT [Penedo et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib6).
The fixed corpus provides a controlled retrieval setting aligned with the evidence sources used during benchmark construction.

#### Models and serving.

Claude-Sonnet-4.6 and GPT-5 are accessed through their hosted APIs with medium reasoning effort.
For open-weight models, we evaluate Qwen3.5 [Qwen Team (2026)](https://arxiv.org/html/2609.09410v1#bib.bib11) and GLM-5.2 [Zeng et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib12).
The Qwen3.5 family includes the 397B-A17B and 122B-A10B MoE models, together with the 27B, 9B, and 4B dense models.
We serve the Qwen models in FP8 with vLLM [Kwon et al. (2023)](https://arxiv.org/html/2609.09410v1#bib.bib10) on NVIDIA H200 and B200 GPUs.
We additionally evaluate GLM-5.2-FP4.

#### Inference settings.

For both open-weight model families, we use the decoding hyperparameters recommended by the model providers. Specifically, Qwen3.5 uses temperature $0.6$, $\mathrm{top}\text{-}p{=}0.95$, and $\mathrm{top}\text{-}k{=}20$, with thinking enabled.
GLM-5.2 uses temperature $1.0$, $\mathrm{top}\text{-}p{=}0.95$, and its maximum reasoning-effort setting.
All agents are limited to at most $300$ tool-calling turns and a $3600$-second wall-clock budget per task.

#### Evaluation scope.

Open-weight models are evaluated on the full set of $380$ tasks under both agent frameworks.
Claude-Sonnet-4.6 and GPT-5 are evaluated on the balanced $120$-example hard subset with smolagents.
The hard subset contains $40$ tasks from each hybrid type.

#### Task-specific evaluation.

For S2SQL, we extract the SQL query produced by the agent and execute both the predicted and gold queries on the corresponding LiveSQLBench [Team (2025)](https://arxiv.org/html/2609.09410v1#bib.bib13) SQLite database.
The resulting tables are compared after column alignment.

For SQL2S and Parallel, we use a BrowseComp-style LLM judge [Wei et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib1).
The judge compares the predicted free-text answer with the gold answer and uses Qwen3-30B-A3B-Instruct-2507 served through vLLM [Kwon et al. (2023)](https://arxiv.org/html/2609.09410v1#bib.bib10).

#### Repeated trials.

Each task is evaluated over eight independent trials.
Pass@8 [Chen et al. (2021)](https://arxiv.org/html/2609.09410v1#bib.bib9) reports whether a task is solved in at least one trial.
Avg@8 reports the average success rate across the eight trials.

## Appendix E Evaluation Tool Interface

Both *smolagents* and *MiroFlow* are given the same hybrid tool contract.
Tools fall into three groups: structured SQL / knowledge lookup (always available), and one of two mutually exclusive search backends (Real Web or Corpus Search).
Below we list each tool name, arguments, return format, and underlying service.

### E.1 Structured Tools

#### run_sql.

Execute a read-only query against the task’s LiveSQLBench [Team (2025)](https://arxiv.org/html/2609.09410v1#bib.bib13) SQLite database.
Inputs: sql (string, required) is the query, and description (string, optional) is a one-line intent summary prepended to the result.
Only SELECT / WITH / PRAGMA / EXPLAIN are allowed. Write statements (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, ATTACH, DETACH, VACUUM, REPLACE) are rejected.
Output: a text table (column header + rows), truncated at 500 rows by default, or an error string.
Backend: local SQLite in read-only URI mode.
No schema dump is injected into the prompt. Agents must discover tables and columns via exploratory queries (e.g., sqlite_master, PRAGMA table_info).

#### get_all_external_knowledge_names.

List domain knowledge titles for the current database.
Takes no inputs and returns a JSON list of titles, backed by the per-database LiveSQLBench knowledge file {db}_kb.jsonl.

#### get_knowledge_definition.

Fetch one knowledge entry in full.
Input: knowledge_name (string, required): entry title or id (numeric or database-qualified, e.g., alien_0).
Output: a JSON object with fields id, knowledge, description, definition, type, and children_knowledge, or a not-found message.

#### get_all_knowledge_definitions.

Return the full knowledge catalog for the database (no inputs).
Output: a JSON array of full entries. If the payload exceeds a context budget, a titles-only summary is returned instead.

### E.2 Real Web Backend

Used when agents retrieve from the live public web.

#### web_search.

Inputs: query (string, required, $\leq$400 characters / 50 words) and count (int, default 10, capped at 50).
Output: a numbered list of {title, url, description} hits, prefixed by the backend label.
Backend: Serper Google Search API (<https://serper.dev/>).

#### web_fetch.

Input: url (string, required).
Output: cleaned page text / markdown (truncated at $\sim$24k characters).
PDFs are auto-detected and routed to PDF extraction. Repeated fetches of the same URL within a run return a cache note.
Backend: primary path is Jina Reader (<https://jina.ai/>). Fallback is requests + MarkItDown HTML-to-markdown conversion.

#### pdf_read.

Inputs: source (string, required): URL or local path. pages (string, optional): page selection such as 1-5 or 3,7,10 (default: all pages).
Output: extracted PDF text (truncated at $\sim$32k characters).
Backend: pypdf for local bytes / downloaded PDFs, with Jina Reader as a URL fallback.

#### read_file.

Inputs: file_path (string, required), offset (int, default 1, 1-based start line), and limit (int, default 2000).
Output: numbered local-file lines, or PDF text if the path points to a PDF.
Backend: local filesystem I/O (with the same PDF extractor as pdf_read).

### E.3 Corpus Search Backend

Used when agents retrieve from the closed corpus that grounds HybridDeepResearch construction (Wikipedia + FineWeb-10BT [Penedo et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib6)).
Retrieval is implemented as a two-stage Corpus Search call inside web_search: a document-level search first retrieves candidate pages with full text, then a chunk-level search within those pages produces a short query-conditioned snippet (truncated to the first 100 characters).
web_search returns title, url, date, and the chunk snippet to the agent, while caching the corresponding full document text in session.
visit_web does not issue another Corpus Search query. It only reads that cache.
In this mode, live web_fetch / pdf_read / read_file are disabled. The agent-facing search tool is still named web_search.

#### web_search (Corpus Search).

Inputs: query (string, required) and k (int, default 10, capped at 20).
Output: up to $k$ documents with title, url, date, and a query-conditional chunk snippet (first 100 characters).
Backend: two-stage Corpus Search (document-level then chunk-level) over the Wikipedia/FineWeb index. Full documents are cached in-session for visit_web.

#### visit_web.

Input: url (string, required): must come from a prior web_search hit in the same run.
Output: a JSON object with title, url, date, and full indexed text (truncated at $\sim$40k characters).
Backend: session cache populated by web_search (no additional Corpus Search call, no live crawl).

## Appendix F Full-Set Proprietary Runs

Due to API cost, Claude-Sonnet-4.6 and GPT-5 are evaluated with only two independent full-set trials under smolagents with Corpus Search.
Table [4](https://arxiv.org/html/2609.09410v1#A6.T4 "Table 4 ‣ Appendix F Full-Set Proprietary Runs ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search") reports Pass@2 and Avg@2.
These numbers are not directly comparable to the Pass@8 / Avg@8 protocol used in the main text.
On the full set, Claude-Sonnet-4.6 obtains higher overall Pass@2 and Avg@2 than GPT-5, reversing the subset ranking in Table [3](https://arxiv.org/html/2609.09410v1#S6.T3 "Table 3 ‣ 6.1 Experimental Setup ‣ 6 Evaluation ‣ Benchmarking Hybrid Deep Research Across Database Querying and Web Search").
GPT-5 remains stronger on S2SQL, but S2SQL is only $58$ of $380$ full-set examples ($15.3\%$), versus one third of the balanced subset.
As a result, GPT-5’s S2SQL advantage contributes less to the full-set overall score.

| Model | Metric | All | S2SQL | SQL2S | Parallel |
| --- | --- | --- | --- | --- | --- |
| Claude-Sonnet-4.6 | Pass@2 | 57.37 | 39.66 | 51.72 | 75.63 |
| Avg@2 | 49.34 | 29.31 | 44.09 | 68.07 |
| GPT-5 | Pass@2 | 54.47 | 46.55 | 44.33 | 75.63 |
| Avg@2 | 44.61 | 34.48 | 35.71 | 64.71 |

Table 4: Full-set smolagents + Corpus Search results for proprietary models with two trials (Pass@2 / Avg@2). Bold marks the best score in each column for Pass@2 and Avg@2.

## Appendix G Detailed Trajectory Analysis

We provide detailed interaction statistics and representative failure cases for Qwen3.5-397B-A17B on the balanced hard subset under Corpus Search.
The analysis uses completed trajectory logs from both smolagents and MiroFlow.

### G.1 Trajectory Cost

| Scaffold | Type | #LLM | #Tool | In | Out |
| --- | --- | --- | --- | --- | --- |
| smolagents | All | 52.5 | 78.1 | 2.78M | 34.9K |
| S2SQL | 40.0 | 66.8 | 2.02M | 23.2K |
| SQL2S | 65.9 | 84.3 | 3.69M | 35.8K |
| Parallel | 54.9 | 84.8 | 2.85M | 46.0K |
| MiroFlow | All | 120.1 | 210.0 | 2.06M | 46.1K |
| S2SQL | 105.1 | 157.8 | 1.61M | 39.0K |
| SQL2S | 119.5 | 222.1 | 2.09M | 45.9K |
| Parallel | 139.1 | 263.0 | 2.59M | 54.9K |

Table 5: 
Trajectory statistics for Qwen3.5-397B-A17B on the balanced hard subset with Corpus Search.
#LLM and #Tool report mean calls per completed trajectory.
In and Out report mean cumulative input and output tokens.

MiroFlow uses substantially more LLM and tool calls than smolagents because it delegates subtasks to multiple workers.
Its input-token count is nevertheless similar or lower, since each worker maintains a shorter local context.

Of the $960$ attempts per scaffold, $800$ smolagents runs and $564$ MiroFlow runs finish within the one-hour limit.
These counts correspond to timeout rates of $16.7\%$ and $41.3\%$, respectively.
MiroFlow therefore explores more broadly, but at a substantially higher completion cost.

### G.2 Representative Failure Cases

#### Incomplete intersection.

On Parallel tasks, agents may return a candidate supported by only one source.
For parallel_106, smolagents repeatedly returns Alaska after finding it in the SQL result.
However, Alaska does not satisfy the web-search constraints.
MiroFlow correctly compares the two candidate sets and recovers Vermont as their intersection.

#### Search failure after a correct SQL result.

On SQL2S tasks, the database step may recover the correct entity, but the following search may drift or exhaust its budget.
For sql2s_136, the SQL query correctly identifies Malta.
However, smolagents fails to preserve this constraint during web search and returns Schnitzel instead of the intended answer, powidl.

#### Incorrect SQL after a correct search result.

On S2SQL tasks, web search may identify the correct entity, while the final SQL query uses an incorrect aggregation or formula.
For s2sql_000, both scaffolds correctly identify Monaco.
However, the computed reliability value does not match the gold SQL execution.

### G.3 Scaffold Comparison

MiroFlow’s additional worker attempts often help recover constraints that were missed earlier.
This is especially useful for directional tasks and candidate-set intersection.
However, the same exploration produces more calls and more timeouts.
This trade-off helps explain why MiroFlow improves Pass@8 while Avg@8 remains close to smolagents.

## Appendix H Related Work

### H.1 From Retrieval-Augmented Generation to Agentic Deep Research

Retrieval-augmented generation (RAG) provides a language model with evidence retrieved from an external corpus to improve its performance on knowledge-intensive tasks [Guu et al. (2020)](https://arxiv.org/html/2609.09410v1#bib.bib28); [Lewis et al. (2020)](https://arxiv.org/html/2609.09410v1#bib.bib19); [Izacard and Grave (2021)](https://arxiv.org/html/2609.09410v1#bib.bib29). As tasks become more complex, adaptive retrieval extends this paradigm by interleaving retrieval with reasoning across multiple steps [Trivedi et al. (2023)](https://arxiv.org/html/2609.09410v1#bib.bib23); [Jiang et al. (2023)](https://arxiv.org/html/2609.09410v1#bib.bib45); [Jeong et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib46); [Asai et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib24). However, fixed-corpus retrieval remains restrictive in real-world settings, as relevant evidence often falls outside predefined collections or evolves dynamically [Komeili et al. (2022)](https://arxiv.org/html/2609.09410v1#bib.bib30); [Qin et al. (2023)](https://arxiv.org/html/2609.09410v1#bib.bib21). Web search mitigates this limitation by enabling open-world information seeking without assuming that all task-relevant evidence has been collected in advance [Nakano et al. (2022)](https://arxiv.org/html/2609.09410v1#bib.bib20); [Liu et al. (2023)](https://arxiv.org/html/2609.09410v1#bib.bib22). Deep research tasks push further along both dimensions: they demand processing a large number of information units, and locating or synthesizing those units requires non-trivial reasoning [Java et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib32). Existing deep research systems rely primarily on web search for evidence acquisition [Shao et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib25); [Zheng et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib26); [Li et al. (2026b)](https://arxiv.org/html/2609.09410v1#bib.bib27); [Li et al. (2025b)](https://arxiv.org/html/2609.09410v1#bib.bib47), with limited exploration of database querying as part of the research process. HybridDeepResearch targets this hybrid setting, focusing on tasks with substantial search and reasoning demands whose supporting evidence is distributed across both web pages and database records.

### H.2 Evaluating Deep Research Agents

Evaluating models on tasks that require retrieving and reasoning over external information is a long-standing research problem. Early question-answering benchmarks focus on questions that can be answered by locating a small amount of textual evidence [Kwiatkowski et al. (2019)](https://arxiv.org/html/2609.09410v1#bib.bib33); [Joshi et al. (2017)](https://arxiv.org/html/2609.09410v1#bib.bib34). Multi-hop benchmarks increase reasoning complexity by requiring evidence to be combined across documents, but still operate over predefined text corpora [Yang et al. (2018)](https://arxiv.org/html/2609.09410v1#bib.bib3); [Trivedi et al. (2022)](https://arxiv.org/html/2609.09410v1#bib.bib4). General agent benchmarks broaden this setting to real-world tasks involving web browsing and tool use, including information needs that are time-consuming for humans to resolve [Mialon et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib35); [Yoran et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib36). More recent benchmarks extend the search horizon through multi-step website traversal, real-time web browsing, and information synthesis [Wu et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib48); [Gou et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib16). BrowseComp targets persistent search and strategic query planning through hard-to-find web questions with verifiable answers [Wei et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib1). LiveDRBench further evaluates tasks with high search and reasoning intensity, while related benchmarks test whether agents can discover unstated search paths and synthesize verifiable findings from multiple sources [Java et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib32); [Song et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib49); [Paul et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib50). Controlled evaluation environments use frozen web snapshots or fixed, human-verified corpora to support reproducible comparisons between deep search agents [Bosse et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib61); [Chen et al. (2025b)](https://arxiv.org/html/2609.09410v1#bib.bib2). These benchmarks substantially broaden the evaluation of deep research, but they do not test the coordinated use of open web search and executable querying over a relational database.

### H.3 Evaluating Database Agents

Early text-to-SQL benchmarks treated the task as mapping a natural-language question to an executable query [Zhong et al. (2017)](https://arxiv.org/html/2609.09410v1#bib.bib40); [Yu et al. (2018)](https://arxiv.org/html/2609.09410v1#bib.bib14). Subsequent benchmarks broadened this setting to contextual and conversational queries, larger databases, and tasks requiring database values, external knowledge, or execution efficiency [Yu et al. (2019b)](https://arxiv.org/html/2609.09410v1#bib.bib41); [Yu et al. (2019a)](https://arxiv.org/html/2609.09410v1#bib.bib42); [Li et al. (2023)](https://arxiv.org/html/2609.09410v1#bib.bib15). Agent-oriented benchmarks extend the evaluation target beyond the final SQL query, with Spider 2.0 evaluating enterprise text-to-SQL involving database metadata, documentation, and project code, BIRD-Critic focusing on the diagnosis and repair of SQL issues, and BIRD-Interact evaluating dynamic interaction with users and databases [Lei et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib17); [Li et al. (2026a)](https://arxiv.org/html/2609.09410v1#bib.bib43); [Huo et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib44). LiveSQLBench addresses another evaluation concern by continuously updating its databases and tasks to reduce benchmark contamination [Team (2025)](https://arxiv.org/html/2609.09410v1#bib.bib13). Despite supporting increasingly complex workflows, these benchmarks assume that the required evidence is contained in a predefined database and a fixed set of supporting materials, without considering settings in which additional evidence must be discovered from the open web.

### H.4 About Hybrid Benchmarks

Real-world information-seeking tasks often require models to browse the web, use external tools, and integrate evidence from multiple sources [Mialon et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib35); [Yoran et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib36). Evidence from heterogeneous sources can provide complementary coverage [Christmann et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib51), motivating hybrid benchmarks that evaluate source selection and cross-source reasoning rather than treating each capability in isolation. Within deep research, recent benchmarks have extended web-based information seeking across languages, specialized domains, multimodal evidence, and heterogeneous enterprise artifacts [Zhou et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib59); [Chen et al. (2025a)](https://arxiv.org/html/2609.09410v1#bib.bib37); [Li et al. (2025a)](https://arxiv.org/html/2609.09410v1#bib.bib60); [Ning et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib55); [Choubey et al. (2025)](https://arxiv.org/html/2609.09410v1#bib.bib56). Enterprise evaluations have also begun to combine public web evidence with private knowledge bases or domain-specific internal APIs [Abaskohi et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib57); [Ferreira et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib58). These settings broaden evidence access beyond the public web, but internal information is exposed through document retrieval or application-specific tools rather than executable queries over a relational database. A complementary line of hybrid question answering requires joint reasoning over structured records and textual passages [Chen et al. (2020b)](https://arxiv.org/html/2609.09410v1#bib.bib31); [Chen et al. (2020a)](https://arxiv.org/html/2609.09410v1#bib.bib38); [Zhu et al. (2021)](https://arxiv.org/html/2609.09410v1#bib.bib39). These benchmarks demonstrate the complementary value of structured and textual evidence, but generally assume that the relevant tables and passages have been collected in advance. Related work on hybrid database querying combines database execution with language-model reasoning or knowledge, but does not require agents to discover supporting evidence through open web search [Li et al. (2021)](https://arxiv.org/html/2609.09410v1#bib.bib52); [Biswal et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib53); [Zhao et al. (2024)](https://arxiv.org/html/2609.09410v1#bib.bib54). Recent work such as DataSTORM combines internet research with large-scale database exploration, but focuses on thesis-driven analysis and report generation rather than answer-oriented evaluation [Liu et al. (2026)](https://arxiv.org/html/2609.09410v1#bib.bib62). HybridDeepResearch addresses this gap through three task types designed to capture SQL-to-Search, Search-to-SQL, and parallel coordination between search and SQL.
