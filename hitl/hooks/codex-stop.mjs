import { readFileSync } from "node:fs";

const reason = "[hitl-handoff] You finished without handing off. Call the HITL HandOff tool with a short summary and wait for the user's next instruction. If HandOff is not available, send a completion Notify and stop. Do not repeat this reminder.";

// Codex rollouts are not a stable API. Unknown or unreadable input allows stopping.
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
  for (const item of Array.isArray(value) ? value : [value.content, value.text, value.structuredContent]) {
    const action = actionOf(item, depth + 1);
    if (action) return action;
  }
}

function stop(input) {
  if (process.env.HITL_HANDOFF === "0" || input.stop_hook_active || !input.turn_id || !input.transcript_path) return {};
  const entries = readFileSync(input.transcript_path, "utf8").split(/\r?\n/)
    .filter(line => line.trim()).map(line => JSON.parse(line));
  const meta = entries.find(entry => entry.type === "session_meta")?.payload;
  if (meta?.source === "exec" || typeof meta?.source === "object") return {};
  let start = -1;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry.type === "event_msg" && entry.payload?.type === "task_started") start = index;
  }
  if (start < 0 || entries[start].payload.turn_id !== input.turn_id) return {};
  let usedTools = false;
  let handoffId;
  let handoffResult;
  for (const entry of entries.slice(start + 1)) {
    if (entry.type !== "response_item") continue;
    const item = entry.payload;
    if (item?.type === "function_call" || item?.type === "custom_tool_call") {
      usedTools = true;
      const direct = item.name?.endsWith("__HandOff") || (item.name === "HandOff" && /hitl/i.test(item.namespace ?? ""));
      // Ignore quoted examples, templates and comments inside a code-mode call.
      const source = (item.input ?? item.arguments ?? "").replace(/"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, " ");
      const code = /(?:^|\.)exec$/.test(item.name ?? "") && /\btools\.\w*hitl\w*__HandOff\s*\(/.test(source);
      if (direct || code) { handoffId = item.call_id; handoffResult = undefined; }
    }
    if (handoffId && item?.call_id === handoffId && ["function_call_output", "custom_tool_call_output"].includes(item.type)) {
      handoffResult = item.output;
    }
  }
  if (!usedTools) return {};
  if (handoffResult !== undefined && actionOf(handoffResult) !== "continue") return {};
  return { decision: "block", reason };
}

let output = {};
try { output = stop(JSON.parse(readFileSync(0, "utf8"))); } catch { /* Fail open. */ }
process.stdout.write(JSON.stringify(output) + "\n");
