# Product decisions and experiments

Use an Opportunity Solution Tree: **outcome → user needs → alternative solutions → assumptions → tests**. Keep user needs distinct from requested features. Link evidence across branches when ideas share assumptions or interact.

## Choose the next test

- Combine usage evidence with task observation and interviews, including people who abandoned or never adopted the feature. Existing usage does not reveal every unmet need.
- State the product decision first. Prefer an uncertainty whose plausible answers lead to different next actions. Weigh decision value, user benefit, cost, delay and risk; avoid invented precise scores.
- Match the method: interviews for needs and explanations, prototypes for comprehension/usability, technical spikes for feasibility, controlled live experiments for behavioral effects. A survey of intentions does not establish sustained adoption.
- Keep several viable ideas, combinations and reopening conditions. Spend some effort on informative alternatives when the leading direction remains uncertain. A/B tests measure comparisons; they do not force a greedy roadmap.

## Example

Teams inviting colleagues retain better. Consider: collaboration causes value; individual success must come first; or motivated teams both invite and retain.

Explore A, a first-task template, and B, a contextual invitation flow. After checking the relevant assumptions, compare baseline, A, B and A+B if traffic and cost permit. Estimate the interaction directly. Randomize at workspace level when teammates would otherwise cross treatments.

If invitations rise without improved task success or retention, revisit the mechanism. If the combination helps, investigate its conditions. If estimates are imprecise, keep the conclusion unresolved. Newly discovered subgroup effects need confirmation; do not mine many segments and report only winners.

## Evidence contract

Before execution, specify target population, assignment, baseline, primary outcome, harm limits, duration/stopping and useful effect size. Check instrumentation, assignment balance, exposure and spillovers. Low traffic may call for a different test or a narrower claim, not a confident A/B verdict.

Measure user outcomes alongside diagnostic clicks. Check novelty and delayed effects. A short-lived engagement lift may not improve the intended outcome. Record deviations and uncertainty before interpreting why it happened.

After each round, update the conditions under which an idea works, counterevidence and the next decision. Use real-user evidence for demand; synthetic users are hypothesis-generating aids. Bandits fit repeated deployable choices with measured rewards and appropriate analysis, not the entire discovery process.
