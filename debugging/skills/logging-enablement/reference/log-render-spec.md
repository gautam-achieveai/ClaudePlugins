# Log Render Specification

Canonical field names for structured JSONL log output. This is the shared spec referenced by all language-specific enablement guides.

> **Primary spec**: See [`debug-with-logs/reference/log-format-spec.md`](../../debug-with-logs/reference/log-format-spec.md) for the full canonical format.
> This file provides a quick-reference summary focused on what enablement guides need.

## Required Render Fields

Every JSONL log line MUST include these fields:

```
@t       — ISO 8601 UTC timestamp with sub-second precision
@l       — Log level (Trace, Debug, Information, Warning, Error, Fatal)
@m       — Rendered message (human-readable)
```

## Recommended Render Fields

```
@mt      — Message template (structured, with placeholders)
@logger  — Source class or logger name
application — Service or application name
@x       — Exception stack trace (when applicable)
```

## Test-Specific Render Fields

When logging from tests, ALWAYS include:

```
test-case-name   — The individual test method name
test-module-name — The test class or module name
```

## Structured Properties

Named placeholders in message templates become top-level JSON fields:

```csharp
// Template:
logger.LogInformation("Processing order {OrderId} for {CustomerId}", orderId, customerId);

// Renders as:
{"@t":"...","@l":"Information","@m":"Processing order ORD-123 for CUST-456","@mt":"Processing order {OrderId} for {CustomerId}","OrderId":"ORD-123","CustomerId":"CUST-456"}
```

## Field Consistency Rules

1. **Pick one name per concept** and use it everywhere in the codebase
2. **Never mix** `timestamp` and `@t` in the same project — configure the formatter to use canonical names
3. **Exception objects** go in `@x`, never stringified into `@m`
4. **Log level values** must be consistent: use either PascalCase (`Information`) or lowercase (`info`), not both

## Log File Output

- Format: JSONL (one JSON object per line)
- File extension: `.log.jsonl`
- Naming: `{application}.log.jsonl`
- Rotation: Configure size-based or time-based rotation
- Minimum level: `Trace` for local/test, `Information` for production
