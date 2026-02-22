# Rust Production Logging

How to configure structured JSONL logging in production Rust services using `tracing` + `tracing-subscriber` (primary) and `slog` + `slog-json` (alternative).

---

## 1. Cargo.toml Dependencies

### tracing stack (recommended)

```toml
[dependencies]
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
tracing-appender = "0.2"

# Optional: instrument async code
tracing-futures = "0.2"
```

### slog stack (alternative)

```toml
[dependencies]
slog = "2"
slog-json = "2"
slog-async = "2"
slog-envlogger = "2"
```

---

## 2. tracing-subscriber JSON Layer Configuration with Canonical Fields

### Minimal production setup

```rust
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub fn init_logging() {
    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env())
        .with(
            fmt::layer()
                .json()
                .with_current_span(true)
                .with_span_list(false)
                .with_file(false)
                .with_line_number(false)
                .with_target(true),
        )
        .init();
}

fn main() {
    init_logging();
    tracing::info!(application = env!("CARGO_PKG_NAME"), "Service starting");
}
```

### Field mapping notes

`tracing-subscriber`'s JSON layer produces these field names by default:

| Canonical Field | tracing-subscriber Output  | Location in JSON          |
|-----------------|----------------------------|---------------------------|
| `@t`            | `timestamp`                | top-level                 |
| `@l`            | `level`                    | top-level                 |
| `@m`            | `message`                  | nested under `fields`     |
| `@logger`       | `target`                   | top-level                 |
| `application`   | span field or event field  | `fields` or `spans[0]`    |

To emit exactly the canonical `@t`, `@l`, `@m` field names, implement a custom `FormatEvent`. For most production deployments it is simpler to configure the log aggregator (Datadog, Loki, etc.) to remap these fields on ingest.

### Custom FormatEvent for canonical field names

```rust
use std::fmt;
use tracing::{Event, Subscriber};
use tracing_subscriber::fmt::{format, FmtContext, FormatEvent, FormatFields};
use tracing_subscriber::registry::LookupSpan;

struct CanonicalJsonFormat;

impl<S, N> FormatEvent<S, N> for CanonicalJsonFormat
where
    S: Subscriber + for<'a> LookupSpan<'a>,
    N: for<'a> FormatFields<'a> + 'static,
{
    fn format_event(
        &self,
        ctx: &FmtContext<'_, S, N>,
        mut writer: format::Writer<'_>,
        event: &Event<'_>,
    ) -> fmt::Result {
        // Build a serde_json::Value and write it — see full example in repo docs.
        // Key: emit "@t", "@l", "@m", "@logger" instead of default names.
        let meta = event.metadata();
        write!(
            writer,
            r#"{{"@t":"{}","@l":"{}","@logger":"{}"}}"#,
            chrono::Utc::now().to_rfc3339(),
            meta.level(),
            meta.target(),
        )?;
        writeln!(writer)
    }
}
```

> A full implementation requires visiting event fields via `Visit`. The snippet above shows the structure; adapt with `serde_json` for production use.

---

## 3. slog with slog-json Drain Configuration

Use `slog` when you need composable drains or are integrating with an existing `slog`-based codebase.

```rust
use slog::{o, Drain, Logger};
use slog_async::Async;
use slog_json::Json;
use std::fs::OpenOptions;

pub fn build_logger() -> Logger {
    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open("service.log.jsonl")
        .expect("Failed to open log file");

    let json_drain = Json::new(log_file)
        .add_default_keys()         // timestamp, level, message, module
        .add_key_value(o!(
            "application" => env!("CARGO_PKG_NAME"),
        ))
        .build()
        .fuse();

    let async_drain = Async::new(json_drain)
        .chan_size(4096)
        .build()
        .fuse();

    let filtered_drain = slog_envlogger::new(async_drain).fuse();

    Logger::root(filtered_drain, o!("version" => env!("CARGO_PKG_VERSION")))
}

fn main() {
    let log = build_logger();

    slog::info!(log, "Service starting";
        "port" => 8080,
        "environment" => "production",
    );
}
```

### slog field mapping

| Canonical Field | slog-json key  | Set via                      |
|-----------------|----------------|------------------------------|
| `@t`            | `ts`           | `add_default_keys()`         |
| `@l`            | `level`        | `add_default_keys()`         |
| `@m`            | `msg`          | log macro second argument    |
| `@logger`       | `module`       | `add_default_keys()`         |
| `application`   | `application`  | `add_key_value(o!(...))`     |

To use exact canonical names (`@t`, `@l`, `@m`), replace `add_default_keys()` with explicit key registration:

```rust
let json_drain = Json::new(log_file)
    .add_key_value(o!(
        "@t"   => slog::PushFnValue(|_rec, ser| {
            ser.emit(chrono::Utc::now().to_rfc3339())
        }),
        "@l"   => slog::FnValue(|rec| rec.level().as_str()),
        "@m"   => slog::PushFnValue(|rec, ser| ser.emit(rec.msg())),
        "@logger" => slog::FnValue(|rec| rec.module()),
        "application" => env!("CARGO_PKG_NAME"),
    ))
    .build()
    .fuse();
```

---

## 4. Log Level Strategy (RUST_LOG Environment Variable)

`tracing-subscriber`'s `EnvFilter` reads `RUST_LOG` at startup.

### Common patterns

```bash
# All crates at INFO
RUST_LOG=info ./my-service

# Your crate at DEBUG, dependencies at WARN
RUST_LOG=warn,my_crate=debug ./my-service

# Specific module at TRACE
RUST_LOG=warn,my_crate::database=trace ./my-service

# Multiple overrides
RUST_LOG=warn,my_crate=debug,my_crate::http=trace,tower=info ./my-service
```

### Recommended default per environment

| Environment | `RUST_LOG` value                        |
|-------------|-----------------------------------------|
| Production  | `warn,{crate_name}=info`                |
| Staging     | `warn,{crate_name}=debug`               |
| Development | `debug` or `{crate_name}=trace`         |
| Test        | `debug` (set in test setup function)    |

### Programmatic fallback

```rust
use tracing_subscriber::EnvFilter;

let filter = EnvFilter::try_from_default_env()
    .unwrap_or_else(|_| EnvFilter::new("info"));  // fallback if RUST_LOG unset
```

---

## 5. Example Tracing Instrumentation at Decision Points

Log structured context at every meaningful decision or state transition, not just errors.

```rust
use tracing::{debug, error, info, warn};

pub fn process_payment(order_id: u64, amount_cents: u64) -> Result<PaymentResult, PaymentError> {
    info!(order_id, amount_cents, "Payment processing started");

    if amount_cents == 0 {
        warn!(order_id, "Rejecting zero-amount payment");
        return Err(PaymentError::InvalidAmount);
    }

    debug!(order_id, amount_cents, "Calling payment gateway");
    let response = payment_gateway::charge(order_id, amount_cents)?;

    match response.status {
        GatewayStatus::Approved => {
            info!(
                order_id,
                transaction_id = %response.transaction_id,
                "Payment approved"
            );
            Ok(PaymentResult::Approved(response.transaction_id))
        }
        GatewayStatus::Declined => {
            warn!(
                order_id,
                reason = %response.decline_reason,
                "Payment declined"
            );
            Err(PaymentError::Declined(response.decline_reason))
        }
        GatewayStatus::Error => {
            error!(
                order_id,
                gateway_error = %response.error_message,
                "Payment gateway error"
            );
            Err(PaymentError::GatewayError(response.error_message))
        }
    }
}
```

---

## 6. `#[instrument]` Attribute Usage

`#[instrument]` automatically creates a span for a function, recording its arguments as span fields.

```rust
use tracing::instrument;

// Basic usage — function args become span fields
#[instrument]
pub fn validate_user(user_id: u64, role: &str) -> bool {
    tracing::debug!("Validating user permissions");
    // span is active for the entire function body
    check_permissions(user_id, role)
}

// Skip sensitive fields
#[instrument(skip(password))]
pub fn authenticate(username: &str, password: &str) -> Result<Session, AuthError> {
    tracing::info!("Authentication attempt");
    // password is NOT recorded in the span fields
    verify_credentials(username, password)
}

// Custom span name and additional fields
#[instrument(name = "db.query", fields(table = %table_name, row_count))]
pub fn query_table(table_name: &str, filter: &QueryFilter) -> Vec<Row> {
    let rows = db_query(table_name, filter);

    // Record a value computed inside the function into the span
    tracing::Span::current().record("row_count", rows.len());

    rows
}

// Async functions
#[instrument(skip(self))]
pub async fn fetch_resource(&self, resource_id: Uuid) -> Result<Resource, Error> {
    tracing::info!("Fetching resource");
    self.http_client.get(resource_id).await
}
```

---

## 7. Span-Based Context Propagation

Spans carry context through call chains, so nested calls inherit parent span fields automatically.

```rust
use tracing::{info, info_span, Instrument};

pub async fn handle_request(request_id: Uuid, user_id: u64) {
    // All operations within this span inherit request_id and user_id
    let span = info_span!("request", %request_id, user_id);

    async move {
        info!("Request received");  // inherits request_id + user_id

        authenticate_user(user_id).await;   // nested spans also inherit
        fetch_data(request_id).await;
        build_response().await;

        info!("Request completed");
    }
    .instrument(span)
    .await;
}

// Propagating context across service boundaries
pub fn inject_trace_context(headers: &mut HeaderMap) {
    let span = tracing::Span::current();
    // Use opentelemetry-tracing bridge for W3C trace context propagation
    // or extract span ID manually for correlation in logs
    if let Some(span_id) = span.id() {
        headers.insert("x-trace-id", span_id.into_u64().to_string().parse().unwrap());
    }
}
```

---

## 8. File Output with tracing-appender (Rolling File)

`tracing-appender` provides non-blocking, rolling file writers suitable for production services.

```rust
use tracing_appender::{non_blocking, rolling};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub fn init_logging() -> non_blocking::WorkerGuard {
    // Rolling daily log files: ./logs/my-service.2024-01-15.log.jsonl
    let file_appender = rolling::daily("./logs", "my-service.log.jsonl");
    let (non_blocking_writer, guard) = non_blocking(file_appender);

    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env())
        .with(
            fmt::layer()
                .json()
                .with_current_span(true)
                .with_writer(non_blocking_writer),
        )
        .init();

    guard  // MUST be held for the duration of the program; dropping it flushes and closes
}

fn main() {
    let _guard = init_logging();  // keep guard alive for program lifetime
    tracing::info!("Service starting");
    // ...
}
```

### Rolling strategies

```rust
use tracing_appender::rolling;

// New file every hour
let appender = rolling::hourly("./logs", "service.log.jsonl");

// New file every day
let appender = rolling::daily("./logs", "service.log.jsonl");

// New file every minute (useful for high-volume services)
let appender = rolling::minutely("./logs", "service.log.jsonl");

// Never roll (single file, manual rotation)
let appender = rolling::never("./logs", "service.log.jsonl");
```

---

## 9. Multiple Layers (JSON File + Human-Readable Stdout)

In development, emit human-readable logs to stdout while also writing machine-readable JSON to a file. In production, disable the human-readable layer and keep only the JSON file layer.

```rust
use std::fs::OpenOptions;
use tracing_appender::{non_blocking, rolling};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub fn init_logging() -> non_blocking::WorkerGuard {
    let file_appender = rolling::daily("./logs", "service.log.jsonl");
    let (non_blocking_writer, guard) = non_blocking(file_appender);

    // JSON layer — always active, writes to rolling file
    let json_layer = fmt::layer()
        .json()
        .with_current_span(true)
        .with_span_list(false)
        .with_writer(non_blocking_writer);

    // Human-readable layer — active only when not in production
    let is_production = std::env::var("APP_ENV").as_deref() == Ok("production");
    let stdout_layer = if !is_production {
        Some(
            fmt::layer()
                .pretty()
                .with_target(true)
                .with_writer(std::io::stdout),
        )
    } else {
        None
    };

    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env())
        .with(json_layer)
        .with(stdout_layer)
        .init();

    guard
}
```

### Environment-based output summary

| `APP_ENV`    | JSON file | Stdout |
|--------------|-----------|--------|
| `production` | yes       | no     |
| `staging`    | yes       | no     |
| anything else| yes       | yes (pretty-printed) |

### Complete main.rs example

```rust
mod logging;

fn main() {
    let _guard = logging::init_logging();

    tracing::info!(
        application = env!("CARGO_PKG_NAME"),
        version = env!("CARGO_PKG_VERSION"),
        "Service started"
    );

    if let Err(e) = run_server() {
        tracing::error!(error = %e, "Server exited with error");
        std::process::exit(1);
    }
}

#[tracing::instrument]
fn run_server() -> Result<(), Box<dyn std::error::Error>> {
    tracing::info!(port = 8080, "Listening");
    // server loop
    Ok(())
}
```
