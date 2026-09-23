---
name: setup-hitl
description: Install, connect, or repair the HITL MCP server and its receiving apps. Use when asked to set up HITL, initialize or reuse .hitl configuration, copy settings to another device, install HITL Inbox, or enable the tray client.
---

# Set up HITL

Deliver a working MCP connection and a receiving app on the same topic/key. Follow [the setup procedure](reference/setup.md) for commands and host-specific details.

1. **Inspect without exposing secrets.** Identify the host, OS, supported Node/npm, existing server registration, config location, and available Inbox/tray client. Use filenames, versions, and redacted validation results. Do not dump `.hitl/config.json`, `.env`, or host configuration.
2. **Reuse before creating.** HITL uses `.hitl/config.json`, not a standard `.hitl.env`. Check `HITL_HOME`. Preserve an existing working topic and key. If the user means an external env file, inspect variable names only and identify its loader; don't invent mappings.
3. **Choose only what remains unknown.** New setup or securely copy an existing device's config; Inbox or tray client (or both). Infer choices already stated. Use HITL for questions if it works; otherwise ask in chat so setup can bootstrap itself. Never ask the user to paste secrets into chat.
4. **Install and configure within scope.** Select the published package or a verified local build. Initialize privately only if config is absent, or securely copy from an authorized path. Merge one MCP entry using the host's supported method (Claude Code, Codex, Copilot CLI, Gemini CLI, VS Code, or a generic `mcpServers` host) with a 6-hour per-server timeout where the host supports one; preserve unrelated settings. Explain concrete global settings changes before applying them and obtain authorization if outside the request.
5. **Enable a receiver.** Launch Inbox separately or enable the bundled tray client. `setup` does not install Inbox. Verify both use the same config location; configure Inbox-only mode when requested and supported.
6. **Prove the connection.** Restart/reconnect the MCP host when required; list tools. Send one clearly labeled test notification and one short test question during requested setup. Success means a human response returned, not just a running process or accepted publish. Check hooks are loaded/trusted and a fresh session receives the usage guidance.

Keep config copying and installer execution out of hooks. Before replacing credentials or an existing host entry, explain the affected path and retain a recoverable backup; conflicting configuration requires the user's decision. Installation alone does not authorize overwriting a working identity.

Report the installed version, host registration, config path (no values), receiver selected, and evidence of a reply. If the host must restart, say exactly what remains unverified and resume checks after restart. Never claim cross-device delivery without an observed reply from that device.
