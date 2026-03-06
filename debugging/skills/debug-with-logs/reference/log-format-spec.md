# Canonical JSONL Log Format Specification

This is the single source of truth for structured log field names used across all logging in this plugin's methodology.

## Philosophy

- Logs are not afterthoughts — they ARE the debugging tool
- The entire debugging methodology lives and dies by log effectiveness
- Logs provide AI-visible execution traces, replacing the need for a debugger
- Log enough information to easily identify the issue — include relevant variable values, IDs, and state as long as they meet the EUII policy for the chosen log level

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
| `source` | string | Origin of the log entry | `"client"` or `"server"` |

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

| Level | Semantics | EUII | Production | Volume |
|-------|-----------|------|------------|--------|
| `Trace` | Breakpoint-level: variable values, intermediate state, debugger-equivalent | YES (stripped from release builds) | Compiled out, zero overhead | Highest (Debug < 1/4 of Trace) |
| `Debug` | OCE area identification: positive handshakes ("OrderService started"). Narrows WHERE, not WHAT | NO | Kept, may be toggled | Info ~1/4 of Debug |
| `Information` | Production bug sequence: execution flow, event timeline reconstruction | NO | Always on | Least verbose |
| `Warning` | Unexpected but recoverable: retry, fallback, degraded mode | NO | Always on | -- |
| `Error` | Operation failure, recoverable at higher level | NO | Always on | -- |
| `Fatal` / `Critical` | Unrecoverable, immediate attention required | NO | Always on | -- |

## Level Strategy

- **Local dev / tests**: Trace minimum (full EUII visibility safe here)
- **Production**: Information minimum (Debug when actively troubleshooting, toggled)
- **Release builds**: Trace MUST be compiled out (this is what makes EUII-in-Trace safe)

## EUII Policy

- **FORBIDDEN** at Debug and above (these persist in production)
- **PERMITTED** at Trace ONLY (stripped from release builds — the sole reason it's safe)
- **What counts as EUII**: emails, user names, display names, IPs, phone numbers, session/auth tokens
- **What is NOT EUII**: system-generated IDs (order IDs, correlation IDs, trace IDs), service names
- **Enforcement**: logging-review agent flags EUII at Debug+ as CRITICAL

## Client-Side Log Forwarding

- Client logs (browser, web, mobile web) MUST be forwarded to server for file-based JSONL logging
- Mechanism not prescribed (HTTP POST, WebSocket, beacon, etc.)
- Server writes client logs in same JSONL format with canonical fields
- Every log line MUST include `source` field: `"client"` or `"server"`
- Rationale: without forwarding, client execution is invisible to DuckDB queries

## Verbosity Guidance

- Volume ratios: Trace >> Debug >> Info (each ~4x the next level up)
- Trace = "what would I put a breakpoint on?"
- Debug = "which service/component is executing?"
- Info = "what is the sequence of business events?"

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
