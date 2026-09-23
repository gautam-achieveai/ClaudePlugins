# HITL installation and recovery

Read only the sections needed for the selected host and receiver. These instructions were checked against the HITL 2.13 source; installed packages and desktop releases may differ. Inspect actual versions and callable schemas.

## 1. Inventory and choose a configuration

- Check `node --version`, `npm --version`, and `npm list -g @achieveai/hitl-mcp-server --depth=0`. Use a supported Node LTS; the source recommends Node 24. An old `engines` minimum is not an LTS recommendation.
- Locate a local checkout if the user named one. Inspect its README, package version, and `server/dist/mcp-server.js`; do not assume a developer's absolute path exists on another machine.
- Inspect host server names/commands without printing environment values or tokens. Reuse a working `hitl` registration; do not add a second copy under a plugin namespace.
- Default config: Windows `%USERPROFILE%\.hitl\config.json`; macOS/Linux `~/.hitl/config.json`. `HITL_HOME` overrides the directory and must be nonempty. Use the same absolute directory for server and desktop apps. A host's process environment may differ from the terminal's.
- Validate config in a local process that prints only field validity: JSON object, nonempty string `topicId`, an HTTP(S) `ntfyUrl`, and a 64-character hexadecimal `encryptionKey`. Never return raw parsed objects, key values, or parser errors that quote file contents. Missing keys in an older config need an explicit migration decision because all receiving devices must match.

There is no standard `.hitl.env` loader in the inspected server. If a user has an env file, discover the wrapper that consumes it before converting anything. `HITL_HOME` is a directory setting, not the topic or encryption key.

### Existing configuration or another device

If config is valid, retain it. If another machine already receives HITL, securely copy its `config.json` using an authorized local/shared path or a secure user-managed transfer. Copy the file directly without loading its values into conversation output. Ask for the source **path**, never the key.

Keep `ntfyUrl`, `topicId`, and `encryptionKey` identical. Give the destination its own `deviceName`. Preserve other settings such as `soundEnabled` and `identityEnabled`. Perform edits locally with a JSON parser and no value output. Compare source/destination connection fields in memory and report only match/mismatch. Keep files and backups restricted to the intended user.

If the destination already exists and differs, stop before overwriting it. Explain which identity would change and secure a backup after authorization. A copy is not permission to delete the original. Do not copy the entire `.hitl` directory: databases and history are not needed to connect a new device.

### New configuration

Only run `hitl init` when config is absent and the user wants a new topic. It prints the encryption key; suppress **both** output streams and check exit status. For example, in PowerShell:

```powershell
hitl init *> $null
if ($LASTEXITCODE -ne 0) { throw 'HITL initialization failed; inspect locally without displaying secrets.' }
```

Or in a POSIX shell:

```sh
(umask 077; hitl init >/dev/null 2>&1)
```

Check that command's exit status and revalidate the resulting file with redacted output. Verify the config is accessible only to the intended user (POSIX modes or Windows ACLs), including when the directory already existed; never broaden access to fix setup. Do not use `hitl config show` in an agent transcript. Do not rerun init to repair malformed/unreadable config: the CLI can replace it with a new topic/key and its backup is best-effort.

## 2. Install the server

For a requested published installation, inspect the registry version first, then install the chosen version:

```sh
npm view @achieveai/hitl-mcp-server version
npm install -g @achieveai/hitl-mcp-server
```

Record the installed version; check the package's current source/release notes if a needed feature is absent. The npm package bundles platform tray-client binaries when the release workflow includes them. It does not install Inbox.

For an authorized local source build, from `<checkout>/hitl-mcp-server`:

```sh
npm ci
npm run build:server
```

Use `node <absolute-path>/server/dist/mcp-server.js` in the host and `node <absolute-path>/server/dist/cli.js init` for private initialization. Source inspection alone does not prove the compiled `dist` is current.

## 3. Register one MCP server

Initialize/reuse config **before** starting the server. Its entry point loads config before exposing `setup`, so `setup` cannot bootstrap a missing-config connection.

Register under the name `hitl` with a **6-hour tool timeout** (see Human wait settings). Identify the host, run its `--help` for the command below, and add only if no `hitl` entry exists. A working entry without a timeout is repaired by adding the field, not by re-registering. Preserve every unrelated key.

| Host | Register | Timeout (6 h) | Config file |
|---|---|---|---|
| Claude Code | `claude mcp add-json --scope user hitl '{"type":"stdio","command":"hitl-mcp-server","args":[],"timeout":21600000}'` | `timeout`, ms: in the JSON | `~/.claude.json` |
| Codex | `codex mcp add hitl -- hitl-mcp-server` | `tool_timeout_sec = 21600` under `[mcp_servers.hitl]` | `~/.codex/config.toml` |
| GitHub Copilot CLI | `copilot mcp add --timeout 21600000 hitl -- hitl-mcp-server` | `--timeout`, ms | `~/.copilot/mcp-config.json` |
| Gemini CLI | `gemini mcp add --scope user hitl hitl-mcp-server` | `"timeout": 21600000` on `mcpServers.hitl`, ms; default 600000. The CLI `--timeout` flag is documented as a connection timeout, so set the field directly | `~/.gemini/settings.json` |
| VS Code (Copilot Chat) | `code --add-mcp '{"name":"hitl","type":"stdio","command":"hitl-mcp-server","args":[]}'` | none documented; add none | user `mcp.json` (`MCP: Open User Configuration`) |

Quoting: in PowerShell the single-quoted JSON works as shown; in `cmd.exe`, escape inner quotes (`"{\"name\":...}"`). VS Code uses a `servers` key, not `mcpServers`.

Other hosts: merge this entry using the host's documented schema. Map the timeout to its documented per-server field and unit; omit it if the host documents none, and tell the user long waits may be cut off:

```json
{
  "mcpServers": {
    "hitl": { "command": "hitl-mcp-server", "args": [], "timeout": 21600000 }
  }
}
```

If needed, set `HITL_HOME=<absolute-directory>` as a server env entry (`"env"` in JSON, `--env` for Codex and Copilot CLI, `-e` for Claude Code and Gemini). Setting it for the MCP process does not configure Inbox; launch the receiver with the same setting.

An explicit alternative without global installation is command `npx` with args `["-y", "--package", "@achieveai/hitl-mcp-server", "hitl-mcp-server"]`. Do not rely on npm guessing between the package's two binaries. Global installation is easier for `hitl init` and `hitl client`.

On Windows, some hosts cannot launch `.cmd` shims directly. Prefer `node` with the verified absolute installed `dist/mcp-server.js` path (find the package directory with `npm root -g`), or the host's documented Windows shim handling. Do not guess or embed machine-specific paths in the plugin. Forward slashes are valid in JSON Windows paths.

Restart/reconnect the host after registration or environment changes. Discover `AskUserQuestion`, `ReviewPlan`, `Notify`, `UpdateWork`, `ReadWork`, and `setup`; older versions may expose fewer tools. Report missing capabilities instead of fabricating tool calls.

### Human wait settings

Current question/review tools have no tool-level timeout argument; the wait limit is a per-server host setting. Default it to **6 hours** (21600000 ms / 21600 s) so a human away from every device can still answer. Raise it if the user asks; do not lower it below 300000 ms.

- **Claude Code:** per-server `timeout` in ms. It is a hard wall-clock limit and also a floor on the idle timeout. Without it, stdio calls that go 30 minutes without a response or progress message abort (v2.1.203+). `MCP_TOOL_TIMEOUT` is global; do not change it for HITL.
- **Codex:** per-server `tool_timeout_sec` in seconds. The default is 60, which is too short for any human wait.
- **Copilot CLI, Gemini CLI:** per-server `timeout` in ms. Gemini defaults to 10 minutes.
- **Hosts with no documented per-server timeout (VS Code):** set nothing; report that the host decides the limit.

Never pass the timeout as a tool argument.

For Claude Code, the source recommends `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS=0` in the **host process** environment to prevent automatic backgrounding of human waits. A server-only env entry does not change the parent host. Explain this change and its global effect before modifying host settings, preserve unrelated keys, and restart the host. `hitl claude-code install` also registers the server and changes a global host setting; don't run it blindly after manual registration. The `setup` tool diagnoses this guard but does not apply the setting.

## 4. Enable Inbox or tray client

### Inbox

1. Look for an existing installed Inbox or user-provided installer. Otherwise inspect [official releases](https://github.com/achieveai/HumanInTheLoop/releases) and select an **Inbox-named** asset for the OS/architecture. Do not substitute a tray-client artifact or infer assets from a version number. Check source, release warnings, and any published checksums/signatures; never bypass OS trust prompts.
2. Install the selected MSI/setup package or use the portable executable as appropriate. Follow its interactive flow. Windows portable Inbox needs WebView2. Launch the installed app with the intended `HITL_HOME`; do not assume the installer starts it.
3. If no compatible Inbox artifact exists, explain this. Offer the tray client or a source build; do not claim Android/APK availability from an unfinished source tree.
4. To build from source, follow the checkout's Tauri/Rust prerequisites. From `hitl-mcp-server`, run `npm ci`; on Windows, from `hitl-mcp-server/inbox`, run `npx --no-install tauri build --bundles msi --ci`. With default Cargo paths, executable output is `hitl-mcp-server/target/release/hitl-inbox.exe`, MSI under `target/release/bundle/msi/`. `npm run build` does not build Inbox.

Inbox connects directly to ntfy and does not require the tray client. For Inbox-only or remote-receiver mode, append `--no-auto-launch-client` to the server args **after verifying the installed build supports it**. This flag prevents local tray checks/launch; it does not launch Inbox or stop an already-running tray app. A running Inbox or remote receiver is required to answer.

The optional archivist preserves local history; it is not required for basic setup. Do not add it unless requested.

### Tray client

Run `hitl client`, or call the connected MCP `setup` tool with `{}`. Examine each returned step; `success` alone does not prove a receiver answered. Setup normally finds/starts the bundled tray client; with `--no-auto-launch-client` its client step is skipped.

If the binary is missing, inspect the package's supported platform and official release assets. From a source checkout, `npm run build:client` builds the tray client. Do not claim `hitl client` launches Inbox. Start background helpers hidden on Windows; use a visible window only for the receiving UI the user needs to control.

## 5. Verify and hand off

- Confirm the host exposes the selected HITL tools after restart.
- Send one labeled setup test via Notify, then an AskUserQuestion with `context` and one single-choice acknowledgement. A returned successful answer establishes the round trip; publishing alone does not.
- If verifying a second device, have the user answer there and inspect `respondedFrom`. Do not infer delivery to every device.
- Confirm plugin hooks appear in the host. In Codex, review/trust the hook definition through `/hooks`; installation alone does not trust it. Never bypass hook trust. Start a fresh session to exercise SessionStart, then a new turn for the reminder.
- Report exact checks, selected client, version, nonsecret config path, and anything pending restart or user response.

## Sources

- [HITL source setup and configuration](https://github.com/achieveai/HumanInTheLoop/tree/main/hitl-mcp-server#setup-and-configuration)
- [HITL releases](https://github.com/achieveai/HumanInTheLoop/releases)
- [Claude Code hooks](https://code.claude.com/docs/en/hooks)
- [Codex hooks and trust](https://learn.chatgpt.com/docs/hooks)
