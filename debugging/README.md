# Debugging Plugin

A log-first debugging methodology plugin for Claude Code. Gives AI full visibility into code execution via structured JSONL logs queried with DuckDB.

## Components

### Skills

- **`debug-with-logs`** — Core debugging methodology: reproduce, collect logs, query with DuckDB, find root cause, fix
- **`logging-enablement`** — Set up structured JSONL logging in any codebase (C#, JS/TS, Python, Rust)

### Agents

- **`logging-enablement`** — Autonomously adds logging infrastructure to a codebase
- **`logging-review`** — Reviews code for logging compliance (standalone or dispatched from pr-reviewer)

### MCP Server

- **DuckDB** (`@nickcdryan/duckdb-mcp-server`) — Query JSONL log files directly with SQL via `read_json_auto()`

**Kimi Code:** Kimi does not read plugin-level `.mcp.json`, so the DuckDB server needs one manual
registration in `~/.kimi-code/mcp.json` (user-level, shared across projects), or run `/mcp-config`
and add it interactively:

```json
{
  "mcpServers": {
    "duckdb": {
      "command": "npx",
      "args": ["@nickcdryan/duckdb-mcp-server"]
    }
  }
}
```

Kimi also supports `"deferred": true` on the entry to load tools on demand (experimental; requires
the `tool-select` experimental flag). Claude Code and Copilot pick the server up from this
plugin's `.mcp.json` automatically.

## Supported Languages

| Language | Test Frameworks | Production Libraries |
|----------|----------------|---------------------|
| C# | xUnit, NUnit, MSTest | Serilog, MS.Extensions.Logging |
| JS/TS | Jest, Vitest, Mocha | Pino, Winston, Bunyan |
| Python | pytest, unittest | structlog, python-json-logger |
| Rust | cargo test | tracing + tracing-subscriber, slog |

## Quick Start

**Debug an issue:**
> "Debug why the checkout fails for premium users"

**Add logging to a codebase:**
> "Set up structured logging in this project"

**Review logging in a PR:**
> "Review this PR for logging compliance"
