import { createHash } from "node:crypto";
import {
  closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync,
  statSync, unlinkSync, writeFileSync,
} from "node:fs";
import { appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { detectHost } from "./host.mjs";

const event = process.argv[2];
const host = detectHost();
const home = process.env.HITL_HOME || join(homedir(), ".hitl");
const disabled = ["0", "off"].includes((process.env.HITL_UPDATE_NUDGE ?? "").toLowerCase());
const configuredMinutes = Number(process.env.HITL_UPDATE_NUDGE_MINUTES ?? 30);
const minutes = Number.isFinite(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes : 30;
const interval = minutes * 60_000;
const filename = "update-work-reminder.json";

function actionOf(value, depth = 0) {
  if (depth > 12) return undefined;
  if (typeof value === "string") {
    try { return actionOf(JSON.parse(value), depth + 1); } catch {
      const output = value.indexOf("\nOutput:\n");
      return output < 0 ? undefined : actionOf(value.slice(output + 9), depth + 1);
    }
  }
  if (!value || value.isError || value.is_error) return undefined;
  if (value.action === "end" || value.action === "continue") return value.action;
  for (const item of Array.isArray(value) ? value : [value.content, value.text, value.output, value.structuredContent]) {
    const action = actionOf(item, depth + 1);
    if (action) return action;
  }
}

function isSubagent(input) {
  return [input.agent_id, input.agentId, input.parent_agent_id, input.parentAgentId]
    .some(id => id !== undefined && id !== null && id !== "" && id !== "main" && id !== "root");
}

function toolName(input) {
  return input.tool_name ?? input.toolName ?? "";
}

function toolResponse(input) {
  return input.tool_response ?? input.toolResponse ?? input.tool_result ?? input.toolResult
    ?? input.toolOutput ?? input.tool_output;
}

function succeeded(input) {
  const response = toolResponse(input);
  return !input.error && !response?.isError && !response?.is_error;
}

function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function changeState(input, change) {
  const id = input.session_id ?? input.sessionId;
  if (!id) return undefined;
  const tag = createHash("sha256").update(`hitl-session:${id}`).digest("hex").slice(0, 12);
  const directory = join(home, "agent-inbox", tag);
  mkdirSync(directory, { recursive: true });
  const lock = join(directory, `${filename}.lock`);
  let fd;
  for (let attempt = 0; attempt < 200 && fd === undefined; attempt++) {
    try { fd = openSync(lock, "wx"); } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        // A lock far older than any legitimate hold (measured worst case ~3 s) was
        // left by a killed hook: reclaim it instead of dead-locking the session.
        if (Date.now() - statSync(lock).mtimeMs > 60_000) unlinkSync(lock);
      } catch { /* Vanished or unreadable: retry the open. */ }
      pause(5);
    }
  }
  if (fd === undefined) return undefined;
  try {
    const file = join(directory, filename);
    // A pid-suffixed temp surviving here was orphaned between write and rename by a
    // holder that died; scavenging is safe because holding the lock proves no writer is live.
    try {
      for (const entry of readdirSync(directory)) {
        if (/^update-work-reminder\.json\.\d+\.tmp$/.test(entry)) unlinkSync(join(directory, entry));
      }
    } catch { /* Best effort only. */ }
    let state = { armed: true, lastUpdate: Date.now(), lastNudge: null, activeSubagents: 0 };
    try { state = { ...state, ...JSON.parse(readFileSync(file, "utf8")) }; } catch { /* New state. */ }
    const result = change(state);
    const temporary = `${file}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(state) + "\n", { mode: 0o600 });
    renameSync(temporary, file);
    return result;
  } finally {
    closeSync(fd);
    try { unlinkSync(lock); } catch { /* Another recovery may have removed it. */ }
  }
}

function contextOutput(text) {
  if (host.id === "kimi") return text;
  if (host.id === "copilot") return JSON.stringify({ additionalContext: text }) + "\n";
  return JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text } }) + "\n";
}

function deliver(text) {
  if (!text) {
    if (host.id !== "kimi") process.stdout.write("{}\n");
    return;
  }
  if (event === "Stop") {
    if (host.id === "kimi") {
      process.stderr.write(text + "\n");
      process.exitCode = 2;
    } else {
      process.stdout.write(JSON.stringify({ decision: "block", reason: text }) + "\n");
    }
    return;
  }
  process.stdout.write(contextOutput(text));
}

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  if (!disabled && existsSync(join(home, "config.json"))) {
    if (process.env.HITL_UPDATE_NUDGE_DEBUG === "1") {
      appendFileSync(join(home, "nudge-debug.log"), JSON.stringify({
        at: new Date().toISOString(), event, host: host.id, tool: toolName(input),
        session: input.session_id ?? input.sessionId, agent: input.agent_id ?? input.agentId,
        keys: Object.keys(input).sort(),
      }) + "\n", { mode: 0o600 });
    }
    const now = Date.now();
    const reminder = () => `[hitl-progress] At least ${minutes} minutes have passed without a lead-agent HITL UpdateWork. Call UpdateWork now with the current outcome, evidence, blockers, and next step. If the work is finished, mark it completed and call HandOff instead. HITL tools appear as mcp__hitl__<Tool> on Claude-style and Kimi MCP hosts, or hitl.<Tool> on Codex; call the exact name from the tool catalog, never a guessed one.`;
    const overdue = state => {
      if (!state.armed || now - (state.lastUpdate ?? now) < interval) return false;
      if (state.lastNudge && now - state.lastNudge < interval) return false;
      state.lastNudge = now;
      return true;
    };
    let output;
    if (event === "SubagentStart" || event === "SubagentStop") {
      if (host.id === "kimi") changeState(input, state => {
        const active = Number.isInteger(state.activeSubagents) ? state.activeSubagents : 0;
        state.activeSubagents = Math.max(0, active + (event === "SubagentStart" ? 1 : -1));
      });
    } else if (event === "Interrupt" && host.id === "kimi") {
      changeState(input, state => { state.activeSubagents = 0; });
    } else if (event === "SessionEnd") {
      changeState(input, state => { state.armed = false; state.activeSubagents = 0; });
    } else if (!isSubagent(input)) {
      output = changeState(input, state => {
        const name = toolName(input);
        if (event === "SessionStart") {
          state.activeSubagents = 0;
          return undefined;
        }
        if (event === "UserPromptSubmit" && !state.armed) {
          state.armed = true;
          state.lastUpdate = now;
          state.lastNudge = null;
        }
        const uncertainChild = host.id === "kimi" && state.activeSubagents > 0;
        if (event === "PostToolUse" && succeeded(input) && !uncertainChild) {
          if (/(^|__)NameSession$/.test(name)) {
            state.armed = true;
            state.lastUpdate = now;
            state.lastNudge = null;
          } else if (/(^|__)UpdateWork$/.test(name)) {
            state.lastUpdate = now;
            state.lastNudge = null;
            state.armed = input.tool_input?.status !== "completed" && input.toolInput?.status !== "completed"
              && input.toolArgs?.status !== "completed";
          } else if (/(^|__)HandOff$/.test(name)) {
            const action = actionOf(toolResponse(input));
            if (action === "end") state.armed = false;
            if (action === "continue") {
              state.armed = true;
              state.lastUpdate = now;
              state.lastNudge = null;
            }
          }
        }
        const mainDelivery = event === "UserPromptSubmit" || (event === "Stop" && !uncertainChild)
          || (event === "PostToolUse" && host.id !== "kimi");
        if (input.stop_hook_active || input.stopHookActive || !mainDelivery) return undefined;
        return overdue(state) ? reminder() : undefined;
      });
    }
    deliver(output);
  } else deliver(undefined);
} catch {
  deliver(undefined);
}
