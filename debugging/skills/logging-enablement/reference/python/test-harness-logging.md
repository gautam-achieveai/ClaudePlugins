# Python Test Harness Logging

Structured JSONL logging for Python test frameworks using structlog. This guide covers pytest and unittest — each configured to emit canonical JSONL log lines that the debugging plugin can parse and render.

---

## Canonical Fields

| Field | Description | structlog default name |
|---|---|---|
| `@t` | Timestamp — ISO 8601 UTC | `timestamp` — must be remapped |
| `@l` | Log level | `level` — must be remapped |
| `@m` | Rendered message | `event` — must be remapped |
| `@logger` | Source module or class name | set via `logger` key |
| `test-case-name` | Test method name | set via `bind()` |
| `test-module-name` | Test class or module name | set via `bind()` |
| `application` | Service or app name under test | set via `bind()` |

---

## Core Rules

- **NEVER** use `print()` inside tests for debugging purposes.
- All test output **must** flow through the structured logger.
- Every test **must** bind `test-case-name` and `test-module-name` into the log context before calling any production code.
- The processor chain **must** remap structlog's default field names (`timestamp`, `level`, `event`) to the canonical names (`@t`, `@l`, `@m`).
- Log file naming convention: `{test-project}.log.jsonl` (e.g., `myapp_tests.log.jsonl`).

---

## pip Packages

```bash
pip install structlog
```

For the timestamp processor (`datetime` is stdlib, no extra install needed). Full install for a typical test project:

```bash
pip install structlog pytest
```

---

## Processor Chain: Remapping to Canonical Fields

structlog's `JSONRenderer` emits `timestamp`, `level`, and `event` by default. The processor chain below remaps them to `@t`, `@l`, and `@m` before serialisation.

```python
# logging_config.py
import datetime
import json
import logging
import structlog


def _rename_canonical_fields(logger, method, event_dict):
    """Remap structlog default keys to canonical @t / @l / @m names."""
    # event -> @m (rendered message)
    event_dict["@m"] = event_dict.pop("event", "")
    # level -> @l
    if "level" in event_dict:
        event_dict["@l"] = event_dict.pop("level").capitalize()
    # timestamp -> @t (already ISO 8601 UTC from _add_timestamp below)
    if "timestamp" in event_dict:
        event_dict["@t"] = event_dict.pop("timestamp")
    return event_dict


def _add_timestamp(logger, method, event_dict):
    """Inject ISO 8601 UTC timestamp."""
    event_dict["timestamp"] = (
        datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds")
    )
    return event_dict


def configure_structlog(log_file: str) -> None:
    """
    Configure structlog to write canonical JSONL to log_file.
    Call once at test session startup.
    """
    # Route stdlib logging through structlog so any library using logging
    # also emits structured output.
    logging.basicConfig(
        format="%(message)s",
        level=logging.DEBUG,
        handlers=[logging.FileHandler(log_file, encoding="utf-8")],
    )

    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,       # adds 'level'
            _add_timestamp,                        # adds 'timestamp'
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            _rename_canonical_fields,              # @t / @l / @m
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
```

---

## pytest

### conftest.py Fixtures

```python
# conftest.py
import pytest
import structlog

from logging_config import configure_structlog


def pytest_configure(config):
    """
    Session-level hook: configure structlog once before any test runs.
    Uses the pytest rootdir name as the project name for the log file.
    """
    project_name = config.rootdir.basename
    configure_structlog(f"{project_name}.log.jsonl")


@pytest.fixture(scope="session")
def base_logger():
    """
    Session-scoped logger bound with the application name.
    Tests and fixtures further bind test-case-name / test-module-name.
    """
    return structlog.get_logger().bind(application="myapp")


@pytest.fixture()
def log(request, base_logger):
    """
    Function-scoped logger fixture.
    Automatically binds test-case-name, test-module-name, and @logger
    for the duration of the test.
    """
    module_name = request.module.__name__
    case_name = request.node.name
    class_name = request.cls.__name__ if request.cls else module_name

    bound = base_logger.bind(
        **{
            "@logger": class_name,
            "test-case-name": case_name,
            "test-module-name": class_name,
        }
    )
    bound.info("Test started", test=case_name)
    yield bound
    bound.info("Test finished", test=case_name)
```

### Injecting the Logger Into Production Code

Production code should accept a logger as a constructor argument — never call `structlog.get_logger()` internally in production classes when they need to be tested with an injected context.

```python
# order_service.py
class OrderService:
    def __init__(self, log):
        # Bind the production class name so log lines from here
        # show @logger = "OrderService" rather than the test class.
        self._log = log.bind(**{"@logger": "OrderService"})

    def place(self, order: dict) -> dict:
        self._log.debug("Placing order", order=order)

        if order.get("quantity", 0) <= 0:
            self._log.warning("Order rejected — invalid quantity", quantity=order.get("quantity"))
            return {"status": "rejected"}

        self._log.info("Order accepted", item_id=order.get("item_id"))
        return {"status": "accepted"}
```

### Complete Working Example

```python
# test_order_service.py
import pytest
from order_service import OrderService


class TestOrderService:

    def test_place_order_with_valid_item(self, log):
        log.info("Arranging order with valid item")

        service = OrderService(log)
        result = service.place({"item_id": 42, "quantity": 1})

        log.info("Order result", result=result)
        assert result["status"] == "accepted"

    def test_place_order_with_zero_quantity(self, log):
        log.info("Arranging order with zero quantity")

        service = OrderService(log)
        result = service.place({"item_id": 42, "quantity": 0})

        log.warning("Expected rejection", result=result)
        assert result["status"] == "rejected"

    def test_place_order_with_missing_item(self, log):
        log.info("Arranging order with missing item_id")

        service = OrderService(log)
        result = service.place({"quantity": 2})

        log.info("Order result for missing item", result=result)
        assert result["status"] in ("accepted", "rejected")
```

### Running pytest

```bash
pytest tests/ -v
# Log output written to: myapp_tests.log.jsonl
```

---

## unittest

### setUp / tearDown Logger Configuration

```python
# test_payment_service.py
import unittest
import structlog

from logging_config import configure_structlog
from payment_service import PaymentService


class TestPaymentService(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """
        Configure structlog once for the entire test class.
        Called before any test in this class runs.
        """
        configure_structlog("myapp_tests.log.jsonl")
        cls._base_logger = structlog.get_logger().bind(
            application="myapp",
            **{"test-module-name": cls.__name__, "@logger": cls.__name__},
        )
        cls._base_logger.info("Test class setup complete", test_class=cls.__name__)

    def setUp(self):
        """
        Bind test-case-name for each individual test method.
        Called before every test method.
        """
        self.log = self._base_logger.bind(**{"test-case-name": self._testMethodName})
        self.log.info("Test started", test=self._testMethodName)

    def tearDown(self):
        """
        Log test completion. Called after every test method.
        """
        outcome = "passed" if self._outcome.success else "failed"
        self.log.info("Test finished", test=self._testMethodName, outcome=outcome)

    @classmethod
    def tearDownClass(cls):
        """
        Called after all tests in the class have run.
        Flush any buffered log output.
        """
        cls._base_logger.info("Test class teardown", test_class=cls.__name__)
        # structlog with stdlib LoggerFactory flushes via the stdlib handler
        import logging
        for handler in logging.root.handlers:
            handler.flush()

    # --- Tests ---

    def test_charge_with_valid_card(self):
        self.log.info("Arranging charge with valid card")

        service = PaymentService(self.log)
        result = service.charge(amount=100, card_token="tok_valid")

        self.log.info("Charge result", result=result)
        self.assertTrue(result["success"])

    def test_charge_with_expired_card(self):
        self.log.info("Arranging charge with expired card")

        service = PaymentService(self.log)
        result = service.charge(amount=100, card_token="tok_expired")

        self.log.warning("Expected failure for expired card", result=result)
        self.assertFalse(result["success"])


if __name__ == "__main__":
    unittest.main()
```

### Running unittest

```bash
python -m unittest discover -s tests -v
# Log output written to: myapp_tests.log.jsonl
```

---

## Sample JSONL Output

A correctly configured test produces log lines like:

```jsonl
{"@t":"2026-02-22T10:15:30.123+00:00","@l":"Info","@m":"Test started","@logger":"TestOrderService","test-case-name":"test_place_order_with_valid_item","test-module-name":"TestOrderService","application":"myapp","test":"test_place_order_with_valid_item"}
{"@t":"2026-02-22T10:15:30.130+00:00","@l":"Info","@m":"Arranging order with valid item","@logger":"TestOrderService","test-case-name":"test_place_order_with_valid_item","test-module-name":"TestOrderService","application":"myapp"}
{"@t":"2026-02-22T10:15:30.132+00:00","@l":"Debug","@m":"Placing order","@logger":"OrderService","test-case-name":"test_place_order_with_valid_item","test-module-name":"TestOrderService","application":"myapp","order":{"item_id":42,"quantity":1}}
{"@t":"2026-02-22T10:15:30.134+00:00","@l":"Info","@m":"Order accepted","@logger":"OrderService","test-case-name":"test_place_order_with_valid_item","test-module-name":"TestOrderService","application":"myapp","item_id":42}
{"@t":"2026-02-22T10:15:30.136+00:00","@l":"Info","@m":"Order result","@logger":"TestOrderService","test-case-name":"test_place_order_with_valid_item","test-module-name":"TestOrderService","application":"myapp","result":{"status":"accepted"}}
{"@t":"2026-02-22T10:15:30.138+00:00","@l":"Info","@m":"Test finished","@logger":"TestOrderService","test-case-name":"test_place_order_with_valid_item","test-module-name":"TestOrderService","application":"myapp","test":"test_place_order_with_valid_item"}
```

Key observations:
- `@t`, `@l`, `@m` are produced by the processor chain remapping structlog's `timestamp`, `level`, and `event`.
- `test-case-name` and `test-module-name` flow through the bound logger into every line, including production code log calls.
- `@logger` distinguishes test class log lines from production class log lines in the same file.

---

## Quick Reference: Framework Comparison

| Feature | pytest | unittest |
|---|---|---|
| Logger setup | `pytest_configure` hook + `conftest.py` fixtures | `setUpClass` |
| Per-test context | `log` fixture (function-scoped) | `setUp` |
| Test name at runtime | `request.node.name` | `self._testMethodName` |
| Module/class name | `request.cls.__name__` or `request.module.__name__` | `cls.__name__` |
| Logger lifetime | Session (base) + function (bound) | Class (base) + method (bound) |
| Teardown | `yield` in fixture | `tearDown` / `tearDownClass` |
