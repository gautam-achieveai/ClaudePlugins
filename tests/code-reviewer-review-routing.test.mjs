import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
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
  assert.ok(result.plan.requiredGuides.includes("security-checklist"));
  assert.equal(result.triggeringRule, "RISK_FLOOR");
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
  assert.match(skill, /TINY \| SMALL \| MEDIUM \| LARGE/);
  assert.match(skill, /review tier is not (?:the same as )?(?:a )?workspace mode/i);
  assert.match(skill, /upward only/i);
  assert.doesNotMatch(skill, /Fast path gate/i);
  assert.doesNotMatch(skill, /mandatory for every review/i);
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

test("the large-review scope lane names the missing AI-slop patterns", () => {
  const content = readFileSync(path.join(root, "code-reviewer", "agents", "over-engineering-review.md"), "utf8");
  assert.match(content, /invented APIs/i);
  assert.match(content, /hollow tests/i);
  assert.match(content, /restated comments/i);
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
