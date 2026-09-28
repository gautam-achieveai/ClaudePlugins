#!/usr/bin/env node
// Usage:
//   node review-artifacts.mjs snapshot --context context.json
//   node review-artifacts.mjs capture --assignment assignment.json --input native.json --out artifact.json
//   node review-artifacts.mjs read --assignment assignment.json --input artifact.json
//
// Context: {repository, headCommit, mergeBase, diffPath, reviewType?, reviewBase?}.
// Re-reviews require reviewBase (the completed review's head); initial defaults to mergeBase.
// reviewBaseSnapshotId additionally identifies a saved baseline including local dirty content.
// diffPath is relative to context.json
// or absolute. Snapshot hashes exact captured bytes, including uncommitted changes.
// Assignment: {schemaVersion:1, runId, snapshotId, stageId, attemptId, agent,
//   format:"json"|"markdown", outputPath:<absolute>, resultKind?:"generic"|
//   "scanner"|"verification"|"accounted", expectedCandidateIds?:[<string>]}.
// Scanner: {findings:[], coverageNote:<nonempty string>}.
// Verification: {verdict:"TRUE_POSITIVE"|"FALSE_POSITIVE"|"UNPROVEN"}.
// Accounted: {dispositions:[{candidateId, outcome, targetId?}]}; requires
// expectedCandidateIds. Other fields are preserved. Markdown is generic only.
// expectedCandidateIds, when present, enforces accounting for any JSON kind.
// Optional native runId/snapshotId/stageId/attemptId/agent must match assignment.
// Artifact: normalized assignment metadata, status:"complete", result, and
// contentHash = "sha256:" + hex SHA-256 of JSON.stringify(all fields except
// contentHash), in stored property order. Hashes detect corruption, not forgery.
//
// Capture is called ONLY AFTER the caller observes settled tool success. Native
// results cannot prove tool completion, or detect valid-but-incomplete JSON or
// truncated nonempty Markdown. No transport fields are added to native results.
// Capture prints {outputPath,contentHash}; read prints the validated artifact;
// snapshot prints its ID. Errors go to stderr and exit 2.

import { createHash, randomUUID } from "node:crypto";
import {
  closeSync, fsyncSync, linkSync, openSync, readFileSync, realpathSync,
  statSync, unlinkSync, writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ID_FIELDS = ["runId", "snapshotId", "stageId", "attemptId", "agent"];
const KINDS = new Set(["generic", "scanner", "verification", "accounted"]);
const OUTCOMES = new Set(["retained", "refuted", "unresolved", "merged", "pre-existing", "capped", "out-of-scope"]);
const HASH = /^sha256:[a-f0-9]{64}$/;
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

/** diffBytes must be the captured bytes, not a HEAD-only identifier. */
export function createSnapshotId({ repository, headCommit, mergeBase, reviewType = "initial", reviewBase, reviewBaseSnapshotId }, diffBytes) {
  for (const [key, value] of Object.entries({ repository, headCommit, mergeBase })) {
    if (!nonempty(value)) throw new Error(`snapshot ${key} must be a nonempty string`);
  }
  if (!(diffBytes instanceof Uint8Array)) throw new Error("snapshot diffBytes must be bytes");
  if (!["initial", "re-review"].includes(reviewType)) throw new Error("snapshot reviewType must be initial or re-review");
  if (reviewType === "re-review" && !nonempty(reviewBase)) {
    throw new Error("snapshot re-review requires a nonempty reviewBase");
  }
  if (reviewType === "initial" && reviewBase !== undefined && reviewBase !== mergeBase) {
    throw new Error("snapshot initial reviewBase must equal mergeBase");
  }
  if (reviewBaseSnapshotId !== undefined && (reviewType !== "re-review" || !nonempty(reviewBaseSnapshotId) || !HASH.test(reviewBaseSnapshotId))) {
    throw new Error("snapshot reviewBaseSnapshotId requires a re-review and sha256 digest");
  }
  // Preserve initial-review IDs; incremental receipts include their comparison baseline.
  const identity = reviewType === "initial"
    ? ["review-snapshot-v1", repository, headCommit, mergeBase]
    : ["review-snapshot-v2", repository, headCommit, mergeBase, reviewType, reviewBase, reviewBaseSnapshotId ?? null];
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(identity))
    .update("\0").update(diffBytes).digest("hex")}`;
}

function artifactPath(value) {
  if (!nonempty(value) || !path.isAbsolute(value)) throw new Error("outputPath must be absolute");
  const normalized = path.resolve(value);
  const parent = realpathSync(path.dirname(normalized));
  if (!statSync(parent).isDirectory()) throw new Error("outputPath parent must be a directory");
  return path.join(parent, path.basename(normalized));
}

function assignmentMetadata(assignment) {
  if (!isRecord(assignment) || assignment.schemaVersion !== 1) {
    throw new Error("assignment schemaVersion must be 1");
  }
  const metadata = { schemaVersion: 1 };
  for (const field of ID_FIELDS) {
    if (!nonempty(assignment[field])) throw new Error(`assignment ${field} must be a nonempty string`);
    metadata[field] = assignment[field];
  }
  if (!HASH.test(assignment.snapshotId)) throw new Error("assignment snapshotId must be a sha256 digest");
  if (!["json", "markdown"].includes(assignment.format)) throw new Error("assignment format must be json or markdown");
  const resultKind = assignment.resultKind === undefined ? "generic" : assignment.resultKind;
  if (!KINDS.has(resultKind)) throw new Error("assignment resultKind is invalid");
  if (assignment.format === "markdown" && (resultKind !== "generic" || assignment.expectedCandidateIds !== undefined)) {
    throw new Error("markdown requires generic resultKind without expectedCandidateIds");
  }
  Object.assign(metadata, { format: assignment.format, resultKind, outputPath: artifactPath(assignment.outputPath) });
  const ids = assignment.expectedCandidateIds;
  if (resultKind === "accounted" && ids === undefined) throw new Error("accounted requires expectedCandidateIds");
  if (ids !== undefined) {
    if (!Array.isArray(ids) || !ids.every(nonempty) || new Set(ids).size !== ids.length) {
      throw new Error("expectedCandidateIds must be unique nonempty strings");
    }
    metadata.expectedCandidateIds = [...ids];
  }
  return metadata;
}

function validateResult(result, metadata) {
  if (metadata.format === "markdown") {
    if (!nonempty(result)) throw new Error("markdown result must be nonempty");
    return;
  }
  if (isRecord(result)) {
    for (const field of ID_FIELDS) {
      if (Object.hasOwn(result, field) && result[field] !== metadata[field]) {
        throw new Error(`native result ${field} does not match assignment`);
      }
    }
  }
  if (metadata.resultKind !== "generic" && !isRecord(result)) {
    throw new Error(`${metadata.resultKind} result must be an object`);
  }
  if (metadata.resultKind === "scanner") {
    if (!Array.isArray(result.findings)) throw new Error("scanner findings must be an explicit array (including clean [])");
    if (!nonempty(result.coverageNote)) throw new Error("scanner coverageNote must be nonempty");
  }
  if (metadata.resultKind === "verification" && !["TRUE_POSITIVE", "FALSE_POSITIVE", "UNPROVEN"].includes(result.verdict)) {
    throw new Error("verification verdict must be TRUE_POSITIVE, FALSE_POSITIVE, or UNPROVEN");
  }
  if (metadata.expectedCandidateIds !== undefined) {
    if (!isRecord(result) || !Array.isArray(result.dispositions)) throw new Error("result dispositions must be an array");
    const remaining = new Set(metadata.expectedCandidateIds);
    for (const disposition of result.dispositions) {
      if (!isRecord(disposition) || !remaining.delete(disposition.candidateId)) {
        throw new Error("dispositions contain unknown or duplicate candidateId");
      }
      if (!OUTCOMES.has(disposition.outcome)) throw new Error("disposition outcome is invalid");
      if (disposition.outcome === "merged" && !nonempty(disposition.targetId)) {
        throw new Error("merged disposition requires targetId");
      }
    }
    if (remaining.size) throw new Error(`dispositions missing candidateIds: ${[...remaining].join(", ")}`);
  }
}

function readText(inputPath) {
  if (!statSync(inputPath).isFile()) throw new Error(`input must be a regular file: ${inputPath}`);
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(readFileSync(inputPath));
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function publishExclusive(outputPath, text) {
  const temporary = path.join(path.dirname(outputPath), `.review-artifact-${randomUUID()}.tmp`);
  const fd = openSync(temporary, "wx", 0o600);
  try {
    try {
      writeFileSync(fd, text, "utf8");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    // Link only a complete file; unlike rename, this never replaces an entry.
    linkSync(temporary, outputPath);
  } finally {
    unlinkSync(temporary);
  }
}

/** Successful settled tool completion is a caller precondition, not inferred here. */
export function captureArtifact({ assignment, inputPath, outputPath = assignment.outputPath }) {
  const metadata = assignmentMetadata(assignment);
  if (artifactPath(outputPath) !== metadata.outputPath) throw new Error("--out does not match assignment outputPath");
  if (realpathSync(inputPath) === metadata.outputPath) throw new Error("input and output must be different files");
  const text = readText(inputPath);
  const result = metadata.format === "json" ? parseJson(text, "native result") : text;
  validateResult(result, metadata);
  const content = { ...metadata, status: "complete", result };
  const artifact = { ...content, contentHash: digest(JSON.stringify(content)) };
  publishExclusive(metadata.outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

export function readArtifact({ assignment, inputPath = assignment.outputPath }) {
  const metadata = assignmentMetadata(assignment);
  if (realpathSync(inputPath) !== metadata.outputPath) throw new Error("input does not match assignment outputPath");
  const artifact = parseJson(readText(inputPath), "artifact");
  if (!isRecord(artifact)) throw new Error("artifact must be an object");
  const { contentHash, ...content } = artifact;
  if (typeof contentHash !== "string" || !HASH.test(contentHash) || digest(JSON.stringify(content)) !== contentHash) {
    throw new Error("artifact contentHash mismatch");
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (JSON.stringify(content[key]) !== JSON.stringify(value)) throw new Error(`artifact ${key} does not match assignment`);
  }
  if (metadata.expectedCandidateIds === undefined && content.expectedCandidateIds !== undefined) {
    throw new Error("artifact expectedCandidateIds does not match assignment");
  }
  if (content.status !== "complete" || !Object.hasOwn(content, "result")) throw new Error("artifact is not complete");
  validateResult(content.result, metadata);
  return artifact;
}

export function main(argv) {
  try {
    const [command, ...args] = argv;
    const required = {
      snapshot: ["context"],
      capture: ["assignment", "input", "out"],
      read: ["assignment", "input"],
    }[command];
    if (!Array.isArray(required)) throw new Error("command must be snapshot, capture, or read");
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].slice(2);
      if (!args[i].startsWith("--") || !required.includes(key) || Object.hasOwn(options, key)) {
        throw new Error(`unknown or duplicate option: ${args[i]}`);
      }
      if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`missing value: ${args[i]}`);
      options[key] = args[i + 1];
    }
    for (const key of required) {
      if (!options[key]) throw new Error(`missing --${key}`);
    }
    if (command === "snapshot") {
      const context = parseJson(readText(options.context), "context");
      if (!isRecord(context) || !nonempty(context.diffPath)) throw new Error("context requires diffPath");
      const diffPath = path.resolve(path.dirname(path.resolve(options.context)), context.diffPath);
      if (!statSync(diffPath).isFile()) throw new Error("diffPath must be a regular file");
      process.stdout.write(`${createSnapshotId(context, readFileSync(diffPath))}\n`);
    } else {
      const assignment = parseJson(readText(options.assignment), "assignment");
      const artifact = command === "capture"
        ? captureArtifact({ assignment, inputPath: options.input, outputPath: options.out })
        : readArtifact({ assignment, inputPath: options.input });
      const output = command === "capture"
        ? { outputPath: artifact.outputPath, contentHash: artifact.contentHash }
        : artifact;
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    }
    return 0;
  } catch (error) {
    console.error(`review-artifacts: ${error.message}`);
    return 2;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
