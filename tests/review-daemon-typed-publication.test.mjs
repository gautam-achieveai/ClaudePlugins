import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const skillPath = path.join(
  repoRoot,
  "code-reviewer",
  "skills",
  "post-pr-review",
  "SKILL.md"
);
const gathererPath = path.join(
  repoRoot,
  "code-reviewer",
  "agents",
  "pr-context-gatherer.md"
);

const skill = readFileSync(skillPath, "utf8");
const gatherer = readFileSync(gathererPath, "utf8");
const operationNames = [
  "CreateRootSummary",
  "AppendSummaryDelta",
  "SubmitInlineFindings",
  "PostClarificationQuestion",
  "ReplyToDiscussion",
  "FinalizeRound",
];

function daemonBranch() {
  const start = skill.indexOf("## Review Daemon Typed Publication");
  const end = skill.indexOf("## Input Contract", start);
  assert.ok(start >= 0, "post-pr-review must define the typed daemon branch");
  assert.ok(end > start, "typed daemon branch must end before the ordinary input contract");
  return skill.slice(start, end);
}

test("daemon branch exposes exactly the six provider-neutral operations", () => {
  const branch = daemonBranch();
  const declared = [...branch.matchAll(/^\d+\. `([A-Za-z]+)` —/gm)].map(
    (match) => match[1]
  );

  assert.deepEqual(declared, operationNames);
  for (const operation of operationNames) {
    assert.equal(
      declared.filter((name) => name === operation).length,
      1,
      `${operation} must be declared exactly once`
    );
  }
});

test("daemon mode is explicit and ordinary provider posting remains unchanged", () => {
  const branch = daemonBranch();

  assert.match(branch, /^### Exact mode signal$/m);
  assert.match(branch, /literal `## Daemon-Supplied Publication Context` heading/);
  assert.match(branch, /Tool availability alone (?:does not|never) select/i);
  assert.match(branch, /Without that heading[\s\S]{0,240}ordinary[\s\S]{0,160}unchanged/i);

  assert.match(skill, /^### Step 2: Resolve Provider, Repository and Project$/m);
  assert.match(skill, /gh api repos\/<owner>\/<repo>\/pulls\/<prNumber>\/reviews/);
  assert.match(skill, /mcp__azure-devops__addPullRequestInlineComment/);
});

test("daemon branch forbids raw provider publication and free-form action recovery", () => {
  const branch = daemonBranch();

  assert.match(branch, /MUST NOT use raw `gh`/);
  assert.match(branch, /MUST NOT use[\s\S]{0,120}provider posting endpoints/i);
  assert.match(branch, /MUST NOT emit or parse fenced `review-actions` YAML/i);
  assert.match(branch, /credentials remain inside the daemon backend/i);
  assert.match(branch, /agent-authored text unchanged after mechanical validation/i);

  assert.doesNotMatch(branch, /^\s*gh (?:api|pr comment|pr review|pr merge)\b/m);
  assert.doesNotMatch(branch, /^\s*mcp__azure-devops__(?:add|reply|approve|merge)/m);
  assert.doesNotMatch(branch, /```(?:ya?ml)?\s*[\s\S]*review-actions/i);
});

test("daemon branch maps round intent to typed calls and finalizes deliberate no-op", () => {
  const branch = daemonBranch();

  assert.match(branch, /first material[^\n]*`CreateRootSummary`/i);
  assert.match(branch, /later[^\n]*(?:summary )?delta[^\n]*`AppendSummaryDelta`/i);
  assert.match(branch, /grouped inline findings[^\n]*`SubmitInlineFindings`/i);
  assert.match(branch, /clarification question[^\n]*`PostClarificationQuestion`/i);
  assert.match(branch, /valuable[^\n]*discussion[^\n]*`ReplyToDiscussion`/i);
  assert.match(branch, /deliberate no-op[^\n]*`FinalizeRound`/i);
  assert.match(branch, /typed receipt or typed rejection/i);
  assert.match(branch, /stable[^\n]*round ID[^\n]*action ID/i);
});

test("context gatherer operationalizes iterative, read-only, sourced context", () => {
  for (const state of ["Linked", "NoneLinked", "Failed", "Unavailable"]) {
    assert.match(gatherer, new RegExp(`\\b${state}\\b`));
  }

  const workflowStart = gatherer.indexOf("## Workflow");
  const outputStart = gatherer.indexOf("## Output Format", workflowStart);
  const edgeCasesStart = gatherer.indexOf("## Edge Cases", outputStart);
  assert.ok(workflowStart >= 0, "gatherer must define an operative workflow");
  assert.ok(outputStart > workflowStart, "workflow must lead to an output contract");
  assert.ok(edgeCasesStart > outputStart, "output contract must end before edge cases");

  const workflow = gatherer.slice(workflowStart, outputStart);
  const output = gatherer.slice(outputStart, edgeCasesStart);

  assert.match(workflow, /^### Step 0: Build the Sourced Context Manifest$/m);
  assert.match(workflow, /read-only/i);
  for (const source of [
    "provider discussion",
    "checkout and history",
    "repository guidance",
    "Knowledge Base",
  ]) {
    assert.match(workflow, new RegExp(source, "i"));
  }
  assert.match(workflow, /iterate/i);
  assert.match(workflow, /material claim[\s\S]{0,240}(?:provider|commit|file|discussion)[\s\S]{0,120}(?:reference|citation)/i);

  assert.match(output, /^## Sourced Context Manifest$/m);
  assert.match(output, /Source outcome/i);
  assert.match(output, /^\*\*Material claim citations:\*\*$/m);
  for (const outcome of ["Linked", "NoneLinked", "Failed", "Unavailable", "Truncated", "Unknown"]) {
    assert.match(output, new RegExp(`\\b${outcome}\\b`));
  }
  const manifestRows = output.split(/\r?\n/).filter((line) => /^\| (?:Provider|Checkout|Repository|Knowledge)/.test(line));
  assert.equal(manifestRows.length, 5);
  for (const row of manifestRows) {
    assert.doesNotMatch(row, /\b(?:available|none-linked|failed|unavailable|truncated)\b/, `manifest outcomes must use the daemon's exact tokens: ${row}`);
  }
});

test("daemon context mode returns one schema-v1 JSON object without self-attested host evidence", () => {
  const start = gatherer.indexOf("## Review Daemon Context Manifest");
  const end = gatherer.indexOf("## Why This Matters", start);
  assert.ok(start >= 0, "gatherer must define the daemon JSON manifest branch");
  assert.ok(end > start, "daemon JSON branch must end before ordinary guidance");

  const branch = gatherer.slice(start, end);
  assert.match(branch, /literal `Bootstrap JSON:` marker/);
  assert.match(branch, /return only one JSON object/i);
  assert.match(branch, /schema version 1/i);
  assert.match(branch, /priorObservationBoundary[\s\S]{0,180}frozen sequence boundary/i);
  assert.match(branch, /do not reinterpret it as an audit-source sequence/i);
  for (const field of ["version", "engagementRoundId", "claims", "gaps"]) {
    assert.match(branch, new RegExp(`\\b${field}\\b`));
  }
  assert.match(branch, /host derives[\s\S]{0,200}gatherer identity/i);
  assert.match(branch, /host derives[\s\S]{0,260}scoped read count/i);
  assert.match(branch, /host attaches[\s\S]{0,220}immutable audit source/i);
  assert.doesNotMatch(branch, /"gathererAgentId"\s*:/);
  assert.doesNotMatch(branch, /"gathererTemplate"\s*:/);
  assert.doesNotMatch(branch, /"scopedReadCount"\s*:/);
});
