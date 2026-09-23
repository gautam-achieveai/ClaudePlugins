import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const dev = (relativePath) => path.join(repoRoot, "development", relativePath);
const read = (relativePath) => readFileSync(dev(relativePath), "utf8");
const exists = (relativePath) => existsSync(dev(relativePath));

test("TDD skill links the moved writing-good-tests reference", () => {
  const skill = read("skills/test-driven-development/SKILL.md");
  const moved = "skills/scenario-driven-development/reference/writing-good-tests.md";

  assert.ok(exists(moved));
  assert.equal(exists("skills/test-driven-development/reference/testing-anti-patterns.md"), false,
    "the old anti-patterns reference is replaced, not kept beside the new one");
  assert.match(skill, /scenario-driven-development\/reference\/writing-good-tests\.md/);
  assert.doesNotMatch(skill, /testing-anti-patterns/);
  assert.match(skill, /scenario-driven-development\/reference\/instrumented-logging\.md/);
  assert.match(skill, /whole suite|full suite/i, "green means the project's whole suite");

  const reference = read(moved);
  assert.match(reference, /mirror/i, "expected values are not mirrored from the code under test");
  assert.match(reference, /change detector/i);
});

test("brainstorming classifies the request into three paths that only get heavier", () => {
  const skill = read("skills/brainstorming/SKILL.md");

  assert.match(skill, /## Three Paths/);
  for (const pathName of ["spike", "bounded", "architectural"]) {
    assert.match(skill, new RegExp(pathName, "i"), `brainstorming must name the ${pathName} path`);
  }
  assert.match(skill, /heavier/i, "a path can escalate but never step down");
  assert.doesNotMatch(skill, /visual companion/i, "the browser visual companion is not ported");
});

test("writing-plans guide carries constraints, review focus, interfaces, and no placeholders", () => {
  const guide = read("reference/writing-plans-guide.md");

  for (const heading of ["## Global Constraints", "## Review Focus", "## No Placeholders", "## Execution Handoff"]) {
    assert.ok(guide.includes(heading), `writing-plans guide must contain ${heading}`);
  }
  assert.match(guide, /Interfaces/);
});

test("subagent-driven development uses a ledger, one task reviewer, and the Agile worker contract", () => {
  const skill = read("skills/subagent-driven-development/SKILL.md");

  assert.ok(exists("skills/subagent-driven-development/reference/task-reviewer-prompt.md"));
  assert.ok(exists("skills/subagent-driven-development/reference/re-review-prompt.md"));
  for (const retired of ["spec-reviewer-prompt.md", "code-quality-reviewer-prompt.md"]) {
    assert.equal(exists(`skills/subagent-driven-development/reference/${retired}`), false,
      `${retired} is replaced by the single task reviewer`);
  }
  for (const script of ["sdd-workspace", "task-brief", "review-package", "task-start", "task-done"]) {
    assert.ok(exists(`skills/subagent-driven-development/scripts/${script}`), `script ${script} must exist`);
  }

  assert.match(skill, /ledger/i);
  assert.match(skill, /## Model Selection/);
  assert.match(skill, /DONE_WITH_CONCERNS/);
  assert.match(skill, /agile-development\/reference\/worker-contract\.md/,
    "SDD reuses the Agile worker contract instead of a second copy");
  assert.doesNotMatch(skill, /Never[^\n]*multiple implementation subagents in parallel/i,
    "parallel implementers follow the parallel-waves contract instead of a blanket ban");
});

test("executing-plans guide runs tasks inline under the same ledger", () => {
  const guide = read("reference/executing-plans-guide.md");

  assert.match(guide, /ledger/i);
  assert.match(guide, /task-done/);
  assert.match(guide, /## Final Review/);
  assert.match(guide, /Ruling: /);
});
