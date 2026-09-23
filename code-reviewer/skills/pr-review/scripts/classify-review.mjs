#!/usr/bin/env node
// classify-review.mjs — deterministic review breadth and lane planner.
//
// Usage:
//   node classify-review.mjs --context <context.json> [--diff <diff.patch>] [--out <plan.json>]
//
// The context pack supplies changedFiles and normally diffPath. The script emits
// one closed-vocabulary tier and a complete plan. Models execute the plan; they
// do not estimate size, reconcile competing heuristics, or choose model names.

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseGitDiff } from "./diff-parse.mjs";

export const REVIEW_TIERS = ["TINY", "SMALL", "MEDIUM", "LARGE"];

const RISK_ORDER = [
  "SECURITY",
  "SCHEMA_COMPATIBILITY",
  "ORLEANS",
  "NSCRIPT",
  "FEATURE_FLAG",
  "EUII",
  "EXCEPTION_HANDLING",
  "PERFORMANCE",
];

const LANE_DEFAULTS = {
  "temp-code-review": [1, "low"],
  "duplicate-code-detector": [1, "low"],
  "finding-verifier": [1, "low"],
  "code-simplifier": [1, "low"],
  "pr-context-gatherer": [1, "low"],
  "euii-leak-detector": [2, "medium"],
  "feature-flag-reviewer": [2, "medium"],
  "history-context-review": [2, "medium"],
  "class-design-simplifier": [2, "medium"],
  "nscript-review": [3, "medium"],
  "orleans-review": [3, "medium"],
  "test-coverage-review": [3, "medium"],
  "performance-review": [3, "medium"],
  "correctness-review": [4, "high"],
  "exception-handling-review": [4, "high"],
  "schema-compatibility-review": [4, "high"],
  "architecture-review": [4, "high"],
  "over-engineering-review": [4, "high"],
  "review-grader": [5, "high"],
  "root-cause-synthesizer": [5, "high"],
  "remediation-planner": [5, "high"],
  "review-adjudicator": [6, "xhigh"],
};

const lane = (id, overrides = {}) => {
  const [modelIntelligence, effort] = LANE_DEFAULTS[id];
  return { id, modelIntelligence, effort, ...overrides };
};

const normalizePath = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
// Providers report composite statuses such as Azure DevOps "edit, rename".
const normalizeStatus = (value) => {
  const parts = String(value || "modified").toLowerCase().split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
  if (parts.some((part) => ["a", "add", "added", "new"].includes(part))) return "added";
  if (parts.some((part) => ["d", "delete", "deleted", "removed"].includes(part))) return "deleted";
  if (parts.some((part) => ["m", "edit", "edited", "modify", "modified", "change", "changed", "r", "rename", "renamed"].includes(part))) return "modified";
  return parts.join(", ");
};

const languageKeywords = new Set([
  "namespace", "using", "public", "private", "protected", "internal", "class", "interface",
  "record", "struct", "enum", "return", "if", "else", "for", "foreach", "while", "try", "catch",
  "throw", "new", "async", "await", "export", "type", "const", "let", "var", "function", "extends",
  "implements", "static", "readonly", "void", "string", "number", "boolean", "true", "false", "null",
]);

export function normalizeChangedLine(value) {
  return String(value || "")
    .trim()
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "<str>")
    .replace(/\b\d+(?:\.\d+)?\b/g, "<num>")
    .replace(/\b[A-Za-z_$][\w$]*\b/g, (word) => languageKeywords.has(word) ? word : "<id>")
    .replace(/\s+/g, " ");
}

export function parseUnifiedDiff(diffText) {
  const parsed = parseGitDiff(diffText);
  const files = new Map();
  for (const entry of parsed.files) {
    const key = normalizePath(entry.path);
    const existing = files.get(key);
    if (existing) {
      existing.addedLines += entry.addedLines;
      existing.removedLines += entry.removedLines;
    } else {
      files.set(key, { path: key, status: entry.status, addedLines: entry.addedLines, removedLines: entry.removedLines });
    }
  }
  const hunks = parsed.hunks.map(({ added, removed }) => ({
    added,
    removed,
    signature: `-${removed.length}:${removed.map(normalizeChangedLine).join("|")}+${added.length}:${added.map(normalizeChangedLine).join("|")}`,
  }));
  const changes = parsed.changes.map((change) => ({ ...change, path: change.path === null ? null : normalizePath(change.path) }));
  return { files: [...files.values()], hunks, changes };
}

export function validateDiffCoverage(input) {
  const diffText = String(input?.diffText || "");
  // Line counts are optional in a context pack; compare them only when given.
  const count = (value) => value === undefined || value === null || value === "" ? undefined : Number(value) || 0;
  const supplied = Array.isArray(input?.changedFiles)
    ? input.changedFiles.map((file) => ({
      path: normalizePath(file.path),
      status: normalizeStatus(file.status),
      addedLines: count(file.addedLines),
      removedLines: count(file.removedLines),
    })).filter((file) => file.path)
    : [];
  const parsedResult = parseUnifiedDiff(diffText);
  const parsed = parsedResult.files;
  const recognizedNonHunkChange = /^(?:Binary files .+ differ|GIT binary patch|old mode \d+|new mode \d+|similarity index \d+%|rename from .+|rename to .+)$/m.test(diffText);
  const invalidDiff = parsedResult.hunks.length === 0 && !recognizedNonHunkChange;

  const suppliedKeys = new Map(supplied.map((file) => [file.path.toLowerCase(), file]));
  const parsedKeys = new Map(parsed.map((file) => [file.path.toLowerCase(), file]));
  const missingFromDiff = [...suppliedKeys]
    .filter(([key]) => !parsedKeys.has(key))
    .map(([, file]) => file.path)
    .sort();
  const unexpectedInDiff = [...parsedKeys]
    .filter(([key]) => !suppliedKeys.has(key))
    .map(([, file]) => file.path)
    .sort();
  const metadataMismatches = [...suppliedKeys]
    .filter(([key]) => parsedKeys.has(key))
    .map(([, suppliedFile]) => {
      const parsedFile = parsedKeys.get(suppliedFile.path.toLowerCase());
      const suppliedMetadata = { status: suppliedFile.status };
      const parsedMetadata = { status: normalizeStatus(parsedFile.status) };
      for (const key of ["addedLines", "removedLines"]) {
        if (suppliedFile[key] === undefined) continue;
        suppliedMetadata[key] = suppliedFile[key];
        parsedMetadata[key] = parsedFile[key];
      }
      return JSON.stringify(suppliedMetadata) === JSON.stringify(parsedMetadata)
        ? null
        : { path: suppliedFile.path, supplied: suppliedMetadata, parsed: parsedMetadata };
    })
    .filter(Boolean)
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    complete: !invalidDiff && missingFromDiff.length === 0 && unexpectedInDiff.length === 0 && metadataMismatches.length === 0,
    checked: true,
    invalidDiff,
    missingFromDiff,
    unexpectedInDiff,
    metadataMismatches,
  };
}

function detectMechanical(parsed, files, riskFlags, structural) {
  if (
    riskFlags.length > 0
    || structural.newProjectOrModule
    || structural.newPublicTypeOrInterface
    || structural.architectureChange
  ) return false;
  if (files.some((file) => normalizeStatus(file.status) !== "modified")) return false;
  if (parsed.hunks.length < 3) return false;
  if (parsed.hunks.some((hunk) => hunk.added.length !== hunk.removed.length || hunk.added.length > 4)) return false;

  const counts = new Map();
  for (const hunk of parsed.hunks) counts.set(hunk.signature, (counts.get(hunk.signature) || 0) + 1);
  const dominant = Math.max(...counts.values());
  return dominant / parsed.hunks.length >= 0.8;
}

function hasAny(text, expressions) {
  return expressions.some((expression) => expression.test(text));
}

export function detectDiffFeatures(input) {
  const diffText = String(input?.diffText || "");
  const parsed = parseUnifiedDiff(diffText);
  const suppliedFiles = Array.isArray(input?.changedFiles) ? input.changedFiles : [];
  const files = suppliedFiles.length > 0 ? suppliedFiles.map((file) => ({
    path: normalizePath(file.path),
    status: normalizeStatus(file.status),
    addedLines: Number(file.addedLines) || 0,
    removedLines: Number(file.removedLines) || 0,
  })) : parsed.files;

  const paths = files.map((file) => file.path.toLowerCase());
  // Structural and risk signals come from code, never from prose: a README or
  // design doc that mentions Orleans, permissions, or performance is not an
  // Orleans, security, or performance change. Header-less fragments count as code.
  const isProse = (filePath) => /\.(?:md|mdx|markdown|txt|rst|adoc)$/i.test(filePath) || /(?:^|\/)docs?\//i.test(filePath);
  const codeChanges = parsed.changes.filter((change) => change.path === null || !isProse(change.path));
  const joinedPaths = paths.filter((filePath) => !isProse(filePath)).join("\n");
  const addedText = codeChanges.filter((change) => change.sign === "+").map((change) => change.text).join("\n");
  const changedText = codeChanges.map((change) => change.text).join("\n");
  const searchText = `${joinedPaths}\n${changedText}`;

  const newProjectOrModule = files.some((file) =>
    file.status === "added" && /(?:\.csproj|\.fsproj|\.vbproj|\/package\.json|\/cargo\.toml|\/go\.mod|\/pom\.xml)$/i.test(`/${file.path}`)
  );
  const newPublicTypeOrInterface = hasAny(addedText, [
    /^\s*(?:public\s+)+(?:sealed\s+|abstract\s+|partial\s+)*(?:class|interface|record|struct|enum)\s+\w+/m,
    /^\s*export\s+(?:default\s+)?(?:abstract\s+)?(?:class|interface|type|enum)\s+\w+/m,
  ]);
  const architectureChange = hasAny(searchText, [
    /\b(?:services|builder\.Services)\.Add(?:Keyed)?(?:Singleton|Scoped|Transient)\s*</i,
    /\bIServiceCollection\b/i,
    /<ProjectReference\s+Include=/i,
  ]);

  const riskFlags = [];
  if (hasAny(searchText, [/(?:^|[/_.-])(auth|authorization|authentication|permission|crypto|payment)(?:[/_.-]|$)/i, /\b(?:authorize|authorization|authenticate|permission|forbid|cryptograph|encrypt|decrypt|payment)\w*\b/i])) riskFlags.push("SECURITY");
  if (hasAny(searchText, [/\.(?:proto|thrift|avsc|fbs|bond)\b/i, /(?:^|\/)migrations?(?:\/|$)/i, /\b(?:DataContract|DataMember|JsonPropertyName|ProtoMember|BondMember|GenerateSerializer)\b/i, /\b(?:dto|schema|serialize|deserialize|wire format)\b/i, /[A-Z]\w*(?:Dto|Request|Response)\b/])) riskFlags.push("SCHEMA_COMPATIBILITY");
  if (hasAny(searchText, [/\borleans\b/i, /\b(?:Grain|IGrainWith\w+Key|Reentrant|AlwaysInterleave|StorageProvider)\b/])) riskFlags.push("ORLEANS");
  if (hasAny(searchText, [/\b(?:NScript|Mcqdb\.NScript|AutoFire)\b/i])) riskFlags.push("NSCRIPT");
  // The feature-flag lane recommends a flag for risky changes that lack one.
  // A change already behind a flag is exactly where it should not run.
  const alreadyFlagged = hasAny(searchText, [/\bfeature[ _-]?flag\b/i, /\b(?:IFeatureManager|IsEnabledAsync|LaunchDarkly)\b/i]);
  const riskyBehavior = riskFlags.includes("SCHEMA_COMPATIBILITY")
    || architectureChange
    || newProjectOrModule
    || hasAny(changedText, [/\b(?:retry|retries|max\w*Retries|timeout\w*|backoff|threshold|default\w*)\b\s*[:=]/i]);
  if (riskyBehavior && !alreadyFlagged) riskFlags.push("FEATURE_FLAG");
  if (hasAny(searchText, [/\b(?:log|logger|telemetry|trace|error message)\w*\b[\s\S]{0,160}\b(?:email|user name|username|token|password|connection string|ip address)\b/i])) riskFlags.push("EUII");
  if (hasAny(changedText, [/\btry\s*\{/i, /\bcatch\s*\(/i, /\bthrow\s+/i])) riskFlags.push("EXCEPTION_HANDLING");
  if (hasAny(searchText, [/\b(?:HttpClient|ToListAsync|ToArrayAsync|IMemoryCache|IDistributedCache|useEffect|useMemo|useCallback|fetch\s*\(|axios\b)\b/i, /\b(?:latency|throughput|performance|scalability|N\+1)\b/i])) riskFlags.push("PERFORMANCE");

  riskFlags.sort((a, b) => RISK_ORDER.indexOf(a) - RISK_ORDER.indexOf(b));
  const structural = { newProjectOrModule, newPublicTypeOrInterface, architectureChange };
  // Files at the repository root share one area; they are not each a directory.
  const topLevelAreas = [...new Set(paths.map((filePath) => filePath.includes("/") ? filePath.split("/")[0] : "(root)").filter(Boolean))].sort();
  const allFilesNew = files.length > 0 && files.every((file) => file.status === "added");
  const mechanical = detectMechanical(parsed, files, riskFlags, structural);
  const behaviorChanged = !mechanical && files.some((file) =>
    !/(?:^|\/)(?:tests?|docs?|samples?)(?:\/|$)/i.test(file.path)
      && !/\.(?:md|txt|png|jpg|jpeg|gif|svg|lock)$/i.test(file.path)
  );

  return {
    filesChanged: files.length,
    changedLines: files.reduce((sum, file) => sum + file.addedLines + file.removedLines, 0),
    hunks: parsed.hunks.length,
    topLevelAreas,
    topLevelAreaCount: topLevelAreas.length,
    newProjectOrModule,
    newPublicTypeOrInterface,
    architectureChange,
    allFilesNew,
    mechanical,
    behaviorChanged,
    riskFlags,
  };
}

function initialTier(features) {
  if (features.newProjectOrModule) return ["LARGE", "LARGE_NEW_PROJECT_OR_MODULE"];
  if (features.topLevelAreaCount >= 3) return ["LARGE", "LARGE_TOP_LEVEL_AREAS"];
  if (features.filesChanged > 25) return ["LARGE", "LARGE_FILE_COUNT"];
  if (features.changedLines > 1200) return ["LARGE", "LARGE_CHANGED_LINES"];
  if (features.architectureChange) return ["MEDIUM", "MEDIUM_ARCHITECTURE_CHANGE"];
  if (features.newPublicTypeOrInterface) return ["MEDIUM", "MEDIUM_NEW_PUBLIC_TYPE"];
  if (features.filesChanged >= 11) return ["MEDIUM", "MEDIUM_FILE_COUNT"];
  if (features.changedLines >= 401) return ["MEDIUM", "MEDIUM_CHANGED_LINES"];
  if (features.filesChanged >= 3) return ["SMALL", "SMALL_FILE_COUNT"];
  if (features.changedLines >= 51) return ["SMALL", "SMALL_CHANGED_LINES"];
  return ["TINY", "TINY_DEFAULT"];
}

function riskLanes(features) {
  const ids = [];
  const add = (id) => { if (!ids.includes(id)) ids.push(id); };
  if (features.riskFlags.includes("SCHEMA_COMPATIBILITY")) add("schema-compatibility-review");
  if (features.riskFlags.includes("ORLEANS")) add("orleans-review");
  if (features.riskFlags.includes("NSCRIPT")) add("nscript-review");
  if (features.riskFlags.includes("FEATURE_FLAG")) add("feature-flag-reviewer");
  if (features.riskFlags.includes("EUII")) add("euii-leak-detector");
  if (features.riskFlags.includes("EXCEPTION_HANDLING")) add("exception-handling-review");
  if (features.riskFlags.includes("PERFORMANCE")) add("performance-review");
  return ids;
}

function buildPlan(tier, features) {
  const lanes = [lane("correctness-review"), lane("temp-code-review")];
  const add = (id, overrides = {}) => { if (!lanes.some((item) => item.id === id)) lanes.push(lane(id, overrides)); };
  const requiredGuides = [];
  if (features.riskFlags.includes("SECURITY")) requiredGuides.push("security-checklist");

  if (tier !== "TINY" && !features.allFilesNew) add("history-context-review");
  for (const id of riskLanes(features)) add(id);
  if (tier !== "TINY" && features.behaviorChanged) add("test-coverage-review");
  if (tier === "MEDIUM" || tier === "LARGE") add("duplicate-code-detector");
  if (features.architectureChange) add("architecture-review");
  if (tier === "LARGE") {
    add("architecture-review");
    add("over-engineering-review");
    add("class-design-simplifier");
    add("code-simplifier");
  }

  let reasoningAgents;
  if (tier === "TINY") {
    reasoningAgents = [lane("review-grader", { when: "HIGH_OR_CRITICAL_SURVIVES" })];
  } else if (tier === "SMALL") {
    reasoningAgents = [lane("review-grader", { when: "ALWAYS", modelIntelligence: 4 })];
  } else if (tier === "MEDIUM") {
    reasoningAgents = [
      lane("review-grader", { when: "ALWAYS" }),
      lane("root-cause-synthesizer", { when: "FOUR_OR_MORE_VERIFIED_FINDINGS", effort: "medium" }),
      lane("remediation-planner", { when: "REQUEST_CHANGES_AND_THREE_BLOCKERS_OR_TWO_CLUSTERS", modelIntelligence: 4, effort: "medium" }),
      lane("review-adjudicator", { when: "CONTESTED_FINDING", modelIntelligence: 5, effort: "high" }),
    ];
  } else {
    reasoningAgents = [
      lane("review-grader", { when: "ALWAYS" }),
      lane("root-cause-synthesizer", { when: "FOUR_OR_MORE_VERIFIED_FINDINGS" }),
      lane("remediation-planner", { when: "REQUEST_CHANGES_AND_THREE_BLOCKERS_OR_TWO_CLUSTERS" }),
      lane("review-adjudicator", { when: "CONTESTED_FINDING" }),
    ];
  }

  const focus = {
    TINY: ["GOAL", "CHANGED_LINE_CORRECTNESS", "BOUNDARIES", "REGRESSION_TEST", "TEMP_ARTIFACTS"],
    SMALL: ["GOAL", "CORRECTNESS", "CHANGED_SIGNATURE_CALLERS", "CHANGED_DEFAULT_CONSUMERS", "HISTORY", "TESTS"],
    MEDIUM: ["GOAL", "CORRECTNESS", "INTEGRATION", "CONTRACTS", "ROLLOUT", "ERRORS", "PERFORMANCE"],
    LARGE: ["GOAL", "CORRECTNESS_BY_AREA", "ARCHITECTURE", "SCOPE_FIT", "OVER_ENGINEERING", "AI_SLOP", "BLIND_SPOTS", "CROSS_AREA_INTERACTIONS"],
  }[tier];

  return {
    workspaceMode: tier === "LARGE" ? "DEEP" : "LIGHTWEIGHT",
    focus,
    lanes,
    requiredGuides,
    nonRiskDomainLaneLimit: tier === "TINY" ? 0 : tier === "SMALL" ? 2 : null,
    externalAgentLimit: tier === "TINY" || tier === "SMALL" ? 0 : tier === "MEDIUM" ? 2 : null,
    splitCorrectnessByArea: tier === "LARGE",
    verification: {
      firstLens: lane("finding-verifier", { when: tier === "TINY" ? "MEDIUM_OR_HIGHER" : "EVERY_SURVIVING_FINDING" }),
      secondLens: {
        when: "HIGH_OR_CRITICAL",
        high: { modelIntelligence: 3, effort: "medium" },
        critical: { modelIntelligence: 4, effort: "high" },
      },
    },
    reasoningAgents,
  };
}

export function classifyReview(input) {
  const features = detectDiffFeatures(input);
  let [tier, triggeringRule] = initialTier(features);

  if (features.mechanical && (tier === "MEDIUM" || tier === "LARGE")) {
    tier = "SMALL";
    triggeringRule = "MECHANICAL_CAP";
  } else if (features.riskFlags.length > 0 && tier === "TINY") {
    tier = "SMALL";
    triggeringRule = "RISK_FLOOR";
  }

  return {
    schemaVersion: 1,
    tier,
    triggeringRule,
    signals: features,
    plan: buildPlan(tier, features),
    escalation: {
      direction: "UP_ONLY",
      trigger: "SURVIVING_HIGH_OR_CRITICAL_FINDING",
      action: "APPLY_NEXT_TIER_PLAN_AND_RUN_NEWLY_REQUIRED_WORK",
    },
  };
}

export function main(argv) {
  const option = (name) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 && index + 1 < argv.length ? argv[index + 1] : null;
  };
  const contextPath = option("context");
  const explicitDiffPath = option("diff");
  const outPath = option("out");
  if (!contextPath) {
    console.error("usage: classify-review.mjs --context <context.json> [--diff <diff.patch>] [--out <plan.json>]");
    return 2;
  }

  let contextText;
  try {
    contextText = readFileSync(contextPath, "utf8");
  } catch (error) {
    console.error(`cannot read context: ${error.message}`);
    return 2;
  }
  let contextPack;
  try {
    contextPack = JSON.parse(contextText);
  } catch (error) {
    console.error(`context input is not valid JSON: ${error.message}`);
    return 2;
  }
  if (contextPack === null || typeof contextPack !== "object" || Array.isArray(contextPack)) {
    console.error("context input must be a JSON object");
    return 2;
  }

  const contextDir = path.dirname(path.resolve(contextPath));
  const configuredDiffPath = explicitDiffPath || contextPack.diffPath;
  let diffText = "";
  if (configuredDiffPath) {
    const resolved = path.isAbsolute(configuredDiffPath) ? configuredDiffPath : path.resolve(contextDir, configuredDiffPath);
    try {
      diffText = readFileSync(resolved, "utf8");
    } catch (error) {
      console.error(`cannot read diff: ${error.message}`);
      return 2;
    }
  }

  // Coverage is checked only when a diff is supplied; without one the plan is
  // built from changedFiles alone.
  if (configuredDiffPath) {
    const coverage = validateDiffCoverage({ ...contextPack, diffText });
    if (!coverage.complete) {
      console.error(`context/diff file mismatch: ${JSON.stringify(coverage)}`);
      return 2;
    }
  }

  const result = classifyReview({ ...contextPack, diffText });
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (outPath) writeFileSync(outPath, json);
  else process.stdout.write(json);
  return 0;
}

// Compare real paths: import.meta.url is already resolved through symlinks and
// junctions, process.argv[1] is not.
const isEntryPoint = () => {
  try {
    return Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
};
const invokedDirectly = isEntryPoint();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
