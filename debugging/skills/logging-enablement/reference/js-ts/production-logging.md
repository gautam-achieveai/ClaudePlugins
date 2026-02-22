# JavaScript/TypeScript Production Logging

Set up structured JSONL logging in Node.js production applications using Pino (primary recommendation), Winston, or Bunyan. All libraries are configured to emit canonical field names.

> **Canonical field spec**: See [`../log-render-spec.md`](../log-render-spec.md) for required field names.

---

## Library Comparison

| Library | Output | Performance | TS Support | Recommendation |
|---------|--------|-------------|------------|----------------|
| **Pino** | Native JSON | Fastest (low-overhead) | Built-in types | Primary choice for new projects |
| **Winston** | Pluggable | Moderate | `@types/winston` | Good for projects already using it |
| **Bunyan** | Native JSON | Good | `@types/bunyan` | Legacy projects; Pino is preferred for new work |

---

## Pino (Primary)

### Install

```bash
npm install pino pino-roll
# TypeScript: Pino ships its own type definitions — no @types/pino needed
```

### Configuration

Configure Pino once in a shared `logger.ts` (or `logger.js`) module. All production code imports from this module.

**`src/logger.ts`**:

```typescript
import pino, { Logger, LoggerOptions } from 'pino';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const appName = process.env.APP_NAME ?? 'app';
const logFile = path.join(process.cwd(), `${appName}.log.jsonl`);

const pinoOptions: LoggerOptions = {
  // Minimum level: trace for dev, info for production
  level: isProduction ? 'info' : 'trace',

  // Produce @t as ISO 8601 UTC instead of Pino's default epoch milliseconds
  timestamp: () => `,"@t":"${new Date().toISOString()}"`,

  // Remove Pino's default pid/hostname base fields (add back explicitly if needed)
  base: undefined,

  formatters: {
    // Map Pino numeric level to canonical @l label
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

    // Rename msg -> @m, promote error details to @x
    log(obj: Record<string, unknown>) {
      const { msg, err, ...rest } = obj as {
        msg?: string;
        err?: Error & { stack?: string };
        [key: string]: unknown;
      };
      const formatted: Record<string, unknown> = { ...rest, '@m': msg ?? '' };
      if (err) {
        formatted['@x'] = err.stack ?? String(err);
      }
      return formatted;
    },
  },
};

// Transport: write JSONL to rotating file
const transport = pino.transport({
  target: 'pino-roll',
  options: {
    file: logFile,
    frequency: 'daily',       // rotate daily
    size: '50m',              // also rotate at 50 MB
    extension: '.jsonl',
    mkdir: true,
  },
});

// TypeScript: export as Logger type for use in typed function signatures
const logger: Logger = pino(pinoOptions, transport);

export default logger;
export type { Logger };
```

**JavaScript version**:

```javascript
// src/logger.js
const pino = require('pino');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const appName = process.env.APP_NAME ?? 'app';
const logFile = path.join(process.cwd(), `${appName}.log.jsonl`);

const levelMap = {
  trace: 'Trace', debug: 'Debug', info: 'Information',
  warn: 'Warning', error: 'Error', fatal: 'Fatal',
};

const transport = pino.transport({
  target: 'pino-roll',
  options: { file: logFile, frequency: 'daily', size: '50m', extension: '.jsonl', mkdir: true },
});

const logger = pino({
  level: isProduction ? 'info' : 'trace',
  timestamp: () => `,"@t":"${new Date().toISOString()}"`,
  base: undefined,
  formatters: {
    level: (label) => ({ '@l': levelMap[label] ?? label }),
    log: ({ msg, err, ...rest }) => ({
      ...rest,
      '@m': msg ?? '',
      ...(err ? { '@x': err.stack ?? String(err) } : {}),
    }),
  },
}, transport);

module.exports = logger;
```

### Child Loggers for Component Context

Create a child logger per class or module to automatically include `@logger` on every line:

```typescript
// src/order-service.ts
import logger, { Logger } from './logger';

export class OrderService {
  private readonly log: Logger;

  constructor(
    private readonly db: Database,
    // Accept an injected logger for testability; default to the production logger
    baseLogger: Logger = logger,
  ) {
    // Child logger binds @logger to this class name for every log line it emits
    this.log = baseLogger.child({ '@logger': 'OrderService', application: 'checkout-api' });
  }

  async processOrder(orderId: string, customerId: string, amount: number): Promise<OrderResult> {
    this.log.info({ orderId, customerId, amount }, 'Processing order');

    if (amount <= 0) {
      this.log.warn({ orderId, amount }, 'Order rejected: non-positive amount');
      return { success: false, reason: 'invalid-amount' };
    }

    try {
      const customer = await this.db.findCustomer(customerId);
      this.log.debug({ customerId, tier: customer.tier }, 'Customer tier resolved');

      const fee = customer.tier === 'premium' ? amount * 0.01 : amount * 0.03;
      this.log.info({ orderId, fee, tier: customer.tier }, 'Order processed');
      return { success: true, fee };
    } catch (err) {
      this.log.error({ err, orderId }, 'Failed to process order');
      throw err;
    }
  }
}
```

### Log Level Strategy

```typescript
// Trace: method entry, fine-grained variable values — local dev only
log.trace({ params }, 'Entering validatePayload');

// Debug: intermediate results, resolved config, diagnostic data
log.debug({ resolvedConfig }, 'Config loaded from environment');

// Information: normal business operations — these appear in production
log.info({ orderId, amount }, 'Order received');
log.info({ orderId, durationMs }, 'Order dispatched to fulfillment');

// Warning: recoverable issues — retries, fallbacks, degraded state
log.warn({ attempt, maxAttempts, delayMs }, 'Payment gateway retry');

// Error: operation failed but application continues
log.error({ err, orderId }, 'Order processing failed');

// Fatal: unrecoverable — application must stop
log.fatal({ err }, 'Database connection pool exhausted — shutting down');
```

### Request/Correlation ID Middleware — Express

```typescript
// src/middleware/request-logger.ts
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '../logger';

declare global {
  namespace Express {
    interface Request {
      log: typeof logger;
      correlationId: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? randomUUID();
  req.correlationId = correlationId;

  // Child logger carries correlationId, method, and path on every subsequent log call
  req.log = logger.child({
    correlationId,
    'http.method': req.method,
    'http.path': req.path,
    '@logger': 'HttpRequest',
    application: 'checkout-api',
  });

  req.log.info('Request received');

  res.on('finish', () => {
    req.log.info(
      { 'http.status': res.statusCode, 'http.durationMs': Date.now() - start },
      'Request completed',
    );
  });

  const start = Date.now();
  next();
}
```

```typescript
// src/app.ts
import express from 'express';
import { requestLogger } from './middleware/request-logger';

const app = express();
app.use(requestLogger);

app.post('/orders', async (req, res) => {
  req.log.info({ body: req.body }, 'Creating order');
  // req.log is already enriched with correlationId, method, path
});
```

### Request/Correlation ID Middleware — Fastify

```typescript
// src/app.ts (Fastify)
import Fastify from 'fastify';
import { randomUUID } from 'crypto';

// Fastify has built-in Pino integration — configure it directly
const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'trace',
    timestamp: () => `,"@t":"${new Date().toISOString()}"`,
    base: undefined,
    formatters: {
      level: (label: string) => {
        const map: Record<string, string> = {
          trace: 'Trace', debug: 'Debug', info: 'Information',
          warn: 'Warning', error: 'Error', fatal: 'Fatal',
        };
        return { '@l': map[label] ?? label };
      },
      log: ({ msg, err, ...rest }: Record<string, unknown>) => ({
        ...rest,
        '@m': (msg as string) ?? '',
        ...(err ? { '@x': (err as Error).stack ?? String(err) } : {}),
      }),
    },
    transport: {
      target: 'pino-roll',
      options: { file: 'app.log.jsonl', frequency: 'daily', size: '50m', mkdir: true },
    },
    genReqId: () => randomUUID(),
  },
});

// Fastify's req.log is already a child logger bound with reqId
app.get('/orders/:id', async (request, reply) => {
  request.log.info({ orderId: request.params.id }, 'Fetching order');
});
```

---

## Winston

### Install

```bash
npm install winston winston-daily-rotate-file
# TypeScript:
npm install --save-dev @types/winston
```

### Configuration

```typescript
// src/logger.ts (Winston)
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const appName = process.env.APP_NAME ?? 'app';
const isProduction = process.env.NODE_ENV === 'production';

// Custom format: remap Winston's native fields to canonical names
const canonicalFormat = winston.format((info) => {
  const levelMap: Record<string, string> = {
    error: 'Error', warn: 'Warning', info: 'Information',
    http: 'Debug', verbose: 'Debug', debug: 'Debug', silly: 'Trace',
  };

  // Build a plain object with canonical fields
  const { level, message, timestamp, stack, ...rest } = info as Record<string, unknown>;
  return {
    ...rest,
    '@t': timestamp,
    '@l': levelMap[level as string] ?? level,
    '@m': message,
    ...(stack ? { '@x': stack } : {}),
  } as winston.Logform.TransformableInfo;
});

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',

  format: winston.format.combine(
    winston.format.timestamp(),   // adds `timestamp` field
    winston.format.errors({ stack: true }),  // captures err.stack as `stack`
    canonicalFormat(),            // remaps to @t, @l, @m, @x
    winston.format.json(),        // serializes to JSON string
  ),

  defaultMeta: {
    application: appName,
  },

  transports: [
    new DailyRotateFile({
      filename: `${appName}-%DATE%.log.jsonl`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
});

export default logger;
```

### Child Loggers with Winston

```typescript
// src/order-service.ts (Winston)
import logger from './logger';

export class OrderService {
  private readonly log = logger.child({ '@logger': 'OrderService' });

  async processOrder(orderId: string, amount: number) {
    this.log.info({ orderId, amount }, 'Processing order');

    if (amount <= 0) {
      this.log.warn({ orderId }, 'Rejected: non-positive amount');
      return { success: false };
    }

    this.log.info({ orderId }, 'Order processed');
    return { success: true };
  }
}
```

> **TypeScript note**: Winston's `.child()` returns a `winston.Logger`. Declare `private readonly log: winston.Logger` if you need the type explicitly.

### Request Logger Middleware — Express (Winston)

```typescript
// src/middleware/request-logger.ts (Winston)
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '../logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? randomUUID();
  const reqLog = logger.child({ correlationId, 'http.method': req.method, 'http.path': req.path });

  reqLog.info('Request received');
  const start = Date.now();

  res.on('finish', () => {
    reqLog.info({ 'http.status': res.statusCode, durationMs: Date.now() - start }, 'Request completed');
  });

  next();
}
```

---

## Bunyan

> **Note**: Bunyan is in maintenance mode. For new projects, prefer Pino — same JSON-native design but actively maintained and faster.

### Install

```bash
npm install bunyan bunyan-rotating-file-stream
# TypeScript:
npm install --save-dev @types/bunyan
```

### Configuration

```typescript
// src/logger.ts (Bunyan)
import bunyan from 'bunyan';
import RotatingFileStream from 'bunyan-rotating-file-stream';

const appName = process.env.APP_NAME ?? 'app';
const isProduction = process.env.NODE_ENV === 'production';

// Bunyan uses numeric levels — define a serializer to remap to canonical names
// NOTE: Bunyan does not support renaming top-level fields like `time` or `msg` via config.
// Use a stream transform or post-process with DuckDB column aliases when querying.
const levelNames: Record<number, string> = {
  10: 'Trace', 20: 'Debug', 30: 'Information',
  40: 'Warning', 50: 'Error', 60: 'Fatal',
};

// Custom stream that remaps Bunyan fields to canonical names before writing
class CanonicalJsonlStream {
  write(record: Record<string, unknown>): void {
    const { time, level, msg, err, name, pid, hostname, v, ...rest } = record;
    const canonical = {
      '@t': new Date(time as number).toISOString(),
      '@l': levelNames[level as number] ?? String(level),
      '@m': msg,
      '@logger': name,
      application: appName,
      ...rest,
      ...(err ? { '@x': (err as { stack?: string }).stack ?? String(err) } : {}),
    };
    process.stdout.write(JSON.stringify(canonical) + '\n');
  }
}

const logger = bunyan.createLogger({
  name: appName,
  level: isProduction ? 'info' : 'trace',

  serializers: {
    // Bunyan's built-in error serializer — captures message, name, stack
    err: bunyan.stdSerializers.err,
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res,
  },

  streams: [
    {
      type: 'raw',
      stream: new CanonicalJsonlStream() as unknown as NodeJS.WritableStream,
      level: isProduction ? 'info' : 'trace',
    },
  ],
});

export default logger;
```

> **TypeScript note**: `bunyan.Logger` is the type for logger instances. Child loggers (`logger.child({})`) also return `bunyan.Logger`.

---

## File Rotation

### Pino — pino-roll

```typescript
// Already shown in Pino section above. Key options:
pino.transport({
  target: 'pino-roll',
  options: {
    file: 'app.log.jsonl',
    frequency: 'daily',     // 'daily' | 'hourly' | number (ms interval)
    size: '50m',            // rotate when file exceeds 50 MB
    extension: '.jsonl',
    mkdir: true,            // create directory if it doesn't exist
    // Files are named: app.log.2025-06-15.jsonl (date appended automatically)
  },
});
```

### Winston — winston-daily-rotate-file

```typescript
new DailyRotateFile({
  filename: 'app-%DATE%.log.jsonl',
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '14d',      // keep 14 days of logs
  zippedArchive: true,  // gzip rotated files
})
```

---

## Querying Production Logs with DuckDB

```sql
-- Errors in the last hour with full context
SELECT "@t", "@logger", "@m", "@x"
FROM read_json_auto('app.log.jsonl')
WHERE "@l" = 'Error'
  AND "@t" > (NOW() - INTERVAL 1 HOUR)::TEXT
ORDER BY "@t" DESC;

-- Request duration percentiles by path
SELECT
  "http.path",
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY durationMs) AS p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY durationMs) AS p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY durationMs) AS p99
FROM read_json_auto('app.log.jsonl')
WHERE "http.path" IS NOT NULL
GROUP BY "http.path"
ORDER BY p95 DESC;

-- All events for a specific correlation ID (full request trace)
SELECT "@t", "@l", "@logger", "@m"
FROM read_json_auto('app.log.jsonl')
WHERE correlationId = 'abc-123-def'
ORDER BY "@t";

-- Warning and error counts by component over the last 24 hours
SELECT "@logger", "@l", COUNT(*) AS count
FROM read_json_auto('app.log.jsonl')
WHERE "@l" IN ('Warning', 'Error', 'Fatal')
GROUP BY "@logger", "@l"
ORDER BY count DESC;
```

---

## Log Level Strategy Reference

| Level | `@l` Value | When to Use | Default in Prod? |
|-------|-----------|-------------|-----------------|
| `log.trace()` | `Trace` | Method entry/exit, raw variable values | No |
| `log.debug()` | `Debug` | Diagnostic: resolved config, intermediate steps | No |
| `log.info()` | `Information` | Business operations: order created, user logged in | Yes |
| `log.warn()` | `Warning` | Recoverable: retry, fallback, degraded mode | Yes |
| `log.error()` | `Error` | Operation failed, exception caught | Yes |
| `log.fatal()` | `Fatal` | Unrecoverable: shutdown imminent | Yes |

**Rules**:
- Set minimum level to `trace` in development and test environments.
- Set minimum level to `info` in production. Drop to `warn` in high-volume services if `info` creates excessive volume.
- Never log sensitive data (passwords, tokens, PII) at any level.
- Always pass errors as a structured field (`{ err }`), never stringify into `@m`.
