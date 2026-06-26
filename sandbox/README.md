# Sandbox Plugin

Skills for agents operating inside a sandboxed workspace.

This plugin keeps workspace operating procedures out of the chat-mode system prompt. The chat mode only needs to tell the model to use sandbox tools and relevant skills; the detailed workflow lives here.

## Skills

- `sandbox-workspace-bootstrap` - initialize `Memory/`, `scripts/`, and task memory.
- `sandbox-memory` - maintain durable workspace memory and task handoffs.
- `sandbox-scripts` - use scripts for repeatable setup, discovery, scaffolding, and verification.
- `sandbox-auth-flow` - understand sandbox egress auth, deferred auth, and token boundaries.
