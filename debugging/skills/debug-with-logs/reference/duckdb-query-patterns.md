# DuckDB Query Patterns for JSONL Logs

SQL patterns for querying structured JSONL log files with DuckDB. Use with the DuckDB MCP server.

## Loading JSONL Files

### Single file
```sql
SELECT * FROM read_json_auto('app.log.jsonl') LIMIT 10;
```

### Multiple files (glob)
```sql
SELECT * FROM read_json_auto('logs/*.log.jsonl') LIMIT 10;
```

### With explicit schema (when auto-detect struggles)
```sql
SELECT * FROM read_json('app.log.jsonl',
  columns = {
    "@t": 'TIMESTAMP',
    "@l": 'VARCHAR',
    "@m": 'VARCHAR',
    "@mt": 'VARCHAR',
    "@logger": 'VARCHAR',
    "@x": 'VARCHAR',
    "application": 'VARCHAR'
  },
  format = 'newline_delimited'
);
```

## Filtering Patterns

### By time window
```sql
SELECT "@t", "@l", "@logger", "@m"
FROM read_json_auto('app.log.jsonl')
WHERE "@t" BETWEEN '2025-06-15T14:30:00Z' AND '2025-06-15T14:35:00Z'
ORDER BY "@t";
```

### By log level
```sql
SELECT "@t", "@l", "@m", "@x"
FROM read_json_auto('app.log.jsonl')
WHERE "@l" IN ('Error', 'Warning', 'Fatal', 'Critical')
ORDER BY "@t";
```

### By logger/component
```sql
SELECT "@t", "@l", "@m"
FROM read_json_auto('app.log.jsonl')
WHERE "@logger" LIKE '%OrderService%'
ORDER BY "@t";
```

### By message content (text search)
```sql
SELECT "@t", "@l", "@m"
FROM read_json_auto('app.log.jsonl')
WHERE "@m" ILIKE '%timeout%'
ORDER BY "@t";
```

## Tracing Patterns

### Follow a correlation ID
```sql
SELECT "@t", "@logger", "@l", "@m"
FROM read_json_auto('app.log.jsonl')
WHERE correlationId = 'req-12345'
ORDER BY "@t";
```

### Follow a trace ID across services
```sql
SELECT "@t", application, "@logger", "@l", "@m"
FROM read_json_auto('logs/*.log.jsonl')
WHERE traceId = 'abc123def456'
ORDER BY "@t";
```

### Follow a test case
```sql
SELECT "@t", "@l", "@logger", "@m"
FROM read_json_auto('test-results.log.jsonl')
WHERE "test-case-name" = 'Should_Process_Premium_Orders'
ORDER BY "@t";
```

## Aggregation Patterns

### Error frequency by component
```sql
SELECT "@logger", COUNT(*) as error_count
FROM read_json_auto('app.log.jsonl')
WHERE "@l" IN ('Error', 'Fatal')
GROUP BY "@logger"
ORDER BY error_count DESC;
```

### Log volume by level
```sql
SELECT "@l", COUNT(*) as count
FROM read_json_auto('app.log.jsonl')
GROUP BY "@l"
ORDER BY count DESC;
```

### Errors over time (bucketed)
```sql
SELECT
  date_trunc('minute', "@t"::TIMESTAMP) as minute,
  COUNT(*) as error_count
FROM read_json_auto('app.log.jsonl')
WHERE "@l" = 'Error'
GROUP BY minute
ORDER BY minute;
```

### Distinct error messages
```sql
SELECT "@m", COUNT(*) as occurrences
FROM read_json_auto('app.log.jsonl')
WHERE "@l" = 'Error'
GROUP BY "@m"
ORDER BY occurrences DESC
LIMIT 20;
```

## Analysis Patterns

### Time between related events
```sql
WITH events AS (
  SELECT "@t"::TIMESTAMP as ts, "@m",
    ROW_NUMBER() OVER (ORDER BY "@t") as rn
  FROM read_json_auto('app.log.jsonl')
  WHERE "@logger" = 'OrderService'
  AND correlationId = 'req-12345'
)
SELECT
  a."@m" as first_event,
  b."@m" as next_event,
  age(b.ts, a.ts) as duration
FROM events a
JOIN events b ON b.rn = a.rn + 1;
```

### Find gaps in expected log sequence
```sql
SELECT "@t", "@logger", "@m",
  LEAD("@t"::TIMESTAMP) OVER (ORDER BY "@t") as next_ts,
  age(LEAD("@t"::TIMESTAMP) OVER (ORDER BY "@t"), "@t"::TIMESTAMP) as gap
FROM read_json_auto('app.log.jsonl')
WHERE correlationId = 'req-12345'
ORDER BY "@t";
```

### Tail of log file (most recent entries)
```sql
SELECT "@t", "@l", "@logger", "@m"
FROM read_json_auto('app.log.jsonl')
ORDER BY "@t" DESC
LIMIT 50;
```

### Count logs per test case (find noisy tests)
```sql
SELECT "test-case-name", COUNT(*) as log_count
FROM read_json_auto('test-results.log.jsonl')
WHERE "test-case-name" IS NOT NULL
GROUP BY "test-case-name"
ORDER BY log_count DESC;
```

## Multi-File Patterns

### Compare logs across services
```sql
SELECT application, "@l", COUNT(*) as count
FROM read_json_auto('logs/*.log.jsonl')
GROUP BY application, "@l"
ORDER BY application, count DESC;
```

### Cross-service request trace
```sql
SELECT
  "@t", application, "@logger", "@l", "@m"
FROM read_json_auto('logs/*.log.jsonl')
WHERE traceId = 'abc123'
ORDER BY "@t";
```

## Tips

- Always `ORDER BY "@t"` to see chronological flow
- Use `LIMIT` when exploring large files to avoid memory issues
- Use `ILIKE` for case-insensitive text search
- DuckDB auto-detects JSONL field types — use explicit schema if it guesses wrong
- Quoted field names (like `"@t"`) are required for fields starting with `@`
- Use `::TIMESTAMP` cast when comparing or computing time differences
