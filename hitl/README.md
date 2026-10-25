# HITL

Set up human-in-the-loop communication and teach agents when to use it.

## Included

- **setup-hitl** — install/register the MCP server, privately initialize or copy configuration, install/open Inbox or enable the tray client, and verify a reply.
- **using-hitl** — questions, plan reviews, end-of-work handoffs, one-off notifications, ongoing progress, and recovery from missing tools or delivery failures.
- **Hooks** — load the HITL essentials (which tool when, and how to write for a dyslexic, ADHD, non-expert reader) on startup, resume, clear, and compaction; add a short reminder on each user turn; send the host's built-in chat question tool to HITL's `AskUserQuestion`. The essentials stay under the hosts' ~10,000-character hook limit; the full rules load with `using-hitl`.

## End-of-work handoff

With HITL 2.14.0 or later, a finished agent calls `HandOff`. It sends a short summary to Inbox (Windows only; the tray popup does not show handoffs) and waits. You reply with the next instruction, or check **End**. Setup can install a Stop reminder when requested: Claude Code uses `hitl hook stop`; Codex uses this plugin's `hooks/codex-stop.mjs`. Both nudge an agent that worked without handing off. Codex nudges once per turn and allows the continuation to stop, preventing loops. Kimi Code has no transcript-reading Stop hook, so its handoff reminder is the usage guidance loaded at session start. Automatic guidance hooks never block; the Stop reminder is installed separately.

Claude Code, Codex, GitHub Copilot CLI and Kimi Code (CLI and Desktop) all run these hooks. Copilot CLI reads the `.claude-plugin` manifest and `hooks/hooks.json`; the hook answers it in the top-level shape Copilot reads. Kimi Code reads `.kimi-plugin/plugin.json`, whose manifest declares the same hooks inline, runs them with the plugin root as working directory, and needs no trust step — they run while the plugin is enabled. Hooks require Node.js on the host's PATH. Automatic hooks read bundled guidance only. The optional Codex Stop script also reads the host-provided transcript. No hook reads credentials, sends messages or installs programs. The only hook that blocks a tool call is the chat-question guard below.

## Chat questions go through HITL

Each host has its own question tool that only reaches the chat window: Claude Code and Kimi Code `AskUserQuestion`, Codex `request_user_input`, Copilot `ask_user`. With HITL set up, agents ask through HITL instead:

- **Setup hides them.** HITL 2.17.0's `setup` tool and `hitl claude-code install` turn them off in each installed host's user config, with a backup. That covers Claude Code, Codex and Copilot CLI; the Claude desktop Code tab and the Codex app read the same files. Kimi Code is not covered by the CLI yet: setup appends one `[[permission.rules]]` deny for the built-in `AskUserQuestion` to `~/.kimi-code/config.toml` by hand, with a backup; the Kimi desktop app reads the same file. `hitl chat-questions status` shows the hosts it covers; `hitl chat-questions on` undoes it.
- **The `ask-guard.mjs` hook blocks them** if one is still offered. It tells the agent to use HITL's `AskUserQuestion`. It acts only when `~/.hitl/config.json` exists; `HITL_ASK=0` turns it off.

## Session names

With HITL 2.16.0 or later, an agent calls `NameSession` before its first HITL message: a 2-5 word name and a one-sentence objective. Inbox, dialogs and plan reviews then show that name instead of the branch and id. When the work moves to a new objective, the agent calls it again; Inbox keeps the old names as "Formerly". The hooks and `using-hitl` tell agents to do this. Until a session is named, HITL tool results end with a reminder. The **Rename** button in Inbox sends the agent a rename request; the agent renames itself.

## Messages from you to an agent

Pick an agent in Inbox's agent list, then type in the box under its messages. The `agent-messages.mjs` hook hands it to that session through `hitl hook messages`:

- after a tool call, or at your next prompt (all hosts);
- in Claude Code, a background Stop hook waits and wakes an idle session;
- in Codex, Copilot and Kimi Code, Stop holds the agent only while a message is waiting; they cannot be woken once idle.

The agent replies with `Notify` and `inReplyTo`, and Inbox marks the message **replied**. It needs HITL with `hitl hook messages` on PATH and an `encryptionKey`; without them the hook does nothing. For Kimi Code the installed CLI must also accept `--host kimi` (current CLIs list `claude|codex|copilot`), so Inbox-to-agent messaging waits for a supporting HITL CLI release; questions, reviews and handoffs work without it. Codex asks you to re-trust plugin hooks (`/hooks`) after this update.

## Install and start

From this repository's configured Claude Code marketplace, install `hitl@gb-plugins-marketplace`. For a local development session, use `claude --plugin-dir <absolute-path-to-hitl>`.

For GitHub Copilot CLI, install it with `copilot plugin install gautam-achieveai/ClaudePlugins:hitl`, or try it with `copilot --plugin-dir <absolute-path-to-hitl>`.

For Codex, select this plugin directory through your configured local plugin marketplace. The `.codex-plugin/plugin.json` manifest and default `hooks/hooks.json` are included; this repository's `.claude-plugin/marketplace.json` remains a Claude marketplace, not a new personal Codex marketplace.

For Kimi Code (CLI or Desktop), this repository includes a Kimi-format marketplace at `.kimi-plugin/marketplace.json`. Pass it to `/plugins marketplace <absolute-path-to-repo>/.kimi-plugin/marketplace.json`, install `hitl` from the list, then run `/plugins reload` or start a new session. You can also install the plugin directory directly with `/plugins install <absolute-path-to-hitl>`. The desktop app reads the same `~/.kimi-code` plugin and configuration files as the CLI. Plugin hooks run while the plugin is enabled and have no separate trust step; `/plugins info hitl` shows manifest diagnostics.

Restart/start a fresh session after installation. In Codex, use `/hooks` to review and trust the hook definition; plugin installation alone does not activate untrusted hooks. See the [official hook documentation](https://learn.chatgpt.com/docs/hooks).

Ask **“Use setup-hitl to set up HITL on this machine”**, or invoke `hitl:setup-hitl` in a host that supports namespaced skills. Existing connected tools are reused. The plugin intentionally registers no automatic MCP server: setup must first resolve credentials and avoid duplicating an existing HITL registration.

## Configuration

HITL uses `~/.hitl/config.json` (`%USERPROFILE%\.hitl\config.json` on Windows). `HITL_HOME` overrides the directory. It is not a standard `.env` file.

Devices must share `ntfyUrl`, `topicId`, and `encryptionKey`, with their own `deviceName`. Copy configuration securely. Never paste keys into chat or commit them. Setup checks existing configuration before private initialization.

Inbox and the tray client are separate apps. `hitl client` and MCP `setup` normally start the tray client; Inbox requires its own executable/installer. The setup skill covers both and Inbox-only mode.

Current HITL tools removed the old `timeout` argument. Setup registers the server in Claude Code, Codex, GitHub Copilot CLI, Gemini CLI, VS Code, Kimi Code, or any `mcpServers` host, with a 6-hour per-server timeout where the host supports one (`timeout: 21600000` ms, `tool_timeout_sec = 21600` in Codex, or `toolTimeoutMs: 21600000` in Kimi Code's `mcp.json`). See [the full setup procedure](skills/setup-hitl/reference/setup.md).

## Verification

From the repository root:

```sh
node --test tests/hitl-plugin.test.mjs
```

Tests execute the hooks, check structured context and event configuration, exercise installation paths containing spaces, and verify user input is not reflected into instructions. They do not install the MCP server or prove desktop delivery; the setup skill requires a real question/answer round trip.
