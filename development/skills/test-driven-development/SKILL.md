---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development (TDD)

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

## When to Use

**Always:**
- New features
- Bug fixes
- Refactoring
- Behavior changes

**Exceptions (ask the user):**
- Throwaway prototypes
- Generated code
- Configuration files

Thinking "skip TDD just this once"? Stop. That's rationalization.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete

Implement fresh from tests. Period.

## Red-Green-Refactor

```dot
digraph tdd_cycle {
    rankdir=LR;
    red [label="RED\nWrite failing test", shape=box, style=filled, fillcolor="#ffcccc"];
    verify_red [label="Verify fails\ncorrectly", shape=diamond];
    green [label="GREEN\nMinimal code", shape=box, style=filled, fillcolor="#ccffcc"];
    verify_green [label="Verify passes\nAll green", shape=diamond];
    refactor [label="REFACTOR\nClean up", shape=box, style=filled, fillcolor="#ccccff"];
    next [label="Next", shape=ellipse];

    red -> verify_red;
    verify_red -> green [label="yes"];
    verify_red -> red [label="wrong\nfailure"];
    green -> verify_green;
    verify_green -> refactor [label="yes"];
    verify_green -> green [label="no"];
    refactor -> verify_green [label="stay\ngreen"];
    verify_green -> next;
    next -> red;
}
```

### RED - Write Failing Test

Write one minimal test showing what should happen.

<Good>
```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

  const result = await retryOperation(operation);

  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```
Clear name, tests real behavior, one thing
</Good>

<Bad>
```typescript
test('retry works', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(3);
});
```
Vague name, tests mock not code
</Bad>

**Requirements:**
- One behavior
- Clear name
- Real code (no mocks unless unavoidable)

### Verify RED - Watch It Fail

**MANDATORY. Never skip.**

```bash
npm test path/to/test.test.ts
```

Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

**Test passes?** You're testing existing behavior. Fix test.

**Test errors?** Fix error, re-run until it fails correctly.

### GREEN - Minimal Code

Write simplest code to pass the test.

<Good>
```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error('unreachable');
}
```
Just enough to pass
</Good>

<Bad>
```typescript
async function retryOperation<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    backoff?: 'linear' | 'exponential';
    onRetry?: (attempt: number) => void;
  }
): Promise<T> {
  // YAGNI
}
```
Over-engineered
</Bad>

Don't add features, refactor other code, or "improve" beyond the test.

### Verify GREEN - Watch It Pass

**MANDATORY.**

```bash
npm test path/to/test.test.ts
```

Confirm:
- Test passes
- Other tests still pass
- Output pristine (no errors, warnings)

**Test fails?** Fix code, not test.

**Other tests fail?** Fix now.

### REFACTOR - Clean Up

After green only:
- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

### Repeat

Next failing test for next feature.

## Instrumented TDD — Logs as Breakpoints

Every test you write and every line of production code you implement should be instrumented with structured JSONL logging. Trace logs are your breakpoints — they dump variable values so AI can see exactly what happened when a test fails.

**Prerequisite:** If the codebase doesn't have structured logging yet, run `debugging:logging-enablement` first to set up the logger, JSONL file sink, and test harness integration.

### Log Levels in TDD Code

| Level | Where | What | EUII | Production |
|-------|-------|------|------|------------|
| **Trace** | Production code | Variable values, intermediate state, input/output of functions — the stuff you'd put a breakpoint on | YES (stripped from release builds) | Compiled out, zero overhead |
| **Debug** | Production code | Positive handshakes: "OrderService.Place entered", "validation passed". Narrows WHERE, not WHAT | NO | Kept, toggled on demand |
| **Information** | Production code | Business event sequence: "Order accepted", "Payment processed". Execution flow for timeline reconstruction | NO | Always on |
| **Warning** | Production code | Unexpected but recoverable: retry, fallback, degraded mode | NO | Always on |
| **Error** | Production code | Operation failure, recoverable at higher level | NO | Always on |

**Tests themselves** log at Debug/Info to mark test phases (arrange/act/assert) and capture outcomes.

### Why Trace ≠ Production Risk

Trace is compiled out of release builds. This is the **only** reason EUII is safe at Trace:
- Local dev / tests: Trace minimum → full variable visibility
- Production: Information minimum → no EUII, no noise
- Release builds: Trace statements produce zero overhead

### RED Phase — Instrumented Tests

When writing the failing test, set up a structured logger with test context:

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

### GREEN Phase — Instrumented Production Code

When writing minimal code to pass the test, add logging at decision points:

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
- EUII (emails, user names, IPs) is **Trace-only** — forbidden at Debug and above

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

## Good Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear** | Name describes behavior | `test('test1')` |
| **Shows intent** | Demonstrates desired API | Obscures what code should do |

## Why Order Matters

**"I'll write tests after to verify it works"**

Tests written after code pass immediately. Passing immediately proves nothing:
- Might test wrong thing
- Might test implementation, not behavior
- Might miss edge cases you forgot
- You never saw it catch the bug

Test-first forces you to see the test fail, proving it actually tests something.

**"I already manually tested all the edge cases"**

Manual testing is ad-hoc. You think you tested everything but:
- No record of what you tested
- Can't re-run when code changes
- Easy to forget cases under pressure
- "It worked when I tried it" ≠ comprehensive

Automated tests are systematic. They run the same way every time.

**"Deleting X hours of work is wasteful"**

Sunk cost fallacy. The time is already gone. Your choice now:
- Delete and rewrite with TDD (X more hours, high confidence)
- Keep it and add tests after (30 min, low confidence, likely bugs)

The "waste" is keeping code you can't trust. Working code without real tests is technical debt.

**"TDD is dogmatic, being pragmatic means adapting"**

TDD IS pragmatic:
- Finds bugs before commit (faster than debugging after)
- Prevents regressions (tests catch breaks immediately)
- Documents behavior (tests show how to use code)
- Enables refactoring (change freely, tests catch breaks)

"Pragmatic" shortcuts = debugging in production = slower.

**"Tests after achieve the same goals - it's spirit not ritual"**

No. Tests-after answer "What does this do?" Tests-first answer "What should this do?"

Tests-after are biased by your implementation. You test what you built, not what's required. You verify remembered edge cases, not discovered ones.

Tests-first force edge case discovery before implementing. Tests-after verify you remembered everything (you didn't).

30 minutes of tests after ≠ TDD. You get coverage, lose proof tests work.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Tests after achieve same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = design unclear" | Listen to test. Hard to test = hard to use. |
| "TDD will slow me down" | TDD faster than debugging. Pragmatic = test-first. |
| "Manual test faster" | Manual doesn't prove edge cases. You'll re-test every change. |
| "Existing code has no tests" | You're improving it. Add tests for existing code. |

## Red Flags - STOP and Start Over

- Code before test
- Test after implementation
- Test passes immediately
- Can't explain why test failed
- Tests added "later"
- Rationalizing "just this once"
- "I already manually tested it"
- "Tests after achieve the same purpose"
- "It's about spirit not ritual"
- "Keep as reference" or "adapt existing code"
- "Already spent X hours, deleting is wasteful"
- "TDD is dogmatic, I'm being pragmatic"
- "This is different because..."

**All of these mean: Delete code. Start over with TDD.**

## Example: Bug Fix

**Bug:** Empty email accepted

**RED**
```typescript
test('rejects empty email', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('Email required');
});
```

**Verify RED**
```bash
$ npm test
FAIL: expected 'Email required', got undefined
```

**GREEN**
```typescript
function submitForm(data: FormData) {
  if (!data.email?.trim()) {
    return { error: 'Email required' };
  }
  // ...
}
```

**Verify GREEN**
```bash
$ npm test
PASS
```

**REFACTOR**
Extract validation for multiple fields if needed.

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered
- [ ] Production code has Trace logging at decision points (variable values, branch entries)
- [ ] Production code has Debug/Info logging for execution flow (no EUII at these levels)
- [ ] Tests use structured logger with test-case-name and test-module-name context
- [ ] JSONL log output is queryable and shows full execution trace for each test

Can't check all boxes? You skipped TDD. Start over.

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. Ask the user. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

## Debugging Integration

Bug found? **Logs first, then test.**

1. **Ensure logging is enabled** — If the codebase lacks structured JSONL logging, run `debugging:logging-enablement` before anything else
2. **Reproduce with Trace logging on** — Run the buggy code path with minimum level set to Trace
3. **Query the JSONL logs** — Use DuckDB to trace the execution and find where values go wrong (use `debugging:debug-with-logs` for the full methodology)
4. **Write failing test reproducing the bug** — Now that you understand the root cause from the logs
5. **Fix the code** — Minimal change to pass the test
6. **Verify via logs** — Re-run and confirm the JSONL logs show correct behavior at the fix point

**Never fix bugs without a test. Never diagnose bugs without reading the logs.**

For complex or multi-attempt failures, use `debugging:systematic-debugging` — it enforces root cause investigation before any fix attempts.

## Testing Anti-Patterns

When adding mocks or test utilities, read `testing-anti-patterns.md` to avoid common pitfalls:
- Testing mock behavior instead of real behavior
- Adding test-only methods to production classes
- Mocking without understanding dependencies

## Final Rule

```
Production code → test exists and failed first
Otherwise → not TDD
```

No exceptions without the user's permission.
