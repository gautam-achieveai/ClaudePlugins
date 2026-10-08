# HITL

Set up human-in-the-loop communication and teach agents when to use it.

## Included

- **setup-hitl** — install/register the MCP server, privately initialize or copy configuration, install/open Inbox or enable the tray client, and verify a reply.
- **using-hitl** — questions, plan reviews, end-of-work handoffs, one-off notifications, ongoing progress, and recovery from missing tools or delivery failures.
- **Hooks** — load the usage skill on startup, resume, clear, and compaction; add a short reminder on each user turn.

## End-of-work handoff

With HITL 2.14.0 or later, a finished agent calls `HandOff`. It sends a short summary to Inbox (Windows only; the tray popup does not show handoffs) and waits. You reply with the next instruction, or check **End**. Setup can install a Stop reminder when requested: Claude Code uses `hitl hook stop`; Codex uses this plugin's `hooks/codex-stop.mjs`. Both nudge an agent that worked without handing off. Codex nudges once per turn and allows the continuation to stop, preventing loops. Automatic guidance hooks never block; the Stop reminder is installed separately.

Both Claude Code and Codex manifests are included. Hooks require Node.js on the host's PATH. Automatic hooks read bundled guidance only. The optional Codex Stop script also reads the host-provided transcript. No hook reads credentials, sends messages, installs programs, or blocks tool calls.

## Install and start

From this repository's configured Claude Code marketplace, install `hitl@gb-plugins-marketplace`. For a local development session, use `claude --plugin-dir <absolute-path-to-hitl>`.

For Codex, select this plugin directory through your configured local plugin marketplace. The `.codex-plugin/plugin.json` manifest and default `hooks/hooks.json` are included; this repository's `.claude-plugin/marketplace.json` remains a Claude marketplace, not a new personal Codex marketplace.

Restart/start a fresh session after installation. In Codex, use `/hooks` to review and trust the hook definition; plugin installation alone does not activate untrusted hooks. See the [official hook documentation](https://learn.chatgpt.com/docs/hooks).

Ask **“Use setup-hitl to set up HITL on this machine”**, or invoke `hitl:setup-hitl` in a host that supports namespaced skills. Existing connected tools are reused. The plugin intentionally registers no automatic MCP server: setup must first resolve credentials and avoid duplicating an existing HITL registration.

## Configuration

HITL uses `~/.hitl/config.json` (`%USERPROFILE%\.hitl\config.json` on Windows). `HITL_HOME` overrides the directory. It is not a standard `.env` file.

Devices must share `ntfyUrl`, `topicId`, and `encryptionKey`, with their own `deviceName`. Copy configuration securely. Never paste keys into chat or commit them. Setup checks existing configuration before private initialization.

Inbox and the tray client are separate apps. `hitl client` and MCP `setup` normally start the tray client; Inbox requires its own executable/installer. The setup skill covers both and Inbox-only mode.

Current HITL tools removed the old `timeout` argument. Setup registers the server in Claude Code, Codex, GitHub Copilot CLI, Gemini CLI, VS Code, or any `mcpServers` host, with a 6-hour per-server timeout where the host supports one (`timeout: 21600000` ms, or `tool_timeout_sec = 21600` in Codex). See [the full setup procedure](skills/setup-hitl/reference/setup.md).

## Verification

From the repository root:

```sh
node --test tests/hitl-plugin.test.mjs
```

Tests execute the hooks, check structured context and event configuration, exercise installation paths containing spaces, and verify user input is not reflected into instructions. They do not install the MCP server or prove desktop delivery; the setup skill requires a real question/answer round trip.
