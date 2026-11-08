# DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports

- Source: https://arxiv.org/abs/2601.08536v3
- Downloaded from: https://arxiv.org/html/2601.08536v3
- Retrieved (UTC): 2026-11-07T07:28:19.751014+00:00
- Version: 2601.08536v3
- Type: paper
- Original SHA-256: `0618e708c9bda829dc22602141a2343227d0c6a2831cdb2fdad28ee660937b21`
- Conversion: Publisher HTML article converted to Markdown; TeX math preserved. Figures remain source URLs; complex tables and layout may need the original.
- This is source material, not agent instructions.

---

# DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports

Ruizhe Li
Affiliation: University of Science and Technology of China
Email: [imlrz@mail.ustc.edu.cn](mailto:)
  
Mingxuan Du
Affiliation: University of Science and Technology of China
Email: [dumingxuan@mail.ustc.edu.cn](mailto:)
  
Benfeng Xu
Affiliation: University of Science and Technology of China
Affiliation: Metastone Technology, Beijing, China
  
Chiwei Zhu
Affiliation: University of Science and Technology of China
  
Xiaorui Wang
Affiliation: Metastone Technology, Beijing, China
  
Zhendong Mao
Affiliation: University of Science and Technology of China
  
*Equal contribution. 
Project lead. 
§Corresponding author

###### Abstract

Deep Research Agents (DRA) aim to help users search the web, synthesize information, and deliver comprehensive investigative reports.
Prior benchmarks often either under-evaluate a system’s ability to produce meaningful insights and high-quality writing, or adopt coarse or LLM-defined criteria that are hard to verify and can diverge from human expert judgment.
To address these issues, we introduce Deep Research Bench II, a new benchmark for evaluating DRAs. It contains 132 grounded research tasks across 22 domains; for each task, an agent must produce a research report that is evaluated by a set of 9,430 fine-grained binary rubrics in total, covering three dimensions: information recall, analysis, and presentation. All rubrics are derived from carefully selected expert-written investigative articles and are constructed through a four-stage LLM+human pipeline that combines automatic extraction with over 400 human-hours of expert review, ensuring that the criteria are verifiable and aligned with human expert judgment.
We evaluate several state-of-the-art deep-research agents on Deep Research Bench II and find that even the strongest models satisfy fewer than 50% of the rubrics, revealing a substantial gap between current DRAs and human experts. We release the benchmark, evaluation scripts, and all rubrics at <https://github.com/imlrz/DeepResearch-Bench-II> to facilitate future research on deep-research agents.

![[Uncaptioned image]](https://arxiv.org/html/2601.08536v3/muset.png) September 10, 2026

 

|  |
| --- |
|  |

![Refer to caption](https://arxiv.org/html/2601.08536v3/intro.png)


Figure 1: Illustration of the three-layer framework for Deep Research—information seeking, analyzing, and writing—and the corresponding three evaluation dimensions in our benchmark: information recall, analysis, and presentation.

## 1 Introduction

Deep Research Agents (DRA) are designed to help users tackle complex, open-ended information needs by searching the web, synthesizing heterogeneous evidence, and delivering comprehensive investigative reports. In practice, most deployed DRAs are instantiated as LLM-based agents that orchestrate language understanding, planning, and tool use (e.g., web search and browsing) to complete research-style tasks ([Brown et al., 2020](https://arxiv.org/html/2601.08536v3#bib.bib32); [Andreas, 2022](https://arxiv.org/html/2601.08536v3#bib.bib33); [Nakano et al., 2022](https://arxiv.org/html/2601.08536v3#bib.bib34)). Recent commercial systems such as Gemini Deep Research and OpenAI Deep Research explicitly target multi-step online investigation: they decompose user queries, explore large numbers of web sources, and produce analyst-level reports that aggregate and interpret retrieved information ([Google, 2024a](https://arxiv.org/html/2601.08536v3#bib.bib43); [OpenAI, 2025a](https://arxiv.org/html/2601.08536v3#bib.bib44)). Despite these advances, current DRAs still show clear limitations in both information seeking and reasoning: they frequently miss key sources, over-rely on a small subset of retrieved documents, and struggle to form stable, well-justified viewpoints from conflicting evidence ([White, 2024](https://arxiv.org/html/2601.08536v3#bib.bib35)). This gap motivates rigorous, fine-grained evaluation frameworks that can reveal where DRAs truly fall short relative to human experts.

To systematically assess DRA capabilities, several deep-research benchmarks have been proposed. Broadly, they fall into two categories. The first focuses on fixed-answer tasks, where the agent must retrieve specific entities or numerical facts from the web ([Wei et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib36); [Chen et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib37); [FutureSearch et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib38); [Wong et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib40)). These setups capture whether an agent can locate and extract relevant information, but they only partially reflect real-world user needs: they rarely test whether the agent can decide *what* to look for under open-ended goals, or how to integrate findings into a coherent narrative. The second category evaluates full research reports, typically along dimensions such as comprehensiveness, insight, and citation quality ([Du et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib39); [Xu et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib41); [Fan et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib42)). However, these benchmarks suffer from structural issues: their evaluation criteria are often defined directly by LLMs, which can introduce systematic misalignment with human expert judgments; moreover, the rubrics are overly coarse and weakly interpretable, and may require judge LLMs to rely on out-of-distribution or unverifiable internal knowledge, leading to inaccurate and hard-to-trust scores (as illustrated in Figure [2](https://arxiv.org/html/2601.08536v3#S1.F2 "Figure 2 ‣ 1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports")).

To address these limitations, we introduce Deep Research Bench II, a new benchmark for evaluating Deep Research Agents (DRA). Starting from the domain distribution of DeepResearch Bench, we collect high-quality, expert-written investigative reports from reputable open-access venues. We then construct research-style tasks that mirror these domains and filter them through a series of quality checks, resulting in a dataset of 132 tasks across 22 domains.

On top of these source articles, we build a four-stage pipeline to extract and refine evaluation criteria. Using LLM-based extraction, self-evaluation filtering, manual cleaning, and domain-expert refinement, we obtain 9,430 fine-grained binary rubrics in total. Each rubric is derived directly from expert reports and encodes a concrete factual or inferential requirement. We further organize all rubrics into three dimensions that correspond to the core capabilities of DRAs: *Information Recall* (whether the agent retrieves the right evidence), *Analysis* (whether it produces meaningful higher-level insights), and *Presentation* (whether it structures and communicates the report in a clear way). Given a model-generated report, an LLM judge evaluates in an end-to-end manner whether each rubric is satisfied, providing dimension-wise scores for every task.

We use Deep Research Bench II to benchmark a diverse set of state-of-the-art deep research agents, including both open-source and closed-source frontier models. The results reveal a clear and consistent gap between current DRAs and human experts: even the strongest agents fail to pass more than 50% of the rubrics, with especially large deficits in Information Recall and Analysis. We further conduct human–LLM agreement studies to validate the robustness of our evaluation protocol and analyze where existing models systematically fall short, with the goal of guiding future progress in deep research.

In summary, our contributions are threefold:

- •

  We introduce a grounded, expert-derived benchmark for deep research with 132 tasks and 9,430 verifiable rubrics constructed from real expert reports.
- •

  We propose a three-dimensional evaluation framework and an LLM-as-judge protocol that jointly assess information recall, analysis, and presentation in a fine-grained, rubric-based manner.
- •

  We conduct a comprehensive empirical study of leading DRAs, quantify their gap to human experts, and provide analysis and human-alignment experiments that set a new reference point for future deep-research evaluation.

![Refer to caption](https://arxiv.org/html/2601.08536v3/compare.png)


Figure 2: 
Comparison of evaluation schemes in prior deep-research benchmarks and DeepResearch Bench II.
*Top*: Benchmarks that rely on LLM-defined criteria can be misaligned with human experts.
*Middle*: Benchmarks that adopt human-written but coarse rubrics allow seemingly correct hallucinations from the DRA to pass.
*Bottom*: DeepResearch Bench II derives fine-grained, content-bearing rubrics from human expert reports, enabling the LLM judge to reject seemingly correct hallucinations and provide unbiased, verifiable evaluations aligned with human judgment.

## 2 Related Work

### 2.1 Deep Research Benchmarks

BrowseComp ([Wei et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib36)), XBench ([Chen et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib37)), Deep Research Bench ([FutureSearch et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib38)), WideSearch ([Wong et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib40)) focus on tasks that have fixed answers, such as specific entities or numbers. These benchmarks primarily assess whether the agent can locate and retrieve the correct information, testing the agent’s abilities in planning, reasoning, and discerning information sources.

On the other hand, tasks in DeepResearch Bench([Du et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib39)), Researcher Bench ([Xu et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib41)), DeepResearch-ReportEval ([Fan et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib42)), LiveResearchBench ([Wang et al., 2025a](https://arxiv.org/html/2601.08536v3#bib.bib31)), and ResearchRubrics ([Sharma et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib30)) simulate user queries and require the Deep Research agent to deliver a complete research report. These benchmarks evaluate the quality of the final report based on specific dimensions such as comprehensiveness, insight, and citation accuracy. Compared to the first category, these open-ended benchmarks are better at assessing whether the Deep Research agent knows which information should be recalled and its ability to analyze the information. However, they also have their own issues. In DeepResearch Bench, DeepResearch-ReportEval, and LiveResearchBench, the specific evaluation criteria are defined by the LLM itself, with human expert involvement only during the review phase or final consistency assessment. This approach may introduce anchoring bias ([Du et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib39); [Fan et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib42); [Wang et al., 2025a](https://arxiv.org/html/2601.08536v3#bib.bib31); [Sharma et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib30)). In contrast, the evaluation criteria designing in ResearcherBench and ResearchRubrics involve human expert, which can better reflect human expert cognition to some extent ([Xu et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib41); [Sharma et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib30)). However, the granularity of their rubrics is insufficient, and correctly evaluating them usually requires the model having specific internal knowledge. It is also noteworthy that DeepResearch Bench, DeepResearch-ReportEval, LiveResearchBench, and Researcher Bench evaluate whether the citations support the claims, but this only measures the accuracy of the citations and does not necessarily confirm that the information is correct (e.g., false information from unofficial sources) ([Du et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib39); [Fan et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib42); [Wang et al., 2025a](https://arxiv.org/html/2601.08536v3#bib.bib31); [Xu et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib41)). Essentially, these benchmarks still do not verify the accuracy of recalled information in the same way as the first category benchmarks.

| Method | Real-world Topics | Rubrics source from Human Experts | Verifiable by LLM Internal Knowledge | Average # Rubrics per task |
| --- | --- | --- | --- | --- |
| BrowseComp et al. | $\boldsymbol{\times}$ | $\boldsymbol{\checkmark}$ | $\boldsymbol{\checkmark}$ | - |
| DeepResearch Bench et al. | $\boldsymbol{\checkmark}$ | $\boldsymbol{\times}$ | $\boldsymbol{\times}$ | 10-25 |
| Researcher Bench | $\boldsymbol{\times}$ | $\boldsymbol{\checkmark}$ | $\boldsymbol{\times}$ | 14 |
| ResearchRubrics | $\boldsymbol{\checkmark}$ | $\boldsymbol{\checkmark}$ | $\boldsymbol{\times}$ | 26 |
| OURS | $\boldsymbol{\checkmark}$ | $\boldsymbol{\checkmark}$ | $\boldsymbol{\checkmark}$ | 71 |

Table 1: Comparison of different methods based on key criteria: whether they use real-world topics, source rubrics from human experts, allow verification by LLM’s internal knowledge, and Average # Rubrics per task. ’OURS’ stands out for meeting all criteria, emphasizing its comprehensive approach. BrowseComp et al. includes BrowseComp, XBench, Deep Research Bench, and WideSearch. DeepResearch Bench et al. includes DeepResearch Bench, DeepResearch-ReportEval, and LiveResearch-Bench.

### 2.2 LLM as judge and Rubric-based Evaluation

With its strong language comprehension abilities, LLMs are well-suited for handling evaluations in natural language, and LLM as judge has become a common evaluation method in NLP and various other fields ([Bavaresco et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib27); [Gu et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib28); [Zheng et al., 2023](https://arxiv.org/html/2601.08536v3#bib.bib29)). However, research has shown that LLMs, as judges, still struggle to perform well on certain complex and open-ended tasks ([Li et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib23); [Chakrabarty et al., 2024](https://arxiv.org/html/2601.08536v3#bib.bib24); [Marioriyad et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib25); [Thakur et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib26)). Recently, rubrics have been widely adopted for these types of evaluation tasks ([Arora et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib19); [Lin et al., 2024](https://arxiv.org/html/2601.08536v3#bib.bib20); [Sirdeshmukh et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib21); [Starace et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib22); [Gou et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib1)). By breaking down tasks into smaller scoring points, rubrics make the evaluation process by LLM as judge more interpretable. Rubrics designed by human experts also help ensure the consistency of LLM judge scores with human expert preferences to some extent ([Pathak et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib17); [Hashemi et al., 2024](https://arxiv.org/html/2601.08536v3#bib.bib18)). In this context, the rubric-based evaluation method has proven effective. Compared to direct scoring, rubrics introduce external knowledge to LLMs - namely, human understanding of "how this task should be broken down."

Although the term "rubric" is used in both cases, rubrics designed by different works vary in granularity, which places different demands on the evaluation model. For instance, in HealthBench, there is a rubric like: "Briefly describes common causes of muscle weakness in infants." ([Arora et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib19)) Although it breaks a complex medical task into such a small point, verifying this rubric requires the judge model to have relevant medical knowledge. For models without this knowledge, even if the evaluation subject provides incorrect answers, they will not be detected. Having relevant domain knowledge is feasible in fields such as healthcare and programming, and current research is working to enable LLMs to achieve this ([Huynh and Lin, 2025](https://arxiv.org/html/2601.08536v3#bib.bib15); [Singhal et al., 2023](https://arxiv.org/html/2601.08536v3#bib.bib16)). However, for deep research tasks — which inherently cannot be verified by the model’s internal knowledge — if the rubric is still like the one mentioned above, the rubric can only validate the agent’s planning ability and report organization (since the rubric decomposes the answer content and proves that the response includes the point). It cannot validate the accuracy of the information, and thus cannot assess the search and analysis capabilities of the deep research agent.

## 3 Methodology

### 3.1 Task Collection and Rubric Design

#### 3.1.1 Source Article Selection

![Refer to caption](https://arxiv.org/html/2601.08536v3/distribution.png)


Figure 3: Topic distribution of source articles/tasks used for our benchmark.

DeepResearch Bench analyzed the topic distribution of real-world user queries and invited domain experts to design benchmark tasks aligned with these distributions ([Du et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib39)). Building upon this foundation, we used the tasks from DeepResearch Bench as seeds and searched for open-access review reports addressing similar or identical research questions in reputable journals, top conferences, and credible institutional publications (commercial or governmental). These reports are typically written by domain experts over the course of weeks or months and undergo multiple layers of validation—from peer reviewers, editors, practitioners, and the general public—thus reflecting a high degree of credibility and expert consensus.

For each collected report, we verified its license and retained only those under CC-4.0 or CC-4.0-NC terms, which permit non-commercial use and adaptation. From this pool, we manually selected articles suitable for deep research tasks based on four criteria:
(1) the work requires extensive open-source information gathering;
(2) the conclusions involve substantial synthesis and analysis;
(3) the findings do not depend on physical experiments (e.g., in chemistry or biology); and
(4) the analyses are reproducible without reliance on complex data-mining pipelines or stochastic machine learning models.
After filtering, 132 articles were retained (see Appendix [C](https://arxiv.org/html/2601.08536v3#A3 "Appendix C Source Article List ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports") for the full list). These serve as the source materials for constructing our tasks and extracting the ground-truth rubrics for evaluation.

#### 3.1.2 Task and Rubric Design Protocol

| Dimension | Description |
| --- | --- |
| Information Recall | Evaluates whether the model can use planning and reasoning, together with search tools, to accurately and comprehensively retrieve task-relevant information from the open web. This includes identifying what information needs to be collected, locating it from large and heterogeneous sources, and checking its reliability through source credibility and cross-validation. |
| Analysis | Evaluates whether the model can synthesize the retrieved information and derive higher-level insights that go beyond simple aggregation. Typical expectations include extracting trends or paradigms, forming causal or comparative explanations, and drawing conclusions that directly address the research question rather than merely restating evidence. |
| Presentation | Evaluates whether the model can organize and communicate its findings in a clear, user-accessible, and verifiable way. This covers coherent structure, appropriate use of formats such as tables, figures, and lists, transparent citation or referencing for verification, and a level of explanation that is compatible with the plausible background of the target user. |

Table 2: Three evaluation dimensions used in DeepResearch Bench II.

For each task derived from a source article, we impose two basic requirements.
First, the task may either correspond to the core research question of the source article or cover a relevant subset, but it must *always* require both information collection and non-trivial analysis, rather than pure fact lookup.
Second, for time-sensitive topics (e.g., scientific progress, industry dynamics), the task must explicitly specify the temporal scope of the investigation to ensure consistency with the time period covered by the source article.

For evaluation, we adopt a full-rubric scoring scheme.
Each rubric is a binary criterion, typically phrased as a concrete factual or inferential requirement (e.g., “Presented the change in gold prices in table form”).
A rubric is marked as passed only if the report satisfies the specified requirement; the final task score is computed as the proportion of passed rubrics.
Dimension-wise scores are obtained by aggregating rubrics assigned to the corresponding dimension in Table [2](https://arxiv.org/html/2601.08536v3#S3.T2 "Table 2 ‣ 3.1.2 Task and Rubric Design Protocol ‣ 3.1 Task Collection and Rubric Design ‣ 3 Methodology ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").

To ensure that rubrics are both verifiable and fine-grained across all three dimensions, we impose the following constraints:
(1) each rubric must capture information or reasoning that is essential for correctly answering the task;
(2) each rubric must be atomic and indivisible, i.e., complex statements should be split into smaller rubrics, each checking a single fact or inference;
(3) each rubric should directly encode the target content rather than only specifying a broad topic (e.g., “stated that labor loss in small cities is due to job-structure mismatch” rather than “gave reasons for labor loss”);
and (4) for numerical data, each value must be explicitly verified through a rubric, with an acceptable margin of error allowed only for quantities that require intermediate computation.

To capture the different facets of deep research performance in a structured way, we decompose each task into three evaluation dimensions and assign rubrics accorddingly.
Table [2](https://arxiv.org/html/2601.08536v3#S3.T2 "Table 2 ‣ 3.1.2 Task and Rubric Design Protocol ‣ 3.1 Task Collection and Rubric Design ‣ 3 Methodology ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports") summarizes these dimensions.

#### 3.1.3 Task and Rubric Construction Pipeline

![Refer to caption](https://arxiv.org/html/2601.08536v3/method.png)


Figure 4: This diagram illustrates the entire workflow of our work. By decomposing human-expert articles into fine-grained, verifiable rubrics, we enable a comparison between human-expert articles and model-generated articles.

The construction of tasks and rubrics proceeds in four stages:
(1) LLM extraction, (2) self-evaluation iteration, (3) manual revision, and (4) expert review and refinement.

##### LLM Extraction

We directly employ a large language model (denoted as task-generator) to extract tasks and corresponding rubrics from each source article. Carefully designed prompts guide the model to ensure that the outputs meet the requirements defined in Section [3.1.2](https://arxiv.org/html/2601.08536v3#S3.SS1.SSS2 "3.1.2 Task and Rubric Design Protocol ‣ 3.1 Task Collection and Rubric Design ‣ 3 Methodology ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports")—covering both information recall, analysis and presentation, producing verifiable, fine-grained rubrics.

##### Self-Evaluation Iteration

Since LLM generations are prone to hallucinations ([Simhi et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib13); [Huang et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib14))—especially in long-context settings ([Farquhar et al., 2024](https://arxiv.org/html/2601.08536v3#bib.bib11); [Liu et al., 2025](https://arxiv.org/html/2601.08536v3#bib.bib12))—we adopt a self-evaluation strategy to mitigate this issue. Each initially generated rubric is applied to evaluate its own source article using the evaluation script.
If the resulting Information Recall or Analysis dimension achieves an accuracy below 90%, the generation is considered unreliable due to potential hallucination, and the LLM is prompted again to regenerate the task and rubrics until the threshold is met.

##### Manual Revision

After the self-evaluation stage, human annotators manually inspect all generated tasks and rubrics to ensure compliance with the requirements in Section [3.1.2](https://arxiv.org/html/2601.08536v3#S3.SS1.SSS2 "3.1.2 Task and Rubric Design Protocol ‣ 3.1 Task Collection and Rubric Design ‣ 3 Methodology ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"). This step primarily eliminates logically inconsistent or redundant rubrics and refines ambiguous phrasing to improve clarity and precision.

##### Expert Review and Refinement

Because LLMs may lack domain-specific expertise, the automatically generated tasks and rubrics can still contain residual issues after self-evaluation, such as including rubrics that, while consistent with the source article, are not essential for answering the defined task, retaining subtle hallucinations, or omitting critical criteria needed for a faithful evaluation of the task. To mitigate these problems, we recruited domain experts across the fields represented in our benchmark. Over the course of more than 400 human-hours, these experts conducted in-depth review, discussion, and iterative refinement of all tasks and rubrics. During this process, they ensured that rubrics in the *Information Recall* dimension correspond to essential or genuinely supportive information, remain fully consistent with the source article, and rely only on publicly accessible data. For the *Analysis* dimension, they required that each rubric encode reasoning or synthesis rather than direct factual lookup, that every analytical conclusion meaningfully addresses the task question, and that conclusions are logically grounded in the evidence presented. For the *Presentation* dimension, they checked that rubrics reflect any explicit formatting or structural requirements stated in the task and that they collectively encourage reports that are coherent, persuasive, and accessible to the intended user. This expert curation step is crucial for aligning the rubric set with human evaluation standards and for improving both the validity and reliability of our benchmark.

This four-stage pipeline ensures that each task and rubric is not only grounded in expert-authored literature but also verifiable, fine-grained, and aligned with human evaluation standards.

## 4 Experiment

### 4.1 Experimental Setup

#### 4.1.1 Implementation Details

For all evaluation tasks, we employ Gemini-2.5-Pro as the Judge LLM.
This model is selected due to its strong reasoning capability and stable binary classification performance.
All scoring tasks are conducted in batches of 50 rubrics per evaluation pass, a configuration chosen to balance accuracy and computational efficiency.
Each rubric is scored independently using a binary scheme (0/1), and the final score for a task is computed as the fraction of rubrics marked as passed.

#### 4.1.2 Evaluated Models

We benchmark a diverse suite of Deep Research agents and leading LLM-based agents.
Specifically, our evaluated models include: OpenAI-GPT-o3 Deep Research ([OpenAI, 2025b](https://arxiv.org/html/2601.08536v3#bib.bib7)), Gemini-3-Pro Deep Research ([Google, 2025](https://arxiv.org/html/2601.08536v3#bib.bib2)), Gemini-2.5-Pro Deep Research ([Google, 2024b](https://arxiv.org/html/2601.08536v3#bib.bib8)), Grok Deep Search, Perplexity Research ([Perplexity AI, 2025](https://arxiv.org/html/2601.08536v3#bib.bib9)), Qwen3-Max Deep Research ([Alibaba Cloud Blog, 2025](https://arxiv.org/html/2601.08536v3#bib.bib10)), Doubao Deep Research and Tongyi Deep Research ([Team, 2025](https://arxiv.org/html/2601.08536v3#bib.bib6)).
These agents represent the latest commercially deployed or early-released Deep Research agents available as of November 2025.

### 4.2 Main Results

| Model | InfoRecall | Analysis | Presentation | TotalScore |
| --- | --- | --- | --- | --- |
| OpenAI-GPT-o3 Deep Research ([OpenAI, 2025b](https://arxiv.org/html/2601.08536v3#bib.bib7)) | 39.98 | 49.85 | 89.16 | 45.40 |
| Gemini-3-Pro Deep Research ([Google, 2025](https://arxiv.org/html/2601.08536v3#bib.bib2)) | 39.09 | 48.94 | 91.85 | 44.60 |
| Gemini-2.5-Pro Deep Research ([Google, 2024b](https://arxiv.org/html/2601.08536v3#bib.bib8)) | 34.91 | 51.91 | 90.24 | 41.98 |
| Doubao Deep Research ([ByteDance,](https://arxiv.org/html/2601.08536v3#bib.bib3) ) | 34.83 | 49.43 | 83.51 | 40.99 |
| Qwen3-Max Deep Research ([Alibaba Cloud Blog, 2025](https://arxiv.org/html/2601.08536v3#bib.bib10)) | 34.18 | 48.04 | 74.59 | 39.25 |
| Grok Deep Search ([xAI,](https://arxiv.org/html/2601.08536v3#bib.bib4) ) | 33.52 | 42.50 | 91.42 | 39.23 |
| Perplexity Research ([Perplexity AI, 2025](https://arxiv.org/html/2601.08536v3#bib.bib9)) | 33.05 | 44.47 | 79.34 | 38.58 |
| Tongyi Deep Research ([Team, 2025](https://arxiv.org/html/2601.08536v3#bib.bib6)) | 22.95 | 35.89 | 86.13 | 29.89 |

Table 3: Main evaluation results across all tested models on the DeepResearch Bench II. Bold and underlined values indicate the best and second-best performance in each dimension, respectively.

Table [3](https://arxiv.org/html/2601.08536v3#S4.T3 "Table 3 ‣ 4.2 Main Results ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports") reports the performance of all evaluated Deep Research Agents across the three rubric dimensions—Analysis, InfoRecall, and Presentation—as well as their total score. The results reveal substantial disparities in the agents’ ability to execute long-context synthesis, structured reasoning, and task-aligned report generation.

##### Overall Performance.

OpenAI-GPT-o3 Deep Research emerges as the strongest overall agent, achieving the highest scores in both Information Recall and the overall aggregated metric. Gemini-3-Pro and Gemini-2.5-Pro Deep Research stands out in the Information Recall and Analysis dimension and also performs competitively in Presentation, making it a solid runner-up with a more analysis-oriented profile. Grok Deep Search excels in Presentation, clearly leading in how it structures and communicates information, but its retrieval and reasoning capabilities lag behind the top agents. Tongyi Deep Research consistently ranks at the bottom across dimensions, reflecting a noticeable gap from the other evaluated models. Overall, OpenAI-GPT-o3 appears the most well-rounded, Gemini-3-Pro shows balanced strengths, and Grok Deep Search is highly polished in presentation but weaker in the upstream stages of deep research. However, even the best-performing agent still fails to satisfy more than half of the rubrics, indicating a substantial remaining gap between current DRAs and human experts.

##### Dimension-Level Insights.

Across InfoRecall, OpenAI-GPT-o3 Deep Research and Gemini-3-Pro Deep Research clearly outperform the rest, while Gemini-2.5-Pro, Doubao Deep Research, Qwen3-Max Deep Research, Grok Deep Search, and Perplexity Research form a middle cluster with comparable retrieval performance. Tongyi Deep Research is noticeably weaker in this dimension, suggesting limitations in its information-seeking behavior. In Analysis, OpenAI-GPT-o3 and Gemini-2.5-Pro form the top tier, indicating stronger abilities to synthesize evidence and generate higher-level conclusions; Perplexity Research, Grok Deep Search and Gemini-3-Pro follow behind, with Tongyi Deep Research again trailing. For Presentation, Grok Deep Search and Gemini-3-Pro take a slight lead, with Gemini-2.5-Pro and OpenAI-GPT-o3 closely behind; all three produce generally well-structured and readable reports. Tongyi Deep Research and Perplexity Research perform somewhat worse in this dimension, pointing to less effective organization and user-facing communication of their findings.

### 4.3 Ablation Study

To validate the design choices in our evaluation pipeline, we conduct controlled ablations along two critical axes: rubric batch size and evaluator model selection.
We curate a set of ten model-generated reports covering diverse tasks, model families, and output formats (PDF, DOCX, Markdown, and HTML).
Human annotators label these reports against the corresponding rubrics, and we measure the alignment between LLM-as-judge predictions and human judgments.
All reported results reflect accuracy (ACC) and F1 scores computed against these human annotations.

#### 4.3.1 Rubric Batch Size

| batch size | cost | ACC | F1 |
| --- | --- | --- | --- |
| full | 0.2025 | 90.80 | 87.06 |
| 80 | 0.2087 | 91.47 | 88.36 |
| 50 | 0.2513 | 91.75 | 89.57 |
| 10 | 0.4832 | 92.29 | 89.37 |
| 5 | 0.8298 | 90.39 | 85.66 |

  


Table 4: Ablation on rubric batch size. The table shows the average evaluation cost per task (in dollars), accuracy (ACC), and F1-score for different batch sizes. Batch size 50 achieves the best F1-score while maintaining reasonable cost, making it the optimal choice for our evaluation pipeline.

We vary the number of rubrics evaluated per pass and compare accuracy, F1, and cost efficiency.
Gemini-2.5-Pro is used as the evaluator for all configurations.
The results are summarized in Table [4](https://arxiv.org/html/2601.08536v3#S4.T4 "Table 4 ‣ 4.3.1 Rubric Batch Size ‣ 4.3 Ablation Study ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").

We observe a consistent cost reduction as batch size increases.
Accuracy and F1 initially improve and then plateau or slightly drop when the batch becomes too small, consistent with observations in prior studies ([Wang et al., 2025b](https://arxiv.org/html/2601.08536v3#bib.bib5)).
Table [4](https://arxiv.org/html/2601.08536v3#S4.T4 "Table 4 ‣ 4.3.1 Rubric Batch Size ‣ 4.3 Ablation Study ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports") illustrates that a batch size of 50 offers the best balance, delivering strong accuracy while keeping evaluation overhead manageable.
Therefore, we adopt 50 as the default configuration.

#### 4.3.2 Evaluator Model Selection

We further compare different LLMs as evaluators under a fixed batch size of 50.
Each model evaluates the same set of human-labeled reports, and the agreement with human judgments is shown in Table [5](https://arxiv.org/html/2601.08536v3#S4.T5 "Table 5 ‣ 4.3.2 Evaluator Model Selection ‣ 4.3 Ablation Study ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").

| model | ACC | F1 |
| --- | --- | --- |
| Gemini-2.5-Pro | 91.75 | 89.57 |
| GPT-5 | 88.36 | 78.28 |
| Gemini-2.5-Flash | 89.45 | 79.79 |

  


Table 5: Ablation on evaluator model choice.

Gemini-2.5-Pro demonstrates the highest alignment with human annotations across both metrics.
GPT-5 and Gemini-2.5-Flash show noticeably lower consistency, particularly in F1.
Given its superior reliability as an automatic judge, we select Gemini-2.5-Pro as the evaluator throughout all experiments.

## 5 Analysis and Discussion

### 5.1 Robustness Analysis Across Language and Topic

To evaluate model robustness, we analyze performance variations across languages (English vs. Chinese) and research topics (e.g., Health, Finance & Business, Software Development). We employ relative scores—defined as the deviation of each model’s score from the task-average score—to control for inherent task difficulty differences. One-way ANOVA tests are conducted separately for language and topic factors.

##### Language Effects.

Most models exhibit robust performance across languages, with p-values $>$ 0.05 for OpenAI, Gemini, Doubao, Qwen, and Perplexity. Only Grok shows a marginally significant difference (p = 0.034), suggesting a slight sensitivity to language variation.

| Language | OpenAI | Gemini | Doubao | Qwen3 | Grok | Perplexity | Tongyi | Avg. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| en | 45.53 | 41.83 | 40.33 | 36.95 | 36.79 | 38.03 | 29.22 | 38.38 |
| zh | 45.26 | 42.13 | 41.66 | 41.55 | 41.64 | 39.13 | 30.56 | 40.28 |

Table 6: Language-based model performance, averaged over all tasks.

##### Topic Effects.

Performance remains stable across research topics for all evaluated agents, with all models (OpenAI, Gemini, Doubao, Qwen, Grok, Perplexity) showing no significant topic-based variation (p $>$ 0.05).

### 5.2 Source Article Leakage

Since the goal is to indirectly compare human expert-authored research reports with those generated by the model, any situation where the model is exposed to a human expert article during the research process would constitute a form of answer leakage. To mitigate this risk, we included a blocked list in the prompt to prevent the model from accessing these source articles. Additionally, during the evaluation, we performed a secondary inspection of the generated reports. If a report referenced the source article and correctly answered a question, we excluded that from the score and recorded the leakage rate. The results are presented in Appendix [D](https://arxiv.org/html/2601.08536v3#A4 "Appendix D Source Article Leakage Rate ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").

As most of the models evaluated are closed-source, we can only prevent the model from viewing the source articles through the prompt as a suboptimal workaround. However, this approach cannot guarantee 100% prevention of model access to the source articles, and it may potentially affect the model’s actual performance. Therefore, for open-source projects and internal members of closed-source teams, we strongly recommend using more restrictive measures (e.g., blocking certain search tool results or limiting searchable URLs) when generating evaluation reports to fully prevent model access to the source articles, ensuring more accurate evaluation results. The specific list of source articles is provided in the appendix. Each task in the public dataset is accompanied by the corresponding source article title, authors, and URLs.

### 5.3 Future Directions

In the previous subsection, we included the requirement in the Presentation dimension: Considering the user’s cognitive level and background knowledge. However, this is a particularly challenging task. In our benchmark, this aspect has not been fully realized. Recent works have made initial efforts in this direction, such as LiveResearchBench, which introduces the concept of target_audience, allowing the model to generate reports tailored to the user’s background. However, this remains a very preliminary attempt. Simply adding one or two sentences about the target_audience in the prompt does not effectively help the model understand the user’s cognitive level and background knowledge. One cannot assume that an undergraduate student knows nothing and needs detailed explanations of every concept, nor can one assume that an experienced professor understands everything and requires no background context. Therefore, the true realization of user-adaptive presentation remains an open research direction, both for deep research agents and evaluation benchmarks. Achieving this would require collaborative efforts from research areas such as Agent Memory and User Modeling.

## 6 Conclusion

In this work, we have presented Deep Research Bench II, a comprehensive benchmark designed to evaluate the capabilities of deep research agents. By focusing on real-world user needs and deconstructing research tasks into three core dimensions—Information Recall, Analysis, and Presentation—we have created a more robust and realistic method for evaluating LLM-based research agents. Our approach incorporates expert-authored articles and verifiable rubrics, ensuring that the evaluation process aligns with human expert expectations and provides a reliable assessment of model performance. The results highlight the strengths and weaknesses of leading deep research models, offering valuable insights into areas where improvements are needed, such as reasoning and the integration of retrieved data. Additionally, we identify the challenges of user-adaptive presentations, which remains a promising avenue for future research. Deep Research Bench II sets a new standard for the evaluation of deep research agents, and we believe it will drive future advancements in this field by providing a more accurate measure of model capabilities and facilitating the development of more effective research tools.

## 7 Limitations

##### Source Article Leakage.

In our own experiments, we encountered limitations in controlling search results from closed-source models. We attempted to prevent source articles from being accessed by the agent by using prompt-based restrictions. However, the final statistics revealed that this method could not fully prevent leakage of source articles. The reliance on prompt-based restrictions may influence the performance of the deep research agent, and if the leakage rate is too high, it could lead to discrepancies between the reported scores and the agent’s actual performance, thereby diminishing the relevance and accuracy of the evaluation results. To address this, a potential and strongly recommended solution is for the development team of deep research agents to directly restrict access to these articles at the search engine tool level, effectively eliminating the possibility of leakage and ensuring a more accurate evaluation of the system’s performance.

##### Human Annotations.

Although we invited human experts to annotate the benchmark and implemented multiple rounds of review to ensure the quality of annotations, the subjective judgment of human annotators could still introduce bias, affecting the final results of the benchmark. Even research reports authored by human experts are unlikely to satisfy all reviewers in a single pass, highlighting the inherently challenging nature of evaluating deep research agents. As such, the evaluation process—especially within the context of deep research—remains an ongoing, long-tail issue that requires continuous community efforts for refinement. To address this, we welcome feedback and suggestions from the broader community and domain experts to improve both the tasks and rubrics, ensuring that the benchmark evolves to better reflect human preferences.

##### Limitations in the Presentation Dimension.

As discussed in the "Future Directions" section, the current presentation dimension primarily assesses the formatting and layout of reports, but it does not yet account for how the model can personalize the presentation based on the user’s knowledge background and preferences. Enhancing this aspect requires integration with advancements in agent memory, making it a key area for future improvements. We consider this to be one of the central directions for further development of the benchmark.

## 8 Potential Risks

##### Intellectual Property Concerns.

In our work, we directly incorporated several human-expert articles that were explicitly licensed under CC-by-4.0 or CC-BY-4.0-NC licenses, allowing non-commercial use and adaptation. Accordingly, our benchmark follows the same licensing terms, permitting free adaptation and usage under non-commercial conditions. However, there remains a potential risk that commercial entities could utilize this benchmark as training data, which could indirectly infringe upon the intellectual property rights of the original authors. While we have taken measures to ensure compliance with open-access guidelines, this risk persists and must be carefully monitored.

## 9 Acknowledgements

We would like to express our gratitude to all the annotating experts who contributed to our benchmark. Their dedicated work and professional input were invaluable to the completion of this project. Without their support, this work would not have been possible.

We also extend our sincere thanks to the authors of the source articles used in our benchmark. Your commitment to open access is truly appreciated. If any author prefers not to have their work included in our benchmark, we fully respect your decision. Please feel free to contact us, and we will promptly remove the article from our dataset.

We are also deeply thankful to all the peers and experts who have provided suggestions and assistance during the development of this work and after its publication. We thank Bei Zheng for helping us create the figures. Your contributions are helping us to continuously improve the benchmark. We encourage experts in related fields to continue offering feedback for future revisions of the benchmark, so that we can collaboratively address this long-tail challenge and contribute to the ongoing evolution of deep research agents.

## References

- Alibaba Cloud Blog (2025)
  Alibaba Cloud Blog
  Qwen deepresearch: when inspiration becomes its own reason.
  Note: <https://www.alibabacloud.com/blog/qwen-deepresearch-when-inspiration-becomes-its-own-reason_602676>Accessed: 2025-11-20
  Cited by: [§4.1.2](https://arxiv.org/html/2601.08536v3#S4.SS1.SSS2.p1.1 "4.1.2 Evaluated Models ‣ 4.1 Experimental Setup ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [Table 3](https://arxiv.org/html/2601.08536v3#S4.T3.2.6.1 "In 4.2 Main Results ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Andreas (2022)
  J. Andreas
  Language models as agent models.
  External Links: 2212.01681,
  [Link](https://arxiv.org/abs/2212.01681)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p1.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Arora et al. (2025)
  R. K. Arora, J. Wei, R. S. Hicks, P. Bowman, J. Quiñonero-Candela, F. Tsimpourlas, M. Sharman, M. Shah, A. Vallone, A. Beutel, J. Heidecke, and K. Singhal
  HealthBench: Evaluating Large Language Models Towards Improved Human Health.
   arXiv.
  External Links: 2505.08775,
  [Document](https://dx.doi.org/10.48550/arXiv.2505.08775)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p2.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Bavaresco et al. (2025)
  A. Bavaresco, R. Bernardi, L. Bertolazzi, D. Elliott, R. Fernández, A. Gatt, E. Ghaleb, M. Giulianelli, M. Hanna, A. Koller, A. F. T. Martins, P. Mondorf, V. Neplenbroek, S. Pezzelle, B. Plank, D. Schlangen, A. Suglia, A. K. Surikuchi, E. Takmaz, and A. Testoni
  LLMs instead of human judges? a large scale empirical study across 20 nlp evaluation tasks.
  External Links: 2406.18403,
  [Link](https://arxiv.org/abs/2406.18403)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Brown et al. (2020)
  T. B. Brown, B. Mann, N. Ryder, M. Subbiah, J. Kaplan, P. Dhariwal, A. Neelakantan, P. Shyam, G. Sastry, A. Askell, S. Agarwal, A. Herbert-Voss, G. Krueger, T. Henighan, R. Child, A. Ramesh, D. M. Ziegler, J. Wu, C. Winter, C. Hesse, M. Chen, E. Sigler, M. Litwin, S. Gray, B. Chess, J. Clark, C. Berner, S. McCandlish, A. Radford, I. Sutskever, and D. Amodei
  Language models are few-shot learners.
  External Links: 2005.14165,
  [Link](https://arxiv.org/abs/2005.14165)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p1.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- [6]
  ByteDance
  Doubao chat.
  Note: <https://www.doubao.com/chat/>Accessed: 2025-12-19
  Cited by: [Table 3](https://arxiv.org/html/2601.08536v3#S4.T3.2.5.1 "In 4.2 Main Results ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Chakrabarty et al. (2024)
  T. Chakrabarty, P. Laban, D. Agarwal, S. Muresan, and C. Wu
  Art or artifice? large language models and the false promise of creativity.
  External Links: 2309.14556,
  [Link](https://arxiv.org/abs/2309.14556)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Chen et al. (2025)
  K. Chen, Y. Ren, Y. Liu, X. Hu, H. Tian, T. Xie, F. Liu, H. Zhang, H. Liu, Y. Gong, C. Sun, H. Hou, H. Yang, J. Pan, J. Lou, J. Mao, J. Liu, J. Li, K. Liu, K. Liu, R. Wang, R. Li, T. Niu, W. Zhang, W. Yan, X. Wang, Y. Zhang, Y. Hung, Y. Jiang, Z. Liu, Z. Yin, Z. Ma, and Z. Mo
  Xbench: tracking agents productivity scaling with profession-aligned real-world evaluations.
  External Links: 2506.13651,
  [Link](https://arxiv.org/abs/2506.13651)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p2.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [§2.1](https://arxiv.org/html/2601.08536v3#S2.SS1.p1.1 "2.1 Deep Research Benchmarks ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Du et al. (2025)
  M. Du, B. Xu, C. Zhu, X. Wang, and Z. Mao
  DeepResearch bench: a comprehensive benchmark for deep research agents.
  External Links: 2506.11763,
  [Link](https://arxiv.org/abs/2506.11763)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p2.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [§2.1](https://arxiv.org/html/2601.08536v3#S2.SS1.p2.1 "2.1 Deep Research Benchmarks ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [§3.1.1](https://arxiv.org/html/2601.08536v3#S3.SS1.SSS1.p1.1 "3.1.1 Source Article Selection ‣ 3.1 Task Collection and Rubric Design ‣ 3 Methodology ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Fan et al. (2025)
  T. Fan, X. Niu, Y. Zheng, F. Zhang, C. Huang, B. Chen, J. Lin, and C. Huang
  Understanding deepresearch via reports.
  External Links: 2510.07861,
  [Link](https://arxiv.org/abs/2510.07861)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p2.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [§2.1](https://arxiv.org/html/2601.08536v3#S2.SS1.p2.1 "2.1 Deep Research Benchmarks ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Farquhar et al. (2024)
  S. Farquhar, J. Kossen, L. Kuhn, et al.
  Detecting hallucinations in large language models using semantic entropy.
  Nature 630, pp. 625–630.
  External Links: [Document](https://dx.doi.org/10.1038/s41586-024-07421-0),
  [Link](https://doi.org/10.1038/s41586-024-07421-0)
  Cited by: [§3.1.3](https://arxiv.org/html/2601.08536v3#S3.SS1.SSS3.Px2.p1.1 "Self-Evaluation Iteration ‣ 3.1.3 Task and Rubric Construction Pipeline ‣ 3.1 Task Collection and Rubric Design ‣ 3 Methodology ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- FutureSearch et al. (2025)
  FutureSearch, :, N. I. Bosse, J. Evans, R. G. Gambee, D. Hnyk, P. Mühlbacher, L. Phillips, D. Schwarz, and J. Wildman
  Deep research bench: evaluating ai web research agents.
  External Links: 2506.06287,
  [Link](https://arxiv.org/abs/2506.06287)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p2.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [§2.1](https://arxiv.org/html/2601.08536v3#S2.SS1.p1.1 "2.1 Deep Research Benchmarks ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Google (2024a)
  Google
  Gemini deep research — your personal research assistant.
  Note: <https://gemini.google/overview/deep-research/>Accessed 2025-11-10
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p1.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Google (2024b)
  Google
  Try deep research and our new experimental model in gemini.
  Note: <https://blog.google/products/gemini/google-gemini-deep-research/>Accessed: 2025-11-20
  Cited by: [§4.1.2](https://arxiv.org/html/2601.08536v3#S4.SS1.SSS2.p1.1 "4.1.2 Evaluated Models ‣ 4.1 Experimental Setup ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [Table 3](https://arxiv.org/html/2601.08536v3#S4.T3.2.4.1 "In 4.2 Main Results ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Google (2025)
  Google
  Build with gemini deep research.
   Google.
  Note: The Keyword (Google Blog)
  External Links: [Link](https://blog.google/technology/developers/deep-research-agent-gemini-api/)
  Cited by: [§4.1.2](https://arxiv.org/html/2601.08536v3#S4.SS1.SSS2.p1.1 "4.1.2 Evaluated Models ‣ 4.1 Experimental Setup ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [Table 3](https://arxiv.org/html/2601.08536v3#S4.T3.2.3.1 "In 4.2 Main Results ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Gou et al. (2025)
  B. Gou, Z. Huang, Y. Ning, Y. Gu, M. Lin, W. Qi, A. Kopanev, B. Yu, B. J. Gutiérrez, Y. Shu, C. H. Song, J. Wu, S. Chen, H. N. Moussa, T. Zhang, J. Xie, Y. Li, T. Xue, Z. Liao, K. Zhang, B. Zheng, Z. Cai, V. Rozgic, M. Ziyadi, H. Sun, and Y. Su
  Mind2Web 2: evaluating agentic search with agent-as-a-judge.
  External Links: 2506.21506,
  [Link](https://arxiv.org/abs/2506.21506)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Gu et al. (2025)
  J. Gu, X. Jiang, Z. Shi, H. Tan, X. Zhai, C. Xu, W. Li, Y. Shen, S. Ma, H. Liu, S. Wang, K. Zhang, Y. Wang, W. Gao, L. Ni, and J. Guo
  A survey on llm-as-a-judge.
  External Links: 2411.15594,
  [Link](https://arxiv.org/abs/2411.15594)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Hashemi et al. (2024)
  H. Hashemi, J. Eisner, C. Rosset, B. Van Durme, and C. Kedzie
  LLM-rubric: a multidimensional, calibrated approach to automated evaluation of natural language texts.
  In Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
  pp. 13806–13834.
  External Links: [Link](http://dx.doi.org/10.18653/v1/2024.acl-long.745),
  [Document](https://dx.doi.org/10.18653/v1/2024.acl-long.745)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Huang et al. (2025)
  L. Huang, W. Yu, W. Ma, W. Zhong, Z. Feng, H. Wang, Q. Chen, W. Peng, X. Feng, B. Qin, and T. Liu
  A survey on hallucination in large language models: principles, taxonomy, challenges, and open questions.
  ACM Transactions on Information Systems 43 (2), pp. 1–55.
  External Links: ISSN 1558-2868,
  [Link](http://dx.doi.org/10.1145/3703155),
  [Document](https://dx.doi.org/10.1145/3703155)
  Cited by: [§3.1.3](https://arxiv.org/html/2601.08536v3#S3.SS1.SSS3.Px2.p1.1 "Self-Evaluation Iteration ‣ 3.1.3 Task and Rubric Construction Pipeline ‣ 3.1 Task Collection and Rubric Design ‣ 3 Methodology ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Huynh and Lin (2025)
  N. Huynh and B. Lin
  Large language models for code generation: a comprehensive survey of challenges, techniques, evaluation, and applications.
  External Links: 2503.01245,
  [Link](https://arxiv.org/abs/2503.01245)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p2.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Li et al. (2025)
  R. Li, C. Zhu, B. Xu, X. Wang, and Z. Mao
  Automated creativity evaluation for large language models: a reference-based approach.
  External Links: 2504.15784,
  [Link](https://arxiv.org/abs/2504.15784)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Lin et al. (2024)
  B. Y. Lin, Y. Deng, K. Chandu, F. Brahman, A. Ravichander, V. Pyatkin, N. Dziri, R. L. Bras, and Y. Choi
  WildBench: benchmarking llms with challenging tasks from real users in the wild.
  External Links: 2406.04770,
  [Link](https://arxiv.org/abs/2406.04770)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Liu et al. (2025)
  S. Liu, K. Halder, Z. Qi, W. Xiao, N. Pappas, P. M. Htut, N. A. John, Y. Benajiba, and D. Roth
  Towards long context hallucination detection.
  External Links: 2504.19457,
  [Link](https://arxiv.org/abs/2504.19457)
  Cited by: [§3.1.3](https://arxiv.org/html/2601.08536v3#S3.SS1.SSS3.Px2.p1.1 "Self-Evaluation Iteration ‣ 3.1.3 Task and Rubric Construction Pipeline ‣ 3.1 Task Collection and Rubric Design ‣ 3 Methodology ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Marioriyad et al. (2025)
  A. Marioriyad, M. H. Rohban, and M. S. Baghshah
  The silent judge: unacknowledged shortcut bias in llm-as-a-judge.
  External Links: 2509.26072,
  [Link](https://arxiv.org/abs/2509.26072)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Nakano et al. (2022)
  R. Nakano, J. Hilton, S. Balaji, J. Wu, L. Ouyang, C. Kim, C. Hesse, S. Jain, V. Kosaraju, W. Saunders, X. Jiang, K. Cobbe, T. Eloundou, G. Krueger, K. Button, M. Knight, B. Chess, and J. Schulman
  WebGPT: browser-assisted question-answering with human feedback.
  External Links: 2112.09332,
  [Link](https://arxiv.org/abs/2112.09332)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p1.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- OpenAI (2025a)
  OpenAI
  Introducing deep research.
  Note: <https://openai.com/index/introducing-deep-research/>Accessed 2025-11-10
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p1.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- OpenAI (2025b)
  OpenAI
  Introducing deep research.
  Note: <https://openai.com/index/introducing-deep-research/>Accessed: 2025-11-20
  Cited by: [§4.1.2](https://arxiv.org/html/2601.08536v3#S4.SS1.SSS2.p1.1 "4.1.2 Evaluated Models ‣ 4.1 Experimental Setup ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [Table 3](https://arxiv.org/html/2601.08536v3#S4.T3.2.2.1 "In 4.2 Main Results ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Pathak et al. (2025)
  A. Pathak, R. Gandhi, V. Uttam, A. Ramamoorthy, P. Ghosh, A. R. Jindal, S. Verma, A. Mittal, A. Ased, C. Khatri, Y. Nakka, Devansh, J. S. Challa, and D. Kumar
  Rubric is all you need: enhancing llm-based code evaluation with question-specific rubrics.
  External Links: 2503.23989,
  [Document](https://dx.doi.org/https%3A//doi.org/10.1145/3702652.3744220),
  [Link](https://arxiv.org/abs/2503.23989)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Perplexity AI (2025)
  Perplexity AI
  Introducing deep research.
  Note: <https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research>Accessed: 2025-11-20
  Cited by: [§4.1.2](https://arxiv.org/html/2601.08536v3#S4.SS1.SSS2.p1.1 "4.1.2 Evaluated Models ‣ 4.1 Experimental Setup ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [Table 3](https://arxiv.org/html/2601.08536v3#S4.T3.2.8.1 "In 4.2 Main Results ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Sharma et al. (2025)
  M. Sharma, C. B. C. Zhang, C. Bandi, C. Wang, A. Aich, H. Nghiem, T. Rabbani, Y. Htet, B. Jang, S. Basu, A. Balwani, D. Peskoff, M. Ayestaran, S. M. Hendryx, B. Kenstler, and B. Liu
  ResearchRubrics: A Benchmark of Prompts and Rubrics For Evaluating Deep Research Agents.
   arXiv.
  External Links: 2511.07685,
  [Document](https://dx.doi.org/10.48550/arXiv.2511.07685)
  Cited by: [§2.1](https://arxiv.org/html/2601.08536v3#S2.SS1.p2.1 "2.1 Deep Research Benchmarks ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Simhi et al. (2025)
  A. Simhi, I. Itzhak, F. Barez, G. Stanovsky, and Y. Belinkov
  Trust me, i’m wrong: llms hallucinate with certainty despite knowing the answer.
  External Links: 2502.12964,
  [Link](https://arxiv.org/abs/2502.12964)
  Cited by: [§3.1.3](https://arxiv.org/html/2601.08536v3#S3.SS1.SSS3.Px2.p1.1 "Self-Evaluation Iteration ‣ 3.1.3 Task and Rubric Construction Pipeline ‣ 3.1 Task Collection and Rubric Design ‣ 3 Methodology ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Singhal et al. (2023)
  K. Singhal, S. Azizi, T. Tu, et al.
  Large language models encode clinical knowledge.
  Nature 620, pp. 172–180.
  External Links: [Document](https://dx.doi.org/10.1038/s41586-023-06291-2),
  [Link](https://doi.org/10.1038/s41586-023-06291-2)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p2.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Sirdeshmukh et al. (2025)
  V. Sirdeshmukh, K. Deshpande, J. Mols, L. Jin, E. Cardona, D. Lee, J. Kritz, W. Primack, S. Yue, and C. Xing
  MultiChallenge: a realistic multi-turn conversation evaluation benchmark challenging to frontier llms.
  External Links: 2501.17399,
  [Link](https://arxiv.org/abs/2501.17399)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Starace et al. (2025)
  G. Starace, O. Jaffe, D. Sherburn, J. Aung, J. S. Chan, L. Maksin, R. Dias, E. Mays, B. Kinsella, W. Thompson, J. Heidecke, A. Glaese, and T. Patwardhan
  PaperBench: evaluating ai’s ability to replicate ai research.
  External Links: 2504.01848,
  [Link](https://arxiv.org/abs/2504.01848)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Team (2025)
  T. D. Team
  Tongyi deepresearch: a new era of open-source ai researchers.
  Note: <https://github.com/Alibaba-NLP/DeepResearch>
  Cited by: [§4.1.2](https://arxiv.org/html/2601.08536v3#S4.SS1.SSS2.p1.1 "4.1.2 Evaluated Models ‣ 4.1 Experimental Setup ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [Table 3](https://arxiv.org/html/2601.08536v3#S4.T3.2.9.1 "In 4.2 Main Results ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Thakur et al. (2025)
  A. S. Thakur, K. Choudhary, V. S. Ramayapally, S. Vaidyanathan, and D. Hupkes
  Judging the judges: evaluating alignment and vulnerabilities in llms-as-judges.
  External Links: 2406.12624,
  [Link](https://arxiv.org/abs/2406.12624)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Wang et al. (2025a)
  J. Wang, Y. Ming, R. Dulepet, Q. Chen, A. Xu, Z. Ke, F. Sala, A. Albarghouthi, C. Xiong, and S. Joty
  LiveResearchBench: A Live Benchmark for User-Centric Deep Research in the Wild.
   arXiv.
  External Links: 2510.14240,
  [Document](https://dx.doi.org/10.48550/arXiv.2510.14240)
  Cited by: [§2.1](https://arxiv.org/html/2601.08536v3#S2.SS1.p2.1 "2.1 Deep Research Benchmarks ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Wang et al. (2025b)
  Z. Wang, J. Kodner, and O. Rambow
  Evaluating llms with multiple problems at once.
  External Links: 2406.10786,
  [Link](https://arxiv.org/abs/2406.10786)
  Cited by: [§4.3.1](https://arxiv.org/html/2601.08536v3#S4.SS3.SSS1.p2.1 "4.3.1 Rubric Batch Size ‣ 4.3 Ablation Study ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Wei et al. (2025)
  J. Wei, Z. Sun, S. Papay, S. McKinney, J. Han, I. Fulford, H. W. Chung, A. T. Passos, W. Fedus, and A. Glaese
  BrowseComp: a simple yet challenging benchmark for browsing agents.
  External Links: 2504.12516,
  [Link](https://arxiv.org/abs/2504.12516)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p2.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [§2.1](https://arxiv.org/html/2601.08536v3#S2.SS1.p1.1 "2.1 Deep Research Benchmarks ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- White (2024)
  R. W. White
  Advancing the search frontier with ai agents.
  Communications of the ACM 67 (9), pp. 54–65.
  External Links: [Document](https://dx.doi.org/10.1145/3655615)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p1.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Wong et al. (2025)
  R. Wong, J. Wang, J. Zhao, L. Chen, Y. Gao, L. Zhang, X. Zhou, Z. Wang, K. Xiang, G. Zhang, W. Huang, Y. Wang, and K. Wang
  WideSearch: benchmarking agentic broad info-seeking.
  External Links: 2508.07999,
  [Link](https://arxiv.org/abs/2508.07999)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p2.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [§2.1](https://arxiv.org/html/2601.08536v3#S2.SS1.p1.1 "2.1 Deep Research Benchmarks ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- [42]
  xAI
  Grok.
  Note: <https://grok.com/>Accessed: 2025-12-19
  Cited by: [Table 3](https://arxiv.org/html/2601.08536v3#S4.T3.2.7.1 "In 4.2 Main Results ‣ 4 Experiment ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Xu et al. (2025)
  T. Xu, P. Lu, L. Ye, X. Hu, and P. Liu
  ResearcherBench: evaluating deep ai research systems on the frontiers of scientific inquiry.
  External Links: 2507.16280,
  [Link](https://arxiv.org/abs/2507.16280)
  Cited by: [§1](https://arxiv.org/html/2601.08536v3#S1.p2.1 "1 Introduction ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports"),
  [§2.1](https://arxiv.org/html/2601.08536v3#S2.SS1.p2.1 "2.1 Deep Research Benchmarks ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").
- Zheng et al. (2023)
  L. Zheng, W. Chiang, Y. Sheng, S. Zhuang, Z. Wu, Y. Zhuang, Z. Lin, Z. Li, D. Li, E. P. Xing, H. Zhang, J. E. Gonzalez, and I. Stoica
  Judging llm-as-a-judge with mt-bench and chatbot arena.
  External Links: 2306.05685,
  [Link](https://arxiv.org/abs/2306.05685)
  Cited by: [§2.2](https://arxiv.org/html/2601.08536v3#S2.SS2.p1.1 "2.2 LLM as judge and Rubric-based Evaluation ‣ 2 Related Work ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").

## Appendix A Benchmark Statistics

### A.1 Task Topic and Language Statistics

| Topic | EN | ZH | Total |
| --- | --- | --- | --- |
| Science & Technology | 12 | 11 | 23 |
| Finance & Business | 7 | 8 | 15 |
| Software Development | 6 | 7 | 13 |
| Health | 6 | 6 | 12 |
| Education & Jobs | 5 | 5 | 10 |
| Hardware | 3 | 3 | 6 |
| History | 3 | 3 | 6 |
| Literature | 3 | 3 | 6 |
| Industrial | 3 | 2 | 5 |
| Art & Design | 2 | 2 | 4 |
| Religion | 2 | 2 | 4 |
| Food & Dining | 2 | 1 | 3 |
| Home & Hobbies | 2 | 1 | 3 |
| Social Life | 1 | 2 | 3 |
| Sports & Fitness | 2 | 1 | 3 |
| Transportation | 1 | 2 | 3 |
| Travel | 1 | 2 | 3 |
| Crime & Law | 1 | 1 | 2 |
| Entertainment | 1 | 1 | 2 |
| Fashion & Beauty | 1 | 1 | 2 |
| Games | 1 | 1 | 2 |
| Software | 1 | 1 | 2 |
| Total | 66 | 66 | 132 |

Table 7: Task topic and language distribution for DRB-v2, showing the number of tasks in English (EN), Chinese (ZH), and total count across different topic categories.

### A.2 Rubric Statistics by Dimension

We analyze the distribution of rubrics across the three evaluation dimensions. On average, each task contains 52.902 rubrics for InfoRecall, 12.773 rubrics for Analysis, and 5.652 rubrics for Presentation. Figure [5](https://arxiv.org/html/2601.08536v3#A1.F5 "Figure 5 ‣ A.2 Rubric Statistics by Dimension ‣ Appendix A Benchmark Statistics ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports") shows the frequency distribution of rubric counts across all tasks for each dimension.

![Refer to caption](https://arxiv.org/html/2601.08536v3/rubric_distribution.png)


Figure 5: Frequency distribution of rubric counts per task across the three evaluation dimensions: InfoRecall, Analysis, and Presentation. The distributions show the concentration of rubric counts within specific ranges for each dimension.

## Appendix B Detailed Result

| Category | OpenAI | Gemini | Doubao | Qwen | Grok | Perplexity | Tongyi | Avg. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Art & Design | 0.5001 | 0.4887 | 0.4085 | 0.4675 | 0.4846 | 0.4292 | 0.2896 | 0.4383 |
| Crime & Law | 0.5472 | 0.4667 | 0.5556 | 0.2222 | 0.4819 | 0.4861 | 0.2278 | 0.4268 |
| Education & Jobs | 0.3460 | 0.3676 | 0.3540 | 0.4063 | 0.3352 | 0.3304 | 0.2682 | 0.3440 |
| Entertainment | 0.3647 | 0.4361 | 0.3678 | 0.3148 | 0.3375 | 0.2957 | 0.2017 | 0.3312 |
| Fashion & Beauty | 0.4606 | 0.2524 | 0.2972 | 0.7193 | 0.2466 | 0.2042 | 0.2031 | 0.3405 |
| Finance & Business | 0.5336 | 0.5099 | 0.4514 | 0.4132 | 0.4741 | 0.4145 | 0.3560 | 0.4504 |
| Food & Dining | 0.3283 | 0.4419 | 0.2782 | 0.4174 | 0.3610 | 0.3927 | 0.2714 | 0.3558 |
| Games | 0.3993 | 0.3887 | 0.3352 | 0.3569 | 0.3402 | 0.2766 | 0.3006 | 0.3425 |
| Hardware | 0.3652 | 0.4147 | 0.3096 | 0.3402 | 0.3536 | 0.3494 | 0.2466 | 0.3399 |
| Health | 0.5249 | 0.4493 | 0.4711 | 0.4308 | 0.4573 | 0.4635 | 0.3295 | 0.4466 |
| History | 0.4554 | 0.3914 | 0.4786 | 0.3552 | 0.4030 | 0.4183 | 0.2886 | 0.3986 |
| Home & Hobbies | 0.5712 | 0.5235 | 0.4681 | 0.5194 | 0.4561 | 0.5311 | 0.3646 | 0.4906 |
| Industrial | 0.3793 | 0.3122 | 0.2978 | 0.2871 | 0.3262 | 0.3320 | 0.2427 | 0.3110 |
| Literature | 0.4868 | 0.4148 | 0.4664 | 0.4613 | 0.4066 | 0.3810 | 0.3124 | 0.4185 |
| Religion | 0.4255 | 0.3798 | 0.4703 | 0.4472 | 0.4356 | 0.3587 | 0.3024 | 0.4028 |
| Science & Tech | 0.4536 | 0.4062 | 0.4214 | 0.3666 | 0.3625 | 0.3727 | 0.3085 | 0.3845 |
| Social Life | 0.3659 | 0.2996 | 0.3496 | 0.1963 | 0.3016 | 0.2866 | 0.2116 | 0.2873 |
| Software | 0.6679 | 0.5167 | 0.4821 | 0.4567 | 0.4421 | 0.5523 | 0.4757 | 0.5134 |
| Software Dev. | 0.4561 | 0.4504 | 0.4264 | 0.4218 | 0.4143 | 0.3819 | 0.3318 | 0.4118 |
| Sports & Fitness | 0.2563 | 0.3004 | 0.2731 | 0.2597 | 0.2640 | 0.3216 | 0.2560 | 0.2759 |
| Transportation | 0.3840 | 0.4026 | 0.4313 | 0.2901 | 0.2744 | 0.3692 | 0.1880 | 0.3342 |
| Travel | 0.5568 | 0.3714 | 0.4204 | 0.3798 | 0.4060 | 0.4231 | 0.1939 | 0.3931 |

Table 8: Model performance across thematic categories.

## Appendix C Source Article List

Table 9: Blocked Articles

| Idx | Title | Authors |
| --- | --- | --- |
| 1 | [The Local Land Finance Transformation with the Synergy of Increment and Inventory: A Case Study in China](https://www.mdpi.com/2073-445X/11/9/1529) | Yuzhe Wu; Huiqiong Zhu; Sheng Zheng |
| 2 | [South Asia’s unprotected poor: A systematic review of why social protection programs fail to reach their potential](https://journals.plos.org/globalpublichealth/article?id=10.1371/journal.pgph.0002710) | Warda Javed; Zubia Mumtaz |
| 3 | [Digital-Based Policy and Health Promotion Policy in Japan, the Republic of Korea, Singapore, and Thailand: A Scoping Review of Policy Paths to Healthy Aging](https://www.mdpi.com/1660-4601/19/24/16995) | Nadila Mulati; Myo Nyein Aung; Malcolm Field; Eun Woo Nam; Carol Ma Hok Ka; Saiyud Moolphate; Hocheol Lee; Yuki Goto; Nam Hae Kweun; Takumi Suda; Yuka Koyanagi; Yuiko Nagamine; Motoyuki Yuasa |
| 4 | [Protection Gaps in Insurance for Natural Hazards and Retirement Savings in Asia](https://www.oecd.org/en/publications/protection-gaps-in-insurance-for-natural-hazards-and-retirement-savings-in-asia_294f044e-en.html) | OECD |
| 5 | [How Many Stocks Are Sufficient for Equity Portfolio Diversification? A Review of the Literature](https://www.mdpi.com/1911-8074/14/11/551) | Azra Zaimovic; Adna Omanovic; Almira Arnaut-Berilo |
| 6 | [To Enhance the Credibility of the Green Bond Market through Regulating GBERs: The Case of China](https://www.mdpi.com/2075-471X/12/6/91) | Xiayang Chen; Weiqiu Long |
| 7 | [Sovereign wealth funds and corporate social responsibility: a comparison of Norway’s Government Pension Fund Global and Abu Dhabi Fund for Development](https://doi.org/10.1108/PAP-08-2020-0037) | Sivakumar Velayutham; Rashedul Hasan |
| 8 | [Gold and silver as safe havens: A fractional integration and cointegration analysis](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0282631) | Guglielmo Maria Caporale; Luis Alberiko Gil-Alana |
| 9 | [Is this time really different? Flight-to-safety and the COVID-19 crisis](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0251752) | Celina Löwen; Bilal Kchouri; Thorsten Lehnert |
| 10 | [The Role of Deep Learning in Financial Asset Management: A Systematic Review](https://arxiv.org/abs/2503.01591) | Pedro Dias Reis; Ana Paula Serra; João Gama |
| 11 | [A Review of Micro-Based Systemic Risk Research from Multiple Perspectives](https://www.mdpi.com/1099-4300/22/7/711) | Xiao Bai; Huaping Sun; Shibao Lu; Farhad Taghizadeh-Hesary |
| 12 | [Enhancing portfolio management using artificial intelligence: literature review](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2024.1371502/full) | Kristina Sutiene; Peter Schwendner; Ciprian Sipos; Luis Lorenzo; Miroslav Mirchev; Petre Lameski; Audrius Kabasinskas; Chemseddine Tidjani; Belma Ozturkkal; Jurgita Cerneviciene |
| 13 | [Autonomous Forklifts: State of the Art—Exploring Perception, Scanning Technologies and Functional Systems—A Comprehensive Review](https://www.mdpi.com/2079-9292/14/1/153) | Muftah A Fraifer; Joseph Coleman; James Maguire; Petar Trslić; Gerard Dooly; Daniel Toal |
| 14 | [Artificial Intelligence in Auditing: A Conceptual Framework for Auditing Practices](https://www.mdpi.com/2076-3387/14/10/238) | Diogo Leocádio; Luís Malheiro; João Reis |
| 15 | [Navigating Governmental Choices: A Comprehensive Review of Artificial Intelligence’s Impact on Decision-Making](https://www.mdpi.com/2227-9709/11/3/64) | Gustavo Caiza; Verónica Sanguña; Natalia Tusa; Violeta Masaquiza; Alexandra Ortiz; Marcelo V. Garcia |
| 16 | [Machine Learning-Based Methods for Materials Inverse Design: A Review](https://www.techscience.com/cmc/v82n2/59511) | Yingli Liu; Yuting Cui; Haihe Zhou; Sheng Lei; Haibin Yuan; Tao Shen; Jiancheng Yin |
| 17 | [Recent advances and applications of deep learning methods in materials science](https://www.nature.com/articles/s41524-022-00734-6) | Kamal Choudhary; Brian DeCost; Chi Chen; Anubhav Jain; Francesca Tavazza; Ryan Cohn; Cheol Woo Park; Alok Choudhary; Ankit Agrawal; Simon J. L. Billinge; Elizabeth Holm; Shyue Ping Ong; Chris Wolverton |
| 18 | [Horizontal Gene Transfers in Plants](https://www.mdpi.com/2075-1729/11/8/857) | Emilie Aubin; Moaine El Baidouri; Olivier Panaud |
| 19 | [Effects and Influence of External Electric Fields on the Equilibrium Properties of Tautomeric Molecules](https://www.mdpi.com/1420-3049/28/2/695) | Ivan Angelov; Lidia Zaharieva; Liudmil Antonov |
| 20 | [The Magnetic Compass of Birds: The Role of Cryptochrome](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2021.667000/full) | Roswitha Wiltschko; Christine Nießner; Wolfgang Wiltschko |
| 21 | [Animal navigation: how animals use environmental factors to find their way](https://link.springer.com/article/10.1140/epjs/s11734-022-00610-w) | Roswitha Wiltschko; Wolfgang Wiltschko |
| 22 | [Life Cycle Cost Assessment of Electric Vehicles: A Review and Bibliometric Analysis](https://www.mdpi.com/2071-1050/12/6/2387) | Bamidele Victor Ayodele; Siti Indati Mustapa |
| 23 | [Technological Advances and Market Developments of Solid-State Batteries: A Review](https://www.mdpi.com/1996-1944/17/1/239) | Felix Thomas; Lauren Mahdi; Julien Lemaire; Diogo M. F. Santos |
| 24 | [A Comprehensive Review on Cislunar Expansion and Space Domain Awareness](https://arxiv.org/abs/2408.03261) | Brian Baker-McEvilly; Surabhi Bhadauria; David Canales; Carolin Frueh |
| 25 | [Organic Compounds as Corrosion Inhibitors for Carbon Steel in HCl Solution: A Comprehensive Review](https://www.mdpi.com/1996-1944/15/6/2023) | Liangyuan Chen; Dongzhu Lu; Yanhu Zhang |
| 26 | [A Review of Inorganic Corrosion Inhibitors: Types, Mechanisms, and Applications](https://www.researchgate.net/publication/371675999_A_Review_of_Inorganic_Corrosion_Inhibitors_Types_Mechanisms_and_Applications) | Ahmed A. Al-Amiery; Emad Yousif; Wan Nor Roslam Wan Isahak; Waleed Khalid Al-Azzawi |
| 27 | [Stock Assessment of Chub Mackerel (Scomber japonicus) in the Northwest Pacific Using a Multi-Model Approach](https://www.mdpi.com/2410-3888/8/2/80) | Kai Cai; Richard Kindong; Qiuyun Ma; Siquan Tian |
| 28 | [Comprehensive Review for Energy Recovery Technologies Used in Water Distribution Systems Considering Their Performance, Technical Challenges, and Economic Viability](https://www.mdpi.com/2073-4441/16/15/2129) | Admitos A. Bideris-Davos; Panagis N. Vovos |
| 29 | [Integrated Photonic Platforms for Quantum Technology: A Review](https://arxiv.org/abs/2206.15383) | Rohit K Ramakrishnan; Aravinth Balaji Ravichandran; Arpita Mishra; Archana Kaushalram; Gopalkrishna Hegde; Srinivas Talabattula; Peter P Rohde |
| 30 | [Empowering PET: harnessing deep learning for improved clinical insight](https://eurradiolexp.springeropen.com/articles/10.1186/s41747-023-00413-1) | Alessia Artesani; Alessandro Bruno; Fabrizia Gelardi; Arturo Chiti |
| 31 | [State-of-the-Art Mobile Radiation Detection Systems for Different Scenarios](https://www.mdpi.com/1424-8220/21/4/1051) | Luís Marques; Alberto Vale; Pedro Vaz |
| 32 | [Lithium Niobate Single Crystals and Powders Reviewed—Part I](https://www.mdpi.com/2073-4352/10/11/973) | Oswaldo Sánchez-Dena; Cesar David Fierro-Ruiz; Sergio David Villalobos-Mendoza; Diana María Carrillo Flores; José Trinidad Elizalde-Galindo; Rurik Farías |
| 33 | [Quantum Simulators: Architectures and Opportunities](https://arxiv.org/abs/1912.06938) | Ehud Altman; Kenneth R. Brown; Giuseppe Carleo; Lincoln D. Carr; Eugene Demler; Cheng Chin; Brian DeMarco; Sophia E. Economou; Mark A. Eriksson; Kai-Mei C. Fu; Markus Greiner; Kaden R. A. Hazzard; Randall G. Hulet; Alicia J. Kollar; Benjamin L. Lev; Mikhail D. Lukin; Ruichao Ma; Xiao Mi; Shashank Misra; Christopher Monroe; Kater Murch; Zaira Nazario; Kang-Kuen Ni; Andrew C. Potter; Pedram Roushan; Mark Saffman; Monika Schleier-Smith; Irfan Siddiqi; Raymond Simmonds; Meenakshi Singh; I. B. Spielman; Kristan Temme; David S. Weiss; Jelena Vuckovic; Vladan Vuletic; Jun Ye; Martin Zwierlein |
| 34 | [A Survey of Open-Source UAV Autopilots](https://www.mdpi.com/2079-9292/13/23/4785) | Nourdine Aliane |
| 35 | [A Review on Comparative Remarks, Performance Evaluation and Improvement Strategies of Quadrotor Controllers](https://www.mdpi.com/2227-7080/9/2/37) | Rupal Roy; Maidul Islam; Nafiz Sadman; M. A. Parvez Mahmud; Kishor Datta Gupta; Md Manjurul Ahsan |
| 36 | [Towards European standards for quantum technologies](https://epjquantumtechnology.springeropen.com/articles/10.1140/epjqt/s40507-022-00150-1) | Oskar van Deventer; Nicolas Spethmann; Marius Loeffler; Michele Amoretti; Rob van den Brink; Natalia Bruno; Paolo Comi; Noel Farrugia; Marco Gramegna; Andreas Jenet; Ben Kassenberg; Wojciech Kozlowski; Thomas Länger; Tobias Lindstrom; Vicente Martin; Niels Neumann; Homer Papadopoulos; Saverio Pascazio; Momtchil Peev; Richard Pitwon; M. Adriaan Rol; Paolo Traina; Pim Venderbosch; Frank K. Wilhelm-Mauch |
| 37 | [Self-testing of quantum systems: a review](https://arxiv.org/abs/1904.10042) | Ivan Šupić; Joseph Bowles |
| 38 | [A Review of Environmental Control Strategies and Models for Modern Agricultural Greenhouses](https://www.mdpi.com/1424-8220/25/5/1388) | Shuailiang Chen; Aolong Liu; Fei Tang; Pei Hou; Yanli Lu; Pei Yuan |
| 39 | [Non-Contact Vision-Based Techniques of Vital Sign Monitoring: Systematic Review](https://www.mdpi.com/1424-8220/24/12/3963) | Linas Saikevičius; Vidas Raudonis; Gintaras Dervinis; Virginijus Baranauskas |
| 40 | [A Survey on Secure WiFi Sensing Technology: Attacks and Defenses](https://www.mdpi.com/1424-8220/25/6/1913) | Xingyu Liu; Xin Meng; Hancong Duan; Ze Hu; Min Wang |
| 41 | [Modelling in low-code development: a multi-vocal systematic review](https://link.springer.com/article/10.1007/s10270-021-00964-0) | Alessio Bucaioni; Antonio Cicchetti; Federico Ciccozzi |
| 42 | [Democratizing Digital Transformation: A Multisector Study of Low-Code Adoption Patterns, Limitations, and Emerging Paradigms](https://www.mdpi.com/2076-3417/15/12/6481) | Zhengwu Shi; Junyu Dong; Yanhai Gan |
| 43 | [A Survey on Population-Based Deep Reinforcement Learning](https://www.mdpi.com/2227-7390/11/10/2234) | Weifan Long; Taixian Hou; Xiaoyi Wei; Shichao Yan; Peng Zhai; Lihua Zhang |
| 44 | [Convex Optimization for Trajectory Generation: A Tutorial On Generating Dynamically Feasible Trajectories Reliably And Efficiently](http://ieeexplore.ieee.org/document/9905530) | Danylo Malyuta; Taylor P. Reynolds; Michael Szmuk; Thomas Lew; Riccardo Bonalli; Marco Pavone; Behçet Açıkmeşe |
| 45 | [A survey of Kubernetes scheduling algorithms](https://journalofcloudcomputing.springeropen.com/articles/10.1186/s13677-023-00471-1) | Khaldoun Senjab; Sohail Abbas; Naveed Ahmed; Atta ur Rehman Khan |
| 46 | [Auto-Scaling Techniques in Cloud Computing: Issues and Research Directions](https://www.mdpi.com/1424-8220/24/17/5551) | Saleha Alharthi; Afra Alshamsi; Anoud Alseiari; Abdulmalik Alwarafy |
| 47 | [A Survey on Observability of Distributed Edge & Container-Based Microservices](https://ieeexplore.ieee.org/document/9837035/) | Usman, M.; Ferlin, S.; Brunstrom, A.; Taheri, J. |
| 48 | [Big Loop and Atomization: A Holistic Review on the Expansion Capabilities of Large Language Models](https://www.mdpi.com/2076-3417/15/17/9466) | Zefa Hu; Yi Huang; Junlan Feng; Chao Deng |
| 49 | [HTTP Adaptive Streaming: A Review on Current Advances and Future Challenges](https://dl.acm.org/doi/10.1145/3736306) | Christian Timmerer; Hadi Amirpour; Farzad Tashtarian; Samira Afzal; Amr Rizk; Michael Zink; Hermann Hellwagner |
| 50 | [A Survey on Mobile Edge Computing for Video Streaming: Opportunities and Challenges](https://arxiv.org/abs/2209.05761) | MUHAMMAD ASIF KHAN; EMNA BACCOUR; ZINA CHKIRBENE; AIMAN ERBAD; RIDHA HAMILA; MOUNIR HAMDI; MONCEF GABBOUJ |
| 51 | [Evolution of Popularity and Multiaspectual Comparison of Widely Used Web Development Frameworks](https://www.mdpi.com/2079-9292/12/17/3563) | Jakub Swacha; Artur Kulpa |
| 52 | [Shaping the Future of Education: Exploring the Potential and Consequences of AI and ChatGPT in Educational Settings](https://www.mdpi.com/2227-7102/13/7/692) | Simone Grassini |
| 53 | [The Evolving Classroom: How Learning Analytics Is Shaping the Future of Education and Feedback Mechanisms](https://www.mdpi.com/2227-7102/14/2/176) | Hanan Sharif; Amara Atif |
| 54 | [AI-Integrated Scaffolding to Enhance Agency and Creativity in K-12 English Language Learners: A Systematic Review](https://www.mdpi.com/2078-2489/16/7/519) | Molly Li; Joshua Wilson |
| 55 | [Social Protection in the Cultural and Creative Sector: Country Practices and Innovations](https://socialprotection-humanrights.org/resource/social-protection-in-the-cultural-and-creative-sectorcountry-practices-and-innovations/) | Carlos Galian; Margherita Licata; Maya Stern-Plaza |
| 56 | [Impacts of generative artificial intelligence on the future of labor market: A systematic review](https://www.sciencedirect.com/science/article/pii/S2451958825000673) | Nader Salari; Mahan Beiromvand; Amin Hosseinian-Far; Javad Habibi; Fateme Babajani; Masoud Mohammadi |
| 57 | [A Systematic Review of Industry 4.0 Technology on Workforce Employability and Skills: Driving Success Factors and Challenges in South Asia](https://www.mdpi.com/2227-7099/12/2/35) | Md. Tota Miah; Szilvia Erdei-Gally; Anita Dancs; Mária Fekete-Farkas |
| 58 | [A systematic review of the effectiveness of online learning in higher education during the COVID-19 pandemic period](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1334153/full) | Wentao Meng; Lei Yu; Chen Liu; Nengchao Pan; Xiawen Pang; Yunyun Zhu |
| 59 | [ChatGPT in Teaching and Learning: A Systematic Review](https://www.mdpi.com/2227-7102/14/6/643) | Duha Ali; Yasin Fatemi; Elahe Boskabadi; Mohsen Nikfar; Jude Ugwuoke; Haneen Ali |
| 60 | [A Scoping Review of School-Based Strategies for Addressing Anxiety, Intolerance of Uncertainty and Prediction in Autistic Pupils](https://www.mdpi.com/2227-7102/13/6/575) | Anne Emerson; Debra Costley |
| 61 | [A systematic review of AI-driven intelligent tutoring systems (ITS) in K-12 education](https://www.nature.com/articles/s41539-025-00320-7) | Angélique Létourneau; Marion Deslandes Martineau; Patrick Charland; John Alexander Karran; Jared Boasen; Pierre Majorique Léger |
| 62 | [Effectiveness of salt substitute on cardiovascular outcomes: A systematic review and meta-analysis](https://pubmed.ncbi.nlm.nih.gov/36196475/) | Yi-Ching Tsai; Yen-Po Tsao; Chi-Jung Huang; Yen-Hsuan Tai; Yang-Chin Su; Chern-En Chiang; Shih-Hsien Sung; Chen-Huan Chen; Hao-Min Cheng |
| 63 | [Mitochondrial Metabolism in T-Cell Exhaustion](https://www.mdpi.com/1422-0067/26/15/7400) | Fei Li; Yu Feng; Zesheng Yin; Yahong Wang |
| 64 | [The current state and future of T-cell exhaustion research](https://pubmed.ncbi.nlm.nih.gov/37554723/) | Edward Jenkins; Toby Whitehead; Martin Fellermeyer; Simon J Davis; Sumana Sharma |
| 65 | [Zinc in Cardiovascular Functions and Diseases: Epidemiology and Molecular Mechanisms for Therapeutic Development](https://pubmed.ncbi.nlm.nih.gov/37108314/) | Takafumi Hara; Emi Yoshigai; Takuto Ohashi; Toshiyuki Fukada |
| 66 | [The Interplay Between the Gut Microbiota and Colorectal Cancer: A Review of the Literature](https://www.mdpi.com/2076-2607/13/6/1410) | Marco Cintoni; Marta Palombaro; Eleonora Zoli; Giuseppe D’Agostino; Gabriele Pulcini; Elena Leonardi; Pauline Raoul; Emanuele Rinninella; Flavio De Maio; Esmeralda Capristo; Antonio Gasbarrini; Maria Cristina Mele |
| 67 | [Impact of N6-methyladenosine (m6A) modification on immunity](https://www.researchgate.net/publication/363416511_Impact_of_N6-methyladenosine_m6A_modification_on_immunity) | Raghda A. Elsabbagh; Mona Rady; Carsten Watzl; Khaled Abou-Aisha; Mohamed Z. Gad |
| 68 | [AI-Supported Shared Decision-Making (AI-SDM): Conceptual Framework](https://pubmed.ncbi.nlm.nih.gov/40773762/) | Mohammed As’ad; Nawarh Faran; Hala Joharji |
| 69 | [A Scoping Review of AI-Driven Digital Interventions in Mental Health Care: Mapping Applications Across Screening, Support, Monitoring, Prevention, and Clinical Education](https://www.mdpi.com/2227-9032/13/10/1205) | Yang Ni; Fanli Jia |
| 70 | [Digital twins for health: a scoping review](https://pubmed.ncbi.nlm.nih.gov/38519626/) | Evangelia Katsoulakis; Qi Wang; Huanmei Wu; Leili Shahriyari; Richard Fletcher; Jinwei Liu; Luke Achenie; Hongfang Liu; Pamela Jackson; Ying Xiao; Tanveer Syeda-Mahmood; Richard Tuli; Jun Deng |
| 71 | [The Psychology of Conspiracy Theories](https://www.researchgate.net/publication/317401748_The_Psychology_of_Conspiracy_Theories) | Karen M. Douglas; Robbie M. Sutton; Aleksandra Cichocka |
| 72 | [Clinical Features of Parkinson’s Disease: The Evolution of Critical Symptoms](https://pubmed.ncbi.nlm.nih.gov/32438686/) | Csaba Váradi |
| 73 | [Knowledge Graphs for drug repurposing: a review of databases and methods](https://doi.org/10.1093/bib/bbae461) | Pablo Perdomo-Quinteiro; Alberto Belmonte-Hernández |
| 74 | [A Review of Open Research Data Policies and Practices in China](https://datascience.codata.org/articles/10.5334/dsj-2021-003) | Lili Zhang; Robert R. Downs; Jianhui Li; Liangming Wen; Chengzan Li |
| 75 | [Is a New Chinese Literary History Possible? A Critical Investigation of The Cambridge History of Chinese Literature](https://www.sciencedirect.com/org/science/article/pii/S2352133324000104) | Shen Yifan |
| 76 | [Special issue introduction: Towards a global history of international organizations and decolonization](https://www.cambridge.org/core/journals/journal-of-global-history/article/special-issue-introduction-towards-a-global-history-of-international-organizations-and-decolonization/066AFEF8CEA16E7F776CC7CFF72927CC) | Eva-Maria Muschik |
| 77 | [Transsexual Surgery in Egypt or the Suspicion of Homosexuality](https://hal.science/hal-05097583v1/document) | Corinne Fortier |
| 78 | [Anime in Academia: Representative Object, Media Form, and Japanese Studies](https://www.mdpi.com/2076-0752/7/4/56) | Jaqueline Berndt |
| 79 | [Toward More Inclusive Japanese Language Education: Incorporating an Awareness of Gender and Sexual Diversity among Students](https://jll.pitt.edu/ojs/JLL/article/view/129) | Jotaro Arimori |
| 80 | [Decolonization of Trauma and Memory Politics: Insights from Eastern Europe](https://www.mdpi.com/2076-0787/5/1/7) | Dovile Budryte |
| 81 | [A Review of Augmented Reality Applications for History Education and Heritage Visualisation](https://www.mdpi.com/2414-4088/3/2/39) | Jennifer Challenor; Minhua Ma |
| 82 | [Searching for the heritage of the Second Sino-Japanese War: A study on the site selection strategy of the defence industrial buildings of the National Resources Commission (1937–1945)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0311436) | Yangjie Wu |
| 83 | [Collective memory: between individual systems of consciousness and social systems](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1238272/full) | Jean-François Orianne; Francis Eustache |
| 84 | [The Policy Framework of Natural Resource Management in Oil-Dependence Countries](https://www.mdpi.com/2227-7099/9/1/25) | Basem Ertimi; Tamat Sarmidi; Norlin Khalid; Mohd Helmi Ali |
| 85 | [’A Continuous Retrial’: Trans/national Memory in Chinese and Japanese Tribunal Films](https://www.mdpi.com/2076-0752/9/1/2) | Amanda Weiss |
| 86 | [Selecting alternative metals for advanced interconnects](https://pubs.aip.org/aip/jap/article/136/17/171101/3318627/Selecting-alternative-metals-for-advanced) | Jean-Philippe Soulié; Kiroubanand Sankaran; Benoit Van Troeye; Alicja Leśniewska; Olalla Varela Pedreira; Herman Oprins; Gilles Delie; Claudia Fleischmann; Lizzie Boakes; Cédric Rolin; Lars-Åke Ragnarsson; Kristof Croes; Seongho Park; Johan Swerts; Geoffrey Pourtois; Zsolt Tőkei; Christoph Adelmann |
| 87 | [Materials Quest for Advanced Interconnect Metallization in Integrated Circuits](https://advanced.onlinelibrary.wiley.com/doi/10.1002/advs.202207321) | Jun Hwan Moon; Eunjin Jeong; Seunghyun Kim; Taesoon Kim; Eunsoo Oh; Keun Lee; Hauk Han; Young Keun Kim |
| 88 | [Recent Progress in Contact Engineering of Field-Effect Transistor Based on Two-Dimensional Materials](https://www.mdpi.com/2079-4991/12/21/3845) | Jialei Miao; Xiaowei Zhang; Ye Tian; Yuda Zhao |
| 89 | [The Determinants of PayTech’s Success in the Mobile Payment Market—The Case of BLIK](https://www.mdpi.com/1911-8074/14/9/422) | Joanna Błach; Monika Klimontowicz |
| 90 | [SRAM Cell Design Challenges in Modern Deep Sub-Micron Technologies: An Overview](https://www.mdpi.com/2072-666X/13/8/1332) | Waqas Gul; Maitham Shams; Dhamin Al-Khalili |
| 91 | [Design of High-Speed, Low-Power Sensing Circuits for Nano-Scale Embedded Memory](https://www.mdpi.com/1424-8220/24/1/16) | Sangheon Lee; Gwanwoo Park; Hanwool Jeong |
| 92 | [Role of Models in the Decision-Making Process in Integrated Urban Water Management: A Review](https://www.mdpi.com/2073-4441/13/9/1252) | Leila Mosleh; Masoud Negahban-Azar |
| 93 | [An In-Depth Study of Vibration Sensors for Condition Monitoring](https://www.mdpi.com/1424-8220/24/3/740) | Ietezaz Ul Hassan; Krishna Panduru; Joseph Walsh |
| 94 | [Household, neighbourhood and service provider risk factors for piped drinking-water intermittency in urban and peri-urban Zambia: A cross-sectional analysis](https://journals.plos.org/water/article?id=10.1371/journal.pwat.0000127) | Mair L. H. Thomas-Possee; Andrew A. Channon; Robert E. S. Bain; James A. Wright |
| 95 | [A review of emerging hydroforming technologies: design considerations, parametric studies, and recent innovations](https://jeas.springeropen.com/articles/10.1186/s44147-024-00546-z) | Satish Chinchanikar; Harsh Mulik; Param Varude; Sameer Atole; Neha Mundada |
| 96 | [A Review of the High-Mix, Low-Volume Manufacturing Industry](https://www.mdpi.com/2076-3417/13/3/1687) | Zhi Lon Gan; Siti Nurmaya Musa; Hwa Jen Yap |
| 97 | [The Influencers: Van Gogh Immersive Experiences and the Attention-Experience Economy](https://www.mdpi.com/2076-0752/11/5/90) | Kate Mondloch |
| 98 | [We Have No More Creators: Mary Lou Williams Performs the Jazz Canon](https://jjs.libraries.rutgers.edu/index.php/jjs/article/view/289) | Sarah Caissie Provost |
| 99 | [Televisuality on a Global Scale: Netflix’s Local-Language Strategy](https://www.cogitatiopress.com/mediaandcommunication/article/view/9356) | Frédérique Khazoom |
| 100 | [Copyright in Generative Deep Learning](https://arxiv.org/abs/2105.09266) | Giorgio Franceschelli; Mirco Musolesi |
| 101 | [Game Design as an Autonomous Research Subject](https://www.mdpi.com/2078-2489/12/9/367) | Pedro Pinto Neves; Nelson Zagalo |
| 102 | [The New Frontier of Esports and Gaming: A Scoping Meta-Review of Health Impacts and Research Agenda](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2021.640362/full) | Sarah Kelly; Janni Leung |
| 103 | [Distribution of the Burden of Proof in Autonomous Driving Tort Cases: Implications of the German Legislation for China](https://www.mdpi.com/2032-6653/15/7/305) | Zhihua Chen; Qianyi Cai; Hanbing Wei |
| 104 | [Historical development and current status of organ procurement from death-row prisoners in China](https://bmcmedethics.biomedcentral.com/articles/10.1186/s12910-015-0074-0) | Kirk C Allison; Arthur Caplan; Michael E Shapiro; Charl Els; Norbert W Paul; Huige Li |
| 105 | [A Survey of the Story Elements of Isekai Manga](https://iopn.library.illinois.edu/journals/jams/article/view/808) | Dr. Paul S. Price |
| 106 | [IP Adaptation Strategies in Film: A Case Study of Ne Zha 2 (2025)](https://www.mdpi.com/2076-0752/14/4/85) | Aixin Chen; Haodong Gu |
| 107 | [Urban Rail Transit in China: Progress Report and Analysis (2015–2023)](https://link.springer.com/article/10.1007/s40864-024-00231-7) | Kai Lu; Lei Zhang; Shen Li; Yunping Huang; Xiang Ding; Jingnan Hao; Siqi Huang; Xiaojuan Li; Fang Lu; Hongwei Zhang |
| 108 | [Pantograph-catenary electrical contact system of high-speed railways: recent progress, challenges, and outlooks](https://link.springer.com/article/10.1007/s40534-022-00281-2) | Guangning Wu; Keliang Dong; Zhilei Xu; Song Xiao; Wenfu Wei; Huan Chen; Jie Li; Zhanglin Huang; Jingwei Li; Guoqiang Gao; Guozheng Kang; Chuanjun Tu; Xingyi Huang |
| 109 | [Towards the Internet of Smart Trains: A Review on Industrial IoT-Connected Railways](https://www.mdpi.com/1424-8220/17/6/1457) | Paula Fraga-Lamas; Tiago M. Fernández-Caramés; Luis Castedo |
| 110 | [Physical activity and health in Chinese children and adolescents: expert consensus statement (2020)](https://pubmed.ncbi.nlm.nih.gov/32471813/) | Peijie Chen; Dengfeng Wang; Hongbing Shen; Lijuan Yu; Qian Gao; Lijuan Mao; Fan Jiang; Yaojia Luo; Minhao Xie; Yong Zhang; Lianshi Feng; Feng Gao; Yuling Wang; Yu Liu; Chunyan Luo; George P Nassis; Peter Krustrup; Barbara E Ainsworth; Peter A Harmer; Fuzhong Li |
| 111 | [Physical activity and sedentary behavior among school-going adolescents in low- and middle-income countries: insights from the global school-based health survey](https://peerj.com/articles/17097/) | Hui Li; Wenyu Zhang; Jin Yan |
| 112 | [Video Activity Recognition: State-of-the-Art](https://www.mdpi.com/1424-8220/19/14/3160) | Itsaso Rodríguez-Moreno; José María Martínez-Otzeta; Basilio Sierra; Igor Rodriguez; Ekaitz Jauregi |
| 113 | [AI-Driven Innovations in Software Engineering: A Review of Current Practices and Future Directions](https://www.mdpi.com/2076-3417/15/3/1344) | Mamdouh Alenezi; Mohammed Akour |
| 114 | [COMPETITION IN THE PROVISION OF CLOUD COMPUTING SERVICES](https://www.oecd.org/en/publications/competition-in-the-provision-of-cloud-computing-services_595859c5-en.html) | OECD |
| 115 | [In Search of Qi Immortality: A Study of Heshanggong’s Commentary on the Daodejing](https://www.mdpi.com/2077-1444/16/3/383) | Jenny Hung |
| 116 | [Phenomenology of Quranic Corporeality and Affect: A Concrete Sense of Being Muslim in the World](https://www.mdpi.com/2077-1444/14/7/827) | Valerie Gonzalez |
| 117 | [Is Emptiness Non-Empty? Jizang’s Conception of Buddha-Nature](https://www.mdpi.com/2077-1444/16/2/184) | Jenny Hung |
| 118 | [Mothers of a Nation: How Motherhood and Religion Intermingle in the Hebrew Bible](https://www.degruyterbrill.com/document/doi/10.1515/opth-2020-0012/html) | Claudia D. Bergmann |
| 119 | [Effects and perceptions of weather, climate, and climate change on outdoor recreation and nature-based tourism in the United States: A systematic review](https://journals.plos.org/climate/article?id=10.1371/journal.pclm.0000266) | Emily J. Wilkins; Lydia Horne |
| 120 | [Tourist distribution in Northern Mediterranean Basin countries: 2004–2020](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0293669) | Sabri Öz; Adnan Veysel Ertemel; Pınar Başar; Cemil Can Çoktuğ |
| 121 | [The Causality Analysis of Airports and Regional Economy: Empirical Evidence from Jiangsu Province in China](https://www.mdpi.com/2071-1050/14/7/4295) | Yang Bai; Cheng-Lung Wu |
| 122 | [Resilient and Sustainable Housing Models against Climate Change: A Review](https://www.mdpi.com/2071-1050/15/18/13544) | Michelle A. Ruíz; Yazmin L. Mack-Vergara |
| 123 | [Trends, Methods, Drivers, and Impacts of Housing Informalities (HI): A Systematic Literature Review](https://www.mdpi.com/2413-8851/9/4/101) | Rim Mrani; Hassan Radoine; Jérôme Chenal; Alanda Kamana |
| 124 |  |  |
| 125 | [Educational outcomes of recess in elementary school children: A mixed-methods systematic review](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0294340) | Erin K. Howie; Kristi L. Perryman; Joseph Moretta; Laura Cameron |
| 126 | [24-h Movement Guidelines and Overweight and Obesity Indicators in Toddlers, Children and Adolescents: A Systematic Review and Meta-Analysis](https://pubmed.ncbi.nlm.nih.gov/37184735/) | Adilson Marques; Rodrigo Ramirez-Campillo; Élvio Gouveia; Gerson Ferrari; Riki Tesler; Priscila Marconcin; Vânia Loureiro; João Martins; Hugo Sarmento |
| 127 | [Social and ethical impact of emotional AI advancement: the rise of pseudo-intimacy relationships and challenges in human interactions](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1410462/full) | Jie Wu |
| 128 | [Discussion on protein recommendations for supporting muscle and bone health in older adults: a mini review](https://pubmed.ncbi.nlm.nih.gov/38840697/) | Inge Groenendijk; Lisette C. P. G. M. de Groot; Inge Tetens; Pol Grootswagers |
| 129 | [Low-Alcohol and Nonalcoholic Wines: From Production to Cardiovascular Health, along with Their Economic Effects](https://www.mdpi.com/2306-5710/10/3/49) | Paula Silva |
| 130 | [Non-Nutritive Sweeteners and Their Implications on the Development of Metabolic Syndrome](https://pubmed.ncbi.nlm.nih.gov/30884834/) | Iryna Liauchonak; Bessi Qorri; Fady Dawoud; Yatin Riat; Myron R. Szewczuk |
| 131 | [Profile of Orthodontic Use across Demographics](https://pubmed.ncbi.nlm.nih.gov/38132429/) | Man Hung; Golnoush Zakeri; Sharon Su; Amir Mohajeri |
| 132 | [Management of Melasma: Laser and Other Therapies—Review Study](https://pubmed.ncbi.nlm.nih.gov/38592701/) | Badea Jiryis; Ohad Toledano; Emily Avitan-Hersh; Ziad Khamaysi |

## Appendix D Source Article Leakage Rate

As mentioned in the main text, we attempted to prevent the model from accessing source articles solely through the prompt, but we could not fully eliminate the possibility of the model viewing the source articles. Therefore, during the evaluation, we conducted a secondary check of the generated reports and calculated the leakage rate of the articles. The results are shown in the table below:

|  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Model | Qwen | Gemini-2.5 | OpenAI | Tongyi | Gemini-3 | Doubao | Perplexity | Grok | Avg. |
| Leakage Rate (%) | 13.20 | 4.54 | 2.67 | 2.32 | 1.90 | 1.64 | 0.85 | 0.24 | 3.64 |

Table 10: Source Article Leakage Rate by Model

The leakage rate for each model is non-zero. However, with the exception of Qwen, the leakage rates for the other models are all within 5%. Overall, the leakage rate is relatively low, indicating that the blocked list in the prompt has been somewhat effective in limiting access to source articles. The specific list of source articles is provided in Appendix [C](https://arxiv.org/html/2601.08536v3#A3 "Appendix C Source Article List ‣ DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports").

## Appendix E Prompt

We release the prompts used for task/rubric generation and for evaluation (rubric scoring) to enable reproducibility and independent analysis.

### E.1 Tasks and Rubrics Generation Prompt

I want to construct prompts that test current large language models’ deep research capability (“deepresearch”). We consider deepresearch to consist of three components: information recall, analysis, and presentation. Therefore, we will score along these three dimensions.
Concretely, we will take a portion of content from an existing article written by a human expert. You can regard this extracted portion as the “reference answer.” Next, we reverse-engineer a question from the “reference answer,” i.e., we summarize a task. The core of this task is the recall of information and data from the open internet. The model’s goal should be to, given this task, retrieve information across the entire internet and produce content that is as similar as possible to the human article—or to a specific part of it (e.g., a subsection or a table). In addition, you must generate a rubric from this “reference answer,” which will be used to evaluate the model’s output. The rubric has three dimensions: info_recall, analysis, and presentation.

•

info_recall evaluates whether the model has retrieved the factual information, data, and literature relevant to the task, and whether the retrieved information is correct.
•

analysis evaluates whether the model has appropriately analyzed the retrieved information to reach the conclusions required by the task, and whether those conclusions are similar to those in the human article (the difference between info_recall and analysis is analogous to the difference between facts and viewpoints).
•

presentation evaluates whether the model’s output format is correct, whether it meets the user’s formatting requirements, and whether the content presentation is appropriate.
In your output, you must also include a field named "blocked", whose content is the title and author(s) of the human reference article. This article must not be visible to the model when it generates answers.
Your final output must follow JSON format. See the example below:
Example 1:
[⬇](data:text/plain;base64,ewogICJ0YXNrIjogIlBsZWFzZSBjb21wbGV0ZSB0aGUgZm9sbG93aW5nIGFyb3VuZCB0aGUgbXVzZW9sb2dpc3QgUGV0ZXIgdmFuIE1lbnNjaDpcXG4xLiBPdXRsaW5lIGhpcyBsaWZlIHRyYWplY3RvcnksIGluY2x1ZGluZyBiaXJ0aCBpbmZvcm1hdGlvbiwgZWR1Y2F0aW9uLCBhY2FkZW1pYyBhcHBvaW50bWVudHMsIGFuZCBtYWpvciByb2xlcyBpbiBhY2FkZW1pYyBvcmdhbml6YXRpb25zLlxcbjIuIFN1bW1hcml6ZSBoaXMgdGhlb3JldGljYWwgY29udHJpYnV0aW9ucyB0byBtdXNlb2xvZ3ksIGNvdmVyaW5nIHRoZSBzZXZlbiB0cmFuc2l0aW9ucyBoZSBwcm9wb3NlZCwgaGlzIGNsYXNzaWZpY2F0aW9uIG9mIG11c2V1bSBvYmplY3RzLCB0aGUgY29uY2VwdHMgb2YgbXVzZWFsaWEgYW5kIG11c2VhbGlzYXRpb24sIGFuZCB0aGUga2V5IHBvaW50cyBvZiBoaXMgbXVzZXVtIG1hbmFnZW1lbnQgbW9kZWwuXFxuMy4gQW5hbHl6ZSBoaXMgcm9sZSBpbiB0aGUgaW50ZXJuYXRpb25hbCBtdXNlb2xvZ3kgY29tbXVuaXR5LCBlc3BlY2lhbGx5IGhpcyBhY2FkZW1pYyBjb25uZWN0aW9ucyB3aXRoIFpieW5layBTdHJhbnNreSBhbmQgSXZvIE1hcm9ldmljLCBhbmQgaGlzIHJvbGUgaW4gb3JnYW5pemF0aW9ucyBzdWNoIGFzIElDT0ZPTS5cXG40LiBFdmFsdWF0ZSBoaXMgaW1wYWN0IG9uIHRoZSBkaXNjaXBsaW5pemF0aW9uLCBwcm9mZXNzaW9uYWxpemF0aW9uLCBhbmQgc29jaWFsaXphdGlvbiBvZiBtdXNlb2xvZ3ksIGludGVncmF0aW5nIGhpcyBlZHVjYXRpb25hbCBwaGlsb3NvcGh5IGFuZCBwcmFjdGljZS5cXG41LiBQcm92aWRlIGEgY29tcGxldGUgbGlzdCBvZiBoaXMgbWFqb3Igd29ya3MgaW4gY2hyb25vbG9naWNhbCBvcmRlciwgZW5zdXJpbmcgdGhhdCBubyByZXByZXNlbnRhdGl2ZSB3b3JrIGlzIG9taXR0ZWQuXFxuVGhlIG91dHB1dCBtdXN0IGJlIHN0cnVjdHVyZWQgaW50byBmb3VyIHBhcnRzOiBCaW9ncmFwaHksIFBvaW50cyBvZiB2aWV3IG9uIG11c2VvbG9neSwgTWFpbiBXb3JrcywgYW5kIEFuYWx5c2lzLiIsCiAgInJ1YnJpYyI6IHsKICAgICJpbmZvX3JlY2FsbCI6IFsKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgdGhhdCBQZXRlciB2YW4gTWVuc2NoIHdhcyBib3JuIGluIDE5NDcgYW5kIGlzIER1dGNoLiIsCiAgICAgICJFeHBsaWNpdGx5IHN0YXRlIHRoYXQgUGV0ZXIgdmFuIE1lbnNjaCBiZWdhbiB0ZWFjaGluZyBhdCB0aGUgUmVpbndhcmR0IEFjYWRlbXkgaW4gQW1zdGVyZGFtIGluIDE5NzguIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgdGhhdCBQZXRlciB2YW4gTWVuc2NoIGJlY2FtZSBhIHNlbmlvciBsZWN0dXJlciBpbiB0aGVvcmV0aWNhbCBtdXNlb2xvZ3kgaW4gMTk4Mi4iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSB0aGF0IFBldGVyIHZhbiBNZW5zY2ggYmVjYW1lIGEgcHJvZmVzc29yIG9mIGN1bHR1cmFsIGhlcml0YWdlIGluIDIwMDYuIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgdGhhdCBQZXRlciB2YW4gTWVuc2NoIHJldGlyZWQgaW4gMjAxMS4iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSB0aGF0IFBldGVyIHZhbiBNZW5zY2ggY29tcGxldGVkIGhpcyBQaEQgYXQgdGhlIFVuaXZlcnNpdHkgb2YgWmFncmViLiIsCiAgICAgICJFeHBsaWNpdGx5IHN0YXRlIHRoYXQgUGV0ZXIgdmFuIE1lbnNjaOKAmXMgUGhEIHN1cGVydmlzb3IvY29sbGFib3JhdG9yIGluY2x1ZGVkIEl2byBNYXJvZXZpxIcuIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgdGhhdCBQZXRlciB2YW4gTWVuc2No4oCZcyBkb2N0b3JhbCByZXNlYXJjaCB3YXMgaW5mbHVlbmNlZCBieSB0aGUgdGhlb3J5IG9mIFpieW7Em2sgWi4gU3Ryw6Fuc2vDvS4iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSB0aGF0IFBldGVyIHZhbiBNZW5zY2ggc2VydmVkIGFzIElDT0ZPTSBwcmVzaWRlbnQgZnJvbSAxOTg5IHRvIDE5OTMuIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgdGhhdCBQZXRlciB2YW4gTWVuc2NoIGxvbmcgc2VydmVkIGFzIGEgYm9hcmQgbWVtYmVyIG9yIGFkdmlzb3Igb2YgSUNPRk9NLiIsCiAgICAgICJFeHBsaWNpdGx5IHN0YXRlIHRoYXQgdGhlIHRpdGxlIG9mIFBldGVyIHZhbiBNZW5zY2jigJlzIGRpc3NlcnRhdGlvbiBpcyDigJxUb3dhcmRzIGEgTWV0aG9kb2xvZ3kgb2YgTXVzZW9sb2d5LOKAnSBjb21wbGV0ZWQgaW4gMTk5Mi4iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSB0aGF0IFBldGVyIHZhbiBNZW5zY2ggZXN0YWJsaXNoZWQgYSB0ZWFjaGluZyBzeXN0ZW0gY29tYmluaW5nIHRoZW9yeSBhbmQgcHJhY3RpY2UgYXQgdGhlIFJlaW53YXJkdCBBY2FkZW15LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHNldmVuIHRyYW5zaXRpb25zIHByb3Bvc2VkIGJ5IFBldGVyIHZhbiBNZW5zY2g6IGZyb20gb2JqZWN0LWNlbnRyaWMgdG8gaW50ZXJwcmV0YXRpb24tY2VudHJpYy4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSBzZXZlbiB0cmFuc2l0aW9uczogZXhwYW5zaW9uIG9mIHRoZSBjb25jZXB0IG9mIG11c2V1bSBvYmplY3RzIHRvIGluY2x1ZGUgaW50YW5naWJsZSBoZXJpdGFnZSBhbmQgdGVjaG5pY2FsIG9iamVjdHMuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgc2V2ZW4gdHJhbnNpdGlvbnM6IGVtcGhhc2lzIG9uIGNvbnRleHR1YWwgcHJlc2VydmF0aW9uLCB2YWx1aW5nIG9yaWdpbmFsIGVudmlyb25tZW50cy4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSBzZXZlbiB0cmFuc2l0aW9uczogZGVjZW50cmFsaXphdGlvbiwgbW92aW5nIGZyb20gbmF0aW9uYWwgbXVzZXVtcyB0b3dhcmQgbG9jYWwgYW5kIGNvbW11bml0eSBtdXNldW1zLiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHNldmVuIHRyYW5zaXRpb25zOiBmcm9tIOKAnG11c2V1bSBvZiB0aGluZ3PigJ0gdG8g4oCcbXVzZXVtIG9mIGlkZWFzLOKAnSB3aXRoIGV4aGliaXRpb25zIGVtcGhhc2l6aW5nIGNvbmNlcHQgY29tbXVuaWNhdGlvbi4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSBzZXZlbiB0cmFuc2l0aW9uczogbWFuYWdlcmlhbCByYXRpb25hbGl6YXRpb24sIGVtcGxveWluZyBzeXN0ZW1hdGljIG1hbmFnZW1lbnQgbW9kZWxzLiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHNldmVuIHRyYW5zaXRpb25zOiBleHBhbnNpb24gb2YgdGhlIHNjb3BlIG9mIG11c2VhbGlzYXRpb24sIGluY2x1ZGluZyBjdWx0dXJhbCBhbmQgY29tbWVyY2lhbCBpbnN0aXR1dGlvbnMgd2l0aGluIGl0cyBhbWJpdC4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IFBldGVyIHZhbiBNZW5zY2jigJlzIGNsYXNzaWZpY2F0aW9uIG9mIG11c2V1bSBvYmplY3RzOiBhcnRpZmFjdHMuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgY2xhc3NpZmljYXRpb246IGRvY3VtZW50cy4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSBjbGFzc2lmaWNhdGlvbjogYm9va3MuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgY2xhc3NpZmljYXRpb246IGJ1aWxkaW5ncy4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSBjbGFzc2lmaWNhdGlvbjogbGl2aW5nIGVudGl0aWVzIGluIG11c2V1bSBlbnZpcm9ubWVudHMuIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgdGhhdCBQZXRlciB2YW4gTWVuc2NoIHVzZWQgdGhlIHRlcm0gbXVzZWFsaWEgdG8gcmVmZXIgdG8gbXVzZXVtIG9iamVjdHMuIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgdGhhdCBQZXRlciB2YW4gTWVuc2NoIHVzZWQgdGhlIHRlcm0gbXVzZWFsaXNhdGlvbiB0byByZWZlciB0byB0aGUgcHJvY2VzcyBvZiBiZWNvbWluZyBtdXNlYWxpemVkLiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgaGlzIG11c2V1bSBtYW5hZ2VtZW50IG1vZGVsOiBhbiBpbnB1dOKAk3Rocm91Z2hwdXTigJNvdXRwdXQgcHJvY2VzcyBwZXJzcGVjdGl2ZS4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSBtYW5hZ2VtZW50IG1vZGVs4oCZcyDigJxpbnRlcm5hbCBjb3VwbGluZ+KAnSAoY29vcmRpbmF0aW9uIGFtb25nIGFkbWluaXN0cmF0aW9uLCByZXNlYXJjaCwgY29sbGVjdGlvbnMsIGFuZCBkaXNzZW1pbmF0aW9uKS4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSBtYW5hZ2VtZW50IG1vZGVs4oCZcyDigJxleHRlcm5hbCBjb3VwbGluZ+KAnSAoaW50ZXJhY3Rpb24gd2l0aCBhdWRpZW5jZXMsIGNvbW11bml0aWVzLCBhbmQgbmV0d29ya3MpLiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5ODMg4oCcTmF0dXJhbCBoaXN0b3J5IG11c2V1bXMg4oCTIE5ldyBkaXJlY3Rpb25zLOKAnSBSZWlud2FyZHQgU3R1ZGllcyBpbiBNdXNlb2xvZ3kgMSwgcHAuIDU14oCTNjMuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk4NCDigJxTb2NpZXR5IOKAkyBvYmplY3Qg4oCTIG11c2VvbG9neSzigJ0gSUNPRk9NIFN0dWR5IFNlcmllcywgNiwgMTjigJMyMy4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSB3b3JrOiAxOTg0IOKAnENvbGxlY3RpbmcgdG9kYXkgZm9yIHRvbW9ycm93LOKAnSBJQ09GT00gU3R1ZHkgU2VyaWVzLCA3LCAyOeKAkzMyLiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5ODUg4oCcTXVzZW9sb2dpY2FsIHJlbGV2YW5jZSBvZiBtYW5hZ2VtZW50IHRlY2huaXF1ZXMs4oCdIGluIE1hbmFnZW1lbnQgbmVlZHMgb2YgbXVzZXVtIHBlcnNvbm5lbCwgUmVpbndhcmR0IFN0dWRpZXMgaW4gTXVzZW9sb2d5IDUsIHBwLiA54oCTMTUuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk4NSDigJxNdXNldW1zIGFuZCBhdXRoZW50aWNpdGllczogcHJvdm9jYXRpdmUgdGhvdWdodHMs4oCdIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDgsIDEz4oCTMjAuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk4NSDigJxUb3dhcmRzIGEgdHlwb2xvZ3kgb2YgY29waWVzLOKAnSBJQ09GT00gU3R1ZHkgU2VyaWVzLCA4LCAxMjPigJMxMjYuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk4NSDigJxPcmlnaW5hbHMgYW5kIFN1YnN0aXR1dGVzIGluIE11c2V1bXMs4oCdIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDksIDQ14oCTNTAuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk4NiDigJxNdXNlb2xvZ3kgYW5kIGlkZW50aXR5LOKAnSBJQ09GT00gU3R1ZHkgU2VyaWVzLCAxMCwgMjAx4oCTMjA5LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5ODYg4oCcTXVzZW9sb2d5IGFuZCBpZGVudGl0eTogY29tbWVudHMgYW5kIHZpZXdzLOKAnSBJQ09GT00gU3R1ZHkgU2VyaWVzLCAxMSwgMzfigJMzOS4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSB3b3JrOiAxOTg3IOKAnE11c2VvbG9naXN0cyBpbiBhIHRyYWluIHRvIEhlbHNpbmtpLOKAnSBJQ09GT00gU3R1ZHkgU2VyaWVzLCAxMywgNDfigJM1MS4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSB3b3JrOiAxOTg3IOKAnE11c2V1bXMgaW4gbW92ZW1lbnQs4oCdIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDEyLCAxN+KAkzIwLiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5ODcg4oCcTXVzw6llcyBlbiBtb3V2ZW1lbnQs4oCdIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDEyLCAyNeKAkzI5LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5ODgg4oCcTXVzZW9sb2d5IGFuZCBtdXNldW1zLOKAnSBJQ09NIE5ld3MsIDQxKDMpLCA14oCTMTAuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk4OCDigJxXaGF0IGNvbnRyaWJ1dGlvbiBoYXMgbXVzZW9sb2d5IHRvIG9mZmVyIHRvIHRoZSBkZXZlbG9waW5nIGNvdW50cmllcz/igJ0sIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDE0LCAxODHigJMxODUuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk4OSDigJxQcm9mZXNzaW9uYWxpemluZyB0aGUgTXVzZXMuIFRoZSBtdXNldW0gcHJvZmVzc2lvbiBpbiBtb3Rpb24s4oCdIEFtc3RlcmRhbTogQUhBIEJvb2tzLiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5ODkg4oCcRm9yZWNhc3Rpbmcg4oCTIGEgbXVzZW9sb2dpY2FsIHRvb2w/4oCdLCBJQ09GT00gU3R1ZHkgU2VyaWVzLCAxNiwgMTc14oCTMTc4LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5OTAg4oCcTWV0aG9kb2xvZ2ljYWwgbXVzZW9sb2d5OyBvciwgdG93YXJkcyBhIHRoZW9yeSBvZiBtdXNldW0gcHJhY3RpY2Us4oCdIGluIFBlYXJjZSwgUy4gKEVkLiksIE5ldyBSZXNlYXJjaCBpbiBNdXNldW0gU3R1ZGllcyAxLCBwcC4gMTQx4oCTMTU3LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5OTAg4oCcTXVzZW9sb2d5IGFuZCB0aGUgZW52aXJvbm1lbnQs4oCdIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDE3LCAxM+KAkzE0LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5OTEg4oCcSUNPRk9NIOKAmTkxIHN5bXBvc2l1bTogdGhlIGxhbmd1YWdlIG9mIGV4aGliaXRpb25zLOKAnSBJQ09GT00gU3R1ZHkgU2VyaWVzLCAxOSwgMTHigJMxMy4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSB3b3JrOiAxOTkyIOKAnE11c2VvbG9naWNhbCByZXNlYXJjaCzigJ0gTXVzZW9sb2dpY2FsIE5ld3MsIDE1LCA4LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5OTIg4oCcVG93YXJkcyBhIE1ldGhvZG9sb2d5IG9mIE11c2VvbG9neSzigJ0gUGhEIGRpc3NlcnRhdGlvbiwgVW5pdmVyc2l0eSBvZiBaYWdyZWIuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk5MiDigJxNdXNlb2xvZ2ljYWwgcmVzZWFyY2guIEN1cnJlbnQgYWZmYWlycyBpbiBtdXNlb2xvZ3ks4oCdIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDIxLCAz4oCTNC4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSB3b3JrOiAxOTkyIOKAnE11c2VvbG9naWNhbCByZXNlYXJjaCzigJ0gSUNPRk9NIFN0dWR5IFNlcmllcywgMjEsIDE54oCTMzMuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk5MiDigJxTdW1tYXJpZXMgb2YgSUNPRk9NIHN5bXBvc2lhIDE5NzbigJMxOTkxLOKAnSBJQ09GT00gU3R1ZHkgU2VyaWVzLCAyMSwgOTfigJMxMDEuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk5MyDigJxUb3dhcmRzIG11c2V1bXMgZm9yIGEgbmV3IGNlbnR1cnks4oCdIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDIyLCAxNeKAkzE5LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5OTMg4oCcSUNPRk9NIGFuZCB0aGUgYmFzaWMgcGFyYW1ldGVycyBpbiBtdXNlb2xvZ3ks4oCdIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDIyLCAxMDHigJMxMDMuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk5MyDigJxNYXN0ZXIgdGhlIGFydCBvZiBtdXNldW0gc3R1ZGllcyBpbiBBbXN0ZXJkYW0s4oCdIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDIyLCAxMTfigJMxMTguIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMTk5NCDigJxNdXNldW0gYW5hbHlzaXMgbW9kZWwg4oCTIGFuIG91dGxpbmUs4oCdIGluIFRoZW9yZXRpY2FsIE11c2VvbG9neSwgcHAuIDE4M+KAkzE4NCwgQW1zdGVyZGFtOiBSZWlud2FyZHQgQWNhZGVteS4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSB3b3JrOiAxOTk0IOKAnFRoZSBjaGFyYWN0ZXJpc3RpY3Mgb2YgZXhoaWJpdGlvbnMs4oCdIGluIFRoZW9yZXRpY2FsIE11c2VvbG9neSwgcHAuIDE4NeKAkzE5MiwgQW1zdGVyZGFtOiBSZWlud2FyZHQgQWNhZGVteS4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSB3b3JrOiAxOTk0IOKAnFRvd2FyZHMgYSBtZXRob2RvbG9neSBvZiBtdXNlb2xvZ3ks4oCdIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDIzLCA1OeKAkzY5LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDE5OTQg4oCcT2JqZWN0IOKAkyBkb2N1bWVudD8gU3VtbWFyeSBhbmQgZmluYWwgcmVtYXJrcyzigJ0gSUNPRk9NIFN0dWR5IFNlcmllcywgMjMsIDE5NeKAkzIwMy4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSB3b3JrOiAxOTk1IOKAnE1hZ3BpZXMgb24gTW91bnQgSGVsaWNvbj/igJ0sIElDT0ZPTSBTdHVkeSBTZXJpZXMsIDI1LCAxMzPigJMxMzguIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMjAwMCDigJxOaWV1d2UgVmlzaWVzIHZvb3IgZGUgMjFzdGUgZWV1dyzigJ0gTXVzZXVtdmlzaWUsIDI0KDEpLCBpaeKAk2l4LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDIwMDAg4oCcTXVzZW9sb2d5IGFzIGEgcHJvZmVzc2lvbizigJ0gSUNPTSBTdHVkeSBTZXJpZXMsIDgsIDIw4oCTMjEuIiwKICAgICAgIkV4cGxpY2l0bHkgbGlzdCB0aGUgd29yazogMjAwMSDigJxNdXNldW0gU3R1ZGllcyBpbiB0aGUgTmV0aGVybGFuZHMs4oCdIGluIFNjYWx0c2EsIE0uIChFZC4pLCBNdXNlb2xvZ3kgVG93YXJkcyB0aGUgMjFzdCBDZW50dXJ5LCBwcC4gMTQ24oCTMTQ5LiIsCiAgICAgICJFeHBsaWNpdGx5IGxpc3QgdGhlIHdvcms6IDIwMDMg4oCcVGhlIGNoYXJhY3RlcmlzdGljcyBvZiBleGhpYml0aW9ucyzigJ0gTXVzZXVtIEFrdHVlbGwsIDkyLCAzOTgw4oCTMzk4NS4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSB3b3JrOiAyMDAzIOKAnENvbnZlcmdlbmNlIGFuZCBkaXZlcmdlbmNlLiBNdXNldW1zIG9mIHNjaWVuY2UgYW5kIHRlY2hub2xvZ3kgaW4gaGlzdG9yaWNhbCBwZXJzcGVjdGl2ZSzigJ0gaW4gU2ltYXJkLCBDLiAoRWQuKSwgcHAuIDM0MuKAkzM1Mi4iLAogICAgICAiRXhwbGljaXRseSBsaXN0IHRoZSB3b3JrOiAyMDA0IOKAnE11c2VvbG9neSBhbmQgbWFuYWdlbWVudDogRW5lbWllcyBvciBmcmllbmRzPyBDdXJyZW50IHRlbmRlbmNpZXPigJ0gKGVuZHMgaGVyZSBhcyBpbiB0aGUgb3JpZ2luYWwpLiIKICAgIF0sCiAgICAiYW5hbHlzaXMiOiBbCiAgICAgICJFeHBsaWNpdGx5IGV4cGxhaW4gdGhhdCBoZSBjaG9zZSB0aGUgVW5pdmVyc2l0eSBvZiBaYWdyZWIgZm9yIFBoRCBzdHVkeSB1bmRlciB0aGUgaW5mbHVlbmNlIG9mIFN0csOhbnNrw70gYW5kIEl2byBNYXJvZXZpxIfigJlzIHNjaG9vbCwgYWltaW5nIHRvIHN5c3RlbWF0aXplIENlbnRyYWwgRXVyb3BlYW4gdGhlb3JldGljYWwgbXVzZW9sb2d5LiIsCiAgICAgICJFeHBsaWNpdGx5IGV4cGxhaW4gdGhhdCBoZSBkZXNpZ25lZCBjb3Vyc2VzIGNvbWJpbmluZyB0aGVvcnkgYW5kIHByYWN0aWNlIGF0IHRoZSBSZWlud2FyZHQgQWNhZGVteSB0byBlbmhhbmNlIHRoZSBzeXN0ZW1hdGl6YXRpb24gYW5kIG9wZXJhYmlsaXR5IG9mIHByb2Zlc3Npb25hbCB0cmFpbmluZyBpbiBtdXNlb2xvZ3kuIiwKICAgICAgIkV4cGxpY2l0bHkgZXhwbGFpbiB0aGF0IGhpcyBpbnRyb2R1Y3Rpb24gb2Yg4oCcbmV3IG11c2VvbG9neeKAnSByZXNwb25kZWQgdG8gdGhlIGdsb2JhbCB0cmVuZCBpbiB0aGUgMTk3MOKAkzgwcyB0b3dhcmQgc29jaWFsIGZ1bmN0aW9uIGFuZCBhdWRpZW5jZSBvcmllbnRhdGlvbi4iLAogICAgICAiRXhwbGljaXRseSBleHBsYWluIHRoYXQgaGlzIGludHJvZHVjdGlvbiBvZiDigJxzb2NpYWwgbXVzZW9sb2d54oCdIGVtcGhhc2l6ZWQgc29jaWFsIGluY2x1c2lvbiwgcGFydGljaXBhdG9yeSBsZWFybmluZywgYW5kIGNvbW11bml0eSBjb2xsYWJvcmF0aW9uLiIsCiAgICAgICJFeHBsaWNpdGx5IGV4cGxhaW4gdGhhdCBoaXMgcHJvcG9zYWwgb2Yg4oCcbWV0YW11c2VvbG9neeKAnSBhaW1lZCB0byBwcm9tb3RlIHJlZmxleGl2ZSBwb3NpdGlvbmluZyBvZiBtdXNlb2xvZ3kgYW5kIHRvIGNsYXJpZnkgZGlzY2lwbGluYXJ5IGJvdW5kYXJpZXMuIiwKICAgICAgIkV4cGxpY2l0bHkgZXhwbGFpbiB0aGF0IGR1cmluZyBoaXMgMTk4OeKAkzE5OTMgSUNPRk9NIHByZXNpZGVuY3kgaGUgc2hpZnRlZCB0aGUgb3JnYW5pemF0aW9u4oCZcyBmb2N1cyBmcm9tIGV4cGVyaWVuY2Ugc2hhcmluZyB0byB0aGVvcmV0aWNhbCByZXNlYXJjaCBhbmQgdGVybWlub2xvZ3kgc3RhbmRhcmRpemF0aW9uLiIsCiAgICAgICJFeHBsaWNpdGx5IGV4cGxhaW4gdGhhdCB0aGUgc2hpZnQgZnJvbSBvYmplY3QtY2VudHJpYyB0byBpbnRlcnByZXRhdGlvbi1jZW50cmljIGV4aGliaXRpb25zIHdhcyB0byBzdHJlbmd0aGVuIHRoZSBlZHVjYXRpb25hbCBmdW5jdGlvbiBvZiBtdXNldW1zLiIsCiAgICAgICJFeHBsaWNpdGx5IGV4cGxhaW4gdGhlIHJlbGF0aW9uIGJldHdlZW4gZXhwYW5kaW5nIG9iamVjdCBjb25jZXB0cyBhbmQgdGhlIGVudHJhbmNlIG9mIGludGFuZ2libGUgaGVyaXRhZ2UgaW50byBtdXNlb2xvZ2ljYWwgcmVzZWFyY2guIiwKICAgICAgIkV4cGxpY2l0bHkgZXhwbGFpbiB0aGUgcmVsYXRpb24gYmV0d2VlbiBkZWNlbnRyYWxpemF0aW9uIGFuZCB0aGUgcmlzZSBvZiBjb21tdW5pdHkvZWNvbXVzZXVtcy4iLAogICAgICAiRXhwbGljaXRseSBleHBsYWluIHRoZSByZWxhdGlvbiBiZXR3ZWVuIHRoZSBzaGlmdCB0byDigJxtdXNldW1zIG9mIGlkZWFz4oCdIGFuZCB0aGUgZW1lcmdlbmNlIG9mIGNvbmNlcHQgY29tbXVuaWNhdGlvbiBhbmQgdGhlbWUgY3VyYXRpb24uIiwKICAgICAgIkV4cGxpY2l0bHkgZXhwbGFpbiB0aGF0IGludHJvZHVjaW5nIHRoZSB0ZXJtcyBtdXNlYWxpYSBhbmQgbXVzZWFsaXNhdGlvbiBhaW1lZCB0byB1bmlmeSBkaXNjaXBsaW5hcnkgbGFuZ3VhZ2UgYW5kIGF2b2lkIGNvbmZsYXRpbmcgb2JqZWN0cyB3aXRoIHByb2Nlc3Nlcy4iLAogICAgICAiRXhwbGljaXRseSBleHBsYWluIHRoYXQgY29tYmluaW5nIG11c2VhbGlzYXRpb24gd2l0aCBzZW1pb3RpY3MgbWVhbnMgb2JqZWN0cyBnYWluIG5ldyBtZWFuaW5ncyB0aHJvdWdoIGRpc3BsYXkgb25jZSBpbnNpZGUgdGhlIG11c2V1bS4iLAogICAgICAiRXhwbGljaXRseSBleHBsYWluIHRoYXQg4oCcaW50ZXJuYWwgY291cGxpbmfigJ0gaW4gaGlzIG1hbmFnZW1lbnQgbW9kZWwgYWltcyB0byBlbmhhbmNlIGNvb3JkaW5hdGlvbiBhY3Jvc3MgYWRtaW5pc3RyYXRpb24sIHJlc2VhcmNoLCBjb2xsZWN0aW9ucywgYW5kIGRpc3NlbWluYXRpb24uIiwKICAgICAgIkV4cGxpY2l0bHkgZXhwbGFpbiB0aGF0IOKAnGV4dGVybmFsIGNvdXBsaW5n4oCdIGFpbXMgdG8gZm9zdGVyIGludGVyYWN0aW9uIGJldHdlZW4gbXVzZXVtcyBhbmQgY29tbXVuaXRpZXMvcHVibGljcy4iLAogICAgICAiRXhwbGljaXRseSBleHBsYWluIHRoYXQgZGV2ZWxvcGluZyBtYW5hZ2VtZW50IHRoZW9yeSB3aXRoaW4gSUNUT1AgYWltZWQgdG8gY3VsdGl2YXRlIG11c2V1bSBwcm9mZXNzaW9uYWxzIHdpdGggc3lzdGVtcyB0aGlua2luZy4iLAogICAgICAiRXhwbGljaXRseSBleHBsYWluIHdoeSBoZSBpcyBjYXRlZ29yaXplZCBhcyBhIOKAnHNlY29uZC1nZW5lcmF0aW9uIG11c2VvbG9naXN04oCdOiBpbmhlcml0aW5nIFN0csOhbnNrw73igJlzIHNjaWVudGlmaWMgZnJhbWV3b3JrIGFuZCBleHRlbmRpbmcgdGhlIG1ldGhvZG9sb2d5LiIsCiAgICAgICJFeHBsaWNpdGx5IGV4cGxhaW4gdGhhdCBoaXMgZWR1Y2F0aW9uYWwgY29udHJpYnV0aW9ucyBhdCB0aGUgUmVpbndhcmR0IEFjYWRlbXkgZGlyZWN0bHkgYWR2YW5jZWQgdGhlIHByb2Zlc3Npb25hbCB0cmFpbmluZyBvZiBtdXNldW0gcGVyc29ubmVsIGluIEV1cm9wZS4iLAogICAgICAiRXhwbGljaXRseSBleHBsYWluIHRoYXQgZW1waGFzaXppbmcgcHVibGljIHBhcnRpY2lwYXRpb24gaW4gaGlzIHRoZW9yZXRpY2FsIG1vZGVsIGFpbWVkIHRvIHByb21vdGUgdGhlIHNvY2lhbGl6YXRpb24gb2YgbXVzZXVtcy4iLAogICAgICAiRXhwbGljaXRseSBleHBsYWluIHRoZSBtZWNoYW5pc20gYnkgd2hpY2ggaGUgbGV2ZXJhZ2VkIElDT0ZPTSB0byBleHBhbmQgQ2VudHJhbCBFdXJvcGVhbiB0aGVvcnkgaW50byBhIGdsb2JhbCwgY3Jvc3MtcmVnaW9uYWwgZGlhbG9ndWUgbmV0d29yay4iCiAgICBdLAogICAgInByZXNlbnRhdGlvbiI6IFsKICAgICAgIlRoZSBhbnN3ZXIgbXVzdCBiZSBkaXZpZGVkIGludG8gZm91ciBwYXJ0czogQmlvZ3JhcGh5LCBQb2ludHMgb2YgdmlldyBvbiBtdXNlb2xvZ3ksIE1haW4gV29ya3MsIGFuZCBTeW50aGVzaXMvQW5hbHlzaXMuIiwKICAgICAgIkluIHRoZSBNYWluIFdvcmtzIHNlY3Rpb24sIHRoZSB3b3JrcyBtdXN0IGJlIHN0cmljdGx5IHByZXNlbnRlZCBpbiBjaHJvbm9sb2dpY2FsIG9yZGVyIGFuZCBjb3ZlciBhbGwgaXRlbXMgbGlzdGVkIGluIHRoZSBydWJyaWMuIiwKICAgICAgIkVhY2ggc2VjdGlvbiBtdXN0IGhhdmUgY2xlYXIgc3ViaGVhZGluZ3M7IGxhbmd1YWdlIG11c3QgYmUgcHJlY2lzZSBhbmQgbG9naWMgY29oZXJlbnQuIgogICAgXQogIH0sCiAgImJsb2NrZWQiOiBbCiAgICAgICJBIEhpc3Rvcnkgb2YgTXVzZW9sb2d5LCBCcnVubyBCcnVsb24gU29hcmVzIgogIF0KfQ==)
{
 ’’task’’: ’’Please complete the following around the museologist Peter van Mensch:\\n1. Outline his life trajectory, including birth information, education, academic appointments, and major roles in academic organizations.\\n2. Summarize his theoretical contributions to museology, covering the seven transitions he proposed, his classification of museum objects, the concepts of musealia and musealisation, and the key points of his museum management model.\\n3. Analyze his role in the international museology community, especially his academic connections with Zbynek Stransky and Ivo Maroevic, and his role in organizations such as ICOFOM.\\n4. Evaluate his impact on the disciplinization, professionalization, and socialization of museology, integrating his educational philosophy and practice.\\n5. Provide a complete list of his major works in chronological order, ensuring that no representative work is omitted.\\nThe output must be structured into four parts: Biography, Points of view on museology, Main Works, and Analysis.’’,
 ’’rubric’’: {
 ’’info_recall’’: [
 ’’Explicitly state that Peter van Mensch was born in 1947 and is Dutch.’’,
 ’’Explicitly state that Peter van Mensch began teaching at the Reinwardt Academy in Amsterdam in 1978.’’,
 ’’Explicitly state that Peter van Mensch became a senior lecturer in theoretical museology in 1982.’’,
 ’’Explicitly state that Peter van Mensch became a professor of cultural heritage in 2006.’’,
 ’’Explicitly state that Peter van Mensch retired in 2011.’’,
 ’’Explicitly state that Peter van Mensch completed his PhD at the University of Zagreb.’’,
 ’’Explicitly state that Peter van Mensch’s PhD supervisor/collaborator included Ivo Maroević.’’,
 ’’Explicitly state that Peter van Mensch’s doctoral research was influenced by the theory of Zbyněk Z. Stránský.’’,
 ’’Explicitly state that Peter van Mensch served as ICOFOM president from 1989 to 1993.’’,
 ’’Explicitly state that Peter van Mensch long served as a board member or advisor of ICOFOM.’’,
 ’’Explicitly state that the title of Peter van Mensch’s dissertation is “Towards a Methodology of Museology,” completed in 1992.’’,
 ’’Explicitly state that Peter van Mensch established a teaching system combining theory and practice at the Reinwardt Academy.’’,
 ’’Explicitly list the seven transitions proposed by Peter van Mensch: from object-centric to interpretation-centric.’’,
 ’’Explicitly list the seven transitions: expansion of the concept of museum objects to include intangible heritage and technical objects.’’,
 ’’Explicitly list the seven transitions: emphasis on contextual preservation, valuing original environments.’’,
 ’’Explicitly list the seven transitions: decentralization, moving from national museums toward local and community museums.’’,
 ’’Explicitly list the seven transitions: from “museum of things” to “museum of ideas,” with exhibitions emphasizing concept communication.’’,
 ’’Explicitly list the seven transitions: managerial rationalization, employing systematic management models.’’,
 ’’Explicitly list the seven transitions: expansion of the scope of musealisation, including cultural and commercial institutions within its ambit.’’,
 ’’Explicitly list Peter van Mensch’s classification of museum objects: artifacts.’’,
 ’’Explicitly list the classification: documents.’’,
 ’’Explicitly list the classification: books.’’,
 ’’Explicitly list the classification: buildings.’’,
 ’’Explicitly list the classification: living entities in museum environments.’’,
 ’’Explicitly state that Peter van Mensch used the term musealia to refer to museum objects.’’,
 ’’Explicitly state that Peter van Mensch used the term musealisation to refer to the process of becoming musealized.’’,
 ’’Explicitly list his museum management model: an input--throughput--output process perspective.’’,
 ’’Explicitly list the management model’s “internal coupling” (coordination among administration, research, collections, and dissemination).’’,
 ’’Explicitly list the management model’s “external coupling” (interaction with audiences, communities, and networks).’’,
 ’’Explicitly list the work: 1983 “Natural history museums -- New directions,” Reinwardt Studies in Museology 1, pp. 55--63.’’,
 ’’Explicitly list the work: 1984 “Society -- object -- museology,” ICOFOM Study Series, 6, 18--23.’’,
 ’’Explicitly list the work: 1984 “Collecting today for tomorrow,” ICOFOM Study Series, 7, 29--32.’’,
 ’’Explicitly list the work: 1985 “Museological relevance of management techniques,” in Management needs of museum personnel, Reinwardt Studies in Museology 5, pp. 9--15.’’,
 ’’Explicitly list the work: 1985 “Museums and authenticities: provocative thoughts,” ICOFOM Study Series, 8, 13--20.’’,
 ’’Explicitly list the work: 1985 “Towards a typology of copies,” ICOFOM Study Series, 8, 123--126.’’,
 ’’Explicitly list the work: 1985 “Originals and Substitutes in Museums,” ICOFOM Study Series, 9, 45--50.’’,
 ’’Explicitly list the work: 1986 “Museology and identity,” ICOFOM Study Series, 10, 201--209.’’,
 ’’Explicitly list the work: 1986 “Museology and identity: comments and views,” ICOFOM Study Series, 11, 37--39.’’,
 ’’Explicitly list the work: 1987 “Museologists in a train to Helsinki,” ICOFOM Study Series, 13, 47--51.’’,
 ’’Explicitly list the work: 1987 “Museums in movement,” ICOFOM Study Series, 12, 17--20.’’,
 ’’Explicitly list the work: 1987 “Musées en mouvement,” ICOFOM Study Series, 12, 25--29.’’,
 ’’Explicitly list the work: 1988 “Museology and museums,” ICOM News, 41(3), 5--10.’’,
 ’’Explicitly list the work: 1988 “What contribution has museology to offer to the developing countries?”, ICOFOM Study Series, 14, 181--185.’’,
 ’’Explicitly list the work: 1989 “Professionalizing the Muses. The museum profession in motion,” Amsterdam: AHA Books.’’,
 ’’Explicitly list the work: 1989 “Forecasting -- a museological tool?”, ICOFOM Study Series, 16, 175--178.’’,
 ’’Explicitly list the work: 1990 “Methodological museology; or, towards a theory of museum practice,” in Pearce, S. (Ed.), New Research in Museum Studies 1, pp. 141--157.’’,
 ’’Explicitly list the work: 1990 “Museology and the environment,” ICOFOM Study Series, 17, 13--14.’’,
 ’’Explicitly list the work: 1991 “ICOFOM ’91 symposium: the language of exhibitions,” ICOFOM Study Series, 19, 11--13.’’,
 ’’Explicitly list the work: 1992 “Museological research,” Museological News, 15, 8.’’,
 ’’Explicitly list the work: 1992 “Towards a Methodology of Museology,” PhD dissertation, University of Zagreb.’’,
 ’’Explicitly list the work: 1992 “Museological research. Current affairs in museology,” ICOFOM Study Series, 21, 3--4.’’,
 ’’Explicitly list the work: 1992 “Museological research,” ICOFOM Study Series, 21, 19--33.’’,
 ’’Explicitly list the work: 1992 “Summaries of ICOFOM symposia 1976--1991,” ICOFOM Study Series, 21, 97--101.’’,
 ’’Explicitly list the work: 1993 “Towards museums for a new century,” ICOFOM Study Series, 22, 15--19.’’,
 ’’Explicitly list the work: 1993 “ICOFOM and the basic parameters in museology,” ICOFOM Study Series, 22, 101--103.’’,
 ’’Explicitly list the work: 1993 “Master the art of museum studies in Amsterdam,” ICOFOM Study Series, 22, 117--118.’’,
 ’’Explicitly list the work: 1994 “Museum analysis model -- an outline,” in Theoretical Museology, pp. 183--184, Amsterdam: Reinwardt Academy.’’,
 ’’Explicitly list the work: 1994 “The characteristics of exhibitions,” in Theoretical Museology, pp. 185--192, Amsterdam: Reinwardt Academy.’’,
 ’’Explicitly list the work: 1994 “Towards a methodology of museology,” ICOFOM Study Series, 23, 59--69.’’,
 ’’Explicitly list the work: 1994 “Object -- document? Summary and final remarks,” ICOFOM Study Series, 23, 195--203.’’,
 ’’Explicitly list the work: 1995 “Magpies on Mount Helicon?”, ICOFOM Study Series, 25, 133--138.’’,
 ’’Explicitly list the work: 2000 “Nieuwe Visies voor de 21ste eeuw,” Museumvisie, 24(1), ii--ix.’’,
 ’’Explicitly list the work: 2000 “Museology as a profession,” ICOM Study Series, 8, 20--21.’’,
 ’’Explicitly list the work: 2001 “Museum Studies in the Netherlands,” in Scaltsa, M. (Ed.), Museology Towards the 21st Century, pp. 146--149.’’,
 ’’Explicitly list the work: 2003 “The characteristics of exhibitions,” Museum Aktuell, 92, 3980--3985.’’,
 ’’Explicitly list the work: 2003 “Convergence and divergence. Museums of science and technology in historical perspective,” in Simard, C. (Ed.), pp. 342--352.’’,
 ’’Explicitly list the work: 2004 “Museology and management: Enemies or friends? Current tendencies” (ends here as in the original).’’
 ],
 ’’analysis’’: [
 ’’Explicitly explain that he chose the University of Zagreb for PhD study under the influence of Stránský and Ivo Maroević’s school, aiming to systematize Central European theoretical museology.’’,
 ’’Explicitly explain that he designed courses combining theory and practice at the Reinwardt Academy to enhance the systematization and operability of professional training in museology.’’,
 ’’Explicitly explain that his introduction of “new museology” responded to the global trend in the 1970--80s toward social function and audience orientation.’’,
 ’’Explicitly explain that his introduction of “social museology” emphasized social inclusion, participatory learning, and community collaboration.’’,
 ’’Explicitly explain that his proposal of “metamuseology” aimed to promote reflexive positioning of museology and to clarify disciplinary boundaries.’’,
 ’’Explicitly explain that during his 1989--1993 ICOFOM presidency he shifted the organization’s focus from experience sharing to theoretical research and terminology standardization.’’,
 ’’Explicitly explain that the shift from object-centric to interpretation-centric exhibitions was to strengthen the educational function of museums.’’,
 ’’Explicitly explain the relation between expanding object concepts and the entrance of intangible heritage into museological research.’’,
 ’’Explicitly explain the relation between decentralization and the rise of community/ecomuseums.’’,
 ’’Explicitly explain the relation between the shift to “museums of ideas” and the emergence of concept communication and theme curation.’’,
 ’’Explicitly explain that introducing the terms musealia and musealisation aimed to unify disciplinary language and avoid conflating objects with processes.’’,
 ’’Explicitly explain that combining musealisation with semiotics means objects gain new meanings through display once inside the museum.’’,
 ’’Explicitly explain that “internal coupling” in his management model aims to enhance coordination across administration, research, collections, and dissemination.’’,
 ’’Explicitly explain that “external coupling” aims to foster interaction between museums and communities/publics.’’,
 ’’Explicitly explain that developing management theory within ICTOP aimed to cultivate museum professionals with systems thinking.’’,
 ’’Explicitly explain why he is categorized as a “second-generation museologist”: inheriting Stránský’s scientific framework and extending the methodology.’’,
 ’’Explicitly explain that his educational contributions at the Reinwardt Academy directly advanced the professional training of museum personnel in Europe.’’,
 ’’Explicitly explain that emphasizing public participation in his theoretical model aimed to promote the socialization of museums.’’,
 ’’Explicitly explain the mechanism by which he leveraged ICOFOM to expand Central European theory into a global, cross-regional dialogue network.’’
 ],
 ’’presentation’’: [
 ’’The answer must be divided into four parts: Biography, Points of view on museology, Main Works, and Synthesis/Analysis.’’,
 ’’In the Main Works section, the works must be strictly presented in chronological order and cover all items listed in the rubric.’’,
 ’’Each section must have clear subheadings; language must be precise and logic coherent.’’
 ]
 },
 ’’blocked’’: [
 ’’A History of Museology, Bruno Brulon Soares’’
 ]
}
Example 2:
[⬇](data:text/plain;base64,ewogICJ0YXNrIjogIkNvbmR1Y3QgYSBzdHVkeSBvbiBTUkFNIFNlbnNpbmcgQ2lyY3VpdHMgZm9yIE9mZnNldCBSZWR1Y3Rpb24sIGFuZCBwcm9kdWNlIHR3byBwYXJ0czpcXG5BKSBUZWNobmljYWwgc3VydmV5OiBpbiB0aGUgb3JkZXIgb2YgYXBwZWFyYW5jZSwgZW51bWVyYXRlIGVhY2ggdHlwZSBvZiBzZW5zZSBhbXBsaWZpZXIgKFNBKSBieSBuYW1lLCBjb3JlIG9mZnNldC1yZWR1Y3Rpb24gbWVjaGFuaXNtICh3aHkgaXQgcmVkdWNlcyBvZmZzZXQpLCBrZXkgc3RydWN0dXJhbCBwb2ludHMgKGluY2x1ZGluZyBjb21wb25lbnQgbWFrZXVwIC8gd2hldGhlciBleHRyYSBnZW5lcmF0b3JzIGFyZSByZXF1aXJlZCksIHJlcXVpcmVkIGNvbnRyb2wgc2lnbmFscywgYW5kIG1ham9yIGNvc3RzL3Jpc2tzIChlLmcuLCBzcGVlZCBkZWdyYWRhdGlvbiAvIHBvd2VyICYgYXJlYSBpbmNyZWFzZSAvIG1pc21hdGNoIHNlbnNpdGl2aXR5IC8gYml0LWxpbmUgZmxvYXRpbmcpLiBBbHNvIGFkZCBhIDEtMiBzZW50ZW5jZSB0cmFkZS1vZmYgc3VtbWFyeSBmb3IgZWFjaCBkZXNpZ24uXFxuQikgQ29tcGFyaXNvbiB0YWJsZTogcHJvZHVjZSBhIHRhYmxlIHRpdGxlZCBDb21wYXJpc29uIG9mIFNSQU0gc2Vuc2luZyBjaXJjdWl0IGRlc2lnbnMgd2l0aCBmaXhlZCBjb2x1bW5zIFtTdHJ1Y3R1cmUgfCBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSB8IENvbXBvbmVudHMgfCBDb250cm9sIFNpZ25hbHMgfCBMaW1pdGF0aW9uc107IHJvd3MgbXVzdCBmdWxseSBjb3ZlcjogVkxTQSwgQ0xTQSwgU1RTQSwgVkJTVFNBLCBWVFNBLCBIWVNBLVFaLCBUTVNBLCBWVFMtU0EsIENTQU9DLCBCUDJTUCwgQ0NOLVBQLCBPQ0NTQSwgU0FPQy4gQm90aCBwYXJ0cyBtdXN0IGF2b2lkIHZhZ3VlIHdvcmRpbmctaW5mb3JtYXRpb24gbXVzdCBiZSBwb3B1bGF0ZWQgaXRlbSBieSBpdGVtLlxcbk91dHB1dCBmb3JtYXQ6IGZpcnN0IHRoZSBUZWNobmljYWwgU3VydmV5IChsaXN0IGluIHRoZSBzcGVjaWZpZWQgb3JkZXIpLCB0aGVuIHRoZSBDb21wYXJpc29uIFRhYmxlICh3aXRoIHRoZSByZXF1aXJlZCBjb2x1bW4gaGVhZGVycyBhbmQgYWxsIHJvd3MpLiIsCiAgInJ1YnJpYyI6IHsKICAgICJpbmZvX3JlY2FsbCI6IFsKICAgICAgIkluIHRoZSB0ZWNobmljYWwgc3VydmV5LCBleHBsaWNpdGx5IHByb3ZpZGUgdGhlIGZ1bGwgbmFtZSBvZiBTVFNBIChTY2htaXR0IHRyaWdnZXLigJNiYXNlZCBTQSkuIiwKICAgICAgIkluIHRoZSBzdXJ2ZXksIGV4cGxpY2l0bHkgc3RhdGUgU1RTQeKAmXMgY29yZSBvZmZzZXQtcmVkdWN0aW9uIG1lY2hhbmlzbTog4oCcRHJpdmluZyBpbnRlcm5hbCBub2RlcyBvZiBWTFNBIChaVCBhbmQgWkMpLuKAnSIsCiAgICAgICJJbiB0aGUgc3VydmV5LCBleHBsaWNpdGx5IHN0YXRlIFNUU0HigJlzIG1haW4gY29zdCBpbmNsdWRlcyDigJxTcGVlZCBkZWdyYWRhdGlvbiBkdWUgdG8gc3RhY2su4oCdIiwKICAgICAgIkV4cGxpY2l0bHkgcHJvdmlkZSB0aGUgZnVsbCBuYW1lIG9mIFZCU1RTQSAoVm9sdGFnZS1Cb29zdGVkIFNUU0EpLiIsCiAgICAgICJFeHBsaWNpdGx5IHN0YXRlIFZCU1RTQeKAmXMgY29yZSBtZWNoYW5pc206IOKAnFNUU0EgKyBOZWdhdGl2ZSBCb29zdGluZyBWU1Mu4oCdIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgVkJTVFNB4oCZcyBtYWluIGNvc3QgaW5jbHVkZXMg4oCcUmVxdWlyZXMgYW4gTlZHIChuZWdhdGl2ZSB2b2x0YWdlIGdlbmVyYXRvciksIGluY3VycmluZyBwb3dlci9hcmVhIG92ZXJoZWFkLuKAnSIsCiAgICAgICJFeHBsaWNpdGx5IHByb3ZpZGUgdGhlIG5hbWUgb2YgVlRTQSAoVmFyaWF0aW9uLVRvbGVyYW50IFNBKS4iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSBWVFNB4oCZcyBjb3JlIG1lY2hhbmlzbTog4oCcUHJlLWNoYXJnaW5nIFNPVCBhbmQgU09DIHRvIFNMVCBhbmQgU0xDIGluIENMU0EgKHByZS1jaGFyZ2luZyBpbnRlcm5hbC9vdXRwdXQgbm9kZXMpLuKAnSIsCiAgICAgICJFeHBsaWNpdGx5IHN0YXRlIFZUU0HigJlzIG1haW4gY29zdCBpbmNsdWRlcyDigJxTcGVlZCBkZWdyYWRhdGlvbiBkdWUgdG8gc3RhY2su4oCdIiwKICAgICAgIkV4cGxpY2l0bHkgcHJvdmlkZSB0aGUgbmFtZSBvZiBIWVNBLVFaIChIeWJyaWQgU0Eg4oCTIFFaKS4iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSBIWVNBLVFa4oCZcyBjb3JlIG1lY2hhbmlzbTog4oCcUHJlLWNoYXJnaW5nIG91dHB1dCBub2RlcyBhbmQgaW50ZXJuYWwgbm9kZXMgb2YgQ0xTQS7igJ0iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSBIWVNBLVFa4oCZcyBtYWluIGNvc3QgaW5jbHVkZXMg4oCcU3BlZWQgZGVncmFkYXRpb24gZHVlIHRvIHN0YWNrLuKAnSIsCiAgICAgICJFeHBsaWNpdGx5IHByb3ZpZGUgdGhlIG5hbWUgb2YgVE1TQSAoVGhyZXNob2xkLU1hdGNoaW5nIFNBKS4iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSBUTVNB4oCZcyBjb3JlIG1lY2hhbmlzbTog4oCcQ2FwdHVyaW5nIFZ0aCBvZiBwdWxsLWRvd24gbkZFVHMgdGhyb3VnaCBwYWlyZWQgY2FwYWNpdG9ycy7igJ0iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSBUTVNB4oCZcyBtYWluIGNvc3QgaW5jbHVkZXMg4oCcQ2FwYWNpdG9yIG1pc21hdGNoIGFuZCBjYXAgcG93ZXIvYXJlYSBvdmVyaGVhZC7igJ0iLAogICAgICAiRXhwbGljaXRseSBwcm92aWRlIHRoZSBuYW1lIG9mIFZUUy1TQSAoVmFyaWF0aW9uLVRvbGVyYW50IFNtYWxsLVNpZ25hbCBTQSAvIFZvbHRhZ2UtVHJhbnNmZXIgdHlwZSkuIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgVlRTLVNB4oCZcyBjb3JlIG1lY2hhbmlzbTog4oCcQ2FwdHVyaW5nIHRyaXAgcG9pbnRzIG9mIGNyb3NzLWNvdXBsZWQgaW52ZXJ0ZXJzIHdpdGggaW5wdXQgYWNjZXB0YXRpb24gdmlhIGEgY291cGxpbmcgY2FwYWNpdG9yIHBhaXIu4oCdIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgVlRTLVNB4oCZcyBtYWluIGNvc3QgaW5jbHVkZXMg4oCcQ2FwYWNpdG9yIG1pc21hdGNoIGFuZCBwb3dlci9hcmVhIG92ZXJoZWFkLuKAnSIsCiAgICAgICJFeHBsaWNpdGx5IHByb3ZpZGUgdGhlIG5hbWUgb2YgQ1NBT0MgKENhcGFjaXRvciBTaGFyZWQgT2Zmc2V0IENhbmNlbGxhdGlvbikuIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgQ1NBT0PigJlzIGNvcmUgbWVjaGFuaXNtOiDigJxDYXB0dXJpbmcgdHJpcCBwb2ludHMgb2YgY3Jvc3MtY291cGxlZCBpbnZlcnRlcnMgdmlhIGEgc2luZ2xlIGNhcGFjaXRvci7igJ0iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSBDU0FPQ+KAmXMgbWFpbiBjb3N0IGluY2x1ZGVzIOKAnE1hbnkgc3dpdGNoZXM7IGNvbXBsZXggY29udHJvbC1zaWduYWwgY2lyY3VpdHJ5LuKAnSIsCiAgICAgICJFeHBsaWNpdGx5IHByb3ZpZGUgdGhlIG5hbWUgb2YgQlAyU1AgKEJpdC1saW5lIFByZS1jaGFyZ2UgJiBQcmUtYW1wbGlmeWluZyBTd2l0Y2hpbmcgcEZFVCkuIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgQlAyU1DigJlzIGNvcmUgbWVjaGFuaXNtOiDigJxDYXB0dXJpbmcgVnRoIG9mIHByZS1hbXBsaWZ5aW5nIHBGRVQgcGFpciBhdCBCTCBwcmUtY2hhcmdlLuKAnSIsCiAgICAgICJFeHBsaWNpdGx5IHN0YXRlIEJQMlNQ4oCZcyBtYWluIGNvc3QgaW5jbHVkZXMg4oCcQml0LWxpbmUgZmxvYXRpbmcsIHVuc3RhYmxlIHByZS1jaGFyZ2UgbGV2ZWwsIHBvd2VyL2FyZWEgb3ZlcmhlYWQu4oCdIiwKICAgICAgIkV4cGxpY2l0bHkgcHJvdmlkZSB0aGUgbmFtZSBvZiBDQ04tUFAgKENyb3NzLUNvdXBsZWQgbkZFVCBQcmUtYW1wbGlmaWVyICYgUHJlLWNoYXJnZSkuIiwKICAgICAgIkV4cGxpY2l0bHkgc3RhdGUgQ0NOLVBQ4oCZcyBjb3JlIG1lY2hhbmlzbTog4oCcUHJlLWFtcGxpZnlpbmcgQkwgdmlhIGNyb3NzLWNvdXBsZWQgbkZFVCBwYWlyIHdoaWxlIGNhcHR1cmluZyBWdGggd2l0aCBib29zdGVkIFZERC7igJ0iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSBDQ04tUFDigJlzIG1haW4gY29zdCBpbmNsdWRlcyDigJxCaXQtbGluZSBmbG9hdGluZywgcG93ZXIvYXJlYSBvdmVyaGVhZC7igJ0iLAogICAgICAiRXhwbGljaXRseSBwcm92aWRlIHRoZSBuYW1lIG9mIE9DQ1NBIChPZmZzZXQtQ2FuY2VsbGVkIEN1cnJlbnQtTW9kZSBTQSAvIENhcHR1cmluZyBWdGggb2YgTVVYIG5GRVRzIGF0IEJMIHByZS1jaGFyZ2UpLiIsCiAgICAgICJFeHBsaWNpdGx5IHN0YXRlIE9DQ1NB4oCZcyBjb3JlIG1lY2hhbmlzbTog4oCcQ2FwdHVyaW5nIFZ0aCBvZiBNVVggbkZFVHMgYXQgQkwgcHJlLWNoYXJnZS7igJ0iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSBPQ0NTQeKAmXMgbWFpbiBjb3N0IGluY2x1ZGVzIOKAnFJlcXVpcmVzIGFkZGl0aW9uYWwgVnByZWJsIHZvbHRhZ2Ugc291cmNlOyBjb21wbGV4aXR5IGR1ZSB0byB1bnN5bmNocm9uaXplZCBNVVggc2lnbmFscy7igJ0iLAogICAgICAiRXhwbGljaXRseSBwcm92aWRlIHRoZSBuYW1lIG9mIFNBT0MgKFNlbnNlLUFtcGxpZmllciBPZmZzZXQgQ2FuY2VsbGF0aW9uKS4iLAogICAgICAiRXhwbGljaXRseSBzdGF0ZSBTQU9D4oCZcyBjb3JlIG1lY2hhbmlzbTog4oCcQ2FwdHVyaW5nIFZ0aCBvZiBpbnB1dCBwRkVUcyBhdCBTQSBwcmUtY2hhcmdlLuKAnSIsCiAgICAgICJFeHBsaWNpdGx5IHN0YXRlIFNBT0PigJlzIG1haW4gY29zdCBpbmNsdWRlcyDigJxOMS9OMiBtaXNtYXRjaCByaXNrOyBhZGRlZCBjb21wbGV4aXR5IGluIGNvbnRyb2wtc2lnbmFsIGNpcmN1aXRyeS7igJ0iLAogICAgICAiVGhlIGNvbXBhcmlzb24gdGFibGUgbXVzdCBpbmNsdWRlIHRoZSBjb2x1bW5zOiBTdHJ1Y3R1cmUsIE9mZnNldCBSZWR1Y3Rpb24gVGVjaG5pcXVlLCBDb21wb25lbnRzLCBDb250cm9sIFNpZ25hbHMsIExpbWl0YXRpb25zLiIsCiAgICAgICJQcm92aWRlIGEgY29tcGxldGUgcm93IGZvciBWTFNBOiBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSDigJzigJPigJ0sIENvbXBvbmVudHMg4oCcNyBUUuKAnSwgQ29udHJvbCBTaWduYWxzIOKAnFBDQiwgU0FF4oCdLCBMaW1pdGF0aW9ucyDigJxMYXJnZSBWb3PigJ0uIiwKICAgICAgIlByb3ZpZGUgYSBjb21wbGV0ZSByb3cgZm9yIENMU0E6IE9mZnNldCBSZWR1Y3Rpb24gVGVjaG5pcXVlIOKAnOKAk+KAnSwgQ29tcG9uZW50cyDigJw5IFRS4oCdLCBDb250cm9sIFNpZ25hbHMg4oCcUENCLCBTQUXigJ0sIExpbWl0YXRpb25zIOKAnEluY3JlYXNlZCBWb3MgZHVlIHRvIGFkZGl0aW9uYWwgVFIgcGFpcuKAnS4iLAogICAgICAiUHJvdmlkZSBhIGNvbXBsZXRlIHJvdyBmb3IgU1RTQTogT2Zmc2V0IFJlZHVjdGlvbiBUZWNobmlxdWUg4oCcRHJpdmluZyBpbnRlcm5hbCBub2RlcyBvZiBWTFNBIChaVCBhbmQgWkMp4oCdLCBDb21wb25lbnRzIOKAnDExIFRS4oCdLCBDb250cm9sIFNpZ25hbHMg4oCcUENCLCBTQUXigJ0sIExpbWl0YXRpb25zIOKAnFNwZWVkIGRlZ3JhZGF0aW9uIGR1ZSB0byBzdGFja+KAnS4iLAogICAgICAiUHJvdmlkZSBhIGNvbXBsZXRlIHJvdyBmb3IgVkJTVFNBOiBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSDigJxTVFNBICsgTmVnYXRpdmUgQm9vc3RpbmcgVlNT4oCdLCBDb21wb25lbnRzIOKAnDE0IFRSICsgTlZHIChzaGFyZSnigJ0sIENvbnRyb2wgU2lnbmFscyDigJxQQ0IsIFNBRSwgQlNURU7igJ0sIExpbWl0YXRpb25zIOKAnE5lY2Vzc2l0YXRpbmcgTlZHIChwb3dlci9hcmVhIGNvc3Qp4oCdLiIsCiAgICAgICJQcm92aWRlIGEgY29tcGxldGUgcm93IGZvciBWVFNBOiBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSDigJxQcmUtY2hhcmdpbmcgU09UIGFuZCBTT0MgdG8gU0xUIGFuZCBTTEMgaW4gQ0xTQeKAnSwgQ29tcG9uZW50cyDigJw5IFRS4oCdLCBDb250cm9sIFNpZ25hbHMg4oCcUENCLCBTQUXigJ0sIExpbWl0YXRpb25zIOKAnFNwZWVkIGRlZ3JhZGF0aW9uIGR1ZSB0byBzdGFja+KAnS4iLAogICAgICAiUHJvdmlkZSBhIGNvbXBsZXRlIHJvdyBmb3IgSFlTQS1RWjogT2Zmc2V0IFJlZHVjdGlvbiBUZWNobmlxdWUg4oCcUHJlLWNoYXJnaW5nIG91dHB1dCBub2RlcyBhbmQgaW50ZXJuYWwgbm9kZXMgb2YgQ0xTQeKAnSwgQ29tcG9uZW50cyDigJwxMSBUUuKAnSwgQ29udHJvbCBTaWduYWxzIOKAnFBDQiwgU0FF4oCdLCBMaW1pdGF0aW9ucyDigJxTcGVlZCBkZWdyYWRhdGlvbiBkdWUgdG8gc3RhY2vigJ0uIiwKICAgICAgIlByb3ZpZGUgYSBjb21wbGV0ZSByb3cgZm9yIFRNU0E6IE9mZnNldCBSZWR1Y3Rpb24gVGVjaG5pcXVlIOKAnENhcHR1cmluZyBWdGggb2YgcHVsbC1kb3duIG5GRVRzIHRocm91Z2ggcGFpcmVkIGNhcHPigJ0sIENvbXBvbmVudHMg4oCcMTEgVFIgKyBJTlYgKyBCdWZmZXIgKyAyIEPigJ0sIENvbnRyb2wgU2lnbmFscyDigJxQQ0IsIFNBReKAnSwgTGltaXRhdGlvbnMg4oCcQ2FwYWNpdG9yIG1pc21hdGNoOyBjYXAgcG93ZXIvYXJlYSBvdmVyaGVhZOKAnS4iLAogICAgICAiUHJvdmlkZSBhIGNvbXBsZXRlIHJvdyBmb3IgVlRTLVNBOiBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSDigJxDYXB0dXJpbmcgdHJpcCBwb2ludHMgb2YgY3Jvc3MtY291cGxlZCBJTlZzIHZpYSBjb3VwbGluZyBjYXAgcGFpcuKAnSwgQ29tcG9uZW50cyDigJwxMiBUUiArIDIgQ+KAnSwgQ29udHJvbCBTaWduYWxzIOKAnEVOLCBQQ0IsIFBSRSwgU0FF4oCdLCBMaW1pdGF0aW9ucyDigJxDYXBhY2l0b3IgbWlzbWF0Y2g7IHBvd2VyL2FyZWEgb3ZlcmhlYWTigJ0uIiwKICAgICAgIlByb3ZpZGUgYSBjb21wbGV0ZSByb3cgZm9yIENTQU9DOiBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSDigJxDYXB0dXJpbmcgdHJpcCBwb2ludHMgb2YgY3Jvc3MtY291cGxlZCBpbnZlcnRlcnMgdmlhIHNpbmdsZSBjYXBhY2l0b3LigJ0sIENvbXBvbmVudHMg4oCcMTYgVFIgKyAxIEMgKyAyIE9SIChzaGFyZWQp4oCdLCBDb250cm9sIFNpZ25hbHMg4oCcUENCLCBTQUUsIM6mdHJzLCDOpnRyYuKAnSwgTGltaXRhdGlvbnMg4oCcTWFueSBzd2l0Y2hlczsgY29tcGxleCBjb250cm9sIGNpcmN1aXTigJ0uIiwKICAgICAgIlByb3ZpZGUgYSBjb21wbGV0ZSByb3cgZm9yIEJQMlNQOiBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSDigJxDYXB0dXJpbmcgVnRoIG9mIHByZS1hbXBsaWZ5aW5nIHBGRVQgcGFpciBhdCBCTCBwcmUtY2hhcmdl4oCdLCBDb21wb25lbnRzIOKAnDYgVFIgKyBTQeKAnSwgQ29udHJvbCBTaWduYWxzIOKAnFBDQiwgU0FF4oCdLCBMaW1pdGF0aW9ucyDigJxCaXQtbGluZSBmbG9hdGluZzsgdW5zdGFibGUgcHJlLWNoYXJnZTsgcG93ZXIvYXJlYSBvdmVyaGVhZOKAnS4iLAogICAgICAiUHJvdmlkZSBhIGNvbXBsZXRlIHJvdyBmb3IgQ0NOLVBQOiBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSDigJxQcmUtYW1wbGlmeWluZyBCTCB2aWEgY3Jvc3MtY291cGxlZCBuRkVUIHBhaXIsIHdoaWxlIGNhcHR1cmluZyBWdGggd2l0aCBib29zdGVkIFZEROKAnSwgQ29tcG9uZW50cyDigJw0IFRSICsgMiBDICsgQnVmZmVyICsgMSBUUiArIFNB4oCdLCBDb250cm9sIFNpZ25hbHMg4oCcUENCLCBTQUUsIFBCReKAnSwgTGltaXRhdGlvbnMg4oCcQml0LWxpbmUgZmxvYXRpbmc7IHBvd2VyL2FyZWEgb3ZlcmhlYWTigJ0uIiwKICAgICAgIlByb3ZpZGUgYSBjb21wbGV0ZSByb3cgZm9yIE9DQ1NBOiBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSDigJxDYXB0dXJpbmcgVnRoIG9mIE1VWCBuRkVUcyBhdCBCTCBwcmUtY2hhcmdl4oCdLCBDb21wb25lbnRzIOKAnDcgVFLigJ0sIENvbnRyb2wgU2lnbmFscyDigJxQQ0IsIFNBReKAnSwgTGltaXRhdGlvbnMg4oCcQWRkaXRpb25hbCBWcHJlYmwgZ2VuZXJhdG9yOyB1bnN5bmNocm9uaXplZCBNVVggc2lnbmFs4oCdLiIsCiAgICAgICJQcm92aWRlIGEgY29tcGxldGUgcm93IGZvciBTQU9DOiBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSDigJxDYXB0dXJpbmcgVnRoIG9mIGlucHV0IHBGRVRzIGF0IFNBIHByZS1jaGFyZ2XigJ0sIENvbXBvbmVudHMg4oCcMTEgVFLigJ0sIENvbnRyb2wgU2lnbmFscyDigJxQQ0IsIFNBRSwgT0NFTuKAnSwgTGltaXRhdGlvbnMg4oCcTjEvTjIgbWlzbWF0Y2g7IGNvbnRyb2wtc2lnbmFsIGNpcmN1aXQgY29tcGxleGl0eeKAnS4iCiAgICBdLAogICAgImFuYWx5c2lzIjogWwogICAgICAiUHJvdmlkZSBtZWNoYW5pc20tdG8tY29zdCBjYXVzYWwgZXhwbGFuYXRpb25zIGZvciBTVFNBOiBob3cgZHJpdmluZyBpbnRlcm5hbCBub2RlcyBlZmZlY3RpdmVseSBsb3dlcnMgdGhlIHRyaWdnZXIgdGhyZXNob2xkIHRvIHN1cHByZXNzIG9mZnNldCwgYW5kIHdoeSBzdGFja2VkIHBhdGhzIGRlZ3JhZGUgc3BlZWQuIiwKICAgICAgIlByb3ZpZGUgbWVjaGFuaXNtLXRvLWNvc3QgY2F1c2FsIGV4cGxhbmF0aW9ucyBmb3IgVkJTVFNBOiB3aHkgbmVnYXRpdmUgYm9vc3RpbmcgVlNTIGZ1cnRoZXIgcmVkdWNlcyBlZmZlY3RpdmUgb2Zmc2V0IG9uIHRvcCBvZiBTVFNBLCBhbmQgdGhlIGFyZWEvcG93ZXIgY29zdHMgb2YgdGhlIE5WRy4iLAogICAgICAiUHJvdmlkZSBtZWNoYW5pc20tdG8tY29zdCBjYXVzYWwgZXhwbGFuYXRpb25zIGZvciBWVFNBL0hZU0EtUVo6IGhvdyBwcmUtY2hhcmdpbmcgaW50ZXJuYWwvb3V0cHV0IG5vZGVzIGNoYW5nZXMgaW5pdGlhbCBiaWFzIHRvIHJlZHVjZSBjb21wYXJpc29uIG9mZnNldCwgYW5kIHdoeSBzdGFja2luZyBjYXVzZXMgc3BlZWQgbG9zcy4iLAogICAgICAiUHJvdmlkZSBtZWNoYW5pc20tdG8tY29zdCBjYXVzYWwgZXhwbGFuYXRpb25zIGZvciBUTVNBOiBob3cgcGFpcmVkLWNhcGFjaXRvciBzYW1wbGluZyBvZiBwdWxsLWRvd24gbkZFVCBWdGggY2FuY2VscyBtaXNtYXRjaCBhbmQgcmVkdWNlcyBlZmZlY3RpdmUgVk9TLCBhbmQgaG93IGNhcGFjaXRvciBtaXNtYXRjaCBhbmQgYXJlYS9wb3dlciBvdmVyaGVhZCBpbXBhY3QuIiwKICAgICAgIlByb3ZpZGUgbWVjaGFuaXNtLXRvLWNvc3QgY2F1c2FsIGV4cGxhbmF0aW9ucyBmb3IgVlRTLVNBL0NTQU9DOiBob3cgY2FwdHVyaW5nIHRyaXAgcG9pbnRzIG9mIGNyb3NzLWNvdXBsZWQgaW52ZXJ0ZXJzIGFuZCB1c2luZyBjb3VwbGluZy9zaGFyZWQgY2FwYWNpdG9ycyBhbXBsaWZpZXMgc21hbGwgaW5wdXQgZGlmZmVyZW50aWFscyB0byBsb3dlciBpbnB1dCB0aHJlc2hvbGRzOyBhbHNvIGV4cGxhaW4gc2Vuc2l0aXZpdHkgdG8gY29udHJvbCBwaGFzaW5nIGNvbXBsZXhpdHkgYW5kIGNhcGFjaXRvciBtaXNtYXRjaC4iLAogICAgICAiUHJvdmlkZSBtZWNoYW5pc20tdG8tY29zdCBjYXVzYWwgZXhwbGFuYXRpb25zIGZvciBCUDJTUC9DQ04tUFA6IGhvdyDigJxwcmUtY2hhcmdlIGFzIHByZS1hbXBsaWZpY2F0aW9u4oCdIGxvd2VycyByZXF1aXJlZCDOlFZfQkwgdG8gaW1wcm92ZSBpbml0aWFsIGRpc2NyaW1pbmFiaWxpdHk7IGFuZCBwb2ludCBvdXQgcmlza3Mgb2YgQkwgZmxvYXRpbmcgLyB1bnN0YWJsZSBwcmUtY2hhcmdlIC8gaGlnaGVyIHBvd2VyLiIsCiAgICAgICJDb25jbHVkZSB3aXRoIHNlbGVjdGlvbiBndWlkYW5jZSBieSBhcHBsaWNhdGlvbiBzY2VuYXJpbzogZS5nLiwgdWx0cmEtbG93IFZtaW4vaGlnaCByb2J1c3RuZXNzIOKGkiBwcmVmZXIgY2FwYWNpdG9yLWNvbXBlbnNhdGlvbiBmYW1pbHkgKFRNU0EvVlRTLVNBL0NTQU9DKSB3aGlsZSBhY2NlcHRpbmcgYXJlYS9jb21wbGV4aXR5OyBleHRyZW1lIHNwZWVkIOKGkiBjb25zaWRlciBwcmUtYW1wbGlmaWVyIGZhbWlseSAoQlAyU1AvQ0NOLVBQKSB3aXRoIHN0cmljdCB0aW1pbmcvcG93ZXIgbWFuYWdlbWVudDsgbG93LXBvd2VyIElvVC9hcmVhLWNvbnN0cmFpbmVkIOKGkiBjb25zaWRlciBWVFNBL0hZU0EtUVogd2l0aCBzaW1wbGVyIGNvbnRyb2wgd2hpbGUgYWNjZXB0aW5nIHNvbWUgb2Zmc2V0L3NwZWVkIHRyYWRlLW9mZnMuIgogICAgXSwKICAgICJwcmVzZW50YXRpb24iOiBbCiAgICAgICJPdXRwdXQgdGhlIOKAnFRlY2huaWNhbCBTdXJ2ZXnigJ0gZmlyc3QgYW5kIHRoZW4gdGhlIOKAnENvbXBhcmlzb24gVGFibGUs4oCdIGNsZWFybHkgc2VwYXJhdGVkIHdpdGggc3ViaGVhZGluZ3MuIiwKICAgICAgIlRoZSBzdXJ2ZXkgbXVzdCBjb3ZlciwgaW4gb3JkZXI6IFNUU0EsIFZCU1RTQSwgVlRTQSwgSFlTQS1RWiwgVE1TQSwgVlRTLVNBLCBDU0FPQywgQlAyU1AsIENDTi1QUCwgT0NDU0EsIFNBT0M7IGVhY2ggZW50cnkgbXVzdCBpbmNsdWRlOiBuYW1lLCBtZWNoYW5pc20sIHN0cnVjdHVyYWwgcG9pbnRzLCBjb250cm9sIHNpZ25hbHMsIGNvc3RzLCBhbmQgYSBvbmUtc2VudGVuY2UgdHJhZGUtb2ZmLiIsCiAgICAgICJUaGUgdGFibGUgbXVzdCBoYXZlIGNvbHVtbnMgU3RydWN0dXJlLCBPZmZzZXQgUmVkdWN0aW9uIFRlY2huaXF1ZSwgQ29tcG9uZW50cywgQ29udHJvbCBTaWduYWxzLCBMaW1pdGF0aW9ucywgYW5kIG11c3QgY29udGFpbiBleGFjdGx5IDEzIHJvd3M6IFZMU0EsIENMU0EsIFNUU0EsIFZCU1RTQSwgVlRTQSwgSFlTQS1RWiwgVE1TQSwgVlRTLVNBLCBDU0FPQywgQlAyU1AsIENDTi1QUCwgT0NDU0EsIFNBT0MuIEFueSBtaXNzaW5nIHJvdy9maWVsZCBpcyB1bmFjY2VwdGFibGUuIiwKICAgICAgIk5vIHZhZ3VlIHBocmFzZXMgc3VjaCBhcyAnZXRjLicgb3IgJ25vbi1leGhhdXN0aXZlLicgQWxsIHJlcXVpcmVkIGl0ZW1zIG11c3QgYmUgZXhwbGljaXRseSBzdGF0ZWQuIgogICAgXQogIH0sCiAgImJsb2NrZWQiOiBbCiAgICAiRGVzaWduIG9mIEhpZ2gtU3BlZWQsIExvdy1Qb3dlciBTZW5zaW5nIENpcmN1aXRzIGZvciBOYW5vLVNjYWxlIEVtYmVkZGVkIE1lbW9yeSBieSBTYW5naGVvbiBMZWUgMU9SQ0lELCBHd2Fud29vIFBhcmsgMSBhbmQgSGFud29vbCBKZW9uZyIKICBdCn0=)
{
 ’’task’’: ’’Conduct a study on SRAM Sensing Circuits for Offset Reduction, and produce two parts:\\nA) Technical survey: in the order of appearance, enumerate each type of sense amplifier (SA) by name, core offset-reduction mechanism (why it reduces offset), key structural points (including component makeup / whether extra generators are required), required control signals, and major costs/risks (e.g., speed degradation / power & area increase / mismatch sensitivity / bit-line floating). Also add a 1-2 sentence trade-off summary for each design.\\nB) Comparison table: produce a table titled Comparison of SRAM sensing circuit designs with fixed columns [Structure | Offset Reduction Technique | Components | Control Signals | Limitations]; rows must fully cover: VLSA, CLSA, STSA, VBSTSA, VTSA, HYSA-QZ, TMSA, VTS-SA, CSAOC, BP2SP, CCN-PP, OCCSA, SAOC. Both parts must avoid vague wording-information must be populated item by item.\\nOutput format: first the Technical Survey (list in the specified order), then the Comparison Table (with the required column headers and all rows).’’,
 ’’rubric’’: {
 ’’info_recall’’: [
 ’’In the technical survey, explicitly provide the full name of STSA (Schmitt trigger--based SA).’’,
 ’’In the survey, explicitly state STSA’s core offset-reduction mechanism: “Driving internal nodes of VLSA (ZT and ZC).”’’,
 ’’In the survey, explicitly state STSA’s main cost includes “Speed degradation due to stack.”’’,
 ’’Explicitly provide the full name of VBSTSA (Voltage-Boosted STSA).’’,
 ’’Explicitly state VBSTSA’s core mechanism: “STSA + Negative Boosting VSS.”’’,
 ’’Explicitly state VBSTSA’s main cost includes “Requires an NVG (negative voltage generator), incurring power/area overhead.”’’,
 ’’Explicitly provide the name of VTSA (Variation-Tolerant SA).’’,
 ’’Explicitly state VTSA’s core mechanism: “Pre-charging SOT and SOC to SLT and SLC in CLSA (pre-charging internal/output nodes).”’’,
 ’’Explicitly state VTSA’s main cost includes “Speed degradation due to stack.”’’,
 ’’Explicitly provide the name of HYSA-QZ (Hybrid SA -- QZ).’’,
 ’’Explicitly state HYSA-QZ’s core mechanism: “Pre-charging output nodes and internal nodes of CLSA.”’’,
 ’’Explicitly state HYSA-QZ’s main cost includes “Speed degradation due to stack.”’’,
 ’’Explicitly provide the name of TMSA (Threshold-Matching SA).’’,
 ’’Explicitly state TMSA’s core mechanism: “Capturing Vth of pull-down nFETs through paired capacitors.”’’,
 ’’Explicitly state TMSA’s main cost includes “Capacitor mismatch and cap power/area overhead.”’’,
 ’’Explicitly provide the name of VTS-SA (Variation-Tolerant Small-Signal SA / Voltage-Transfer type).’’,
 ’’Explicitly state VTS-SA’s core mechanism: “Capturing trip points of cross-coupled inverters with input acceptation via a coupling capacitor pair.”’’,
 ’’Explicitly state VTS-SA’s main cost includes “Capacitor mismatch and power/area overhead.”’’,
 ’’Explicitly provide the name of CSAOC (Capacitor Shared Offset Cancellation).’’,
 ’’Explicitly state CSAOC’s core mechanism: “Capturing trip points of cross-coupled inverters via a single capacitor.”’’,
 ’’Explicitly state CSAOC’s main cost includes “Many switches; complex control-signal circuitry.”’’,
 ’’Explicitly provide the name of BP2SP (Bit-line Pre-charge & Pre-amplifying Switching pFET).’’,
 ’’Explicitly state BP2SP’s core mechanism: “Capturing Vth of pre-amplifying pFET pair at BL pre-charge.”’’,
 ’’Explicitly state BP2SP’s main cost includes “Bit-line floating, unstable pre-charge level, power/area overhead.”’’,
 ’’Explicitly provide the name of CCN-PP (Cross-Coupled nFET Pre-amplifier & Pre-charge).’’,
 ’’Explicitly state CCN-PP’s core mechanism: “Pre-amplifying BL via cross-coupled nFET pair while capturing Vth with boosted VDD.”’’,
 ’’Explicitly state CCN-PP’s main cost includes “Bit-line floating, power/area overhead.”’’,
 ’’Explicitly provide the name of OCCSA (Offset-Cancelled Current-Mode SA / Capturing Vth of MUX nFETs at BL pre-charge).’’,
 ’’Explicitly state OCCSA’s core mechanism: “Capturing Vth of MUX nFETs at BL pre-charge.”’’,
 ’’Explicitly state OCCSA’s main cost includes “Requires additional Vprebl voltage source; complexity due to unsynchronized MUX signals.”’’,
 ’’Explicitly provide the name of SAOC (Sense-Amplifier Offset Cancellation).’’,
 ’’Explicitly state SAOC’s core mechanism: “Capturing Vth of input pFETs at SA pre-charge.”’’,
 ’’Explicitly state SAOC’s main cost includes “N1/N2 mismatch risk; added complexity in control-signal circuitry.”’’,
 ’’The comparison table must include the columns: Structure, Offset Reduction Technique, Components, Control Signals, Limitations.’’,
 ’’Provide a complete row for VLSA: Offset Reduction Technique “--”, Components “7 TR”, Control Signals “PCB, SAE”, Limitations “Large Vos”.’’,
 ’’Provide a complete row for CLSA: Offset Reduction Technique “--”, Components “9 TR”, Control Signals “PCB, SAE”, Limitations “Increased Vos due to additional TR pair”.’’,
 ’’Provide a complete row for STSA: Offset Reduction Technique “Driving internal nodes of VLSA (ZT and ZC)”, Components “11 TR”, Control Signals “PCB, SAE”, Limitations “Speed degradation due to stack”.’’,
 ’’Provide a complete row for VBSTSA: Offset Reduction Technique “STSA + Negative Boosting VSS”, Components “14 TR + NVG (share)”, Control Signals “PCB, SAE, BSTEN”, Limitations “Necessitating NVG (power/area cost)”.’’,
 ’’Provide a complete row for VTSA: Offset Reduction Technique “Pre-charging SOT and SOC to SLT and SLC in CLSA”, Components “9 TR”, Control Signals “PCB, SAE”, Limitations “Speed degradation due to stack”.’’,
 ’’Provide a complete row for HYSA-QZ: Offset Reduction Technique “Pre-charging output nodes and internal nodes of CLSA”, Components “11 TR”, Control Signals “PCB, SAE”, Limitations “Speed degradation due to stack”.’’,
 ’’Provide a complete row for TMSA: Offset Reduction Technique “Capturing Vth of pull-down nFETs through paired caps”, Components “11 TR + INV + Buffer + 2 C”, Control Signals “PCB, SAE”, Limitations “Capacitor mismatch; cap power/area overhead”.’’,
 ’’Provide a complete row for VTS-SA: Offset Reduction Technique “Capturing trip points of cross-coupled INVs via coupling cap pair”, Components “12 TR + 2 C”, Control Signals “EN, PCB, PRE, SAE”, Limitations “Capacitor mismatch; power/area overhead”.’’,
 ’’Provide a complete row for CSAOC: Offset Reduction Technique “Capturing trip points of cross-coupled inverters via single capacitor”, Components “16 TR + 1 C + 2 OR (shared)”, Control Signals “PCB, SAE, $\Phi$trs, $\Phi$trb”, Limitations “Many switches; complex control circuit”.’’,
 ’’Provide a complete row for BP2SP: Offset Reduction Technique “Capturing Vth of pre-amplifying pFET pair at BL pre-charge”, Components “6 TR + SA”, Control Signals “PCB, SAE”, Limitations “Bit-line floating; unstable pre-charge; power/area overhead”.’’,
 ’’Provide a complete row for CCN-PP: Offset Reduction Technique “Pre-amplifying BL via cross-coupled nFET pair, while capturing Vth with boosted VDD”, Components “4 TR + 2 C + Buffer + 1 TR + SA”, Control Signals “PCB, SAE, PBE”, Limitations “Bit-line floating; power/area overhead”.’’,
 ’’Provide a complete row for OCCSA: Offset Reduction Technique “Capturing Vth of MUX nFETs at BL pre-charge”, Components “7 TR”, Control Signals “PCB, SAE”, Limitations “Additional Vprebl generator; unsynchronized MUX signal”.’’,
 ’’Provide a complete row for SAOC: Offset Reduction Technique “Capturing Vth of input pFETs at SA pre-charge”, Components “11 TR”, Control Signals “PCB, SAE, OCEN”, Limitations “N1/N2 mismatch; control-signal circuit complexity”.’’
 ],
 ’’analysis’’: [
 ’’Provide mechanism-to-cost causal explanations for STSA: how driving internal nodes effectively lowers the trigger threshold to suppress offset, and why stacked paths degrade speed.’’,
 ’’Provide mechanism-to-cost causal explanations for VBSTSA: why negative boosting VSS further reduces effective offset on top of STSA, and the area/power costs of the NVG.’’,
 ’’Provide mechanism-to-cost causal explanations for VTSA/HYSA-QZ: how pre-charging internal/output nodes changes initial bias to reduce comparison offset, and why stacking causes speed loss.’’,
 ’’Provide mechanism-to-cost causal explanations for TMSA: how paired-capacitor sampling of pull-down nFET Vth cancels mismatch and reduces effective VOS, and how capacitor mismatch and area/power overhead impact.’’,
 ’’Provide mechanism-to-cost causal explanations for VTS-SA/CSAOC: how capturing trip points of cross-coupled inverters and using coupling/shared capacitors amplifies small input differentials to lower input thresholds; also explain sensitivity to control phasing complexity and capacitor mismatch.’’,
 ’’Provide mechanism-to-cost causal explanations for BP2SP/CCN-PP: how “pre-charge as pre-amplification” lowers required $\Delta$V_BL to improve initial discriminability; and point out risks of BL floating / unstable pre-charge / higher power.’’,
 ’’Conclude with selection guidance by application scenario: e.g., ultra-low Vmin/high robustness → prefer capacitor-compensation family (TMSA/VTS-SA/CSAOC) while accepting area/complexity; extreme speed → consider pre-amplifier family (BP2SP/CCN-PP) with strict timing/power management; low-power IoT/area-constrained → consider VTSA/HYSA-QZ with simpler control while accepting some offset/speed trade-offs.’’
 ],
 ’’presentation’’: [
 ’’Output the “Technical Survey” first and then the “Comparison Table,” clearly separated with subheadings.’’,
 ’’The survey must cover, in order: STSA, VBSTSA, VTSA, HYSA-QZ, TMSA, VTS-SA, CSAOC, BP2SP, CCN-PP, OCCSA, SAOC; each entry must include: name, mechanism, structural points, control signals, costs, and a one-sentence trade-off.’’,
 ’’The table must have columns Structure, Offset Reduction Technique, Components, Control Signals, Limitations, and must contain exactly 13 rows: VLSA, CLSA, STSA, VBSTSA, VTSA, HYSA-QZ, TMSA, VTS-SA, CSAOC, BP2SP, CCN-PP, OCCSA, SAOC. Any missing row/field is unacceptable.’’,
 ’’No vague phrases such as ’etc.’ or ’non-exhaustive.’ All required items must be explicitly stated.’’
 ]
 },
 ’’blocked’’: [
 ’’Design of High-Speed, Low-Power Sensing Circuits for Nano-Scale Embedded Memory by Sangheon Lee 1ORCID, Gwanwoo Park 1 and Hanwool Jeong’’
 ]
}
Requirements:
Notes:

1.

The human passage will NOT be visible to the model being evaluated; the model will only see the task and must gather information online by itself.
2.

The task you extract does not have to cover the entire article; you may select a portion (e.g., one subsection or one table)—especially the part most related to deepresearch (data recall and organization)—to form the task. The task may avoid overly subjective parts of the source article, since a model is unlikely to reproduce the exact same analysis.
3.

For critical data (e.g., table data), the task must specify exactly how to organize it (e.g., what columns to include in a table). For ambiguous concepts, provide strict definitions and clarify category distinctions.
4.

The task you generate should include both information gathering and qualitative analysis (or simple quantitative analysis). It must not be a purely discursive piece without incorporating additional sources, nor merely data collection without analysis, nor an overly complex analysis (e.g., requiring massive datasets or machine-learning algorithms).
5.

When generating the task, mimic a typical user’s tone: assume the user is not an expert and cannot name specific in-field methods/details; use natural language, not Markdown, to describe the task.
6.

Pay attention to timeliness: for topics that change quickly (e.g., research or industry), the task must explicitly state that only information up to a specific date should be collected, aligned with the human article’s timeframe.
7.

Your rubrics must be as comprehensive as possible and fully cover the task; do not trim rubrics due to length.
8.

For numeric data, you must verify each value via rubrics (if values are derived by calculation, you may specify an allowable error).
9.

If rubrics become too many, shrink the scope of the task rather than cutting rubrics. Ultimately, rubrics should number between 50 and 200. Note: shrinking scope does not imply directly listing which entities/methods/companies to search; discovering and enumerating them is part of deep research capability.
10.

Rubric items should be as detailed as possible; a rubric is itself an answer to what must be verified. Avoid broad items (e.g., “Gives reasons for talent outflow from small cities”). Instead: “States that a key reason for talent outflow from small cities is a mismatch in occupational structure.”
11.

Rubric granularity must be as fine as possible and not further divisible. For example, do not write “Covers Axitinib (a VEGFR inhibitor that alleviates hypoxia…) and NADH removal (…)”, but split into “Mentions Axitinib,” “Explains that Axitinib’s VEGFR-inhibition relieves hypoxia and improves immunotherapy efficacy,” etc.
12.

If a rubric references other studies/views, you must name the specific research/article title rather than author shorthand. For example: “Explicitly cites the study ‘Continuous Influx of Genetic Material from Host to Virus Populations’ published in PLoS Genetics in 2016 by Gilbert et al., stating that 4.8% of viruses contain host sequences,” rather than “Gilbert (2016) reported…”.
13.

Rubric items should be mutually independent, i.e., each rubric can be used to evaluate output on its own.
Below, you will be given a portion of a human-written article. Following the examples above, extract an appropriate task and rubrics for that article.
<human_passage>
{paper}
</human_passage>
Now, please begin your generation.

### E.2 Rubric Scoring Prompt

You will receive an article, a task, and a list of grading rubric items. Your job is to assess whether the article satisfies each rubric item, and provide a THREE-WAY score for EACH rubric item.
Scoring rule per rubric item (strict):

•

Score = 1: The article clearly satisfies the rubric item AND the specific supporting sentence(s) do NOT cite any reference listed in “blocked” (match by title/urls). For numerical data, exact values must be explicitly listed and match the rubric.
•

Score = 0: The article does NOT mention this rubric item at all.
•

Score = -1: The article mentions this rubric item, BUT the supporting sentence(s) cite a blocked reference.
For EACH rubric item, you MUST provide:

1.

“score”: 1, 0, or -1
2.

“reason”: A brief explanation
3.

“evidence”: The specific supporting sentence(s) from the article (empty string if score is 0)
The input format is:
<input_format>
[⬇](data:text/plain;base64,ewogICAgInRhc2siOiAiLi4uIiwKICAgICJydWJyaWNfaXRlbXMiOiBbInJ1YnJpYyBpdGVtIDEiLCAicnVicmljIGl0ZW0gMiIsIC4uLl0sCiAgICAiYmxvY2tlZCI6IHsKICAgICAgICAidGl0bGUiOiAiLi4uIiwKICAgICAgICAiYXV0aG9ycyI6IFsiLi4uIiwgIi4uLiJdLAogICAgICAgICJ1cmxzIjogWyIuLi4iLCAiLi4uIl0KICAgIH0KfQ==)
{
 ’’task’’: ’’...’’,
 ’’rubric_items’’: [’’rubric item 1’’, ’’rubric item 2’’, ...],
 ’’blocked’’: {
 ’’title’’: ’’...’’,
 ’’authors’’: [’’...’’, ’’...’’],
 ’’urls’’: [’’...’’, ’’...’’]
 }
}
</input_format>
Your output MUST strictly follow this JSON format (no extra keys, and the rubric item text MUST match the input EXACTLY):
<output_format>
[⬇](data:text/plain;base64,ewogICAgInJlc3VsdHMiOiBbCiAgICAgICAgewogICAgICAgICAgICAicnVicmljX2l0ZW0iOiAicnVicmljIGl0ZW0gMSIsCiAgICAgICAgICAgICJzY29yZSI6IDEgb3IgMCBvciAtMSwKICAgICAgICAgICAgInJlYXNvbiI6ICJicmllZiBleHBsYW5hdGlvbiIsCiAgICAgICAgICAgICJldmlkZW5jZSI6ICJzdXBwb3J0aW5nIHNlbnRlbmNlKHMpIGZyb20gdGhlIGFydGljbGUiCiAgICAgICAgfSwKICAgICAgICB7CiAgICAgICAgICAgICJydWJyaWNfaXRlbSI6ICJydWJyaWMgaXRlbSAyIiwKICAgICAgICAgICAgInNjb3JlIjogMSBvciAwIG9yIC0xLAogICAgICAgICAgICAicmVhc29uIjogImJyaWVmIGV4cGxhbmF0aW9uIiwKICAgICAgICAgICAgImV2aWRlbmNlIjogInN1cHBvcnRpbmcgc2VudGVuY2UocykgZnJvbSB0aGUgYXJ0aWNsZSIKICAgICAgICB9LAogICAgICAgIC4uLgogICAgXQp9)
{
 ’’results’’: [
 {
 ’’rubric_item’’: ’’rubric item 1’’,
 ’’score’’: 1 or 0 or -1,
 ’’reason’’: ’’brief explanation’’,
 ’’evidence’’: ’’supporting sentence(s) from the article’’
 },
 {
 ’’rubric_item’’: ’’rubric item 2’’,
 ’’score’’: 1 or 0 or -1,
 ’’reason’’: ’’brief explanation’’,
 ’’evidence’’: ’’supporting sentence(s) from the article’’
 },
 ...
 ]
}
</output_format>
CRITICAL: You MUST return results for ALL rubric items in the input, and the “rubric_item” text MUST match the input text EXACTLY (character-level match).
<passage>
{paper}
</passage>
<task_and_rubric>
{rubric}
</task_and_rubric>
Now, please begin your generation
