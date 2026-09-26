import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  classifyReview,
  detectDiffFeatures,
  validateDiffCoverage,
} from "../code-reviewer/skills/pr-review/scripts/classify-review.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const changedFiles = (count, options = {}) =>
  Array.from({ length: count }, (_, index) => ({
    path: options.path?.(index) ?? `src/Area/File${index + 1}.cs`,
    status: options.status ?? "modified",
    addedLines: options.addedLines ?? 1,
    removedLines: options.removedLines ?? 0,
  }));

const context = (files, diffText = "") => ({ changedFiles: files, diffText });

function singleLineChange(filePath, before, after) {
  return context(changedFiles(1, { path: () => filePath, removedLines: 1 }), [
    `diff --git a/${filePath} b/${filePath}`,
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    "@@ -1 +1 @@",
    `-${before}`,
    `+${after}`,
  ].join("\n"));
}

test("ordered numeric thresholds classify Tiny, Small, Medium, and Large", () => {
  assert.equal(classifyReview(context(changedFiles(1, { addedLines: 8 }))).tier, "TINY");
  assert.equal(classifyReview(context(changedFiles(6, { addedLines: 15, removedLines: 8 }))).tier, "SMALL");
  assert.equal(classifyReview(context(changedFiles(14, { addedLines: 35, removedLines: 15 }))).tier, "MEDIUM");
  assert.equal(classifyReview(context(changedFiles(26, { addedLines: 1 }))).tier, "LARGE");
});

test("a risk flag raises a numerically Tiny review to Small and adds its named lane", () => {
  const result = classifyReview(
    context(
      changedFiles(1, { path: () => "src/Auth/AuthorizationPolicy.cs", addedLines: 6, removedLines: 6 }),
      "+if (!user.HasPermission(action)) return Forbid();"
    )
  );

  assert.equal(result.tier, "SMALL");
  assert.ok(result.signals.riskFlags.includes("SECURITY"));
  assert.ok(result.plan.lanes.some((lane) => lane.id === "correctness-review"));
  assert.ok(result.plan.lanes.some((lane) => lane.id === "security-review"));
  assert.ok(result.plan.requiredGuides.includes("security-checklist"));
  assert.equal(result.triggeringRule, "RISK_FLOOR");
});

test("UI, styling, agent, and recovery changes select their specialist lanes", () => {
  const cases = [
    ["src/Dialog.tsx", '+return <dialog aria-label="Confirm" />;', ["accessibility-review"]],
    ["src/dialog.scss", "+.dialog { color: red; }", ["accessibility-review", "css-consistency-review"]],
    ["src/Panel.vue", '+<div class="panel">Text</div>', ["accessibility-review", "css-consistency-review"]],
    ["src/styles/tokens.ts", '+export const spacing = "8px";', ["accessibility-review", "css-consistency-review"]],
    ["src/Panel.js", "+const Panel = styled.div`color: red;`;", ["accessibility-review", "css-consistency-review"]],
    ["plugin/agents/helper.md", "+Use the supplied context.", ["agent-contract-review"]],
    ["plugin/skills/helper/SKILL.md", "+Read the tool result.", ["agent-contract-review"]],
    [".github/prompts/helper.prompt.md", "+Inspect the handoff.", ["agent-contract-review"]],
    [".mcp.json", '+{"mcpServers": {}}', ["agent-contract-review"]],
    ["src/tools.ts", '+server.registerTool("read", {}, handler);', ["agent-contract-review"]],
    ["src/client.ts", "+const timeout = 5000;", ["reliability-review"]],
    ["deploy/service.yaml", "+readinessProbe:", ["reliability-review"]],
    ["src/Worker.cs", "+await receiver.CompleteMessageAsync(message);", ["reliability-review"]],
  ];
  for (const [filePath, diffText, expectedAgents] of cases) {
    const result = classifyReview(context(changedFiles(1, { path: () => filePath }), diffText));
    assert.notEqual(result.tier, "TINY", filePath);
    for (const agentId of expectedAgents) {
      const selected = result.plan.lanes.find((item) => item.id === agentId);
      assert.ok(selected, `${filePath} must select ${agentId}`);
      const definition = readFileSync(path.join(root, "code-reviewer/agents", `${agentId}.md`), "utf8");
      assert.ok(definition.includes(`modelintelligence: ${selected.modelIntelligence}`), agentId);
      assert.ok(definition.includes(`effort: ${selected.effort}`), agentId);
    }
    assert.equal(new Set(result.plan.lanes.map((item) => item.id)).size, result.plan.lanes.length);
  }
});

test("destructive operations and removed guards select the invariant lane", () => {
  for (const [before, after] of [
    ["Guard.NotNull(value);", "Save(value);"],
    ["if (!IsValid(value)) {", "{"],
    ["if (expired) return BadRequest();", "Save(value);"],
    ["[Range(1, 10)]", ""],
    ["var version = item.RowVersion;", "Save(item);"],
    ["return;", "await collection.DeleteManyAsync(filter);"],
    ["return;", "await db.Users.Where(predicate).ExecuteDeleteAsync();"],
    ["return;", "await collection.deleteOne(filter);"],
    ["return;", "DELETE FROM records;"],
    ["return;", "DROP TABLE records;"],
    ["return;", "ON DELETE CASCADE"],
    ["await collection.DeleteManyAsync(tenantFilter);", "await collection.DeleteManyAsync(all);"],
    ["collection.Remove(item);", "Save(item);"],
  ]) {
    const input = singleLineChange("src/Store.cs", before, after);
    assert.equal(validateDiffCoverage(input).complete, true);
    const result = classifyReview(input);
    assert.equal(result.tier, "SMALL", before);
    assert.ok(result.signals.riskFlags.includes("INVARIANT_DELETION"), `${before} -> ${after}`);
    const lane = result.plan.lanes.find(({ id }) => id === "invariant-deletion-review");
    assert.equal(lane.modelIntelligence, 4);
    assert.equal(lane.effort, "high");
    assert.equal(result.plan.lanes.filter(({ id }) => id === lane.id).length, 1);
  }
});

test("removing a multi-line guard selects the invariant lane", () => {
  const filePath = "src/Store.cs";
  const diffText = [
    `diff --git a/${filePath} b/${filePath}`,
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    "@@ -1,3 +1 @@",
    "-if (amount <= 0) {",
    "-  throw new ArgumentOutOfRangeException();",
    "-}",
    "+Save(amount);",
  ].join("\n");
  const result = classifyReview(context(changedFiles(1, {
    path: () => filePath, removedLines: 3,
  }), diffText));
  assert.ok(result.signals.riskFlags.includes("INVARIANT_DELETION"));
  assert.ok(result.plan.lanes.some(({ id }) => id === "invariant-deletion-review"));
});

test("invariant routing ignores ordinary deleted statements and prose", () => {
  for (const file of ["docs/safety.md", "notes.txt"]) {
    const result = classifyReview(singleLineChange(file, "Guard.NotNull(value);", "collection.DeleteManyAsync(all);"));
    assert.deepEqual(result.signals.riskFlags, []);
  }
  const result = classifyReview(singleLineChange("src/Counter.cs", "count += 1;", "count += 2;"));
  assert.ok(!result.signals.riskFlags.includes("INVARIANT_DELETION"));
  assert.ok(!result.plan.lanes.some(({ id }) => id === "invariant-deletion-review"));
});

test("compliance signals nominate a reviewer without declaring applicability", () => {
  for (const [filePath, before, after] of [
    ["deploy/cluster.yaml", "region: us-east", "region: eu-west"],
    ["src/HealthData.cs", "return record;", "Store(ePHI);"],
    ["src/Retention.cs", "retentionDays = 30;", "retentionDays = 7;"],
    ["src/TenantPolicy.cs", "GoLocalEnabled = false;", "GoLocalEnabled = true;"],
    ["infra/main.bicep", "location: westus", "location: westeurope"],
    ["src/residency/policy.ts", "export const allowed = old;", "export const allowed = next;"],
  ]) {
    const result = classifyReview(singleLineChange(filePath, before, after));
    assert.ok(result.signals.riskFlags.includes("COMPLIANCE"), filePath);
    assert.ok(result.plan.lanes.some(({ id }) => id === "compliance-review"), filePath);
  }
  const prose = classifyReview(singleLineChange("docs/policies.md", "old policy", "HIPAA region: eu-west"));
  assert.ok(!prose.signals.riskFlags.includes("COMPLIANCE"));
  const unrelated = classifyReview(singleLineChange("src/Counter.cs", "return count;", "return count + 1;"));
  assert.ok(!unrelated.plan.lanes.some(({ id }) => id === "compliance-review"));
});

test("compliance specialist requires project-specific stage and obligation evidence", () => {
  const agent = readFileSync(path.join(root, "code-reviewer/agents/compliance-review.md"), "utf8");
  assert.match(agent, /PoC.*Development \(not released\).*Alpha.*Production.*Unknown/s);
  assert.match(agent, /Go Local/);
  assert.match(agent, /question when applicability is unresolved/);
  assert.match(agent, /PoC using real[\s\S]{0,50}regulated data/);
  assert.match(agent, /not legal advice/);
  assert.match(agent, /finding-schema\.md/);
});

test("bare, suffixed, and nested style modules select accessibility and CSS review", () => {
  for (const filePath of [
    "src/theme.ts", "src/themes.js", "src/styles.ts", "src/tokens.json",
    "src/theme.dark.ts", "src/styles.module.js", "src/theme/palette.ts",
    "src/styles/tokens.ts", "src/tokens/colors.json",
  ]) {
    const input = singleLineChange(filePath, '{"primaryColor":"#ffffff"}', '{"primaryColor":"#eeeeee"}');
    assert.equal(validateDiffCoverage(input).complete, true, filePath);
    const result = classifyReview(input);
    assert.equal(result.tier, "SMALL", filePath);
    for (const id of ["accessibility-review", "css-consistency-review"]) {
      assert.ok(result.plan.lanes.some((lane) => lane.id === id), `${filePath}: ${id}`);
    }
  }
  for (const filePath of ["src/themeLoader.ts", "src/styles.test.txt", "docs/theme.ts"]) {
    const result = classifyReview(singleLineChange(filePath, "const value = 1;", "const value = 2;"));
    assert.deepEqual(result.signals.riskFlags, [], filePath);
  }
});

test("quoted resilience settings select the same risk lanes as unquoted settings", () => {
  for (const [filePath, before, after] of [
    ["config/client.json", '{"timeout":5000}', '{"timeout":0}'],
    ["config/client.json", '{"retries":3}', '{"retries":0}'],
    ["config/client.yaml", "'timeout': 5000", "'timeout': 0"],
    ["config/client.yaml", '"backoff": 100', '"backoff": 0'],
    ["config/client.yaml", "timeout: 5000", "timeout: 0"],
    ["config/client.json", '{"timeout":5000}', "{}"],
  ]) {
    const input = singleLineChange(filePath, before, after);
    assert.equal(validateDiffCoverage(input).complete, true, filePath);
    const result = classifyReview(input);
    assert.equal(result.tier, "SMALL", `${filePath}: ${after}`);
    for (const id of ["reliability-review", "feature-flag-reviewer"]) {
      assert.ok(result.plan.lanes.some((lane) => lane.id === id), `${filePath}: ${after}: ${id}`);
    }
  }
  const prose = singleLineChange("docs/client.md", '{"timeout":5000}', '{"timeout":0}');
  assert.deepEqual(classifyReview(prose).signals.riskFlags, []);
});

test("quoted health and shutdown settings select reliability review", () => {
  for (const [filePath, before, after] of [
    ["deploy/service.json", '{"terminationGracePeriodSeconds":30}', '{"terminationGracePeriodSeconds":0}'],
    ["deploy/service.json", '{"readinessProbe":{}}', "{}"],
    ["deploy/service.yaml", "'livenessProbe': {}", "'livenessProbe': null"],
    ["deploy/service.yaml", '"startupProbe": {}', '"startupProbe": null'],
  ]) {
    const input = singleLineChange(filePath, before, after);
    assert.equal(validateDiffCoverage(input).complete, true, filePath);
    const result = classifyReview(input);
    assert.equal(result.tier, "SMALL", `${filePath}: ${after}`);
    assert.ok(result.plan.lanes.some((lane) => lane.id === "reliability-review"), filePath);
  }
});

test("new specialist signals ignore ordinary prose and unrelated code", () => {
  const filePath = "docs/review.md";
  const diffText = [
    `diff --git a/${filePath} b/${filePath}`,
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    "@@ -1 +1 @@",
    "-Review notes",
    '+McpServer registerTool aria-label="x" class="x" timeout = 1 styled.div',
  ].join("\n");
  assert.deepEqual(detectDiffFeatures(context(changedFiles(1, { path: () => filePath }), diffText)).riskFlags, []);
  const plainCode = classifyReview(context(changedFiles(1), "+return count + 1;"));
  assert.deepEqual(plainCode.plan.lanes.map((item) => item.id), ["correctness-review", "temp-code-review"]);
  const ui = classifyReview(context(changedFiles(1, { path: () => "src/Button.tsx" }), "+return <button>OK</button>;"));
  assert.ok(!ui.plan.lanes.some((item) => item.id === "css-consistency-review"));
});

test("removing UI, tool, or recovery protections still triggers review", () => {
  for (const [change, agentId] of [
    ['-element.setAttribute("aria-label", "Confirm");', "accessibility-review"],
    ['-server.registerTool("read", {}, handler);', "agent-contract-review"],
    ["-const timeout = 5000;", "reliability-review"],
  ]) {
    const result = classifyReview(context(changedFiles(1, { path: () => "src/changed.ts" }), change));
    assert.ok(result.plan.lanes.some((item) => item.id === agentId), agentId);
  }
});

test("CamelCase DTO, request, and response names trigger schema compatibility review", () => {
  for (const typeName of ["ThingDto", "CreateThingRequest", "ThingResponse"]) {
    const result = classifyReview(
      context(
        changedFiles(1, { path: () => `src/Api/${typeName}.cs`, addedLines: 8, removedLines: 2 }),
        `+public sealed record ${typeName}(string Value);\n`
      )
    );

    assert.ok(result.signals.riskFlags.includes("SCHEMA_COMPATIBILITY"), typeName);
    assert.ok(result.plan.lanes.some((lane) => lane.id === "schema-compatibility-review"), typeName);
  }
});

test("the classifier, not prose, removes history for an all-new-file review", () => {
  const result = classifyReview(
    context(changedFiles(3, { status: "added", addedLines: 20 }))
  );
  assert.equal(result.tier, "SMALL");
  assert.equal(result.signals.allFilesNew, true);
  assert.ok(!result.plan.lanes.some((lane) => lane.id === "history-context-review"));
});

test("new public types raise the floor to Medium", () => {
  const result = classifyReview(
    context(
      changedFiles(2, { addedLines: 10 }),
      "+public interface IOrderGateway\n+{\n+}\n"
    )
  );

  assert.equal(result.tier, "MEDIUM");
  assert.equal(result.triggeringRule, "MEDIUM_NEW_PUBLIC_TYPE");
});

test("DI and project-reference changes route through Medium architecture review", () => {
  const result = classifyReview(
    context(
      changedFiles(2, { addedLines: 8, removedLines: 2 }),
      "+services.AddScoped<IOrderGateway, OrderGateway>();\n"
    )
  );

  assert.equal(result.tier, "MEDIUM");
  assert.equal(result.triggeringRule, "MEDIUM_ARCHITECTURE_CHANGE");
  assert.equal(result.signals.architectureChange, true);
  assert.ok(result.plan.lanes.some((lane) => lane.id === "architecture-review"));
});

test("new project or module and three top-level areas route to Large", () => {
  const newProject = classifyReview(
    context([
      { path: "src/NewSubsystem/NewSubsystem.csproj", status: "added", addedLines: 20, removedLines: 0 },
    ])
  );
  assert.equal(newProject.tier, "LARGE");
  assert.equal(newProject.plan.workspaceMode, "DEEP");

  const broad = classifyReview(
    context([
      { path: "src/App.cs", status: "modified", addedLines: 2, removedLines: 1 },
      { path: "infra/deploy.yml", status: "modified", addedLines: 2, removedLines: 1 },
      { path: "docs/design.md", status: "modified", addedLines: 2, removedLines: 1 },
    ])
  );
  assert.equal(broad.tier, "LARGE");
  assert.equal(broad.triggeringRule, "LARGE_TOP_LEVEL_AREAS");
});

test("provider-style one-letter file statuses are normalized", () => {
  const result = classifyReview(context([
    { path: "src/NewSubsystem/NewSubsystem.csproj", status: "A", addedLines: 20, removedLines: 0 },
  ]));
  assert.equal(result.tier, "LARGE");
  assert.equal(result.signals.allFilesNew, true);
});

test("recognized rename diffs accept provider rename statuses", () => {
  const diffText = [
    "diff --git a/src/Old.cs b/src/New.cs",
    "similarity index 100%",
    "rename from src/Old.cs",
    "rename to src/New.cs",
  ].join("\n");
  const coverage = validateDiffCoverage(context([{
    path: "src/New.cs",
    status: "renamed",
    addedLines: 0,
    removedLines: 0,
  }], diffText));

  assert.equal(coverage.complete, true);
  assert.deepEqual(coverage.metadataMismatches, []);
});

test("a full diff must cover every file declared by the context pack", () => {
  const diffText = [
    "diff --git a/src/A.cs b/src/A.cs",
    "--- a/src/A.cs",
    "+++ b/src/A.cs",
    "@@ -1 +1 @@",
    "-old",
    "+new",
  ].join("\n");
  const coverage = validateDiffCoverage(context([
    ...changedFiles(1, { path: () => "src/A.cs", removedLines: 1 }),
    ...changedFiles(1, { path: () => "src/B.cs" }),
  ], diffText));

  assert.equal(coverage.complete, false);
  assert.deepEqual(coverage.missingFromDiff, ["src/B.cs"]);

  const emptyDiff = validateDiffCoverage(context(
    changedFiles(1, { path: () => "src/A.cs" }),
    "",
  ));
  assert.equal(emptyDiff.complete, false);
  assert.deepEqual(emptyDiff.missingFromDiff, ["src/A.cs"]);

  const noReviewableChange = validateDiffCoverage(context([], ""));
  assert.equal(noReviewableChange.complete, false);
  assert.equal(noReviewableChange.invalidDiff, true);

  const headerOnly = validateDiffCoverage(context([
    ...changedFiles(1, { path: () => "src/A.cs", addedLines: 0, removedLines: 0 }),
  ], "diff --git a/src/A.cs b/src/A.cs\n"));
  assert.equal(headerOnly.complete, false);
  assert.equal(headerOnly.invalidDiff, true);

  const staleMetadata = validateDiffCoverage(context([
    ...changedFiles(1, { path: () => "src/A.cs", status: "added", addedLines: 99, removedLines: 0 }),
  ], diffText));
  assert.equal(staleMetadata.complete, false);
  assert.deepEqual(staleMetadata.metadataMismatches, [{
    path: "src/A.cs",
    supplied: { status: "added", addedLines: 99, removedLines: 0 },
    parsed: { status: "modified", addedLines: 1, removedLines: 1 },
  }]);
});

test("a uniform mechanical change is capped at Small despite file count", () => {
  const hunks = Array.from({ length: 45 }, (_, index) => [
    `diff --git a/src/A${index}.cs b/src/A${index}.cs`,
    `--- a/src/A${index}.cs`,
    `+++ b/src/A${index}.cs`,
    "@@ -1 +1 @@",
    "-namespace Old.Product;",
    "+namespace New.Product;",
  ].join("\n")).join("\n");

  const result = classifyReview(context(changedFiles(45, { addedLines: 1, removedLines: 1 }), hunks));
  assert.equal(result.signals.mechanical, true);
  assert.equal(result.tier, "SMALL");
  assert.equal(result.triggeringRule, "MECHANICAL_CAP");
  assert.equal(result.plan.workspaceMode, "LIGHTWEIGHT");
});

test("Tiny omits the grader unless a High finding survives; larger tiers have fixed reasoning rules", () => {
  const tiny = classifyReview(context(changedFiles(1, { addedLines: 8 })));
  assert.deepEqual(tiny.plan.reasoningAgents, [
    { id: "review-grader", when: "HIGH_OR_CRITICAL_SURVIVES", modelIntelligence: 5, effort: "high" },
  ]);

  const small = classifyReview(context(changedFiles(3, { addedLines: 20 })));
  assert.ok(small.plan.reasoningAgents.some((agent) => agent.id === "review-grader" && agent.when === "ALWAYS"));

  const large = classifyReview(context(changedFiles(26, { addedLines: 50 })));
  assert.ok(large.plan.reasoningAgents.some((agent) => agent.id === "root-cause-synthesizer"));
  assert.ok(large.plan.reasoningAgents.some((agent) => agent.id === "review-adjudicator"));
  assert.equal(large.plan.splitCorrectnessByArea, true);
  assert.equal(
    tiny.escalation.action,
    "APPLY_NEXT_TIER_PLAN_AND_RUN_NEWLY_REQUIRED_WORK",
  );
});

test("every emitted lane has closed-vocabulary model intelligence and effort", () => {
  const result = classifyReview(
    context(changedFiles(14, { addedLines: 35, removedLines: 15 }), "+try { await client.SendAsync(request); } catch (Exception ex) { logger.LogError(ex, \"failed\"); }\n")
  );

  for (const lane of [...result.plan.lanes, ...result.plan.reasoningAgents]) {
    assert.ok(Number.isInteger(lane.modelIntelligence), `${lane.id} missing modelIntelligence`);
    assert.ok(lane.modelIntelligence >= 1 && lane.modelIntelligence <= 6, `${lane.id} tier out of range`);
    assert.ok(["low", "medium", "high", "xhigh"].includes(lane.effort), `${lane.id} effort is not closed-vocabulary`);
  }
});

test("agent frontmatter keeps the approved intelligence distribution", () => {
  const expected = {
    "temp-code-review": 1,
    "duplicate-code-detector": 1,
    "finding-verifier": 1,
    "code-simplifier": 1,
    "pr-context-gatherer": 1,
    "euii-leak-detector": 2,
    "feature-flag-reviewer": 2,
    "history-context-review": 2,
    "class-design-simplifier": 2,
    "nscript-review": 3,
    "orleans-review": 3,
    "test-coverage-review": 3,
    "performance-review": 3,
    "accessibility-review": 2,
    "css-consistency-review": 2,
    "agent-contract-review": 3,
    "security-review": 4,
    "invariant-deletion-review": 4,
    "compliance-review": 4,
    "reliability-review": 4,
    "review-performance-judge": 3,
    "correctness-review": 4,
    "exception-handling-review": 4,
    "schema-compatibility-review": 4,
    "architecture-review": 4,
    "over-engineering-review": 4,
    "review-grader": 5,
    "root-cause-synthesizer": 5,
    "remediation-planner": 5,
    "review-adjudicator": 6,
  };

  for (const [name, tier] of Object.entries(expected)) {
    const content = readFileSync(path.join(root, "code-reviewer", "agents", `${name}.md`), "utf8");
    assert.match(content, new RegExp(`^modelintelligence: ${tier}$`, "m"), `${name} tier drifted`);
    assert.doesNotMatch(content, /^model:/m, `${name} pins a model instead of using the intelligence contract`);
  }
});

test("documented employee levels use the zero-based intelligence mapping", () => {
  const catalog = readFileSync(path.join(root, "code-reviewer/skills/pr-review/reference/agent-dispatch.md"), "utf8");
  assert.match(catalog, /0 = L1/);
  for (let intelligence = 1; intelligence <= 6; intelligence++) {
    assert.ok(catalog.includes(`| **${intelligence}** | L${intelligence + 1} `), `intelligence ${intelligence}`);
  }
});

test("feature detection exposes stable counts and closed-vocabulary risk flags", () => {
  const features = detectDiffFeatures(
    context(
      [{ path: "src/Telemetry/UserLogger.cs", status: "modified", addedLines: 2, removedLines: 1 }],
      "+logger.LogInformation(\"User {Email}\", user.Email);\n"
    )
  );
  assert.equal(features.filesChanged, 1);
  assert.equal(features.changedLines, 3);
  assert.deepEqual(features.riskFlags, ["EUII"]);
});

test("NScript routing requires framework evidence rather than a project-specific client path", () => {
  const ordinaryClient = classifyReview(context(
    changedFiles(1, { path: () => "src/Client/ViewModel.cs", addedLines: 1 }),
    "+class ViewModel : ObservableObject { }\n",
  ));
  assert.ok(!ordinaryClient.signals.riskFlags.includes("NSCRIPT"));
  assert.ok(!ordinaryClient.plan.lanes.some((lane) => lane.id === "nscript-review"));

  const nscript = classifyReview(context(
    changedFiles(1, { path: () => "packages/ui/Ui.csproj", addedLines: 1 }),
    '+<Sdk Name="Mcqdb.NScript.Sdk" />\n',
  ));
  assert.ok(nscript.signals.riskFlags.includes("NSCRIPT"));
  assert.ok(nscript.plan.lanes.some((lane) => lane.id === "nscript-review"));
});

test("the skill spine names one authoritative classifier and separates tier from workspace mode", () => {
  const skill = readFileSync(path.join(root, "code-reviewer", "skills", "pr-review", "SKILL.md"), "utf8");
  assert.match(skill, /classify-review\.mjs/);
  assert.match(skill, /\$\{CLAUDE_SKILL_DIR\}\/reference\//);
  assert.match(skill, /\$\{CLAUDE_PLUGIN_ROOT\}\/agents\//);
  assert.match(skill, /code-reviewer:<agent-id>/);
  assert.match(skill, /any planned lane still cannot return a usable result/);
  assert.match(skill, /stop before grading or posting; report the incomplete review/);
  assert.doesNotMatch(skill, /Agent dispatch fails.*skip that agent/);
  assert.match(skill, /TINY \| SMALL \| MEDIUM \| LARGE/);
  assert.match(skill, /review tier is not (?:the same as )?(?:a )?workspace mode/i);
  assert.match(skill, /upward only/i);
  assert.doesNotMatch(skill, /Fast path gate/i);
  assert.doesNotMatch(skill, /mandatory for every review/i);
});

test("review skill references and planned bundled agents resolve within the plugin", () => {
  const skill = readFileSync(path.join(root, "code-reviewer/skills/pr-review/SKILL.md"), "utf8");
  const skillDir = path.join(root, "code-reviewer/skills/pr-review");
  const pluginRoot = path.join(root, "code-reviewer");

  for (const [, relativePath] of skill.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/((?:reference|scripts)\/[\w.-]+)/g)) {
    assert.ok(existsSync(path.join(skillDir, relativePath)), `missing skill resource: ${relativePath}`);
  }
  for (const [, relativePath] of skill.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/((?:references|agents)\/[\w.-]+)/g)) {
    assert.ok(existsSync(path.join(pluginRoot, relativePath)), `missing plugin resource: ${relativePath}`);
  }

  for (const files of [changedFiles(1), changedFiles(6), changedFiles(14), changedFiles(26)]) {
    const plan = classifyReview(context(files)).plan;
    for (const { id } of [...plan.lanes, ...plan.reasoningAgents, plan.verification.firstLens]) {
      assert.ok(existsSync(path.join(pluginRoot, "agents", `${id}.md`)), `missing bundled agent: ${id}`);
    }
  }
});

test("review team guidance names bundled workers, excludes the caller, and keeps a bounded specialist target", () => {
  const skill = readFileSync(path.join(root, "code-reviewer/skills/pr-review/SKILL.md"), "utf8");
  const roster = skill.split("## Review Team\n")[1]?.split("## Step 0a:")[0];
  assert.ok(roster, "missing team-building guidance in the skill entrypoint");
  assert.match(roster, /3-7 specialist agents per review/);
  assert.match(roster, /not another classifier/);
  assert.match(roster, /drop required risk coverage/);
  assert.match(roster, /Do not dispatch `code-reviewer:code-reviewer` from this workflow/);
  assert.doesNotMatch(roster, /^\| `code-reviewer` \|/m);

  for (const file of readdirSync(path.join(root, "code-reviewer/agents"))) {
    if (!file.endsWith(".md")) continue;
    const agentId = path.basename(file, ".md");
    if (agentId === "code-reviewer") continue;
    const row = roster.split("\n").find((line) => line.startsWith(`| \`${agentId}\` |`));
    assert.ok(row, `missing one-line role for ${agentId}`);
    assert.ok(row.split("|")[2].trim().length > 20, `missing expected contribution for ${agentId}`);
  }
});

test("context gathering precedes file grouping and supplies specialist scope", () => {
  const skill = readFileSync(path.join(root, "code-reviewer/skills/pr-review/SKILL.md"), "utf8");
  const step = skill.split("2. **Gather context, then group changed files**:")[1]?.split("3. **Understand the changes**:")[0];
  assert.ok(step, "missing context-first file grouping step");
  assert.match(step, /code-reviewer:pr-context-gatherer/);
  assert.match(step, /First establish the PR's intent and repository context\. Then group/);
  assert.match(step, /Account for every changed file/);
  assert.match(step, /supporting evidence, relevant specialist perspectives/);
  assert.match(step, /Wait for the selected context path's result before accepting the file groups/);
  assert.match(step, /For `daemon-direct`/);
  assert.match(step, /For `deterministic-offline`/);
  assert.match(step, /In default enrichment, read/);
  assert.match(step, /does not replace the classifier/);
});

test("PR context gatherer loads its skill and calibrates scrutiny by lifecycle and deployment", () => {
  const agent = readFileSync(path.join(root, "code-reviewer/agents/pr-context-gatherer.md"), "utf8");
  const frontmatter = agent.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];

  assert.ok(frontmatter, "missing pr-context-gatherer frontmatter");
  assert.match(frontmatter, /^skills:\r?\n\s+- pr-context$/m);
  assert.match(agent, /`PoC`, `Development \(not released\)`,\s+`Alpha`, `Production`, or `Unknown`/);
  assert.match(agent, /Account for every changed file/);
  assert.match(agent, /Deployment status.*`Deployed`.*`Deployment-affecting`.*`Not deployed`/s);
  assert.match(agent, /Use `minimal` for isolated samples, documentation, and generated\/vendor output/);
  assert.match(agent, /emit a focused question asking the caller or author/);
  assert.match(agent, /\*\*Knowledge Base candidate\*\*/);
  assert.match(agent, /Do not add top-level JSON fields/);
});

test("new specialists preserve the shared finding and evidence contract", () => {
  for (const agentId of ["accessibility-review", "css-consistency-review", "agent-contract-review", "security-review", "reliability-review"]) {
    const content = readFileSync(path.join(root, "code-reviewer/agents", `${agentId}.md`), "utf8");
    assert.ok(content.includes(`agent: "${agentId}"`), agentId);
    assert.match(content, /\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/pr-review\/reference\/finding-schema\.md/);
    assert.match(content, /at most 5 findings/);
    assert.match(content, /id: null/);
    assert.match(content, /no `blocker`/);
    assert.match(content, /coverageNote/);
    assert.match(content, /## When to Invoke/);
    assert.match(content, /## Boundaries and Evidence/);
  }
});

test("routing references do not reintroduce competing size heuristics", () => {
  const modes = readFileSync(path.join(root, "code-reviewer", "skills", "pr-review", "reference", "review-modes.md"), "utf8");
  const dispatch = readFileSync(path.join(root, "code-reviewer", "skills", "pr-review", "reference", "agent-dispatch.md"), "utf8");
  assert.match(modes, /review-plan\.json/);
  assert.match(dispatch, /review-plan\.json/);
  assert.doesNotMatch(modes, /Gate 1: Fast Path/);
  assert.doesNotMatch(dispatch, /Size-based dispatch heuristics/);
  assert.doesNotMatch(dispatch, /30\+ files/);
});

test("external-agent selection has one stable order and no duplicate simplifier route", () => {
  const dispatch = readFileSync(path.join(root, "code-reviewer/skills/pr-review/reference/agent-dispatch.md"), "utf8");
  assert.match(dispatch, /Evaluate the matrix from top to bottom/);
  assert.match(dispatch, /MEDIUM: dispatch the first two eligible available agents/);
  assert.doesNotMatch(dispatch, /\| `code-simplifier:code-simplifier` \| PR introduces verbose/);
});

test("the existing over-engineering lane loads the implementation-fit checks", () => {
  const agent = readFileSync(path.join(root, "code-reviewer/agents/over-engineering-review.md"), "utf8");
  const skill = readFileSync(path.join(root, "code-reviewer/skills/over-engineering-review/SKILL.md"), "utf8");
  assert.match(agent, /code-reviewer:over-engineering-review/);
  assert.match(agent, /Implementation-Fit Checks/);
  assert.match(agent, /invented APIs/i);
  assert.match(agent, /hollow tests/i);
  assert.match(agent, /restated comments/i);
  assert.match(agent, /one primary owner/);
  assert.match(agent, /coverageNote/);

  const matrix = skill.split("## Implementation-Fit Checks")[1]?.split("## How to Use This Catalog")[0];
  assert.ok(matrix, "missing bounded implementation-fit methodology");
  for (const pattern of [
    "Superficial Completion", "Fabricated Integration", "Success-Shaped Fallback",
    "Hollow Tests", "Misleading Documentation", "Workaround Accumulation",
  ]) {
    const row = matrix.split("\n").find((line) => line.startsWith(`| ${pattern} |`));
    assert.ok(row, `missing pattern: ${pattern}`);
    const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
    assert.equal(cells.length, 5, `${pattern}: pattern, signal, evidence, exclusion, owner`);
    assert.ok(cells.slice(1).every((cell) => cell.length > 15), `${pattern}: incomplete review guidance`);
  }
});

test("over-engineering guidance requires evidence and rejects authorship and shape-only findings", () => {
  const agent = readFileSync(path.join(root, "code-reviewer/agents/over-engineering-review.md"), "utf8");
  const skill = readFileSync(path.join(root, "code-reviewer/skills/over-engineering-review/SKILL.md"), "utf8");
  assert.match(skill, /A pattern is a lead, not a finding/);
  assert.match(skill, /Never infer AI authorship/);
  assert.match(skill, /single implementation or caller/);
  assert.match(skill, /non-nullable annotation alone/);
  assert.match(skill, /actual dependency version/);
  assert.match(skill, /not the absence of a word in a ticket/);
  assert.match(skill, /Do not remove existing tests/);
  assert.match(agent, /requiredOutcome.*suggestedPath.*doneWhen/s);
  assert.doesNotMatch(skill, /giveaway that the code wasn't reviewed/);
  assert.doesNotMatch(skill, /40%\+/);
  assert.doesNotMatch(agent, /flag them as LOW for "should be in own commit/);
});

test("files at the repository root share one top-level area", () => {
  const result = classifyReview(context([
    { path: "package.json", status: "modified", addedLines: 1, removedLines: 1 },
    { path: "package-lock.json", status: "modified", addedLines: 1, removedLines: 1 },
    { path: "src/index.ts", status: "modified", addedLines: 1, removedLines: 1 },
  ]));
  assert.deepEqual(result.signals.topLevelAreas, ["(root)", "src"]);
  assert.notEqual(result.tier, "LARGE");
});

test("prose that mentions a risk topic raises no risk flag", () => {
  const diffText = [
    "diff --git a/docs/review.md b/docs/review.md",
    "--- a/docs/review.md",
    "+++ b/docs/review.md",
    "@@ -1 +1 @@",
    "-Orleans grains and NScript need a request/response schema review.",
    "+Check permission, performance, and the feature flag for each request.",
  ].join("\n");
  const result = classifyReview(context([{ path: "docs/review.md", status: "modified", addedLines: 1, removedLines: 1 }], diffText));
  assert.deepEqual(result.signals.riskFlags, []);
});

test("the feature-flag lane runs for risky unflagged changes, not for already-flagged ones", () => {
  const change = (line) => [
    "diff --git a/src/Client.cs b/src/Client.cs",
    "--- a/src/Client.cs",
    "+++ b/src/Client.cs",
    "@@ -1 +1 @@",
    "-var timeout = 30;",
    `+${line}`,
  ].join("\n");
  const files = [{ path: "src/Client.cs", status: "modified", addedLines: 1, removedLines: 1 }];

  const unflagged = classifyReview(context(files, change("var timeout = 5;")));
  assert.ok(unflagged.signals.riskFlags.includes("FEATURE_FLAG"));
  assert.ok(unflagged.plan.lanes.some((lane) => lane.id === "feature-flag-reviewer"));

  const flagOnly = classifyReview(context(files, change("if (await featureManager.IsEnabledAsync(\"Fast\")) Go();")));
  assert.ok(!flagOnly.signals.riskFlags.includes("FEATURE_FLAG"));
});

test("a real git diff validates: frontmatter removal, deleted file, rename, and a path with spaces", () => {
  const diffText = [
    "diff --git a/agents/x.md b/agents/x.md",
    "--- a/agents/x.md",
    "+++ b/agents/x.md",
    "@@ -1,3 +1,2 @@",
    "----",
    " name: x",
    "-model: opus",
    "diff --git a/gone.md b/gone.md",
    "deleted file mode 100644",
    "--- a/gone.md",
    "+++ /dev/null",
    "@@ -1,2 +0,0 @@",
    "----",
    "--- trailing",
    "diff --git a/src/Old.cs b/src/New.cs",
    "similarity index 90%",
    "rename from src/Old.cs",
    "rename to src/New.cs",
    "--- a/src/Old.cs",
    "+++ b/src/New.cs",
    "@@ -1 +1 @@",
    "-a",
    "+b",
    "diff --git a/a b/c.md b/a b/c.md",
    "--- a/a b/c.md",
    "+++ b/a b/c.md",
    "@@ -1 +1 @@",
    "-a",
    "+b",
  ].join("\n");
  const coverage = validateDiffCoverage(context([
    { path: "agents/x.md", status: "modified", addedLines: 0, removedLines: 2 },
    { path: "gone.md", status: "deleted", addedLines: 0, removedLines: 2 },
    { path: "src/New.cs", status: "edit, rename", addedLines: 1, removedLines: 1 },
    { path: "a b/c.md", status: "M" },
  ], diffText));
  assert.deepEqual(coverage, {
    complete: true, checked: true, invalidDiff: false, missingFromDiff: [], unexpectedInDiff: [], metadataMismatches: [],
  });
});

test("the classifier CLI plans from changedFiles alone, rejects bad context, and runs through a symlinked path", () => {
  const script = path.join(root, "code-reviewer/skills/pr-review/scripts/classify-review.mjs");
  const dir = mkdtempSync(path.join(tmpdir(), "classify-cli-"));
  const write = (name, text) => { const p = path.join(dir, name); writeFileSync(p, text); return p; };
  const ctx = write("ctx.json", JSON.stringify({ changedFiles: [{ path: "src/A.cs", status: "modified" }] }));
  const run = (args) => spawnSync(process.execPath, args, { encoding: "utf8" });

  const ok = run([script, "--context", ctx]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).tier, "TINY");

  for (const bad of [write("null.json", "null"), path.join(dir, "missing.json")]) {
    const res = run([script, "--context", bad]);
    assert.equal(res.status, 2);
    assert.doesNotMatch(res.stderr, /\n\s+at /, "no stack trace");
  }

  const link = path.join(dir, "linked-scripts");
  try {
    symlinkSync(path.dirname(script), link, "junction");
  } catch {
    return;
  }
  const linked = run([path.join(link, "classify-review.mjs"), "--context", ctx]);
  assert.equal(linked.status, 0, linked.stderr);
  assert.equal(JSON.parse(linked.stdout).tier, "TINY");
});
