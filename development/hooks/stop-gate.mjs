// Stop gate: block ending the turn when code changed after the last test run.
//
//   node stop-gate.mjs log   — PostToolUse: append one line per code edit or test run
//   node stop-gate.mjs stop  — Stop: block once if the last edit is newer than the last test run
//
// Per-session log lives in DEVELOPMENT_HOOKS_DIR (default: <tmpdir>/claude-development-hooks).
// Allows on: DEVELOPMENT_HOOKS=off, stop_hook_active (never loops), no log, no recognizable
// test command in the repo, docs-only edits, or any error. A block is logged as a `gate` line
// and counts as the reset point, so the gate yields until the next code edit.
//
// TEST: see tests/development-wave3.test.mjs

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CODE_EXT = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".vue", ".svelte",
  ".py", ".cs", ".fs", ".vb", ".go", ".rs", ".java", ".kt", ".kts", ".scala", ".rb", ".php", ".swift",
  ".c", ".cc", ".cpp", ".h", ".hpp", ".m", ".mm", ".sql", ".sh", ".ps1", ".psm1", ".razor", ".cshtml",
]);
const TEST_RUNNER = /(^|\s|\/)(node\s+--test|(npm|pnpm|yarn|bun)\s+(run\s+)?test(s|:[\w:-]+)?|Invoke-Pester|vitest|jest|mocha|pytest|python\s+-m\s+pytest|dotnet\s+test|go\s+test|cargo\s+(test|nextest)|ctest|deno\s+test|mvn\s+.*test|gradle(w)?\s+.*test|rspec|phpunit|swift\s+test|make\s+test)(\s|$)/;
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const DOCS_DIR = /(^|[\\/])docs[\\/]/i;

const logDir = process.env.DEVELOPMENT_HOOKS_DIR || path.join(os.tmpdir(), "claude-development-hooks");
const logPath = (session) => path.join(logDir, `${String(session).replace(/[^\w.-]/g, "_")}.log`);

function classify(input) {
  const tool = input.tool_name;
  if (SHELL_TOOLS.has(tool)) {
    return TEST_RUNNER.test(String(input.tool_input?.command ?? "")) ? "verify" : null;
  }
  if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
    const file = String(input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "");
    if (DOCS_DIR.test(file)) return null;
    return CODE_EXT.has(path.extname(file).toLowerCase()) || tool === "NotebookEdit" ? "edit" : null;
  }
  return null;
}

function repoHasTests(cwd) {
  if (!cwd || !existsSync(cwd)) return false;
  const top = readdirSync(cwd);
  if (top.some((f) => /\.(sln|csproj|fsproj)$/i.test(f))) return true;
  for (const marker of ["pytest.ini", "conftest.py", "tox.ini", "go.mod", "Cargo.toml", "pom.xml", "build.gradle", "build.gradle.kts", "vitest.config.ts", "vitest.config.js", "jest.config.js", "jest.config.ts"]) {
    if (top.includes(marker)) return true;
  }
  if (top.includes("package.json")) {
    try {
      const pkg = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8"));
      if (pkg.scripts?.test && !/no test specified/.test(pkg.scripts.test)) return true;
    } catch { /* ignore */ }
  }
  if (top.includes("pyproject.toml") && /\[tool\.pytest|pytest/.test(readFileSync(path.join(cwd, "pyproject.toml"), "utf8"))) return true;
  for (const dir of ["tests", "test", "spec", "__tests__"]) {
    if (top.includes(dir)) return true;
  }
  return false;
}

function log(input) {
  const kind = classify(input);
  if (!kind) return;
  const detail = SHELL_TOOLS.has(input.tool_name) ? input.tool_input.command : input.tool_input?.file_path ?? "";
  append(input.session_id, kind, detail);
}

function append(session, kind, detail) {
  mkdirSync(logDir, { recursive: true });
  appendFileSync(logPath(session ?? "unknown"), `${kind}\t${new Date().toISOString()}\t${String(detail).replace(/\s+/g, " ").slice(0, 200)}\n`);
}

function stop(input) {
  if (process.env.DEVELOPMENT_HOOKS === "off" || input.stop_hook_active) return;
  const file = logPath(input.session_id ?? "unknown");
  if (!existsSync(file)) return;
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
  const lastEdit = lines.map((l) => l.startsWith("edit\t")).lastIndexOf(true);
  const lastVerify = lines.map((l) => l.startsWith("verify\t") || l.startsWith("gate\t")).lastIndexOf(true);
  if (lastEdit < 0 || lastEdit < lastVerify) return;
  if (!repoHasTests(input.cwd)) return;
  const edited = lines[lastEdit].split("\t")[2];
  append(input.session_id, "gate", "blocked once; yields until the next code edit");
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: `Code changed after the last test run (${edited}). Run the project's tests and report the result by name, or say why they cannot run. This gate yields after one block.`,
  }) + "\n");
}

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  if (process.argv[2] === "log") log(input);
  else if (process.argv[2] === "stop") stop(input);
} catch {
  // fail open
}
process.exit(0);
