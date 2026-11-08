# Executable designs and skill experiments

Use when candidates can run against observable outcomes. Establish what the evaluator measures and misses before optimizing it.

- Compare whole designs when ideas interact. Preserve candidates useful on different case families, not only the best average. GEPA-style reflection revises designs from traces; Arbor-style state links hypotheses, implementations, results and insights. Neither makes an invalid evaluator reliable.
- Start with a baseline and comparable inputs, budgets, environment and reader/model versions. Separate design cases from final evaluation. Use paired comparisons and repeated trials when variability matters.
- Test A, B and A+B when complementarity is plausible. Estimate interactions; significance for A+B and nonsignificance for A alone does not itself establish interaction. A failed component can still be useful in a different combination.
- Separate implementation faults from hypothesis failures. Keep raw outputs and an exact run recipe under artifacts; put concise observations and artifact references in evidence records.
- Use uncertainty and effect size, not a winner label alone. A test unable to detect a useful effect is inconclusive. Predefine stopping or use a valid sequential procedure.

## Compression example

Explore exact constraint preservation, structured state, hierarchical summaries, and retrieval as distinct ideas. Compare combinations under a fixed token budget, retain an uncompressed reference, and freeze the downstream reader during the first comparison. Withhold downstream questions. Then test new task families and readers.

Measure task success, constraint violations, incorrect reconstruction, latency and total cost. Fewer context tokens alone do not establish a better system. Record which failure class each component helps or harms.

## Choosing the search policy

Use simple local iteration when gains are frequent and changes independently useful. Preserve multiple branches when interactions, delayed gains, or different case-family strengths justify the cost. Recombine only with an explicit hypothesis about why components fit.

Use Bayesian optimization for expensive trials with a defined search space and usable objective. Use experimental design when choosing measurements to distinguish explanations. Do not encode open-ended product ideas into artificial parameters merely to apply an optimizer.

For skill changes, test retention, retrieval, application and transfer using research-learning. Track prompt/skill/model versions so a change in the harness is not mistaken for an improved idea.
