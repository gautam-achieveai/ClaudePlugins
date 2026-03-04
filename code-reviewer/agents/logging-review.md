---
name: logging-review
description: Use this agent when reviewing PR code changes for logging practices, structured logging, log levels, or log queryability. Examples:

  <example>
  Context: A PR adds new service code with logging statements
  user: "Review PR #1234 for logging quality"
  assistant: "I'll use the logging-review agent to analyze the PR's logging practices for structured logging, appropriate levels, and queryability."
  <commentary>
  The user explicitly asks for logging review on a PR. This agent specializes in structured logging analysis.
  </commentary>
  </example>

  <example>
  Context: A PR review is running and the pr-review-toolkit dispatches specialized agents
  user: "Run a comprehensive PR review on PR #5678"
  assistant: "I'll dispatch the logging-review agent alongside other review agents to check structured logging compliance."
  <commentary>
  As part of a comprehensive PR review, the logging-review agent is dispatched to cover the logging dimension.
  </commentary>
  </example>

  <example>
  Context: A PR modifies test projects and adds console output
  user: "Review the test changes in this PR"
  assistant: "I'll use the logging-review agent to verify the tests use structured logging instead of console output."
  <commentary>
  Test code changes should also be reviewed for proper logging practices - no Console.WriteLine or unstructured output.
  </commentary>
  </example>

model: inherit
color: yellow
tools: ["Read", "Grep", "Glob", "Bash", "WebSearch", "WebFetch"]
---
This agent dispatches to the `debugging` plugin's `logging-review` agent, which is the canonical source for logging review rules and methodology.

**Dispatch**: When this agent is invoked (either standalone or from pr-reviewer), it delegates to the `debugging` plugin's `logging-review` agent which contains the full structured logging compliance rules, canonical JSONL field specifications, and multi-language coverage.

The `debugging` plugin's agent covers:
- Structured logging compliance (Serilog, Pino, structlog, tracing)
- Log level appropriateness
- Queryability (structured fields vs string interpolation)
- Test project logging (no Console.WriteLine/print/console.log)
- Correlation ID and distributed tracing
- Canonical JSONL field names (@t, @l, @m, @mt, @logger)
- Client-side log forwarding

**Output Format**: Same severity-grouped format (CRITICAL/HIGH/MEDIUM/LOW) with file:line references, problematic code, and recommended fixes.
