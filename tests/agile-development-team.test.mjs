import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function frontmatter(relativePath) {
  const content = read(relativePath);
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, `${relativePath} must start with YAML frontmatter`);
  return match[1];
}

function assertManualTestingStartsBeforeCoverageReview(content) {
  const section = content.match(/### 1\. Build the thin slice([\s\S]*?)(?=\n### 2\.)/)?.[1];
  assert.ok(section, "skill must contain a bounded thin-slice execution section");

  const steps = [...section.matchAll(/^\d+\.\s+(.+)$/gm)].map(([, step]) => step);
  const firstScenario = steps.findIndex((step) => /Manual Tester.*tiniest observable scenario/i.test(step));
  const regression = steps.findIndex((step) => /observed defect.*failing regression test/i.test(step));
  const contractTests = steps.findIndex((step) => /material acceptance contract.*automated behavioral test/i.test(step));
  const manualGate = steps.findIndex((step) => /Manual Tester.*thumbs-up.*every scenario/i.test(step));
  const coverage = steps.findIndex((step) => /Only after all manual scenarios pass.*coverage/i.test(step));

  assert.ok(firstScenario >= 0, "tester must choose the first runnable scenario with the developer");
  assert.ok(regression > firstScenario, "observed defects must drive regression tests");
  assert.ok(contractTests > regression, "accepted behavior must receive contract tests after defect tests");
  assert.ok(manualGate > contractTests, "testing must continue through all scenarios");
  assert.ok(coverage > manualGate, "coverage review must follow full manual verification");
}

const developmentAgents = [
  ["architect", "Architect"],
  ["manual-tester", "Manual Tester"],
  ["developer", "Developer"],
  ["critic", "Critic"],
];

test("Agile delivery agents live in development and Code Reviewer lives in code-reviewer", () => {
  assert.equal(existsSync(path.join(repoRoot, "development/agents/test-planner.md")), false,
    "Manual Tester owns the former Test Planner responsibilities");
  for (const relativePath of [
    "README.md",
    ".claude-plugin/marketplace.json",
    "development/.claude-plugin/plugin.json",
    "development/skills/agile-development/SKILL.md",
    "docs/superpowers/specs/2026-09-22-scenario-driven-development-design.md",
  ]) {
    assert.doesNotMatch(read(relativePath), /test-planner|Test Planner/,
      `${relativePath} must not advertise the retired Test Planner role`);
  }
  for (const [name, heading] of developmentAgents) {
    const relativePath = `development/agents/${name}.md`;
    assert.ok(existsSync(path.join(repoRoot, relativePath)), `${relativePath} must exist`);
    assert.match(frontmatter(relativePath), new RegExp(`^name: ${name}$`, "m"));
    assert.match(read(relativePath), new RegExp(`^# ${heading}$`, "m"));
  }

  const reviewerPath = "code-reviewer/agents/code-reviewer.md";
  assert.ok(existsSync(path.join(repoRoot, reviewerPath)), `${reviewerPath} must exist`);
  assert.match(frontmatter(reviewerPath), /^name: code-reviewer$/m);
  assert.match(read(reviewerPath), /^# Code Reviewer$/m);
  assert.equal(
    existsSync(path.join(repoRoot, "development/agents/code-reviewer.md")),
    false,
    "Code Reviewer belongs only in the code-reviewer plugin"
  );
});

test("new agent frontmatter is discoverable and gateway-safe", () => {
  const files = [
    ...developmentAgents.map(([name]) => `development/agents/${name}.md`),
    "code-reviewer/agents/code-reviewer.md",
  ];

  for (const relativePath of files) {
    const metadata = frontmatter(relativePath);
    assert.match(metadata, /^description: [^>|\r\n]+$/m, `${relativePath} needs a single-line description`);
    assert.match(metadata, /^user-invocable: true$/m);
    assert.match(metadata, /^disable-model-invocation: false$/m);
    assert.match(metadata, /^model: inherit$/m);
    assert.match(metadata, /^color: (blue|cyan|green|yellow|magenta|red)$/m);
  }

  for (const relativePath of files) {
    const metadata = frontmatter(relativePath);
    if (/^tools:/m.test(metadata)) {
      assert.match(metadata, /^\s+- Agent$/m, `${relativePath} restricts tools, so it must allow Agent for recursive delegation`);
    }
  }
});

test("Agile agents may delegate recursively under the worker contract", () => {
  const skill = read("development/skills/agile-development/SKILL.md");
  const contract = read("development/skills/agile-development/reference/worker-contract.md");

  assert.doesNotMatch(skill, /depth-one/i, "skill must not cap delegation depth");
  assert.match(skill, /recursive/i, "skill must allow recursive delegation");
  assert.match(contract, /## Recursive delegation/, "contract must define recursive delegation rules");
  assert.match(contract, /subset of (its |the )?parent's owned artifacts/i, "children must not widen ownership");
});

test("Agile development skill preserves the AGENTS.md team gates", () => {
  const relativePath = "development/skills/agile-development/SKILL.md";
  assert.ok(existsSync(path.join(repoRoot, relativePath)), `${relativePath} must exist`);

  const content = read(relativePath);
  const metadata = frontmatter(relativePath);
  assert.match(metadata, /^name: agile-development$/m);
  assert.match(metadata, /^description: Use when /m);
  assert.match(metadata, /^user-invocable: true$/m);
  assert.match(metadata, /^disable-model-invocation: false$/m);

  for (const agentId of [
    "development:architect",
    "development:manual-tester",
    "development:developer",
    "development:critic",
    "code-reviewer:code-reviewer",
  ]) {
    assert.ok(content.includes(agentId), `${relativePath} must route to ${agentId}`);
  }

  assert.match(content, /thin end-to-end slice/i, "skill must start with a thin end-to-end slice");
  assertManualTestingStartsBeforeCoverageReview(content);

  assert.throws(
    () =>
      assertManualTestingStartsBeforeCoverageReview(`
### 1. Build the thin slice

1. Only after all manual scenarios pass, inspect coverage.
2. Dispatch the Manual Tester to choose the tiniest observable scenario.
3. For each observed defect, write a failing regression test.
4. For each material acceptance contract, add an automated behavioral test.
5. Loop fixes until the Manual Tester records a thumbs-up for every scenario.

### 2. Expand by independent workstream
`),
    /coverage review must follow full manual verification/,
    "the sequencing contract must reject early coverage review"
  );

  for (const requiredIntegration of [
    "development:scenario-driven-development",
    "debugging:debug-with-logs",
    "code-reviewer:pr-review",
    "code-reviewer:over-engineering-review",
  ]) {
    assert.ok(content.includes(requiredIntegration), `${relativePath} must reuse ${requiredIntegration}`);
  }

  assert.match(content, /\/loop 15m/i, "skill must preserve the Progress Tracker cadence");
  assert.match(content, /critical retrospective/i, "skill must require the Manual Tester retrospective");
  assert.match(content, /Claude Fable 5\.1/, "skill must name the Fable long-horizon model family");
  assert.match(content, /GPT-6 Astra/, "skill must name the Astra long-horizon model family");
  assert.match(
    content,
    /lead.*continue.*while.*agents.*run/is,
    "skill must let the lead make progress while independent agents run"
  );
});

test("Agile development skill keeps durable, parallel-safe orchestration contracts", () => {
  const skill = read("development/skills/agile-development/SKILL.md");
  const contractPath = "development/skills/agile-development/reference/worker-contract.md";
  const wavesPath = "development/skills/agile-development/reference/parallel-waves.md";

  for (const relativePath of [contractPath, wavesPath]) {
    assert.ok(existsSync(path.join(repoRoot, relativePath)), `${relativePath} must exist`);
    assert.ok(skill.includes(relativePath.split("agile-development/")[1]), `skill must link ${relativePath}`);
  }

  const contract = read(contractPath);
  for (const status of ["DONE", "DONE_WITH_CONCERNS", "BLOCKED", "NEEDS_CONTEXT"]) {
    assert.match(contract, new RegExp(`\\b${status}\\b`), `worker contract must define ${status}`);
  }
  assert.match(contract, /Ruling: .+ — .+ — .+/, "contract must define the Ruling log format");
  assert.match(contract, /report file/i, "workers must hand off through a report file");

  const waves = read(wavesPath);
  assert.match(waves, /different files .*not .*independen/i, "file separation alone must not imply independence");
  assert.match(waves, /one owner per file/i);
  assert.match(waves, /lockfile/i);
  assert.match(waves, /migration/i);
  assert.match(waves, /workers do not commit/i);

  assert.match(skill, /ledger/i, "skill must keep a durable ledger");
  assert.match(skill, /never re-dispatch/i, "resumed runs must not repeat completed work");
  assert.match(skill, /fails when the fix is reverted/i, "post-approval regression tests must be proven");
  assert.match(skill, /change the configuration before (any|a) retry/i, "stalls must be diagnosed, not retried blindly");
  assert.match(skill, /patch stacking/i, "skill must name course-correction alarms");
  assert.match(skill, /stale/i, "progress tracking must mark stale data instead of inventing it");
});

test("plugin discovery metadata advertises the Agile team surfaces", () => {
  const developmentManifest = JSON.parse(read("development/.claude-plugin/plugin.json"));
  const reviewerManifest = JSON.parse(read("code-reviewer/.claude-plugin/plugin.json"));
  const marketplace = JSON.parse(read(".claude-plugin/marketplace.json"));
  const developmentListing = marketplace.plugins.find(({ name }) => name === "development");
  const reviewerListing = marketplace.plugins.find(({ name }) => name === "code-reviewer");

  assert.ok(developmentManifest.description.includes("Agile"));
  assert.ok(reviewerManifest.description.includes("Code Reviewer agent"));
  assert.ok(developmentListing.description.includes("Agile"));
  assert.ok(developmentListing.keywords.includes("agile-development"));
  assert.ok(reviewerListing.description.includes("Code Reviewer agent"));
  assert.ok(reviewerListing.keywords.includes("code-reviewer-agent"));
});
