# Python Production Logging

Structured JSONL logging for Python production services. This guide covers three approaches in order of preference: structlog (primary), python-json-logger, and stdlib logging with a JSON formatter. All produce canonical JSONL output readable by the debugging plugin.

---

## Canonical Fields

| Field | Description |
|---|---|
| `@t` | Timestamp — ISO 8601 UTC with millisecond precision |
| `@l` | Log level (e.g., `Debug`, `Info`, `Warning`, `Error`) |
| `@m` | Rendered message |
| `@logger` | Source module or class name |
| `application` | Service or application name |
| `correlation-id` | Request-scoped trace identifier |
| `@x` | Exception info (type, message, traceback) |

---

## 1. structlog (Primary)

structlog is the recommended library. It provides immutable bound loggers, a composable processor chain, and first-class support for context variables.

### pip Packages

```bash
pip install structlog
```

### Configuration

```python
# logging_config.py
import datetime
import logging
import structlog


def _rename_canonical_fields(logger, method, event_dict):
    """Remap structlog default keys to canonical @t / @l / @m names."""
    event_dict["@m"] = event_dict.pop("event", "")
    if "level" in event_dict:
        event_dict["@l"] = event_dict.pop("level").capitalize()
    if "timestamp" in event_dict:
        event_dict["@t"] = event_dict.pop("timestamp")
    return event_dict


def _add_timestamp(logger, method, event_dict):
    """Inject ISO 8601 UTC timestamp."""
    event_dict["timestamp"] = (
        datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds")
    )
    return event_dict


def configure_production_logging(
    log_file: str,
    application: str,
    level: int = logging.INFO,
) -> None:
    """
    Configure structlog for production use.

    Parameters
    ----------
    log_file:    Path to the JSONL output file (e.g. "myservice.log.jsonl").
    application: Service name stamped into every log line.
    level:       Minimum stdlib log level (default: INFO).
    """
    from logging.handlers import RotatingFileHandler

    handler = RotatingFileHandler(
        log_file,
        maxBytes=50 * 1024 * 1024,   # 50 MB per file
        backupCount=5,
        encoding="utf-8",
    )
    handler.setLevel(level)

    logging.basicConfig(
        format="%(message)s",
        level=level,
        handlers=[handler],
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,   # merge request-scoped vars
            structlog.stdlib.add_log_level,
            _add_timestamp,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            _rename_canonical_fields,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Bind application name globally so every logger gets it automatically.
    structlog.contextvars.bind_contextvars(application=application)
```

### Getting a Logger in Production Code

```python
# order_service.py
import structlog

log = structlog.get_logger(__name__)


class OrderService:
    def __init__(self):
        self._log = log.bind(**{"@logger": self.__class__.__name__})

    def place(self, order: dict) -> dict:
        self._log.debug("Placing order", order_id=order.get("id"))

        if order.get("quantity", 0) <= 0:
            self._log.warning(
                "Order rejected — invalid quantity",
                order_id=order.get("id"),
                quantity=order.get("quantity"),
            )
            return {"status": "rejected"}

        self._log.info("Order accepted", order_id=order.get("id"), item_id=order.get("item_id"))
        return {"status": "accepted"}
```

### Log Level Strategy

| Level | When to use |
|---|---|
| `debug` | Detailed internal state, variable values, branch decisions |
| `info` | Normal lifecycle events: request received, operation completed |
| `warning` | Recoverable unexpected conditions: retry, fallback, degraded mode |
| `error` | Operation failed, exception caught and handled |
| `critical` | Service-level failure, unrecoverable state |

Use `debug` liberally during development; set `INFO` as the minimum level in production.

### Example Log Statements at Decision Points

```python
# payment_processor.py
import structlog

log = structlog.get_logger(__name__)


class PaymentProcessor:
    def __init__(self):
        self._log = log.bind(**{"@logger": self.__class__.__name__})

    def process(self, payment: dict) -> dict:
        amount = payment.get("amount", 0)
        card_token = payment.get("card_token")

        self._log.debug("Processing payment", amount=amount, card_token_prefix=card_token[:6] if card_token else None)

        if amount <= 0:
            self._log.warning("Payment rejected — non-positive amount", amount=amount)
            return {"success": False, "reason": "invalid_amount"}

        try:
            result = self._call_gateway(amount, card_token)
        except TimeoutError:
            self._log.error("Payment gateway timed out", amount=amount)
            return {"success": False, "reason": "gateway_timeout"}
        except Exception:
            self._log.exception("Unexpected error during payment processing", amount=amount)
            return {"success": False, "reason": "internal_error"}

        if not result.get("approved"):
            self._log.warning(
                "Payment declined by gateway",
                amount=amount,
                decline_code=result.get("decline_code"),
            )
            return {"success": False, "reason": "declined"}

        self._log.info("Payment successful", amount=amount, transaction_id=result.get("transaction_id"))
        return {"success": True, "transaction_id": result.get("transaction_id")}

    def _call_gateway(self, amount: float, card_token: str) -> dict:
        # Gateway integration omitted for brevity.
        return {"approved": True, "transaction_id": "txn_001"}
```

---

## 2. Context Variables: Request-Scoped Data

`structlog.contextvars` lets you bind values once at the start of a request and have them appear on every log line for the duration of that request, without passing the logger through every function call.

```python
# middleware / request handler
import structlog
from structlog.contextvars import bind_contextvars, clear_contextvars


def handle_request(request):
    # Clear any context left over from a previous request (important in threaded servers).
    clear_contextvars()

    # Bind request-scoped data once.
    bind_contextvars(
        **{
            "correlation-id": request.headers.get("X-Correlation-ID", generate_id()),
            "request-path": request.path,
            "user-id": getattr(request, "user_id", None),
        }
    )

    log = structlog.get_logger(__name__).bind(**{"@logger": "RequestHandler"})
    log.info("Request received", method=request.method)

    response = process(request)

    log.info("Request completed", status=response.status_code)
    return response
```

Every log call anywhere in the call stack — including deeply nested service code — will automatically include `correlation-id`, `request-path`, and `user-id` without any plumbing.

---

## 3. Correlation ID Propagation

Correlation IDs tie together all log lines produced during a single request, across service boundaries.

```python
# correlation.py
import uuid
import structlog
from structlog.contextvars import bind_contextvars, clear_contextvars


def start_request_context(incoming_correlation_id: str | None = None) -> str:
    """
    Bind a correlation ID for the current request.
    Accepts an incoming ID (from an HTTP header) or generates a new one.
    Returns the correlation ID so it can be forwarded to downstream services.
    """
    clear_contextvars()
    correlation_id = incoming_correlation_id or str(uuid.uuid4())
    bind_contextvars(**{"correlation-id": correlation_id})
    return correlation_id


def get_outbound_headers() -> dict:
    """Return headers to forward correlation ID to downstream services."""
    ctx = structlog.contextvars.get_contextvars()
    return {"X-Correlation-ID": ctx.get("correlation-id", "")}
```

Usage in a FastAPI / Flask handler:

```python
@app.post("/orders")
def create_order(request: Request):
    correlation_id = start_request_context(
        request.headers.get("X-Correlation-ID")
    )
    # All log calls from here onwards include correlation-id automatically.
    ...
```

---

## 4. File Handler with Rotation

### Size-Based Rotation (RotatingFileHandler)

```python
from logging.handlers import RotatingFileHandler
import logging

handler = RotatingFileHandler(
    "myservice.log.jsonl",
    maxBytes=50 * 1024 * 1024,   # rotate after 50 MB
    backupCount=5,               # keep 5 rotated files
    encoding="utf-8",
)
handler.setLevel(logging.INFO)
logging.basicConfig(format="%(message)s", handlers=[handler])
```

Produces: `myservice.log.jsonl`, `myservice.log.jsonl.1`, ..., `myservice.log.jsonl.5`.

### Time-Based Rotation (TimedRotatingFileHandler)

```python
from logging.handlers import TimedRotatingFileHandler
import logging

handler = TimedRotatingFileHandler(
    "myservice.log.jsonl",
    when="midnight",    # rotate at midnight UTC
    interval=1,
    backupCount=14,     # keep 14 days of logs
    utc=True,
    encoding="utf-8",
)
handler.setLevel(logging.INFO)
logging.basicConfig(format="%(message)s", handlers=[handler])
```

---

## 5. python-json-logger

Use this when you need to stay within the stdlib `logging` ecosystem but still emit JSON.

### pip Packages

```bash
pip install python-json-logger
```

### Configuration

```python
# logging_config_jsonlogger.py
import datetime
import logging
from pythonjsonlogger import jsonlogger
from logging.handlers import RotatingFileHandler


class CanonicalJsonFormatter(jsonlogger.JsonFormatter):
    """
    Subclass JsonFormatter to remap fields to canonical names.
    python-json-logger uses 'message', 'levelname', 'asctime' by default.
    """

    def add_fields(self, log_record: dict, record: logging.LogRecord, message_dict: dict):
        super().add_fields(log_record, record, message_dict)

        # Remap to canonical names.
        log_record["@t"] = datetime.datetime.now(datetime.timezone.utc).isoformat(
            timespec="milliseconds"
        )
        log_record["@l"] = record.levelname.capitalize()
        log_record["@m"] = log_record.pop("message", record.getMessage())
        log_record["@logger"] = record.name

        # Remove redundant stdlib fields.
        for field in ("levelname", "asctime", "name"):
            log_record.pop(field, None)


def configure_json_logger(log_file: str, application: str, level: int = logging.INFO) -> None:
    handler = RotatingFileHandler(
        log_file, maxBytes=50 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    handler.setFormatter(CanonicalJsonFormatter())
    handler.setLevel(level)

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)

    # Inject application name as a filter so it appears on every record.
    class AppNameFilter(logging.Filter):
        def filter(self, record):
            record.application = application
            return True

    root.addFilter(AppNameFilter())
```

Usage:

```python
configure_json_logger("myservice.log.jsonl", application="myservice")

log = logging.getLogger(__name__)
log.info("Service started", extra={"version": "1.0.0"})
log.warning("Cache miss", extra={"cache_key": "user:42"})
```

---

## 6. stdlib logging with JSON Formatter

Use this when you cannot add any external dependencies.

### Configuration

```python
# logging_config_stdlib.py
import datetime
import json
import logging
import traceback
from logging.handlers import RotatingFileHandler


class StdlibCanonicalJsonFormatter(logging.Formatter):
    """Minimal JSON formatter producing canonical JSONL with no external dependencies."""

    def __init__(self, application: str):
        super().__init__()
        self._application = application

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "@t": datetime.datetime.fromtimestamp(
                record.created, tz=datetime.timezone.utc
            ).isoformat(timespec="milliseconds"),
            "@l": record.levelname.capitalize(),
            "@m": record.getMessage(),
            "@logger": record.name,
            "application": self._application,
        }

        # Structured extras: anything set via extra={} on the log call.
        for key, value in record.__dict__.items():
            if key not in logging.LogRecord.__dict__ and not key.startswith("_"):
                payload[key] = value

        if record.exc_info:
            payload["@x"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def configure_stdlib_logging(log_file: str, application: str, level: int = logging.INFO) -> None:
    handler = RotatingFileHandler(
        log_file, maxBytes=50 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    handler.setFormatter(StdlibCanonicalJsonFormatter(application))
    handler.setLevel(level)

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)
```

Usage:

```python
configure_stdlib_logging("myservice.log.jsonl", application="myservice")

log = logging.getLogger(__name__)
log.debug("Cache lookup", extra={"cache_key": "product:7"})
log.info("Order processed", extra={"order_id": "ORD-001", "duration_ms": 42})
log.error("Database connection failed", exc_info=True)
```

---

## Sample JSONL Output

### structlog

```jsonl
{"@t":"2026-02-22T10:15:30.123+00:00","@l":"Info","@m":"Request received","@logger":"RequestHandler","application":"myservice","correlation-id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","method":"POST","request-path":"/orders"}
{"@t":"2026-02-22T10:15:30.145+00:00","@l":"Debug","@m":"Placing order","@logger":"OrderService","application":"myservice","correlation-id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","order_id":"ORD-001"}
{"@t":"2026-02-22T10:15:30.160+00:00","@l":"Info","@m":"Order accepted","@logger":"OrderService","application":"myservice","correlation-id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","order_id":"ORD-001","item_id":42}
{"@t":"2026-02-22T10:15:30.165+00:00","@l":"Info","@m":"Request completed","@logger":"RequestHandler","application":"myservice","correlation-id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","status":200}
```

### structlog with exception

```jsonl
{"@t":"2026-02-22T10:15:31.200+00:00","@l":"Error","@m":"Unexpected error during payment processing","@logger":"PaymentProcessor","application":"myservice","correlation-id":"a1b2c3d4","amount":100,"exc_info":"Traceback (most recent call last):\n  File \"payment_processor.py\", line 38, in process\n    result = self._call_gateway(amount, card_token)\nValueError: Gateway returned unexpected response"}
```

---

## Quick Reference: Library Comparison

| Feature | structlog | python-json-logger | stdlib + custom formatter |
|---|---|---|---|
| Bound context | Yes — immutable `.bind()` | No (use `extra={}` per call) | No (use `extra={}` per call) |
| Request-scoped context | `contextvars` module | Manual `logging.Filter` | Manual `logging.Filter` |
| Processor chain | Yes — fully composable | No | No |
| Stdlib interop | Yes — `LoggerFactory` bridges | Native stdlib | Native stdlib |
| External dependencies | `structlog` | `python-json-logger` | None |
| Recommended for | New services, complex context needs | Stdlib-heavy codebases | Zero-dependency environments |
