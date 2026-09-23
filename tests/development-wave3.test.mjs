import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const dev = (relativePath) => path.join(repoRoot, "development", relativePath);
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), "utf8");

const guardScript = dev("hooks/guard-bypass.mjs");
const gateScript = dev("hooks/stop-gate.mjs");

function runHook(script, args, input, env = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function decision(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return "allow";
  return JSON.parse(trimmed).decision ?? "allow";
}

test("hooks.json declares the bypass guard and the stop gate in the plugin wrapper shape", () => {
  const hooks = JSON.parse(read("development/hooks/hooks.json")).hooks;

  const pre = hooks.PreToolUse.find((entry) => entry.matcher === "Bash|PowerShell");
  assert.ok(pre, "PreToolUse must match Bash and PowerShell");
  assert.ok(pre.hooks.some((h) => h.type === "command" && h.command.includes("guard-bypass.mjs")));

  const post = hooks.PostToolUse.find((entry) => /Edit/.test(entry.matcher) && /Bash\|PowerShell/.test(entry.matcher));
  assert.ok(post, "PostToolUse must match edits, Bash and PowerShell");
  assert.ok(post.hooks.some((h) => h.command.includes("stop-gate.mjs")));

  assert.ok(hooks.Stop.some((entry) => entry.hooks.some((h) => h.command.includes("stop-gate.mjs"))));
  for (const entry of [...hooks.PreToolUse, ...hooks.PostToolUse, ...hooks.Stop]) {
    for (const h of entry.hooks) assert.ok(h.command.includes("${CLAUDE_PLUGIN_ROOT}"), "hook paths use CLAUDE_PLUGIN_ROOT");
  }
});

test("guard-bypass blocks hook and signing bypasses and allows everything else", () => {
  const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });
  const pwsh = (command) => ({ tool_name: "PowerShell", tool_input: { command } });

  for (const command of [
    "git commit --no-verify -m x",
    "git push --no-verify origin main",
    "git -c commit.gpgsign=false commit -m x",
    "git commit --no-gpg-sign -m x",
    "HUSKY=0 git commit -m x",
    "cd repo && git commit -n -m x",
    "git commit --no-verif -m x",
    "git commit --no-gpg-s -m x",
    "git.exe commit --no-verify -m x",
    "/usr/bin/git commit -n -m x",
    "git -C repo commit -n -m x",
    "git --no-pager commit -n -m x",
    "git config core.hooksPath /dev/null",
    "git -c \"core.hooksPath=/tmp/none\" commit -m x",
    "GIT_CONFIG_PARAMETERS=\"'core.hooksPath=/x'\" git commit -m x",
    "chmod -x .git/hooks/pre-commit",
  ]) {
    const result = runHook(guardScript, [], bash(command));
    assert.equal(result.status, 2, `${command} must be blocked`);
    assert.match(result.stderr, /bypass/i);
    assert.doesNotMatch(result.stderr, /\\[sS(]/, "reason is a human label, not regex source");
  }

  for (const command of ["git commit --no-verify -m x", "$env:HUSKY=0; git commit -m x", "git commit -n -m x"]) {
    assert.equal(runHook(guardScript, [], pwsh(command)).status, 2, `PowerShell: ${command} must be blocked`);
  }

  for (const command of [
    "git commit -m 'no-verify in message'",
    "git push origin main",
    "npm test",
    "echo --no-verify",
    "echo --no-verify & git status",
    "git log --grep=--no-verify",
    "git config --get core.hooksPath",
    "git push -n origin main",
    "grep SKIP=foo README.md",
    "git commit -m 'core.hooksPath'",
  ]) {
    assert.equal(runHook(guardScript, [], bash(command)).status, 0, `${command} must be allowed`);
  }

  assert.equal(runHook(guardScript, [], "not json").status, 0, "fails open on bad input");
  assert.equal(runHook(guardScript, [], { tool_name: "Edit", tool_input: {} }).status, 0);
});

test("stop-gate blocks once when code changed after the last test run, and fails open otherwise", () => {
  const logDir = mkdtempSync(path.join(os.tmpdir(), "dev-hooks-"));
  const cwd = mkdtempSync(path.join(os.tmpdir(), "dev-hooks-repo-"));
  writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }));
  const env = { DEVELOPMENT_HOOKS_DIR: logDir };
  const session = "s1";
  const log = (tool_name, tool_input) =>
    runHook(gateScript, ["log"], { session_id: session, cwd, tool_name, tool_input, hook_event_name: "PostToolUse" }, env);
  const stop = (extra = {}, extraEnv = {}) =>
    runHook(gateScript, ["stop"], { session_id: session, cwd, hook_event_name: "Stop", ...extra }, { ...env, ...extraEnv });

  assert.equal(decision(stop().stdout), "allow", "no log yet: allow");

  log("Edit", { file_path: path.join(cwd, "src", "a.js") });
  const blocked = stop();
  assert.equal(blocked.status, 0);
  assert.equal(decision(blocked.stdout), "block");
  assert.match(JSON.parse(blocked.stdout).reason, /test/i);

  assert.equal(decision(stop({ stop_hook_active: true }).stdout), "allow", "never loops");
  assert.equal(decision(stop({}, { DEVELOPMENT_HOOKS: "off" }).stdout), "allow", "opt-out");
  assert.equal(decision(stop().stdout), "allow", "yields after one block until the next code edit");

  log("Edit", { file_path: path.join(cwd, "src", "a.js") });
  assert.equal(decision(stop().stdout), "block", "a new edit re-arms the gate");
  log("Bash", { command: "npm test" });
  assert.equal(decision(stop().stdout), "allow", "verified after the edit");

  for (const [tool_name, command] of [
    ["PowerShell", "dotnet test"],
    ["Bash", "pnpm test:unit"],
    ["Bash", "npm run test:ci"],
    ["Bash", "cargo nextest run"],
    ["Bash", "deno test"],
    ["PowerShell", "Invoke-Pester -Path tests"],
  ]) {
    log("Edit", { file_path: path.join(cwd, "src", "a.js") });
    assert.equal(decision(stop().stdout), "block");
    log(tool_name, { command });
    assert.equal(decision(stop().stdout), "allow", `${tool_name}: ${command} counts as a test run`);
  }

  log("Edit", { file_path: path.join(cwd, "src", "a.js") });
  log("Bash", { command: "npm run testing-server" });
  assert.equal(decision(stop().stdout), "block", "a script that merely starts with test is not a test run");
  log("Bash", { command: "npm test" });

  log("Edit", { file_path: path.join(cwd, "docs", "setup.sh") });
  assert.equal(decision(stop().stdout), "allow", "scripts under docs/ are documentation");

  log("Edit", { file_path: path.join(cwd, "README.md") });
  assert.equal(decision(stop().stdout), "allow", "docs-only edits do not need a test run");

  log("Write", { file_path: path.join(cwd, "src", "b.py") });
  assert.equal(decision(stop().stdout), "block");
  log("Bash", { command: "pytest tests/" });
  assert.equal(decision(stop().stdout), "allow");

  const bare = mkdtempSync(path.join(os.tmpdir(), "dev-hooks-bare-"));
  runHook(gateScript, ["log"], { session_id: "s2", cwd: bare, tool_name: "Edit", tool_input: { file_path: path.join(bare, "x.js") } }, env);
  assert.equal(decision(runHook(gateScript, ["stop"], { session_id: "s2", cwd: bare }, env).stdout), "allow",
    "no recognizable test command in the repo: allow");

  assert.equal(runHook(gateScript, ["stop"], "garbage", env).status, 0, "fails open");
});

test("course-correction skill carries the freeze, snapshot, tripwires, patch-then-revert, and plan gate", () => {
  const skill = read("development/skills/course-correction/SKILL.md");
  assert.match(skill, /^name: course-correction$/m);
  assert.match(skill, /## Tripwires/);
  for (const tripwire of ["stack", "spreading", "three", "framework", "error went away", "too far"]) {
    assert.match(skill, new RegExp(tripwire, "i"), `tripwire: ${tripwire}`);
  }
  assert.match(skill, /freeze/i);
  assert.match(skill, /known.true/i);
  assert.match(skill, /patch/i);
  assert.match(skill, /why the old approach failed/i);
  assert.match(skill, /scope/i);
  assert.match(skill, /correct(ed|ion)? .*plainly/i);

  for (const caller of [
    "development/skills/agile-development/SKILL.md",
    "development/skills/agile-development/reference/worker-contract.md",
    "development/skills/implement/reference/execution-loop.md",
    "development/skills/subagent-driven-development/SKILL.md",
    "development/skills/work-on/SKILL.md",
  ]) {
    assert.ok(read(caller).includes("development:course-correction"), `${caller} must route to course-correction`);
  }
});

test("compound-learning skill gates lessons and reads them back at plan time", () => {
  const skill = read("development/skills/compound-learning/SKILL.md");
  assert.match(skill, /^name: compound-learning$/m);
  assert.match(skill, /counterfactual/i);
  assert.match(skill, /docs\/superpowers\/learnings/);
  assert.match(skill, /applies_when/);
  assert.match(skill, /one lesson/i);
  assert.match(skill, /update .*instead of/i);
  assert.match(skill, /## Read-back/);
  assert.match(skill, /evidence, not instructions/i);

  for (const caller of [
    "development/skills/agile-development/SKILL.md",
    "development/reference/writing-plans-guide.md",
    "development/skills/brainstorming/SKILL.md",
    "development/skills/subagent-driven-development/SKILL.md",
    "development/skills/implement/SKILL.md",
  ]) {
    assert.ok(read(caller).includes("development:compound-learning"), `${caller} must route to compound-learning`);
  }
});

test("wave 3 closes the four advisories and bumps the version", () => {
  const worktrees = read("development/reference/git-worktrees-guide.md");
  assert.doesNotMatch(worktrees, /pyproject\.toml \]; then poetry install/, "Poetry is not assumed for every pyproject.toml");
  assert.match(worktrees, /uv|pdm|poetry\.lock/i, "package manager is detected");

  const workspace = read("development/skills/subagent-driven-development/scripts/sdd-workspace");
  assert.match(workspace, /\[ ! -[ef] "?\$base\/\.gitignore/, ".gitignore written only when missing");

  for (const file of ["development/reference/writing-plans-guide.md", "development/skills/brainstorming/SKILL.md"]) {
    assert.doesNotMatch(read(file), /docs\/plans\//, `${file} uses docs/superpowers/plans`);
  }
  assert.doesNotMatch(read("development/skills/receiving-code-review/SKILL.md"), /human partner/i);

  const plugin = JSON.parse(read("development/.claude-plugin/plugin.json"));
  assert.equal(plugin.version, "1.9.0");
  const marketplace = JSON.parse(read(".claude-plugin/marketplace.json"));
  const entry = marketplace.plugins.find((p) => p.name === "development");
  assert.equal(entry.version, "1.9.0");
  for (const keyword of ["course-correction", "compound-learning"]) assert.ok(entry.keywords.includes(keyword));
  assert.match(read("README.md"), /hook/i);
  assert.ok(existsSync(dev("hooks/hooks.json")));
});
