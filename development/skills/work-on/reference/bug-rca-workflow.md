# Bug Root Cause Analysis Workflow

This reference defines the bug-specific path for Phase 1.2 when the work item
type is **Bug**. Instead of the standard Plan subagent, bugs follow a
debug-first workflow that produces an evidence-backed Root Cause Analysis (RCA).

## When This Path Activates

Phase 1.2 in SKILL.md routes here when the work item type is `Bug`.

---

## Stage A — Reproduce & Collect Evidence

Invoke the `debugging:debug-with-logs` skill. Provide it with:
- The bug description and repro steps from the work item
- Any error messages, stack traces, or screenshots referenced
- The component/module identified in Phase 1.1

The `debug-with-logs` skill handles Steps 1-5 of its methodology:
1. Understand the reported problem
2. Create repeatable reproduction steps
3. Execute repro and collect JSONL logs
4. Query logs with DuckDB
5. If insufficient, add more logging and re-run

**Collect from `debug-with-logs`:**
- The reproduction steps (exact commands or test case)
- JSONL log file paths covering the repro window
- DuckDB SQL queries used and their results
- The execution flow showing the failure point

**If reproduction fails:**
- Post questions to the work item (Phase 1.3 in SKILL.md) asking for
  environment details, exact steps, or access to logs
- STOP — wait for answers before reattempting

**If the codebase lacks structured logging:**
- Invoke `debugging:logging-enablement` first to set up JSONL logging
- Then return to `debug-with-logs` for the actual debugging

---

## Stage B — Formulate Root Cause Analysis

Continue with `debug-with-logs` Step 6 — confirm root cause with log evidence.

The RCA must be **grounded in observed facts**, not speculation. Every claim
must trace back to a log entry, a code path, or a DuckDB query result.

### RCA Structure

Produce the following structured output:

```
ROOT CAUSE: [One sentence — what is broken and why]

EVIDENCE CHAIN:
1. [Timestamp/Log] <what the log entry shows>
2. [Timestamp/Log] <what the next entry shows>
3. [Code] <file:line — what the code does at the failure point>
4. [Gap] <expected behavior vs actual behavior>

REPRODUCTION:
- <exact steps or test case that triggers the bug>

AFFECTED CODE:
- <file:line> — <what this code does wrong>
- <file:line> — <related code if multiple sites>

BLAST RADIUS:
- <other code paths that share the same flaw, if any>
- <downstream effects of the bug>
```

### Grounding Rules

These rules distinguish evidence-based RCA from speculation:

| ✅ Grounded (acceptable)                  | ❌ Speculative (not acceptable)              |
|-------------------------------------------|----------------------------------------------|
| "Log at T1 shows value X = null"          | "The value is probably null"                 |
| "Code at file:42 skips validation when…"  | "It might skip validation"                   |
| "DuckDB query shows 0 rows for request…"  | "The request likely didn't reach the DB"     |
| "git blame shows this line changed in…"   | "Someone might have changed this recently"   |
| "Test X fails with error Y consistently"  | "This could fail under certain conditions"   |

Every statement in the RCA must be in the left column. If you catch yourself
writing something from the right column, go back to Stage A and collect more
evidence.

---

## Stage C — Adversarial RCA Review

Before posting the RCA, submit it to a critique round. This catches gaps in
reasoning, alternative explanations, and scope blindness.

### Launch Critique Agents

Launch **2-3 explore agents in parallel** (fast, read-only, Haiku model). Each
agent receives the full RCA from Stage B plus the log evidence and DuckDB query
results.

**Agent 1 — Alternative Hypotheses:**
```
Given this root cause analysis and evidence:

<RCA from Stage B>

Your job: Challenge the root cause conclusion. Identify at least 2 alternative
explanations that are consistent with the SAME log evidence. For each:
- State the alternative hypothesis
- Explain which evidence supports it
- Explain which evidence contradicts it (if any)
- Rate plausibility: HIGH / MEDIUM / LOW

If no credible alternatives exist, state why the evidence conclusively rules
them out.
```

**Agent 2 — Evidence Completeness:**
```
Given this root cause analysis and evidence:

<RCA from Stage B>

Your job: Audit the evidence chain for gaps. Check:
1. Is there an unbroken chain from trigger → failure? Where does visibility end?
2. Are there assumptions not backed by log entries?
3. Are there log entries that CONTRADICT the root cause?
4. Is the reproduction reliable? (single run vs multiple confirmed runs)
5. Could this be a symptom of a deeper issue, not the root cause itself?

For each gap found, state:
- What's missing
- What additional evidence would close the gap
- How critical the gap is: BLOCKING (must fix before posting) / MINOR (note in RCA)
```

**Agent 3 — Scope & Blast Radius (optional — launch when bug touches shared code):**
```
Given this root cause analysis and affected code:

<RCA from Stage B>

Your job: Check whether the bug's scope is fully captured:
1. Search for other callers of the affected function/method
2. Check if the same pattern exists in similar code paths
3. Identify if this is a systemic issue or isolated to one path
4. Check if the proposed affected code list is complete

Report any additional affected code paths found.
```

### Process Critique Results

1. **Collect all findings** from the critique agents.
2. **Classify each finding:**
   - **BLOCKING** — a credible alternative hypothesis that the evidence doesn't
     rule out, or a gap that breaks the evidence chain
   - **ACTIONABLE** — a minor gap that should be noted in the RCA
   - **DISMISSED** — a theoretical concern adequately addressed by existing evidence
3. **If BLOCKING findings exist:**
   - Return to Stage A or B to collect additional evidence
   - Re-run the specific critique agent that raised the blocker
   - **Cap: 2 critique rounds maximum.** After 2 rounds, note remaining concerns
     in the RCA under an "Open Questions" section and proceed.
4. **If no BLOCKING findings:**
   - Incorporate ACTIONABLE feedback into the RCA
   - Proceed to posting (Phase 1.4 in SKILL.md)

### Log Critique Results

Append to the decision log:

```markdown
## Part 1 — Adversarial RCA Review
- Round: <1 or 2>
- Alternative Hypotheses agent: <summary — dismissed or addressed>
- Evidence Completeness agent: <summary — gaps found or clean>
- Scope agent: <summary — additional paths found or contained>
- Blocking findings: <count>
- Resolution: <how each blocker was addressed, or "proceeding with open questions">
```

---

## Output

After Stage C completes, this workflow produces:
1. **A grounded RCA** — ready for formatting per
   [rca-comment-format.md](rca-comment-format.md)
2. **Critique summary** — included in the posted comment
3. **Decision log entries** — saved to scratchpad

Control returns to SKILL.md Phase 1.4 for posting.
