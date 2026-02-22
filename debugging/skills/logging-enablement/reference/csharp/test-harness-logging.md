# C# Test Harness Logging

Structured JSONL logging for C# test frameworks using Serilog. This guide covers xUnit, NUnit, and MSTest — each configured to emit canonical JSONL log lines that the debugging plugin can parse and render.

---

## Canonical Fields

| Field | Description |
|---|---|
| `@t` | Timestamp — ISO 8601 UTC (emitted natively by `CompactJsonFormatter`) |
| `@l` | Log level |
| `@m` | Rendered message |
| `@mt` | Message template |
| `@logger` | Source class name |
| `test-case-name` | Test method name |
| `test-module-name` | Test class name |
| `application` | App or service name under test |

---

## Core Rules

- **NEVER** use `Console.WriteLine`, `Debug.WriteLine`, or `Trace.WriteLine` inside tests.
- All test output **must** flow through the structured logger.
- Every test **must** enrich the log context with `test-case-name` and `test-module-name` before calling any production code.
- `Serilog.Formatting.Compact.CompactJsonFormatter` produces the canonical `@t` / `@l` / `@m` format natively — do not configure a custom formatter.
- Log file naming convention: `{test-project}.log.jsonl` (e.g., `MyApp.Tests.log.jsonl`).

---

## NuGet Packages

All three frameworks require the same Serilog packages:

```bash
dotnet add package Serilog
dotnet add package Serilog.Sinks.File
dotnet add package Serilog.Formatting.Compact
dotnet add package Serilog.Context
```

For `Microsoft.Extensions.Logging` bridge (optional, for production code that accepts `ILogger<T>`):

```bash
dotnet add package Serilog.Extensions.Logging
```

---

## xUnit

xUnit does not have a shared setup/teardown class-level concept by default. Use a **class fixture** to create a single logger per test class lifetime, and `ITestOutputHelper` is intentionally bypassed in favour of the structured file sink.

### Package Installation

```bash
dotnet add package xunit
dotnet add package xunit.runner.visualstudio
dotnet add package Serilog
dotnet add package Serilog.Sinks.File
dotnet add package Serilog.Formatting.Compact
dotnet add package Serilog.Context
```

### Shared Logger Fixture

```csharp
// LoggingFixture.cs
using Serilog;
using Serilog.Formatting.Compact;

public sealed class LoggingFixture : IDisposable
{
    public ILogger Logger { get; }

    public LoggingFixture()
    {
        Logger = new LoggerConfiguration()
            .MinimumLevel.Verbose()
            .Enrich.FromLogContext()
            .WriteTo.File(
                formatter: new CompactJsonFormatter(),
                path: "MyApp.Tests.log.jsonl",
                rollOnFileSizeLimit: false,
                shared: true)
            .CreateLogger();
    }

    public void Dispose()
    {
        (Logger as IDisposable)?.Dispose();
    }
}
```

### Test Class

```csharp
// OrderServiceTests.cs
using Serilog;
using Serilog.Context;
using Xunit;

public class OrderServiceTests : IClassFixture<LoggingFixture>
{
    private readonly ILogger _log;
    private const string ModuleName = nameof(OrderServiceTests);

    public OrderServiceTests(LoggingFixture fixture)
    {
        _log = fixture.Logger
            .ForContext("@logger", nameof(OrderServiceTests))
            .ForContext("test-module-name", ModuleName)
            .ForContext("application", "MyApp");
    }

    [Fact]
    public void PlaceOrder_WithValidItem_ShouldSucceed()
    {
        using var _ = LogContext.PushProperty("test-case-name", nameof(PlaceOrder_WithValidItem_ShouldSucceed));

        _log.Information("Test started: placing order with valid item");

        // Arrange
        var service = new OrderService(_log);
        var order = new Order { ItemId = 42, Quantity = 1 };

        // Act
        var result = service.Place(order);

        // Assert
        _log.Information("Order result: {Result}", result.Status);
        Assert.Equal(OrderStatus.Accepted, result.Status);
    }

    [Fact]
    public void PlaceOrder_WithZeroQuantity_ShouldFail()
    {
        using var _ = LogContext.PushProperty("test-case-name", nameof(PlaceOrder_WithZeroQuantity_ShouldFail));

        _log.Information("Test started: placing order with zero quantity");

        var service = new OrderService(_log);
        var order = new Order { ItemId = 42, Quantity = 0 };

        var result = service.Place(order);

        _log.Warning("Expected rejection, got: {Result}", result.Status);
        Assert.Equal(OrderStatus.Rejected, result.Status);
    }
}
```

### Injecting the Logger Into Production Code

```csharp
// ProductionCode.cs — accepts ILogger, not a concrete type
public class OrderService
{
    private readonly ILogger _log;

    public OrderService(ILogger log)
    {
        // ForContext stamps every log line with the production class name
        _log = log.ForContext<OrderService>();
    }

    public OrderResult Place(Order order)
    {
        _log.Debug("Placing order {@Order}", order);

        if (order.Quantity <= 0)
        {
            _log.Warning("Order rejected — quantity {Quantity} is invalid", order.Quantity);
            return new OrderResult(OrderStatus.Rejected);
        }

        _log.Information("Order accepted for item {ItemId}", order.ItemId);
        return new OrderResult(OrderStatus.Accepted);
    }
}
```

---

## NUnit

NUnit exposes `[SetUp]` / `[TearDown]` and `TestContext.CurrentContext` which provides the current test name at runtime.

### Package Installation

```bash
dotnet add package NUnit
dotnet add package NUnit3TestAdapter
dotnet add package Serilog
dotnet add package Serilog.Sinks.File
dotnet add package Serilog.Formatting.Compact
dotnet add package Serilog.Context
```

### Base Test Class

```csharp
// TestBase.cs
using NUnit.Framework;
using Serilog;
using Serilog.Context;
using Serilog.Formatting.Compact;

public abstract class TestBase
{
    protected ILogger Log { get; private set; } = null!;
    private IDisposable? _testCaseContext;

    [OneTimeSetUp]
    public void ConfigureLogger()
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Verbose()
            .Enrich.FromLogContext()
            .WriteTo.File(
                formatter: new CompactJsonFormatter(),
                path: "MyApp.Tests.log.jsonl",
                rollOnFileSizeLimit: false,
                shared: true)
            .CreateLogger();
    }

    [SetUp]
    public void PushTestContext()
    {
        var testName = TestContext.CurrentContext.Test.MethodName ?? TestContext.CurrentContext.Test.Name;
        var moduleName = TestContext.CurrentContext.Test.ClassName ?? GetType().Name;

        // Push per-test enrichment properties
        _testCaseContext = new CompositeDisposable(
            LogContext.PushProperty("test-case-name", testName),
            LogContext.PushProperty("test-module-name", moduleName),
            LogContext.PushProperty("application", "MyApp")
        );

        Log = Serilog.Log.Logger
            .ForContext("@logger", GetType().Name);

        Log.Information("Test started: {TestName}", testName);
    }

    [TearDown]
    public void PopTestContext()
    {
        Log.Information("Test finished: {Status}", TestContext.CurrentContext.Result.Outcome.Status);
        _testCaseContext?.Dispose();
    }

    [OneTimeTearDown]
    public void FlushLogger()
    {
        Serilog.Log.CloseAndFlush();
    }

    // Helper: wraps multiple IDisposable into one
    private sealed class CompositeDisposable : IDisposable
    {
        private readonly IDisposable[] _items;
        public CompositeDisposable(params IDisposable[] items) => _items = items;
        public void Dispose() { foreach (var item in _items) item.Dispose(); }
    }
}
```

### Test Class

```csharp
// PaymentServiceTests.cs
using NUnit.Framework;

[TestFixture]
public class PaymentServiceTests : TestBase
{
    [Test]
    public void Charge_WithValidCard_ShouldReturnSuccess()
    {
        Log.Information("Arranging payment with valid card");

        var service = new PaymentService(Log);
        var result = service.Charge(amount: 100m, cardToken: "tok_valid");

        Log.Information("Charge result: {Result}", result);
        Assert.That(result.Success, Is.True);
    }

    [Test]
    public void Charge_WithExpiredCard_ShouldReturnFailure()
    {
        Log.Information("Arranging payment with expired card");

        var service = new PaymentService(Log);
        var result = service.Charge(amount: 100m, cardToken: "tok_expired");

        Log.Warning("Expected failure for expired card, result: {Result}", result);
        Assert.That(result.Success, Is.False);
    }
}
```

---

## MSTest

MSTest uses `[TestInitialize]` / `[TestCleanup]` and exposes `TestContext` as an injected property.

### Package Installation

```bash
dotnet add package MSTest.TestFramework
dotnet add package MSTest.TestAdapter
dotnet add package Serilog
dotnet add package Serilog.Sinks.File
dotnet add package Serilog.Formatting.Compact
dotnet add package Serilog.Context
```

### Base Test Class

```csharp
// MsTestBase.cs
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Serilog;
using Serilog.Context;
using Serilog.Formatting.Compact;

public abstract class MsTestBase
{
    // MSTest injects TestContext automatically when property is public
    public TestContext TestContext { get; set; } = null!;

    protected ILogger Log { get; private set; } = null!;
    private IDisposable? _testCaseNameProp;
    private IDisposable? _testModuleNameProp;
    private IDisposable? _applicationProp;

    [ClassInitialize(InheritanceBehavior.BeforeEachDerivedClass)]
    public static void ConfigureLogger(TestContext _)
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Verbose()
            .Enrich.FromLogContext()
            .WriteTo.File(
                formatter: new CompactJsonFormatter(),
                path: "MyApp.Tests.log.jsonl",
                rollOnFileSizeLimit: false,
                shared: true)
            .CreateLogger();
    }

    [TestInitialize]
    public void PushTestContext()
    {
        _testCaseNameProp   = LogContext.PushProperty("test-case-name",   TestContext.TestName);
        _testModuleNameProp = LogContext.PushProperty("test-module-name",  GetType().Name);
        _applicationProp    = LogContext.PushProperty("application",       "MyApp");

        Log = Serilog.Log.Logger
            .ForContext("@logger", GetType().Name);

        Log.Information("Test started: {TestName}", TestContext.TestName);
    }

    [TestCleanup]
    public void PopTestContext()
    {
        Log.Information("Test finished: {Outcome}", TestContext.CurrentTestOutcome);
        _testCaseNameProp?.Dispose();
        _testModuleNameProp?.Dispose();
        _applicationProp?.Dispose();
    }

    [ClassCleanup(InheritanceBehavior.BeforeEachDerivedClass)]
    public static void FlushLogger()
    {
        Serilog.Log.CloseAndFlush();
    }
}
```

### Test Class

```csharp
// InventoryServiceTests.cs
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public class InventoryServiceTests : MsTestBase
{
    [TestMethod]
    public void Reserve_WithSufficientStock_ShouldSucceed()
    {
        Log.Information("Arranging reservation with sufficient stock");

        var service = new InventoryService(Log);
        var result = service.Reserve(itemId: 7, quantity: 3);

        Log.Information("Reservation result: {Result}", result);
        Assert.IsTrue(result.Reserved);
    }

    [TestMethod]
    public void Reserve_WhenOutOfStock_ShouldFail()
    {
        Log.Information("Arranging reservation against out-of-stock item");

        var service = new InventoryService(Log);
        var result = service.Reserve(itemId: 99, quantity: 1000);

        Log.Warning("Expected out-of-stock failure, result: {Result}", result);
        Assert.IsFalse(result.Reserved);
    }
}
```

---

## Sample JSONL Output

A correctly configured test produces log lines like:

```jsonl
{"@t":"2026-02-22T10:15:30.123Z","@l":"Information","@mt":"Test started: {TestName}","@m":"Test started: PlaceOrder_WithValidItem_ShouldSucceed","@logger":"OrderServiceTests","test-case-name":"PlaceOrder_WithValidItem_ShouldSucceed","test-module-name":"OrderServiceTests","application":"MyApp","TestName":"PlaceOrder_WithValidItem_ShouldSucceed"}
{"@t":"2026-02-22T10:15:30.145Z","@l":"Debug","@mt":"Placing order {@Order}","@m":"Placing order {\"ItemId\":42,\"Quantity\":1}","@logger":"OrderService","test-case-name":"PlaceOrder_WithValidItem_ShouldSucceed","test-module-name":"OrderServiceTests","application":"MyApp"}
{"@t":"2026-02-22T10:15:30.147Z","@l":"Information","@mt":"Order accepted for item {ItemId}","@m":"Order accepted for item 42","@logger":"OrderService","test-case-name":"PlaceOrder_WithValidItem_ShouldSucceed","test-module-name":"OrderServiceTests","application":"MyApp","ItemId":42}
```

Key observations:
- `@t`, `@l`, `@m`, `@mt` are emitted by `CompactJsonFormatter` automatically.
- `test-case-name` and `test-module-name` flow through `LogContext` into every line including production code log calls.
- `@logger` distinguishes test code from production code in the same file.

---

## Quick Reference: Framework Comparison

| Feature | xUnit | NUnit | MSTest |
|---|---|---|---|
| Shared setup | `IClassFixture<T>` | `[OneTimeSetUp]` | `[ClassInitialize]` |
| Per-test setup | Constructor | `[SetUp]` | `[TestInitialize]` |
| Test name at runtime | `ITestOutputHelper` name (not used) | `TestContext.CurrentContext.Test.MethodName` | `TestContext.TestName` |
| Logger lifetime | Fixture lifetime | Class lifetime | Class lifetime |
