# JavaScript/TypeScript Test Harness Logging

Set up structured JSONL logging in Jest, Vitest, and Mocha test suites using Pino. All test output flows through the structured logger — never `console.log` or `console.error`.

> **Canonical field spec**: See [`../log-render-spec.md`](../log-render-spec.md) for required field names.

---

## Canonical Field Mapping for Pino

Pino's native field names differ from the canonical spec. Configure formatters to remap them:

| Canonical Field | Pino Native | Action Required |
|-----------------|-------------|-----------------|
| `@t` | `time` (epoch ms) | Format as ISO 8601 UTC string |
| `@l` | `level` (integer) | Map integers to level label strings |
| `@m` | `msg` | Rename key to `@m` |
| `@logger` | _(not built-in)_ | Add via child logger binding |
| `test-case-name` | _(not built-in)_ | Inject via child logger binding |
| `test-module-name` | _(not built-in)_ | Inject via child logger binding |

---

## Shared Logger Factory

Create a shared module that all test files import. This is the single place where Pino is configured and canonical field names are enforced.

### Install

```bash
npm install --save-dev pino pino-pretty
```

> **TypeScript**: No separate `@types/pino` needed — Pino ships its own type definitions.

### `test/logger.ts` (or `test/logger.js`)

```typescript
import pino, { Logger, LoggerOptions } from 'pino';
import path from 'path';
import fs from 'fs';

// Resolve log file path: {project-root}/{package-name}.log.jsonl
const projectRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
const logFile = path.join(projectRoot, `${packageJson.name}.log.jsonl`);

const pinoOptions: LoggerOptions = {
  level: 'trace',

  // Remap timestamp to @t as ISO 8601 UTC
  timestamp: () => `,"@t":"${new Date().toISOString()}"`,

  // Suppress Pino's default "time" key (we produce @t above)
  base: undefined,

  formatters: {
    // Remap numeric level to canonical @l string, output as @l key
    level(label: string) {
      const levelMap: Record<string, string> = {
        trace: 'Trace',
        debug: 'Debug',
        info: 'Information',
        warn: 'Warning',
        error: 'Error',
        fatal: 'Fatal',
      };
      return { '@l': levelMap[label] ?? label };
    },

    // Rename msg -> @m on every log line
    log(obj: Record<string, unknown>) {
      const { msg, ...rest } = obj as { msg?: string; [key: string]: unknown };
      return { ...rest, '@m': msg ?? '' };
    },
  },
};

// TypeScript: use Logger type for typed instances returned from createTestLogger
export type TestLogger = Logger;

/**
 * Creates a child logger pre-bound with test context fields.
 * Call this once per describe block (module) and once per test (case).
 *
 * @param moduleName  - Maps to test-module-name (describe block name)
 * @param loggerName  - Maps to @logger (class or component under test)
 * @param application - Maps to application (service name)
 */
export function createTestLogger(
  moduleName: string,
  loggerName: string,
  application: string,
): Logger {
  return baseLogger.child({
    'test-module-name': moduleName,
    '@logger': loggerName,
    application,
  });
}

/**
 * Returns a child logger bound with the current test case name.
 * Call this inside each individual test using the logger returned by createTestLogger.
 */
export function withTestCase(logger: Logger, testCaseName: string): Logger {
  return logger.child({ 'test-case-name': testCaseName });
}

// Base logger writes to file only — no stdout noise during test runs
const baseLogger = pino(pinoOptions, pino.destination(logFile));

export { logFile };
```

**JavaScript version** — same structure, drop type annotations and use `require`:

```javascript
// test/logger.js
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
const logFile = path.join(projectRoot, `${packageJson.name}.log.jsonl`);

const pinoOptions = {
  level: 'trace',
  timestamp: () => `,"@t":"${new Date().toISOString()}"`,
  base: undefined,
  formatters: {
    level(label) {
      const levelMap = {
        trace: 'Trace', debug: 'Debug', info: 'Information',
        warn: 'Warning', error: 'Error', fatal: 'Fatal',
      };
      return { '@l': levelMap[label] ?? label };
    },
    log(obj) {
      const { msg, ...rest } = obj;
      return { ...rest, '@m': msg ?? '' };
    },
  },
};

const baseLogger = pino(pinoOptions, pino.destination(logFile));

function createTestLogger(moduleName, loggerName, application) {
  return baseLogger.child({
    'test-module-name': moduleName,
    '@logger': loggerName,
    application,
  });
}

function withTestCase(logger, testCaseName) {
  return logger.child({ 'test-case-name': testCaseName });
}

module.exports = { createTestLogger, withTestCase, logFile };
```

---

## Jest

### Packages

```bash
npm install --save-dev jest pino
# TypeScript projects only:
npm install --save-dev ts-jest @types/jest
```

### Jest Configuration

**`jest.config.ts`** (or `jest.config.js`):

```typescript
import type { Config } from 'jest';

const config: Config = {
  // TypeScript: use ts-jest transform
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Suppress Jest's own console output capture — logs go to file via Pino
  silent: false,

  // Optional: globalSetup to ensure log file is cleared between full runs
  globalSetup: './test/jest-global-setup.ts',
};

export default config;
```

**`test/jest-global-setup.ts`** — clear log file before a full test run:

```typescript
import fs from 'fs';
import path from 'path';

export default async function globalSetup(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');
  const pkgName = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'),
  ).name;
  const logFile = path.join(projectRoot, `${pkgName}.log.jsonl`);
  if (fs.existsSync(logFile)) {
    fs.truncateSync(logFile, 0);
  }
}
```

### Complete Jest Example

```typescript
// src/order-service.ts — production code under test
export class OrderService {
  constructor(private readonly logger: { info: Function; warn: Function; error: Function }) {}

  processOrder(orderId: string, amount: number): { success: boolean; fee: number } {
    this.logger.info({ orderId, amount }, 'Processing order');

    if (amount <= 0) {
      this.logger.warn({ orderId, amount }, 'Order rejected: non-positive amount');
      return { success: false, fee: 0 };
    }

    const fee = amount > 100 ? amount * 0.02 : amount * 0.05;
    this.logger.info({ orderId, amount, fee }, 'Order processed successfully');
    return { success: true, fee };
  }
}
```

```typescript
// test/order-service.test.ts
import { OrderService } from '../src/order-service';
import { createTestLogger, withTestCase } from './logger';

// Module-level logger: bound to this describe block and component name
const moduleLogger = createTestLogger(
  'OrderServiceTests',   // test-module-name
  'OrderService',        // @logger — matches the class under test
  'checkout-api',        // application
);

describe('OrderServiceTests', () => {
  test('processes valid order and calculates fee', () => {
    const log = withTestCase(moduleLogger, 'processes valid order and calculates fee');
    const service = new OrderService(log);

    log.debug('Arranging: creating order with amount 200');
    const result = service.processOrder('ORD-001', 200);

    log.debug({ result }, 'Assert: checking result fields');
    expect(result.success).toBe(true);
    expect(result.fee).toBeCloseTo(4.0);
  });

  test('rejects order with zero amount', () => {
    const log = withTestCase(moduleLogger, 'rejects order with zero amount');
    const service = new OrderService(log);

    const result = service.processOrder('ORD-002', 0);

    expect(result.success).toBe(false);
    log.info({ result }, 'Confirmed: zero-amount order rejected');
  });

  test('applies higher fee rate for small orders', () => {
    const log = withTestCase(moduleLogger, 'applies higher fee rate for small orders');
    const service = new OrderService(log);

    const result = service.processOrder('ORD-003', 50);

    log.debug({ result }, 'Assert: small order fee rate is 5%');
    expect(result.fee).toBeCloseTo(2.5);
  });
});
```

**Sample JSONL output:**

```jsonl
{"@t":"2025-06-15T14:32:01.123Z","@l":"Debug","test-module-name":"OrderServiceTests","@logger":"OrderService","application":"checkout-api","test-case-name":"processes valid order and calculates fee","@m":"Arranging: creating order with amount 200"}
{"@t":"2025-06-15T14:32:01.124Z","@l":"Information","test-module-name":"OrderServiceTests","@logger":"OrderService","application":"checkout-api","test-case-name":"processes valid order and calculates fee","orderId":"ORD-001","amount":200,"@m":"Processing order"}
{"@t":"2025-06-15T14:32:01.125Z","@l":"Information","test-module-name":"OrderServiceTests","@logger":"OrderService","application":"checkout-api","test-case-name":"processes valid order and calculates fee","orderId":"ORD-001","amount":200,"fee":4,"@m":"Order processed successfully"}
```

---

## Vitest

### Packages

```bash
npm install --save-dev vitest pino
# TypeScript: Vitest has built-in TS support via Vite — no extra transform needed
```

### Vitest Configuration

**`vitest.config.ts`**:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',

    // Run globalSetup once before all tests — clear log file
    globalSetup: './test/vitest-global-setup.ts',

    // reporter: 'verbose' is useful for local dev; use 'default' in CI
    reporter: process.env.CI ? 'default' : 'verbose',
  },
});
```

**`test/vitest-global-setup.ts`**:

```typescript
import fs from 'fs';
import path from 'path';

export function setup(): void {
  const projectRoot = path.resolve(__dirname, '..');
  const pkgName = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'),
  ).name;
  const logFile = path.join(projectRoot, `${pkgName}.log.jsonl`);
  if (fs.existsSync(logFile)) {
    fs.truncateSync(logFile, 0);
  }
}
```

### Complete Vitest Example

```typescript
// test/order-service.test.ts  (Vitest — same structure as Jest)
import { describe, test, expect } from 'vitest';
import { OrderService } from '../src/order-service';
import { createTestLogger, withTestCase } from './logger';

const moduleLogger = createTestLogger(
  'OrderServiceTests',
  'OrderService',
  'checkout-api',
);

describe('OrderServiceTests', () => {
  test('processes valid order and calculates fee', () => {
    const log = withTestCase(moduleLogger, 'processes valid order and calculates fee');
    const service = new OrderService(log);

    log.debug('Arranging: creating order with amount 200');
    const result = service.processOrder('ORD-001', 200);

    log.debug({ result }, 'Assert: checking result fields');
    expect(result.success).toBe(true);
    expect(result.fee).toBeCloseTo(4.0);
  });

  test('rejects order with zero amount', () => {
    const log = withTestCase(moduleLogger, 'rejects order with zero amount');
    const service = new OrderService(log);

    const result = service.processOrder('ORD-002', 0);

    expect(result.success).toBe(false);
    log.info({ result }, 'Confirmed: zero-amount order rejected');
  });
});
```

> **TypeScript note**: Vitest resolves TypeScript via Vite's ESBuild pipeline. No `ts-jest` or `ts-node` needed. Import `pino` using `import` syntax — Vite handles CJS/ESM interop automatically.

---

## Mocha

### Packages

```bash
npm install --save-dev mocha pino
# TypeScript:
npm install --save-dev ts-node @types/mocha @types/node
```

### Mocha Configuration

**`.mocharc.yml`**:

```yaml
spec: test/**/*.test.ts          # or *.test.js for JS
require:
  - ts-node/register              # TypeScript only — remove for JS
timeout: 10000
reporter: spec
```

**JavaScript `.mocharc.yml`** (no ts-node):

```yaml
spec: test/**/*.test.js
timeout: 10000
reporter: spec
```

### Clearing Log File Before Mocha Runs

Use a root-level `before` hook in a shared fixture file:

**`test/hooks.ts`** (or `test/hooks.js`):

```typescript
import fs from 'fs';
import { logFile } from './logger';

// Runs once before all test suites
before(function clearLogFile() {
  if (fs.existsSync(logFile)) {
    fs.truncateSync(logFile, 0);
  }
});
```

Register it in `.mocharc.yml`:

```yaml
require:
  - ts-node/register
  - test/hooks.ts
```

### Complete Mocha Example

```typescript
// test/order-service.test.ts  (Mocha + assert)
import assert from 'assert';
import { OrderService } from '../src/order-service';
import { createTestLogger, withTestCase } from './logger';

const moduleLogger = createTestLogger(
  'OrderServiceTests',
  'OrderService',
  'checkout-api',
);

describe('OrderServiceTests', () => {
  it('processes valid order and calculates fee', () => {
    const log = withTestCase(moduleLogger, 'processes valid order and calculates fee');
    const service = new OrderService(log);

    log.debug('Arranging: creating order with amount 200');
    const result = service.processOrder('ORD-001', 200);

    log.debug({ result }, 'Assert: checking result fields');
    assert.strictEqual(result.success, true);
    assert.ok(Math.abs(result.fee - 4.0) < 0.001);
  });

  it('rejects order with zero amount', () => {
    const log = withTestCase(moduleLogger, 'rejects order with zero amount');
    const service = new OrderService(log);

    const result = service.processOrder('ORD-002', 0);

    assert.strictEqual(result.success, false);
    log.info({ result }, 'Confirmed: zero-amount order rejected');
  });
});
```

> **TypeScript note with Mocha**: `ts-node/register` compiles TypeScript on-the-fly. For large projects, use `ts-node` with `transpileOnly: true` in `tsconfig.json` to skip full type-checking during test runs (tests are already type-checked by the compiler separately):
>
> ```json
> // tsconfig.json (or a separate tsconfig.test.json)
> { "ts-node": { "transpileOnly": true } }
> ```

---

## Rules

1. **Never use `console.log` or `console.error` in tests** — all diagnostic output must go through the structured logger so it appears in the JSONL file with test context fields.
2. **Pass the logger to production code** — do not instantiate a separate logger inside the class under test. Inject the test logger so all code under test logs to the same file with the same test context.
3. **Use `withTestCase` inside each individual test** — the `test-case-name` field must identify the specific test, not the whole module.
4. **One logger factory module per test project** — `test/logger.ts` is the only place Pino is configured and the log file path is defined.

---

## Verifying Output with DuckDB

After running tests, verify the JSONL file has all canonical fields:

```sql
-- Inspect recent test log output
SELECT "@t", "@l", "test-module-name", "test-case-name", "@logger", "@m"
FROM read_json_auto('{your-package-name}.log.jsonl')
ORDER BY "@t" DESC
LIMIT 20;

-- Find all warnings and errors from a specific test module
SELECT "test-case-name", "@l", "@m"
FROM read_json_auto('{your-package-name}.log.jsonl')
WHERE "test-module-name" = 'OrderServiceTests'
  AND "@l" IN ('Warning', 'Error')
ORDER BY "@t";

-- Check all canonical fields are present (no nulls)
SELECT
  COUNT(*) FILTER (WHERE "@t" IS NULL)  AS missing_timestamp,
  COUNT(*) FILTER (WHERE "@l" IS NULL)  AS missing_level,
  COUNT(*) FILTER (WHERE "@m" IS NULL)  AS missing_message,
  COUNT(*) FILTER (WHERE "@logger" IS NULL) AS missing_logger
FROM read_json_auto('{your-package-name}.log.jsonl');
```
