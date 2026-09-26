# Agent Guidance — Discipline Blocks & Question Handling

Load this file **before forming Review Intent (Step 3)**, before dispatching any
review agent (Steps 4-8), and again at
**Step 10** (question consolidation). The five discipline blocks below MUST be
included (verbatim or faithfully summarized) in every dispatched agent's prompt.

## Review Intent (Step 3)

Create this stable record before judging individual findings:

```yaml
reviewIntent:
   statedProblem: <the outcome the PR must deliver>
   acceptanceCriteria: [<observable condition>, ...]
   explicitNonGoals: [<out-of-scope item>, ...]
   deliveredApproach: <brief implementation summary>
   goalCoverage: SOLVED | PARTIALLY_SOLVED | NOT_SOLVED | UNCLEAR
   solutionDirection: RIGHT_BALLPARK | FUNDAMENTALLY_MISALIGNED | UNCLEAR
   evidence: [<work item, PR description, test, or code-path reference>, ...]
```

Use empty arrays for missing criteria, non-goals, or evidence. Keep these
lower-camel field names at every handoff and persist the complete object in
the summary. Use sources in order: explicit acceptance criteria and non-goals,
linked work item, PR description, implementation plan, commit/user context.
Do not substitute a reviewer's preferred scope for the stated scope.

- `NOT_SOLVED` or `PARTIALLY_SOLVED`: name the smallest concrete gap; it may block.
- `FUNDAMENTALLY_MISALIGNED`: explain the unsafe direction and nearest sound correction.
- `SOLVED` + `RIGHT_BALLPARK`: converge; only evidence-backed merge risks block.
- `UNCLEAR`: ask one consolidated question. Only missing evidence that prevents
   verification of a core outcome or safety property can become a blocker.

Pass Review Intent unchanged to every dispatched reviewer and `review-grader`.
Revise it only for newly discovered authoritative context, calling out the
revision explicitly; review comments themselves never redefine it.

<output_contract>
**Output Contract — applies to ALL agents dispatched in steps 4-8:**

1. **Return exactly one JSON object** matching
   [finding-schema.md](finding-schema.md). No prose before it, none after it.
2. **At most 5 findings.** Keep the highest-impact ones. Set
   `omittedSimilarCount` and explain in `coverageNote` when you drop others.
3. **Cluster, do not repeat.** One mechanism appearing in several places is ONE
   record with the other locations in `instances`.
4. **Anchor every finding.** `IN_DIFF`, or `ENABLED_BY_DIFF` with a concrete
   `enablingChange` naming the changed line, or `PRE_EXISTING`. A finding you
   cannot anchor will be filtered out mechanically, so anchor it honestly
   rather than guessing.
5. **Never set `blocker`, never set `id`.** The lane and the identity are the
   orchestrator's and the grader's decisions.
6. **Use the supplied context pack.** Read the diff from `diffPath`; do not
   fetch your own. Open full files only when the diff cannot settle a question.
7. **Do not report what a compiler, linter, type checker, or formatter would
   catch.** Assume CI runs them. Do not build or typecheck yourself.
</output_contract>

<agent_question_guidance>
**Context Question Emission — applies to ALL agents dispatched in steps 4-8:**

When reviewing code, if you encounter an area where you **cannot confidently
determine correctness** due to missing context, emit a `[QUESTION]` item alongside
your findings. Do NOT guess or silently skip — surface the uncertainty.

**Emit a question when:**
- Code does something unusual but it might be intentional (business rule, edge case)
- A design choice seems suboptimal but could be justified by context you don't have
- A TODO/HACK comment exists but the urgency and plan are unclear
- Domain-specific logic that you don't fully understand
- A dependency is used in a way that might be correct for the specific integration
- The PR implements partial logic and it's unclear if the rest is in a sibling PR or missing

**Do NOT emit a question when:**
- You can determine correctness from the code alone
- The issue is clearly a defect — emit a finding instead
- The PR description or work item already explains the intent

**Question format:** questions go in the `questions` array of your JSON
envelope, using the shape in [finding-schema.md](finding-schema.md):
`file`, `line`, `codeContext`, `uncertainty`, `whatAnsweringUnlocks`, and an
optional `suggestedAnswers`.

Never file uncertainty as a finding. Questions are collected in Step 10 and
posted as `[QUESTION]` inline comments; they never reach the grader and never
affect the verdict.
</agent_question_guidance>

<claim_strength_discipline>
**Claim-Strength Discipline — applies to ALL agents dispatched in steps 4-8:**

When proposing doc changes or prescriptive fixes:
1. If the finding enumerates N instances (for example, "5 controllers do X"),
   verify the corrective wording holds for EACH of the N. Never generalize a
   pattern found in some to a "must" applied to all.
2. `only`, `all`, `always`, `never`, and `every` claims require exhaustive
   search evidence, not scope-limited grep. If the search was scope-limited,
   soften to "in the searched scope we found only X" and name the scope.
3. When pushing back on a pattern (for example, "don't hardcode version X"),
   do not use the same pattern in your own verified evidence or suggestion text.
4. If you cannot safely verify a repo-wide or doc-wide prescription, downgrade
   to a scoped suggestion or emit a `[QUESTION]`.
</claim_strength_discipline>

<defect_statement_discipline>
**Defect-Statement Discipline — applies to ALL agents dispatched in steps 4-8:**

1. **State the defect; don't prescribe the remedy.** When you do suggest a
   fix, propose the smallest correction that resolves the defect and label
   it as a floor ("minimal fix"), never a spec. Do not present a redesign
   as the required response to a one-line defect.
2. **Surface-adding suggestions need justification.** A suggestion that
   adds API surface — new types, actions, endpoints, tables, config — must
   state why no smaller correction exists.
3. **Quote your search before claiming absence.** Before claiming
   something is "undefined", "missing", "unused", or "has no handler":
   show the search you ran (pattern + scope) and the nearest section or
   symbol that WOULD define it, demonstrating it doesn't. One false
   absence claim inside a blocker costs credibility on the true findings
   next to it.
4. **Include an `Underlying problem:` line in every finding** — the
   mechanism behind the symptom, one sentence. Mandatory in the summary
   AND in every inline comment.
</defect_statement_discipline>

<convergence_guidance>
**Convergence Guidance — applies to ALL agents dispatched in steps 4-8:**

Include the Review Intent (from SKILL.md Step 3) in every agent prompt. Require
each finding to say how the changed code affects the stated goal or creates a
concrete merge risk. A different-but-valid implementation is not a finding. For
Critical, High, and Medium findings, ask agents for a required outcome and an
objective closure check ("done when"); suggestions should describe a minimal
path, not impose one exact design.
</convergence_guidance>

## Question Consolidation (Step 10)

<context_questions_philosophy>
**Why questions matter:**

A reviewer who silently skips an uncertain area provides a false sense of coverage.
A reviewer who guesses creates false positives that erode trust. Context questions
are the honest middle ground — they say "I noticed something that might be wrong,
but I need your input to know for sure." This is more valuable than either silence
or noise.

**Questions are NOT findings.** They don't assert a defect. They signal reviewer
uncertainty and request author clarification. They are always non-blocking.
</context_questions_philosophy>

**Consolidation workflow:**

1. Collect the sourced open activation questions retained by the parent from
   context gathering in Step 2, plus `[QUESTION]` items from agent outputs in
   steps 4-9. Use the same question shape for both; retain the source reference and
   activation condition in `codeContext` / `uncertainty` when no changed line
   can anchor the question.
2. De-duplicate: if two agents ask about the same code area, merge into one question
   that captures both angles
3. Mark context questions answered only with a cited answer in code, PR
   description, work item or discussion; otherwise keep them open. Drop those
   proved out of scope. A pricing note does not answer a separate geo-routing
   prerequisite. Do not promote an open pre-enablement question to a present
   leak or automatic blocker.
4. Rank by review impact: questions that would affect severity grading or verdict
   determination rank higher
5. Cap at **10 questions per review** — if more exist, keep the highest-impact ones
   and note "N additional questions omitted for brevity"

**What flows forward:**
- Questions do NOT go to the review-grader (Step 11) — they are separate from findings
- Questions tied to changed lines go to `post-pr-review` (Step 12) for inline
   `[QUESTION]` comments. Source-only questions without a relevant changed line
   go to the review summary with source reference and activation condition, not a comment
   on unrelated code.
