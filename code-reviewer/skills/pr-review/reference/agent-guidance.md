# Agent Guidance — Discipline Blocks & Question Handling

Load this file **before dispatching any review agent (Steps 4-8)** and again at
**Step 10** (question consolidation). The four discipline blocks below MUST be
included (verbatim or faithfully summarized) in every dispatched agent's prompt.

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

**Question format:**

```
## Question [N]
- File: [path:line]
- Code Context: [the specific code snippet]
- Uncertainty: [what you cannot determine and why]
- What Answering Unlocks: [what you could assess with an answer]
- Suggested Answers: [optional — 2-3 possible answers]
```

Include questions in your output alongside findings. They will be collected
in Step 10 and posted as `[QUESTION]` inline comments.
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

1. Collect all `[QUESTION]` items from agent outputs in steps 4-9
2. De-duplicate: if two agents ask about the same code area, merge into one question
   that captures both angles
3. Filter out questions that are already answered by the PR description, work item
   context (from `pr-context`), or inline code comments
4. Rank by review impact: questions that would affect severity grading or verdict
   determination rank higher
5. Cap at **10 questions per review** — if more exist, keep the highest-impact ones
   and note "N additional questions omitted for brevity"

**What flows forward:**
- Questions do NOT go to the review-grader (Step 11) — they are separate from findings
- Questions go directly to the `post-pr-review` skill (Step 12) for posting as
  inline comments with `[QUESTION]` tag
