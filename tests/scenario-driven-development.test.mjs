import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), "utf8");
const exists = (relativePath) => existsSync(path.join(repoRoot, relativePath));

const skillDir = "development/skills/scenario-driven-development";

test("scenario-driven-development skill defines the three stages in order", () => {
  const skill = read(`${skillDir}/SKILL.md`);
  const metadata = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";

  assert.match(metadata, /^name: scenario-driven-development$/m);
  assert.match(metadata, /^description: .*Use when/m);
  assert.match(metadata, /^user-invocable: true$/m);
  assert.match(metadata, /^disable-model-invocation: false$/m);

  const stage1 = skill.search(/### Stage 1 — Scenario manual testing/);
  const stage2 = skill.search(/### Stage 2 — Regression tests/);
  const stage3 = skill.search(/### Stage 3 — Coverage-guided tests/);
  assert.ok(stage1 >= 0 && stage2 > stage1 && stage3 > stage2, "stages must appear in order 1, 2, 3");

  assert.match(skill, /reproduce by hand.*reproduce in code.*green/is, "bug-fix order");
  assert.match(skill, /fails when (its|the) fix is reverted/i);
  assert.match(skill, /material acceptance contract.*automated behavioral test/is);
  assert.match(skill, /under 1 second/i);
  assert.match(skill, /under 30 seconds/i);
  assert.match(skill, /No % target/i);
});

test("scenario-driven-development carries the coverage tools and moved references", () => {
  const skill = read(`${skillDir}/SKILL.md`);
  const coverage = read(`${skillDir}/reference/coverage-tools.md`);

  assert.ok(skill.includes("reference/coverage-tools.md"));
  for (const tool of ["XPlat Code Coverage", "dotnet-coverage", "--coverage", "pytest --cov", "-coverprofile", "cargo llvm-cov"]) {
    assert.ok(coverage.includes(tool), `coverage reference must name ${tool}`);
  }

  for (const moved of ["writing-good-tests.md", "instrumented-logging.md"]) {
    assert.ok(exists(`${skillDir}/reference/${moved}`), `${moved} must live in the new skill`);
    assert.ok(skill.includes(`reference/${moved}`), `skill must link ${moved}`);
  }
  assert.equal(exists("development/skills/test-driven-development/reference/writing-good-tests.md"), false,
    "writing-good-tests.md moves instead of being duplicated");
});

test("TDD stays available as an explicit opt-in", () => {
  const tdd = read("development/skills/test-driven-development/SKILL.md");
  assert.match(tdd, /\*\*Opt-in\.\*\*/);
  assert.ok(tdd.includes("development:scenario-driven-development"), "TDD must point to the default mode");
  assert.doesNotMatch(tdd, /## Instrumented TDD/, "instrumented logging moved to the new skill");
});

test("callers route to scenario-driven-development by default", () => {
  const callers = [
    "development/agents/developer.md",
    "development/agents/manual-tester.md",
    "development/skills/agile-development/SKILL.md",
    "development/skills/implement/SKILL.md",
    "development/skills/implement/reference/execution-loop.md",
    "development/skills/work-on/SKILL.md",
    "development/skills/subagent-driven-development/SKILL.md",
    "development/skills/subagent-driven-development/reference/implementer-prompt.md",
    "development/skills/subagent-driven-development/reference/task-reviewer-prompt.md",
    "development/skills/brainstorming/SKILL.md",
    "development/skills/verification-before-completion/SKILL.md",
    "development/reference/writing-plans-guide.md",
    "development/reference/executing-plans-guide.md",
    "debugging/skills/systematic-debugging/SKILL.md",
  ];

  for (const relativePath of callers) {
    const content = read(relativePath);
    assert.ok(content.includes("scenario-driven-development"), `${relativePath} must route to scenario-driven-development`);
    assert.doesNotMatch(content, /`development:test-driven-development`(?![^\n]*(opt-in|explicitly asks|asks for TDD))/i,
      `${relativePath} may name TDD only as an opt-in`);
  }

  const agents = read("development/.claude-plugin/plugin.json") + read(".claude-plugin/marketplace.json");
  assert.match(agents, /scenario-driven/i, "plugin metadata advertises the new default");
});
