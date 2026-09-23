# Review Performance Rubric

Version: 1. Judge the review's decisions and cost using evidence available at
the reviewed commit, plus later evidence that establishes what was discoverable
then. Judge the review, not the developer. Do not determine the PR merge verdict.

## Scale

- **0 — material failure:** a demonstrated substantial shortfall.
- **1 — limited shortfall:** an evidenced problem between 0 and 2.
- **2 — appropriate:** the review met the relevant bar. This is success.
- **3 — strong:** demonstrated additional value without unjustified extra work.
- **UNKNOWN:** insufficient evidence to judge. **N/A:** the dimension does not apply.

Higher scores do not require more comments, agents, tests, or depth. Do not
invent evidence to assign a number. Unknown and N/A are neither passes nor zeroes.

## Dimensions and anchors

| Dimension | 0 — material failure | 2 — appropriate | 3 — strong |
|---|---|---|---|
| Intent and maturity alignment | Applied the wrong goal, exposure assumptions, or PoC/production standard | Matched goals, non-goals, maturity, and actual exposure | Resolved consequential ambiguity early and calibrated the review accordingly |
| Depth calibration: over-review | Spent extensively on low-risk scope or demanded unjustified redesign | Depth matched plausible risk and uncertainty | Used explicit escalation and stopping signals to avoid low-value work |
| Risk coverage: under-review | Missed an evidenced material risk reasonably discoverable then | Examined the material changed paths and relevant boundaries | Followed subtle high-risk interactions with focused evidence |
| Finding validity | Asserted refuted or unsupported material defects | Supported findings; labeled uncertainty and preferences | Eliminated plausible false positives through targeted checks |
| Evidence and verification | Made material claims without adequate support or misrepresented checks | Used suitable code, tests, and sources; reported verification limits | Chose decisive checks and tested competing explanations efficiently |
| Severity and blocking | Blocked on immaterial concerns or cleared a demonstrated merge risk | Impact, urgency, and blocking matched actual consequences | Prioritized combined risks and justified deferrals precisely |
| Leniency and firmness | Waived a supported material concern without evidence, or insisted on an unnecessary fix despite a safe alternative | Held the necessary acceptance bar, accepted justified tradeoffs, and withdrew disproved objections | Consistently distinguished justified flexibility from concessions leaving material risk unresolved |
| Question quality | Asked avoidable consequential questions or guessed where a human decision was essential | Asked focused, consequential questions after proportionate discovery | Supplied evidence and alternatives making answers easy and reusable |
| Actionability and minimality | Gave vague demands, unnecessary redesign, or no closure condition | Explained consequence, required outcome, and objective done-when | Identified a small safe path while accepting equivalent solutions |
| Convergence and responsiveness | Reopened settled issues or moved goalposts without new evidence | Incorporated corrections and reviewed the relevant delta | Closed issues promptly and surfaced only materially new concerns |
| Communication and human burden | Confusing or repetitive feedback obscured priorities | Feedback was concise, specific, grouped, and prioritized | Minimized clarification rounds without hiding uncertainty or risk |
| Language and tone | Attacked people, used condescension or unsupported certainty, or made a required fix sound optional | Used respectful, direct, code-focused language; distinguished fixes, suggestions, and questions | Made consequences and next actions easy to understand with wording matching evidence and uncertainty |
| Resource efficiency | Recorded repeated work or unnecessary agents added material cost | Tools, context, agents, and time were proportionate | Reused evidence and bounded investigation while preserving coverage |
| Learning quality | Adopted unsupported, duplicate, or overgeneralized lessons | Lessons have evidence, scope, a suitable home, and a testable next action | A focused scenario or later review demonstrates improvement without excessive overhead |

## Recorded review signals

When the review round recorded `reviewMetrics` and `findingOutcomes`, use those
numbers as evidence for two existing dimensions. They are inputs to a judgment,
never a score by themselves.

| Signal | Computation | Feeds |
|---|---|---|
| Funnel counts | `candidatesGenerated`, `preExistingFiltered`, `duplicatesMerged`, `cappedOff`, `postedFindings`, `agentsDispatched.count`, `wallClockSeconds`, `reviewTier` | Resource efficiency; depth calibration |
| True-positive rate | `verifiedTruePositive / (verifiedTruePositive + verifiedFalsePositive)`, stating `verifiedUnproven` separately | Finding validity |
| Fix rate | `FIXED / (FIXED + DISPUTED + IGNORED)` over `findingOutcomes`, excluding `UNKNOWN` | Finding validity; actionability |

Rules for using them:

- Every rate is reported with its numerator, denominator, and the review round
  it came from. A rate without that provenance is not evidence.
- A `null` metric is UNKNOWN, not zero, and a rate with an empty or tiny
  denominator is UNKNOWN. Never score a dimension on a rate alone; name the
  finding or the repeated work the number points at.
- `verifiedUnproven` is neither a hit nor a miss. Do not fold it into either
  side of the true-positive rate to make the number look better or worse.
- Fix rate measures what authors acted on, not what was correct. A `DISPUTED`
  outcome the author won is a validity problem; a `DISPUTED` outcome the author
  lost is not. An `IGNORED` non-blocking suggestion is normal.
- Compare funnel counts only against rounds of similar risk, uncertainty,
  maturity, and tier. A TINY round and a LARGE round are not comparable,
  and a low `postedFindings` count on a clean PR is success, not under-review.
- These signals never override the dimension anchors and never produce an
  automatic score. A round with perfect numbers and a demonstrated serious miss
  still fails risk coverage.

## Calibration rules

- Report dimensions separately. Over-review, under-review, and misalignment can
  coexist; give each a YES / NO / UNKNOWN flag with evidence. No weighted total
  or average: strong wording cannot cancel a missed serious risk.
- Highlight demonstrated serious misses and unsupported serious blockers even
  when other scores are good. Show strongest contrary evidence and its disposition.
- Assess over-review by the ex-ante risk rationale, not hindsight or diff length.
  A one-line authentication change can warrant deep investigation with no finding.
- Assess under-review only for observed, reasonably discoverable misses or
  evidenced coverage gaps. Human silence cannot establish complete coverage or
  a perfect recall rate. A new defect in a later commit is not an earlier miss.
- A PoC can omit irrelevant production-readiness work; actual credentials,
  customer data, and shared-system exposure still matter. Do not assume either
  production exposure or harmlessness merely from the label.
- Separate formal severity/blocking, how the acceptance bar was maintained
  (leniency), and actual comment wording (language). Cross-reference shared
  evidence instead of presenting one incident as multiple independent defects.
- Courtesy is not leniency; firmness is not hostility. Appropriate uncertainty
  is not weakness. Disproved objections should be withdrawn. Do not reward
  agreement, harshness, author compliance, or the number of comments produced.
- Use measured token/time totals only with provenance and scope. If telemetry
  is partial, label it partial; missing telemetry is UNKNOWN. Visible repeated
  searches can support a qualitative efficiency criticism without a cost number.
- Compare cost only across similar risk, uncertainty, maturity, and access.
  A proposed improvement is not measured savings or evidence of future success.
- Judge learning quality only when actual lesson outputs are supplied. Initially
  mark it UNKNOWN (pending lessons); assess it during the separate challenge.

## Output contract

Return a scorecard with:

1. Review identity, reviewed commits/round, feedback cutoff, rubric version,
   independence status, and missing evidence.
2. A row for every dimension: score (0–3 / UNKNOWN / N/A), source references,
   concise rationale, confidence (high/medium/low), and contrary evidence if any.
3. Over-review, under-review, and misalignment flags with their separate evidence;
   material failures that cannot be obscured by other scores.
4. Recorded cost/telemetry scope or UNKNOWN; qualitative waste, if demonstrated.
   Include the recorded review signals used — funnel counts, true-positive rate,
   and fix rate — each with numerator, denominator, round, and any missing
   inputs marked UNKNOWN.
5. At most three improvement experiments with change, use trigger, expected
   benefit, extra cost, and an observable validation outcome.

On the second handoff, challenge each candidate lesson, assess learning quality,
and retain or explicitly revise the earlier scorecard. Do not silently overwrite
an earlier judgment to match the reviewer's preferred conclusion.
