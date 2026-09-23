# Instrumented Logging — Logs as Breakpoints

Load when adding logging to code under test, or when a scenario or test fails and you need to see why.

Where you are diagnosing a failure, or where the project already logs, instrument tests and production code with structured JSONL logging. Do not bootstrap a logging stack inside an unrelated task. Trace logs are your breakpoints — they dump variable values so AI can see exactly what happened when a test fails.

**No structured logging yet?** Run `debugging:logging-enablement` only when the task is to add logging, or when diagnosis needs it and the user agrees. Otherwise diagnose with the project's existing output.

### Log Levels

| Level | Where | What | EUII | Production |
|-------|-------|------|------|------------|
| **Trace** | Production code | Variable values, intermediate state, input/output of functions — the stuff you'd put a breakpoint on | Only if the logger strips Trace from release builds (see below) | Filtered by minimum level |
| **Debug** | Production code | Positive handshakes: "OrderService.Place entered", "validation passed". Narrows WHERE, not WHAT | NO | Kept, toggled on demand |
| **Information** | Production code | Business event sequence: "Order accepted", "Payment processed". Execution flow for timeline reconstruction | NO | Always on |
| **Warning** | Production code | Unexpected but recoverable: retry, fallback, degraded mode | NO | Always on |
| **Error** | Production code | Operation failure, recoverable at higher level | NO | Always on |

**Tests themselves** log at Debug/Info to mark test phases (arrange/act/assert) and capture outcomes.

### Trace and production risk

Most loggers (pino, Python `logging`, Microsoft.Extensions.Logging, Serilog) do **not** compile Trace out; they filter it by minimum level at runtime. A misconfigured level in production then writes everything logged at Trace.

- EUII (emails, user names, IPs) at Trace is acceptable **only** when the build removes Trace calls (e.g. `[Conditional]` wrappers, build-time stripping) or the logger redacts EUII. Otherwise log IDs, not EUII, at every level.
- Local dev / tests: Trace minimum → full variable visibility.
- Production: Information minimum → no noise.

### Instrumented Tests

When writing a test, set up a structured logger with test context:

```typescript
test('retries failed operations 3 times', async () => {
  // Bind logger with test-case-name inside each test
  const log = withTestCase(moduleLogger, 'retries failed operations 3 times');

  let attempts = 0;
  const operation = () => {
    attempts++;
    log.trace({ attempt: attempts }, 'Operation attempt');
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

  const result = await retryOperation(operation, log);

  log.debug({ result, attempts }, 'Assert: verifying retry behavior');
  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

### Instrumented Production Code

When writing production code, add logging at decision points:

```typescript
async function retryOperation<T>(fn: () => Promise<T>, log: Logger): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      log.trace({ attempt: i + 1 }, 'Attempting operation');
      const result = await fn();
      log.debug({ attempt: i + 1 }, 'Operation succeeded');
      return result;
    } catch (e) {
      log.trace({ attempt: i + 1, error: e.message }, 'Operation failed, will retry');
      if (i === 2) {
        log.error({ attempt: i + 1, error: e.message }, 'All retries exhausted');
        throw e;
      }
    }
  }
  throw new Error('unreachable');
}
```

**Key rules:**
- **Trace** for variable dumps (attempt number, intermediate values, caught errors) — breakpoint equivalents
- **Debug** for positive handshakes ("operation succeeded") — narrows WHERE
- **Info** for business events ("order accepted") — timeline reconstruction
- **Error** for failures the caller will handle
- EUII (emails, user names, IPs) is forbidden at Debug and above, and at Trace unless Trace is stripped or redacted (see above)

### When a Test Fails Unexpectedly

**Don't guess. Read the logs.**

1. Run the failing test
2. Open the JSONL log file (e.g., `my-app.log.jsonl`)
3. Query with DuckDB to see exactly what happened:

```sql
-- What happened during the failing test?
SELECT "@t", "@l", "@m"
FROM read_json_auto('my-app.log.jsonl')
WHERE "test-case-name" = 'retries failed operations 3 times'
ORDER BY "@t";

-- What were the variable values at Trace level?
SELECT "@t", "@m", attempt, error
FROM read_json_auto('my-app.log.jsonl')
WHERE "test-case-name" = 'retries failed operations 3 times'
  AND "@l" = 'Trace'
ORDER BY "@t";
```

4. If logs don't reveal the issue → add more Trace logging at the gap → re-run → re-query
5. For deeper investigation, use `debugging:debug-with-logs` skill

**The logs replace the debugger.** Trace-level logs dump every variable you'd inspect at a breakpoint. The AI reads the JSONL and sees the full execution trace.
