---
name: debug-with-logs
description: Debug issues using a log-first methodology — reproduce the problem, collect structured JSONL logs, query them with DuckDB to find root cause, then fix. Use when asked to "debug this issue", "find why X fails", "trace the bug", "investigate error", "analyze logs", "why is X broken", "diagnose this failure", or "find the root cause". NOT for setting up logging (use logging-enablement instead).
allowed-tools: Read, Grep, Glob, Bash, Task, mcp__duckdb__*
---

# Debug With Logs

A systematic log-first debugging methodology. The core principle: **give AI full visibility into code execution via structured JSONL logs queried with DuckDB**.

## When to Use

- Debugging a failing test, broken feature, or unexpected behavior
- Investigating production errors or performance issues
- Tracing execution flow through complex systems
- Any "why does X happen?" question about runtime behavior

## When NOT to Use

- Setting up logging infrastructure → Use `logging-enablement` skill
- Reviewing PR logging quality → Use `logging-review` agent
- Static code analysis without runtime behavior → Standard code review

## Prerequisites

- DuckDB MCP server is available (configured via this plugin's `.mcp.json`)
- If the codebase doesn't have structured logging yet, run `logging-enablement` first

## Methodology: 7 Steps

### Step 1: Understand the Reported Problem

Before touching any code:

1. Read the bug report, error message, or user description carefully
2. Identify the **expected behavior** vs **actual behavior**
3. Note any error messages, stack traces, or screenshots provided
4. Identify which component/service/module is likely involved

**Output**: A clear problem statement — one sentence describing what's wrong.

### Step 2: Create Repeatable Reproduction Steps

A bug you can't reproduce is a bug you can't fix. Create concrete repro steps.

Reference: [Reproduction Step Templates](reference/repro-step-templates.md)

Choose the appropriate template based on the system type:
- HTTP API → curl / httpie commands
- Browser UI → Step-by-step click sequence
- Unit test → Minimal failing test case
- Background job → Trigger command + wait condition
- Multi-service → Docker compose + orchestrated calls

**Output**: A script, command, or step list that reliably triggers the bug.

### Step 3: Execute Repro and Collect Logs

1. Ensure logging is set to `Trace` level for the relevant components
2. Clear or note the starting position in log files
3. Execute the reproduction steps from Step 2
4. Capture the log file path(s) generated

```bash
# Example: note the log file and line count before repro
wc -l app.log.jsonl  # 1523 lines before
# ... run repro ...
wc -l app.log.jsonl  # 1587 lines after → 64 new log lines
```

**Output**: Path to JSONL log file(s) covering the reproduction window.

### Step 4: Query Logs with DuckDB

Use DuckDB to query the JSONL logs at decision points. Start broad, then narrow down.

Reference: [DuckDB Query Patterns](reference/duckdb-query-patterns.md)

**Query progression:**

1. **Overview** — What happened during the repro window?
   ```sql
   SELECT "@t", "@l", "@m" FROM read_json_auto('app.log.jsonl')
   WHERE "@t" > '2025-06-15T14:30:00Z'
   ORDER BY "@t";
   ```

2. **Filter errors** — Any errors or warnings?
   ```sql
   SELECT "@t", "@l", "@m", "@x" FROM read_json_auto('app.log.jsonl')
   WHERE "@l" IN ('Error', 'Warning', 'Fatal')
   ORDER BY "@t";
   ```

3. **Trace specific flow** — Follow a request/operation through the system
   ```sql
   SELECT "@t", "@logger", "@m" FROM read_json_auto('app.log.jsonl')
   WHERE correlationId = 'req-12345'
   ORDER BY "@t";
   ```

4. **Decision point analysis** — What values were in play at the failure point?
   ```sql
   SELECT * FROM read_json_auto('app.log.jsonl')
   WHERE "@logger" = 'OrderService'
   AND "@t" BETWEEN '2025-06-15T14:31:00Z' AND '2025-06-15T14:32:00Z'
   ORDER BY "@t";
   ```

**Output**: SQL query results showing the execution flow and failure point.

### Step 5: If Logs Are Insufficient — Add More, Redo Repro

If Step 4 doesn't reveal the root cause:

1. Identify the **gap** — where does visibility end?
2. Add `Trace`-level logging at the specific decision points
3. Re-run the reproduction steps (Step 2)
4. Re-query with DuckDB (Step 4)

Common gaps:
- Missing logs inside conditional branches
- No logging of input values to a failing function
- Missing correlation IDs across service boundaries
- No logging of return values or early exits

**Iterate Steps 3-5 until root cause is visible in the logs.**

### Step 6: Confirm Root Cause with Log Evidence

The root cause must be **provable from the logs**, not guessed.

Format your findings as:

```
ROOT CAUSE: [One sentence description]

EVIDENCE:
- Log at [timestamp]: [what it shows]
- Log at [timestamp]: [what it shows]
- Gap/unexpected value: [what was expected vs actual]

AFFECTED CODE: [file:line]
```

### Step 7: Write Regression Test → Fix Code → Verify

1. **Write a regression test** that reproduces the bug (should fail)
2. **Fix the code** to address the root cause
3. **Run the regression test** (should now pass)
4. **Re-run the original repro** from Step 2
5. **Query logs** to verify the fix produces correct behavior

## Critical Principles

1. **Logs are evidence** — Never guess. If you can't see it in the logs, add logging until you can.
2. **Reproduce first** — A bug without repro steps is not ready to debug.
3. **Query, don't scroll** — Use DuckDB SQL instead of manually reading log files.
4. **Iterate visibility** — If logs don't show the answer, the problem is insufficient logging, not insufficient thinking.
5. **Prove the fix** — The same logs that showed the bug must show the fix working.

## Reference Files

- [DuckDB Query Patterns](reference/duckdb-query-patterns.md) — SQL patterns for loading, filtering, tracing, aggregating JSONL logs
- [Log Format Specification](reference/log-format-spec.md) — Canonical JSONL field names and conventions
- [Reproduction Step Templates](reference/repro-step-templates.md) — Templates for different system types
