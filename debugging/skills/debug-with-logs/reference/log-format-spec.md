# Canonical JSONL Log Format Specification

This is the single source of truth for structured log field names used across all logging in this plugin's methodology.

## Format

All logs MUST be written as **JSON Lines (JSONL)** — one JSON object per line, newline-delimited.

```jsonl
{"@t":"2025-06-15T14:32:01.4567890Z","@l":"Information","@m":"Order processed","@logger":"OrderService","application":"checkout-api","orderId":"ORD-12345","customerId":"CUST-789","durationMs":142}
```

## Canonical Fields

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `@t` | string (ISO 8601) | UTC timestamp with sub-second precision | `"2025-06-15T14:32:01.4567890Z"` |
| `@l` | string | Log level | `"Information"`, `"Error"`, `"Debug"` |
| `@m` | string | Rendered human-readable message | `"Order ORD-12345 processed in 142ms"` |

### Recommended Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `@mt` | string | Message template (structured) | `"Order {OrderId} processed in {DurationMs}ms"` |
| `@logger` | string | Logger name / source class | `"OrderService"` |
| `application` | string | Application or service name | `"checkout-api"` |
| `@x` | string | Exception details (full stack trace) | `"System.NullReferenceException: ..."` |

### Test Context Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `test-case-name` | string | Individual test method name | `"Should_Process_Premium_Orders"` |
| `test-module-name` | string | Test class or module | `"OrderServiceTests"` |

### Correlation Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `traceId` | string | Distributed trace ID | `"abc123def456"` |
| `spanId` | string | Current span ID | `"span-789"` |
| `correlationId` | string | Business correlation ID | `"req-2025-001"` |

### Structured Property Fields

Any additional structured properties from log templates become top-level fields:

```jsonl
{"@t":"...","@l":"Information","@m":"Processing order ORD-123","@mt":"Processing order {OrderId}","OrderId":"ORD-123","CustomerId":"CUST-456"}
```

## Log Levels

Use consistent level names across the codebase:

| Level | When to Use |
|-------|------------|
| `Trace` | Fine-grained diagnostics: method entry/exit, variable values. Local dev only. |
| `Debug` | Diagnostic information useful during development and troubleshooting. |
| `Information` | Normal operational events: request received, operation completed, state transitions. |
| `Warning` | Unexpected but recoverable: retry needed, fallback used, degraded mode. |
| `Error` | Operation failure that is recoverable at a higher level. |
| `Fatal` / `Critical` | Unrecoverable failure requiring immediate attention. |

## Level Strategy

- **Local development / tests**: Set minimum level to `Trace`
- **Production**: Set minimum level to `Information` (or `Warning` for high-volume services)
- **Never** log sensitive data (passwords, tokens, PII) at any level

## File Naming Convention

Log files should follow: `{application}.log.jsonl`

Examples:
- `checkout-api.log.jsonl`
- `order-service-tests.log.jsonl`
- `web-frontend.log.jsonl`

## Compatibility Notes

This spec aligns with Serilog's Compact JSON format (`@t`, `@l`, `@m`, `@mt`, `@x`). Other libraries should map their fields to these canonical names at the formatter/sink level.

| Library | Native Format | Mapping Required |
|---------|--------------|-----------------|
| Serilog (CompactJsonFormatter) | `@t`, `@l`, `@m` | None — native match |
| Pino | `time`, `level`, `msg` | Configure `formatters` or post-process |
| structlog | `timestamp`, `level`, `event` | Configure `JSONRenderer` processors |
| tracing-subscriber (JSON) | `timestamp`, `level`, `message` | Configure field names in layer |
