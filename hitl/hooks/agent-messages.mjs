import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Hand the human's Inbox messages to this session through the HITL CLI (`hitl hook messages`).
// One hooks.json serves several hosts, so the host is read from the environment:
// Copilot sets COPILOT_PLUGIN_ROOT, Codex sets PLUGIN_ROOT, Kimi Code sets KIMI_PLUGIN_ROOT,
// Claude Code sets neither.
// Without the HITL CLI on PATH this does nothing: messages are an optional HITL feature.
const event = process.argv[2];
const host = process.env.COPILOT_PLUGIN_ROOT ? "copilot" : process.env.PLUGIN_ROOT ? "codex"
  : process.env.KIMI_PLUGIN_ROOT ? "kimi" : "claude";

// Claude Code runs Stop as a background (asyncRewake) hook that waits for a message and
// wakes the idle session. Codex, Copilot and Kimi cannot be woken: their Stop checks once
// and holds the agent only while a message waits.
let hitlEvent = event;
if (event === "Stop" && host === "claude") hitlEvent = "wait";
if (event === "SessionEnd" && host !== "claude") process.exit(0);

const stdin = await new Promise(resolve => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => (data += chunk));
  process.stdin.on("end", () => resolve(data));
});

// Tool hooks fire on every call. The CLI asks ntfy at most every 10 s per session and records
// each ask in `last-poll`; skip starting it at all inside that window. Mirrors `recentlyPolled`
// and `sessionTag` in the HITL server.
if (event === "PostToolUse") {
  try {
    const input = JSON.parse(stdin);
    const id = input.session_id ?? input.sessionId;
    const tag = createHash("sha256").update(`hitl-session:${id}`).digest("hex").slice(0, 12);
    const home = process.env.HITL_HOME || join(homedir(), ".hitl");
    if (Date.now() - statSync(join(home, "agent-inbox", tag, "last-poll")).mtimeMs < 10_000) process.exit(0);
  } catch {
    // No record yet: let the CLI decide.
  }
}

// One command string: Windows needs a shell to find hitl.cmd, and every word here is fixed text.
const child = spawn(`hitl hook messages --host ${host} --event ${hitlEvent}`, {
  shell: true,
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});
let out = "";
let err = "";
child.stdout.on("data", chunk => (out += chunk));
child.stderr.on("data", chunk => (err += chunk));
child.on("error", () => process.exit(0));
child.on("close", code => {
  // Only exit 2 (wake) and a clean exit carry a delivery; anything else, such as a missing CLI, delivers nothing.
  if (code === 2) {
    process.stderr.write(err);
    process.exit(2);
  }
  if (code === 0) process.stdout.write(out);
  process.exit(0);
});
child.stdin.end(stdin);
