import { readFileSync } from "node:fs";

// Only bundled text enters the prompt. Never read the transcript, config, or stdin.
const event = process.argv[2];
let context;

if (event === "SessionStart") {
  const skill = readFileSync(new URL("../skills/using-hitl/SKILL.md", import.meta.url), "utf8");
  context = `HITL usage guidance (hitl:using-hitl):\n\n${skill.trim()}`;
} else if (event === "UserPromptSubmit") {
  context = "Use hitl:using-hitl for human interaction. When HITL is available, ask necessary questions with AskUserQuestion (context; up to 4 questions), review plan files with ReviewPlan, and use Notify for one-off completion/blocker/build messages. Use UpdateWork for ongoing progress and ReadWork on resume/conflict. Discover actual tool names and schemas; never pass a timeout argument; the host's per-server timeout (6 hours from setup) governs waits. Preserve existing authorization; silence, timeout, or skipped review is not approval. If HITL is unavailable, explain and use chat for needed input; use hitl:setup-hitl when setup is requested. Do not interrupt routine authorized work or repeat notifications.";
}

process.stdout.write(JSON.stringify(context
  ? { hookSpecificOutput: { hookEventName: event, additionalContext: context } }
  : {}) + "\n");
