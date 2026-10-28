// Order matters: compatibility hosts export several roots at once. Copilot CLI sets
// PLUGIN_ROOT and CLAUDE_PLUGIN_ROOT alongside COPILOT_PLUGIN_ROOT (github/copilot-cli
// changelog), and Cursor CLI sets CLAUDE_PLUGIN_ROOT alongside CURSOR_PLUGIN_ROOT, so
// each vendor's own variable must be checked before any compat alias. OpenCode has no
// equivalent signal: its plugins are in-process JS modules, not shell hooks.
const HOSTS = [
  { id: "kimi", label: "Kimi Code", matches: (env) => Boolean(env.KIMI_PLUGIN_ROOT) },
  { id: "copilot", label: "GitHub Copilot CLI", matches: (env) => Boolean(env.COPILOT_PLUGIN_ROOT) },
  { id: "codex", label: "Codex", matches: (env) => Boolean(env.PLUGIN_ROOT) },
  { id: "cursor", label: "Cursor CLI (Claude-compatible)", matches: (env) => Boolean(env.CURSOR_PLUGIN_ROOT) },
  { id: "claude", label: "Claude Code", matches: (env) => Boolean(env.CLAUDE_PLUGIN_ROOT) },
];

export function detectHost(env = process.env) {
  const detected = HOSTS.find((host) => host.matches(env));
  if (detected) return { ...detected, detected: true };
  return { id: "claude", label: "the current agent", detected: false };
}

export function hostContextLine(env = process.env) {
  const host = detectHost(env);
  return host.detected
    ? `Current agent: ${host.label}.`
    : 'Current agent: not detected; use "the current agent" or "this host".';
}
