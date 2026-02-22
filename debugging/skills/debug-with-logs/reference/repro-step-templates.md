# Reproduction Step Templates

Templates for creating repeatable reproduction steps for different system types. Choose the template matching your scenario.

## HTTP API

```markdown
### Reproduction Steps

**Environment**: [local / staging / production]
**Base URL**: http://localhost:5000

**Prerequisites**:
- [ ] Service is running with Trace-level logging
- [ ] Log file path: `logs/api.log.jsonl`
- [ ] Required test data: [describe seed data or setup commands]

**Steps**:

1. Clear/note current log position:
   ```bash
   wc -l logs/api.log.jsonl
   ```

2. Execute the failing request:
   ```bash
   curl -X POST http://localhost:5000/api/orders \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"customerId": "CUST-789", "items": [{"sku": "ITEM-001", "qty": 2}]}'
   ```

3. Capture the response:
   - Expected: 200 OK with order confirmation
   - Actual: [describe what actually happens]

4. Query logs from the repro window:
   ```sql
   SELECT "@t", "@l", "@logger", "@m"
   FROM read_json_auto('logs/api.log.jsonl')
   WHERE "@t" > '[timestamp from step 1]'
   ORDER BY "@t";
   ```
```

## Browser / UI

```markdown
### Reproduction Steps

**Environment**: [local / staging]
**URL**: http://localhost:3000

**Prerequisites**:
- [ ] App is running with client-side log forwarding enabled
- [ ] Server log file: `logs/web.log.jsonl`
- [ ] Browser DevTools console open

**Steps**:

1. Navigate to [specific URL]
2. Log in as user: [test credentials or role]
3. Click [specific element]
4. Fill in form field [name] with value [value]
5. Click [submit button]

**Expected**: [describe expected behavior]
**Actual**: [describe actual behavior]

**Artifacts**:
- Browser console errors: [paste or screenshot]
- Network tab: [relevant failed requests]
- Server logs: query with DuckDB after repro
```

## Unit / Integration Test

```markdown
### Reproduction Steps

**Test file**: `tests/OrderServiceTests.cs`
**Test name**: `Should_Process_Premium_Orders`

**Prerequisites**:
- [ ] Test logging configured to output JSONL
- [ ] Log file: `test-results.log.jsonl`

**Steps**:

1. Run the specific failing test:
   ```bash
   # C#
   dotnet test --filter "FullyQualifiedName~Should_Process_Premium_Orders" --logger "console;verbosity=detailed"

   # JS/TS
   npx jest --testNamePattern="should process premium orders"

   # Python
   pytest tests/test_orders.py::test_process_premium_orders -v

   # Rust
   cargo test process_premium_orders -- --nocapture
   ```

2. Check test result: PASS / FAIL / ERROR

3. Query test logs:
   ```sql
   SELECT "@t", "@l", "@logger", "@m"
   FROM read_json_auto('test-results.log.jsonl')
   WHERE "test-case-name" = 'Should_Process_Premium_Orders'
   ORDER BY "@t";
   ```
```

## Background Job / Scheduled Task

```markdown
### Reproduction Steps

**Job name**: [e.g., OrderExpirationJob]
**Schedule**: [e.g., every 5 minutes / on-demand trigger]

**Prerequisites**:
- [ ] Job configured with Trace-level logging
- [ ] Log file: `logs/jobs.log.jsonl`
- [ ] Required state: [describe data that triggers the job]

**Steps**:

1. Set up the triggering condition:
   ```bash
   # Example: create an order that should expire
   curl -X POST http://localhost:5000/api/orders \
     -d '{"customerId": "CUST-001", "expiresAt": "2025-01-01T00:00:00Z"}'
   ```

2. Trigger the job:
   ```bash
   # If on-demand trigger is available:
   curl -X POST http://localhost:5000/api/admin/jobs/trigger \
     -d '{"jobName": "OrderExpirationJob"}'

   # If scheduled, wait for next execution:
   # Watch logs for job start
   ```

3. Wait for completion:
   ```bash
   # Poll for job completion in logs
   ```

4. Query job execution logs:
   ```sql
   SELECT "@t", "@l", "@logger", "@m"
   FROM read_json_auto('logs/jobs.log.jsonl')
   WHERE "@logger" LIKE '%OrderExpiration%'
   AND "@t" > '[timestamp before trigger]'
   ORDER BY "@t";
   ```
```

## Multi-Service / Distributed System

```markdown
### Reproduction Steps

**Services involved**: [list services, e.g., API Gateway, Order Service, Payment Service]
**Infrastructure**: [Docker Compose / Kubernetes / local processes]

**Prerequisites**:
- [ ] All services running with Trace-level logging
- [ ] Log files:
  - API Gateway: `logs/gateway.log.jsonl`
  - Order Service: `logs/orders.log.jsonl`
  - Payment Service: `logs/payments.log.jsonl`
- [ ] Correlation ID propagation verified

**Steps**:

1. Note starting log positions for all services

2. Execute the cross-service request:
   ```bash
   curl -X POST http://localhost:8080/api/checkout \
     -H "Content-Type: application/json" \
     -H "X-Correlation-ID: debug-$(date +%s)" \
     -d '{"orderId": "ORD-TEST-001", "paymentMethod": "credit_card"}'
   ```

3. Note the correlation ID from the response headers

4. Trace across all services:
   ```sql
   SELECT "@t", application, "@logger", "@l", "@m"
   FROM read_json_auto('logs/*.log.jsonl')
   WHERE correlationId = '[correlation-id-from-step-3]'
   ORDER BY "@t";
   ```

5. Identify where the flow breaks:
   ```sql
   SELECT application,
     MIN("@t") as first_log,
     MAX("@t") as last_log,
     COUNT(*) as log_count,
     SUM(CASE WHEN "@l" = 'Error' THEN 1 ELSE 0 END) as errors
   FROM read_json_auto('logs/*.log.jsonl')
   WHERE correlationId = '[correlation-id]'
   GROUP BY application;
   ```
```

## Tips for Good Reproduction Steps

1. **Be exact** — Include specific values, not "enter some data"
2. **Include setup** — What state must exist before the repro starts?
3. **Note the log window** — Record timestamps or line counts to bound your DuckDB queries
4. **Make it idempotent** — Steps should work even if run multiple times
5. **Include cleanup** — How to reset state for the next repro attempt
