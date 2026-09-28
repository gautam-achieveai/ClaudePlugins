import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entrypoints = [
  "code-reviewer/skills/review-retrospective/SKILL.md",
  "code-reviewer/skills/apply-review-learning/SKILL.md",
  "code-reviewer/agents/review-performance-judge.md",
  "code-reviewer/skills/repo-onboarding/SKILL.md",
  "code-reviewer/agents/repo-onboarding.md",
];
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("review learning entrypoints have matching discovery identities", () => {
  for (const file of entrypoints) {
    assert.ok(existsSync(path.join(root, file)), `Missing entrypoint: ${file}`);
    const content = read(file);
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(frontmatter, `Missing frontmatter: ${file}`);
    const name = frontmatter[1].match(/^name:\s*(\S+)$/m)?.[1];
    const expected = file.endsWith("SKILL.md")
      ? path.basename(path.dirname(file))
      : path.basename(file, ".md");
    assert.equal(name, expected);
    assert.match(frontmatter[1], /^description:\s*\S/m);
  }
});

test("progressive references in the learning workflow resolve locally", () => {
  const visited = new Set();
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    assert.ok(existsSync(path.join(root, file)), `Missing reference: ${file}`);
    for (const [, target] of read(file).matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(https?:|#)/.test(target)) continue;
      const clean = target.split("#")[0];
      const resolved = clean.startsWith("${CLAUDE_PLUGIN_ROOT}/")
        ? path.join(root, file.split("/")[0], clean.slice("${CLAUDE_PLUGIN_ROOT}/".length))
        : path.resolve(root, path.dirname(file), clean);
      assert.ok(resolved.startsWith(root + path.sep), `Reference escapes repo: ${target}`);
      assert.ok(existsSync(resolved), `${file} links to missing ${target}`);
      const relative = path.relative(root, resolved).replaceAll(path.sep, "/");
      if (/review-retrospective|apply-review-learning|review-performance-judge|repo-onboarding/.test(relative)) {
        visit(relative);
      }
    }
  }
  entrypoints.forEach(visit);
});

test("initial and repeat review paths can reach the retrospective entrypoint", () => {
  for (const file of [
    "code-reviewer/skills/pr-review/SKILL.md",
    "code-reviewer/skills/pr-review/reference/re-review-workflow.md",
  ]) {
    assert.ok(read(file).includes("code-reviewer:review-retrospective"),
      `${file} has no retrospective handoff`);
  }
});

test("review lessons and development lessons share one store and one schema", () => {
  const owner = read("development/skills/compound-learning/SKILL.md");
  const contract = read("code-reviewer/skills/review-retrospective/reference/evidence-contract.md");
  const store = "docs/superpowers/learnings/<category>/<slug>.md";
  for (const file of [owner, contract, read("code-reviewer/skills/apply-review-learning/SKILL.md"), read("code-reviewer/skills/repo-onboarding/SKILL.md")]) {
    assert.ok(file.includes(store), `every writer must name ${store}`);
  }
  for (const key of ["title", "date", "type", "component", "tags", "applies_when", "skip_when", "source", "status", "revalidate_when"]) {
    assert.match(owner, new RegExp(`^${key}:`, "m"), `compound-learning schema lacks ${key}`);
    assert.match(contract, new RegExp("`" + key + "`"), `review contract lacks ${key}`);
  }
  assert.match(owner, /`review`/, "compound-learning must offer the review category");
  assert.match(read("code-reviewer/skills/pr-review/SKILL.md"), /development:compound-learning/);
  for (const file of [contract, read("code-reviewer/skills/pr-review/SKILL.md"), read("code-reviewer/README.md")]) {
    assert.doesNotMatch(file, /knowledge-entries\.md|process-improvements\.md|conversation_memories\/review-learning/);
  }
});

test("review convention discovery consumes scoped onboarding notes without automatic fan-out", () => {
  const conventions = read("code-reviewer/skills/pr-review/reference/repo-conventions.md");
  assert.match(conventions, /reviewer-onboarding\/index\.md/);
  assert.match(conventions, /do not launch repository-wide onboarding/);
  assert.match(conventions, /skill routing/);
  assert.match(conventions, /Recheck stale or contradicted claims/);
  assert.match(read("code-reviewer/README.md"), /\/code-reviewer:repo-onboarding/);
});

test("onboarding defines bounded recursive handoffs and preserves corrected evidence", () => {
  const workflow = read("code-reviewer/skills/repo-onboarding/SKILL.md");
  const agent = read("code-reviewer/agents/repo-onboarding.md");
  for (const requirement of [
    "12 research invocations", "3 active workers across the tree", "logical depth 3",
    "parent IDs", "visited", "A child request is not a dispatch",
    "PARTIAL: delegation unavailable", "do not delete the lesson or its provenance",
    "AGENTS.md", "AGENT.md", "CLAUDE.md", "SKILL.md",
    "currency unverified", "supported-not-observed", "closed-unmerged",
    "Launch independent ready nodes concurrently", "deduplicate follow-up questions",
    "requires separate explicit user opt-in", "an onboarding request alone is not authorization",
    "A single-worker host still supports delegation", "Do not invent percentages",
    "Runtime configuration", "Deployment and failure signals",
    "Trust and authorization boundaries", "Data migrations and compatibility",
    "How it works", "What we learned", "Next questions",
    "directly in the final response, not just notebook paths",
  ]) {
    assert.ok(workflow.includes(requirement), `Missing onboarding contract: ${requirement}`);
  }
  assert.match(agent, /do not restart the root workflow/);
  assert.match(agent, /actual agent launches \(not file reads\)/);
  assert.doesNotMatch(workflow, /authorized by this onboarding request/);
  const evaluations = JSON.parse(read("code-reviewer/skills/repo-onboarding/evals/evals.json"));
  assert.equal(evaluations.skill_name, "repo-onboarding");
  assert.equal(new Set(evaluations.evals.map((entry) => entry.id)).size, evaluations.evals.length);
  assert.ok(evaluations.evals.length >= 3);
  for (const entry of evaluations.evals) {
    assert.ok(entry.prompt && entry.expected_output);
    assert.ok(entry.assertions.length > 0);
  }
});
