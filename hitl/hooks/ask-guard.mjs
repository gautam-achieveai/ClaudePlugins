// PreToolUse hook: when HITL is set up, block the current host's built-in chat question tool
// and tell the agent to ask through HITL's AskUserQuestion instead.
// Built-in question tool names vary by host; the manifest matcher normally identifies the call.
// Exit 2 with the reason on stderr blocks the call; anything else allows it.
// Fails open: no HITL config, HITL_ASK=0, bad input or any error exits 0.
//
// TEST: echo '{"tool_name":"AskUserQuestion"}' | node ask-guard.mjs; echo $?              # 2 when ~/.hitl/config.json exists
// TEST: echo '{"tool_name":"mcp__hitl__AskUserQuestion"}' | node ask-guard.mjs; echo $?   # 0
// TEST: see tests/hitl-plugin.test.mjs

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectHost } from "./host.mjs";

const BUILT_IN = new Set(["AskUserQuestion", "request_user_input", "request_user_input_async", "ask_user"]);

const REASON =
  "Blocked: HITL is set up, so don't ask in the chat window. " +
  "Ask with the HITL AskUserQuestion tool instead (mcp__hitl__AskUserQuestion on Claude-style and Kimi MCP hosts, hitl.AskUserQuestion on Codex), " +
  "so the human gets it on every device. Use the same question, options and a context line.";

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const home = process.env.HITL_HOME || path.join(os.homedir(), ".hitl");
  // Some hosts omit the tool-name field when an anchored plugin matcher already identified
  // the built-in question tool; only block that ambiguous shape for the matching host family.
  const host = detectHost();
  const name = input.tool_name ?? input.toolName;
  const builtIn = BUILT_IN.has(name) || (host.id === "kimi" && name === undefined);
  if (builtIn && process.env.HITL_ASK !== "0" && existsSync(path.join(home, "config.json"))) {
    // Copilot reads a decision on stdout; the other hooked hosts read stderr with exit 2.
    if (host.id === "copilot") {
      process.stdout.write(JSON.stringify({ permissionDecision: "deny", permissionDecisionReason: REASON }) + "\n");
    }
    process.stderr.write(REASON + "\n");
    process.exit(2);
  }
} catch {
  // fail open
}
process.exit(0);
