// PreToolUse hook for Bash and PowerShell: block git commands that skip hooks or signing.
// Exit 2 with the reason on stderr blocks the call; anything else allows it.
// Fails open: bad input or any error exits 0.
//
// TEST: echo '{"tool_name":"Bash","tool_input":{"command":"git commit --no-verify -m x"}}' | node guard-bypass.mjs; echo $?   # 2
// TEST: echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m x"}}' | node guard-bypass.mjs; echo $?               # 0
// TEST: see tests/development-wave3.test.mjs

import { readFileSync } from "node:fs";

const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

// git accepts any unique prefix of a long option, so `--no-verif` skips hooks too.
const GIT_FLAGS = [
  [/(^|\s)--no-veri(f(y)?)?(\s|$)/, "--no-verify"],
  [/(^|\s)--no-gpg\S*(\s|$)/, "--no-gpg-sign"],
  [/(^|\s)--no-hooks(\s|$)/, "--no-hooks"],
  [/(^|\s)-c\s+["']?commit\.gpgsign=false/i, "-c commit.gpgsign=false"],
];
// Checked on the raw command (quotes intact) and on the whole command, not per git segment:
// `$env:HUSKY=0; git commit` splits into two segments, and the assignment alone is the bypass.
const ENV_BYPASS = /(^|\s|\$env:)(HUSKY=0|SKIP=\S+|LEFTHOOK=0|PRE_COMMIT_ALLOW_NO_CONFIG=1|GIT_CONFIG_PARAMETERS\s*=|GIT_CONFIG_KEY_\d+\s*=)/i;
const HOOK_FILES = /(chmod|rm|mv|del|Remove-Item|Rename-Item)\b[^&|;]*\.git[\\/]hooks/i;
const HOOKS_PATH = /core\.hookspath/i;
const HOOKS_PATH_QUOTED = /(^|\s)-c\s+["']core\.hookspath/i;
const GIT_WORD = /(^|\s|\/|\\)git(\.exe)?(\s|$)/;
// Global flags may take a separate argument (`-C repo`, `--git-dir x`); skip those too.
const GIT_COMMIT = /(^|\s|\/|\\)git(\.exe)?\s+(-\S+(\s+[^-\s]\S*)?\s+)*commit(\s|$)/;

function stripQuoted(text) {
  return text.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
}

function findBypass(command) {
  if (HOOK_FILES.test(command)) return "tampering with .git/hooks";
  const segments = command.split(/&|\|\||;|\||\r?\n/).map((raw) => raw.trim());
  if (!segments.some((segment) => GIT_WORD.test(segment))) return null;
  if (ENV_BYPASS.test(command)) return "hook-skipping environment variable";
  for (const segment of segments) {
    if (!GIT_WORD.test(segment)) continue;
    const bare = stripQuoted(segment);
    if ((HOOKS_PATH.test(bare) || HOOKS_PATH_QUOTED.test(segment)) && !/(^|\s)--get(-\S+)?(\s|$)/.test(bare)) return "core.hooksPath override";
    for (const [flag, label] of GIT_FLAGS) if (flag.test(bare)) return label;
    if (GIT_COMMIT.test(bare) && /(^|\s)-n(\s|$)/.test(bare)) return "-n (--no-verify)";
  }
  return null;
}

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  if (!SHELL_TOOLS.has(input.tool_name) || typeof input.tool_input?.command !== "string") process.exit(0);
  const found = findBypass(input.tool_input.command);
  if (found) {
    process.stderr.write(
      `Blocked: git bypass (${found}). Hook skips, signing bypasses, and hooksPath overrides need the user's exact authorization; fix the failing hook or ask instead.\n`
    );
    process.exit(2);
  }
} catch {
  // fail open
}
process.exit(0);
