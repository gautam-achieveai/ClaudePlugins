// PreToolUse hook: when HITL is set up, block the host's built-in chat question tool
// and tell the agent to ask through HITL's AskUserQuestion instead.
// Claude Code and Kimi Code call it AskUserQuestion, Codex request_user_input, Copilot CLI ask_user.
// Exit 2 with the reason on stderr blocks the call; anything else allows it.
// Fails open: no HITL config, HITL_ASK=0, bad input or any error exits 0.
//
// TEST: echo '{"tool_name":"AskUserQuestion"}' | node ask-guard.mjs; echo $?              # 2 when ~/.hitl/config.json exists
// TEST: echo '{"tool_name":"mcp__hitl__AskUserQuestion"}' | node ask-guard.mjs; echo $?   # 0
// TEST: see tests/hitl-plugin.test.mjs

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const BUILT_IN = new Set(["AskUserQuestion", "request_user_input", "request_user_input_async", "ask_user"]);

const REASON =
  "Blocked: HITL is set up, so don't ask in the chat window. " +
  "Ask with the HITL AskUserQuestion tool instead (mcp__hitl__AskUserQuestion, or the AskUserQuestion tool of the hitl MCP server), " +
  "so the human gets it on every device. Use the same question, options and a context line.";

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const home = process.env.HITL_HOME || path.join(os.homedir(), ".hitl");
  // Kimi Code names MCP tools mcp__<server>__<tool> like Claude Code; its PreToolUse payload
  // field for the tool name is tool_name, and the anchored plugin matcher already guarantees
  // the call is a built-in question tool, so a missing field still blocks there.
  const kimi = Boolean(process.env.KIMI_PLUGIN_ROOT);
  const name = input.tool_name ?? input.toolName;
  const builtIn = BUILT_IN.has(name) || (kimi && name === undefined);
  if (builtIn && process.env.HITL_ASK !== "0" && existsSync(path.join(home, "config.json"))) {
    // Copilot CLI reads a decision on stdout; Claude Code, Codex and Kimi Code read stderr with exit 2.
    if (process.env.COPILOT_PLUGIN_ROOT) {
      process.stdout.write(JSON.stringify({ permissionDecision: "deny", permissionDecisionReason: REASON }) + "\n");
    }
    process.stderr.write(REASON + "\n");
    process.exit(2);
  }
} catch {
  // fail open
}
process.exit(0);
