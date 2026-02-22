# C# Production Logging

Structured JSONL logging for C# production code. Covers **Serilog** (primary recommendation — canonical fields out of the box) and **NLog** (widely used — requires `JsonLayout` attribute mapping). Both produce JSONL queryable with DuckDB.

---

## Canonical Fields

| Field | Description |
|---|---|
| `@t` | Timestamp — ISO 8601 UTC |
| `@l` | Log level |
| `@m` | Rendered message |
| `@mt` | Message template |
| `@logger` | Source class name |
| `application` | App or service name |
| `environment` | `Development`, `Staging`, `Production` |
| `MachineName` | Host machine name |

---

## Primary Recommendation: Serilog with CompactJsonFormatter

`Serilog.Formatting.Compact.CompactJsonFormatter` emits the canonical `@t` / `@l` / `@m` / `@mt` fields natively. No custom formatter is needed.

### NuGet Packages

```bash
dotnet add package Serilog
dotnet add package Serilog.Sinks.File
dotnet add package Serilog.Formatting.Compact
dotnet add package Serilog.Context
dotnet add package Serilog.Enrichers.Environment
dotnet add package Serilog.Extensions.Hosting
```

For ASP.NET Core:

```bash
dotnet add package Serilog.AspNetCore
```

For `Microsoft.Extensions.Logging` bridge:

```bash
dotnet add package Serilog.Extensions.Logging
```

---

## Bootstrap Configuration

### Console / Worker Application

```csharp
// Program.cs
using Serilog;
using Serilog.Formatting.Compact;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Verbose()                         // Override per environment (see Log Level Strategy)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .Enrich.WithProperty("application", "MyApp")
    .WriteTo.File(
        formatter: new CompactJsonFormatter(),
        path: "logs/myapp.log.jsonl",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14,
        rollOnFileSizeLimit: true,
        fileSizeLimitBytes: 100 * 1024 * 1024)      // 100 MB per file
    .CreateLogger();

try
{
    Log.Information("Application starting");
    // ... run app
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
```

### ASP.NET Core (Program.cs)

```csharp
// Program.cs
using Serilog;
using Serilog.Formatting.Compact;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, config) =>
    config
        .MinimumLevel.Information()
        .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
        .MinimumLevel.Override("System", Serilog.Events.LogEventLevel.Warning)
        .Enrich.FromLogContext()
        .Enrich.WithMachineName()
        .Enrich.WithEnvironmentName()
        .Enrich.WithProperty("application", context.HostingEnvironment.ApplicationName)
        .WriteTo.File(
            formatter: new CompactJsonFormatter(),
            path: "logs/myapp.log.jsonl",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 14));

var app = builder.Build();
app.UseSerilogRequestLogging();   // Emits structured HTTP request logs
// ...
app.Run();
```

---

## Microsoft.Extensions.Logging Integration

Production code should depend on `ILogger<T>` from `Microsoft.Extensions.Logging`. Serilog acts as the backend provider — the abstraction is preserved for testability.

### DI Registration

```csharp
// Startup or Program.cs — when NOT using UseSerilog() host extension
services.AddLogging(logging =>
{
    logging.ClearProviders();
    logging.AddSerilog(dispose: true);
});
```

### Usage in Production Classes

```csharp
using Microsoft.Extensions.Logging;

public class OrderService
{
    private readonly ILogger<OrderService> _log;
    private readonly IPaymentGateway _gateway;

    public OrderService(ILogger<OrderService> log, IPaymentGateway gateway)
    {
        _log = log;
        _gateway = gateway;
    }

    public async Task<OrderResult> PlaceAsync(Order order, CancellationToken ct)
    {
        _log.LogInformation("Placing order {OrderId} for item {ItemId}", order.Id, order.ItemId);

        if (order.Quantity <= 0)
        {
            _log.LogWarning("Order {OrderId} rejected — invalid quantity {Quantity}", order.Id, order.Quantity);
            return OrderResult.Rejected("Invalid quantity");
        }

        PaymentResult payment;
        try
        {
            _log.LogDebug("Charging card for order {OrderId}, amount {Amount}", order.Id, order.Total);
            payment = await _gateway.ChargeAsync(order.CardToken, order.Total, ct);
        }
        catch (PaymentException ex)
        {
            _log.LogError(ex, "Payment failed for order {OrderId}", order.Id);
            return OrderResult.Failed("Payment error");
        }

        if (!payment.Success)
        {
            _log.LogWarning("Payment declined for order {OrderId}: {Reason}", order.Id, payment.DeclineReason);
            return OrderResult.Rejected(payment.DeclineReason);
        }

        _log.LogInformation("Order {OrderId} accepted, payment {PaymentId}", order.Id, payment.TransactionId);
        return OrderResult.Accepted(payment.TransactionId);
    }
}
```

> Using `ILogger<T>` keeps production code decoupled from Serilog. In tests, inject `NullLogger<T>.Instance` or a Serilog `ILogger` wrapped with `SerilogLoggerFactory`.

---

## Alternative: NLog with JsonLayout

If the project already uses NLog, configure `JsonLayout` to emit JSONL with canonical field names. NLog uses `NLog.config` (XML) for target/rule configuration.

### NuGet Packages

```bash
dotnet add package NLog
dotnet add package NLog.Web.AspNetCore        # For ASP.NET Core integration
```

### NLog.config with Canonical JSONL Fields

Map NLog layout renderers to canonical field names via `JsonLayout` attributes:

```xml
<?xml version="1.0" encoding="utf-8" ?>
<nlog xmlns="http://www.nlog-project.org/schemas/NLog.xsd"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      autoReload="true"
      internalLogLevel="Warn"
      internalLogFile="App_Data/logs/internal-nlog.txt">

    <extensions>
        <add assembly="NLog.Web.AspNetCore"/>
    </extensions>

    <targets>
        <!-- JSONL target with canonical field names -->
        <target xsi:type="File"
                name="jsonFile"
                fileName="${basedir}/../Logs/${processname}.log.jsonl"
                archiveFileName="${basedir}/../Logs/${processname}.{#}.log.jsonl"
                archiveAboveSize="104857600"
                maxArchiveFiles="14"
                archiveNumbering="Sequence"
                keepFileOpen="true"
                concurrentWrites="true"
                autoFlush="true">
            <layout xsi:type="JsonLayout">
                <attribute name="@t" layout="${date:universalTime=true:format=O}" />
                <attribute name="@l" layout="${level:upperCase=true}" />
                <attribute name="@m" layout="${message}" />
                <attribute name="@logger" layout="${logger:shortName=true}" />
                <attribute name="application" layout="${processname}" />
                <attribute name="@x" layout="${exception:format=Message,Type,Method,Data,StackTrace:innerFormat=Message,Type,Method,Data,StackTrace:maxInnerExceptionLevel=50}" />
                <attribute name="processId" layout="${processid}" />
                <attribute name="threadId" layout="${threadid}" />
                <attribute name="correlationId" layout="${aspnet-traceidentifier}" />
                <attribute name="properties" layout="${all-event-properties:format=@}" encode="false" />
            </layout>
        </target>

        <!-- Optional: plain text target for console during development -->
        <target xsi:type="Console" name="console"
                layout="${longdate}|${level:uppercase=true}|${logger:shortName=true}|${message} ${exception:format=ToString}" />
    </targets>

    <rules>
        <logger name="Microsoft.*" maxlevel="Info" final="true" />
        <logger name="System.*" maxlevel="Info" final="true" />
        <logger name="*" minlevel="Info" writeTo="jsonFile" />
        <logger name="*" minlevel="Debug" writeTo="console" />
    </rules>
</nlog>
```

### Field Mapping: NLog → Canonical

| Canonical Field | NLog Layout Renderer | Notes |
|----------------|---------------------|-------|
| `@t` | `${date:universalTime=true:format=O}` | ISO 8601 UTC |
| `@l` | `${level:upperCase=true}` | INFO, WARN, ERROR, etc. |
| `@m` | `${message}` | Rendered message |
| `@logger` | `${logger:shortName=true}` | Class name without namespace |
| `@x` | `${exception:format=...}` | Full stack trace with inner exceptions |
| `application` | `${processname}` | Or hardcoded via `layout="MyApp"` |
| `correlationId` | `${aspnet-traceidentifier}` | ASP.NET Core trace ID |

### Migrating Existing NLog Configs

If your project already has an NLog.config with a `JsonLayout` target using non-canonical field names (e.g., `time`, `level`, `message`), remap the attribute names:

```xml
<!-- BEFORE (existing field names) -->
<attribute name="time" layout="${date:universalTime=true:format=O}" />
<attribute name="level" layout="${level:upperCase=true}" />
<attribute name="message" layout="${message}" />
<attribute name="logger" layout="${logger}" />
<attribute name="exception" layout="${exception:format=ShortType, Message}" />
<attribute name="exceptionStack" layout="${exception:format=Message,Type,Method,Data,StackTrace...}" />
<attribute name="app" layout="WebCore" />

<!-- AFTER (canonical field names for DuckDB querying) -->
<attribute name="@t" layout="${date:universalTime=true:format=O}" />
<attribute name="@l" layout="${level:upperCase=true}" />
<attribute name="@m" layout="${message}" />
<attribute name="@logger" layout="${logger:shortName=true}" />
<attribute name="@x" layout="${exception:format=Message,Type,Method,Data,StackTrace:innerFormat=Message,Type,Method,Data,StackTrace:maxInnerExceptionLevel=50}" />
<attribute name="application" layout="WebCore" />
```

Key changes:
- `time` → `@t`, `level` → `@l`, `message` → `@m`, `logger` → `@logger`
- Merge `exception` + `exceptionStack` into a single `@x` field
- `app` → `application` for consistency
- Keep additional fields (`requestId`, `userName`, `clientIp`, etc.) as-is — they become queryable structured properties

### ASP.NET Core Integration

```csharp
// Program.cs
using NLog;
using NLog.Web;

var logger = LogManager.Setup()
    .LoadConfigurationFromAppSettings()
    .GetCurrentClassLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);
    builder.Logging.ClearProviders();
    builder.Host.UseNLog();

    var app = builder.Build();
    app.Run();
}
catch (Exception ex)
{
    logger.Error(ex, "Application stopped due to exception");
    throw;
}
finally
{
    LogManager.Shutdown();
}
```

### Usage in Production Classes

NLog integrates with `Microsoft.Extensions.Logging`, so production code uses the same `ILogger<T>` abstraction as Serilog:

```csharp
public class OrderService
{
    private readonly ILogger<OrderService> _log;

    public OrderService(ILogger<OrderService> log) => _log = log;

    public void PlaceOrder(Order order)
    {
        // Structured logging with NLog message templates
        _log.LogInformation("Placing order {OrderId} for {CustomerId}", order.Id, order.CustomerId);

        // NLog captures these as structured properties in the JsonLayout "properties" attribute
    }
}
```

### Structured Properties in NLog

NLog captures message template parameters as event properties. Include them in JSONL output using:

```xml
<!-- Renders all event properties as nested JSON -->
<attribute name="properties" layout="${all-event-properties:format=@}" encode="false" />
```

This produces:

```jsonl
{"@t":"2026-02-22T10:15:31.200Z","@l":"INFO","@m":"Placing order ORD-123 for CUST-456","@logger":"OrderService","application":"MyApp","properties":{"OrderId":"ORD-123","CustomerId":"CUST-456"}}
```

> **Note**: NLog nests structured properties under `"properties"` unlike Serilog which promotes them to top-level fields. When querying with DuckDB, access them via `json_extract(properties, '$.OrderId')` or use `read_json_auto` which may flatten them depending on the structure.

### NLog Sample JSONL Output

```jsonl
{"@t":"2026-02-22T10:15:30.001Z","@l":"INFO","@m":"Application starting","@logger":"Program","application":"MyApp","processId":"12345","threadId":"1","correlationId":""}
{"@t":"2026-02-22T10:15:31.200Z","@l":"INFO","@m":"Placing order ORD-123 for item ITEM-42","@logger":"OrderService","application":"MyApp","processId":"12345","threadId":"8","correlationId":"abc123","properties":{"OrderId":"ORD-123","ItemId":"ITEM-42"}}
{"@t":"2026-02-22T10:15:31.360Z","@l":"ERROR","@m":"Payment failed for order ORD-123","@logger":"OrderService","application":"MyApp","@x":"PaymentException: Connection timeout\n   at PaymentGateway.ChargeAsync(...)","processId":"12345","threadId":"8","correlationId":"abc123","properties":{"OrderId":"ORD-123"}}
```

---

## Log Level Strategy

| Level | When to Use | Environment |
|---|---|---|
| `Verbose` / `Trace` | Low-level internal state, loop iterations | Local development only |
| `Debug` | Decision inputs, branching conditions, values entering a function | Local + staging |
| `Information` | Business-significant events: order placed, user authenticated, job completed | All environments |
| `Warning` | Recoverable problems, expected failure paths, degraded state | All environments |
| `Error` | Exceptions, unhandled failures requiring attention | All environments |
| `Fatal` | Application cannot continue | All environments |

### appsettings.json Configuration

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "System": "Warning",
        "Microsoft.EntityFrameworkCore": "Warning"
      }
    }
  }
}
```

Override for local development in `appsettings.Development.json`:

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Verbose",
      "Override": {
        "Microsoft": "Information",
        "System": "Information"
      }
    }
  }
}
```

---

## Logging at Decision Points

Log at every meaningful branch, external call, and error path. The goal is that a production incident can be diagnosed entirely from the log file without attaching a debugger.

```csharp
public async Task<InvoiceResult> GenerateInvoiceAsync(Guid customerId, DateRange period)
{
    _log.LogDebug("Generating invoice for customer {CustomerId}, period {Start} to {End}",
        customerId, period.Start, period.End);

    // Branch: customer existence check
    var customer = await _repository.FindAsync(customerId);
    if (customer is null)
    {
        _log.LogWarning("Invoice generation skipped — customer {CustomerId} not found", customerId);
        return InvoiceResult.NotFound();
    }

    // Branch: billable items
    var items = await _repository.GetBillableItemsAsync(customerId, period);
    _log.LogInformation("Found {ItemCount} billable items for customer {CustomerId}", items.Count, customerId);

    if (items.Count == 0)
    {
        _log.LogInformation("No billable items for customer {CustomerId} — no invoice generated", customerId);
        return InvoiceResult.Empty();
    }

    // External call
    Invoice invoice;
    try
    {
        _log.LogDebug("Calling invoice renderer for {ItemCount} items", items.Count);
        invoice = await _renderer.RenderAsync(customer, items);
        _log.LogInformation("Invoice {InvoiceId} generated, total {Total}", invoice.Id, invoice.Total);
    }
    catch (RenderException ex)
    {
        _log.LogError(ex, "Invoice rendering failed for customer {CustomerId}", customerId);
        return InvoiceResult.Error("Render failure");
    }

    return InvoiceResult.Success(invoice);
}
```

---

## Enrichment

### Static Enrichment (set once at startup)

```csharp
.Enrich.WithProperty("application", "MyApp")
.Enrich.WithProperty("environment", Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production")
.Enrich.WithMachineName()
.Enrich.WithThreadId()
```

### Dynamic Enrichment with LogContext

Use `Serilog.Context.LogContext.PushProperty` to attach scoped values that are valid for a specific operation. The property is removed when the returned `IDisposable` is disposed.

```csharp
using Serilog.Context;

public async Task ProcessJobAsync(Guid jobId, CancellationToken ct)
{
    using var _ = LogContext.PushProperty("job-id", jobId);

    _log.LogInformation("Job processing started");
    // All log lines emitted here will contain "job-id": "..."

    await DoWorkAsync(ct);

    _log.LogInformation("Job processing completed");
}
```

### Correlation IDs in ASP.NET Core

```csharp
// Middleware — add early in the pipeline
public class CorrelationIdMiddleware
{
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers["X-Correlation-Id"].FirstOrDefault()
                            ?? Guid.NewGuid().ToString("N");

        context.Response.Headers["X-Correlation-Id"] = correlationId;

        using var _ = LogContext.PushProperty("correlation-id", correlationId);
        await _next(context);
    }
}
```

Register in `Program.cs`:

```csharp
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseSerilogRequestLogging();
```

---

## File Rotation and Retention

```csharp
.WriteTo.File(
    formatter: new CompactJsonFormatter(),
    path: "logs/myapp.log.jsonl",

    // Roll to a new file each day
    rollingInterval: RollingInterval.Day,

    // Keep 14 days of files
    retainedFileCountLimit: 14,

    // Also roll when a single file exceeds 100 MB
    rollOnFileSizeLimit: true,
    fileSizeLimitBytes: 100 * 1024 * 1024,

    // Allow multiple processes to write the same file (e.g., in IIS)
    shared: true,

    // Flush to disk every 5 seconds — reduces data loss on crash
    flushToDiskInterval: TimeSpan.FromSeconds(5))
```

File naming pattern produced by `RollingInterval.Day`:

```
logs/myapp.log.jsonl            ← current day
logs/myapp20260221.log.jsonl    ← yesterday
logs/myapp20260220.log.jsonl    ← two days ago
```

---

## Sample JSONL Output

```jsonl
{"@t":"2026-02-22T10:15:30.001Z","@l":"Information","@mt":"Application starting","@m":"Application starting","application":"MyApp","environment":"Production","MachineName":"prod-web-01"}
{"@t":"2026-02-22T10:15:31.200Z","@l":"Information","@mt":"Placing order {OrderId} for item {ItemId}","@m":"Placing order a1b2c3 for item 42","@logger":"OrderService","application":"MyApp","environment":"Production","MachineName":"prod-web-01","OrderId":"a1b2c3","ItemId":42,"correlation-id":"f3e2d1c0b9a8"}
{"@t":"2026-02-22T10:15:31.350Z","@l":"Warning","@mt":"Payment declined for order {OrderId}: {Reason}","@m":"Payment declined for order a1b2c3: Insufficient funds","@logger":"OrderService","application":"MyApp","environment":"Production","MachineName":"prod-web-01","OrderId":"a1b2c3","Reason":"Insufficient funds","correlation-id":"f3e2d1c0b9a8"}
{"@t":"2026-02-22T10:15:31.360Z","@l":"Error","@mt":"Invoice rendering failed for customer {CustomerId}","@m":"Invoice rendering failed for customer cust-99","@x":"RenderException: Timeout after 30s\n   at InvoiceRenderer.RenderAsync(...)","@logger":"InvoiceService","application":"MyApp","environment":"Production","MachineName":"prod-web-01","CustomerId":"cust-99","correlation-id":"f3e2d1c0b9a8"}
```

Key observations:
- `@x` carries exception stack traces when `LogError(ex, ...)` is used.
- Structured properties (`OrderId`, `ItemId`, etc.) appear as top-level JSON fields, enabling filtering in log tools.
- All lines share `correlation-id` when `LogContext.PushProperty` is active for the request scope.

---

## Quick Reference Checklist

### Serilog Projects

- [ ] `CompactJsonFormatter` configured on the file sink — never a plain text sink for production.
- [ ] `Enrich.FromLogContext()` enabled so `LogContext.PushProperty` flows through.
- [ ] `application`, `environment`, `MachineName` enrichers set at bootstrap.
- [ ] Rolling by day with a 14-day retention limit.
- [ ] Size-based rollover set at 100 MB.
- [ ] Correlation ID middleware registered before `UseSerilogRequestLogging()`.
- [ ] `ILogger<T>` used in all production classes — no direct Serilog references in business logic.
- [ ] Minimum level set to `Information` in production, `Verbose` locally.
- [ ] `Log.CloseAndFlush()` called in the finally block at application shutdown.

### NLog Projects

- [ ] `JsonLayout` target configured with canonical attribute names (`@t`, `@l`, `@m`, `@logger`, `@x`).
- [ ] `application` attribute set (via `${processname}` or hardcoded).
- [ ] `${all-event-properties:format=@}` included to capture structured properties.
- [ ] `archiveAboveSize` and `maxArchiveFiles` set for rotation and retention.
- [ ] `correlationId` mapped from `${aspnet-traceidentifier}` or custom header.
- [ ] `ILogger<T>` used in all production classes — no direct `NLog.LogManager` references in business logic.
- [ ] Minimum level set to `Info` in production, `Debug`/`Trace` locally.
- [ ] `LogManager.Shutdown()` called in the finally block at application shutdown.
- [ ] Microsoft/System loggers filtered to `Warn` or above to reduce noise.
