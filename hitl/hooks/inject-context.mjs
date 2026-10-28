import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectHost, hostContextLine } from "./host.mjs";

// Only bundled text enters the prompt. Never read the transcript or stdin. The
// UserPromptSubmit branch below stats one well-known config path for existence —
// the same signal ask-guard uses — and never reads the file's contents.
const event = process.argv[2];
const host = detectHost();
const hostLine = `${hostContextLine()}\n\n`;
let context;

if (event === "SessionStart") {
  // The essentials, not the whole skill: hosts cut hook context near 10,000 characters.
  const essentials = readFileSync(new URL("../skills/using-hitl/reference/essentials.md", import.meta.url), "utf8");
  context = `${hostLine}HITL usage guidance (hitl:using-hitl):\n\n${essentials.trim()}`;
} else if (event === "UserPromptSubmit" && (host.id === "kimi" || host.id === "copilot")) {
  // Claude Code and Codex get handoff/progress reminders from transcript-reading
  // Stop hooks (hitl hook stop, codex-stop.mjs); Kimi and Copilot have none, so
  // this per-turn line is their only reminder. Everything else the old per-turn
  // block repeated lives in the SessionStart essentials or fires exactly when
  // needed (ask-guard before asking, update-work-reminder when quiet too long).
  // No reminder at all when HITL is not set up on this machine.
  try {
    const home = process.env.HITL_HOME || path.join(os.homedir(), ".hitl");
    if (existsSync(path.join(home, "config.json"))) {
      context =
        "Use hitl:using-hitl for human interaction. This host has no end-of-turn Stop hook to remind you: " +
        "when the work is finished, call HandOff with a short summary instead of ending the turn; " +
        "on `continue` do its instructions, on `end` reply in one line and stop. " +
        "Answer [hitl-message] texts. Ask necessary questions with HITL's AskUserQuestion tool, never the host's built-in question tool; " +
        "HITL tools appear as mcp__hitl__<Tool> on Claude-style and Kimi MCP hosts, or hitl.<Tool> on Codex: " +
        "use the exact callable from the tool catalog, never a guessed name. " +
        "The lead sends UpdateWork for goal progress and [hitl-progress] reminders; ReadWork on resume/conflict. " +
        "Preserve existing authorization: silence, timeout, or skipped review is not approval.";
    }
  } catch {
    // Cannot tell whether HITL is set up: stay silent rather than nag every turn.
  }
}

process.stdout.write(!context ? (host.id === "kimi" ? "" : "{}\n")
  : host.id === "kimi" ? context + "\n"
  : host.id === "copilot" ? JSON.stringify({ additionalContext: context }) + "\n"
  : JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } }) + "\n");
