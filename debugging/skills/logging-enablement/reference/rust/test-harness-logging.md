# Rust Test Harness Logging

How to configure structured JSONL logging during `cargo test` runs using `tracing` + `tracing-subscriber`, with the `tracing-test` crate for log assertions.

---

## 1. Cargo.toml Dependencies

```toml
[dependencies]
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }

[dev-dependencies]
tracing-test = "0.2"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
```

> `tracing-test` is a dev-dependency only — it provides `#[traced_test]` and assertion helpers used exclusively in test code.

---

## 2. Configure tracing-subscriber for JSONL Output During Tests

Write structured JSON logs to a file during test runs. Each log line is a separate JSON object (JSONL format).

```rust
use std::fs::OpenOptions;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub fn init_test_logging() {
    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open("my-crate-tests.log.jsonl")
        .expect("Failed to open test log file");

    let json_layer = fmt::layer()
        .json()
        .with_current_span(true)
        .with_span_list(true)
        .with_file(true)
        .with_line_number(true)
        .with_writer(std::sync::Mutex::new(log_file));

    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env().add_directive(tracing::Level::DEBUG.into()))
        .with(json_layer)
        .try_init()
        .ok(); // ok() swallows the error when subscriber is already set (parallel tests)
}
```

Log file name convention: `{crate-name}-tests.log.jsonl`

---

## 3. Injecting Test Case Name and Module Name into Log Context

Use a tracing span to attach `test-case-name` and `test-module-name` as structured fields. All log events emitted within that span automatically carry these fields.

```rust
use tracing::{info_span, Instrument};

#[test]
fn my_feature_test() {
    init_test_logging();

    let span = info_span!(
        "test",
        test_case_name = "my_feature_test",
        test_module_name = module_path!(),
        application = env!("CARGO_PKG_NAME"),
    );
    let _guard = span.enter();

    // All tracing macros inside here inherit span fields
    tracing::info!("Starting test");
    // ... test body
}
```

The `module_path!()` macro expands to the full Rust module path at compile time, e.g. `my_crate::auth::tests`.

---

## 4. Creating a Shared Subscriber Passed to Code Under Test

When the code under test needs to emit logs into the same subscriber, initialise the subscriber once and let the tracing global pick it up. For libraries that accept a subscriber explicitly, pass it via `with_subscriber`.

```rust
use tracing::Subscriber;
use tracing_subscriber::{fmt, layer::SubscriberExt, Registry};

fn build_test_subscriber() -> impl Subscriber + Send + Sync {
    let log_file = std::fs::File::create("my-crate-tests.log.jsonl")
        .expect("Failed to create test log file");

    Registry::default().with(
        fmt::layer()
            .json()
            .with_current_span(true)
            .with_writer(std::sync::Mutex::new(log_file)),
    )
}

#[test]
fn test_with_explicit_subscriber() {
    let subscriber = build_test_subscriber();

    tracing::subscriber::with_default(subscriber, || {
        // Code under test runs here and its tracing events are captured
        let span = tracing::info_span!(
            "test",
            test_case_name = "test_with_explicit_subscriber",
            test_module_name = module_path!(),
        );
        let _guard = span.enter();

        code_under_test::do_something();
    });
}
```

`with_default` sets the subscriber as the thread-local default for the duration of the closure without touching the global subscriber — safe for parallel test execution.

---

## 5. Complete Working Examples

### Example A: Basic test with span context

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Once;
    use tracing::{debug, error, info, warn};

    static INIT: Once = std::sync::Once::new();

    fn setup() {
        INIT.call_once(|| {
            let log_file = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open("my-crate-tests.log.jsonl")
                .expect("Failed to open test log file");

            tracing_subscriber::fmt()
                .json()
                .with_current_span(true)
                .with_env_filter("debug")
                .with_writer(std::sync::Mutex::new(log_file))
                .try_init()
                .ok();
        });
    }

    #[test]
    fn test_user_authentication() {
        setup();

        let span = tracing::info_span!(
            "test",
            test_case_name = "test_user_authentication",
            test_module_name = module_path!(),
            application = env!("CARGO_PKG_NAME"),
        );
        let _guard = span.enter();

        info!(user_id = 42, "Attempting login");
        debug!(method = "password", "Auth method selected");

        let result = authenticate_user(42, "correct-password");

        assert!(result.is_ok());
        info!(outcome = "success", "Login completed");
    }

    #[test]
    fn test_invalid_credentials() {
        setup();

        let span = tracing::info_span!(
            "test",
            test_case_name = "test_invalid_credentials",
            test_module_name = module_path!(),
            application = env!("CARGO_PKG_NAME"),
        );
        let _guard = span.enter();

        warn!(user_id = 99, "Attempting login with bad credentials");
        let result = authenticate_user(99, "wrong-password");

        assert!(result.is_err());
        error!(reason = "invalid_credentials", "Login rejected");
    }
}
```

### Example B: Async test

```rust
#[cfg(test)]
mod async_tests {
    use tracing::info_span;
    use tracing_futures::Instrument; // or use .instrument() from tracing directly

    #[tokio::test]
    async fn test_async_fetch() {
        let span = info_span!(
            "test",
            test_case_name = "test_async_fetch",
            test_module_name = module_path!(),
        );

        async {
            tracing::info!(url = "https://example.com", "Fetching resource");
            // async code under test
        }
        .instrument(span)
        .await;
    }
}
```

---

## 6. `-- --nocapture` Flag

By default, `cargo test` captures all stdout/stderr output. Use `--nocapture` to see tracing output printed to the terminal (useful when writing to stderr instead of a file):

```bash
# See all output
cargo test -- --nocapture

# Run a specific test and see its output
cargo test test_user_authentication -- --nocapture

# Set log level via environment variable
RUST_LOG=debug cargo test -- --nocapture

# Both a filter and nocapture
RUST_LOG=my_crate=trace cargo test -- --nocapture
```

When writing to a file (as in the examples above), `--nocapture` is not required — file writes bypass capture. Use `--nocapture` when you add a `fmt::layer()` targeting stderr/stdout for human-readable terminal output alongside the file layer.

---

## 7. tracing-test: Asserting on Log Output

`tracing-test` provides `#[traced_test]` and assertion macros to make log-based assertions in unit tests without needing a real file.

### Setup

```toml
[dev-dependencies]
tracing-test = "0.2"
```

### Basic assertion

```rust
use tracing::{info, warn};
use tracing_test::traced_test;

#[test]
#[traced_test]
fn test_logs_warning_on_retry() {
    // #[traced_test] sets up an in-memory subscriber for this test

    let result = retry_operation(3);

    // Assert a log message was emitted
    assert!(logs_contain("retrying operation"));

    // Assert a specific level message
    assert!(logs_contain("max retries reached"));
}
```

### Checking specific log content

```rust
#[test]
#[traced_test]
fn test_decision_point_logged() {
    process_order(Order { id: 1, amount: 150.0 });

    // Check that a structured field value appears in logs
    assert!(logs_contain("order_id=1"));
    assert!(logs_contain("fraud_check=passed"));
}
```

### Combining traced_test with span context

```rust
#[test]
#[traced_test]
fn test_with_context() {
    let span = tracing::info_span!(
        "test",
        test_case_name = "test_with_context",
        test_module_name = module_path!(),
    );
    let _guard = span.enter();

    run_business_logic();

    assert!(logs_contain("business_logic completed"));
}
```

> `logs_contain` checks the in-memory buffer that `#[traced_test]` populates — it does not check the JSONL file. Use it for correctness assertions; use the JSONL file for debugging and post-mortem analysis.

---

## Canonical JSONL Fields

These are the expected field names in the output JSON objects:

| Canonical Field    | tracing-subscriber Default | Notes                                              |
|--------------------|----------------------------|----------------------------------------------------|
| `@t`               | `timestamp`                | Remap via custom format layer (see below)          |
| `@l`               | `level`                    | Remap via custom format layer                      |
| `@m`               | `fields.message`           | Nested under `fields` in default JSON output       |
| `@logger`          | `target`                   | Module path of the emitting code                   |
| `test-case-name`   | span field                 | Set in the enclosing test span                     |
| `test-module-name` | span field                 | Set via `module_path!()` in the test span          |
| `application`      | span field                 | Set via `env!("CARGO_PKG_NAME")` in the test span |

### Remapping to canonical field names

`tracing-subscriber`'s JSON layer uses `timestamp`, `level`, and nests the message under `fields.message`. To emit `@t`, `@l`, `@m` directly, use a custom `FormatEvent` implementation or post-process with a tool like `jq`.

Quick `jq` remap for consumption by a log viewer expecting canonical fields:

```bash
cat my-crate-tests.log.jsonl | jq '{
  "@t": .timestamp,
  "@l": .level,
  "@m": .fields.message,
  "@logger": .target,
  "test-case-name": .spans[0]["test_case_name"],
  "application": .spans[0]["application"]
}'
```

For in-process remapping, implement `tracing_subscriber::fmt::FormatEvent` and output the canonical field names directly. This is more involved but produces spec-compliant JSONL without post-processing.
