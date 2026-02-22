# C# Production Logging

Structured JSONL logging for C# production code using Serilog as the primary recommendation. All output uses `CompactJsonFormatter` to produce canonical fields that the debugging plugin can parse and render.

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

- [ ] `CompactJsonFormatter` configured on the file sink — never a plain text sink for production.
- [ ] `Enrich.FromLogContext()` enabled so `LogContext.PushProperty` flows through.
- [ ] `application`, `environment`, `MachineName` enrichers set at bootstrap.
- [ ] Rolling by day with a 14-day retention limit.
- [ ] Size-based rollover set at 100 MB.
- [ ] Correlation ID middleware registered before `UseSerilogRequestLogging()`.
- [ ] `ILogger<T>` used in all production classes — no direct Serilog references in business logic.
- [ ] Minimum level set to `Information` in production, `Verbose` locally.
- [ ] `Log.CloseAndFlush()` called in the finally block at application shutdown.
