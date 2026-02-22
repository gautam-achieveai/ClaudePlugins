---
name: logging-enablement
description: Set up structured JSONL logging in a codebase for both production code and test harnesses. Supports C#, JavaScript/TypeScript, Python, and Rust. Use when asked to "add logging", "set up structured logging", "enable test logging", "make this debuggable", "add JSONL logging", "configure log output", or "instrument this code with logs". NOT for debugging issues (use debug-with-logs) or reviewing logging quality (use logging-review agent).
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Logging Enablement

Set up structured JSONL logging in a codebase so it's ready for log-first debugging.

## When to Use

- Adding structured logging to a codebase that doesn't have it
- Converting `Console.WriteLine` / `print()` / `console.log()` to structured logging
- Setting up test harness logging with test context enrichment
- Configuring JSONL file output for log querying

## When NOT to Use

- Debugging an issue → Use `debug-with-logs` skill
- Reviewing logging in a PR → Use `logging-review` agent

## Workflow

### Step 1: Detect Language and Frameworks

Scan the codebase to determine:

1. **Primary language(s)**: Look for project files
   - `.csproj` / `.sln` → C#
   - `package.json` → JavaScript/TypeScript
   - `pyproject.toml` / `setup.py` / `requirements.txt` → Python
   - `Cargo.toml` → Rust

2. **Test framework(s)**: Look for test configuration
   - C#: `xunit` / `NUnit` / `MSTest` references in `.csproj`
   - JS/TS: `jest.config.*` / `vitest.config.*` / `.mocharc.*`
   - Python: `pytest.ini` / `conftest.py` / `unittest` imports
   - Rust: `#[cfg(test)]` blocks, `tests/` directory

3. **Existing logging**: Check for current logging setup
   - Grep for logging library imports/usages
   - Check for any log configuration files
   - Note any `Console.Write` / `print()` / `console.log` usage

### Step 2: Audit Current Logging State

Classify the codebase into one of:

| State | Description | Action |
|-------|-------------|--------|
| **No logging** | No logging library, uses print/console | Full enablement needed |
| **Unstructured logging** | Has logging library but text format | Configure JSONL formatter |
| **Structured but not JSONL** | JSON logging but missing canonical fields | Align field names |
| **Already compliant** | JSONL with canonical fields | Verify and skip |

### Step 3: Apply Enablement

Read the appropriate language-specific reference guide:

| Language | Test Harness Guide | Production Guide |
|----------|-------------------|-----------------|
| C# | [csharp/test-harness-logging.md](reference/csharp/test-harness-logging.md) | [csharp/production-logging.md](reference/csharp/production-logging.md) |
| JS/TS | [js-ts/test-harness-logging.md](reference/js-ts/test-harness-logging.md) | [js-ts/production-logging.md](reference/js-ts/production-logging.md) |
| Python | [python/test-harness-logging.md](reference/python/test-harness-logging.md) | [python/production-logging.md](reference/python/production-logging.md) |
| Rust | [rust/test-harness-logging.md](reference/rust/test-harness-logging.md) | [rust/production-logging.md](reference/rust/production-logging.md) |

For each guide, follow:
1. Install required packages
2. Configure the logger with JSONL output
3. Set up canonical field names per [log-render-spec.md](reference/log-render-spec.md)
4. Add test context enrichment (for test projects)
5. Add example log statements at key decision points

### Step 4: Verify with DuckDB

After enablement, verify the logging output is queryable:

1. Run the application or tests to generate log output
2. Query the JSONL file with DuckDB:

```sql
-- Verify canonical fields are present
SELECT "@t", "@l", "@logger", "@m"
FROM read_json_auto('app.log.jsonl')
LIMIT 5;

-- Verify test context fields (for test projects)
SELECT "test-case-name", "test-module-name", "@m"
FROM read_json_auto('test-results.log.jsonl')
WHERE "test-case-name" IS NOT NULL
LIMIT 5;
```

3. Confirm:
   - [ ] `@t` is ISO 8601 UTC with sub-second precision
   - [ ] `@l` has correct log level values
   - [ ] `@m` contains rendered messages
   - [ ] `@logger` identifies the source component
   - [ ] Structured properties are top-level fields
   - [ ] Test logs include `test-case-name` and `test-module-name`

## Key Decisions

### Which logging library?

Use whatever the project already uses. If starting fresh, prefer:

| Language | Recommended | Why |
|----------|------------|-----|
| C# | Serilog | Native CompactJsonFormatter produces canonical `@t`/`@l`/`@m` |
| JS/TS | Pino | Fastest, native JSON output, minimal config |
| Python | structlog | Composable processors, clean JSON output |
| Rust | tracing + tracing-subscriber | Ecosystem standard, JSON layer available |

### Where to log?

Add logging at **decision points** — places where the code chooses a path:

- Conditional branches (`if`/`else`, `switch`)
- Error handling (`catch`, error returns)
- External calls (DB queries, HTTP requests, message sends)
- State transitions (status changes, mode switches)
- Loop boundaries (entering/exiting, iteration counts)

### What level?

See [log-format-spec.md](reference/log-render-spec.md) for the level guide. Quick rule:

- **Trace**: Method entry/exit, variable values
- **Debug**: Intermediate results, diagnostic data
- **Information**: Business operations (order created, user logged in)
- **Warning**: Recoverable issues (retry, fallback)
- **Error**: Operation failures
- **Fatal**: Unrecoverable failures

## Reference Files

- [Log Render Spec](reference/log-render-spec.md) — Canonical field names (shared spec)
- Language-specific guides in `reference/{language}/`
